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

function installEnemyLabParentStyles(parentDocument){
  if(parentDocument.getElementById('enemyLabBridgeStyles'))return;
  const style=parentDocument.createElement('style');
  style.id='enemyLabBridgeStyles';
  style.textContent=`
    #labCategories .choice{width:100%;min-height:44px;padding:7px;font-size:9px;justify-content:center}
    #labCategories .choice b{font-size:9px;letter-spacing:.08em}
    #labCategories .choice span,#labCategories .choice em{display:none}
    #labCategories .choice.enemyLabFeaturedTest{
      color:#172321;border-color:#ffd092;
      background:linear-gradient(145deg,#f1ad50,#d67a3f);
      box-shadow:inset 0 0 0 1px rgba(255,224,172,.42),0 2px 9px rgba(232,160,76,.18)
    }
    #labCategories .choice.enemyLabFeaturedTest.on{
      color:#10201d;border-color:#fff0cf;
      box-shadow:inset 0 0 0 2px rgba(255,244,214,.72),0 0 15px rgba(232,160,76,.34)
    }
    #labCategories .choice.enemyLabArenaMirror{border-color:#467a74;color:#a9ddd3;background:rgba(53,101,95,.22)}
    #labCategories .choice.enemyLabArenaMirror.on{border-color:#8edbc9;color:#d9fff5;background:rgba(72,139,130,.34)}
    .enemyLabMirrorSection{border:1px solid rgba(69,111,106,.78);border-radius:8px;background:rgba(9,28,29,.84);padding:9px 10px;flex:0 0 auto}
    .enemyLabMirrorSection b{display:block;color:#86c8bc;font-size:9.5px;letter-spacing:.13em}
    .enemyLabMirrorSection span{display:block;color:#658d87;font-size:8px;line-height:1.35;margin-top:4px}
    .enemyLabCheckCard.on{border-color:#e8a04c;background:rgba(232,160,76,.12)}
    @media (orientation:portrait){
      #labCategories .choice{width:auto;min-width:82px;min-height:42px;padding:6px 9px}
    }
  `;
  parentDocument.head.appendChild(style);
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
  return { toggleOuterFullscreen, syncButtons };
}

function cleanText(value=''){
  return String(value).replace(/[▸▾]/g,'').replace(/\s+/g,' ').trim();
}

function sliderSnapshot(containerId){
  const root=document.getElementById(containerId);
  if(!root)return [];
  return [...root.querySelectorAll('.srow')].map((row,index)=>{
    const input=row.querySelector('input[type="range"]');
    const label=row.querySelector('.slabel')?.childNodes?.[0]?.textContent?.trim()
      || input?.getAttribute('aria-label') || `SETTING ${index+1}`;
    return input?{
      index,label,min:Number(input.min),max:Number(input.max),step:Number(input.step),value:Number(input.value),
    }:null;
  }).filter(Boolean);
}

