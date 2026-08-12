import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  ARCANA_EFFECT_DEFINITIONS,
  EFFECT_DEFINITIONS,
  RUNTIME_HANDLER_IDS,
} from '../src/effect-registry.js';
import { WIZARD_ARCANA_CATALOG } from '../src/wizard-arcana-catalog.js';

const families=Object.freeze([
  Object.freeze({installer:'installWizardFlameStrikeRuntime',file:'wizard-flame-strike-runtime.js',runtimeHandlerId:'wizardFlameStrike',ids:['FLAME-STRIKE']}),
  Object.freeze({installer:'installWizardArcanaRuntime',file:'wizard-arcana-runtime.js',runtimeHandlerId:'wizardArcana',ids:['FLAME-CROSS','BOUNCING-BLAZE']}),
  Object.freeze({installer:'installWizardWindSlashRuntime',file:'wizard-wind-slash-runtime.js',runtimeHandlerId:'wizardWindSlash',ids:['WIND-SLASH']}),
  Object.freeze({installer:'installWizardAirBasicsRuntime',file:'wizard-air-basics-runtime.js',runtimeHandlerId:'wizardAirBasics',ids:['AIR-SPINNER','PERFORATING-JET']}),
  Object.freeze({installer:'installWizardNextSourceRuntime',file:'wizard-next-source-runtime.js',runtimeHandlerId:'wizardNextSource',ids:['EARTH-KNUCKLES','BLADED-VINE','STONE-SHOT','SPARK-CONTACT','BOLT-RAIL','VOLT-DISC']}),
  Object.freeze({installer:'installWizardNextTwentyBasicsRuntime',file:'wizard-next-twenty-basics-runtime.js',runtimeHandlerId:'wizardNextTwentyBasics',ids:['ICE-DAGGER','RIP-TIDE','AQUA-ARC','CHAOS-CRUSHER']}),
  Object.freeze({installer:'installWizardNextTwentyDashRuntime',file:'wizard-next-twenty-dash-runtime.js',runtimeHandlerId:'wizardNextTwentyDash',ids:[
    'SEARING-RUSH','FLARE-RUSH','IGNITION-RUSH','AIR-BURST','GUST-BURST','RAZOR-BURST','SPIKE-TRACK','TOXIC-TRAP',
    'SNARE-TRACK','THUNDER-LINE','CIRCUIT-LINE','SHOCK-LINE','WAVE-FRONT','FROST-FEINT','FROST-WING','CHAOTIC-RIFT',
  ]}),
  Object.freeze({installer:'installWizardRebuiltArcanaRuntime',file:'wizard-rebuilt-arcana-runtime.js',runtimeHandlerId:'wizardRebuiltArcana',ids:['HOMING-FLARES','DRAGON-ARC','WHIRLING-TORNADO','WATER-PRISON']}),
  Object.freeze({installer:'installWizardFusionLeapRuntime',file:'wizard-fusion-leap-runtime.js',runtimeHandlerId:'wizardFusionLeap',ids:['FLAME-FUSION','HEROIC-LEAP']}),
  Object.freeze({installer:'installWizardAlliedArcanaRuntime',file:'wizard-allied-arcana-runtime.js',runtimeHandlerId:'wizardAlliedArcana',ids:['RAPID-FIRE-AGENT','WARD-OF-FLAMES','MENTIS-IMPERIUM']}),
  Object.freeze({installer:'installWizardArcaneTypesRuntime',file:'wizard-arcane-types-runtime.js',runtimeHandlerId:'wizardArcaneTypes',ids:['CYCLONE-BOOMERANG','EARTHEN-AEGIS','BALL-LIGHTNING','AQUA-BEAM','ARCANE-INTERVENTION']}),
  Object.freeze({installer:'installWizardVfxArcanaRuntime',file:'wizard-vfx-arcana-runtime.js',runtimeHandlerId:'wizardVfxArcana',ids:[
    'FLAME-BREATH','SEARING-CROWN','IGNITION-DRIVE','ENGULFING-FISSURE','DRAGON-BLAST','SHEARING-CHAIN',
    'TERRA-RING','GRASPING-EARTH','TECTONIC-DRILL','ROCK-SOLID-TOMAHAWK','SHOCK-NOVA','STAR-BOLT',
    'AQUA-VORTEX','AQUA-BREAKER',
  ]}),
]);

