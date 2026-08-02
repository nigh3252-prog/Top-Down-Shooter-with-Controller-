import { ARENA_ABILITY_CATALOG } from './arena-ability-catalog.js';
import { ARENA_ENEMY_CATALOG } from './arena-enemy-catalog.js';
import { DIRECTOR_MODES } from './combat-director.js';
import {
  readWorkingAbilityPool,
  normalizeWorkingAbilityPoolIds,
  ENEMY_LAB_WORKING_ABILITY_POOL_KEY,
} from './enemy-lab-working-ability-pool.js';
import {
  readWorkingRoster,
  normalizeWorkingRosterIds,
  ENEMY_LAB_WORKING_ROSTER_STORAGE_KEY,
} from './enemy-lab-working-roster.js';
import {
  setHadesEncounterDifficultyRamp,
  setHadesEncounterSpawnMultiplier,
} from './hades-encounter-tuning.js';
import { WORKING_ROSTER_HADES_ID } from './encounter-pools.js';
import {
  ARCANA_TWEAKS_EVENT,
  ARCANA_TWEAKS_KEY,
  readArcanaTweaks,
  writeArcanaTweaks,
} from './wizard-arcana-settings.js';
import {
  ENEMY_LAB_PROFILE_FORMAT,
  ENEMY_LAB_PROFILE_MAX_PROFILES,
  ENEMY_LAB_PROFILE_SCHEMA_VERSION,
  createEnemyLabWorkspace,
  exportEnemyLabProfile,
  exportEnemyLabProfiles,
  importEnemyLabProfiles,
  migrateEnemyLabProfile,
  normalizeEnemyLabProfile,
  previewEnemyLabProfileImport,
  validateEnemyLabProfile,
} from './enemy-lab-profile-schema.js';

export {
  ENEMY_LAB_PROFILE_EXPORT_FORMAT,
  ENEMY_LAB_PROFILE_EXPORT_VERSION,
  ENEMY_LAB_PROFILE_FORMAT,
  ENEMY_LAB_PROFILE_MAX_PROFILES,
  ENEMY_LAB_PROFILE_SCHEMA_VERSION,
  ENEMY_LAB_PROFILE_SETTING_PATHS,
  PROFILE_COLLISION_MODES,
  createEnemyLabWorkspace,
  exportEnemyLabProfile,
  exportEnemyLabProfiles,
  importEnemyLabProfiles,
  migrateEnemyLabProfile,
  previewEnemyLabProfileImport,
  validateEnemyLabProfile,
} from './enemy-lab-profile-schema.js';
export {
  applyProfileSettings,
  auditProfileCoverage,
  snapshotProfileSettings,
  validateProfileSettings,
} from './arena-control-registry.js';

// Legacy v2 imports remain supported: COMBAT_PROFILE_VERSION=2; arcanaSize:clampArcanaSize.
export const COMBAT_PROFILE_VERSION=ENEMY_LAB_PROFILE_SCHEMA_VERSION;
export const COMBAT_PROFILES_STORAGE_KEY='enemyLab.combatProfiles.v1';
export const ACTIVE_COMBAT_PROFILE_STORAGE_KEY='arena.activeCombatProfile.v1';
export const MAX_COMBAT_PROFILES=ENEMY_LAB_PROFILE_MAX_PROFILES;
export const ENEMY_LAB_PROFILE_STORAGE_KEY=COMBAT_PROFILES_STORAGE_KEY;
export const ENEMY_LAB_ACTIVE_PROFILE_STORAGE_KEY=ACTIVE_COMBAT_PROFILE_STORAGE_KEY;

