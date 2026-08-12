import {
  ARCANA_TWEAKS_EVENT,
  clampArcanaSize,
  readArcanaTweaks,
} from './wizard-arcana-settings.js';
import { getArenaRuntimeConfig } from './arena-runtime-context.js';
import { dashDistance } from './basic-dash-logic.js';
import { createWizardVfxSourcePort } from './wizard-vfx-arcana-source-port.js';
import { createWizardLightningSourcePort } from './wizard-lightning-arcana-source-port.js';
import { createWizardEarthArcanaSourcePort } from './wizard-earth-arcana-source-port.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const sat=value=>clamp(Number(value)||0,0,1);
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=value=>{const t=sat(value);return t*t*(3-2*t);};
const easeOut=value=>1-Math.pow(1-sat(value),3);

const VFX_IDS=Object.freeze(new Set([
  'FLAME-BREATH','SEARING-CROWN','IGNITION-DRIVE','ENGULFING-FISSURE','DRAGON-BLAST',
  'SHEARING-CHAIN','TECTONIC-DRILL','ROCK-SOLID-TOMAHAWK','AQUA-VORTEX','AQUA-BREAKER',
  'TERRA-RING','GRASPING-EARTH','SHOCK-NOVA','STAR-BOLT',
]));

// The copied Shearing Chain source moves its caster from local X -4.2 to
// +2.4. The shared dash controller still owns the actual collision-checked
// locomotion; this multiplier maps that authored 6.6-tile source route onto
// the current four-diameter dash distance and then applies Arcana Size.
const SHEARING_CHAIN_SOURCE_ROUTE=2.4-(-4.2);

export const WIZARD_VFX_ARCANA_SPECS=Object.freeze({
  'FLAME-BREATH':Object.freeze({life:.95,damage:18,hits:3}),
  'SEARING-CROWN':Object.freeze({life:1.60,tickDamage:5,ticks:5,finisherDamage:20}),
  'IGNITION-DRIVE':Object.freeze({life:1.30,beats:5,carryDamage:10,finisherDamage:30}),
  'ENGULFING-FISSURE':Object.freeze({life:3.20,trapCount:3,tickDamage:5,ticks:5}),
  'DRAGON-BLAST':Object.freeze({life:1.55,pullDamage:8,pulls:5,finisherDamage:24}),
  'SHEARING-CHAIN':Object.freeze({life:1.35,slashes:6,slashDamage:7,finisherDamage:15}),
  'TECTONIC-DRILL':Object.freeze({life:1.60,damage:10,speed:9.4}),
  'ROCK-SOLID-TOMAHAWK':Object.freeze({life:2.10,damage:15}),
  'AQUA-VORTEX':Object.freeze({life:.80,damage:12,ticks:1}),
  'AQUA-BREAKER':Object.freeze({life:3.50,charge:1.90,entryDamage:15,passDamage:10,finisherDamage:35}),
  'TERRA-RING':Object.freeze({life:2.60,damage:15,hits:5}),
  'GRASPING-EARTH':Object.freeze({life:5.40,impactDamage:10,tickDamage:3,ticks:5,finisherDamage:25}),
  'SHOCK-NOVA':Object.freeze({life:5.60,charge:1.43,radius:2.10,damage:12}),
  'STAR-BOLT':Object.freeze({life:4.10,damage:8,speed:20,range:9}),
});

function isEnemyLabRuntime(){
  try{
    const config=getArenaRuntimeConfig();
    if(config)return config.mode==='arena'||config.enemyLab;
    const params=new URLSearchParams(location.search||'');
    return params.get('enemyLab')==='1'||params.get('mode')==='enemy-lab'||/(?:^|\/)combat-arena\.html$/i.test(location.pathname||'');
  }catch{return false;}
}

function normalize2(x,z,fallback={x:0,z:1}){
  const length=Math.hypot(Number(x)||0,Number(z)||0);
  return length>1e-6?{x:x/length,z:z/length}:{...fallback};
}

function playerFrame(getPlayer){
  const player=getPlayer?.()||{};
  const forward=normalize2(Number(player.forwardX)||0,Number(player.forwardZ)||1);
  return{
    x:Number(player.x)||0,
    z:Number(player.z)||0,
    forward,
    right:{x:forward.z,z:-forward.x},
  };
}

function enemyRadius(enemy,system){
  return Math.max(.42,(Number(enemy?.radius)||1)*(Number(system?.heightScale)||1)*.72);
}

function aliveEnemies(system){
  return(system?.enemies||[]).filter(enemy=>enemy&&Number(enemy.hp)>0);
}

function pointSegmentDistance2D(point,a,b){
  const abx=b.x-a.x,abz=b.z-a.z,apx=point.x-a.x,apz=point.z-a.z;
  const denom=abx*abx+abz*abz;
  const t=denom>1e-8?clamp((apx*abx+apz*abz)/denom,0,1):0;
  return Math.hypot(point.x-(a.x+abx*t),point.z-(a.z+abz*t));
}

function damageEnemy(system,enemy,amount,knock={x:0,z:0},options={}){
  if(!system||!enemy||Number(enemy.hp)<=0)return false;
  if(typeof system.damageEnemy==='function')return system.damageEnemy(enemy,amount,knock,{source:'wizardArcana',power:.34,pop:.06,...options});
  enemy.hp=Math.max(0,(Number(enemy.hp)||0)-Math.max(0,Number(amount)||0));
  enemy.flash=Math.max(Number(enemy.flash)||0,.08);
  return true;
}

function moveEnemy(system,enemy,position){
  if(!enemy||Number(enemy.hp)<=0)return false;
  if(typeof system?.moveEnemyResolved==='function')return system.moveEnemyResolved(enemy,{x:position.x,z:position.z},{resetVelocity:true})!==false;
  enemy.x=position.x;enemy.z=position.z;return true;
}

