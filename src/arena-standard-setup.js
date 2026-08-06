import {
  ENEMY_LAB_PROFILE_SCHEMA_VERSION,
  normalizeEnemyLabProfile,
  validateEnemyLabProfile,
} from './enemy-lab-profile-schema.js';

export const ARENA_STANDARD_SETUP_FORMAT='arena-standard-setup';
export const ARENA_STANDARD_SETUP_SCHEMA_VERSION=1;
export const ARENA_STANDARD_SETUP_STORAGE_KEY='arena.standardSetup.v1';
export const ARENA_STANDARD_SETUP_HISTORY_STORAGE_KEY='arena.standardSetupHistory.v1';

const ACTIVE_PROFILE_KEY='arena.activeCombatProfile.v1';
const WORKING_ROSTER_KEY='enemyLab.workingRoster.v1';
const WORKING_ABILITY_POOL_KEY='enemyLab.workingAbilityPool.v1';
const ARCANA_TWEAKS_KEY='enemyLab.wizardArcana.tweaks.v1';
const PLANNED_ENCOUNTER_MODES=new Set(['all-enemies-budget','working-roster-hades','flare-level-1','hades-tartarus']);
const BOOT_SETTING_KEYS=Object.freeze({
  'presentation.theme':'arena.theme',
  'presentation.maze.cellSize':'arena.mazeCellSize',
  'presentation.maze.roomSize':'arena.mazeRoomCells',
});

const isRecord=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const stable=value=>JSON.stringify(value);
const cleanText=value=>String(value??'').trim();

export class ArenaStandardSetupError extends Error{
  constructor(message,{code='ARENA_STANDARD_SETUP_FAILED',cause=null}={}){
    super(message,{cause});this.name='ArenaStandardSetupError';this.code=code;
  }
}

export function classifyArenaSettingPath(path,declaredTarget=''){
  const target=String(declaredTarget||'');
  if(['arena','shared','lab-only','action'].includes(target))return target;
  const normalized=cleanText(path).toLowerCase();
  if(normalized.startsWith('capture.')||normalized.startsWith('lab.')||normalized==='scenario.configuration')return'lab-only';
  if(normalized.startsWith('actions.'))return'action';
  if(normalized.startsWith('player.')||normalized.startsWith('combat.')||normalized.startsWith('content.')||normalized.startsWith('presentation.')||normalized==='scenario.encounterid'||normalized==='scenario.hadescadence')return'arena';
  return'lab-only';
}

function controlMap(controls=[]){
  return new Map((Array.isArray(controls)?controls:[]).map(control=>[String(control.path||''),control]));
}

function splitSettings(settings={},controls=[]){
  const byPath=controlMap(controls),transferable={},excluded=[];
  for(const [path,value] of Object.entries(isRecord(settings)?settings:{})){
    const control=byPath.get(path),target=classifyArenaSettingPath(path,control?.target);
    if(target==='arena'||target==='shared')transferable[path]=clone(value);
    else excluded.push(Object.freeze({path,target,value:clone(value),reason:target==='action'?'Action state is never part of Arena Setup.':'Enemy Lab fixture or research state.'}));
  }
  return{transferable,excluded};
}

