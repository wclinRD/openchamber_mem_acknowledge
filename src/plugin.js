import { Plugin } from "@opencode/plugin";
import { startLocalServer } from "./server.js";
import dataStore from "./dataStore.js";
import { validateBackupPayload, validateConflictMemory, validateConflictKnowledge, serializeBackup } from "./backup.js";
import { readFile, writeFile } from "fs/promises";
import { resolve, isAbsolute } from "path";
import { existsSync } from "fs";

const normalizeAllowedPath = (inputPath) => {
  const raw = inputPath || "";
  if (typeof raw !== "string" || raw.includes("..")) return null;
  const resolved = resolve(raw);
  if (isAbsolute(resolved) && !resolved.startsWith("/Users/wclin/")) {
    return null;
  }
  return resolved;
};

const modeList = [
  "list-memory",
  "read-memory",
  "save-memory",
  "delete-memory",
  "list-knowledge",
  "read-knowledge",
  "save-knowledge",
  "delete-knowledge",
  "export-backup",
  "import-backup",
  "search-memory",
  "search-knowledge",
];

const memoryBridgeSchema = {
  type: "object",
  properties: {
    mode: { type: "string", enum: modeList },
    scope: { type: "string" },
    limit: { type: "integer", minimum: 1 },
    memoryId: { type: "string" },
    title: { type: "string" },
    body: { type: "string" },
    type: { type: "string" },
    planId: { type: "string" },
    ready: { type: "boolean" },
    id: { type: "string" },
    completed: { type: "boolean" },
    dependsOn: { type: "array", items: { type: "string" } },
    expected: { type: "string" },
    sessionId: { type: "string" },
    path: { type: "string" },
    importConflictPolicy: { type: "string", enum: ["upsert", "skip", "error"] },
    query: { type: "string" },
    kinds: { type: "array", items: { type: "string" } },
  },
  required: ["mode"],
};