const SETTINGS_PREFIX='stoneWandererSettings.v1.';
const STORAGE_KEYS=Object.freeze({
  spawnKind:`${SETTINGS_PREFIX}arena.spawnKind`,
  directorMode:`${SETTINGS_PREFIX}arena.directorMode`,
  profilePressure:`${SETTINGS_PREFIX}arena.profilePressureBudget`,
  profileAggression:`${SETTINGS_PREFIX}arena.profileAggression`,
  profileEnemySpeed:`${SETTINGS_PREFIX}arena.profileEnemySpeed`,
  profileEnemyHealth:`${SETTINGS_PREFIX}arena.profileEnemyHealth`,
  profileEnemySize:`${SETTINGS_PREFIX}arena.profileEnemySize`,
  profileIdleRange:`${SETTINGS_PREFIX}arena.profileIdleRange`,
  spawnMultiplier:'arena.hadesSpawnMultiplier',
  introduction:'arena.hadesDifficultyRamp',
});
const DIRECTOR_MODE_IDS=new Set([...DIRECTOR_MODES.map(mode=>mode.id),'cycle']);
const SPAWN_MULTIPLIERS=new Set([1,2,5,10]);
const INTRODUCTION_IDS=new Set(['slow','medium','high']);

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const rounded=(value,fallback,min,max)=>Math.round(clamp(finite(value,fallback),min,max)*100)/100;
const jsonGet=(storage,key,fallback)=>{try{const raw=storage?.getItem?.(key);return raw==null?fallback:JSON.parse(raw);}catch{return fallback;}};
const jsonSet=(storage,key,value)=>{try{storage?.setItem?.(key,JSON.stringify(value));return true;}catch{return false;}};
const rawGet=(storage,key,fallback)=>{try{const value=storage?.getItem?.(key);return value==null?fallback:value;}catch{return fallback;}};
const sameIds=(left=[],right=[])=>left.length===right.length&&left.every((id,index)=>id===right[index]);
const profileOptionsForStorage=(storage,options={})=>({
  arcanaSizeFallback:readArcanaTweaks(storage).sizeMultiplier,
  directorModeIds:DIRECTOR_MODE_IDS,
  directorModeDefault:'pressureBudget',
  ...options,
});

export class CombatProfileStorageError extends Error{
  constructor(message,{key='',cause=null,code='PROFILE_STORAGE_WRITE_FAILED'}={}){
    super(message,{cause});this.name='CombatProfileStorageError';this.code=code;this.key=key;
  }
}

export class CombatProfileLimitError extends CombatProfileStorageError{
  constructor(limit=MAX_COMBAT_PROFILES){super(`Enemy Lab profile limit exceeded: ${limit}`,{code:'PROFILE_LIMIT_EXCEEDED'});this.limit=limit;}
}

function storageValue(storage,key){
  try{return storage?.getItem?.(key)??null;}catch(error){throw new CombatProfileStorageError(`Unable to read profile storage key: ${key}`,{key,cause:error,code:'PROFILE_STORAGE_READ_FAILED'});}
}

function writeStorageValue(storage,key,value){
  if(!storage?.setItem)throw new CombatProfileStorageError(`Profile storage is unavailable for key: ${key}`,{key,code:'PROFILE_STORAGE_UNAVAILABLE'});
  try{
    storage.setItem(key,String(value));
    const stored=storage.getItem?.(key);
    if(stored!==undefined&&stored!==null&&String(stored)!==String(value))throw new Error('Storage did not retain the written value');
  }catch(error){
    if(error instanceof CombatProfileStorageError)throw error;
    throw new CombatProfileStorageError(`Unable to write profile storage key: ${key}`,{key,cause:error});
  }
  return true;
}

function restoreStorageValue(storage,key,value){
  try{
    if(value===null)storage?.removeItem?.(key);else storage?.setItem?.(key,value);
  }catch{}
}

function readStoredProfiles(storage){
  const raw=jsonGet(storage,COMBAT_PROFILES_STORAGE_KEY,[]);
  if(Array.isArray(raw))return raw;
  if(raw&&Array.isArray(raw.profiles))return raw.profiles;
  if(raw&&typeof raw==='object'&&(raw.id||raw.name))return[raw];
  return[];
}

