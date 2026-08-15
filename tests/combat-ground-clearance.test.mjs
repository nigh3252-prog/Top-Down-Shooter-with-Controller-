import assert from 'node:assert/strict';
import { enforceGroundClearance, raisedDirection } from '../src/combat-ground-clearance.js';

function makePose(holdY, tipY) {
  return { hold: { x: 0, y: holdY, z: 0 }, tip: { x: 0, y: tipY, z: Math.sqrt(Math.max(0, 1 - tipY * tipY)) } };
}

function makeMeasure(pose, weaponLength = 1, radius = 0) {
  return () => pose.hold.y + pose.tip.y * weaponLength - radius;
}

const safePose = makePose(2, 0);
let safeApplications = 0;
const safe = enforceGroundClearance({
  pose: safePose,
  applyPose: () => { safeApplications += 1; },
  measureMinY: makeMeasure(safePose),
});
assert.equal(safe.corrected, false);
assert.equal(safeApplications, 1);
assert.equal(safePose.hold.y, 2);

const downwardPose = makePose(.7, -.85);
const originalLength = Math.hypot(downwardPose.tip.x, downwardPose.tip.y, downwardPose.tip.z);
const downward = enforceGroundClearance({
  pose: downwardPose,
  clearance: .05,
  holdScale: 2,
  applyPose: () => {},
  measureMinY: makeMeasure(downwardPose, 1.4, .04),
});
assert.equal(downward.corrected, true);
assert.ok(downward.minY >= .05 - 1e-6);
assert.ok(downward.tipRaise > 0 || downward.gripLift > 0);
assert.ok(Math.abs(Math.hypot(downwardPose.tip.x, downwardPose.tip.y, downwardPose.tip.z) - originalLength) < 1e-6);

const liftOnlyPose = makePose(.2, -.9);
const originalTip = { ...liftOnlyPose.tip };
const liftOnly = enforceGroundClearance({
  pose: liftOnlyPose,
  clearance: .05,
  holdScale: 1,
  allowTipCorrection: false,
  applyPose: () => {},
  measureMinY: makeMeasure(liftOnlyPose, .9, .08),
});
assert.equal(liftOnly.tipRaise, 0);
assert.ok(liftOnly.gripLift > 0);
assert.deepEqual(liftOnlyPose.tip, originalTip);
assert.ok(liftOnly.minY >= .05 - 1e-6);

const raised = raisedDirection({ x: .6, y: -.7, z: .3 }, .25);
assert.ok(raised.y > -.7);
assert.ok(Math.abs(Math.hypot(raised.x, raised.y, raised.z) - 1) < 1e-6);

console.log('combat ground-clearance tests passed');