function applyStatus(system,enemy,kind,duration,options={}){
  return typeof system?.applyStatus==='function'&&system.applyStatus(enemy,kind,duration,options)!==false;
}

function hostileProjectiles(system){
  const values=system?.hostileProjectiles;
  return Array.isArray(values)?values.filter(projectile=>projectile&&!projectile.dead&&projectile.life!==0):[];
}

function destroyProjectile(system,projectile){
  if(!projectile||projectile.dead)return false;
  const result=system?.destroyHostileProjectile?.(projectile);
  if(result===false)return false;
  projectile.dead=true;projectile.life=0;
  if(projectile.mesh)projectile.mesh.visible=false;
  return true;
}

function destroyProjectiles(system,position,radius){
  for(const projectile of hostileProjectiles(system)){
    const distance=Math.hypot((Number(projectile.x)||0)-position.x,(Number(projectile.z)||0)-position.z);
    if(distance<=radius+(Number(projectile.r??projectile.radius)||.16))destroyProjectile(system,projectile);
  }
}

function disposeObject(root){
  if(!root)return;
  root.parent?.remove(root);
  root.traverse?.(object=>{
    object.geometry?.dispose?.();
    if(Array.isArray(object.material))object.material.forEach(material=>material?.dispose?.());
    else object.material?.dispose?.();
  });
}

// The authoritative visual implementation lives in wizard-vfx-arcana-source-port.js.
// This runtime owns only game-service adapters and card lifecycle.
function pointInCone({origin,forward,target,reach,halfAngle,radius=0}){
  const dx=target.x-origin.x,dz=target.z-origin.z,distance=Math.hypot(dx,dz);
  if(distance>reach+radius||distance<.01)return false;
  const dot=(dx*forward.x+dz*forward.z)/distance;
  const padding=Math.asin(clamp(radius/Math.max(distance,radius||1),0,1));
  return Math.acos(clamp(dot,-1,1))<=halfAngle+padding;
}

