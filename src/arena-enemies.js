import {
  ARENA_ENEMY_ARCHETYPES,
  createArenaEnemySystem as createCoreArenaEnemySystem,
} from './arena-enemies-core.js';

export { ARENA_ENEMY_ARCHETYPES };

function enemyLabParentDocument(){
  try{
    if(window.parent===window||window.frameElement?.id!=='arenaFrame')return null;
    const parentPath=window.parent.location.pathname||'';
    return /(?:^|\/)enemy-lab\.html$/.test(parentPath)?window.parent.document:null;
  }catch{
    return null;
  }
}

function installEnemyLabFullscreenBridge(parentDocument){
  const isFullscreen=()=>!!(parentDocument.fullscreenElement||parentDocument.webkitFullscreenElement);
  const syncButtons=()=>{
    const active=isFullscreen();
    const fsButton=document.getElementById('fsBtn');
    const startButton=document.getElementById('sgFsBtn');
    if(fsButton){
      fsButton.textContent=active?'⤢':'⛶';
      fsButton.title=active?'Exit fullscreen':'Enter fullscreen';
      fsButton.setAttribute('aria-label',fsButton.title);
    }
    if(startButton)startButton.textContent=active?'⤢ EXIT FULLSCREEN':'⛶ FULLSCREEN';
  };
  const toggleOuterFullscreen=event=>{
    event?.preventDefault?.();
    event?.stopImmediatePropagation?.();
    if(isFullscreen()){
      const exit=parentDocument.exitFullscreen||parentDocument.webkitExitFullscreen;
      exit?.call(parentDocument);
    }else{
      const root=parentDocument.documentElement;
      const request=root.requestFullscreen||root.webkitRequestFullscreen;
      request?.call(root);
    }
  };
  const attach=()=>{
    for(const id of ['fsBtn','sgFsBtn']){
      const button=document.getElementById(id);
      if(!button||button.dataset.enemyLabFullscreenBridge==='1')continue;
      button.dataset.enemyLabFullscreenBridge='1';
      button.addEventListener('click',toggleOuterFullscreen,true);
    }
    syncButtons();
  };
  attach();
  parentDocument.addEventListener('fullscreenchange',syncButtons);
  parentDocument.addEventListener('webkitfullscreenchange',syncButtons);
  return {toggleOuterFullscreen,syncButtons};
}

function cleanText(value=''){
  return String(value).replace(/[▸▾]/g,'').replace(/\s+/g,' ').trim();
}

let controlSequence=0;
function controlId(control,prefix='control'){
  if(!control.dataset.enemyLabControlId){
    const base=String(control.id||control.name||control.dataset.id||control.dataset.k||`${prefix}-${++controlSequence}`)
      .replace(/[^a-z0-9_-]+/gi,'-');
    control.dataset.enemyLabControlId=`${prefix}:${base}:${controlSequence}`;
  }
  return control.dataset.enemyLabControlId;
}

