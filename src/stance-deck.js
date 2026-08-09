// One Step From Eden-style stance-card deck: a shuffled draw pile feeds two
// hand slots. Ability/modifier cards preserve the active stance while their
// dedicated events resolve.

import { STANCE_CARDS } from './stance-cards.js';
import { getStanceClass, getStanceClassPresentation } from './stance-compatibility.js';
import { POW_BUNKER_CARD } from './powbunker-card.js';
import { BLOOD_SLASH_CARD, BING_BONG_CARD } from './combat-modifier-cards.js';
import { WIZARD_ARCANA_CATALOG, isWizardArcanaCard } from './wizard-arcana-catalog.js';
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

function registerEnemyLabArcanaCatalog(){
  for(const card of WIZARD_ARCANA_CATALOG){
    if(!STANCE_CARDS.some(existing=>existing?.id===card.id))STANCE_CARDS.push(card);
  }
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
function queueNonStanceEffect(eventName,card,staminaSnapshot,detail={}){
  const fire=()=>{restoreStaminaState(currentArenaStamina(),staminaSnapshot);window.dispatchEvent(new CustomEvent(eventName,{detail:{card,...detail}}));};
  if(typeof queueMicrotask==='function')queueMicrotask(fire);else setTimeout(fire,0);
}
function isNonStance(card){return card?.type==='ability'||card?.type==='modifier';}
export function normalizeManualSequence(card){
  const source=card?.manualSequence;if(!source)return null;
  const presses=Math.max(2,Math.trunc(Number(source.presses)||0)),timeout=Math.max(.1,Number(source.timeout)||0);
  return Object.freeze({presses,timeout,label:String(source.label||card?.icon||'COMBO')});
}
function canPlayAbility(card){
  if(typeof window==='undefined')return false;
  if(card?.id===POW_BUNKER_CARD.id)return typeof window.__POWBUNKER_CAN_PLAY__==='function'&&window.__POWBUNKER_CAN_PLAY__();
  if(typeof window.__ABILITY_CARD_CAN_PLAY__==='function')return window.__ABILITY_CARD_CAN_PLAY__(card)!==false;
  return true;
}

export function createStanceDeck({rng=Math.random,shuffleTime=2}={}){
  const s={draw:[],discard:[],hand:[null,null],pool:[],stancePool:[],shuffleT:-1,lastStance:null,stanceButtonBound:false,runLocked:false,manualSequence:null};
  function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function refill(slot){s.hand[slot]=s.draw.shift()??null;}
  function dealFresh(cards){s.draw=shuffle(cards.slice());s.discard=[];refill(0);refill(1);scheduleDecoration();}
  function consumeSlot(slot,card){s.discard.push(card);refill(slot);if(!s.hand[0]&&!s.hand[1]&&!s.draw.length&&s.discard.length)dealFresh(s.discard);}
  function activeStanceFallback(){const found=s.lastStance&&s.stancePool.find(card=>card.id===s.lastStance.id);return found||s.stancePool[0]||null;}
  function proxyActiveStance(card,marker){const stance=activeStanceFallback();return stance?{...stance,name:card.name,__sourceCardType:card.type,__restoresStamina:false,[marker]:true}:null;}
  function applyPool(cards){
    s.manualSequence=null;
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
      const card=s.hand[i],icon=el.querySelector('.cicon'),rows=el.querySelector('.crows'),sequence=s.manualSequence?.slot===i&&s.manualSequence.cardId===card?.id?s.manualSequence:null;
      const ability=card?.type==='ability',modifier=card?.type==='modifier',bing=card?.effectId==='bingBong',arcana=isWizardArcanaCard(card);
      const type=ability?'ability':(modifier?'modifier':'stance');el.dataset.cardType=card?type:'empty';
      const stancePresentation=card&&type==='stance'?getStanceClassPresentation(getStanceClass(card)):null;
      el.dataset.stanceType=stancePresentation?.label||'';el.dataset.stanceTypeLetter=stancePresentation?.short||'';
      el.dataset.manualSequence=sequence?`${sequence.press}/${sequence.total}`:'';
      el.setAttribute('aria-pressed',sequence?'true':'false');
      el.setAttribute('aria-label',card?(sequence?`Continue ${card.name.replace(/^S\d+\s*/,'')} combo, press ${Math.min(sequence.total,sequence.press+1)} of ${sequence.total}`:`Play ${card.name.replace(/^S\d+\s*/,'')} ${type} card`):'Empty card slot');
      if(rows)rows.style.display=modifier?'none':'flex';
      if(icon){
        const stanceArt=stancePresentation?`${stancePresentation.symbol}\n${stancePresentation.label.toUpperCase()}`:'';
        icon.textContent=sequence?`${sequence.label}\n${sequence.press}/${sequence.total}`:arcana?(card.icon||'ARC'):(ability?'PB':(modifier?'BLOOD\nSLASH':(bing?'BING\nBONG':stanceArt)));
        icon.style.display='grid';icon.style.placeItems='center';icon.style.textAlign='center';icon.style.whiteSpace='pre-line';
        icon.style.lineHeight=modifier||bing?'1.02':(stancePresentation?'1.05':'');icon.style.fontWeight=ability||modifier||bing?'900':(stancePresentation?'800':'');
        icon.style.fontSize=sequence?'10px':arcana?'13px':(ability?'16px':(modifier||bing?'10px':(stancePresentation?'8px':'')));
        icon.style.letterSpacing=arcana?'.05em':(ability?'.08em':(modifier||bing?'.04em':(stancePresentation?'.08em':'')));
        icon.style.color=arcana?(card.uiColor||'#ffd47b'):(ability?'#ffb066':(modifier?'#ff9aa7':(bing?'#ffd07b':(stancePresentation?'#d9eee9':''))));
        icon.style.borderColor=arcana?(card.uiBorder||'rgba(255,208,123,.72)'):(ability?'rgba(255,176,102,.72)':(modifier?'rgba(216,59,77,.78)':(bing?'rgba(255,208,123,.72)':(stancePresentation?'rgba(159,210,201,.55)':''))));
        icon.style.background=arcana?(card.uiBackground||'radial-gradient(circle,rgba(255,208,123,.20),rgba(18,36,38,.42))'):(ability?'radial-gradient(circle,rgba(255,176,102,.22),rgba(18,36,38,.42))':(modifier?'radial-gradient(circle,rgba(216,59,77,.28),rgba(32,10,14,.58))':(bing?'radial-gradient(circle,rgba(255,208,123,.20),rgba(18,36,38,.42))':(stancePresentation?'radial-gradient(circle,rgba(86,139,132,.22),rgba(18,36,38,.42))':''))));
      }
      el.style.borderColor=arcana?(card.uiColor||'#b98639'):(ability?'#a95b35':(modifier?'#b62d43':(bing?'#b98639':'')));
      el.style.boxShadow=sequence?`0 0 0 2px ${card.uiColor||'#ffe56d'},0 0 18px ${card.uiColor||'#ffe56d'}`:'';
    }
  }
  function scheduleDecoration(){if(typeof queueMicrotask==='function')queueMicrotask(decorateCards);else setTimeout(decorateCards,0);}
  function notifyDeckChange(reason){
    if(typeof window==='undefined'||typeof window.dispatchEvent!=='function'||typeof CustomEvent==='undefined')return;
    window.dispatchEvent(new CustomEvent('stance-deck:changed',{detail:{reason,manualSequence:s.manualSequence?{...s.manualSequence}:null}}));
  }
  function finishManualSequence(reason){
    const active=s.manualSequence;if(!active)return false;s.manualSequence=null;
    const card=s.hand[active.slot];if(card?.id===active.cardId)consumeSlot(active.slot,card);
    scheduleDecoration();notifyDeckChange(reason);return true;
  }
  function bindStanceButton(){
    if(s.stanceButtonBound||typeof document==='undefined')return;
    const button=document.getElementById('stanceBtn');if(!button){setTimeout(bindStanceButton,0);return;}
    s.stanceButtonBound=true;button.addEventListener('click',()=>{if(!s.stancePool.length)return;const idx=s.stancePool.findIndex(card=>card.id===s.lastStance?.id);s.lastStance=s.stancePool[(idx+1+s.stancePool.length)%s.stancePool.length];});
  }

  const api={
    get hand(){return s.hand;},get upcoming(){return s.draw.slice(0,4);},get drawCount(){return s.draw.length;},get discardCount(){return s.discard.length;},get shuffling(){return s.shuffleT>=0;},get shuffleT(){return s.shuffleT;},get shuffleTime(){return shuffleTime;},get pool(){return s.pool.slice();},get runLocked(){return s.runLocked;},get manualSequence(){return s.manualSequence?{...s.manualSequence}:null;},
    rebuild(cards){applyPool(s.runLocked?s.pool:defaultPool(cards));},
    beginRun(cards,{openingStanceId='S24'}={}){s.runLocked=true;applyPool(cards);const opening=s.stancePool.find(card=>card.id===openingStanceId);if(opening)s.lastStance=opening;},
    unlockRun(){s.runLocked=false;},
    addCard(card){if(!card)return false;s.pool.push(card);if(!isNonStance(card))s.stancePool.push(card);s.discard.push(card);return true;},
    play(slot){
      if(s.shuffleT>=0)return null;const card=s.hand[slot];if(!card)return null;
      if(card.type==='ability'){
        if(!canPlayAbility(card))return null;
        const proxy=proxyActiveStance(card,'__abilityProxy');if(!proxy)return null;const stamina=captureStaminaState(currentArenaStamina()),spec=normalizeManualSequence(card);
        if(spec){
          const active=s.manualSequence&&s.manualSequence.cardId===card.id?s.manualSequence:{slot,cardId:card.id,press:0,total:spec.presses,remaining:spec.timeout,timeout:spec.timeout,label:spec.label};
          active.press++;active.remaining=active.timeout;s.manualSequence=active;
          const sequence={press:active.press,total:active.total,timeout:active.timeout,complete:active.press>=active.total};
          queueNonStanceEffect(card.playEvent||'powbunker:play',card,stamina,{sequence,slot});
          if(sequence.complete){s.manualSequence=null;consumeSlot(slot,card);}
          scheduleDecoration();return{...proxy,__manualSequence:sequence};
        }
        consumeSlot(slot,card);queueNonStanceEffect(card.playEvent||'powbunker:play',card,stamina,{slot});scheduleDecoration();return proxy;
      }
      if(card.type==='modifier'){
        const proxy=proxyActiveStance(card,'__modifierProxy');if(!proxy)return null;const stamina=captureStaminaState(currentArenaStamina());consumeSlot(slot,card);queueNonStanceEffect(card.playEvent||'bloodslash:play',card,stamina);scheduleDecoration();return proxy;
      }
      s.lastStance=card;consumeSlot(slot,card);scheduleDecoration();return card;
    },
    startShuffle(){if(s.shuffleT>=0||s.manualSequence||!s.pool.length)return false;s.discard=[];s.hand=[null,null];s.draw=[];s.shuffleT=shuffleTime;scheduleDecoration();return true;},
    update(dt){
      let changed=false;
      if(s.manualSequence){s.manualSequence.remaining-=Math.max(0,Number(dt)||0);if(s.manualSequence.remaining<=0)changed=finishManualSequence('manual-sequence-timeout')||changed;}
      if(s.shuffleT>=0){s.shuffleT-=dt;if(s.shuffleT<=0){s.shuffleT=-1;dealFresh(s.pool);changed=true;}scheduleDecoration();}
      return changed;
    },
  };

  if(isEnemyLabRuntime()){
    registerEnemyLabArcanaCatalog();
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
