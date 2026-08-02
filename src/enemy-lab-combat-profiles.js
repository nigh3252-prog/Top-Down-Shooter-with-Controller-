import {
  ACTIVE_COMBAT_PROFILE_STORAGE_KEY,
  deleteCombatProfile,
  exportCombatProfile,
  exportCombatProfiles,
  importCombatProfiles,
  previewCombatProfileImport,
  readCombatProfiles,
  saveCombatProfile,
  writeCombatProfiles,
} from './combat-profile.js';
import { createEnemyLabWorkspace, validateEnemyLabProfile } from './enemy-lab-profile-schema.js';
import { readArcanaTweaks, writeArcanaTweaks } from './wizard-arcana-settings.js';
import {
  getHadesEncounterDifficultyRamp,
  getHadesEncounterSpawnMultiplier,
  setHadesEncounterDifficultyRamp,
  setHadesEncounterSpawnMultiplier,
} from './hades-encounter-tuning.js';

const DECK_STORAGE_KEY='enemyLab.deck.v1';
const SETTINGS_STORAGE_KEY='enemyLab.settings.v3';
const PLANNED_MODES=new Set(['all-enemies-budget','working-roster-hades','flare-level-1','hades-tartarus']);
const DIRECT_MODES=new Set(['lab-direct']);
const DIRECT_TEST_MODES=new Set(['solo','pack','wave']);
const THREAT_LEVELS=new Set(['low','standard','high']);
const CAPTURE_AIMS=new Set(['right','down','left','up']);
const CAPTURE_LAYOUTS=new Set(['none','stationary','source-line']);
const CAPTURE_STAGES=new Set(['contract','source','style','motion']);
const CAPTURE_RENDER_MODES=new Set(['proxy','source','style']);

const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const stable=value=>JSON.stringify(value,Object.keys(value||{}).sort());
const cleanName=value=>String(value||'').trim().replace(/\s+/g,' ').slice(0,64);
const uniqueStrings=value=>[...new Set((Array.isArray(value)?value:[]).map(item=>String(item||'').trim()).filter(Boolean))];
const orderedStrings=value=>(Array.isArray(value)?value:[]).map(item=>String(item||'').trim()).filter(Boolean);
const activeRecord=storage=>{try{return JSON.parse(storage?.getItem?.(ACTIVE_COMBAT_PROFILE_STORAGE_KEY)||'null');}catch{return null;}};

function storageSnapshot(storage){
  const result=new Map();
  try{for(let index=0;index<storage.length;index++){const key=storage.key(index);if(key!==null)result.set(key,storage.getItem(key));}}catch{}
  return result;
}

function restoreStorage(storage,snapshot){
  try{
    const keys=[];for(let index=0;index<storage.length;index++){const key=storage.key(index);if(key!==null)keys.push(key);}
    for(const key of keys)if(!snapshot.has(key))storage.removeItem(key);
    for(const [key,value] of snapshot)storage.setItem(key,value);
  }catch{}
}

function setStoredJson(storage,key,value){
  storage.setItem(key,JSON.stringify(value));
  if(storage.getItem(key)!==JSON.stringify(value))throw new Error(`Storage did not retain ${key}.`);
}

