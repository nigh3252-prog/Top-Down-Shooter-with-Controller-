import * as THREE from 'three';
import { installStoneWanderer } from './stone-wanderer.js';
import { installPlayerCombat } from './player-combat.js';
import { STONE_WEAPON_ORDER, cloneWeaponDefinitions, installRedTollGreatsword, normalizeStoneWeaponId } from './weapons.js';
import { STANCE_CARDS } from './stance-cards.js';
import { guardPoseFor } from './guard-poses.js';
import { lightFollowupForStage, HEAVY_LIGHT_STAGE } from './combat-links.js';
import { COMBAT_INPUT_MODES, DEFAULT_COMBAT_INPUT_MODE, bufferExpiresAt, getCombatInputMode, lightFollowupForActiveMove, shouldExpireBufferedInput } from './combat-input-modes.js';
import { createStanceDeck, moveArrow } from './stance-deck.js';
import { getWeaponDamageMultiplier } from './combat-balance.js';
import { staminaCostForWeapon, weaponAllowsCleave } from './weapon-balance.js';
import { createArenaEnemySystem } from './arena-enemies.js';
import { DIRECTOR_MODES } from './combat-director.js';
import { FUSION_ENEMY_OPTIONS } from './fusion-enemies.js';
import { installCombatAudioDirector } from './combat-audio.js';
import { installHitFeel } from './hit-feel.js';
import { StoneSettings } from './settings.js';
import { FEEL_PARAMS, FEEL_KEY_ORDER, createFeelKeys, feelAt, tierName, holdToTier } from './feel.js';
import { createHexMaze, createSeededRandom } from './hex-maze.js';
import { createMazeWorld } from './hex-maze-renderer.js';
import { axialToWorld, findCellAtPoint, findPath, randomPointInRoom, raycastWalls, resolveCircleMovement } from './hex-maze-navigation.js';
import { installMazeRuntimeControls, configuredHexSize } from './maze-runtime-settings.js';
import { createRoomEncounterState } from './room-encounters.js';
import { createRoomTransitionController } from './room-transition.js';
import { createArenaControlRegistry } from './arena-control-registry.js';
import { installRoadieRun } from './roadie-run.js';

export function createArenaRuntime({
  document:doc=globalThis.document,
  window:win=globalThis.window || globalThis,
  config={},
  context={},
  controlRegistry=null,
}={}) {
  const document=doc;
  const window=win;
  const location=window?.location || globalThis.location || {};
  const navigator=window?.navigator || globalThis.navigator || {};
  const performance=window?.performance || globalThis.performance || { now:()=>Date.now() };
  const addEventListener=(...args)=>window?.addEventListener?.(...args);
  const removeEventListener=(...args)=>window?.removeEventListener?.(...args);
  const requestAnimationFrame=window?.requestAnimationFrame?.bind(window)
    || globalThis.requestAnimationFrame
    || (callback=>setTimeout(()=>callback(performance.now()),16));
  const cancelAnimationFrame=window?.cancelAnimationFrame?.bind(window)
    || globalThis.cancelAnimationFrame
    || clearTimeout;
  const runtimeConfig={...config};
  let runtimeRef=null;
  let frameId=null;
  let running=false;
  let destroyed=false;
  const controls=controlRegistry || context.controlRegistry || createArenaControlRegistry();
  const runtimeListeners=new Set();
  const emitRuntime=event=>{ for(const listener of [...runtimeListeners])listener(event); };
  const runtimeContext={
    ...context,
    config:runtimeConfig,
    mode:runtimeConfig.mode || context.mode || 'arena',
    document,
    window,
    get runtime(){ return runtimeRef; },
    get actorPosition(){ return actorPos; },
    getMazeSegments:()=>runtimeRef?.mazeWorld?.getCollisionSegments?.() || [],
    getActiveRoomId:()=>runtimeRef?.activeRoomId ?? null,
    getArenaState:()=>runtimeRef?.arena || null,
    getStance:()=>runtimeRef?.arena?.stance || null,
    getSwing:()=>runtimeRef?.arena?.swing || null,
  };
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
const HEX_SIZE = configuredHexSize(20, { runtimeConfig });
const PLAYER_RADIUS = 1.05;
const MAZE_SEED = runtimeConfig.seed || new URLSearchParams(window.location.search || '').get('seed') || 'arena-001';
const PLAYER_SPEED = 8.5;
const CHARGE_MOVE_MULT = .35;
const DODGE_SPEED = 18, DODGE_TIME = .26, DODGE_IFRAMES = .30, DODGE_COOL = .55;
const AUTO_FACE_RANGE = 14;
/* stamina economy: swings drain it, playing a stance card is the only refill */
const STAMINA = { max:100, start:100, recoverTime:.85, recoverDelay:.08, chargeCostMult:1.75,
                  costs:{ horizontal:18, vertical:14, stab:10, default:14 }, shuffleTime:2, exhaustFlash:.35 };
const CHAIN = { comboWindow:.45, finisherWindow:.80, whiffLock:.20, postSecondLightLock:.35 };
const LUNGE_RATE = 2.8;         // root-motion units/sec × feel lunge during the strike
const CAM_HEIGHT = 20, CAM_BACK = 17.6;

/* ---------- scene ---------- */
const renderer = new THREE.WebGLRenderer({ antialias:true });
// Cap device pixel ratio at 1.5: on high-DPI phones (DPR 2-3) this is the single
// biggest GPU win (render resolution scales with the square of this) and is barely
// perceptible with antialiasing on.
renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d191b);
scene.fog = new THREE.Fog(0x0d191b, 34, 78);
const camera = new THREE.PerspectiveCamera(40, window.innerWidth/window.innerHeight, .5, 220);

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