function storageSnapshot(storage,keys){
  return new Map(keys.map(key=>[key,storageValue(storage,key)]));
}

function restoreSnapshot(storage,snapshot){
  for(const [key,value] of snapshot)restoreStorageValue(storage,key,value);
}

export function normalizeCombatProfile(profile={}, {
  enemyCatalog=ARENA_ENEMY_CATALOG,
  abilityCatalog=ARENA_ABILITY_CATALOG,
  arcanaSizeFallback=1,
  now=Date.now(),
  idFactory=null,
}={}){
  return normalizeEnemyLabProfile(profile,{
    enemyCatalog,
    abilityCatalog,
    arcanaSizeFallback,
    now,
    idFactory,
    directorModeIds:DIRECTOR_MODE_IDS,
    directorModeDefault:'pressureBudget',
    encounterModeDefault:WORKING_ROSTER_HADES_ID,
  });
}

function normalizeProfileForWrite(profile={},options={}){
  return normalizeCombatProfile({
    ...profile,
    format:ENEMY_LAB_PROFILE_FORMAT,
    schemaVersion:COMBAT_PROFILE_VERSION,
    version:COMBAT_PROFILE_VERSION,
    partial:options.preservePartial===true?profile.partial===true:false,
  },options);
}

export function readCombatProfiles(storage=globalThis.localStorage,options={}){
  return readCombatProfilesWithDiagnostics(storage,options).profiles;
}

export function readCombatProfilesWithDiagnostics(storage=globalThis.localStorage,options={}){
  const normalizedOptions=profileOptionsForStorage(storage,options),profiles=[],warnings=[],errors=[];
  readStoredProfiles(storage).forEach((raw,index)=>{
    const migrated=migrateEnemyLabProfile(raw,normalizedOptions);
    if(!migrated.ok){migrated.errors.forEach(error=>errors.push(`PROFILE_${index}:${error}`));return;}
    profiles.push(migrated.profile);
    migrated.warnings.forEach(warning=>warnings.push(`PROFILE_${index}:${warning}`));
  });
  profiles.sort((left,right)=>right.updatedAt-left.updatedAt);
  return Object.freeze({
    profiles:Object.freeze(profiles),
    warnings:Object.freeze([...new Set(warnings)]),
    errors:Object.freeze([...new Set(errors)]),
    partial:profiles.some(profile=>profile.partial),
  });
}

export function writeCombatProfiles(storage=globalThis.localStorage,profiles=[],options={}){
  const normalizedOptions=profileOptionsForStorage(storage,options);
  const normalized=(profiles||[]).map(profile=>normalizeProfileForWrite(profile,normalizedOptions));
  if(normalized.length>MAX_COMBAT_PROFILES)throw new CombatProfileLimitError(MAX_COMBAT_PROFILES);
  const seen=new Set();
  for(const profile of normalized){
    if(!profile.id)throw new CombatProfileStorageError('Enemy Lab profiles require stable IDs',{code:'PROFILE_ID_REQUIRED'});
    if(seen.has(profile.id))throw new CombatProfileStorageError(`Duplicate Enemy Lab profile ID: ${profile.id}`,{code:'PROFILE_DUPLICATE_ID'});
    seen.add(profile.id);
    const validation=validateEnemyLabProfile(profile,normalizedOptions);
    if(!validation.ok)throw new CombatProfileStorageError(`Invalid Enemy Lab profile: ${validation.errors.join(', ')}`,{code:'PROFILE_VALIDATION_FAILED'});
  }
  normalized.sort((left,right)=>right.updatedAt-left.updatedAt);
  writeStorageValue(storage,COMBAT_PROFILES_STORAGE_KEY,JSON.stringify(normalized));
  return normalized;
}

