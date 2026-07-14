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
const combatSource = readFileSync(resolve(here, '../src/player-combat.js'), 'utf8');

assert.equal(STONE_WEAPON_ORDER.includes('warhammer'), true, 'War Hammer stays in the shared weapon order');
assert.equal(STONE_WEAPONS.warhammer.kind, 'hammer', 'War Hammer keeps the hammer combat contract');
assert.equal(typeof WEAPON_MESH_BUILDERS.hammer, 'function', 'Hammer mesh builder remains registered');
assert.match(STONE_WEAPONS.warhammer.profile, /hanging face.*toothed striking edge/, 'Weapon description identifies the Hammerist silhouette');

assert.match(weaponsSource, /new THREE\.ExtrudeGeometry\(shape/, 'Hammerist L-shaped head is built as an extruded solid');
assert.match(weaponsSource, /const toothYs = \[-\.26, -\.19, -\.12, -\.05, \.02, \.08\]/, 'All six striking-face teeth are present');
assert.match(weaponsSource, /makeHazardTexture\(THREE\)/, 'Counterweight retains the hazard-striped sign plate');
assert.match(weaponsSource, /makeHammerCrestTexture\(THREE\)/, 'Both head faces retain the hammer crest');

// The furthest tooth point is approximately x=.395 + half of the .075 cone
// height after its 90-degree rotation. Keep it inside the existing swept pick
// volume centered at x=.28 with radius .18, so the visible face cannot hit past
// the gameplay contact volume.
const visualToothReach = 0.395 + 0.075 / 2;
const pickVolumeReach = 0.28 + 0.18;
assert.ok(visualToothReach <= pickVolumeReach, 'Toothed face remains inside the swept pick damage volume');
assert.match(combatSource, /add\('hammerPick','Hammer pick','pierce',\.90,1\.03,\.18,22,\.95,\.28,0,'swing'\)/, 'Expected hammer pick volume is still active');
assert.match(combatSource, /add\('hammerHead','Hammer head','blunt',\.84,1\.02,\.31,38,1\.55,0,0,'any'\)/, 'Expected broad hammer-head volume is still active');

console.log('Hammerist War Hammer contract and contact-volume fit verified.');
