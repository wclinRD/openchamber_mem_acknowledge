# Tasks and Acceptance Criteria

## Phase 0: Environment Check and Setup

- [ ] 0.1 Verify OpenCode 2.x and Node 18+ are available and the current project is initialized as a Git repo.
- [ ] 0.2 Verify `OPENCHAMBER_AGENT_TOOL_URL` and `OPENCHAMBER_AGENT_TOOL_TOKEN` are set in the environment where the plugin is loaded; confirm the endpoint format matches OpenChamber's documented payload format (`{ input, sessionID, callID, tool }`).
- [ ] 0.3 Create project skeleton: `src/`, `public/`, `doc/`, `tests/`.

## Phase 1: Core Plugin Tool

- [ ] 1.1 Implement `src/openchamberClient.js` with `callOpenChamberTool(ctx, toolName, input)`.
  - Validates `OPENCHAMBER_AGENT_TOOL_URL` and `OPENCHAMBER_AGENT_TOOL_TOKEN`.
  - Builds proper JSON payload and handles response parsing/validation.
  - Never logs the token or includes it in error messages.
- [ ] 1.2 Implement `src/backup.js` with backup serialization and validation functions (`validateBackupPayload`, `serializeBackup`, `buildDefaultBackup`).
  - Defines conflict resolution behavior (upsert by memoryId/knowledge id by default).
  - Handles versioning (`version: 1` reject unknown).
- [ ] 1.3 Implement `src/plugin.js` V2 plugin definition and register `memoryBridge` tool using `ctx.tool.transform(async (editor) => { await editor.add({...}) })`.
  - Tool input schema with all modes: `list-memory`, `read-memory`, `save-memory`, `delete-memory`, `list-knowledge`, `read-knowledge`, `save-knowledge`, `delete-knowledge`, `export-backup`, `import-backup`, `search-memory`, `search-knowledge`.
  - `import-backup` mode includes `importConflictPolicy` parameter (default `"upsert"`).
  - Execute mode logic via the OpenChamber client helper.
- [ ] 1.4 Write unit tests for backup utility and basic tool input schema validation.
- [ ] 1.5 Write integration tests that stub `fetch` to a local mock OpenChamber endpoint and verify tool dispatch returns expected content.

## Phase 2: Local Web Server and UI

- [ ] 2.1 Implement `src/server.js` with a minimal Node HTTP server exposing `/api/memories`, `/api/knowledge`, `/api/export`, `/api/import` endpoints.
  - Reads OpenChamber data via same client helper.
  - Fails fast if the configured port is already in use; optionally fallback to next available port and log warning.
- [ ] 2.2 Implement `public/ui.html` static UI:
  - Two panels: Memories and Acknowledge (acknowledge filtered to knowledge kind `note` with type/tag `acknowledge`).
  - List views with search/filter, pagination, and refresh after edit/delete.
  - Detail view for memory and knowledge items.
  - Export/Import buttons linked to server endpoints.
- [ ] 2.3 Register the server in plugin setup and provide cleanup on unload (store server reference, close on cleanup).

## Phase 3: Import/Export and Validation

- [ ] 3.1 Implement backup serialization format in `src/backup.js` with fields: `format`, `version`, `exportedAt`, `memories`, `knowledge`.
- [ ] 3.2 Implement import validation (no hardcoded data, strict JSON structure check, id conflicts handling) with explicit conflict policy (upsert by id; reject/duplicate skip as configured).
- [ ] 3.3 Add file system operations for `export-backup` and `import-backup` modes using Node `fs/promises`, with path validation:
  - Resolve and validate that paths are within allowed roots; reject `..` or symlinks outside the allowed root.
  - Never include the token in logs or error responses.

## Phase 4: Testing and Verification

- [ ] 4.1 Run `node --test` on `tests/plugin.test.js`.
- [ ] 4.2 Start the plugin locally and verify the tool is callable via `opencode` CLI or agent prompt.
- [ ] 4.3 Test the local server in a test process using a mock OpenChamber endpoint or by skipping network calls when the env vars are missing.

## Phase 5: Final Integration

- [ ] 5.1 Copy the plugin to `~/.config/opencode/plugins/opencode-openchamber-memory-bridge` and reload OpenCode.
- [ ] 5.2 Verify the `memoryBridge` tool appears in OpenCode tool list and can perform list/save/delete operations.
- [ ] 5.3 Verify the local Web UI is accessible at the configured port.
- [ ] 5.4 Create a real backup file via the tool or server, import it back, and verify data consistency.

## Acceptance Criteria

- [ ] No mock or hardcoded data in actual data paths; all memory/knowledge data comes from or goes to the OpenChamber managed tool.
- [ ] The plugin loads without errors in OpenCode 2.x using the exact V2 `ctx.tool.transform(async (editor) => { await editor.add({ name, input, execute }) })` registration pattern.
- [ ] The `memoryBridge` tool supports all required modes and returns structured content, including all memory and acknowledge modes.
- [ ] The Web UI displays memory and acknowledge data separately, with acknowledgment filtered properly and UI supports pagination and refresh after edits.
- [ ] The server fails fast on port collision or logs fallback behavior, and stops cleanly on plugin unload.
- [ ] Backup import/export preserves data integrity and follows the specified JSON format, with import conflict policies (upsert by id by default).
- [ ] File system paths for import/export are validated against allowed roots; tokens are never logged or exposed.
- [ ] Integration tests verify tool dispatch and server endpoints with mocked OpenChamber endpoint.
- [ ] All tests pass and documentation is complete.
