import * as THREE from 'three';
import { installStoneWanderer } from './stone-wanderer.js';
import { installPlayerCombat } from './player-combat.js';
import { STONE_WEAPON_ORDER, cloneWeaponDefinitions, installRedTollGreatsword, normalizeStoneWeaponId } from './weapons.js';
import { gameContent } from './game-content.js';
import { guardPoseFor } from './guard-poses.js';
import { lightFollowupForStage, HEAVY_LIGHT_STAGE } from './combat-links.js';
import { COMBAT_INPUT_MODES, DEFAULT_COMBAT_INPUT_MODE, bufferExpiresAt, getCombatInputMode, lightFollowupForActiveMove, shouldExpireBufferedInput } from './combat-input-modes.js';
import { createStanceDeck, moveArrow } from './stance-deck.js';
import { getWeaponDamageMultiplier } from './combat-balance.js';
import { staminaCostForWeapon, weaponAllowsCleave } from './weapon-balance.js';
import { createArenaEnemySystem } from './arena-enemies.js';
import { DIRECTOR_MODES } from './combat-director.js';
import { ARENA_ENEMY_OPTIONS } from './arena-enemy-catalog.js';
import { ALL_ENEMIES_BUDGET_ID, WORKING_ROSTER_HADES_ID } from './encounter-pools.js';
import { installCombatAudioDirector } from './combat-audio.js';
import { installHitFeel } from './hit-feel.js';
import { StoneSettings } from './settings.js';
import { FEEL_PARAMS, FEEL_KEY_ORDER, createFeelKeys, feelAt, tierName, holdToTier } from './feel.js';
import { createHexMaze, createSeededRandom } from './hex-maze.js';
import { createMazeWorld } from './hex-maze-renderer.js';
import { axialToWorld, findCellAtPoint, findPath, randomPointInRoom, raycastWalls, resolveCircleMovement } from './hex-maze-navigation.js';
import { createRoomEncounterState } from './room-encounters.js';
import { createRoomTransitionController } from './room-transition.js';
import { captureCardById, captureTargetPlacements, createAbilityCaptureController, normalizeCaptureAim, normalizeCaptureDummy, normalizeCaptureFixtures } from './ability-capture.js';
import { getArenaMazeSettings, getMazeRuntimeSettings, MAZE_CELL_SIZE_OPTIONS, MAZE_ROOM_SIZE_OPTIONS, setArenaMazeCellSize, setMazeRuntimeCellSize, setMazeRuntimeRoomSize } from './maze-runtime-settings.js';
import { installStanceGate2Runtime } from './stance-gate2-runtime.js';
import { installStanceGate3Runtime } from './stance-gate3-payoffs.js';
import { createStanceGate4Runtime } from './stance-gate4-exhaustion.js';
import { installStanceGate4RingSize } from './stance-gate4-ring-size.js';
import { createStanceGate5Runtime } from './stance-gate5-defense.js';
import { readPlayStationBackboneInput, resolvePlayStationBackboneActions } from './playstation-backbone-input.js';
import { resolveArenaTheme } from './arena-theme-registry.js';
import * as arenaThemeRegistry from './arena-theme-registry.js';
import { readArenaStandardSetup } from './arena-standard-setup.js';
import { createArenaStartupTrace } from './arena-startup-trace.js';
import { blendWardenTrialCenterMovement, createWardenTrialBrain } from './warden-trial-ai.js';
import { WARDEN_TRIAL_SETTINGS } from './warden-trial-settings.js';
import { createWardenTrialCenterField, createWardenTrialStageBoundary } from './warden-trial-stage.js';
import { installWardenTrialSwipeSurface } from './warden-trial-card-ui.js';
import { isWardenTrialStaminaCard, resolveWardenTrialCardPlay, starterCardsForWardenTrialWeapon } from './warden-trial-card-policy.js';
import { createAccordionEnemyOverlay } from './accordion-enemy-overlay.js';
import {
  WARDEN_TRIAL_ENEMY_SET_IDS,
  configureWardenTrialEnemySet,
  normalizeWardenTrialEnemySet,
} from './warden-trial-enemies.js';

import { createArenaControlRegistry } from './arena-control-registry.js';
import { clearArenaRuntime, provideArenaCaptureController, provideArenaCaptureOptions, provideArenaRuntime, provideArenaRuntimeConfig } from './arena-runtime-context.js';

