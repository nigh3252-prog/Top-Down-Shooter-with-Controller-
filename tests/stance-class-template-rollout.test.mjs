import assert from 'node:assert/strict';
import { STANCE_CARDS } from '../src/stance-cards.js';
import { STONE_WEAPONS } from '../src/weapons.js';
import { getStanceClass, getWeaponClass } from '../src/stance-compatibility.js';
import { GATE2_CLASS_PAIR_TEMPLATES, GATE2_FAILURE_ATTACKS, resolveGate2PilotProfile } from '../src/stance-gate2-runtime.js';
import { STANCE_MOVEMENT_CLASS_TEMPLATES, resolveStanceMovementProfile } from '../src/stance-movement-profiles.js';
import { GATE3_FULL_CLASS_PAYOFFS, resolveGate3FullPayoff } from '../src/stance-gate3-payoffs.js';
import { getAdaptedStanceAttack, getStanceAttackAdapter } from '../src/stance-attack-adapters.js';

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
    if(gate2.compatibility.tier!=='unusable'){
      assert.deepEqual(gate2.effectiveChain,stance.chain,`${stance.id}/${weaponId} full/adapted expression should keep the stance-authored chain`);
    }
    if(stanceClass===weaponClass)assert.equal(resolveGate3FullPayoff({stance,weapon,weaponId}).active,true);
    if(stanceClass==='Light'&&weaponClass==='Heavy')assert.ok(gate2.effectiveChain.every(key=>key===GATE2_FAILURE_ATTACKS.tooHeavy));
    if(stanceClass==='Heavy'&&weaponClass==='Light')assert.ok(gate2.effectiveChain.every(key=>key===GATE2_FAILURE_ATTACKS.tooLight));
    checked++;
  }
}
assert.equal(checked,STANCE_CARDS.length*Object.keys(STONE_WEAPONS).length);

const lightMedium=resolveGate2PilotProfile({stance:STANCE_CARDS.find(s=>s.id==='S23'),weapon:STONE_WEAPONS.katana,weaponId:'katana'});
assert.equal(lightMedium.sourceProfileId,'rat-step-longsword-adapted');
assert.deepEqual(lightMedium.effectiveChain,STANCE_CARDS.find(s=>s.id==='S23').chain);
assert.equal(getStanceAttackAdapter('Light','Medium').sourceCell,'S24:longsword');
const mediumHeavy=resolveGate2PilotProfile({stance:STANCE_CARDS.find(s=>s.id==='S03'),weapon:STONE_WEAPONS.battleaxe,weaponId:'battleaxe'});
assert.equal(mediumHeavy.sourceProfileId,'long-blade-greatsword-adapted');
assert.deepEqual(mediumHeavy.effectiveChain,STANCE_CARDS.find(s=>s.id==='S03').chain);
const heavyMediumMovement=resolveStanceMovementProfile({stance:STANCE_CARDS.find(s=>s.id==='S02'),weapon:STONE_WEAPONS.mace,weaponId:'mace'});
assert.equal(heavyMediumMovement.profile.sourceProfileId,'hammerfall-longsword-planted');
assert.equal(heavyMediumMovement.profile.recoveryDuration,.32);
assert.equal(heavyMediumMovement.profile.recoveryHold,.10);
const fullHeavy=resolveGate3FullPayoff({stance:STANCE_CARDS.find(s=>s.id==='S02'),weapon:STONE_WEAPONS.battleaxe,weaponId:'battleaxe'});
assert.equal(fullHeavy.active,true);
assert.equal(fullHeavy.payoff.sourcePayoffId,'heavy-breaking-form');
assert.equal(fullHeavy.payoff.staggerMult,2);


const makePose=o=>({
  hold:{x:o.hold[0],y:o.hold[1],z:o.hold[2]},
  tip:{x:o.tip[0],y:o.tip[1],z:o.tip[2]},
  roll:o.roll||0,twist:o.twist||0,pitch:o.pitch||0,lean:o.lean||0,hipTwist:o.hipTwist||0,
  hip:{x:o.hip?.[0]||0,z:o.hip?.[2]||0},lower:o.lower||0,lunge:o.lunge||0,head:{x:o.head?.[0]||0,y:o.head?.[1]||0},
});
const syntheticPC={
  IDLE:{id:'idle'},
  P:makePose,
  ATTACKS:{
    stab3:{group:'stab',label:'Synthetic Thrust',phases:[{dur:.2,t0:0,t1:.2,contact:true,ease:t=>t,pose:makePose({hold:[.8,1.35,.9],tip:[.5,.2,1],twist:.7,lean:.4,hipTwist:.5,hip:[.3,0,.4],lower:.3,lunge:.8,head:[.2,.1]})}],total:.2,contactAt:.2,comboAt:0},
  },
};
const syntheticOriginal=syntheticPC.ATTACKS.stab3;
const syntheticAdapted=getAdaptedStanceAttack(syntheticPC,'stab3','Light','Medium');
assert.notEqual(syntheticAdapted,syntheticOriginal);
assert.equal(syntheticAdapted.meta.stance2SourceAttackKey,'stab3');
assert.equal(syntheticAdapted.meta.stance2SourceCell,'S24:longsword');
assert.ok(Math.abs(syntheticAdapted.phases[0].pose.hold.x)<Math.abs(syntheticOriginal.phases[0].pose.hold.x),'choked adapter should pull the attack path inward');
assert.ok(syntheticAdapted.phases[0].pose.lunge<syntheticOriginal.phases[0].pose.lunge,'choked adapter should reduce lunge without replacing the attack');
assert.equal(getAdaptedStanceAttack(syntheticPC,'stab3','Light','Light'),syntheticOriginal,'same-class attack should not be retargeted');

console.log(`Stance 2 class-template rollout tests passed across ${checked} stance/weapon pairs with adjacent procedural retargeting.`);
