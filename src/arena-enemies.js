import {
  ARENA_ENEMY_ARCHETYPES,
  createArenaEnemySystem as createBaseArenaEnemySystem,
} from './arena-enemies-base.js';
import { FUSION_ATTACKS } from './fusion-enemies.js';

export { ARENA_ENEMY_ARCHETYPES };

const S = 4.3;
const CHARGE_MIN = 1.65 * S;
const CHARGE_MAX = 4.2 * S;
const CHARGE_WAIT = 3.25 * S;
const CHARGE_SPEED_MUL = 3.15;
const CHARGE_BACKSTEP_MUL = .25;
const CHARGE_MIN_HIT_RANGE = .28 * S;
const CHARGE_CONTACT_PAD = .12;
const BASE_ACTIVE_LUNGE_SPEED = .5 * S;
const SCREAM_DURATION = 1.9;
const SCREAM_RETRY_MIN = 5.5;
const SCREAM_RETRY_MAX = 10.5;
const MIN_RANGE_COOLDOWN_GUARD = .25;
const CONTROLLED_CHARGE_MOVEMENT = 'antChargeControlled';

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

const randomBetween = (min, max) => min + Math.random() * (max - min);
const normalized = (x, z) => {
  const length = Math.hypot(x, z) || 1;
  return { x:x / length, z:z / length };
};

export function createArenaEnemySystem(options = {}){
  const system = createBaseArenaEnemySystem(options);
  const baseUpdate = system.update.bind(system);
  const baseDirectorUpdate = system.director.update.bind(system.director);
  const antelopeState = new WeakMap();

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

  function prepareChargeMovement(enemy, state, dt, player){
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
      const baseSpeed = enemy._pressureBaseSpeed || enemy.speed;
      const desiredSpeed = baseSpeed * system.speedScale * CHARGE_SPEED_MUL;
      const supplementalSpeed = Math.max(0, desiredSpeed - BASE_ACTIVE_LUNGE_SPEED);
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

  system.update = function updateAntelopeTuning(dt, player){
    const target = player || { x:0, z:0, invulnerable:false };
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

      // Supplemental velocity is injected before baseUpdate so wall and body
      // collision resolution remains the final authority. Clear its decayed residue
      // after the frame so it never leaks into recovery or later hit reactions.
      if(previous.state === 'windup' || previous.state === 'active' || enemy.state === 'active'){
        enemy.knockX = 0;
        enemy.knockZ = 0;
      }
    }
  };

  return system;
}
