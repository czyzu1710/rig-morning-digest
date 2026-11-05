import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

const runsDir = fileURLToPath(new URL('../runs/', import.meta.url));

describe('run-log reader', () => {
  it('groups the fixture by job and counts malformed lines', () => {
    const result = readNight(runsDir, '2026-10-28');

    expect(result.badLines).toBe(1);
    expect(result.rows).toHaveLength(5);
    expect(result.rows.map(({ job }) => job)).toEqual([
      'rig/rotate-logs',
      'lane/sync',
      'fixtures/refresh',
      'notes/backup',
      'digest/render',
    ]);
  });

  it('retains per-job counts, latest status and error, and nullable owners', () => {
    const { rows } = readNight(runsDir, '2026-10-28');

    expect(rows.find(({ job }) => job === 'lane/sync')).toEqual({
      job: 'lane/sync',
      owner: 'rook',
      runs: 8,
      retries: 1,
      lastStatus: 'ok',
      lastError: 'lock held',
      firstAt: '2026-10-28T23:00:06+01:00',
      lastAt: '2026-10-29T05:00:04+01:00',
    });
    expect(rows.find(({ job }) => job === 'fixtures/refresh')).toMatchObject({
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
    });
    expect(rows.find(({ job }) => job === 'digest/render')).toMatchObject({
      owner: null,
      runs: 1,
    });
  });
});
