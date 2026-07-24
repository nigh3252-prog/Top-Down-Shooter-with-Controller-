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

const KEY='enemyLab.cardsAndDeck.v4';
const LEGACY_KEYS=['enemyLab.cardsAndDeck.v3','enemyLab.cardsAndDeck.v2'];
const PRESET_COUNT=3;
const validIds=new Set(ENTRIES.map(entry=>entry.id));
const entryById=new Map(ENTRIES.map(entry=>[entry.id,entry]));

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
    let raw=localStorage.getItem(KEY);
    if(!raw)for(const key of LEGACY_KEYS){raw=localStorage.getItem(key);if(raw)break;}
    const saved=JSON.parse(raw||'{}');
    const applied=normalizeDeckIds(saved.deckIds);
    const deckIds=applied.length?applied:defaults.deckIds;
    const draftDeckIds=Array.isArray(saved.draftDeckIds)?normalizeDeckIds(saved.draftDeckIds):[...deckIds];
    return {
      mode:saved.mode==='test'?'test':'regular',
      testId:validIds.has(saved.testId)?saved.testId:defaults.testId,
      deckIds,draftDeckIds,
      resourceMode:saved.resourceMode==='authored'?'authored':'testing',
      presets:Array.from({length:PRESET_COUNT},(_,index)=>normalizePreset(saved.presets?.[index])),
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

export function installAbilityTryoutRuntime({PC,edenAbilityRuntime,combatEffectRuntime}={}){
  if(!isEnemyLab()||!PC)return null;
  const stored=load();
  const state={
    ...stored,
    testIndex:Math.max(0,ENTRIES.findIndex(entry=>entry.id===stored.testId)),
    detailsOpen:false,active:null,padPrev:{},testCooldowns:new Map(),disposed:false,
    nativeDeckKey:'',pendingShuffle:false,
  };
  const originalPads=typeof navigator.getGamepads==='function'?navigator.getGamepads.bind(navigator):null;
  const arena=()=>window.__arena||null;
  const eden=()=>window.__EDEN_ARENA_RUNTIME__||edenAbilityRuntime||null;
  const testEntry=()=>ENTRIES[state.testIndex]||ENTRIES[0];
  const nativeCardCache=new Map();
  let ui,hud,parentChrome;

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
    const entries=state.mode==='regular'?selectedEntries(state.deckIds):[testEntry()];
    hud?.setDependencies(dependenciesForEntries(entries).resources);
  }

  function cancel(){
    if(state.active?.entry?.kind==='eden')eden()?.cancelCast?.();
    state.active=null;
  }

  function setMode(mode){
    cancel();state.mode=mode==='test'?'test':'regular';state.detailsOpen=false;save(state);syncDependencies();render();notifyParent();parentChrome?.applySubview?.();
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

  function canUseRegularCard(entry,slot){
    if(state.mode!=='regular'||state.active)return false;
    const api=arena();
    if(!api||api.arena?.deadT>=0||api.roomTransition?.active)return false;
    if(entry.kind==='modifier')return true;
    if(entry.kind==='warden'){
      const ok=canPlayWardenAbility(entry.card)&&playWardenAbility(entry.card);
      if(ok)hud?.noteWardenCard(entry);
      return !!ok;
    }
    if(entry.kind==='eden'){
      const runtime=eden();runtime?.selectCard?.(entry.sourceId);
      const ok=!!runtime?.beginCast?.();
      if(ok&&entry.activation==='hold')state.active={entry,contextKind:'regular',slot};
      return ok;
    }
    return true;
  }

  function completeRegularCard(entry,slot){
    if(entry.kind==='modifier')dispatchEvent(new CustomEvent('bloodslash:play',{detail:{card:entry.card,slot}}));
    tell(entry.shortName);syncDependencies();render();notifyParent();
  }

  function nativeCardFor(entry){
    if(nativeCardCache.has(entry.id))return nativeCardCache.get(entry.id);
    const card=entry.kind==='stance'
      ? {...entry.card,__tryoutEntryId:entry.id,__tryoutKind:entry.kind}
      : {
          ...entry.card,
          type:'ability',
          chain:Array.isArray(entry.card.chain)?entry.card.chain:['vertical16','horizontal5','stab6'],
          __tryoutEntryId:entry.id,
          __tryoutKind:entry.kind,
          __restoresStamina:false,
          hudLabel:entry.shortName,
          canPlay:({slot})=>canUseRegularCard(entry,slot),
          onPlay:({slot})=>completeRegularCard(entry,slot),
        };
    nativeCardCache.set(entry.id,card);return card;
  }

  function nativeEntry(card){return entryById.get(card?.__tryoutEntryId)||null;}

  function syncArenaDeck({force=false,shuffle=false}={}){
    const api=arena();
    if(!api?.deck?.beginRun)return false;
    const key=state.deckIds.join('|');
    if(force||state.nativeDeckKey!==key){
      api.deck.beginRun(selectedEntries(state.deckIds).map(nativeCardFor));
      state.nativeDeckKey=key;
    }
    if(shuffle)api.startDeckShuffle?.();
    state.pendingShuffle=false;render();return true;
  }

  function finishActive(contextKind,slot=null){
    const active=state.active;
    if(!active||active.contextKind!==contextKind||(slot!==null&&active.slot!==slot))return false;
    const ok=!!eden()?.releaseCast?.();state.active=null;render();return ok;
  }

  function regularRelease(slot){
    if(state.mode!=='regular')return false;
    return finishActive('regular',slot);
  }

  function activateTestPress(entry){
    const api=arena();if(!api||api.arena?.deadT>=0||api.roomTransition?.active)return false;
    if(entry.kind==='stance'){
      api.arena.stance=entry.card;api.arena.stanceIndex=-1;
      PC.setReadyPose?.(guardPoseFor(entry.card));
      return true;
    }
    if(entry.kind==='modifier'){dispatchEvent(new CustomEvent('bloodslash:play',{detail:{card:entry.card}}));return true;}
    if(entry.kind==='warden'){
      const ok=canPlayWardenAbility(entry.card)&&playWardenAbility(entry.card);if(ok)hud?.noteWardenCard(entry);return !!ok;
    }
    return false;
  }

  function beginTestEntry(entry){
    if(entry.kind==='eden'){
      const runtime=eden();runtime?.selectCard?.(entry.sourceId);const ok=!!runtime?.beginCast?.();
      if(ok&&entry.activation==='hold')state.active={entry,contextKind:'test'};
      return{ok,held:ok&&entry.activation==='hold'};
    }
    return{ok:activateTestPress(entry),held:false};
  }

  function testDown(){
    if(state.mode!=='test'||state.active)return false;
    const entry=testEntry(),remaining=state.testCooldowns.get(entry.id)||0;
    if(remaining>0){tell(`${entry.shortName} · ${remaining.toFixed(1)}s`,true);return false;}
    const result=beginTestEntry(entry);
    if(!result.ok){tell(`${entry.shortName} NOT READY`,true);return false;}
    if(!result.held&&entry.kind==='warden')state.testCooldowns.set(entry.id,effectiveWardenAbilityCooldown(entry.card));
    tell(entry.shortName);render();return true;
  }

  function testUp(){if(state.mode!=='test')return false;return finishActive('test');}

  function resetAll(resetDeck=true){
    cancel();eden()?.clearEffects?.({resetResources:true});combatEffectRuntime?.reset?.();resetWardenAbilityRuntime();hud?.reset();state.testCooldowns.clear();
    if(resetDeck){if(!syncArenaDeck({force:true}))state.nativeDeckKey='';}
    setEdenResources();render();notifyParent();
  }

  function applyDeck(ids){
    cancel();const normalized=normalizeDeckIds(ids),chosen=selectedEntries(normalized);
    if(!chosen.some(entry=>entry.kind==='stance')){tell('DECK NEEDS AT LEAST ONE STANCE',true);return{ok:false,error:'Deck needs at least one stance.'};}
    state.deckIds=chosen.map(entry=>entry.id);state.draftDeckIds=[...state.deckIds];state.pendingShuffle=true;state.nativeDeckKey='';
    syncArenaDeck({force:true,shuffle:true});save(state);syncDependencies();render();notifyParent();
    tell(`DECK APPLIED · ${state.deckIds.length} CARDS`);return{ok:true,count:state.deckIds.length};
  }

  function toggleDraftCard(id,force){
    if(!validIds.has(id))return false;
    const selected=new Set(state.draftDeckIds),next=typeof force==='boolean'?force:!selected.has(id);
    if(next)selected.add(id);else selected.delete(id);
    state.draftDeckIds=normalizeDeckIds([...selected]);save(state);notifyParent();return next;
  }

  function setDraft(ids){state.draftDeckIds=normalizeDeckIds(ids);save(state);notifyParent();return[...state.draftDeckIds];}
  function clearDraft(){return setDraft([]);}
  function resetDraftToApplied(){return setDraft(state.deckIds);}
  function loadDefaultDraft(){return setDraft(DEFAULT_ENEMY_LAB_DECK_IDS);}
  function applyDraft(){return applyDeck(state.draftDeckIds);}

  function presetIndex(index){const value=Math.trunc(Number(index));return value>=0&&value<PRESET_COUNT?value:-1;}
  function savePreset(index){const slot=presetIndex(index);if(slot<0)return false;state.presets[slot]={ids:[...state.draftDeckIds],savedAt:Date.now()};save(state);notifyParent();tell(`PRESET ${slot+1} SAVED`);return true;}
  function loadPreset(index){const slot=presetIndex(index),preset=slot>=0?state.presets[slot]:null;if(!preset)return false;setDraft(preset.ids);tell(`PRESET ${slot+1} LOADED`);return true;}
  function clearPreset(index){const slot=presetIndex(index);if(slot<0)return false;state.presets[slot]=null;save(state);notifyParent();tell(`PRESET ${slot+1} CLEARED`);return true;}

  function editorSnapshot(){
    const draft=new Set(state.draftDeckIds),applied=new Set(state.deckIds);
    return{
      ready:true,mode:state.mode,resourceMode:state.resourceMode,testId:state.testId,testFamily:testEntry()?.family||'',
      draftIds:[...state.draftDeckIds],appliedIds:[...state.deckIds],draftCount:state.draftDeckIds.length,appliedCount:state.deckIds.length,
      dirty:!sameDeckIds(state.draftDeckIds,state.deckIds),families:[...FAMILIES],
      entries:ENTRIES.map(entry=>({id:entry.id,family:entry.family,kind:entry.kind,name:entry.name,shortName:entry.shortName,summary:entry.summary,selected:draft.has(entry.id),applied:applied.has(entry.id)})),
      presets:state.presets.map((preset,index)=>({index,empty:!preset,count:preset?.ids?.length||0,savedAt:preset?.savedAt||0})),
    };
  }

  function chainText(entry){
    if(entry.kind!=='stance')return'';
    return entry.card.chain.map(key=>{
      const attack=PC.ATTACKS?.[key],group=attack?.group||(/^vertical/i.test(key)?'vertical':/^stab/i.test(key)?'stab':'horizontal');
      return`${group==='vertical'?'↓':group==='stab'?'→':'↔'} ${attack?.label||key}`;
    }).join(' · ');
  }

  function chainGlyph(entry){
    if(entry?.kind!=='stance')return entry?.kind==='eden'?'✧':entry?.kind==='warden'?'⚔':'✦';
    return entry.card.chain.map(key=>{
      const attack=PC.ATTACKS?.[key],group=attack?.group||(/^vertical/i.test(key)?'vertical':/^stab/i.test(key)?'stab':'horizontal');
      return group==='vertical'?'↓':group==='stab'?'→':'↔';
    }).join(' ');
  }

  function status(entry){
    if(entry.kind==='stance')return arena()?.arena?.stance?.id===entry.sourceId?'EQUIPPED':'READY';
    if(entry.kind==='modifier'){const n=Math.max(0,Number(combatEffectRuntime?.state?.charges)||0);return n?`${n} CHARGES`:'READY';}
    if(entry.kind==='warden'){const remaining=state.testCooldowns.get(entry.id)||0;return remaining>0?`${remaining.toFixed(1)}s`:'READY';}
    if(entry.kind==='eden'){
      const runtimeState=eden()?.runtime?.state||{},cost=entry.card.mana==='max'?'MAX':entry.card.mana;
      return state.active?.entry===entry?'AIMING':`${state.resourceMode==='testing'?'∞':Number(runtimeState.mana||0).toFixed(1)}/${Number(runtimeState.maxMana||0)} MANA · COST ${cost}`;
    }
    return'READY';
  }

  function cardView(card){
    const entry=nativeEntry(card);if(!entry)return null;
    return{id:entry.id,kind:entry.kind,family:entry.family,name:entry.shortName,summary:entry.summary,glyph:chainGlyph(entry)};
  }

  function render(){
    const entry=testEntry(),detailsVisible=state.mode==='test'&&state.detailsOpen&&!state.active&&!parentDockOpen();
    const deck=arena()?.deck;
    ui?.render({
      mode:state.mode,resourceMode:state.resourceMode,
      hand:[cardView(deck?.hand?.[0]),cardView(deck?.hand?.[1])],
      queue:(deck?.upcoming||[]).map(card=>{const item=nativeEntry(card);return item?{id:item.id,name:item.shortName}:null;}).filter(Boolean),
      deckCounts:deck?.shuffling?'SHUFFLE':deck?`${deck.drawCount}/${deck.discardCount}`:'--',
      test:{id:entry.id,family:entry.family,name:entry.shortName,summary:entry.summary,status:status(entry),position:`${state.testIndex+1} / ${ENTRIES.length}`,description:entry.description,chain:chainText(entry),control:entry.control},
      detailsOpen:state.detailsOpen,detailsVisible,
    });
  }

  function patchPads(){
    if(!originalPads)return;
    const proxy=()=>Array.from(originalPads()||[],pad=>pad?(state.mode==='test'?maskCardControllerGamepad(pad,'test'):pad):null);
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
      edge(pad,'regularLb',4,null,()=>regularRelease(0));
      edge(pad,'regularRb',5,null,()=>regularRelease(1));
      return;
    }
    edge(pad,'testLeft',14,()=>cycleTest(-1));edge(pad,'testRight',15,()=>cycleTest(1));edge(pad,'testRb',5,testDown,testUp);
  }

  function bindKeys(){
    addEventListener('keydown',event=>{
      if(event.repeat||state.mode!=='test')return;const key=event.key.toLowerCase();
      if(key==='['){event.preventDefault();event.stopImmediatePropagation();cycleTest(-1);}
      if(key===']'){event.preventDefault();event.stopImmediatePropagation();cycleTest(1);}
      if(key==='u'){event.preventDefault();event.stopImmediatePropagation();testDown();}
      if(key==='i'){event.preventDefault();event.stopImmediatePropagation();setDetails();}
      if(['q','e','r'].includes(key)){event.preventDefault();event.stopImmediatePropagation();}
    },true);
    addEventListener('keyup',event=>{
      const key=event.key.toLowerCase();
      if(state.mode==='regular'&&(key==='q'||key==='e'))regularRelease(key==='q'?0:1);
      if(state.mode==='test'&&key==='u'){event.preventDefault();event.stopImmediatePropagation();testUp();}
    },true);
  }

  function installParentLabChrome(){
    try{
      if(parent===window)return null;
      const doc=parent.document,dock=doc.getElementById('labDock'),head=doc.getElementById('dockHead'),close=doc.getElementById('closeBtn'),values=doc.getElementById('labValues');
      if(!dock||!head||!close||!values)return null;
      const originalCloseParent=close.parentNode,originalCloseNext=close.nextSibling;
      doc.body.appendChild(close);
      const style=doc.createElement('style');style.id='enemyLabCompactChromeStyle';style.textContent=`
#dockHead{display:none!important}
#closeBtn{position:fixed!important;z-index:96!important;display:none;width:44px!important;height:44px!important;border:1px solid #31504d!important;border-radius:9px!important;background:rgba(8,26,28,.96)!important;color:#e8a04c!important;font-size:21px!important}
body.dockOpen #closeBtn{display:block!important}
#enemyLabFullscreenBtn{position:fixed;top:max(8px,env(safe-area-inset-top));left:max(8px,env(safe-area-inset-left));z-index:86;width:44px;height:42px;border:1px solid #31504d;border-radius:9px;background:rgba(8,26,28,.94);color:#e8a04c;font:21px ui-monospace,Menlo,Consolas,monospace;box-shadow:0 3px 0 #0006}
#labCardSubnav{display:none;min-width:0;background:rgba(0,0,0,.16);padding:8px 6px;gap:7px;overflow:auto;scrollbar-width:none}
#labCardSubnav::-webkit-scrollbar{display:none}
#labCardSubnav.on{display:flex}
#labCardSubnav button{flex:0 0 auto;color:#a9ddd3;background:rgba(16,38,40,.95);border:1px solid #467a74;border-radius:8px;font:9px ui-monospace,Menlo,Consolas,monospace;letter-spacing:.08em;min-height:52px;padding:7px 4px}
#labCardSubnav button.on{border-color:#e8a04c;color:#ffe0a2;background:rgba(232,160,76,.13)}
@media (orientation:landscape){
  #labDock{grid-template-columns:minmax(230px,1fr) 82px 30px 92px!important;grid-template-rows:1fr auto!important}
  #labValues{grid-column:1!important;grid-row:1!important}
  #labCardSubnav{grid-column:2;grid-row:1;flex-direction:column;touch-action:pan-y}
  #valueScrollGutter{grid-column:3!important;grid-row:1!important}
  #labCategories{grid-column:4!important;grid-row:1!important}
  #message{grid-column:1/5!important;grid-row:2!important}
  #closeBtn{top:max(8px,env(safe-area-inset-top));right:calc(min(48vw,560px) + 10px)}
}
@media (orientation:portrait){
  #labDock{grid-template-rows:1fr 48px 28px 58px auto!important}
  #labValues{grid-row:1!important}
  #labCardSubnav{grid-row:2;flex-direction:row;touch-action:pan-x;padding:5px 8px}
  #valueScrollGutter{grid-row:3!important}
  #labCategories{grid-row:4!important}
  #message{grid-row:5!important}
  #labCardSubnav button{min-height:36px;min-width:82px}
  #closeBtn{top:max(8px,env(safe-area-inset-top));left:64px}
}`;doc.head.appendChild(style);
      const fullscreen=doc.createElement('button');fullscreen.id='enemyLabFullscreenBtn';fullscreen.type='button';fullscreen.setAttribute('aria-label','Enter fullscreen');doc.body.appendChild(fullscreen);
      const isFull=()=>doc.fullscreenElement||doc.webkitFullscreenElement;
      const syncFull=()=>{fullscreen.textContent=isFull()?'⤢':'⛶';fullscreen.setAttribute('aria-label',isFull()?'Exit fullscreen':'Enter fullscreen');};
      fullscreen.addEventListener('click',()=>isFull()?(doc.exitFullscreen||doc.webkitExitFullscreen)?.call(doc):(doc.documentElement.requestFullscreen||doc.documentElement.webkitRequestFullscreen)?.call(doc.documentElement));
      doc.addEventListener('fullscreenchange',syncFull);doc.addEventListener('webkitfullscreenchange',syncFull);syncFull();

      const subnav=doc.createElement('nav');subnav.id='labCardSubnav';subnav.setAttribute('aria-label','Card menu sections');dock.appendChild(subnav);
      let active='deck';
      const defs=[['deck','DECK'],['actions','ACTIONS'],['presets','PRESETS']];
      const buttons=new Map();
      for(const [id,label] of defs){const button=doc.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',()=>{active=id;applySubview();});subnav.appendChild(button);buttons.set(id,button);}
      function applySubview(){
        const root=values.querySelector('.cardsDeckList');subnav.classList.toggle('on',!!root);if(!root)return;
        for(const child of [...root.children]){
          const title=child.querySelector?.('.presetTitle b')?.textContent||'';
          const view=child.classList?.contains('cardsActions')?'actions':/^PRESET\s/i.test(title)?'presets':'deck';
          child.hidden=view!==active;
        }
        for(const [id,button] of buttons)button.classList.toggle('on',id===active);
      }
      const observer=new MutationObserver(()=>queueMicrotask(applySubview));observer.observe(values,{childList:true,subtree:true});applySubview();
      return{applySubview,dispose(){observer.disconnect();subnav.remove();fullscreen.remove();style.remove();doc.removeEventListener('fullscreenchange',syncFull);doc.removeEventListener('webkitfullscreenchange',syncFull);if(originalCloseParent)originalCloseParent.insertBefore(close,originalCloseNext);}};
    }catch(error){console.error('[enemy-lab] compact chrome failed',error);return null;}
  }

  ui=installAbilityTryoutUi({onTestPrev:()=>cycleTest(-1),onTestNext:()=>cycleTest(1),onTestDown:testDown,onTestUp:testUp,onToggleDetails:setDetails,onRegularRelease:regularRelease});
  hud=installDynamicCardHud({getEdenState:()=>eden()?.runtime?.state,getWardenState:getWardenAbilityRuntimeState,getBloodSlashState:()=>combatEffectRuntime?.state});
  parentChrome=installParentLabChrome();patchPads();bindKeys();document.body.classList.add('enemy-lab-card-controller');setEdenResources();syncDependencies();
  if(testEntry().kind==='eden')eden()?.selectCard?.(testEntry().sourceId);
  render();

  const api={
    state,get deck(){return arena()?.deck||null;},get entries(){return ENTRIES;},get families(){return FAMILIES;},
    setMode,applyDeck,applyDraft,toggleDraftCard,setDraft,clearDraft,resetDraftToApplied,loadDefaultDraft,
    savePreset,loadPreset,clearPreset,getDeckEditorSnapshot:editorSnapshot,
    cycle:cycleTest,selectIndex:selectTest,selectTestById,selectTestFamily,setResourceMode,
    activateDown:testDown,activateUp:testUp,toggleDetails:setDetails,cancel,reset:resetAll,render,
    update(dt,now=0){
      if(state.disposed)return;const step=Math.max(0,Number(dt)||0);poll();updateWardenAbilityRuntime(step);
      for(const [id,value] of state.testCooldowns)state.testCooldowns.set(id,Math.max(0,value-step));
      if(!state.nativeDeckKey||state.pendingShuffle)syncArenaDeck({force:!state.nativeDeckKey,shuffle:state.pendingShuffle});
      hud?.update(step,now);render();
    },
    dispose(){state.disposed=true;cancel();ui?.dispose();hud?.dispose();parentChrome?.dispose?.();document.body.classList.remove('enemy-lab-card-controller','card-mode-regular','card-mode-test');},
  };
  window.__ABILITY_TRYOUT_RUNTIME__=api;notifyParent();return api;
}
