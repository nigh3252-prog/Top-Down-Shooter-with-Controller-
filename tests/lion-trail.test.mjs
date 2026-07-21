import assert from 'node:assert/strict';
import { createDelayedPositionTracker } from '../src/player-position-history.js';

const tracker = createDelayedPositionTracker({ delaySeconds:3, retentionSeconds:5 });
tracker.record(0, { x:0, z:0 });
tracker.record(1, { x:10, z:4 });
tracker.record(2, { x:20, z:8 });
tracker.record(3, { x:30, z:12 });

assert.deepEqual(
  tracker.sample(3),
  { x:0, z:0, time:0 },
  'the first three seconds target the encounter-start position'
);
assert.deepEqual(
  tracker.sample(3.5),
  { x:5, z:2, time:.5 },
  'the delayed target interpolates smoothly between recorded frames'
);
assert.deepEqual(
  tracker.sample(5),
  { x:20, z:8, time:2 },
  'the sampled target is exactly three seconds behind'
);

tracker.record(6, { x:60, z:24 });
assert.deepEqual(tracker.sample(6), { x:30, z:12, time:3 });
tracker.clear();
assert.equal(tracker.sample(7), null, 'encounter cleanup clears the old player trail');

console.log('lion trail tests passed');
