import {
  deleteCombatProfile,
  readActiveCombatProfile,
  readCombatProfileDraft,
  readCombatProfiles,
  saveCombatProfile,
  setActiveCombatProfile,
} from './combat-profile.js';
import { DIRECTOR_MODES } from './combat-director.js';

function makeChoice(document,{label,sub='',meta='',active=false,className='',onClick}){
  const button=document.createElement('button');
  button.className=`choice${active?' on':''}${className?` ${className}`:''}`;
  const title=document.createElement('b');title.textContent=label;button.appendChild(title);
  if(sub){const detail=document.createElement('span');detail.textContent=sub;button.appendChild(detail);}
  if(meta){const footer=document.createElement('em');footer.textContent=meta;button.appendChild(footer);}
  button.addEventListener('click',onClick);
  return button;
}

function makeStatus(document,title,body){
  const card=document.createElement('div');card.className='statusCard';card.dataset.combatProfileStatus='1';
  const heading=document.createElement('b');heading.textContent=title;
  const detail=document.createElement('span');detail.textContent=body;
  card.append(heading,detail);return card;
}

function makeField(document,label,control){
  const wrapper=document.createElement('label');wrapper.className='profileField';
  const title=document.createElement('span');title.textContent=label;
  wrapper.append(title,control);return wrapper;
}

function optionSelect(document,values,current){
  const select=document.createElement('select');
  for(const value of values){
    const option=document.createElement('option');
    option.value=String(value.value);option.textContent=value.label;option.selected=String(value.value)===String(current);
    select.appendChild(option);
  }
  return select;
}

function rangeField(document,draft,key,label,{min,max,step,suffix=''}){
  const input=document.createElement('input');input.type='range';input.min=String(min);input.max=String(max);input.step=String(step);input.value=String(draft[key]);
  const value=document.createElement('strong');value.className='profileRangeValue';value.textContent=`${draft[key]}${suffix}`;
  input.addEventListener('input',()=>{draft[key]=Number(input.value);value.textContent=`${input.value}${suffix}`;});
  const wrap=document.createElement('div');wrap.append(input,value);return makeField(document,label,wrap);
}