function controlLabel(control,index=0){
  if(control.tagName==='BUTTON')return cleanText(control.textContent)||`ACTION ${index+1}`;
  if(control.id){
    const escaped=globalThis.CSS?.escape?CSS.escape(control.id):control.id.replace(/"/g,'\\"');
    const explicit=document.querySelector(`label[for="${escaped}"]`);
    if(explicit)return cleanText(explicit.textContent);
  }
  const row=control.closest('.srow,.selectRow,label');
  if(row){
    const named=row.querySelector('.slabel,label,span');
    if(named){
      const text=cleanText(named.textContent);
      if(text)return text.replace(String(control.value||''),'').trim();
    }
    const text=cleanText(row.textContent);
    if(text)return text.replace(String(control.value||''),'').trim();
  }
  let ancestor=control.parentElement;
  for(let depth=0;ancestor&&depth<4;depth++,ancestor=ancestor.parentElement){
    const first=ancestor.firstElementChild;
    if(first&&first!==control&&!first.contains(control)){
      const text=cleanText(first.textContent);
      if(text&&text.length<80)return text.replace(String(control.value||''),'').trim();
    }
  }
  return cleanText(control.getAttribute('aria-label')||control.title||control.name||control.id)||`CONTROL ${index+1}`;
}

function isCollapseHeader(button){
  return button.tagName==='BUTTON'&&/^[▸▾]/.test(button.textContent.trim())&&button.nextElementSibling?.tagName==='DIV';
}

function descriptor(control,prefix,index){
  const id=controlId(control,prefix);
  const label=controlLabel(control,index);
  const note=cleanText(control.title||control.getAttribute('aria-description')||'');
  const disabled=!!control.disabled;
  if(control.tagName==='SELECT'){
    return {id,kind:'select',label,note,value:control.value,disabled,options:[...control.options].map(option=>({value:option.value,label:cleanText(option.textContent),selected:option.selected}))};
  }
  if(control.tagName==='BUTTON'){
    return {id,kind:'button',label,note,active:control.classList.contains('on')||control.getAttribute('aria-pressed')==='true',disabled};
  }
  if(control.type==='checkbox'||control.type==='radio'){
    return {id,kind:'check',label,note,checked:control.checked,disabled};
  }
  if(control.type==='range'||control.type==='number'){
    const min=Number(control.min),max=Number(control.max),step=Number(control.step),value=Number(control.value);
    return {
      id,kind:'range',label,note,value:Number.isFinite(value)?value:0,
      min:Number.isFinite(min)?min:0,max:Number.isFinite(max)?max:100,
      step:Number.isFinite(step)&&step>0?step:1,disabled,
    };
  }
  return {id,kind:'text',label,note,value:control.value||'',disabled};
}

function controlsIn(root,prefix){
  if(!root)return [];
  return [...root.querySelectorAll('input,select,button')]
    .filter(control=>!control.closest('#tabs')&&!control.classList.contains('sect')&&!isCollapseHeader(control))
    .map((control,index)=>descriptor(control,prefix,index));
}

function groupLabelForExtra(root){
  const explicit=root.getAttribute('aria-label');
  if(explicit)return cleanText(explicit);
  const heading=[...root.querySelectorAll(':scope > div,:scope > h1,:scope > h2,:scope > h3,:scope > header')]
    .map(node=>cleanText(node.textContent)).find(text=>text&&text.length<=52);
  return heading||cleanText(root.id)||'EXTRA CONTROLS';
}

function controlGroupsSnapshot(){
  const groups=[];
  const panel=document.getElementById('panel');
  if(panel){
    for(const body of panel.querySelectorAll('.sbody')){
      const id=body.id?.replace(/^body-/,'')||`section-${groups.length+1}`;
      const header=body.previousElementSibling;
      const label=cleanText(header?.dataset?.label||header?.textContent||id);
      const controls=controlsIn(body,`panel-${id}`);
      if(controls.length)groups.push({id:`panel-${id}`,label,source:'combat-arena',controls});
    }
    const orphanControls=[...panel.querySelectorAll('input,select,button')]
      .filter(control=>!control.closest('.sbody')&&!control.closest('#tabs')&&!control.classList.contains('sect')&&!isCollapseHeader(control));
    if(orphanControls.length){
      groups.push({
        id:'panel-arena-actions',label:'ARENA ACTIONS',source:'combat-arena',
        controls:orphanControls.map((control,index)=>descriptor(control,'panel-actions',index)),
      });
    }
  }

  const extraRoots=[...document.querySelectorAll('[id*="Panel"],[id*="panel"]')]
    .filter(root=>root!==panel&&root.id!=='startCard'&&!root.closest('#panel')&&root.querySelector('input,select,button'));
  for(const root of extraRoots){
    const controls=controlsIn(root,`extra-${root.id||groups.length}`);
    if(!controls.length)continue;
    groups.push({
      id:`extra-${root.id||groups.length}`,
      label:groupLabelForExtra(root).slice(0,52),
      source:'auxiliary',controls,
    });
  }
  return groups;
}

function findControl(id){
  return [...document.querySelectorAll('[data-enemy-lab-control-id]')]
    .find(control=>control.dataset.enemyLabControlId===id)||null;
}

function activateControl(id,value){
  const control=findControl(id);
  if(!control||control.disabled)return false;
  if(control.tagName==='BUTTON'){
    control.click();
    return true;
  }
  if(control.type==='checkbox'||control.type==='radio'){
    control.checked=value===undefined?!control.checked:!!value;
  }else if(value!==undefined){
    control.value=String(value);
  }
  control.dispatchEvent(new Event('input',{bubbles:true}));
  control.dispatchEvent(new Event('change',{bubbles:true}));
  return true;
}

function sliderSnapshot(containerId){
  const root=document.getElementById(containerId);
  if(!root)return [];
  return [...root.querySelectorAll('.srow')].map((row,index)=>{
    const input=row.querySelector('input[type="range"]');
    const label=row.querySelector('.slabel')?.childNodes?.[0]?.textContent?.trim()
      ||input?.getAttribute('aria-label')||`SETTING ${index+1}`;
    return input?{index,label,min:Number(input.min),max:Number(input.max),step:Number(input.step),value:Number(input.value)}:null;
  }).filter(Boolean);
}

function buttonSnapshot(containerId){
  const root=document.getElementById(containerId);
  if(!root)return [];
  return [...root.querySelectorAll('button')].map((button,index)=>({
    id:button.dataset.id||button.dataset.k||String(index),label:button.textContent.trim(),note:button.title||'',active:button.classList.contains('on'),
  }));
}

function clickButton(containerId,id){
  const root=document.getElementById(containerId);
  const button=[...(root?.querySelectorAll('button')||[])].find((candidate,index)=>(candidate.dataset.id||candidate.dataset.k||String(index))===String(id));
  button?.click();
  return !!button;
}

function setSlider(containerId,index,value){
  const input=document.getElementById(containerId)?.querySelectorAll('input[type="range"]')?.[index];
  if(!input)return false;
  const numeric=Math.max(Number(input.min),Math.min(Number(input.max),Number(value)));
  input.value=String(numeric);
  input.dispatchEvent(new Event('input',{bubbles:true}));
  return true;
}

function installEnemyLabMenuBridge(parentDocument,fullscreenBridge){
  const attach=()=>{
    const panel=document.getElementById('panel');
    const menuButton=document.getElementById('menuBtn');
    if(!panel||!menuButton||menuButton.dataset.enemyLabMenuBridge==='1')return false;

    menuButton.dataset.enemyLabMenuBridge='1';
    menuButton.style.display='none';
    panel.style.visibility='hidden';
    panel.style.pointerEvents='none';

    const panelOpen=()=>!panel.classList.contains('hidden');
    const notifyParent=()=>{
      try{window.parent.__enemyLabSetOpenFromArena?.(panelOpen());}
      catch(error){console.error('Enemy Lab menu sync failed',error);}
    };
    new MutationObserver(notifyParent).observe(panel,{attributes:true,attributeFilter:['class']});

    const roomOptions=()=>{
      const select=document.getElementById('mazeCellSizeSelect');
      if(select)return [...select.options].map(option=>({id:option.value,label:option.textContent,active:option.value===select.value}));
      const active=localStorage.getItem('enemyLab.mazeCellSize')||'large';
      return [
        {id:'compact',label:'Compact · 12',active:active==='compact'},
        {id:'small',label:'Small · 16',active:active==='small'},
        {id:'current',label:'Current · 20',active:active==='current'},
        {id:'large',label:'Large · 24',active:active==='large'},
      ];
    };

    function runtimeCall(name,...args){
      const fn=window.__arena?.[name];
      if(typeof fn==='function')return fn(...args);
      return undefined;
    }

    const bridge=window.__enemyLabControlBridge={
      isReady:()=>!!window.__arena,
      isMenuOpen:panelOpen,
      setMenuOpen(open){if(panelOpen()!==!!open)menuButton.click();},
      snapshot(){
        const runtime=window.__arena;
        return {
          ready:!!runtime,menuOpen:panelOpen(),
          weaponId:runtime?.combatState?.weapon||'',
          stanceName:runtime?.arena?.stance?.name||runtime?.arena?.stance?.id||'',
          directorModes:buttonSnapshot('modeGrid'),combatModes:buttonSnapshot('combatModeGrid'),
          tuning:sliderSnapshot('dirSliders'),feelKeys:buttonSnapshot('keyRow'),feel:sliderSnapshot('feelSliders'),
          roomOptions:roomOptions(),controlGroups:controlGroupsSnapshot(),
        };
      },
      controlGroups(){return controlGroupsSnapshot();},
      setControl(id,value){return activateControl(id,value);},
      cycleWeapon(direction=1){runtimeCall('cycleWeapon',direction);},
      cycleStance(){runtimeCall('cycleStance');},
      setDirectorMode(id){return clickButton('modeGrid',id);},
      setCombatMode(id){return clickButton('combatModeGrid',id);},
      setTuning(index,value){return setSlider('dirSliders',index,value);},
      setFeelKey(id){return clickButton('keyRow',id);},
      setFeel(index,value){return setSlider('feelSliders',index,value);},
      testFeel(){
        const keys=[...(document.getElementById('keyRow')?.querySelectorAll('button')||[])];
        const selected=Math.max(0,keys.findIndex(button=>button.classList.contains('on')));
        if(panelOpen())menuButton.click();
        runtimeCall('beginTestSwing',selected/Math.max(1,keys.length-1));
      },
      resetFight(){document.getElementById('resetBtn')?.click();},
      setCellSize(id){
        const select=document.getElementById('mazeCellSizeSelect');
        if(select){select.value=id;select.dispatchEvent(new Event('change',{bubbles:true}));return true;}
        localStorage.setItem('enemyLab.mazeCellSize',id);location.reload();return true;
      },
      toggleFullscreen(){fullscreenBridge?.toggleOuterFullscreen?.();},
    };

    const notifyControlsReady=()=>{
      try{window.parent.__enemyLabArenaControlsReady?.();}
      catch(error){console.error('Enemy Lab controls-ready sync failed',error);}
    };
    const structureObserver=new MutationObserver(mutations=>{
      if(mutations.some(mutation=>mutation.type==='childList'))notifyControlsReady();
    });
    structureObserver.observe(panel,{subtree:true,childList:true});
    structureObserver.observe(document.body,{childList:true});

    notifyParent();
    let readyAttempts=0;
    const waitForRuntime=()=>{
      if(window.__arena){notifyControlsReady();return;}
      if(readyAttempts++<240)setTimeout(waitForRuntime,50);
    };
    waitForRuntime();
    return true;
  };

  let attempts=0;
  const wait=()=>{
    if(attach())return;
    if(attempts++<240)setTimeout(wait,50);
  };
  wait();
}

function installEnemyLabBridges(){
  const parentDocument=enemyLabParentDocument();
  if(!parentDocument)return;
  const attach=()=>{
    const fullscreenBridge=installEnemyLabFullscreenBridge(parentDocument);
    installEnemyLabMenuBridge(parentDocument,fullscreenBridge);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});
  else attach();
}

installEnemyLabBridges();

export function createArenaEnemySystem(options={}){
  return createCoreArenaEnemySystem(options);
}
