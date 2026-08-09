import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const visuals=readFileSync(new URL('../src/stance-gate5-visuals.js',import.meta.url),'utf8');
assert.ok(visuals.includes('shield.scale.setScalar(1.8)'));
assert.ok(visuals.includes("const shieldStance=lastState.kind==='shield'"));
assert.ok(visuals.includes('return activeModel?.parent||activeModel'));
assert.ok(visuals.includes('guard:{position:new THREE.Vector3(-.42,1.48,1.30)'));
console.log('Hammerfall shield presentation tests passed');