export function createArenaRuntime({ config = {}, controlRegistry = createArenaControlRegistry(), sectionRegistry = null } = {}) {
  const arenaTheme=resolveArenaTheme({search:globalThis.location?.search||'',savedTheme:config.theme});
  const runtimeConfig = Object.freeze({ mode:'arena', ...config, theme:arenaTheme.id });
  const wardenTrialMode=runtimeConfig.wardenTrial===true||runtimeConfig.variant==='warden-trial';
  let wardenTrialEnemySet=normalizeWardenTrialEnemySet(StoneSettings.get('wardenTrial.enemySet',WARDEN_TRIAL_ENEMY_SET_IDS.CYLINDERS));
  const lockedStandard=runtimeConfig.enemyLab||wardenTrialMode?null:readArenaStandardSetup();
  const startupTrace=createArenaStartupTrace({location:globalThis.location});
  const summarizeStandard=standard=>{
    if(!standard)return{locked:false};
    return{
      locked:true,
      id:String(standard.id||''),
      version:Number(standard.standardVersion)||0,
      name:String(standard.name||''),
      sourceProfileId:String(standard.sourceProfileId||standard.profile?.extensions?.sourceProfileId||''),
      lockedAt:Number(standard.lockedAt)||0,
    };
  };
  const summarizeProfile=profile=>{
    if(!profile)return null;
    const settings=profile.workspace?.settings||{};
    const content=profile.workspace?.content||{};
    const rosterIds=Array.isArray(content.rosterIds)?content.rosterIds:Array.isArray(content.enemyIds)?content.enemyIds:[];
    return{
      id:String(profile.id||''),
      name:String(profile.name||''),
      sourceProfileId:String(profile.extensions?.sourceProfileId||''),
      encounterMode:String(profile.encounterMode||profile.workspace?.scenario?.encounterMode||settings['scenario.encounterId']||''),
      directorMode:String(profile.directorMode||settings['combat.directorMode']||''),
      pressureBudget:Number(profile.pressureBudget??settings['combat.pressure'])||0,
      rosterCount:rosterIds.length,
      rosterIds:[...rosterIds],
    };
  };
  startupTrace.mark('runtime-created',{
    standard:summarizeStandard(lockedStandard),
    profile:summarizeProfile(lockedStandard?.profile),
  });
  const ARENA_VISUAL_STYLE_OPTIONS=Object.freeze([
    {id:'neutral',label:'NEUTRAL'},
    {id:'original',label:'ORIGINAL'},
    {id:'akai',label:'AKAI'},
  ]);
  document.documentElement.dataset.arenaMode = runtimeConfig.mode;
  if(runtimeConfig.variant)document.documentElement.dataset.arenaVariant=runtimeConfig.variant;
  document.documentElement.dataset.arenaTheme = arenaTheme.id;
  provideArenaRuntimeConfig(runtimeConfig);
  const runtimeListeners=new Set();
  const emitRuntime=event=>{for(const listener of [...runtimeListeners])listener(event);};
const STANCE_CARDS = gameContent.cards.list({family:'stance'});

/* ============================================================
   COMBAT ARENA
   Director Punch's arena loop (waves, encounter director, feel
   tiers, dodge, mobile controls) driven by the Stone Wanderer
   with the full weapon + stance-card combat system.
   ============================================================ */

window.addEventListener('error', e=>{
  const el = document.getElementById('err');
  el.style.display='block'; el.textContent = (e.message||'error')+'\n'+(e.filename||'')+':'+(e.lineno||'');
});

/* ---------- helpers ---------- */
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
function wrapPi(a){ return Math.atan2(Math.sin(a), Math.cos(a)); }
function lerpAngle(a,b,t){ return wrapPi(a + wrapPi(b-a)*clamp(t,0,1)); }
function norm2(x,z){ const l=Math.hypot(x,z)||1; return {x:x/l, z:z/l}; }
function rand(a,b){ return a + Math.random()*(b-a); }

/* ---------- arena-scale constants (weapon-lab world units, ~×4 meters) ---- */
const ARENA = 18;               // playfield radius
const HEX_SIZE = 20;
const PLAYER_RADIUS = 1.05;
const MAZE_SEED = runtimeConfig.seed || new URLSearchParams(location.search).get('seed') || 'arena-001';
const PLAYER_SPEED = 8.5;
const CHARGE_MOVE_MULT = .35;
const DODGE_SPEED = 18, DODGE_TIME = .26, DODGE_IFRAMES = .30, DODGE_COOL = .55;
const AUTO_FACE_RANGE = 14;
/* stamina economy: swings drain it, playing a stance card is the only refill */
const STAMINA = { max:100, start:100, recoverTime:.85, recoverDelay:.08, chargeCostMult:1.75,
                  costs:{ horizontal:18, vertical:14, stab:10, default:14 }, shuffleTime:2, exhaustFlash:.35 };
const CHAIN = { comboWindow:.45, finisherWindow:.80, whiffLock:.20, postSecondLightLock:.35 };
const LUNGE_RATE = 2.8;         // root-motion units/sec × feel lunge during the strike
const CAMERA_LOOK_HEIGHT = 1.8;
const CAMERA_LOOK_BACK_OFFSET = -1.4;
const CAM_HEIGHT = wardenTrialMode
  ? CAMERA_LOOK_HEIGHT + (28 - CAMERA_LOOK_HEIGHT) * WARDEN_TRIAL_SETTINGS.viewScale
  : 20;
const CAM_BACK = wardenTrialMode
  ? CAMERA_LOOK_BACK_OFFSET + (24.5 - CAMERA_LOOK_BACK_OFFSET) * WARDEN_TRIAL_SETTINGS.viewScale
  : 17.6;
const CAPTURE_PARAMS = new URLSearchParams(location.search);
const ABILITY_CAPTURE_MODE = CAPTURE_PARAMS.get('capture') === '1';
const ABILITY_CAPTURE_CLEAN = ABILITY_CAPTURE_MODE && CAPTURE_PARAMS.get('clean') === '1';
document.body.classList.toggle('abilityCaptureClean',ABILITY_CAPTURE_CLEAN);

/* ---------- scene ---------- */
const trialCardTray=document.getElementById('trialCardTray');
const readArenaViewport=()=>{
  const trayHeight=wardenTrialMode
    ? Math.max(0,Number(trialCardTray?.getBoundingClientRect?.().height)||0)
    : 0;
  return{
    width:Math.max(1,Number(innerWidth)||1),
    height:Math.max(1,(Number(innerHeight)||1)-trayHeight),
  };
};
let arenaViewport=readArenaViewport();
const renderer = new THREE.WebGLRenderer({ antialias:true });
// Cap device pixel ratio at 1.5: on high-DPI phones (DPR 2-3) this is the single
// biggest GPU win (render resolution scales with the square of this) and is barely
// perceptible with antialiasing on.
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.setSize(arenaViewport.width,arenaViewport.height);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(arenaTheme.worldStyle.palette.background);
const fogDistanceScale=wardenTrialMode?WARDEN_TRIAL_SETTINGS.viewScale:1;
scene.fog = new THREE.Fog(
  arenaTheme.worldStyle.palette.fog,
  arenaTheme.worldStyle.fogNear*fogDistanceScale,
  arenaTheme.worldStyle.fogFar*fogDistanceScale,
);
const camera = new THREE.PerspectiveCamera(wardenTrialMode?44:40, arenaViewport.width/arenaViewport.height, .5, wardenTrialMode?660:220);

scene.add(new THREE.AmbientLight(0xd8ecff, .5));
const hemi = new THREE.HemisphereLight(0x9fd8d0, 0x1a2325, 1.9); scene.add(hemi);
const key = new THREE.DirectionalLight(0xffe0b8, 2.6);
key.position.set(-14, 26, 12);
key.castShadow = true;
// The player-tracking shadow map is re-rendered every frame, so its size is a
// major GPU cost. Halve it to 1024 and tighten the ortho frustum from 60 to 44
// units (it follows the player, so the smaller box still covers the visible play
// area) — the tighter frustum keeps texel density high so soft shadows stay close
// to the original look at a quarter of the shadow-map memory/fill.
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -22; key.shadow.camera.right = 22;
key.shadow.camera.top = 22; key.shadow.camera.bottom = -22;
key.shadow.bias = -0.00025;
const keyTarget = new THREE.Object3D(); scene.add(keyTarget);
key.target = keyTarget; scene.add(key);
const rim = new THREE.PointLight(0x68bfff, 30, 120, 1.2); rim.position.set(16, 9, -14); scene.add(rim);

const worldRoot = new THREE.Group(); scene.add(worldRoot);

const dungeon = createHexMaze({ seed:MAZE_SEED, layout:runtimeConfig.layout, radius:5, minRoomSize:4, maxRoomSize:7, minLoopLength:6 });
if(!dungeon.validation.valid) throw new Error(`Invalid maze ${MAZE_SEED}: ${dungeon.validation.errors.join(' | ')}`);
let activeRoomId = dungeon.startRoomId;
let mazeWorld = createMazeWorld({ THREE, maze:dungeon, roomId:activeRoomId, hexSize:HEX_SIZE, wallHeight:3.2, wallThickness:.34, doorWidth:7, theme:arenaTheme });
worldRoot.add(mazeWorld.group);
const startPoint = axialToWorld(0, 0, HEX_SIZE);
if(wardenTrialMode){
  camera.position.set(startPoint.x,CAM_HEIGHT,startPoint.z+CAM_BACK);
  camera.lookAt(startPoint.x,CAMERA_LOOK_HEIGHT,startPoint.z+CAMERA_LOOK_BACK_OFFSET);
  camera.updateMatrixWorld();
}
const wardenTrialStageCamera=wardenTrialMode?camera.clone():null;
const stageProjected=wardenTrialMode?new THREE.Vector3():null;
const stageRayPoint=wardenTrialMode?new THREE.Vector3():null;
const stageRayDirection=wardenTrialMode?new THREE.Vector3():null;
const wardenTrialStage=wardenTrialMode?createWardenTrialStageBoundary({
  margins:WARDEN_TRIAL_SETTINGS.screenMargins,
  projectWorldToNdc(point){
    stageProjected.set(Number(point?.x)||0,0,Number(point?.z)||0).project(wardenTrialStageCamera);
    return{x:stageProjected.x,y:stageProjected.y};
  },
  groundPointFromNdc(point){
    stageRayPoint.set(Number(point?.x)||0,Number(point?.y)||0,.5).unproject(wardenTrialStageCamera);
    stageRayDirection.copy(stageRayPoint).sub(wardenTrialStageCamera.position);
    if(Math.abs(stageRayDirection.y)<1e-7)return null;
    const distance=-wardenTrialStageCamera.position.y/stageRayDirection.y;
    if(distance<0)return null;
    return{
      x:wardenTrialStageCamera.position.x+stageRayDirection.x*distance,
      z:wardenTrialStageCamera.position.z+stageRayDirection.z*distance,
    };
  },
}):null;
const wardenTrialCenterField=wardenTrialMode?createWardenTrialCenterField({
  stage:wardenTrialStage,
  softEdge:WARDEN_TRIAL_SETTINGS.centerField.softEdge,
  fullEdge:WARDEN_TRIAL_SETTINGS.centerField.fullEdge,
}):null;
const accordionOverlayProjection=wardenTrialMode?new THREE.Vector3():null;
const accordionEnemyOverlay=wardenTrialMode?createAccordionEnemyOverlay({
  canvas:document.createElement('canvas'),
  projectWorldToScreen(point){
    accordionOverlayProjection.set(Number(point?.x)||0,Number(point?.y)||0,Number(point?.z)||0).project(camera);
    return{
      x:(accordionOverlayProjection.x*.5+.5)*arenaViewport.width,
      y:(-accordionOverlayProjection.y*.5+.5)*arenaViewport.height,
      depth:accordionOverlayProjection.z,
    };
  },
  getViewport:()=>({width:arenaViewport.width,height:arenaViewport.height,dpr:devicePixelRatio||1}),
}):null;
if(accordionEnemyOverlay)document.body.appendChild(accordionEnemyOverlay.canvas);

function syncAccordionEnemyOverlayCanvas(){
  const canvas=accordionEnemyOverlay?.canvas;
  if(!canvas)return;
  Object.assign(canvas.style,{
    inset:'auto',left:'0px',top:'0px',right:'auto',bottom:'auto',
    width:`${arenaViewport.width}px`,height:`${arenaViewport.height}px`,
  });
}
function syncArenaViewport(){
  arenaViewport=readArenaViewport();
  camera.aspect=arenaViewport.width/arenaViewport.height;
  camera.updateProjectionMatrix();
  if(wardenTrialStageCamera){
    wardenTrialStageCamera.aspect=arenaViewport.width/arenaViewport.height;
    wardenTrialStageCamera.updateProjectionMatrix();
    wardenTrialStageCamera.updateMatrixWorld();
  }
  wardenTrialCenterField?.refresh?.();
  renderer.setSize(arenaViewport.width,arenaViewport.height);
  syncAccordionEnemyOverlayCanvas();
  accordionEnemyOverlay?.resize();
}
syncArenaViewport();

/* ---------- weapons / stances / audio ---------- */
const WEAPON_ORDER = STONE_WEAPON_ORDER;
const WEAPONS = cloneWeaponDefinitions();
const CombatAudio = installCombatAudioDirector({ controls:{} , settings:StoneSettings });

/* ---------- hit feel (hitstop, camera punch, gore, impact SFX) ---------- */
// Hidden tuning panel: backtick key or ?tune=1. Master knob at 0 ≈ the old game.
const HitFeel = installHitFeel({ THREE, scene, camera, settings:StoneSettings, audio:CombatAudio });
const CAPTURE_HIT_FEEL_MASTER=HitFeel.tuning.master;

/* ---------- stone wanderer + player combat ---------- */
const StoneWanderer = installStoneWanderer({ THREE });
const actorRoot = new THREE.Group(); worldRoot.add(actorRoot);
const actorVisual = new THREE.Group(); actorRoot.add(actorVisual);
let activeModel = null;
const actorPos = new THREE.Vector2(startPoint.x, startPoint.z);   // x = world X, y = world Z
let actorFacing = 0;
let actorYawCurrent = 0;
let walkPhase = 0;
const yawQ = new THREE.Quaternion();
const Y_AXIS = new THREE.Vector3(0,1,0);

const FEEL = createFeelKeys();
const defaultFeel = () => feelAt(FEEL, 1/3);
const arena = {
  charge: { active:false, queued:false, buttonHeld:false, hold:0, tier:1/3, s:defaultFeel(), forceTier:null },
  swing:  { s:defaultFeel(), dmgMult:1, knockMult:1, stun:.2, lunge:1, staminaSpent:0, maxChargeCleave:false },
  chain:  { stage:'idle', comboDeadline:0, finisherDeadline:0, inputLockT:0, lightLockT:0, activeSlot:-1, pendingSlot:-1, pendingStage:null, pendingExpiresAt:0, pendingInput:null },
  dodge:  { t:-1, dirX:0, dirZ:1, cool:0 },
  stanceIndex:0, stance:null,
  invulnT:0, deadT:-1, prevHp:100, prevWave:1,
  arcanaMovementLocked:false, arcanaFacingLock:null, arcanaUntargetable:false, arcanaPlayerHidden:false,
  arcanaInvulnerable:false, arcanaAirborne:false, arcanaPlayerHeight:0,
  paused:false, started:false, cycleMode:false,
  combatInputMode:getCombatInputMode(StoneSettings.get('arena.combatInputMode', DEFAULT_COMBAT_INPUT_MODE)).id,
  stamina:{ v:wardenTrialMode ? 0 : STAMINA.start, pending:0, recoverDelayT:0 },
};
const wardenTrialBrain=wardenTrialMode?createWardenTrialBrain():null;
const deck = createStanceDeck({ shuffleTime: STAMINA.shuffleTime, compatibilityAdapter: null });
function staminaCostForGroup(group){
  const base = STAMINA.costs[group] ?? STAMINA.costs.default;
  return staminaCostForWeapon(base, PC.currentWeapon());
}
function hasStamina(cost){ return arena.stamina.v >= cost - 1e-6; }
function spendStamina(cost){
  const spent = Math.min(arena.stamina.v, Math.max(0, cost));
  arena.stamina.v = Math.max(0, arena.stamina.v - spent);
  return spent;
}
function queueRecoverableRefund(amount){
  if(wardenTrialMode)return 0;
  const s = arena.stamina, refund = Math.max(0, amount);
  s.pending = Math.min(STAMINA.max - s.v, s.pending + refund);
  if(refund > 0) s.recoverDelayT = STAMINA.recoverDelay;
  return refund;
}
function fullRefillStamina(){ arena.stamina.v = STAMINA.max; arena.stamina.pending = 0; arena.stamina.recoverDelayT = 0; }
function wipeRecoverableStamina(){ arena.stamina.pending = 0; arena.stamina.recoverDelayT = 0; }
function updateStamina(dt){
  if(wardenTrialMode)return;
  const s = arena.stamina;
  if(s.pending <= 0) return;
  if(s.recoverDelayT > 0){ s.recoverDelayT = Math.max(0, s.recoverDelayT - dt); return; }
  const amount = Math.min(s.pending, STAMINA.max / STAMINA.recoverTime * dt, STAMINA.max - s.v);
  s.pending -= amount; s.v += amount;
  if(s.pending < .001) s.pending = 0;
}
function exhaustFlash(){
  stWrap.classList.add('exhaust');
  clearTimeout(exhaustFlash._t);
  exhaustFlash._t = setTimeout(()=>stWrap.classList.remove('exhaust'), STAMINA.exhaustFlash*1000);
}
function applySwingFeel(s){
  arena.swing.s = s;
  arena.swing.dmgMult = s.dmg/14;
  arena.swing.knockMult = s.knock/.55;
  arena.swing.stun = s.stun;
  arena.swing.lunge = s.lunge;
}

const PC = installPlayerCombat({
  THREE, scene, camera, controlRegistry,
  get WEAPONS(){ return WEAPONS; },
  get WEAPON_ORDER(){ return WEAPON_ORDER; },
  materials: StoneWanderer.materials,
  facet: StoneWanderer.facet,
  get activeModel(){ return activeModel; },
  get actorVisual(){ return actorVisual; },
  get W(){ return StoneWanderer.getW(); },
  get yawQ(){ return yawQ; },
  hooks: {
    resolveAttackFacing(){ return resolveDesiredFacing(); },
    commitFacing(angle){ actorFacing = angle; },
    onAttackStart(info){
      const queuedInput = arena.chain.pendingInput;
      if(arena.chain.pendingSlot >= 0){
        arena.chain.activeSlot = arena.chain.pendingSlot;
        arena.chain.pendingSlot = -1;
        if(arena.chain.pendingStage){ arena.chain.stage = arena.chain.pendingStage; arena.chain.pendingStage = null; }
        arena.chain.pendingExpiresAt = 0;
        arena.chain.pendingInput = null;
      }
      if(queuedInput === 'heavy'){
        arena.charge.queued = false;
        arena.charge.active = arena.charge.buttonHeld;
        arena.charge.hold = 0;
        arena.charge.forceTier = null;
        arena.charge.tier = 1/3;
        arena.charge.s = defaultFeel();
        combatState.chargePull = 0;
      } else if(queuedInput){
        arena.charge.queued = false;
        arena.charge.active = false;
        arena.charge.forceTier = null;
        combatState.chargePull = 0;
      }
      arena.swing.maxChargeCleave = false;
      combatState.singleTargetEnemy = null;
      arena.swing.staminaSpent = spendStamina(staminaCostForGroup(info.group));   // fires exactly once per real swing, combos included
      CombatAudio.onAttackStart({ group: info.group, weapon: info.weapon });
      if(!arena.charge.active) applySwingFeel(defaultFeel());
      combatState.impactScale = arena.swing.s.impact * Math.max(.25, HitFeel.tuning.master);
    },
    onAttackComplete(){
      const landed = combatState.hitIds && combatState.hitIds.size > 0;
      const whiffed = combatState.fired && !landed;
      // swung at air: sell the whoosh with a light stop + slash streak
      if(whiffed){
        queueRecoverableRefund(arena.swing.staminaSpent);
        if(combatState._lastTipScene)
          HitFeel.whiff(combatState._lastTipScene, new THREE.Vector3(Math.sin(actorFacing), 0, Math.cos(actorFacing)));
      }
      finishChainMove(landed);
      arena.swing.staminaSpent = 0;
      arena.swing.maxChargeCleave = false;
      combatState.singleTargetEnemy = null;
    },
    onAttackChainIdle(){
      // Explicit light/heavy chain state opens windows from onAttackComplete only.
    },
    detectHits(dt, tipScene, baseScene, tipSpeed){ detectEnemyHits(dt, tipScene, baseScene, tipSpeed); },
    onWeaponSelected(){ ensureStanceMatchesWeapon(); rebuildDeck(); },
    onWeaponUISync(){},
    timeScaleModifier(att, t, phase){
      const s = arena.charge.active ? arena.charge.s : arena.swing.s;
      if(phase === 0) return s.windup;
      if(phase >= att.phases.length-1) return s.recover;
      return s.strike;
    }
  }
});
deck.setEffectDispatcher(PC.cardEffectDispatcher);
const combatState = PC.combatState;
combatState.hideArms = true; // procedural rig still drives the weapon; its puppet arms stay invisible
installRedTollGreatsword({
  WEAPONS, combatState, settings: StoneSettings,
  applyCombatWeaponTuning: PC.applyCombatWeaponTuning,
  updateWeaponDynamicVisual: PC.updateWeaponDynamicVisual
});

function spawnCharacter(){
  if(activeModel) actorVisual.remove(activeModel);
  activeModel = StoneWanderer.makeStoneWanderer();
  actorVisual.add(activeModel);
  PC.attachCombatToActiveModel();
}

/* ---------- stances ---------- */
function stancePoolForWeapon(weaponId = combatState.weapon){
  const matching = STANCE_CARDS.filter(st => Array.isArray(st.preferredWeapons) && st.preferredWeapons.includes(weaponId));
  return matching.length ? matching : STANCE_CARDS;
}
function setStance(index){
  const pool = stancePoolForWeapon();
  arena.stanceIndex = ((index % pool.length) + pool.length) % pool.length;
  applyStance(pool[arena.stanceIndex]);
}
function applyStance(stance){
  arena.stance=stance||null;
  stanceGate5Runtime?.syncStance?.();
  PC.setReadyPose(guardPoseFor(arena.stance));
  resetChainState();
}
function cycleStance(){ setStance(arena.stanceIndex + 1); announce(arena.stance ? stancePoolForWeapon()[(arena.stanceIndex)%stancePoolForWeapon().length].name : '', .9); }
function ensureStanceMatchesWeapon(){
  const pool = stancePoolForWeapon();
  const idx = arena.stance ? pool.findIndex(st => st.id === arena.stance.id) : -1;
  setStance(idx >= 0 ? idx : 0);
}
/* ---------- stance-card deck ---------- */
function starterDeckForWardenTrial(weaponId = combatState.weapon){
  return starterCardsForWardenTrialWeapon(weaponId, STANCE_CARDS);
}
function rebuildDeck(){
  if(wardenTrialMode){
    const starterCards = starterDeckForWardenTrial();
    // A weapon swap is a new trial run. beginRun must be used even when the
    // previous run was locked, otherwise the deck preserves the old weapon's
    // pool by design.
    deck.beginRun(starterCards,{openingStanceId:null});
  }else deck.rebuild(stancePoolForWeapon());
  renderCards();
}
function playCard(slot){
  if(wardenTrialMode)return false;
  if(arena.deadT >= 0 || roomTransition?.active) return;
  if(arena.arcanaAirborne){exhaustFlash();announce('AIRBORNE COMMITMENT',.55);return;}
  if(arena.arcanaMovementLocked){exhaustFlash();announce('ARCANA COMMITMENT',.55);return;}
  const queuedCard=deck.hand[slot];
  if(queuedCard?.dashMotion&&combatState.attack){
    exhaustFlash();announce('FINISH ATTACK FIRST',.55);return;
  }
  if(queuedCard?.dashMotion&&(arena.dodge.t>=0||PC.basicDashRuntime?.busy||PC.wizardNextTwentyDashRuntime?.busy)){
    exhaustFlash();announce('DASH IN PROGRESS',.55);return;
  }
  const card = deck.play(slot);
  if(!card){ exhaustFlash(); return; }   // empty slot or mid-shuffle
  const pool = stancePoolForWeapon();
  const idx = pool.findIndex(st => st.id === card.id);
  if(idx >= 0) setStance(idx);
  else { arena.stance = card; resetChainState(); }
  // drop any follow-up queued from the old stance
  combatState.pending = null; combatState.pendingGroup = null;
  combatState.readyLock = 0;
  fullRefillStamina();
  markCardAnimation(slot);
  announce(card.name.replace(/^S\d+\s*/,''), .9);
  renderCards();
}
function startDeckShuffle(){
  if(arena.deadT >= 0 || roomTransition?.active) return;
  if(deck.startShuffle()) renderCards();
}
function cycleWeapon(dir=1){
  if(roomTransition?.active) return;
  const idx = WEAPON_ORDER.indexOf(combatState.weapon);
  const next = WEAPON_ORDER[(idx + dir + WEAPON_ORDER.length) % WEAPON_ORDER.length];
  PC.selectCombatWeapon(next);
  StoneSettings.set('arena.weapon', next);
  respawn();   // weapon swap = full scene reset
  announce(WEAPONS[next].label, .9);
}
function selectWeapon(id,{reset=true,persist=true}={}){
  const next=normalizeStoneWeaponId(id);
  if(!WEAPON_ORDER.includes(next))return false;
  PC.selectCombatWeapon(next);
  if(persist)StoneSettings.set('arena.weapon',next);
  ensureStanceMatchesWeapon();
  if(reset)respawn();
  return true;
}
function selectStance(id,{allowAdapted=false}={}){
  const requested=String(id||''),pool=stancePoolForWeapon(),index=pool.findIndex(stance=>stance.id===requested);
  if(index>=0){setStance(index);return true;}
  if(!allowAdapted)return false;
  const stance=STANCE_CARDS.find(candidate=>candidate.id===requested);
  if(!stance)return false;
  arena.stanceIndex=-1;applyStance(stance);return true;
}

/* ---------- maze navigation + room encounters ---------- */
const encounterRandom = createSeededRandom(`${MAZE_SEED}:encounters`);
let encounterState = null;
const STARTUP_ACTIVITY_PHASES=Object.freeze({queue:'queued-spawn',telegraph:'telegraph-created',living:'first-living'});
let startupMilestones={roomId:null,queue:false,telegraph:false,living:false};
function resetStartupMilestones(roomId=null){
  startupMilestones={roomId,queue:false,telegraph:false,living:false};
}
function traceArenaActivityTransition({kind,count,systemKey}={}){
  if(!startupTrace.enabled)return null;
  const roomId=encounterState?.activeRoomId??activeRoomId;
  if(startupMilestones.roomId!==roomId)resetStartupMilestones(roomId);
  const activityKind=String(kind||'');
  const phase=STARTUP_ACTIVITY_PHASES[activityKind];
  const currentCount=Number(count)||0;
  if(!phase||startupMilestones[activityKind]||currentCount<=0)return null;
  startupMilestones[activityKind]=true;
  const counts={
    queue:Number(enemySystem.queuedSpawnCount)||0,
    telegraph:Number(enemySystem.telegraphCount)||0,
    living:(enemySystem.enemies||[]).filter(enemy=>Number(enemy?.hp)>0).length,
  };
  return traceArenaState(phase,{
    ...counts,
    activity:{kind:activityKind,currentCount,systemKey:String(systemKey||''),counts},
    room:{activeRoomId:roomId,encounterRoomId:encounterState?.encounterRoomId??roomId},
  });
}
const traceActivityTransition=startupTrace.enabled?traceArenaActivityTransition:null;
const transitionOverlay = document.getElementById('roomTransition');
const transitionTitle = document.getElementById('rtTitle');
const transitionView = { cameraPush:0 };

function positionRoomLighting(point = mazeWorld.center){
  key.position.set(point.x - 14, 26, point.z + 12);
  keyTarget.position.set(point.x, 0, point.z);
  rim.position.set(point.x + 16, 9, point.z - 14);
  keyTarget.updateMatrixWorld();
}

function syncDoorStates({ animateOpenedEdge = null } = {}){
  if(!encounterState || !mazeWorld) return;
  mazeWorld.setDoorStates({
    sealedRoomIds:encounterState.sealedRoomIds,
    openedDoorEdges:encounterState.openedDoorEdges,
    roomCleared:encounterState.isCleared(activeRoomId),
  }, { animateOpenedEdge });
}

function loadActiveRoom(roomId){
  if(mazeWorld){
    mazeWorld.group.parent?.remove(mazeWorld.group);
    mazeWorld.dispose();
  }
  activeRoomId = roomId;
  mazeWorld = createMazeWorld({
    THREE, maze:dungeon, roomId, hexSize:HEX_SIZE, wallHeight:3.2,
    wallThickness:.34, doorWidth:7, openedDoorEdges:encounterState?.openedDoorEdges, theme:arenaTheme,
  });
  worldRoot.add(mazeWorld.group);
  positionRoomLighting(mazeWorld.center);
  syncDoorStates();
}
positionRoomLighting(mazeWorld.center);

const mazeNavigation = {
  resolveMovement(position, delta, radius){
    if(wardenTrialStage)return wardenTrialStage.resolveMovement(position,delta,radius);
    return resolveCircleMovement(position, delta, radius, mazeWorld.getCollisionSegments());
  },
  raycastWalls(start, end){ return wardenTrialStage?false:raycastWalls(start, end, mazeWorld.getCollisionSegments()); },
  randomSpawn(roomId, player){
    if(roomId === null || roomId === undefined) return null;
    if(wardenTrialMode){
      const angle=encounterRandom()*Math.PI*2;
      const radius=lerp(WARDEN_TRIAL_SETTINGS.spawnRadiusMin,WARDEN_TRIAL_SETTINGS.spawnRadiusMax,encounterRandom());
      return wardenTrialStage.clampPoint({
        x:(player?.x??mazeWorld.center.x)+Math.cos(angle)*radius,
        z:(player?.z??mazeWorld.center.z)+Math.sin(angle)*radius,
      },WARDEN_TRIAL_SETTINGS.enemyRadius);
    }
    let fallback = null;
    for(let attempt=0; attempt<14; attempt++){
      const point = randomPointInRoom(dungeon, roomId, encounterRandom, HEX_SIZE);
      fallback = point || fallback;
      if(point && Math.hypot(point.x - (player?.x ?? 0), point.z - (player?.z ?? 0)) > 4.2) return point;
    }
    return fallback;
  },
  nextWaypoint(enemy, player, roomId){
    if(!raycastWalls({ x:enemy.x, z:enemy.z }, { x:player.x, z:player.z }, mazeWorld.getCollisionSegments())) return player;
    const start = findCellAtPoint(dungeon, { x:enemy.x, z:enemy.z }, HEX_SIZE);
    const goal = findCellAtPoint(dungeon, { x:player.x, z:player.z }, HEX_SIZE);
    if(!start || !goal || start.key === goal.key) return player;
    const room = dungeon.rooms.find(candidate => candidate.id === roomId);
    const path = findPath(dungeon, start.key, goal.key, { allowedCellKeys:room?.cellKeys });
    if(path.length < 2) return player;
    const waypoint = dungeon.cells.get(path[1]);
    return axialToWorld(waypoint.q, waypoint.r, HEX_SIZE);
  }
};
let roomTransition = null;

/* ---------- enemies ---------- */
const enemySystem = createArenaEnemySystem({
  THREE, worldRoot, controlRegistry, arenaRadius:ARENA, navigation:mazeNavigation,
  combatCenterField:wardenTrialCenterField,
  roomEncounterMode:true,
  onActivityTransition:traceActivityTransition,
  onEncounterCleared(roomId){
    encounterState?.clearRoom(roomId);
    syncDoorStates();
    const progress = encounterState?.progress;
    announce(progress?.cleared === progress?.total ? 'DUNGEON CLEAR' : `ROOM ${roomId + 1} CLEAR · STRIKE A DOOR`, 1.8);
  }
});
function configureWardenTrialWave(){return configureWardenTrialEnemySet(enemySystem,wardenTrialEnemySet);}
encounterState = createRoomEncounterState(dungeon, {
  onRoomEnter({ roomId, previousRoomId, cleared }){
    resetStartupMilestones(roomId);
    syncDoorStates();
    traceArenaState('room-entered',{
      room:{activeRoomId:roomId,encounterRoomId:cleared?null:roomId,previousRoomId,cleared},
    });
    if(cleared) announce(`ROOM ${roomId + 1} · CLEARED`, .8);
  },
  onEncounterStart({ roomId }){
    syncDoorStates();
    traceArenaState('room-encounter-begin',{
      encounter:{roomId,requestedMode:selectedEncounterMode},
    });
    let startError=null;
    try{
      enemySystem.startRoomEncounter(roomId);
    }catch(error){
      startError=error;
    }
    const plan=enemySystem.currentEncounterPlan||null;
    const diagnostic=showRosterPlanDiagnostic({roomId,plan,error:startError});
    traceArenaState(startError||diagnostic?'room-encounter-failed':'room-encounter-started',{
      encounter:{roomId,requestedMode:selectedEncounterMode,plan:summarizePlan(plan),error:startError?.message||diagnostic?.reason||''},
    });
    if(startError||diagnostic)return;
    announce(`ROOM ${roomId + 1} · SEAL`, 1.1);
  }
}, { enemyLab:runtimeConfig.enemyLab });

const summarizePlan=plan=>{
  if(!plan)return null;
  const groups=Array.isArray(plan.groups)?plan.groups:[];
  return{
    mode:String(plan.mode||''),
    typeIds:Array.isArray(plan.typeIds)?[...plan.typeIds]:[],
    groups:groups.map(group=>({
      system:String(group?.system||''),
      spawnKind:String(group?.spawnKind||group?.kind||''),
      count:Number(group?.count)||0,
    })),
    rosterCount:Number(plan.rosterCount)||0,
    availableTypeCount:Number(plan.availableTypeCount)||0,
    totalCount:Number(plan.totalCount)||groups.reduce((sum,group)=>sum+(Number(group?.count)||0),0),
  };
};
function traceArenaState(phase,overrides={}){
  if(!startupTrace.enabled)return null;
  const rosterStatus=enemySystem.getWorkingRosterEncounterStatus?.()||{};
  const plan=enemySystem.currentEncounterPlan||null;
  const director=enemySystem.director;
  const base={
    standard:summarizeStandard(lockedStandard),
    profile:summarizeProfile(lockedStandard?.profile),
    encounter:{
      requestedMode:String(overrides.encounter?.requestedMode??selectedEncounterMode??''),
      selectedMode:String(selectedEncounterMode||''),
      spawnKind:String(enemySystem.spawnKind||''),
      label:encounterModeLabel(selectedEncounterMode),
      warning:String(encounterModeWarning||''),
      plan:summarizePlan(plan),
    },
    director:{
      mode:String(director?.getMode?.()||director?.mode||''),
      pressureBudget:Number(director?.settings?.pressureBudget)||0,
      aggression:Number(director?.settings?.aggression)||0,
      enabled:enemySystem.combatDirectorEnabled!==false,
    },
    roster:{
      source:lockedStandard?'locked-standard':'working-roster-storage',
      active:!!rosterStatus.active,
      count:Array.isArray(rosterStatus.ids)?rosterStatus.ids.length:0,
      ids:Array.isArray(rosterStatus.ids)?[...rosterStatus.ids]:[],
      warning:String(rosterStatus.warning||''),
    },
    room:{
      activeRoomId,
      encounterRoomId:encounterState?.encounterRoomId??null,
      progress:encounterState?.progress||null,
    },
    queue:Number(enemySystem.queuedSpawnCount)||0,
    telegraph:Number(enemySystem.telegraphCount)||0,
    living:(enemySystem.enemies||[]).filter(enemy=>Number(enemy?.hp)>0).length,
    activity:null,
  };
  const state={...base};
  for(const key of ['standard','profile','encounter','director','roster','room']){
    if(overrides[key]!==undefined)state[key]={...base[key],...(overrides[key]||{})};
  }
  for(const key of ['queue','telegraph','living','activity'])if(overrides[key]!==undefined)state[key]=overrides[key];
  for(const [key,value] of Object.entries(overrides)){
    if(!(key in state))state[key]=value;
  }
  const event=startupTrace.mark(phase,state);
  if(event&&globalThis.document?.documentElement?.dataset){
    globalThis.document.documentElement.dataset.arenaStartupTracePhase=event.phase;
    globalThis.document.documentElement.dataset.arenaStartupTrace=JSON.stringify(event);
  }
  return event;
}

roomTransition = createRoomTransitionController({
  duration:.98,
  swapAt:.48,
  onSwap(payload){
    loadActiveRoom(payload.toRoomId);
    actorPos.set(payload.doorCenter.x + payload.direction.x * 2.4, payload.doorCenter.z + payload.direction.z * 2.4);
    camFollow.set(actorPos.x, 0, actorPos.y);
    encounterState.enterRoom(payload.toRoomId);
    syncDoorStates();
  },
  onComplete(payload){
    transitionOverlay.style.opacity = 0;
    transitionView.cameraPush = 0;
    announce(encounterState.isCleared(payload.toRoomId) ? `ROOM ${payload.toRoomId + 1} · QUIET` : `ROOM ${payload.toRoomId + 1}`, 1.0);
  }
});

function beginRoomTransition(doorTarget, toRoomId){
  if(roomTransition.active || !encounterState.isDoorOpened(doorTarget.edge)) return false;
  const fromKey = doorTarget.roomA === activeRoomId ? doorTarget.cellA : doorTarget.cellB;
  const toKey = doorTarget.roomA === activeRoomId ? doorTarget.cellB : doorTarget.cellA;
  const fromCell = dungeon.cells.get(fromKey), toCell = dungeon.cells.get(toKey);
  if(!fromCell || !toCell) return false;
  const fromCenter = axialToWorld(fromCell.q, fromCell.r, HEX_SIZE);
  const toCenter = axialToWorld(toCell.q, toCell.r, HEX_SIZE);
  const direction = norm2(toCenter.x - fromCenter.x, toCenter.z - fromCenter.z);
  const payload = {
    fromRoomId:activeRoomId, toRoomId, direction,
    doorCenter:{ ...doorTarget.center },
    start:{ x:actorPos.x, z:actorPos.y },
    end:{ x:doorTarget.center.x + direction.x * HEX_SIZE * .38, z:doorTarget.center.z + direction.z * HEX_SIZE * .38 },
  };
  // Live Arcana motion/effects belong to the room being exited. Resource
  // cooldowns and charge progress persist across a normal room transition.
  PC.resetArcanaRuntimeState?.({preserveResources:true});
  enemySystem.clearRoomRuntime();
  clearRoomEffects();
  arena.charge.active = false;
  combatState.attack = null;
  combatState.t = 0;
  arena.dodge.t = -1;
  transitionTitle.textContent = `ROOM ${toRoomId + 1}`;
  return roomTransition.start(payload);
}

function findTransitionDoor(toRoomId){
  return mazeWorld.getDoorTargets()
    .filter(door => door.state === 'open' && (door.roomA === toRoomId || door.roomB === toRoomId))
    .sort((a, b) => Math.hypot(a.center.x - actorPos.x, a.center.z - actorPos.y) - Math.hypot(b.center.x - actorPos.x, b.center.z - actorPos.y))[0] || null;
}

function updateRoomTransition(rawDt){
  const state = roomTransition.update(rawDt);
  const payload = state.payload;
  if(payload){
    const p = state.progress;
    const eased = p * p * (3 - 2 * p);
    actorPos.set(lerp(payload.start.x, payload.end.x, eased), lerp(payload.start.z, payload.end.z, eased));
    actorFacing = Math.atan2(payload.direction.x, payload.direction.z);
    actorRoot.position.set(actorPos.x, 0, actorPos.y);
    yawQ.setFromAxisAngle(Y_AXIS, actorFacing);
    actorVisual.quaternion.copy(yawQ);
  }
  transitionView.cameraPush = state.cameraPush;
  transitionOverlay.style.opacity = state.veil;
}

/* ---------- facing ---------- */
function combatHostileEnemies(){
  const values=Array.isArray(enemySystem.hostileEnemies)?enemySystem.hostileEnemies:(enemySystem.enemies||[]);
  return values.filter(enemy=>enemy&&enemy.hp>0);
}
function nearestEnemy(maxDist=Infinity){
  let best=null, bd=maxDist;
  for(const e of combatHostileEnemies()){
    const d = Math.hypot(e.x-actorPos.x, e.z-actorPos.y);
    if(d<bd && !mazeNavigation.raycastWalls({ x:actorPos.x, z:actorPos.y }, { x:e.x, z:e.z })){
      bd=d; best=e;
    }
  }
  return best;
}
function resolveDesiredFacing(){
  if(arena.arcanaFacingLock) return { angle:arena.arcanaFacingLock.angle, source:'arcana-lock' };
  const target = nearestEnemy(AUTO_FACE_RANGE);
  if(target) return { angle: Math.atan2(target.x-actorPos.x, target.z-actorPos.y), source:'auto' };
  if(Math.hypot(input.mx,input.mz) > .15) return { angle: Math.atan2(input.mx, input.mz), source:'move' };
  return { angle: actorFacing, source:'idle' };
}
function attackCommitWeight(){
  if(!combatState.attack) return 0;
  const contact = Math.max(.001, combatState.attack.contactAt || .001);
  const t = clamp((combatState.t - contact*.18) / Math.max(1e-5, contact*.95 - contact*.18), 0, 1);
  const base = t*t*(3-2*t);
  return clamp(.20 + base*.62, 0, 1);
}

/* ---------- attack flow: light combo + hold-heavy charge ---------- */
function combatInputMode(){ return getCombatInputMode(arena.combatInputMode); }
function activeStageForSlot(slot){ return slot === 0 ? 'hit1' : slot === 1 ? 'hit2' : slot === 2 ? 'heavy' : 'idle'; }
function clearPendingCombatInput(){
  const c = arena.chain;
  c.pendingSlot = -1;
  c.pendingStage = null;
  c.pendingExpiresAt = 0;
  c.pendingInput = null;
  combatState.pending = null;
  combatState.pendingGroup = null;
  arena.charge.queued = false;
}
function resetChainState(){
  arena.chain.stage = 'idle';
  arena.chain.comboDeadline = 0;
  arena.chain.finisherDeadline = 0;
  arena.chain.inputLockT = 0;
  arena.chain.lightLockT = 0;
  arena.chain.activeSlot = -1;
  clearPendingCombatInput();
  combatState.readyLock = 0;
}
function lockChain(seconds){
  arena.chain.stage = 'locked';
  arena.chain.inputLockT = Math.max(arena.chain.inputLockT, seconds);
  arena.chain.comboDeadline = 0;
  arena.chain.finisherDeadline = 0;
  arena.chain.activeSlot = -1;
  clearPendingCombatInput();
  combatState.readyLock = 1;
}
function updateChainTimers(dt,now=performance.now()/1000){
  const c = arena.chain;
  const mode = combatInputMode();
  c.inputLockT = Math.max(0, c.inputLockT - dt);
  c.lightLockT = Math.max(0, c.lightLockT - dt);
  if(combatState.attack && combatState.pending && shouldExpireBufferedInput({
    mode, now, expiresAt:c.pendingExpiresAt,
    attackTime:combatState.t, comboAt:combatState.attack.comboAt,
  })){
    clearPendingCombatInput();
    c.stage = activeStageForSlot(c.activeSlot);
  }
  if(c.stage === 'locked' && c.inputLockT <= 0) resetChainState();
  if(!combatState.attack && c.stage === 'hit1Ready' && now > c.comboDeadline){
    if(mode.missLock) lockChain(CHAIN.whiffLock);
    else resetChainState();
  }
  if(mode.postSecondLock && !combatState.attack && c.stage === 'finisher' && now > c.finisherDeadline) resetChainState();
  if(mode.missLock || mode.postSecondLock){
    const inputLock = CHAIN.whiffLock > 0 ? c.inputLockT / CHAIN.whiffLock : 0;
    const lightLock = CHAIN.postSecondLightLock > 0 ? c.lightLockT / CHAIN.postSecondLightLock : 0;
    combatState.readyLock = combatState.attack ? 0 : clamp(Math.max(inputLock, lightLock), 0, 1);
  } else combatState.readyLock = 0;
}
function chainMove(slot){
  if(!arena.stance) return null;
  const key = arena.stance.chain[slot];
  const att = PC.ATTACKS[key];
  return att ? { key, slot, att } : null;
}
function arcanaDashBusy(){return !!(PC.basicDashRuntime?.busy||PC.wizardNextTwentyDashRuntime?.busy||PC.wizardVfxArcanaRuntime?.busy);}
function heroicLeapCommitted(){return !!(arena.arcanaAirborne||PC.wizardFusionLeapRuntime?.busy);}
function canUseCombatInput(){ return arena.deadT < 0 && arena.dodge.t < 0 && !arcanaDashBusy() && !heroicLeapCommitted() && !arena.arcanaMovementLocked && arena.chain.inputLockT <= 0 && !!arena.stance; }
function chargeCap(att){ return att.phases[0].t1 * .98; }
function startChainMove(move, stage){
  arena.chain.stage = stage;
  arena.chain.activeSlot = move.slot;
  PC.startCombatAttack(move.key, move.att.group);
}
function queueCombatFollowup(move, pendingStage, inputKind){
  const c = arena.chain, mode = combatInputMode();
  combatState.pending = move.key;
  combatState.pendingGroup = move.att.group;
  c.stage = pendingStage + 'Queued';
  c.pendingSlot = move.slot;
  c.pendingStage = pendingStage;
  c.pendingInput = inputKind;
  c.pendingExpiresAt = mode.id === 'legacy' ? Infinity : bufferExpiresAt(mode, performance.now()/1000);
  if(inputKind !== 'heavy') arena.charge.queued = false;
}
function finishChainMove(landed){
  const c = arena.chain, slot = c.activeSlot, mode = combatInputMode();
  combatState.chargePull = 0;
  if(c.pendingSlot >= 0) return;
  if(c.stage === HEAVY_LIGHT_STAGE){ resetChainState(); return; }
  if(slot === 0){
    if(landed || !mode.requireHitToLink){
      c.stage = 'hit1Ready';
      c.comboDeadline = performance.now()/1000 + CHAIN.comboWindow;
    } else if(mode.missLock) lockChain(CHAIN.whiffLock);
    else resetChainState();
  } else if(slot === 1){
    if(mode.postSecondLock){
      c.stage = 'finisher';
      c.finisherDeadline = performance.now()/1000 + CHAIN.finisherWindow;
      c.lightLockT = Math.max(c.lightLockT, CHAIN.postSecondLightLock);
      c.activeSlot = -1;
    } else resetChainState();
  } else if(slot === 2) resetChainState();
  if(c.stage !== 'locked' && c.stage !== 'idle' && c.stage !== 'finisher') c.activeSlot = -1;
}
function lightDown(){
  if(roomTransition?.active) return;
  if(!canUseCombatInput()) return;
  const mode = combatInputMode();
  if(mode.postSecondLock && (arena.chain.lightLockT > 0 || arena.chain.stage === 'finisher')) return;
  if(combatState.attack){
    if(mode.id === 'legacy' && combatState.pending) return;
    if(mode.requireHitToLink && (!combatState.hitIds || combatState.hitIds.size <= 0)) return;
    const followup = mode.id === 'legacy'
      ? lightFollowupForStage(arena.chain.stage)
      : lightFollowupForActiveMove({ activeSlot:arena.chain.activeSlot, stage:arena.chain.stage, mode });
    if(!followup) return;
    const move = chainMove(followup.slot);
    if(!move) return;
    if(!hasStamina(staminaCostForGroup(move.att.group))){ exhaustFlash(); return; }
    queueCombatFollowup(move, followup.pendingStage, 'light');
    return;
  }
  const now = performance.now()/1000;
  let slot = arena.chain.stage === 'hit1Ready' && now <= arena.chain.comboDeadline ? 1 : 0;
  if(arena.chain.stage === 'hit1Ready' && slot === 0){
    if(mode.missLock){ lockChain(CHAIN.whiffLock); return; }
    resetChainState();
    slot = 0;
  }
  const move = chainMove(slot);
  if(!move) return;
  if(!hasStamina(staminaCostForGroup(move.att.group))){ exhaustFlash(); return; }
  arena.charge.active = false;
  arena.charge.queued = false;
  combatState.chargePull = 0;
  startChainMove(move, slot === 0 ? 'hit1' : 'hit2');
}
function heavyDown(){
  if(roomTransition?.active||heroicLeapCommitted()) return;
  arena.charge.buttonHeld = true;
  if(!canUseCombatInput()) return;
  const mode = combatInputMode();
  if(combatState.attack){
    if(!mode.allowHeavyBuffer || (arena.chain.activeSlot !== 0 && arena.chain.activeSlot !== 1)) return;
    const move = chainMove(2);
    if(!move) return;
    if(!hasStamina(staminaCostForGroup(move.att.group))){ exhaustFlash(); return; }
    arena.charge.queued = true;
    queueCombatFollowup(move, 'heavy', 'heavy');
    return;
  }
  const now = performance.now()/1000;
  if(arena.chain.stage === 'hit1Ready') resetChainState();
  if(mode.postSecondLock && arena.chain.stage === 'finisher' && now > arena.chain.finisherDeadline){ resetChainState(); return; }
  const move = chainMove(2);
  if(!move) return;
  if(!hasStamina(staminaCostForGroup(move.att.group))){ exhaustFlash(); return; }
  arena.charge.active = true;
  arena.charge.queued = false;
  arena.charge.hold = 0;
  arena.charge.forceTier = null;
  arena.charge.tier = 1/3;
  arena.charge.s = defaultFeel();
  startChainMove(move, 'heavy');
}
function releaseCharge(){
  if(!arena.charge.active) return;
  const base = staminaCostForGroup(combatState.attackGroup);
  const chargeFrac = clamp((arena.charge.tier - 1/3) / (2/3), 0, 1);
  arena.swing.maxChargeCleave = chargeFrac >= .999;
  arena.swing.staminaSpent += spendStamina(base * (STAMINA.chargeCostMult - 1) * chargeFrac);
  applySwingFeel(arena.charge.s);
  combatState.impactScale = arena.charge.s.impact * Math.max(.25, HitFeel.tuning.master);
  arena.charge.active = false; arena.charge.forceTier = null; combatState.chargePull = 0;
}
function heavyUp(){ arena.charge.buttonHeld = false; releaseCharge(); }
function attackDown(){ lightDown(); }
function attackUp(){ heavyUp(); }

function beginTestSwing(tier){
  // FEEL-tab debug tool: deliberately not stamina-gated (the swing itself still deducts)
  if(arena.deadT >= 0 || combatState.attack || !arena.stance) return;
  const move = chainMove(2);
  if(!move) return;
  arena.charge.active = true; arena.charge.hold = 0; arena.charge.forceTier = tier;
  arena.charge.tier = tier; arena.charge.s = feelAt(FEEL, tier);
  startChainMove(move, 'heavy');
}
function updateCharge(dt){
  const c = arena.charge;
  if(!c.active){ combatState.chargePull = 0; return; }
  if(!combatState.attack){ c.active = false; combatState.chargePull = 0; return; }
  c.hold += dt;
  c.tier = c.forceTier ?? holdToTier(c.hold);
  c.s = feelAt(FEEL, c.tier);
  combatState.chargePull = clamp((c.tier - 1/3) / (2/3), 0, 1);
  const cap = chargeCap(combatState.attack);
  if(combatState.t > cap) combatState.t = cap;
  if(c.forceTier !== null && combatState.t >= cap - 1e-4) releaseCharge();
}

/* ---------- dodge ---------- */
function triggerDodge(){
  if(stanceGate5Runtime?.consumesDefenseInput?.())return false;
  const d = arena.dodge;
  if(arena.deadT >= 0 || roomTransition?.active || d.t >= 0 || d.cool > 0 || arcanaDashBusy() || heroicLeapCommitted() || arena.arcanaMovementLocked)return false;
  const dodgeSpend=stanceGate5Runtime?.spendDodge?.();
  if(dodgeSpend?.allowed===false){exhaustFlash();announce('NO STAMINA',.55);return false;}
  arena.charge.active = false; arena.charge.queued = false; arena.charge.buttonHeld = false; combatState.chargePull = 0;
  combatState.attack = null; combatState.t = 0; resetChainState();
  const mv = Math.hypot(input.mx, input.mz);
  let dir;
  if(mv > .2) dir = norm2(input.mx, input.mz);
  else {
    const threat = nearestEnemy();
    dir = threat ? norm2(actorPos.x-threat.x, actorPos.y-threat.z)
                 : norm2(Math.sin(actorFacing+Math.PI), Math.cos(actorFacing+Math.PI));
  }
  d.t = 0; d.dirX = dir.x; d.dirZ = dir.z; d.cool = DODGE_COOL;
  arena.invulnT = Math.max(arena.invulnT, DODGE_IFRAMES);
  CombatAudio.playTest('swingLight');
  return true;
}
function defenseDown(source='input'){
  const result=stanceGate5Runtime?.defenseDown?.(source);
  if(result?.handled)return result;
  return{handled:true,delegated:true,source,dodged:triggerDodge()};
}
function defenseUp(source='input'){
  return stanceGate5Runtime?.defenseUp?.(source)||{handled:false,source};
}

/* ---------- hits: swept weapon zones vs enemies ---------- */
const shake = new THREE.Vector3(), shakeVel = new THREE.Vector3();
const effects = [];
function detectDoorHits(zones){
  if(!encounterState.isCleared(activeRoomId)) return;
  for(const door of mazeWorld.getDoorTargets()){
    if(door.state !== 'breakable' || combatState.hitIds?.has(door)) continue;
    let impact = null;
    for(const zone of zones){
      const a = PC.weaponRoot.localToWorld(zone.from.clone());
      const b = PC.weaponRoot.localToWorld(zone.to.clone());
      const dx = door.b.x - door.a.x, dz = door.b.z - door.a.z;
      for(const along of [.12,.32,.5,.68,.88]){
        for(const y of [.65,1.35,2.05]){
          const sample = new THREE.Vector3(door.a.x + dx * along, y, door.a.z + dz * along);
          if(PC.pointSegmentDistance(sample, a, b) <= zone.radius + .7){ impact = sample; break; }
        }
        if(impact) break;
      }
      if(impact) break;
    }
    if(!impact || !encounterState.openDoor(door.edge, activeRoomId)) continue;
    combatState.hitIds.add(door);
    syncDoorStates({ animateOpenedEdge:door.edge });
    const direction = new THREE.Vector3(door.center.x - actorPos.x, 0, door.center.z - actorPos.y).normalize();
    HitFeel.impact({ point:impact, dir:direction, damage:18, kill:false, color:0xe8a04c });
    onHitFeel(impact, .45);
    CombatAudio.onDummyEvent({ damage:18, kill:false });
    announce('PASSAGE OPEN', 1.0);
  }
}
// Scratch reused by detectEnemyHits so a live swing doesn't allocate an enemies
// copy, sample Vector3s, and zone clones every frame while it is active.
const _hitEnemies = [], SAMPLE_KS = [.24, .52, .80];
const _hitSamples = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
const _zoneA = new THREE.Vector3(), _zoneB = new THREE.Vector3();
function detectEnemyHits(dt, tipScene, baseScene, tipSpeed){
  if(!combatState.attack || !PC.weaponRoot || !enemySystem) return;
  if(!combatState.hitIds) combatState.hitIds = new Set();
  const zones = PC.getWeaponHitZones();
  detectDoorHits(zones);
  const weaponDef = PC.currentWeapon();
  const canCleave = weaponAllowsCleave({
    weaponDef,
    attackSlot: arena.chain.activeSlot,
    maxCharge: arena.swing.maxChargeCleave,
  });
  _hitEnemies.length = 0;
  for(let i=0;i<enemySystem.enemies.length;i++) _hitEnemies.push(enemySystem.enemies[i]);
  if(!canCleave){
    _hitEnemies.sort((a,b)=>Math.hypot(a.x-actorPos.x,a.z-actorPos.y)-Math.hypot(b.x-actorPos.x,b.z-actorPos.y));
  }
  for(const e of _hitEnemies){
    if(!canCleave && combatState.singleTargetEnemy && combatState.singleTargetEnemy !== e) continue;
    if(combatState.hitIds.has(e)) continue;
    const enemyScale = enemySystem.heightScale || 1;
    const scaledRadius = e.radius * enemyScale * (e.collisionScale || 1);
    const h = (e.height || e.radius * 2) * enemyScale * (e.currentTargetScale || e.targetScale || 1);
    const targetOffsetY = e.targetYOffset || 0;
    // Fill reusable sample points: 3 heights at the body origin, and (if the enemy
    // has a forward attack origin) 3 more at that origin. No per-frame allocation.
    let sampleCount = 0;
    for(const k of SAMPLE_KS) _hitSamples[sampleCount++].set(e.x, targetOffsetY + h * k, e.z);
    if(e.attackOriginForward > 0){
      const ox = e.x + e.facing.x * e.attackOriginForward * enemyScale;
      const oz = e.z + e.facing.z * e.attackOriginForward * enemyScale;
      for(const k of SAMPLE_KS) _hitSamples[sampleCount++].set(ox, targetOffsetY + h * k, oz);
    }
    let best = null;
    for(const zone of zones){
      const a = PC.weaponRoot.localToWorld(_zoneA.copy(zone.from));
      const b = PC.weaponRoot.localToWorld(_zoneB.copy(zone.to));
      const threshold = scaledRadius + zone.radius + .38;
      let bestDist = Infinity, bestCenter = _hitSamples[1];
      for(let s=0;s<sampleCount;s++){ const center = _hitSamples[s]; const d = PC.pointSegmentDistance(center, a, b); if(d < bestDist){ bestDist = d; bestCenter = center; } }
      if(bestDist <= threshold){
        if(mazeNavigation.raycastWalls({ x:actorPos.x, z:actorPos.y }, { x:bestCenter.x, z:bestCenter.z })) continue;
        const quality = 1 - clamp(bestDist / threshold, 0, 1);
        const weaponMult = getWeaponDamageMultiplier({ weaponId: combatState.weapon, weaponDef, attackKey: combatState.attackKey, attackGroup: combatState.attackGroup, hitType: zone.type, zoneId: zone.id });
        const raw = zone.damage * (.82 + quality * .42) * weaponMult * arena.swing.dmgMult;
        const motion = tipScene.clone().sub(baseScene); if(motion.lengthSq() < 1e-6) motion.set(e.x - actorPos.x, 0, e.z - actorPos.y); motion.normalize();
        const cand = { zone, damage: Math.max(1, Math.round(raw)), point: bestCenter.clone().lerp(tipScene, .25), motion };
        if(!best || cand.damage > best.damage) best = cand;
      }
    }
    if(best){
      if(!canCleave) combatState.singleTargetEnemy = e;
      combatState.hitIds.add(e);
      const stagger = best.zone.stagger * arena.swing.knockMult * Math.max(0, HitFeel.tuning.knock);
      const killed = enemySystem.damageEnemy(e, best.damage,
        { x: best.motion.x * stagger, z: best.motion.z * stagger },
        { pop: HitFeel.tuning.pop * HitFeel.tuning.master });
      if(!killed) e.stunned = Math.max(e.stunned, arena.swing.stun);
      onHitFeel(best.point, arena.charge.active ? arena.charge.tier : tierOfSwing());
      HitFeel.impact({
        point: best.point,
        dir: new THREE.Vector3(best.motion.x, 0, best.motion.z),
        damage: best.damage, kill: killed,
        color: HIT_TYPE_COLOR[best.zone.type] || 0xffffff
      });
      const recoil = .20 * clamp(best.damage / 28, .4, 2) * HitFeel.tuning.master;
      actorPos.x -= best.motion.x * recoil;
      actorPos.y -= best.motion.z * recoil;
      spawnHitEffect(best.point, best.zone.type, best.damage);
      CombatAudio.onDummyEvent({ damage: best.damage, kill: killed });
      if(!canCleave) break;
    }
  }
}
function tierOfSwing(){ return clamp((arena.swing.s.dmg - 7) / (40 - 7), 0, 1); }
function onHitFeel(point, tier){
  const fx = Math.sin(actorFacing), fz = Math.cos(actorFacing);
  shakeVel.x += fx * 1.6 * tier + (Math.random()-.5) * .8;
  shakeVel.z += fz * 1.6 * tier;
  shakeVel.y -= .7 * tier;
}
const HIT_TYPE_COLOR = { slice:0x9bd7f0, pierce:0xf4e0a2, blunt:0xffb066, hybrid:0xd7b6ff, weak:0x9aabc4 };
// Combat impacts used to allocate a fresh ring geometry + material AND a fresh
// 256x128 canvas + CanvasTexture + SpriteMaterial + Sprite on EVERY hit. Now the
// ring geometry is shared, ring/label meshes are pooled and reused, and the
// damage-number textures are cached by (text,color) so the canvas draw + GPU
// upload happen once per distinct number/color instead of once per hit.
const RING_GEO = new THREE.TorusGeometry(.45,.035,6,24);
const ringPool = [], labelPool = [], damageTexCache = new Map();
function damageTexture(text, color){
  const key = text + '|' + color;
  let tex = damageTexCache.get(key);
  if(tex) return tex;
  const cv=document.createElement('canvas'); cv.width=256; cv.height=128; const ctx=cv.getContext('2d');
  ctx.clearRect(0,0,256,128); ctx.font='900 44px system-ui,Segoe UI,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.lineWidth=8; ctx.strokeStyle='rgba(0,0,0,.75)'; ctx.fillStyle='#'+color.toString(16).padStart(6,'0');
  ctx.strokeText(text,128,64); ctx.fillText(text,128,64);
  tex=new THREE.CanvasTexture(cv); tex.colorSpace=THREE.SRGBColorSpace;
  damageTexCache.set(key, tex);
  return tex;
}
function spawnHitEffect(point, type, damage){
  const color = HIT_TYPE_COLOR[type] || 0xffffff;
  let ring = ringPool.pop();
  if(!ring) ring = new THREE.Mesh(RING_GEO, new THREE.MeshBasicMaterial({ transparent:true, blending:THREE.AdditiveBlending, depthWrite:false }));
  ring.material.color.setHex(color); ring.material.opacity = 1; ring.scale.setScalar(1);
  ring.position.copy(point); ring.lookAt(camera.position); ring.visible = true; scene.add(ring);
  effects.push({ mesh:ring, age:0, life:.28, kind:'ring' });
  let sp = labelPool.pop();
  if(!sp) sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent:true, depthWrite:false }));
  sp.material.map = damageTexture(String(damage), color); sp.material.opacity = 1; sp.material.needsUpdate = true;
  sp.scale.set(3.4,1.7,1).multiplyScalar(.75 + clamp(damage/28, .4, 2) * .45);   // big hits read bigger
  sp.position.copy(point); sp.position.y += .7; sp.visible = true; scene.add(sp);
  effects.push({ mesh:sp, age:0, life:.85, vel:new THREE.Vector3((Math.random()-.5)*.6,1.6,(Math.random()-.5)*.6), kind:'label' });
}
function recycleEffect(fx){
  scene.remove(fx.mesh); fx.mesh.visible = false;
  if(fx.kind === 'ring') ringPool.push(fx.mesh);
  else { fx.mesh.material.map = null; labelPool.push(fx.mesh); }   // cached texture stays alive for reuse
}
function updateEffects(rawDt){
  for(let i=effects.length-1;i>=0;i--){
    const fx = effects[i]; fx.age += rawDt;
    if(fx.age >= fx.life){ recycleEffect(fx); effects.splice(i,1); continue; }
    const k = fx.age / fx.life;
    if(fx.kind === 'ring'){ fx.mesh.scale.setScalar(1 + k*2.2); fx.mesh.material.opacity = 1 - k; }
    else { fx.mesh.position.addScaledVector(fx.vel, rawDt); fx.mesh.material.opacity = 1 - k*k; }
  }
}
function clearRoomEffects(){
  for(const fx of effects) recycleEffect(fx);
  effects.length = 0;
}

