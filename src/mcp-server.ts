#!/usr/bin/env node
/**
 * clangd MCP Server
 *
 * A standalone Model Context Protocol (MCP) server that wraps clangd's
 * Language Server Protocol capabilities as MCP tools. This enables AI
 * coding assistants like Gemini CLI and OpenAI Codex to use clangd for
 * C/C++ code intelligence.
 *
 * Usage:
 *   node out/mcp-server.js [--clangd-path <path>] [--project-root <path>]
 *
 * Environment variables:
 *   CLANGD_PATH    - Path to the clangd binary (default: "clangd")
 *   CLANGD_ARGS    - Space-separated additional arguments for clangd
 *   PROJECT_ROOT   - Root directory of the C/C++ project (default: cwd)
 */

import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from
    '@modelcontextprotocol/sdk/server/stdio.js';
import {CallToolRequestSchema, ListToolsRequestSchema} from
    '@modelcontextprotocol/sdk/types.js';
import type {Tool} from '@modelcontextprotocol/sdk/types.js';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as lsp from 'vscode-languageserver-protocol/node';

import {
  ServiceClient,
  ServiceServer,
  findExistingService,
  removeLock,
} from './clangd-service';

function fileToUri(filePath: string): string {
  const resolved = path.resolve(filePath);
  // Ensure proper file URI encoding
  return `file://${resolved}`;
}

function uriToFile(uri: string): string {
  return uri.replace(/^file:\/\//, '');
}

function getLanguageId(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mapping: Record<string, string> = {
    '.c': 'c',
    '.h': 'c',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.cxx': 'cpp',
    '.c++': 'cpp',
    '.hpp': 'cpp',
    '.hh': 'cpp',
    '.hxx': 'cpp',
    '.h++': 'cpp',
    '.m': 'objective-c',
    '.mm': 'objective-cpp',
    '.cu': 'cuda-cpp',
  };
  return mapping[ext] || 'cpp';
}

function severityToString(severity: lsp.DiagnosticSeverity|
                          undefined): string {
  switch (severity) {
  case lsp.DiagnosticSeverity.Error:
    return 'Error';
  case lsp.DiagnosticSeverity.Warning:
    return 'Warning';
  case lsp.DiagnosticSeverity.Information:
    return 'Information';
  case lsp.DiagnosticSeverity.Hint:
    return 'Hint';
  default:
    return 'Unknown';
  }
}

function formatDiagnostic(d: lsp.Diagnostic): string {
  const sev = severityToString(d.severity);
  const loc = `${d.range.start.line + 1}:${d.range.start.character + 1}`;
  let msg = `[${sev}] Line ${loc}: ${d.message}`;
  if (d.source)
    msg += ` (${d.source})`;
  return msg;
}

function formatLocation(loc: lsp.Location): string {
  return `${uriToFile(loc.uri)}:${loc.range.start.line + 1}:${
      loc.range.start.character + 1}`;
}

function extractHoverText(hover: lsp.Hover): string {
  const contents = hover.contents;
  if (typeof contents === 'string')
    return contents;
  if (lsp.MarkupContent.is(contents))
    return contents.value;
  if (Array.isArray(contents))
    return contents.map(c => typeof c === 'string' ? c : c.value).join('\n');
  if ('value' in contents)
    return contents.value;
  return JSON.stringify(contents);
}

interface ParsedArgs {
  clangdPath: string;
  clangdArgs: string[];
  projectRoot: string;
}

function parseArgs(): ParsedArgs {
  const argv = process.argv.slice(2);
  let clangdPath = process.env.CLANGD_PATH || 'clangd';
  let clangdArgs = (process.env.CLANGD_ARGS || '').split(' ').filter(Boolean);
  let projectRoot = process.env.PROJECT_ROOT || process.cwd();

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
    case '--clangd-path':
      clangdPath = argv[++i];
      break;
    case '--project-root':
      projectRoot = argv[++i];
      break;
    }
  }

  return {clangdPath, clangdArgs, projectRoot};
}

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: 'clangd_diagnostics',
    description:
        'Get compiler diagnostics (errors, warnings) for a C/C++ file. Opens the file with clangd and returns any compilation issues found.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        filePath: {
          type: 'string',
          description:
              'Absolute or relative path to the C/C++ source file to check',
        },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'clangd_hover',
    description:
        'Get type information and documentation for a symbol at a specific position in a C/C++ file.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the C/C++ source file',
        },
        line: {
          type: 'number',
          description: 'Line number (0-based)',
        },
        character: {
          type: 'number',
          description: 'Character offset in the line (0-based)',
        },
      },
      required: ['filePath', 'line', 'character'],
    },
  },
  {
    name: 'clangd_definition',
    description:
        'Find the definition location of a symbol at a specific position in a C/C++ file.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the C/C++ source file',
        },
        line: {
          type: 'number',
          description: 'Line number (0-based)',
        },
        character: {
          type: 'number',
          description: 'Character offset in the line (0-based)',
        },
      },
      required: ['filePath', 'line', 'character'],
    },
  },
  {
    name: 'clangd_references',
    description:
        'Find all references to a symbol at a specific position in a C/C++ file across the project.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the C/C++ source file',
        },
        line: {
          type: 'number',
          description: 'Line number (0-based)',
        },
        character: {
          type: 'number',
          description: 'Character offset in the line (0-based)',
        },
      },
      required: ['filePath', 'line', 'character'],
    },
  },
  {
    name: 'clangd_completion',
    description:
        'Get code completion suggestions at a specific position in a C/C++ file.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the C/C++ source file',
        },
        line: {
          type: 'number',
          description: 'Line number (0-based)',
        },
        character: {
          type: 'number',
          description: 'Character offset in the line (0-based)',
        },
      },
      required: ['filePath', 'line', 'character'],
    },
  },
  {
    name: 'clangd_format',
    description:
        'Format a C/C++ source file using clang-format. Returns the formatted content of the file.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the C/C++ source file to format',
        },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'clangd_switch_source_header',
    description:
        'Find the corresponding header file for a source file, or vice versa (e.g., foo.cpp → foo.h).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the C/C++ source or header file',
        },
      },
      required: ['filePath'],
    },
  },
  {
    name: 'clangd_symbol_info',
    description:
        'Search for symbols (functions, classes, variables) matching a query string in the project.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Symbol name or pattern to search for',
        },
      },
      required: ['query'],
    },
  },
];

