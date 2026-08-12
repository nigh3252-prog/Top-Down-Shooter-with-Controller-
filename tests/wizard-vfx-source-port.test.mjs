import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/wizard-vfx-arcana-source-port.js',import.meta.url),'utf8');
const lightning=await readFile(new URL('../src/wizard-lightning-arcana-source-port.js',import.meta.url),'utf8');
const earth=await readFile(new URL('../src/wizard-earth-arcana-source-port.js',import.meta.url),'utf8');
const runtime=await readFile(new URL('../src/wizard-vfx-arcana-runtime.js',import.meta.url),'utf8');
const cards=await readFile(new URL('../src/wizard-vfx-arcana-cards.js',import.meta.url),'utf8');

for(const marker of [
  /const PAL = \{/,
  /const TIMELINE = \{/,
  /const NOISE_GLSL =/,
  /function ribbon\(/,
  /class BlobPool\{/,
  /function numberTexture\(/,
  /const popupPool=\[\]/,
  /function showPopups\(list\)/,
  /class AquaVortex\{/,
  /class AquaBreaker\{/,
  /class IgnitionDrive\{/,
  /class EngulfingFissure\{/,
  /class TectonicDrill\{/,
  /class RockSolidTomahawk\{/,
  /class FlameBreath\{/,
  /class SearingCrown\{/,
  /class DragonBlast\{/,
  /class ShearingChain\{/,
])assert.match(source,marker,`source port must retain ${marker}`);

for(const timeline of [
  'total:0.80',
  'total:3.50',
  'total:1.30',
  'total:3.20',
  'total:1.60',
  'total:2.10',
  'total:0.95',
  'total:1.60',
  'total:1.55',
  'total:1.35',
])assert.match(source,new RegExp(timeline.replace('.','\\.')),`source timeline ${timeline} must remain copied`);

for(const id of [
  'AQUA-VORTEX','AQUA-BREAKER','IGNITION-DRIVE','ENGULFING-FISSURE','TECTONIC-DRILL',
  'ROCK-SOLID-TOMAHAWK','FLAME-BREATH','SEARING-CROWN','DRAGON-BLAST','SHEARING-CHAIN',
])assert.match(runtime,new RegExp(`createSourceVisual\\('${id}'`),`${id} must use the copied source class`);

for(const marker of [
  /const TUNE = \{/,
  /class StarBolt\s*\{/,
  /class NovaCharge\s*\{/,
  /class ShockNova\s*\{/,
  /function applyShock\(/,
  /onDischarge\(\{dummy, damage:dmg\}\)/,
  /function createWizardLightningSourcePort\(/,
])assert.match(lightning,marker,`lightning source port must retain ${marker}`);

for(const marker of [
  /const CFG = \{/,
  /function castTerraRing\(/,
  /function beginGraspHold\(/,
  /function releaseGrasp\(/,
  /function buildFist\(/,
  /function createWizardEarthArcanaSourcePort\(/,
])assert.match(earth,marker,`earth source port must retain ${marker}`);

for(const id of ['TERRA-RING','GRASPING-EARTH','SHOCK-NOVA','STAR-BOLT'])
  assert.match(runtime,new RegExp(`createStandaloneSource\\('${id}'`),`${id} must use its exact standalone source port`);
assert.match(runtime,/createWizardLightningSourcePort/);
assert.match(runtime,/createWizardEarthArcanaSourcePort/);
assert.match(runtime,/standaloneSource:true/);
assert.match(runtime,/Arcana Size scales the source visual and collision footprint only/);

assert.match(runtime,/createWizardVfxSourcePort/);
assert.match(runtime,/function updateSourceVisual\(effect,system\)/);
assert.match(runtime,/startDashMotion/,'Shearing Chain must use the shared dash controller');
assert.match(runtime,/distanceMultiplier:\(SHEARING_CHAIN_SOURCE_ROUTE\/dashDistance\(\)\)\*size/,'Shearing Chain travel must scale with Arcana Size');
assert.doesNotMatch(runtime,/const travel=Math\.min\(3\.8/,'Shearing Chain must not use the former fixed manual translation');
assert.match(runtime,/sourceLocalCameraQuaternion\.copy\(sourceWorldQuaternion\)\.invert\(\)\.multiply\(cameraQuaternion\)/,'source billboards must receive camera orientation in their local parent space');
assert.match(source,/m\.quaternion\.copy\(camQuat\)/,'the copied source BlobPool must retain its camera-facing quad behavior');
assert.doesNotMatch(runtime,/function make(?:FlameBreath|Crown|FireBurst|FissureTrap|Dragon|Slash|Drill|Tomahawk|Breaker|Vortex)Visual/,'the old approximate VFX builders must stay removed');
assert.match(cards,/one 12-damage contact tick/);
assert.match(cards,/3\.2-second authored window/);

console.log('wizard VFX source-port coverage passed');
