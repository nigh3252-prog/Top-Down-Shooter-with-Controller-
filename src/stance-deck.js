// Mixed stance / ability / modifier deck. Stances and modifiers discard
// immediately. Abilities stay in their LB/RB slot while cooling down, then
// discard and draw a replacement. Manual shuffle discards cooling cards too.

import { BLOOD_SLASH_CARD, BING_BONG_CARD } from './combat-modifier-cards.js';
import { WARDEN_ABILITY_CARDS } from './warden-ability-cards.js';
import {
  canPlayWardenAbility,
  effectiveWardenAbilityCooldown,
  playWardenAbility,
  resetWardenAbilityRuntime,
  updateWardenAbilityRuntime,
} from './warden-ability-runtime.js';

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
function uniqueCards(cards){const seen=new Set();return cards.filter(card=>card&&!seen.has(card.id)&&(seen.add(card.id),true));}
const clamp01=value=>Math.max(0,Math.min(1,value));

export function createStanceDeck({rng=Math.random,shuffleTime=2}={}){
  const s={draw:[],discard:[],hand:[null,null],cooldowns:[0,0],pool:[],stancePool:[],shuffleT:-1,lastStance:null,stanceButtonBound:false,runLocked:false};
  function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function refill(slot){s.hand[slot]=s.draw.shift()??null;s.cooldowns[slot]=0;}
  function dealFresh(cards){s.draw=shuffle(cards.slice());s.discard=[];s.cooldowns=[0,0];refill(0);refill(1);scheduleDecoration();}
  function consumeSlot(slot,card){if(card)s.discard.push(card);s.hand[slot]=null;s.cooldowns[slot]=0;refill(slot);if(!s.hand[0]&&!s.hand[1]&&!s.draw.length&&s.discard.length)dealFresh(s.discard);}
  function activeStanceFallback(){const found=s.lastStance&&s.stancePool.find(card=>card.id===s.lastStance.id);return found||s.stancePool[0]||null;}
  function proxyActiveStance(card,marker){const stance=activeStanceFallback();return stance?{...stance,name:card.name,__sourceCardType:card.type,__restoresStamina:false,[marker]:true}:null;}
  function applyPool(cards){
    s.pool=cards.slice();s.stancePool=s.pool.filter(card=>!isNonStance(card));
    const previous=activeStanceFallback();
    s.lastStance=previous&&s.stancePool.some(card=>card.id===previous.id)?s.stancePool.find(card=>card.id===previous.id):(s.stancePool[0]||null);
    s.shuffleT=-1;resetWardenAbilityRuntime();dealFresh(s.pool);bindStanceButton();
  }
  function defaultPool(stances){
    const stanceCards=stances.some(card=>card.id===BING_BONG_CARD.id)?stances.slice():[...stances,BING_BONG_CARD];
    return uniqueCards([...stanceCards,...WARDEN_ABILITY_CARDS,BLOOD_SLASH_CARD]);
  }

  function ensureCooldownDecoration(el){
    let shade=el.querySelector('.abilityCooldownShade');if(!shade){shade=document.createElement('span');shade.className='abilityCooldownShade';el.appendChild(shade);}
    let text=el.querySelector('.abilityCooldownText');if(!text){text=document.createElement('span');text.className='abilityCooldownText';el.appendChild(text);}
    return{shade,text};
  }
  function decorateCards(){
    if(typeof document==='undefined')return;
    for(let i=0;i<2;i++){
      const el=document.getElementById(`card${i}`);if(!el)continue;
      const card=s.hand[i],icon=el.querySelector('.cicon'),rows=el.querySelector('.crows'),light=el.querySelector('.cardLight'),heavy=el.querySelector('.cardHeavy');
      const ability=card?.type==='ability',modifier=card?.type==='modifier',bing=card?.effectId==='bingBong',cooling=ability&&s.cooldowns[i]>0;
      const type=ability?'ability':(modifier?'modifier':'stance');el.dataset.cardType=card?type:'empty';el.classList.toggle('cooling',cooling);el.dataset.cardId=card?.id||'';
      el.setAttribute('aria-label',card?`${card.name.replace(/^S\d+\s*/,'')} ${type} card${cooling?`, ${s.cooldowns[i].toFixed(1)} seconds cooldown remaining`:''}`:'Empty card slot');
      if(rows)rows.style.display=modifier?'none':'flex';
      if(icon){
        icon.textContent=ability?(card.short||card.icon||'ABILITY'):(modifier?'BLOOD\nSLASH':(bing?'BING\nBONG':''));icon.style.display='grid';icon.style.placeItems='center';icon.style.textAlign='center';icon.style.whiteSpace='pre-line';
        icon.style.lineHeight=modifier||bing?'1.02':'';icon.style.fontWeight=ability||modifier||bing?'900':'';icon.style.fontSize=ability?'10px':(modifier||bing?'10px':'');icon.style.letterSpacing=ability?'.04em':(modifier||bing?'.04em':'');
        icon.style.color=ability?'#eadcff':(modifier?'#ff9aa7':(bing?'#ffd07b':''));icon.style.borderColor=ability?'rgba(195,151,235,.62)':(modifier?'rgba(216,59,77,.78)':(bing?'rgba(255,208,123,.72)':''));
        icon.style.background=ability?'radial-gradient(circle,rgba(151,92,199,.30),rgba(18,36,38,.42))':(modifier?'radial-gradient(circle,rgba(216,59,77,.28),rgba(32,10,14,.58))':(bing?'radial-gradient(circle,rgba(255,208,123,.20),rgba(18,36,38,.42))':''));
      }
      if(ability){if(light)light.textContent=`${card.cost||0} SP`;if(heavy)heavy.textContent=`${effectiveWardenAbilityCooldown(card).toFixed(0)}s`;}
      el.style.borderColor=ability?'#6e4c8e':(modifier?'#b62d43':(bing?'#b98639':''));
      const{shade,text}=ensureCooldownDecoration(el);const total=Math.max(.001,effectiveWardenAbilityCooldown(card));shade.style.height=cooling?`${clamp01(s.cooldowns[i]/total)*100}%`:'0%';text.textContent=cooling?s.cooldowns[i].toFixed(1):'';
    }
  }
  function scheduleDecoration(){if(typeof queueMicrotask==='function')queueMicrotask(decorateCards);else setTimeout(decorateCards,0);}
  function suppressAttackStaminaFlash(){if(typeof document==='undefined')return;const clear=()=>document.getElementById('stWrap')?.classList.remove('exhaust');if(typeof queueMicrotask==='function')queueMicrotask(clear);else setTimeout(clear,0);}
  function bindStanceButton(){
    if(s.stanceButtonBound||typeof document==='undefined')return;
    const button=document.getElementById('stanceBtn');if(!button){setTimeout(bindStanceButton,0);return;}
    s.stanceButtonBound=true;button.addEventListener('click',()=>{if(!s.stancePool.length)return;const idx=s.stancePool.findIndex(card=>card.id===s.lastStance?.id);s.lastStance=s.stancePool[(idx+1+s.stancePool.length)%s.stancePool.length];});
  }

  const api={
    get hand(){return s.hand;},get upcoming(){return s.draw.slice(0,4);},get drawCount(){return s.draw.length;},get discardCount(){return s.discard.length;},get shuffling(){return s.shuffleT>=0;},get shuffleT(){return s.shuffleT;},get shuffleTime(){return shuffleTime;},get pool(){return s.pool.slice();},get runLocked(){return s.runLocked;},cooldownForSlot(slot){return Math.max(0,s.cooldowns[slot]||0);},
    rebuild(cards){applyPool(s.runLocked?s.pool:defaultPool(cards));},
    beginRun(cards,{openingStanceId='S24'}={}){s.runLocked=true;applyPool(cards);const opening=s.stancePool.find(card=>card.id===openingStanceId);if(opening)s.lastStance=opening;},
    unlockRun(){s.runLocked=false;},
    addCard(card){if(!card)return false;s.pool.push(card);if(!isNonStance(card))s.stancePool.push(card);s.discard.push(card);return true;},
    play(slot){
      if(s.shuffleT>=0)return null;if(s.cooldowns[slot]>0){suppressAttackStaminaFlash();return null;}const card=s.hand[slot];if(!card)return null;
      if(card.type==='ability'){
        if(!canPlayWardenAbility(card)||!playWardenAbility(card))return null;
        const proxy=proxyActiveStance(card,'__abilityProxy');if(!proxy)return null;s.cooldowns[slot]=Math.max(.05,effectiveWardenAbilityCooldown(card));scheduleDecoration();return proxy;
      }
      if(card.type==='modifier'){
        const proxy=proxyActiveStance(card,'__modifierProxy');if(!proxy)return null;const stamina=captureStaminaState(currentArenaStamina());consumeSlot(slot,card);queueNonStanceEffect(card.playEvent||'bloodslash:play',card,stamina);scheduleDecoration();return proxy;
      }
      s.lastStance=card;consumeSlot(slot,card);scheduleDecoration();return card;
    },
    startShuffle(){if(s.shuffleT>=0||!s.pool.length)return false;s.discard.push(...s.hand.filter(Boolean));s.hand=[null,null];s.cooldowns=[0,0];s.draw=[];s.shuffleT=shuffleTime;scheduleDecoration();return true;},
    update(dt){
      updateWardenAbilityRuntime(dt);
      if(s.shuffleT>=0){s.shuffleT-=dt;if(s.shuffleT<=0){s.shuffleT=-1;dealFresh(s.pool);}scheduleDecoration();return;}
      let changed=false;
      for(let slot=0;slot<2;slot++){
        if(s.cooldowns[slot]<=0)continue;const card=s.hand[slot];if(card?.type==='ability')s.cooldowns[slot]=Math.min(s.cooldowns[slot],effectiveWardenAbilityCooldown(card));s.cooldowns[slot]=Math.max(0,s.cooldowns[slot]-dt);
        if(s.cooldowns[slot]<=0){const old=s.hand[slot];consumeSlot(slot,old);changed=true;const el=typeof document!=='undefined'?document.getElementById(`card${slot}`):null;if(el){el.classList.remove('draw-in');void el.offsetWidth;el.classList.add('draw-in');}}
      }
      if(changed||s.cooldowns.some(value=>value>0))decorateCards();
    },
  };

  if(typeof document!=='undefined'&&document.getElementById('startGate')){
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
