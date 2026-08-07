import assert from 'node:assert/strict';
import { STANCE_CARDS } from '../src/stance-cards.js';
import { STONE_WEAPONS } from '../src/weapons.js';
import { getStanceClass, getWeaponClass } from '../src/stance-compatibility.js';
import { GATE2_CLASS_PAIR_TEMPLATES, GATE2_FAILURE_ATTACKS, resolveGate2PilotProfile } from '../src/stance-gate2-runtime.js';
import { STANCE_MOVEMENT_CLASS_TEMPLATES, resolveStanceMovementProfile } from '../src/stance-movement-profiles.js';
import { GATE3_FULL_CLASS_PAYOFFS, resolveGate3FullPayoff } from '../src/stance-gate3-payoffs.js';

assert.equal(Object.keys(GATE2_CLASS_PAIR_TEMPLATES).length,9);
assert.equal(Object.keys(STANCE_MOVEMENT_CLASS_TEMPLATES).length,9);
assert.equal(Object.keys(GATE3_FULL_CLASS_PAYOFFS).length,3);

let checked=0;
for(const stance of STANCE_CARDS){
  const stanceClass=getStanceClass(stance);
  assert.ok(stanceClass,`${stance.id} must have a stance class`);
  for(const [weaponId,weapon] of Object.entries(STONE_WEAPONS)){
    const weaponClass=getWeaponClass(weapon);
    assert.ok(weaponClass,`${weaponId} must have a weapon class`);
    const gate2=resolveGate2PilotProfile({stance,weapon,weaponId});
    assert.equal(gate2.active,true,`${stance.id}/${weaponId} should resolve through the class template`);
    assert.equal(gate2.templateKey,`${stanceClass}:${weaponClass}`);
    assert.equal(gate2.profile.tier,gate2.compatibility.tier);
    assert.equal(gate2.effectiveChain.length,3);
    const movement=resolveStanceMovementProfile({stance,weapon,weaponId});
    assert.equal(movement.active,true,`${stance.id}/${weaponId} should inherit a movement template`);
    assert.equal(movement.templateKey,`${stanceClass}:${weaponClass}`);
    if(stanceClass===weaponClass){
      assert.deepEqual(gate2.effectiveChain,stance.chain,`${stance.id}/${weaponId} full expression should keep the stance-authored chain`);
      assert.equal(resolveGate3FullPayoff({stance,weapon,weaponId}).active,true);
    }
    if(stanceClass==='Light'&&weaponClass==='Heavy')assert.ok(gate2.effectiveChain.every(key=>key===GATE2_FAILURE_ATTACKS.tooHeavy));
    if(stanceClass==='Heavy'&&weaponClass==='Light')assert.ok(gate2.effectiveChain.every(key=>key===GATE2_FAILURE_ATTACKS.tooLight));
    checked++;
  }
}
assert.equal(checked,STANCE_CARDS.length*Object.keys(STONE_WEAPONS).length);

const lightMedium=resolveGate2PilotProfile({stance:STANCE_CARDS.find(s=>s.id==='S23'),weapon:STONE_WEAPONS.katana,weaponId:'katana'});
assert.equal(lightMedium.sourceProfileId,'rat-step-longsword-adapted');
assert.deepEqual(lightMedium.effectiveChain,['vertical10','stab3','horizontal3']);
const mediumHeavy=resolveGate2PilotProfile({stance:STANCE_CARDS.find(s=>s.id==='S03'),weapon:STONE_WEAPONS.battleaxe,weaponId:'battleaxe'});
assert.equal(mediumHeavy.sourceProfileId,'long-blade-greatsword-adapted');
assert.deepEqual(mediumHeavy.effectiveChain,['vertical10','stab5','horizontal6']);
const heavyMediumMovement=resolveStanceMovementProfile({stance:STANCE_CARDS.find(s=>s.id==='S02'),weapon:STONE_WEAPONS.mace,weaponId:'mace'});
assert.equal(heavyMediumMovement.profile.sourceProfileId,'hammerfall-longsword-planted');
assert.equal(heavyMediumMovement.profile.recoveryDuration,.32);
assert.equal(heavyMediumMovement.profile.recoveryHold,.10);
const fullHeavy=resolveGate3FullPayoff({stance:STANCE_CARDS.find(s=>s.id==='S02'),weapon:STONE_WEAPONS.battleaxe,weaponId:'battleaxe'});
assert.equal(fullHeavy.active,true);
assert.equal(fullHeavy.payoff.sourcePayoffId,'heavy-breaking-form');
assert.equal(fullHeavy.payoff.staggerMult,2);

console.log(`Stance 2 class-template rollout tests passed across ${checked} stance/weapon pairs.`);
