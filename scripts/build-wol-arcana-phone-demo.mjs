#!/usr/bin/env node
// Inlines a minified three.js build into tools/wol-arcana-phone-demo.src.html
// so the demo ships as one self-contained file that runs from file:// with no
// network. Run: node scripts/build-wol-arcana-phone-demo.mjs
//
// The bundle is produced with esbuild from the npm `three` package:
//   npx esbuild node_modules/three/build/three.cjs --bundle --format=iife \
//       --global-name=THREE --minify --outfile=<cache>/three.iife.min.js

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(root, 'tools/wol-arcana-phone-demo.src.html');
const OUT = resolve(root, 'tools/wol-arcana-phone-demo.html');
const THREE_VERSION = '0.165.0';
const cacheDir = resolve(root, 'node_modules/.cache/wol-demo');
const bundlePath = resolve(cacheDir, `three-${THREE_VERSION}.iife.min.js`);

function buildThreeBundle() {
  if (existsSync(bundlePath)) return readFileSync(bundlePath, 'utf8');
  mkdirSync(cacheDir, { recursive: true });
  const entry = resolve(root, 'node_modules/three/build/three.cjs');
  if (!existsSync(entry)) {
    throw new Error(`three not installed. Run: npm install --no-save three@${THREE_VERSION}`);
  }
  execFileSync('npx', [
    '--yes', 'esbuild@0.23.0', entry,
    '--bundle', '--format=iife', '--global-name=THREE', '--minify',
    `--outfile=${bundlePath}`
  ], { stdio: 'inherit', cwd: root });
  return readFileSync(bundlePath, 'utf8');
}

const three = buildThreeBundle();
const src = readFileSync(SRC, 'utf8');
const marker = '/*__THREE_BUNDLE__*/';
if (!src.includes(marker)) throw new Error(`missing ${marker} in ${SRC}`);

const html = src.replace(marker, () => three);
writeFileSync(OUT, html);
console.log(`built ${OUT} (${(html.length / 1024).toFixed(0)} KB, three r${THREE_VERSION})`);