class ClangdMCPServer {
  private server: Server;
  private clangdProcess: cp.ChildProcess|null = null;
  private connection: lsp.MessageConnection|null = null;
  private diagnosticsMap = new Map<string, lsp.Diagnostic[]>();
  private openDocuments =
      new Map<string, {version: number; content: string}>();
  private initialized = false;
  private config: ParsedArgs;

  // Singleton service support
  private serviceServer: ServiceServer|null = null;
  private serviceClient: ServiceClient|null = null;
  private isPrimary = false;

  constructor(config: ParsedArgs) {
    this.config = config;

    this.server = new Server(
        {name: 'clangd-mcp', version: '0.1.0'},
        {capabilities: {tools: {}}},
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(
        ListToolsRequestSchema,
        async () => ({tools: TOOLS}),
    );

    this.server.setRequestHandler(
        CallToolRequestSchema,
        async (request) =>
            this.handleToolCall(request.params.name,
                                request.params.arguments ?? {}),
    );
  }

  private async ensureClangd(): Promise<lsp.MessageConnection> {
    if (this.connection && this.initialized) {
      return this.connection;
    }

    this.clangdProcess = cp.spawn(
        this.config.clangdPath, this.config.clangdArgs,
        {stdio: ['pipe', 'pipe', 'pipe'], cwd: this.config.projectRoot});

    this.clangdProcess.on('error', (err) => {
      process.stderr.write(
          `Failed to start clangd at "${this.config.clangdPath}": ${
              err.message}\n`);
    });

    this.clangdProcess.stderr?.on(
        'data',
        (data: Buffer) => { process.stderr.write(`[clangd] ${data}`); });

    this.connection = lsp.createMessageConnection(
        new lsp.StreamMessageReader(this.clangdProcess.stdout!),
        new lsp.StreamMessageWriter(this.clangdProcess.stdin!),
    );

    this.connection.onNotification(
        lsp.PublishDiagnosticsNotification.type,
        (params) => { this.diagnosticsMap.set(params.uri, params.diagnostics); },
    );

    this.connection.listen();

    await this.connection.sendRequest(lsp.InitializeRequest.type, {
      processId: process.pid,
      rootUri: fileToUri(this.config.projectRoot),
      capabilities: {
        textDocument: {
          completion: {completionItem: {snippetSupport: false}},
          hover: {contentFormat: ['plaintext', 'markdown']},
          publishDiagnostics: {relatedInformation: true},
        },
      },
      workspaceFolders: [{
        uri: fileToUri(this.config.projectRoot),
        name: path.basename(this.config.projectRoot),
      }],
    } as lsp.InitializeParams);

    await this.connection.sendNotification(
        lsp.InitializedNotification.type, {});
    this.initialized = true;
    return this.connection;
  }

  private async openDocument(filePath: string): Promise<string> {
    const resolved = path.resolve(this.config.projectRoot, filePath);
    const uri = fileToUri(resolved);
    const content = fs.readFileSync(resolved, 'utf8');
    const connection = await this.ensureClangd();

    const existing = this.openDocuments.get(uri);
    if (existing) {
      if (existing.content !== content) {
        const newVersion = existing.version + 1;
        await connection.sendNotification(
            lsp.DidChangeTextDocumentNotification.type, {
              textDocument: {uri, version: newVersion},
              contentChanges: [{text: content}],
            });
        this.openDocuments.set(uri, {version: newVersion, content});
      }
    } else {
      await connection.sendNotification(
          lsp.DidOpenTextDocumentNotification.type, {
            textDocument: {
              uri,
              languageId: getLanguageId(resolved),
              version: 1,
              text: content,
            },
          });
      this.openDocuments.set(uri, {version: 1, content});
    }

    return uri;
  }

  private async waitForDiagnostics(uri: string,
                                   timeoutMs = 10000):
      Promise<lsp.Diagnostic[]> {
    const start = Date.now();
    // Wait for at least one diagnostic notification for this URI
    while (Date.now() - start < timeoutMs) {
      if (this.diagnosticsMap.has(uri)) {
        return this.diagnosticsMap.get(uri)!;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    return this.diagnosticsMap.get(uri) || [];
  }

  private async handleToolCall(
      name: string,
      args: Record<string, unknown>,
      ): Promise<{content: Array<{type: string; text: string}>;
                  isError?: boolean}> {
    // Secondary mode: forward to primary via socket
    if (this.serviceClient?.isConnected()) {
      try {
        return await this.serviceClient.request(name, args);
      } catch (error) {
        // If the primary went away, try to become primary ourselves
        this.serviceClient.disconnect();
        this.serviceClient = null;
        process.stderr.write(
            'Lost connection to primary clangd service, becoming primary...\n');
        await this.becomePrimary();
        // Fall through to handle locally
      }
    }

    // Primary mode: handle locally
    return this.handleToolCallLocally(name, args);
  }

  private async handleDiagnostics(args: Record<string, unknown>) {
    const filePath = args.filePath as string;
    const uri = await this.openDocument(filePath);
    // Clear previous diagnostics to ensure we get fresh results
    this.diagnosticsMap.delete(uri);
    const diagnostics = await this.waitForDiagnostics(uri);

    if (diagnostics.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No diagnostics found. The file compiles cleanly.',
        }],
      };
    }

    const text = diagnostics.map(formatDiagnostic).join('\n');
    return {
      content: [{
        type: 'text',
        text: `Found ${diagnostics.length} diagnostic(s):\n\n${text}`,
      }],
    };
  }

