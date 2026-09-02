import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  ENEMY_LAB_DIRECT_ARCANA_BUTTONS,
  ENEMY_LAB_LOADOUT_MODES,
  enemyLabDirectArcanaButtonsForInput,
  normalizeEnemyLabDirectArcanaBindings,
  normalizeEnemyLabLoadoutMode,
} from '../src/enemy-lab-direct-loadout.js';
import {
  ENEMY_LAB_DIRECT_COUNT_PRESETS,
  ENEMY_LAB_MAX_DIRECT_COUNT,
  clampEnemyLabDirectCount,
} from '../src/enemy-lab-direct-encounter.js';
import {WIZARD_ARCANA_CATALOG} from '../src/wizard-arcana-catalog.js';

assert.equal(normalizeEnemyLabLoadoutMode('direct'),ENEMY_LAB_LOADOUT_MODES.DIRECT);
assert.equal(normalizeEnemyLabLoadoutMode('anything-else'),ENEMY_LAB_LOADOUT_MODES.CARDS);
assert.deepEqual(ENEMY_LAB_DIRECT_ARCANA_BUTTONS.map(button=>button.id),['l1','r1','circle','dpadUp','dpadDown']);
assert.deepEqual(ENEMY_LAB_DIRECT_ARCANA_BUTTONS.map(button=>button.keyboard),['Q','E','R','X','T']);

assert.equal(WIZARD_ARCANA_CATALOG.length,70,'all authored Arcana must be available to direct bindings');
const allArcanaIds=WIZARD_ARCANA_CATALOG.map(card=>card.arcanaId);
const bindings=normalizeEnemyLabDirectArcanaBindings({
  l1:'WOL-FLAME-STRIKE',r1:'WIND-SLASH',circle:'not-real',dpadUp:'AQUA-VORTEX',dpadDown:'TERRA-RING',
},allArcanaIds);
assert.deepEqual(bindings,{l1:'FLAME-STRIKE',r1:'WIND-SLASH',circle:'',dpadUp:'AQUA-VORTEX',dpadDown:'TERRA-RING'});
assert.deepEqual(enemyLabDirectArcanaButtonsForInput({pressed:{l1:true,circle:true}},'pressed').map(button=>button.id),['l1','circle']);
assert.deepEqual(enemyLabDirectArcanaButtonsForInput({released:{r1:true,dpadDown:true}},'released').map(button=>button.id),['r1','dpadDown']);

assert.equal(ENEMY_LAB_MAX_DIRECT_COUNT,100);
assert.deepEqual(ENEMY_LAB_DIRECT_COUNT_PRESETS,[2,5,10,25,50,100]);
assert.equal(clampEnemyLabDirectCount(-5),1);
assert.equal(clampEnemyLabDirectCount(44.6),45);
assert.equal(clampEnemyLabDirectCount(1000),100);
assert.equal(clampEnemyLabDirectCount(1,{minimum:2}),2);

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const runtime=read('src/arena-runtime.js');
const lab=read('enemy-lab.html');
const shell=read('src/arena-shell.js');
const shellCss=read('src/arena-shell.css');
const enemies=read('src/arena-enemies-core.js');
const registry=read('src/arena-enemy-content-registry.js');

assert.match(runtime,/id:'loadout\.mode'[\s\S]*?DIRECT · NO STAMINA/);
assert.match(runtime,/ENEMY_LAB_DIRECT_ARCANA_BUTTONS\.forEach/);
assert.match(runtime,/resolveStaminaCost:cost=>isEnemyLabDirectLoadout\(\)\?0:cost/);
assert.match(runtime,/runtimeConfig\.enemyLab&&!ABILITY_CAPTURE_MODE/,'the 2D enemy overlay must render inside Enemy Lab');
assert.match(shell,/id="directLoadoutHud"/);
assert.match(shellCss,/data-enemy-lab-loadout="direct"\]\s*#cardRow/);
assert.match(lab,/ENEMY_LAB_DIRECT_COUNT_PRESETS/);
assert.match(lab,/maximum \$\{ENEMY_LAB_MAX_DIRECT_COUNT\}/);
assert.match(enemies,/setWaveSize\(groupPlan\.count,\{source:'enemy-lab'/);
assert.match(enemies,/Enemy Lab direct tests support up to \$\{ENEMY_LAB_MAX_DIRECT_COUNT\} enemies total/);
assert.match(registry,/accordion2d:\s*\{ label:'The Wrinkeler'/);

console.log('Enemy Lab integrated direct loadout, Arcana bindings, Wrinkeler overlay, and 100-enemy cap: ok');
