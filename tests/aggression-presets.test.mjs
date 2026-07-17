import assert from 'node:assert/strict';
import {
  AGGRESSION_PRESETS,
  AGGRESSION_DETAIL_CONTROLS,
  aggressionPresetForLevel,
  normalizeAggressionLevel,
} from '../src/aggression-preset-controls.js';

assert.deepEqual(Object.keys(AGGRESSION_PRESETS),['1','2','3','4','5']);
assert.equal(AGGRESSION_DETAIL_CONTROLS.length,8);
assert.equal(normalizeAggressionLevel(-10),1);
assert.equal(normalizeAggressionLevel(3.4),3);
assert.equal(normalizeAggressionLevel(99),5);
assert.equal(aggressionPresetForLevel(1).waveSize,6);
assert.equal(aggressionPresetForLevel(1).windup,1);
assert.equal(aggressionPresetForLevel(5).waveSize,12);
assert.equal(aggressionPresetForLevel(5).pressureBudget,4);
assert.equal(aggressionPresetForLevel(5).aggression,3);
assert.equal(aggressionPresetForLevel(5).idleRange,1);
assert.equal(aggressionPresetForLevel(5).windup,.5);
assert.equal(aggressionPresetForLevel(5).cooldown,0);
assert.equal(aggressionPresetForLevel(5).recovery,.05);
assert.equal(aggressionPresetForLevel(5).pursuit,2.5);

const rising=['waveSize','pressureBudget','aggression','pursuit'];
const falling=['idleRange','windup','cooldown','recovery'];
for(let level=2;level<=5;level++){
  const previous=AGGRESSION_PRESETS[level-1];
  const current=AGGRESSION_PRESETS[level];
  for(const key of rising) assert.ok(current[key]>=previous[key],`${key} must rise from ${level-1} to ${level}`);
  for(const key of falling) assert.ok(current[key]<=previous[key],`${key} must fall from ${level-1} to ${level}`);
}

console.log('aggression preset tests passed');
