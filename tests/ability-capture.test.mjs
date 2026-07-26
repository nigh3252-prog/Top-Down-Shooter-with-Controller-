import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ABILITY_CAPTURE_CARDS,
  ABILITY_CAPTURE_CHECKPOINTS,
  ABILITY_CAPTURE_FIXED_DT,
  captureDummyPlacements,
  captureTargetPlacements,
  captureRuntimeMetric,
  createAbilityCaptureController,
  createCaptureRandom,
  normalizeCaptureAim,
  normalizeCaptureArcanaId,
  normalizeCaptureDummy,
  normalizeCaptureFixtures,
  normalizeCaptureMove,
} from '../src/ability-capture.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

assert.equal(ABILITY_CAPTURE_FIXED_DT,1/60);
assert.deepEqual(ABILITY_CAPTURE_CHECKPOINTS,[.25,.5,.75,1,1.25]);
assert.ok(ABILITY_CAPTURE_CARDS.length>=14,'capture catalog should include every implemented Wizard Arcana card');
assert.equal(normalizeCaptureArcanaId('WOL-DRAGON-ARC'),'DRAGON-ARC');
assert.deepEqual(normalizeCaptureAim('right'),{id:'right',x:1,z:0,angle:Math.PI/2});
assert.deepEqual(normalizeCaptureMove({x:3,z:4}),{x:.6,z:.8,magnitude:1});
assert.equal(normalizeCaptureDummy('empty').layout,'none');
assert.equal(normalizeCaptureDummy({layout:'source-line'}).layout,'source-line');
assert.equal(normalizeCaptureDummy({layout:'stationary'}).distance,7,'stationary study dummy should use the close inspection distance');
assert.deepEqual(captureDummyPlacements('source-line',2.1),[
  {id:'capture-dummy',role:'primary',forward:11.5,lateral:0},
  {id:'capture-dummy-negative',role:'corridor-edge-negative',forward:11.5,lateral:-2.1},
  {id:'capture-dummy-positive',role:'corridor-edge-positive',forward:11.5,lateral:2.1},
],'source-line should bracket the measured Dragon Arc corridor around a stable primary dummy');
const fixtures=normalizeCaptureFixtures({
  targets:[{id:'late',forward:5,lateral:-1,spawnFrame:60,hp:250}],
  hostileProjectiles:[{id:'hostile',spawnFrame:12}],
  walls:[{id:'wall',a:{forward:2,lateral:-1},b:{forward:2,lateral:1}}],
  resources:[{runtimeId:'wizardRebuiltArcana',key:'waterAmmo',value:2},{runtimeId:'',key:'bad',value:1}],
  deck:{primaryArcanaId:'VOLT-DISC',oppositeArcanaId:'BOLT-RAIL'},
});
assert.deepEqual({spawn:fixtures.targets[0].spawnFrame,hp:fixtures.targets[0].hp,hostileSpawn:fixtures.hostileProjectiles[0].spawnFrame,resources:fixtures.resources.length,primary:fixtures.deck.primaryArcanaId},{spawn:60,hp:250,hostileSpawn:12,resources:1,primary:'VOLT-DISC'});
assert.equal(captureTargetPlacements(fixtures,'none')[0].id,'late');

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

const inputActions=[];let inputCasts=0,inputAim=null,inputMove=null;
const inputController=createAbilityCaptureController({
  initial:{arcanaId:'VOLT-DISC'},resetWorld(){},resetRuntimes(){},castCard(card,config){inputCasts++;inputActions.push(config.input);},setAimWorld(aim){inputAim=aim.id;},setMoveWorld(move){inputMove=move;},performWorldAction(action){inputActions.push(action.op);return action.op==='release';},renderWorld(){},snapshotWorld(){return{};},getRuntimes(){return{};},requestFrame:null,cancelFrame:null,
});
inputController.reset();assert.equal(inputController.act({op:'press',arcanaId:'VOLT-DISC'}).ok,true);assert.equal(inputController.act({op:'hold',arcanaId:'BOLT-RAIL'}).ok,true);assert.equal(inputController.act({op:'release',arcanaId:'BOLT-RAIL'}).ok,true);inputController.act({op:'setAim',aim:'down'});inputController.act({op:'setMove',move:{x:0,z:-1,magnitude:.5}});
assert.deepEqual({casts:inputCasts,actions:inputActions,aim:inputAim,move:inputMove},{casts:2,actions:['press','hold','release'],aim:'down',move:{x:0,z:-.5,magnitude:.5}},'capture input must support deterministic aim, movement, and release actions');

