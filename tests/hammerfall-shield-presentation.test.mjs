import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const arena=readFileSync(new URL('../combat-arena.html',import.meta.url),'utf8');
assert.match(arena,/const light = bd\(2\)\|\|bd\(7\);/);
assert.match(arena,/const cross = bd\(0\);/);
assert.match(arena,/const leftTrigger = bd\(6\);/);
assert.match(arena,/crossPressed\|\|leftTriggerPressed/);
assert.match(arena,/gamepad-cross/);
assert.match(arena,/hammerfall-fallback/);
assert.doesNotMatch(arena,/padPrev\.dge/);

const visuals=readFileSync(new URL('../src/stance-gate5-visuals.js',import.meta.url),'utf8');
assert.match(visuals,/shield\.scale\.setScalar\(1\.8\)/);
assert.match(visuals,/const activeModel=PC\.combatLayer\?\.parent\|\|null;/);
assert.match(visuals,/return activeModel\?\.parent\|\|activeModel;/);
assert.match(visuals,/guard:\{position:new THREE\.Vector3\(-\.42,1\.48,1\.30\)/);
assert.match(visuals,/profileId==='hammerfall-shield'/);
assert.doesNotMatch(visuals,/parent\?\.parent\?\.parent\|\|PC\.combatLayer/);

console.log('Hammerfall shield input and presentation tests passed');