function buttonSnapshot(containerId){
  const root=document.getElementById(containerId);
  if(!root)return [];
  return [...root.querySelectorAll('button')].map((button,index)=>({
    id:button.dataset.id||button.dataset.k||String(index),
    label:button.textContent.trim(),
    note:button.title||'',
    active:button.classList.contains('on'),
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

let mirroredControlSequence=0;
function mirroredControlId(control,prefix='panel'){
  if(!control.dataset.enemyLabMirrorId){
    const base=String(control.id||control.name||control.dataset.id||control.dataset.k||`${prefix}-${++mirroredControlSequence}`)
      .replace(/[^a-z0-9_-]+/gi,'-');
    control.dataset.enemyLabMirrorId=`${prefix}:${base}:${mirroredControlSequence}`;
  }
  return control.dataset.enemyLabMirrorId;
}

function controlLabel(control,index=0){
  if(control.tagName==='BUTTON')return cleanText(control.textContent)||`ACTION ${index+1}`;
  if(control.id){
    const explicit=document.querySelector(`label[for="${control.id.replace(/"/g,'\\"')}"]`);
    if(explicit)return cleanText(explicit.textContent);
  }
  const row=control.closest('.srow,.selectRow,label');
  if(row){
    const named=row.querySelector('.slabel,label,span');
    if(named){
      const text=cleanText(named.textContent);
      if(text)return text.replace(new RegExp(`\\s*${String(control.value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*$`),'').trim();
    }
    const text=cleanText(row.textContent);
    if(text)return text.replace(String(control.value),'').trim();
  }
  let ancestor=control.parentElement;
  for(let depth=0;ancestor&&depth<4;depth++,ancestor=ancestor.parentElement){
    const first=ancestor.firstElementChild;
    if(first&&first!==control&&!first.contains(control)){
      const text=cleanText(first.textContent);
      if(text&&text.length<80)return text.replace(String(control.value),'').trim();
    }
  }
  return cleanText(control.getAttribute('aria-label')||control.title||control.name||control.id)||`CONTROL ${index+1}`;
}

function isCollapseHeader(button){
  return button.tagName==='BUTTON'&&/^[▸▾]/.test(button.textContent.trim())&&button.nextElementSibling?.tagName==='DIV';
}

function mirroredControlSnapshot(control,prefix,index){
  const id=mirroredControlId(control,prefix);
  const label=controlLabel(control,index);
  const note=cleanText(control.title||control.getAttribute('aria-description')||'');
  if(control.tagName==='SELECT'){
    return {id,kind:'select',label,note,value:control.value,disabled:control.disabled,options:[...control.options].map(option=>({value:option.value,label:cleanText(option.textContent),selected:option.selected}))};
  }
  if(control.tagName==='BUTTON'){
    return {id,kind:'button',label,note,active:control.classList.contains('on')||control.getAttribute('aria-pressed')==='true',disabled:control.disabled};
  }
  if(control.type==='checkbox'||control.type==='radio'){
    return {id,kind:'check',label,note,checked:control.checked,disabled:control.disabled};
  }
  if(control.type==='range'||control.type==='number'){
    const min=Number(control.min),max=Number(control.max),step=Number(control.step);
    return {id,kind:'range',label,note,value:Number(control.value),min:Number.isFinite(min)?min:0,max:Number.isFinite(max)?max:100,step:Number.isFinite(step)&&step>0?step:1,disabled:control.disabled};
  }
  return {id,kind:'text',label,note,value:control.value||'',disabled:control.disabled};
}

function sectionControls(root,prefix){
  if(!root)return [];
  return [...root.querySelectorAll('input,select,button')]
    .filter(control=>!control.closest('#tabs')&&!control.classList.contains('sect')&&!isCollapseHeader(control))
    .map((control,index)=>mirroredControlSnapshot(control,prefix,index));
}

function panelSectionsSnapshot(){
  const sections=[];
  const panel=document.getElementById('panel');
  if(panel){
    const bodies=[...panel.querySelectorAll('.sbody')];
    for(const body of bodies){
      const id=body.id?.replace(/^body-/,'')||`section-${sections.length+1}`;
      const header=body.previousElementSibling;
      const label=cleanText(header?.dataset?.label||header?.textContent||id);
      const controls=sectionControls(body,`panel-${id}`);
      if(controls.length)sections.push({id,label,source:'combat-arena',controls});
    }
    const orphanControls=[...panel.querySelectorAll('input,select,button')]
      .filter(control=>!control.closest('.sbody')&&!control.closest('#tabs')&&!control.classList.contains('sect')&&!isCollapseHeader(control));
    if(orphanControls.length){
      sections.push({id:'arena-actions',label:'ARENA ACTIONS',source:'combat-arena',controls:orphanControls.map((control,index)=>mirroredControlSnapshot(control,'panel-actions',index))});
    }
  }

  const tuningPanels=[...document.querySelectorAll('[id*="Panel"],[id*="panel"]')]
    .filter(root=>root!==panel&&root.id!=='startCard'&&root.querySelector('input,select,button'));
  for(const root of tuningPanels){
    if(root.closest('#panel'))continue;
    const controls=sectionControls(root,`extra-${root.id||sections.length}`);
    if(!controls.length)continue;
    const title=cleanText(root.firstElementChild?.textContent||root.getAttribute('aria-label')||root.id||'EXTRA CONTROLS');
    sections.push({id:`extra-${root.id||sections.length}`,label:title.slice(0,52)||'EXTRA CONTROLS',source:'extra-panel',controls});
  }
  return sections;
}

function findMirroredControl(id){
  return [...document.querySelectorAll('[data-enemy-lab-mirror-id]')].find(control=>control.dataset.enemyLabMirrorId===id)||null;
}

function activateMirroredControl(id,value){
  const control=findMirroredControl(id);
  if(!control||control.disabled)return false;
  if(control.tagName==='BUTTON'){
    control.click();
    return true;
  }
  if(control.type==='checkbox'||control.type==='radio')control.checked=value===undefined?!control.checked:!!value;
  else if(value!==undefined)control.value=String(value);
  control.dispatchEvent(new Event('input',{bubbles:true}));
  control.dispatchEvent(new Event('change',{bubbles:true}));
  return true;
}

function installParentMenuMirror(parentDocument,bridge){
  const categories=parentDocument.getElementById('labCategories');
  const values=parentDocument.getElementById('labValues');
  const hint=parentDocument.getElementById('categoryHint');
  if(!categories||!values||categories.dataset.enemyLabMirrorInstalled==='1')return;
  categories.dataset.enemyLabMirrorInstalled='1';
  let mirrorActive=false;
  let arenaButton=null;

  const makeChoice=(control)=>{
    const doc=parentDocument;
    if(control.kind==='range'){
      const card=doc.createElement('div');card.className='sliderCard';
      card.innerHTML=`<label>${control.label}<output>${control.value}</output></label><input type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${control.value}"${control.disabled?' disabled':''}>`;
      const input=card.querySelector('input'),output=card.querySelector('output');
      input.addEventListener('input',()=>{output.value=input.value;bridge.activatePanelControl(control.id,Number(input.value));});
      return card;
    }
    if(control.kind==='select'){
      const card=doc.createElement('div');card.className='controlCard';
      const label=doc.createElement('label');label.textContent=control.label;label.style.cssText='font-size:8.5px;color:var(--muted);letter-spacing:.06em';
      const select=doc.createElement('select');select.disabled=!!control.disabled;
      for(const option of control.options||[]){const item=doc.createElement('option');item.value=option.value;item.textContent=option.label;item.selected=option.selected;select.appendChild(item);}
      select.addEventListener('change',()=>{bridge.activatePanelControl(control.id,select.value);setTimeout(renderMirror,60);});
      card.append(label,select);return card;
    }
    const button=doc.createElement('button');
    button.className=`choice${control.active||control.checked?' on':''}${control.kind==='check'?' enemyLabCheckCard':''}`;
    button.disabled=!!control.disabled;
    button.innerHTML=`<b>${control.label}</b>${control.note?`<span>${control.note}</span>`:''}${control.kind==='check'?`<em>${control.checked?'ON':'OFF'}</em>`:''}`;
    button.addEventListener('click',()=>{bridge.activatePanelControl(control.id,control.kind==='check'?!control.checked:undefined);setTimeout(renderMirror,60);});
    return button;
  };

  const renderMirror=()=>{
    if(!mirrorActive)return;
    const data=bridge.panelSnapshot();
    const list=parentDocument.createElement('div');list.className='valueList';
    for(const section of data.sections||[]){
      const head=parentDocument.createElement('div');head.className='enemyLabMirrorSection';
      head.innerHTML=`<b>${section.label}</b><span>${section.controls.length} mirrored control${section.controls.length===1?'':'s'} · exact Combat Arena behavior</span>`;
      list.appendChild(head);
      for(const control of section.controls)list.appendChild(makeChoice(control));
    }
    if(!(data.sections||[]).length){
      const empty=parentDocument.createElement('div');empty.className='statusCard';empty.innerHTML='<b>NO CONTROLS FOUND</b><span>The Combat Arena control inventory did not load. Reload the Enemy Lab.</span>';list.appendChild(empty);
    }
    values.replaceChildren(list);values.scrollTop=0;values.scrollLeft=0;
    hint.textContent='Every control currently present in the Combat Arena menus, including controls added later.';
    requestAnimationFrame(()=>values.dispatchEvent(new Event('scroll')));
  };

  const enhanceCategories=()=>{
    const buttons=[...categories.querySelectorAll(':scope > .choice')];
    const testButton=buttons.find(button=>cleanText(button.querySelector('b')?.textContent||button.textContent)==='TEST');
    if(testButton){
      testButton.classList.add('enemyLabFeaturedTest');
      if(categories.firstElementChild!==testButton)categories.prepend(testButton);
    }
    if(!arenaButton||!arenaButton.isConnected){
      arenaButton=parentDocument.createElement('button');
      arenaButton.className='choice enemyLabArenaMirror';
      arenaButton.innerHTML='<b>ARENA</b><span>All controls</span>';
      arenaButton.addEventListener('click',()=>{
        mirrorActive=true;
        for(const button of categories.querySelectorAll(':scope > .choice'))button.classList.remove('on');
        arenaButton.classList.add('on');
        renderMirror();
      });
      if(testButton?.nextSibling)categories.insertBefore(arenaButton,testButton.nextSibling);
      else categories.prepend(arenaButton);
    }else if(testButton&&arenaButton.previousElementSibling!==testButton){
      categories.insertBefore(arenaButton,testButton.nextSibling);
    }
    for(const button of categories.querySelectorAll(':scope > .choice:not(.enemyLabArenaMirror)')){
      if(button.dataset.enemyLabMirrorExit==='1')continue;
      button.dataset.enemyLabMirrorExit='1';
      button.addEventListener('click',()=>{mirrorActive=false;arenaButton?.classList.remove('on');});
    }
  };

  new MutationObserver(()=>queueMicrotask(enhanceCategories)).observe(categories,{childList:true});
  enhanceCategories();
  bridge.refreshParentMirror=()=>{if(mirrorActive)renderMirror();else enhanceCategories();};
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
      try{ window.parent.__enemyLabSetOpenFromArena?.(panelOpen()); }
      catch(error){ console.error('Enemy Lab menu sync failed',error); }
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
      setMenuOpen(open){
        if(panelOpen()!==!!open)menuButton.click();
      },
      snapshot(){
        const runtime=window.__arena;
        return {
          ready:!!runtime,
          menuOpen:panelOpen(),
          weaponId:runtime?.combatState?.weapon||'',
          stanceName:runtime?.arena?.stance?.name||runtime?.arena?.stance?.id||'',
          directorModes:buttonSnapshot('modeGrid'),
          combatModes:buttonSnapshot('combatModeGrid'),
          tuning:sliderSnapshot('dirSliders'),
          feelKeys:buttonSnapshot('keyRow'),
          feel:sliderSnapshot('feelSliders'),
          roomOptions:roomOptions(),
          panelSections:panelSectionsSnapshot(),
        };
      },
      panelSnapshot(){return {ready:!!window.__arena,sections:panelSectionsSnapshot()};},
      activatePanelControl(id,value){const changed=activateMirroredControl(id,value);setTimeout(()=>bridge.refreshParentMirror?.(),40);return changed;},
      cycleWeapon(direction=1){ runtimeCall('cycleWeapon',direction); },
      cycleStance(){ runtimeCall('cycleStance'); },
      setDirectorMode(id){ return clickButton('modeGrid',id); },
      setCombatMode(id){ return clickButton('combatModeGrid',id); },
      setTuning(index,value){ return setSlider('dirSliders',index,value); },
      setFeelKey(id){ return clickButton('keyRow',id); },
      setFeel(index,value){ return setSlider('feelSliders',index,value); },
      testFeel(){
        const keys=[...(document.getElementById('keyRow')?.querySelectorAll('button')||[])];
        const selected=Math.max(0,keys.findIndex(button=>button.classList.contains('on')));
        if(panelOpen())menuButton.click();
        runtimeCall('beginTestSwing',selected/Math.max(1,keys.length-1));
      },
      resetFight(){ document.getElementById('resetBtn')?.click(); },
      setCellSize(id){
        const select=document.getElementById('mazeCellSizeSelect');
        if(select){ select.value=id; select.dispatchEvent(new Event('change',{bubbles:true})); return true; }
        localStorage.setItem('enemyLab.mazeCellSize',id);
        location.reload();
        return true;
      },
      toggleFullscreen(){ fullscreenBridge?.toggleOuterFullscreen?.(); },
    };

    installParentMenuMirror(parentDocument,bridge);
    const controlObserver=new MutationObserver(()=>{
      try{window.parent.__enemyLabArenaControlsReady?.();bridge.refreshParentMirror?.();}
      catch(error){console.error('Enemy Lab control inventory refresh failed',error);}
    });
    controlObserver.observe(panel,{subtree:true,childList:true});
    const hitFeelPanel=document.getElementById('hitFeelPanel');
    if(hitFeelPanel)controlObserver.observe(hitFeelPanel,{subtree:true,childList:true});

    notifyParent();
    let readyAttempts=0;
    const notifyControlsReady=()=>{
      if(window.__arena){
        try{ window.parent.__enemyLabArenaControlsReady?.();bridge.refreshParentMirror?.(); }
        catch(error){ console.error('Enemy Lab controls-ready sync failed',error); }
        return;
      }
      if(readyAttempts++<240)setTimeout(notifyControlsReady,50);
    };
    notifyControlsReady();
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
    installEnemyLabParentStyles(parentDocument);
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
