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
const profiles=read('src/enemy-lab-combat-profiles.js');
const setupWorkflow=read('src/enemy-lab-setup-workflow.js');
const featureSources=['src/enemy-lab-working-roster.js','src/enemy-lab-working-ability-pool.js','src/enemy-lab-combat-profiles.js','src/enemy-lab-stance-compatibility.js','src/enemy-lab-deck-editor.js','src/enemy-lab-deck-editor-refinements.js'].map(read);
const registeredViewSource=[sectionUi,...featureSources].join('\n');

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
assert.match(lab,/data-enemy-lab-inspector="vertical"/,'the Lab uses the Gate 1 vertical inspector shell');
assert.match(lab,/width:min\(48vw,560px\)/,'landscape restores Main’s compact game-visible drawer width');
assert.match(lab,/grid-template-columns:minmax\(230px,1fr\) 30px 92px/,'landscape uses Main’s detail, gutter, and compact navigation proportions');
assert.match(lab,/id="labControlStaging" hidden/,'live profile and workflow controls must park outside the pinned shell grid');
assert.match(lab,/data-lab-scroll-owner="detail"/);
assert.match(lab,/data-lab-scroll-owner="navigation"/);
assert.doesNotMatch(lab,/id="dockTitle"/,'the thin header has no permanent Enemy Lab title');
assert.match(lab,/id="valueScrollGutter" role="scrollbar"/,'the compact drag gutter is restored as a detail-scroll controller');
assert.equal((lab.match(/data-lab-scroll-owner=/g)||[]).length,2,'the gutter is not a third shell scroll owner');
assert.match(sectionUi,/appendProfilesChrome/);
assert.match(sectionUi,/selectWorkspace\?\.\('test'\)/);
for(const id of ['core-encounter','core-enemies','core-loadout','core-combat','core-visuals','core-capture','core-diagnostics','core-profiles','portable-profiles','working-roster','working-ability-pool','deck-editor','arcana-tweaks','stance-compatibility']){
  assert.match(registeredViewSource,new RegExp(`id:'${id}'`),`registered view ${id} must survive the shell migration`);
}
for(const mode of ['test','setup','standard','history'])assert.match(lab,new RegExp(`data-workspace-mode="${mode}"`));
assert.match(lab,/installEnemyLabSetupWorkflow/);
assert.match(setupWorkflow,/LOCK AS ARENA STANDARD/);
assert.match(setupWorkflow,/CONFIRM LOCK/);
assert.match(setupWorkflow,/RESTORE COPY TO TEST/);
assert.match(setupWorkflow,/PLAY ARENA · STANDARD/);
assert.match(setupWorkflow,/const locked=standard\(\)/);
assert.match(setupWorkflow,/const history=readArenaStandardHistory\(storage\)/);
for(const id of ['profileSelect','profileLoad','profileSave','profileSaveAs'])assert.match(lab,new RegExp(`id="${id}"`));
assert.match(profiles,/previewCombatProfileImport/);
assert.match(profiles,/collision==='replace'/);
assert.match(profiles,/runtime\.snapshotProfileSettings/);
assert.match(profiles,/runtime\.applyProfileSettings/);
assert.doesNotMatch(profiles,/MutationObserver|modeGrid|dirSliders/,'profile dirty tracking and apply must use typed controls and adapters');
assert.doesNotMatch(profiles,/OPEN ARENA/,'named Lab profiles no longer act as an implicit Arena launch path');
assert.doesNotMatch(lab,/PROFILE BAR SLOT|fixedCategories|function categoryDefs|function renderTools/);
console.log('Enemy Lab IA and encounter boundaries: ok');
