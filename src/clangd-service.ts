/**
 * Per-workspace clangd singleton service.
 *
 * Ensures only one clangd process runs per workspace by using a lock file and
 * a Unix domain socket (or named pipe on Windows). The first process to start
 * becomes the "primary" — it owns the clangd process and listens on a socket.
 * Subsequent processes become "secondaries" — they connect to the primary's
 * socket and forward tool-level requests.
 *
 * The VSCode extension can also act as a primary, exposing its clangd
 * LanguageClient through the same socket so external MCP servers reuse it.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';

// === Constants ===

const CONNECTION_TIMEOUT_MS = 3000;
const REQUEST_TIMEOUT_MS = 30000;

// === Path helpers ===

function getWorkspaceId(projectRoot: string): string {
  return crypto.createHash('sha256')
      .update(path.resolve(projectRoot))
      .digest('hex')
      .substring(0, 16);
}

export function getSocketPath(projectRoot: string): string {
  const id = getWorkspaceId(projectRoot);
  if (process.platform === 'win32') {
    return `\\\\.\\pipe\\clangd-mcp-${id}`;
  }
  return path.join(os.tmpdir(), `clangd-mcp-${id}.sock`);
}

export function getLockFilePath(projectRoot: string): string {
  const id = getWorkspaceId(projectRoot);
  return path.join(os.tmpdir(), `clangd-mcp-${id}.lock`);
}

// === Lock file ===

export interface LockInfo {
  pid: number;
  socket: string;
}

/**
 * Read the lock file. Returns null if not found or invalid.
 */
export function readLock(projectRoot: string): LockInfo|null {
  const lockPath = getLockFilePath(projectRoot);
  try {
    const data = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    if (typeof data.pid === 'number' && typeof data.socket === 'string') {
      return data as LockInfo;
    }
  } catch {
    // Lock file doesn't exist or is corrupted
  }
  return null;
}

/**
 * Check if a process with the given PID is alive.
 */
export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Write a lock file. Returns true on success.
 */
export function writeLock(projectRoot: string, info: LockInfo): boolean {
  const lockPath = getLockFilePath(projectRoot);
  try {
    fs.writeFileSync(lockPath, JSON.stringify(info), {flag: 'w'});
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove the lock file (only if it belongs to us).
 */
export function removeLock(projectRoot: string, ourPid: number): void {
  const lock = readLock(projectRoot);
  if (lock && lock.pid === ourPid) {
    try {
      fs.unlinkSync(getLockFilePath(projectRoot));
    } catch {
      // Ignore cleanup errors
    }
  }
}

// === Socket protocol ===
// Newline-delimited JSON (NDJSON) messages over Unix domain socket.

export interface ServiceRequest {
  id: string;
  method: string;
  params: Record<string, unknown>;
}

export interface ServiceResponse {
  id: string;
  result?: {content: Array<{type: string; text: string}>; isError?: boolean};
  error?: string;
}

/**
 * Send a message over a socket.
 */
export function sendMessage(socket: net.Socket,
                            msg: ServiceRequest|ServiceResponse): void {
  socket.write(JSON.stringify(msg) + '\n');
}

/**
 * Create a line parser for incoming NDJSON messages on a socket.
 */
export function createMessageParser(
    socket: net.Socket,
    onMessage: (msg: ServiceRequest|ServiceResponse) => void,
    ): void {
  let buffer = '';
  socket.on('data', (data: Buffer) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.trim()) {
        try {
          onMessage(JSON.parse(line));
        } catch {
          // Skip malformed messages
        }
      }
    }
  });
}

// === Service Server (Primary) ===

export type ToolHandler =
    (method: string, params: Record<string, unknown>) =>
        Promise<{content: Array<{type: string; text: string}>;
                 isError?: boolean}>;

/**
 * A socket server that accepts connections from secondary MCP server
 * instances and forwards their tool requests to a handler function.
 */
export class ServiceServer {
  private server: net.Server;
  private clients = new Set<net.Socket>();
  private socketPath: string;
  private projectRoot: string;

  constructor(projectRoot: string, private handler: ToolHandler) {
    this.projectRoot = projectRoot;
    this.socketPath = getSocketPath(projectRoot);
    this.server = net.createServer((socket) => this.onConnection(socket));
  }

