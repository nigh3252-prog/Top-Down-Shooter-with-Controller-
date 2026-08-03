import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ENEMY_LAB_INSPECTOR_HEADER_HEIGHT,
  ENEMY_LAB_INSPECTOR_CLOSE_TARGET,
  ENEMY_LAB_INSPECTOR_SCROLL_OWNERS,
  ENEMY_LAB_RETAINED_COMPOUND_SCROLLERS,
} from '../src/enemy-lab-inspector-shell.js';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const read=file=>readFileSync(join(root,file),'utf8');
const lab=read('enemy-lab.html');
const sectionUi=read('src/enemy-lab-section-ui.js');

assert.equal(ENEMY_LAB_INSPECTOR_HEADER_HEIGHT,30,'the visual header remains inside the 28–32px contract');
assert.equal(ENEMY_LAB_INSPECTOR_CLOSE_TARGET,44,'the close action keeps a 44px effective touch target');
assert.deepEqual(ENEMY_LAB_INSPECTOR_SCROLL_OWNERS,['#labCategories','#labValues']);
assert.match(lab,/data-enemy-lab-inspector="vertical"/);
assert.match(lab,/#dockHead\{position:relative;height:30px;min-height:30px/);
assert.match(lab,/#closeBtn\{position:absolute;right:0;top:0;width:44px;height:44px/,'the close target must remain 44px even though its visible glyph is compact');
assert.doesNotMatch(lab,/id="dockTitle"/,'the shell must not keep a permanent Enemy Lab title');
assert.match(lab,/id="categoryHint" class="srOnly"/,'section context remains available without a visual subtitle');
assert.match(lab,/id="labControlStaging" hidden/,'existing live controls must begin in a hidden parking host');
assert.match(sectionUi,/root\.append\(workflowBar\)/,'the existing workflow node must be reparented, not cloned');
assert.match(sectionUi,/root\.append\(profileBar\)/,'the existing profile node must be reparented, not cloned');
assert.match(sectionUi,/controlParkingHost\.append\(workflowBar\)/,'the workflow node must return to its hidden parking host between views');
assert.match(sectionUi,/controlParkingHost\.append\(profileBar\)/,'the profile node must return to its hidden parking host between views');
assert.match(sectionUi,/const viewContentCache=new Map\(\)/,'registered views keep their last rendered node when a polling view declines a duplicate render');
assert.match(sectionUi,/const content=next\|\|viewContentCache\.get\(view\.id\)/,'a null duplicate render cannot make an existing registered view disappear');
assert.match(sectionUi,/selectWorkspace\?\.\('test'\)/,'normal sections leave a workflow view through its existing API');
assert.doesNotMatch(sectionUi,/categoriesEl\.hidden=true/,'the eight-section rail remains present in every workflow view');
assert.match(lab,/@media \(orientation:portrait\)\{[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(92px,108px\)/,'portrait keeps a vertical detail/rail split');
assert.equal(ENEMY_LAB_RETAINED_COMPOUND_SCROLLERS.length,4,'every retained compound scroller has an explicit Gate 3 inventory entry');
for(const entry of ENEMY_LAB_RETAINED_COMPOUND_SCROLLERS){
  assert.match(entry.migration,/Gate 3/);
  assert.ok(entry.selector&&entry.reason);
}

console.log('Enemy Lab vertical inspector shell: ok');