function parseResponseText(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function ensureAcknowledgeTitle(title) {
  const prefix = "📌 Acknowledge: ";
  return title && title.trim().startsWith(prefix) ? title : `${prefix}${title || ""}`.trim();
}

function extractAcknowledgeTitle(title) {
  const prefix = "📌 Acknowledge: ";
  if (title?.startsWith(prefix)) return title.slice(prefix.length).trim();
  const plainPrefix = "Acknowledge: ";
  if (title?.startsWith(plainPrefix)) return title.slice(plainPrefix.length).trim();
  return title || "";
}

function isAcknowledgeKnowledge(k) {
  if (k?.kind !== "note") return false;
  return (k.title || "").trim().startsWith("📌 Acknowledge: ") || (k.title || "").trim().startsWith("Acknowledge: ");
}

async function makeMemoryBridgeMode(ctx, memoryBridgeInput) {
  const { mode } = memoryBridgeInput;
  switch (mode) {
    case "list-memory":
      return {
        content: JSON.stringify(await dataStore.listMemories(ctx, { scope: memoryBridgeInput.scope, limit: memoryBridgeInput.limit })),
        metadata: {
          source: "local-sqlite",
          action: "list-memory",
          ok: true,
        },
      };
    case "read-memory":
      return {
        content: JSON.stringify(await dataStore.readMemory(ctx, { memoryId: memoryBridgeInput.memoryId, title: memoryBridgeInput.title })),
        metadata: {
          source: "local-sqlite",
          action: "read-memory",
          ok: true,
        },
      };
    case "save-memory":
      return {
        content: JSON.stringify(await dataStore.saveMemory(ctx, {
          title: memoryBridgeInput.title,
          body: memoryBridgeInput.body,
          type: memoryBridgeInput.type,
          scope: memoryBridgeInput.scope,
          memoryId: memoryBridgeInput.memoryId,
        })),
        metadata: {
          source: "local-sqlite",
          action: "save-memory",
          ok: true,
        },
      };
    case "delete-memory":
      return {
        content: JSON.stringify(await dataStore.deleteMemory(ctx, { memoryId: memoryBridgeInput.memoryId })),
        metadata: {
          source: "local-sqlite",
          action: "delete-memory",
          ok: true,
        },
      };
    case "list-knowledge":
      return {
        content: JSON.stringify(await dataStore.listKnowledge(ctx, { planId: memoryBridgeInput.planId, ready: memoryBridgeInput.ready, limit: memoryBridgeInput.limit })),
        metadata: {
          source: "local-sqlite",
          action: "list-knowledge",
          ok: true,
        },
      };
    case "read-knowledge":
      return {
        content: JSON.stringify(await dataStore.readKnowledge(ctx, { id: memoryBridgeInput.id, title: memoryBridgeInput.title })),
        metadata: {
          source: "local-sqlite",
          action: "read-knowledge",
          ok: true,
        },
      };
    case "save-knowledge":
      return {
        content: JSON.stringify(await dataStore.saveKnowledge(ctx, {
          kind: memoryBridgeInput.kind,
          body: memoryBridgeInput.body,
          id: memoryBridgeInput.id,
          title: memoryBridgeInput.title,
          completed: memoryBridgeInput.completed,
          planId: memoryBridgeInput.planId,
          dependsOn: memoryBridgeInput.dependsOn,
          expected: memoryBridgeInput.expected,
          sessionId: memoryBridgeInput.sessionId,
        })),
        metadata: {
          source: "local-sqlite",
          action: "save-knowledge",
          ok: true,
        },
      };
    case "delete-knowledge":
      return {
        content: JSON.stringify(await dataStore.deleteKnowledge(ctx, { kind: memoryBridgeInput.kind, id: memoryBridgeInput.id })),
        metadata: {
          source: "local-sqlite",
          action: "delete-knowledge",
          ok: true,
        },
      };
    case "export-backup": {
      const backup = await dataStore.exportBackup(ctx, {});
      const validErrors = validateBackupPayload(backup);
      if (validErrors.length > 0) {
        return {
          content: JSON.stringify({ ok: false, errors: validErrors }),
          metadata: {
            source: "local-sqlite",
            action: "export-backup",
            ok: false,
          },
        };
      }
      const allowedPath = normalizeAllowedPath(memoryBridgeInput.path);
      if (!allowedPath) {
        return {
          content: JSON.stringify({ ok: false, error: { message: "Invalid path" } }),
          metadata: {
            source: "local-sqlite",
            action: "export-backup",
            ok: false,
          },
        };
      }
      await writeFile(allowedPath, JSON.stringify(backup, null, 2), "utf8");
      return {
        content: JSON.stringify({ ok: true, writtenTo: memoryBridgeInput.path, backup }),
        metadata: {
          source: "local-sqlite",
          action: "export-backup",
          ok: true,
        },
      };
    }
    case "import-backup": {
      const allowedPath = normalizeAllowedPath(memoryBridgeInput.path);
      if (!allowedPath) {
        return {
          content: JSON.stringify({ ok: false, error: { message: "Invalid path" } }),
          metadata: {
            source: "local-sqlite",
            action: "import-backup",
            ok: false,
          },
        };
      }
      const raw = await readFile(allowedPath, "utf8");
      const backup = parseResponseText(raw);
      const validErrors = validateBackupPayload(backup);
      if (validErrors.length > 0) {
        return {
          content: JSON.stringify({ ok: false, errors: validErrors }),
          metadata: {
            source: "local-sqlite",
            action: "import-backup",
            ok: false,
          },
        };
      }
      const conflictPolicy = memoryBridgeInput.importConflictPolicy || "upsert";
      try {
        await dataStore.importBackup(ctx, backup, conflictPolicy);
        return {
          content: JSON.stringify({
            ok: true,
            importedMemories: backup.memories?.length || 0,
            importedKnowledge: backup.knowledge?.length || 0,
          }),
          metadata: {
            source: "local-sqlite",
            action: "import-backup",
            ok: true,
          },
        };
      } catch (err) {
        return {
          content: JSON.stringify({
            ok: false,
            error: { message: err.message },
          }),
          metadata: {
            source: "local-sqlite",
            action: "import-backup",
            ok: false,
          },
        };
      }
    }
    case "search-memory":
      return {
        content: JSON.stringify(await dataStore.listMemories(ctx, { query: memoryBridgeInput.query, scope: memoryBridgeInput.scope })),
        metadata: {
          source: "local-sqlite",
          action: "search-memory",
          ok: true,
        },
      };
    case "search-knowledge":
      return {
        content: JSON.stringify(await dataStore.searchKnowledge(ctx, { query: memoryBridgeInput.query, planId: memoryBridgeInput.planId })),
        metadata: {
          source: "local-sqlite",
          action: "search-knowledge",
          ok: true,
        },
      };
    default:
      return {
        content: JSON.stringify({ ok: false, error: { message: "Unsupported mode" } }),
        metadata: {
          source: "local-sqlite",
          action: mode,
          ok: false,
        },
      };
  }
}

export default Plugin.define({
  id: "opencode-openchamber-memory-bridge",
  async setup(ctx) {
    const server = startLocalServer(ctx.options?.webServerPort || 4800);
    const registration = await ctx.tool.transform(async (editor) => {
      await editor.add({
        name: "memoryBridge",
        description: "Read/write local SQLite database for memory and acknowledge (knowledge), export/import backups",
        input: memoryBridgeSchema,
        execute: async (input, context) => {
          const result = await makeMemoryBridgeMode(context, input);
          const contentText = result.content;
          const parsed = parseResponseText(contentText);
          const content = parsed && parsed.ok === true ? contentText : contentText;
          return {
            content,
            metadata: result.metadata,
          };
        },
      });
    });
    return () => {
      registration.dispose?.();
      server.close();
      dataStore.close();
    };
  },
});
