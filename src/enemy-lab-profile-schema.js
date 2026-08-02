export const ENEMY_LAB_PROFILE_FORMAT='enemy-lab-profile';
export const ENEMY_LAB_PROFILE_SCHEMA_VERSION=3;
export const ENEMY_LAB_PROFILE_VERSION=ENEMY_LAB_PROFILE_SCHEMA_VERSION;
export const ENEMY_LAB_PROFILE_EXPORT_FORMAT='enemy-lab-profile-export';
export const ENEMY_LAB_PROFILE_EXPORT_VERSION=1;
export const ENEMY_LAB_PROFILE_MAX_PROFILES=20;

export const PROFILE_COLLISION_MODES=Object.freeze(['copy','replace','skip']);

export const ENEMY_LAB_PROFILE_SETTING_PATHS=Object.freeze({
  spawnMultiplier:'scenario.spawnMultiplier',
  introduction:'scenario.introduction',
  pressureBudget:'scenario.pressureBudget',
  aggression:'scenario.aggression',
  enemySpeed:'scenario.enemySpeed',
  enemyHealth:'scenario.enemyHealth',
  enemySize:'scenario.enemySize',
  idleRange:'scenario.idleRange',
  directorMode:'scenario.directorMode',
  arcanaSize:'arcana.sizeMultiplier',
});

const KNOWN_TOP_LEVEL_KEYS=new Set([
  'format','schemaVersion','version','id','name','createdAt','updatedAt','partial','sourceVersion',
  'workspace','settings','content','capture','enemyIds','abilityIds','deckCardIds','currentDeckIds',
  'scenario','family','enemyId','mode','packCount','threat','partnerId','seed','layout','rosterIds','abilityPoolIds',
  'spawnMultiplier','introduction','pressureBudget','aggression','enemySpeed','enemyHealth','enemySize',
  'idleRange','arcanaSize','directorMode','encounterMode','cadence','extensions','warnings',
  'catalogVersion','source',
]);
const KNOWN_WORKSPACE_KEYS=new Set(['version','settings','content','scenario','capture','extensions','catalogVersion']);
const KNOWN_SCENARIO_KEYS=new Set(['version','family','enemyId','focalEnemyId','source','encounterMode','encounterId','mode','packCount','soloCount','waveCount','threat','partnerId','introduction','seed','chamber','layout','extensions']);
const KNOWN_CAPTURE_KEYS=new Set(['version','ability','arcanaId','aim','layout','dummy','rngSeed','stage','effects','renderMode','extensions']);
const KNOWN_CONTENT_KEYS=new Set([
  'version','catalogVersion','enemyIds','rosterIds','abilityIds','abilityPoolIds','deckCardIds','currentDeckIds',
  'missingEnemyIds','missingAbilityIds','missingDeckCardIds','unknownEnemyIds','unknownAbilityIds','extensions',
]);

const isRecord=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const cleanName=value=>String(value||'Enemy Lab Profile').trim().replace(/\s+/g,' ').slice(0,64)||'Enemy Lab Profile';
const cleanId=value=>String(value??'').trim().slice(0,128);
const uniqueStrings=values=>[...new Set((Array.isArray(values)?values:[]).map(cleanId).filter(Boolean))];
const round=(value,fallback,min,max)=>Math.round(clamp(finite(value,fallback),min,max)*100)/100;
const deepClone=value=>{
  if(value===undefined)return undefined;
  try{return JSON.parse(JSON.stringify(value));}catch{return null;}
};
const deepFreeze=value=>{
  if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};
const copyRecord=value=>isRecord(value)?deepClone(value)||{}:{};
const arrayValue=(value,fallback=[])=>Array.isArray(value)?value:fallback;
const catalogIds=catalog=>new Set((Array.isArray(catalog)?catalog:[]).map(entry=>cleanId(entry?.id??entry)).filter(Boolean));
const missingIds=(ids,catalog)=>{
  const available=catalogIds(catalog);
  return available.size?[...new Set(ids.filter(id=>!available.has(id)))]:[];
};
const mergeUnique=(left,right)=>uniqueStrings([...(Array.isArray(left)?left:[]),...(Array.isArray(right)?right:[])]);

