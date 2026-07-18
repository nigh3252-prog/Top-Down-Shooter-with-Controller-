import assert from 'node:assert/strict';
import {
  BASIC_DASH,
  dashDistance,
  dashDistanceAt,
  postDashDirection,
  postDashSpeed,
  selectDashDirection,
} from '../src/basic-dash-logic.js';

assert.equal(dashDistance(), 10.5, 'dash should cover exactly five player diameters');
assert.equal(dashDistanceAt(0), 0);
assert.ok(Math.abs(dashDistanceAt(BASIC_DASH.duration) - 10.5) < 1e-9);

let previous = -Infinity;
for(let i = 0; i <= 24; i++){
  const distance = dashDistanceAt(BASIC_DASH.duration * i / 24);
  assert.ok(distance >= previous, 'dash distance curve must stay monotonic');
  previous = distance;
}

assert.deepEqual(
  selectDashDirection({ input:{ x:3, z:4 }, forward:{ x:1, z:0 } }),
  { x:.6, z:.8 },
  'held movement should choose dash direction',
);
assert.deepEqual(
  selectDashDirection({ input:{ x:0, z:0 }, forward:{ x:0, z:1 } }),
  { x:0, z:-1 },
  'idle dash should go backward from facing',
);

const locked = postDashDirection(
  { x:0, z:1 },
  { x:1, z:0 },
  BASIC_DASH.fullDirectionLock * .5,
);
assert.deepEqual(locked, { x:0, z:1 }, 'turning should stay locked immediately after dash');

const released = postDashDirection(
  { x:0, z:1 },
  { x:1, z:0 },
  BASIC_DASH.postLockDuration,
);
assert.ok(released.x > .999 && Math.abs(released.z) < .001, 'steering should fully recover by the end');
assert.ok(postDashSpeed({ x:0, z:0 }, .01) > postDashSpeed({ x:0, z:0 }, .20), 'idle momentum should decay');
assert.ok(Math.abs(postDashSpeed({ x:1, z:0 }, BASIC_DASH.postLockDuration) - BASIC_DASH.playerMoveSpeed) < 1e-9);

console.log('basic dash tests passed');
