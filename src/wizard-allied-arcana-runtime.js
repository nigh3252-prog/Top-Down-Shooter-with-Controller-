// Runtime for the allied-summon / destructible-field / faction-conversion
// Arcana batch. It talks only to the public arena enemy API, which keeps the
// same deterministic behavior in original, FLARE, Hades, and combined rooms.

import {ARCANA_TWEAKS_EVENT,clampArcanaSize,readArcanaTweaks} from './wizard-arcana-settings.js';

export const WIZARD_ALLIED_ARCANA_SEMANTIC_EVENT='wizard-allied-arcana-semantic';
const TAU=Math.PI*2;

export const RAPID_FIRE_AGENT_SPEC=Object.freeze({
  id:'RAPID-FIRE-AGENT',element:'Fire',cooldown:15,duration:10,hp:50,radius:.72,
  followDistance:1.7,followSpeed:7,leashDistance:9,attackRange:9,fireInterval:.4,shotSpeed:18,
  shotLife:1.1,shotRadius:.20,damage:5,knockback:10,
});
export const WARD_OF_FLAMES_SPEC=Object.freeze({
  id:'WARD-OF-FLAMES',element:'Fire',cooldown:8,duration:8,hp:50,radius:4.6,
  bodyRadius:.72,placementDistance:1.45,placementDamage:25,pulseDamage:5,pulseInterval:1,fireMultiplier:1.2,
});
export const MENTIS_IMPERIUM_SPEC=Object.freeze({
  id:'MENTIS-IMPERIUM',element:'Air',cooldown:6,damage:35,knockback:10,
  speed:15,range:7,radius:.34,
});
export const WIZARD_ALLIED_ARCANA_SPECS=Object.freeze({
  [RAPID_FIRE_AGENT_SPEC.id]:RAPID_FIRE_AGENT_SPEC,
  [WARD_OF_FLAMES_SPEC.id]:WARD_OF_FLAMES_SPEC,
  [MENTIS_IMPERIUM_SPEC.id]:MENTIS_IMPERIUM_SPEC,
});

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=value=>Number.isFinite(Number(value));
const normalize=(x,z)=>{const length=Math.hypot(x,z)||1;return{x:x/length,z:z/length};};
const targetPoint=target=>({x:Number(target?.x)||0,z:Number(target?.z)||0});
const targetRadius=target=>Math.max(.1,Number(target?.radius)||.5);
const normalizeId=value=>String(value?.arcanaId||value?.id||value||'').replace(/^WOL-/,'').toUpperCase();
const pointSegmentDistance=(point,start,end)=>{
  const dx=end.x-start.x,dz=end.z-start.z,lengthSquared=dx*dx+dz*dz||1;
  const t=clamp(((point.x-start.x)*dx+(point.z-start.z)*dz)/lengthSquared,0,1);
  return{distance:Math.hypot(point.x-(start.x+dx*t),point.z-(start.z+dz*t)),t};
};
const sweptCircleFraction=(point,start,end,radius)=>{
  const dx=end.x-start.x,dz=end.z-start.z,px=start.x-point.x,pz=start.z-point.z;
  const rr=Math.max(0,Number(radius)||0)**2,c=px*px+pz*pz-rr;
  if(c<=0)return 0;
  const a=dx*dx+dz*dz;if(a<=1e-12)return null;
  const b=2*(px*dx+pz*dz),discriminant=b*b-4*a*c;
  if(discriminant<0)return null;
  const root=(-b-Math.sqrt(discriminant))/(2*a);
  return root>=0&&root<=1?root:null;
};
const normalizeVisualMode=value=>{const mode=String(value||'').toLowerCase();return mode==='contract'||mode==='proxy'||mode==='motion'?'contract':mode==='source'||mode==='reference'?'source':'style';};
function activeVisualMode(){
  try{const params=new URLSearchParams(globalThis.location?.search||'');if(params.get('capture')!=='1')return'style';return normalizeVisualMode(window.__abilityCapture?.snapshot?.()?.stage||params.get('stage')||params.get('renderMode')||'style');}catch{return'style';}
}
function firstWallFraction(start,end,walls=[]){
  const rx=end.x-start.x,rz=end.z-start.z;let best=1;
  for(const wall of walls||[]){const a=wall?.a,b=wall?.b;if(!a||!b)continue;const sx=b.x-a.x,sz=b.z-a.z,den=rx*sz-rz*sx;if(Math.abs(den)<1e-8)continue;const qx=a.x-start.x,qz=a.z-start.z,t=(qx*sz-qz*sx)/den,u=(qx*rz-qz*rx)/den;if(t>=0&&t<=best&&u>=0&&u<=1)best=t;}
  return best;
}
export function resolveAgentLeashPosition({owner,desired,walls=[],clearance=.24}={}){
  const start=targetPoint(owner),end=targetPoint(desired),dx=end.x-start.x,dz=end.z-start.z,distance=Math.hypot(dx,dz);
  if(distance<=1e-9)return{x:start.x,z:start.z,blockedByWall:false,wallFraction:1};
  const wallFraction=firstWallFraction(start,end,walls);
  if(wallFraction>=1)return{x:end.x,z:end.z,blockedByWall:false,wallFraction:1};
  const resolvedDistance=Math.max(0,distance*wallFraction-Math.max(0,Number(clearance)||0));
  return{
    x:start.x+dx/distance*resolvedDistance,
    z:start.z+dz/distance*resolvedDistance,
    blockedByWall:true,
    wallFraction,
  };
}

