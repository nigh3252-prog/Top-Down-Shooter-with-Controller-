import assert from 'node:assert/strict';
import { ROADIE_GAMEPAD_BUTTON, createRoadieState, stepRoadieBlend } from '../src/roadie-run.js';

assert.equal(ROADIE_GAMEPAD_BUTTON, 0, 'roadie run should use the standard bottom Cross/A dodge button');

const state = createRoadieState();
assert.equal(state.held, false);
assert.equal(state.engaged, false);
assert.equal(state.sprint, 0);
assert.equal(state.skidT > 0, true);
assert.deepEqual(state.lastDir, { x:0, z:1 });

let sprint = 0;
for(let i = 0; i < 20; i++) sprint = stepRoadieBlend(sprint, 1, 1 / 60);
assert.ok(sprint > .75 && sprint < 1, 'roadie run should build speed over several heavy steps');
const built = sprint;
for(let i = 0; i < 20; i++) sprint = stepRoadieBlend(sprint, 0, 1 / 60);
assert.ok(sprint < built * .2, 'roadie run should shed speed quickly after release');
assert.equal(stepRoadieBlend(.4, 1, 0), .4, 'zero dt should preserve the current blend');

console.log('Validated Cross-button roadie run state and acceleration curves.');