export const exportCombatProfile=(profile,options={})=>exportEnemyLabProfile(profile,options);
export const exportCombatProfiles=(profiles=[],options={})=>exportEnemyLabProfiles(profiles,options);
export const previewCombatProfileImport=(input,options={})=>previewEnemyLabProfileImport(input,options);
export const importCombatProfiles=(input,options={})=>importEnemyLabProfiles(input,options);

export function exportStoredCombatProfile(storage=globalThis.localStorage,id='',options={}){
  const profile=readCombatProfiles(storage,options).find(entry=>entry.id===String(id||''));
  if(!profile)throw new CombatProfileStorageError(`Unknown Enemy Lab profile: ${id}`,{code:'PROFILE_NOT_FOUND'});
  return exportEnemyLabProfile(profile,options);
}

export function exportStoredCombatProfiles(storage=globalThis.localStorage,options={}){
  return exportEnemyLabProfiles(readCombatProfiles(storage,options),options);
}

export function previewStoredCombatProfileImport(storage=globalThis.localStorage,input,options={}){
  return previewEnemyLabProfileImport(input,{...options,existingProfiles:readCombatProfiles(storage,options)});
}

export function importStoredCombatProfiles(storage=globalThis.localStorage,input,options={}){
  const existing=readCombatProfiles(storage,options);
  const result=importEnemyLabProfiles(input,{...options,existingProfiles:existing,maxProfiles:options.maxProfiles??MAX_COMBAT_PROFILES});
  if(!result.ok)return result;
  writeCombatProfiles(storage,result.profiles,options);
  return result;
}

export function saveCombatProfile(storage=globalThis.localStorage,profile={},options={}){
  const now=finite(options.now,Date.now());
  const normalizedOptions=profileOptionsForStorage(storage,{...options,now});
  const existing=readCombatProfiles(storage,normalizedOptions);
  const current=existing.find(entry=>entry.id===String(profile.id||''));
  const normalized=normalizeProfileForWrite({
    ...current,
    ...profile,
    createdAt:current?.createdAt??profile.createdAt??now,
    updatedAt:now,
  },normalizedOptions);
  const next=[normalized,...existing.filter(entry=>entry.id!==normalized.id)];
  writeCombatProfiles(storage,next,normalizedOptions);
  return normalized;
}

export function deleteCombatProfile(storage=globalThis.localStorage,id='',options={}){
  const key=String(id||'');
  const next=readCombatProfiles(storage,options).filter(profile=>profile.id!==key);
  writeCombatProfiles(storage,next,options);
  const active=readActiveCombatProfile(storage,{...options,validateSelection:false});
  if(active?.id===key)clearActiveCombatProfile(storage);
  return next;
}

export function readCombatProfileDraft(storage=globalThis.localStorage,{
  enemyCatalog=ARENA_ENEMY_CATALOG,
  abilityCatalog=ARENA_ABILITY_CATALOG,
}={}){
  return{
    enemyIds:readWorkingRoster(storage,enemyCatalog),
    abilityIds:readWorkingAbilityPool(storage,abilityCatalog),
    spawnMultiplier:SPAWN_MULTIPLIERS.has(Number(rawGet(storage,STORAGE_KEYS.spawnMultiplier,1)))?Number(rawGet(storage,STORAGE_KEYS.spawnMultiplier,1)):1,
    introduction:INTRODUCTION_IDS.has(String(rawGet(storage,STORAGE_KEYS.introduction,'slow')))?String(rawGet(storage,STORAGE_KEYS.introduction,'slow')):'slow',
    pressureBudget:rounded(jsonGet(storage,STORAGE_KEYS.profilePressure,3),3,.5,4),
    aggression:rounded(jsonGet(storage,STORAGE_KEYS.profileAggression,1),1,.25,3),
    enemySpeed:rounded(jsonGet(storage,STORAGE_KEYS.profileEnemySpeed,.5),.5,.25,1.5),
    enemyHealth:rounded(jsonGet(storage,STORAGE_KEYS.profileEnemyHealth,2.5),2.5,.25,5),
    enemySize:rounded(jsonGet(storage,STORAGE_KEYS.profileEnemySize,1.5),1.5,1,3.5),
    idleRange:rounded(jsonGet(storage,STORAGE_KEYS.profileIdleRange,3),3,1,6),
    arcanaSize:readArcanaTweaks(storage).sizeMultiplier,
    directorMode:DIRECTOR_MODE_IDS.has(String(jsonGet(storage,STORAGE_KEYS.directorMode,'pressureBudget')))?String(jsonGet(storage,STORAGE_KEYS.directorMode,'pressureBudget')):'pressureBudget',
  };
}