function collectUnknown(source,known){
  if(!isRecord(source))return{};
  const result={};
  for(const [key,value] of Object.entries(source))if(!known.has(key))result[key]=deepClone(value);
  return result;
}

function readSetting(settings,raw,path,legacyKey,fallback){
  if(isRecord(raw)&&Object.prototype.hasOwnProperty.call(raw,legacyKey))return raw[legacyKey];
  if(isRecord(settings)&&Object.prototype.hasOwnProperty.call(settings,path))return settings[path];
  return fallback;
}

function normalizeWorkspace(raw,options={},warnings=[]){
  const source=isRecord(raw)?raw:{};
  const workspaceSource=isRecord(source.workspace)?source.workspace:{};
  const scenarioSource=isRecord(workspaceSource.scenario)?workspaceSource.scenario:
    (isRecord(source.scenario)?source.scenario:{});
  const contentSource=isRecord(workspaceSource.content)?workspaceSource.content:
    (isRecord(source.content)?source.content:{});
  const settingsSource={
    ...(isRecord(source.settings)?source.settings:{}),
    ...(isRecord(workspaceSource.settings)?workspaceSource.settings:{}),
  };
  const rawEnemyIds=arrayValue(contentSource.enemyIds,arrayValue(contentSource.rosterIds,arrayValue(contentSource.unknownEnemyIds,arrayValue(source.enemyIds,arrayValue(source.rosterIds,[])))));
  const rawAbilityIds=arrayValue(contentSource.abilityIds,arrayValue(contentSource.abilityPoolIds,arrayValue(contentSource.unknownAbilityIds,arrayValue(source.abilityIds,arrayValue(source.abilityPoolIds,[])))));
  const rawDeckIds=arrayValue(contentSource.deckCardIds,arrayValue(contentSource.currentDeckIds,arrayValue(source.deckCardIds,arrayValue(source.currentDeckIds,[]))));
  for(const [label,value] of [['enemyIds',rawEnemyIds],['abilityIds',rawAbilityIds],['deckCardIds',rawDeckIds]]){
    if(!Array.isArray(value))warnings.push(`CONTENT_NOT_ARRAY:${label}`);
  }
  const enemyIds=uniqueStrings(rawEnemyIds);
  const abilityIds=uniqueStrings(rawAbilityIds);
  const deckCardIds=uniqueStrings(rawDeckIds);
  const missingEnemyIds=mergeUnique(contentSource.missingEnemyIds,missingIds(enemyIds,options.enemyCatalog));
  const missingAbilityIds=mergeUnique(contentSource.missingAbilityIds,missingIds(abilityIds,options.abilityCatalog));
  const missingDeckCardIds=mergeUnique(contentSource.missingDeckCardIds,missingIds(deckCardIds,options.abilityCatalog));
  missingEnemyIds.forEach(id=>warnings.push(`MISSING_ENEMY_CONTENT:${id}`));
  missingAbilityIds.forEach(id=>warnings.push(`MISSING_ABILITY_CONTENT:${id}`));
  missingDeckCardIds.forEach(id=>warnings.push(`MISSING_DECK_CONTENT:${id}`));

  const paths=ENEMY_LAB_PROFILE_SETTING_PATHS;
  const settings={...settingsSource};
  const cadence=isRecord(settingsSource['scenario.hadesCadence'])?settingsSource['scenario.hadesCadence']:{};
  const arcana=isRecord(settingsSource['player.arcana'])?settingsSource['player.arcana']:{};
  const modern=(path,fallback)=>Object.prototype.hasOwnProperty.call(settingsSource,path)?settingsSource[path]:fallback;
  settings[paths.spawnMultiplier]=new Set([1,2,5,10]).has(Number(readSetting(settingsSource,source,paths.spawnMultiplier,'spawnMultiplier',cadence.spawnMultiplier??1)))
    ?Number(readSetting(settingsSource,source,paths.spawnMultiplier,'spawnMultiplier',cadence.spawnMultiplier??1)):1;
  const introduction=String(readSetting(settingsSource,source,paths.introduction,'introduction',cadence.introduction??'slow')).toLowerCase();
  settings[paths.introduction]=new Set(['slow','medium','high']).has(introduction)?introduction:'slow';
  settings[paths.pressureBudget]=round(readSetting(settingsSource,source,paths.pressureBudget,'pressureBudget',modern('combat.pressure',3)),3,.5,4);
  settings[paths.aggression]=round(readSetting(settingsSource,source,paths.aggression,'aggression',modern('combat.aggression',1)),1,.25,3);
  settings[paths.enemySpeed]=round(readSetting(settingsSource,source,paths.enemySpeed,'enemySpeed',modern('combat.enemySpeed',.5)),.5,.25,1.5);
  settings[paths.enemyHealth]=round(readSetting(settingsSource,source,paths.enemyHealth,'enemyHealth',modern('combat.enemyHealth',2.5)),2.5,.25,5);
  settings[paths.enemySize]=round(readSetting(settingsSource,source,paths.enemySize,'enemySize',modern('combat.enemySize',1.5)),1.5,1,3.5);
  settings[paths.idleRange]=round(readSetting(settingsSource,source,paths.idleRange,'idleRange',modern('combat.idleRange',3)),3,1,6);
  settings[paths.directorMode]=String(readSetting(settingsSource,source,paths.directorMode,'directorMode',modern('combat.directorMode','pressureBudget'))||'pressureBudget');
  settings[paths.arcanaSize]=round(readSetting(
    settingsSource,source,paths.arcanaSize,'arcanaSize',arcana.sizeMultiplier??options.arcanaSizeFallback??1,
  ),options.arcanaSizeFallback??1,1,5);
  if(options.directorModeIds instanceof Set&&!options.directorModeIds.has(settings[paths.directorMode])){
    settings[paths.directorMode]=String(options.directorModeDefault||'pressureBudget');
  }

  const captureSource=isRecord(workspaceSource.capture)?workspaceSource.capture:(isRecord(source.capture)?source.capture:{});
  const requestedEncounterMode=String(source.encounterMode??scenarioSource.encounterMode??scenarioSource.encounterId??options.encounterModeDefault??'all-enemies-budget');
  const sourceVersion=Math.max(0,Math.round(finite(source.schemaVersion??source.version,1)));
  const encounterMode=sourceVersion<3&&!enemyIds.length&&requestedEncounterMode==='working-roster-hades'?'all-enemies-budget':requestedEncounterMode;
  if(encounterMode!==requestedEncounterMode)warnings.push('EMPTY_ROSTER_MODE_NORMALIZED_TO_ALL');
  const scenario={
    version:1,
    family:String(source.family??scenarioSource.family??'GOBLINS'),
    enemyId:String(source.enemyId??scenarioSource.enemyId??scenarioSource.focalEnemyId??'grunt'),
    focalEnemyId:String(source.enemyId??scenarioSource.focalEnemyId??scenarioSource.enemyId??'grunt'),
    source:String(scenarioSource.source??(encounterMode==='lab-direct'?'direct':'planned')),
    encounterMode,
    encounterId:String(scenarioSource.encounterId??encounterMode),
    mode:String(source.mode??scenarioSource.mode??'solo'),
    packCount:Math.max(1,Math.min(99,Math.round(finite(source.packCount??scenarioSource.packCount,3)))),
    soloCount:Math.max(1,Math.min(99,Math.round(finite(scenarioSource.soloCount,1)))),
    waveCount:Math.max(1,Math.min(99,Math.round(finite(scenarioSource.waveCount,1)))),
    threat:String(source.threat??scenarioSource.threat??'standard'),
    partnerId:String(source.partnerId??scenarioSource.partnerId??''),
    introduction:String(source.introduction??scenarioSource.introduction??settings[ENEMY_LAB_PROFILE_SETTING_PATHS.introduction]??'slow'),
    seed:String(source.seed??scenarioSource.seed??''),
    chamber:copyRecord(scenarioSource.chamber),
    layout:String(source.layout??scenarioSource.layout??scenarioSource.chamber?.layout??''),
    extensions:{
      ...copyRecord(scenarioSource.extensions),
      ...collectUnknown(scenarioSource,KNOWN_SCENARIO_KEYS),
    },
  };
  const capture={
    version:1,
    ability:String(captureSource.ability??captureSource.arcanaId??'DRAGON-ARC'),
    arcanaId:String(captureSource.arcanaId??captureSource.ability??'DRAGON-ARC'),
    aim:String(captureSource.aim??'right'),
    layout:String(captureSource.layout??captureSource.dummy??'none'),
    dummy:String(captureSource.dummy??captureSource.layout??'none'),
    rngSeed:String(captureSource.rngSeed??4401),
    stage:String(captureSource.stage??'motion'),
    effects:captureSource.effects!==false,
    renderMode:String(captureSource.renderMode??'proxy'),
    extensions:{...copyRecord(captureSource.extensions),...collectUnknown(captureSource,KNOWN_CAPTURE_KEYS)},
  };
  const contentExtensions={
    ...copyRecord(contentSource.extensions),
    ...collectUnknown(contentSource,KNOWN_CONTENT_KEYS),
  };
  const workspaceExtensions={
    ...copyRecord(workspaceSource.extensions),
    ...collectUnknown(workspaceSource,KNOWN_WORKSPACE_KEYS),
  };
  Object.keys(scenario.extensions).forEach(key=>warnings.push(`UNKNOWN_SCENARIO_FIELD:${key}`));
  Object.keys(contentExtensions).forEach(key=>warnings.push(`UNKNOWN_CONTENT_FIELD:${key}`));
  Object.keys(workspaceExtensions).forEach(key=>warnings.push(`UNKNOWN_WORKSPACE_FIELD:${key}`));
  return{
    version:1,
    catalogVersion:String(contentSource.catalogVersion??workspaceSource.catalogVersion??source.catalogVersion??options.catalogVersion??''),
    scenario,
    settings,
    content:{
      version:1,
      catalogVersion:String(contentSource.catalogVersion??workspaceSource.catalogVersion??source.catalogVersion??options.catalogVersion??''),
      enemyIds,
      rosterIds:enemyIds,
      abilityIds,
      abilityPoolIds:abilityIds,
      deckCardIds,
      currentDeckIds:deckCardIds,
      missingEnemyIds,
      missingAbilityIds,
      missingDeckCardIds,
      extensions:contentExtensions,
    },
    capture,
    extensions:workspaceExtensions,
  };
}