  private async handleHover(args: Record<string, unknown>) {
    const filePath = args.filePath as string;
    const line = args.line as number;
    const character = args.character as number;

    const uri = await this.openDocument(filePath);
    const connection = await this.ensureClangd();

    const result = await connection.sendRequest(lsp.HoverRequest.type, {
      textDocument: {uri},
      position: {line, character},
    });

    if (!result) {
      return {
        content:
            [{type: 'text', text: 'No hover information at this position.'}],
      };
    }

    return {content: [{type: 'text', text: extractHoverText(result)}]};
  }

  private async handleDefinition(args: Record<string, unknown>) {
    const filePath = args.filePath as string;
    const line = args.line as number;
    const character = args.character as number;

    const uri = await this.openDocument(filePath);
    const connection = await this.ensureClangd();

    const result = await connection.sendRequest(lsp.DefinitionRequest.type, {
      textDocument: {uri},
      position: {line, character},
    });

    if (!result || (Array.isArray(result) && result.length === 0)) {
      return {
        content: [{type: 'text', text: 'No definition found at this position.'}],
      };
    }

    const locations = Array.isArray(result) ? result : [result];
    const text = locations
                     .map(loc => {
                       if (lsp.Location.is(loc))
                         return formatLocation(loc);
                       if (lsp.LocationLink.is(loc)) {
                         return formatLocation({
                           uri: loc.targetUri,
                           range: loc.targetSelectionRange,
                         });
                       }
                       return JSON.stringify(loc);
                     })
                     .join('\n');

    return {
      content: [{type: 'text', text: `Definition(s) found:\n${text}`}],
    };
  }