export function createArenaSetupCandidate({workspace={},controls=[],name='Current Arena Setup',sourceProfileId='',now=Date.now()}={}){
  const source=isRecord(workspace)?workspace:{},split=splitSettings(source.settings,controls);
  const sourceScenario=isRecord(source.scenario)?source.scenario:{};
  const scenario={
    source:'planned',encounterMode:String(sourceScenario.encounterMode||sourceScenario.encounterId||''),
    encounterId:String(sourceScenario.encounterId||sourceScenario.encounterMode||''),
    introduction:String(sourceScenario.introduction||'slow'),seed:String(sourceScenario.seed||''),
    chamber:{},layout:'',mode:'solo',packCount:1,soloCount:1,waveCount:1,
    family:'ARENA',enemyId:'grunt',focalEnemyId:'grunt',threat:'standard',partnerId:'',
  };
  const transferableSettings={...split.transferable,'scenario.encounterId':scenario.encounterMode};
  const sourceContent=isRecord(source.content)?source.content:{};
  // Current Deck is a disposable Lab fixture. Combat Arena keeps its player-facing
  // run draft, while the locked Ability Pool defines its starter/reward card pool.
  const enemyIds=clone(sourceContent.rosterIds||sourceContent.enemyIds||[]);
  const abilityIds=clone(sourceContent.abilityPoolIds||sourceContent.abilityIds||[]);
  const content={
    enemyIds,rosterIds:enemyIds,abilityIds,abilityPoolIds:abilityIds,
    deckCardIds:[],currentDeckIds:[],missingDeckCardIds:[],
    missingEnemyIds:clone(sourceContent.missingEnemyIds||[]),
    missingAbilityIds:clone(sourceContent.missingAbilityIds||[]),
    extensions:clone(sourceContent.extensions||{}),
  };
  const currentDeck=clone(sourceContent.currentDeckIds||sourceContent.deckCardIds||[]);
  const excluded=currentDeck.length?[...split.excluded,Object.freeze({
    path:'content.currentDeckIds',target:'lab-only',value:currentDeck,
    reason:'The Lab test deck stays disposable; Combat Arena keeps its run-start draft.',
  })]:split.excluded;
  const rawProfile={
    format:'enemy-lab-profile',schemaVersion:ENEMY_LAB_PROFILE_SCHEMA_VERSION,version:ENEMY_LAB_PROFILE_SCHEMA_VERSION,
    sourceVersion:ENEMY_LAB_PROFILE_SCHEMA_VERSION,partial:false,
    id:`arena-setup-${Math.max(0,Math.round(Number(now)||0)).toString(36)}`,
    name:cleanText(name)||'Current Arena Setup',createdAt:now,updatedAt:now,
    workspace:{version:1,settings:transferableSettings,content,scenario,capture:{},extensions:{}},
    extensions:{sourceProfileId:cleanText(sourceProfileId)},
  };
  const profile=normalizeEnemyLabProfile(rawProfile,{now});
  const schema=validateEnemyLabProfile(profile),errors=[...(schema.errors||[])],warnings=[...(schema.warnings||[])];
  const encounterMode=String(profile.workspace.scenario.encounterMode||'');
  if(!PLANNED_ENCOUNTER_MODES.has(encounterMode))errors.push('Choose a planner-backed Arena encounter source before locking. Direct Lab compositions remain Test-only.');
  if(encounterMode==='working-roster-hades'&&!profile.workspace.content.rosterIds.length)errors.push('Roster mode needs at least one enemy before it can be locked.');
  if(profile.workspace.content.missingEnemyIds.length)errors.push(`Unavailable enemies: ${profile.workspace.content.missingEnemyIds.join(', ')}`);
  if(profile.workspace.content.missingAbilityIds.length)errors.push('Unavailable abilities must be resolved before locking.');
  for(const path of ['presentation.theme','presentation.maze.cellSize','presentation.maze.roomSize'])if(!(path in profile.workspace.settings))errors.push(`Missing Arena setup value: ${path}`);
  if(excluded.length)warnings.push(`${excluded.length} Lab-only or action value${excluded.length===1?' was':'s were'} excluded.`);
  return Object.freeze({
    ok:errors.length===0,profile,
    transferable:Object.freeze(Object.entries(transferableSettings).map(([path,value])=>Object.freeze({path,value}))),
    excluded:Object.freeze(excluded),
    errors:Object.freeze([...new Set(errors)]),warnings:Object.freeze([...new Set(warnings)]),
  });
}

function parseStored(raw,fallback){try{return raw==null?fallback:JSON.parse(raw);}catch{return fallback;}}

export function readArenaStandardSetup(storage=globalThis.localStorage){
  const value=parseStored(storage?.getItem?.(ARENA_STANDARD_SETUP_STORAGE_KEY),null);
  if(!isRecord(value)||value.format!==ARENA_STANDARD_SETUP_FORMAT||Number(value.schemaVersion)!==ARENA_STANDARD_SETUP_SCHEMA_VERSION)return null;
  return Object.freeze(clone(value));
}

export function readArenaStandardHistory(storage=globalThis.localStorage){
  const value=parseStored(storage?.getItem?.(ARENA_STANDARD_SETUP_HISTORY_STORAGE_KEY),[]);
  return Object.freeze((Array.isArray(value)?value:[]).filter(entry=>isRecord(entry)&&entry.format===ARENA_STANDARD_SETUP_FORMAT).map(entry=>Object.freeze(clone(entry))));
}

