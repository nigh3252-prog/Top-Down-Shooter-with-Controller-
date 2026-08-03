export const CONTROL_KINDS=Object.freeze(['button','check','range','select','text']);
export const PROFILE_SCOPES=Object.freeze(['profile','global','ephemeral']);
export const PROFILE_TARGETS=Object.freeze(['arena','shared','lab-only','action']);

const CONTROL_KIND_SET=new Set(CONTROL_KINDS);
const PROFILE_SCOPE_SET=new Set(PROFILE_SCOPES);
const PROFILE_TARGET_SET=new Set(PROFILE_TARGETS);

const resolve=value=>typeof value==='function'?value():value;
const isRecord=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const hasOwn=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
const freezeValue=value=>{
  if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
  Object.values(value).forEach(freezeValue);
  return Object.freeze(value);
};
const freezeOptions=options=>Object.freeze((options||[]).map(option=>Object.freeze({
  value:String(option.value),label:String(option.label??option.value),selected:!!option.selected,
})));
const safeNumber=value=>Number.isFinite(Number(value))?Number(value):null;
const scopeFor=(group,descriptor,kind)=>{
  const id=String(descriptor.id||'').toLowerCase();
  const groupId=String(group.id||'').toLowerCase();
  if(groupId==='actions'||id.startsWith('actions.')||id.endsWith('.test')||id.endsWith('.reset'))return'ephemeral';
  if(groupId==='visuals'||groupId==='combat'||groupId==='maze')return'global';
  return'profile';
};
const targetFor=(path,scope,control,supplied,groupProfile)=>{
  const explicit=supplied.target??control.descriptor.profileTarget??groupProfile.target;
  if(PROFILE_TARGET_SET.has(String(explicit)))return String(explicit);
  const normalized=String(path||'').toLowerCase();
  if(scope==='ephemeral')return control.kind==='button'?'action':'lab-only';
  if(normalized.startsWith('capture.')||normalized.startsWith('lab.')||normalized==='scenario.configuration')return'lab-only';
  return'arena';
};
const placementFor=(group,descriptor,order)=>{
  const supplied=isRecord(descriptor.placement)?descriptor.placement:{};
  const groupPlacement=isRecord(group.placement)?group.placement:{};
  const section=String(supplied.section??descriptor.section??groupPlacement.section??group.section??group.label??group.id);
  const subsection=String(supplied.subsection??descriptor.subsection??groupPlacement.subsection??group.subsection??'');
  const label=String(supplied.label??descriptor.label??descriptor.id);
  const accessibleLabel=String(
    supplied.accessibleLabel??supplied.fullAccessibleLabel??descriptor.accessibleLabel??descriptor.fullAccessibleLabel??
    [section,subsection,label].filter(Boolean).join(' / '),
  );
  const suppliedOrder=Number(supplied.order??descriptor.order??order);
  return Object.freeze({
    section,
    subsection,
    order:Number.isFinite(suppliedOrder)?suppliedOrder:order,
    label,
    accessibleLabel,
    fullAccessibleLabel:accessibleLabel,
    workspace:String(supplied.workspace??descriptor.workspace??groupPlacement.workspace??'test'),
    explicit:Boolean(Object.keys(supplied).length||descriptor.accessibleLabel||descriptor.fullAccessibleLabel||descriptor.order),
  });
};

function defaultFor(control,profile={}){
  const {descriptor,kind}=control;
  if(hasOwn(profile,'default'))return resolve(profile.default);
  if(hasOwn(profile,'defaultValue'))return resolve(profile.defaultValue);
  if(hasOwn(descriptor,'profileDefault'))return resolve(descriptor.profileDefault);
  if(hasOwn(descriptor,'profileDefaultValue'))return resolve(descriptor.profileDefaultValue);
  if(hasOwn(descriptor,'default'))return resolve(descriptor.default);
  if(kind==='range')return Number(descriptor.min??0);
  if(kind==='check')return false;
  if(kind==='select'){
    const options=resolve(descriptor.options)||[];
    const selected=options.find(option=>option?.selected);
    return selected?.value??options[0]?.value??'';
  }
  if(kind==='text')return'';
  return undefined;
}