const explicit=captureRuntimeMetric({state:{effects:[]},snapshot:()=>({points:[{x:1,z:2}],unsafe:new Set([1]),effects:[{type:'dragonProjectile',body:[{index:0,x:3,z:4,tangent:{x:.8,z:.6}}]}]})},'runtime');
assert.deepEqual(explicit.snapshot.unsafe,{size:1});
assert.deepEqual(explicit.snapshot.effects[0].body[0],{index:0,x:3,z:4,tangent:{x:.8,z:.6}},'semantic body samples must survive capture serialization for downstream motion review');

const enemyLab=fs.readFileSync(path.join(root,'enemy-lab.html'),'utf8');
const arena=fs.readFileSync(path.join(root,'combat-arena.html'),'utf8');
const arenaEnemies=fs.readFileSync(path.join(root,'src/arena-enemies-base.js'),'utf8');
const playerCombat=fs.readFileSync(path.join(root,'src/player-combat.js'),'utf8');
assert.match(enemyLab,/inner\.set\('capture','1'\)/,'Enemy Lab should propagate capture mode into its iframe');
assert.match(enemyLab,/dataset\.testid='arcana-capture-select'/);
assert.match(enemyLab,/window\.__abilityCapture/,'Enemy Lab should forward the capture hook');
assert.match(enemyLab,/act:action=>/,'Enemy Lab should forward the generic deterministic action interface');
assert.match(enemyLab,/restoredCategory==='capture'\?'test':restoredCategory/,'normal Enemy Lab must not restore the capture-only category');
assert.match(enemyLab,/arcana-capture-status/,'manual PLAY should expose a live status readout');
assert.match(arena,/if\(ABILITY_CAPTURE_MODE\)/);
assert.match(arena,/window\.__abilityCapture=createAbilityCaptureController/);
assert.match(arena,/if\(op==='release'\)\{arena\.charge\.buttonHeld=false;return true;\}/,'base-form release must be a supported deterministic input no-op');
assert.match(arena,/PC\.resetArcanaRuntimeState\?\.\(\{preserveResources:true\}\)/,'room transitions must cancel live Arcana state while preserving cooldown and charge progress');
assert.match(arena,/PC\.resetArcanaRuntimeState\?\.\(\{preserveResources:false\}\)/,'respawn must fully reset live Arcana state and resource banks');
const dashAttackGateIndex=arena.indexOf("if(queuedCard?.dashMotion&&combatState.attack)"),deckPlayIndex=arena.indexOf('const card = deck.play(slot)',dashAttackGateIndex);
assert.ok(dashAttackGateIndex>=0&&deckPlayIndex>dashAttackGateIndex,'dash cards must reject an active melee attack before deck/card consumption');
const roomResetIndex=arena.indexOf('PC.resetArcanaRuntimeState?.({preserveResources:true})'),roomClearIndex=arena.indexOf('enemySystem.clearRoomRuntime()',roomResetIndex);
assert.ok(roomResetIndex>=0&&roomClearIndex>roomResetIndex,'room transition must cancel Arcana state before clearing/moving the old room');
const respawnIndex=arena.indexOf('function respawn()'),respawnResetIndex=arena.indexOf('PC.resetArcanaRuntimeState?.({preserveResources:false})',respawnIndex),respawnMoveIndex=arena.indexOf('actorPos.set(startPoint.x, startPoint.z)',respawnIndex);
assert.ok(respawnResetIndex>respawnIndex&&respawnMoveIndex>respawnResetIndex,'respawn must cancel Arcana state before relocating the player');
assert.match(playerCombat,/const preserved=preserveResources[\s\S]*wizardNextTwentyDashRuntime\.state\?\.resources/,'the centralized reset must snapshot authored resource progress when requested');
assert.match(playerCombat,/basicDashRuntime\.reset\?\.\(\);[\s\S]*wizardNextTwentyBasicsRuntime\.reset\?\.\(\);[\s\S]*wizardNextTwentyDashRuntime\.reset\?\.\(\);/,'the centralized reset must cancel shared motion and both next-twenty runtimes');
assert.match(playerCombat,/wizardNextTwentyDashRuntime\.state\.resources=Object\.fromEntries/,'room-transition reset must restore the preserved resource bank after live cleanup');
assert.match(arena,/function arcanaDashBusy\(\)\{return !!\(PC\.basicDashRuntime\?\.busy\|\|PC\.wizardNextTwentyDashRuntime\?\.busy\);\}/,'continuous and teleport Arcana dashes must share one combat-input gate');
assert.match(arena,/function canUseCombatInput\(\)\{[^}]*!arcanaDashBusy\(\)[^}]*!arena\.arcanaMovementLocked/,'combat attacks must reject during shared dash recovery and authored movement commitments');
assert.match(arena,/d\.cool > 0 \|\| arcanaDashBusy\(\) \|\| arena\.arcanaMovementLocked\) return;/,'rejected ordinary dodges must exit before attack cancellation, cooldown, or iframe mutations');
assert.match(arena,/if\(arena\.arcanaFacingLock\) return \{ angle:arena\.arcanaFacingLock\.angle, source:'arcana-lock' \}/,'Rip Tide must hold its activation-facing in the arena');
assert.match(arena,/if\(arena\.arcanaFacingLock\)return false;/,'capture aim changes must not rotate a facing-locked Rip Tide cast');
assert.match(arena,/return\{ok:false,start,end:\{\.\.\.start\},reason:'outside-maze'\}/,'invalid Arcana teleports must return an explicit failure result');
assert.match(arena,/function validateArcanaTeleportEndpoint\(desired=\{\}\)\{/,'Chaotic Rift must have a non-mutating arena endpoint preflight');
assert.match(arena,/resolved\.collided\|\|Math\.hypot\(resolved\.x-requested\.x,resolved\.z-requested\.z\)>\.005/,'teleport preflight must reject a collision-adjusted endpoint');
assert.match(playerCombat,/validateTeleportEndpoint:\(endpoint\)=>window\.__arena\?\.validateArcanaTeleportEndpoint\?\.\(endpoint\)/,'the dash runtime must receive the arena preflight callback');
assert.match(arena,/knockX:Number\(enemy\.knockX\)/,'capture telemetry must expose target knock for Tornado contract validation');
assert.match(arena,/targetable:!arena\.arcanaUntargetable/,'Chaotic Rift must remain untargetable to enemy selection during transit');
assert.match(arena,/invulnerable: arena\.invulnT > 0 \|\| arena\.dodge\.t >= 0 \|\| arena\.deadT >= 0/,'damage immunity must remain limited to ordinary iframe, dodge, and death states');
assert.doesNotMatch(arena,/invulnerable: capture \|\| arena\.arcanaUntargetable/,'capture fixtures and untargetability must not silently become damage immunity');
assert.match(arenaEnemies,/p\.targetable!==false&&Math\.hypot\(pr\.x - p\.x, pr\.z - p\.z\)/,'hostile projectiles must respect Chaotic Rift targetability without blocking direct status or capture damage');
assert.doesNotMatch(arena,/if\(ABILITY_CAPTURE_MODE\)HitFeel\.tuning\.master=0/,'capture mode must not disable polish for every stage');
assert.match(arena,/config\?\.effects===false\|\|config\?\.stage==='motion'\?0:CAPTURE_HIT_FEEL_MASTER/);
assert.match(arena,/else frame\(\)/,'the normal autonomous arena loop should remain enabled outside capture mode');

console.log('ability capture tests passed');
