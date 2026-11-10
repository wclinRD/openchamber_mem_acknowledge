const format = "openchamber-memory-bridge-backup";
const version = 1;

export function buildDefaultBackup() {
  return {
    format,
    version,
    exportedAt: new Date().toISOString(),
    memories: [],
    knowledge: [],
  };
}

export function serializeBackup(memories, knowledge) {
  return {
    format,
    version,
    exportedAt: new Date().toISOString(),
    memories: memories.map((m) => ({
      title: m.title || "",
      body: m.body || "",
      type: m.type || "fact",
      scope: m.scope || "project",
      memoryId: m.memoryId || "",
    })),
    knowledge: knowledge.map((k) => ({
      kind: k.kind || "note",
      body: k.body || "",
      id: k.id || "",
      completed: k.completed ?? false,
      planId: k.planId ?? null,
      dependsOn: k.dependsOn || [],
    })),
  };
}

export function validateBackupPayload(payload) {
  const errors = [];

  if (payload?.format !== format) {
    errors.push(`Expected format "${format}", got "${payload?.format}"`);
  }
  if (payload?.version !== version) {
    errors.push(`Expected version ${version}, got ${payload?.version}`);
  }
  if (typeof payload?.exportedAt !== "string") {
    errors.push("exportedAt must be an ISO string");
  }

  if (!Array.isArray(payload?.memories)) {
    errors.push("memories must be an array");
  } else {
    for (let i = 0; i < payload.memories.length; i++) {
      const m = payload.memories[i];
      if (!m || typeof m !== "object") {
        errors.push(`memories[${i}] must be an object`);
        continue;
      }
      if (typeof m.title !== "string") errors.push(`memories[${i}].title must be a string`);
      if (typeof m.body !== "string") errors.push(`memories[${i}].body must be a string`);
      if (typeof m.type !== "string") errors.push(`memories[${i}].type must be a string`);
      if (typeof m.scope !== "string") errors.push(`memories[${i}].scope must be a string`);
      if (typeof m.memoryId !== "string") errors.push(`memories[${i}].memoryId must be a string`);
    }
  }

  if (!Array.isArray(payload?.knowledge)) {
    errors.push("knowledge must be an array");
  } else {
    for (let i = 0; i < payload.knowledge.length; i++) {
      const k = payload.knowledge[i];
      if (!k || typeof k !== "object") {
        errors.push(`knowledge[${i}] must be an object`);
        continue;
      }
      if (typeof k.kind !== "string") errors.push(`knowledge[${i}].kind must be a string`);
      if (typeof k.body !== "string") errors.push(`knowledge[${i}].body must be a string`);
      if (typeof k.id !== "string") errors.push(`knowledge[${i}].id must be a string`);
      if (typeof k.completed !== "boolean" && k.completed !== undefined) errors.push(`knowledge[${i}].completed must be boolean`);
      if (k.planId !== null && k.planId !== undefined && typeof k.planId !== "string") errors.push(`knowledge[${i}].planId must be string or null`);
      if (!Array.isArray(k.dependsOn)) errors.push(`knowledge[${i}].dependsOn must be an array`);
    }
  }

  return errors;
}

export function validateConflictMemory(existingMemories, importMemories) {
  const errors = [];
  const seenTitles = new Map();
  for (const m of existingMemories) {
    const titleKey = (m.title || "").trim().toLowerCase();
    if (titleKey) {
      if (seenTitles.has(titleKey)) seenTitles.get(titleKey).push(m);
      else seenTitles.set(titleKey, [m]);
    }
  }
  for (const m of importMemories) {
    const titleKey = (m.title || "").trim().toLowerCase();
    if (titleKey && !m.memoryId) {
      const existing = seenTitles.get(titleKey);
      if (existing && existing.length > 0) {
        errors.push(`Cannot import memory with title "${m.title}" without memoryId because it conflicts with existing memory(s)`);
      }
    }
  }
  return errors;
}

export function validateConflictKnowledge(existingKnowledge, importKnowledge, policy) {
  if (policy === "upsert") return [];
  const errors = [];
  const seenIds = new Map();
  for (const k of existingKnowledge) {
    const key = `${k.kind}:${k.id}`;
    if (seenIds.has(key)) seenIds.get(key).push(k);
    else seenIds.set(key, [k]);
  }
  for (const k of importKnowledge) {
    const key = `${k.kind}:${k.id}`;
    if (seenIds.has(key)) errors.push(`Conflict: knowledge ${key} already exists in the target`);
  }
  return errors;
}