function normalizeFunctionFor(control,profile){
  if(typeof profile.normalize==='function')return profile.normalize;
  if(typeof control.descriptor.profileNormalizer==='function')return control.descriptor.profileNormalizer;
  if(typeof descriptorNormalize(control.descriptor)==='function')return descriptorNormalize(control.descriptor);
  return value=>{
    if(control.kind==='range')return Number(value);
    if(control.kind==='check')return!!value;
    if(control.kind==='select')return String(value??'');
    if(control.kind==='text')return String(value??'');
    return value;
  };
}

function descriptorNormalize(descriptor){
  return typeof descriptor.profileNormalize==='function'?descriptor.profileNormalize:null;
}

function profileFor(control,group,order){
  const {descriptor,kind}=control;
  const supplied=isRecord(descriptor.profile)?descriptor.profile:{};
  const groupProfile=isRecord(group.profile)?group.profile:{};
  const explicit=hasOwn(descriptor,'profile')||hasOwn(descriptor,'profilePath')||hasOwn(descriptor,'profileScope')||
    hasOwn(descriptor,'profileDefault')||hasOwn(descriptor,'profileDefaultValue')||hasOwn(descriptor,'profileNormalize')||
    hasOwn(descriptor,'profileNormalizer')||hasOwn(descriptor,'profileRequiresReload')||hasOwn(descriptor,'profileReload')||
    hasOwn(descriptor,'profileMigrationId')||hasOwn(descriptor,'profileAdapter')||Object.keys(groupProfile).length>0;
  const groupPrefix=String(groupProfile.pathPrefix||'').trim();
  const defaultPath=groupPrefix?`${groupPrefix}.${String(descriptor.id).split('.').at(-1)}`:descriptor.id;
  const path=String(supplied.path??descriptor.profilePath??defaultPath).trim()||String(descriptor.id);
  const scopeCandidate=supplied.scope??descriptor.profileScope??groupProfile.scope;
  const scope=PROFILE_SCOPE_SET.has(String(scopeCandidate))?String(scopeCandidate):scopeFor(group,descriptor,kind);
  const normalizer=typeof supplied.normalizer==='function'?supplied.normalizer:normalizeFunctionFor(control,supplied);
  let defaultValue;
  try{defaultValue=normalizer(defaultFor(control,supplied));}catch{defaultValue=defaultFor(control,supplied);}
  const adapter=supplied.adapter??descriptor.profileAdapter??null;
  const adapterId=String(supplied.adapterId??descriptor.profileAdapterId??adapter?.id??'');
  const requiresReload=Boolean(supplied.requiresReload??supplied.reloadRequired??supplied.reload??descriptor.profileRequiresReload??descriptor.profileReload??descriptor.reloadRequired??groupProfile.requiresReload);
  const migrationId=String(supplied.migrationId??descriptor.profileMigrationId??groupProfile.migrationId??`control:${path}`);
  const exclusion=String(supplied.exclusion??descriptor.profileExclusion??groupProfile.exclusion??'').trim();
  const target=targetFor(path,scope,control,supplied,groupProfile);
  return{
    path,
    scope,
    defaultValue,
    normalizer,
    requiresReload,
    migrationId,
    adapter,
    adapterId,
    explicit,
    exclusion,
    target,
    placement:placementFor(group,descriptor,order),
  };
}

function readDescriptorValue(control){
  const descriptor=control.descriptor;
  if(control.kind==='check')return resolve(descriptor.get??descriptor.checked??descriptor.value);
  return resolve(descriptor.get??descriptor.value);
}

