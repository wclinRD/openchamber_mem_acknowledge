# OpenCode Plugin: openchamber Memory & Acknowledge Bridge

## 1. Overview

This plugin bridges the OpenCode agent with OpenChamber's built-in memory and knowledge tools. It provides a unified memory interface that can read, write, import, and export both `openchamber memory` and `openchamber acknowledge` data. It also includes a Web UI for browsing and managing stored memories and acknowledgments.

### 1.1 Goals

1. **Read/Write OpenChamber Memory and Acknowledge**: Expose OpenCode tools that wrap `openchamber memory` and `openchamber knowledge` tools internally, allowing agents to store and retrieve cross-session facts and project knowledge. In OpenChamber terms, "acknowledge" is implemented as a naming convention for knowledge items of kind `note`: the title must begin with the prefix `📌 Acknowledge: ` (or plain `Acknowledge: `) so the UI and import/export filters can reliably identify them; body constraints are as per the OpenChamber API.
2. **Web UI for Display**: Provide a local HTTP server with a static HTML UI showing memory and acknowledge lists separately, with search, view, edit, and delete capabilities, pagination, and refresh after edit/delete.
3. **Import/Export Backups**: Allow agents and users to export memory and acknowledge data to JSON backups and import from them.
4. **No Mock/Hardcode**: All data interactions must go through the actual OpenChamber tool endpoints; no hardcoded data or stubs.

### 1.2 Architecture

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

The plugin does not store data itself; it delegates to OpenChamber's managed tools via environment variables. The local server provides a browsable UI and backup endpoints that read from those same OpenChamber calls.

### 1.3 OpenChamber Tools Used

| Tool | Modes | Description |
|---|---|---|
| `openchamber_memory` | `memory.read`, `memory.list`, `memory.save`, `memory.delete` | Persistent facts/preferences across sessions, scoped global/project/both |
| `openchamber_knowledge` | `knowledge.list`, `knowledge.save`, `knowledge.delete`, `knowledge.show` | Project Notes, Todos, Plans |

### 1.4 Plugin Name

`opencode-openchamber-memory-bridge`

## 2. Implementation Details

### 2.1 V2 Plugin Definition

