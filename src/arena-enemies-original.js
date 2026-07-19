// Branch-local lion behavior wrapper. The full current main implementation remains
// pinned below so the Pilebunker rigid-body work and all existing enemy tuning stay
// intact while this branch changes only how the lion chooses its pursuit target.

import {
  ARENA_ENEMY_ARCHETYPES,
  createArenaEnemySystem as createPinnedArenaEnemySystem,
} from 'https://cdn.jsdelivr.net/gh/nigh3252-prog/Top-Down-Shooter-with-Controller-@5cc93e68f6d48234127bc838a38a3a810025f786/src/arena-enemies-original.js';
import { setArenaEnemySource } from './arena-enemy-registry.js';
import { FUSION_ATTACKS } from './fusion-enemies.js';
import { createDelayedPositionTracker } from './player-position-history.js';

export { ARENA_ENEMY_ARCHETYPES };

const LION_TRAIL_DELAY = 3;
const LION_ATTACK = FUSION_ATTACKS.lionPounce;
const ATTACK_START_PADDING = .22 * 4.3;
const PLAYER_RADIUS = 1.075;
const ARENA_MARGIN = 1;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const approach = (current, target, dt, rate = 6) => current + (target - current) * Math.min(1, Math.max(0, dt) * rate);

function finite(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function enemyCollisionRadius(enemy, system) {
  return Math.max(.05, finite(enemy?.radius, .94) * finite(system?.heightScale, 1) * finite(enemy?.collisionScale, 1));
}

function setLionFacing(lion, x, z) {
  const length = Math.hypot(x, z);
  if (length <= 1e-5) return;
  const nx = x / length;
  const nz = z / length;
  lion.facing = lion.facing || { x:nx, z:nz };
  lion.facing.x = nx;
  lion.facing.z = nz;
  lion.facingAngle = Math.atan2(nx, nz);
  lion.targetFacingAngle = lion.facingAngle;
  if (lion.root?.rotation) lion.root.rotation.y = lion.facingAngle;
}

export function createArenaEnemySystem(options = {}) {
  const system = createPinnedArenaEnemySystem(options);
  const navigation = options.navigation || null;
  const arenaRadius = finite(options.arenaRadius, 18);
  const history = createDelayedPositionTracker({ delaySeconds:LION_TRAIL_DELAY, retentionSeconds:4.5 });
  const baseUpdate = system.update.bind(system);
  const baseReset = system.reset?.bind(system);
  const baseStartRoomEncounter = system.startRoomEncounter?.bind(system);
  const baseClearRoomRuntime = system.clearRoomRuntime?.bind(system);
  let elapsed = 0;
  let lastPlayer = null;

  function resetTrail() {
    elapsed = 0;
    lastPlayer = null;
    history.clear();
  }

  function resolveMovement(lion, previous, dx, dz) {
    const radius = enemyCollisionRadius(lion, system);
    if (navigation?.resolveMovement) {
      const moved = navigation.resolveMovement(previous, { x:dx, z:dz }, radius);
      if (Number.isFinite(moved?.x) && Number.isFinite(moved?.z)) return moved;
    }

    let x = previous.x + dx;
    let z = previous.z + dz;
    const distance = Math.hypot(x, z);
    const limit = Math.max(1, arenaRadius - radius - ARENA_MARGIN);
    if (distance > limit) {
      x *= limit / distance;
      z *= limit / distance;
    }
    return { x, z };
  }

  function trailVector(lion, trailPoint) {
    const rawTarget = { x:trailPoint.x, z:trailPoint.z };
    const waypoint = navigation?.nextWaypoint?.(lion, rawTarget, system.activeEncounterRoomId) || rawTarget;
    const x = finite(waypoint.x) - lion.x;
    const z = finite(waypoint.z) - lion.z;
    return { x, z, distance:Math.hypot(x, z) };
  }

  function moveLionAlongTrail(lion, before, trailPoint, dt) {
    lion.x = before.x;
    lion.z = before.z;

    const target = trailVector(lion, trailPoint);
    const stopDistance = Math.max(.2, finite(lion.radius, .94) * .2);
    const maxSpeed = Math.max(.1, finite(lion.speed, 4) * finite(system.speedScale, 1));

    let targetVx = 0;
    let targetVz = 0;
    if (target.distance > stopDistance) {
      const amount = clamp((target.distance - stopDistance) / Math.max(.5, stopDistance), 0, 1);
      targetVx = target.x / target.distance * maxSpeed * amount;
      targetVz = target.z / target.distance * maxSpeed * amount;
    }

    lion.vx = approach(finite(before.vx), targetVx, dt);
    lion.vz = approach(finite(before.vz), targetVz, dt);
    const previous = { x:lion.x, z:lion.z };
    const moved = resolveMovement(lion, previous, lion.vx * dt, lion.vz * dt);
    lion.x = moved.x;
    lion.z = moved.z;
    lion.maxGroundSpeed = maxSpeed;
    lion.visualGroundSpeed = Math.min(maxSpeed, Math.hypot(lion.x - previous.x, lion.z - previous.z) / Math.max(dt, .001));
    setLionFacing(lion, target.x, target.z);
  }

  function lionAttackRange() {
    return finite(LION_ATTACK?.range, 3.45) + ATTACK_START_PADDING;
  }

  function delayedTargetIsAttackable(lion, trailPoint) {
    return trailVector(lion, trailPoint).distance <= lionAttackRange();
  }

  function canStartDelayedAttack(lion, trailPoint) {
    if (!LION_ATTACK || finite(lion.cooldown) > 0 || finite(lion.stunned) > 0) return false;
    if (!delayedTargetIsAttackable(lion, trailPoint)) return false;
    const director = system.director;
    if (!director?.hasApproachPermit?.(lion)) return false;
    return director.canGrant?.(lion, LION_ATTACK, {
      enemies:system.enemies,
      pressureBudget:director.settings?.pressureBudget,
      aggression:system.aggression,
    }) !== false;
  }

  function startDelayedAttack(lion, trailPoint) {
    const target = trailVector(lion, trailPoint);
    setLionFacing(lion, target.x, target.z);
    lion.attack = LION_ATTACK;
    lion.state = 'windup';
    lion.stateTime = 0;
    lion.windup = LION_ATTACK.windup;
    lion.active = LION_ATTACK.active;
    lion.recovery = LION_ATTACK.recovery;
    lion.hitDone = false;
    system.director?.grant?.(lion, LION_ATTACK);
  }

  function cancelWrongTargetAttack(lion) {
    system.director?.release?.(lion);
    lion.state = 'idle';
    lion.stateTime = 0;
    lion.attack = null;
    lion.windup = 0;
    lion.active = 0;
    lion.recovery = 0;
    lion.hitDone = false;
    lion.cooldown = Math.max(finite(lion.cooldown), .12);
  }

  function separateLion(lion, other) {
    let dx = lion.x - other.x;
    let dz = lion.z - other.z;
    let distance = Math.hypot(dx, dz);
    const minimum = enemyCollisionRadius(lion, system) + enemyCollisionRadius(other, system) + .22;
    if (distance >= minimum) return;
    if (distance < 1e-5) {
      const angle = ((finite(lion.id) * 31 + finite(other.id) * 17) % 360) * Math.PI / 180;
      dx = Math.cos(angle);
      dz = Math.sin(angle);
      distance = 1;
    }
    const push = (minimum - distance) / distance;
    lion.x += dx * push;
    lion.z += dz * push;
  }

  function keepLionOffPlayer(lion, player) {
    if (!player) return;
    let dx = lion.x - finite(player.x);
    let dz = lion.z - finite(player.z);
    let distance = Math.hypot(dx, dz);
    const minimum = enemyCollisionRadius(lion, system) + PLAYER_RADIUS;
    if (distance >= minimum) return;
    if (distance < 1e-5) {
      dx = Math.cos(finite(lion.id) * 1.7);
      dz = Math.sin(finite(lion.id) * 1.7);
      distance = 1;
    }
    const push = (minimum - distance) / distance;
    lion.x += dx * push;
    lion.z += dz * push;
  }

  function syncLionRoot(lion) {
    if (!lion.root?.position) return;
    lion.root.position.x = lion.x;
    lion.root.position.z = lion.z;
    if (lion.root.rotation && lion.facing) lion.root.rotation.y = Math.atan2(lion.facing.x, lion.facing.z);
  }

  system.update = function updateWithLionTrail(dt, player) {
    const frameDt = Math.max(0, finite(dt));
    lastPlayer = player || lastPlayer;
    elapsed += frameDt;
    if (lastPlayer) history.record(elapsed, lastPlayer);
    const trailPoint = history.sample(elapsed);

    const snapshots = new Map();
    for (const enemy of system.enemies) {
      if (enemy?.kind !== 'lion' || enemy.hp <= 0) continue;
      snapshots.set(enemy, {
        x:finite(enemy.x), z:finite(enemy.z), vx:finite(enemy.vx), vz:finite(enemy.vz),
        state:enemy.state, stunned:finite(enemy.stunned),
        knock:Math.hypot(finite(enemy.knockX), finite(enemy.knockZ)),
      });
    }

    baseUpdate(dt, player);
    if (!trailPoint) return;

    const movedLions = [];
    for (const [lion, before] of snapshots) {
      if (lion.hp <= 0) continue;

      if (before.state === 'idle' && lion.state === 'windup') {
        if (!delayedTargetIsAttackable(lion, trailPoint)) {
          cancelWrongTargetAttack(lion);
          if (before.stunned <= 0 && before.knock <= .05) {
            moveLionAlongTrail(lion, before, trailPoint, frameDt);
            movedLions.push(lion);
          }
        } else {
          const target = trailVector(lion, trailPoint);
          setLionFacing(lion, target.x, target.z);
          syncLionRoot(lion);
        }
        continue;
      }

      if ((before.state === 'windup' && lion.state === 'windup') ||
          (before.state === 'windup' && lion.state === 'active')) {
        const target = trailVector(lion, trailPoint);
        setLionFacing(lion, target.x, target.z);
        syncLionRoot(lion);
        continue;
      }

      if (before.state !== 'idle' || lion.state !== 'idle') continue;
      if (before.stunned > 0 || finite(lion.stunned) > 0 || before.knock > .05) continue;

      if (canStartDelayedAttack(lion, trailPoint)) {
        startDelayedAttack(lion, trailPoint);
        syncLionRoot(lion);
      } else {
        moveLionAlongTrail(lion, before, trailPoint, frameDt);
        movedLions.push(lion);
      }
    }

    for (const lion of movedLions) {
      const preCorrection = { x:lion.x, z:lion.z };
      for (const other of system.enemies) {
        if (other !== lion && other?.hp > 0) separateLion(lion, other);
      }
      keepLionOffPlayer(lion, lastPlayer);
      if (navigation?.resolveMovement) {
        const corrected = navigation.resolveMovement(
          preCorrection,
          { x:lion.x - preCorrection.x, z:lion.z - preCorrection.z },
          enemyCollisionRadius(lion, system)
        );
        if (Number.isFinite(corrected?.x) && Number.isFinite(corrected?.z)) {
          lion.x = corrected.x;
          lion.z = corrected.z;
        }
      }
      syncLionRoot(lion);
    }
  };

  if (baseReset) {
    system.reset = function resetWithLionTrail() {
      resetTrail();
      return baseReset();
    };
  }

  if (baseStartRoomEncounter) {
    system.startRoomEncounter = function startRoomEncounterWithLionTrail(roomId) {
      resetTrail();
      return baseStartRoomEncounter(roomId);
    };
  }

  if (baseClearRoomRuntime) {
    system.clearRoomRuntime = function clearRoomRuntimeWithLionTrail() {
      resetTrail();
      return baseClearRoomRuntime();
    };
  }

  Object.defineProperty(system, 'lionTrailDelaySeconds', {
    enumerable:true,
    get:() => LION_TRAIL_DELAY,
  });

  setArenaEnemySource(system);
  return system;
}
