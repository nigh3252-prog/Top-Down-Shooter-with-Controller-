// Localized from commit a256b089bf912aff434f5b1263a29ec060507b5d so
// the original enemy roster uses this branch's local combat-director module.
import {
  ARENA_ENEMY_ARCHETYPES,
  createArenaEnemySystem as createBaseArenaEnemySystem,
} from './arena-enemies-base.js';
import { FUSION_ATTACKS } from './fusion-enemies.js';
import { StoneSettings } from './settings.js';

export { ARENA_ENEMY_ARCHETYPES };

const S = 4.3;
const CHARGE_MIN = 1.65 * S;
const CHARGE_MAX = 4.2 * S;
const CHARGE_WAIT = 3.25 * S;
const CHARGE_SPEED_MUL = 3.15;
const CHARGE_BACKSTEP_MUL = .25;
const CHARGE_GAIT_SPEED_EXPONENT = 1 / 3;
const CHARGE_MIN_HIT_RANGE = .28 * S;
const CHARGE_CONTACT_PAD = .12;
const BASE_ACTIVE_LUNGE_SPEED = .5 * S;
const SCREAM_DURATION = 1.9;
const SCREAM_RETRY_MIN = 5.5;
const SCREAM_RETRY_MAX = 10.5;
const MIN_RANGE_COOLDOWN_GUARD = .25;
const CONTROLLED_CHARGE_MOVEMENT = 'antChargeControlled';
const CHARGE_SPEED_SETTING = 'arena.antelopeChargeSpeedScale';
const CHARGE_SPEED_MIN = 1;
const CHARGE_SPEED_MAX = 10;
const CHARGE_SPEED_STEP = .25;
const CHARGE_SUBSTEP_MAX_TRAVEL = 1;
const CHARGE_SUBSTEP_LIMIT = 12;

const antCharge = FUSION_ATTACKS.antCharge;
Object.assign(antCharge, {
  // The base chooser adds .22*S to melee ranges. Store the remaining distance
  // here so the outer edge of the initiation window is exactly CHARGE_MAX.
  range:CHARGE_MAX - .22 * S,
  tokenCost:1.4,
  windup:.82,
  active:2.30,
  recovery:.72,
  cooldown:2.35,
  damage:16,
  arc:.68,
  knock:.9 * S,
  movement:CONTROLLED_CHARGE_MOVEMENT,
  wantsSolo:true,
});

const clampValue = (value, min, max) => Math.max(min, Math.min(max, value));
const randomBetween = (min, max) => min + Math.random() * (max - min);
const normalized = (x, z) => {
  const length = Math.hypot(x, z) || 1;
  return { x:x / length, z:z / length };
};
const formatMultiplier = value => `${Number(value).toFixed(2)}×`;

