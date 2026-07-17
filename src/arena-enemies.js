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

function installEnemyLabFullscreenBridge(){
  const parentDocument=enemyLabParentDocument();
  if(!parentDocument)return;

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
    event.preventDefault();
    event.stopImmediatePropagation();
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

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});
  else attach();
  parentDocument.addEventListener('fullscreenchange',syncButtons);
  parentDocument.addEventListener('webkitfullscreenchange',syncButtons);
}

installEnemyLabFullscreenBridge();

export function createArenaEnemySystem(options={}){
  return createCoreArenaEnemySystem(options);
}
