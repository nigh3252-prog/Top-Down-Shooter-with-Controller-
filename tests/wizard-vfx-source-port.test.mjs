import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source=await readFile(new URL('../src/wizard-vfx-arcana-source-port.js',import.meta.url),'utf8');
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

assert.match(runtime,/createWizardVfxSourcePort/);
assert.match(runtime,/function updateSourceVisual\(effect,system\)/);
assert.doesNotMatch(runtime,/function make(?:FlameBreath|Crown|FireBurst|FissureTrap|Dragon|Slash|Drill|Tomahawk|Breaker|Vortex)Visual/,'the old approximate VFX builders must stay removed');
assert.match(cards,/one 12-damage contact tick/);
assert.match(cards,/3\.2-second authored window/);

console.log('wizard VFX source-port coverage passed');