/* ---------- player damage / death ---------- */
function flashVignette(){
  const v = document.getElementById('vig');
  v.style.opacity = 1; setTimeout(()=>v.style.opacity = 0, 180);
}
let trialCardGesture=null;
let resetTrialCardFeedback=()=>{};
function respawn(){
  resetStartupMilestones(null);
  traceArenaState('respawn-begin',{transition:{kind:'full-reset'}});
  // Respawn is a full scene reset: unlike a room transition it restores the
  // authored Arcana charge/cooldown banks to their default state.
  PC.resetArcanaRuntimeState?.({preserveResources:false});
  roomTransition?.reset();
  transitionOverlay.style.opacity = 0;
  transitionView.cameraPush = 0;
  arena.deadT = -1;
  arena.arcanaMovementLocked = false;
  arena.arcanaFacingLock = null;
  arena.arcanaUntargetable = false;
  arena.arcanaPlayerHidden = false;
  arena.arcanaInvulnerable = false;
  arena.arcanaAirborne = false;
  arena.arcanaPlayerHeight = 0;
  actorVisual.position.y = .02;
  actorPos.set(startPoint.x, startPoint.z); actorFacing = 0;
  actorRoot.position.set(startPoint.x,0,startPoint.z);
  arena.charge.active = false; arena.charge.queued = false; arena.charge.buttonHeld = false; combatState.chargePull = 0;
  combatState.attack = null; combatState.t = 0; resetChainState();
  if(wardenTrialMode){
    arena.started = false;
    arena.stanceIndex = -1;
    applyStance(null);
    arena.stamina.v = 0;
    wipeRecoverableStamina();
  }else fullRefillStamina();
  wardenTrialBrain?.reset?.();
  trialCardGesture?.reset?.();
  resetTrialCardFeedback();
  rebuildDeck();
  encounterState.reset();
  enemySystem.reset({player:{x:actorPos.x,z:actorPos.y,targetable:true,invulnerable:false}});
  clearRoomEffects();
  loadActiveRoom(dungeon.startRoomId);
  encounterState.enterRoom(dungeon.startRoomId);
  syncDoorStates();
  arena.prevHp = enemySystem.playerHp;
  arena.prevWave = enemySystem.wave;
  traceArenaState('respawn-complete',{transition:{kind:'full-reset'}});
}
function watchPlayerState(dt){
  const hp = enemySystem.playerHp;
  if(hp < arena.prevHp && arena.deadT < 0){
    PC.interruptArcanaInput?.('player-hit');
    wipeRecoverableStamina();
    arena.invulnT = Math.max(arena.invulnT, .8);
    flashVignette();
    CombatAudio.playTest('hurt');
    HitFeel.playerHurt({ dir: enemySystem.lastPlayerHitDir, damage: arena.prevHp - hp });
    shakeVel.x += (Math.random()-.5)*1.4; shakeVel.z -= 1.2; shakeVel.y -= .8;
    if(hp <= 0){ arena.deadT = 0; announce('DOWN', 2); }
  }
  arena.prevHp = hp;
  if(enemySystem.wave !== arena.prevWave){
    arena.prevWave = enemySystem.wave;
    if(arena.cycleMode){
      // director already advanced to the next mode via cycleOnWaveClear
      announce('WAVE ' + enemySystem.wave + ' · ' + modeLabel(enemySystem.director.getMode()));
    } else {
      announce('WAVE ' + enemySystem.wave);
    }
  }
}

