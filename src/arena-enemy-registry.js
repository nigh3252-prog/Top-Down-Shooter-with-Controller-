// Branch-local bridge for card abilities that need to address arena enemies.
//
// The current arena enemy factory keeps its enemy array inside combat-arena.html's
// module closure and does not yet expose a control/status API. During arena boot we
// briefly observe Array#push until the first unmistakable arena-enemy record is
// inserted, retain that array reference, and immediately restore the native method.
// This is intentionally isolated here so it can be deleted when the enemy system
// gains an explicit ability-effects interface.

const registry = {
  enemies: null,
  installed: false,
  restore: null,
};

function looksLikeArenaEnemy(value) {
  return !!value
    && typeof value === 'object'
    && Number.isFinite(value.hp)
    && Number.isFinite(value.x)
    && Number.isFinite(value.z)
    && 'knockX' in value
    && 'knockZ' in value
    && value.root?.isObject3D
    && /arena enemy/i.test(value.root.name || '');
}

export function installArenaEnemyRegistryProbe() {
  if (registry.enemies || registry.installed || typeof Array === 'undefined') return registry;
  registry.installed = true;

  const nativePush = Array.prototype.push;
  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    if (Array.prototype.push === observedPush) Array.prototype.push = nativePush;
    registry.installed = false;
    registry.restore = null;
  };
  function observedPush(...items) {
    const result = nativePush.apply(this, items);
    if (!registry.enemies && items.some(looksLikeArenaEnemy)) {
      registry.enemies = this;
      restore();
    }
    return result;
  }

  registry.restore = restore;
  Array.prototype.push = observedPush;
  return registry;
}

export function getArenaEnemies() {
  return Array.isArray(registry.enemies) ? registry.enemies : [];
}

export function clearArenaEnemyRegistry() {
  registry.restore?.();
  registry.enemies = null;
}
