import assert from 'node:assert/strict';
import { blendWardenTrialCenterMovement, createWardenTrialBrain, getWardenTrialCombatBand, nearestWardenTrialTarget, nearestWardenTrialThreat } from '../src/warden-trial-ai.js';
import { WARDEN_TRIAL_SETTINGS } from '../src/warden-trial-settings.js';
import { createWardenTrialCenterField, createWardenTrialStageBoundary } from '../src/warden-trial-stage.js';
import {
  WARDEN_TRIAL_ENEMY_SET_IDS,
  WARDEN_TRIAL_GOBLIN_GROUPS,
  WARDEN_TRIAL_WAVE_SIZE,
  configureWardenTrialEnemySet,
} from '../src/warden-trial-enemies.js';
import { LUGARU_DUELIST_ID } from '../src/lugaru-duelist.js';
import { ORIGINAL_MULTI_GROUP_SPAWN_KIND } from '../src/original-encounter-groups.js';
import { rewardTotemEnabledForRuntime } from '../src/run-draft.js';
import { ARENA_SHELL_HTML } from '../src/arena-shell.js';

assert.equal(WARDEN_TRIAL_SETTINGS.viewScale,3,'the trial camera keeps its angle while moving three times farther away');
assert.ok(WARDEN_TRIAL_SETTINGS.enemyHeight>=4.5,'trial cylinders expose a Warden-height melee target');
const longswordBand=getWardenTrialCombatBand({weapon:{kind:'blade',tune:{length:1}},target:{radius:.9}});
const daggerBand=getWardenTrialCombatBand({weapon:{kind:'blade',tune:{length:.55}},target:{radius:.9}});
const spearBand=getWardenTrialCombatBand({weapon:{kind:'spear',tune:{length:1.42}},target:{radius:.9}});
assert.ok(longswordBand.preferred>5.55,'the Longsword band stays outside the old point-blank attack threshold');
assert.ok(daggerBand.preferred<longswordBand.preferred&&spearBand.preferred>longswordBand.preferred,'weapon length and kind change the preferred combat band');
const stage=createWardenTrialStageBoundary({
  margins:{left:.1,right:.1,top:.1,bottom:.1},
  projectWorldToNdc:point=>({x:point.x/10,y:point.z/10}),
  groundPointFromNdc:point=>({x:point.x*10,z:point.y*10}),
});
assert.equal(stage.contains({x:0,z:0},1),true);
assert.equal(stage.contains({x:8,z:0},1),false,'actor radius must remain inside the visible-stage margin');
const boundedMove=stage.resolveMovement({x:0,z:0},{x:20,z:-20},1);
assert.deepEqual({x:boundedMove.x,z:boundedMove.z},{x:7,z:-7},'movement clamps to the fixed screen footprint instead of the visual hex');
assert.equal(boundedMove.collided,true);

const centerField=createWardenTrialCenterField({stage,softEdge:.6,fullEdge:.9});
const centerSample=centerField.sample({x:0,z:0},1);
assert.ok(centerSample.pressure<.01,'the preferred center should not apply edge pressure');
const edgeSample=centerField.sample({x:8,z:0},1);
assert.ok(edgeSample.pressure>.9,'the outer screen band should apply strong center pressure');
assert.ok(edgeSample.direction.x<-.9&&Math.abs(edgeSample.direction.z)<.1,'edge pressure should point back toward the projected center');
const cornerSample=centerField.sample({x:8,z:8},1);
assert.ok(cornerSample.direction.x<-.5&&cornerSample.direction.z<-.5,'corner pressure should pull diagonally inward');
let centerOffset=0;
const refreshableCenterField=createWardenTrialCenterField({
  stage:createWardenTrialStageBoundary({
    projectWorldToNdc:point=>({x:point.x/10,y:point.z/10}),
    groundPointFromNdc:point=>({x:point.x*10,z:point.y*10+centerOffset}),
  }),
});
const initialCenter=refreshableCenterField.center;
centerOffset=4;
refreshableCenterField.refresh();
assert.equal(refreshableCenterField.center.z,initialCenter.z+4,'the center field can refresh after the render viewport changes');
const gentleCenterMove=blendWardenTrialCenterMovement({x:0,z:0},{direction:{x:-1,z:0},pressure:.5,bias:.8});
assert.ok(gentleCenterMove.x<0&&Math.abs(gentleCenterMove.x)<1,'center correction should be a soft movement contribution');
const strongCenterMove=blendWardenTrialCenterMovement({x:1,z:0},{direction:{x:-1,z:0},pressure:1,bias:1});
assert.ok(strongCenterMove.x<0,'full edge pressure should overcome outward movement');

