export function createArenaEnemyRegistryBridge({ getLocalSystem, setPinnedSource } = {}) {
  if (typeof getLocalSystem !== 'function') {
    throw new TypeError('[enemy-registry-bridge] getLocalSystem must be a function.');
  }
  if (typeof setPinnedSource !== 'function') {
    throw new TypeError('[enemy-registry-bridge] setPinnedSource must be a function.');
  }

  let current = null;
  let lastError = null;

  function invalidSystemError(system) {
    const enemyList = system?.enemies;
    if (!system) return new Error('[pilebunker-effect] Local arena enemy system is not registered yet.');
    if (typeof system.damageEnemy !== 'function') {
      return new Error('[pilebunker-effect] Local arena enemy system has no damageEnemy API.');
    }
    if (!Array.isArray(enemyList)) {
      return new Error('[pilebunker-effect] Local arena enemy system has no enemies array.');
    }
    return null;
  }

  function sync({ required = false } = {}) {
    let system = null;
    try {
      system = getLocalSystem();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (required) throw lastError;
      return null;
    }

    const invalid = invalidSystemError(system);
    if (invalid) {
      lastError = invalid;
      if (required) throw invalid;
      return null;
    }

    if (system !== current) {
      setPinnedSource(system);
      current = system;
    }
    lastError = null;
    return system;
  }

  return {
    sync,
    get current() { return current; },
    get lastError() { return lastError; },
  };
}
