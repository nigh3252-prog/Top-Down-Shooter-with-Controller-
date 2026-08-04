import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const arena=readFileSync(new URL('../combat-arena.html',import.meta.url),'utf8');
const runtime=readFileSync(new URL('../src/stance-gate5-defense.js',import.meta.url),'utf8');
const inputStart=arena.indexOf('/* ---------- input ---------- */');
const inputEnd=arena.indexOf('function gatherInput()',inputStart);
assert.ok(inputStart>=0&&inputEnd>inputStart,'Combat Arena input section should be present');
const inputSection=arena.slice(inputStart,inputEnd);

assert.match(arena,/function defenseDown\(source='input'\)\{/);
assert.match(arena,/const runtime=window\.__stance2Gate5Runtime;/);
assert.match(arena,/runtime\?\.defenseDown\?\.\(source\)/);
assert.match(arena,/if\(result\?\.handled\)return result;/);
assert.match(arena,/hammerfall-fallback/);
assert.match(inputSection,/if\(e\.key==='k'\) defenseDown\('keyboard'\);/);
assert.match(inputSection,/if\(e\.key==='k'\) defenseUp\('keyboard'\);/);
assert.match(inputSection,/const cross = bd\(0\);/);
assert.match(inputSection,/const leftTrigger = bd\(6\);/);
assert.match(inputSection,/crossPressed\|\|leftTriggerPressed/);
assert.match(inputSection,/gamepad-cross/);
assert.doesNotMatch(inputSection,/padPrev\.dge/);
assert.doesNotMatch(inputSection,/triggerDodge\(\)/,'raw defense inputs must not bypass the shared defense seam');

assert.doesNotMatch(runtime,/DODGE_LOCK/);
assert.doesNotMatch(runtime,/requestAnimationFrame/);
assert.doesNotMatch(runtime,/getGamepads/);
assert.doesNotMatch(runtime,/addEventListener\?\.\('keydown'/);

console.log('stance gate 5 input seam tests passed');