function readProfileValue(control){
  const profile=control.profile;
  const base=readDescriptorValue(control);
  const adapter=profile.adapter;
  const reader=adapter?.read??adapter?.snapshot??adapter?.get;
  if(typeof reader==='function')return reader(base,{control,descriptor:control.descriptor,profile:profileSnapshot(profile)});
  return base===undefined?profile.defaultValue:base;
}

function normalizeProfileValue(control,value){
  const normalized=control.profile.normalizer(value);
  if(control.kind==='range'&&safeNumber(normalized)===null)throw new Error(`Profile range is not numeric: ${control.profile.path}`);
  return normalized;
}

function validateAdapter(adapter,value,context){
  const validator=adapter?.validate;
  if(typeof validator!=='function')return{ok:true};
  const result=validator(value,context);
  if(result===false)return{ok:false,error:'ADAPTER_REJECTED_VALUE'};
  if(typeof result==='string')return{ok:false,error:result};
  if(isRecord(result)&&result.ok===false)return{ok:false,error:String(result.error||'ADAPTER_REJECTED_VALUE')};
  return{ok:true};
}

function applyRecord(control,value,context={}){
  const normalized=normalizeProfileValue(control,value);
  const adapter=control.profile.adapter;
  const writer=adapter?.apply??adapter?.write??adapter?.set;
  if(typeof writer==='function')return writer(normalized,{...context,control,descriptor:control.descriptor,profile:profileSnapshot(control.profile)});
  if(typeof control.descriptor.set!=='function')return false;
  return control.descriptor.set(normalized);
}

function profileSnapshot(profile){
  const result={
    path:profile.path,
    scope:profile.scope,
    default:freezeValue(profile.defaultValue),
    requiresReload:profile.requiresReload,
    reloadRequired:profile.requiresReload,
    migrationId:profile.migrationId,
    adapterId:profile.adapterId,
    explicit:profile.explicit,
    exclusion:profile.exclusion,
    target:profile.target,
    placement:profile.placement,
    hasNormalizer:typeof profile.normalizer==='function',
    hasAdapter:Boolean(profile.adapter),
  };
  return Object.freeze(result);
}

function profileContractSnapshot(profile){
  return Object.freeze({
    ...profileSnapshot(profile),
    defaultValue:freezeValue(profile.defaultValue),
    normalizer:profile.normalizer,
    normalize:profile.normalizer,
    adapter:freezeValue(profile.adapter),
  });
}

function snapshotControl(control){
  const descriptor=control.descriptor,value=resolve(descriptor.get??descriptor.value);
  const snapshot={
    id:control.id,
    kind:control.kind,
    label:String(descriptor.label||control.id),
    note:String(descriptor.note||''),
    disabled:!!resolve(descriptor.disabled),
    placement:control.profile.placement,
    profile:profileSnapshot(control.profile),
  };
  if(control.kind==='button')snapshot.active=!!resolve(descriptor.active);
  if(control.kind==='check')snapshot.checked=!!resolve(descriptor.checked);
  if(control.kind==='range')Object.assign(snapshot,{value:Number(value),min:Number(descriptor.min??0),max:Number(descriptor.max??100),step:Number(descriptor.step??1)});
  if(control.kind==='select'){
    snapshot.value=String(value??'');
    snapshot.options=freezeOptions(resolve(descriptor.options)).map(option=>Object.freeze({...option,selected:option.value===snapshot.value}));
  }
  if(control.kind==='text')snapshot.value=String(value??'');
  return Object.freeze(snapshot);
}

function profileRecords(registry){
  return registry.getProfileControlRecords?registry.getProfileControlRecords():[];
}

function settingsInput(input){
  if(isRecord(input?.settings))return input.settings;
  if(isRecord(input?.workspace?.settings))return input.workspace.settings;
  return isRecord(input)?input:{};
}

function allowedScope(scope,options={}){
  const scopes=Array.isArray(options.scopes)?options.scopes:
    ['profile',...(options.includeGlobal===true?['global']:[])];
  return scopes.includes(scope);
}

