# opencode-openchamber-memory-bridge

An OpenCode v2 plugin that bridges the OpenCode agent with OpenChamber's built-in memory and knowledge tools. It provides a unified interface to read, write, search, export, and import OpenChamber `memory` and `acknowledge` (project knowledge) data, plus a local Web UI for managing stored memories and acknowledgments.

## Features

- **OpenCode v2 plugin** using `@opencode/plugin` 2.2.0 and the official `ctx.tool.transform(async (editor) => { await editor.add(...) })` registration pattern.
- **Unified `memoryBridge` tool** with all required modes:
  - Memory: `list-memory`, `read-memory`, `save-memory`, `delete-memory`, `search-memory`
  - Acknowledge (knowledge): `list-knowledge`, `read-knowledge`, `save-knowledge`, `delete-knowledge`, `search-knowledge`
  - Backup: `export-backup`, `import-backup`
- **Local Web UI** served at `http://127.0.0.1:4800` by default, with separate panels for Memories and Acknowledge, search/filter, detail view, and Export/Import buttons.
- **Backup import/export** with JSON format `openchamber-memory-bridge-backup` version 1, validation, conflict policies (`upsert` | `skip` | `error`), and path traversal protection for file operations.
- **No mock or hardcoded data**: all interactions go through actual OpenChamber tools via `OPENCHAMBER_AGENT_TOOL_URL` and `OPENCHAMBER_AGENT_TOOL_TOKEN`.

## Architecture

```
agent session
    │
    ▼
Plugin `memoryBridge` tool (V2 JSON Schema)
    │  ──► read memory/acknowledge via openchamber_memory/openchamber_knowledge tools
    │  ──► write/update/delete memory/acknowledge
    │
    ▼
OpenChamber agent-tool backend (environment: OPENCHAMBER_AGENT_TOOL_URL/TOKEN)
    │
    ▼
OpenChamber storage backend
```

The local Web UI and backup endpoints route through the same `openchamber_memory` / `openchamber_knowledge` tools.

## Requirements

- Node.js 18 or higher
- OpenCode 2.x
- Environment variables:
  - `OPENCHAMBER_AGENT_TOOL_URL`: HTTPS URL to the OpenChamber agent-tool endpoint
  - `OPENCHAMBER_AGENT_TOOL_TOKEN`: Bearer token for the endpoint

If these are missing, the plugin remains registered but reports `OPENCHAMBER_MANAGED_TOOL_UNAVAILABLE` for actual tool calls.

## Installation

1. Initialize the plugin as an OpenCode plugin (typical place: `~/.config/opencode/plugins/opencode-openchamber-memory-bridge`).
2. Ensure `package.json` has `"type": "module"` and depends on `"@opencode/plugin": "2.2.0"`.
3. Copy the source code (`src/plugin.js`, `src/openchamberClient.js`, `src/backup.js`, `src/server.js`, and the plugin entry `index.js`) into the plugin directory.
4. Run `npm install` in the plugin directory to install `@opencode/plugin`.

## Usage

### In an OpenCode session

Ask the agent to use `memoryBridge` to manage memory or acknowledge:

```
List my openchamber memories with scope 'project'.
Read memory with ID 'm-123'.
Save a memory with title 'Project constraint' and body 'Needs to be implemented'.
List acknowledge items related to plan 'plan-456'.
Search knowledge for 'API design'.
```

### Import/Export Backup (Tool)

```
Export backup to /path/to/backup.json with all scopes and kinds.
Import backup from /path/to/backup.json with conflict policy 'upsert'.
```

### Import/Export Backup (Web UI)

Open `http://127.0.0.1:4800` to view the local UI. The UI:

- Shows Memories and Acknowledge in separate tabs.
- Allows saving new memory or acknowledge items (acknowledge requires title prefix `📌 Acknowledge: ` or `Acknowledge: `).
- Provides Export Backup and Import Backup buttons.
- Filters acknowledge items by knowledge kind `note` with title prefix.

## Security

- The local Web UI server binds to `127.0.0.1:4800` by default and exposes no authentication. Do not expose this port externally without additional controls.
- Backup file paths are validated to prevent traversal attacks and absolute-path escapes outside allowed roots.
- The token is never logged or included in error messages or UI responses.

## Development

Run tests:

```bash
node --test
```

Check syntax:

```bash
node --check src/plugin.js src/server.js src/openchamberClient.js src/backup.js
```

## License

MIT