  private async handleReferences(args: Record<string, unknown>) {
    const filePath = args.filePath as string;
    const line = args.line as number;
    const character = args.character as number;

    const uri = await this.openDocument(filePath);
    const connection = await this.ensureClangd();

    const result = await connection.sendRequest(lsp.ReferencesRequest.type, {
      textDocument: {uri},
      position: {line, character},
      context: {includeDeclaration: true},
    });

    if (!result || result.length === 0) {
      return {
        content:
            [{type: 'text', text: 'No references found at this position.'}],
      };
    }

    const text = result.map(formatLocation).join('\n');
    return {
      content: [{
        type: 'text',
        text: `Found ${result.length} reference(s):\n${text}`,
      }],
    };
  }

  private async handleCompletion(args: Record<string, unknown>) {
    const filePath = args.filePath as string;
    const line = args.line as number;
    const character = args.character as number;

    const uri = await this.openDocument(filePath);
    const connection = await this.ensureClangd();

    const result =
        await connection.sendRequest(lsp.CompletionRequest.type, {
          textDocument: {uri},
          position: {line, character},
        });

    if (!result) {
      return {
        content: [{
          type: 'text',
          text: 'No completions available at this position.',
        }],
      };
    }

    const items = Array.isArray(result) ? result : result.items;
    if (items.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No completions available at this position.',
        }],
      };
    }

    const maxItems = 20;
    const topItems = items.slice(0, maxItems);
    const text = topItems
                     .map(item => {
                       let entry = `${item.label}`;
                       if (item.detail)
                         entry += ` — ${item.detail}`;
                       if (item.documentation) {
                         const doc =
                             typeof item.documentation === 'string'
                                 ? item.documentation
                                 : (item.documentation as lsp.MarkupContent)
                                       .value;
                         if (doc)
                           entry += `\n  ${doc}`;
                       }
                       return entry;
                     })
                     .join('\n');

    const more = items.length > maxItems
                     ? `\n\n... and ${items.length - maxItems} more items`
                     : '';
    return {
      content: [{type: 'text', text: `Completions:\n${text}${more}`}],
    };
  }

  private async handleFormat(args: Record<string, unknown>) {
    const filePath = args.filePath as string;
    const uri = await this.openDocument(filePath);
    const connection = await this.ensureClangd();

    const edits = await connection.sendRequest(
        lsp.DocumentFormattingRequest.type, {
          textDocument: {uri},
          options: {tabSize: 2, insertSpaces: true},
        });

    if (!edits || edits.length === 0) {
      return {
        content: [{type: 'text', text: 'No formatting changes needed.'}],
      };
    }

    return {
      content: [{
        type: 'text',
        text: `${edits.length} formatting edit(s) computed. Apply them to format the file.`,
      }],
    };
  }

  private async handleSwitchSourceHeader(args: Record<string, unknown>) {
    const filePath = args.filePath as string;
    const uri = await this.openDocument(filePath);
    const connection = await this.ensureClangd();

    // textDocument/switchSourceHeader is a clangd extension
    const result = await connection.sendRequest<string|null>(
        'textDocument/switchSourceHeader',
        {uri});

    if (!result) {
      return {
        content: [{
          type: 'text',
          text: 'No corresponding header/source file found.',
        }],
      };
    }

    return {
      content: [{type: 'text', text: uriToFile(result)}],
    };
  }

  private async handleSymbolInfo(args: Record<string, unknown>) {
    const query = args.query as string;
    const connection = await this.ensureClangd();

    const result = await connection.sendRequest(
        lsp.WorkspaceSymbolRequest.type, {query});

    if (!result || result.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No symbols found matching "${query}".`,
        }],
      };
    }

    const maxSymbols = 30;
    const text =
        result.slice(0, maxSymbols)
            .map(sym => {
              const kindNames: Record<number, string> = {
                [lsp.SymbolKind.File]: 'File',
                [lsp.SymbolKind.Module]: 'Module',
                [lsp.SymbolKind.Namespace]: 'Namespace',
                [lsp.SymbolKind.Package]: 'Package',
                [lsp.SymbolKind.Class]: 'Class',
                [lsp.SymbolKind.Method]: 'Method',
                [lsp.SymbolKind.Property]: 'Property',
                [lsp.SymbolKind.Field]: 'Field',
                [lsp.SymbolKind.Constructor]: 'Constructor',
                [lsp.SymbolKind.Enum]: 'Enum',
                [lsp.SymbolKind.Interface]: 'Interface',
                [lsp.SymbolKind.Function]: 'Function',
                [lsp.SymbolKind.Variable]: 'Variable',
                [lsp.SymbolKind.Constant]: 'Constant',
                [lsp.SymbolKind.String]: 'String',
                [lsp.SymbolKind.Number]: 'Number',
                [lsp.SymbolKind.Boolean]: 'Boolean',
                [lsp.SymbolKind.Array]: 'Array',
                [lsp.SymbolKind.Object]: 'Object',
                [lsp.SymbolKind.Key]: 'Key',
                [lsp.SymbolKind.Null]: 'Null',
                [lsp.SymbolKind.EnumMember]: 'EnumMember',
                [lsp.SymbolKind.Struct]: 'Struct',
                [lsp.SymbolKind.Event]: 'Event',
                [lsp.SymbolKind.Operator]: 'Operator',
                [lsp.SymbolKind.TypeParameter]: 'TypeParameter',
              };
              const kind = kindNames[sym.kind] || 'Unknown';
              let location = '';
              if ('location' in sym && sym.location) {
                const loc = sym.location as lsp.Location;
                location =
                    ` — ${uriToFile(loc.uri)}:${loc.range.start.line + 1}`;
              }
              const container =
                  sym.containerName ? ` (in ${sym.containerName})` : '';
              return `[${kind}] ${sym.name}${container}${location}`;
            })
            .join('\n');

    const more = result.length > maxSymbols
                     ? `\n\n... and ${result.length - maxSymbols} more symbols`
                     : '';
    return {
      content: [{
        type: 'text',
        text: `Symbols matching "${query}":\n${text}${more}`,
      }],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Try to connect to an existing clangd service for this workspace
    const existingSocket = findExistingService(this.config.projectRoot);
    if (existingSocket) {
      const client = new ServiceClient(existingSocket);
      if (await client.connect()) {
        this.serviceClient = client;
        process.stderr.write(
            `Connected to existing clangd service for workspace: ${
                this.config.projectRoot}\n`);
      } else {
        // Socket exists but can't connect — become primary
        await this.becomePrimary();
      }
    } else {
      // No existing service — become primary
      await this.becomePrimary();
    }

    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  /**
   * Become the primary service: spawn clangd and start a socket server
   * so other MCP instances can share this clangd.
   */
  private async becomePrimary(): Promise<void> {
    this.isPrimary = true;
    this.serviceServer = new ServiceServer(
        this.config.projectRoot,
        (method, params) => this.handleToolCallLocally(method, params),
    );
    try {
      await this.serviceServer.start();
      process.stderr.write(
          `Started clangd service for workspace: ${
              this.config.projectRoot}\n`);
    } catch (err) {
      process.stderr.write(
          `Warning: Could not start socket server: ${err}\n`);
      // Continue without socket server — will still work, just not shared
      this.serviceServer = null;
    }
  }

  /**
   * Execute a tool call locally (primary mode — owns clangd).
   * This is separated from handleToolCall so the socket server can call it.
   */
  private async handleToolCallLocally(
      name: string,
      args: Record<string, unknown>,
      ): Promise<{content: Array<{type: string; text: string}>;
                  isError?: boolean}> {
    try {
      switch (name) {
      case 'clangd_diagnostics':
        return await this.handleDiagnostics(args);
      case 'clangd_hover':
        return await this.handleHover(args);
      case 'clangd_definition':
        return await this.handleDefinition(args);
      case 'clangd_references':
        return await this.handleReferences(args);
      case 'clangd_completion':
        return await this.handleCompletion(args);
      case 'clangd_format':
        return await this.handleFormat(args);
      case 'clangd_switch_source_header':
        return await this.handleSwitchSourceHeader(args);
      case 'clangd_symbol_info':
        return await this.handleSymbolInfo(args);
      default:
        return {
          content: [{type: 'text', text: `Unknown tool: ${name}`}],
          isError: true,
        };
      }
    } catch (error) {
      const message =
          error instanceof Error ? error.message : String(error);
      return {
        content: [{type: 'text', text: `Error: ${message}`}],
        isError: true,
      };
    }
  }

  private cleanup(): void {
    // Clean up socket service
    if (this.serviceClient) {
      this.serviceClient.disconnect();
    }
    if (this.serviceServer) {
      this.serviceServer.stop();
    }

    // Clean up clangd process (only in primary mode)
    if (this.connection) {
      this.connection.sendRequest(lsp.ShutdownRequest.type)
          .then(() => {
            this.connection?.sendNotification(lsp.ExitNotification.type);
            this.clangdProcess?.kill();
          })
          .catch(() => { this.clangdProcess?.kill(); });
    }

    // Clean up lock file if we're the primary
    if (this.isPrimary) {
      removeLock(this.config.projectRoot, process.pid);
    }

    process.exit(0);
  }
}

const config = parseArgs();
const mcpServer = new ClangdMCPServer(config);
mcpServer.run().catch((err) => {
  process.stderr.write(`Failed to start clangd MCP server: ${err}\n`);
  process.exit(1);
});
