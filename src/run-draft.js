import { getArenaRuntime, subscribeArenaRuntime } from './arena-runtime-context.js';
import { ATTACK_DEFINITIONS } from './attacks.js';
import { listCards } from './card-registry.js';
import { applyActiveCombatProfileToArena } from './combat-profile.js';
import { guardPoseFor } from './guard-poses.js';
import { createRewardTotemGate } from './reward-totem-gate.js';
import { StoneSettings } from './settings.js';
import { STONE_WEAPON_ORDER, STONE_WEAPONS } from './weapons.js';
import { resolveWorkingAbilityRunPools } from './working-ability-run-pools.js';

const STANCE_CARDS = listCards({family:'stance'});
const EXTRA_STANCE_CARDS = listCards({family:'special-stance'});
const NON_STANCE_CARDS = listCards({family:'non-stance'});

export const STARTER_STANCE_IDS = Object.freeze(['S24','S09']);
export const ALL_STANCE_CARDS = Object.freeze([...STANCE_CARDS,...EXTRA_STANCE_CARDS]);

function shuffleCopy(values,rng=Math.random){
  const out=values.slice();
  for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;
}
export function drawCards(pool,count,rng=Math.random){
  if(!Array.isArray(pool)||!pool.length||count<=0)return[];
  const picked=shuffleCopy(pool,rng).slice(0,Math.min(count,pool.length));
  while(picked.length<count)picked.push(pool[Math.floor(rng()*pool.length)]);
  return picked;
}
export function buildRunOffers({weaponOrder=STONE_WEAPON_ORDER,nonStancePool=NON_STANCE_CARDS,count=3,rng=Math.random}={}){
  const starterCount=Math.min(2,Math.max(0,nonStancePool.length));
  return drawCards(weaponOrder,count,rng).map(weaponId=>({weaponId,cards:drawCards(nonStancePool,starterCount,rng)}));
}
export function buildRewardPool(stancePool=ALL_STANCE_CARDS,nonStancePool=NON_STANCE_CARDS){return[...stancePool,...nonStancePool];}
export function drawRewardChoices({stancePool=ALL_STANCE_CARDS,nonStancePool=NON_STANCE_CARDS,count=3,rng=Math.random}={}){
  const pool=buildRewardPool(stancePool,nonStancePool);
  return drawCards(pool,Math.min(count,pool.length),rng);
}

function cleanName(card){return String(card?.name||'Unknown Card').replace(/^S\d+\s*/,'');}
function isNonStance(card){return card?.type==='ability'||card?.type==='modifier';}
function arrowForAttack(key){
  const attack=ATTACK_DEFINITIONS[key]||{};
  if(attack.group==='stab')return/rising/i.test(attack.label||'')?'↗':'→';
  if(attack.group==='horizontal')return'↔';
  if(attack.group==='vertical')return/rising|skyhook|launch|uppercut/i.test(attack.label||'')?'↑':'↓';
  return'·';
}
function subtitle(card){return isNonStance(card)?(card.description||'Non-stance combat card'):(card.chain?.map(arrowForAttack).join(' ')||'Stance card');}
function showMessage(text){const msg=document.getElementById('msg');if(!msg)return;msg.textContent=text;msg.style.opacity=1;}

