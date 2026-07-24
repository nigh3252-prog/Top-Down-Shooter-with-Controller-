// One Step From Eden-style stance-card deck: a shuffled draw pile feeds two
// hand slots. Ability/modifier cards preserve the active stance while their
// dedicated events resolve.

import { POW_BUNKER_CARD } from './powbunker-card.js';
import { BLOOD_SLASH_CARD, BING_BONG_CARD } from './combat-modifier-cards.js';
import { installEnemyLabDeckEditor } from './enemy-lab-deck-editor.js';
import { installEnemyLabDeckEditorRefinements } from './enemy-lab-deck-editor-refinements.js';

function isEnemyLabRuntime(){
  if(typeof window==='undefined'||typeof document==='undefined')return false;
  try{
    const params=new URLSearchParams(globalThis.location?.search||'');
    if(params.get('enemyLab')==='1'||params.get('mode')==='enemy-lab')return true;
    const parent=globalThis.parent;
    const framed=parent&&parent!==globalThis&&globalThis.frameElement?.id==='arenaFrame';
    return !!(framed&&/(?:^|\/)enemy-lab\.html$/i.test(parent.location?.pathname||''));
  }catch{return false;}
}

export function cardRestoresStamina(card){
  if(!card)return false;
  if(typeof card.__restoresStamina==='boolean')return card.__restoresStamina;
  return card.type!=='ability'&&card.type!=='modifier';
}
export function captureStaminaState(stamina){
  if(!stamina||typeof stamina!=='object')return null;
  return{v:Number.isFinite(stamina.v)?stamina.v:0,pending:Number.isFinite(stamina.pending)?stamina.pending:0,recoverDelayT:Number.isFinite(stamina.recoverDelayT)?stamina.recoverDelayT:0};
}
export function restoreStaminaState(stamina,snapshot){
  if(!stamina||!snapshot)return false;
  stamina.v=snapshot.v;stamina.pending=snapshot.pending;stamina.recoverDelayT=snapshot.recoverDelayT;return true;
}
function currentArenaStamina(){return typeof window!=='undefined'?window.__arena?.arena?.stamina||null:null;}
function queueNonStanceEffect(eventName,card,staminaSnapshot){
  const fire=()=>{restoreStaminaState(currentArenaStamina(),staminaSnapshot);window.dispatchEvent(new CustomEvent(eventName,{detail:{card}}));};
  if(typeof queueMicrotask==='function')queueMicrotask(fire);else setTimeout(fire,0);
}
function isNonStance(card){return card?.type==='ability'||card?.type==='modifier';}

