import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const read=file=>readFileSync(join(root,file),'utf8');
const lab=read('enemy-lab.html');
const registry=read('src/enemy-lab-section-registry.js');
const sectionUi=read('src/enemy-lab-section-ui.js');
const runtime=read('src/arena-runtime.js');
const rosterMode=read('src/working-roster-encounter-mode.js');
const featureSources=['src/enemy-lab-working-roster.js','src/enemy-lab-working-ability-pool.js','src/enemy-lab-combat-profiles.js','src/enemy-lab-stance-compatibility.js','src/enemy-lab-deck-editor.js','src/enemy-lab-deck-editor-refinements.js'].map(read);

const ordered=['ENCOUNTER','ENEMIES / ROSTER','PLAYER LOADOUT','COMBAT BEHAVIOR','VISUALS','CAPTURE','DIAGNOSTICS','PROFILES'];
let previous=-1;
for(const label of ordered){
  const index=registry.indexOf(`label:'${label}'`);
  assert.ok(index>previous,`${label} must remain in the declared order`);
  previous=index;
}
assert.doesNotMatch(sectionUi,/TOOLS/,'the Lab section model must not expose a Tools category');
assert.doesNotMatch(sectionUi,/CLOSE LAB/,'closing the Lab belongs to the shell action, not a section');
assert.match(lab,/createEnemyLabSectionRegistry/);
assert.match(lab,/startPlannedLabEncounter/);
assert.match(runtime,/selectEncounterMode/);
assert.match(runtime,/startPlannedLabEncounter/);
assert.match(rosterMode,/Working roster was cleared; falling back/);
for(const source of featureSources)assert.doesNotMatch(source,/new MutationObserver\(/,'supported Lab feature modules must not repair categories through MutationObserver');
assert.match(lab,/width:min\(64vw,720px\)/,'landscape Lab dock must fit compact widths');
assert.match(lab,/minmax\(108px,132px\)/,'landscape category rail must use the compact eight-section width');
console.log('Enemy Lab IA and encounter boundaries: ok');
