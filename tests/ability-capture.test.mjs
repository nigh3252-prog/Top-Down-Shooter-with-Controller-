import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ABILITY_CAPTURE_CARDS,
  ABILITY_CAPTURE_CHECKPOINTS,
  ABILITY_CAPTURE_FIXED_DT,
  captureDummyPlacements,
  captureRuntimeMetric,
  createAbilityCaptureController,
  createCaptureRandom,
  normalizeCaptureAim,
  normalizeCaptureArcanaId,
  normalizeCaptureDummy,
} from '../src/ability-capture.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

assert.equal(ABILITY_CAPTURE_FIXED_DT,1/60);
assert.deepEqual(ABILITY_CAPTURE_CHECKPOINTS,[.25,.5,.75,1,1.25]);
assert.ok(ABILITY_CAPTURE_CARDS.length>=14,'capture catalog should include every implemented Wizard Arcana card');
assert.equal(normalizeCaptureArcanaId('WOL-DRAGON-ARC'),'DRAGON-ARC');
assert.deepEqual(normalizeCaptureAim('right'),{id:'right',x:1,z:0,angle:Math.PI/2});
assert.equal(normalizeCaptureDummy('empty').layout,'none');
assert.equal(normalizeCaptureDummy({layout:'source-line'}).layout,'source-line');
assert.equal(normalizeCaptureDummy({layout:'stationary'}).distance,7,'stationary study dummy should use the close inspection distance');
assert.deepEqual(captureDummyPlacements('source-line',2.1),[
  {id:'capture-dummy',role:'primary',forward:11.5,lateral:0},
  {id:'capture-dummy-negative',role:'corridor-edge-negative',forward:11.5,lateral:-2.1},
  {id:'capture-dummy-positive',role:'corridor-edge-positive',forward:11.5,lateral:2.1},
],'source-line should bracket the measured Dragon Arc corridor around a stable primary dummy');

const randomA=createCaptureRandom(4401),randomB=createCaptureRandom(4401);
assert.deepEqual(Array.from({length:8},randomA),Array.from({length:8},randomB),'capture RNG should repeat from the same seed');

const runtime={state:{effects:[],stock:8,lastCast:null}};
let world={player:{x:0,z:0},dummy:null},renders=0;
const controller=createAbilityCaptureController({
  initial:{arcanaId:'DRAGON-ARC',aim:'right',rngSeed:4401,dummy:{layout:'source-line'}},
  resetWorld(config){world={player:{x:config.player.x,z:config.player.z},dummy:{layout:config.dummy.layout,x:10,z:0}};},
  resetRuntimes(){runtime.state.effects.length=0;runtime.state.stock=8;runtime.state.lastCast=null;},
  castCard(card){runtime.state.lastCast=card.arcanaId;runtime.state.effects.push({type:'dragonProjectile',age:0,position:{x:Math.random(),z:0},direction:{x:1,z:0},hit:new Set()});},
  advanceWorld(dt){for(const effect of runtime.state.effects){effect.age+=dt;effect.position.x+=dt*6;}},
  renderWorld(){renders++;},
  snapshotWorld(){return{...world,playerFootprint:2.1};},
  getRuntimes(){return{wizardRebuiltArcana:runtime};},
  requestFrame:null,cancelFrame:null,
});

const payload={player:{x:0,z:0,aimX:1,aimZ:0},camera:{mode:'capture'},rngSeed:4401,dummy:{layout:'source-line'}};
controller.reset(payload);controller.cast('DRAGON-ARC');const first=controller.step(30);
controller.reset(payload);controller.cast('DRAGON-ARC');const second=controller.step(30);
assert.deepEqual(first,second,'reset + cast + fixed steps should be byte-for-byte deterministic');
assert.equal(first.frame,30);assert.ok(Math.abs(first.time-30/60)<1e-9);assert.equal(first.projectiles.length,1);
assert.equal(first.runtimes[0].resources.stock,8);assert.equal(first.runtimes[0].resources.lastCast,'DRAGON-ARC');
assert.doesNotThrow(()=>JSON.stringify(first),'snapshots must remain JSON serializable');
assert.ok(renders>=64,'reset, cast, and every fixed step should render');

