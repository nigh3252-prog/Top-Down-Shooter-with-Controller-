import assert from 'node:assert/strict';
import {
  ACCORDION_GREATSWORD_CLEAR_DISTANCE,
  ACCORDION_RETREAT_DASH_SPEED,
  ACCORDION_RETREAT_DISTANCE_MULTIPLIER,
  planAccordionPostAttackRetreat,
  recoverStaleAccordionMovementLock,
} from '../src/arena-enemies-base.js';
import { getWardenTrialCombatBand } from '../src/warden-trial-ai.js';
import { STONE_WEAPONS } from '../src/weapons.js';

const redTollGreatsword={
  ...STONE_WEAPONS.greatsword,
  tune:{...STONE_WEAPONS.greatsword.tune,length:Math.min(2.45,STONE_WEAPONS.greatsword.tune.length*1.30)},
};
const greatswordBand=getWardenTrialCombatBand({weapon:redTollGreatsword,target:{radius:.86}});
assert.ok(ACCORDION_GREATSWORD_CLEAR_DISTANCE>greatswordBand.attackMax,'the retreat target must clear greatsword attack range');

const plan=planAccordionPostAttackRetreat({
  enemy:{x:4.8,z:0},
  player:{x:0,z:0},
});
assert.equal(plan.shouldRetreat,true);
assert.ok(plan.direction.x>.99&&Math.abs(plan.direction.z)<.01,'the dash should point directly away from the player');
assert.ok(plan.distance>0);
assert.ok(Math.abs(plan.distance-(ACCORDION_GREATSWORD_CLEAR_DISTANCE-4.8)*ACCORDION_RETREAT_DISTANCE_MULTIPLIER)<1e-9,'the retreat should use the doubled post-attack travel distance');
assert.ok(Math.abs(plan.duration-plan.distance/ACCORDION_RETREAT_DASH_SPEED)<1e-9);
assert.ok(plan.targetDistance>greatswordBand.attackMax);

const alreadyClear=planAccordionPostAttackRetreat({
  enemy:{x:ACCORDION_GREATSWORD_CLEAR_DISTANCE+.1,z:0},
  player:{x:0,z:0},
});
assert.equal(alreadyClear.shouldRetreat,false,'an accordion already outside the band should not dash again');
assert.equal(alreadyClear.distance,0);

const coincident=planAccordionPostAttackRetreat({
  enemy:{x:0,z:0,facing:{x:1,z:0}},
  player:{x:0,z:0},
});
assert.deepEqual(coincident.direction,{x:-1,z:0},'a coincident target should use the opposite of the enemy facing');

const activeLock={accordion2d:true,movementLocked:true,moveSpeedMultiplier:0,__wizardArcanaMovementLockCount:1};
assert.equal(recoverStaleAccordionMovementLock(activeLock),false,'an actively owned Arcana movement lock must remain in force');
assert.equal(activeLock.movementLocked,true);
const staleLock={accordion2d:true,movementLocked:true,moveSpeedMultiplier:0};
assert.equal(recoverStaleAccordionMovementLock(staleLock),true,'an unowned stale lock should be cleared before AI resumes');
assert.equal('movementLocked' in staleLock,false);
assert.equal('moveSpeedMultiplier' in staleLock,false);

console.log('Accordion post-attack greatsword retreat plan: ok');
