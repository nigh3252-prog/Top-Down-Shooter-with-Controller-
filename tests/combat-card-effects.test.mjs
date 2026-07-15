import assert from 'node:assert/strict';
import {
  BLOOD_SLASH_MAX_CHARGES,
  BING_BONG_STANCE_ID,
  bingBongProfile,
  concussionCoefficient,
  pointInForwardCone,
} from '../src/combat-card-effects.js';

assert.equal(BLOOD_SLASH_MAX_CHARGES,3);
assert.equal(BING_BONG_STANCE_ID,'S31-BING-BONG');
assert.equal(concussionCoefficient({id:'hammerHead',type:'blunt'}),1);
assert.ok(concussionCoefficient({id:'spearShaft',type:'blunt'})>concussionCoefficient({id:'rapierTip',type:'pierce'}));

const rapier=bingBongProfile(30,concussionCoefficient({id:'rapierTip',type:'pierce'}));
const shaft=bingBongProfile(8,concussionCoefficient({id:'spearShaft',type:'blunt'}));
const mace=bingBongProfile(31,concussionCoefficient({id:'maceHead',type:'hybrid'}));
const hammer=bingBongProfile(70,concussionCoefficient({id:'hammerHead',type:'blunt'}));
assert.ok(rapier.range<shaft.range);
assert.ok(shaft.range<mace.range);
assert.ok(mace.range<hammer.range);
assert.ok(rapier.stun<shaft.stun&&shaft.stun<mace.stun&&mace.stun<hammer.stun);
assert.ok(hammer.range<=11.5&&hammer.stun<=1.45);

assert.equal(pointInForwardCone({playerX:0,playerZ:0,forwardX:0,forwardZ:1,targetX:0,targetZ:4,range:5,angle:Math.PI/2}),true);
assert.equal(pointInForwardCone({playerX:0,playerZ:0,forwardX:0,forwardZ:1,targetX:4,targetZ:0,range:5,angle:Math.PI/2}),false);
assert.equal(pointInForwardCone({playerX:0,playerZ:0,forwardX:0,forwardZ:1,targetX:0,targetZ:6,range:5,angle:Math.PI/2}),false);

console.log('combat-card-effects tests passed');