/* ---------- input ---------- */
const input = { mx:0, mz:0 };
const keys = {};
addEventListener('keydown', e=>{
  if(e.repeat) return;
  keys[e.key.toLowerCase()] = true;
  if(wardenTrialMode){if(e.key==='p'||e.key==='m')toggleMenu();return;}
  if(e.key==='j') lightDown();
  if(e.key==='l') heavyDown();
  if(e.key==='k') defenseDown('keyboard');
  if(e.key==='q') playCard(0);
  if(e.key==='e') playCard(1);
  if(e.key==='r') startDeckShuffle();
  if(e.key==='x') cycleWeapon();
  if(e.key==='t') cycleStance();   // dev override: bypasses the card deck
  if(e.key==='p') toggleMenu();
  if(e.key==='m') toggleMenu();
});
addEventListener('keyup', e=>{
  keys[e.key.toLowerCase()] = false;
  if(e.key==='l') heavyUp();
  if(e.key==='k') defenseUp('keyboard');
  if(e.key.toLowerCase()==='q') PC.releaseArcanaInput?.({slot:0,source:'keyboard'});
  if(e.key.toLowerCase()==='e') PC.releaseArcanaInput?.({slot:1,source:'keyboard'});
});
function keyMove(){
  let x=0,z=0;
  if(keys['a']||keys['arrowleft'])x-=1;
  if(keys['d']||keys['arrowright'])x+=1;
  if(keys['w']||keys['arrowup'])z-=1;
  if(keys['s']||keys['arrowdown'])z+=1;
  const l=Math.hypot(x,z);
  return l>0?{x:x/l,z:z/l}:{x:0,z:0};
}
/* touch joystick: left half of screen */
const joy = { id:null, sx:0, sy:0, x:0, z:0 };
const joyBase=document.getElementById('joyBase'), joyKnob=document.getElementById('joyKnob');
addEventListener('pointerdown', e=>{
  if(e.target.closest('button')||e.target.closest('#panel')) return;
  if(wardenTrialMode && e.clientY >= arenaViewport.height) return;
  if(e.clientX > innerWidth*.55 || joy.id!==null) return;
  joy.id=e.pointerId; joy.sx=e.clientX; joy.sy=e.clientY;
  joyBase.style.display='block';
  joyBase.style.left=(e.clientX-52)+'px'; joyBase.style.top=(e.clientY-52)+'px';
  joyKnob.style.display='block';
  joyKnob.style.left=(e.clientX-23)+'px'; joyKnob.style.top=(e.clientY-23)+'px';
});
addEventListener('pointermove', e=>{
  if(e.pointerId!==joy.id) return;
  let dx=e.clientX-joy.sx, dy=e.clientY-joy.sy;
  const l=Math.hypot(dx,dy), max=52;
  if(l>max){ dx*=max/l; dy*=max/l; }
  joy.x=dx/max; joy.z=dy/max;
  joyKnob.style.left=(joy.sx+dx-23)+'px'; joyKnob.style.top=(joy.sy+dy-23)+'px';
});
function endJoy(e){
  if(e.pointerId!==joy.id) return;
  joy.id=null; joy.x=0; joy.z=0;
  joyBase.style.display='none'; joyKnob.style.display='none';
}
addEventListener('pointerup', endJoy);
addEventListener('pointercancel', endJoy);
/* touch buttons */
const atkBtn=document.getElementById('atkBtn'), heavyBtn=document.getElementById('heavyBtn');
atkBtn.addEventListener('pointerdown', e=>{ e.preventDefault(); atkBtn.classList.add('held'); lightDown(); });
for(const ev of ['pointerup','pointercancel','pointerleave'])
  atkBtn.addEventListener(ev, ()=>{ atkBtn.classList.remove('held'); });
heavyBtn.addEventListener('pointerdown', e=>{ e.preventDefault(); heavyBtn.classList.add('held'); heavyDown(); });
for(const ev of ['pointerup','pointercancel','pointerleave'])
  heavyBtn.addEventListener(ev, ()=>{ heavyBtn.classList.remove('held'); heavyUp(); });
/* gamepad */
const padPrev = {};
const padMove = { x:0, z:0 };
function pollPad(){
  const gp = navigator.getGamepads?.()[0];
  if(!gp)return;
  const pad=readPlayStationBackboneInput(gp,padPrev);
  const padActions=resolvePlayStationBackboneActions(pad);
  const dz = v => Math.abs(v)>.16?v:0;
  let mx = dz(gp.axes[0]||0), mz = dz(gp.axes[1]||0);
  // D-pad left/right remain movement; up/down are reserved for weapon testing.
  if(pad.current.dpadLeft)mx-=1;if(pad.current.dpadRight)mx+=1;
  const l=Math.hypot(mx,mz);
  if(l>1){mx/=l;mz/=l;}
  padMove.x=mx;padMove.z=mz;
  stanceGate5Runtime?.recordGamepad?.(pad,padActions);
  // Defense wins a same-frame Android/Backbone alias conflict.
  if(padActions.defensePressed)defenseDown(padActions.defenseSource);
  if(padActions.lightPressed)lightDown();
  if(pad.pressed.triangle)heavyDown();
  if(pad.released.triangle)heavyUp();
  if(padActions.defenseReleased)defenseUp('gamepad');
  if(pad.pressed.circle)startDeckShuffle();
  if(pad.pressed.l1)playCard(0);
  if(pad.pressed.r1)playCard(1);
  if(pad.released.l1)PC.releaseArcanaInput?.({slot:0,source:'gamepad'});
  if(pad.released.r1)PC.releaseArcanaInput?.({slot:1,source:'gamepad'});
  if(pad.pressed.dpadUp)cycleWeapon(-1);
  if(pad.pressed.dpadDown)cycleWeapon(1);
  if(pad.pressed.options||pad.pressed.create)toggleMenu();
  Object.assign(padPrev,pad.current,{__rawDown:[...pad.rawDown]});
}
function gatherInput(){
  const k = keyMove();
  const pm = Math.hypot(padMove.x,padMove.z);
  const jm = Math.hypot(joy.x,joy.z);
  if(pm>.08){ input.mx=padMove.x; input.mz=padMove.z; }
  else if(jm>.08){ input.mx=joy.x; input.mz=joy.z; }
  else { input.mx=k.x; input.mz=k.z; }
}

function updateWardenTrialAI(dt){
  if(!wardenTrialBrain)return;
  const decision=wardenTrialBrain.update(dt,{
    player:{x:actorPos.x,z:actorPos.y},
    enemies:combatHostileEnemies(),
    weapon:PC.currentWeapon?.(),
    stamina:arena.stamina.v,
    attackActive:!!combatState.attack,
  });
  const centerSample=wardenTrialCenterField?.sample({x:actorPos.x,z:actorPos.y},PLAYER_RADIUS);
  const move=(!decision.action&&!combatState.attack&&centerSample)
    ?blendWardenTrialCenterMovement(decision.move,centerSample,{
      bias:WARDEN_TRIAL_SETTINGS.centerField.wardenBias,
    })
    :decision.move;
  input.mx=Number(move?.x)||0;input.mz=Number(move?.z)||0;
  if(decision.spawnWave){
    configureWardenTrialWave();enemySystem.startRoomEncounter(activeRoomId);
    announce('NEXT WAVE',.7);return;
  }
  if(decision.action==='light')lightDown();
  else if(decision.action==='heavy-down')heavyDown();
  else if(decision.action==='heavy-up')heavyUp();
  else if(decision.action==='dodge'){
    input.mx=Number(decision.dodgeMove?.x)||0;input.mz=Number(decision.dodgeMove?.z)||0;
    defenseDown('warden-ai');
  }
}