function disposeObject(root){
  if(!root)return;
  root.parent?.remove?.(root);
  root.traverse?.(object=>{
    object.geometry?.dispose?.();
    const values=Array.isArray(object.material)?object.material:[object.material];
    for(const material of values)material?.dispose?.();
  });
}

function basicMaterial(THREE,options){
  const Material=THREE.MeshBasicMaterial||THREE.MeshStandardMaterial;
  return new Material(options);
}

function addPart(THREE,group,geometry,color,opacity=.9,additive=true){const part=new THREE.Mesh(geometry,basicMaterial(THREE,{color,transparent:true,opacity,depthWrite:false,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending}));part.userData||={};group.add(part);return part;}

function makeAgentVisual(THREE,scene,position,mode='style'){
  const group=new THREE.Group();group.name='Wizard Arcana Rapid Fire Agent';
  const shell=addPart(THREE,group,new THREE.DodecahedronGeometry(.64,0),0xff5a1f,.96,false);shell.position.y=.72;
  if(mode!=='contract'){
    const core=addPart(THREE,group,new THREE.DodecahedronGeometry(.31,0),0xffffdb,.98);core.position.y=.74;
    const flame=addPart(THREE,group,new THREE.ConeGeometry(.43,1.12,7),0xffa128,.88,false);flame.position.y=.23;flame.rotation.x=Math.PI;
    const halo=addPart(THREE,group,new THREE.TorusGeometry(.73,.075,6,26),0xffd176,.72);halo.rotation.x=Math.PI/2;halo.position.y=.70;
  }
  if(mode==='style')for(let index=0;index<9;index++){const mote=addPart(THREE,group,new THREE.DodecahedronGeometry(.055+(index%2)*.018,0),index%3?0xff9b35:0xffffd5,.76,index%3===0);const angle=index*TAU/9;mote.position.set(Math.cos(angle)*(.72+(index%3)*.09),.40+(index%3)*.18,Math.sin(angle)*(.72+(index%3)*.09));mote.userData.agentMote=index;}
  group.position.set(position.x,0,position.z);scene.add(group);return group;
}

function makeWardVisual(THREE,scene,position,radius,mode='style'){
  const group=new THREE.Group();group.name='Wizard Arcana Ward of Flames';
  const rune=addPart(THREE,group,new THREE.RingGeometry(radius*.80,radius*.84,48),0xa69b91,.34);rune.rotation.x=-Math.PI/2;rune.position.y=.035;rune.userData.wardRune=true;
  const count=mode==='contract'?1:mode==='source'?18:26;
  if(mode==='contract'){const ring=addPart(THREE,group,new THREE.RingGeometry(radius*.76,radius,48),0xff6b2e,.50);ring.rotation.x=-Math.PI/2;ring.position.y=.055;}
  else for(let index=0;index<count;index++){
    const angle=index*Math.PI*2/count,r=radius*(.90+Math.sin(index*2.17)*.055),lobe=addPart(THREE,group,new THREE.DodecahedronGeometry(.34+(index%3)*.07,0),index%4===0?0xffffca:index%2?0xff8b24:0xff4c16,.58+(index%3)*.10,index%4===0);
    lobe.position.set(Math.cos(angle)*r,.10+(index%3)*.055,Math.sin(angle)*r);lobe.scale.set(.62,1.05+(index%3)*.18,1.32);lobe.rotation.y=-angle;lobe.userData.wardFlame=index;
  }
  const core=addPart(THREE,group,new THREE.ConeGeometry(.48,1.35,8),0xffbd5b,.86);core.position.y=.67;
  if(mode==='style'){const hot=addPart(THREE,group,new THREE.ConeGeometry(.24,1.02,7),0xffffd7,.92);hot.position.y=.62;for(let index=0;index<8;index++){const spark=addPart(THREE,group,new THREE.DodecahedronGeometry(.055,0),index%2?0xffd171:0xff6b2e,.72);const angle=index*Math.PI/4;spark.position.set(Math.cos(angle)*radius*.72,.20+(index%3)*.13,Math.sin(angle)*radius*.72);spark.userData.wardSpark=index;}}
  group.position.set(position.x,0,position.z);scene.add(group);return group;
}