function addStyles(){
  if(document.getElementById('runDraftStyles'))return;
  const style=document.createElement('style');style.id='runDraftStyles';style.textContent=`
  #startGate{overflow:auto;padding:max(12px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));box-sizing:border-box}
  #startCard.runDraftCard{width:min(980px,100%);max-width:none;text-align:left;padding:18px;box-sizing:border-box}
  #startCard .sgTitle{text-align:center;margin-bottom:6px}#startCard .sgHint{text-align:center;margin-bottom:14px}
  #runOfferGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
  .runOffer,.rewardChoice{font-family:inherit;color:#9fd2c9;background:rgba(18,36,38,.9);border:1px solid #2c4a47;border-radius:8px;padding:12px;text-align:left;touch-action:manipulation}
  .runOffer:active,.rewardChoice:active{transform:translateY(2px);background:#2c4a47}
  .runOfferWeapon{color:#e8a04c;font-size:14px;letter-spacing:.12em;text-align:center;margin-bottom:9px}
  .runOfferProfile{color:#6f9d96;font-size:9px;line-height:1.35;text-align:center;min-height:25px;margin-bottom:9px}
  .runFixedStances{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:9px}.runFixedStance{border:1px solid rgba(44,74,71,.72);border-radius:5px;padding:6px 4px;text-align:center;font-size:9px}.runFixedStance b{display:block;color:#d8c49b;font-size:10px;margin-bottom:3px}
  .runStarterCards{display:flex;flex-direction:column;gap:5px}.runStarterCard{border:1px solid rgba(169,91,53,.75);border-radius:5px;padding:7px;background:rgba(110,58,36,.12)}.runStarterCard b{display:block;color:#ffb066;font-size:10px;letter-spacing:.06em}.runStarterCard span{display:block;font-size:8.5px;line-height:1.3;margin-top:3px;color:#8ebbb3}
  #runSetupActions{display:flex;gap:8px;margin-top:12px}#runSetupActions button{flex:1}
  #cardRewardGate{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;background:rgba(4,9,10,.93)}#cardRewardGate.hidden{display:none}
  #cardRewardCard{width:min(760px,100%);background:rgba(14,28,30,.98);border:1px solid #6e3a24;border-radius:10px;padding:18px;box-sizing:border-box;box-shadow:0 8px 0 rgba(0,0,0,.3)}
  #cardRewardTitle{text-align:center;color:#e8a04c;font-size:15px;letter-spacing:.18em;margin-bottom:5px}#cardRewardHint{text-align:center;color:#8ebbb3;font-size:10px;margin-bottom:14px}
  #cardRewardChoices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.rewardChoice{min-height:130px;display:flex;flex-direction:column;justify-content:center;text-align:center}.rewardChoice .rewardType{font-size:8px;letter-spacing:.16em;color:#6f9d96;margin-bottom:7px}.rewardChoice b{color:#e8a04c;font-size:12px;line-height:1.3}.rewardChoice span{display:block;color:#9fd2c9;font-size:10px;line-height:1.45;margin-top:8px}
  #cardRewardSkip{width:100%;font-family:inherit;font-size:10px;letter-spacing:.15em;color:#8ebbb3;background:transparent;border:1px solid #2c4a47;border-radius:6px;padding:11px;margin-top:10px}
  @media(max-width:680px){#startCard.runDraftCard{padding:12px}#runOfferGrid{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:5px}.runOffer{min-width:min(78vw,260px);scroll-snap-align:center}#cardRewardChoices{grid-template-columns:1fr}.rewardChoice{min-height:82px}#cardRewardGate{align-items:flex-start;overflow:auto;padding-top:max(14px,env(safe-area-inset-top))}}
  @media(orientation:landscape) and (max-height:520px){#startGate{align-items:flex-start!important;padding:max(4px,env(safe-area-inset-top)) 6px max(4px,env(safe-area-inset-bottom))!important}#startCard.runDraftCard{padding:6px 8px!important;border-radius:7px!important;box-shadow:0 3px 0 rgba(0,0,0,.28)!important}#startCard .sgTitle{font-size:11px!important;line-height:1.1!important;margin:0 0 4px!important}#startCard .sgHint,.runOfferProfile,.runStarterCard span,#runSetupActions{display:none!important}#runOfferGrid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:5px!important;padding:0!important;overflow:visible!important}.runOffer{min-width:0!important;padding:5px!important;border-radius:6px!important}.runOfferWeapon{font-size:11px!important;line-height:1.05!important;margin-bottom:4px!important}.runFixedStances{gap:3px!important;margin-bottom:4px!important}.runFixedStance{padding:3px 2px!important;font-size:8px!important;line-height:1.05!important}.runFixedStance b,.runStarterCard b{font-size:8px!important;margin-bottom:1px!important}.runStarterCards{gap:3px!important}.runStarterCard{padding:4px!important}#cardRewardGate{align-items:flex-start!important;padding:4px 6px!important}#cardRewardCard{padding:7px!important}#cardRewardTitle{font-size:11px!important;margin-bottom:2px!important}#cardRewardHint{display:none!important}#cardRewardChoices{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:5px!important}.rewardChoice{min-height:72px!important;padding:5px!important}.rewardChoice .rewardType{margin-bottom:3px!important}.rewardChoice b{font-size:9px!important}.rewardChoice span{font-size:8px!important;line-height:1.2!important;margin-top:3px!important}#cardRewardSkip{padding:6px!important;margin-top:5px!important}}
  `;document.head.appendChild(style);
}