function restore(storage,key,value){try{if(value===null)storage.removeItem(key);else storage.setItem(key,value);}catch{}}

export function lockArenaStandardSetup(storage=globalThis.localStorage,candidate,{now=Date.now()}={}){
  if(!candidate?.ok)throw new ArenaStandardSetupError(`Arena Setup is not ready: ${(candidate?.errors||['validation failed']).join(', ')}`,{code:'ARENA_SETUP_NOT_READY'});
  if(!storage?.setItem)throw new ArenaStandardSetupError('Local storage is unavailable.',{code:'ARENA_SETUP_STORAGE_UNAVAILABLE'});
  const previous=readArenaStandardSetup(storage),history=readArenaStandardHistory(storage);
  const manifest=Object.freeze({
    format:ARENA_STANDARD_SETUP_FORMAT,schemaVersion:ARENA_STANDARD_SETUP_SCHEMA_VERSION,
    standardVersion:(Number(previous?.standardVersion)||0)+1,
    id:`standard-${(Number(previous?.standardVersion)||0)+1}`,
    name:candidate.profile.name,lockedAt:Math.max(0,Math.round(Number(now)||0)),
    sourceProfileId:String(candidate.profile.extensions?.sourceProfileId||''),
    profile:candidate.profile,excluded:candidate.excluded,warnings:candidate.warnings,
  });
  const nextHistory=previous?[previous,...history]:[...history];
  const settings=manifest.profile.workspace.settings||{};
  const content=manifest.profile.workspace.content||{};
  const writes=new Map([
    [ARENA_STANDARD_SETUP_HISTORY_STORAGE_KEY,stable(nextHistory)],
    [ARENA_STANDARD_SETUP_STORAGE_KEY,stable(manifest)],
    [ACTIVE_PROFILE_KEY,stable(manifest.profile)],
    [WORKING_ROSTER_KEY,stable(content.rosterIds||content.enemyIds||[])],
    [WORKING_ABILITY_POOL_KEY,stable(content.abilityPoolIds||content.abilityIds||[])],
  ]);
  for(const [path,key] of Object.entries(BOOT_SETTING_KEYS))if(path in settings)writes.set(key,String(settings[path]));
  if(isRecord(settings['player.arcana']))writes.set(ARCANA_TWEAKS_KEY,stable(settings['player.arcana']));
  const before=new Map([...writes.keys()].map(key=>[key,storage.getItem(key)]));
  try{
    for(const [key,value] of writes){storage.setItem(key,value);if(storage.getItem(key)!==value)throw new Error(`Storage did not retain ${key}`);}
    return manifest;
  }catch(error){
    for(const [key,value] of before)restore(storage,key,value);
    throw new ArenaStandardSetupError('The Standard was not locked; the previous Standard is unchanged.',{code:'ARENA_SETUP_STORAGE_WRITE_FAILED',cause:error});
  }
}

export function arenaStandardBootstrapValues(standard){
  if(!standard?.profile?.workspace?.settings)return Object.freeze({});
  const content=standard.profile.workspace.content||{};
  const result={
    [ACTIVE_PROFILE_KEY]:stable(standard.profile),
    [WORKING_ROSTER_KEY]:stable(content.rosterIds||content.enemyIds||[]),
    [WORKING_ABILITY_POOL_KEY]:stable(content.abilityPoolIds||content.abilityIds||[]),
  };
  for(const [path,key] of Object.entries(BOOT_SETTING_KEYS))if(path in standard.profile.workspace.settings)result[key]=String(standard.profile.workspace.settings[path]);
  if(isRecord(standard.profile.workspace.settings['player.arcana']))result[ARCANA_TWEAKS_KEY]=stable(standard.profile.workspace.settings['player.arcana']);
  return Object.freeze(result);
}

export function diffArenaSetup(candidate,standard){
  const current=candidate?.profile?.workspace?.settings||{},locked=standard?.profile?.workspace?.settings||{};
  const paths=[...new Set([...Object.keys(current),...Object.keys(locked)])].sort();
  return Object.freeze(paths.filter(path=>stable(current[path])!==stable(locked[path])).map(path=>Object.freeze({path,candidate:clone(current[path]),standard:clone(locked[path])})));
}