  async start(): Promise<void> {
    // Clean up stale socket file
    try {
      fs.unlinkSync(this.socketPath);
    } catch {
      // Ignore
    }

    return new Promise((resolve, reject) => {
      this.server.listen(this.socketPath, () => {
        writeLock(this.projectRoot, {
          pid: process.pid,
          socket: this.socketPath,
        });
        resolve();
      });
      this.server.on('error', reject);
    });
  }

  private onConnection(socket: net.Socket): void {
    this.clients.add(socket);

    createMessageParser(socket, async (msg) => {
      const req = msg as ServiceRequest;
      if (!req.id || !req.method)
        return;

      try {
        const result = await this.handler(req.method, req.params || {});
        sendMessage(socket, {id: req.id, result});
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        sendMessage(socket, {id: req.id, error: message});
      }
    });

    socket.on('close', () => { this.clients.delete(socket); });
    socket.on('error', () => { this.clients.delete(socket); });
  }

  stop(): void {
    for (const client of this.clients) {
      client.destroy();
    }
    this.clients.clear();
    this.server.close();
    removeLock(this.projectRoot, process.pid);
    try {
      fs.unlinkSync(this.socketPath);
    } catch {
      // Ignore
    }
  }
}

// === Service Client (Secondary) ===

/**
 * A socket client that connects to an existing primary service and forwards
 * tool requests to it.
 */
export class ServiceClient {
  private socket: net.Socket|null = null;
  private pending = new Map<string, {
    resolve: (value: {content: Array<{type: string; text: string}>;
                      isError?: boolean}) => void;
    reject: (reason: Error) => void;
  }>();
  private nextId = 0;
  private connected = false;

  constructor(private socketPath: string) {}

  /**
   * Try to connect to the primary service.
   * Returns true if connection succeeded, false otherwise.
   */
  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      this.socket = net.createConnection(this.socketPath, () => {
        this.connected = true;
        resolve(true);
      });

      this.socket.on('error', () => {
        this.connected = false;
        resolve(false);
      });

      createMessageParser(this.socket, (msg) => {
        const resp = msg as ServiceResponse;
        const pending = this.pending.get(resp.id);
        if (!pending)
          return;

        this.pending.delete(resp.id);
        if (resp.error) {
          pending.reject(new Error(resp.error));
        } else if (resp.result) {
          pending.resolve(resp.result);
        }
      });

      this.socket.on('close', () => {
        this.connected = false;
        // Reject all pending requests
        for (const [, p] of this.pending) {
          p.reject(new Error('Connection to clangd service lost'));
        }
        this.pending.clear();
      });

      // Timeout for connection
      setTimeout(() => {
        if (!this.connected) {
          this.socket?.destroy();
          resolve(false);
        }
      }, CONNECTION_TIMEOUT_MS);
    });
  }

  isConnected(): boolean { return this.connected; }

  /**
   * Send a tool request to the primary service and wait for the response.
   */
  async request(method: string, params: Record<string, unknown>):
      Promise<{content: Array<{type: string; text: string}>;
               isError?: boolean}> {
    if (!this.socket || !this.connected) {
      throw new Error('Not connected to clangd service');
    }

    const id = String(++this.nextId);
    return new Promise((resolve, reject) => {
      this.pending.set(id, {resolve, reject});
      sendMessage(this.socket!, {id, method, params});

      // Timeout for individual requests
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`Request ${method} timed out`));
        }
      }, REQUEST_TIMEOUT_MS);
    });
  }

  disconnect(): void {
    this.socket?.destroy();
    this.socket = null;
    this.connected = false;
  }
}

// === Coordination ===

/**
 * Check if a primary service is already running for this workspace.
 * If so, return its socket path. Otherwise return null.
 */
export function findExistingService(projectRoot: string): string|null {
  const lock = readLock(projectRoot);
  if (!lock)
    return null;

  if (!isProcessAlive(lock.pid)) {
    // Stale lock file — clean up
    try {
      fs.unlinkSync(getLockFilePath(projectRoot));
    } catch {
      // Ignore
    }
    try {
      fs.unlinkSync(lock.socket);
    } catch {
      // Ignore
    }
    return null;
  }

  return lock.socket;
}