export function createEnemyLabWorkspace(value={},options={}){
  const warnings=[];
  return deepFreeze(normalizeWorkspace(value,options,warnings));
}

export function normalizeEnemyLabProfile(profile={},options={}){
  const raw=isRecord(profile)?profile:{};
  const warnings=[];
  const now=Math.max(0,Math.round(finite(options.now,Date.now())));
  const sourceVersion=Math.max(0,Math.round(finite(raw.schemaVersion??raw.version,1)));
  const workspace=normalizeWorkspace(raw,options,warnings);
  const settings=workspace.settings;
  const paths=ENEMY_LAB_PROFILE_SETTING_PATHS;
  const timestamp=Math.max(0,Math.round(finite(raw.updatedAt,now)));
  const createdAt=Math.max(0,Math.round(finite(raw.createdAt,timestamp)));
  const suppliedId=cleanId(raw.id);
  const generated=typeof options.idFactory==='function'?cleanId(options.idFactory(raw)):`profile-${timestamp.toString(36)}`;
  const sourceExtensions={...copyRecord(raw.extensions),...collectUnknown(raw,KNOWN_TOP_LEVEL_KEYS)};
  Object.keys(sourceExtensions).forEach(key=>warnings.push(`UNKNOWN_PROFILE_FIELD:${key}`));
  const canonical={
    format:ENEMY_LAB_PROFILE_FORMAT,
    schemaVersion:ENEMY_LAB_PROFILE_SCHEMA_VERSION,
    version:ENEMY_LAB_PROFILE_SCHEMA_VERSION,
    id:suppliedId||generated||'profile-0',
    name:cleanName(raw.name),
    createdAt,
    updatedAt:timestamp,
    partial:raw.partial===true||sourceVersion<ENEMY_LAB_PROFILE_SCHEMA_VERSION,
    sourceVersion,
    workspace,
    extensions:sourceExtensions,
    warnings:[...new Set([...(Array.isArray(raw.warnings)?raw.warnings:[]),...warnings])],
    // Flat fields remain as a compatibility projection for the v1 profile API.
    enemyIds:workspace.content.enemyIds,
    rosterIds:workspace.content.rosterIds,
    abilityIds:workspace.content.abilityIds,
    abilityPoolIds:workspace.content.abilityPoolIds,
    deckCardIds:workspace.content.deckCardIds,
    currentDeckIds:workspace.content.currentDeckIds,
    family:workspace.scenario.family,
    enemyId:workspace.scenario.enemyId,
    mode:workspace.scenario.mode,
    packCount:workspace.scenario.packCount,
    threat:workspace.scenario.threat,
    partnerId:workspace.scenario.partnerId,
    seed:workspace.scenario.seed,
    layout:workspace.scenario.layout,
    spawnMultiplier:settings[paths.spawnMultiplier],
    introduction:settings[paths.introduction],
    pressureBudget:settings[paths.pressureBudget],
    aggression:settings[paths.aggression],
    enemySpeed:settings[paths.enemySpeed],
    enemyHealth:settings[paths.enemyHealth],
    enemySize:settings[paths.enemySize],
    idleRange:settings[paths.idleRange],
    arcanaSize:settings[paths.arcanaSize],
    directorMode:settings[paths.directorMode],
    encounterMode:workspace.scenario.encounterMode,
    cadence:String(raw.cadence||'native-hades'),
  };
  if(sourceVersion<ENEMY_LAB_PROFILE_SCHEMA_VERSION)canonical.warnings.push(`PARTIAL_PROFILE_SOURCE_VERSION:${sourceVersion}`);
  return deepFreeze(canonical);
}

