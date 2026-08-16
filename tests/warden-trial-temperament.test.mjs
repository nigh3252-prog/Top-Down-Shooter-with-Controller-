import assert from 'node:assert/strict';
import { ARENA_SHELL_HTML } from '../src/arena-shell.js';
import { createWardenTrialBrain } from '../src/warden-trial-ai.js';
import {
  DEFAULT_WARDEN_TEMPERAMENT_ID,
  WARDEN_TEMPERAMENTS,
  normalizeWardenTemperament,
  wardenTemperamentForLevel,
} from '../src/warden-trial-temperaments.js';

assert.equal(WARDEN_TEMPERAMENTS.length,10,'the Warden selector has exactly ten defense levels');
assert.deepEqual(
  WARDEN_TEMPERAMENTS.map(option=>option.label),
  ['BERSERKER','RECKLESS','AGGRESSIVE','PRESSING','BALANCED-AGGRESSIVE','BALANCED','CAUTIOUS','GUARDED','SURVIVOR','FORTRESS'],
);
assert.equal(normalizeWardenTemperament().id,DEFAULT_WARDEN_TEMPERAMENT_ID);
assert.equal(normalizeWardenTemperament(1).id,'berserker');
assert.equal(normalizeWardenTemperament('FORTRESS').level,10);
assert.equal(wardenTemperamentForLevel(6).id,'balanced');
assert.equal(wardenTemperamentForLevel(999).id,DEFAULT_WARDEN_TEMPERAMENT_ID);
for(const option of WARDEN_TEMPERAMENTS){
  assert.match(ARENA_SHELL_HTML,new RegExp(`data-trial-temperament="${option.level}"`),`${option.label} is available in the pause menu`);
}
assert.equal((ARENA_SHELL_HTML.match(/class="trialTemperamentChoice"/g)||[]).length,10,'the pause menu renders one button per level');
assert.match(ARENA_SHELL_HTML,/id="trialTemperamentNote"/,'the selected level has an accessible description');

const player={x:0,z:0};
const weapon={kind:'blade',tune:{length:1}};
const threat={
  id:'telegraph',x:6.4,z:0,hp:10,state:'windup',stateTime:.82,windup:1,
  attack:{range:3.5,arc:Math.PI,damage:10,kind:'melee'},facing:{x:-1,z:0},
};
const defense={kind:'parry',parryRemaining:0,parryRecoveryRemaining:0};
const context={
  player,enemies:[threat],weapon,stamina:100,health:100,maxHealth:100,
  attackActive:false,attackCosts:{light:10,heavy:20,chargedHeavy:35},defense,
};

const berserker=createWardenTrialBrain({temperament:1,decisionInterval:0});
const fortress=createWardenTrialBrain({temperament:10,decisionInterval:0});
assert.notEqual(berserker.update(.016,context).action,'parry','the lowest level keeps its late parry window');
assert.equal(fortress.update(.016,context).action,'parry','the highest level answers the same tell with an early parry');

const aggressive=createWardenTrialBrain({temperament:3,decisionInterval:0});
const cautious=createWardenTrialBrain({temperament:7,decisionInterval:0});
const quietEnemy={id:'quiet',x:6.4,z:0,hp:10,state:'idle'};
const quietContext={...context,enemies:[quietEnemy]};
assert.equal(aggressive.update(.016,quietContext).action,'light');
assert.equal(cautious.update(.016,quietContext).action,'light');
assert.equal(cautious.snapshot().temperamentLevel,7);
cautious.setTemperament(10);
assert.equal(cautious.snapshot().temperamentId,'fortress','the runtime can change levels without rebuilding the brain');

const lowStaminaContext={...quietContext,stamina:40};
const lowReserve=createWardenTrialBrain({temperament:1,decisionInterval:0});
const highReserve=createWardenTrialBrain({temperament:10,decisionInterval:0});
assert.equal(lowReserve.update(.016,lowStaminaContext).action,'light','the lowest level spends from a small reserve');
assert.equal(highReserve.update(.016,lowStaminaContext).resting,true,'the highest level protects its larger reserve');

const chargedCostContext={...quietContext,stamina:48,attackCosts:{light:10,heavy:20,chargedHeavy:35}};
const chargeGate=createWardenTrialBrain({temperament:10,decisionInterval:0,heavyEvery:1});
assert.notEqual(chargeGate.update(.016,chargedCostContext).action,'heavy-down','a charged heavy must leave the level reserve intact');

console.log('Warden Trial defense temperaments: ok');
