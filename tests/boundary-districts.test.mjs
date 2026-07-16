import assert from 'node:assert/strict';
import {
  BOUNDARY_DISTRICT_IDS,
  districtForRoom,
  districtVariant,
  hashBoundaryText,
} from '../src/boundary-districts.js';

assert.equal(districtForRoom('demo-seed', 0).id, 'boundary-courtyard');
assert.equal(districtForRoom('demo-seed', 7).id, districtForRoom('demo-seed', 7).id);
assert.equal(districtVariant('demo-seed', 7), districtVariant('demo-seed', 7));
assert.notEqual(hashBoundaryText('alpha'), hashBoundaryText('beta'));

const generated = new Set();
for(let roomId = 0; roomId < 48; roomId++) generated.add(districtForRoom('coverage-seed', roomId).id);
assert.deepEqual([...generated].sort(), [...BOUNDARY_DISTRICT_IDS].sort());

for(let roomId = 0; roomId < 32; roomId++){
  const variant = districtVariant('coverage-seed', roomId);
  assert.ok(variant >= 0 && variant <= 3);
}

console.log('boundary district contracts passed');
