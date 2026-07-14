// Explicit branch-local bridge for card abilities that need the arena enemy list.
// The arena-enemies wrapper registers the real system immediately after creation;
// no prototype patching, hidden discovery, or silent fallback is used.

const registry = {
  enemies: null,
  source: null,
  registeredAt: 0,
};

export function setArenaEnemySource(source) {
  const enemies = Array.isArray(source) ? source : source?.enemies;
  if (!Array.isArray(enemies)) {
    registry.enemies = null;
    registry.source = null;
    registry.registeredAt = 0;
    throw new Error('[pilebunker-effect] Arena enemy system did not expose an enemies array.');
  }
  registry.enemies = enemies;
  registry.source = source;
  registry.registeredAt = performance.now?.() ?? Date.now();
  return enemies;
}

// Kept as a no-op compatibility export for player-combat.js while older cached
// module graphs finish expiring. Enemy registration is now explicit.
export function installArenaEnemyRegistryProbe() {
  return registry;
}

export function getArenaEnemies() {
  return Array.isArray(registry.enemies) ? registry.enemies : [];
}

export function requireArenaEnemies() {
  if (!Array.isArray(registry.enemies)) {
    throw new Error('[pilebunker-effect] Arena enemy source was not registered.');
  }
  return registry.enemies;
}

export function getArenaEnemySystem() {
  if (!registry.source || typeof registry.source.damageEnemy !== 'function') {
    throw new Error('[pilebunker-effect] Arena enemy damage API was not registered.');
  }
  return registry.source;
}

// Guaranteed ability resolution should not be routed back through a sword capsule.
// The enemy system already owns damage numbers, kill handling, token release, hit
// reactions, and death pieces, so call that API directly and then layer the exact
// Pilebunker stun/impulse values on surviving enemies.
export function damageRegisteredArenaEnemy(enemy, {
  damage = 1,
  stun = 0,
  knock = 0,
  motion = { x:0, z:1 },
  power = 1,
  pop = 1,
} = {}) {
  if (!enemy || enemy.hp <= 0) return false;
  const system = getArenaEnemySystem();
  const beforeHp = enemy.hp;
  const length = Math.hypot(Number(motion.x) || 0, Number(motion.z) || 0) || 1;
  const nx = (Number(motion.x) || 0) / length;
  const nz = (Number(motion.z) || 0) / length;

  // damageEnemy applies 65% of the supplied impulse, so compensate here to make
  // the Pilebunker tuning value represent the actual desired gameplay impulse.
  const requestedKnock = Number(knock) || 0;
  system.damageEnemy(
    enemy,
    { x:nx * requestedKnock / .65, z:nz * requestedKnock / .65 },
    { power:Number(power) || 1, pop:Number(pop) || 1 }
  );

  const landed = enemy.hp < beforeHp;
  if (landed && enemy.hp > 0) {
    enemy.stunned = Math.max(enemy.stunned || 0, Number(stun) || 0);
  }
  return landed;
}

export function getArenaEnemyRegistryStatus() {
  return {
    registered:Array.isArray(registry.enemies),
    enemyCount:Array.isArray(registry.enemies) ? registry.enemies.length : 0,
    hasDamageApi:typeof registry.source?.damageEnemy === 'function',
    registeredAt:registry.registeredAt,
  };
}

export function clearArenaEnemyRegistry() {
  registry.enemies = null;
  registry.source = null;
  registry.registeredAt = 0;
}
