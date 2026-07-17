// Weapon combat balance tables and damage multiplier helpers.
//
// Keep this module focused on math/tuning. Weapon identity data such as length,
// weight, visual variants, and pose offsets belongs in src/weapons.js; attack
// choreography belongs in src/attacks.js.

export const DAMAGE_CHANGE_MAGNITUDE = 1.5;

export function amplifyModifier(base, magnitude = DAMAGE_CHANGE_MAGNITUDE) {
  return 1 + (base - 1) * magnitude;
}

export const WEAPON_STYLE_KEYS = ['vertical', 'horizontal', 'stab', 'slice', 'pierce', 'blunt'];

export const WEAPON_AFFINITIES = {
  longsword: {
    vertical: 1.00, horizontal: 1.00, stab: 1.00,
    slice: 1.00, pierce: 1.00, blunt: 1.00
  },

  dagger: {
    vertical: 0.63, horizontal: 0.55, stab: 0.85,
    slice: 0.70, pierce: 1.08, blunt: 0.55
  },

  rapier: {
    vertical: 0.18, horizontal: 0.10, stab: 1.53,
    slice: 0.18, pierce: 1.60, blunt: 0.55
  },

  katana: {
    vertical: 1.15, horizontal: 1.33, stab: 0.63,
    slice: 1.35, pierce: 0.63, blunt: 0.63
  },

  whip: {
    vertical: 0.78, horizontal: 1.23, stab: 0.40,
    slice: 1.08, pierce: 0.55, blunt: 0.63
  },

  mace: {
    vertical: 1.23, horizontal: 1.08, stab: 0.48,
    slice: 0.48, pierce: 0.40, blunt: 1.53
  },

  spear: {
    vertical: 0.70, horizontal: 0.63, stab: 1.45,
    slice: 0.70, pierce: 1.45, blunt: 0.85
  },

  battleaxe: {
    vertical: 1.38, horizontal: 1.30, stab: 0.48,
    slice: 1.45, pierce: 0.78, blunt: 0.85
  },

  warhammer: {
    vertical: 1.53, horizontal: 1.23, stab: 0.33,
    slice: 0.33, pierce: 0.63, blunt: 1.68
  },

  claymore: {
    vertical: 1.38, horizontal: 1.45, stab: 0.93,
    slice: 1.45, pierce: 0.93, blunt: 0.85
  },

  greatsword: {
    vertical: 1.45, horizontal: 1.53, stab: 0.85,
    slice: 1.53, pierce: 0.85, blunt: 0.93
  }
};

export const ATTACK_DAMAGE_MODIFIERS = {
  // Fast/simple filler
  vertical10: 0.70,
  vertical5: 0.775,
  horizontal6: 0.73,
  stab3: 0.82,
  stab: 0.925,
  stab2: 0.925,

  // Core readable attacks
  vertical: 1.00,
  vertical2: 1.00,
  vertical3: 1.00,
  vertical4: 1.00,
  vertical8: 1.00,
  horizontal3: 1.00,
  horizontal4: 1.00,
  stab4: 1.00,

  // Authored but intentionally neutral unless tuning gives them identity
  vertical6: 1.00,
  vertical12: 1.00,
  vertical13: 1.00,
  vertical14: 1.00,

  // Flashy / identity attacks
  vertical7: 1.08,
  vertical11: 0.925,
  vertical15: 1.225,
  horizontal: 1.08,
  horizontal2: 1.08,
  stab5: 0.925,

  // Heavy / finisher attacks
  vertical9: 1.375,
  horizontal5: 1.375,
  stab6: 1.45,

  // Flashy but late-hit/unreliable. Do not make this raw-DPS king.
  vertical16: 0.925
};

let lastCombatHitContext = null;

function combatClock() {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

export function getLastCombatHitContext() {
  return lastCombatHitContext ? { ...lastCombatHitContext } : null;
}

function balanceConfigError(message, details = {}) {
  const detailText = Object.entries(details)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(' ');
  return new Error(`[combat-balance] ${message}${detailText ? ` ${detailText}` : ''}`);
}

function requireFiniteMultiplier(tableName, key, value, context = {}) {
  if (Number.isFinite(value)) return value;
  throw balanceConfigError(`Missing or non-finite ${tableName} multiplier.`, { key, value, ...context });
}

function getHitTypeMultiplier(weapon, hitType, context = {}) {
  // Some weapon contact zones use descriptive hit languages that are not direct
  // affinity columns. Resolve those terms here so the balance layer owns the
  // damage meaning instead of forcing weapon-lab.html to special-case them.
  if (hitType === 'weak') {
    return 1.0;
  }

  if (hitType === 'hybrid') {
    const pierce = requireFiniteMultiplier('weapon hit-type', 'pierce', weapon.pierce, context);
    const blunt = requireFiniteMultiplier('weapon hit-type', 'blunt', weapon.blunt, context);
    return Math.max(pierce, blunt);
  }

  return requireFiniteMultiplier('weapon hit-type', hitType, weapon[hitType], context);
}

export function getWeaponAffinity(weaponId, weaponDef) {
  const resolvedWeaponId = weaponId || weaponDef?.id;
  if (!resolvedWeaponId) {
    throw balanceConfigError('Weapon id is required for damage affinity lookup.', { weaponId, weaponDef });
  }
  const affinity = WEAPON_AFFINITIES[resolvedWeaponId];
  if (!affinity) {
    throw balanceConfigError('Unknown weapon affinity.', {
      weaponId: resolvedWeaponId,
      knownWeapons: Object.keys(WEAPON_AFFINITIES)
    });
  }
  const missingKeys = WEAPON_STYLE_KEYS.filter((key) => !Number.isFinite(affinity[key]));
  if (missingKeys.length) {
    throw balanceConfigError('Incomplete weapon affinity.', { weaponId: resolvedWeaponId, missingKeys });
  }
  return affinity;
}

export function getWeaponDamageMultiplier({
  weaponId,
  weaponDef,
  attackKey,
  attackGroup,
  hitType,
  zoneId
} = {}) {
  const resolvedWeaponId = weaponId || weaponDef?.id;
  const weapon = getWeaponAffinity(resolvedWeaponId, weaponDef);
  const groupMult = requireFiniteMultiplier('weapon attack-group', attackGroup, weapon[attackGroup], {
    weaponId: resolvedWeaponId, allowedKeys: WEAPON_STYLE_KEYS
  });
  const typeMult = getHitTypeMultiplier(weapon, hitType, {
    weaponId: resolvedWeaponId,
    allowedKeys: WEAPON_STYLE_KEYS,
    hitType,
    zoneId
  });
  const attackMult = requireFiniteMultiplier('attack', attackKey, ATTACK_DAMAGE_MODIFIERS[attackKey], {
    knownAttacks: Object.keys(ATTACK_DAMAGE_MODIFIERS)
  });
  lastCombatHitContext = {
    at:combatClock(),
    weaponId:resolvedWeaponId,
    attackKey,
    attackGroup,
    hitType,
    zoneId,
  };
  return groupMult * typeMult * attackMult;
}
