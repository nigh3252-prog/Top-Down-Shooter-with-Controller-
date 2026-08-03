import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ENEMY_LAB_INSPECTOR_SCROLL_OWNERS,
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

assert.deepEqual(ENEMY_LAB_INSPECTOR_SCROLL_OWNERS,['#labCategories','#labValues']);
assert.equal((lab.match(/data-lab-scroll-owner=/g)||[]).length,2,'the shell declares exactly two normal scroll owners');
assert.match(lab,/#labCategories\{[^}]*overflow-y:auto;overflow-x:hidden;touch-action:pan-y/);
assert.match(lab,/#labValues\{[^}]*overflow-y:auto;overflow-x:hidden;touch-action:pan-y/);
assert.doesNotMatch(lab,/valueScrollGutter|valueScrollThumb/,'the removed drag gutter cannot become a third shell scroller');
assert.doesNotMatch(lab,/@media \(orientation:portrait\)\{[\s\S]*overflow-x:auto/,'portrait may not revive a horizontal shell carousel');
assert.doesNotMatch(lab,/flex-direction:row;height:100%/,'ordinary section cards flow vertically in every orientation');
assert.doesNotMatch(lab,/max-height:100%;overflow-y:auto/,'ordinary portrait cards cannot become nested scrollers');
assert.match(sectionUi,/sectionScrollMemory\.remember/);
assert.match(sectionUi,/sectionScrollMemory\.restore/);
assert.match(sectionUi,/values\.scrollTop=targetScrollTop;[\s\S]*requestAnimationFrame/,'scroll restoration happens before paint and is rechecked once after layout');
assert.match(sectionUi,/getSectionScrollPositions/);
assert.deepEqual(ENEMY_LAB_RETAINED_COMPOUND_SCROLLERS.map(entry=>entry.selector),[
  '.deckEditorCardsPane','.deckEditorControlsPane','.arcanaTweaksMain, .arcanaTweaksSide','#hitFeelPanel',
]);

console.log('Enemy Lab scroll architecture: ok');