function profileId(){
  const cryptoId=globalThis.crypto?.randomUUID?.();
  return cryptoId?`profile-${cryptoId}`:`profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
}

function downloadJson(document,text,name){
  const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),0);
}

function button(document,label,onClick,{className='',disabled=false}={}){
  const element=document.createElement('button');element.type='button';element.className=`miniBtn${className?` ${className}`:''}`;element.textContent=label;element.disabled=disabled;element.addEventListener('click',onClick);return element;
}

function statusCard(document,title,detail){
  const root=document.createElement('div');root.className='statusCard';
  const heading=document.createElement('b');heading.textContent=title;
  const body=document.createElement('span');body.textContent=detail;root.append(heading,body);return root;
}

function normalizeScenario(value,current={}){
  const source=value&&typeof value==='object'?value:{};
  const encounterMode=String(source.encounterMode||source.encounterId||current.encounterMode||'lab-direct');
  if(!DIRECT_MODES.has(encounterMode)&&!PLANNED_MODES.has(encounterMode))throw new Error(`Unsupported encounter mode: ${encounterMode}`);
  const mode=String(source.mode||current.mode||'solo');if(!DIRECT_TEST_MODES.has(mode))throw new Error(`Unsupported direct test mode: ${mode}`);
  const threat=String(source.threat||current.threat||'standard');if(!THREAT_LEVELS.has(threat))throw new Error(`Unsupported threat level: ${threat}`);
  return{
    family:String(source.family||current.family||'GOBLINS'),enemyId:String(source.enemyId||source.focalEnemyId||current.enemyId||'grunt'),
    focalEnemyId:String(source.focalEnemyId||source.enemyId||current.enemyId||'grunt'),source:encounterMode==='lab-direct'?'direct':'planned',encounterMode,encounterId:String(source.encounterId||encounterMode),
    mode,packCount:Math.max(1,Math.min(99,Math.round(Number(source.packCount??current.packCount??3)||3))),
    soloCount:Math.max(1,Math.min(99,Math.round(Number(source.soloCount??1)||1))),waveCount:Math.max(1,Math.min(99,Math.round(Number(source.waveCount??1)||1))),
    threat,partnerId:String(source.partnerId??current.partnerId??''),introduction:String(source.introduction||getHadesEncounterDifficultyRamp()),
    seed:String(source.seed??current.seed??''),chamber:clone(source.chamber||current.chamber||{}),layout:String(source.layout??current.layout??''),
  };
}

function normalizeCapture(value,current={}){
  const source=value&&typeof value==='object'?value:{};
  const aim=String(source.aim||current.aim||'right'),layout=String(source.layout||source.dummy||current.dummy||'none');
  const stage=String(source.stage||current.stage||'motion'),renderMode=String(source.renderMode||current.renderMode||'proxy');
  if(!CAPTURE_AIMS.has(aim)||!CAPTURE_LAYOUTS.has(layout)||!CAPTURE_STAGES.has(stage)||!CAPTURE_RENDER_MODES.has(renderMode))throw new Error('Unsupported capture configuration.');
  return{ability:String(source.ability||source.arcanaId||current.arcanaId||'DRAGON-ARC'),arcanaId:String(source.arcanaId||source.ability||current.arcanaId||'DRAGON-ARC'),aim,layout,dummy:layout,rngSeed:String(source.rngSeed??current.rngSeed??4401),stage,effects:source.effects!==false,renderMode};
}

function snapshotWorkspace(runtime,state,captureState,resources){
  const profileSnapshot=runtime.snapshotProfileSettings?.({includeGlobal:true})||{settings:{},warnings:[]};
  const scenario=normalizeScenario(state,state),capture=normalizeCapture(captureState,captureState);
  const enemyIds=uniqueStrings(resources.workingRoster?.getIds?.()||[]);
  const abilityIds=uniqueStrings(resources.workingAbilityPool?.getIds?.()||[]);
  const deckCardIds=orderedStrings(globalThis.__enemyLabDeckEditor?.cardIds||runtime.deck?.pool?.map(card=>card?.id)||[]);
  return createEnemyLabWorkspace({workspace:{
    version:1,settings:profileSnapshot.settings,scenario,capture,
    content:{enemyIds,rosterIds:enemyIds,abilityIds,abilityPoolIds:abilityIds,deckCardIds,currentDeckIds:deckCardIds},
  }});
}

function registerWorkspaceAdapters({runtime,state,captureState,resources,saveWorkspace,storage,hostWindow}){
  runtime.registerProfileAdapter?.({id:'lab-scenario',path:'scenario.configuration',label:'Lab scenario',section:'encounter',requiresReload:true,
    snapshot:()=>normalizeScenario(state,state),validate:value=>{try{normalizeScenario(value,state);return true;}catch(error){return String(error.message);}},
    apply:value=>{const normalized=normalizeScenario(value,state);Object.assign(state,normalized);setHadesEncounterDifficultyRamp(normalized.introduction);saveWorkspace?.();return true;}});
  runtime.registerProfileAdapter?.({id:'lab-roster',path:'content.rosterIds',label:'Working enemy roster',section:'enemies',requiresReload:true,
    snapshot:()=>uniqueStrings(resources.workingRoster?.getIds?.()||[]),validate:value=>Array.isArray(value)||'Roster must be an array.',apply:value=>{resources.workingRoster?.setIds?.(uniqueStrings(value));return true;}});
  runtime.registerProfileAdapter?.({id:'lab-ability-pool',path:'content.abilityPoolIds',label:'Working Ability Pool',section:'loadout',requiresReload:true,
    snapshot:()=>uniqueStrings(resources.workingAbilityPool?.getIds?.()||[]),validate:value=>Array.isArray(value)||'Ability Pool must be an array.',apply:value=>{resources.workingAbilityPool?.setIds?.(uniqueStrings(value));return true;}});
  runtime.registerProfileAdapter?.({id:'lab-current-deck',path:'content.currentDeckIds',label:'Ordered current deck',section:'loadout',requiresReload:true,
    snapshot:()=>orderedStrings(hostWindow.__enemyLabDeckEditor?.cardIds||runtime.deck?.pool?.map(card=>card?.id)||[]),validate:value=>Array.isArray(value)&&value.length>0||'Current Deck must contain at least one card.',
    apply:value=>{const ids=orderedStrings(value);if(hostWindow.__enemyLabDeckEditor?.setIds)return hostWindow.__enemyLabDeckEditor.setIds(ids)!==false;setStoredJson(storage,DECK_STORAGE_KEY,{cardIds:ids});return true;}});
  runtime.registerProfileAdapter?.({id:'lab-capture',path:'capture.configuration',label:'Capture setup',section:'capture',requiresReload:true,
    snapshot:()=>normalizeCapture(captureState,captureState),validate:value=>{try{normalizeCapture(value,captureState);return true;}catch(error){return String(error.message);}},apply:value=>{Object.assign(captureState,normalizeCapture(value,captureState));saveWorkspace?.();return true;}});
  runtime.registerProfileAdapter?.({id:'lab-arcana',path:'player.arcana',label:'Arcana size and damage',section:'loadout',snapshot:()=>readArcanaTweaks(storage),
    validate:value=>value&&Number.isFinite(Number(value.sizeMultiplier))&&Number.isFinite(Number(value.damageMultiplier))||'Arcana tuning is invalid.',apply:value=>(writeArcanaTweaks(value,{storage,eventTarget:hostWindow}),true)});
  runtime.registerProfileAdapter?.({id:'lab-hades-cadence',path:'scenario.hadesCadence',label:'Hades encounter cadence',section:'encounter',
    snapshot:()=>({spawnMultiplier:getHadesEncounterSpawnMultiplier(),introduction:getHadesEncounterDifficultyRamp()}),validate:value=>value&&[1,2,5,10].includes(Number(value.spawnMultiplier))&&['slow','medium','high'].includes(String(value.introduction))||'Hades cadence is invalid.',apply:value=>(setHadesEncounterSpawnMultiplier(value.spawnMultiplier),setHadesEncounterDifficultyRamp(value.introduction),true)});
}

export function installEnemyLabCombatProfiles({
  storage=globalThis.localStorage,hostWindow=globalThis,sectionRegistry=null,runtime=null,state=null,captureState=null,resources={},saveWorkspace=null,setMessage=null,
}={}){
  const document=hostWindow?.document;
  if(!document||!runtime||!state||!captureState||!sectionRegistry)return{installed:false,reason:'missing-context'};
  if(hostWindow.__enemyLabCombatProfiles?.installed)return hostWindow.__enemyLabCombatProfiles;
  document.documentElement.dataset.enemyLabCombatProfiles='1';
  registerWorkspaceAdapters({runtime,state,captureState,resources,saveWorkspace,storage,hostWindow});

  let profiles=readCombatProfiles(storage),selectedId=activeRecord(storage)?.id||profiles[0]?.id||'',dirty=false,lastSaved='',pendingImport=null,importButton=null;
  const bar=document.getElementById('labProfileBar'),selector=document.getElementById('profileSelect'),nameInput=document.getElementById('profileName'),dirtyNode=document.getElementById('profileDirty'),barStatus=document.getElementById('profileBarStatus');
  const report=(message,error=false)=>{if(barStatus){barStatus.textContent=message;barStatus.classList.toggle('error',error);}setMessage?.(error?message:'');};
  const selected=()=>profiles.find(profile=>profile.id===selectedId)||null;
  const currentWorkspace=()=>snapshotWorkspace(runtime,state,captureState,resources);
  const signature=workspace=>JSON.stringify(workspace);
  const applicableSettings=profile=>({
    ...(profile.workspace?.settings||{}),
    'scenario.configuration':profile.workspace?.scenario,
    'content.rosterIds':profile.workspace?.content?.rosterIds||profile.workspace?.content?.enemyIds||[],
    'content.abilityPoolIds':profile.workspace?.content?.abilityPoolIds||profile.workspace?.content?.abilityIds||[],
    ...(profile.workspace?.content?.currentDeckIds?.length?{'content.currentDeckIds':profile.workspace.content.currentDeckIds}:{}),
    ...(!profile.partial&&profile.workspace?.capture?{'capture.configuration':profile.workspace.capture}:{}),
  });
  const refreshDirty=()=>{const profile=selected();dirty=!!profile&&(signature(currentWorkspace())!==signature(profile.workspace)||cleanName(nameInput?.value)!==profile.name);if(dirtyNode){dirtyNode.textContent=dirty?'UNSAVED':'SAVED';dirtyNode.classList.toggle('dirty',dirty);}return dirty;};
  const refreshSelector=()=>{profiles=readCombatProfiles(storage);const current=selector?.value||selectedId;if(selector){selector.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent=profiles.length?'Choose profile…':'No saved profiles';selector.appendChild(empty);for(const profile of profiles){const option=document.createElement('option');option.value=profile.id;option.textContent=profile.name;selector.appendChild(option);}selector.value=profiles.some(profile=>profile.id===current)?current:'';}selectedId=profiles.some(profile=>profile.id===current)?current:'';if(nameInput)nameInput.value=selected()?.name||nameInput.value;refreshDirty();sectionRegistry.invalidate('profiles');};

  function validateForLoad(profile){
    const schema=validateEnemyLabProfile(profile);if(!schema.ok)return{ok:false,errors:schema.errors,warnings:schema.warnings};
    const values=applicableSettings(profile);
    const registry=runtime.validateProfileSettings?.(values,{includeGlobal:true})||{ok:true,settings:values,errors:[],warnings:[]};
    return{ok:registry.ok,errors:registry.errors||[],warnings:[...(schema.warnings||[]),...(registry.warnings||[])]};
  }

  function applyProfile(profile,{reload=true,destination=null}={}){
    const validation=validateForLoad(profile);if(!validation.ok){report(`Profile not loaded: ${validation.errors.join(', ')}`,true);return{ok:false,...validation};}
    const before=storageSnapshot(storage);
    try{
      const applied=runtime.applyProfileSettings?.(applicableSettings(profile),{includeGlobal:true,profileLoad:true});
      if(applied&&!applied.ok)throw new Error(applied.failed?.map(item=>`${item.path}: ${item.error}`).join(', ')||'Profile settings could not be applied.');
      setStoredJson(storage,ACTIVE_COMBAT_PROFILE_STORAGE_KEY,profile);
      selectedId=profile.id;lastSaved=signature(profile.workspace);dirty=false;report(validation.warnings.length?`Loaded with warnings: ${validation.warnings.join(', ')}`:`Loaded ${profile.name}.`);
      if(destination)hostWindow.location.assign(destination);else if(reload)hostWindow.location.reload();
      return{ok:true,profile,warnings:validation.warnings};
    }catch(error){restoreStorage(storage,before);report(`Profile not loaded: ${error.message}`,true);return{ok:false,errors:[String(error.message)]};}
  }

  function saveWorkspaceProfile({asNew=false,name=null}={}){
    const existing=asNew?null:selected(),requested=cleanName(name??nameInput?.value??existing?.name);
    if(!requested){report('Enter a profile name first.',true);nameInput?.focus?.();return null;}
    const workspace=currentWorkspace();
    try{
      const saved=saveCombatProfile(storage,{...(existing||{}),id:asNew||!existing?profileId():existing.id,name:requested,workspace,encounterMode:workspace.scenario.encounterMode,partial:false});
      setStoredJson(storage,ACTIVE_COMBAT_PROFILE_STORAGE_KEY,saved);selectedId=saved.id;lastSaved=signature(saved.workspace);dirty=false;report(`Saved ${saved.name}.`);refreshSelector();return saved;
    }catch(error){report(`Profile was not saved: ${error.message}`,true);return null;}
  }

  function removeSelected(){
    const profile=selected();if(!profile)return report('Choose a profile first.',true);
    try{deleteCombatProfile(storage,profile.id);if(activeRecord(storage)?.id===profile.id)storage.removeItem(ACTIVE_COMBAT_PROFILE_STORAGE_KEY);selectedId='';report(`Deleted ${profile.name}.`);refreshSelector();}catch(error){report(`Profile was not deleted: ${error.message}`,true);}
  }

  function renameSelected(){
    const profile=selected();if(!profile)return report('Choose a profile first.',true);
    const name=cleanName(nameInput?.value);if(!name){report('Enter the new name in the profile name field.',true);nameInput?.focus?.();return;}
    try{const saved=saveCombatProfile(storage,{...profile,name});selectedId=saved.id;report(`Renamed to ${saved.name}.`);refreshSelector();}catch(error){report(`Profile was not renamed: ${error.message}`,true);}
  }

  function exportSelection(all=false){
    const profile=selected();if(!all&&!profile)return report('Choose a profile first.',true);
    const json=all?exportCombatProfiles(profiles):exportCombatProfile(profile);downloadJson(document,json,all?'enemy-lab-profiles-v3.json':`${profile.id}.json`);report(all?'Exported profile library.':`Exported ${profile.name}.`);
  }

  function importFile(file,collision){
    const reader=new FileReader();reader.addEventListener('load',()=>{
      const text=String(reader.result||''),preview=previewCombatProfileImport(text,{existingProfiles:profiles,collision});
      if(!preview.ok){report(`Import rejected: ${preview.errors.join(', ')}`,true);return;}
      pendingImport={text,collision,preview};if(importButton)importButton.textContent='CONFIRM IMPORT';
      report(`${preview.count} profile${preview.count===1?'':'s'} valid${preview.collisions.length?` · ${preview.collisions.length} collision${preview.collisions.length===1?'':'s'} will ${collision==='replace'?'replace':'import as copies'}`:''}. Press Confirm Import to finish.`);
    });reader.readAsText(file);
  }

  function commitImport(){
    if(!pendingImport)return false;
    try{const result=importCombatProfiles(pendingImport.text,{existingProfiles:profiles,collision:pendingImport.collision});if(!result.ok)throw new Error(result.errors.join(', '));writeCombatProfiles(storage,result.profiles);report(`Imported ${result.imported.length+result.replaced.length} profile${result.imported.length+result.replaced.length===1?'':'s'}.`);pendingImport=null;if(importButton)importButton.textContent='IMPORT JSON';refreshSelector();return true;}catch(error){report(`Import failed: ${error.message}`,true);return false;}
  }

  function renderManagement(){
    const root=document.createElement('div');root.className='labSectionContent';root.dataset.profileManagement='1';
    const audit=runtime.auditProfileCoverage?.()||{ok:false,warnings:['Profile audit unavailable.']};
    root.append(statusCard(document,audit.ok?'PROFILE COVERAGE COMPLETE':'PROFILE COVERAGE NEEDS ATTENTION',audit.ok?`${audit.profileControls} settings plus compound resources are covered.`:audit.warnings.join(' · ')));
    const actions=document.createElement('div');actions.className='profileManagementActions';
    actions.append(button(document,'RENAME',renameSelected),button(document,'DELETE',removeSelected,{className:'danger'}),button(document,'OPEN ARENA',()=>{const profile=selected();if(!profile)return report('Choose a profile first.',true);const destination=new URL('./combat-arena.html',document.location.href);destination.search='';applyProfile(profile,{reload:false,destination});}),button(document,'EXPORT ONE',()=>exportSelection(false)),button(document,'EXPORT ALL',()=>exportSelection(true)));
    const collision=document.createElement('select');collision.setAttribute('aria-label','Profile import collision handling');for(const [value,label] of [['copy','IMPORT COPY'],['replace','REPLACE']]){const option=document.createElement('option');option.value=value;option.textContent=label;collision.appendChild(option);}
    const input=document.createElement('input');input.type='file';input.accept='application/json,.json';input.hidden=true;input.addEventListener('change',()=>{const file=input.files?.[0];if(file)importFile(file,collision.value);input.value='';});
    importButton=button(document,pendingImport?'CONFIRM IMPORT':'IMPORT JSON',()=>pendingImport?commitImport():input.click());actions.append(collision,importButton,input);root.append(actions);
    for(const profile of profiles)root.append(statusCard(document,`${profile.name}${profile.id===activeRecord(storage)?.id?' · ACTIVE':''}`,`${profile.workspace.content.enemyIds.length} enemies · ${profile.workspace.content.deckCardIds.length} deck cards · ${profile.encounterMode}${profile.partial?' · migrated partial profile':''}`));
    return root;
  }

  sectionRegistry.registerView({id:'portable-profiles',sectionId:'profiles',label:'PORTABLE PROFILES',description:'Save, import, export, rename, and delete complete Lab workspaces.',order:0,render:renderManagement});
  if(bar&&selector){
    bar.hidden=false;selector.addEventListener('change',()=>{selectedId=selector.value;if(nameInput)nameInput.value=selected()?.name||'';refreshDirty();report(selected()?'Selected. Press Load to apply it.':'No profile selected.');});
    nameInput?.addEventListener('input',refreshDirty);
    document.getElementById('profileLoad')?.addEventListener('click',()=>{const profile=selected();if(!profile)return report('Choose a profile first.',true);applyProfile(profile);});
    document.getElementById('profileSave')?.addEventListener('click',()=>saveWorkspaceProfile({asNew:!selected()}));
    document.getElementById('profileSaveAs')?.addEventListener('click',()=>saveWorkspaceProfile({asNew:true}));
  }
  runtime.subscribe?.(event=>{if(event.type==='change'||event.type==='profile-adapter-register')refreshDirty();});
  hostWindow.addEventListener?.('enemy-lab:workspace-change',refreshDirty);
  hostWindow.setInterval?.(refreshDirty,1000);
  let bootError='';
  const api={installed:true,getProfiles:()=>profiles.slice(),get selectedId(){return selectedId;},get dirty(){return dirty;},get bootError(){return bootError;},snapshot:currentWorkspace,validate:validateForLoad,load:applyProfile,save:saveWorkspaceProfile,remove:removeSelected,rename:renameSelected,refresh:refreshSelector};
  hostWindow.__enemyLabCombatProfiles=api;
  try{
    const active=activeRecord(storage),activeProfile=active&&profiles.find(profile=>profile.id===active.id);
    if(activeProfile){selectedId=activeProfile.id;const validation=validateForLoad(activeProfile);if(validation.ok)runtime.applyProfileSettings?.(applicableSettings(activeProfile),{includeGlobal:true,profileBoot:true});}
    refreshSelector();lastSaved=selected()?signature(selected().workspace):'';refreshDirty();
  }catch(error){bootError=String(error?.message||error);report(`Profiles need attention: ${bootError}`,true);}
  return api;
}
