# Using clangd as an MCP Server

This project includes a standalone [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that exposes clangd's C/C++ language intelligence as tools for AI coding assistants like **Gemini CLI**, **OpenAI Codex**, **Claude Code**, and any other MCP-compatible client.

## What is MCP?

The Model Context Protocol is an open standard that lets AI assistants use external tools. The clangd MCP server gives AI assistants access to:

- **Compiler diagnostics** — errors, warnings, and suggestions
- **Hover information** — type info and documentation for symbols
- **Go-to-definition** — find where symbols are defined
- **Find references** — locate all usages of a symbol
- **Code completion** — context-aware suggestions
- **Code formatting** — clang-format integration
- **Switch source/header** — navigate between `.cpp` and `.h` files
- **Symbol search** — find functions, classes, and variables across the project

## Prerequisites

1. **Node.js** (v18 or later)
2. **clangd** installed and available on your `PATH` (or specify its location)
3. A C/C++ project with a `compile_commands.json` file (see [clangd project setup](https://clangd.llvm.org/installation#project-setup))

## Building the MCP Server

```bash
npm install
npm run build-mcp
```

This produces `out/mcp-server.js`.

## Configuration

The MCP server accepts configuration through command-line arguments or environment variables:

| CLI Argument | Environment Variable | Default | Description |
|---|---|---|---|
| `--clangd-path <path>` | `CLANGD_PATH` | `clangd` | Path to the clangd binary |
| `--project-root <path>` | `PROJECT_ROOT` | Current working directory | Root directory of your C/C++ project |
| — | `CLANGD_ARGS` | (none) | Space-separated extra arguments for clangd |

## Setup for Gemini CLI

Add the following to your `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "clangd": {
      "command": "node",
      "args": ["/path/to/vscode-clangd/out/mcp-server.js"],
      "env": {
        "PROJECT_ROOT": "/path/to/your/cpp/project"
      }
    }
  }
}
```

Or use command-line arguments:

```json
{
  "mcpServers": {
    "clangd": {
      "command": "node",
      "args": [
        "/path/to/vscode-clangd/out/mcp-server.js",
        "--project-root", "/path/to/your/cpp/project",
        "--clangd-path", "/usr/bin/clangd"
      ]
    }
  }
}
```

## Setup for OpenAI Codex

Add to your `~/.codex/config.json`:

```json
{
  "mcpServers": {
    "clangd": {
      "command": "node",
      "args": ["/path/to/vscode-clangd/out/mcp-server.js"],
      "env": {
        "PROJECT_ROOT": "/path/to/your/cpp/project"
      }
    }
  }
}
```

## Setup for Claude Code

Add the MCP server using the Claude Code CLI:

```bash
claude mcp add clangd -- node /path/to/vscode-clangd/out/mcp-server.js --project-root /path/to/your/cpp/project
```

## Available Tools

Once configured, the following tools are available to the AI assistant:

### `clangd_diagnostics`
Get compiler diagnostics (errors, warnings) for a file.
```
Input: { "filePath": "src/main.cpp" }
```

### `clangd_hover`
Get type information and documentation for a symbol.
```
Input: { "filePath": "src/main.cpp", "line": 10, "character": 5 }
```

### `clangd_definition`
Find where a symbol is defined.
```
Input: { "filePath": "src/main.cpp", "line": 10, "character": 5 }
```

### `clangd_references`
Find all references to a symbol across the project.
```
Input: { "filePath": "src/main.cpp", "line": 10, "character": 5 }
```

### `clangd_completion`
Get code completion suggestions at a position.
```
Input: { "filePath": "src/main.cpp", "line": 10, "character": 5 }
```

### `clangd_format`
Format a C/C++ file using clang-format.
```
Input: { "filePath": "src/main.cpp" }
```

### `clangd_switch_source_header`
Find the corresponding header/source file.
```
Input: { "filePath": "src/main.cpp" }
```

### `clangd_symbol_info`
Search for symbols matching a query.
```
Input: { "query": "MyClass" }
```

## Troubleshooting

### clangd not found
Set the path explicitly:
```bash
CLANGD_PATH=/usr/local/bin/clangd node out/mcp-server.js
```

### No diagnostics / "compiles cleanly" for all files
Ensure your project has a `compile_commands.json` in the project root. For CMake projects:
```bash
cmake -DCMAKE_EXPORT_COMPILE_COMMANDS=1 -B build
ln -s build/compile_commands.json .
```

### Debugging
clangd's stderr output is forwarded to the MCP server's stderr. You can capture it by redirecting stderr when testing manually:
```bash
node out/mcp-server.js 2>clangd-mcp.log
```
