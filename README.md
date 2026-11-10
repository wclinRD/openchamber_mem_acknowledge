# opencode-openchamber-memory-bridge

An OpenCode v2 plugin with **self-contained local SQLite storage** for memory and acknowledgment (knowledge) data. It no longer depends on OpenChamber external tools, allowing the LLM to store and retrieve data locally via its own database. A local Web UI is provided for managing stored memories and acknowledgments.

## Features

- **OpenCode v2 plugin** using `@opencode/plugin` 2.2.0 and the official `ctx.tool.transform(async (editor) => { await editor.add(...) })` registration pattern.
- **Local SQLite database** for memory and acknowledgment records, backed by Node.js `node:sqlite` (`DatabaseSync`).
- **Unified `memoryBridge` tool** with all required modes:
  - Memory: `list-memory`, `read-memory`, `save-memory`, `delete-memory`, `search-memory`
  - Acknowledge (knowledge): `list-knowledge`, `read-knowledge`, `save-knowledge`, `delete-knowledge`, `search-knowledge`
  - Backup: `export-backup`, `import-backup`
- **Local Web UI** served at `http://127.0.0.1:4800` by default, with separate panels for Memories and Acknowledge, search/filter, detail view, and Export/Import buttons.
- **Backup import/export** with JSON format `opencode-local-memory-bridge-backup` version 1, validation, conflict policies (`upsert` | `skip` | `error`), and path traversal protection for file operations.
- **No mocked or hardcoded data**: all interactions go through the local SQLite database in the plugin's data directory (`~/.local/share/opencode/plugins/opencode-openchamber-memory-bridge/data.db`).

## Architecture

```
agent session
    │
    ▼
Plugin `memoryBridge` tool (V2 JSON Schema)
    │
    ▼
Local SQLite database
    │
    ──► read/write memory/acknowledge locally
    ──► export/import backup JSON
```

The local Web UI and backup endpoints route through the same SQLite database.

## Requirements

- Node.js 20 or higher (uses `node:sqlite` DatabaseSync)
- OpenCode 2.x

No OpenChamber environment variables are required.

## Installation

1. Initialize the plugin as an OpenCode plugin (typical place: `~/.config/opencode/plugins/opencode-openchamber-memory-bridge`).
2. Ensure `package.json` has `"type": "module"` and depends on `"@opencode/plugin": "2.2.0"`.
3. Copy the source code (`src/plugin.js`, `src/openchamberClient.js`, `src/backup.js`, `src/server.js`, `src/dataStore.js`, and the plugin entry `index.js`) into the plugin directory.
4. Run `npm install` in the plugin directory to install `@opencode/plugin`.

Data is automatically stored in the plugin's data directory; no configuration is needed.

## Usage

### In an OpenCode session

Ask the agent to use `memoryBridge` to manage local memory or acknowledgment:

```
List my local memories with scope 'project'.
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

## Storage Location

The plugin creates and uses a local SQLite database file:

- macOS/Linux: `~/.local/share/opencode/plugins/opencode-openchamber-memory-bridge/data.db`
- Windows: `%APPDATA%\opencode\plugins\opencode-openchamber-memory-bridge\data.db`

## Security

- The local Web UI server binds to `127.0.0.1:4800` by default and exposes no authentication. Do not expose this port externally without additional controls.
- Backup file paths are validated to prevent traversal attacks and absolute-path escapes outside allowed roots.

## Development

Run tests:

```bash
node --test
```

Check syntax:

```bash
node --check src/plugin.js src/server.js src/dataStore.js src/backup.js
```

## License

MIT
