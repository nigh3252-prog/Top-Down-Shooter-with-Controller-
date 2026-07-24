import { guardPoseFor } from './guard-poses.js';
import {
  ABILITY_TRYOUT_ENTRIES as ENTRIES,
  ABILITY_TRYOUT_FAMILIES as FAMILIES,
  DEFAULT_ENEMY_LAB_DECK_IDS,
  cycleTryoutIndex,
  firstTryoutIndexForFamily,
  dependenciesForEntries,
  selectedEntries,
} from './ability-tryout-registry.js';
import { createEnemyLabDeckModel } from './enemy-lab-deck-model.js';
import { installAbilityTryoutUi } from './ability-tryout-ui.js';
import { installDynamicCardHud } from './dynamic-card-hud.js';
import { maskCardControllerGamepad } from './enemy-lab-card-input.js';
import {
  canPlayWardenAbility,
  effectiveWardenAbilityCooldown,
  getWardenAbilityRuntimeState,
  playWardenAbility,
  resetWardenAbilityRuntime,
  updateWardenAbilityRuntime,
} from './warden-ability-runtime.js';

const KEY='enemyLab.cardsAndDeck.v3';
const LEGACY_KEY='enemyLab.cardsAndDeck.v2';
const PRESET_COUNT=3;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const validIds=new Set(ENTRIES.map(entry=>entry.id));

export function normalizeDeckIds(ids=[]){
  const wanted=new Set();
  for(const id of Array.isArray(ids)?ids:[])if(validIds.has(id))wanted.add(id);
  return ENTRIES.filter(entry=>wanted.has(entry.id)).map(entry=>entry.id);
}

export function sameDeckIds(a=[],b=[]){
  const left=normalizeDeckIds(a),right=normalizeDeckIds(b);
  return left.length===right.length&&left.every((id,index)=>id===right[index]);
}

function normalizePreset(value){
  if(value===null||value===undefined)return null;
  const source=Array.isArray(value)?value:value.ids;
  if(!Array.isArray(source))return null;
  return {ids:normalizeDeckIds(source),savedAt:Number(value?.savedAt)||0};
}

function isEnemyLab(){
  if(typeof window==='undefined')return false;
  try{
    const params=new URLSearchParams(location.search||'');
    return params.get('enemyLab')==='1'||params.get('mode')==='enemy-lab'||
      (parent!==window&&frameElement?.id==='arenaFrame'&&/(?:^|\/)enemy-lab\.html$/i.test(parent.location?.pathname||''));
  }catch{return false;}
}

function load(){
  const defaults={
    mode:'regular',testId:ENTRIES[0]?.id||'',deckIds:[...DEFAULT_ENEMY_LAB_DECK_IDS],
    draftDeckIds:[...DEFAULT_ENEMY_LAB_DECK_IDS],resourceMode:'testing',presets:Array(PRESET_COUNT).fill(null),
  };
  try{
    const saved=JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(LEGACY_KEY)||'{}');
    const applied=normalizeDeckIds(saved.deckIds);
    const deckIds=applied.length?applied:defaults.deckIds;
    const draftDeckIds=Array.isArray(saved.draftDeckIds)?normalizeDeckIds(saved.draftDeckIds):[...deckIds];
    const presets=Array.from({length:PRESET_COUNT},(_,index)=>normalizePreset(saved.presets?.[index]));
    return {
      mode:saved.mode==='test'?'test':'regular',
      testId:validIds.has(saved.testId)?saved.testId:defaults.testId,
      deckIds,draftDeckIds,
      resourceMode:saved.resourceMode==='authored'?'authored':'testing',
      presets,
    };
  }catch{return defaults;}
}

function save(state){
  try{
    localStorage.setItem(KEY,JSON.stringify({
      mode:state.mode,testId:state.testId,deckIds:state.deckIds,draftDeckIds:state.draftDeckIds,
      resourceMode:state.resourceMode,presets:state.presets,
    }));
  }catch{}
}

function resetChain(api){
  const arena=api?.arena,combat=api?.combatState,chain=arena?.chain;
  if(chain)Object.assign(chain,{stage:'idle',comboDeadline:0,finisherDeadline:0,inputLockT:0,lightLockT:0,activeSlot:-1,pendingSlot:-1,pendingStage:null,pendingExpiresAt:0,pendingInput:null});
  if(arena?.charge)Object.assign(arena.charge,{active:false,queued:false,buttonHeld:false,forceTier:null});
  if(combat)Object.assign(combat,{pending:null,pendingGroup:null,readyLock:0,chargePull:0});
}