function makeProjectileVisual(THREE,scene,position,{color=0xffffff,radius=.2,name='Wizard Arcana projectile',mode='style',flame=false}={}){
  const group=new THREE.Group();group.name=name;
  const shell=addPart(THREE,group,new THREE.IcosahedronGeometry(radius*(flame?2.5:1),1),color,.94,!flame);shell.position.y=.75;
  if(mode!=='contract'){
    const core=addPart(THREE,group,new THREE.IcosahedronGeometry(radius*(flame?1.05:.55),1),flame?0xffffdd:0xf5ffff,.98);core.position.y=.75;
    const tailCount=flame?(mode==='style'?7:4):2;
    for(let index=1;index<=tailCount;index++){const smoke=addPart(THREE,group,new THREE.DodecahedronGeometry(radius*(flame?1.15:.45)*(1-index/(tailCount+3)),0),flame?(index<3?0xff8b28:0x312522):0xd6eced,Math.max(.16,.64-index*.07));smoke.position.set((index%2?1:-1)*radius*.16,.71+(index%3)*.045,-index*radius*(flame?.78:.45));smoke.userData.projectileTrail=index;}
  }
  group.position.set(position.x,0,position.z);scene.add(group);return group;
}

function makeMentisImpactVisual(THREE,scene,position,mode='style'){
  const group=new THREE.Group();group.name='Wizard Arcana Mentis Imperium charm cloud';const layers=mode==='contract'?1:mode==='source'?12:18;
  for(let index=0;index<layers;index++){const angle=index*2.399963,radius=.62+(index%5)*.48,cloud=addPart(THREE,group,new THREE.DodecahedronGeometry(.72+(index%4)*.18,0),index%3===0?0xffffff:index%2?0xcbd5d8:0x879196,.25+(index%4)*.08);cloud.position.set(Math.cos(angle)*radius,.45+(index%4)*.28,Math.sin(angle)*radius);cloud.userData.charmCloud=index;}
  if(mode==='style')for(let index=0;index<14;index++){const angle=index*Math.PI/7,heart=addPart(THREE,group,new THREE.ConeGeometry(.13,.42,5),index%2?0xff768f:0xffb0bd,.82);heart.position.set(Math.cos(angle)*(1.8+(index%4)*.42),.62+(index%4)*.34,Math.sin(angle)*(1.8+(index%4)*.42));heart.rotation.z=Math.PI;heart.userData.charmHeart=index;}
  group.position.set(position.x,0,position.z);scene.add(group);return group;
}

function makeSpawnBurstVisual(THREE,scene,position,{mode='style',radius=1,kind='agent'}={}){
  const group=new THREE.Group();group.name=`Wizard Arcana ${kind} spawn flash`;
  const flash=addPart(THREE,group,new THREE.RingGeometry(0,radius*(kind==='ward' ? .95 : .62),44),0xffffee,.88);flash.rotation.x=-Math.PI/2;flash.position.y=.08;
  if(mode!=='contract')for(let index=0;index<(kind==='ward'?14:8);index++){const angle=index*Math.PI*2/(kind==='ward'?14:8),petal=addPart(THREE,group,new THREE.DodecahedronGeometry(radius*(.08+(index%3)*.025),0),index%3===0?0xffffdc:index%2?0xff8b28:0xff4b18,.78);petal.position.set(Math.cos(angle)*radius*(.28+(index%3)*.18),.12+(index%3)*.08,Math.sin(angle)*radius*(.28+(index%3)*.18));petal.userData.spawnPetal=index;}
  group.position.set(position.x,0,position.z);scene.add(group);return group;
}