function forceArenaReset(){getArenaRuntime()?.resetFight?.();}
function setOpeningStance(api,stance){if(!stance)return;api.arena.stance=stance;api.arena.stanceIndex=0;api.PC.setReadyPose?.(guardPoseFor(stance));}

export function installRunDraft(deck){
  if(typeof window==='undefined'||typeof document==='undefined'||window.__STONE_RUN_DRAFT_INSTALLED__)return;
  const startGate=document.getElementById('startGate'),startCard=document.getElementById('startCard');if(!startGate||!startCard)return;
  window.__STONE_RUN_DRAFT_INSTALLED__=true;addStyles();
  const starters=STARTER_STANCE_IDS.map(id=>ALL_STANCE_CARDS.find(card=>card.id===id)).filter(Boolean);
  if(starters.length!==2){const err=document.getElementById('err');if(err){err.style.display='block';err.textContent='Run setup missing Rat Step or Deep Launch';}return;}
  const state={api:null,setupOpen:true,rewardOpen:false,seenCleared:0,rewardRoomId:null,totem:null,profile:null,pools:null};
  const title=document.createElement('div');title.className='sgTitle';title.textContent='CHOOSE A LOADOUT';
  const hint=document.createElement('div');hint.className='sgHint';hint.textContent='Choose one weapon and two non-stance starter cards.';
  const grid=document.createElement('div');grid.id='runOfferGrid';const actions=document.createElement('div');actions.id='runSetupActions';
  const fullscreen=document.getElementById('sgFsBtn');if(fullscreen)actions.appendChild(fullscreen);startCard.classList.add('runDraftCard');startCard.replaceChildren(title,hint,grid,actions);
  const rewardGate=document.createElement('div');rewardGate.id='cardRewardGate';rewardGate.className='hidden';rewardGate.innerHTML='<div id="cardRewardCard"><div id="cardRewardTitle">ROOM CLEAR</div><div id="cardRewardHint">Choose one card for the run, or skip.</div><div id="cardRewardChoices"></div><button id="cardRewardSkip">SKIP</button></div>';document.body.appendChild(rewardGate);
  const rewardChoices=rewardGate.querySelector('#cardRewardChoices');
  const currentPools=()=>{state.pools=resolveWorkingAbilityRunPools();return state.pools;};

  function closeReward(){const roomId=state.rewardRoomId;state.rewardOpen=false;state.rewardRoomId=null;rewardGate.classList.add('hidden');state.totem?.resolve(roomId);if(state.api&&!state.setupOpen&&document.getElementById('panel')?.classList.contains('hidden'))state.api.arena.paused=false;}
  function openReward(roomId){
    if(!state.api||state.rewardOpen||state.setupOpen)return;
    state.rewardOpen=true;state.rewardRoomId=roomId;state.api.arena.paused=true;
    const pools=currentPools();
    const choices=drawCards(pools.rewardPool,Math.min(3,pools.rewardPool.length));
    const rewardHint=rewardGate.querySelector('#cardRewardHint');
    if(rewardHint)rewardHint.textContent=pools.active?`Choose from the ${pools.cards.length}-card Working Ability Pool, or skip.`:'Choose one card for the run, or skip.';
    rewardChoices.replaceChildren(...choices.map(card=>{const button=document.createElement('button');button.className='rewardChoice';button.innerHTML=`<div class="rewardType">${isNonStance(card)?card.type.toUpperCase():'STANCE'}</div><b>${cleanName(card)}</b><span>${subtitle(card)}</span>`;button.addEventListener('click',()=>{deck.addCard(card);closeReward();});return button;}));
    rewardGate.classList.remove('hidden');
  }
  rewardGate.querySelector('#cardRewardSkip').addEventListener('click',closeReward);

  function chooseOffer(offer){
    const api=state.api;if(!api)return;
    state.totem?.reset();
    deck.unlockRun();
    api.PC.selectCombatWeapon(offer.weaponId);
    StoneSettings.set('arena.weapon',offer.weaponId);
    deck.beginRun([...starters,...offer.cards],{openingStanceId:STARTER_STANCE_IDS[0]});
    api.arena.started=true;
    state.setupOpen=false;
    startGate.classList.add('hidden');
    // Apply before reset so the newly generated opening room uses the saved count,
    // roster, pressure, and enemy tuning. Reapply after reset to synchronize controls.
    state.profile=applyActiveCombatProfileToArena(api)||state.profile;
    forceArenaReset();
    state.profile=applyActiveCombatProfileToArena(api)||state.profile;
    setOpeningStance(api,starters[0]);
    state.seenCleared=api.encounterState?.progress?.cleared||0;
    api.arena.paused=false;
  }
  function renderOffers(){
    const pools=currentPools();
    const profileText=state.profile?`${state.profile.name} · `:'';
    hint.textContent=pools.active
      ?`${profileText}${pools.cards.length}-card Working Ability Pool · ${pools.nonStancePool.length} starter extras · room rewards stay inside the pool.`
      :'Choose one weapon and two non-stance starter cards. Empty Ability Pool uses the legacy card lists.';
    const offers=buildRunOffers({nonStancePool:pools.nonStancePool});
    grid.replaceChildren(...offers.map(offer=>{const weapon=STONE_WEAPONS[offer.weaponId]||{label:offer.weaponId,profile:''};const button=document.createElement('button');button.className='runOffer';button.innerHTML=`<div class="runOfferWeapon">${weapon.label}</div><div class="runOfferProfile">${weapon.profile||''}</div><div class="runFixedStances">${starters.map(card=>`<div class="runFixedStance"><b>${cleanName(card)}</b>${subtitle(card)}</div>`).join('')}</div><div class="runStarterCards">${offer.cards.map(card=>`<div class="runStarterCard"><b>${cleanName(card)}</b><span>${subtitle(card)}</span></div>`).join('')}</div>`;button.addEventListener('click',()=>chooseOffer(offer));return button;}));
  }
  function openSetup(){if(!state.api)return;state.setupOpen=true;state.api.arena.paused=true;renderOffers();startGate.classList.remove('hidden');}
  const topBar=document.getElementById('topBar');if(topBar&&!document.getElementById('runSetupBtn')){const button=document.createElement('button');button.className='tbtn';button.id='runSetupBtn';button.textContent='RUN';button.title='Choose a new run loadout';button.addEventListener('click',openSetup);topBar.insertBefore(button,topBar.firstChild);}

  const arenaReady=api=>!!api?.PC&&api.deck===deck&&!!api.arena&&!!api.encounterState&&!!api.enemySystem;
  let runtimeSubscription=null;
  async function attachArena(api){
    if(!arenaReady(api)||state.api)return;
    state.api=api;
    state.profile=applyActiveCombatProfileToArena(state.api);
    state.seenCleared=api.encounterState.progress?.cleared||0;
    try{state.totem=await createRewardTotemGate({getApi:()=>state.api,onTriggered:openReward,onMessage:showMessage});}catch{return;}
    renderOffers();startGate.classList.remove('hidden');monitorProgress();
  }
  function waitForArena(){
    const api=getArenaRuntime();
    if(arenaReady(api)){void attachArena(api);return;}
    runtimeSubscription?.();
    runtimeSubscription=subscribeArenaRuntime(event=>{
      if(!arenaReady(event?.runtime))return;
      runtimeSubscription?.();runtimeSubscription=null;
      void attachArena(event.runtime);
    });
  }
  function monitorProgress(){if(state.api){const cleared=state.api.encounterState?.progress?.cleared||0;if(state.api.arena.started&&cleared>state.seenCleared){state.seenCleared=cleared;state.totem?.arm(state.api.activeRoomId);}else if(cleared<state.seenCleared){state.seenCleared=cleared;state.totem?.reset();}}requestAnimationFrame(monitorProgress);}
  waitForArena();
}