export function createArenaEnemySystem(options = {}){
  const system = createBaseArenaEnemySystem(options);
  const baseUpdate = system.update.bind(system);
  const baseDamageEnemy = system.damageEnemy.bind(system);
  const baseDirectorUpdate = system.director.update.bind(system.director);
  const antelopeState = new WeakMap();
  let antelopeChargeSpeedScale = clampValue(
    Number(StoneSettings.get(CHARGE_SPEED_SETTING, 1)) || 1,
    CHARGE_SPEED_MIN,
    CHARGE_SPEED_MAX,
  );

  function isAntelope(enemy){
    return enemy?.kind === 'ant' && enemy.hp > 0;
  }

  function stateFor(enemy){
    let state = antelopeState.get(enemy);
    if(!state){
      state = {
        screamCooldown:randomBetween(SCREAM_RETRY_MIN, SCREAM_RETRY_MAX),
        screamTime:0,
        screaming:false,
        chargeVector:{ x:enemy.facing?.x || 0, z:enemy.facing?.z || 1 },
      };
      antelopeState.set(enemy, state);
    }
    return state;
  }

  function configureAntelope(enemy){
    enemy.stop = CHARGE_WAIT;
    enemy.holdDist = CHARGE_WAIT;
    enemy.preferredRange = CHARGE_WAIT;
    enemy._pressureBasePreferredRange = CHARGE_WAIT;
  }

  function chargeContactRange(enemy){
    // Body collision keeps the player and enemy centers at least one scaled enemy
    // radius plus PLAYER_R apart. Match that physical boundary instead of using the
    // unscaled PR #38 number, otherwise the collision pass prevents contact damage.
    const scaledCollisionRadius = enemy.radius * system.heightScale * (enemy.collisionScale || 1);
    return Math.max(CHARGE_MIN_HIT_RANGE, scaledCollisionRadius + CHARGE_CONTACT_PAD);
  }

  function hideAntelopeDebugMarkers(enemy){
    // The charge animation is the telegraph. The generic rings look like exposed
    // rig controls here, and the telegraph ring becomes enormous at initiation range.
    if(enemy.telegraph) enemy.telegraph.visible = false;
    if(enemy.tokenRing) enemy.tokenRing.visible = false;
  }

  function cancelScream(enemy, state, resetCooldown=true){
    if(!state.screaming) return;
    state.screaming = false;
    state.screamTime = 0;
    enemy._antScreamActive = false;
    if(enemy.gesture === 'rally') enemy.gesture = null;
    enemy.gestureTime = 0;
    system.director.endRally(enemy);
    if(resetCooldown) state.screamCooldown = randomBetween(SCREAM_RETRY_MIN, SCREAM_RETRY_MAX);
  }

  function updateScreamBefore(enemy, state, dt, player, distance){
    if(state.screaming){
      if(enemy.token || enemy.directEngaged || enemy.state !== 'idle' || enemy.stunned > 0){
        cancelScream(enemy, state);
        return;
      }
      state.screamTime += dt;
      enemy.gesture = 'rally';
      enemy.gestureTime = state.screamTime;
      enemy.gestureDuration = SCREAM_DURATION;
      enemy._antScreamActive = true;
      enemy.vx = 0;
      enemy.vz = 0;
      const face = normalized((player.x ?? 0) - enemy.x, (player.z ?? 0) - enemy.z);
      enemy.facing = face;
      enemy.facingAngle = Math.atan2(face.x, face.z);
      if(state.screamTime >= SCREAM_DURATION) cancelScream(enemy, state);
      return;
    }

    enemy._antScreamActive = false;
    if(enemy.state !== 'idle' || enemy.token || enemy.directEngaged || enemy.stunned > 0) return;
    state.screamCooldown -= dt;
    const comfortablyWaiting = distance >= CHARGE_MIN && distance <= CHARGE_MAX;
    if(state.screamCooldown > 0 || !comfortablyWaiting) return;

    if(system.director.requestRally(enemy)){
      state.screaming = true;
      state.screamTime = 0;
      enemy.gesture = 'rally';
      enemy.gestureTime = 0;
      enemy.gestureDuration = SCREAM_DURATION;
      enemy._antScreamActive = true;
      enemy.vx = 0;
      enemy.vz = 0;
    } else {
      state.screamCooldown = randomBetween(.7, 1.4);
    }
  }

  function baseChargeSpeed(enemy){
    const baseSpeed = enemy._pressureBaseSpeed || enemy.speed;
    return baseSpeed * system.speedScale * CHARGE_SPEED_MUL;
  }

  function desiredChargeSpeed(enemy){
    return baseChargeSpeed(enemy) * antelopeChargeSpeedScale;
  }

  function desiredChargeGaitSpeed(enemy){
    // Movement scales linearly, but leg cadence scales only by the cube root. At the
    // tested 4× movement speed this is about 1.59× cadence, reading as a long lope
    // rather than four-times-faster skittering.
    return baseChargeSpeed(enemy) * Math.pow(antelopeChargeSpeedScale, CHARGE_GAIT_SPEED_EXPONENT);
  }

  function prepareChargeMovement(enemy, state, dt, player){
    enemy._antChargeGaitSpeed = 0;
    if(enemy.state === 'windup'){
      if(enemy.stateTime < enemy.windup * .58){
        const away = normalized(enemy.x - (player.x ?? 0), enemy.z - (player.z ?? 0));
        const baseSpeed = enemy._pressureBaseSpeed || enemy.speed;
        const backstepSpeed = baseSpeed * system.speedScale * CHARGE_BACKSTEP_MUL;
        enemy.knockX = away.x * backstepSpeed;
        enemy.knockZ = away.z * backstepSpeed;
      } else {
        enemy.knockX = 0;
        enemy.knockZ = 0;
      }
      return;
    }

    if(enemy.state === 'active'){
      const direction = state.chargeVector || enemy.facing || { x:0, z:1 };
      enemy.facing = { x:direction.x, z:direction.z };
      enemy.facingAngle = Math.atan2(direction.x, direction.z);
      const desiredSpeed = desiredChargeSpeed(enemy);
      const supplementalSpeed = Math.max(0, desiredSpeed - BASE_ACTIVE_LUNGE_SPEED);
      enemy._antChargeGaitSpeed = desiredChargeGaitSpeed(enemy);
      enemy.knockX = direction.x * supplementalSpeed;
      enemy.knockZ = direction.z * supplementalSpeed;
    }
  }

  // The base update calls the director immediately before updating enemy state.
  // Restore Antelope spacing and gates after pressure tuning, so the director can
  // select one at the intended charge distance without collapsing it to 3.8 units.
  system.director.update = function updateDirectorWithAntelopeRules(dt, context = {}){
    baseDirectorUpdate(dt, context);
    const player = context.player || { x:0, z:0 };
    for(const enemy of context.enemies || system.enemies){
      if(!isAntelope(enemy)) continue;
      const state = stateFor(enemy);
      configureAntelope(enemy);
      if(state.screaming){
        enemy.speed = 0;
        enemy.cooldown = Math.max(enemy.cooldown || 0, MIN_RANGE_COOLDOWN_GUARD);
        continue;
      }
      const distance = Math.hypot((player.x ?? 0) - enemy.x, (player.z ?? 0) - enemy.z);
      if(enemy.state === 'idle' && distance < CHARGE_MIN){
        enemy.cooldown = Math.max(enemy.cooldown || 0, MIN_RANGE_COOLDOWN_GUARD);
      }
    }
  };

  function updateAntelopeStep(dt, target){
    const snapshots = new Map();

    for(const enemy of system.enemies){
      if(!isAntelope(enemy)) continue;
      const state = stateFor(enemy);
      configureAntelope(enemy);
      const distance = Math.hypot((target.x ?? 0) - enemy.x, (target.z ?? 0) - enemy.z);
      updateScreamBefore(enemy, state, dt, target, distance);
      prepareChargeMovement(enemy, state, dt, target);
      snapshots.set(enemy, {
        state:enemy.state,
        role:enemy.role,
      });

      // Reach-sentinel spacing supplies both halves missing from the generic charger:
      // approach when far away and actively retreat when crowded inside the launch band.
      enemy.role = 'reach sentinel';
    }

    baseUpdate(dt, target);

    for(const enemy of system.enemies){
      if(!isAntelope(enemy)) continue;
      const state = stateFor(enemy);
      const previous = snapshots.get(enemy);
      if(!previous) continue;
      enemy.role = previous.role;
      configureAntelope(enemy);
      hideAntelopeDebugMarkers(enemy);

      if(previous.state === 'idle' && enemy.state === 'windup'){
        state.chargeVector = { x:enemy.facing.x, z:enemy.facing.z };
        // Remove the director's generic initiation hop/impulse. The Antelope owns
        // its backstep and committed rush inside the regular movement/collision pass.
        enemy.knockX = 0;
        enemy.knockZ = 0;
        enemy.vyOff = 0;
        // Trigger range and contact range are deliberately separate. Contact range
        // follows the scaled physical collider so touching charges can actually hit.
        enemy.attack = { ...enemy.attack, range:chargeContactRange(enemy) };
      } else if(previous.state === 'windup' && enemy.state === 'active'){
        state.chargeVector = { x:enemy.facing.x, z:enemy.facing.z };
        enemy.knockX = 0;
        enemy.knockZ = 0;
      }

      if(enemy.state !== 'active') enemy._antChargeGaitSpeed = 0;

      // Supplemental velocity is injected before baseUpdate so wall and body
      // collision resolution remains the final authority. Clear its decayed residue
      // after the frame so it never leaks into recovery or later hit reactions.
      if(previous.state === 'windup' || previous.state === 'active' || enemy.state === 'active'){
        enemy.knockX = 0;
        enemy.knockZ = 0;
      }
    }
  }

  function chargeSubstepCount(dt){
    let maxTravel = 0;
    for(const enemy of system.enemies){
      if(!isAntelope(enemy) || enemy.state !== 'active') continue;
      maxTravel = Math.max(maxTravel, desiredChargeSpeed(enemy) * dt);
    }
    return clampValue(Math.ceil(maxTravel / CHARGE_SUBSTEP_MAX_TRAVEL), 1, CHARGE_SUBSTEP_LIMIT);
  }

  system.update = function updateAntelopeTuning(dt, player){
    const target = player || { x:0, z:0, invulnerable:false };
    // At high multipliers a full frame can cross the entire contact zone. Split only
    // active-charge frames so the existing melee and wall checks still see the path.
    const steps = chargeSubstepCount(dt);
    const stepDt = dt / steps;
    for(let step = 0; step < steps; step++) updateAntelopeStep(stepDt, target);
  };

  system.damageEnemy = function damageEnemyWithActiveChargeArmor(enemy, amount, knock = { x:0, z:0 }, opts = {}){
    const activeChargeArmor = isAntelope(enemy) && enemy.state === 'active' && Number(amount) < enemy.hp;
    if(!activeChargeArmor) return baseDamageEnemy(enemy, amount, knock, opts);

    // Preserve the committed charge while still routing the hit through the shared
    // damage system for HP loss, hit flash, damage numbers, audio, and kill accounting.
    // Disguising the state prevents the base function from resetting it to idle; the
    // temporary director override preserves the existing attack token.
    const preserved = {
      state:enemy.state,
      stateTime:enemy.stateTime,
      stunned:enemy.stunned,
      knockX:enemy.knockX,
      knockZ:enemy.knockZ,
      yOff:enemy.yOff,
      vyOff:enemy.vyOff,
      spin:enemy.spin,
      spinVel:enemy.spinVel,
      squash:enemy.squash,
      squashT:enemy.squashT,
      squashMax:enemy.squashMax,
    };
    const releaseAllForEnemy = system.director.releaseAllForEnemy;
    system.director.releaseAllForEnemy = ()=>{};
    enemy.state = CONTROLLED_CHARGE_MOVEMENT;

    let killed = false;
    try {
      killed = baseDamageEnemy(enemy, amount, knock, opts);
    } finally {
      system.director.releaseAllForEnemy = releaseAllForEnemy;
    }
    if(killed || enemy.hp <= 0) return killed;

    Object.assign(enemy, preserved);
    return false;
  };

  system.setAntelopeChargeSpeedScale = function setAntelopeChargeSpeedScale(value, { persist=true } = {}){
    antelopeChargeSpeedScale = clampValue(Number(value) || 1, CHARGE_SPEED_MIN, CHARGE_SPEED_MAX);
    if(persist) StoneSettings.set(CHARGE_SPEED_SETTING, antelopeChargeSpeedScale);
    return antelopeChargeSpeedScale;
  };
  Object.defineProperty(system, 'antelopeChargeSpeedScale', {
    configurable:true,
    enumerable:true,
    get:()=>antelopeChargeSpeedScale,
  });

  function installAntelopeTuningControl(){
    if(typeof document === 'undefined') return;
    const dirTab = document.getElementById('dirTab');
    const resetButton = document.getElementById('resetBtn');
    if(!dirTab || !resetButton || document.getElementById('antelopeTuningHeader')) return;

    const header = document.createElement('button');
    header.type = 'button';
    header.id = 'antelopeTuningHeader';
    header.className = 'ptitle';

    const body = document.createElement('div');
    body.id = 'body-antelopeTuning';
    body.className = 'sbody';

    const row = document.createElement('div');
    row.className = 'srow';
    const label = document.createElement('div');
    label.className = 'slabel';
    label.textContent = 'CHARGE RUN SPEED ';
    const value = document.createElement('span');
    value.className = 'sval';
    value.textContent = formatMultiplier(antelopeChargeSpeedScale);
    label.appendChild(value);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = CHARGE_SPEED_MIN;
    slider.max = CHARGE_SPEED_MAX;
    slider.step = CHARGE_SPEED_STEP;
    slider.value = antelopeChargeSpeedScale;
    slider.setAttribute('aria-label', 'Screaming Antelope charge run speed');
    slider.addEventListener('input', ()=>{
      const next = system.setAntelopeChargeSpeedScale(parseFloat(slider.value));
      value.textContent = formatMultiplier(next);
    });

    const note = document.createElement('div');
    note.className = 'ptitle';
    note.style.marginTop = '-12px';
    note.style.lineHeight = '1.4';
    note.textContent = '1.00× = current speed · up to 10.00×';

    row.appendChild(label);
    row.appendChild(slider);
    body.appendChild(row);
    body.appendChild(note);
    dirTab.insertBefore(header, resetButton);
    dirTab.insertBefore(body, resetButton);

    const sectionKey = 'arena.section.antelopeTuning';
    let collapsed = !!StoneSettings.get(sectionKey, true);
    const applyCollapsed = ()=>{
      body.style.display = collapsed ? 'none' : 'block';
      header.textContent = `${collapsed ? '▸' : '▾'} SCREAMING ANTELOPE`;
    };
    header.addEventListener('click', ()=>{
      collapsed = !collapsed;
      StoneSettings.set(sectionKey, collapsed);
      applyCollapsed();
    });
    applyCollapsed();
  }

  installAntelopeTuningControl();
  return system;
}
