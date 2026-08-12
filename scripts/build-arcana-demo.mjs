#!/usr/bin/env node
/**
 * Builds tools/wizard-of-legend-arcana-demo.html: a single, fully offline
 * HTML file with three.js and the demo application inlined.
 *
 *   node scripts/build-arcana-demo.mjs
 *
 * Sources live in tools/arcana-demo/:
 *   shell.html          page chrome, CSS and touch UI, with two script slots
 *   app.js              the demo itself
 *   vendor/three.min.js pinned three.js UMD build
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'tools', 'arcana-demo');
const out = join(root, 'tools', 'wizard-of-legend-arcana-demo.html');

const shell = readFileSync(join(src, 'shell.html'), 'utf8');
const three = readFileSync(join(src, 'vendor', 'three.min.js'), 'utf8');
const app = readFileSync(join(src, 'app.js'), 'utf8');

for (const slot of ['/*__THREE__*/', '/*__APP__*/']) {
  if (!shell.includes(slot)) {
    throw new Error(`shell.html is missing the ${slot} slot`);
  }
}

// Inline scripts end at the first literal "</script>", so neutralise any that
// appear inside the payloads before they are embedded.
const safe = (code) => code.replaceAll('</script', '<\\/script');

const html = shell
  .replace('/*__THREE__*/', () => safe(three))
  .replace('/*__APP__*/', () => safe(app));

writeFileSync(out, html);

const kb = (statSync(out).size / 1024).toFixed(0);
console.log(`wrote ${out.replace(root + '/', '')} (${kb} KB, standalone)`);
