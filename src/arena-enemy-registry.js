// Explicit branch-local bridge for card abilities that need the arena enemy list.
// The arena-enemies wrapper registers the real system immediately after creation;
// optional encounter decorators are installed here against that explicit source.

import { installWorkingRosterEncounterMode } from './working-roster-encounter-mode.js';

const registry = {
  enemies: null,
  source: null,
  registeredAt: 0,
};

function sourceEnemies() {
  const enemies = Array.isArray(registry.source) ? registry.source : registry.source?.enemies;
  return Array.isArray(enemies) ? enemies : null;
}

export function setArenaEnemySource(source) {
  const registeredSource=Array.isArray(source)?source:installWorkingRosterEncounterMode(source);
  const enemies = Array.isArray(registeredSource) ? registeredSource : registeredSource?.enemies;
  if (!Array.isArray(enemies)) {
    registry.enemies = null;
    registry.source = null;
    registry.registeredAt = 0;
    throw new Error('[pilebunker-effect] Arena enemy system did not expose an enemies array.');
  }
  registry.enemies = enemies;
  registry.source = registeredSource;
  registry.registeredAt = performance.now?.() ?? Date.now();
  return enemies;
}

// Compatibility no-op. Registration is explicit through arena-enemies.js.
export function installArenaEnemyRegistryProbe() {
  return registry;
}

export function getArenaEnemies() {
  return sourceEnemies() || [];
}

export function requireArenaEnemies() {
  const enemies = sourceEnemies();
  if (!enemies) {
    throw new Error('[pilebunker-effect] Arena enemy source was not registered.');
  }
  return enemies;
}

export function getArenaEnemySystem() {
  if (!registry.source || typeof registry.source.damageEnemy !== 'function') {
    throw new Error('[pilebunker-effect] Arena enemy damage API was not registered.');
  }
  return registry.source;
}

// Guaranteed ability resolution should not be routed through a sword capsule.
// The enemy system owns HP, kills, token release, hit reactions, and death pieces.
export function damageRegisteredArenaEnemy(enemy, {
  damage = 1,
  stun = 0,
  knock = 0,
  motion = { x:0, z:1 },
  power = 1,
  pop = 1,
  role = 'secondary',
} = {}) {
  if (!enemy || enemy.hp <= 0) return false;
  const system = getArenaEnemySystem();

  // Repair an enemy corrupted by the earlier bad damageEnemy argument order.
  // A normal page reload also clears these records, but this keeps hot previews sane.
  if (!Number.isFinite(enemy.hp)) {
    enemy.hp = Number.isFinite(enemy.maxHp) ? enemy.maxHp : 1;
    enemy.root?.scale?.set?.(1, 1, 1);
    if (enemy.root) enemy.root.visible = true;
  }

  const amount = Math.max(0, Number(damage) || 0);
  if (amount <= 0) return false;
  const beforeHp = enemy.hp;
  const length = Math.hypot(Number(motion.x) || 0, Number(motion.z) || 0) || 1;
  const nx = (Number(motion.x) || 0) / length;
  const nz = (Number(motion.z) || 0) / length;
  const requestedKnock = Math.max(0, Number(knock) || 0);

  // Correct public signature: damageEnemy(enemy, amount, knock, options).
  // The base enemy system retains 65% of the supplied impulse, so compensate.
  system.damageEnemy(
    enemy,
    amount,
    { x:nx * requestedKnock / .65, z:nz * requestedKnock / .65 },
    { power:Number(power) || 1, pop:Number(pop) || 1 }
  );

  const landed = Number.isFinite(enemy.hp) && enemy.hp < beforeHp;
  if (landed && enemy.hp > 0) {
    enemy.stunned = Math.max(enemy.stunned || 0, Number(stun) || 0);
    // One on One leaves the primary planted. Secondary surviving goblins become
    // the exact same rendered model driven as a rigid capsule projectile.
    if (role === 'secondary' && typeof system.launchRigidBody === 'function') {
      system.launchRigidBody(enemy, {
        velocityX:nx * requestedKnock,
        velocityZ:nz * requestedKnock,
        verticalVelocity:5.4 + requestedKnock * .18,
        spin:6.5 + requestedKnock * .36,
      });
    }
  }
  return landed;
}

export function getArenaEnemyRegistryStatus() {
  const enemies = getArenaEnemies();
  return {
    registered:!!sourceEnemies(),
    enemyCount:enemies.length,
    hasDamageApi:typeof registry.source?.damageEnemy === 'function',
    hasRigidLaunchApi:typeof registry.source?.launchRigidBody === 'function',
    registeredAt:registry.registeredAt,
  };
}

export function clearArenaEnemyRegistry() {
  registry.enemies = null;
  registry.source = null;
  registry.registeredAt = 0;
}
