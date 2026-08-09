import assert from 'node:assert/strict';
import { getStanceClass } from '../src/stance-compatibility.js';
import {
  STANCE_DEFENSE_FAMILY_BY_ID,
  STANCE_DEFENSE_PROFILES,
  isFrontalShieldHit,
  resolveStanceDefenseProfile,
  shieldBlockCost,
  stanceDefenseLetter,
  usesCustomDefense,
} from '../src/stance-defense-profiles.js';

const expectedAssignments={
  S01:'block',S02:'parry',S03:'block',S04:'block',S05:'block',S06:'block',S07:'parry',S08:'parry',S09:'dodge',S10:'parry',
  S11:'dodge',S12:'parry',S13:'dodge',S14:'block',S15:'dodge',S16:'parry',S17:'parry',S18:'parry',S19:'parry',S20:'block',
  S21:'block',S22:'parry',S23:'dodge',S24:'dodge',S25:'dodge',S26:'parry',S27:'parry',S28:'block',S29:'parry',S30:'block',
};
assert.deepEqual(STANCE_DEFENSE_FAMILY_BY_ID,expectedAssignments);
assert.equal(Object.keys(STANCE_DEFENSE_PROFILES).length,30);
for(let i=1;i<=30;i++){
  const id=`S${String(i).padStart(2,'0')}`;
  assert.ok(resolveStanceDefenseProfile(id),`${id} must have a defense profile`);
}

assert.equal(resolveStanceDefenseProfile('S24').kind,'existing-dodge');
assert.equal(resolveStanceDefenseProfile('S24').dodgeCost,12);
assert.equal(resolveStanceDefenseProfile('S24').id,'rat-step-existing-dodge');
assert.equal(resolveStanceDefenseProfile('S26').kind,'parry');
assert.equal(resolveStanceDefenseProfile('S26').id,'long-blade-parry');
assert.equal(resolveStanceDefenseProfile('S01').kind,'shield');
assert.equal(resolveStanceDefenseProfile('S01').id,'hammerfall-kite-shield');
assert.equal(resolveStanceDefenseProfile('S09').kind,'existing-dodge');
assert.equal(resolveStanceDefenseProfile('S14').kind,'shield');
assert.equal(resolveStanceDefenseProfile('S03').kind,'shield');
assert.equal(resolveStanceDefenseProfile('S16').kind,'parry');
assert.equal(resolveStanceDefenseProfile('S31'),null);
assert.equal(stanceDefenseLetter('S24'),'D');
assert.equal(stanceDefenseLetter('S26'),'P');
assert.equal(stanceDefenseLetter('S01'),'B');
assert.equal(stanceDefenseLetter({kind:'dodge'}),'D');
assert.equal(stanceDefenseLetter({kind:'block'}),'B');
assert.equal(stanceDefenseLetter('S31'),'?');

assert.equal(usesCustomDefense('S24'),false,'Rat Step-style dodge profiles delegate to the existing dodge');
assert.equal(usesCustomDefense('S09'),false,'Deep Launch must use the existing dodge seam');
assert.equal(usesCustomDefense('S26'),true);
assert.equal(usesCustomDefense('S16'),true);
assert.equal(usesCustomDefense('S01'),true);
assert.equal(usesCustomDefense('S14'),true);

const totalCounts={dodge:0,parry:0,block:0};
const classCounts={
  Light:{dodge:0,parry:0,block:0},
  Medium:{dodge:0,parry:0,block:0},
  Heavy:{dodge:0,parry:0,block:0},
};
for(const [stanceId,family] of Object.entries(STANCE_DEFENSE_FAMILY_BY_ID)){
  totalCounts[family]++;
  classCounts[getStanceClass(stanceId)][family]++;
}
assert.deepEqual(totalCounts,{dodge:7,parry:13,block:10});
assert.deepEqual(classCounts.Light,{dodge:3,parry:3,block:1});
assert.deepEqual(classCounts.Medium,{dodge:3,parry:5,block:2});
assert.deepEqual(classCounts.Heavy,{dodge:1,parry:5,block:7});

const shield=resolveStanceDefenseProfile('S01');
assert.equal(shieldBlockCost(2,shield),8);
assert.equal(shieldBlockCost(20,shield),30);
assert.equal(isFrontalShieldHit({incomingDir:{x:0,z:-1},forward:{x:0,z:1},arcDegrees:120}),true);
assert.equal(isFrontalShieldHit({incomingDir:{x:0,z:1},forward:{x:0,z:1},arcDegrees:120}),false);
assert.equal(isFrontalShieldHit({incomingDir:null,forward:{x:0,z:1},arcDegrees:120}),false);

console.log('stance defense profile tests passed for all 30 assignments');
