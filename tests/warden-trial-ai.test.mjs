import assert from 'node:assert/strict';
import { createWardenTrialBrain, nearestWardenTrialTarget } from '../src/warden-trial-ai.js';
import { WARDEN_TRIAL_SETTINGS } from '../src/warden-trial-settings.js';

assert.equal(WARDEN_TRIAL_SETTINGS.viewScale,3,'the trial camera keeps its angle while moving three times farther away');
assert.ok(WARDEN_TRIAL_SETTINGS.hexSize>=WARDEN_TRIAL_SETTINGS.spawnRadiusMax*6,'the trial hex stays far outside the combat spawn ring');
assert.ok(WARDEN_TRIAL_SETTINGS.enemyHeight>=4.5,'trial cylinders expose a Warden-height melee target');

const player={x:0,z:0};
const near={id:'near',x:3,z:0,hp:10,state:'idle'};
const far={id:'far',x:9,z:0,hp:10,state:'idle'};
assert.equal(nearestWardenTrialTarget(player,[far,near]).target,near);
assert.equal(nearestWardenTrialTarget(player,[{...near,hp:0}]),null);

const brain=createWardenTrialBrain({decisionInterval:0,heavyEvery:2,emptyWaveDelay:.2,staminaRestDelay:.1});
let decision=brain.update(.016,{player,enemies:[far],stamina:100,attackActive:false});
assert.ok(decision.move.x>.99&&decision.move.z===0,'Warden should close on a distant target');
decision=brain.update(.016,{player,enemies:[near],stamina:100,attackActive:false});
assert.equal(decision.action,'light');
decision=brain.update(.016,{player,enemies:[near],stamina:100,attackActive:false});
assert.equal(decision.action,'heavy-down','configured cadence should use the shared heavy attack input');
decision=brain.update(.34,{player,enemies:[near],stamina:100,attackActive:true});
assert.equal(decision.action,'heavy-up','held heavy attacks must be released');

const danger={...near,state:'windup',stateTime:.7,windup:1};
decision=brain.update(.016,{player,enemies:[danger],stamina:100,attackActive:false});
assert.equal(decision.action,'dodge','telegraphed close attacks should trigger Rat Step defense');

const tired=createWardenTrialBrain({staminaRestDelay:.05});
decision=tired.update(.06,{player,enemies:[near],stamina:0,attackActive:false});
assert.equal(decision.action,'refill','the spectator loop should recover after the Warden exhausts its fixed stance');

const empty=createWardenTrialBrain({emptyWaveDelay:.05});
decision=empty.update(.06,{player,enemies:[],stamina:100,attackActive:false});
assert.equal(decision.spawnWave,true,'a cleared trial should bring in the next dot wave');

console.log('Warden Trial autonomous decision loop: ok');
