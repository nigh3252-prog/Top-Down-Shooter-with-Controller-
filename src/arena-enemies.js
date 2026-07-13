import {
  ARENA_ENEMY_ARCHETYPES,
  createArenaEnemySystem as createBaseArenaEnemySystem,
} from './arena-enemies-base.js';

export { ARENA_ENEMY_ARCHETYPES };

const S = 4.3;
const CHARGE_MIN = 1.65 * S;
const CHARGE_MAX = 4.2 * S;
const CHARGE_WAIT = 3.25 * S;
const CHARGE_WAIT_BAND = .55 * S;
const CHARGE_SPEED_MUL = 3.15;
const CHARGE_BACKSTEP_MUL = .25;
const SCREAM_DURATION = 1.9;
const SCREAM_RETRY_MIN = 5.5;
const SCREAM_RETRY_MAX = 10.5;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const randomBetween = (min, max) => min + Math.random() * (max - min);
const normalized = (x, z) => {
  const length = Math.hypot(x, z) || 1;
  return { x:x / length, z:z / length };
};

export function createArenaEnemySystem(options = {}){
  const system = createBaseArenaEnemySystem(options);
  const baseUpdate = system.update.bind(system);
  const navigation = options.navigation || null;
  const antelopeState = new WeakMap();

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

  function collisionRadius(enemy){
    return enemy.radius * system.heightScale * (enemy.collisionScale || 1);
  }

  function moveResolved(enemy, from, dx, dz){
    if(navigation?.resolveMovement){
      const moved = navigation.resolveMovement(from, { x:dx, z:dz }, collisionRadius(enemy));
      enemy.x = moved.x;
      enemy.z = moved.z;
    } else {
      enemy.x = from.x + dx;
      enemy.z = from.z + dz;
    }
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

  function keepAntelopeWaiting(enemy, previous, player, dt){
    const rx = enemy.x - (player.x ?? 0);
    const rz = enemy.z - (player.z ?? 0);
    const distance = Math.hypot(rx, rz) || 1;
    const radialX = rx / distance;
    const radialZ = rz / distance;
    const speed = enemy.speed * system.speedScale;
    let dx = 0;
    let dz = 0;

    if(distance > CHARGE_WAIT + CHARGE_WAIT_BAND){
      dx = -radialX * speed * dt;
      dz = -radialZ * speed * dt;
    } else if(distance < CHARGE_WAIT - CHARGE_WAIT_BAND){
      dx = radialX * speed * dt;
      dz = radialZ * speed * dt;
    } else {
      const orbit = (enemy.orbitDir || 1) * .38;
      const radialCorrection = clamp((CHARGE_WAIT - distance) / CHARGE_WAIT_BAND, -1, 1) * .24;
      dx = (-radialZ * orbit + radialX * radialCorrection) * speed * dt;
      dz = ( radialX * orbit + radialZ * radialCorrection) * speed * dt;
    }

    moveResolved(enemy, previous, dx, dz);
    enemy.vx = dx / Math.max(dt, .001);
    enemy.vz = dz / Math.max(dt, .001);
  }

  function updateAntelopeAfter(enemy, state, previous, previousState, player, dt){
    if(state.screaming && enemy._antScreamActive){
      enemy.x = previous.x;
      enemy.z = previous.z;
      enemy.vx = 0;
      enemy.vz = 0;
      const face = normalized((player.x ?? 0) - enemy.x, (player.z ?? 0) - enemy.z);
      enemy.facing = face;
      enemy.facingAngle = Math.atan2(face.x, face.z);
      return;
    }

    if(previousState === 'idle' && enemy.state === 'windup'){
      const face = normalized((player.x ?? 0) - enemy.x, (player.z ?? 0) - enemy.z);
      state.chargeVector = face;
      enemy.facing = face;
      enemy.facingAngle = Math.atan2(face.x, face.z);
      enemy.knockX = 0;
      enemy.knockZ = 0;
      enemy.vyOff = 0;
    }

    if(enemy.state === 'windup'){
      const face = normalized((player.x ?? 0) - previous.x, (player.z ?? 0) - previous.z);
      if(enemy.stateTime < enemy.windup * .45){
        state.chargeVector = face;
        enemy.facing = face;
        enemy.facingAngle = Math.atan2(face.x, face.z);
      }
      if(enemy.stateTime < enemy.windup * .58){
        const away = normalized(previous.x - (player.x ?? 0), previous.z - (player.z ?? 0));
        const distance = enemy.speed * system.speedScale * CHARGE_BACKSTEP_MUL * dt;
        moveResolved(enemy, previous, away.x * distance, away.z * distance);
        enemy.vx = away.x * distance / Math.max(dt, .001);
        enemy.vz = away.z * distance / Math.max(dt, .001);
      } else {
        enemy.x = previous.x;
        enemy.z = previous.z;
        enemy.vx = 0;
        enemy.vz = 0;
      }
      return;
    }

    if(previousState === 'windup' && enemy.state === 'active'){
      state.chargeVector = { x:enemy.facing.x, z:enemy.facing.z };
      enemy.vx = 0;
      enemy.vz = 0;
      return;
    }

    if(enemy.state === 'active'){
      const direction = state.chargeVector || enemy.facing || { x:0, z:1 };
      const distance = enemy.speed * system.speedScale * CHARGE_SPEED_MUL * dt;
      moveResolved(enemy, previous, direction.x * distance, direction.z * distance);
      enemy.facing = { x:direction.x, z:direction.z };
      enemy.facingAngle = Math.atan2(direction.x, direction.z);
      enemy.vx = direction.x * distance / Math.max(dt, .001);
      enemy.vz = direction.z * distance / Math.max(dt, .001);
      return;
    }

    if(enemy.state === 'idle') keepAntelopeWaiting(enemy, previous, player, dt);
  }

  system.update = function updateAntelopeTuning(dt, player){
    const target = player || { x:0, z:0, invulnerable:false };
    const snapshots = new Map();

    for(const enemy of system.enemies){
      if(enemy.kind !== 'ant' || enemy.hp <= 0) continue;
      const state = stateFor(enemy);
      const distance = Math.hypot((target.x ?? 0) - enemy.x, (target.z ?? 0) - enemy.z);
      updateScreamBefore(enemy, state, dt, target, distance);
      snapshots.set(enemy, { x:enemy.x, z:enemy.z, state:enemy.state });

      // PR #38 only grants the charge from a readable medium/long distance.
      if(enemy.state === 'idle' && !state.screaming && (distance < CHARGE_MIN || distance > CHARGE_MAX)){
        enemy.cooldown = Math.max(enemy.cooldown || 0, dt + .08);
      }
    }

    baseUpdate(dt, target);

    for(const enemy of system.enemies){
      if(enemy.kind !== 'ant' || enemy.hp <= 0) continue;
      const previous = snapshots.get(enemy);
      if(!previous) continue;
      updateAntelopeAfter(enemy, stateFor(enemy), previous, previous.state, target, dt);
      // The base system has already rendered this frame; keep the root aligned with
      // the wrapper's collision-safe movement correction immediately.
      if(enemy.root){
        enemy.root.position.x = enemy.x;
        enemy.root.position.z = enemy.z;
      }
    }
  };

  return system;
}
