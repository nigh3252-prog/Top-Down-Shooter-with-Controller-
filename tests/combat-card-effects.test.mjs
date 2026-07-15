import assert from 'node:assert/strict';
import {
  BLOOD_SLASH_MAX_CHARGES,
  BING_BONG_STANCE_ID,
  bingBongImpactDirection,
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

const impactDirection=bingBongImpactDirection({playerX:0,playerZ:0,impactX:3,impactZ:4});
assert.ok(Math.abs(impactDirection.x-.6)<1e-9);
assert.ok(Math.abs(impactDirection.z-.8)<1e-9);

// The shockwave begins at the struck enemy (3,4), not at the player (0,0).
assert.equal(pointInForwardCone({originX:3,originZ:4,forwardX:.6,forwardZ:.8,targetX:6,targetZ:8,range:6,angle:Math.PI/2}),true);
assert.equal(pointInForwardCone({originX:3,originZ:4,forwardX:.6,forwardZ:.8,targetX:0,targetZ:0,range:6,angle:Math.PI/2}),false);
assert.equal(pointInForwardCone({originX:3,originZ:4,forwardX:.6,forwardZ:.8,targetX:8,targetZ:4,range:6,angle:Math.PI/2}),false);

console.log('combat-card-effects tests passed');
