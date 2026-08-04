import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ENEMY_LAB_INSPECTOR_SCROLL_OWNERS,
  ENEMY_LAB_INSPECTOR_SCROLL_CONTROLLERS,
  ENEMY_LAB_RETAINED_COMPOUND_SCROLLERS,
  createEnemyLabSectionScrollMemory,
} from '../src/enemy-lab-inspector-shell.js';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const lab=readFileSync(join(root,'enemy-lab.html'),'utf8');
const sectionUi=readFileSync(join(root,'src/enemy-lab-section-ui.js'),'utf8');
const sections=['encounter','enemies','loadout','combat','visuals','capture','diagnostics','profiles'];
const memory=createEnemyLabSectionScrollMemory({sectionIds:sections});

assert.equal(memory.restore('encounter'),0,'an unvisited section starts at the top');
assert.equal(memory.activate('encounter'),true);
assert.equal(memory.activeSection,'encounter');
assert.equal(memory.remember('encounter',146),true);
assert.equal(memory.activate('profiles'),true);
assert.equal(memory.remember('profiles',71),true);
assert.equal(memory.activate('tools'),false,'an unknown section cannot replace active inspector state');
assert.equal(memory.activeSection,'profiles','active-section memory survives a rejected selection');
assert.equal(memory.remember('tools',99),false,'legacy categories cannot create stray scroll state');
assert.equal(memory.restore('encounter'),146);
assert.equal(memory.restore('profiles'),71);
assert.deepEqual(memory.snapshot(),{encounter:146,profiles:71});

assert.deepEqual(ENEMY_LAB_INSPECTOR_SCROLL_OWNERS,['#labCategories','#labSubcategories','#labValues']);
assert.deepEqual(ENEMY_LAB_INSPECTOR_SCROLL_CONTROLLERS,['#valueScrollGutter']);
assert.equal((lab.match(/data-lab-scroll-owner=/g)||[]).length,3,'the shell declares three normal scroll owners');
assert.match(lab,/#labCategories,#labSubcategories\{[^}]*overflow-y:auto;overflow-x:hidden;touch-action:pan-y/);
assert.match(lab,/#labValues\{[^}]*overflow-y:auto;overflow-x:hidden;touch-action:pan-y/);
assert.match(lab,/width:min\(calc\(48vw \+ 82px\),642px\)/,'landscape preserves Main’s detail width while adding the subsection rail');
assert.doesNotMatch(lab,/width:min\(90vw,760px\)/,'the oversized Gate 1 base drawer cannot return');
assert.match(lab,/grid-template-columns:minmax\(0,1fr\) 30px 82px 92px/,'ordinary landscape uses detail/gutter/subsection/main rails without minimum-width overflow');
assert.match(lab,/#labDock\.on\{[^}]*\}#dockHead\{grid-column:1\/5;grid-row:1\}#labValues\{grid-column:1;grid-row:2\}#valueScrollGutter\{grid-column:2;grid-row:2/);
assert.match(lab,/#labSubcategories\{grid-column:3;grid-row:2\}#labCategories\{grid-column:4;grid-row:2\}#message\{grid-column:1\/5;grid-row:3\}/);
assert.match(lab,/id="valueScrollGutter" role="scrollbar"[^>]*aria-valuenow="0"/);
assert.match(lab,/#valueScrollGutter\{position:relative;overflow:hidden;[^}]*touch-action:none/,'the gutter is a controller rather than an independently scrollable owner');
assert.doesNotMatch(lab,/#valueScrollGutter\{[^}]*overflow-(?:x|y):auto/);
assert.doesNotMatch(lab,/@media \(orientation:portrait\)\{[\s\S]*overflow-x:auto/,'portrait may not revive a horizontal shell carousel');
assert.match(lab,/@media \(orientation:portrait\)\{[\s\S]*#valueScrollGutter\{display:none\}[\s\S]*#labSubcategories\{grid-column:2;grid-row:2\}[\s\S]*#labCategories\{grid-column:3;grid-row:2\}/,'portrait keeps a vertical detail/subsection/main rail interaction model');
assert.doesNotMatch(lab,/flex-direction:row;height:100%/,'ordinary section cards flow vertically in every orientation');
assert.doesNotMatch(lab,/max-height:100%;overflow-y:auto/,'ordinary portrait cards cannot become nested scrollers');
assert.match(sectionUi,/detailScrollMemory\.remember/);
assert.match(sectionUi,/detailScrollMemory\.restore/);
assert.match(sectionUi,/values\.scrollTop=targetScrollTop;\s*onDetailScrollRestored\(\);[\s\S]*requestAnimationFrame/,'scroll restoration synchronizes the gutter before paint and rechecks once after layout');
assert.match(sectionUi,/rememberActiveScroll:rememberRenderedSection/,'gutter and native detail movement can update active-section memory immediately');
assert.match(lab,/onDetailScroll:\(\)=>sectionUI\?\.rememberActiveScroll\?\.\(\)/,'the gutter writes memory through the active detail section');
assert.match(lab,/syncAfterDockOpen\(\)/,'opening the drawer explicitly synchronizes the thumb');
assert.match(sectionUi,/classList\.remove\('deckEditorMode','deckEditorLegacyMode','arcanaTweaksMode'\)/,'registry-backed editors cannot hide the detail gutter');
assert.match(sectionUi,/getSectionScrollPositions/);
assert.match(sectionUi,/getViewScrollPositions/);
assert.match(sectionUi,/renderSubcategories/);
assert.match(sectionUi,/const activeView=sectionRegistry\.getActiveView\(definition\.id\)/);
assert.match(sectionUi,/if\(activeView\)appendRegisteredView\(root,activeView/,'detail content renders only the selected registry view');
assert.match(sectionUi,/sectionRailScrollMemory\.restore\(definition\.id\)/,'the secondary rail restores a position per section');
assert.match(sectionUi,/if\(restoringSecondaryRail\)return/,'a replaceChildren scroll event cannot overwrite the remembered subsection-rail position');
assert.match(sectionUi,/if\(!restoringMainRail\)mainRailScrollTop=categoriesEl\.scrollTop/,'the main rail ignores its own restoration event');
assert.match(sectionUi,/renderValues\(\{preserveScroll:true,memoryAlreadySaved:true\}\)/,'section switches cannot resave scroll after replacing the subsection rail');
assert.deepEqual(ENEMY_LAB_RETAINED_COMPOUND_SCROLLERS.map(entry=>entry.selector),['#hitFeelPanel']);

console.log('Enemy Lab scroll architecture: ok');
