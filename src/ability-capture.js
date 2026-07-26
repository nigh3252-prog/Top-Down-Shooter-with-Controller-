import { WIZARD_ARCANA_CARDS } from './wizard-arcana-cards.js';
import { WIZARD_AIR_BASIC_CARDS } from './wizard-air-basics-cards.js';
import { WIZARD_NEXT_SOURCE_CARDS } from './wizard-next-source-cards.js';

export const ABILITY_CAPTURE_FIXED_DT=1/60;
export const ABILITY_CAPTURE_CHECKPOINTS=Object.freeze([.25,.5,.75,1,1.25]);

function sourceOrderedArcana(){
  const windIndex=WIZARD_ARCANA_CARDS.findIndex(card=>card?.arcanaId==='WIND-SLASH');
  if(windIndex<0)return[...WIZARD_ARCANA_CARDS,...WIZARD_AIR_BASIC_CARDS,...WIZARD_NEXT_SOURCE_CARDS];
  return[
    ...WIZARD_ARCANA_CARDS.slice(0,windIndex+1),
    ...WIZARD_AIR_BASIC_CARDS,
    ...WIZARD_NEXT_SOURCE_CARDS,
    ...WIZARD_ARCANA_CARDS.slice(windIndex+1),
  ];
}

export const ABILITY_CAPTURE_CARDS=Object.freeze(sourceOrderedArcana());
export const ABILITY_CAPTURE_CARD_SUMMARIES=Object.freeze(ABILITY_CAPTURE_CARDS.map(card=>Object.freeze({
  id:card.arcanaId,
  cardId:card.id,
  name:card.name,
  element:card.element,
  icon:card.icon,
})));

export const ABILITY_CAPTURE_AIMS=Object.freeze({
  right:Object.freeze({id:'right',x:1,z:0,angle:Math.PI/2}),
  down:Object.freeze({id:'down',x:0,z:1,angle:0}),
  left:Object.freeze({id:'left',x:-1,z:0,angle:-Math.PI/2}),
  up:Object.freeze({id:'up',x:0,z:-1,angle:Math.PI}),
});

export function normalizeCaptureArcanaId(value,fallback='DRAGON-ARC'){
  const key=String(value||'').trim().toUpperCase().replace(/^WOL-/,'');
  return ABILITY_CAPTURE_CARDS.some(card=>card.arcanaId===key)?key:fallback;
}

export function captureCardById(value){
  const id=normalizeCaptureArcanaId(value,'');
  return ABILITY_CAPTURE_CARDS.find(card=>card.arcanaId===id)||null;
}

export function normalizeCaptureAim(value='right'){
  const id=String(value||'right').toLowerCase();
  return ABILITY_CAPTURE_AIMS[id]||ABILITY_CAPTURE_AIMS.right;
}

export function normalizeCaptureDummy(value='none'){
  const source=typeof value==='string'?{layout:value}:{...(value||{})};
  let layout=String(source.layout||source.id||'none').toLowerCase();
  if(layout==='empty')layout='none';
  if(layout==='dummy')layout='stationary';
  if(!['none','stationary','source-line'].includes(layout))layout='none';
  return{
    layout,
    distance:Number.isFinite(Number(source.distance))?Number(source.distance):(layout==='stationary'?7:11.5),
    spawnKind:String(source.spawnKind||'grunt'),
  };
}

export function captureDummyPlacements(value='none',playerDiameter=2.1){
  const dummy=normalizeCaptureDummy(value),diameter=Math.max(.1,Number(playerDiameter)||2.1);
  if(dummy.layout==='none')return[];
  if(dummy.layout==='stationary')return[{id:'capture-dummy',role:'primary',forward:dummy.distance,lateral:0}];
  return[
    {id:'capture-dummy',role:'primary',forward:dummy.distance,lateral:0},
    {id:'capture-dummy-negative',role:'corridor-edge-negative',forward:dummy.distance,lateral:-diameter},
    {id:'capture-dummy-positive',role:'corridor-edge-positive',forward:dummy.distance,lateral:diameter},
  ];
}

function finiteNumber(value,fallback=0){
  const number=Number(value);
  return Number.isFinite(number)?number:fallback;
}

