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
  return { toggleOuterFullscreen, syncButtons };
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

    window.__enemyLabControlBridge={
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
        };
      },
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

    notifyParent();
    try{ window.parent.__enemyLabArenaControlsReady?.(); }
    catch(error){ console.error('Enemy Lab controls-ready sync failed',error); }
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
