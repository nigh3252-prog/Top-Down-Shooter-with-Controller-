// Runtime bridge for the current all-in-one Stone Lab core.
//
// The raw core still has a legacy inline WEAPONS block while the codebase is in
// transition. The official Stone Weapon Lab should not use that duplicate data.
// This helper replaces the core's inline weapon definitions with data generated
// from `src/weapons.js` before the core is loaded into the iframe.

import { STONE_WEAPON_ORDER, STONE_WEAPONS } from './weapons.js';

export function createStoneWeaponDefinitionCorePatch() {
  return `const WEAPON_ORDER=${JSON.stringify(STONE_WEAPON_ORDER)};\nconst WEAPONS=${JSON.stringify(STONE_WEAPONS, null, 2)};`;
}

export function replaceCoreWeaponDefinitionsWithModuleData(html) {
  const pattern = /const WEAPON_ORDER=\[[\s\S]*?\n\};\n\n\/\* easing/;
  const replacement = `${createStoneWeaponDefinitionCorePatch()}\n\n/* easing`;
  const patched = html.replace(pattern, replacement);
  if (patched === html) {
    throw new Error('Core weapon definition block was not found for replacement.');
  }
  return patched;
}