function normalizeTargetFixture(value={},index=0){
  return{
    id:String(value.id||`capture-target-${index+1}`),
    role:String(value.role||'target'),
    forward:finiteNumber(value.forward,7),
    lateral:finiteNumber(value.lateral,0),
    spawnFrame:Math.max(0,Math.trunc(finiteNumber(value.spawnFrame,0))),
    spawnKind:String(value.spawnKind||'grunt'),
    hp:Math.max(1,finiteNumber(value.hp,9999)),
  };
}

function normalizeHostileProjectileFixture(value={},index=0){
  return{
    id:String(value.id||`capture-hostile-projectile-${index+1}`),
    forward:finiteNumber(value.forward,5),
    lateral:finiteNumber(value.lateral,0),
    forwardVelocity:finiteNumber(value.forwardVelocity,-5),
    lateralVelocity:finiteNumber(value.lateralVelocity,0),
    spawnFrame:Math.max(0,Math.trunc(finiteNumber(value.spawnFrame,0))),
    radius:Math.max(.02,finiteNumber(value.radius,.16)),
    life:Math.max(ABILITY_CAPTURE_FIXED_DT,finiteNumber(value.life,3)),
  };
}

function normalizeWallPoint(value={}){
  return{forward:finiteNumber(value.forward,0),lateral:finiteNumber(value.lateral,0)};
}

function normalizeWallFixture(value={},index=0){
  return{id:String(value.id||`capture-wall-${index+1}`),a:normalizeWallPoint(value.a),b:normalizeWallPoint(value.b)};
}

function normalizeResourceFixture(value={},index=0){
  const primitive=['number','string','boolean'].includes(typeof value.value)?value.value:null;
  return{runtimeId:String(value.runtimeId||''),key:String(value.key||`resource${index+1}`),value:primitive};
}

function normalizeDeckFixture(value){
  if(!value||typeof value!=='object'||value.enabled===false)return null;
  return{enabled:true,primaryArcanaId:normalizeCaptureArcanaId(value.primaryArcanaId||'VOLT-DISC'),oppositeArcanaId:normalizeCaptureArcanaId(value.oppositeArcanaId||'BOLT-RAIL')};
}

export function normalizeCaptureFixtures(value={}){
  const source=value&&typeof value==='object'?value:{};
  return{
    targets:Array.isArray(source.targets)?source.targets.slice(0,24).map(normalizeTargetFixture):[],
    hostileProjectiles:Array.isArray(source.hostileProjectiles)?source.hostileProjectiles.slice(0,24).map(normalizeHostileProjectileFixture):[],
    walls:Array.isArray(source.walls)?source.walls.slice(0,24).map(normalizeWallFixture):[],
    resources:Array.isArray(source.resources)?source.resources.slice(0,24).map(normalizeResourceFixture).filter(resource=>resource.runtimeId&&/^[A-Za-z_$][\w$]*$/.test(resource.key)):[],
    deck:normalizeDeckFixture(source.deck),
  };
}

export function captureTargetPlacements(fixtures={},dummy='none',playerDiameter=2.1){
  const normalized=normalizeCaptureFixtures(fixtures);
  return normalized.targets.length?normalized.targets:captureDummyPlacements(dummy,playerDiameter).map((placement,index)=>normalizeTargetFixture(placement,index));
}

export function createCaptureRandom(seed=4401){
  let value=2166136261;
  for(const character of String(seed)){
    value^=character.charCodeAt(0);
    value=Math.imul(value,16777619);
  }
  value=value>>>0||0x6d2b79f5;
  return()=>{
    value=(value+0x6d2b79f5)>>>0;
    let next=value;
    next=Math.imul(next^(next>>>15),next|1);
    next^=next+Math.imul(next^(next>>>7),next|61);
    return((next^(next>>>14))>>>0)/4294967296;
  };
}

