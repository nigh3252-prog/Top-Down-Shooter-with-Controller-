import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const arena=readFileSync(new URL('../combat-arena.html',import.meta.url),'utf8');
const runtime=readFileSync(new URL('../src/stance-gate5-defense.js',import.meta.url),'utf8');
const inputStart=arena.indexOf('/* ---------- input ---------- */');
const inputEnd=arena.indexOf('function gatherInput()',inputStart);
assert.ok(inputStart>=0&&inputEnd>inputStart,'Combat Arena input section should be present');
const inputSection=arena.slice(inputStart,inputEnd);

assert.match(arena,/function defenseDown\(source='input'\)\{/);
assert.match(arena,/window\.__stance2Gate5Runtime\?\.defenseDown\?\.\(source\)/);
assert.match(arena,/if\(result\?\.handled\) return result;[\s\S]*?triggerDodge\(\);/);
assert.match(inputSection,/if\(e\.key==='k'\) defenseDown\('keyboard'\);/);
assert.match(inputSection,/if\(e\.key==='k'\) defenseUp\('keyboard'\);/);
assert.match(inputSection,/if\(dge && !padPrev\.dge\) defenseDown\('gamepad'\);/);
assert.match(inputSection,/if\(!dge && padPrev\.dge\) defenseUp\('gamepad'\);/);
assert.doesNotMatch(inputSection,/triggerDodge\(\)/,'raw defense inputs must not bypass the shared defense seam');

assert.doesNotMatch(runtime,/DODGE_LOCK/);
assert.doesNotMatch(runtime,/requestAnimationFrame/);
assert.doesNotMatch(runtime,/getGamepads/);
assert.doesNotMatch(runtime,/addEventListener\?\.\('keydown'/);

console.log('stance gate 5 input seam tests passed');
