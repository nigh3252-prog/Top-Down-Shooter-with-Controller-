import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyEnemyLabRuntimeEvent,
  routeEnemyLabRuntimeEvent,
  syncEnemyLabMountedControls,
} from '../src/enemy-lab-render-policy.js';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const read=file=>readFileSync(join(root,file),'utf8');
const lab=read('enemy-lab.html');
const sectionUi=read('src/enemy-lab-section-ui.js');
const stanceDiagnostics=read('src/enemy-lab-stance-compatibility.js');

assert.equal(classifyEnemyLabRuntimeEvent({type:'register'}),'structural');
assert.equal(classifyEnemyLabRuntimeEvent({type:'change'}),'control');
assert.equal(classifyEnemyLabRuntimeEvent({type:'invoke'}),'control');
assert.equal(classifyEnemyLabRuntimeEvent({type:'state'}),'telemetry');

{
  const calls={structural:0,control:0,telemetry:0};
  const handlers={
    onStructural:()=>calls.structural++,
    onControl:()=>calls.control++,
    onTelemetry:()=>calls.telemetry++,
  };
  routeEnemyLabRuntimeEvent({type:'state'},handlers);
  routeEnemyLabRuntimeEvent({type:'change'},handlers);
  routeEnemyLabRuntimeEvent({type:'invoke'},handlers);
  routeEnemyLabRuntimeEvent({type:'register'},handlers);
  assert.deepEqual(calls,{structural:1,control:2,telemetry:1},'telemetry and control updates never enter the structural renderer');
}

{
  const output={value:'1',textContent:'1'};
  const input={value:'1',min:'0',max:'2',step:'.25',disabled:false};
  const card={
    dataset:{arenaControlId:'antelope.charge-speed'},
    classList:{toggle(){}},
    querySelector(selector){return selector==='output'?output:input;},
    contains:element=>element===input,
  };
  const mounted=[card];
  const host={querySelectorAll:()=>mounted,ownerDocument:{activeElement:input}};
  const before=mounted[0];
  const count=syncEnemyLabMountedControls(host,[{controls:[{
    id:'antelope.charge-speed',kind:'range',value:1.25,min:.5,max:2,step:.25,disabled:false,
  }]}]);
  assert.equal(count,1);
  assert.equal(mounted[0],before,'a focused slider remains the same mounted DOM node');
  assert.equal(input.value,'1','the synchronizer does not overwrite the actively manipulated field');
  assert.equal(output.textContent,'1.25','the readout may update in place');
}

{
  const makeOption=()=>({value:'',textContent:''});
  const select={
    value:'ALL',disabled:false,
    options:[{value:'ALL',textContent:'ALL'},{value:'HADES',textContent:'HADES'}],
    ownerDocument:{createElement:makeOption},
    replaceChildren(...nodes){this.options=nodes;this.replaceCount=(this.replaceCount||0)+1;},
  };
  const card={
    dataset:{arenaControlId:'example.family'},
    classList:{toggle(){}},
    querySelector:()=>select,
    contains:element=>element===select,
  };
  const mounted=[card],host={querySelectorAll:()=>mounted,ownerDocument:{activeElement:select}};
  const control={id:'example.family',kind:'select',value:'HADES',disabled:false,options:[{value:'ALL',label:'ALL'},{value:'FLARE',label:'FLARE'}]};
  syncEnemyLabMountedControls(host,[{controls:[control]}]);
  assert.equal(mounted[0],card,'an open native select keeps its owning node identity');
  assert.equal(select.replaceCount,undefined,'an open native select does not have its options rebuilt underneath it');
  assert.equal(select.value,'ALL');
  host.ownerDocument.activeElement=null;
  syncEnemyLabMountedControls(host,[{controls:[control]}]);
  assert.equal(select.replaceCount,1,'dependent options reconcile after focus leaves without replacing the select');
  assert.equal(select.value,'HADES');
}

assert.match(lab,/routeEnemyLabRuntimeEvent\(event/,'runtime events pass through the explicit render policy');
assert.match(lab,/syncEnemyLabMountedControls\(values,data\.controlGroups\|\|\[\]\)/,'control values update mounted nodes in place');
assert.doesNotMatch(lab,/\['register','remove','change','invoke'\][\s\S]{0,300}renderAll/,'generic change/invoke events cannot rebuild the inspector');
assert.match(sectionUi,/if\(event\.sectionId&&event\.sectionId!==state\.category\)return/,'inactive-section invalidation cannot replace the active view');
assert.match(sectionUi,/if\(event\.viewId&&event\.viewId!==activeViewId\)return/,'inactive diagnostic-view polling cannot replace a focused sibling view');
assert.match(sectionUi,/if\(renderedViewId\)detailScrollMemory\.remember\(renderedViewId/,'scroll memory is keyed to the rendered view, not a newly selected replacement');
assert.match(stanceDiagnostics,/invalidate\('diagnostics','stance-compatibility'\)/,'polling diagnostics target only their own registered view');

console.log('Enemy Lab stable runtime/control rendering: ok');
