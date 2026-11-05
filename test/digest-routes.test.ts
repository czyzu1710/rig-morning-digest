import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { RigConfig } from '../src/config.js';
import type { DigestRow } from '../src/digest/types.js';

const night = '2026-10-30';

let runsDir: string;
let config: RigConfig;

function writeNight(contents: string) {
  writeFileSync(join(runsDir, `${night}.jsonl`), contents, 'utf8');
}

async function rowsFrom(response: Response): Promise<DigestRow[]> {
  const payload = (await response.json()) as { rows: DigestRow[] };
  return payload.rows;
}

describe('digest routes', () => {
  beforeEach(() => {
    runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-routes-'));
    config = {
      adapter: 'test',
      installed: '2026-10-30T06:00:00+01:00',
      beatEverySeconds: 60,
      runsDir,
    };
  });

  afterEach(() => {
    rmSync(runsDir, { recursive: true, force: true });
  });

  it('serves the same jobs in the same order as readable HTML and JSON', async () => {
    writeNight(
      [
        '{"at":"2026-10-30T01:00:00+01:00","job":"zulu-job","status":"fail","owner":"rook","error":"disk full"}',
        '{"at":"2026-10-30T00:00:00+01:00","job":"alpha-job","status":"retry","owner":null,"error":"upstream timeout"}',
        '{"at":"2026-10-30T00:10:00+01:00","job":"alpha-job","status":"retry","owner":null}',
        '{"at":"2026-10-30T00:20:00+01:00","job":"alpha-job","status":"retry","owner":null}',
        '{"at":"2026-10-30T00:30:00+01:00","job":"alpha-job","status":"ok","owner":null}',
      ].join('\n'),
    );

    const app = createApp(config);
    const [htmlResponse, jsonResponse] = await Promise.all([
      app.request(`/digest/${night}`),
      app.request(`/api/digest/${night}`),
    ]);
    const html = await htmlResponse.text();

    expect(htmlResponse.status).toBe(200);
    expect(jsonResponse.status).toBe(200);
    const rows = await rowsFrom(jsonResponse);
    const jobs = rows.map(({ job }) => job);
    expect(jobs).toEqual(['alpha-job', 'zulu-job']);
    expect(html).toContain('<table');
    expect(html).toContain('alpha-job');
    expect(html).toContain('zulu-job');
    expect(html).toContain('upstream timeout');
    expect(html).toContain('disk full');
    expect(html.indexOf(jobs[0])).toBeLessThan(html.indexOf(jobs[1]));
  });

  it.each(['/digest/missing-night', '/api/digest/missing-night'])(
    'returns 404 for a missing night at %s',
    async (path) => {
      const response = await createApp(config).request(path);

      expect(response.status).toBe(404);
    },
  );

  it('renders an empty night and returns no JSON rows', async () => {
    writeNight('');
    const app = createApp(config);

    const htmlResponse = await app.request(`/digest/${night}`);
    const jsonResponse = await app.request(`/api/digest/${night}`);

    expect(htmlResponse.status).toBe(200);
    expect((await htmlResponse.text()).toLowerCase()).toContain('nothing ran');
    expect(jsonResponse.status).toBe(200);
    expect(await jsonResponse.json()).toEqual({ rows: [] });
  });

  it('ignores a malformed line without failing either route', async () => {
    writeNight(
      [
        '{"at":"2026-10-30T02:00:00+01:00","job":"valid-job","status":"ok","owner":"rook"}',
        'this is not json',
      ].join('\n'),
    );
    const app = createApp(config);

    const htmlResponse = await app.request(`/digest/${night}`);
    const jsonResponse = await app.request(`/api/digest/${night}`);
    const html = await htmlResponse.text();

    expect(htmlResponse.status).toBe(200);
    expect(jsonResponse.status).toBe(200);
    const rows = await rowsFrom(jsonResponse);
    expect(html).toContain('valid-job');
    expect(html).not.toContain('this is not json');
    expect(rows.map(({ job }) => job)).toEqual(['valid-job']);
  });
});
