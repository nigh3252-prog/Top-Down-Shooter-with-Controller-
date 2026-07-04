// Weapon combat balance tables and damage multiplier helpers.
//
// Keep this module focused on math/tuning. Weapon identity data such as length,
// weight, visual variants, and pose offsets belongs in src/weapons.js; attack
// choreography belongs in src/attacks.js.

export const DAMAGE_CHANGE_MAGNITUDE = 1.5;

export function amplifyModifier(base, magnitude = DAMAGE_CHANGE_MAGNITUDE) {
  return 1 + (base - 1) * magnitude;
}

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

  saber: {
    vertical: 1.08, horizontal: 1.38, stab: 0.55,
    slice: 1.30, pierce: 0.55, blunt: 0.70
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
  vertical2: 1.00,
  vertical3: 1.00,
  vertical4: 1.00,
  vertical8: 1.00,
  horizontal3: 1.00,
  horizontal4: 1.00,
  stab4: 1.00,

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

export function getWeaponDamageMultiplier({
  weaponId,
  weaponDef,
  attackKey,
  attackGroup,
  hitType,
  zoneId
} = {}) {
  const resolvedWeaponId = weaponId || weaponDef?.id || 'longsword';
  const weapon = WEAPON_AFFINITIES[resolvedWeaponId] || WEAPON_AFFINITIES.longsword;
  const groupMult = weapon?.[attackGroup] ?? 1;
  const typeMult = weapon?.[hitType] ?? 1;
  const attackMult = ATTACK_DAMAGE_MODIFIERS[attackKey] ?? 1;
  return groupMult * typeMult * attackMult;
}