export function installWizardAlliedArcanaRuntime({
  THREE,scene,getPlayer=()=>null,getEnemySystem=()=>null,getMazeSegments=()=>[],onSemanticEvent=null,
}={}){
  if(!THREE||!scene)throw new Error('installWizardAlliedArcanaRuntime requires THREE and scene');
  const effects=[];
  const cooldowns=new Map();
  const semanticEvents=[];
  const castCounters=new Map();
  const initialTweaks=readArcanaTweaks();
  const state={effects,cooldowns,sizeMultiplier:initialTweaks.sizeMultiplier,renderMode:activeVisualMode()};
  let disposed=false,time=0;

  const system=()=>{try{return getEnemySystem?.()||null;}catch{return null;}};
  const faction=()=>system()?.factionService||null;
  function stableTargetId(target){
    return faction()?.enemyStableId?.(target)||String(target?.wizardStableId||target?.stableId||target?.id||target?.kind||'enemy');
  }
  function hostileEnemies(){
    const value=system();
    const values=value?.hostileEnemies||value?.enemies?.filter?.(enemy=>(faction()?.arenaFactionOf?.(enemy)||enemy.wizardFaction||'hostile')==='hostile')||[];
    return values.filter(enemy=>enemy&&Number(enemy.hp)>0);
  }
  function aliveEnemies(){return(system()?.enemies||[]).filter(enemy=>enemy&&Number(enemy.hp)>0);}
  function nearestHostile(position,maxDistance=Infinity){
    const candidates=hostileEnemies();
    const direct=system()?.getNearestHostile?.(position);
    if(direct&&Number(direct.hp)>0&&!candidates.includes(direct)&&(faction()?.arenaFactionOf?.(direct)||direct.wizardFaction||'hostile')==='hostile')candidates.push(direct);
    const maximum=Number.isFinite(Number(maxDistance))?Math.max(0,Number(maxDistance)):Infinity,maximumSquared=maximum*maximum;
    return candidates.filter(enemy=>{
      const dx=(Number(enemy.x)||0)-(Number(position.x)||0),dz=(Number(enemy.z)||0)-(Number(position.z)||0);
      return dx*dx+dz*dz<=maximumSquared+1e-9;
    }).sort((a,b)=>{
      const da=(a.x-position.x)**2+(a.z-position.z)**2,db=(b.x-position.x)**2+(b.z-position.z)**2;
      return da-db||stableTargetId(a).localeCompare(stableTargetId(b),'en',{numeric:true});
    })[0]||null;
  }
  function firstHostileContact(start,end,radius){
    const contacts=[];
    const walls=getMazeSegments?.()||[];
    for(const enemy of hostileEnemies()){
      // Expanded enemy colliders may begin in front of a thin wall even when
      // the target itself is behind it. Center-to-center occlusion keeps that
      // overlap from winning before the projectile's wall contact.
      if(firstWallFraction(start,{x:Number(enemy.x)||0,z:Number(enemy.z)||0},walls)<1-1e-9)continue;
      const t=sweptCircleFraction(enemy,start,end,radius+targetRadius(enemy));
      if(t!==null)contacts.push({enemy,t,id:stableTargetId(enemy)});
    }
    contacts.sort((a,b)=>a.t-b.t||a.id.localeCompare(b.id,'en',{numeric:true}));
    return contacts[0]||null;
  }
  function semantic(kind,detail={}){
    const event={kind,time:Number(time.toFixed(6)),...detail};semanticEvents.push(event);onSemanticEvent?.(event);
    if(typeof window!=='undefined'&&typeof window.dispatchEvent==='function'&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent(WIZARD_ALLIED_ARCANA_SEMANTIC_EVENT,{detail:event}));
    return event;
  }
  function nextStableId(id){
    const next=(castCounters.get(id)||0)+1;castCounters.set(id,next);
    return`${id}:${String(next).padStart(4,'0')}`;
  }
  const currentSize=()=>clampArcanaSize(state.sizeMultiplier);
  function add(effect){effects.push(effect);return effect;}
  function remove(effect,reason='finished'){
    const index=effects.indexOf(effect);if(index<0)return false;
    effects.splice(index,1);
    if(effect.type==='agent'||effect.type==='ward')system()?.unregisterAlliedTarget?.(effect.stableId);
    if(effect.modifierId)system()?.unregisterDamageModifier?.(effect.modifierId);
    effect.active=false;disposeObject(effect.mesh);
    semantic(`${effect.type}-removed`,{arcanaId:effect.arcanaId,stableId:effect.stableId,reason,hp:finite(effect.hp)?Math.max(0,effect.hp):undefined});
    return true;
  }
  function setCooldown(spec){cooldowns.set(spec.id,spec.cooldown);}
  function canCast(value){const id=normalizeId(value);return !!WIZARD_ALLIED_ARCANA_SPECS[id]&&(cooldowns.get(id)||0)<=0&&!disposed&&!!system();}

  function damageEnemy(enemy,amount,knockback,{arcanaId,stableId,element,extra={}}){
    if(!enemy||Number(enemy.hp)<=0)return false;
    const direction=normalize((enemy.x||0)-(extra.origin?.x||0),(enemy.z||0)-(extra.origin?.z||0));
    const before=Number(enemy.hp),killed=system()?.damageEnemy?.(enemy,amount,{x:direction.x*knockback,z:direction.z*knockback},{
      source:'wizardArcana',power:.34,pop:.06,arcanaId,sourceId:stableId,sourceFaction:'allied',element,...extra,
    });
    return killed===true||Number(enemy.hp)<before;
  }

  function damageCircle(position,radius,amount,knockback,meta){
    const targets=aliveEnemies().filter(enemy=>Math.hypot(enemy.x-position.x,enemy.z-position.z)<=radius+targetRadius(enemy));
    targets.sort((a,b)=>stableTargetId(a).localeCompare(stableTargetId(b),'en',{numeric:true}));
    for(const enemy of targets)damageEnemy(enemy,amount,knockback,{...meta,extra:{...(meta.extra||{}),origin:position}});
    return targets;
  }

  function spawnAgent(origin,spec,stableId){
    const size=currentSize();
    add({type:'alliedTransient',arcanaId:spec.id,stableId:`${stableId}:spawn`,active:true,age:0,life:.32,x:origin.x,z:origin.z,mesh:makeSpawnBurstVisual(THREE,scene,origin,{mode:state.renderMode,radius:1.1*size,kind:'agent'}),visualMode:state.renderMode});
    const effect=add({
      type:'agent',arcanaId:spec.id,stableId,active:true,age:0,life:spec.duration,hp:spec.hp,maxHp:spec.hp,
      x:origin.x,z:origin.z,radius:spec.radius*size,nextShot:0,spec,size,visualMode:state.renderMode,mesh:makeAgentVisual(THREE,scene,origin,state.renderMode),
    });
    effect.mesh.scale?.set?.(size,size,size);
    effect.onDamage=(amount,knock,options={})=>{
      if(!effect.active||effect.hp<=0)return false;
      effect.hp=Math.max(0,effect.hp-Math.max(0,Number(amount)||0));
      semantic('ally-damaged',{arcanaId:spec.id,stableId,damage:Math.max(0,Number(amount)||0),hp:effect.hp,sourceEnemyId:options.sourceEnemyId||null});
      if(effect.hp<=0)remove(effect,'destroyed');return true;
    };
    system()?.registerAlliedTarget?.(effect);
    semantic('agent-summoned',{arcanaId:spec.id,stableId,hp:spec.hp,duration:spec.duration,position:{x:effect.x,z:effect.z}});
    return effect;
  }

  function spawnWard(origin,spec,stableId){
    const size=currentSize();
    add({type:'alliedTransient',arcanaId:spec.id,stableId:`${stableId}:spawn`,active:true,age:0,life:.40,x:origin.x,z:origin.z,mesh:makeSpawnBurstVisual(THREE,scene,origin,{mode:state.renderMode,radius:spec.radius*size,kind:'ward'}),visualMode:state.renderMode});
    const effect=add({
      type:'ward',arcanaId:spec.id,stableId,active:true,age:0,life:spec.duration,hp:spec.hp,maxHp:spec.hp,
      x:origin.x,z:origin.z,radius:spec.bodyRadius*size,fieldRadius:spec.radius*size,nextPulse:spec.pulseInterval,spec,size,
      visualMode:state.renderMode,mesh:makeWardVisual(THREE,scene,origin,spec.radius*size,state.renderMode),modifierId:`${stableId}:fire-field`,
    });
    effect.onDamage=(amount,knock,options={})=>{
      if(!effect.active||effect.hp<=0)return false;
      effect.hp=Math.max(0,effect.hp-Math.max(0,Number(amount)||0));
      semantic('ally-damaged',{arcanaId:spec.id,stableId,damage:Math.max(0,Number(amount)||0),hp:effect.hp,sourceEnemyId:options.sourceEnemyId||null});
      if(effect.hp<=0)remove(effect,'destroyed');return true;
    };
    system()?.registerAlliedTarget?.(effect);
    system()?.registerDamageModifier?.({
      id:effect.modifierId,priority:20,
      apply:({target,element,options})=>{
        if(!effect.active||options.ignoreWardAmplification||options.source!=='wizardArcana'||String(element).toLowerCase()!=='fire')return null;
        if(Math.hypot((target.x||0)-effect.x,(target.z||0)-effect.z)>effect.fieldRadius+targetRadius(target))return null;
        return{multiplier:spec.fireMultiplier,stackKey:'ward-of-flames-fire-amplification'};
      },
    });
    const placed=damageCircle(origin,effect.fieldRadius,spec.placementDamage,0,{arcanaId:spec.id,stableId,element:'Fire',extra:{placement:true,ignoreWardAmplification:true}});
    semantic('ward-placed',{arcanaId:spec.id,stableId,hp:spec.hp,duration:spec.duration,position:{...origin},placementDamage:spec.placementDamage,targetIds:placed.map(stableTargetId)});
    return effect;
  }

  function spawnMentis(origin,direction,spec,stableId){
    const size=currentSize();
    const effect=add({
      type:'mentisArrow',arcanaId:spec.id,stableId,active:true,age:0,life:spec.range/spec.speed,
      x:origin.x,z:origin.z,previous:{...origin},direction:{...direction},radius:spec.radius*size,spec,size,
      visualMode:state.renderMode,mesh:makeProjectileVisual(THREE,scene,origin,{color:0xf5ffff,radius:spec.radius*.48*size,name:'Wizard Arcana Mentis Imperium cloudy arrow',mode:state.renderMode}),
    });
    semantic('mentis-arrow-fired',{arcanaId:spec.id,stableId,position:{...origin},direction:{...direction},damage:spec.damage});
    return effect;
  }

  function cast(card){
    const id=normalizeId(card),spec=WIZARD_ALLIED_ARCANA_SPECS[id];
    if(!spec)return false;
    if(!system()){semantic('cast-rejected',{arcanaId:id,reason:'arena-unavailable',cooldown:cooldowns.get(id)||0});return false;}
    if(!canCast(id)){semantic('cast-rejected',{arcanaId:id,reason:'cooldown',cooldown:cooldowns.get(id)||0});return false;}
    const player=getPlayer?.();if(!player||!finite(player.x)||!finite(player.z)){semantic('cast-rejected',{arcanaId:id,reason:'no-player'});return false;}
    let origin=targetPoint(player);const direction=normalize(Number(player.forwardX)||0,Number(player.forwardZ)||1),stableId=nextStableId(id);
    if(id===WARD_OF_FLAMES_SPEC.id){const desired={x:origin.x+direction.x*spec.placementDistance,z:origin.z+direction.z*spec.placementDistance},fraction=firstWallFraction(origin,desired,getMazeSegments?.()||[]),resolvedDistance=fraction<1?Math.max(0,spec.placementDistance*fraction-.22):spec.placementDistance;origin={x:origin.x+direction.x*resolvedDistance,z:origin.z+direction.z*resolvedDistance};}
    if(id===RAPID_FIRE_AGENT_SPEC.id)spawnAgent(origin,spec,stableId);
    else if(id===WARD_OF_FLAMES_SPEC.id)spawnWard(origin,spec,stableId);
    else spawnMentis(origin,direction,spec,stableId);
    setCooldown(spec);semantic('cast-accepted',{arcanaId:id,stableId,cooldown:spec.cooldown});return true;
  }

  function spawnAgentShot(agent,target){
    const origin={x:agent.x,z:agent.z},direction=normalize(target.x-origin.x,target.z-origin.z);
    const index=(agent.shotCount=(agent.shotCount||0)+1),stableId=`${agent.stableId}:shot:${String(index).padStart(2,'0')}`;
    const mesh=makeProjectileVisual(THREE,scene,origin,{color:0xff8d2c,radius:agent.spec.shotRadius*agent.size,name:'Wizard Arcana Rapid Fire Agent shot',mode:state.renderMode,flame:true});mesh.rotation.y=Math.atan2(direction.x,direction.z);
    add({type:'agentShot',arcanaId:agent.arcanaId,stableId,active:true,age:0,life:agent.spec.shotLife,x:origin.x,z:origin.z,previous:{...origin},direction,target,spec:agent.spec,size:agent.size,radius:agent.spec.shotRadius*agent.size,visualMode:state.renderMode,mesh});
    semantic('agent-shot-fired',{arcanaId:agent.arcanaId,stableId,agentId:agent.stableId,targetId:stableTargetId(target)});
  }

  function updateAgent(effect,dt){
    effect.age+=dt;
    const player=getPlayer?.();
    if(player){
      const forward=normalize(Number(player.forwardX)||0,Number(player.forwardZ)||1),desired={x:player.x-forward.x*effect.spec.followDistance,z:player.z-forward.z*effect.spec.followDistance};
      const ownerDistance=Math.hypot(effect.x-player.x,effect.z-player.z);
      if(ownerDistance>effect.spec.leashDistance){
        const resolved=resolveAgentLeashPosition({owner:player,desired,walls:getMazeSegments?.()||[],clearance:effect.radius*.42});
        effect.x=resolved.x;effect.z=resolved.z;
        semantic('agent-leash-teleport',{arcanaId:effect.arcanaId,stableId:effect.stableId,position:{x:effect.x,z:effect.z},desiredPosition:{...desired},blockedByWall:resolved.blockedByWall});
      }
      else{const dx=desired.x-effect.x,dz=desired.z-effect.z,distance=Math.hypot(dx,dz);if(distance>.12){const step=Math.min(distance,effect.spec.followSpeed*dt),start={x:effect.x,z:effect.z},requested={x:effect.x+dx/distance*step,z:effect.z+dz/distance*step},fraction=firstWallFraction(start,requested,getMazeSegments?.()||[]),travel=fraction<1?Math.max(0,step*fraction-effect.radius*.12):step;effect.x+=dx/distance*travel;effect.z+=dz/distance*travel;}}
      effect.mesh.position.set(effect.x,0,effect.z);
    }
    while(effect.nextShot<=Math.min(effect.age,effect.life)-1e-9){
      const target=nearestHostile(effect,effect.spec.attackRange*effect.size);if(target)spawnAgentShot(effect,target);
      effect.nextShot+=effect.spec.fireInterval;
    }
    if(effect.age+1e-9>=effect.life)remove(effect,'expired');
  }

  function updateWard(effect,dt){
    effect.age+=dt;
    while(effect.nextPulse<=Math.min(effect.age,effect.life)+1e-9){
      const targets=damageCircle(effect,effect.fieldRadius,effect.spec.pulseDamage,0,{arcanaId:effect.arcanaId,stableId:`${effect.stableId}:pulse:${String(Math.round(effect.nextPulse/effect.spec.pulseInterval)).padStart(2,'0')}`,element:'Fire',extra:{pulse:true}});
      semantic('ward-pulse',{arcanaId:effect.arcanaId,stableId:effect.stableId,at:effect.nextPulse,rawDamage:effect.spec.pulseDamage,amplifiedDamage:effect.spec.pulseDamage*effect.spec.fireMultiplier,targetIds:targets.map(stableTargetId)});
      effect.nextPulse+=effect.spec.pulseInterval;
    }
    effect.mesh?.children?.forEach((child,index)=>{if(child.userData?.wardFlame!==undefined)child.scale.y=1+Math.sin(time*8+index)*.16;if(child.userData?.wardSpark!==undefined)child.position.y+=Math.sin(time*9+index)*dt*.08;});
    if(effect.age+1e-9>=effect.life)remove(effect,'expired');
  }

  function updateAgentShot(effect,dt){
    effect.age+=dt;effect.previous={x:effect.x,z:effect.z};
    const requested={x:effect.x+effect.direction.x*effect.spec.shotSpeed*dt,z:effect.z+effect.direction.z*effect.spec.shotSpeed*dt};
    const wallFraction=firstWallFraction(effect.previous,requested,getMazeSegments?.()||[]),contact=firstHostileContact(effect.previous,requested,effect.radius);
    if(wallFraction<1&&(!contact||wallFraction<=contact.t+1e-9)){
      effect.x=effect.previous.x+(requested.x-effect.previous.x)*wallFraction;effect.z=effect.previous.z+(requested.z-effect.previous.z)*wallFraction;effect.mesh.position.set(effect.x,0,effect.z);
      semantic('agent-shot-fizzled',{arcanaId:effect.arcanaId,stableId:effect.stableId,reason:'wall',position:{x:effect.x,z:effect.z},damage:0});remove(effect,'wall');return;
    }
    if(contact){
      effect.x=effect.previous.x+(requested.x-effect.previous.x)*contact.t;effect.z=effect.previous.z+(requested.z-effect.previous.z)*contact.t;effect.mesh.position.set(effect.x,0,effect.z);
      damageEnemy(contact.enemy,effect.spec.damage,effect.spec.knockback,{arcanaId:effect.arcanaId,stableId:effect.stableId,element:'Fire',extra:{origin:effect.previous,agentShot:true,targetId:contact.id}});
      semantic('agent-shot-hit',{arcanaId:effect.arcanaId,stableId:effect.stableId,targetId:contact.id,selectedTargetId:effect.target?stableTargetId(effect.target):null,damage:effect.spec.damage,knockback:effect.spec.knockback});remove(effect,'hit');return;
    }
    effect.x=requested.x;effect.z=requested.z;effect.mesh.position.set(effect.x,0,effect.z);effect.mesh.rotation.y=Math.atan2(effect.direction.x,effect.direction.z);
    if(effect.age+1e-9>=effect.life)remove(effect,'range');
  }

  function updateMentisArrow(effect,dt){
    effect.age+=dt;effect.previous={x:effect.x,z:effect.z};
    const requested={x:effect.x+effect.direction.x*effect.spec.speed*dt,z:effect.z+effect.direction.z*effect.spec.speed*dt};
    const wallFraction=firstWallFraction(effect.previous,requested,getMazeSegments?.()||[]),contact=firstHostileContact(effect.previous,requested,effect.radius);
    if(wallFraction<1&&(!contact||wallFraction<=contact.t+1e-9)){
      effect.x=effect.previous.x+(requested.x-effect.previous.x)*wallFraction;effect.z=effect.previous.z+(requested.z-effect.previous.z)*wallFraction;effect.mesh.position.set(effect.x,0,effect.z);
      semantic('mentis-arrow-fizzled',{arcanaId:effect.arcanaId,stableId:effect.stableId,reason:'wall',position:{x:effect.x,z:effect.z},damage:0,charmed:false});remove(effect,'wall');return;
    }
    if(contact){
      effect.x=effect.previous.x+(requested.x-effect.previous.x)*contact.t;effect.z=effect.previous.z+(requested.z-effect.previous.z)*contact.t;effect.mesh.position.set(effect.x,0,effect.z);
      const eligible=faction()?.isCharmEligible?.(contact.enemy)??true;
      damageEnemy(contact.enemy,effect.spec.damage,effect.spec.knockback,{arcanaId:effect.arcanaId,stableId:effect.stableId,element:effect.spec.element,extra:{origin:effect.previous,mentisArrow:true}});
      const impactMesh=makeMentisImpactVisual(THREE,scene,{x:contact.enemy.x,z:contact.enemy.z},state.renderMode);add({type:'mentisImpact',arcanaId:effect.arcanaId,stableId:`${effect.stableId}:cloud`,active:true,age:0,life:.52,x:contact.enemy.x,z:contact.enemy.z,mesh:impactMesh,visualMode:state.renderMode});
      const charm=eligible&&Number(contact.enemy.hp)>0?(system()?.charmEnemy?.(contact.enemy,{sourceId:effect.stableId})||faction()?.charmEnemy?.(contact.enemy,{sourceId:effect.stableId})):null;
      semantic('mentis-arrow-hit',{arcanaId:effect.arcanaId,stableId:effect.stableId,targetId:contact.id,damage:effect.spec.damage,charmed:!!charm?.accepted,immune:!eligible});remove(effect,'hit');return;
    }
    effect.x=requested.x;effect.z=requested.z;effect.mesh.position.set(effect.x,0,effect.z);
    if(effect.age+1e-9>=effect.life)remove(effect,'range');
  }

  function update(dt){
    if(disposed)return;
    const elapsed=Math.max(0,Number(dt)||0);time+=elapsed;
    for(const [id,value] of cooldowns)cooldowns.set(id,Math.max(0,value-elapsed));
    for(const effect of [...effects]){
      if(!effects.includes(effect))continue;
      if(effect.type==='agent')updateAgent(effect,elapsed);
      else if(effect.type==='ward')updateWard(effect,elapsed);
      else if(effect.type==='agentShot')updateAgentShot(effect,elapsed);
      else if(effect.type==='mentisArrow')updateMentisArrow(effect,elapsed);
      else if(effect.type==='mentisImpact'){effect.age+=elapsed;const progress=clamp(effect.age/effect.life,0,1);effect.mesh?.scale?.set?.(1+progress*1.45,1+progress*.55,1+progress*1.45);effect.mesh?.traverse?.(child=>{if(child.material)child.material.opacity=Math.max(0,(child.material.opacity||.5)*(1-elapsed/effect.life));});if(progress>=1)remove(effect,'faded');}
      else if(effect.type==='alliedTransient'){effect.age+=elapsed;const progress=clamp(effect.age/effect.life,0,1);effect.mesh?.scale?.set?.(1+progress*.65,1,1+progress*.65);effect.mesh?.traverse?.(child=>{if(child.material)child.material.opacity=Math.max(0,(child.material.opacity||.7)*(1-elapsed/effect.life));});if(progress>=1)remove(effect,'faded');}
    }
  }

  function reset(){
    for(const effect of [...effects])remove(effect,'reset');
    system()?.releaseCharmedEnemy?.();faction()?.releaseCharm?.();
    cooldowns.clear();castCounters.clear();semanticEvents.length=0;time=0;state.renderMode=activeVisualMode();
  }
  const onPlay=event=>cast(event?.detail?.card||event?.detail);
  const onTweaks=event=>{state.sizeMultiplier=clampArcanaSize(event?.detail?.sizeMultiplier);};
  if(typeof window!=='undefined'){
    window.addEventListener?.('wizard-arcana:play',onPlay);
    window.addEventListener?.(ARCANA_TWEAKS_EVENT,onTweaks);
  }
  function dispose(){
    if(disposed)return;reset();disposed=true;
    if(typeof window!=='undefined'){
      window.removeEventListener?.('wizard-arcana:play',onPlay);
      window.removeEventListener?.(ARCANA_TWEAKS_EVENT,onTweaks);
    }
  }
  function snapshot(){
    return{
      time,renderMode:state.renderMode,cooldowns:Object.fromEntries([...cooldowns].map(([id,value])=>[id,Number(value.toFixed(6))])),
      effects:effects.map(effect=>({type:effect.type,arcanaId:effect.arcanaId,stableId:effect.stableId,age:Number(effect.age.toFixed(6)),life:effect.life,x:effect.x,z:effect.z,hp:finite(effect.hp)?effect.hp:undefined,targetId:effect.target?stableTargetId(effect.target):undefined})),
      charmedTargetId:faction()?.charmedEnemy?stableTargetId(faction().charmedEnemy):null,
      // Keep the complete 25-shot lifecycle plus its late expiry/cleanup in the
      // rolling capture window without allowing unbounded quadratic traces.
      semanticEvents:semanticEvents.slice(-128).map(event=>({...event})),
    };
  }

  return{cast,canCast,update,reset,dispose,snapshot,state,effects,cooldowns,specs:WIZARD_ALLIED_ARCANA_SPECS};
}
