/**
 * MCP socket server for the VSCode extension.
 *
 * When enabled, starts a Unix domain socket server that allows external
 * MCP server processes to reuse the VSCode extension's clangd instance.
 * This prevents duplicate clangd processes for the same workspace.
 */

import * as vscode from 'vscode';
import * as vscodelc from 'vscode-languageclient/node';

import {ClangdContext} from './clangd-context';
import {ServiceServer} from './clangd-service';

/**
 * Activate the MCP socket server for the VSCode extension.
 * This allows external MCP server instances to share this clangd.
 */
export function activate(context: ClangdContext): void {
  const rootPath = vscode.workspace.rootPath || process.cwd();
  const client = context.client;

  const handler = async (
      method: string,
      params: Record<string, unknown>,
      ): Promise<{content: Array<{type: string; text: string}>;
                  isError?: boolean}> => {
    // Wait for the client to be ready
    if (!context.clientIsRunning()) {
      return {
        content: [{
          type: 'text',
          text: 'clangd is not running yet. Please wait for it to start.',
        }],
        isError: true,
      };
    }

    switch (method) {
    case 'clangd_diagnostics':
      return handleDiagnostics(client, params);
    case 'clangd_hover':
      return handleHover(client, params);
    case 'clangd_definition':
      return handleDefinition(client, params);
    case 'clangd_references':
      return handleReferences(client, params);
    case 'clangd_completion':
      return handleCompletion(client, params);
    case 'clangd_switch_source_header':
      return handleSwitchSourceHeader(client, params);
    case 'clangd_symbol_info':
      return handleSymbolInfo(client, params);
    default:
      return {
        content: [{type: 'text', text: `Unknown tool: ${method}`}],
        isError: true,
      };
    }
  };

  const serviceServer = new ServiceServer(rootPath, handler);
  serviceServer.start()
      .then(() => {
        console.log('clangd MCP socket server started for workspace');
      })
      .catch((err) => {
        console.error('Failed to start MCP socket server:', err);
      });

  context.subscriptions.push({
    dispose: () => { serviceServer.stop(); },
  });
}

// === Tool handlers using VSCode LanguageClient ===

function uriFromPath(filePath: string): string {
  return vscode.Uri.file(filePath).toString();
}

function uriToPath(uri: string): string {
  return vscode.Uri.parse(uri).fsPath;
}

function severityToString(severity: vscode.DiagnosticSeverity): string {
  switch (severity) {
  case vscode.DiagnosticSeverity.Error:
    return 'Error';
  case vscode.DiagnosticSeverity.Warning:
    return 'Warning';
  case vscode.DiagnosticSeverity.Information:
    return 'Information';
  case vscode.DiagnosticSeverity.Hint:
    return 'Hint';
  default:
    return 'Unknown';
  }
}

async function handleDiagnostics(
    _client: vscodelc.LanguageClient,
    params: Record<string, unknown>,
    ) {
  const filePath = params.filePath as string;
  const uri = vscode.Uri.file(filePath);
  const diagnostics = vscode.languages.getDiagnostics(uri);

  if (diagnostics.length === 0) {
    return {
      content: [{
        type: 'text',
        text: 'No diagnostics found. The file compiles cleanly.',
      }],
    };
  }

  const text = diagnostics
                   .map(d => {
                     const sev = severityToString(d.severity);
                     const loc =
                         `${d.range.start.line + 1}:${
                             d.range.start.character + 1}`;
                     let msg = `[${sev}] Line ${loc}: ${d.message}`;
                     if (d.source)
                       msg += ` (${d.source})`;
                     return msg;
                   })
                   .join('\n');

  return {
    content: [{
      type: 'text',
      text: `Found ${diagnostics.length} diagnostic(s):\n\n${text}`,
    }],
  };
}

