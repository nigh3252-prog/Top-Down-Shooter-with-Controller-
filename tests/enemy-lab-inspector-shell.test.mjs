import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ENEMY_LAB_INSPECTOR_HEADER_HEIGHT,
  ENEMY_LAB_INSPECTOR_CLOSE_TARGET,
  ENEMY_LAB_INSPECTOR_SCROLL_OWNERS,
  ENEMY_LAB_INSPECTOR_SCROLL_CONTROLLERS,
  ENEMY_LAB_RETAINED_COMPOUND_SCROLLERS,
  createEnemyLabValueScrollGutter,
  getEnemyLabValueScrollGutterMetrics,
} from '../src/enemy-lab-inspector-shell.js';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const read=file=>readFileSync(join(root,file),'utf8');
const lab=read('enemy-lab.html');
const sectionUi=read('src/enemy-lab-section-ui.js');

assert.equal(ENEMY_LAB_INSPECTOR_HEADER_HEIGHT,30,'the visual header remains inside the 28–32px contract');
assert.equal(ENEMY_LAB_INSPECTOR_CLOSE_TARGET,44,'the close action keeps a 44px effective touch target');
assert.deepEqual(ENEMY_LAB_INSPECTOR_SCROLL_OWNERS,['#labCategories','#labSubcategories','#labValues']);
assert.deepEqual(ENEMY_LAB_INSPECTOR_SCROLL_CONTROLLERS,['#valueScrollGutter']);
assert.equal((lab.match(/data-lab-scroll-owner=/g)||[]).length,3,'the shell declares main, subsection, and detail owners');
assert.match(lab,/id="valueScrollGutter" role="scrollbar" aria-label="Drag to scroll options" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"/);
assert.match(lab,/#valueScrollGutter\{position:relative;overflow:hidden;[^}]*touch-action:none/,'the gutter is a non-scrolling drag controller');
assert.doesNotMatch(lab,/#valueScrollGutter\{[^}]*overflow-(?:x|y):auto/);
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
assert.match(lab,/@media \(orientation:portrait\)\{[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(76px,88px\) minmax\(92px,108px\)/,'portrait keeps a vertical detail/subsection/main rail split');
assert.equal(ENEMY_LAB_RETAINED_COMPOUND_SCROLLERS.length,1,'only the pre-existing Hit Feel overlay remains a compound-scroller exception');
for(const entry of ENEMY_LAB_RETAINED_COMPOUND_SCROLLERS){
  assert.match(entry.migration,/Gate 3/);
  assert.ok(entry.selector&&entry.reason);
}

class FakeEventTarget{
  #listeners=new Map();
  addEventListener(type,listener){
    const listeners=this.#listeners.get(type)||[];
    listeners.push(listener);
    this.#listeners.set(type,listeners);
  }
  removeEventListener(type,listener){
    this.#listeners.set(type,(this.#listeners.get(type)||[]).filter(item=>item!==listener));
  }
  emit(type,event={}){
    for(const listener of this.#listeners.get(type)||[])listener({type,...event});
  }
}

class FakeElement extends FakeEventTarget{
  constructor({clientHeight=0,scrollHeight=0,clientWidth=0,scrollWidth=0,rect={top:0,left:0}}={}){
    super();
    this.clientHeight=clientHeight;
    this.scrollHeight=scrollHeight;
    this.clientWidth=clientWidth;
    this.scrollWidth=scrollWidth;
    this.scrollTop=0;
    this.scrollLeft=0;
    this.style={};
    this.attributes=new Map();
    this.classes=new Set();
    this.classList={toggle:(name,enabled)=>enabled?this.classes.add(name):this.classes.delete(name)};
    this.rect=rect;
    this.captures=new Set();
  }
  setAttribute(name,value){this.attributes.set(name,String(value));}
  getAttribute(name){return this.attributes.get(name);}
  getBoundingClientRect(){return this.rect;}
  setPointerCapture(pointerId){this.captures.add(pointerId);}
  hasPointerCapture(pointerId){return this.captures.has(pointerId);}
  releasePointerCapture(pointerId){this.captures.delete(pointerId);}
}

{
  const values=new FakeElement({clientHeight:100,scrollHeight:500});
  const gutter=new FakeElement({clientHeight:200});
  const metrics=getEnemyLabValueScrollGutterMetrics({values,gutter});
  assert.deepEqual({...metrics},{
    axis:'vertical',vertical:true,viewport:100,content:500,track:200,
    scroll:0,maxScroll:400,thumbSize:40,thumbRange:160,thumbPosition:0,valueNow:0,
  },'the gutter derives every metric from the detail scroll owner');
}

{
  const values=new FakeElement({clientHeight:100,scrollHeight:500});
  const gutter=new FakeElement({clientHeight:200,rect:{top:10,left:0}});
  const thumb=new FakeElement();
  gutter.scrollTop=73;
  const reported=[];
  const scheduled=[];
  let resizeObserver;
  let resizeListener;
  let observerDisconnected=false;
  let resizeListenerRemoved=false;
  const controller=createEnemyLabValueScrollGutter({
    values,
    gutter,
    thumb,
    onDetailScroll:(scroll,metrics)=>reported.push({scroll,metrics}),
    schedule:callback=>scheduled.push(callback),
    observeResize:(_target,callback)=>{
      resizeObserver=callback;
      return()=>{observerDisconnected=true;};
    },
    listenForResize:callback=>{
      resizeListener=callback;
      return()=>{resizeListenerRemoved=true;};
    },
  });

  assert.equal(thumb.style.height,'40px');
  assert.equal(thumb.style.transform,'translateY(0px)');
  assert.equal(gutter.getAttribute('aria-valuemin'),'0');
  assert.equal(gutter.getAttribute('aria-valuemax'),'100');
  assert.equal(gutter.getAttribute('aria-valuenow'),'0');
  assert.equal(gutter.getAttribute('aria-orientation'),'vertical');
  assert.equal(gutter.getAttribute('aria-disabled'),'false');
  assert.equal(gutter.scrollTop,73,'the controller never creates a gutter scroll position');

  values.scrollTop=200;
  values.emit('scroll');
  assert.equal(thumb.style.transform,'translateY(80px)');
  assert.equal(gutter.getAttribute('aria-valuenow'),'50');
  assert.deepEqual(reported.map(item=>item.scroll),[200]);

  // Restoring a section position does not need a synthetic scroll event: the
  // shell calls this explicit lifecycle method after it sets scrollTop.
  values.scrollTop=320;
  controller.syncAfterSectionRestore();
  assert.equal(thumb.style.transform,'translateY(128px)');
  assert.equal(gutter.getAttribute('aria-valuenow'),'80');

  gutter.emit('pointerdown',{pointerId:7,clientY:210,preventDefault(){this.prevented=true;}});
  assert.equal(values.scrollTop,400,'dragging the gutter writes the detail scroll owner');
  assert.equal(gutter.scrollTop,73,'dragging does not write a second gutter scroll owner');
  assert.ok(gutter.hasPointerCapture(7));
  assert.deepEqual(reported.map(item=>item.scroll),[200,400]);
  gutter.emit('pointermove',{pointerId:7,clientY:90});
  assert.equal(values.scrollTop,150);
  gutter.emit('pointerup',{pointerId:7});
  assert.equal(gutter.hasPointerCapture(7),false);

  values.clientHeight=200;
  values.scrollHeight=1000;
  resizeObserver();
  resizeListener();
  assert.equal(scheduled.length,1,'resize sync is coalesced to avoid thumb jump loops');
  scheduled.shift()();
  assert.equal(thumb.style.height,'40px');
  assert.equal(gutter.getAttribute('aria-valuenow'),'19');

  values.scrollTop=0;
  controller.syncAfterDockOpen();
  assert.equal(thumb.style.transform,'translateY(0px)');
  controller.destroy();
  assert.ok(observerDisconnected);
  assert.ok(resizeListenerRemoved);
  values.scrollTop=400;
  values.emit('scroll');
  assert.equal(thumb.style.transform,'translateY(0px)','destroy removes injected listeners');
}

console.log('Enemy Lab vertical inspector shell: ok');