`src/plugin.js` must export a standard OpenCode V2 plugin using `ctx.tool.transform()` (the documented V2 tool registration pattern, see [OpenCode V2 Plugin Documentation](https://opencode.ai/v2/docs/build/plugins)).

```js
import { Plugin } from "@opencode/plugin";

export default Plugin.define({
  id: "opencode-openchamber-memory-bridge",
  async setup(ctx) {
    // 1. Initialize server
    const server = startLocalServer(ctx.options?.webServerPort || 4800);
    // 2. Register memoryBridge tool via ctx.tool.transform
    const registration = await ctx.tool.transform(async (editor) => {
      await editor.add({
        name: "memoryBridge",
        description: "Read/write OpenChamber memory and acknowledge (knowledge), export/import backups",
        input: memoryBridgeSchema,
        execute: async (input, context) => await handleMemoryBridgeMode(input, context),
      });
    });
    // 3. Return cleanup
    return () => {
      registration.dispose?.();
      server.close();
    };
  }
});
```

Tool input uses standard JSON Schema 2020-12 shape (`input` property with `type: "object"`, `properties`, and `required`).

### 2.0 Environment Prerequisites

Before any OpenChamber tool call succeeds:

- `OPENCHAMBER_AGENT_TOOL_URL` must be a valid HTTPS URL pointing to the OpenChamber agent-tool endpoint.
- `OPENCHAMBER_AGENT_TOOL_TOKEN` must be a valid bearer token for that endpoint.
- If either is missing, `callOpenChamberTool` returns an error `OPENCHAMBER_MANAGED_TOOL_UNAVAILABLE`; the tool remains registered but reports missing environment variables rather than failing to load.

## 2.2 memoryBridge Tool

One V2 tool named `memoryBridge` with `input` schema covering:

The schema follows OpenCode V2's tool input format (JSON Schema 2020-12 with `mode` as the discriminant field):

```js
{
  type: "object",
  properties: {
    mode: { type: "string", enum: ["list-memory", "read-memory", ...] },
    // mode-specific fields (optional based on mode)
  },
  required: ["mode"],
}
```

- `mode`: `"list-memory"`, `"read-memory"`, `"save-memory"`, `"delete-memory"`, `"list-knowledge"`, `"read-knowledge"`, `"save-knowledge"`, `"delete-knowledge"`, `"export-backup"`, `"import-backup"`, `"search-memory"`, `"search-knowledge"`
- Arguments per mode:
  - `list-memory`: `scope`, `limit`
  - `read-memory`: `memoryId` or `title`
  - `save-memory`: `title`, `body`, `type`, `scope`, `memoryId` (optional rewrite)
  - `delete-memory`: `memoryId`, `scope`
  - `list-knowledge`: `planId`, `ready`, `limit`
  - `read-knowledge`: `kind`, `id`
  - `save-knowledge`: `kind`, `body`, `id`, `completed`, `planId`, `dependsOn`, `expected`, `sessionId`
  - `delete-knowledge`: `kind`, `id`
  - `export-backup`: `path`, `scope?`, `kinds?`
  - `import-backup`: `path`, `importConflictPolicy` (default `"upsert"`; valid values: `"upsert"` | `"skip"` | `"error"`), `scope?`
  - `search-memory`: `query`, `scope?`
  - `search-knowledge`: `query`, `planId?`

Execute the tool by:

1. Checking `OPENCHAMBER_AGENT_TOOL_URL` and `OPENCHAMBER_AGENT_TOOL_TOKEN` are set.
2. Constructing an internal `fetch` POST request to the OpenChamber agent tool endpoint with appropriate `input` and `tool` fields (`openchamber_memory` or `openchamber_knowledge`).
3. Parsing the response and returning structured content.

### 2.3 OpenChamber Agent Tool Invocation

A helper `callOpenChamberTool(ctx, toolName, input)` does:

- Validate URL and token
- Build JSON:
  ```json
  {
    "input": input,
    "sessionID": context.sessionID,
    "callID": context.id,
    "tool": toolName
  }
  ```
- POST to `process.env.OPENCHAMBER_AGENT_TOOL_URL` with `authorization: Bearer ${token}` and `content-type: application/json`
- Read response text, parse JSON if possible
- Validate `schemaVersion === 1 && ok === boolean`
- Return `{ content, metadata }` or failure payload

### 2.4 Local Web Server

A lightweight HTTP server (no external deps beyond Node built-ins):

- Listens on configurable host/port (e.g. `127.0.0.1:4800` by default, or `webServerPort` from ctx.options).
- If the port is already in use, fail fast with a clear error during plugin setup, or optionally attempt to bind a new port (e.g. `4801`, `4802`) and warn in logs; the plan prefers fail-fast to avoid confusion.
- Serves static HTML/JS UI at `/`.
- Exposes endpoints:
  - `GET /api/memories` → calls `openchamber_memory` `memory.list`
  - `GET /api/memories/:id` → `openchamber_memory` `memory.read`
  - `POST /api/memories` → `openchamber_memory` `memory.save`
  - `DELETE /api/memories/:id` → `openchamber_memory` `memory.delete`
  - `GET /api/knowledge` → `openchamber_knowledge` `knowledge.list` (filters `acknowledge` kind)
  - `GET /api/knowledge/:id` → `openchamber_knowledge` `knowledge.show`
  - `POST /api/knowledge` → `openchamber_knowledge` `knowledge.save`
  - `DELETE /api/knowledge/:id` → `openchamber_knowledge` `knowledge.delete`
  - `GET /api/export?path=...&kinds=memory,note,todo,plan` → aggregate export JSON
  - `POST /api/import?path=...` → aggregate import JSON

The UI must be a self-contained HTML file, with inline styles and minimal JS. No external dependencies.

### 2.5 Web Server Security Note

This server is intended for local use only (binds to loopback by default). It does **not** require authentication because it only exposes read/write bridges to the OpenChamber tool; however, any local process on the same machine can call it. Users should not expose this port to other hosts without adding their own authentication or firewall rules.

### 2.6 OpenChamber API Constraints

- `memory.save`: `title` must be at most 60 characters; `body` must be at most 2000 characters.
- `knowledge.save`: `body` for note is around 3000 characters (subject to platform limits); all other kinds have their own limits (todo, plan).
- The UI and import/export must enforce these limits and show user-friendly validation errors.
- Acknowledge filtering: only knowledge items of kind `note` whose `title` begins with `📌 Acknowledge: ` (or `Acknowledge: `) are considered "acknowledge" in the UI.

### 2.7 Backup Format

Export backup JSON structure:

```json
{
  "format": "openchamber-memory-bridge-backup",
  "version": 1,
  "exportedAt": "2026-11-10T10:00:00.000Z",
  "memories": [
    { "title": "...", "body": "...", "type": "fact|preference|reference", "scope": "global|project|both", "memoryId": "..." }
  ],
  "knowledge": [
    { "kind": "note|todo|plan", "body": "...", "id": "...", "completed": false, "planId": "...", "dependsOn": ["..."] }
  ]
}
```

Import validation checks and conflict policy:

- `format` is recognized and `version` is `1` (future versions should be rejected or handled with a migration policy).
- Each memory item has `title`, `body`, `type`, `scope`, `memoryId`. Each knowledge item has `kind`, `body`, `id`.
- Memory import behavior: by default, upsert memories by `memoryId` (same memoryId updates the existing memory title/body), rejecting items that change the title without the same memoryId. Knowledge import behavior: upsert knowledge by `id`; skip or reject duplicate `id`/kind conflicts according to `importConflictPolicy` (default: upsert).
- No overlapping memoryId with same title (allow updates); Knowledge ids do not overlap existing IDs unless they are intentionally upserts by id.

### 2.8 Error Handling

- Missing environment variables: tool returns error `OPENCHAMBER_MANAGED_TOOL_UNAVAILABLE`.
- OpenChamber returns `ok: false`: propagate error message and action.
- HTTP errors: translate to structured `{ ok: false, error: { message } }`.
- Parse failures: return JSON error string.

### 2.9 Security and Filesystem Access

- Use loopback host by default; allow configurable host (warn if not 127.0.0.1 or ::1).
- UI does not expose secrets; data returned via tools is text only.
- Import validation prevents executing arbitrary scripts (no eval, no file reads beyond JSON path).
- `export-backup` and `import-backup` modes use Node `fs/promises` to write/read JSON files; enforce path validation:
  - Paths must resolve within the project directory or an explicitly allowed directory (e.g. project root or `~/.openchamber-backups`).
  - Reject paths containing `..` or symlinks pointing outside allowed roots.
  - Do not log environment token anywhere; only include it in the HTTP header, never in errors or UI.
- The local HTTP server must serve only static HTML/JS and JSON API responses; never execute code from imported backups.

## 3. File Structure

```
opencode-openchamber-memory-bridge/
├── index.js                   # export { default } from "./src/plugin.js"
├── package.json
├── src/
│   ├── plugin.js              # Plugin define + tool registration
│   ├── openchamberClient.js   # OpenChamber agent tool invoke helper
│   ├── server.js              # Local HTTP server + UI
│   └── backup.js              # Import/export validation and formatting
├── public/
│   └── ui.html                # Static HTML UI for browsing memories/knowledge
└── tests/
    └── plugin.test.js         # Node test for tools and server behavior
```

## 4. Testing Strategy

- Unit tests for backup validation and JSON formatting.
- V2 plugin load test via `node --test` (Node 18+) ensuring plugin is importable and schema is valid.
- Tool dispatch tests: stub `fetch` to a local mock OpenChamber endpoint, verify tool execution calls expected endpoints and returns expected structured content.
- Server endpoint tests: start server on an ephemeral port, call `/api/memories`, `/api/knowledge`, `/api/export`, `/api/import` and assert results with a mocked or local OpenChamber endpoint.

## 5. Acceptance Criteria

1. Plugin loads under OpenCode 2.x without errors.
2. `memoryBridge` tool lists, reads, saves, and deletes memory and knowledge.
3. Web UI runs and displays memory/knowledge data.
4. Export creates valid JSON backup file; import restores it without hardcoding.
5. Tests pass.