export function createStanceDeck({rng=Math.random,shuffleTime=2}={}){
  const s={draw:[],discard:[],hand:[null,null],pool:[],stancePool:[],shuffleT:-1,lastStance:null,stanceButtonBound:false,runLocked:false};
  function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function refill(slot){s.hand[slot]=s.draw.shift()??null;}
  function dealFresh(cards){s.draw=shuffle(cards.slice());s.discard=[];refill(0);refill(1);scheduleDecoration();}
  function consumeSlot(slot,card){s.discard.push(card);refill(slot);if(!s.hand[0]&&!s.hand[1]&&!s.draw.length&&s.discard.length)dealFresh(s.discard);}
  function activeStanceFallback(){const found=s.lastStance&&s.stancePool.find(card=>card.id===s.lastStance.id);return found||s.stancePool[0]||null;}
  function proxyActiveStance(card,marker){const stance=activeStanceFallback();return stance?{...stance,name:card.name,__sourceCardType:card.type,__restoresStamina:false,[marker]:true}:null;}
  function applyPool(cards){
    s.pool=cards.slice();s.stancePool=s.pool.filter(card=>!isNonStance(card));
    const previous=activeStanceFallback();
    s.lastStance=previous&&s.stancePool.some(card=>card.id===previous.id)?s.stancePool.find(card=>card.id===previous.id):(s.stancePool[0]||null);
    s.shuffleT=-1;dealFresh(s.pool);bindStanceButton();
  }
  function defaultPool(stances){
    const stanceCards=stances.some(card=>card.id===BING_BONG_CARD.id)?stances.slice():[...stances,BING_BONG_CARD];
    return[...stanceCards,POW_BUNKER_CARD,BLOOD_SLASH_CARD];
  }

  function decorateCards(){
    if(typeof document==='undefined')return;
    for(let i=0;i<2;i++){
      const el=document.getElementById(`card${i}`);if(!el)continue;
      const card=s.hand[i],icon=el.querySelector('.cicon'),rows=el.querySelector('.crows');
      const ability=card?.type==='ability',modifier=card?.type==='modifier',bing=card?.effectId==='bingBong';
      const type=ability?'ability':(modifier?'modifier':'stance');el.dataset.cardType=card?type:'empty';
      el.setAttribute('aria-label',card?`Play ${card.name.replace(/^S\d+\s*/,'')} ${type} card`:'Empty card slot');
      if(rows)rows.style.display=modifier?'none':'flex';
      if(icon){
        icon.textContent=ability?'PB':(modifier?'BLOOD\nSLASH':(bing?'BING\nBONG':''));icon.style.display='grid';icon.style.placeItems='center';icon.style.textAlign='center';icon.style.whiteSpace='pre-line';
        icon.style.lineHeight=modifier||bing?'1.02':'';icon.style.fontWeight=ability||modifier||bing?'900':'';icon.style.fontSize=ability?'16px':(modifier||bing?'10px':'');icon.style.letterSpacing=ability?'.08em':(modifier||bing?'.04em':'');
        icon.style.color=ability?'#ffb066':(modifier?'#ff9aa7':(bing?'#ffd07b':''));icon.style.borderColor=ability?'rgba(255,176,102,.72)':(modifier?'rgba(216,59,77,.78)':(bing?'rgba(255,208,123,.72)':''));
        icon.style.background=ability?'radial-gradient(circle,rgba(255,176,102,.22),rgba(18,36,38,.42))':(modifier?'radial-gradient(circle,rgba(216,59,77,.28),rgba(32,10,14,.58))':(bing?'radial-gradient(circle,rgba(255,208,123,.20),rgba(18,36,38,.42))':''));
      }
      el.style.borderColor=ability?'#a95b35':(modifier?'#b62d43':(bing?'#b98639':''));
    }
  }
  function scheduleDecoration(){if(typeof queueMicrotask==='function')queueMicrotask(decorateCards);else setTimeout(decorateCards,0);}
  function bindStanceButton(){
    if(s.stanceButtonBound||typeof document==='undefined')return;
    const button=document.getElementById('stanceBtn');if(!button){setTimeout(bindStanceButton,0);return;}
    s.stanceButtonBound=true;button.addEventListener('click',()=>{if(!s.stancePool.length)return;const idx=s.stancePool.findIndex(card=>card.id===s.lastStance?.id);s.lastStance=s.stancePool[(idx+1+s.stancePool.length)%s.stancePool.length];});
  }

  const api={
    get hand(){return s.hand;},get upcoming(){return s.draw.slice(0,4);},get drawCount(){return s.draw.length;},get discardCount(){return s.discard.length;},get shuffling(){return s.shuffleT>=0;},get shuffleT(){return s.shuffleT;},get shuffleTime(){return shuffleTime;},get pool(){return s.pool.slice();},get runLocked(){return s.runLocked;},
    rebuild(cards){applyPool(s.runLocked?s.pool:defaultPool(cards));},
    beginRun(cards,{openingStanceId='S24'}={}){s.runLocked=true;applyPool(cards);const opening=s.stancePool.find(card=>card.id===openingStanceId);if(opening)s.lastStance=opening;},
    unlockRun(){s.runLocked=false;},
    addCard(card){if(!card)return false;s.pool.push(card);if(!isNonStance(card))s.stancePool.push(card);s.discard.push(card);return true;},
    play(slot){
      if(s.shuffleT>=0)return null;const card=s.hand[slot];if(!card)return null;
      if(card.type==='ability'){
        const canPlay=typeof window!=='undefined'&&typeof window.__POWBUNKER_CAN_PLAY__==='function'?window.__POWBUNKER_CAN_PLAY__():false;if(!canPlay)return null;
        const proxy=proxyActiveStance(card,'__abilityProxy');if(!proxy)return null;const stamina=captureStaminaState(currentArenaStamina());consumeSlot(slot,card);queueNonStanceEffect(card.playEvent||'powbunker:play',card,stamina);scheduleDecoration();return proxy;
      }
      if(card.type==='modifier'){
        const proxy=proxyActiveStance(card,'__modifierProxy');if(!proxy)return null;const stamina=captureStaminaState(currentArenaStamina());consumeSlot(slot,card);queueNonStanceEffect(card.playEvent||'bloodslash:play',card,stamina);scheduleDecoration();return proxy;
      }
      s.lastStance=card;consumeSlot(slot,card);scheduleDecoration();return card;
    },
    startShuffle(){if(s.shuffleT>=0||!s.pool.length)return false;s.discard=[];s.hand=[null,null];s.draw=[];s.shuffleT=shuffleTime;scheduleDecoration();return true;},
    update(dt){if(s.shuffleT<0)return;s.shuffleT-=dt;if(s.shuffleT<=0){s.shuffleT=-1;dealFresh(s.pool);}scheduleDecoration();},
  };

  if(isEnemyLabRuntime()){
    installEnemyLabDeckEditor(api);
    installEnemyLabDeckEditorRefinements();
  }
  if(typeof document!=='undefined'&&document.getElementById('startGate')&&!isEnemyLabRuntime()){
    const install=()=>import('./run-draft.js').then(module=>module.installRunDraft(api)).catch(error=>{console.error('Run draft UI failed to install',error);const err=document.getElementById('err');if(err){err.style.display='block';err.textContent=`Run draft UI did not load\n${error?.message||error}`;}});
    if(typeof queueMicrotask==='function')queueMicrotask(install);else setTimeout(install,0);
  }
  return api;
}

export function moveArrow({group,label=''}={}){
  if(group==='stab')return/rising/i.test(label)?'↗':'→';
  if(group==='horizontal')return'↔';
  if(group==='vertical')return/rising|skyhook|launch|uppercut/i.test(label)?'↑':'↓';
  return'·';
}