export const migrateEnemyLabProfile=(profile={},options={})=>{
  const validation=validateEnemyLabProfile(profile,options);
  const normalized=validation.profile;
  return Object.freeze({
    profile:normalized,
    migrated:normalized.sourceVersion!==ENEMY_LAB_PROFILE_SCHEMA_VERSION,
    partial:normalized.partial,
    errors:validation.errors,
    warnings:Object.freeze([...new Set([...normalized.warnings,...validation.warnings])]),
    ok:validation.ok,
  });
};

export function validateEnemyLabProfile(profile={},options={}){
  const errors=[],warnings=[];
  if(!isRecord(profile))return Object.freeze({ok:false,errors:Object.freeze(['PROFILE_NOT_OBJECT']),warnings:Object.freeze([]),profile:null});
  const normalized=normalizeEnemyLabProfile(profile,options);
  const declaredFormat=profile.format;
  const declaredVersion=Number(profile.schemaVersion??profile.version??1);
  if(declaredFormat&&declaredFormat!==ENEMY_LAB_PROFILE_FORMAT)errors.push(`UNSUPPORTED_PROFILE_FORMAT:${declaredFormat}`);
  if(Number.isFinite(declaredVersion)&&declaredVersion>ENEMY_LAB_PROFILE_SCHEMA_VERSION)errors.push(`UNSUPPORTED_PROFILE_VERSION:${declaredVersion}`);
  if(!normalized.id)errors.push('PROFILE_ID_REQUIRED');
  if(!normalized.name)errors.push('PROFILE_NAME_REQUIRED');
  if(normalized.partial)warnings.push('PROFILE_PARTIAL');
  normalized.warnings.forEach(warning=>warnings.push(warning));
  if(!isRecord(normalized.workspace)||!isRecord(normalized.workspace.scenario)||!isRecord(normalized.workspace.settings)||!isRecord(normalized.workspace.content))errors.push('WORKSPACE_SHAPE_INVALID');
  if(normalized.workspace.content.enemyIds.some(id=>!id))errors.push('EMPTY_ENEMY_CONTENT_ID');
  if(normalized.workspace.content.abilityIds.some(id=>!id))errors.push('EMPTY_ABILITY_CONTENT_ID');
  if(normalized.workspace.content.deckCardIds.some(id=>!id))errors.push('EMPTY_DECK_CONTENT_ID');
  return Object.freeze({
    ok:errors.length===0,
    errors:Object.freeze([...new Set(errors)]),
    warnings:Object.freeze([...new Set(warnings)]),
    profile:normalized,
    partial:normalized.partial,
    unknownFields:Object.freeze(Object.keys(normalized.extensions)),
    unknownContent:Object.freeze({
      enemyIds:normalized.workspace.content.missingEnemyIds,
      abilityIds:normalized.workspace.content.missingAbilityIds,
      deckCardIds:normalized.workspace.content.missingDeckCardIds,
    }),
  });
}

