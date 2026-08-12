#!/usr/bin/env node
// Builds tools/wizard-of-legend-air-arcana-demo.html: a single self-contained
// page (three.js inlined) demonstrating Storm Draft and Whirling Wind Agent,
// reconstructed from the archived showcase encode and the Gate 1 / Gate 2 notes.
//
//   node scripts/build-wol-air-arcana-demo.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const template = fs.readFileSync(path.join(here, "wol-air-arcana-template.html"), "utf8");
const three = fs.readFileSync(path.join(here, "vendor", "three.min.js"), "utf8");
const game = fs.readFileSync(path.join(here, "wol-air-arcana-demo.js"), "utf8");

for (const marker of ["/*THREE*/", "/*GAME*/"]) {
  if (!template.includes(marker)) throw new Error(`template is missing ${marker}`);
}

const out = template
  .replace("/*THREE*/", () =>
    "\n/* three.js r159 (MIT) - https://threejs.org - inlined so the page runs offline */\n" + three + "\n")
  .replace("/*GAME*/", () => "\n" + game + "\n");

const dest = path.join(root, "tools", "wizard-of-legend-air-arcana-demo.html");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, out);
console.log(`built ${path.relative(root, dest)} (${(out.length / 1024).toFixed(0)}KB)`);