function finite(value){return Number.isFinite(Number(value))?Number(value):null;}
function point(value){
  if(!value||typeof value!=='object')return null;
  const x=finite(value.x),z=finite(value.z??value.y);
  if(x===null||z===null)return null;
  const result={x,z};
  const y=finite(value.y);if(y!==null&&value.z!==undefined)result.y=y;
  return result;
}
function vector(value){
  const result=point(value);if(!result)return null;
  const length=Math.hypot(result.x,result.z);
  return{...result,length};
}
function jsonSafe(value,depth=0){
  if(depth>7)return undefined;
  if(value===null||typeof value==='string'||typeof value==='boolean')return value;
  if(typeof value==='number')return Number.isFinite(value)?value:null;
  if(Array.isArray(value))return value.slice(0,64).map(item=>jsonSafe(item,depth+1)).filter(item=>item!==undefined);
  if(value instanceof Set)return{size:value.size};
  if(value instanceof Map)return{size:value.size};
  if(typeof value!=='object')return undefined;
  if(value.isObject3D)return point(value.position);
  const result={};
  for(const [key,item] of Object.entries(value)){
    if(['mesh','meshes','root','material','geometry','parent','children','hit','target','captured','walls','spec'].includes(key))continue;
    const safe=jsonSafe(item,depth+1);if(safe!==undefined)result[key]=safe;
  }
  return result;
}

export function captureEffectMetric(effect,index=0){
  const meshPosition=point(effect?.mesh?.position);
  const position=point(effect?.position)||meshPosition;
  const metric={index,type:String(effect?.type||'effect')};
  for(const key of['age','life','distance','size','phase','emissionIndex','emitted','remaining','pathDistance']){
    const value=finite(effect?.[key]);if(value!==null)metric[key]=value;
  }
  if(position)metric.position=position;
  for(const key of['previous','direction','tangent','velocity','forward']){
    const value=vector(effect?.[key]);if(value)metric[key]=value;
  }
  if(effect?.mesh){
    const yaw=finite(effect.mesh.rotation?.y);if(yaw!==null)metric.yaw=yaw;
    metric.meshVisible=effect.mesh.visible!==false;
  }
  for(const key of['samples','bodySamples','trail','path','segments']){
    if(!Array.isArray(effect?.[key]))continue;
    const samples=effect[key].map(point).filter(Boolean).slice(0,64);
    if(samples.length)metric[key]=samples;
  }
  return metric;
}

export function captureRuntimeMetric(runtime,id='runtime'){
  if(!runtime)return{id,activeEffects:[]};
  let explicit=null;
  if(typeof runtime.snapshot==='function'){
    try{explicit=jsonSafe(runtime.snapshot());}catch(error){explicit={error:String(error?.message||error)};}
  }
  const state=runtime.state||{};
  const effects=Array.isArray(state.effects)?state.effects.map(captureEffectMetric):[];
  const resources={};
  for(const [key,value] of Object.entries(state)){
    if(key==='effects')continue;
    if(typeof value==='number'||typeof value==='string'||typeof value==='boolean'||value===null)resources[key]=jsonSafe(value);
  }
  return{id,resources,activeEffects:effects,...(explicit?{snapshot:explicit}:{})};
}

function captureOptions(options={},previous={}){
  const playerInput=options.player||previous.player||{};
  const explicitAim=Number.isFinite(Number(playerInput.aimX))&&Number.isFinite(Number(playerInput.aimZ));
  const namedAim=normalizeCaptureAim(options.aim||playerInput.aim||previous.aim?.id||'right');
  const length=explicitAim?Math.hypot(Number(playerInput.aimX),Number(playerInput.aimZ)):1;
  const aim=explicitAim&&length>1e-6
    ?{id:'custom',x:Number(playerInput.aimX)/length,z:Number(playerInput.aimZ)/length,angle:Math.atan2(Number(playerInput.aimX),Number(playerInput.aimZ))}
    :{...namedAim};
  const stage=String(options.stage??previous.stage??'motion').trim().toLowerCase()||'motion';
  const explicitEffects=options.effects;
  const effects=explicitEffects===true||explicitEffects===1||explicitEffects==='1'||explicitEffects==='on'||explicitEffects==='true'
    ?true
    :explicitEffects===false||explicitEffects===0||explicitEffects==='0'||explicitEffects==='off'||explicitEffects==='false'
      ?false
      :options.stage!==undefined?stage!=='motion':(previous.effects??stage!=='motion');
  const renderMode=String(options.renderMode??previous.renderMode??(stage==='motion'?'proxy':'style')).trim().toLowerCase()||(stage==='motion'?'proxy':'style');
  return{
    arcanaId:normalizeCaptureArcanaId(options.arcanaId||options.arcana||previous.arcanaId||'DRAGON-ARC'),
    aim,
    player:{x:finite(playerInput.x)??0,z:finite(playerInput.z)??0,aimX:aim.x,aimZ:aim.z},
    camera:{mode:String(options.camera?.mode||previous.camera?.mode||'capture')},
    rngSeed:options.rngSeed??previous.rngSeed??4401,
    dummy:normalizeCaptureDummy(options.dummy||options.layout||previous.dummy||'none'),
    fixtures:normalizeCaptureFixtures(options.fixtures??previous.fixtures),
    stage,effects,renderMode,
  };
}