assert.equal(rewardTotemEnabledForRuntime({config:{variant:'warden-trial'}}),false,'Trial clears must not spawn the run reward totem');
assert.equal(rewardTotemEnabledForRuntime({config:{mode:'arena'}}),true,'ordinary Combat Arena runs keep reward totems');
assert.match(ARENA_SHELL_HTML,/data-trial-enemy-set="cylinders"/,'the pause menu offers the cylinder wave');
assert.match(ARENA_SHELL_HTML,/data-trial-enemy-set="goblins-lugaru"/,'the pause menu offers the goblin and Lugaru wave');
assert.match(ARENA_SHELL_HTML,/data-trial-enemy-set="accordion-2d"/,'the pause menu offers the 2D accordion hybrid wave');

const configured={kind:null,waveSize:0,groups:[]};
const enemySystem={
  originalSystem:{setWorkingRosterEncounterGroups(groups){configured.groups=groups;}},
  setSpawnKind(kind){configured.kind=kind;},
  setWaveSize(value){configured.waveSize=value;},
};
configureWardenTrialEnemySet(enemySystem,WARDEN_TRIAL_ENEMY_SET_IDS.GOBLINS_LUGARU);
assert.equal(configured.kind,ORIGINAL_MULTI_GROUP_SPAWN_KIND);
assert.equal(configured.waveSize,WARDEN_TRIAL_WAVE_SIZE);
assert.deepEqual(configured.groups,WARDEN_TRIAL_GOBLIN_GROUPS);
assert.ok(configured.groups.some(group=>group.spawnKind===LUGARU_DUELIST_ID),'the Trial goblin mix explicitly includes Lugaru');
assert.deepEqual(new Set(configured.groups.map(group=>group.spawnKind)),new Set(['grunt','dagger','mace','rock','captain',LUGARU_DUELIST_ID]));
configureWardenTrialEnemySet(enemySystem,WARDEN_TRIAL_ENEMY_SET_IDS.CYLINDERS);
assert.equal(configured.kind,'trialDot');
configureWardenTrialEnemySet(enemySystem,WARDEN_TRIAL_ENEMY_SET_IDS.ACCORDION_2D);
assert.equal(configured.kind,'accordion2d');

const player={x:0,z:0};
const near={id:'near',x:6.4,z:0,hp:10,state:'idle'};
const far={id:'far',x:9,z:0,hp:10,state:'idle'};
assert.equal(nearestWardenTrialTarget(player,[far,near]).target,near);
assert.equal(nearestWardenTrialTarget(player,[{...near,hp:0}]),null);

const brain=createWardenTrialBrain({decisionInterval:0,heavyEvery:2,emptyWaveDelay:.2,staminaRestDelay:.1});
const trialWeapon={kind:'blade',tune:{length:1}};
let decision=brain.update(.016,{player,enemies:[far],weapon:trialWeapon,stamina:100,attackActive:false});
assert.ok(decision.move.x>.99&&decision.move.z===0,'Warden should close on a distant target');
decision=brain.update(.016,{player,enemies:[near],weapon:trialWeapon,stamina:100,attackActive:false});
assert.equal(decision.action,'light');
decision=brain.update(.016,{player,enemies:[near],weapon:trialWeapon,stamina:100,attackActive:false});
assert.equal(decision.action,'heavy-down','configured cadence should use the shared heavy attack input');
decision=brain.update(.34,{player,enemies:[near],weapon:trialWeapon,stamina:100,attackActive:true});
assert.equal(decision.action,'heavy-up','held heavy attacks must be released');

const danger={...near,state:'windup',stateTime:.7,windup:1,attack:{range:3.5}};
decision=brain.update(.016,{player,enemies:[danger],weapon:trialWeapon,stamina:100,attackActive:false});
assert.equal(decision.action,'dodge','telegraphed close attacks should trigger Rat Step defense');
assert.ok(Math.hypot(decision.dodgeMove.x,decision.dodgeMove.z)>.99,'defense should provide a deliberate dodge direction');

const emergencyBrain=createWardenTrialBrain({decisionInterval:0});
const emergencyDecision=emergencyBrain.update(.016,{player,enemies:[{...danger,stateTime:.82}],weapon:trialWeapon,stamina:100,attackActive:true});
assert.equal(emergencyDecision.action,'dodge','a late telegraph can interrupt an attack for an emergency defense');

const quiet={id:'quiet',x:5.8,z:0,hp:10,state:'idle'};
const imminent={id:'imminent',x:6.4,z:0,hp:10,state:'windup',stateTime:.7,windup:1,attack:{range:3.5}};
assert.equal(nearestWardenTrialThreat(player,[quiet,imminent]).enemy,imminent,'defense should prioritize an imminent telegraph over a merely nearer target');

const tired=createWardenTrialBrain({staminaRestDelay:.05});
decision=tired.update(.06,{player,enemies:[near],stamina:0,attackActive:false});
assert.equal(decision.action,undefined,'the Warden must not refill its stamina autonomously');
assert.equal(decision.resting,true,'the Warden should hold position while exhausted');

const empty=createWardenTrialBrain({emptyWaveDelay:.05});
decision=empty.update(.06,{player,enemies:[],stamina:100,attackActive:false});
assert.equal(decision.spawnWave,true,'a cleared trial should bring in the next dot wave');

console.log('Warden Trial autonomous decision loop: ok');