/* ---------- UI ---------- */
const panel=document.getElementById('panel');
const menuBtn=document.getElementById('menuBtn');
const resumeBtn=document.getElementById('resumeBtn');
const themeButtons=[...document.querySelectorAll('[data-arena-theme-option]')];
const trialEnemyButtons=[...document.querySelectorAll('[data-trial-enemy-set]')];
const trialWeaponButtons=[...document.querySelectorAll('[data-trial-weapon]')];
function syncMenuButton(){ menuBtn.textContent = panel.classList.contains('hidden') ? 'MENU' : 'RESUME'; }
function syncThemeButtons(){
  themeButtons.forEach(button=>{
    const active=button.dataset.arenaThemeOption===arenaTheme.id;
    button.classList.toggle('on',active);
    button.setAttribute('aria-pressed',String(active));
  });
}
function selectArenaThemeFromMenu(id){
  const storage=(()=>{try{return globalThis.localStorage;}catch{return null;}})();
  const location=globalThis.location;
  const selectArenaTheme=arenaThemeRegistry.selectArenaTheme;
  if(typeof selectArenaTheme!=='function')throw new Error('Arena theme selection API is unavailable.');
  return selectArenaTheme(id,{storage,location});
}
function syncTrialEnemyButtons(){
  trialEnemyButtons.forEach(button=>{
    const active=button.dataset.trialEnemySet===wardenTrialEnemySet;
    button.classList.toggle('on',active);
    button.setAttribute('aria-pressed',String(active));
  });
}
function syncTrialWeaponButtons(){
  trialWeaponButtons.forEach(button=>{
    const active=button.dataset.trialWeapon===combatState.weapon;
    button.classList.toggle('on',active);
    button.setAttribute('aria-pressed',String(active));
  });
}
function selectWardenTrialEnemySet(value){
  if(!wardenTrialMode)return false;
  wardenTrialEnemySet=normalizeWardenTrialEnemySet(value);
  StoneSettings.set('wardenTrial.enemySet',wardenTrialEnemySet);
  syncTrialEnemyButtons();
  const selected=configureWardenTrialWave();
  respawn();
  announce(selected.label,.9);
  return true;
}
function selectWardenTrialWeapon(value){
  if(!wardenTrialMode||roomTransition?.active)return false;
  const next=normalizeStoneWeaponId(value);
  if(!WEAPON_ORDER.includes(next))return false;
  if(next!==combatState.weapon){
    PC.selectCombatWeapon(next);
    StoneSettings.set('arena.weapon',next);
    respawn();
    announce(WEAPONS[next]?.label||next,.9);
  }
  syncTrialWeaponButtons();
  if(!panel.classList.contains('hidden'))toggleMenu();
  return true;
}
function toggleMenu(){
  const opening = panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !opening);
  arena.paused = opening;
  syncMenuButton();
  emitRuntime({type:'menu',open:opening});
}
function isPaused(){ return !arena.started || arena.paused || !panel.classList.contains('hidden'); }
const startGate=document.getElementById('startGate');
const trialCard=document.getElementById('trialCard');
const trialCardStatus=document.getElementById('trialCardStatus');
const trialBadge=document.getElementById('trialBadge');
let trialCardDirection='neutral';
function trialCardName(card){
  return String(card?.name||card?.id||'NO CARD').replace(/^S\d+\s*/,'').toUpperCase();
}
function currentTrialCardSlot(){
  if(deck.hand[0])return 0;
  if(deck.hand[1])return 1;
  return -1;
}
function currentTrialCard(){
  const slot=currentTrialCardSlot();
  return slot>=0?deck.hand[slot]:null;
}
function renderTrialCard(){
  if(!wardenTrialMode||!trialCard)return;
  const card=currentTrialCard();
  const name=trialCardName(card);
  const staminaCard=isWardenTrialStaminaCard(card,{weaponId:combatState.weapon,deckCards:deck.pool});
  const art=trialCard.querySelector('.trialCardArt');
  trialCard.dataset.cardId=card?.id||'';
  trialCard.setAttribute('aria-label',card
    ? `${name} card; swipe upward for inert registration or downward to ${staminaCard?'play and restore stamina':'play'}`
    : 'No trial card available');
  if(art){
    art.textContent=name;
    art.dataset.length=name.length>14?'long':'short';
  }
  if(trialBadge){
    const weaponLabel=WEAPONS[combatState.weapon]?.label||combatState.weapon||'UNKNOWN WEAPON';
    trialBadge.textContent=`${weaponLabel.toUpperCase()} · ${name} · ${arena.started?'AUTONOMOUS':'READY'}`;
  }
  if(trialCardStatus&&trialCardDirection==='neutral'){
    trialCardStatus.textContent=card
      ? (arena.started?'':`SWIPE DOWN TO START · ${name}`)
      : 'NO TRIAL CARD';
  }
}
function setTrialCardFeedback(direction='neutral',message=''){
  trialCardDirection=direction==='up'||direction==='down'?direction:'neutral';
  if(trialCard)delete trialCard.dataset.direction;
  if(trialCardStatus&&trialCardDirection==='neutral')trialCardStatus.textContent=message||'';
  if(trialCardDirection==='neutral')renderTrialCard();
  emitRuntime({type:'trial-card-direction',direction:trialCardDirection});
}
resetTrialCardFeedback=()=>setTrialCardFeedback('neutral');
function playWardenTrialCardDown(){
  if(!wardenTrialMode||arena.deadT>=0||roomTransition?.active)return false;
  const slot=currentTrialCardSlot(), card=slot>=0?deck.hand[slot]:null;
  if(!card){setTrialCardFeedback('down','NO TRIAL CARD');return false;}
  const decision=resolveWardenTrialCardPlay({
    direction:'down',
    started:arena.started,
    card,
    weaponId:combatState.weapon,
    deckCards:deck.pool,
    stamina:arena.stamina.v,
    maxStamina:STAMINA.max,
  });
  if(!decision.accepted){
    setTrialCardFeedback('down',decision.reason==='starter-card-required'?'STARTER CARD REQUIRED':'CARD NOT READY');
    announce('STARTER CARD REQUIRED',.8);
    return false;
  }
  const wasWaiting=!arena.started;
  const played=deck.play(slot);
  if(!played){setTrialCardFeedback('down','CARD NOT READY');return false;}
  const pool=stancePoolForWeapon();
  const index=pool.findIndex(stance=>stance.id===played.id);
  if(index>=0)setStance(index);
  else applyStance(played);
  if(decision.refill)fullRefillStamina();
  if(wasWaiting){
    arena.started=true;
    arena.paused=false;
    startGate?.classList.add('hidden');
  }
  renderCards();
  setTrialCardFeedback('down',wasWaiting?'DOWN REGISTERED · TRIAL STARTED':decision.refill?'DOWN REGISTERED · STAMINA RESTORED':`DOWN REGISTERED · ${trialCardName(played)}`);
  announce(trialCardName(played),.9);
  return true;
}
if(wardenTrialMode&&trialCard){
  trialCardGesture=installWardenTrialSwipeSurface({
    target:document,
    visualElement:trialCard,
    enabled:()=>!arena.paused&&arena.deadT<0&&!roomTransition?.active,
    startGuard:event=>{
      const startY=Number(event?.clientY)||0;
      if(startY < (Number(innerHeight)||1)*.2)return false;
      if(event?.target?.closest?.('#topBar,#panel'))return false;
      return true;
    },
    onDirection:direction=>direction==='down'?playWardenTrialCardDown():setTrialCardFeedback('up'),
  });
}
menuBtn.addEventListener('click', toggleMenu);
resumeBtn?.addEventListener('click', ()=>{ if(!panel.classList.contains('hidden'))toggleMenu(); });
themeButtons.forEach(button=>button.addEventListener('click',()=>selectArenaThemeFromMenu(button.dataset.arenaThemeOption)));
trialEnemyButtons.forEach(button=>button.addEventListener('click',()=>selectWardenTrialEnemySet(button.dataset.trialEnemySet)));
trialWeaponButtons.forEach(button=>button.addEventListener('click',()=>selectWardenTrialWeapon(button.dataset.trialWeapon)));
syncThemeButtons();
syncTrialEnemyButtons();
syncTrialWeaponButtons();
document.getElementById('startBtn').addEventListener('click', ()=>{
  if(wardenTrialMode)return;
  arena.started = true;
  startGate.classList.add('hidden');
  resetTrialCardFeedback();
});
const fsBtn=document.getElementById('fsBtn'), sgFsBtn=document.getElementById('sgFsBtn');
function inFullscreen(){ return !!(document.fullscreenElement||document.webkitFullscreenElement); }
function toggleFullscreen(){
  if(!inFullscreen()){ const el=document.documentElement; (el.requestFullscreen||el.webkitRequestFullscreen)?.call(el); }
  else { (document.exitFullscreen||document.webkitExitFullscreen)?.call(document); }
}
fsBtn.addEventListener('click', toggleFullscreen);
sgFsBtn.addEventListener('click', toggleFullscreen);
function syncFsButtons(){
  const active = inFullscreen();
  fsBtn.textContent = active?'⤢':'⛶';
  fsBtn.title = active?'Exit fullscreen':'Enter fullscreen';
  fsBtn.setAttribute('aria-label', fsBtn.title);
  sgFsBtn.textContent = active?'⤢ EXIT FULLSCREEN':'⛶ FULLSCREEN';
}
document.addEventListener('fullscreenchange', ()=>{ syncFsButtons(); syncArenaViewport(); });
document.addEventListener('webkitfullscreenchange', ()=>{ syncFsButtons(); syncArenaViewport(); });
syncFsButtons();
document.getElementById('resetBtn').addEventListener('click', ()=>{
  respawn();
  if(!panel.classList.contains('hidden'))toggleMenu();
});
const CYCLE_MODE_ID = 'cycle';
function modeLabel(id){ return DIRECTOR_MODES.find(m=>m.id===id)?.label || id; }
function setMode(id, { reset = true } = {}){
  arena.cycleMode = (id === CYCLE_MODE_ID);
  enemySystem.setCycleOnWaveClear(arena.cycleMode);
  if(!arena.cycleMode) enemySystem.setDirectorMode(id);
  StoneSettings.set('arena.directorMode', id);
  if(reset) respawn();
}
function setCombatInputMode(id, { reset = true } = {}){
  const next = getCombatInputMode(id);
  arena.combatInputMode = next.id;
  StoneSettings.set('arena.combatInputMode', next.id);
  resetChainState();
  if(reset) respawn();
  if(reset) announce(next.label, .9);
}
/* Enemy Lab receives these descriptors through the typed control registry. */
const SPAWN_OPTIONS = Object.freeze([
  { id:'mixed', label:'Mixed Pure Strains' },
  { id:'goblins', label:'Goblins Only' },
  ...ARENA_ENEMY_OPTIONS
]);
const lockedEncounterMode=lockedStandard?.profile?.workspace?.settings?.['scenario.encounterId']||
  lockedStandard?.profile?.workspace?.scenario?.encounterMode||'';
const bootSpawnKind=wardenTrialMode?'trialDot':lockedEncounterMode||StoneSettings.get('arena.spawnKind', enemySystem.spawnKind);
enemySystem.setSpawnKind(bootSpawnKind);
const DIR_SLIDERS = [
  { label:'WAVE SIZE',       min:1,  max:12,  step:1,   get:()=>enemySystem.waveSize,       set:v=>enemySystem.setWaveSize(v) },
  { label:'PRESSURE BUDGET', min:.5, max:4,   step:.25, get:()=>enemySystem.director.settings.pressureBudget, set:v=>enemySystem.setPressureBudget(v) },
  { label:'AGGRESSION',      min:.25,max:3,   step:.05, get:()=>enemySystem.aggression,     set:v=>enemySystem.setAggression(v) },
  { label:'ENEMY SPEED',     min:.25,max:1.5, step:.05, get:()=>enemySystem.speedScale,     set:v=>enemySystem.setSpeedScale(v) },
  { label:'ENEMY HEALTH',    min:.25,max:5,   step:.05, get:()=>enemySystem.hpScale,        set:v=>enemySystem.setHpScale(v) },
  { label:'ENEMY SIZE',      min:1,  max:3.5, step:.1,  get:()=>enemySystem.heightScale,    set:v=>enemySystem.setHeightScale(v) },
  { label:'IDLE RANGE',      min:1,  max:6,   step:.25, get:()=>enemySystem.idleRangeScale, set:v=>enemySystem.setIdleRangeScale(v) },
];
let selKey='HAYMAKER';
let selectedEncounterMode='lab-direct';
let encounterModeWarning='';

const LAB_DIRECT_ENCOUNTER_MODE='lab-direct';
const PLANNED_ENCOUNTER_MODE_IDS=new Set(ARENA_ENEMY_OPTIONS.map(option=>option.id));
const encounterModeLabel=id=>id===LAB_DIRECT_ENCOUNTER_MODE
  ?'Direct Lab Composition'
  :(ARENA_ENEMY_OPTIONS.find(option=>option.id===id)?.label||id);
if(PLANNED_ENCOUNTER_MODE_IDS.has(bootSpawnKind))selectedEncounterMode=bootSpawnKind;
traceArenaState('systems-ready');

function selectEncounterMode(id){
  const requested=String(id||'').trim();
  if(requested===LAB_DIRECT_ENCOUNTER_MODE){
    const changed=selectedEncounterMode!==requested;
    selectedEncounterMode=requested;
    encounterModeWarning='';
    traceArenaState('encounter-select-'+(changed?'applied':'noop'),{encounter:{requestedMode:requested,changed}});
    return{ok:true,mode:selectedEncounterMode,changed,label:encounterModeLabel(selectedEncounterMode)};
  }
  if(!PLANNED_ENCOUNTER_MODE_IDS.has(requested))return{ok:false,mode:selectedEncounterMode,reason:`Unknown encounter mode: ${requested||'(empty)'}`};
  if(requested===WORKING_ROSTER_HADES_ID){
    const rosterStatus=enemySystem.getWorkingRosterEncounterStatus?.();
    if(!rosterStatus?.ids?.length){
      enemySystem.setSpawnKind?.(ALL_ENEMIES_BUDGET_ID);
      selectedEncounterMode=ALL_ENEMIES_BUDGET_ID;
      encounterModeWarning='Working roster is empty; using All · Budgeted Encounter. Configure the roster to enable roster planning.';
      traceArenaState('encounter-select-fallback',{encounter:{requestedMode:requested,changed:true,reason:'roster-empty'}});
      return{ok:false,mode:selectedEncounterMode,reason:'roster-empty',warning:encounterModeWarning,label:encounterModeLabel(selectedEncounterMode)};
    }
  }
  if(requested===selectedEncounterMode&&enemySystem.spawnKind===requested){
    encounterModeWarning='';
    traceArenaState('encounter-select-noop',{encounter:{requestedMode:requested,changed:false}});
    return{ok:true,mode:selectedEncounterMode,changed:false,label:encounterModeLabel(selectedEncounterMode)};
  }
  enemySystem.setSpawnKind?.(requested);
  const actual=enemySystem.spawnKind;
  if(requested===WORKING_ROSTER_HADES_ID&&actual!==requested){
    selectedEncounterMode=ALL_ENEMIES_BUDGET_ID;
    encounterModeWarning='Working roster is unavailable; using All · Budgeted Encounter.';
    traceArenaState('encounter-select-fallback',{encounter:{requestedMode:requested,changed:true,reason:'roster-unavailable'}});
    return{ok:false,mode:selectedEncounterMode,reason:'roster-unavailable',warning:encounterModeWarning,label:encounterModeLabel(selectedEncounterMode)};
  }
  selectedEncounterMode=requested;
  encounterModeWarning='';
  traceArenaState('encounter-select-applied',{encounter:{requestedMode:requested,changed:true}});
  return{ok:true,mode:selectedEncounterMode,changed:true,label:encounterModeLabel(selectedEncounterMode)};
}

function showRosterPlanDiagnostic({roomId=null,plan=null,error=null}={}){
  if(selectedEncounterMode!==WORKING_ROSTER_HADES_ID)return null;
  const status=enemySystem.getWorkingRosterEncounterStatus?.()||{};
  const ids=Array.isArray(status.ids)?status.ids:[];
  if(!ids.length)return null;
  const groups=Array.isArray(plan?.groups)?plan.groups:[];
  const hasEntries=groups.some(group=>Number(group?.count)>0);
  const hasTypes=Array.isArray(plan?.typeIds)&&plan.typeIds.length>0;
  if(!error&&plan&&groups.length&&hasEntries&&hasTypes)return null;
  const reason=String(error?.message||(!plan?'planner-did-not-produce-a-plan':!groups.length||!hasEntries?'empty-plan':!hasTypes?'plan-has-no-types':'planner-produced-an-invalid-plan')).replace(/\s+/g,' ').trim();
  const director=String(enemySystem.director?.getMode?.()||enemySystem.director?.mode||'unknown');
  const message='ROSTER PLAN FAILED · source='+selectedEncounterMode+' ('+encounterModeLabel(selectedEncounterMode)+')'+
    ' · roster='+ids.length+' · director='+director+' · reason='+reason;
  encounterModeWarning=message;
  announce(message,6);
  traceArenaState('roster-plan-failed',{
    encounter:{roomId,reason,plan:summarizePlan(plan)},
    roster:{source:lockedStandard?'locked-standard':'working-roster-storage',count:ids.length,ids:[...ids]},
    director:{mode:director},
    diagnostic:message,
  });
  return{reason,message};
}

function startPlannedLabEncounter(mode=selectedEncounterMode,{roomId=-777}={}){
  const selection=selectEncounterMode(mode);
  if(!selection.ok)return selection;
  if(selection.mode===LAB_DIRECT_ENCOUNTER_MODE)return{ok:false,mode:selection.mode,reason:'Direct Lab Composition uses startLabScenario with an explicit focal plan.'};
  try{
    enemySystem.clearRoomRuntime?.();
    enemySystem.startRoomEncounter?.(roomId);
    const plan=enemySystem.currentEncounterPlan||null;
    if(!plan)return{ok:false,mode:selection.mode,reason:'The planner did not produce an encounter plan.'};
    return{ok:true,mode:selection.mode,plan};
  }catch(error){
    return{ok:false,mode:selection.mode,reason:error?.message||'The planned encounter could not start.'};
  }
}

