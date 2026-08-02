import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  STONE_WEAPONS,
  STONE_WEAPON_ORDER,
  WEAPON_MESH_BUILDERS
} from '../src/weapons.js';

const here = dirname(fileURLToPath(import.meta.url));
const weaponsSource = readFileSync(resolve(here, '../src/weapons.js'), 'utf8');
const combatEntrySource = readFileSync(resolve(here, '../src/player-combat.js'), 'utf8');
const combatPilebunkerSource = readFileSync(resolve(here, '../src/player-combat-pilebunker.js'), 'utf8');
const combatCoreSource = readFileSync(resolve(here, '../src/player-combat-core.js'), 'utf8');
const combatSource = [combatEntrySource, combatPilebunkerSource, combatCoreSource].join('\n');

assert.match(
  combatEntrySource,
  /from '\.\/player-combat-pilebunker\.js'/,
  'combat entry should compose the local pilebunker layer',
);
assert.match(
  combatPilebunkerSource,
  /from '\.\/player-combat-core\.js'/,
  'pilebunker layer should compose the local pinned combat core',
);
assert.doesNotMatch(
  combatSource,
  /cdn\.jsdelivr\.net\/gh\/rnighswander\/Top-Down-Android-Game@[^'"\s]+\/src\/player-combat\.js/,
  'the player combat chain should not self-import from jsDelivr',
);

assert.equal(STONE_WEAPON_ORDER.includes('warhammer'), true, 'War Hammer stays in the shared weapon order');
assert.equal(STONE_WEAPONS.warhammer.kind, 'hammer', 'War Hammer keeps the hammer combat contract');
assert.equal(typeof WEAPON_MESH_BUILDERS.hammer, 'function', 'Hammer mesh builder remains registered');
assert.match(STONE_WEAPONS.warhammer.profile, /hanging face.*toothed striking edge/, 'Weapon description identifies the Hammerist silhouette');

assert.match(weaponsSource, /new THREE\.ExtrudeGeometry\(shape/, 'Hammerist L-shaped head is built as an extruded solid');
assert.match(weaponsSource, /const toothYs = \[-\.26, -\.19, -\.12, -\.05, \.02, \.08\]/, 'All six striking-face teeth are present');
assert.match(weaponsSource, /makeHazardTexture\(THREE\)/, 'Counterweight retains the hazard-striped sign plate');
assert.match(weaponsSource, /makeHammerCrestTexture\(THREE\)/, 'Both head faces retain the hammer crest');

// Locally, the visible teeth and the pick zone share +X. The per-frame visual
// hook rotates the entire weapon root from +X toward +Z, so geometry and swept
// damage volumes receive the same clockwise 90-degree correction.
const visualToothReach = 0.395 + 0.075 / 2;
const pickVolumeReach = 0.28 + 0.18;
assert.ok(visualToothReach <= pickVolumeReach, 'Toothed face remains inside the swept pick damage volume');
assert.match(weaponsSource, /setFromAxisAngle\(new THREE\.Vector3\(0, 1, 0\), -Math\.PI \/ 2\)/, 'Hammer face rotates clockwise by 90 degrees around the shaft');
assert.match(weaponsSource, /weaponRoot\.quaternion\.multiply\(hammerYaw\)/, 'The correction rotates the shared visual and hit-zone root');
assert.match(combatSource, /weaponRoot\.quaternion\.copy\(weaponQ\); weaponRoot\.scale\.setScalar\(getCombatScale\(\)\);\s*updateWeaponDynamicVisual\(now,dt\); weaponRoot\.updateWorldMatrix/, 'Attack pose resets before the hammer yaw hook, preventing accumulated rotation');
assert.match(combatSource, /add\('hammerPick','Hammer pick','pierce',\.90,1\.03,\.18,22,\.95,\.28,0,'swing'\)/, 'Expected hammer pick volume is still active');
assert.match(combatSource, /add\('hammerHead','Hammer head','blunt',\.84,1\.02,\.31,38,1\.55,0,0,'any'\)/, 'Expected broad hammer-head volume is still active');

console.log('Hammerist War Hammer orientation and contact-volume fit verified.');