const scheduled=new Map();let nextRaf=0,playFrames=0;
const playController=createAbilityCaptureController({
  initial:{stage:'motion'},resetWorld(){},resetRuntimes(){},castCard(){},
  advanceWorld(){playFrames++;},renderWorld(){},snapshotWorld(){return{};},getRuntimes(){return{};},
  requestFrame(callback){const id=++nextRaf;scheduled.set(id,callback);return id;},
  cancelFrame(id){scheduled.delete(id);},
});
const fireRaf=timestamp=>{const [id,callback]=scheduled.entries().next().value;scheduled.delete(id);callback(timestamp);};
playController.reset({stage:'motion'});assert.equal(playController.snapshot().effects,false,'motion capture must explicitly disable global impact polish');
playController.setPaused(false);fireRaf(0);fireRaf(1000/120);assert.equal(playFrames,0,'120 Hz displays must not advance one simulation frame per display frame');
fireRaf(1000/60);assert.equal(playFrames,1,'elapsed wall time should release one exact 1/60 simulation step');
fireRaf(1000/40);fireRaf(1000/30);assert.equal(playFrames,2,'fixed-step accumulator should preserve the remaining half-frame');
const played=playController.setPaused(true);assert.equal(played.frame,2);assert.equal(scheduled.size,0,'pausing should cancel the capture rAF loop');
playController.reset({stage:'reference'});assert.equal(playController.snapshot().effects,true,'post-motion capture stages should enable impact polish by default');
playController.reset({stage:'style',effects:false});assert.equal(playController.snapshot().effects,false,'explicit effects override should win for any stage');

const explicit=captureRuntimeMetric({state:{effects:[]},snapshot:()=>({points:[{x:1,z:2}],unsafe:new Set([1]),effects:[{type:'dragonProjectile',body:[{index:0,x:3,z:4,tangent:{x:.8,z:.6}}]}]})},'runtime');
assert.deepEqual(explicit.snapshot.unsafe,{size:1});
assert.deepEqual(explicit.snapshot.effects[0].body[0],{index:0,x:3,z:4,tangent:{x:.8,z:.6}},'semantic body samples must survive capture serialization for downstream motion review');

const enemyLab=fs.readFileSync(path.join(root,'enemy-lab.html'),'utf8');
const arena=fs.readFileSync(path.join(root,'combat-arena.html'),'utf8');
assert.match(enemyLab,/inner\.set\('capture','1'\)/,'Enemy Lab should propagate capture mode into its iframe');
assert.match(enemyLab,/dataset\.testid='arcana-capture-select'/);
assert.match(enemyLab,/window\.__abilityCapture/,'Enemy Lab should forward the capture hook');
assert.match(enemyLab,/restoredCategory==='capture'\?'test':restoredCategory/,'normal Enemy Lab must not restore the capture-only category');
assert.match(enemyLab,/arcana-capture-status/,'manual PLAY should expose a live status readout');
assert.match(arena,/if\(ABILITY_CAPTURE_MODE\)/);
assert.match(arena,/window\.__abilityCapture=createAbilityCaptureController/);
assert.doesNotMatch(arena,/if\(ABILITY_CAPTURE_MODE\)HitFeel\.tuning\.master=0/,'capture mode must not disable polish for every stage');
assert.match(arena,/config\?\.effects===false\|\|config\?\.stage==='motion'\?0:CAPTURE_HIT_FEEL_MASTER/);
assert.match(arena,/else frame\(\)/,'the normal autonomous arena loop should remain enabled outside capture mode');

console.log('ability capture tests passed');