/* ---------- HUD ---------- */
const hpFill=document.getElementById('hpFill');
const stWrap=document.getElementById('stWrap'), stFill=document.getElementById('stFill'), stPending=document.getElementById('stPending');
/* stance card widgets */
const cardEls=[document.getElementById('card0'), document.getElementById('card1')];
const shuffleBtn=document.getElementById('shuffleBtn');
const drawQueue=document.getElementById('drawQueue'), queuedCardEls=[...drawQueue.querySelectorAll('.queuedCard')];
const atkArrow=document.getElementById('atkArrow'), heavyArrow=document.getElementById('heavyArrow');
const cardAnim = { played:-1, drawn:new Set(), queueShift:false };
function markCardAnimation(slot){ cardAnim.played = slot; cardAnim.drawn.add(slot); cardAnim.queueShift = true; }
cardEls.forEach((el,i)=>el.addEventListener('animationend', e=>{
  if(e.animationName === 'cardRing') el.classList.remove('played');
  if(e.animationName === 'cardDrawIn'){ el.classList.remove('draw-in'); cardAnim.drawn.delete(i); }
}));
drawQueue.addEventListener('animationend', ()=>drawQueue.classList.remove('shift-down'));
function renderCards(){
  deck.hand.forEach((c,i)=>{
    const el=cardEls[i];
    el.classList.toggle('empty', !c);
    el.classList.toggle('played', cardAnim.played === i);
    el.classList.toggle('draw-in', cardAnim.drawn.has(i));
    const light = el.querySelector('.cardLight'), heavy = el.querySelector('.cardHeavy');
    light.textContent = c ? c.chain.slice(0,2).map(key=>moveArrow(PC.ATTACKS[key] || {})).join(' ') : '· ·';
    heavy.textContent = c ? moveArrow(PC.ATTACKS[c.chain[2]] || {}) : '·';
  });
  const upcoming = [...deck.upcoming].reverse();
  const queueOffset = queuedCardEls.length - upcoming.length;
  queuedCardEls.forEach((el,i)=>{
    const c = i >= queueOffset ? upcoming[i - queueOffset] : null;
    el.classList.toggle('filled', !!c);
    el.dataset.cardId = c?.id || '';
    el.setAttribute('aria-label', c ? `Upcoming ${c.name.replace(/^S\d+\s*/,'')}` : 'Empty draw slot');
  });
  if(cardAnim.queueShift){
    drawQueue.classList.remove('shift-down');
    void drawQueue.offsetWidth;
    drawQueue.classList.add('shift-down');
    cardAnim.queueShift = false;
  }
  setTxt(shuffleBtn, deck.shuffling ? '…' : '↻');
  cardAnim.played = -1;
  renderTrialCard();
}
window.addEventListener('stance-deck:changed',()=>renderCards());
cardEls.forEach((el,i)=>{
  el.addEventListener('pointerdown', e=>{ e.preventDefault();el.setPointerCapture?.(e.pointerId);playCard(i); });
  for(const eventName of ['pointerup','pointercancel','pointerleave'])el.addEventListener(eventName,()=>PC.releaseArcanaInput?.({slot:i,source:'pointer'}));
});
document.getElementById('shuffleBtn').addEventListener('pointerdown', e=>{ e.preventDefault(); startDeckShuffle(); });
const msgEl=document.getElementById('msg');
let msgT=0;
function announce(text, sec=1.2){ msgEl.textContent=text; msgEl.style.opacity=1; msgT=sec; }
// dirty-checked DOM writers: skip redundant style/text/class updates each frame
function setStyleProp(el,k,v){ if(el['__'+k]!==v){ el['__'+k]=v; el.style[k]=v; } }
function setTxt(el,v){ if(el.__txt!==v){ el.__txt=v; el.textContent=v; } }
function setTgl(el,cls,on){ if(el['__c_'+cls]!==on){ el['__c_'+cls]=on; el.classList.toggle(cls,on); } }
function updateAttackPreviews(){
  const lightMoves = [chainMove(0), chainMove(1)], heavyMove = chainMove(2);
  setTxt(atkArrow, lightMoves.map(move=>moveArrow(move?.att || {})).join(' '));
  setTxt(heavyArrow, moveArrow(heavyMove?.att || {}));
  const mode = combatInputMode();
  const followup = combatState.attack
    ? (mode.id === 'legacy'
      ? lightFollowupForStage(arena.chain.stage)
      : lightFollowupForActiveMove({ activeSlot:arena.chain.activeSlot, stage:arena.chain.stage, mode }))
    : null;
  const hitAllowsLink = !mode.requireHitToLink || (combatState.hitIds?.size || 0) > 0;
  const canBufferLight = !!combatState.attack && !!followup && hitAllowsLink;
  const lightDisabled = arena.deadT >= 0 || arena.dodge.t >= 0 || arcanaDashBusy() || arena.arcanaMovementLocked || arena.chain.inputLockT > 0
    || (mode.postSecondLock && (arena.chain.lightLockT > 0 || arena.chain.stage === 'finisher'))
    || (!!combatState.attack && !canBufferLight);
  const canBufferHeavy = !!combatState.attack && mode.allowHeavyBuffer
    && (arena.chain.activeSlot === 0 || arena.chain.activeSlot === 1);
  const heavyDisabled = arena.deadT >= 0 || arena.dodge.t >= 0 || arcanaDashBusy() || arena.arcanaMovementLocked || arena.chain.inputLockT > 0
    || (!!combatState.attack && !canBufferHeavy);
  setTgl(atkBtn, 'disabled', lightDisabled);
  setTgl(heavyBtn, 'disabled', heavyDisabled);
}
function updateHud(rawDt){
  setStyleProp(hpFill, 'width', clamp(enemySystem.playerHp,0,100)+'%');
  const availPct = clamp(arena.stamina.v / STAMINA.max, 0, 1) * 100;
  const totalPct = clamp((arena.stamina.v + arena.stamina.pending) / STAMINA.max, 0, 1) * 100;
  setStyleProp(stFill, 'width', availPct + '%');
  setStyleProp(stPending, 'left', availPct + '%');
  setStyleProp(stPending, 'width', Math.max(0, totalPct - availPct) + '%');
  setTxt(shuffleBtn, deck.shuffling ? Math.max(0, deck.shuffleT).toFixed(1) : '↻');
  updateAttackPreviews();
  if(msgT>0){ msgT-=rawDt; if(msgT<=0) msgEl.style.opacity=0; }
}

/* ---------- camera ---------- */
const camFollow = new THREE.Vector3(0,0,0);
function updateCamera(rawDt){
  if(wardenTrialMode)camFollow.set(startPoint.x,0,startPoint.z);
  else{
    camFollow.x += (actorPos.x - camFollow.x)*Math.min(1, rawDt*5);
    camFollow.z += (actorPos.y - camFollow.z)*Math.min(1, rawDt*5);
  }
  shakeVel.addScaledVector(shake,-140*rawDt).addScaledVector(shakeVel,-12*rawDt);
  shake.addScaledVector(shakeVel,rawDt);
  // hit-feel layers: random jitter, directional kick, zoom punch toward the action
  const j = HitFeel.jitter, kick = HitFeel.camKick, zk = HitFeel.zoomKick;
  const doorPush = transitionView.cameraPush;
  keyTarget.position.set(camFollow.x, 0, camFollow.z);
  key.position.set(camFollow.x - 14, 26, camFollow.z + 12);
  rim.position.set(camFollow.x + 16, 9, camFollow.z - 14);
  camera.position.set(
    camFollow.x + shake.x + (Math.random()*2-1)*j + kick.x,
    CAM_HEIGHT - doorPush*3.4 - zk*2.2 + shake.y + (Math.random()*2-1)*j*.4,
    camFollow.z + CAM_BACK - doorPush*5.2 - zk*2.4 + shake.z + (Math.random()*2-1)*j + kick.z);
  camera.lookAt(camFollow.x+shake.x*.5, CAMERA_LOOK_HEIGHT, camFollow.z+CAMERA_LOOK_BACK_OFFSET+shake.z*.5);
}

/* ---------- main update ---------- */
function updatePlayer(dt, rawDt = dt, simulationNow = performance.now()/1000){
  const d = arena.dodge;
  if(arena.deadT >= 0){
    arena.deadT += dt;
    if(arena.deadT > 2.4) respawn();
    return;
  }
  const moveStart = { x:actorPos.x, z:actorPos.y };
  arena.invulnT = Math.max(0, arena.invulnT - dt);
  d.cool = Math.max(0, d.cool - dt);
  updateChainTimers(dt,simulationNow);
  updateStamina(dt);

  let spd = PLAYER_SPEED;
  if(arena.charge.active) spd *= CHARGE_MOVE_MULT;
  else if(combatState.attack) spd *= PC.combatMovePenalty();

  const isMoving = !arena.arcanaMovementLocked && !arena.arcanaUntargetable && !arena.arcanaAirborne && Math.hypot(input.mx, input.mz) > .01;
  if(d.t >= 0){
    d.t += dt;
    const u = clamp(d.t/DODGE_TIME, 0, 1);
    const v = DODGE_SPEED * (1 - (1-Math.pow(1-u,3)));
    actorPos.x += d.dirX*v*dt; actorPos.y += d.dirZ*v*dt;
    if(d.t > DODGE_TIME) d.t = -1;
  } else if(isMoving){
    actorPos.x += input.mx*spd*dt; actorPos.y += input.mz*spd*dt;
    walkPhase += dt*8;
  }
  // root-motion lunge while the strike phase is live
  if(combatState.attack && !arena.charge.active){
    const att = combatState.attack;
    if(combatState.t > att.phases[0].t1 && combatState.t < att.contactAt + .12){
      const rate = LUNGE_RATE * arena.swing.lunge;
      actorPos.x += Math.sin(actorFacing)*rate*dt;
      actorPos.y += Math.cos(actorFacing)*rate*dt;
    }
  }
  const resolvedMove = mazeNavigation.resolveMovement(
    moveStart,
    { x:actorPos.x - moveStart.x, z:actorPos.y - moveStart.z },
    PLAYER_RADIUS
  );
  actorPos.set(resolvedMove.x, resolvedMove.z);

  // facing: desired blended toward the committed swing yaw
  let goal;
  if(d.t >= 0) goal = Math.atan2(d.dirX, d.dirZ);
  else {
    const desired = resolveDesiredFacing();
    goal = combatState.attack
      ? lerpAngle(desired.angle, combatState.commitYaw ?? desired.angle, attackCommitWeight())
      : desired.angle;
  }
  actorFacing = wrapPi(actorFacing + wrapPi(goal - actorFacing)*Math.min(1, dt*12));
  const turnMix = 1 - Math.pow(0.0001, dt);
  actorYawCurrent = Math.atan2(
    lerp(Math.sin(actorYawCurrent), Math.sin(actorFacing), turnMix),
    lerp(Math.cos(actorYawCurrent), Math.cos(actorFacing), turnMix)
  );
  yawQ.setFromAxisAngle(Y_AXIS, actorYawCurrent);

  actorRoot.position.set(actorPos.x, 0, actorPos.y);
  actorVisual.quaternion.copy(yawQ);
  const bob = isMoving && d.t < 0 ? Math.sin(walkPhase)*.035 : 0;
  const sway = isMoving && d.t < 0 ? Math.sin(walkPhase*.5)*.03 : 0;
  actorVisual.position.y = 0.02 + bob + Math.max(0,Number(arena.arcanaPlayerHeight)||0);
  // hurt blink
  actorVisual.visible = !arena.arcanaPlayerHidden && !(arena.invulnT > .45 && Math.floor(simulationNow*1000/90)%2===0);

  updateCharge(dt);
  PC.updateCombat(dt, simulationNow, sway, rawDt);
  stanceGate5Runtime?.update?.(dt);
}

const clock = new THREE.Clock();
function advanceArenaSimulation(rawDt,{capture=false,simulationNow=performance.now()/1000,updateEnemies=true}={}){
  // global hitstop/slow-mo: game logic runs on the frozen dt, effects + camera
  // + HUD keep animating on rawDt so the freeze reads as impact, not lag
  const dt = HitFeel.update(rawDt);
  if(!capture&&!wardenTrialMode){pollPad();gatherInput();}
  if(capture||!isPaused()){
    if(roomTransition.active){
      updateRoomTransition(rawDt);
    } else {
      const wasShuffling = deck.shuffling;
      deck.update(dt);
      if(wasShuffling && !deck.shuffling){ cardAnim.drawn.add(0); cardAnim.drawn.add(1); renderCards(); }   // countdown done: fresh hand
      if(wardenTrialMode)updateWardenTrialAI(dt);
      updatePlayer(dt, rawDt, simulationNow);
      const activeCell = findCellAtPoint(dungeon, { x:actorPos.x, z:actorPos.y }, HEX_SIZE);
      if(activeCell && activeCell.roomId !== activeRoomId){
        const door = findTransitionDoor(activeCell.roomId);
        if(door) beginRoomTransition(door, activeCell.roomId);
      }
      if(!roomTransition.active){
        if(updateEnemies){
          enemySystem.update(dt, {
            x: actorPos.x, z: actorPos.y,
            targetable:!arena.arcanaUntargetable,
            invulnerable: arena.invulnT > 0 || arena.dodge.t >= 0 || arena.deadT >= 0 || arena.arcanaInvulnerable
          });
          watchPlayerState(rawDt);
        }
        PC.wizardNextTwentyDashRuntime?.postEnemyUpdate?.();
        PC.wizardFusionLeapRuntime?.postEnemyUpdate?.();
      }
    }
  }
  mazeWorld.update(rawDt);
  updateEffects(rawDt);
  updateCamera(rawDt);
  updateHud(rawDt);
}
function renderArena(){
  const hiddenCaptureTrails=[];
  if(ABILITY_CAPTURE_CLEAN)scene.traverse(object=>{
    if(!object?.isMesh||object.frustumCulled!==false||!object.geometry?.getAttribute?.('color')||object.material?.vertexColors!==true||!object.visible)return;
    hiddenCaptureTrails.push(object);object.visible=false;
  });
  renderer.render(scene, camera);
  for(const object of hiddenCaptureTrails)object.visible=true;
  accordionEnemyOverlay?.render({enemies:enemySystem.enemies,now:performance.now()});
}
function arenaMoveInput(){return{x:Number(input.mx)||0,z:Number(input.mz)||0};}
function setArcanaMovementLock(locked=true){arena.arcanaMovementLocked=!!locked;return arena.arcanaMovementLocked;}
function setArcanaFacingLock(direction=null){
  const x=Number(direction?.x??direction?.forwardX)||0,z=Number(direction?.z??direction?.forwardZ)||0,length=Math.hypot(x,z);
  if(!direction||length<1e-6){arena.arcanaFacingLock=null;return null;}
  const lock={x:x/length,z:z/length,angle:Math.atan2(x,z)};
  arena.arcanaFacingLock=lock;actorFacing=lock.angle;actorYawCurrent=lock.angle;
  yawQ.setFromAxisAngle(Y_AXIS,lock.angle);actorVisual.quaternion.copy(yawQ);
  return{...lock};
}
function setArcanaTargetable(targetable=true){arena.arcanaUntargetable=!targetable;return!arena.arcanaUntargetable;}
function setArcanaPlayerVisible(visible=true){arena.arcanaPlayerHidden=!visible;actorVisual.visible=!!visible;return!arena.arcanaPlayerHidden;}
function setArcanaPlayerInvulnerable(invulnerable=true){arena.arcanaInvulnerable=!!invulnerable;return arena.arcanaInvulnerable;}
function setArcanaPlayerAirborne(airborne=true){arena.arcanaAirborne=!!airborne;return arena.arcanaAirborne;}
function setArcanaPlayerHeight(height=0){arena.arcanaPlayerHeight=Math.max(0,Number(height)||0);actorVisual.position.y=.02+arena.arcanaPlayerHeight;return arena.arcanaPlayerHeight;}
function setArcanaPlayerPosition(position={}){
  const x=Number(position.x),z=Number(position.z);if(!Number.isFinite(x)||!Number.isFinite(z))return false;
  actorPos.set(x,z);actorRoot.position.set(x,0,z);return{x,z};
}
function setArcanaEnemyCarried(enemy,detail={}){
  if(!enemy)return false;
  if(detail.active){
    const x=Number(detail.x)||0,z=Number(detail.z)||0,height=Math.max(0,Number(detail.height)||0);
    enemy.__heroicLeapCarried=true;enemy.wizardAirborneOffset=height;
    const hasMover=typeof enemySystem.moveEnemyResolved==='function';
    const resolution=hasMover?enemySystem.moveEnemyResolved(enemy,{x,z},{resetVelocity:true}):null;
    const settled=resolution?.current||(hasMover?{x:enemy.x,z:enemy.z}:{x,z});
    const resolvedX=Number.isFinite(Number(settled?.x))?Number(settled.x):x,resolvedZ=Number.isFinite(Number(settled?.z))?Number(settled.z):z;
    enemy.x=resolvedX;enemy.z=resolvedZ;
    const root=enemy.root||enemy.mesh;if(root?.position){root.position.x=resolvedX;root.position.z=resolvedZ;root.position.y=(Number(enemy.yOff)||0)+(Number(enemy.rootLift)||0)+height;}
  }else{
    delete enemy.__heroicLeapCarried;delete enemy.wizardAirborneOffset;
    const root=enemy.root||enemy.mesh;if(root?.position)root.position.y=(Number(enemy.yOff)||0)+(Number(enemy.rootLift)||0);
  }
  return true;
}
function translateArcanaPlayer(dx=0,dz=0){
  const start={x:actorPos.x,z:actorPos.y},delta={x:Number(dx)||0,z:Number(dz)||0};
  const result=resolveCircleMovement(start,delta,PLAYER_RADIUS,captureMazeWorld().getCollisionSegments());
  actorPos.set(result.x,result.z);actorRoot.position.set(result.x,0,result.z);
  return{start,end:{x:result.x,z:result.z},applied:{x:result.x-start.x,z:result.z-start.z},blocked:!!result.collided};
}
function validateArcanaTeleportEndpoint(desired={}){
  const start={x:actorPos.x,z:actorPos.y},rawX=Number(desired?.x),rawZ=Number(desired?.z);
  if(!Number.isFinite(rawX)||!Number.isFinite(rawZ))return{ok:false,start,end:{...start},reason:'invalid-coordinates'};
  const requested={x:rawX,z:rawZ};
  const cell=findCellAtPoint(dungeon,requested,HEX_SIZE);
  if(!cell)return{ok:false,start,end:{...start},reason:'outside-maze'};
  const resolved=resolveCircleMovement(requested,{x:0,z:0},PLAYER_RADIUS,captureMazeWorld().getCollisionSegments());
  if(resolved.collided||Math.hypot(resolved.x-requested.x,resolved.z-requested.z)>.005)return{ok:false,start,requested,end:{...start},reason:'blocked-endpoint'};
  const validCell=findCellAtPoint(dungeon,resolved,HEX_SIZE);
  if(!validCell)return{ok:false,start,end:{...start},reason:'invalid-endpoint'};
  return{ok:true,start,requested,end:{x:resolved.x,z:resolved.z},adjusted:false};
}
function teleportArcanaPlayer(desired={}){
  const validation=validateArcanaTeleportEndpoint(desired);
  if(!validation.ok)return validation;
  actorPos.set(validation.end.x,validation.end.z);actorRoot.position.set(validation.end.x,0,validation.end.z);
  return validation;
}
let running=false,destroyed=false,frameRequest=0,lastStateEmit=0;
let stanceGate2Runtime=null,stanceGate3Runtime=null,stanceGate4Runtime=null,stanceGate4RingSize=null,stanceGate5Runtime=null;
function emitRuntimeState(now=performance.now()){
  if(now-lastStateEmit<200)return;
  lastStateEmit=now;
  emitRuntime({type:'state',snapshot:runtimeHandle.getSnapshot()});
}
function frame(){
  if(!running||destroyed)return;
  frameRequest=requestAnimationFrame(frame);
  const rawDt = Math.min(clock.getDelta(), .05);
  advanceArenaSimulation(rawDt);
  renderArena();
  emitRuntimeState();
}

