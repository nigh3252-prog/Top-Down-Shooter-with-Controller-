import assert from 'node:assert/strict';
import {
  isFrontalShieldHit,
  resolveStanceDefenseProfile,
  shieldBlockCost,
  usesCustomDefense,
} from '../src/stance-defense-profiles.js';

assert.equal(resolveStanceDefenseProfile('S24').kind,'existing-dodge');
assert.equal(resolveStanceDefenseProfile('S24').dodgeCost,12);
assert.equal(resolveStanceDefenseProfile('S26').kind,'parry');
assert.equal(resolveStanceDefenseProfile('S01').kind,'shield');
assert.equal(resolveStanceDefenseProfile('S09'),null);
assert.equal(usesCustomDefense('S24'),false,'Rat Step must delegate to the existing dodge');
assert.equal(usesCustomDefense('S26'),true);
assert.equal(usesCustomDefense('S01'),true);

const shield=resolveStanceDefenseProfile('S01');
assert.equal(shieldBlockCost(2,shield),8);
assert.equal(shieldBlockCost(20,shield),30);
assert.equal(isFrontalShieldHit({incomingDir:{x:0,z:-1},forward:{x:0,z:1},arcDegrees:120}),true);
assert.equal(isFrontalShieldHit({incomingDir:{x:0,z:1},forward:{x:0,z:1},arcDegrees:120}),false);
assert.equal(isFrontalShieldHit({incomingDir:null,forward:{x:0,z:1},arcDegrees:120}),false);

console.log('stance defense profile tests passed');
