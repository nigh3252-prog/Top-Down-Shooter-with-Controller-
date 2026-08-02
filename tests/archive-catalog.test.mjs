import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const exists=relative=>fs.existsSync(path.join(root,relative));

const rootHtml=fs.readdirSync(root,{withFileTypes:true})
  .filter(entry=>entry.isFile()&&entry.name.endsWith('.html'))
  .map(entry=>entry.name)
  .sort();
assert.deepEqual(rootHtml,['combat-arena.html','enemy-lab.html','index.html'],'only supported launcher/game HTML may remain at the repository root');

const launcher=read('index.html');
for(const href of ['combat-arena.html','enemy-lab.html','archive/index.html']){
  assert.match(launcher,new RegExp(`href="${href.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')}"`),`launcher must link directly to ${href}`);
}
assert.doesNotMatch(launcher,/top-down-shooter\.html|weapon-lab\.html|wizard-of-legend-arcana-checklist\.html|hex-maze-lab\.html|carapace-stalker-viewer\.html/,'retired pages must not remain launcher options');

const catalog=read('archive/index.html');
assert.doesNotMatch(catalog,/<iframe\b/i,'archive catalog must use direct links rather than iframe wrappers');

const moved={
  'archive/combat-labs/falcon-pilebunker-punch-lab-v2.html':'combat lab',
  'archive/combat-labs/fencer_hit_feel_lab_v3.html':'combat lab',
  'archive/combat-labs/melee_combat_director_lab_v6.html':'combat lab',
  'archive/combat-labs/punch-lab.html':'combat lab',
  'archive/combat-labs/weapon-lab.html':'combat lab',
  'archive/enemy-labs/carapace-stalker-viewer.html':'enemy lab',
  'archive/enemy-labs/fusion-lab-v2.html':'enemy lab',
  'archive/enemy-labs/mace-goblin-sandbox-v2.html':'enemy lab',
  'archive/enemy-labs/pot-goblin-viewer.html':'enemy lab',
  'archive/legacy-games/top-down-shooter.html':'legacy game',
  'archive/visual-experiments/hex-maze-lab.html':'visual experiment',
  'archive/visual-experiments/threejs_midair_lifted_ground_slice_v1.html':'visual experiment',
};
for(const [relative,category] of Object.entries(moved)){
  assert.ok(exists(relative),`${category} move target is missing: ${relative}`);
  assert.match(catalog,new RegExp(`href="${relative.slice('archive/'.length).replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')}"`),`archive catalog must link directly to ${relative}`);
}

assert.ok(exists('tools/wizard-of-legend-arcana-checklist.html'),'Arcana checklist must live under tools/');
assert.match(catalog,/href="\.\.\/tools\/wizard-of-legend-arcana-checklist\.html"/,'archive catalog must link directly to the active Arcana tool');
const arcana=read('tools/wizard-of-legend-arcana-checklist.html');
assert.match(arcana,/href="\.\.\/index\.html"/,'moved Arcana tool must retain a working launcher link');
assert.match(arcana,/const assetPrefix='\.\.\//,'moved Arcana tool must resolve its media assets from tools/');
assert.match(arcana,/data\.video\.src=assetPrefix\+data\.video\.src/,'moved Arcana tool must resolve its embedded video from tools/');

for(const relative of [
  'archive/combat-labs/weapon-lab.html',
  'archive/enemy-labs/carapace-stalker-viewer.html',
  'archive/enemy-labs/pot-goblin-viewer.html',
  'archive/visual-experiments/hex-maze-lab.html',
]){
  const html=read(relative);
  assert.doesNotMatch(html,/from ['"]\.\/src\//,`${relative} must not retain a root-relative src import after moving`);
  assert.match(html,/\.\.\/\.\.\/src\//,`${relative} must point its local imports back to the repository src directory`);
}

console.log('Archive catalog and supported root-surface validation passed.');