/* ---------- deterministic ability capture ---------- */
let captureDummy=null,captureDummies=[],captureWallSegments=[],captureWallMeshes=[],captureHostileProjectiles=[],captureHostileDefinitions=[],captureFixtureDeck=null;
const baseHostileProjectilesDescriptor=Object.getOwnPropertyDescriptor(enemySystem,'hostileProjectiles');
if(ABILITY_CAPTURE_MODE&&baseHostileProjectilesDescriptor?.get){
  Object.defineProperty(enemySystem,'hostileProjectiles',{configurable:true,enumerable:true,get(){
    return[...baseHostileProjectilesDescriptor.get.call(enemySystem),...captureHostileProjectiles.filter(projectile=>!projectile.dead)];
  }});
}
function captureRuntimes(){
  return{
    basicDash:PC.basicDashRuntime,
    wizardArcana:PC.wizardArcanaRuntime,
    wizardRebuiltArcana:PC.wizardRebuiltArcanaRuntime,
    wizardFlameStrike:PC.wizardFlameStrikeRuntime,
    wizardWindSlash:PC.wizardWindSlashRuntime,
    wizardAirBasics:PC.wizardAirBasicsRuntime,
    wizardNextSource:PC.wizardNextSourceRuntime,
    wizardNextTwentyBasics:PC.wizardNextTwentyBasicsRuntime,
    wizardNextTwentyDash:PC.wizardNextTwentyDashRuntime,
    wizardFusionLeap:PC.wizardFusionLeapRuntime,
    wizardArcaneTypes:PC.wizardArcaneTypesRuntime,
    wizardAlliedArcana:PC.wizardAlliedArcanaRuntime,
    wizardVfxArcana:PC.wizardVfxArcanaRuntime,
  };
}
function resetCaptureRuntimes(config={}){
  provideArenaCaptureOptions({...config,capture:true});
  const runtimes=captureRuntimes();
  for(const runtime of Object.values(runtimes)){
    runtime?.reset?.();
    if(runtime?.state&&Object.hasOwn(runtime.state,'castSerial'))runtime.state.castSerial=0;
    if(runtime?.state&&Object.hasOwn(runtime.state,'lastCast'))runtime.state.lastCast=null;
  }
  for(const resource of normalizeCaptureFixtures(config.fixtures).resources){const runtime=runtimes[resource.runtimeId];if(runtime?.state&&Object.hasOwn(runtime.state,resource.key))runtime.state[resource.key]=resource.value;}
  const deckFixture=normalizeCaptureFixtures(config.fixtures).deck,existingCaptureDeck=captureFixtureDeck;captureFixtureDeck=null;
  if(deckFixture){const stance=STANCE_CARDS[0],primary=captureCardById(deckFixture.primaryArcanaId),opposite=captureCardById(deckFixture.oppositeArcanaId);if(stance&&primary&&opposite){captureFixtureDeck=existingCaptureDeck||createStanceDeck({rng:()=>0,effectDispatcher:PC.cardEffectDispatcher,compatibilityAdapter:null});captureFixtureDeck.beginRun([stance,primary,opposite],{openingStanceId:stance.id});}}
}
function captureForward(){return{x:Math.sin(actorFacing),z:Math.cos(actorFacing)};}
function captureLocalPoint(value={}){
  const forward=captureForward(),right={x:forward.z,z:-forward.x},along=Number(value.forward)||0,lateral=Number(value.lateral)||0;
  return{x:actorPos.x+forward.x*along+right.x*lateral,z:actorPos.y+forward.z*along+right.z*lateral};
}
function disposeCaptureFixtureMesh(mesh){if(!mesh)return;scene.remove(mesh);mesh.geometry?.dispose?.();mesh.material?.dispose?.();}
function clearCaptureFixtures(){
  for(const mesh of captureWallMeshes)disposeCaptureFixtureMesh(mesh);
  for(const projectile of captureHostileProjectiles)disposeCaptureFixtureMesh(projectile.mesh);
  captureWallSegments=[];captureWallMeshes=[];captureHostileProjectiles=[];captureHostileDefinitions=[];
}
function makeCaptureWall(definition){
  const a=captureLocalPoint(definition.a),b=captureLocalPoint(definition.b),dx=b.x-a.x,dz=b.z-a.z,length=Math.max(.1,Math.hypot(dx,dz));
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(.18,1.2,length),new THREE.MeshBasicMaterial({color:0x65738b,transparent:true,opacity:.72}));
  mesh.position.set((a.x+b.x)/2,.6,(a.z+b.z)/2);mesh.rotation.y=Math.atan2(dx,dz);mesh.name=`Arcana Capture Wall ${definition.id}`;scene.add(mesh);
  captureWallSegments.push({id:definition.id,a,b});captureWallMeshes.push(mesh);
}
function spawnCaptureHostile(definition){
  if(definition.spawned)return null;definition.spawned=true;const position=captureLocalPoint(definition),forward=captureForward(),right={x:forward.z,z:-forward.x};
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(definition.radius,10,7),new THREE.MeshBasicMaterial({color:0xff5577,transparent:true,opacity:.92}));
  mesh.position.set(position.x,.35,position.z);mesh.name=`Arcana Capture Hostile Projectile ${definition.id}`;scene.add(mesh);
  const projectile={id:definition.id,__abilityCaptureFixture:true,x:position.x,z:position.z,r:definition.radius,life:definition.life,dead:false,mesh,
    vx:forward.x*definition.forwardVelocity+right.x*definition.lateralVelocity,vz:forward.z*definition.forwardVelocity+right.z*definition.lateralVelocity};
  captureHostileProjectiles.push(projectile);return projectile;
}
function advanceCaptureFixtures(dt,frame=0){
  captureFixtureDeck?.update?.(dt);
  for(const enemy of captureDummies){
    if(!enemy.__abilityCapturePending||frame<enemy.__abilityCaptureSpawnFrame)continue;
    enemy.__abilityCapturePending=false;enemy.hp=enemy.__abilityCaptureHp;enemy.maxHp=enemy.__abilityCaptureHp;if(enemy.root)enemy.root.visible=true;
  }
  for(const definition of captureHostileDefinitions)if(!definition.spawned&&frame>=definition.spawnFrame)spawnCaptureHostile(definition);
  for(const projectile of captureHostileProjectiles){
    if(projectile.dead)continue;projectile.life-=dt;projectile.x+=projectile.vx*dt;projectile.z+=projectile.vz*dt;
    if(projectile.mesh)projectile.mesh.position.set(projectile.x,.35,projectile.z);
    if(projectile.life<=0){projectile.dead=true;if(projectile.mesh)projectile.mesh.visible=false;}
  }
}
function setCaptureTargetPositionResolved(system,target,requested={}){
  if(!target)return false;
  const x=Number(requested.x),z=Number(requested.z);if(!Number.isFinite(x)||!Number.isFinite(z))return false;
  const hasMover=typeof system?.moveEnemyResolved==='function';
  const resolution=hasMover?system.moveEnemyResolved(target,{x,z},{resetVelocity:true}):null;
  if(resolution===false)return false;
  const settled=resolution?.current||(hasMover?{x:target.x,z:target.z}:{x,z});
  const resolvedX=Number.isFinite(Number(settled?.x))?Number(settled.x):x,resolvedZ=Number.isFinite(Number(settled?.z))?Number(settled.z):z;
  target.x=resolvedX;target.z=resolvedZ;
  return{requested:{x,z},current:{x:resolvedX,z:resolvedZ},resolution};
}
function performCaptureWorldAction(action={}){
  const op=String(action.op||action.type||'').toLowerCase();
  if(op==='release'){arena.charge.buttonHeld=false;PC.releaseArcanaInput?.({...action,source:'capture'});return true;}
  if(op==='interrupt'){return !!PC.interruptArcanaInput?.(String(action.reason||'capture-interrupt'));}
  if(op==='damageally'){
    const runtime=captureRuntimes().wizardAlliedArcana,ally=runtime?.effects?.find?.(effect=>(effect.type==='agent'||effect.type==='ward')&&(!action.allyId||effect.stableId===action.allyId));
    return !!ally?.onDamage?.(Math.max(0,Number(action.damage)||0),{x:0,z:0},{sourceEnemyId:String(action.sourceEnemyId||'capture-hostile')});
  }
  if(op==='activateintervention')return !!captureRuntimes().wizardArcaneTypes?.activateIntervention?.(String(action.reason||'capture-reactivation'));
  if(op==='setplayerposition')return !!setArcanaPlayerPosition(action.position||action);
  if(op==='damageplayer')return Number(enemySystem.damagePlayer?.(Math.max(0,Number(action.damage)||0),{kind:'capture',name:String(action.name||'fixture'),dir:action.dir||null,ignoreInvulnerability:true}))>=0;
  if(op==='strikedecoy')return !!captureRuntimes().wizardNextTwentyDash?.strikeDecoy?.(action.decoyId||action.id,{damage:Number(action.damage)||1});
  if(op==='applyplayerstatus')return !!captureRuntimes().wizardNextTwentyDash?.applyPlayerStatus?.(String(action.status||'capture-dot'),{damage:Number(action.damage)||1,ticks:Math.max(1,Math.trunc(Number(action.ticks)||1)),interval:Math.max(1/60,Number(action.interval)||.25)});
  if(op==='settargethp'){
    const target=captureDummies.find(enemy=>enemy.__abilityCaptureDummyId===action.targetId);if(!target)return false;target.hp=Math.max(0,Number(action.hp)||0);if(target.root)target.root.visible=target.hp>0;return true;
  }
  if(op==='settargetposition'){
    const target=captureDummies.find(enemy=>enemy.__abilityCaptureDummyId===action.targetId);if(!target)return false;
    const x=Number(action.x??action.position?.x),z=Number(action.z??action.position?.z);if(!Number.isFinite(x)||!Number.isFinite(z))return false;
    return !!setCaptureTargetPositionResolved(enemySystem,target,{x,z});
  }
  if(op==='deckplay')return !!captureFixtureDeck?.play?.(Math.max(0,Math.min(1,Math.trunc(Number(action.slot)||0))));
  if(op==='setresource'){
    const runtime=captureRuntimes()[action.runtimeId];if(!runtime?.state||!Object.hasOwn(runtime.state,String(action.key||'')))return false;runtime.state[action.key]=action.value;return true;
  }
  return false;
}
function captureMazeWorld(){
  if(!ABILITY_CAPTURE_MODE||!captureWallSegments.length)return mazeWorld;
  const view=Object.create(mazeWorld||null);view.getCollisionSegments=()=>[...(mazeWorld?.getCollisionSegments?.()||[]),...captureWallSegments];return view;
}
function placeCaptureFixtures(config){
  const dummyConfig=normalizeCaptureDummy(config?.dummy);
  const fixtures=normalizeCaptureFixtures(config?.fixtures);captureDummy=null;captureDummies=[];clearCaptureFixtures();
  for(const wall of fixtures.walls)makeCaptureWall(wall);
  captureHostileDefinitions=fixtures.hostileProjectiles.map(projectile=>({...projectile,spawned:false}));
  for(const definition of captureHostileDefinitions)if(definition.spawnFrame===0)spawnCaptureHostile(definition);
  const placements=captureTargetPlacements(fixtures,dummyConfig,PLAYER_RADIUS*2);
  if(!placements.length)return null;
  const groups=[];for(const placement of placements){const group=groups.find(item=>item.spawnKind===placement.spawnKind);if(group)group.count++;else groups.push({spawnKind:placement.spawnKind,count:1});}
  const response=enemySystem.startLabScenario?.(-777,{
    label:'Arcana Capture Fixtures',groups,
  });
  if(response?.ok===false)return null;
  const enemies=(enemySystem.enemies||[]).slice(0,placements.length),forward=captureForward(),right={x:forward.z,z:-forward.x};
  for(let index=0;index<enemies.length;index++){
    const enemy=enemies[index],placement=placements[index];
    enemy.x=actorPos.x+forward.x*placement.forward+right.x*placement.lateral;
    enemy.z=actorPos.y+forward.z*placement.forward+right.z*placement.lateral;
    enemy.hp=placement.hp;enemy.maxHp=placement.hp;enemy.speed=0;enemy.knockX=0;enemy.knockZ=0;
    enemy.state='idle';enemy.stateTime=0;enemy.stunned=0;enemy.__abilityCaptureDummy=true;
    // Capture fixtures need an identity that survives world resets. Enemy-family
    // allocation counters intentionally keep advancing during normal play, so
    // using their runtime IDs here would make otherwise identical traces differ.
    enemy.wizardStableId=placement.id;delete enemy.wizardTargetId;
    enemy.__abilityCaptureDummyId=placement.id;enemy.__abilityCaptureRole=placement.role;enemy.__abilityCaptureLayout=fixtures.targets.length?'fixtures':dummyConfig.layout;
    enemy.__abilityCaptureSpawnFrame=placement.spawnFrame;enemy.__abilityCaptureHp=placement.hp;enemy.__abilityCapturePending=placement.spawnFrame>0;
    if(enemy.facing){enemy.facing.x=-forward.x;enemy.facing.z=-forward.z;}
    if(enemy.root){enemy.root.position.x=enemy.x;enemy.root.position.z=enemy.z;enemy.root.visible=!enemy.__abilityCapturePending;}
    if(enemy.__abilityCapturePending){enemy.hp=0;enemy.maxHp=placement.hp;}
    captureDummies.push(enemy);if(placement.id==='capture-dummy')captureDummy=enemy;
  }
  return captureDummy;
}
function resetCaptureWorld(config){
  respawn();
  enemySystem.clearRoomRuntime?.();
  clearRoomEffects();
  HitFeel.tuning.master=config?.effects===false||config?.stage==='motion'?0:CAPTURE_HIT_FEEL_MASTER;
  HitFeel.update(10);
  roomTransition?.reset?.();
  transitionOverlay.style.opacity=0;transitionView.cameraPush=0;
  arena.started=true;arena.paused=false;arena.deadT=-1;arena.invulnT=0;arena.dodge.t=-1;
  startGate.classList.add('hidden');panel.classList.add('hidden');
  input.mx=0;input.mz=0;joy.x=0;joy.z=0;padMove.x=0;padMove.z=0;
  for(const key of Object.keys(keys))keys[key]=false;
  const player=config?.player||{},aim=config?.aim||normalizeCaptureAim('right');
  actorPos.set(Number.isFinite(Number(player.x))?Number(player.x):0,Number.isFinite(Number(player.z))?Number(player.z):0);
  actorFacing=Number.isFinite(Number(aim.angle))?Number(aim.angle):Math.atan2(Number(aim.x)||1,Number(aim.z)||0);
  actorYawCurrent=actorFacing;yawQ.setFromAxisAngle(Y_AXIS,actorFacing);
  actorRoot.position.set(actorPos.x,0,actorPos.y);actorVisual.quaternion.copy(yawQ);actorVisual.position.y=.02;arena.arcanaPlayerHidden=false;actorVisual.visible=true;
  camFollow.set(actorPos.x,0,actorPos.y);shake.set(0,0,0);shakeVel.set(0,0,0);
  updateCamera(0);updateHud(0);
  placeCaptureFixtures(config);
}
function setCaptureAim(aim){
  if(arena.arcanaFacingLock)return false;
  actorFacing=Number.isFinite(Number(aim?.angle))?Number(aim.angle):Math.atan2(Number(aim?.x)||1,Number(aim?.z)||0);
  actorYawCurrent=actorFacing;yawQ.setFromAxisAngle(Y_AXIS,actorFacing);actorVisual.quaternion.copy(yawQ);
}
function setCaptureMove(value={}){
  const source=typeof value==='string'?normalizeCaptureAim(value):(value||{}),rawX=Number(source.x??source.moveX??source.mx)||0,rawZ=Number(source.z??source.moveZ??source.mz)||0,length=Math.hypot(rawX,rawZ),requestedMagnitude=Number(source.magnitude);
  const magnitude=Math.min(1,Math.max(0,Number.isFinite(requestedMagnitude)?requestedMagnitude:length));
  if(length>1e-6){input.mx=rawX/length*magnitude;input.mz=rawZ/length*magnitude;}else{input.mx=0;input.mz=0;}
  return arenaMoveInput();
}
function castCaptureCard(card,captureConfig={}){
  if(!card?.effectId||!PC.cardEffectDispatcher)return false;
  provideArenaCaptureOptions({...captureConfig,capture:true});
  const context={card,capture:true,captureStage:captureConfig.stage,renderMode:captureConfig.renderMode,effects:captureConfig.effects,input:captureConfig.input,action:captureConfig.action};
  if(!PC.cardEffectDispatcher.canPlay(card,context))return false;
  return PC.cardEffectDispatcher.play(card,context)!==false;
}
function captureWorldSnapshot(){
  const forward=captureForward();
  const enemies=(enemySystem.enemies||[]).filter(enemy=>enemy?.hp>0).map(enemy=>({
    id:enemy.__abilityCaptureDummyId||(enemy.id??null),kind:enemy.kind||enemy.spawnKind||'',faction:enemy.wizardFaction||'hostile',targetId:enemy.wizardTargetId||null,x:Number(enemy.x)||0,z:Number(enemy.z)||0,
    hp:Number(enemy.hp)||0,maxHp:Number(enemy.maxHp)||0,radius:Number(enemy.radius)||0,
    knockX:Number(enemy.knockX)||0,knockZ:Number(enemy.knockZ)||0,stunned:Number(enemy.stunned)||0,
    stationary:!!enemy.__abilityCaptureDummy,role:enemy.__abilityCaptureRole||'',layout:enemy.__abilityCaptureLayout||'',
  }));
  return{
    player:{x:actorPos.x,z:actorPos.y,facing:actorFacing,forwardX:forward.x,forwardZ:forward.z,hp:Number(enemySystem.playerHp)||0,targetable:!arena.arcanaUntargetable,invulnerable:!!arena.arcanaInvulnerable,airborne:!!arena.arcanaAirborne,height:Number(arena.arcanaPlayerHeight)||0,movementLocked:arena.arcanaMovementLocked,facingLocked:!!arena.arcanaFacingLock,move:arenaMoveInput(),dashMotion:PC.basicDashRuntime?.snapshot?.()||null},
    playerFootprint:PLAYER_RADIUS*2,
    camera:{x:camera.position.x,y:camera.position.y,z:camera.position.z},
    enemies,
    dummy:captureDummy&&captureDummy.hp>0?enemies.find(enemy=>enemy.id==='capture-dummy')||{
      id:'capture-dummy',x:captureDummy.x,z:captureDummy.z,hp:captureDummy.hp,stationary:true,
    }:null,
    captureDummies:enemies.filter(enemy=>enemy.stationary),
    alliedTargets:(enemySystem.alliedTargets||[]).map(target=>({id:target.stableId||target.id||null,type:target.type||'ally',x:Number(target.x)||0,z:Number(target.z)||0,hp:Number(target.hp)||0,maxHp:Number(target.maxHp)||0,active:target.active!==false})),
    charmedTargetId:enemySystem.charmedEnemy?.wizardStableId||enemySystem.charmedEnemy?.id||null,
    captureHostileProjectiles:captureHostileProjectiles.map(projectile=>({id:projectile.id,x:projectile.x,z:projectile.z,r:projectile.r,life:projectile.life,dead:projectile.dead})),
    captureWalls:captureWallSegments.map(wall=>({id:wall.id,a:{...wall.a},b:{...wall.b}})),
    captureDeck:captureFixtureDeck?{hand:captureFixtureDeck.hand.map(card=>card?.arcanaId||card?.id||null),manualSequence:captureFixtureDeck.manualSequence,drawCount:captureFixtureDeck.drawCount,discardCount:captureFixtureDeck.discardCount}:null,
    arenaEffects:effects.length,
  };
}
function captureInitialOptions(){
  const aim=normalizeCaptureAim(CAPTURE_PARAMS.get('aim')||'right');
  return{
    arcanaId:CAPTURE_PARAMS.get('arcana')||'DRAGON-ARC',aim:aim.id,
    player:{x:0,z:0,aimX:aim.x,aimZ:aim.z},camera:{mode:'capture'},
    rngSeed:CAPTURE_PARAMS.get('rngSeed')||4401,
    dummy:{layout:CAPTURE_PARAMS.get('captureLayout')||CAPTURE_PARAMS.get('layout')||'none'},
    stage:CAPTURE_PARAMS.get('stage')||'motion',
    effects:CAPTURE_PARAMS.has('effects')?CAPTURE_PARAMS.get('effects'):undefined,
    renderMode:CAPTURE_PARAMS.get('renderMode')||undefined,
    fixtures:{targets:[],hostileProjectiles:[],walls:[]},
  };
}

