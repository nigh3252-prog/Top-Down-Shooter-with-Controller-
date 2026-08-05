import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const lab=readFileSync(new URL('../enemy-lab.html',import.meta.url),'utf8');
assert.ok(lab.includes("outer.has('defenseDebug')"));
assert.ok(lab.includes("inner.set('defenseDebug',outer.get('defenseDebug'))"));
console.log('Enemy Lab defense-debug forwarding test passed');
