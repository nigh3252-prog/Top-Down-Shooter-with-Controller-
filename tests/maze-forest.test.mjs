import assert from 'node:assert/strict';
import {
  buildForestPlacements,
  expandWallCollisionSegments,
  forestHalfWidthForHex,
  treeShouldCutaway,
} from '../src/maze-forest.js';

const edge = {
  edge:'0,0|1,0',
  a:{ x:-8, z:0 },
  b:{ x:8, z:0 },
  blocked:true,
};

const halfWidth = forestHalfWidthForHex(12);
assert.equal(halfWidth, 1.92, 'compact cells should make a substantial forest band');
assert.equal(forestHalfWidthForHex(20), 2.5, 'forest thickness should remain capped on large cells');

const first = buildForestPlacements([edge], { seed:'forest-test', halfWidth, maxTrees:20, spacing:3.8 });
const second = buildForestPlacements([edge], { seed:'forest-test', halfWidth, maxTrees:20, spacing:3.8 });
assert.deepEqual(first, second, 'forest placement should be deterministic for a maze seed');
assert.ok(first.length >= 2, 'a full wall edge should receive multiple trees');
for(const tree of first){
  assert.ok(tree.x >= edge.a.x - 1e-6 && tree.x <= edge.b.x + 1e-6, 'tree should stay along its source edge');
  assert.ok(Math.abs(tree.z) <= halfWidth * .73, 'tree should stay inside the forest wall region');
}

const lanes = expandWallCollisionSegments(edge, halfWidth, 5);
assert.equal(lanes.length, 5, 'forest collision should use five parallel lanes');
assert.deepEqual(lanes.map(line => Number(line.forestOffset.toFixed(2))), [-1.92, -.96, 0, .96, 1.92]);
assert.ok(lanes.every(line => line.forest === true), 'expanded collision lanes should be marked as forest');

const camera = { x:0, z:18 };
const player = { x:0, z:0 };
assert.equal(treeShouldCutaway({ x:.4, z:5, crownRadius:1.7 }, camera, player), true, 'a foreground tree in the camera corridor should cut away');
assert.equal(treeShouldCutaway({ x:4.5, z:5, crownRadius:1.7 }, camera, player), false, 'an off-axis foreground tree should remain full height');
assert.equal(treeShouldCutaway({ x:0, z:-3, crownRadius:1.7 }, camera, player), false, 'a tree behind the player should remain full height');
assert.equal(treeShouldCutaway({ x:0, z:16.5, crownRadius:1.7 }, camera, player), false, 'a tree close to the camera should not be mistaken for player occlusion');

console.log(`Validated deterministic forest placement, thick collision bands, and quiet camera cutaways (${first.length} sample trees).`);