function validateRecordValue(record,value){
  try{
    const normalized=normalizeProfileValue(record,value);
    if(record.kind==='select'){
      const options=resolve(record.descriptor.options)||[];
      if(options.length&&!options.some(option=>String(option.value)===String(normalized)))return{ok:false,error:'SELECT_OPTION_NOT_AVAILABLE'};
    }
    const adapterResult=validateAdapter(record.profile.adapter,normalized,{control:record,profile:profileSnapshot(record.profile)});
    if(!adapterResult.ok)return{ok:false,error:adapterResult.error};
    return{ok:true,value:normalized};
  }catch(error){return{ok:false,error:String(error?.message||error||'INVALID_PROFILE_VALUE')}}
}

export function snapshotProfileSettings(registry,options={}){
  const settings={},warnings=[],controls=[];
  for(const record of profileRecords(registry)){
    if(!allowedScope(record.profile.scope,options))continue;
    if(record.profile.scope==='ephemeral')continue;
    try{
      const result=validateRecordValue(record,readProfileValue(record));
      if(!result.ok){warnings.push(`UNSNAPSHOTTABLE:${record.profile.path}:${result.error}`);continue;}
      settings[record.profile.path]=result.value;
      controls.push({id:record.id,label:String(record.descriptor.label||record.id),path:record.profile.path,scope:record.profile.scope,target:record.profile.target,value:result.value,requiresReload:record.profile.requiresReload,placement:record.profile.placement});
    }catch(error){warnings.push(`UNSNAPSHOTTABLE:${record.profile.path}:${String(error?.message||error)}`);}
  }
  return Object.freeze({
    settings:freezeValue(settings),
    values:freezeValue({...settings}),
    controls:Object.freeze(controls.map(freezeValue)),
    warnings:Object.freeze([...new Set(warnings)]),
  });
}

export function validateProfileSettings(registry,input,options={}){
  const source=settingsInput(input),settings={},errors=[],warnings=[],unknownPaths=[],reloadRequired=[];
  const records=profileRecords(registry),byPath=new Map();
  records.forEach(record=>{if(allowedScope(record.profile.scope,options)&&!byPath.has(record.profile.path))byPath.set(record.profile.path,record);});
  for(const [path,value] of Object.entries(source)){
    const record=byPath.get(String(path));
    if(!record){unknownPaths.push(String(path));continue;}
    if(record.profile.scope==='ephemeral'){warnings.push(`EPHEMERAL_SETTING_IGNORED:${path}`);continue;}
    const result=validateRecordValue(record,value);
    if(!result.ok){errors.push(`${path}:${result.error}`);continue;}
    settings[path]=result.value;
    if(record.profile.requiresReload)reloadRequired.push(path);
  }
  unknownPaths.forEach(path=>warnings.push(`UNKNOWN_PROFILE_SETTING:${path}`));
  return Object.freeze({
    ok:errors.length===0,
    settings:freezeValue(settings),
    normalized:freezeValue({...settings}),
    errors:Object.freeze([...new Set(errors)]),
    warnings:Object.freeze([...new Set(warnings)]),
    unknownPaths:Object.freeze(unknownPaths),
    reloadRequired:Object.freeze([...new Set(reloadRequired)]),
  });
}

