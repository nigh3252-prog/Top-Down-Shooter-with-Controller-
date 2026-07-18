import assert from 'node:assert/strict';
import { chooseTotemPosition, pointSegmentDistance2D } from '../src/reward-totem-gate.js';

assert.equal(
  pointSegmentDistance2D({ x:1, z:1 }, { x:0, z:0 }, { x:2, z:0 }),
  1,
  '2D segment distance should measure perpendicular clearance',
);

const selected = chooseTotemPosition({
  actorX:0,
  actorZ:0,
  centerX:5,
  centerZ:0,
  segments:[{ a:{ x:2, z:-1 }, b:{ x:2, z:1 } }],
});
assert.ok(Math.hypot(selected.x, selected.z) >= 1.8, 'totem must not spawn directly on the player');
assert.ok(Number.isFinite(selected.x) && Number.isFinite(selected.z), 'totem position must remain finite');

console.log('reward totem gate helper tests passed');