function exportEnvelope(profiles,{now=Date.now(),catalogVersion='',pretty=true}={}){
  const normalized=(profiles||[]).map(profile=>normalizeEnemyLabProfile(profile,{now,catalogVersion}));
  return{
    format:ENEMY_LAB_PROFILE_EXPORT_FORMAT,
    exportVersion:ENEMY_LAB_PROFILE_EXPORT_VERSION,
    schemaVersion:ENEMY_LAB_PROFILE_SCHEMA_VERSION,
    exportedAt:Math.max(0,Math.round(finite(now,Date.now()))),
    catalogVersion:String(catalogVersion||''),
    profiles:normalized,
    pretty,
  };
}

export function exportEnemyLabProfile(profile,options={}){
  const envelope=exportEnvelope([profile],options);
  const pretty=options.pretty!==false;
  const serializable={...envelope};delete serializable.pretty;
  return JSON.stringify(serializable,null,pretty?2:0);
}

export function exportEnemyLabProfiles(profiles=[],options={}){
  const envelope=exportEnvelope(profiles,options);
  const pretty=options.pretty!==false;
  const serializable={...envelope};delete serializable.pretty;
  return JSON.stringify(serializable,null,pretty?2:0);
}

function parseImport(input){
  if(typeof input==='string'){
    try{return{value:JSON.parse(input),errors:[]};}catch{return{value:null,errors:['IMPORT_INVALID_JSON']};}
  }
  return{value:input,errors:[]};
}