async function handleHover(
    client: vscodelc.LanguageClient,
    params: Record<string, unknown>,
    ) {
  const filePath = params.filePath as string;
  const line = params.line as number;
  const character = params.character as number;

  const result = await client.sendRequest(vscodelc.HoverRequest.type, {
    textDocument: {uri: uriFromPath(filePath)},
    position: {line, character},
  });

  if (!result) {
    return {
      content:
          [{type: 'text', text: 'No hover information at this position.'}],
    };
  }

  const contents = result.contents;
  let text: string;
  if (typeof contents === 'string') {
    text = contents;
  } else if ('kind' in contents) {
    text = contents.value;
  } else if (Array.isArray(contents)) {
    text = contents.map(c => typeof c === 'string' ? c : c.value).join('\n');
  } else {
    text = contents.value;
  }

  return {content: [{type: 'text', text}]};
}

async function handleDefinition(
    client: vscodelc.LanguageClient,
    params: Record<string, unknown>,
    ) {
  const filePath = params.filePath as string;
  const line = params.line as number;
  const character = params.character as number;

  const result = await client.sendRequest(vscodelc.DefinitionRequest.type, {
    textDocument: {uri: uriFromPath(filePath)},
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
                     if ('uri' in loc && 'range' in loc) {
                       return `${uriToPath(loc.uri)}:${
                           loc.range.start.line + 1}:${
                           loc.range.start.character + 1}`;
                     }
                     if ('targetUri' in loc) {
                       return `${uriToPath(loc.targetUri)}:${
                           loc.targetSelectionRange.start.line + 1}:${
                           loc.targetSelectionRange.start.character + 1}`;
                     }
                     return JSON.stringify(loc);
                   })
                   .join('\n');

  return {
    content: [{type: 'text', text: `Definition(s) found:\n${text}`}],
  };
}

async function handleReferences(
    client: vscodelc.LanguageClient,
    params: Record<string, unknown>,
    ) {
  const filePath = params.filePath as string;
  const line = params.line as number;
  const character = params.character as number;

  const result = await client.sendRequest(vscodelc.ReferencesRequest.type, {
    textDocument: {uri: uriFromPath(filePath)},
    position: {line, character},
    context: {includeDeclaration: true},
  });

  if (!result || result.length === 0) {
    return {
      content:
          [{type: 'text', text: 'No references found at this position.'}],
    };
  }

  const text = result
                   .map(loc => `${uriToPath(loc.uri)}:${
                            loc.range.start.line + 1}:${
                            loc.range.start.character + 1}`)
                   .join('\n');
  return {
    content: [{
      type: 'text',
      text: `Found ${result.length} reference(s):\n${text}`,
    }],
  };
}

async function handleCompletion(
    client: vscodelc.LanguageClient,
    params: Record<string, unknown>,
    ) {
  const filePath = params.filePath as string;
  const line = params.line as number;
  const character = params.character as number;

  const result = await client.sendRequest(vscodelc.CompletionRequest.type, {
    textDocument: {uri: uriFromPath(filePath)},
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
                   .map((item: vscodelc.CompletionItem) => {
                     let entry = `${item.label}`;
                     if (item.detail)
                       entry += ` — ${item.detail}`;
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

async function handleSwitchSourceHeader(
    client: vscodelc.LanguageClient,
    params: Record<string, unknown>,
    ) {
  const filePath = params.filePath as string;

  const result = await client.sendRequest<string|null>(
      'textDocument/switchSourceHeader',
      {uri: uriFromPath(filePath)});

  if (!result) {
    return {
      content: [{
        type: 'text',
        text: 'No corresponding header/source file found.',
      }],
    };
  }

  return {
    content: [{type: 'text', text: uriToPath(result)}],
  };
}

async function handleSymbolInfo(
    client: vscodelc.LanguageClient,
    params: Record<string, unknown>,
    ) {
  const query = params.query as string;

  const result =
      await client.sendRequest(vscodelc.WorkspaceSymbolRequest.type, {query});

  if (!result || result.length === 0) {
    return {
      content: [{
        type: 'text',
        text: `No symbols found matching "${query}".`,
      }],
    };
  }

  const maxSymbols = 30;
  const text = result.slice(0, maxSymbols)
                   .map((sym) => {
                     let location = '';
                     if ('location' in sym && sym.location &&
                         'range' in sym.location) {
                       location = ` — ${uriToPath(sym.location.uri)}:${
                           sym.location.range.start.line + 1}`;
                     }
                     const container =
                         sym.containerName ? ` (in ${sym.containerName})` : '';
                     return `${sym.name}${container}${location}`;
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