export function applyProfileSettings(registry,input,options={}){
  const validation=validateProfileSettings(registry,input,options);
  const base={
    ...validation,
    applied:[],
    failed:[],
    rolledBack:false,
    rollbackFailed:[],
    dryRun:options.dryRun===true,
  };
  if(!validation.ok||options.dryRun===true)return Object.freeze({...base,applied:Object.freeze([]),failed:Object.freeze([]),rollbackFailed:Object.freeze([])});
  const recordsByPath=new Map(profileRecords(registry).map(record=>[record.profile.path,record]));
  const before=[],applied=[],failed=[];
  for(const [path,value] of Object.entries(validation.settings)){
    const record=recordsByPath.get(path);
    if(!record)continue;
    let previous;
    try{previous=readProfileValue(record);}catch{previous=undefined;}
    before.push({record,previous});
    try{
      const result=applyRecord(record,value,{...options,transaction:'apply'});
      if(result===false||(isRecord(result)&&result.ok===false))throw new Error(String(result?.error||'CONTROL_REJECTED_VALUE'));
      applied.push(path);
    }catch(error){
      failed.push({path,error:String(error?.message||error||'PROFILE_APPLY_FAILED')});
      break;
    }
  }
  let rolledBack=false;const rollbackFailed=[];
  if(failed.length){
    rolledBack=true;
    for(const entry of before.filter(item=>applied.includes(item.record.profile.path)).reverse()){
      try{
        const result=applyRecord(entry.record,entry.previous,{...options,transaction:'rollback'});
        if(result===false||(isRecord(result)&&result.ok===false))throw new Error('ROLLBACK_REJECTED');
      }catch(error){rollbackFailed.push({path:entry.record.profile.path,error:String(error?.message||error)});}
    }
    applied.length=0;
  }
  return Object.freeze({
    ...base,
    ok:failed.length===0&&rollbackFailed.length===0,
    applied:Object.freeze(applied),
    failed:Object.freeze(failed.map(freezeValue)),
    rolledBack,
    rollbackFailed:Object.freeze(rollbackFailed.map(freezeValue)),
  });
}

export function auditProfileCoverage(registry,options={}){
  const records=profileRecords(registry);
  const byPath=new Map();
  records.forEach(record=>{if(!byPath.has(record.profile.path))byPath.set(record.profile.path,[]);byPath.get(record.profile.path).push(record);});
  const duplicatePaths=[...byPath.entries()].filter(([,entries])=>entries.length>1).map(([path])=>path);
  const profileRecordsOnly=records.filter(record=>record.profile.scope==='profile');
  const globalRecords=records.filter(record=>record.profile.scope==='global');
  const ephemeralRecords=records.filter(record=>record.profile.scope==='ephemeral');
  const inferredMetadata=records.filter(record=>record.profile.scope!=='ephemeral'&&!record.profile.explicit).map(record=>record.id);
  const undocumentedExclusions=records.filter(record=>record.profile.scope==='ephemeral'&&record.kind!=='button'&&!record.profile.exclusion).map(record=>record.id);
  const missingSnapshotAdapter=records.filter(record=>record.profile.scope!=='ephemeral'&&
    typeof record.descriptor.get!=='function'&&typeof record.descriptor.checked!=='function'&&record.descriptor.value===undefined&&record.descriptor.checked===undefined&&
    typeof record.profile.adapter?.read!=='function'&&typeof record.profile.adapter?.snapshot!=='function'&&
    typeof record.profile.adapter?.get!=='function').map(record=>record.profile.path);
  const missingApplyAdapter=records.filter(record=>record.profile.scope!=='ephemeral'&&
    typeof record.descriptor.set!=='function'&&typeof record.profile.adapter?.apply!=='function'&&
    typeof record.profile.adapter?.write!=='function'&&typeof record.profile.adapter?.set!=='function').map(record=>record.profile.path);
  const actionOverrides=records.filter(record=>(record.groupId==='actions'||record.id.startsWith('actions.')||record.id.endsWith('.test')||record.id.endsWith('.reset'))&&record.profile.scope!=='ephemeral').map(record=>record.id);
  const warnings=[];
  duplicatePaths.forEach(path=>warnings.push(`DUPLICATE_PROFILE_PATH:${path}`));
  inferredMetadata.forEach(id=>warnings.push(`INFERRED_PROFILE_METADATA:${id}`));
  undocumentedExclusions.forEach(id=>warnings.push(`UNDOCUMENTED_PROFILE_EXCLUSION:${id}`));
  missingSnapshotAdapter.forEach(path=>warnings.push(`MISSING_PROFILE_SNAPSHOT:${path}`));
  missingApplyAdapter.forEach(path=>warnings.push(`MISSING_PROFILE_APPLY:${path}`));
  actionOverrides.forEach(id=>warnings.push(`ACTION_NOT_EPHEMERAL:${id}`));
  return Object.freeze({
    ok:duplicatePaths.length===0&&actionOverrides.length===0&&missingSnapshotAdapter.length===0&&missingApplyAdapter.length===0&&inferredMetadata.length===0&&undocumentedExclusions.length===0,
    totalControls:records.length,
    profileControls:profileRecordsOnly.length,
    globalControls:globalRecords.length,
    ephemeralControls:ephemeralRecords.length,
    coveredPaths:Object.freeze([...byPath.keys()]),
    duplicatePaths:Object.freeze(duplicatePaths),
    inferredMetadata:Object.freeze(inferredMetadata),
    undocumentedExclusions:Object.freeze(undocumentedExclusions),
    missingSnapshotAdapter:Object.freeze(missingSnapshotAdapter),
    missingApplyAdapter:Object.freeze(missingApplyAdapter),
    actionOverrides:Object.freeze(actionOverrides),
    reloadRequired:Object.freeze(records.filter(record=>record.profile.requiresReload).map(record=>record.profile.path)),
    warnings:Object.freeze([...new Set(warnings)]),
    includeEphemeral:options.includeEphemeral===true,
  });
}

