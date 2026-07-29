import { ARENA_ABILITY_CATALOG } from './arena-ability-catalog.js';
import { ARENA_ENEMY_CATALOG } from './arena-enemy-catalog.js';
import { DIRECTOR_MODES } from './combat-director.js';
import {
  readWorkingAbilityPool,
  writeWorkingAbilityPool,
} from './enemy-lab-working-ability-pool.js';
import {
  readWorkingRoster,
  writeWorkingRoster,
} from './enemy-lab-working-roster.js';
import {
  setHadesEncounterDifficultyRamp,
  setHadesEncounterSpawnMultiplier,
} from './hades-encounter-tuning.js';
import { WORKING_ROSTER_HADES_ID } from './encounter-pools.js';

export const COMBAT_PROFILE_VERSION=1;
export const COMBAT_PROFILES_STORAGE_KEY='enemyLab.combatProfiles.v1';
export const ACTIVE_COMBAT_PROFILE_STORAGE_KEY='arena.activeCombatProfile.v1';
export const MAX_COMBAT_PROFILES=20;

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
const cleanName=value=>String(value||'Combat Profile').trim().replace(/\s+/g,' ').slice(0,48)||'Combat Profile';
const jsonGet=(storage,key,fallback)=>{try{const raw=storage?.getItem?.(key);return raw==null?fallback:JSON.parse(raw);}catch{return fallback;}};
const jsonSet=(storage,key,value)=>{try{storage?.setItem?.(key,JSON.stringify(value));return true;}catch{return false;}};
const rawGet=(storage,key,fallback)=>{try{const value=storage?.getItem?.(key);return value==null?fallback:value;}catch{return fallback;}};
const rawSet=(storage,key,value)=>{try{storage?.setItem?.(key,String(value));return true;}catch{return false;}};
const sameIds=(left=[],right=[])=>left.length===right.length&&left.every((id,index)=>id===right[index]);

export function normalizeCombatProfile(profile={}, {
  enemyCatalog=ARENA_ENEMY_CATALOG,
  abilityCatalog=ARENA_ABILITY_CATALOG,
  now=Date.now(),
  idFactory=null,
}={}){
  const timestamp=Math.max(0,Math.round(finite(profile.updatedAt??now,now)));
  const createdAt=Math.max(0,Math.round(finite(profile.createdAt??timestamp,timestamp)));
  const suppliedId=String(profile.id||'').trim();
  const generated=typeof idFactory==='function'?String(idFactory(profile)||'').trim():`profile-${timestamp.toString(36)}`;
  const spawnMultiplier=SPAWN_MULTIPLIERS.has(Number(profile.spawnMultiplier))?Number(profile.spawnMultiplier):1;
  const introduction=INTRODUCTION_IDS.has(String(profile.introduction||'').toLowerCase())?String(profile.introduction).toLowerCase():'slow';
  const directorMode=DIRECTOR_MODE_IDS.has(String(profile.directorMode||''))?String(profile.directorMode):'pressureBudget';
  return Object.freeze({
    version:COMBAT_PROFILE_VERSION,
    id:suppliedId||generated,
    name:cleanName(profile.name),
    enemyIds:Object.freeze(writeWorkingRoster(null,profile.enemyIds||[],enemyCatalog)),
    abilityIds:Object.freeze(writeWorkingAbilityPool(null,profile.abilityIds||[],abilityCatalog)),
    spawnMultiplier,
    introduction,
    pressureBudget:rounded(profile.pressureBudget,3,.5,4),
    aggression:rounded(profile.aggression,1,.25,3),
    enemySpeed:rounded(profile.enemySpeed,.5,.25,1.5),
    enemyHealth:rounded(profile.enemyHealth,2.5,.25,5),
    enemySize:rounded(profile.enemySize,1.5,1,3.5),
    idleRange:rounded(profile.idleRange,3,1,6),
    directorMode,
    encounterMode:WORKING_ROSTER_HADES_ID,
    cadence:'native-hades',
    createdAt,
    updatedAt:timestamp,
  });
}

export function readCombatProfiles(storage=globalThis.localStorage,options={}){
  const raw=jsonGet(storage,COMBAT_PROFILES_STORAGE_KEY,[]);
  if(!Array.isArray(raw))return[];
  const seen=new Set();
  return raw
    .map(profile=>normalizeCombatProfile(profile,options))
    .filter(profile=>profile.id&&!seen.has(profile.id)&&seen.add(profile.id))
    .sort((left,right)=>right.updatedAt-left.updatedAt)
    .slice(0,MAX_COMBAT_PROFILES);
}