const dungeon = createHexMaze({
  seed:MAZE_SEED, layout:runtimeConfig.layout, mode:runtimeConfig.mode, runtimeConfig,
  radius:5, minRoomSize:4, maxRoomSize:7, minLoopLength:6,
});

if(!dungeon.validation.valid) throw new Error(`Invalid maze ${MAZE_SEED}: ${dungeon.validation.errors.join(' | ')}`);
let activeRoomId = dungeon.startRoomId;
let mazeWorld = createMazeWorld({
  THREE, maze:dungeon, roomId:activeRoomId, hexSize:HEX_SIZE, wallHeight:3.2,
  wallThickness:.34, doorWidth:7, runtimeContext,
  getActorPosition:()=>({ x:actorPos.x, z:actorPos.y }),
});
worldRoot.add(mazeWorld.group);
const startPoint = axialToWorld(0, 0, HEX_SIZE);

/* ---------- weapons / stances / audio ---------- */
const WEAPON_ORDER = STONE_WEAPON_ORDER;
const WEAPONS = cloneWeaponDefinitions();
const CombatAudio = installCombatAudioDirector({ controls:{} , settings:StoneSettings });

/* ---------- hit feel (hitstop, camera punch, gore, impact SFX) ---------- */
// Hidden tuning panel: backtick key or ?tune=1. Master knob at 0 ≈ the old game.
const HitFeel = installHitFeel({ THREE, scene, camera, settings:StoneSettings, audio:CombatAudio });
HitFeel.buildTuningPanel();

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
  paused:false, started:false, menuOpen:false, cycleMode:false,
  combatInputMode:getCombatInputMode(StoneSettings.get('arena.combatInputMode', DEFAULT_COMBAT_INPUT_MODE)).id,
  stamina:{ v:STAMINA.start, pending:0, recoverDelayT:0 },
};
const deck = createStanceDeck({ shuffleTime: STAMINA.shuffleTime, runtimeContext });
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
  const s = arena.stamina, refund = Math.max(0, amount);
  s.pending = Math.min(STAMINA.max - s.v, s.pending + refund);
  if(refund > 0) s.recoverDelayT = STAMINA.recoverDelay;
}
function fullRefillStamina(){ arena.stamina.v = STAMINA.max; arena.stamina.pending = 0; arena.stamina.recoverDelayT = 0; }
function wipeRecoverableStamina(){ arena.stamina.pending = 0; arena.stamina.recoverDelayT = 0; }
function updateStamina(dt){
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
  THREE, scene,
  runtimeContext,
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
    onWeaponUISync(){ updateModePanel(); },
    timeScaleModifier(att, t, phase){
      const s = arena.charge.active ? arena.charge.s : arena.swing.s;
      if(phase === 0) return s.windup;
      if(phase >= att.phases.length-1) return s.recover;
      return s.strike;
    }
  }
});
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
  arena.stance = pool[arena.stanceIndex];
  PC.setReadyPose(guardPoseFor(arena.stance));
  resetChainState();
  updateModePanel();
}
function cycleStance(){ setStance(arena.stanceIndex + 1); announce(arena.stance ? stancePoolForWeapon()[(arena.stanceIndex)%stancePoolForWeapon().length].name : '', .9); }
function ensureStanceMatchesWeapon(){
  const pool = stancePoolForWeapon();
  const idx = arena.stance ? pool.findIndex(st => st.id === arena.stance.id) : -1;
  setStance(idx >= 0 ? idx : 0);
}
/* ---------- stance-card deck ---------- */
function rebuildDeck(){
  deck.rebuild(stancePoolForWeapon());
  renderCards();
}
function playCard(slot){
  if(arena.deadT >= 0 || roomTransition?.active) return;
  const card = deck.play(slot);
  if(!card){ exhaustFlash(); return; }   // empty slot or mid-shuffle
  const pool = stancePoolForWeapon();
  const idx = pool.findIndex(st => st.id === card.id);
  if(idx >= 0) setStance(idx);
  else { arena.stance = card; resetChainState(); updateModePanel(); }
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

/* ---------- maze navigation + room encounters ---------- */
const encounterRandom = createSeededRandom(`${MAZE_SEED}:encounters`);
let encounterState = null;
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
    wallThickness:.34, doorWidth:7, openedDoorEdges:encounterState?.openedDoorEdges,
    runtimeContext, getActorPosition:()=>({ x:actorPos.x, z:actorPos.y }),
  });
  worldRoot.add(mazeWorld.group);
  positionRoomLighting(mazeWorld.center);
  syncDoorStates();
}
positionRoomLighting(mazeWorld.center);