export function createArenaControlRegistry(){
  const groups=new Map(),controls=new Map(),profileAdapters=new Map(),listeners=new Set();
  const emit=event=>{for(const listener of [...listeners])listener(event);};
  const ensureGroup=group=>{
    const id=String(group.id);
    if(!groups.has(id))groups.set(id,{id,label:String(group.label||id),source:String(group.source||'arena-runtime'),placement:isRecord(group.placement)?group.placement:{},controlIds:[]});
    return groups.get(id);
  };
  const getControlGroups=()=>Object.freeze([...groups.values()].map(group=>Object.freeze({
    id:group.id,label:group.label,source:group.source,
    placement:Object.freeze({
      section:String(group.placement.section??group.label??group.id),
      subsection:String(group.placement.subsection??''),
      order:Number(group.placement.order??0),
      label:String(group.placement.label??group.label??group.id),
      accessibleLabel:String(group.placement.accessibleLabel??group.placement.fullAccessibleLabel??group.label??group.id),
      workspace:String(group.placement.workspace??'test'),
    }),
    controls:Object.freeze(group.controlIds.map(id=>snapshotControl(controls.get(id)))),
  })));
  function register(group,descriptor){
    const record=ensureGroup(group),id=String(descriptor.id||'');
    if(!id)throw new Error('Arena controls require a stable id');
    if(controls.has(id))throw new Error(`Arena control id already registered: ${id}`);
    const kind=String(descriptor.kind||'button');
    if(!CONTROL_KIND_SET.has(kind))throw new Error(`Unsupported arena control kind: ${kind}`);
    const provisional={id,kind,groupId:record.id,descriptor:{...descriptor,id,kind}};
    provisional.profile=profileFor(provisional,group,record.controlIds.length);
    controls.set(id,provisional);record.controlIds.push(id);
    emit({type:'register',controlId:id,groupId:record.id,groups:getControlGroups()});return id;
  }
  function setControl(id,value){
    const control=controls.get(String(id));
    if(!control||resolve(control.descriptor.disabled)||typeof control.descriptor.set!=='function')return false;
    const result=control.descriptor.set(value);
    if(result===false)return false;
    emit({type:'change',controlId:control.id,groupId:control.groupId,value,snapshot:snapshotControl(control)});return result??true;
  }
  function invokeControl(id,...args){
    const control=controls.get(String(id));
    if(!control||resolve(control.descriptor.disabled)||typeof control.descriptor.invoke!=='function')return false;
    const result=control.descriptor.invoke(...args);
    emit({type:'invoke',controlId:control.id,groupId:control.groupId,args,snapshot:snapshotControl(control)});return result??true;
  }
  function registerProfileAdapter(definition={}){
    const id=String(definition.id||definition.path||'').trim();
    const path=String(definition.path||id).trim();
    if(!id||!path)throw new Error('Profile adapters require stable id and path values');
    if(profileAdapters.has(id)||[...profileAdapters.values()].some(record=>record.profile.path===path))throw new Error(`Duplicate profile adapter: ${id}`);
    const scope=PROFILE_SCOPE_SET.has(String(definition.scope))?String(definition.scope):'profile';
    const target=PROFILE_TARGET_SET.has(String(definition.target))?String(definition.target):
      (scope==='ephemeral'?'lab-only':String(path).startsWith('capture.')||String(path).startsWith('lab.')||path==='scenario.configuration'?'lab-only':'arena');
    const adapter=Object.freeze({
      snapshot:definition.snapshot,
      validate:definition.validate,
      apply:definition.apply,
    });
    const profile={
      path,scope,target,defaultValue:deepCloneDefault(definition.default),normalizer:typeof definition.normalizer==='function'?definition.normalizer:value=>value,
      requiresReload:Boolean(definition.requiresReload),migrationId:String(definition.migrationId||`adapter:${path}`),adapter,
      adapterId:id,explicit:true,exclusion:String(definition.exclusion||''),
      placement:Object.freeze({section:String(definition.section||'PROFILES'),subsection:String(definition.subsection||''),order:Number(definition.order)||0,label:String(definition.label||id),accessibleLabel:String(definition.accessibleLabel||definition.label||id),fullAccessibleLabel:String(definition.accessibleLabel||definition.label||id),workspace:String(definition.workspace||'test'),explicit:true}),
    };
    const record={id,kind:'adapter',groupId:'profile-adapters',descriptor:{id,kind:'adapter',label:String(definition.label||id)},profile};
    profileAdapters.set(id,record);emit({type:'profile-adapter-register',adapterId:id,path});
    return()=>{const removed=profileAdapters.delete(id);if(removed)emit({type:'profile-adapter-remove',adapterId:id,path});return removed;};
  }
  const profileRecordSnapshots=()=>Object.freeze([...controls.values(),...profileAdapters.values()].map(control=>Object.freeze({
    id:control.id,kind:control.kind,groupId:control.groupId,descriptor:control.descriptor,profile:control.profile,
    readValue:()=>readProfileValue(control),applyValue:(value,context)=>applyRecord(control,value,context),
  })));
  const api={
    register,registerProfileAdapter,setControl,invokeControl,getControlGroups,
    getControl:id=>controls.has(String(id))?snapshotControl(controls.get(String(id))):null,
    getProfileContracts:()=>Object.freeze([...controls.values()].map(control=>Object.freeze({
      id:control.id,kind:control.kind,groupId:control.groupId,descriptor:Object.freeze({
        label:String(control.descriptor.label||control.id),note:String(control.descriptor.note||''),
      }),placement:control.profile.placement,profile:profileContractSnapshot(control.profile),
    }))),
    getProfileControlRecords:profileRecordSnapshots,
    snapshotProfileSettings:options=>snapshotProfileSettings(api,options),
    validateProfileSettings:(input,options)=>validateProfileSettings(api,input,options),
    applyProfileSettings:(input,options)=>applyProfileSettings(api,input,options),
    auditProfileCoverage:options=>auditProfileCoverage(api,options),
    subscribe(listener){if(typeof listener!=='function')return()=>{};listeners.add(listener);return()=>listeners.delete(listener);},
  };
  return Object.freeze(api);
}

function deepCloneDefault(value){
  if(value===undefined)return undefined;
  try{return JSON.parse(JSON.stringify(value));}catch{return value;}
}