function positionAlong(origin,direction,distance){return{x:origin.x+direction.x*distance,z:origin.z+direction.z*distance};}
function distance2D(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
const STANDALONE_SOURCE_BASE_SCALE=2;

export function installWizardVfxArcanaRuntime({
  THREE,scene,camera,getPlayer,getEnemySystem,getMazeSegments=()=>[],startDashMotion=()=>null,translatePlayer=()=>false,
}={}){
  const initialTweaks=readArcanaTweaks();
  const empty={state:{effects:[],sizeMultiplier:initialTweaks.sizeMultiplier},canPlay(){return false;},play(){return false;},update(){},reset(){},snapshot(){return[];},dispose(){}};
  if(!THREE||!scene||!isEnemyLabRuntime())return empty;

  const sourcePort=createWizardVfxSourcePort({THREE,scene});
  const state={effects:[],castSerial:0,lastCast:null,sizeMultiplier:initialTweaks.sizeMultiplier};
  const currentSize=()=>clampArcanaSize(state.sizeMultiplier);
  const add=effect=>{state.effects.push(effect);return effect;};
  function remove(effect){
    effect.onRemove?.();
    if(effect.source){
      if(effect.standaloneSource)effect.source.dispose?.();
      else sourcePort.dispose(effect.source);
    }
    if(effect.mesh)disposeObject(effect.mesh);
    for(const mesh of effect.meshes||[])disposeObject(mesh);
    for(const impact of effect.impacts||[])disposeObject(impact.mesh||impact);
    const index=state.effects.indexOf(effect);if(index>=0)state.effects.splice(index,1);
  }
  function reset(){for(const effect of[...state.effects])remove(effect);state.castSerial=0;state.lastCast=null;}
  function crossed(effect,time){return effect.previousAge<time&&effect.age>=time;}
  function advance(effect,dt){effect.previousAge=effect.age;effect.age+=Math.max(0,Number(dt)||0);}
  function intercept(position,radius,system){destroyProjectiles(system,position,radius);}
  const fallbackCameraQuaternion=new THREE.Quaternion();
  const sourceWorldQuaternion=new THREE.Quaternion();
  const sourceLocalCameraQuaternion=new THREE.Quaternion();
  function sourceAnchor(frame,casterOffset,size,applyScale=true){
    const anchor=new THREE.Group();
    anchor.position.set(
      frame.x-frame.forward.x*casterOffset*size,
      0,
      frame.z-frame.forward.z*casterOffset*size,
    );
    // The lab authors every effect along local +X; rotate that axis onto the
    // game aim vector without changing any source geometry or choreography.
    anchor.rotation.y=Math.atan2(-frame.forward.z,frame.forward.x);
    if(applyScale)anchor.scale.setScalar(size);
    scene.add(anchor);
    return anchor;
  }
  function sourceTarget(enemy,effect){
    const anchor=effect.mesh;
    const dx=(Number(enemy?.x)||0)-(Number(anchor?.position?.x)||0);
    const dz=(Number(enemy?.z)||0)-(Number(anchor?.position?.z)||0);
    const frame=effect.frame,size=Math.max(.0001,Number(effect.sourceSize??effect.size)||1);
    const cache=effect.sourceTargets??(effect.sourceTargets=new Map());
    let target=cache.get(enemy);
    if(!target){
      target={
        enemy,
        position:{x:0,z:0,set(x,y,z){this.x=x;this.z=z;}},
        userData:{},
      };
      cache.set(enemy,target);
    }
    target.enemy=enemy;
    target.position.x=(dx*frame.forward.x+dz*frame.forward.z)/size;
    target.position.z=(dx*(-frame.forward.z)+dz*frame.forward.x)/size;
    return target;
  }
  function sourcePoint(frame,localX,localZ,size,casterOffset){
    const left={x:-frame.forward.z,z:frame.forward.x};
    return{
      x:frame.x+frame.forward.x*(localX-casterOffset)*size+left.x*localZ*size,
      z:frame.z+frame.forward.z*(localX-casterOffset)*size+left.z*localZ*size,
    };
  }
  function createSourceVisual(id,frame,size,casterOffset=0){
    const anchor=sourceAnchor(frame,casterOffset,size);
    const source=sourcePort.create(id,anchor);
    return{anchor,source};
  }
  function updateSourceVisual(effect,system){
    if(!effect.source)return;
    const proxies=aliveEnemies(system).map(enemy=>sourceTarget(enemy,effect));
    sourcePort.setTargets(proxies);
    // The source lab owns its hit flashes and damage-number choreography. The
    // game adapter consumes gameplay through the native enemy services below.
    sourcePort.setCallbacks({onHits:()=>{}});
    // The copied source passes the camera quaternion to its BlobPool sprites.
    // In the standalone lab each effect root lives in world space; in-game it
    // is under the aim anchor, so convert the world camera orientation into
    // the source root's local space before the source code applies it.
    const cameraQuaternion=camera?.quaternion||fallbackCameraQuaternion;
    const sourceRoot=effect.source.root;
    effect.mesh?.updateMatrixWorld?.(true);
    sourceRoot.updateMatrixWorld?.(true);
    sourceRoot.getWorldQuaternion?.(sourceWorldQuaternion);
    const localCameraQuaternion=sourceRoot.getWorldQuaternion
      ? sourceLocalCameraQuaternion.copy(sourceWorldQuaternion).invert().multiply(cameraQuaternion)
      : cameraQuaternion;
    sourcePort.update(effect.source,effect.age,localCameraQuaternion,{anchor:effect.mesh});
  }
  function createStandaloneSource(id,frame,size){
    // These four supplied demos were authored visibly smaller than the other
    // source ports in the game. Keep that as a per-source base factor, then
    // let the shared Arcana Size multiplier apply on top of it.
    // Arcana Size scales the source visual and collision footprint only;
    // source damage, speed, range, timing, knockback, and cooldown stay unchanged.
    const sourceSize=size*STANDALONE_SOURCE_BASE_SCALE;
    const anchor=sourceAnchor(frame,0,1,false);
    const factory=id==='STAR-BOLT'||id==='SHOCK-NOVA'
      ?createWizardLightningSourcePort
      :createWizardEarthArcanaSourcePort;
    const source=factory({THREE,scene,camera,parent:anchor,size:sourceSize});
    if(!source.cast(id)){
      source.dispose?.();
      anchor.parent?.remove(anchor);
      return null;
    }
    return{anchor,source,sourceSize};
  }
  function updateStandaloneSource(effect,system,dt){
    if(!effect.source)return;
    const items=aliveEnemies(system).map(enemy=>{
      const target=sourceTarget(enemy,effect);
      return{enemy,x:target.position.x,z:target.position.z};
    });
    effect.source.syncTargets(items);
    const sourceRoot=effect.source.root;
    effect.mesh?.updateMatrixWorld?.(true);
    sourceRoot.updateMatrixWorld?.(true);
    sourceRoot.getWorldQuaternion?.(sourceWorldQuaternion);
    const cameraQuaternion=camera?.quaternion||fallbackCameraQuaternion;
    const localCameraQuaternion=sourceRoot.getWorldQuaternion
      ? sourceLocalCameraQuaternion.copy(sourceWorldQuaternion).invert().multiply(cameraQuaternion)
      : cameraQuaternion;
    const sourceId=effect.arcanaId;
    if(sourceId==='STAR-BOLT'||sourceId==='SHOCK-NOVA'){
      effect.source.setCallbacks({
        onShock:({dummy,stacks})=>{
          const enemy=dummy?.enemy;
          if(!enemy||Number(enemy.hp)<=0)return;
          const amount=Number(stacks)>1.5?8:12;
          damageEnemy(system,enemy,amount,{x:0,z:0},{
            sourceArcana:sourceId,
            starBolt:sourceId==='STAR-BOLT',
            shockNova:sourceId==='SHOCK-NOVA',
          });
          applyStatus(system,enemy,'shock',Math.max(.1,Number(dummy?.userData?.shockT)||3.2),{source:sourceId.toLowerCase()});
        },
        onDischarge:({dummy,damage})=>{
          const enemy=dummy?.enemy;
          if(!enemy||Number(enemy.hp)<=0)return;
          damageEnemy(system,enemy,damage,{x:0,z:0},{sourceArcana:sourceId,shockDischarge:true});
        },
        onPopup:()=>{},
      });
    }else{
      effect.source.setCallbacks({
        onHit:({enemy,damage,from,knock,dummy,popupOnly})=>{
          if(popupOnly||!enemy||Number(enemy.hp)<=0)return;
          const localFrom=from&&Number.isFinite(from.x)&&Number.isFinite(from.y)?from:null;
          let localKnock={x:0,z:0};
          if(localFrom&&Number(knock)>0){
            const dx=(Number(dummy?.pos?.x)||0)-localFrom.x;
            const dz=(Number(dummy?.pos?.y)||0)-localFrom.y;
            const len=Math.hypot(dx,dz)||1;
            localKnock={x:dx/len*Number(knock),z:dz/len*Number(knock)};
          }
          const worldKnock={
            x:localKnock.x*effect.frame.forward.x+localKnock.z*effect.frame.right.x,
            z:localKnock.x*effect.frame.forward.z+localKnock.z*effect.frame.right.z,
          };
          damageEnemy(system,enemy,damage,worldKnock,{
            sourceArcana:sourceId,
            terraRing:sourceId==='TERRA-RING',
            graspingEarth:sourceId==='GRASPING-EARTH',
          });
        },
        onGrab:({target})=>{
          const enemy=target?.enemy;
          if(enemy&&Number(enemy.hp)>0)applyStatus(system,enemy,'stun',3.2,{source:'graspingEarth'});
        },
      });
    }
    effect.source.update(dt,localCameraQuaternion);
  }
  // Source-class hit stars, foam, and debris are rendered by the copied lab
  // implementation. There is deliberately no second approximate impact mesh.
  function effectImpact(){}
  function updateImpacts(){}

  function startFlameBreath(){
    const frame=playerFrame(getPlayer),size=currentSize(),visual=createSourceVisual('FLAME-BREATH',frame,size,-2.95);
    return add({type:'flameBreath',arcanaId:'FLAME-BREATH',age:0,previousAge:0,life:.95,frame,size,mesh:visual.anchor,source:visual.source,impacts:[]});
  }
  function updateFlameBreath(effect,dt,system){
    advance(effect,dt);updateSourceVisual(effect,system);
    const grow=smooth(effect.age/.16),fade=smooth((effect.age-.45)/.18);
    const origin={x:effect.frame.x+effect.frame.forward.x*.5,z:effect.frame.z+effect.frame.forward.z*.5};
    const reach=3.4*effect.size*grow*(1-fade*.25);
    for(const projectile of hostileProjectiles(system)){
      const p={x:Number(projectile.x)||0,z:Number(projectile.z)||0};
      if(pointInCone({origin,forward:effect.frame.forward,target:p,reach,halfAngle:.82,radius:Number(projectile.r)||.16}))destroyProjectile(system,projectile);
    }
    for(const hitTime of [.16,.28,.40])if(crossed(effect,hitTime)){
      for(const enemy of aliveEnemies(system)){
        if(!pointInCone({origin,forward:effect.frame.forward,target:enemy,reach,halfAngle:.80,radius:enemyRadius(enemy,system)}))continue;
        damageEnemy(system,enemy,18,{x:effect.frame.forward.x*.18,z:effect.frame.forward.z*.18},{flameBreath:true});
        effectImpact(effect,{x:enemy.x,z:enemy.z},0xffffd2,effect.size*.75);
      }
    }
    updateImpacts(effect,dt);
    if(effect.age>=effect.life)remove(effect);
  }

  function startSearingCrown(){
    const frame=playerFrame(getPlayer),size=currentSize(),visual=createSourceVisual('SEARING-CROWN',frame,size);
    return add({type:'searingCrown',arcanaId:'SEARING-CROWN',age:0,previousAge:0,life:1.60,frame,size,mesh:visual.anchor,source:visual.source,impacts:[]});
  }
  function updateSearingCrown(effect,dt,system){
    advance(effect,dt);updateSourceVisual(effect,system);const radius=(.72+2.55*easeOut(effect.age/.98))*effect.size;
    for(let tick=0;tick<5;tick++)if(crossed(effect,.18+tick*.12)){
      for(const enemy of aliveEnemies(system)){
        const distance=distance2D(enemy,effect.frame);
        if(distance>radius+enemyRadius(enemy,system))continue;
        const inward=normalize2(effect.frame.x-enemy.x,effect.frame.z-enemy.z);
        damageEnemy(system,enemy,5,{x:inward.x*.12,z:inward.z*.12},{searingCrown:true,tick:tick+1});
        effectImpact(effect,{x:enemy.x,z:enemy.z},0xffffd2,effect.size*.48);
      }
    }
    if(crossed(effect,.78)){
      for(const enemy of aliveEnemies(system)){
        const distance=distance2D(enemy,effect.frame);if(distance>4.4*effect.size+enemyRadius(enemy,system))continue;
        const outward=normalize2(enemy.x-effect.frame.x,enemy.z-effect.frame.z);
        damageEnemy(system,enemy,20,{x:outward.x*2.2,z:outward.z*2.2},{searingCrown:true,finisher:true});
        applyStatus(system,enemy,'burn',1.5,{source:'searingCrown'});
        effectImpact(effect,{x:enemy.x,z:enemy.z},0xffffff,effect.size*1.08);
      }
    }
    updateImpacts(effect,dt);if(effect.age>=effect.life)remove(effect);
  }

  function startIgnitionDrive(){
    const frame=playerFrame(getPlayer),size=currentSize(),visual=createSourceVisual('IGNITION-DRIVE',frame,size,-5.10);
    const times=[.08,.155,.23,.305,.40],bursts=times.map((time,index)=>({
      time,finisher:index===4,
      position:positionAlong(frame,frame.forward,(.5+1.75*(index+1))*size),
    }));
    return add({type:'ignitionDrive',arcanaId:'IGNITION-DRIVE',age:0,previousAge:0,life:1.30,frame,size,mesh:visual.anchor,source:visual.source,bursts,impacts:[]});
  }
  function updateIgnitionDrive(effect,dt,system){
    advance(effect,dt);updateSourceVisual(effect,system);
    for(const beat of effect.bursts){
      if(crossed(effect,beat.time)){
        const radius=(beat.finisher?2.15:1.25)*effect.size;
        for(const enemy of aliveEnemies(system)){
          if(distance2D(enemy,beat.position)>radius+enemyRadius(enemy,system))continue;
          const next=effect.bursts[Math.min(effect.bursts.length-1,effect.bursts.indexOf(beat)+1)].position;
          const toward=normalize2(next.x-enemy.x,next.z-enemy.z, effect.frame.forward);
          damageEnemy(system,enemy,beat.finisher?30:10,{x:toward.x*(beat.finisher?1.25:.72),z:toward.z*(beat.finisher?1.25:.72)},{ignitionDrive:true,finisher:beat.finisher,beat:effect.bursts.indexOf(beat)+1});
          if(!beat.finisher)moveEnemy(system,enemy,{x:lerp(enemy.x,next.x,.12),z:lerp(enemy.z,next.z,.12)});
          if(beat.finisher)applyStatus(system,enemy,'burn',1.6,{source:'ignitionDrive'});
          effectImpact(effect,{x:enemy.x,z:enemy.z},beat.finisher?0xffffd2:0xffc34d,effect.size*(beat.finisher?1.05:.65));
        }
      }
    }
    updateImpacts(effect,dt);if(effect.age>=effect.life)remove(effect);
  }

  function startEngulfingFissure(){
    const frame=playerFrame(getPlayer),size=currentSize(),offsets=[[1.9,-1.5],[3.1,1.4],[.5,2.2]],visual=createSourceVisual('ENGULFING-FISSURE',frame,size,1.70);
    const traps=offsets.map((offset,index)=>{
      const center={x:frame.x+frame.forward.x*offset[0]+frame.right.x*offset[1],z:frame.z+frame.forward.z*offset[0]+frame.right.z*offset[1]};
      return{index,center,triggered:false,consumed:false,target:null,age:0,nextHit:0};
    });
    return add({type:'engulfingFissure',arcanaId:'ENGULFING-FISSURE',age:0,previousAge:0,life:3.20,frame,size,mesh:visual.anchor,source:visual.source,traps,impacts:[]});
  }
  function updateEngulfingFissure(effect,dt,system){
    advance(effect,dt);updateSourceVisual(effect,system);let finished=0;
    for(const trap of effect.traps){
      trap.age=effect.age-(trap.triggerAt??Infinity);
      if(!trap.triggered&&!trap.consumed&&effect.age<3.2){
        const target=aliveEnemies(system).find(enemy=>distance2D(enemy,trap.center)<=.92*effect.size+enemyRadius(enemy,system));
        if(target){trap.triggered=true;trap.target=target;trap.triggerAt=effect.age;trap.age=0;trap.nextHit=.16;}
      }
      if(trap.triggered&&!trap.consumed){
        const target=trap.target;
        if(!target||Number(target.hp)<=0){trap.consumed=true;trap.triggered=false;}
        else{
          const pull=smooth(trap.age/.12);moveEnemy(system,target,{x:lerp(target.x,trap.center.x,pull),z:lerp(target.z,trap.center.z,pull)});
          while(trap.nextHit<.16+.135*5&&trap.age>=trap.nextHit){
            const tick=Math.round((trap.nextHit-.16)/.135)+1;
            damageEnemy(system,target,5,{x:0,z:0},{engulfingFissure:true,tick,trap:trap.index});
            effectImpact(effect,trap.center,0xffffd2,effect.size*.52);trap.nextHit+=.135;
            if(tick>=5){trap.consumed=true;trap.triggered=false;break;}
          }
        }
      }
      if(!trap.triggered&&!trap.consumed&&effect.age>=3.2)trap.consumed=true;
      if(trap.consumed)finished++;
    }
    updateImpacts(effect,dt);if(finished===effect.traps.length||effect.age>=effect.life)remove(effect);
  }

  function startDragonBlast(){
    const frame=playerFrame(getPlayer),size=currentSize(),head=positionAlong(frame,frame.forward,2.70*size),visual=createSourceVisual('DRAGON-BLAST',frame,size,-1.20);
    return add({type:'dragonBlast',arcanaId:'DRAGON-BLAST',age:0,previousAge:0,life:1.55,frame,head,size,mesh:visual.anchor,source:visual.source,impacts:[]});
  }
  function updateDragonBlast(effect,dt,system){
    advance(effect,dt);updateSourceVisual(effect,system);
    intercept(effect.head,4.3*effect.size,system);
    for(let pull=0;pull<5;pull++)if(crossed(effect,.20+pull*.14)){
      for(const enemy of aliveEnemies(system)){
        const distance=distance2D(enemy,effect.head);if(distance>4.2*effect.size+enemyRadius(enemy,system))continue;
        const inward=normalize2(effect.head.x-enemy.x,effect.head.z-enemy.z);
        damageEnemy(system,enemy,8,{x:inward.x*.38,z:inward.z*.38},{dragonBlast:true,pull:pull+1});
        moveEnemy(system,enemy,{x:lerp(enemy.x,effect.head.x,.12),z:lerp(enemy.z,effect.head.z,.12)});
        effectImpact(effect,{x:enemy.x,z:enemy.z},0xffffff,effect.size*.58);
      }
    }
    if(crossed(effect,.90)){
      for(const enemy of aliveEnemies(system)){
        const distance=distance2D(enemy,effect.head);if(distance>4.6*effect.size+enemyRadius(enemy,system))continue;
        const outward=normalize2(enemy.x-effect.head.x,enemy.z-effect.head.z, effect.frame.forward);
        damageEnemy(system,enemy,24,{x:outward.x*2.45,z:outward.z*2.45},{dragonBlast:true,finisher:true});
        applyStatus(system,enemy,'slow',1.4,{source:'dragonBlast'});
        effectImpact(effect,{x:enemy.x,z:enemy.z},0xffffff,effect.size*1.15);
      }
    }
    updateImpacts(effect,dt);if(effect.age>=effect.life)remove(effect);
  }

  function startShearingChain(){
    const frame=playerFrame(getPlayer),size=currentSize();
    const dashHandle=startDashMotion?.({
      source:'arcana',
      direction:frame.forward,
      grantIframes:false,
      applyDodgeCooldown:false,
      distanceMultiplier:(SHEARING_CHAIN_SOURCE_ROUTE/dashDistance())*size,
    });
    if(!dashHandle)return null;
    const visual=createSourceVisual('SHEARING-CHAIN',frame,size,-4.20);
    const slashTimes=Array.from({length:7},(_,index)=>index<6?.18+index*.10:.82);
    const slashes=slashTimes.map((time,index)=>({time,finisher:index===6}));
    return add({type:'shearingChain',arcanaId:'SHEARING-CHAIN',age:0,previousAge:0,life:1.35,frame,size,mesh:visual.anchor,source:visual.source,dashHandle,slashes,impacts:[]});
  }
  function updateShearingChain(effect,dt,system){
    advance(effect,dt);updateSourceVisual(effect,system);
    for(const slash of effect.slashes){
      const life=slash.finisher?.38:.28,progress=clamp((slash.time-.18)/.72,0,1);
      const side=slash.finisher?0:(effect.slashes.indexOf(slash)%2?1:-1);
      const position={x:effect.frame.x+effect.frame.forward.x*(.55+progress*3.2)+effect.frame.right.x*side*.62,z:effect.frame.z+effect.frame.forward.z*(.55+progress*3.2)+effect.frame.right.z*side*.62};
      if(crossed(effect,slash.time)){
        const radius=(slash.finisher?2.6:1.9)*effect.size;
        for(const enemy of aliveEnemies(system)){
          if(distance2D(enemy,position)>radius+enemyRadius(enemy,system))continue;
          const push=normalize2(enemy.x-effect.frame.x,enemy.z-effect.frame.z,effect.frame.forward);
          damageEnemy(system,enemy,slash.finisher?15:7,{x:push.x*(slash.finisher?1.8:.62),z:push.z*(slash.finisher?1.8:.62)},{shearingChain:true,finisher:slash.finisher,slash:effect.slashes.indexOf(slash)+1});
          effectImpact(effect,{x:enemy.x,z:enemy.z},0xffffff,effect.size*(slash.finisher?1.05:.58));
        }
        if(slash.finisher)intercept(position,radius,system);
      }
    }
    updateImpacts(effect,dt);if(effect.age>=effect.life)remove(effect);
  }

  function startTectonicDrill(){
    const frame=playerFrame(getPlayer),size=currentSize(),visual=createSourceVisual('TECTONIC-DRILL',frame,size,-6.20),start=positionAlong(frame,frame.forward,1.20*size);
    return add({type:'tectonicDrill',arcanaId:'TECTONIC-DRILL',age:0,previousAge:0,life:1.60,frame,start,size,mesh:visual.anchor,source:visual.source,distance:0,playerDistance:0,hitAt:new Map(),impacts:[]});
  }
  function updateTectonicDrill(effect,dt,system){
    advance(effect,dt);updateSourceVisual(effect,system);const targetDistance=Math.min(7.8*effect.size,Math.max(0,effect.age-.32)*9.4*effect.size),position=positionAlong(effect.start,effect.frame.forward,targetDistance);
    const delta=Math.max(0,targetDistance-effect.distance);effect.distance=targetDistance;
    if(delta>0&&effect.playerDistance<2.6){const move=Math.min(delta*.36,2.6-effect.playerDistance);effect.playerDistance+=move;translatePlayer(effect.frame.forward.x*move,effect.frame.forward.z*move);}
    for(const enemy of aliveEnemies(system)){
      const distance=distance2D(enemy,position),last=effect.hitAt.get(enemy)||-Infinity;
      if(distance>1.35*effect.size+enemyRadius(enemy,system)||effect.age-last<.18)continue;
      effect.hitAt.set(enemy,effect.age);damageEnemy(system,enemy,10,{x:effect.frame.forward.x*1.05,z:effect.frame.forward.z*1.05},{tectonicDrill:true});
      moveEnemy(system,enemy,positionAlong(position,effect.frame.forward,.55));effectImpact(effect,{x:enemy.x,z:enemy.z},0xffffff,effect.size*.68);
    }
    updateImpacts(effect,dt);if(effect.age>=effect.life)remove(effect);
  }

  function startTomahawk(){
    const frame=playerFrame(getPlayer),size=currentSize(),visual=createSourceVisual('ROCK-SOLID-TOMAHAWK',frame,size,-2.90),home=sourcePoint(frame,-2.60,.20,size,-2.90),out=sourcePoint(frame,6.40,-.50,size,-2.90);
    return add({type:'rockSolidTomahawk',arcanaId:'ROCK-SOLID-TOMAHAWK',age:0,previousAge:0,life:2.10,frame,home,out,size,mesh:visual.anchor,source:visual.source,hit:new Set(),impacts:[]});
  }
  function tomahawkPosition(effect){
    const HOME={x:-2.60,y:1.25,z:.20},THROW=.35,OUT_END=1.05,BACK_END=1.85;
    if(effect.age<THROW){const k=smooth(effect.age/THROW),p={x:lerp(HOME.x,HOME.x+.10,k),y:lerp(HOME.y,HOME.y+.55,k),z:HOME.z};return{...sourcePoint(effect.frame,p.x,p.z,effect.size,-2.90),y:p.y*effect.size};}
    if(effect.age<OUT_END){const k=(effect.age-THROW)/(OUT_END-THROW),e=easeOut(k),p={x:lerp(HOME.x,6.40,e),y:1.05+Math.sin(k*Math.PI)*.42,z:lerp(HOME.z,-.50,e)};return{...sourcePoint(effect.frame,p.x,p.z,effect.size,-2.90),y:p.y*effect.size};}
    if(effect.age<BACK_END){const k=(effect.age-OUT_END)/(BACK_END-OUT_END),e=smooth(k),ang=lerp(0,Math.PI,e),p={x:lerp(6.40,HOME.x,e),y:1.05+Math.sin(e*Math.PI)*.25,z:lerp(-.50,HOME.z,e)+Math.sin(ang)*1.9};return{...sourcePoint(effect.frame,p.x,p.z,effect.size,-2.90),y:p.y*effect.size};}
    return{...sourcePoint(effect.frame,HOME.x,HOME.z,effect.size,-2.90),y:HOME.y*effect.size};
  }
  function updateTomahawk(effect,dt,system){
    advance(effect,dt);updateSourceVisual(effect,system);const position=tomahawkPosition(effect);
    if(effect.age>=.35&&effect.age<1.85)for(const enemy of aliveEnemies(system)){
      if(effect.hit.has(enemy)||distance2D(enemy,position)>.95*effect.size+enemyRadius(enemy,system))continue;
      effect.hit.add(enemy);damageEnemy(system,enemy,15,{x:effect.frame.forward.x*1.18,z:effect.frame.forward.z*1.18},{rockSolidTomahawk:true});effectImpact(effect,{x:enemy.x,z:enemy.z},0xffffff,effect.size*.82);
    }
    updateImpacts(effect,dt);if(effect.age>=effect.life)remove(effect);
  }

  function startAquaVortex(){
    const frame=playerFrame(getPlayer),size=currentSize(),visual=createSourceVisual('AQUA-VORTEX',frame,size);
    return add({type:'aquaVortex',arcanaId:'AQUA-VORTEX',age:0,previousAge:0,life:.80,frame,size,mesh:visual.anchor,source:visual.source,impacts:[]});
  }
  function updateAquaVortex(effect,dt,system){
    advance(effect,dt);updateSourceVisual(effect,system);
    const position=effect.frame;
    intercept(position,3.1*effect.size,system);
    if(crossed(effect,.205)){
      for(const enemy of aliveEnemies(system)){
        const distance=distance2D(enemy,position);if(distance>3.1*effect.size+enemyRadius(enemy,system))continue;
        damageEnemy(system,enemy,12,{x:0,z:0},{aquaVortex:true,tick:1});
      }
    }
    updateImpacts(effect,dt);if(effect.age>=effect.life)remove(effect);
  }

  function startAquaBreaker(){
    const frame=playerFrame(getPlayer),size=currentSize(),visual=createSourceVisual('AQUA-BREAKER',frame,size,-7.40),origin=positionAlong(frame,frame.forward,1.35*size);
    return add({type:'aquaBreaker',arcanaId:'AQUA-BREAKER',age:0,previousAge:0,life:3.50,frame,origin,size,mesh:visual.anchor,source:visual.source,hit:new Map(),finisher:false,impacts:[]});
  }
  function updateAquaBreaker(effect,dt,system){
    advance(effect,dt);updateSourceVisual(effect,system);const charge=1.90,rollEnd=2.65,breakEnd=3.15,charging=effect.age<charge,rollK=sat((effect.age-charge)/(rollEnd-charge)),breakK=sat((effect.age-rollEnd)/(breakEnd-rollEnd));
    const size=charging?lerp(.18,1,easeOut((effect.age-.10)/1.55)):lerp(1,1.22,easeOut(rollK))*(1-.9*breakK),distance=charging?0:11*(effect.age-charge)*(1-.35*breakK)*effect.size,position=positionAlong(effect.origin,effect.frame.forward,distance);
    if(!charging){
      const ballRadius=1.55*size;
      for(const enemy of aliveEnemies(system)){
        const distanceToBall=distance2D(enemy,position);
        if(distanceToBall>ballRadius+.45+enemyRadius(enemy,system))continue;
        let hit=effect.hit.get(enemy);
        if(!hit){damageEnemy(system,enemy,15,{x:effect.frame.forward.x*1.0,z:effect.frame.forward.z*1.0},{aquaBreaker:true,entry:true});hit={next:effect.age+.14};effect.hit.set(enemy,hit);effectImpact(effect,{x:enemy.x,z:enemy.z},0xffffff,effect.size*.72);}
        while(hit.next<=Math.min(effect.age,rollEnd)&&hit.next<breakEnd){damageEnemy(system,enemy,10,{x:effect.frame.forward.x*.45,z:effect.frame.forward.z*.45},{aquaBreaker:true,pass:true});hit.next+=.15;}
        moveEnemy(system,enemy,{x:lerp(enemy.x,position.x,.08),z:lerp(enemy.z,position.z,.08)});
      }
    }
    if(crossed(effect,rollEnd)&&!effect.finisher){effect.finisher=true;for(const enemy of aliveEnemies(system))if(distance2D(enemy,position)<4.6*effect.size){const outward=normalize2(enemy.x-position.x,enemy.z-position.z, effect.frame.forward);damageEnemy(system,enemy,35,{x:outward.x*2.2,z:outward.z*2.2},{aquaBreaker:true,finisher:true});effectImpact(effect,{x:enemy.x,z:enemy.z},0xffffff,effect.size*1.22);}}
    updateImpacts(effect,dt);if(effect.age>=effect.life)remove(effect);
  }

  function startTerraRing(){
    const frame=playerFrame(getPlayer),size=currentSize(),visual=createStandaloneSource('TERRA-RING',frame,size);
    if(!visual)return null;
    return add({type:'terraRing',arcanaId:'TERRA-RING',age:0,previousAge:0,life:WIZARD_VFX_ARCANA_SPECS['TERRA-RING'].life,frame,size,sourceSize:visual.sourceSize,mesh:visual.anchor,source:visual.source,standaloneSource:true});
  }
  function updateTerraRing(effect,dt,system){
    advance(effect,dt);updateStandaloneSource(effect,system,dt);
    if(effect.age>=effect.life)remove(effect);
  }

  function startGraspingEarth(){
    const frame=playerFrame(getPlayer),size=currentSize(),visual=createStandaloneSource('GRASPING-EARTH',frame,size);
    if(!visual)return null;
    return add({type:'graspingEarth',arcanaId:'GRASPING-EARTH',age:0,previousAge:0,life:WIZARD_VFX_ARCANA_SPECS['GRASPING-EARTH'].life,frame,size,sourceSize:visual.sourceSize,mesh:visual.anchor,source:visual.source,standaloneSource:true});
  }
  function updateGraspingEarth(effect,dt,system){
    advance(effect,dt);updateStandaloneSource(effect,system,dt);
    if(effect.age>=effect.life)remove(effect);
  }

  function startShockNova(){
    const frame=playerFrame(getPlayer),size=currentSize(),visual=createStandaloneSource('SHOCK-NOVA',frame,size);
    if(!visual)return null;
    return add({type:'shockNova',arcanaId:'SHOCK-NOVA',age:0,previousAge:0,life:WIZARD_VFX_ARCANA_SPECS['SHOCK-NOVA'].life,frame,size,sourceSize:visual.sourceSize,mesh:visual.anchor,source:visual.source,standaloneSource:true});
  }
  function updateShockNova(effect,dt,system){
    advance(effect,dt);updateStandaloneSource(effect,system,dt);
    if(effect.age>=effect.life)remove(effect);
  }

  function startStarBolt(){
    const frame=playerFrame(getPlayer),size=currentSize(),visual=createStandaloneSource('STAR-BOLT',frame,size);
    if(!visual)return null;
    return add({type:'starBolt',arcanaId:'STAR-BOLT',age:0,previousAge:0,life:WIZARD_VFX_ARCANA_SPECS['STAR-BOLT'].life,frame,size,sourceSize:visual.sourceSize,mesh:visual.anchor,source:visual.source,standaloneSource:true});
  }
  function updateStarBolt(effect,dt,system){
    advance(effect,dt);updateStandaloneSource(effect,system,dt);
    if(effect.age>=effect.life)remove(effect);
  }

  function cast(card){
    const id=String(card?.arcanaId||card?.id||'').replace(/^WOL-/,'').toUpperCase();if(!VFX_IDS.has(id))return false;
    state.castSerial++;state.lastCast={serial:state.castSerial,cardId:card?.id||`WOL-${id}`,arcanaId:id};
    if(id==='FLAME-BREATH')startFlameBreath();
    else if(id==='SEARING-CROWN')startSearingCrown();
    else if(id==='IGNITION-DRIVE')startIgnitionDrive();
    else if(id==='ENGULFING-FISSURE')startEngulfingFissure();
    else if(id==='DRAGON-BLAST')startDragonBlast();
    else if(id==='SHEARING-CHAIN'&&!startShearingChain())return false;
    else if(id==='TECTONIC-DRILL')startTectonicDrill();
    else if(id==='ROCK-SOLID-TOMAHAWK')startTomahawk();
    else if(id==='AQUA-VORTEX')startAquaVortex();
    else if(id==='AQUA-BREAKER')startAquaBreaker();
    else if(id==='TERRA-RING'&&!startTerraRing())return false;
    else if(id==='GRASPING-EARTH'&&!startGraspingEarth())return false;
    else if(id==='SHOCK-NOVA'&&!startShockNova())return false;
    else if(id==='STAR-BOLT'&&!startStarBolt())return false;
    if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('wizard-arcana:cast',{detail:{card,serial:state.castSerial,vfxLabPort:true}}));
    return true;
  }
  function canPlay(card){const id=String(card?.arcanaId||card?.id||'').replace(/^WOL-/,'').toUpperCase();return VFX_IDS.has(id);}
  function play(card){return canPlay(card)?cast(card):false;}
  function update(dt,now=0){
    const frameDt=Math.max(0,Number(dt)||0),system=getEnemySystem?.();
    for(const effect of[...state.effects]){
      if(effect.type==='flameBreath')updateFlameBreath(effect,frameDt,system);
      else if(effect.type==='searingCrown')updateSearingCrown(effect,frameDt,system);
      else if(effect.type==='ignitionDrive')updateIgnitionDrive(effect,frameDt,system);
      else if(effect.type==='engulfingFissure')updateEngulfingFissure(effect,frameDt,system);
      else if(effect.type==='dragonBlast')updateDragonBlast(effect,frameDt,system);
      else if(effect.type==='shearingChain')updateShearingChain(effect,frameDt,system);
      else if(effect.type==='tectonicDrill')updateTectonicDrill(effect,frameDt,system);
      else if(effect.type==='rockSolidTomahawk')updateTomahawk(effect,frameDt,system);
      else if(effect.type==='aquaVortex')updateAquaVortex(effect,frameDt,system);
      else if(effect.type==='aquaBreaker')updateAquaBreaker(effect,frameDt,system);
      else if(effect.type==='terraRing')updateTerraRing(effect,frameDt,system);
      else if(effect.type==='graspingEarth')updateGraspingEarth(effect,frameDt,system);
      else if(effect.type==='shockNova')updateShockNova(effect,frameDt,system);
      else if(effect.type==='starBolt')updateStarBolt(effect,frameDt,system);
    }
  }
  function snapshot(){return state.effects.map(effect=>({type:effect.type,arcanaId:effect.arcanaId,age:Number(effect.age.toFixed(4)),life:effect.life}));}

  const onPlay=event=>play(event?.detail?.card,event?.detail||{});
  const onTweaks=event=>{state.sizeMultiplier=clampArcanaSize(event?.detail?.sizeMultiplier);};
  window.addEventListener('wizard-arcana:play',onPlay);window.addEventListener(ARCANA_TWEAKS_EVENT,onTweaks);
  return{
    state,canPlay,play,reset,snapshot,update,
    dispose(){window.removeEventListener('wizard-arcana:play',onPlay);window.removeEventListener(ARCANA_TWEAKS_EVENT,onTweaks);reset();},
  };
}