const mazeNavigation = {
  resolveMovement(position, delta, radius){
    return resolveCircleMovement(position, delta, radius, mazeWorld.getCollisionSegments());
  },
  raycastWalls(start, end){ return raycastWalls(start, end, mazeWorld.getCollisionSegments()); },
  randomSpawn(roomId, player){
    if(roomId === null || roomId === undefined) return null;
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
  THREE, worldRoot, arenaRadius:ARENA, navigation:mazeNavigation,
  roomEncounterMode:true,
  onEncounterCleared(roomId){
    encounterState?.clearRoom(roomId);
    syncDoorStates();
    const progress = encounterState?.progress;
    announce(progress?.cleared === progress?.total ? 'DUNGEON CLEAR' : `ROOM ${roomId + 1} CLEAR · STRIKE A DOOR`, 1.8);
  }
});
encounterState = createRoomEncounterState(dungeon, { mode:runtimeConfig.mode,
  onRoomEnter({ roomId, cleared }){

    syncDoorStates();
    if(cleared) announce(`ROOM ${roomId + 1} · CLEARED`, .8);
  },
  onEncounterStart({ roomId }){
    syncDoorStates();
    enemySystem.startRoomEncounter(roomId);
    announce(`ROOM ${roomId + 1} · SEAL`, 1.1);
  }
});

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
function nearestEnemy(maxDist=Infinity){
  let best=null, bd=maxDist;
  for(const e of enemySystem.enemies){
    const d = Math.hypot(e.x-actorPos.x, e.z-actorPos.y);
    if(d<bd && !mazeNavigation.raycastWalls({ x:actorPos.x, z:actorPos.y }, { x:e.x, z:e.z })){
      bd=d; best=e;
    }
  }
  return best;
}
function resolveDesiredFacing(){
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
function updateChainTimers(dt){
  const c = arena.chain, now = performance.now()/1000;
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
function canUseCombatInput(){ return arena.deadT < 0 && arena.dodge.t < 0 && arena.chain.inputLockT <= 0 && !!arena.stance; }
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
  if(roomTransition?.active) return;
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
  const d = arena.dodge;

  if(arena.deadT >= 0 || roomTransition?.active || d.t >= 0 || d.cool > 0) return;
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
function respawn(){
  roomTransition?.reset();
  transitionOverlay.style.opacity = 0;
  transitionView.cameraPush = 0;
  arena.deadT = -1;
  actorPos.set(startPoint.x, startPoint.z); actorFacing = 0;
  arena.charge.active = false; arena.charge.queued = false; arena.charge.buttonHeld = false; combatState.chargePull = 0;
  combatState.attack = null; combatState.t = 0; resetChainState();
  fullRefillStamina();
  rebuildDeck();

  encounterState.reset();
  enemySystem.reset();
  clearRoomEffects();
  loadActiveRoom(dungeon.startRoomId);
  encounterState.enterRoom(dungeon.startRoomId);
  syncDoorStates();
  arena.prevHp = enemySystem.playerHp;
  arena.prevWave = enemySystem.wave;
}
function watchPlayerState(dt){
  const hp = enemySystem.playerHp;
  if(hp < arena.prevHp && arena.deadT < 0){
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
      updateModePanel();
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
  if(e.key==='j') lightDown();
  if(e.key==='l') heavyDown();
  if(e.key==='k') triggerDodge();
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
  if(e.clientX > window.innerWidth*.55 || joy.id!==null) return;
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
  if(!gp) return;
  const bd = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
  const dz = v => Math.abs(v)>.16?v:0;
  let mx = dz(gp.axes[0]||0), mz = dz(gp.axes[1]||0);
  // D-pad left/right remain movement; up/down are reserved for weapon testing.
  if(bd(14))mx-=1; if(bd(15))mx+=1;
  const l=Math.hypot(mx,mz);
  if(l>1){mx/=l;mz/=l;}
  padMove.x=mx; padMove.z=mz;
  const light = bd(2)||bd(7);
  const heavy = bd(3);
  const shuffle = bd(1);
  const dge = bd(0)||bd(6);
  const lb = bd(4), rb = bd(5);
  const strt = bd(9), sel = bd(8);
  const weaponPrev = bd(12), weaponNext = bd(13);
  if(light && !padPrev.light) lightDown();
  if(heavy && !padPrev.heavy) heavyDown();
  if(!heavy && padPrev.heavy) heavyUp();
  if(dge && !padPrev.dge) triggerDodge();
  if(shuffle && !padPrev.shuffle) startDeckShuffle();
  if(lb && !padPrev.lb) playCard(0);
  if(rb && !padPrev.rb) playCard(1);
  if(weaponPrev && !padPrev.weaponPrev) cycleWeapon(-1);
  if(weaponNext && !padPrev.weaponNext) cycleWeapon(1);
  if(strt && !padPrev.strt) toggleMenu();
  if(sel && !padPrev.sel) toggleMenu();
  padPrev.light=light; padPrev.heavy=heavy; padPrev.shuffle=shuffle; padPrev.dge=dge; padPrev.lb=lb; padPrev.rb=rb;
  padPrev.strt=strt; padPrev.sel=sel; padPrev.weaponPrev=weaponPrev; padPrev.weaponNext=weaponNext;
}
function gatherInput(){
  const k = keyMove();
  const pm = Math.hypot(padMove.x,padMove.z);
  const jm = Math.hypot(joy.x,joy.z);
  if(pm>.08){ input.mx=padMove.x; input.mz=padMove.z; }
  else if(jm>.08){ input.mx=joy.x; input.mz=joy.z; }
  else { input.mx=k.x; input.mz=k.z; }
}

/* ---------- UI ---------- */
const panel=document.getElementById('panel');
const menuBtn=document.getElementById('menuBtn');
function syncMenuButton(){ menuBtn.textContent = panel.classList.contains('hidden') ? 'MENU' : 'RESUME'; }
function setMenuOpenState(open){
  arena.menuOpen=!!open;
  const showPanel=runtimeConfig.mode !== 'enemy-lab' && arena.menuOpen;
  panel.classList.toggle('hidden', !showPanel);
  arena.paused=arena.menuOpen;
  syncMenuButton();
  emitRuntime({type:'menu',open:arena.menuOpen});
}
function toggleMenu(){ setMenuOpenState(!arena.menuOpen); }
function isPaused(){ return !arena.started || arena.paused || arena.menuOpen; }
menuBtn.addEventListener('click', toggleMenu);
const startGate=document.getElementById('startGate');
function setStartedState(started){
  arena.started = true;
  if(!started)arena.started=false;
  startGate.classList.toggle('hidden',!!started || runtimeConfig.mode==='enemy-lab');
  emitRuntime({type:'started',started:arena.started});
}
document.getElementById('startBtn').addEventListener('click', ()=>setStartedState(true));
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
document.addEventListener('fullscreenchange', syncFsButtons);
document.addEventListener('webkitfullscreenchange', syncFsButtons);
syncFsButtons();
document.getElementById('resetBtn').addEventListener('click', ()=>{ respawn(); toggleMenu(); });
document.getElementById('weaponBtn').addEventListener('click', ()=>cycleWeapon());
document.getElementById('stanceBtn').addEventListener('click', ()=>cycleStance());
/* tabs */
const tabDir=document.getElementById('tabDir'), tabFeel=document.getElementById('tabFeel');
const dirTab=document.getElementById('dirTab'), feelTab=document.getElementById('feelTab');
tabDir.addEventListener('click', ()=>{ tabDir.classList.add('on'); tabFeel.classList.remove('on');
  dirTab.style.display='block'; feelTab.style.display='none'; });
tabFeel.addEventListener('click', ()=>{ tabFeel.classList.add('on'); tabDir.classList.remove('on');
  feelTab.style.display='block'; dirTab.style.display='none'; });
/* collapsible section headers (same ▸/▾ pattern as the hit-feel tuning panel) */
document.querySelectorAll('button.sect').forEach(h=>{
  const body = document.getElementById('body-'+h.dataset.sect);
  const key = 'arena.section.'+h.dataset.sect;
  let collapsed = !!StoneSettings.get(key, false);
  const apply = ()=>{
    body.style.display = collapsed ? 'none' : 'block';
    h.textContent = (collapsed ? '▸ ' : '▾ ') + h.dataset.label;
  };
  apply();
  h.addEventListener('click', ()=>{ collapsed = !collapsed; StoneSettings.set(key, collapsed); apply(); });
});
/* director mode grid */

const modeGrid=document.getElementById('modeGrid');
const CYCLE_MODE_ID = 'cycle';
function modeLabel(id){ return DIRECTOR_MODES.find(m=>m.id===id)?.label || id; }
function setMode(id, { reset = true } = {}){
  arena.cycleMode = (id === CYCLE_MODE_ID);
  enemySystem.setCycleOnWaveClear(arena.cycleMode);
  if(!arena.cycleMode) enemySystem.setDirectorMode(id);
  StoneSettings.set('arena.directorMode', id);   // picked mode sticks across reloads
  updateModePanel();
  if(reset) respawn();   // switching director mode = full scene reset
}
DIRECTOR_MODES.forEach(m=>{
  const b=document.createElement('button');
  b.textContent=m.label; b.dataset.id=m.id;
  b.addEventListener('click', ()=>setMode(m.id));
  modeGrid.appendChild(b);
});
{ // CYCLE pseudo-mode: rotates through the real modes each wave
  const b=document.createElement('button');
  b.textContent='Cycle All'; b.dataset.id=CYCLE_MODE_ID;
  b.addEventListener('click', ()=>setMode(CYCLE_MODE_ID));
  modeGrid.appendChild(b);
}
const combatModeGrid=document.getElementById('combatModeGrid');
const combatModeNote=document.getElementById('combatModeNote');
function setCombatInputMode(id, { reset = true } = {}){
  const next = getCombatInputMode(id);
  arena.combatInputMode = next.id;
  StoneSettings.set('arena.combatInputMode', next.id);
  resetChainState();
  if(reset) respawn();
  updateModePanel();
  if(reset) announce(next.label, .9);
}
COMBAT_INPUT_MODES.forEach(mode=>{
  const b=document.createElement('button');
  b.textContent=mode.label;
  b.dataset.id=mode.id;
  b.title=mode.note;
  b.addEventListener('click', ()=>setCombatInputMode(mode.id));
  combatModeGrid.appendChild(b);
});

function updateModePanel(){
  const mode = enemySystem.director.getMode();
  const active = arena.cycleMode ? CYCLE_MODE_ID : mode;
  modeGrid.querySelectorAll('button').forEach(b=>b.classList.toggle('on', b.dataset.id===active));
  const inputMode = combatInputMode();
  combatModeGrid.querySelectorAll('button').forEach(b=>b.classList.toggle('on', b.dataset.id===inputMode.id));
  combatModeNote.textContent = inputMode.note;
}
/* sim sliders */
const spawnSelect=document.getElementById('spawnSelect');
[
  { id:'mixed', label:'Mixed Pure Strains' },
  { id:'goblins', label:'Goblins Only' },
  ...FUSION_ENEMY_OPTIONS
].forEach(({id,label})=>{
  const option=document.createElement('option'); option.value=id; option.textContent=label; spawnSelect.appendChild(option);
});
enemySystem.setSpawnKind(StoneSettings.get('arena.spawnKind', enemySystem.spawnKind));
spawnSelect.value=enemySystem.spawnKind;
spawnSelect.addEventListener('change', ()=>{
  enemySystem.setSpawnKind(spawnSelect.value);
  StoneSettings.set('arena.spawnKind', enemySystem.spawnKind);
  respawn();
});
const DIR_SLIDERS = [
  { label:'WAVE SIZE',       min:1,  max:12,  step:1,   get:()=>enemySystem.waveSize,       set:v=>enemySystem.setWaveSize(v) },
  { label:'PRESSURE BUDGET', min:.5, max:4,   step:.25, get:()=>enemySystem.director.settings.pressureBudget, set:v=>enemySystem.setPressureBudget(v) },
  { label:'AGGRESSION',      min:.25,max:3,   step:.05, get:()=>enemySystem.aggression,     set:v=>enemySystem.setAggression(v) },
  { label:'ENEMY SPEED',     min:.25,max:1.5, step:.05, get:()=>enemySystem.speedScale,     set:v=>enemySystem.setSpeedScale(v) },
  { label:'ENEMY HEALTH',    min:.25,max:5,   step:.05, get:()=>enemySystem.hpScale,        set:v=>enemySystem.setHpScale(v) },
  { label:'ENEMY SIZE',      min:1,  max:3.5, step:.1,  get:()=>enemySystem.heightScale,    set:v=>enemySystem.setHeightScale(v) },
  { label:'IDLE RANGE',      min:1,  max:6,   step:.25, get:()=>enemySystem.idleRangeScale, set:v=>enemySystem.setIdleRangeScale(v) },
];
const dirBox=document.getElementById('dirSliders');
DIR_SLIDERS.forEach(d=>{
  const row=document.createElement('div'); row.className='srow';
  const lab=document.createElement('div'); lab.className='slabel';
  const val=document.createElement('span'); val.className='sval'; val.textContent=d.get();
  lab.textContent=d.label+' '; lab.appendChild(val);
  const inp=document.createElement('input'); inp.type='range';
  inp.setAttribute('aria-label', d.label);
  inp.min=d.min; inp.max=d.max; inp.step=d.step; inp.value=d.get();
  inp.addEventListener('input', ()=>{ d.set(parseFloat(inp.value)); val.textContent=inp.value; });
  row.appendChild(lab); row.appendChild(inp); dirBox.appendChild(row);
});
/* feel keyframe editor */
let selKey='HAYMAKER';
const keyRow=document.getElementById('keyRow');
const feelEls={};
FEEL_KEY_ORDER.forEach(k=>{
  const b=document.createElement('button'); b.textContent=k; b.dataset.k=k;
  if(k===selKey) b.classList.add('on');
  b.addEventListener('click', ()=>{
    selKey=k;
    keyRow.querySelectorAll('button').forEach(x=>x.classList.toggle('on', x.dataset.k===k));
    syncFeelSliders();
  });

  keyRow.appendChild(b);
});
const feelBox=document.getElementById('feelSliders');
FEEL_PARAMS.forEach(pr=>{
  const row=document.createElement('div'); row.className='srow';
  const lab=document.createElement('div'); lab.className='slabel';
  const val=document.createElement('span'); val.className='sval';
  lab.textContent=pr.label+' '; lab.appendChild(val);
  const inp=document.createElement('input'); inp.type='range';
  inp.min=pr.min; inp.max=pr.max; inp.step=(pr.max-pr.min)/60;
  inp.addEventListener('input', ()=>{
    FEEL[selKey][pr.k]=parseFloat(inp.value);
    val.textContent=parseFloat(inp.value).toFixed(2);
  });
  row.appendChild(lab); row.appendChild(inp); feelBox.appendChild(row);
  feelEls[pr.k]={inp,val};
});
function syncFeelSliders(){
  for(const pr of FEEL_PARAMS){
    feelEls[pr.k].inp.value = FEEL[selKey][pr.k];
    feelEls[pr.k].val.textContent = Number(FEEL[selKey][pr.k]).toFixed(2);
  }
}
syncFeelSliders();
document.getElementById('testBtn').addEventListener('click', ()=>{
  panel.classList.add('hidden');
  beginTestSwing(FEEL_KEY_ORDER.indexOf(selKey)/3);
});

/* ---------- explicit runtime controls ---------- */
const registerControl=(group,descriptor)=>controls.register(group,descriptor);
const directorGroup={id:'panel-director',label:'ENCOUNTER DIRECTOR',source:'combat-arena'};
for(const mode of DIRECTOR_MODES){
  registerControl(directorGroup,{
    id:`director.mode.${mode.id}`,kind:'button',label:mode.label,note:'Reset encounter and select the director mode.',
    active:()=>!arena.cycleMode&&enemySystem.director.getMode()===mode.id,
    invoke:()=>setMode(mode.id),
  });
}
registerControl(directorGroup,{
  id:'director.mode.cycle',kind:'button',label:'Cycle All',note:'Rotate through director modes on each cleared wave.',
  active:()=>arena.cycleMode,invoke:()=>setMode('cycle'),
});
const loadoutGroup={id:'panel-loadout',label:'LOADOUT',source:'combat-arena'};
registerControl(loadoutGroup,{id:'loadout.weapon',kind:'button',label:'WEAPON',invoke:()=>cycleWeapon()});
registerControl(loadoutGroup,{id:'loadout.stance',kind:'button',label:'STANCE',invoke:()=>cycleStance()});
const timingGroup={id:'panel-combatTiming',label:'COMBO TIMING',source:'combat-arena'};
for(const mode of COMBAT_INPUT_MODES){
  registerControl(timingGroup,{
    id:`combatTiming.mode.${mode.id}`,kind:'button',label:mode.label,note:mode.note,
    active:()=>combatInputMode().id===mode.id,invoke:()=>setCombatInputMode(mode.id),
  });
}
const spawnOptions=[{id:'mixed',label:'Mixed Pure Strains'},{id:'goblins',label:'Goblins Only'},...FUSION_ENEMY_OPTIONS];
const simGroup={id:'panel-sim',label:'SIM',source:'combat-arena'};
registerControl(simGroup,{id:'sim.spawnKind',kind:'select',label:'ENEMY TYPE',get:()=>enemySystem.spawnKind,set:value=>{enemySystem.setSpawnKind(value);StoneSettings.set('arena.spawnKind',enemySystem.spawnKind);respawn();},options:spawnOptions});
for(const [id,label,min,max,step,get,set] of [
  ['waveSize','WAVE SIZE',1,12,1,()=>enemySystem.waveSize,value=>enemySystem.setWaveSize(value)],
  ['pressureBudget','PRESSURE BUDGET',.5,4,.25,()=>enemySystem.director.settings.pressureBudget,value=>enemySystem.setPressureBudget(value)],
  ['aggression','AGGRESSION',.25,3,.05,()=>enemySystem.aggression,value=>enemySystem.setAggression(value)],
  ['speedScale','ENEMY SPEED',.25,1.5,.05,()=>enemySystem.speedScale,value=>enemySystem.setSpeedScale(value)],
  ['hpScale','ENEMY HEALTH',.25,5,.05,()=>enemySystem.hpScale,value=>enemySystem.setHpScale(value)],
  ['heightScale','ENEMY SIZE',1,3.5,.1,()=>enemySystem.heightScale,value=>enemySystem.setHeightScale(value)],
  ['idleRangeScale','IDLE RANGE',1,6,.25,()=>enemySystem.idleRangeScale,value=>enemySystem.setIdleRangeScale(value)],
])registerControl(simGroup,{id:`sim.${id}`,kind:'range',label,min,max,step,get,set});
const feelGroup={id:'panel-keyframe',label:'FEEL',source:'combat-arena'};
for(const key of FEEL_KEY_ORDER)registerControl(feelGroup,{id:`feel.key.${key}`,kind:'button',label:key,active:()=>selKey===key,invoke:()=>{selKey=key;syncFeelSliders();}});
for(const param of FEEL_PARAMS)registerControl(feelGroup,{id:`feel.value.${param.k}`,kind:'range',label:param.label,min:param.min,max:param.max,step:(param.max-param.min)/60,get:()=>FEEL[selKey][param.k],set:value=>{FEEL[selKey][param.k]=Number(value);syncFeelSliders();}});
registerControl(feelGroup,{id:'feel.test',kind:'button',label:'TEST THIS TIER',invoke:()=>{setMenuOpenState(false);beginTestSwing(FEEL_KEY_ORDER.indexOf(selKey)/3);}});
const actionGroup={id:'panel-arena-actions',label:'ARENA ACTIONS',source:'combat-arena'};
registerControl(actionGroup,{id:'arena.reset',kind:'button',label:'RESET FIGHT',invoke:()=>{respawn();setMenuOpenState(false);}});
registerControl(actionGroup,{id:'arena.fullscreen',kind:'button',label:'FULLSCREEN',invoke:toggleFullscreen});

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
}
cardEls.forEach((el,i)=>el.addEventListener('pointerdown', e=>{ e.preventDefault(); playCard(i); }));
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
  const lightDisabled = arena.deadT >= 0 || arena.dodge.t >= 0 || arena.chain.inputLockT > 0
    || (mode.postSecondLock && (arena.chain.lightLockT > 0 || arena.chain.stage === 'finisher'))
    || (!!combatState.attack && !canBufferLight);
  const canBufferHeavy = !!combatState.attack && mode.allowHeavyBuffer
    && (arena.chain.activeSlot === 0 || arena.chain.activeSlot === 1);
  const heavyDisabled = arena.deadT >= 0 || arena.dodge.t >= 0 || arena.chain.inputLockT > 0
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
  camFollow.x += (actorPos.x - camFollow.x)*Math.min(1, rawDt*5);
  camFollow.z += (actorPos.y - camFollow.z)*Math.min(1, rawDt*5);
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
  camera.lookAt(camFollow.x+shake.x*.5, 1.8, camFollow.z-1.4+shake.z*.5);
}

/* ---------- main update ---------- */
function updatePlayer(dt, rawDt = dt){
  const d = arena.dodge;
  if(arena.deadT >= 0){
    arena.deadT += dt;
    if(arena.deadT > 2.4) respawn();
    return;
  }
  const moveStart = { x:actorPos.x, z:actorPos.y };
  arena.invulnT = Math.max(0, arena.invulnT - dt);
  d.cool = Math.max(0, d.cool - dt);
  updateChainTimers(dt);
  updateStamina(dt);

  let spd = PLAYER_SPEED;
  if(arena.charge.active) spd *= CHARGE_MOVE_MULT;
  else if(combatState.attack) spd *= PC.combatMovePenalty();

  const isMoving = Math.hypot(input.mx, input.mz) > .01;
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
  const resolvedMove = resolveCircleMovement(
    moveStart,
    { x:actorPos.x - moveStart.x, z:actorPos.y - moveStart.z },
    PLAYER_RADIUS,
    mazeWorld.getCollisionSegments()
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
  actorVisual.position.y = 0.02 + bob;
  // hurt blink
  actorVisual.visible = !(arena.invulnT > .45 && Math.floor(performance.now()/90)%2===0);

  updateCharge(dt);
  PC.updateCombat(dt, performance.now()/1000, sway, rawDt);
}

const clock = new THREE.Clock();
function frame(){
  if(!running || destroyed)return;
  frameId=requestAnimationFrame(frame);
  const rawDt = Math.min(clock.getDelta(), .05);
  // global hitstop/slow-mo: game logic runs on the frozen dt, effects + camera
  // + HUD keep animating on rawDt so the freeze reads as impact, not lag
  const dt = HitFeel.update(rawDt);
  pollPad();
  gatherInput();
  if(!isPaused()){
    if(roomTransition.active){
      updateRoomTransition(rawDt);
    } else {
      const wasShuffling = deck.shuffling;
      deck.update(dt);
      if(wasShuffling && !deck.shuffling){ cardAnim.drawn.add(0); cardAnim.drawn.add(1); renderCards(); }   // countdown done: fresh hand
      updatePlayer(dt, rawDt);
      const activeCell = findCellAtPoint(dungeon, { x:actorPos.x, z:actorPos.y }, HEX_SIZE);
      if(activeCell && activeCell.roomId !== activeRoomId){
        const door = findTransitionDoor(activeCell.roomId);
        if(door) beginRoomTransition(door, activeCell.roomId);
      }
      if(!roomTransition.active){
        enemySystem.update(dt, {
          x: actorPos.x, z: actorPos.y,
          invulnerable: arena.invulnT > 0 || arena.dodge.t >= 0 || arena.deadT >= 0
        });
        watchPlayerState(rawDt);
      }
    }
  }
  mazeWorld.update(rawDt);
  updateEffects(rawDt);
  updateCamera(rawDt);
  updateHud(rawDt);
  renderer.render(scene, camera);
}

/* ---------- boot ---------- */
spawnCharacter();
const savedArenaWeapon=normalizeStoneWeaponId(StoneSettings.get('arena.weapon','longsword'));
StoneSettings.set('arena.weapon',savedArenaWeapon);
PC.selectCombatWeapon(savedArenaWeapon);
if(!arena.stance) ensureStanceMatchesWeapon();
if(!deck.hand[0] && !deck.hand[1]) rebuildDeck();
setMode(StoneSettings.get('arena.directorMode', enemySystem.director.getMode()), { reset:false });
respawn();
updateModePanel();
if(runtimeConfig.mode==='enemy-lab'){
  startGate.classList.add('hidden');
  menuBtn.style.display='none';
  panel.classList.add('hidden');
  panel.style.display='none';
}

const resizeHandler=()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};
addEventListener('resize',resizeHandler);

const runtime={
  get ready(){ return !destroyed; },
  get running(){ return running; },
  get mode(){ return runtimeConfig.mode || 'arena'; },
  get config(){ return runtimeConfig; },
  get arena(){ return arena; },
  get enemySystem(){ return enemySystem; },
  get enemies(){ return enemySystem.enemies; },
  get queuedSpawnCount(){ return enemySystem.queuedSpawnCount || 0; },
  get telegraphCount(){ return enemySystem.telegraphCount || 0; },
  get playerHp(){ return enemySystem.playerHp; },
  get PC(){ return PC; },
  get combatState(){ return combatState; },
  get FEEL(){ return FEEL; },
  get actorPos(){ return actorPos; },
  get deck(){ return deck; },
  get dungeon(){ return dungeon; },
  get encounterState(){ return encounterState; },
  get mazeWorld(){ return mazeWorld; },
  get activeRoomId(){ return activeRoomId; },
  get roomTransition(){ return roomTransition; },
  start(){
    if(destroyed)return false;
    if(running)return true;
    running=true;
    frameId=requestAnimationFrame(frame);
    emitRuntime({type:'running',running:true});
    return true;
  },
  stop(){
    if(!running)return false;
    running=false;
    if(frameId!==null)cancelAnimationFrame(frameId);
    frameId=null;
    emitRuntime({type:'running',running:false});
    return true;
  },
  destroy(){
    if(destroyed)return false;
    this.stop();
    destroyed=true;
    removeEventListener('resize',resizeHandler);
    try{ PC.basicDashRuntime?.dispose?.(); PC.dashMagicJet?.dispose?.(); }catch{}
    try{ mazeWorld?.dispose?.(); renderer.dispose?.(); }catch{}
    controls.clear?.();
    emitRuntime({type:'destroyed'});
    runtimeListeners.clear();
    return true;
  },
  reset(){ respawn(); emitRuntime({type:'reset'}); return true; },
  setStarted(started){ setStartedState(!!started); return arena.started; },
  setPaused(paused){ arena.paused=!!paused; emitRuntime({type:'paused',paused:arena.paused}); return arena.paused; },
  setMenuOpen(open){ setMenuOpenState(!!open); return arena.menuOpen; },
  getSnapshot(){
    return {
      ready:!destroyed, running, mode:runtimeConfig.mode,
      started:arena.started, paused:arena.paused, menuOpen:arena.menuOpen,
      playerHp:enemySystem.playerHp, enemyCount:enemySystem.enemies.length,
      aliveCount:enemySystem.enemies.filter(enemy=>enemy.hp>0).length,
      queuedSpawnCount:enemySystem.queuedSpawnCount||0, telegraphCount:enemySystem.telegraphCount||0,
      weaponId:combatState.weapon, stanceName:arena.stance?.name||arena.stance?.id||'',
      activeRoomId, wave:enemySystem.wave, labMode:!!enemySystem.labMode,
    };
  },
  getControlGroups(){ return controls.getControlGroups(); },
  setControl(id,value){ return controls.setControl(id,value); },
  invokeControl(id,...args){ return controls.invokeControl(id,...args); },
  startLabScenario(roomId=-777,scenario={}){
    const result=enemySystem.startLabScenario(roomId,scenario);
    if(result?.ok){ setStartedState(true); setMenuOpenState(false); emitRuntime({type:'lab-scenario',plan:result.plan}); }
    return result;
  },
  clearRoomRuntime(){ enemySystem.clearRoomRuntime?.(); emitRuntime({type:'room-clear'}); return true; },
  beginTestSwing,
  cycleWeapon,
  cycleStance,
  playCard,
  startDeckShuffle,
  lightDown,
  heavyDown,
  attackDown,
  attackUp,
  triggerDodge,
  setCombatInputMode,
  toggleFullscreen,
  subscribe(listener){
    if(typeof listener!=='function')return()=>{};
    runtimeListeners.add(listener);
    return()=>runtimeListeners.delete(listener);
  },
};
  runtimeRef=runtime;
  if(runtimeConfig.mode==='arena'){
    installMazeRuntimeControls({ document, runtimeConfig });
    installRoadieRun({ window, document, runtimeContext });
  }
  emitRuntime({type:'ready',runtime});
  return runtime;
}