function importCandidates(value){
  if(Array.isArray(value))return value;
  if(isRecord(value)&&value.format===ENEMY_LAB_PROFILE_EXPORT_FORMAT)return arrayValue(value.profiles,[]);
  if(isRecord(value)&&value.format===ENEMY_LAB_PROFILE_FORMAT)return[value];
  if(isRecord(value)&&isRecord(value.profile))return[value.profile];
  if(isRecord(value))return[value];
  return[];
}

function uniqueCopyId(id,used){
  const base=cleanId(id)||'profile';
  let candidate=`${base}-copy`,index=2;
  while(used.has(candidate))candidate=`${base}-copy-${index++}`;
  return candidate;
}

function uniqueCopyName(name,used){
  const base=cleanName(name);
  let candidate=`${base} (Copy)`,index=2;
  while(used.has(candidate))candidate=`${base} (Copy ${index++})`;
  return candidate;
}

export function previewEnemyLabProfileImport(input,{existingProfiles=[],collision='copy',now=Date.now(),...options}={}){
  const parsed=parseImport(input),errors=[...parsed.errors],warnings=[],skipped=[];
  if(!PROFILE_COLLISION_MODES.includes(collision))errors.push(`IMPORT_INVALID_COLLISION_MODE:${collision}`);
  const existing=(existingProfiles||[]).map(profile=>normalizeEnemyLabProfile(profile,{...options,now}));
  const existingIds=new Set(existing.map(profile=>profile.id));
  const existingNames=new Set(existing.map(profile=>profile.name));
  const profiles=[];
  const collisions=[];
  importCandidates(parsed.value).forEach((candidate,index)=>{
    const migrated=migrateEnemyLabProfile(candidate,{...options,now});
    const profile=migrated.profile;
    const validation=validateEnemyLabProfile(profile,{...options,now});
    migrated.warnings.forEach(warning=>warnings.push(`PROFILE_${index}:${warning}`));
    [...migrated.errors,...validation.errors].forEach(error=>errors.push(`PROFILE_${index}:${error}`));
    if(!migrated.ok||!validation.ok)return;
    const collisionFound=existingIds.has(profile.id)||profiles.some(entry=>entry.id===profile.id);
    if(collisionFound){
      collisions.push(Object.freeze({index,id:profile.id,mode:collision}));
      if(collision==='skip'){skipped.push(profile.id);return;}
      if(collision==='replace')profiles.push(profile);
      if(collision==='copy'){
        const id=uniqueCopyId(profile.id,existingIds);
        const name=uniqueCopyName(profile.name,existingNames);
        existingIds.add(id);existingNames.add(name);
        profiles.push(normalizeEnemyLabProfile({...profile,id,name,createdAt:now,updatedAt:now,extensions:{...profile.extensions,importedFromId:profile.id}},{...options,now}));
      }
      return;
    }
    existingIds.add(profile.id);existingNames.add(profile.name);profiles.push(profile);
  });
  if(!importCandidates(parsed.value).length&&!errors.length)errors.push('IMPORT_NO_PROFILES');
  return Object.freeze({
    ok:errors.length===0,
    collision,
    profiles:Object.freeze(profiles),
    existingProfiles:Object.freeze(existing),
    collisions:Object.freeze(collisions),
    warnings:Object.freeze([...new Set(warnings)]),
    errors:Object.freeze([...new Set(errors)]),
    skipped:Object.freeze(skipped),
    count:profiles.length,
  });
}