export function createAbilityCaptureController({
  enabled=true,
  initial={},
  resetWorld=()=>{},
  resetRuntimes=()=>{},
  castCard=()=>false,
  setAimWorld=()=>{},
  performWorldAction=()=>false,
  advanceWorld=()=>{},
  renderWorld=()=>{},
  snapshotWorld=()=>({}),
  getRuntimes=()=>({}),
  requestFrame=globalThis.requestAnimationFrame?.bind(globalThis),
  cancelFrame=globalThis.cancelAnimationFrame?.bind(globalThis),
}={}){
  const state={enabled:!!enabled,ready:false,paused:true,time:0,frame:0,raf:0,lastRafTime:null,accumulator:0,config:captureOptions(initial)};
  let random=createCaptureRandom(state.config.rngSeed);
  const withRandom=callback=>{
    const original=Math.random;Math.random=random;
    try{return callback();}finally{Math.random=original;}
  };
  const stopLoop=()=>{if(state.raf&&cancelFrame)cancelFrame(state.raf);state.raf=0;state.lastRafTime=null;state.accumulator=0;};

  function runtimes(){
    const source=getRuntimes?.()||{};
    return Object.entries(source).map(([id,runtime])=>captureRuntimeMetric(runtime,id));
  }
  function snapshot(){
    const world=jsonSafe(snapshotWorld?.()||{})||{};
    const runtime=runtimes();
    const activeEffects=runtime.flatMap(entry=>entry.activeEffects.map(effect=>({...effect,runtime:entry.id})));
    const projectiles=activeEffects.filter(effect=>effect.position&&/(projectile|dragon|flare|jet|stone|disc|shot)/i.test(effect.type));
    return{
      enabled:state.enabled,ready:state.ready,paused:state.paused,time:state.time,frame:state.frame,
      fixedDt:ABILITY_CAPTURE_FIXED_DT,arcanaId:state.config.arcanaId,aim:{...state.config.aim},
      stage:state.config.stage,effects:state.config.effects,renderMode:state.config.renderMode,
      dummy:{...state.config.dummy},fixtures:jsonSafe(state.config.fixtures),...world,activeEffects,projectiles,runtimes:runtime,
    };
  }
  function setPaused(paused=true){
    const wasPaused=state.paused;state.paused=!!paused;
    if(state.paused){stopLoop();return snapshot();}
    if(!requestFrame||state.raf)return snapshot();
    if(wasPaused){state.lastRafTime=null;state.accumulator=0;}
    const tick=timestamp=>{
      state.raf=0;if(state.paused)return;
      const now=Number(timestamp);
      if(Number.isFinite(now)){
        if(state.lastRafTime!==null){
          const elapsed=Math.max(0,Math.min(.25,(now-state.lastRafTime)/1000));
          state.accumulator+=elapsed;
          const frames=Math.min(15,Math.floor((state.accumulator+1e-9)/ABILITY_CAPTURE_FIXED_DT));
          if(frames>0){state.accumulator-=frames*ABILITY_CAPTURE_FIXED_DT;step(frames,ABILITY_CAPTURE_FIXED_DT);}
        }
        state.lastRafTime=now;
      }
      if(!state.paused)state.raf=requestFrame(tick);
    };
    state.raf=requestFrame(tick);return snapshot();
  }
  function reset(options={}){
    setPaused(true);
    state.config=captureOptions(options,state.config);
    state.time=0;state.frame=0;random=createCaptureRandom(state.config.rngSeed);
    withRandom(()=>{resetWorld({...state.config});resetRuntimes({...state.config});renderWorld({time:0,frame:0,config:state.config});});
    state.ready=true;return snapshot();
  }
  function cast(value=state.config.arcanaId,action={}){
    const card=captureCardById(value);
    if(!card)return{ok:false,error:`Unknown Wizard Arcana: ${value}`,...snapshot()};
    state.config.arcanaId=card.arcanaId;
    const casted=withRandom(()=>castCard(card,{...state.config,capture:true,input:action.input||'cast',action:jsonSafe(action)})!==false);
    renderWorld({time:state.time,frame:state.frame,config:state.config});
    return{ok:casted,card:{id:card.arcanaId,name:card.name},...snapshot()};
  }
  function setAim(value='right'){
    const source=typeof value==='string'?{aim:value}:value||{};
    const named=typeof source.aim==='string'?source.aim:(typeof value==='string'?value:undefined);
    const vectorSource=source.player||(source.aim&&typeof source.aim==='object'?source.aim:null);
    const player={...state.config.player,...(vectorSource||{})};
    if(named){
      const namedAim=normalizeCaptureAim(named);player.aimX=namedAim.x;player.aimZ=namedAim.z;
      state.config={...state.config,aim:{...namedAim},player};
    }else state.config=captureOptions({player},state.config);
    withRandom(()=>setAimWorld({...state.config.aim},{...state.config}));
    renderWorld({time:state.time,frame:state.frame,config:state.config});
    return snapshot();
  }
  function perform(action={}){
    const op=String(action.op||action.type||'').trim().toLowerCase();
    if(op==='cast'||op==='press'||op==='hold')return cast(action.arcanaId||action.id||state.config.arcanaId,{...action,input:action.input||op});
    if(op==='setaim'||op==='aim')return setAim(action.aim??action.player??action);
    if(op==='release'){
      withRandom(()=>performWorldAction({...action,op},{time:state.time,frame:state.frame,config:{...state.config}}));
      renderWorld({time:state.time,frame:state.frame,config:state.config});
      return{ok:true,action:op,...snapshot()};
    }
    const handled=withRandom(()=>performWorldAction({...action,op},{time:state.time,frame:state.frame,config:{...state.config}})!==false);
    renderWorld({time:state.time,frame:state.frame,config:state.config});
    return{ok:handled,action:op,...snapshot()};
  }
  function step(frames=1,dt=ABILITY_CAPTURE_FIXED_DT){
    const count=Math.max(0,Math.min(36000,Math.floor(Number(frames)||0)));
    const fixed=Number.isFinite(Number(dt))&&Number(dt)>0?Number(dt):ABILITY_CAPTURE_FIXED_DT;
    withRandom(()=>{
      for(let index=0;index<count;index++){
        state.frame++;state.time+=fixed;
        advanceWorld(fixed,state.time,{frame:state.frame,config:state.config});
        renderWorld({time:state.time,frame:state.frame,config:state.config});
      }
    });
    return snapshot();
  }
  function checkpoint(seconds){
    const target=Math.max(0,Number(seconds)||0),config={...state.config,player:{...state.config.player},dummy:{...state.config.dummy},camera:{...state.config.camera},fixtures:jsonSafe(state.config.fixtures)};
    reset(config);cast(config.arcanaId);return step(Math.round(target/ABILITY_CAPTURE_FIXED_DT),ABILITY_CAPTURE_FIXED_DT);
  }

  return{
    ready:()=>state.enabled&&state.ready,
    reset,cast,step,snapshot,setPaused,checkpoint,setAim,perform,act:perform,
    pause:()=>setPaused(true),play:()=>setPaused(false),
    catalog:ABILITY_CAPTURE_CARD_SUMMARIES,
    checkpoints:ABILITY_CAPTURE_CHECKPOINTS,
    get config(){return jsonSafe(state.config);},
  };
}
