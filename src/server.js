import http from "http";
import { readFile, writeFile } from "fs/promises";
import { callOpenChamberTool } from "./openchamberClient.js";
import { validateBackupPayload, validateConflictMemory, validateConflictKnowledge } from "./backup.js";
import { resolve, isAbsolute } from "path";

process.on("unhandledRejection", (err) => {
  console.error(`[openchamber-memory-bridge] Unhandled rejection:`, err);
});

process.on("uncaughtException", (err) => {
  console.error(`[openchamber-memory-bridge] Uncaught exception:`, err);
});

const normalizeAllowedPath = (inputPath) => {
  const raw = inputPath || "";
  if (typeof raw !== "string" || raw.includes("..")) return null;
  const resolved = resolve(raw);
  if (isAbsolute(resolved) && !resolved.startsWith("/Users/wclin/")) {
    return null;
  }
  return resolved;
};

const uiHTML = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OpenChamber Memory & Acknowledge Bridge</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f5f6f8;
      --fg: #2a2e33;
      --card: #fff;
      --border: #d8dce0;
      --accent: #2563eb;
      --code: #f1f5f9;
      --error: #dc2626;
      --success: #16a34a;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #121417;
        --fg: #e5e7eb;
        --card: #1a1d21;
        --border: #2d3138;
        --accent: #3b82f6;
        --code: #1a1d21;
        --error: #ef4444;
        --success: #22c55e;
      }
    }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: var(--bg);
      color: var(--fg);
    }
    .header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .header h1 {
      margin: 0;
      font-size: 1.25rem;
    }
    .tabs {
      display: flex;
      border-bottom: 1px solid var(--border);
    }
    .tab {
      padding: 0.75rem 1.25rem;
      cursor: pointer;
      border-bottom: 3px solid transparent;
      color: var(--fg);
      opacity: 0.8;
    }
    .tab:hover { opacity: 1; }
    .tab.active { border-color: var(--accent); opacity: 1; }
    .container {
      padding: 1rem 1.5rem;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 768px) {
      .grid { grid-template-columns: 1fr; }
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      min-height: 240px;
    }
    .card h2 {
      margin: 0 0 1rem 0;
      font-size: 1rem;
    }
    .list {
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid var(--border);
      border-radius: 6px;
    }
    .item {
      padding: 0.65rem 0.85rem;
      border-bottom: 1px solid var(--border);
      cursor: pointer;
    }
    .item:hover { background: var(--code); }
    .item.selected { background: var(--code); border-left: 3px solid var(--accent); }
    .detail {
      margin-top: 1rem;
      padding: 1rem;
      background: var(--code);
      border-radius: 6px;
      overflow: auto;
      max-height: 300px;
    }
    .actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }
    button {
      padding: 0.5rem 0.8rem;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--card);
      color: var(--fg);
      cursor: pointer;
    }
    button.primary {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
    }
    button.danger {
      background: var(--error);
      color: #fff;
      border-color: var(--error);
    }
    .input {
      padding: 0.5rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--card);
      color: var(--fg);
    }
    textarea.input {
      width: 100%;
      min-height: 80px;
      resize: vertical;
    }
    .status {
      margin-top: 0.75rem;
      font-size: 0.875rem;
    }
    .status.error { color: var(--error); }
    .status.success { color: var(--success); }
  </style>
