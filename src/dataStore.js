import { DatabaseSync } from "node:sqlite";
import { mkdir } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

/** Get plugin data directory */
function dataDirectory() {
  const base = platform() === "win32"
    ? process.env.APPDATA
    : join(homedir(), ".local", "share", "opencode", "plugins");
  return join(base, "opencode-openchamber-memory-bridge");
}

/** Create data directory if needed */
function ensureDataDirectory() {
  try {
    mkdirSync(dataDirectory(), { recursive: true });
    return true;
  } catch {
    return false;
  }
}

let db = null;

/** Initialize database */
export async function initialize() {
  if (db && db.open) {
    return db;
  }
  const dir = dataDirectory();
  ensureDataDirectory();
  const dbPath = join(dir, "data.db");

  db = new DatabaseSync(dbPath, { create: true });

  // Memories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_records (
      memory_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT NOT NULL,
      scope TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Knowledge table (acknowledge notes)
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_records (
      id TEXT PRIMARY KEY,
      title TEXT,
      kind TEXT NOT NULL,
      body TEXT NOT NULL,
      completed INTEGER NOT NULL,
      plan_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  return db;
}

export async function close() {
  if (db && db.open) {
    db.close();
    db = null;
  }
}

/** Save memory */
export async function saveMemory(ctx, { title, body, type, scope }) {
  const connection = await initialize();
  const memoryId = ctx?.memoryId || crypto.randomUUID();
  const now = new Date().toISOString();
  const stmt = connection.prepare(
    `INSERT OR REPLACE INTO memory_records
     (memory_id, title, body, type, scope, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(...[memoryId, title, body, type, scope, now, now]);

  return {
    memoryId,
    title,
    body,
    type,
    scope,
    created_at: now,
    updated_at: now,
    ok: true,
  };
}

/** Delete memory */
export async function deleteMemory(ctx, { memoryId }) {
  const connection = await initialize();
  const stmt = connection.prepare("DELETE FROM memory_records WHERE memory_id = ?");
  const result = stmt.run(...[memoryId]);

  return {
    ok: result.changes > 0,
    deleted: result.changes,
  };
}

/** Read memory */
export async function readMemory(ctx, { memoryId, title }) {
  const connection = await initialize();
  let record;
  if (memoryId) {
    const stmt = connection.prepare("SELECT * FROM memory_records WHERE memory_id = ?");
    record = stmt.get(...[memoryId]);
  } else if (title) {
    const stmt = connection.prepare("SELECT * FROM memory_records WHERE title = ?");
    record = stmt.get(...[title]);
  }
  if (!record) return null;
  return {
    memoryId: record.memory_id,
    title: record.title,
    body: record.body,
    type: record.type,
    scope: record.scope,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

/** List memories */
export async function listMemories(ctx, { scope, limit, query }) {
  const connection = await initialize();
  const stmt = connection.prepare("SELECT * FROM memory_records");
  const allRows = stmt.all().map((r) => ({
    memoryId: r.memory_id,
    title: r.title,
    body: r.body,
    type: r.type,
    scope: r.scope,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  let records = allRows.slice();

  if (scope) {
    records = records.filter((r) => r.scope === scope);
  }
  if (query) {
    const q = query.toLowerCase();
    records = records.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.body.toLowerCase().includes(q) ||
        (r.type || "").toLowerCase().includes(q),
    );
  }
  if (limit && records.length > limit) {
    records = records.slice(0, limit);
  }

  return records;
}

/** Save knowledge */
export async function saveKnowledge(ctx, { kind, body, id, title, completed, planId, dependsOn }) {
  const connection = await initialize();
  const now = new Date().toISOString();
  const cleanId = id || title || crypto.randomUUID();
  const cleanTitle = title || extractAcknowledgeTitleFromId(cleanId) || cleanId;
  const prefix = "📌 Acknowledge: ";
  const finalTitle = cleanTitle.trim().startsWith(prefix) ? cleanTitle : `${prefix}${cleanTitle}`;

  const stmt = connection.prepare(
    `INSERT OR REPLACE INTO knowledge_records
     (id, title, kind, body, completed, plan_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(...[cleanId, finalTitle, kind || "note", body, completed ? 1 : 0, planId, now, now]);

  return {
    id: cleanId,
    title: finalTitle,
    kind: kind || "note",
    body,
    completed: !!completed,
    planId,
    dependsOn: dependsOn || [],
    created_at: now,
    updated_at: now,
  };
}

/** Delete knowledge */
export async function deleteKnowledge(ctx, { kind, id }) {
  const connection = await initialize();
  const stmt = connection.prepare("DELETE FROM knowledge_records WHERE id = ?");
  const result = stmt.run(...[id]);
  return {
    ok: result.changes > 0,
    deleted: result.changes,
  };
}

/** Read knowledge */
export async function readKnowledge(ctx, { id, title }) {
  const connection = await initialize();
  let record;
  if (id) {
    const stmt = connection.prepare("SELECT * FROM knowledge_records WHERE id = ?");
    record = stmt.get(...[id]);
  } else if (title) {
    const prefix = "📌 Acknowledge: ";
    const plainPrefix = "Acknowledge: ";
    const finalTitle = title
      .trim()
      .startsWith(prefix)
      ? title
      : title.trim().startsWith(plainPrefix)
        ? title
        : `${prefix}${title}`;
    const stmt = connection.prepare("SELECT * FROM knowledge_records WHERE title = ?");
    record = stmt.get(...[finalTitle]);
  }
  if (!record) return null;
  return {
    id: record.id,
    title: record.title,
    kind: record.kind,
    body: record.body,
    completed: record.completed === 1,
    planId: record.plan_id,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

/** List knowledge (acknowledge only) */
export async function listKnowledge(ctx, { planId, ready, limit }) {
  const connection = await initialize();
  const stmt = connection.prepare("SELECT * FROM knowledge_records");
  const allRows = stmt.all().map((r) => ({
    id: r.id,
    title: r.title,
    kind: r.kind,
    body: r.body,
    completed: r.completed === 1,
    planId: r.plan_id,
    dependsOn: dependsOnFromBody(r.body),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  let records = allRows.slice();
  records = records.filter(isAcknowledgeKnowledge);

  if (planId) {
    records = records.filter((r) => r.planId === planId);
  }
  if (ready !== undefined) {
    records = records.filter((r) => r.completed === ready);
  }
  if (limit && records.length > limit) {
    records = records.slice(0, limit);
  }

  return records;
}

/** Search knowledge */
export async function searchKnowledge(ctx, { query, planId }) {
  const connection = await initialize();
  const stmt = connection.prepare("SELECT * FROM knowledge_records");
  const allRows = stmt.all().map((r) => ({
    id: r.id,
    title: r.title,
    kind: r.kind,
    body: r.body,
    completed: r.completed === 1,
    planId: r.plan_id,
    dependsOn: dependsOnFromBody(r.body),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  let records = allRows.slice();
  records = records.filter(isAcknowledgeKnowledge);
  const q = (query || "").toLowerCase();
  records = records.filter(
    (r) =>
      r.title.toLowerCase().includes(q) ||
      r.body.toLowerCase().includes(q) ||
      (r.planId || "").toLowerCase().includes(q),
  );

  if (planId) {
    records = records.filter((r) => r.planId === planId);
  }

  return records;
}

/** Export backup from local DB */
export async function exportBackup(ctx) {
  const connection = await initialize();

  const memStmt = connection.prepare("SELECT * FROM memory_records");
  const knowledgeStmt = connection.prepare("SELECT * FROM knowledge_records");

  const memoryRows = memStmt.all().map((r) => ({
    title: r.title,
    body: r.body,
    type: r.type,
    scope: r.scope,
    memoryId: r.memory_id,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  const knowledgeRows = knowledgeStmt.all().map((r) => ({
    id: r.id,
    title: r.title,
    kind: r.kind,
    body: r.body,
    completed: r.completed === 1,
    planId: r.plan_id,
    dependsOn: dependsOnFromBody(r.body),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  return {
    format: "openchamber-memory-bridge-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    memories: memoryRows,
    knowledge: knowledgeRows,
  };
}

/** Import backup into local DB */
export async function importBackup(ctx, backup, conflictPolicy = "upsert") {
  const connection = await initialize();

  const safeMemories = (backup.memories || []).filter((m) => m && m.body != null && m.title != null);
  const safeKnowledge = (backup.knowledge || []).filter((k) => k && k.body != null && k.id != null);

  const existingMemories = await listMemories(ctx, {});
  const existingKnowledge = await listKnowledge(ctx, {});

  for (const m of safeMemories) {
    const existing = existingMemories.find((e) => e.memoryId === m.memoryId);
    if (existing) {
      if (conflictPolicy === "skip") continue;
      if (conflictPolicy === "error") {
        throw new Error(`Memory conflict with memoryId ${m.memoryId}`);
      }
      // upsert
      await saveMemory(ctx, m);
    } else {
      await saveMemory(ctx, m);
    }
  }

  for (const k of safeKnowledge) {
    const existing = existingKnowledge.find((e) => e.id === k.id);
    if (existing) {
      if (conflictPolicy === "skip") continue;
      if (conflictPolicy === "error") {
        throw new Error(`Knowledge conflict with id ${k.id}`);
      }
      // upsert
      await saveKnowledge(ctx, k);
    } else {
      await saveKnowledge(ctx, k);
    }
  }

  return {
    ok: true,
    importedMemories: safeMemories.length,
    importedKnowledge: safeKnowledge.length,
  };
}

/** Helpers */
function dependsOnFromBody(body) {
  try {
    const note = JSON.parse(body || "");
    if (Array.isArray(note)) return note;
    if (note && note.dependsOn && Array.isArray(note.dependsOn)) return note.dependsOn;
    return [];
  } catch {
    return [];
  }
}

function extractAcknowledgeTitleFromId(id) {
  if (!id) return id;
  const prefix = "📌 Acknowledge: ";
  const plainPrefix = "Acknowledge: ";
  if (id.startsWith(prefix)) return id.slice(prefix.length).trim();
  if (id.startsWith(plainPrefix)) return id.slice(plainPrefix.length).trim();
  return id;
}

function isAcknowledgeKnowledge(r) {
  const title = r.title || "";
  return (
    title.trim().startsWith("📌 Acknowledge: ") ||
    title.trim().startsWith("Acknowledge: ")
  );
}

export default {
  initialize,
  close,
  saveMemory,
  deleteMemory,
  readMemory,
  listMemories,
  saveKnowledge,
  deleteKnowledge,
  readKnowledge,
  listKnowledge,
  searchKnowledge,
  exportBackup,
  importBackup,
};
