import { mkdirSync, writeFileSync } from 'node:fs';
import { createApp } from '../src/app.js';

const response = await createApp().request('/digest/2026-10-28');
if (!response.ok) {
  throw new Error(`Could not render digest preview: HTTP ${response.status}`);
}

const html = await response.text();
mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', html, 'utf8');
console.log('Rendered /digest/2026-10-28 to dist/index.html');
