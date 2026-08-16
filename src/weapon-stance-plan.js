// Authored weapon-to-stance recommendations for run setup and future reward presentation.
//
// Compatibility (Speed / Balanced / Power) remains a separate axis from weapon
// preference. These starter pairs are the intentionally good teaching pair for
// each weapon; they are not generated from whichever card happens to win most
// often in a playtest.

const freezeList = values => Object.freeze([...values]);

export const WEAPON_STARTER_STANCE_IDS = Object.freeze({
  longsword: freezeList(['S26', 'S29']),
  dagger: freezeList(['S24', 'S25']),
  rapier: freezeList(['S16', 'S19']),
  katana: freezeList(['S14', 'S11']),
  mace: freezeList(['S02', 'S05']),
  whip: freezeList(['S14', 'S15']),
  spear: freezeList(['S20', 'S22']),
  battleaxe: freezeList(['S06', 'S07']),
  warhammer: freezeList(['S01', 'S04']),
  claymore: freezeList(['S26', 'S27']),
  greatsword: freezeList(['S27', 'S28']),
});

// Authored Arcana pairings for the Warden Trial's two starter stances. The
// order matches WEAPON_STARTER_STANCE_IDS above. Arcana IDs remain unique
// across weapons even where a starter stance is intentionally shared.
export const WEAPON_STARTER_ARCANA_IDS = Object.freeze({
  longsword: freezeList(['RAPID-FIRE-AGENT', 'AQUA-VORTEX']),
  dagger: freezeList(['CIRCUIT-LINE', 'SPARK-CONTACT']),
  rapier: freezeList(['PERFORATING-JET', 'STAR-BOLT']),
  katana: freezeList(['WIND-SLASH', 'FLAME-CROSS']),
  mace: freezeList(['EARTH-STOMP-AGENT', 'CHAOS-CRUSHER']),
  whip: freezeList(['AIR-BURST', 'WAVE-FRONT']),
  spear: freezeList(['SEARING-RUSH', 'EXPLOSIVE-CHARGE']),
  battleaxe: freezeList(['ROCK-SOLID-TOMAHAWK', 'ROCK-N-ROLL']),
  warhammer: freezeList(['KNOCKOUT-BOULDER', 'SPIKE-TRACK']),
  claymore: freezeList(['BOUNCING-BLAZE', 'FROST-WING']),
  greatsword: freezeList(['TERRA-RING', 'EARTHEN-AEGIS']),
});

export const PIERCING_STANCE_IDS_BY_WEAPON = Object.freeze({
  rapier: freezeList(['S16', 'S17', 'S18', 'S19']),
  spear: freezeList(['S17', 'S20', 'S21', 'S22']),
});

const WEAPON_STYLE_PREFERENCES = Object.freeze({
  longsword: freezeList(['balanced', 'longblade', 'slice', 'mixed']),
  dagger: freezeList(['fast', 'knife', 'duelist', 'pierce']),
  rapier: freezeList(['pierce', 'stab', 'precision', 'duelist']),
  katana: freezeList(['katana', 'slice', 'horizontal', 'duelist']),
  mace: freezeList(['blunt', 'impact', 'vertical']),
  whip: freezeList(['slice', 'horizontal', 'fast']),
  spear: freezeList(['reach', 'pierce', 'stab']),
  battleaxe: freezeList(['cleave', 'slice', 'heavy']),
  warhammer: freezeList(['blunt', 'heavy', 'vertical']),
  claymore: freezeList(['greatblade', 'slice', 'balanced']),
  greatsword: freezeList(['greatblade', 'heavy', 'cleave']),
});

function normalizeWeaponId(weaponId) {
  const value = String(weaponId || '').trim().toLowerCase();
  return value === 'saber' ? 'katana' : value;
}

export function starterStanceIdsForWeapon(weaponId) {
  const normalized = normalizeWeaponId(weaponId);
  return WEAPON_STARTER_STANCE_IDS[normalized] || WEAPON_STARTER_STANCE_IDS.longsword;
}

export function starterArcanaIdsForWeapon(weaponId) {
  const normalized = normalizeWeaponId(weaponId);
  return WEAPON_STARTER_ARCANA_IDS[normalized] || WEAPON_STARTER_ARCANA_IDS.longsword;
}

export function openingStanceIdForWeapon(weaponId) {
  return starterStanceIdsForWeapon(weaponId)[0];
}

export function stancePiercingCount(stance) {
  return (stance?.chain || []).filter(key => String(key).startsWith('stab')).length;
}

export function getWeaponStanceRecommendationScore({ weaponId, stance } = {}) {
  const normalized = normalizeWeaponId(weaponId);
  const id = String(stance?.id || '');
  const preferredIds = starterStanceIdsForWeapon(normalized);
  const piercingIds = PIERCING_STANCE_IDS_BY_WEAPON[normalized] || [];
  const preferredStyles = WEAPON_STYLE_PREFERENCES[normalized] || [];
  const styleTags = Array.isArray(stance?.styleTags) ? stance.styleTags : [];

  let score = preferredIds.includes(id) ? 100 : 0;
  if (Array.isArray(stance?.preferredWeapons) && stance.preferredWeapons.includes(normalized)) {
    score += 40;
  }
  score += styleTags.reduce((total, tag) => (
    total + (preferredStyles.includes(tag) ? 5 : 0)
  ), 0);
  if (piercingIds.includes(id)) score += stancePiercingCount(stance) * 10;
  return score;
}

export function rankStanceCardsForWeapon(cards, weaponId) {
  return [...(cards || [])].sort((left, right) => (
    getWeaponStanceRecommendationScore({ weaponId, stance: right })
    - getWeaponStanceRecommendationScore({ weaponId, stance: left })
  ));
}