export function applyCombatProfileStorage(storage=globalThis.localStorage,profile={},options={}){
  const normalizedOptions=profileOptionsForStorage(storage,options);
  const normalized=normalizeProfileForWrite(profile,normalizedOptions);
  const enemyCatalog=options.enemyCatalog||ARENA_ENEMY_CATALOG;
  const abilityCatalog=options.abilityCatalog||ARENA_ABILITY_CATALOG;
  const enemyIds=normalizeWorkingRosterIds(normalized.enemyIds,enemyCatalog);
  const abilityIds=normalizeWorkingAbilityPoolIds(normalized.abilityIds,abilityCatalog);
  const keys=[
    ENEMY_LAB_WORKING_ROSTER_STORAGE_KEY,
    ENEMY_LAB_WORKING_ABILITY_POOL_KEY,
    ARCANA_TWEAKS_KEY,
    STORAGE_KEYS.spawnMultiplier,
    STORAGE_KEYS.introduction,
    STORAGE_KEYS.spawnKind,
    STORAGE_KEYS.directorMode,
    STORAGE_KEYS.profilePressure,
    STORAGE_KEYS.profileAggression,
    STORAGE_KEYS.profileEnemySpeed,
    STORAGE_KEYS.profileEnemyHealth,
    STORAGE_KEYS.profileEnemySize,
    STORAGE_KEYS.profileIdleRange,
  ];
  const before=storageSnapshot(storage,keys);
  try{
    writeStorageValue(storage,ENEMY_LAB_WORKING_ROSTER_STORAGE_KEY,JSON.stringify(enemyIds));
    writeStorageValue(storage,ENEMY_LAB_WORKING_ABILITY_POOL_KEY,JSON.stringify(abilityIds));
    writeArcanaTweaks(
      {sizeMultiplier:normalized.arcanaSize},
      {storage,eventTarget:options.eventTarget||globalThis.window},
    );
    const storedArcana=jsonGet(storage,ARCANA_TWEAKS_KEY,null);
    if(!storedArcana||Number(storedArcana.sizeMultiplier)!==Number(normalized.arcanaSize))throw new CombatProfileStorageError('Arcana profile settings were not retained',{key:ARCANA_TWEAKS_KEY});
    writeStorageValue(storage,STORAGE_KEYS.spawnMultiplier,normalized.spawnMultiplier);
    writeStorageValue(storage,STORAGE_KEYS.introduction,normalized.introduction);
    writeStorageValue(storage,STORAGE_KEYS.spawnKind,JSON.stringify(WORKING_ROSTER_HADES_ID));
    writeStorageValue(storage,STORAGE_KEYS.directorMode,JSON.stringify(normalized.directorMode));
    writeStorageValue(storage,STORAGE_KEYS.profilePressure,JSON.stringify(normalized.pressureBudget));
    writeStorageValue(storage,STORAGE_KEYS.profileAggression,JSON.stringify(normalized.aggression));
    writeStorageValue(storage,STORAGE_KEYS.profileEnemySpeed,JSON.stringify(normalized.enemySpeed));
    writeStorageValue(storage,STORAGE_KEYS.profileEnemyHealth,JSON.stringify(normalized.enemyHealth));
    writeStorageValue(storage,STORAGE_KEYS.profileEnemySize,JSON.stringify(normalized.enemySize));
    writeStorageValue(storage,STORAGE_KEYS.profileIdleRange,JSON.stringify(normalized.idleRange));
    return normalized;
  }catch(error){
    restoreSnapshot(storage,before);
    if(error instanceof CombatProfileStorageError)throw error;
    throw new CombatProfileStorageError('Unable to apply Enemy Lab profile settings',{cause:error});
  }
}

