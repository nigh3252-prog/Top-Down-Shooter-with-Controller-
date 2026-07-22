import assert from 'node:assert/strict';
import {
  detectDashJetQuality,
  effectiveDashJetGrainScale,
} from '../src/dash-magic-jet-performance.js';

assert.equal(
  detectDashJetQuality({ location:{ search:'?dashQuality=high' }, navigator:{ maxTouchPoints:5 } }).id,
  'high',
  'explicit high quality overrides phone detection',
);
assert.equal(
  detectDashJetQuality({ location:{ search:'?dashQuality=low' }, navigator:{} }).id,
  'low',
  'explicit low quality is available for A/B testing',
);
assert.equal(
  detectDashJetQuality({ location:{ search:'' }, navigator:{ maxTouchPoints:1 } }).id,
  'balanced',
  'touch devices default to balanced quality',
);
assert.equal(
  detectDashJetQuality({
    location:{ search:'' },
    navigator:{ hardwareConcurrency:12, deviceMemory:8 },
    matchMedia:()=>({ matches:false }),
  }).id,
  'high',
  'capable non-touch devices retain the original quality',
);
assert.equal(effectiveDashJetGrainScale(1, { minGrainScale:1.25 }), 1.25);
assert.equal(effectiveDashJetGrainScale(1.7, { minGrainScale:1.25 }), 1.7);

console.log('dash-magic-jet performance tests passed');