export function installAbilityTryoutRuntime({PC,edenAbilityRuntime,combatEffectRuntime}={}){
  if(!isEnemyLab()||!PC)return null;
  const stored=load();
  const state={
    ...stored,
    testIndex:Math.max(0,ENTRIES.findIndex(entry=>entry.id===stored.testId)),
    detailsOpen:false,active:null,padPrev:{},testCooldowns:new Map(),disposed:false,
  };
  const deck=createEnemyLabDeckModel({entries:ENTRIES,shuffleTime:2});
  deck.apply(state.deckIds);
  const originalPads=typeof navigator.getGamepads==='function'?navigator.getGamepads.bind(navigator):null;
  const arena=()=>window.__arena||null;
  const eden=()=>window.__EDEN_ARENA_RUNTIME__||edenAbilityRuntime||null;
  const testEntry=()=>ENTRIES[state.testIndex]||ENTRIES[0];
  let ui,hud;

  const tell=(text,error=false)=>ui?.notice(text,error);
  const parentDockOpen=()=>{try{return parent!==window&&parent.document?.body?.classList.contains('dockOpen');}catch{return false;}};
  let notifyQueued=false;
  const notifyParent=()=>{
    if(notifyQueued)return;notifyQueued=true;
    queueMicrotask(()=>{notifyQueued=false;try{parent!==window&&parent.__enemyLabCardsChanged?.();}catch{}});
  };

  function setEdenResources(){
    const runtime=eden();
    if(runtime?.state)runtime.state.manaMode=state.resourceMode==='testing'?'unlimited':'normal';
    const select=document.getElementById('edenManaMode');
    if(select)select.value=state.resourceMode==='testing'?'unlimited':'normal';
  }

  function syncDependencies(){
    hud?.setDependencies(dependenciesForEntries(state.mode==='regular'?deck.state.pool:[testEntry()]).resources);
  }

  function cancel(){
    if(state.active?.entry?.kind==='eden')eden()?.cancelCast?.();
    state.active=null;
  }

  function setMode(mode){
    cancel();state.mode=mode==='test'?'test':'regular';state.detailsOpen=false;save(state);syncDependencies();render();notifyParent();
    tell(state.mode==='regular'?'REGULAR DECK MODE':'ABILITY TEST MODE');
    return state.mode;
  }

  function selectTest(index,announce=true){
    cancel();state.testIndex=cycleTryoutIndex(index,0);state.testId=testEntry().id;
    if(testEntry().kind==='eden')eden()?.selectCard?.(testEntry().sourceId);
    save(state);syncDependencies();render();notifyParent();
    if(announce)tell(`${testEntry().shortName} · RB`);
    return testEntry();
  }

  const cycleTest=delta=>selectTest(cycleTryoutIndex(state.testIndex,delta));
  const selectTestById=id=>selectTest(Math.max(0,ENTRIES.findIndex(entry=>entry.id===id)));
  const selectTestFamily=family=>selectTest(firstTryoutIndexForFamily(family));

  function setResourceMode(value){
    state.resourceMode=value==='authored'?'authored':'testing';setEdenResources();save(state);render();notifyParent();return state.resourceMode;
  }

  function setDetails(force){state.detailsOpen=typeof force==='boolean'?force:!state.detailsOpen;render();}

  function equipStance(entry){
    const api=arena();
    if(!api?.arena||api.arena.deadT>=0||api.roomTransition?.active||api.combatState?.attack||(api.arena.dodge?.t??-1)>=0)return false;
    api.arena.stance=entry.card;api.arena.stanceIndex=-1;resetChain(api);PC.setReadyPose?.(guardPoseFor(entry.card));
    const stamina=api.arena.stamina;if(stamina)Object.assign(stamina,{v:Math.max(100,Number(stamina.v)||0),pending:0,recoverDelayT:0});
    return true;
  }

  function activatePress(entry){
    const api=arena();if(!api||api.arena?.deadT>=0||api.roomTransition?.active)return false;
    if(entry.kind==='stance')return equipStance(entry);
    if(entry.kind==='modifier'){dispatchEvent(new CustomEvent('bloodslash:play',{detail:{card:entry.card}}));return true;}
    if(entry.kind==='warden'){
      const ok=canPlayWardenAbility(entry.card)&&playWardenAbility(entry.card);
      if(ok)hud?.noteWardenCard(entry);return !!ok;
    }
    return false;
  }

  function beginEntry(entry,context){
    if(entry.kind==='eden'){
      eden()?.selectCard?.(entry.sourceId);const ok=!!eden()?.beginCast?.();
      if(ok&&entry.activation==='hold')state.active={entry,...context};
      return {ok,held:ok&&entry.activation==='hold'};
    }
    return {ok:activatePress(entry),held:false};
  }

  function finishActive(contextKind,slot=null){
    const active=state.active;
    if(!active||active.contextKind!==contextKind||(slot!==null&&active.slot!==slot))return false;
    const ok=!!eden()?.releaseCast?.();state.active=null;return ok;
  }

  function handDown(slot){
    if(state.mode!=='regular'||state.active)return false;
    const entry=deck.state.hand[slot];if(!entry||deck.cooldownFor(slot)>0)return false;
    const result=beginEntry(entry,{contextKind:'hand',slot});
    if(!result.ok){tell(`${entry.shortName} NOT READY`,true);return false;}
    if(result.held){render();return true;}
    if(entry.kind==='warden')deck.startCooldown(slot,effectiveWardenAbilityCooldown(entry.card));else deck.consume(slot);
    tell(entry.shortName);syncDependencies();render();return true;
  }

  function handUp(slot){
    if(state.mode!=='regular')return false;
    const active=state.active;if(!active||active.slot!==slot)return false;
    const ok=finishActive('hand',slot);if(ok)deck.consume(slot);render();return ok;
  }

  function testDown(){
    if(state.mode!=='test'||state.active)return false;
    const entry=testEntry(),remaining=state.testCooldowns.get(entry.id)||0;
    if(remaining>0){tell(`${entry.shortName} · ${remaining.toFixed(1)}s`,true);return false;}
    const result=beginEntry(entry,{contextKind:'test'});
    if(!result.ok){tell(`${entry.shortName} NOT READY`,true);return false;}
    if(!result.held&&entry.kind==='warden')state.testCooldowns.set(entry.id,effectiveWardenAbilityCooldown(entry.card));
    tell(entry.shortName);render();return true;
  }

  function testUp(){
    if(state.mode!=='test')return false;
    const active=state.active;if(!active||active.contextKind!=='test')return false;
    const ok=finishActive('test');render();return ok;
  }

  function resetAll(resetDeck=true){
    cancel();eden()?.clearEffects?.({resetResources:true});combatEffectRuntime?.reset?.();resetWardenAbilityRuntime();hud?.reset();state.testCooldowns.clear();
    if(resetDeck)deck.apply(state.deckIds);setEdenResources();render();notifyParent();
  }

  function applyDeck(ids){
    cancel();const normalized=normalizeDeckIds(ids),chosen=selectedEntries(normalized);
    if(!chosen.some(entry=>entry.kind==='stance')){tell('DECK NEEDS AT LEAST ONE STANCE',true);return {ok:false,error:'Deck needs at least one stance.'};}
    state.deckIds=chosen.map(entry=>entry.id);state.draftDeckIds=[...state.deckIds];deck.apply(state.deckIds);resetAll(false);save(state);syncDependencies();render();notifyParent();
    tell(`DECK APPLIED · ${state.deckIds.length} CARDS`);return {ok:true,count:state.deckIds.length};
  }

  function toggleDraftCard(id,force){
    if(!validIds.has(id))return false;
    const selected=new Set(state.draftDeckIds),next=typeof force==='boolean'?force:!selected.has(id);
    if(next)selected.add(id);else selected.delete(id);
    state.draftDeckIds=normalizeDeckIds([...selected]);save(state);notifyParent();return next;
  }

  function setDraft(ids){state.draftDeckIds=normalizeDeckIds(ids);save(state);notifyParent();return [...state.draftDeckIds];}
  function clearDraft(){return setDraft([]);}
  function resetDraftToApplied(){return setDraft(state.deckIds);}
  function loadDefaultDraft(){return setDraft(DEFAULT_ENEMY_LAB_DECK_IDS);}
  function applyDraft(){return applyDeck(state.draftDeckIds);}

  function presetIndex(index){const value=Math.trunc(Number(index));return value>=0&&value<PRESET_COUNT?value:-1;}
  function savePreset(index){
    const slot=presetIndex(index);if(slot<0)return false;
    state.presets[slot]={ids:[...state.draftDeckIds],savedAt:Date.now()};save(state);notifyParent();tell(`PRESET ${slot+1} SAVED`);return true;
  }
  function loadPreset(index){
    const slot=presetIndex(index),preset=slot>=0?state.presets[slot]:null;if(!preset)return false;
    setDraft(preset.ids);tell(`PRESET ${slot+1} LOADED`);return true;
  }
  function clearPreset(index){
    const slot=presetIndex(index);if(slot<0)return false;
    state.presets[slot]=null;save(state);notifyParent();tell(`PRESET ${slot+1} CLEARED`);return true;
  }

  function editorSnapshot(){
    const draft=new Set(state.draftDeckIds),applied=new Set(state.deckIds);
    return {
      ready:true,mode:state.mode,resourceMode:state.resourceMode,testId:state.testId,testFamily:testEntry()?.family||'',
      draftIds:[...state.draftDeckIds],appliedIds:[...state.deckIds],draftCount:state.draftDeckIds.length,appliedCount:state.deckIds.length,
      dirty:!sameDeckIds(state.draftDeckIds,state.deckIds),families:[...FAMILIES],
      entries:ENTRIES.map(entry=>({id:entry.id,family:entry.family,kind:entry.kind,name:entry.name,shortName:entry.shortName,summary:entry.summary,selected:draft.has(entry.id),applied:applied.has(entry.id)})),
      presets:state.presets.map((preset,index)=>({index,empty:!preset,count:preset?.ids?.length||0,savedAt:preset?.savedAt||0})),
    };
  }

  function shuffle(){if(state.mode!=='regular')return false;const ok=deck.shuffle();if(ok)tell('SHUFFLING');render();return ok;}

  function chainText(entry){
    if(entry.kind!=='stance')return '';
    return entry.card.chain.map(key=>{
      const attack=PC.ATTACKS?.[key],group=attack?.group||(/^vertical/i.test(key)?'vertical':/^stab/i.test(key)?'stab':'horizontal');
      return `${group==='vertical'?'↓':group==='stab'?'→':'↔'} ${attack?.label||key}`;
    }).join(' · ');
  }

  function chainGlyph(entry){
    if(entry?.kind!=='stance')return entry?.kind==='eden'?'✧':entry?.kind==='warden'?'⚔':'✦';
    return entry.card.chain.map(key=>{
      const attack=PC.ATTACKS?.[key],group=attack?.group||(/^vertical/i.test(key)?'vertical':/^stab/i.test(key)?'stab':'horizontal');
      return group==='vertical'?'↓':group==='stab'?'→':'↔';
    }).join(' ');
  }

  function status(entry,slot=null){
    if(entry.kind==='stance')return arena()?.arena?.stance?.id===entry.sourceId?'EQUIPPED':'READY';
    if(entry.kind==='modifier'){const n=Math.max(0,Number(combatEffectRuntime?.state?.charges)||0);return n?`${n} CHARGES`:'READY';}
    if(entry.kind==='warden'){const remaining=slot===null?(state.testCooldowns.get(entry.id)||0):deck.cooldownFor(slot);return remaining>0?`${remaining.toFixed(1)}s`:'READY';}
    if(entry.kind==='eden'){
      const runtimeState=eden()?.runtime?.state||{},cost=entry.card.mana==='max'?'MAX':entry.card.mana;
      return state.active?.entry===entry?'AIMING':`${state.resourceMode==='testing'?'∞':Number(runtimeState.mana||0).toFixed(1)}/${Number(runtimeState.maxMana||0)} MANA · COST ${cost}`;
    }
    return 'READY';
  }

  function cardView(entry,slot){
    if(!entry)return null;
    const remaining=deck.cooldownFor(slot),total=entry.kind==='warden'?Math.max(.05,effectiveWardenAbilityCooldown(entry.card)):1;
    return {id:entry.id,kind:entry.kind,family:entry.family,name:entry.shortName,summary:entry.summary,glyph:chainGlyph(entry),cooling:remaining>0,coolText:remaining.toFixed(1),coolPercent:remaining>0?clamp(remaining/total*100,0,100):0};
  }

  function render(){
    const entry=testEntry(),detailsVisible=state.mode==='test'&&state.detailsOpen&&!state.active&&!parentDockOpen();
    ui?.render({
      mode:state.mode,resourceMode:state.resourceMode,
      hand:[cardView(deck.state.hand[0],0),cardView(deck.state.hand[1],1)],
      queue:deck.state.draw.slice(0,4).map(item=>({id:item.id,name:item.shortName})),
      deckCounts:deck.state.shuffleT>=0?'SHUFFLE':`${deck.state.draw.length}/${deck.state.discard.length}`,
      shuffleText:deck.state.shuffleT>=0?Math.max(0,deck.state.shuffleT).toFixed(1):'↻',
      test:{id:entry.id,family:entry.family,name:entry.shortName,summary:entry.summary,status:status(entry),position:`${state.testIndex+1} / ${ENTRIES.length}`,description:entry.description,chain:chainText(entry),control:entry.control},
      detailsOpen:state.detailsOpen,detailsVisible,
    });
  }

  function patchPads(){
    if(!originalPads)return;
    const proxy=()=>Array.from(originalPads()||[],pad=>pad?maskCardControllerGamepad(pad,state.mode):null);
    try{Object.defineProperty(navigator,'getGamepads',{configurable:true,value:proxy});}
    catch{try{Object.defineProperty(Object.getPrototypeOf(navigator),'getGamepads',{configurable:true,value:proxy});}catch(error){tell(`CONTROLLER ERROR · ${error.message}`,true);}}
  }

  function edge(pad,name,index,onDown,onUp){
    const pressed=!!pad?.buttons?.[index]?.pressed,previous=!!state.padPrev[name];
    if(pressed&&!previous)onDown?.();if(!pressed&&previous)onUp?.();state.padPrev[name]=pressed;
  }

  function poll(){
    const pad=originalPads?.()?.[0];if(!pad)return;
    if(state.mode==='regular'){
      edge(pad,'lb',4,()=>handDown(0),()=>handUp(0));edge(pad,'rb',5,()=>handDown(1),()=>handUp(1));edge(pad,'circle',1,shuffle);
    }else{
      edge(pad,'left',14,()=>cycleTest(-1));edge(pad,'right',15,()=>cycleTest(1));edge(pad,'rb',5,testDown,testUp);
    }
  }

  function bindKeys(){
    addEventListener('keydown',event=>{
      if(event.repeat)return;const key=event.key.toLowerCase();
      if(state.mode==='regular'){
        if(key==='q'){event.preventDefault();event.stopImmediatePropagation();handDown(0);}
        if(key==='e'){event.preventDefault();event.stopImmediatePropagation();handDown(1);}
        if(key==='r'){event.preventDefault();event.stopImmediatePropagation();shuffle();}
      }else{
        if(key==='['){event.preventDefault();event.stopImmediatePropagation();cycleTest(-1);}
        if(key===']'){event.preventDefault();event.stopImmediatePropagation();cycleTest(1);}
        if(key==='u'){event.preventDefault();event.stopImmediatePropagation();testDown();}
        if(key==='i'){event.preventDefault();event.stopImmediatePropagation();setDetails();}
        if(['q','e','r'].includes(key)){event.preventDefault();event.stopImmediatePropagation();}
      }
    },true);
    addEventListener('keyup',event=>{
      const key=event.key.toLowerCase();
      if(state.mode==='regular'&&(key==='q'||key==='e')){event.preventDefault();event.stopImmediatePropagation();handUp(key==='q'?0:1);}
      if(state.mode==='test'&&key==='u'){event.preventDefault();event.stopImmediatePropagation();testUp();}
    },true);
  }

  ui=installAbilityTryoutUi({
    onTestPrev:()=>cycleTest(-1),onTestNext:()=>cycleTest(1),onTestDown:testDown,onTestUp:testUp,onToggleDetails:setDetails,
    onHandDown:handDown,onHandUp:handUp,onShuffle:shuffle,
  });
  hud=installDynamicCardHud({getEdenState:()=>eden()?.runtime?.state,getWardenState:getWardenAbilityRuntimeState,getBloodSlashState:()=>combatEffectRuntime?.state});
  patchPads();bindKeys();document.body.classList.add('enemy-lab-card-controller');setEdenResources();syncDependencies();
  if(testEntry().kind==='eden')eden()?.selectCard?.(testEntry().sourceId);
  render();

  const api={
    state,deck,get entries(){return ENTRIES;},get families(){return FAMILIES;},
    setMode,applyDeck,applyDraft,toggleDraftCard,setDraft,clearDraft,resetDraftToApplied,loadDefaultDraft,
    savePreset,loadPreset,clearPreset,getDeckEditorSnapshot:editorSnapshot,
    cycle:cycleTest,selectIndex:selectTest,selectTestById,selectTestFamily,setResourceMode,
    activateDown:testDown,activateUp:testUp,toggleDetails:setDetails,cancel,reset:resetAll,render,
    update(dt,now=0){
      if(state.disposed)return;const step=Math.max(0,Number(dt)||0);poll();updateWardenAbilityRuntime(step);
      for(const [id,value] of state.testCooldowns)state.testCooldowns.set(id,Math.max(0,value-step));
      deck.update(step);hud?.update(step,now);render();
    },
    dispose(){state.disposed=true;cancel();ui?.dispose();hud?.dispose();document.body.classList.remove('enemy-lab-card-controller','card-mode-regular','card-mode-test');},
  };
  window.__ABILITY_TRYOUT_RUNTIME__=api;notifyParent();return api;
}