export function setActiveCombatProfile(storage=globalThis.localStorage,profile={},options={}){
  const previous=storageValue(storage,ACTIVE_COMBAT_PROFILE_STORAGE_KEY);
  const normalized=applyCombatProfileStorage(storage,profile,options);
  try{
    writeStorageValue(storage,ACTIVE_COMBAT_PROFILE_STORAGE_KEY,JSON.stringify(normalized));
    return normalized;
  }catch(error){
    restoreStorageValue(storage,ACTIVE_COMBAT_PROFILE_STORAGE_KEY,previous);
    throw error;
  }
}

export function clearActiveCombatProfile(storage=globalThis.localStorage){
  try{storage?.removeItem?.(ACTIVE_COMBAT_PROFILE_STORAGE_KEY);}catch{}
}

export function readActiveCombatProfile(storage=globalThis.localStorage,options={}){
  const raw=jsonGet(storage,ACTIVE_COMBAT_PROFILE_STORAGE_KEY,null);
  if(!raw)return null;
  const normalizedOptions=profileOptionsForStorage(storage,options);
  const profile=normalizeCombatProfile(raw,normalizedOptions);
  if(options.validateSelection===false)return profile;
  const draft=readCombatProfileDraft(storage,options);
  const availableEnemyIds=normalizeWorkingRosterIds(profile.enemyIds,options.enemyCatalog||ARENA_ENEMY_CATALOG);
  const availableAbilityIds=normalizeWorkingAbilityPoolIds(profile.abilityIds,options.abilityCatalog||ARENA_ABILITY_CATALOG);
  const matches=sameIds(availableEnemyIds,draft.enemyIds)&&sameIds(availableAbilityIds,draft.abilityIds)&&
    profile.spawnMultiplier===draft.spawnMultiplier&&profile.introduction===draft.introduction&&
    profile.pressureBudget===draft.pressureBudget&&profile.aggression===draft.aggression&&
    profile.enemySpeed===draft.enemySpeed&&profile.enemyHealth===draft.enemyHealth&&
    profile.enemySize===draft.enemySize&&profile.idleRange===draft.idleRange&&
    profile.arcanaSize===draft.arcanaSize&&profile.directorMode===draft.directorMode;
  if(matches)return profile;
  clearActiveCombatProfile(storage);
  return null;
}

function syncSlider(document,label,value){
  if(!document)return;
  for(const row of document.querySelectorAll?.('#dirSliders .srow')||[]){
    const text=row.querySelector?.('.slabel')?.textContent?.trim()||'';
    if(!text.startsWith(label))continue;
    const input=row.querySelector?.('input');
    const output=row.querySelector?.('.sval');
    if(input)input.value=String(value);
    if(output)output.textContent=String(value);
  }
}