export function installEnemyLabCombatProfiles({
  storage=globalThis.localStorage,
  hostWindow=globalThis,
}={}){
  let targetWindow=hostWindow;
  try{targetWindow=targetWindow||(globalThis.parent&&globalThis.parent!==globalThis?globalThis.parent:globalThis);}catch{targetWindow=globalThis;}
  let document;
  try{document=targetWindow?.document;}catch{return{installed:false,reason:'cross-origin'};}
  if(!document)return{installed:false,reason:'missing-document'};
  const page=new URL(document.location?.href||'http://localhost/enemy-lab.html');
  if(page.searchParams.get('capture')==='1')return{installed:false,reason:'capture-mode'};
  const categories=document.getElementById('labCategories');
  const values=document.getElementById('labValues');
  const hint=document.getElementById('categoryHint');
  if(!categories||!values)return{installed:false,reason:'missing-controls'};
  if(document.documentElement.dataset.enemyLabCombatProfiles==='1')return targetWindow.__enemyLabCombatProfiles||{installed:true};
  document.documentElement.dataset.enemyLabCombatProfiles='1';

  const style=document.createElement('style');
  style.textContent=`
    #labCategories .choice.profileCategory{border-color:#4c7d9b;color:#b9e4ff;background:rgba(42,92,122,.24)}
    #labCategories .choice.profileCategory.on{border-color:#b9e4ff;color:#fff;background:rgba(50,119,157,.40);box-shadow:inset 0 0 0 1px rgba(185,228,255,.24)}
    [data-combat-profiles-root] .profileEditor{display:flex;flex-direction:column;gap:8px;padding:9px;border:1px solid rgba(76,125,155,.72);border-radius:8px;background:rgba(9,28,38,.72)}
    [data-combat-profiles-root] .profileGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    [data-combat-profiles-root] .profileField{display:flex;flex-direction:column;gap:5px;min-width:0;color:var(--muted);font-size:8px;letter-spacing:.07em}
    [data-combat-profiles-root] .profileField input,[data-combat-profiles-root] .profileField select{width:100%;box-sizing:border-box;font-family:inherit;color:var(--text);background:#122426;border:1px solid var(--line);border-radius:6px;padding:8px;font-size:10px}
    [data-combat-profiles-root] .profileField input[type=range]{padding:0;height:28px}
    [data-combat-profiles-root] .profileRangeValue{color:var(--gold);font-size:10px}
    [data-combat-profiles-root] .profileActions{display:grid;grid-template-columns:1fr 1fr;gap:6px}
    [data-combat-profiles-root] .profilePoolActions{display:grid;grid-template-columns:1fr 1fr;gap:6px}
    [data-combat-profiles-root] .profilePoolActions .choice{min-height:58px}
    [data-combat-profiles-root] .profileCard{padding:9px;border:1px solid rgba(49,80,77,.72);border-radius:8px;background:rgba(16,38,40,.58)}
    [data-combat-profiles-root] .profileCard.active{border-color:#b9e4ff;background:rgba(50,119,157,.15)}
    [data-combat-profiles-root] .profileCard h3{margin:0 0 4px;color:var(--text);font-size:11px}
    [data-combat-profiles-root] .profileCard p{margin:0 0 7px;color:var(--muted);font-size:8px;line-height:1.45}
    [data-combat-profiles-root] .profileCard .row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px}
    @media(max-width:560px){[data-combat-profiles-root] .profileGrid,[data-combat-profiles-root] .profilePoolActions{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  let profiles=readCombatProfiles(storage);
  let editingId=null;
  let draft=readCombatProfileDraft(storage);
  let profileOpen=false;
  let renderQueued=false;
  let name='';

  function categoryButton(){return categories.querySelector('[data-combat-profiles-category="1"]');}
  function syncCategoryLabel(){
    const button=categoryButton();if(!button)return;
    const title=button.querySelector('b');if(title)title.textContent=profiles.length?`PROFILES · ${profiles.length}`:'PROFILES';
  }
  function queueRender(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;if(profileOpen)renderProfiles();});}
  function activateProfiles(){
    profileOpen=true;
    for(const button of categories.querySelectorAll('.choice'))button.classList.toggle('on',button.dataset.combatProfilesCategory==='1');
    renderProfiles();
  }
  function ensureCategory(){
    if(categoryButton()){syncCategoryLabel();return;}
    const button=makeChoice(document,{label:profiles.length?`PROFILES · ${profiles.length}`:'PROFILES',className:'profileCategory',onClick:event=>{event.preventDefault();event.stopPropagation();activateProfiles();}});
    button.dataset.combatProfilesCategory='1';categories.appendChild(button);if(profileOpen)button.classList.add('on');
  }
  function syncDevelopmentPools(profile){
    targetWindow.__enemyLabWorkingRoster?.setIds?.(profile.enemyIds);
    targetWindow.__enemyLabWorkingAbilityPool?.setIds?.(profile.abilityIds);
  }
  function activateSavedProfile(profile){
    const active=setActiveCombatProfile(storage,profile,{eventTarget:targetWindow});
    syncDevelopmentPools(active);
    draft=readCombatProfileDraft(storage);
    name=active.name;
    editingId=active.id;
    return active;
  }
  function applyToLab(profile){return activateSavedProfile(profile);}
  function openArena(profile){
    const active=activateSavedProfile(profile);
    const destination=new URL('./combat-arena.html',document.location.href);destination.search='';
    setTimeout(()=>document.location.assign(destination),0);
    return{profile:active,destination:String(destination)};
  }
  function saveCurrent(){
    const current=readCombatProfileDraft(storage);
    const saved=saveCombatProfile(storage,{
      id:editingId||undefined,
      name,
      ...current,
      spawnMultiplier:draft.spawnMultiplier,
      introduction:draft.introduction,
      pressureBudget:draft.pressureBudget,
      aggression:draft.aggression,
      enemySpeed:draft.enemySpeed,
      enemyHealth:draft.enemyHealth,
      enemySize:draft.enemySize,
      idleRange:draft.idleRange,
      arcanaSize:draft.arcanaSize,
      directorMode:draft.directorMode,
    });
    const active=activateSavedProfile(saved);
    profiles=readCombatProfiles(storage);syncCategoryLabel();return active;
  }
  function newDraft(){editingId=null;name='';draft=readCombatProfileDraft(storage);}
  function openRosterEditor(){profileOpen=false;targetWindow.__enemyLabWorkingRoster?.open?.();}
  function openAbilityEditor(){profileOpen=false;targetWindow.__enemyLabWorkingAbilityPool?.open?.();}

  function renderProfiles(){
    if(!profileOpen)return;
    const oldTop=values.scrollTop,oldLeft=values.scrollLeft;
    profiles=readCombatProfiles(storage);
    const active=readActiveCombatProfile(storage);
    const current=readCombatProfileDraft(storage);
    if(hint)hint.textContent='Choose the roster and Ability Pool here, then save a repeatable combat environment with Hades spawning, Arcana size, director behavior, and enemy tuning.';
    const root=document.createElement('div');root.className='valueList';root.dataset.combatProfilesRoot='1';
    root.appendChild(makeStatus(document,'COMBAT PROFILES',`${profiles.length} saved. The current draft contains ${current.enemyIds.length} enemies, ${current.abilityIds.length} abilities, and Arcana size ${current.arcanaSize}×.`));

    const poolActions=document.createElement('div');poolActions.className='profilePoolActions';
    poolActions.append(
      makeChoice(document,{
        label:`EDIT ENEMY ROSTER · ${current.enemyIds.length}`,
        sub:'Choose exactly which enemies this profile can compose',
        meta:'OPENS ROSTER',
        onClick:openRosterEditor,
      }),
      makeChoice(document,{
        label:`EDIT ABILITY POOL · ${current.abilityIds.length}`,
        sub:'Choose starter extras and room-reward availability',
        meta:'OPENS ABILITY POOL',
        onClick:openAbilityEditor,
      }),
    );
    root.appendChild(poolActions);

    const editor=document.createElement('div');editor.className='profileEditor';
    const grid=document.createElement('div');grid.className='profileGrid';
    const nameInput=document.createElement('input');nameInput.type='text';nameInput.maxLength=48;nameInput.placeholder='Example: Crowded Arcana Test';nameInput.value=name;
    nameInput.addEventListener('input',()=>{name=nameInput.value;});
    grid.appendChild(makeField(document,'PROFILE NAME',nameInput));

    const countSelect=optionSelect(document,[1,2,5,10].map(value=>({value,label:value===1?'1× · Default':`${value}× Enemies`})),draft.spawnMultiplier);
    countSelect.addEventListener('change',()=>{draft.spawnMultiplier=Number(countSelect.value);});
    grid.appendChild(makeField(document,'ENEMY COUNT',countSelect));

    const introSelect=optionSelect(document,[
      {value:'slow',label:'Gradual'},
      {value:'medium',label:'Faster'},
      {value:'high',label:'Fast'},
    ],draft.introduction);
    introSelect.addEventListener('change',()=>{draft.introduction=introSelect.value;});
    grid.appendChild(makeField(document,'ENEMY INTRODUCTION',introSelect));

    const directorSelect=optionSelect(document,[...DIRECTOR_MODES.map(mode=>({value:mode.id,label:mode.label})),{value:'cycle',label:'Cycle All'}],draft.directorMode);
    directorSelect.addEventListener('change',()=>{draft.directorMode=directorSelect.value;});
    grid.appendChild(makeField(document,'COMBAT DIRECTOR',directorSelect));

    grid.appendChild(rangeField(document,draft,'pressureBudget','PRESSURE BUDGET',{min:.5,max:4,step:.25}));
    grid.appendChild(rangeField(document,draft,'aggression','AGGRESSION',{min:.25,max:3,step:.05}));
    grid.appendChild(rangeField(document,draft,'enemySpeed','ENEMY SPEED',{min:.25,max:1.5,step:.05}));
    grid.appendChild(rangeField(document,draft,'enemyHealth','ENEMY HEALTH',{min:.25,max:5,step:.05}));
    grid.appendChild(rangeField(document,draft,'enemySize','ENEMY SIZE',{min:1,max:3.5,step:.1}));
    grid.appendChild(rangeField(document,draft,'idleRange','IDLE RANGE',{min:1,max:6,step:.25}));
    grid.appendChild(rangeField(document,draft,'arcanaSize','ARCANA SIZE',{min:1,max:5,step:.25,suffix:'×'}));
    editor.appendChild(grid);

    const actions=document.createElement('div');actions.className='profileActions';
    const saveButton=document.createElement('button');saveButton.className='miniBtn';saveButton.textContent=editingId?'UPDATE & ACTIVATE':'SAVE & ACTIVATE';
    saveButton.addEventListener('click',()=>{if(!name.trim()){nameInput.focus();return;}saveCurrent();renderProfiles();});
    const newButton=document.createElement('button');newButton.className='miniBtn';newButton.textContent='NEW PROFILE';newButton.addEventListener('click',()=>{newDraft();renderProfiles();});
    actions.append(saveButton,newButton);editor.appendChild(actions);root.appendChild(editor);

    if(!profiles.length)root.appendChild(makeStatus(document,'NO SAVED PROFILES','Choose a roster and Ability Pool, enter a name, then save and activate the current environment.'));
    for(const profile of profiles){
      const card=document.createElement('div');card.className=`profileCard${active?.id===profile.id?' active':''}`;
      const title=document.createElement('h3');title.textContent=profile.name;
      const summary=document.createElement('p');
      summary.textContent=`${profile.enemyIds.length} enemies · ${profile.abilityIds.length} abilities · Arcana ${profile.arcanaSize}× · ${profile.spawnMultiplier}× enemies · ${profile.introduction} intro · pressure ${profile.pressureBudget} · aggression ${profile.aggression} · speed ${profile.enemySpeed} · health ${profile.enemyHealth} · size ${profile.enemySize} · range ${profile.idleRange} · ${profile.directorMode}${active?.id===profile.id?' · ACTIVE':''}`;
      const row=document.createElement('div');row.className='row';
      const load=document.createElement('button');load.className='miniBtn';load.textContent='LOAD & ACTIVATE';load.addEventListener('click',()=>{applyToLab(profile);renderProfiles();});
      const open=document.createElement('button');open.className='miniBtn';open.textContent='OPEN ARENA';open.addEventListener('click',()=>openArena(profile));
      const remove=document.createElement('button');remove.className='miniBtn';remove.textContent='DELETE';remove.addEventListener('click',()=>{profiles=deleteCombatProfile(storage,profile.id);if(editingId===profile.id)newDraft();syncCategoryLabel();renderProfiles();});
      row.append(load,open,remove);card.append(title,summary,row);root.appendChild(card);
    }
    values.replaceChildren(root);
    requestAnimationFrame(()=>{values.scrollTop=oldTop;values.scrollLeft=oldLeft;});
  }

  categories.addEventListener('click',event=>{
    const button=event.target.closest?.('.choice');if(!button||button.dataset.combatProfilesCategory==='1')return;profileOpen=false;
  },true);
  new MutationObserver(()=>{ensureCategory();if(profileOpen)queueRender();}).observe(categories,{childList:true});
  new MutationObserver(()=>{if(profileOpen&&!values.querySelector('[data-combat-profiles-root="1"]'))queueRender();}).observe(values,{childList:true});
  ensureCategory();

  const api={
    installed:true,
    getProfiles:()=>readCombatProfiles(storage),
    save:profile=>{const saved=activateSavedProfile(saveCombatProfile(storage,profile));profiles=readCombatProfiles(storage);syncCategoryLabel();if(profileOpen)renderProfiles();return saved;},
    load:profile=>applyToLab(profile),
    openProfile:profile=>openArena(profile),
    remove:id=>{profiles=deleteCombatProfile(storage,id);syncCategoryLabel();if(profileOpen)renderProfiles();return profiles;},
    open:activateProfiles,
  };
  targetWindow.__enemyLabCombatProfiles=api;globalThis.__enemyLabCombatProfiles=api;return api;
}