export function importEnemyLabProfiles(input,{existingProfiles=[],collision='copy',maxProfiles=ENEMY_LAB_PROFILE_MAX_PROFILES,...options}={}){
  const preview=previewEnemyLabProfileImport(input,{existingProfiles,collision,...options});
  if(!preview.ok)return Object.freeze({...preview,profiles:Object.freeze(existingProfiles.map(profile=>normalizeEnemyLabProfile(profile,options))),imported:[],replaced:[],copied:[],skipped:preview.skipped||[]});
  const existing=preview.existingProfiles;
  const byId=new Map(existing.map(profile=>[profile.id,profile]));
  const imported=[],replaced=[],copied=[],skipped=[...(preview.skipped||[])];
  preview.profiles.forEach(profile=>{
    const wasExisting=byId.has(profile.id);
    if(wasExisting&&collision==='replace'){byId.set(profile.id,profile);replaced.push(profile.id);}
    else if(wasExisting&&collision==='skip')skipped.push(profile.id);
    else{byId.set(profile.id,profile);imported.push(profile.id);if(profile.extensions?.importedFromId)copied.push(profile.id);}
  });
  const next=[...byId.values()].sort((left,right)=>right.updatedAt-left.updatedAt);
  if(next.length>maxProfiles)return Object.freeze({
    ...preview,ok:false,profiles:Object.freeze(existing),imported:[],replaced:[],copied:[],skipped:[],
    errors:Object.freeze([...preview.errors,`PROFILE_LIMIT_EXCEEDED:${maxProfiles}`]),
  });
  return Object.freeze({
    ...preview,
    profiles:Object.freeze(next),
    imported:Object.freeze(imported),
    replaced:Object.freeze(replaced),
    copied:Object.freeze(copied),
    skipped:Object.freeze(skipped),
  });
}

export const exportProfile=exportEnemyLabProfile;
export const exportProfiles=exportEnemyLabProfiles;
export const previewImport=previewEnemyLabProfileImport;
export const importProfiles=importEnemyLabProfiles;