const catalogIds=WIZARD_ARCANA_CATALOG.map(card=>card.arcanaId).sort();
const coveredIds=families.flatMap(family=>family.ids).sort();
assert.equal(WIZARD_ARCANA_CATALOG.length,60);
assert.equal(new Set(coveredIds).size,60,'runtime ownership must not duplicate an Arcana ID');
assert.deepEqual(coveredIds,catalogIds,'all 60 canonical Arcana must have one full-arena runtime owner');
assert.equal(families.find(family=>family.ids.includes('HOMING-FLARES'))?.installer,'installWizardRebuiltArcanaRuntime');
assert.equal(EFFECT_DEFINITIONS.length,63);
assert.equal(RUNTIME_HANDLER_IDS.length,15);
for(const family of families)for(const id of family.ids){
  const definition=ARCANA_EFFECT_DEFINITIONS.find(entry=>entry.arcanaId===id);
  assert.equal(definition?.runtimeHandlerId,family.runtimeHandlerId,`${id} must map to the runtime family whose play() recognizes it`);
}

const playerCombat=await readFile(new URL('../src/player-combat.js',import.meta.url),'utf8');
const arenaSource=await readFile(new URL('../src/arena-runtime.js',import.meta.url),'utf8');
for(const family of families){
  const escaped=family.installer.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  assert.match(
    playerCombat,
    new RegExp(`installArenaArcanaRuntime\\(\\(\\)=>${escaped}\\(`),
    `${family.installer} must initialize under the authored Arcana runtime context in Combat Arena`,
  );
  const source=await readFile(new URL(`../src/${family.file}`,import.meta.url),'utf8');
  assert.match(source,/canPlay/ ,`${family.file} must expose direct canPlay routing`);
  assert.match(source,/play/ ,`${family.file} must expose direct play routing`);
  assert.match(source,/readArcanaTweaks/,`${family.file} must read the saved shared Arcana size`);
  assert.match(source,/ARCANA_TWEAKS_EVENT/,`${family.file} must react when the shared Arcana size is applied`);
  assert.match(source,/clampArcanaSize/,`${family.file} must use the shared 1×–5× size contract`);
}
assert.doesNotMatch(playerCombat,/window\.__ABILITY_CARD_CAN_PLAY__\s*=/,'Combat Arena must not install the legacy ability gating global');
assert.doesNotMatch(playerCombat,/window\.__POWBUNKER_CAN_PLAY__\s*=/,'Combat Arena must not install the legacy Pilebunker gating global');
assert.doesNotMatch(playerCombat,/addEventListener\(['"](?:powbunker:play|bloodslash:play|wizard-arcana:play)/,'Combat Arena player combat must not subscribe to card-play broadcasts');
assert.doesNotMatch(arenaSource,/dispatchEvent\(new CustomEvent\(card\.playEvent/,'Combat Arena capture must route cards through the injected dispatcher');
assert.match(arenaSource,/compatibilityAdapter: null/,'Combat Arena must disable the standalone compatibility adapter');
assert.match(playerCombat,/createRuntimeHandlerTable/,'Combat Arena must build a deterministic runtime handler table');

const profileSource=await readFile(new URL('../src/combat-profile.js',import.meta.url),'utf8');
assert.match(profileSource,/COMBAT_PROFILE_VERSION=2/);
assert.match(profileSource,/arcanaSize:clampArcanaSize/);
assert.match(profileSource,/writeArcanaTweaks\(/);
assert.match(profileSource,/profile\.arcanaSize===draft\.arcanaSize/);

console.log('All 60 Arcana runtime families and the shared size setting are covered');