function registerRuntimeControls(){
  const source='arena-runtime';
  controlRegistry.register(
    {id:'visuals',label:'VISUALS',source,placement:{section:'visuals'}},
    {id:'visuals.theme',kind:'select',label:'VISUAL STYLE',get:()=>arenaTheme.id,options:()=>ARENA_VISUAL_STYLE_OPTIONS.map(option=>({value:option.id,label:option.label})),set:selectArenaThemeFromMenu,
      profile:{path:'presentation.theme',scope:'profile',default:'neutral',requiresReload:true,migrationId:'arena-theme-v1',adapter:{apply:value=>{try{globalThis.localStorage?.setItem?.('arena.theme',String(value));return true;}catch{return false;}}}},
      placement:{section:'visuals',subsection:'Theme',order:0,accessibleLabel:'Visuals / Visual style'}},
  );
  controlRegistry.register(
    {id:'director',label:'ENCOUNTER DIRECTOR',source,placement:{section:'combat'},profile:{scope:'profile'}},
    {id:'director.mode',kind:'select',label:'DIRECTOR MODE',get:()=>arena.cycleMode?CYCLE_MODE_ID:enemySystem.director.getMode(),options:()=>[...DIRECTOR_MODES,{id:CYCLE_MODE_ID,label:'Cycle All'}].map(mode=>({value:mode.id,label:mode.label})),set:value=>(setMode(value),true),
      profile:{path:'combat.directorMode',scope:'profile',migrationId:'director-mode-v3',adapter:{apply:value=>(setMode(value,{reset:false}),true)}},placement:{section:'combat',subsection:'Director',order:0,accessibleLabel:'Combat behavior / Director mode'}},
  );
  controlRegistry.register(
    {id:'loadout',label:'LOADOUT',source,placement:{section:'loadout'},profile:{scope:'profile'}},
    {id:'loadout.weapon',kind:'select',label:'WEAPON',get:()=>combatState.weapon,options:()=>WEAPON_ORDER.map(value=>({value,label:WEAPONS[value]?.label||value})),set:value=>selectWeapon(value),profile:{path:'player.weapon',scope:'profile',target:'lab-only',migrationId:'player-weapon-v1',adapter:{apply:value=>selectWeapon(value,{reset:false})}},placement:{section:'loadout',subsection:'Player',order:0,accessibleLabel:'Player loadout / Weapon'}},
  );
  controlRegistry.register(
    {id:'loadout',label:'LOADOUT',source,placement:{section:'loadout'},profile:{scope:'profile'}},
    {id:'loadout.stance',kind:'select',label:'STANCE',get:()=>arena.stance?.id||'',options:()=>stancePoolForWeapon().map(stance=>({value:stance.id,label:stance.name||stance.id})),set:selectStance,profile:{path:'player.stance',scope:'profile',target:'lab-only',migrationId:'player-stance-v1'},placement:{section:'loadout',subsection:'Player',order:10,accessibleLabel:'Player loadout / Stance'}},
  );
  controlRegistry.register(
    {id:'combat',label:'COMBO TIMING',source,placement:{section:'loadout'},profile:{scope:'profile'}},
    {id:'combat.input-mode',kind:'select',label:'COMBAT INPUT',get:()=>arena.combatInputMode,options:()=>COMBAT_INPUT_MODES.map(mode=>({value:mode.id,label:mode.label})),set:value=>(setCombatInputMode(value),true),profile:{path:'player.combatInputMode',scope:'profile',target:'shared',migrationId:'combat-input-v1',adapter:{apply:value=>(setCombatInputMode(value,{reset:false}),true)}},placement:{section:'loadout',subsection:'Player',order:20,accessibleLabel:'Player loadout / Combat input mode'}},
  );
  controlRegistry.register({id:'simulation',label:'ENCOUNTER TUNING',source,placement:{section:'combat'},profile:{scope:'profile'}},{
    id:'simulation.spawn-kind',kind:'select',label:'ENCOUNTER SOURCE',get:()=>selectedEncounterMode===LAB_DIRECT_ENCOUNTER_MODE?enemySystem.spawnKind:selectedEncounterMode,
    options:()=>SPAWN_OPTIONS.map(option=>({value:option.id,label:option.label})),
    set:value=>{const selection=PLANNED_ENCOUNTER_MODE_IDS.has(String(value||''))?selectEncounterMode(value):{ok:true,mode:LAB_DIRECT_ENCOUNTER_MODE};if(!selection.ok)return false;if(selection.mode===LAB_DIRECT_ENCOUNTER_MODE){enemySystem.setSpawnKind(value);selectedEncounterMode=LAB_DIRECT_ENCOUNTER_MODE;encounterModeWarning='';}StoneSettings.set('arena.spawnKind',enemySystem.spawnKind);respawn();return true;},
    profile:{path:'scenario.encounterId',scope:'profile',migrationId:'encounter-source-v3',adapter:{apply:value=>{const selection=PLANNED_ENCOUNTER_MODE_IDS.has(String(value))?selectEncounterMode(value):{ok:true};if(!selection.ok)return false;if(!PLANNED_ENCOUNTER_MODE_IDS.has(String(value))){enemySystem.setSpawnKind(value);selectedEncounterMode=LAB_DIRECT_ENCOUNTER_MODE;}StoneSettings.set('arena.spawnKind',enemySystem.spawnKind);return true;}}},placement:{section:'encounter',subsection:'Source',order:0,accessibleLabel:'Encounter / Encounter source'},
  });
  DIR_SLIDERS.forEach((descriptor,index)=>controlRegistry.register(
    {id:'simulation',label:'ENCOUNTER TUNING',source,placement:{section:'combat'},profile:{scope:'profile'}},
    {id:`simulation.tuning.${index}`,kind:'range',label:descriptor.label,min:descriptor.min,max:descriptor.max,step:descriptor.step,get:descriptor.get,set:value=>{descriptor.set(Number(value));return true;},profile:{path:`combat.${['waveSize','pressure','aggression','enemySpeed','enemyHealth','enemySize','idleRange'][index]}`,scope:'profile',migrationId:`combat-tuning-${index}`},placement:{section:'combat',subsection:'Global tuning',order:index,accessibleLabel:`Combat behavior / ${descriptor.label}`}},
  ));
  for(const key of FEEL_KEY_ORDER)controlRegistry.register(
    {id:'feel',label:'FEEL',source,placement:{section:'diagnostics'}},
    {id:`feel.key.${key}`,kind:'button',label:key,active:()=>selKey===key,invoke:()=>{selKey=key;return true;},profile:{scope:'ephemeral',exclusion:'UI-only selector; combat.feel adapter stores every tier.'},placement:{section:'diagnostics',subsection:'Feel',order:FEEL_KEY_ORDER.indexOf(key),accessibleLabel:`Diagnostics / Feel tier ${key}`}},
  );
  for(const descriptor of FEEL_PARAMS)controlRegistry.register(
    {id:'feel',label:'FEEL',source,placement:{section:'diagnostics'}},
    {id:`feel.value.${descriptor.k}`,kind:'range',label:descriptor.label,min:descriptor.min,max:descriptor.max,step:(descriptor.max-descriptor.min)/60,get:()=>FEEL[selKey][descriptor.k],set:value=>{FEEL[selKey][descriptor.k]=Number(value);return true;},profile:{scope:'ephemeral',exclusion:'Dynamic editor view; combat.feel adapter stores all tier values.'},placement:{section:'diagnostics',subsection:'Feel',order:20+FEEL_PARAMS.indexOf(descriptor),accessibleLabel:`Diagnostics / Feel / ${descriptor.label}`}},
  );
  controlRegistry.registerProfileAdapter({id:'combat-feel',path:'combat.feel',label:'All Feel tiers',section:'diagnostics',snapshot:()=>JSON.parse(JSON.stringify(FEEL)),validate:value=>value&&FEEL_KEY_ORDER.every(key=>value[key]&&FEEL_PARAMS.every(param=>Number.isFinite(Number(value[key][param.k])))),apply:value=>{for(const key of FEEL_KEY_ORDER)for(const param of FEEL_PARAMS)FEEL[key][param.k]=Number(value[key][param.k]);return true;}});
  controlRegistry.register({id:'feel',label:'FEEL',source},{id:'feel.test',kind:'button',label:'TEST THIS TIER',invoke:()=>beginTestSwing(FEEL_KEY_ORDER.indexOf(selKey)/3),profile:{scope:'ephemeral',exclusion:'Action button.'},placement:{section:'diagnostics',subsection:'Feel',order:99,accessibleLabel:'Diagnostics / Test Feel tier'}});
  for(const descriptor of HitFeel.controlDescriptors())controlRegistry.register({id:'hitfeel',label:'HIT FEEL',source,placement:{section:'diagnostics'},profile:{scope:'profile'}},{...descriptor,profile:{path:`combat.hitFeel.${descriptor.id.split('.').at(-1)}`,scope:'profile',migrationId:`hit-feel-${descriptor.id}`},placement:{section:'diagnostics',subsection:'Hit Feel',order:0,accessibleLabel:`Diagnostics / Hit Feel / ${descriptor.label}`}});
  controlRegistry.register({id:'actions',label:'ACTIONS',source},{id:'actions.reset',kind:'button',label:'RESET FIGHT',invoke:()=>respawn(),profile:{scope:'ephemeral',exclusion:'Action button.'},placement:{section:'encounter',subsection:'Actions',order:99,accessibleLabel:'Encounter / Reset fight'}});
  if(runtimeConfig.enemyLab)controlRegistry.register({id:'maze',label:'MAZE GEOMETRY',source,placement:{section:'visuals'},profile:{scope:'profile'}},{id:'maze.lab-cell-size',kind:'select',label:'LAB CHAMBER SIZE',get:()=>getMazeRuntimeSettings().cellSize.id,options:()=>MAZE_CELL_SIZE_OPTIONS.map(option=>({value:option.id,label:option.label})),set:value=>(setMazeRuntimeCellSize(value),true),profile:{path:'lab.chamber.cellSize',scope:'profile',target:'lab-only',requiresReload:true,migrationId:'lab-chamber-cell-v1',adapter:{apply:value=>(setMazeRuntimeCellSize(value,{reload:false}),true)}},placement:{section:'visuals',subsection:'Lab fixture',order:10,accessibleLabel:'Test / Lab chamber size',workspace:'test'}});
  controlRegistry.register({id:'maze',label:'MAZE GEOMETRY',source,placement:{section:'visuals'},profile:{scope:'profile'}},{id:'maze.arena-cell-size',kind:'select',label:'ARENA CELL SIZE',get:()=>getArenaMazeSettings().cellSize.id,options:()=>MAZE_CELL_SIZE_OPTIONS.map(option=>({value:option.id,label:option.label})),set:value=>(setArenaMazeCellSize(value,{reload:false}),true),profile:{path:'presentation.maze.cellSize',scope:'profile',target:'arena',requiresReload:true,migrationId:'arena-maze-cell-v2',adapter:{apply:value=>(setArenaMazeCellSize(value,{reload:false}),true)}},placement:{section:'visuals',subsection:'Arena maze',order:20,accessibleLabel:'Setup / Arena maze cell size',workspace:'setup'}});
  controlRegistry.register({id:'maze',label:'MAZE GEOMETRY',source,placement:{section:'visuals'},profile:{scope:'profile'}},{id:'maze.room-size',kind:'select',label:'ARENA CELLS PER ROOM',get:()=>getArenaMazeSettings().roomSize.id,options:()=>MAZE_ROOM_SIZE_OPTIONS.map(option=>({value:option.id,label:option.label})),set:value=>(setMazeRuntimeRoomSize(value,{reload:false}),true),profile:{path:'presentation.maze.roomSize',scope:'profile',target:'arena',requiresReload:true,migrationId:'maze-room-v1',adapter:{apply:value=>(setMazeRuntimeRoomSize(value,{reload:false}),true)}},placement:{section:'visuals',subsection:'Arena maze',order:30,accessibleLabel:'Setup / Arena maze room size',workspace:'setup'}});
  controlRegistry.subscribe(event=>emitRuntime(event));
}

function setStarted(value=true){
  arena.started=!!value;
  startGate.classList.toggle('hidden',arena.started);
  emitRuntime({type:'started',started:arena.started});
  return arena.started;
}
function setPaused(value=true){arena.paused=!!value;emitRuntime({type:'paused',paused:arena.paused});return arena.paused;}
function setMenuOpen(open=true){const current=!panel.classList.contains('hidden');if(current!==!!open)toggleMenu();return !!open;}
function startRuntime(){
  if(destroyed)return false;
  if(ABILITY_CAPTURE_MODE)return true;
  if(running)return true;
  running=true;clock.getDelta();frameRequest=requestAnimationFrame(frame);emitRuntime({type:'lifecycle',running:true});return true;
}
function stopRuntime(){if(!running)return false;running=false;if(frameRequest)cancelAnimationFrame(frameRequest);frameRequest=0;emitRuntime({type:'lifecycle',running:false});return true;}
function destroyRuntime(){
  if(destroyed)return false;
  stopRuntime();
  destroyed=true;
  stanceGate5Runtime?.destroy?.();stanceGate5Runtime=null;
  stanceGate4RingSize?.destroy?.();stanceGate4RingSize=null;
  stanceGate4Runtime?.destroy?.();stanceGate4Runtime=null;
  stanceGate3Runtime?.destroy?.();stanceGate3Runtime=null;
  stanceGate2Runtime?.destroy?.();stanceGate2Runtime=null;
  trialCardGesture?.destroy?.();trialCardGesture=null;
  accordionEnemyOverlay?.destroy?.();
  renderer.dispose?.();
  clearArenaRuntime(runtimeHandle);
  emitRuntime({type:'lifecycle',destroyed:true});
  return true;
}

let captureController=null;
const getRuntimeSnapshot=()=>Object.freeze({ready:!destroyed,running,started:arena.started,paused:isPaused(),menuOpen:!panel.classList.contains('hidden'),weaponId:combatState.weapon||'',stanceName:arena.stance?.name||arena.stance?.id||'',playerHp:enemySystem.playerHp,aliveCount:(enemySystem.enemies||[]).filter(enemy=>enemy.hp>0).length,queuedSpawnCount:enemySystem.queuedSpawnCount||0,telegraphCount:enemySystem.telegraphCount||0,encounterMode:selectedEncounterMode,encounterModeWarning:encounterModeWarning,encounterPlan:enemySystem.currentEncounterPlan||null});
const getStartupTrace=()=>startupTrace.snapshot();
const getLabSnapshot=()=>Object.freeze({...getRuntimeSnapshot(),roomOptions:Object.freeze(MAZE_CELL_SIZE_OPTIONS.map(option=>Object.freeze({...option,active:option.id===getMazeRuntimeSettings().cellSize.id}))),controlGroups:controlRegistry.getControlGroups(),sections:sectionRegistry?.sections?.({controlGroups:controlRegistry.getControlGroups()})||[]});
const runtimeHandle={
  config:runtimeConfig,ready:Promise.resolve(true),enemySystem,PC,combatState,FEEL,arena,actorPos,deck,dungeon,encounterState,HitFeel,sectionRegistry,controlRegistry,
  get mazeWorld(){return captureMazeWorld();},get activeRoomId(){return activeRoomId;},get roomTransition(){return roomTransition;},get capture(){return captureController;},get defenseController(){return stanceGate5Runtime;},
  get trialCardDirection(){return trialCardDirection;},
  get playerFacing(){return actorFacing;},getPlayerForward(){return{x:Math.sin(actorFacing),z:Math.cos(actorFacing)};},
  start:startRuntime,stop:stopRuntime,destroy:destroyRuntime,reset:()=>respawn(),setStarted,setPaused,setMenuOpen,toggleFullscreen,
  getSnapshot:getRuntimeSnapshot,snapshot:getLabSnapshot,
  getStartupTrace,traceStartup:(phase,details={})=>traceArenaState(phase,details),
  setCellSize:id=>setMazeRuntimeCellSize(id),resetFight:()=>respawn(),
  getControlGroups:()=>controlRegistry.getControlGroups(),setControl:(id,value)=>controlRegistry.setControl(id,value),invokeControl:(id,...args)=>controlRegistry.invokeControl(id,...args),
  snapshotProfileSettings:options=>controlRegistry.snapshotProfileSettings(options),validateProfileSettings:(values,options)=>controlRegistry.validateProfileSettings(values,options),applyProfileSettings:(values,options)=>controlRegistry.applyProfileSettings(values,options),auditProfileCoverage:options=>controlRegistry.auditProfileCoverage(options),registerProfileAdapter:definition=>controlRegistry.registerProfileAdapter(definition),
  subscribe(listener){if(typeof listener!=='function')return()=>{};runtimeListeners.add(listener);return()=>runtimeListeners.delete(listener);},
  startLabScenario:(roomId,plan)=>enemySystem.startLabScenario(roomId,plan),clearRoomRuntime:()=>enemySystem.clearRoomRuntime(),
  selectEncounterMode,startPlannedLabEncounter,getEncounterPlan:()=>enemySystem.currentEncounterPlan||null,
  arenaMoveInput,setArcanaMovementLock,setArcanaFacingLock,setArcanaTargetable,setArcanaPlayerVisible,setArcanaPlayerInvulnerable,setArcanaPlayerAirborne,setArcanaPlayerHeight,setArcanaPlayerPosition,setArcanaEnemyCarried,translateArcanaPlayer,validateArcanaTeleportEndpoint,teleportArcanaPlayer,
  lightDown,heavyDown,attackDown,attackUp,defenseDown,defenseUp,triggerDodge,cycleWeapon,selectWeapon,cycleStance,selectStance,beginTestSwing,setCombatInputMode,playCard,startDeckShuffle,
};
provideArenaRuntime(runtimeHandle);
registerRuntimeControls();
if(!ABILITY_CAPTURE_MODE){
  stanceGate2Runtime=installStanceGate2Runtime({arenaHandle:runtimeHandle});
  stanceGate3Runtime=installStanceGate3Runtime({arenaHandle:runtimeHandle,gate2Runtime:stanceGate2Runtime});
  stanceGate4Runtime=createStanceGate4Runtime({arenaHandle:runtimeHandle,gate3Runtime:stanceGate3Runtime,windowRef:globalThis.window,documentRef:document});
  stanceGate4RingSize=installStanceGate4RingSize({arenaHandle:runtimeHandle,windowRef:globalThis.window,documentRef:document});
  stanceGate5Runtime=createStanceGate5Runtime({arenaHandle:runtimeHandle,gate4Runtime:stanceGate4Runtime,windowRef:globalThis.window,documentRef:document});
}

/* ---------- boot ---------- */
spawnCharacter();
const savedArenaWeapon=normalizeStoneWeaponId(StoneSettings.get('arena.weapon','longsword'));
StoneSettings.set('arena.weapon',savedArenaWeapon);
PC.selectCombatWeapon(savedArenaWeapon);
if(!arena.stance&&!wardenTrialMode)ensureStanceMatchesWeapon();
if(!deck.hand[0] && !deck.hand[1]) rebuildDeck();
setMode(StoneSettings.get('arena.directorMode', enemySystem.director.getMode()), { reset:false });
if(!runtimeConfig.enemyLab){
  const standard=lockedStandard;
  if(standard?.profile?.workspace?.settings){
    traceArenaState('standard-apply-begin',{
      standard:summarizeStandard(standard),
      profile:summarizeProfile(standard.profile),
    });
    const applied=controlRegistry.applyProfileSettings(standard.profile.workspace.settings,{includeGlobal:true});
    traceArenaState(applied.ok?'standard-applied':'standard-apply-failed',{
      standardApply:{ok:applied.ok,applied:applied.applied,errors:applied.errors,warnings:applied.warnings},
    });
    if(!applied.ok)console.warn('Arena Standard settings were only partially applied.',applied.errors);
  }
}
if(wardenTrialMode){
  configureWardenTrialWave();
  enemySystem.setPressureBudget(2);enemySystem.setAggression(.9);
  const title=document.querySelector('#startCard .sgTitle'),hint=document.querySelector('#startCard .sgHint'),start=document.getElementById('startBtn'),pauseTitle=document.querySelector('#panel .pauseTitle');
  if(title)title.textContent='WARDEN TRIAL';
  if(hint)hint.textContent='Swipe down on the current starter card to begin. Swipe up only registers the gesture.';
  if(start)start.hidden=true;
  if(pauseTitle)pauseTitle.textContent='TRIAL PAUSED';
  startGate.classList.add('hidden');
}
respawn();

if(ABILITY_CAPTURE_MODE){
  captureController=createAbilityCaptureController({
    enabled:true,initial:captureInitialOptions(),resetWorld:resetCaptureWorld,resetRuntimes:resetCaptureRuntimes,
    castCard:castCaptureCard,setAimWorld:setCaptureAim,setMoveWorld:setCaptureMove,performWorldAction:performCaptureWorldAction,
    advanceWorld:(dt,simulationNow,{frame}={})=>{advanceCaptureFixtures(dt,frame);advanceArenaSimulation(dt,{capture:true,simulationNow,updateEnemies:false});},
    renderWorld:renderArena,snapshotWorld:captureWorldSnapshot,getRuntimes:captureRuntimes,
  });
  provideArenaCaptureController(captureController);
  captureController.reset(captureInitialOptions());
}else startRuntime();

addEventListener('resize', syncArenaViewport);
emitRuntime({type:'ready',runtime:runtimeHandle});
return runtimeHandle;
}