export function installCombatProfileTuningPersistence({
  storage=globalThis.localStorage,
  document=globalThis.document,
}={}){
  if(!document||document.documentElement?.dataset?.combatProfileTuningPersistence==='1')return false;
  if(document.documentElement?.dataset)document.documentElement.dataset.combatProfileTuningPersistence='1';
  const bindSlider=(label,key)=>{
    for(const row of document.querySelectorAll?.('#dirSliders .srow')||[]){
      if(!(row.querySelector?.('.slabel')?.textContent?.trim()||'').startsWith(label))continue;
      row.querySelector?.('input')?.addEventListener('input',event=>{
        jsonSet(storage,key,Number(event.currentTarget.value));
        clearActiveCombatProfile(storage);
      });
    }
  };
  bindSlider('PRESSURE BUDGET',STORAGE_KEYS.profilePressure);
  bindSlider('AGGRESSION',STORAGE_KEYS.profileAggression);
  bindSlider('ENEMY SPEED',STORAGE_KEYS.profileEnemySpeed);
  bindSlider('ENEMY HEALTH',STORAGE_KEYS.profileEnemyHealth);
  bindSlider('ENEMY SIZE',STORAGE_KEYS.profileEnemySize);
  bindSlider('IDLE RANGE',STORAGE_KEYS.profileIdleRange);
  document.getElementById?.('hadesSpawnMultiplierSelect')?.addEventListener('change',()=>clearActiveCombatProfile(storage));
  document.getElementById?.('hadesDifficultyRampSelect')?.addEventListener('change',()=>clearActiveCombatProfile(storage));
  document.getElementById?.('spawnSelect')?.addEventListener('change',()=>clearActiveCombatProfile(storage));
  document.getElementById?.('modeGrid')?.addEventListener('click',event=>{if(event.target.closest?.('button'))clearActiveCombatProfile(storage);});
  document.defaultView?.addEventListener?.(ARCANA_TWEAKS_EVENT,()=>clearActiveCombatProfile(storage));
  return true;
}

export function applyCombatProfileToArena(api,profile,{
  storage=globalThis.localStorage,
  document=globalThis.document,
  options={},
}={}){
  if(!api?.enemySystem)return null;
  const eventTarget=document?.defaultView||globalThis.window;
  const normalized=setActiveCombatProfile(storage,profile,{...options,eventTarget});
  setHadesEncounterSpawnMultiplier(normalized.spawnMultiplier);
  setHadesEncounterDifficultyRamp(normalized.introduction);
  api.enemySystem.setSpawnKind?.(WORKING_ROSTER_HADES_ID);
  api.enemySystem.setPressureBudget?.(normalized.pressureBudget);
  api.enemySystem.setAggression?.(normalized.aggression);
  api.enemySystem.setSpeedScale?.(normalized.enemySpeed);
  api.enemySystem.setHpScale?.(normalized.enemyHealth);
  api.enemySystem.setHeightScale?.(normalized.enemySize);
  api.enemySystem.setIdleRangeScale?.(normalized.idleRange);
  const cycling=normalized.directorMode==='cycle';
  api.arena.cycleMode=cycling;
  api.enemySystem.setCycleOnWaveClear?.(cycling);
  if(!cycling)api.enemySystem.setDirectorMode?.(normalized.directorMode);
  const spawnSelect=document?.getElementById?.('spawnSelect');
  if(spawnSelect)spawnSelect.value=WORKING_ROSTER_HADES_ID;
  const countSelect=document?.getElementById?.('hadesSpawnMultiplierSelect');
  if(countSelect)countSelect.value=String(normalized.spawnMultiplier);
  const introSelect=document?.getElementById?.('hadesDifficultyRampSelect');
  if(introSelect)introSelect.value=normalized.introduction;
  syncSlider(document,'PRESSURE BUDGET',normalized.pressureBudget);
  syncSlider(document,'AGGRESSION',normalized.aggression);
  syncSlider(document,'ENEMY SPEED',normalized.enemySpeed);
  syncSlider(document,'ENEMY HEALTH',normalized.enemyHealth);
  syncSlider(document,'ENEMY SIZE',normalized.enemySize);
  syncSlider(document,'IDLE RANGE',normalized.idleRange);
  const modeGrid=document?.getElementById?.('modeGrid');
  modeGrid?.querySelectorAll?.('button').forEach(button=>button.classList.toggle('on',button.dataset.id===normalized.directorMode));
  return normalized;
}

export function applyActiveCombatProfileToArena(api,settings={}){
  installCombatProfileTuningPersistence(settings);
  const profile=readActiveCombatProfile(settings.storage||globalThis.localStorage,settings.options||{});
  return profile?applyCombatProfileToArena(api,profile,settings):null;
}
