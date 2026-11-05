import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, DigestStatus, ReadNight } from './types.js';

type RunEvent = {
  at: string;
  job: string;
  status: DigestStatus;
  owner: string | null;
  error?: string;
};

function parseEvent(line: string): RunEvent | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;

  const event = value as Record<string, unknown>;
  if (
    typeof event.at !== 'string' ||
    typeof event.job !== 'string' ||
    (event.status !== 'ok' && event.status !== 'retry' && event.status !== 'fail') ||
    (typeof event.owner !== 'string' && event.owner !== null) ||
    (event.error !== undefined && typeof event.error !== 'string')
  ) {
    return null;
  }

  return {
    at: event.at,
    job: event.job,
    status: event.status,
    owner: event.owner,
    ...(typeof event.error === 'string' ? { error: event.error } : {}),
  };
}

export const readNight: ReadNight = (runsDir, night) => {
  const contents = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  const lines = contents.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();

  const rowsByJob = new Map<string, DigestRow>();
  let badLines = 0;

  for (const line of lines) {
    const event = parseEvent(line);
    if (!event) {
      badLines += 1;
      continue;
    }

    const row = rowsByJob.get(event.job);
    if (!row) {
      rowsByJob.set(event.job, {
        job: event.job,
        owner: event.owner,
        runs: 1,
        retries: event.status === 'retry' ? 1 : 0,
        lastStatus: event.status,
        lastError: event.error ?? null,
        firstAt: event.at,
        lastAt: event.at,
      });
      continue;
    }

    row.owner = event.owner;
    row.runs += 1;
    if (event.status === 'retry') row.retries += 1;
    row.lastStatus = event.status;
    if (event.error !== undefined) row.lastError = event.error;
    row.lastAt = event.at;
  }

  return { rows: [...rowsByJob.values()], badLines };
};
