import assert from 'node:assert/strict';
import { clampCatchRingSize } from '../src/stance-gate4-ring-size.js';

assert.equal(clampCatchRingSize(undefined),1);
assert.equal(clampCatchRingSize(0),1);
assert.equal(clampCatchRingSize(1),1);
assert.equal(clampCatchRingSize(2.4),2);
assert.equal(clampCatchRingSize(4.7),5);
assert.equal(clampCatchRingSize(5),5);
assert.equal(clampCatchRingSize(99),5);

console.log('stance gate 4 ring size tests passed');
