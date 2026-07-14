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

export function getArenaEnemyRegistryStatus() {
  return {
    registered:Array.isArray(registry.enemies),
    enemyCount:Array.isArray(registry.enemies) ? registry.enemies.length : 0,
    registeredAt:registry.registeredAt,
  };
}

export function clearArenaEnemyRegistry() {
  registry.enemies = null;
  registry.source = null;
  registry.registeredAt = 0;
}
