import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { WIZARD_ARCANA_CATALOG } from '../src/wizard-arcana-catalog.js';

const families=Object.freeze([
  Object.freeze({installer:'installWizardFlameStrikeRuntime',file:'wizard-flame-strike-runtime.js',ids:['FLAME-STRIKE']}),
  Object.freeze({installer:'installWizardArcanaRuntime',file:'wizard-arcana-runtime.js',ids:['FLAME-CROSS','BOUNCING-BLAZE']}),
  Object.freeze({installer:'installWizardWindSlashRuntime',file:'wizard-wind-slash-runtime.js',ids:['WIND-SLASH']}),
  Object.freeze({installer:'installWizardAirBasicsRuntime',file:'wizard-air-basics-runtime.js',ids:['AIR-SPINNER','PERFORATING-JET']}),
  Object.freeze({installer:'installWizardNextSourceRuntime',file:'wizard-next-source-runtime.js',ids:['EARTH-KNUCKLES','BLADED-VINE','STONE-SHOT','SPARK-CONTACT','BOLT-RAIL','VOLT-DISC']}),
  Object.freeze({installer:'installWizardNextTwentyBasicsRuntime',file:'wizard-next-twenty-basics-runtime.js',ids:['ICE-DAGGER','RIP-TIDE','AQUA-ARC','CHAOS-CRUSHER']}),
  Object.freeze({installer:'installWizardNextTwentyDashRuntime',file:'wizard-next-twenty-dash-runtime.js',ids:[
    'SEARING-RUSH','FLARE-RUSH','IGNITION-RUSH','AIR-BURST','GUST-BURST','RAZOR-BURST','SPIKE-TRACK','TOXIC-TRAP',
    'SNARE-TRACK','THUNDER-LINE','CIRCUIT-LINE','SHOCK-LINE','WAVE-FRONT','FROST-FEINT','FROST-WING','CHAOTIC-RIFT',
  ]}),
  Object.freeze({installer:'installWizardRebuiltArcanaRuntime',file:'wizard-rebuilt-arcana-runtime.js',ids:['HOMING-FLARES','DRAGON-ARC','WHIRLING-TORNADO','WATER-PRISON']}),
  Object.freeze({installer:'installWizardFusionLeapRuntime',file:'wizard-fusion-leap-runtime.js',ids:['FLAME-FUSION','HEROIC-LEAP']}),
  Object.freeze({installer:'installWizardAlliedArcanaRuntime',file:'wizard-allied-arcana-runtime.js',ids:['RAPID-FIRE-AGENT','WARD-OF-FLAMES','MENTIS-IMPERIUM']}),
  Object.freeze({installer:'installWizardArcaneTypesRuntime',file:'wizard-arcane-types-runtime.js',ids:['CYCLONE-BOOMERANG','EARTHEN-AEGIS','BALL-LIGHTNING','AQUA-BEAM','ARCANE-INTERVENTION']}),
]);

const catalogIds=WIZARD_ARCANA_CATALOG.map(card=>card.arcanaId).sort();
const coveredIds=families.flatMap(family=>family.ids).sort();
assert.equal(WIZARD_ARCANA_CATALOG.length,46);
assert.equal(new Set(coveredIds).size,46,'runtime ownership must not duplicate an Arcana ID');
assert.deepEqual(coveredIds,catalogIds,'all 46 canonical Arcana must have one full-arena runtime owner');
assert.equal(families.find(family=>family.ids.includes('HOMING-FLARES'))?.installer,'installWizardRebuiltArcanaRuntime');

const playerCombat=await readFile(new URL('../src/player-combat.js',import.meta.url),'utf8');
for(const family of families){
  const escaped=family.installer.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  assert.match(
    playerCombat,
    new RegExp(`installArenaArcanaRuntime\\(\\(\\)=>${escaped}\\(`),
    `${family.installer} must initialize under the authored Arcana runtime context in Combat Arena`,
  );
  const source=await readFile(new URL(`../src/${family.file}`,import.meta.url),'utf8');
  assert.match(source,/readArcanaTweaks/,`${family.file} must read the saved shared Arcana size`);
  assert.match(source,/ARCANA_TWEAKS_EVENT/,`${family.file} must react when the shared Arcana size is applied`);
  assert.match(source,/clampArcanaSize/,`${family.file} must use the shared 1×–5× size contract`);
}

const profileSource=await readFile(new URL('../src/combat-profile.js',import.meta.url),'utf8');
assert.match(profileSource,/COMBAT_PROFILE_VERSION=2/);
assert.match(profileSource,/arcanaSize:clampArcanaSize/);
assert.match(profileSource,/writeArcanaTweaks\(/);
assert.match(profileSource,/profile\.arcanaSize===draft\.arcanaSize/);

console.log('All 46 Arcana runtime families and the shared size setting are covered');
