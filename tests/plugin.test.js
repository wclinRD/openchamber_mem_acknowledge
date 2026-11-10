import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateBackupPayload, validateConflictMemory, validateConflictKnowledge } from '../src/backup.js';
import { validateUrl } from '../src/openchamberClient.js';

describe('backup utilities', () => {
  it('validates a correct backup payload', () => {
    const payload = {
      format: 'openchamber-memory-bridge-backup',
      version: 1,
      exportedAt: '2026-11-10T10:00:00.000Z',
      memories: [
        { title: 'Test', body: 'Body', type: 'fact', scope: 'project', memoryId: 'm1' },
      ],
      knowledge: [
        { kind: 'note', body: 'Ack', id: 'k1', completed: false, planId: null, dependsOn: [] },
      ],
    };
    const errors = validateBackupPayload(payload);
    assert.deepEqual(errors, []);
  });

  it('rejects wrong format or version', () => {
    const payload = { format: 'wrong', version: 2, exportedAt: '', memories: [], knowledge: [] };
    const errors = validateBackupPayload(payload);
    assert.ok(errors.length > 1, 'expected format and version errors');
  });
});

describe('conflict utilities', () => {
  it('detects memory conflict by title without memoryId', () => {
    const existing = [{ title: 'Test', body: 'a', memoryId: 'm1' }];
    const importMemories = [{ title: 'Test', body: 'b', memoryId: '' }];
    const errors = validateConflictMemory(existing, importMemories);
    assert.ok(errors.length > 0);
  });

  it('allows memory conflict when memoryId is provided', () => {
    const existing = [{ title: 'Test', body: 'a', memoryId: 'm1' }];
    const importMemories = [{ title: 'Test', body: 'b', memoryId: 'm2' }];
    const errors = validateConflictMemory(existing, importMemories);
    assert.deepEqual(errors, []);
  });

  it('knows upsert policy for knowledge conflicts', () => {
    const existing = [{ kind: 'note', id: 'k1', body: 'a' }];
    const imported = [{ kind: 'note', id: 'k1', body: 'b' }];
    const errors = validateConflictKnowledge(existing, imported, 'upsert');
    assert.deepEqual(errors, []);
  });

  it('skips knowledge conflict under skip policy', () => {
    const existing = [{ kind: 'note', id: 'k1', body: 'a' }];
    const imported = [{ kind: 'note', id: 'k1', body: 'b' }];
    const errors = validateConflictKnowledge(existing, imported, 'skip');
    assert.deepEqual(errors, []);
  });

  it('rejects knowledge conflict under error policy', () => {
    const existing = [{ kind: 'note', id: 'k1', body: 'a' }];
    const imported = [{ kind: 'note', id: 'k1', body: 'b' }];
    const errors = validateConflictKnowledge(existing, imported, 'error');
    assert.ok(errors.length > 0);
  });
});

describe('url validation', () => {
  it('accepts https URLs', () => {
    assert.equal(validateUrl('https://example.com'), true);
  });
  it('rejects http URLs', () => {
    assert.equal(validateUrl('http://example.com'), false);
  });
});