</head>
<body>
  <div class="header">
    <h1>OpenChamber Memory & Acknowledge Bridge</h1>
    <div style="margin-left:auto; font-size:0.875rem;">Local Web UI</div>
  </div>
  <div class="tabs">
    <div class="tab active" data-tab="memories">Memories</div>
    <div class="tab" data-tab="knowledge">Acknowledge</div>
  </div>
  <div class="container">
    <div class="grid">
      <div class="card">
        <h2>Lists</h2>
        <div style="display:flex;gap:0.5rem;margin-bottom:0.75rem;">
          <input id="searchQuery" class="input" placeholder="Search by text..." />
          <select id="scopeFilter" class="input">
            <option value="">All scopes</option>
            <option value="project">project</option>
            <option value="global">global</option>
          </select>
        </div>
        <div id="listContainer" class="list"></div>
        <div class="detail" id="detailBox">Select an item to view details.</div>
        <div class="actions" id="detailActions"></div>
      </div>
      <div class="card">
        <h2>Save New</h2>
        <input id="newTitle" class="input" placeholder="Title (for memory, up to 60 chars)" style="width:100%;box-sizing:border-box;" />
        <textarea id="newBody" class="input" placeholder="Body (up to 2000 chars for memory)" style="width:100%;box-sizing:border-box;"></textarea>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
          <select id="newType" class="input">
            <option value="fact">fact</option>
            <option value="preference">preference</option>
            <option value="reference">reference</option>
          </select>
          <select id="newScope" class="input">
            <option value="project">project</option>
            <option value="global">global</option>
          </select>
        </div>
        <div style="display:flex;gap:0.5rem;margin-top:0.5rem;flex-wrap:wrap;">
          <button id="saveMemory" class="primary">Save Memory</button>
          <button id="saveAcknowledge">Save Acknowledge</button>
        </div>
      </div>
    </div>
    <div style="margin-top:1rem;">
      <div class="actions">
        <button id="exportButton" class="primary">Export Backup</button>
        <input type="file" id="importFile" class="input" accept=".json" />
        <button id="importButton" class="primary">Import Backup</button>
      </div>
      <div id="status" class="status"></div>
    </div>
  </div>
  <script>
    const apiBase = '/api';
    const state = { activeTab: 'memories', items: [], selectedId: null };
    const listContainer = document.getElementById('listContainer');
    const detailBox = document.getElementById('detailBox');
    const detailActions = document.getElementById('detailActions');
    const statusEl = document.getElementById('status');

    function setStatus(msg, type='') {
      statusEl.textContent = msg;
      statusEl.className = 'status ' + type;
    }

    function getItemsFromList(data) {
      if (Array.isArray(data)) {
        return data.map(item => item);
      }
      if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) return data.data;
      if (data && typeof data === 'object' && 'memories' in data) return data.memories;
      if (data && typeof data === 'object' && 'knowledge' in data) return data.knowledge;
      return Array.isArray(data) ? data : [];
    }

    function normalizeItems(data) {
      const items = getItemsFromList(data);
      return items.map(i => {
        if (i && i.id) return i;
        if (i && i.memoryId) return { id: i.memoryId, ...i };
        if (i && i.kind && i.title) return { id: i.title, kind: i.kind, ...i };
        return i;
      });
    }

    async function fetchJSON(path, options) {
      const res = await fetch(path, options);
      const text = await res.text();
      try { return { ok: res.ok, data: JSON.parse(text), text }; }
      catch { return { ok: false, text }; }
    }

    async function loadList() {
      const query = document.getElementById('searchQuery').value;
      const scope = document.getElementById('scopeFilter').value;
      if (state.activeTab === 'memories') {
        const url = '/api/memories?search=' + encodeURIComponent(query) + (scope ? '&scope=' + encodeURIComponent(scope) : '');
        const r = await fetchJSON(url, { method: 'GET' });
        state.items = normalizeItems(r.data);
      } else {
        const r = await fetchJSON('/api/knowledge', { method: 'GET' });
        const all = normalizeItems(r.data);
        state.items = all.filter(k => {
          const title = k.title || '';
          return title.trim().startsWith('📌 Acknowledge: ') || title.trim().startsWith('Acknowledge: ');
        });
      }
      renderList();
    }

    function renderList() {
      listContainer.innerHTML = '';
      state.items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'item' + (state.selectedId === item.id ? ' selected' : '');
        const title = item.title || item.id || '';
        const summary = item.body ? item.body.slice(0, 80) : '';
        el.textContent = (item.kind ? item.kind + ': ' : '') + title + (summary ? ' — ' + summary : '');
        el.addEventListener('click', () => selectItem(item));
        listContainer.appendChild(el);
      });
    }

    function selectItem(item) {
      state.selectedId = item.id;
      detailBox.innerHTML = '<strong>Title:</strong> ' + (item.title || '') + '\\n<strong>Body:</strong> ' + (item.body || '') + '\\n' + JSON.stringify(item, null, 2);
      detailActions.innerHTML = '';
      if (state.activeTab === 'memories') {
        const d = document.createElement('button');
        d.className = 'danger';
        d.textContent = 'Delete';
        d.addEventListener('click', async () => {
          const id = item.id || item.memoryId;
          if (!id) return;
          const r = await fetchJSON('/api/memories/' + id, { method: 'DELETE' });
          if (r.ok) {
            await loadList();
            setStatus('Deleted memory ' + id, 'success');
          } else {
            setStatus(r.text, 'error');
          }
        });
        detailActions.appendChild(d);
      } else {
        const d = document.createElement('button');
        d.className = 'danger';
        d.textContent = 'Delete';
        d.addEventListener('click', async () => {
          const r = await fetchJSON('/api/knowledge/' + item.id, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'note' }) });
          if (r.ok) {
            await loadList();
            setStatus('Deleted knowledge ' + item.id, 'success');
          } else {
            setStatus(r.text, 'error');
          }
        });
        detailActions.appendChild(d);
      }
    }

    document.getElementById('saveMemory').addEventListener('click', async () => {
      const title = document.getElementById('newTitle').value;
      const body = document.getElementById('newBody').value;
      const type = document.getElementById('newType').value;
      const scope = document.getElementById('newScope').value;
      if (title.length > 60) return alert('Title must be 60 characters or less.');
      if (body.length > 2000) return alert('Body must be 2000 characters or less.');
      const r = await fetchJSON('/api/memories', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, body, type, scope }),
      });
      if (r.ok) {
        await loadList();
        setStatus('Memory saved', 'success');
      } else {
        setStatus(r.text, 'error');
      }
    });

    document.getElementById('saveAcknowledge').addEventListener('click', async () => {
      const rawTitle = document.getElementById('newTitle').value;
      const body = document.getElementById('newBody').value;
      if (rawTitle.length > 60) return alert('Title must be 60 characters or less.');
      if (body.length > 3000) return alert('Body must be 3000 characters or less.');
      const title = '📌 Acknowledge: ' + rawTitle;
      const r = await fetchJSON('/api/knowledge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'note', body, title }),
      });
      if (r.ok) {
        await loadList();
        setStatus('Acknowledge saved', 'success');
      } else {
        setStatus(r.text, 'error');
      }
    });

    document.getElementById('exportButton').addEventListener('click', async () => {
      const path = 'memories-backup-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
      const r = await fetchJSON('/api/export?path=' + encodeURIComponent(path), { method: 'GET' });
      if (r.ok) {
        setStatus('Exported to ' + path, 'success');
      } else {
        setStatus(r.text, 'error');
      }
    });

    document.getElementById('importButton').addEventListener('click', () => {
      const fileInput = document.getElementById('importFile');
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        const r = await fetchJSON('/api/import?path=' + encodeURIComponent(file.name) + '&importConflictPolicy=upsert', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: e.target.result,
        });
        if (r.ok) {
          await loadList();
          setStatus('Imported successfully', 'success');
        } else {
          setStatus(r.text, 'error');
        }
      };
      reader.readAsText(file);
    });

    document.getElementById('searchQuery').addEventListener('input', loadList);
    document.getElementById('scopeFilter').addEventListener('change', loadList);

    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeTab = tab.dataset.tab;
        loadList();
      });
    });

    loadList();
  </script>
