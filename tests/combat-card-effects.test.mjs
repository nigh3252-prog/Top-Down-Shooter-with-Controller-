import assert from 'node:assert/strict';
import {
  BLOOD_SLASH_MAX_CHARGES,
  BING_BONG_STANCE_ID,
  BING_BONG_STUN_DURATION,
  bingBongProfile,
  concussionCoefficient,
  pointInRadius,
} from '../src/combat-card-effects.js';

assert.equal(BLOOD_SLASH_MAX_CHARGES,3);
assert.equal(BING_BONG_STANCE_ID,'S31-BING-BONG');
assert.equal(BING_BONG_STUN_DURATION,3);
assert.equal(concussionCoefficient({id:'hammerHead',type:'blunt'}),1);
assert.ok(concussionCoefficient({id:'spearShaft',type:'blunt'})>concussionCoefficient({id:'rapierTip',type:'pierce'}));

const rapier=bingBongProfile(30,concussionCoefficient({id:'rapierTip',type:'pierce'}));
const shaft=bingBongProfile(8,concussionCoefficient({id:'spearShaft',type:'blunt'}));
const mace=bingBongProfile(31,concussionCoefficient({id:'maceHead',type:'hybrid'}));
const hammer=bingBongProfile(70,concussionCoefficient({id:'hammerHead',type:'blunt'}));
assert.ok(rapier.range<shaft.range);
assert.ok(shaft.range<mace.range);
assert.ok(mace.range<hammer.range);
assert.ok(mace.range>=10);
assert.ok(rapier.range>=4.5);
assert.ok(hammer.range<=14.5);
assert.equal(rapier.stun,3);
assert.equal(shaft.stun,3);
assert.equal(mace.stun,3);
assert.equal(hammer.stun,3);

assert.equal(pointInRadius({originX:3,originZ:4,targetX:3,targetZ:4,range:10}),true);
assert.equal(pointInRadius({originX:3,originZ:4,targetX:9,targetZ:12,range:10}),true);
assert.equal(pointInRadius({originX:3,originZ:4,targetX:9.1,targetZ:12.1,range:10}),false);
assert.equal(pointInRadius({originX:3,originZ:4,targetX:-3,targetZ:4,range:6}),true);

console.log('combat-card-effects tests passed');
