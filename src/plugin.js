import { Plugin } from "@opencode/plugin";
import { callOpenChamberTool } from "./openchamberClient.js";
import { startLocalServer } from "./server.js";
import { validateBackupPayload, validateConflictMemory, validateConflictKnowledge, serializeBackup } from "./backup.js";
import { readFile, writeFile } from "fs/promises";
import { resolve, normalize, relative } from "path";
import { existsSync } from "fs";

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
      return callOpenChamberTool(ctx, "openchamber_memory", {
        action: "memory.list",
        parameters: { scope: memoryBridgeInput.scope, limit: memoryBridgeInput.limit },
      });
    case "read-memory":
      return callOpenChamberTool(ctx, "openchamber_memory", {
        action: "memory.read",
        parameters: memoryBridgeInput.memoryId ? { memoryId: memoryBridgeInput.memoryId } : { title: memoryBridgeInput.title },
      });
    case "save-memory":
      return callOpenChamberTool(ctx, "openchamber_memory", {
        action: "memory.save",
        parameters: {
          title: memoryBridgeInput.title,
          body: memoryBridgeInput.body,
          type: memoryBridgeInput.type,
          scope: memoryBridgeInput.scope,
          memoryId: memoryBridgeInput.memoryId,
        },
      });
    case "delete-memory":
      return callOpenChamberTool(ctx, "openchamber_memory", {
        action: "memory.delete",
        parameters: { memoryId: memoryBridgeInput.memoryId, scope: memoryBridgeInput.scope },
      });
    case "list-knowledge":
      return callOpenChamberTool(ctx, "openchamber_knowledge", {
        action: "knowledge.list",
        parameters: { planId: memoryBridgeInput.planId, ready: memoryBridgeInput.ready, limit: memoryBridgeInput.limit },
      });
    case "read-knowledge":
      return callOpenChamberTool(ctx, "openchamber_knowledge", {
        action: "knowledge.show",
        parameters: { kind: memoryBridgeInput.kind, id: memoryBridgeInput.id },
      });
    case "save-knowledge":
      return callOpenChamberTool(ctx, "openchamber_knowledge", {
        action: "knowledge.save",
        parameters: {
          kind: memoryBridgeInput.kind,
          body: memoryBridgeInput.body,
          id: memoryBridgeInput.id,
          completed: memoryBridgeInput.completed,
          planId: memoryBridgeInput.planId,
          dependsOn: memoryBridgeInput.dependsOn,
          expected: memoryBridgeInput.expected,
          sessionId: memoryBridgeInput.sessionId,
        },
      });
    case "delete-knowledge":
      return callOpenChamberTool(ctx, "openchamber_knowledge", {
        action: "knowledge.delete",
        parameters: { kind: memoryBridgeInput.kind, id: memoryBridgeInput.id },
      });
    case "export-backup": {
      const [memoryResult, knowledgeResult] = await Promise.all([
        callOpenChamberTool(ctx, "openchamber_memory", { action: "memory.list", parameters: { scope: memoryBridgeInput.scope } }),
        callOpenChamberTool(ctx, "openchamber_knowledge", { action: "knowledge.list", parameters: {} }),
      ]);
      const memoryList = parseResponseText(memoryResult.content);
      const knowledgeList = parseResponseText(knowledgeResult.content);
      const backup = serializeBackup(memoryList, knowledgeList);
      const validErrors = validateBackupPayload(backup);
      if (validErrors.length > 0) {
        return {
          content: JSON.stringify({ ok: false, errors: validErrors }),
          metadata: {
            openchamber: { schemaVersion: 1, action: "export-backup", ok: false },
          },
        };
      }
      await writeFile(memoryBridgeInput.path, JSON.stringify(backup, null, 2), "utf8");
      return {
        content: JSON.stringify({ ok: true, writtenTo: memoryBridgeInput.path, backup }),
        metadata: {
          openchamber: { schemaVersion: 1, action: "export-backup", ok: true },
        },
      };
    }
    case "import-backup": {
      const raw = await readFile(memoryBridgeInput.path, "utf8");
      const backup = parseResponseText(raw);
      const validErrors = validateBackupPayload(backup);
      if (validErrors.length > 0) {
        return {
          content: JSON.stringify({ ok: false, errors: validErrors }),
          metadata: {
            openchamber: { schemaVersion: 1, action: "import-backup", ok: false },
          },
        };
      }
      const conflictPolicy = memoryBridgeInput.importConflictPolicy || "upsert";
      const [existingMemoryResult, existingKnowledgeResult] = await Promise.all([
        callOpenChamberTool(ctx, "openchamber_memory", { action: "memory.list", parameters: {} }),
        callOpenChamberTool(ctx, "openchamber_knowledge", { action: "knowledge.list", parameters: {} }),
      ]);
      const existingMemories = parseResponseText(existingMemoryResult.content);
      const existingKnowledge = parseResponseText(existingKnowledgeResult.content);

      const memoryConflictErrors = validateConflictMemory(existingMemories, backup.memories);
      const knowledgeConflictErrors = validateConflictKnowledge(existingKnowledge, backup.knowledge, conflictPolicy);
      const allErrors = [...memoryConflictErrors, ...knowledgeConflictErrors];
      if (allErrors.length > 0) {
        return {
          content: JSON.stringify({ ok: false, errors: allErrors }),
          metadata: {
            openchamber: { schemaVersion: 1, action: "import-backup", ok: false },
          },
        };
      }

      const importPromises = [
        ...backup.memories.map((m) =>
          callOpenChamberTool(ctx, "openchamber_memory", {
            action: "memory.save",
            parameters: { title: m.title, body: m.body, type: m.type, scope: m.scope, memoryId: m.memoryId },
          }),
        ),
        ...backup.knowledge.map((k) =>
          callOpenChamberTool(ctx, "openchamber_knowledge", {
            action: "knowledge.save",
            parameters: { kind: k.kind, body: k.body, id: k.id, completed: k.completed, planId: k.planId, dependsOn: k.dependsOn },
          }),
        ),
      ];
      const results = await Promise.all(importPromises);
      const failed = results.filter((r) => !r.content || r.content.includes('"ok":false') || r.content.includes('error'));
      return {
        content: JSON.stringify({
          ok: failed.length === 0,
          importedMemories: backup.memories.length,
          importedKnowledge: backup.knowledge.length,
          failures: failed.length,
        }),
        metadata: {
          openchamber: { schemaVersion: 1, action: "import-backup", ok: failed.length === 0 },
        },
      };
    }
    case "search-memory":
      return callOpenChamberTool(ctx, "openchamber_memory", {
        action: "memory.search",
        parameters: { query: memoryBridgeInput.query, scope: memoryBridgeInput.scope },
      });
    case "search-knowledge":
      return callOpenChamberTool(ctx, "openchamber_knowledge", {
        action: "knowledge.search",
        parameters: { query: memoryBridgeInput.query, planId: memoryBridgeInput.planId },
      });
    default:
      return {
        content: JSON.stringify({ ok: false, error: { message: "Unsupported mode" } }),
        metadata: {
          openchamber: { schemaVersion: 1, action: mode, ok: false },
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
        description: "Read/write OpenChamber memory and acknowledge (knowledge), export/import backups",
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
    };
  },
});