</body>
</html>`;

export function startLocalServer(port) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    if (path === '/' || path === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(uiHTML);
      return;
    }

    if (path.startsWith('/api/')) {
      const [api, section, id] = path.split('/').filter(Boolean);
      const params = url.searchParams;

      const handleApiError = (res, message, status = 400) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: message }));
      };

      const handleMemoryRequest = async (req, res, { section, id, params }) => {
        if (section === undefined) {
          const scope = params.get('scope') || undefined;
          const search = params.get('search') || undefined;
          const limit = params.get('limit') ? Number(params.get('limit')) : undefined;
          try {
            const result = await callOpenChamberTool(
              { sessionID: 'webui-session', id: 'webui-call', signal: null },
              'openchamber_memory',
              { action: 'memory.list', parameters: { scope, limit } }
            );
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(result.content);
          } catch (err) {
            handleApiError(res, `memory.list failed: ${err.message}`, 500);
          }
          return;
        }
        if (id) {
          const readResult = await callOpenChamberTool(
            { sessionID: 'webui-session', id: 'webui-call', signal: null },
            'openchamber_memory',
            { action: 'memory.read', parameters: { memoryId: id } }
          );
          if (req.method === 'GET') {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(readResult.content);
            return;
          }
          if (req.method === 'DELETE') {
            const deleteResult = await callOpenChamberTool(
              { sessionID: 'webui-session', id: 'webui-call', signal: null },
              'openchamber_memory',
              { action: 'memory.delete', parameters: { memoryId: id } }
            );
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(deleteResult.content);
            return;
          }
        }
        if (req.method === 'POST') {
          try {
            const body = await new Promise((resolve) => {
              let data = '';
              req.on('data', (chunk) => { data += chunk; });
              req.on('end', () => resolve(data));
            });
            const data = JSON.parse(body);
            const result = await callOpenChamberTool(
              { sessionID: 'webui-session', id: 'webui-call', signal: null },
              'openchamber_memory',
              { action: 'memory.save', parameters: { title: data.title, body: data.body, type: data.type, scope: data.scope } }
            );
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(result.content);
            return;
          } catch (err) {
            handleApiError(res, `memory.save failed: ${err.message}`, 500);
            return;
          }
        }
        res.writeHead(405, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
      };

      const handleKnowledgeRequest = async (req, res, { section, id, params }) => {
        if (section === undefined) {
          try {
            const result = await callOpenChamberTool(
              { sessionID: 'webui-session', id: 'webui-call', signal: null },
              'openchamber_knowledge',
              { action: 'knowledge.list', parameters: {} }
            );
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(result.content);
            return;
          } catch (err) {
            handleApiError(res, `knowledge.list failed: ${err.message}`, 500);
            return;
          }
        }
        if (id) {
          if (req.method === 'GET') {
            try {
              const result = await callOpenChamberTool(
                { sessionID: 'webui-session', id: 'webui-call', signal: null },
                'openchamber_knowledge',
                { action: 'knowledge.show', parameters: { kind: 'note', id } }
              );
              res.writeHead(200, { 'content-type': 'application/json' });
              res.end(result.content);
              return;
            } catch (err) {
              handleApiError(res, `knowledge.show failed: ${err.message}`, 500);
              return;
            }
          }
          if (req.method === 'DELETE') {
            let deleteBody = '';
            for await (const chunk of req) deleteBody += chunk;
            let deleteParams = { kind: 'note' };
            try { deleteParams = JSON.parse(deleteBody || '{}'); } catch {}
            try {
              const deleteResult = await callOpenChamberTool(
                { sessionID: 'webui-session', id: 'webui-call', signal: null },
                'openchamber_knowledge',
                { action: 'knowledge.delete', parameters: { kind: deleteParams.kind || 'note', id } }
              );
              res.writeHead(200, { 'content-type': 'application/json' });
              res.end(deleteResult.content);
              return;
            } catch (err) {
              handleApiError(res, `knowledge.delete failed: ${err.message}`, 500);
              return;
            }
          }
          if (req.method === 'POST') {
            try {
              let body = '';
              for await (const chunk of req) body += chunk;
              const data = JSON.parse(body);
              const result = await callOpenChamberTool(
                { sessionID: 'webui-session', id: 'webui-call', signal: null },
                'openchamber_knowledge',
                { action: 'knowledge.save', parameters: { kind: data.kind || 'note', body: data.body, id, title: data.title } }
              );
              res.writeHead(200, { 'content-type': 'application/json' });
              res.end(result.content);
              return;
            } catch (err) {
              handleApiError(res, `knowledge.save failed: ${err.message}`, 500);
              return;
            }
          }
        }
        res.writeHead(405, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
      };

      const handleExportRequest = async (req, res, { params }) => {
        const path = params.get('path');
        if (!path) {
          handleApiError(res, 'Missing path', 400);
          return;
        }
        const allowedPath = normalizeAllowedPath(path);
        if (!allowedPath) {
          handleApiError(res, 'Invalid path: path must be non-absolute and not contain ".."', 400);
          return;
        }
        try {
          const memoryResult = await callOpenChamberTool(
            { sessionID: 'webui-session', id: 'webui-call', signal: null },
            'openchamber_memory',
            { action: 'memory.list', parameters: { scope: params.get('scope') || undefined } }
          );
          const knowledgeResult = await callOpenChamberTool(
            { sessionID: 'webui-session', id: 'webui-call', signal: null },
            'openchamber_knowledge',
            { action: 'knowledge.list', parameters: {} }
          );
          const memoryList = parseJSON(memoryResult.content);
          const knowledgeList = parseJSON(knowledgeResult.content);
          const backup = {
            format: 'openchamber-memory-bridge-backup',
            version: 1,
            exportedAt: new Date().toISOString(),
            memories: memoryList.map((m) => ({ title: m.title, body: m.body, type: m.type, scope: m.scope, memoryId: m.memoryId || '' })),
            knowledge: knowledgeList.map((k) => ({ kind: k.kind, body: k.body, id: k.id, completed: k.completed ?? false, planId: k.planId, dependsOn: k.dependsOn || [] })),
          };
          const validErrors = validateBackupPayload(backup);
          if (validErrors.length > 0) {
            handleApiError(res, validErrors.join('; '), 400);
            return;
          }
          await writeFile(path, JSON.stringify(backup, null, 2), 'utf8');
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ ok: true, writtenTo: path }));
        } catch (err) {
          handleApiError(res, `export failed: ${err.message}`, 500);
        }
      };

      const handleImportRequest = async (req, res, { params }) => {
        const path = params.get('path');
        const policy = params.get('importConflictPolicy') || 'upsert';
        if (!path) {
          handleApiError(res, 'Missing path', 400);
          return;
        }
        try {
          let body = '';
          for await (const chunk of req) body += chunk;
          const backup = parseJSON(body);
          const validErrors = validateBackupPayload(backup);
          if (validErrors.length > 0) {
            handleApiError(res, validErrors.join('; '), 400);
            return;
          }
          const [existingMemoryResult, existingKnowledgeResult] = await Promise.all([
            callOpenChamberTool(
              { sessionID: 'webui-session', id: 'webui-call', signal: null },
              'openchamber_memory',
              { action: 'memory.list', parameters: {} }
            ),
            callOpenChamberTool(
              { sessionID: 'webui-session', id: 'webui-call', signal: null },
              'openchamber_knowledge',
              { action: 'knowledge.list', parameters: {} }
            ),
          ]);
          const existingMemories = parseJSON(existingMemoryResult.content);
          const existingKnowledge = parseJSON(existingKnowledgeResult.content);
          const memoryConflictErrors = validateConflictMemory(existingMemories, backup.memories);
          const knowledgeConflictErrors = validateConflictKnowledge(existingKnowledge, backup.knowledge, policy);
          const allErrors = [...memoryConflictErrors, ...knowledgeConflictErrors];
          if (allErrors.length > 0) {
            handleApiError(res, allErrors.join('; '), 400);
            return;
          }
          const importPromises = [
            ...backup.memories.map((m) =>
              callOpenChamberTool(
                { sessionID: 'webui-session', id: 'webui-call', signal: null },
                'openchamber_memory',
                { action: 'memory.save', parameters: { title: m.title, body: m.body, type: m.type, scope: m.scope, memoryId: m.memoryId } }
              )
            ),
            ...backup.knowledge.map((k) =>
              callOpenChamberTool(
                { sessionID: 'webui-session', id: 'webui-call', signal: null },
                'openchamber_knowledge',
                { action: 'knowledge.save', parameters: { kind: k.kind, body: k.body, id: k.id, completed: k.completed, planId: k.planId, dependsOn: k.dependsOn } }
              )
            ),
          ];
          const results = await Promise.all(importPromises);
          const failed = results.filter((r) => {
            const c = r.content || '';
            return c.includes('"ok":false') || c.includes('error');
          });
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ ok: failed.length === 0, importedMemories: backup.memories.length, importedKnowledge: backup.knowledge.length, failures: failed.length }));
        } catch (err) {
          handleApiError(res, `import failed: ${err.message}`, 500);
        }
      };

      try {
        if (api === 'memories') {
          await handleMemoryRequest(req, res, { section, id, params });
        } else if (api === 'knowledge') {
          await handleKnowledgeRequest(req, res, { section, id, params });
        } else if (api === 'export') {
          await handleExportRequest(req, res, { params });
        } else if (api === 'import') {
          await handleImportRequest(req, res, { params });
        } else {
          res.writeHead(404, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Not found' }));
        }
      } catch (err) {
        handleApiError(res, `api handler failed: ${err.message}`, 500);
      }
    } else {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Not found' }));
    }
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`[openchamber-memory-bridge] local web server listening on http://127.0.0.1:${port}`);
  });

  return server;
}

function parseJSON(text) {
  try { return JSON.parse(text); } catch { return []; }
}