export function writeCombatProfiles(storage=globalThis.localStorage,profiles=[],options={}){
  const seen=new Set();
  const normalized=(profiles||[])
    .map(profile=>normalizeCombatProfile(profile,options))
    .filter(profile=>profile.id&&!seen.has(profile.id)&&seen.add(profile.id))
    .sort((left,right)=>right.updatedAt-left.updatedAt)
    .slice(0,MAX_COMBAT_PROFILES);
  jsonSet(storage,COMBAT_PROFILES_STORAGE_KEY,normalized);
  return normalized;
}

export function saveCombatProfile(storage=globalThis.localStorage,profile={},options={}){
  const now=finite(options.now,Date.now());
  const existing=readCombatProfiles(storage,{...options,now});
  const current=existing.find(entry=>entry.id===String(profile.id||''));
  const normalized=normalizeCombatProfile({
    ...current,
    ...profile,
    createdAt:current?.createdAt??profile.createdAt??now,
    updatedAt:now,
  },{...options,now});
  const next=[normalized,...existing.filter(entry=>entry.id!==normalized.id)];
  writeCombatProfiles(storage,next,{...options,now});
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
    directorMode:DIRECTOR_MODE_IDS.has(String(jsonGet(storage,STORAGE_KEYS.directorMode,'pressureBudget')))?String(jsonGet(storage,STORAGE_KEYS.directorMode,'pressureBudget')):'pressureBudget',
  };
}

export function applyCombatProfileStorage(storage=globalThis.localStorage,profile={},options={}){
  const normalized=normalizeCombatProfile(profile,options);
  writeWorkingRoster(storage,normalized.enemyIds,options.enemyCatalog||ARENA_ENEMY_CATALOG);
  writeWorkingAbilityPool(storage,normalized.abilityIds,options.abilityCatalog||ARENA_ABILITY_CATALOG);
  rawSet(storage,STORAGE_KEYS.spawnMultiplier,normalized.spawnMultiplier);
  rawSet(storage,STORAGE_KEYS.introduction,normalized.introduction);
  jsonSet(storage,STORAGE_KEYS.spawnKind,WORKING_ROSTER_HADES_ID);
  jsonSet(storage,STORAGE_KEYS.directorMode,normalized.directorMode);
  jsonSet(storage,STORAGE_KEYS.profilePressure,normalized.pressureBudget);
  jsonSet(storage,STORAGE_KEYS.profileAggression,normalized.aggression);
  jsonSet(storage,STORAGE_KEYS.profileEnemySpeed,normalized.enemySpeed);
  jsonSet(storage,STORAGE_KEYS.profileEnemyHealth,normalized.enemyHealth);
  jsonSet(storage,STORAGE_KEYS.profileEnemySize,normalized.enemySize);
  jsonSet(storage,STORAGE_KEYS.profileIdleRange,normalized.idleRange);
  return normalized;
}

export function setActiveCombatProfile(storage=globalThis.localStorage,profile={},options={}){
  const normalized=applyCombatProfileStorage(storage,profile,options);
  jsonSet(storage,ACTIVE_COMBAT_PROFILE_STORAGE_KEY,normalized);
  return normalized;
}

export function clearActiveCombatProfile(storage=globalThis.localStorage){
  try{storage?.removeItem?.(ACTIVE_COMBAT_PROFILE_STORAGE_KEY);}catch{}
}

export function readActiveCombatProfile(storage=globalThis.localStorage,options={}){
  const raw=jsonGet(storage,ACTIVE_COMBAT_PROFILE_STORAGE_KEY,null);
  if(!raw)return null;
  const profile=normalizeCombatProfile(raw,options);
  if(options.validateSelection===false)return profile;
  const draft=readCombatProfileDraft(storage,options);
  const matches=sameIds(profile.enemyIds,draft.enemyIds)&&sameIds(profile.abilityIds,draft.abilityIds)&&
    profile.spawnMultiplier===draft.spawnMultiplier&&profile.introduction===draft.introduction&&
    profile.pressureBudget===draft.pressureBudget&&profile.aggression===draft.aggression&&
    profile.enemySpeed===draft.enemySpeed&&profile.enemyHealth===draft.enemyHealth&&
    profile.enemySize===draft.enemySize&&profile.idleRange===draft.idleRange&&profile.directorMode===draft.directorMode;
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
  return true;
}

export function applyCombatProfileToArena(api,profile,{
  storage=globalThis.localStorage,
  document=globalThis.document,
  options={},
}={}){
  if(!api?.enemySystem)return null;
  const normalized=setActiveCombatProfile(storage,profile,options);
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
