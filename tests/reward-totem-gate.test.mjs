import assert from 'node:assert/strict';
import { chooseTotemPosition, pointSegmentDistance2D } from '../src/reward-totem-gate.js';

assert.equal(
  pointSegmentDistance2D({x:1,z:1},{x:0,z:0},{x:2,z:0}),
  1,
  'segment distance should measure perpendicular wall clearance',
);

const position = chooseTotemPosition({
  actorX:0,
  actorZ:0,
  centerX:5,
  centerZ:0,
  segments:[{a:{x:2,z:-1},b:{x:2,z:1}}],
});
assert.ok(Math.hypot(position.x,position.z)>=1.8,'totem should not spawn directly on the player');
assert.ok(Number.isFinite(position.x)&&Number.isFinite(position.z),'totem position should remain finite');

console.log('reward totem gate tests passed');
