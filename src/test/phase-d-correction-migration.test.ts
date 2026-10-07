import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('D2 correction migration contract', () => {
  it('adds one transactional append-only correction schema after Clocker', async () => {
    expect(existsSync('db/migrations/0016_time_corrections.sql')).toBe(true);
    const sql = await readFile('db/migrations/0016_time_corrections.sql', 'utf8');
    expect(sql.trimStart().startsWith('BEGIN;')).toBe(true);
    expect(sql.trimEnd().endsWith('COMMIT;')).toBe(true);
    expect(sql).toContain('CREATE TABLE time_correction_requests');
    expect(sql).toContain('CREATE TABLE time_correction_events');
    expect(sql).toContain('CREATE TABLE time_correction_adjustments');
    expect(sql).toContain('clocker_device_event_append_only');
    expect(sql).toContain('nevora_submit_time_correction');
    expect(sql).toContain('nevora_review_time_correction');
  });

  it('does not implement corrections by updating or deleting raw punch history', async () => {
    const sql = await readFile('db/migrations/0016_time_corrections.sql', 'utf8');
    expect(sql).not.toMatch(/UPDATE\s+time_entries\b/i);
    expect(sql).not.toMatch(/DELETE\s+FROM\s+time_entries\b/i);
    expect(sql).not.toMatch(/UPDATE\s+break_entries\b/i);
    expect(sql).not.toMatch(/DELETE\s+FROM\s+break_entries\b/i);
  });
});
