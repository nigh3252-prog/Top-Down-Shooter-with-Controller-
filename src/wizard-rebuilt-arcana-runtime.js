import { ARCANA_TWEAKS_EVENT, clampArcanaSize, readArcanaTweaks } from './wizard-arcana-settings.js';
import { pointSegmentDistance2D, segmentIntersection2D } from './wizard-arcana-runtime.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const TAU=Math.PI*2;
const FIRE=0xff6c31;
const FIRE_GOLD=0xffc74d;
const FIRE_HOT=0xffffc7;
const FIRE_DEEP=0xa52b16;
const AIR=0x8ee9ef;
const AIR_HOT=0xe7ffff;
const WATER=0x57bdf2;
const WATER_HOT=0xd9f8ff;

export const HOMING_FLARES_SPEC=Object.freeze({
  count:7,storageDuration:4,damage:7,sourceKnockback:15,orbitClockwise:true,
  acquisitionRange:16,projectileSpeed:13.2,projectileLifetime:2.4,
  enhancedCount:10,enhancedStorageDuration:5,chargedInitialCount:10,
  chargedGenerationDuration:4,chargedTotalCap:32,chargedDamageMultiplier:2,
});
export const DRAGON_ARC_SPEC=Object.freeze({
  stockMax:8,rechargeInterval:.6,damage:8,sourceKnockback:8,emissionInterval:.20,
  speed:16.5,range:17,enhancedStockMax:10,enhancedPerBeat:2,chargedCount:20,
});
export const WHIRLING_TORNADO_TICKS=Object.freeze([.12,.30,.48,.66]);
export const WHIRLING_TORNADO_SPEC=Object.freeze({
  duration:.8,tickDamage:8,tickCount:4,finisherDamage:10,radius:2.75,
  enhancedDuration:1.2,enhancedTickCount:6,chargedVortexCount:5,
});
export const WATER_PRISON_SPEC=Object.freeze({
  ammoMax:2,rechargeInterval:6,projectileSpeed:10.2,range:14,radius:.54,
  impactDamage:15,tickDamage:5,tickTimes:Object.freeze([1,2,3,4,5]),captureDuration:5.4,
  enhancedAmmoMax:3,enhancedSpeedMultiplier:1.3,
});

export function homingFlaresSpec({enhanced=false,charged=false}={}){
  if(charged)return Object.freeze({...HOMING_FLARES_SPEC,count:10,storageDuration:4,damage:14,generationDuration:4,totalCap:32,charged:true,enhanced:false});
  return Object.freeze({...HOMING_FLARES_SPEC,count:enhanced?10:7,storageDuration:enhanced?5:4,enhanced:!!enhanced,charged:false});
}
export function dragonArcStockSpec({enhanced=false,charged=false}={}){
  return Object.freeze({...DRAGON_ARC_SPEC,stockMax:enhanced?10:8,perBeat:enhanced?2:1,releaseCount:charged?20:null,enhanced:!!enhanced,charged:!!charged});
}
export function whirlingTornadoSpec({enhanced=false,charged=false}={}){
  const tickCount=enhanced?6:4,duration=enhanced?1.2:.8;
  const tickTimes=enhanced?Array.from({length:tickCount},(_,index)=>(index+1)*duration/(tickCount+1)):[...WHIRLING_TORNADO_TICKS];
  return Object.freeze({...WHIRLING_TORNADO_SPEC,duration,tickCount,tickTimes:Object.freeze(tickTimes),vortexCount:charged?5:1,enhanced:!!enhanced,charged:!!charged});
}
export function waterPrisonSpec({enhanced=false}={}){
  return Object.freeze({...WATER_PRISON_SPEC,ammoMax:enhanced?3:2,projectileSpeed:WATER_PRISON_SPEC.projectileSpeed*(enhanced?1.3:1),enhanced:!!enhanced});
}
export function clockwiseOrbitPosition({ownerX=0,ownerZ=0,slot=0,count=7,age=0,radius=1}={}){
  const angle=slot*TAU/count-age*3.25;
  return{x:ownerX+Math.cos(angle)*radius,z:ownerZ+Math.sin(angle)*radius,angle};
}

function isEnemyLabRuntime(){
  if(typeof window==='undefined')return false;
  try{const params=new URLSearchParams(location.search||'');if(params.get('enemyLab')==='1'||params.get('mode')==='enemy-lab')return true;return !!(window.parent&&window.parent!==window&&window.frameElement?.id==='arenaFrame'&&/(?:^|\/)enemy-lab\.html$/i.test(window.parent.location?.pathname||''));}catch{return false;}
}
function normalize2(x,z,fallback={x:0,z:1}){const length=Math.hypot(x,z);return length>1e-6?{x:x/length,z:z/length}:{...fallback};}
function playerFrame(getPlayer){const player=getPlayer?.()||{},forward=normalize2(Number(player.forwardX)||0,Number(player.forwardZ)||1);return{x:Number(player.x)||0,z:Number(player.z)||0,forward,right:{x:forward.z,z:-forward.x}};}
function aliveEnemies(system){return(system?.enemies||[]).filter(enemy=>enemy&&enemy.hp>0);}
function enemyRadius(enemy,system){return Math.max(.44,(Number(enemy?.radius)||1)*(Number(system?.heightScale)||1)*.72);}
function enemyCenterY(enemy,system){const scale=(system?.heightScale||1)*(enemy?.currentTargetScale||enemy?.targetScale||1);return(enemy?.targetYOffset||enemy?.rootLift||0)+(enemy?.height||2)*scale*.52;}
function nearestEnemy(system,position,maxRange=Infinity,excluded=null){let best=null,bestDistance=maxRange;for(const enemy of aliveEnemies(system)){if(excluded?.has(enemy))continue;const distance=Math.hypot(enemy.x-position.x,enemy.z-position.z);if(distance<bestDistance){best=enemy;bestDistance=distance;}}return best;}
function firstWallHit(start,end,walls){let best=null;for(const wall of walls||[]){if(!wall?.a||!wall?.b)continue;const hit=segmentIntersection2D(start,end,wall.a,wall.b);if(hit&&(!best||hit.t<best.hit.t))best={wall,hit};}return best;}
function hostileProjectiles(system){const values=system?.hostileProjectiles;return Array.isArray(values)?values.filter(projectile=>projectile&&!projectile.dead):[];}
function destroyHostileProjectile(projectile){if(!projectile||projectile.dead)return false;projectile.dead=true;projectile.life=0;if(projectile.mesh)projectile.mesh.visible=false;return true;}
function disposeObject(root){if(!root)return;root.parent?.remove(root);root.traverse?.(object=>{object.geometry?.dispose?.();if(Array.isArray(object.material))object.material.forEach(material=>material?.dispose?.());else object.material?.dispose?.();});}
function makeMaterial(THREE,color,opacity=.86,{additive=true,wireframe=false}={}){return new THREE.MeshBasicMaterial({color,transparent:true,opacity,wireframe,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,depthWrite:false,side:THREE.DoubleSide});}
function damageEnemy(system,enemy,amount,knock={x:0,z:0},options={}){if(!system||!enemy||enemy.hp<=0)return false;return system.damageEnemy?.(enemy,amount,knock,{source:'wizardArcana',power:.34,pop:.06,...options})??false;}
function knockFrom(origin,target,power=1){const direction=normalize2(target.x-origin.x,target.z-origin.z);return{x:direction.x*power,z:direction.z*power};}

function makeFlareVisual(THREE,scene,size){
  const group=new THREE.Group();group.name='Wizard Arcana Homing Flare';
  const halo=new THREE.Mesh(new THREE.TorusGeometry(.28*size,.045*size,7,24),makeMaterial(THREE,FIRE_GOLD,.64));halo.rotation.x=Math.PI/2;group.add(halo);
  const shell=new THREE.Mesh(new THREE.SphereGeometry(.23*size,14,9),makeMaterial(THREE,FIRE,.82));shell.scale.set(1,.76,1);group.add(shell);
  const core=new THREE.Mesh(new THREE.SphereGeometry(.12*size,12,8),makeMaterial(THREE,FIRE_HOT,.98));core.userData.hotCore=true;group.add(core);
  for(let index=0;index<3;index++){const tail=new THREE.Mesh(new THREE.SphereGeometry((.13-index*.024)*size,10,7),makeMaterial(THREE,index===2?FIRE:FIRE_GOLD,.68-index*.12));tail.position.z=-(.25+index*.18)*size;tail.scale.set(.76,.65,1.25);tail.userData.flareTail=index;group.add(tail);}
  group.renderOrder=7;scene.add(group);return group;
}
function makeDragonVisual(THREE,scene,size){
  const group=new THREE.Group();group.name='Wizard Arcana Dragon Arc projectile';
  const outerBody=new THREE.Mesh(new THREE.ConeGeometry(.68*size,1.55*size,7),makeMaterial(THREE,FIRE_DEEP,.98,{additive:false}));outerBody.rotation.x=-Math.PI/2;outerBody.position.z=-.28*size;outerBody.scale.set(1,1,.74);outerBody.userData.dragonBodyLayer=0;outerBody.userData.baseScaleZ=.74;outerBody.renderOrder=7;group.add(outerBody);
  const goldBody=new THREE.Mesh(new THREE.ConeGeometry(.51*size,1.30*size,7),makeMaterial(THREE,FIRE,.98,{additive:false}));goldBody.rotation.x=-Math.PI/2;goldBody.position.set(0,.08*size,-.20*size);goldBody.scale.set(1,1,.66);goldBody.userData.dragonBodyLayer=1;goldBody.userData.baseScaleZ=.66;goldBody.renderOrder=8;group.add(goldBody);
  const hotBody=new THREE.Mesh(new THREE.ConeGeometry(.32*size,.92*size,6),makeMaterial(THREE,FIRE_GOLD,.99,{additive:false}));hotBody.rotation.x=-Math.PI/2;hotBody.position.set(0,.16*size,-.07*size);hotBody.scale.set(1,1,.56);hotBody.userData.dragonBodyLayer=2;hotBody.userData.baseScaleZ=.56;hotBody.renderOrder=9;group.add(hotBody);

  const head=new THREE.Mesh(new THREE.BoxGeometry(1.10*size,.50*size,.72*size),makeMaterial(THREE,FIRE_DEEP,.99,{additive:false}));head.position.set(0,.06*size,.34*size);head.scale.set(1.28,1,1);head.userData.dragonHead=true;head.userData.baseScaleX=1.28;head.renderOrder=7;group.add(head);
  const face=new THREE.Mesh(new THREE.BoxGeometry(.88*size,.38*size,.60*size),makeMaterial(THREE,FIRE,.99,{additive:false}));face.position.set(0,.11*size,.66*size);face.scale.set(1.18,1,1);face.userData.dragonFace=true;face.userData.baseScaleX=1.18;face.renderOrder=8;group.add(face);
  const brow=new THREE.Mesh(new THREE.BoxGeometry(.68*size,.10*size,.40*size),makeMaterial(THREE,FIRE_GOLD,.99,{additive:false}));brow.position.set(0,.30*size,.73*size);brow.renderOrder=9;group.add(brow);
  const upperJaw=new THREE.Mesh(new THREE.BoxGeometry(.72*size,.14*size,.70*size),makeMaterial(THREE,FIRE,.99,{additive:false}));upperJaw.position.set(0,.32*size,.98*size);upperJaw.rotation.z=-.035;upperJaw.userData.dragonJaw=1;upperJaw.userData.baseJawY=.27;upperJaw.renderOrder=8;group.add(upperJaw);
  const upperJawHot=new THREE.Mesh(new THREE.BoxGeometry(.50*size,.05*size,.52*size),makeMaterial(THREE,FIRE_GOLD,.99,{additive:false}));upperJawHot.position.set(0,-.075*size,.04*size);upperJawHot.renderOrder=9;upperJaw.add(upperJawHot);
  const lowerJaw=new THREE.Mesh(new THREE.BoxGeometry(.64*size,.13*size,.62*size),makeMaterial(THREE,FIRE,.99,{additive:false}));lowerJaw.position.set(0,-.25*size,.94*size);lowerJaw.rotation.z=.035;lowerJaw.userData.dragonJaw=-1;lowerJaw.userData.baseJawY=-.20;lowerJaw.renderOrder=9;group.add(lowerJaw);
  const lowerJawHot=new THREE.Mesh(new THREE.BoxGeometry(.46*size,.045*size,.45*size),makeMaterial(THREE,FIRE_GOLD,.99,{additive:false}));lowerJawHot.position.set(0,.07*size,.035*size);lowerJawHot.renderOrder=10;lowerJaw.add(lowerJawHot);
  const mouth=new THREE.Mesh(new THREE.BoxGeometry(.30*size,.055*size,.34*size),makeMaterial(THREE,FIRE_HOT,.98,{additive:false}));mouth.position.set(0,.015*size,1.16*size);mouth.userData.dragonMouth=true;mouth.renderOrder=10;group.add(mouth);
  for(const side of[-1,1]){
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.055*size,9,6),makeMaterial(THREE,0xffffff,.98,{additive:false}));eye.position.set(side*.37*size,.31*size,.76*size);eye.userData.dragonEye=true;eye.renderOrder=10;group.add(eye);
    const horn=new THREE.Mesh(new THREE.ConeGeometry(.11*size,.55*size,5),makeMaterial(THREE,FIRE_GOLD,.96,{additive:false}));horn.rotation.x=-Math.PI/2;horn.rotation.z=side*.42;horn.position.set(side*.43*size,.25*size,.12*size);horn.renderOrder=9;group.add(horn);
  }
  for(let index=0;index<10;index++){
    const side=index%2?-1:1,progress=index/9,tongue=new THREE.Mesh(new THREE.ConeGeometry((.17-progress*.065)*size,(.64-progress*.16)*size,5),makeMaterial(THREE,index%3===0?FIRE_DEEP:(index%3===1?FIRE:FIRE_GOLD),.92,{additive:false}));
    tongue.rotation.x=-Math.PI/2;tongue.rotation.z=side*(.22+.14*progress);tongue.position.set(side*(.46-progress*.21)*size,(index%3-1)*.10*size,(.05-progress*1.12)*size);tongue.userData.dragonTongue=index;tongue.userData.baseX=tongue.position.x;tongue.userData.baseY=tongue.position.y;group.add(tongue);
  }
  for(let index=0;index<5;index++){
    const ember=new THREE.Mesh(new THREE.DodecahedronGeometry((.07+index%2*.025)*size,0),makeMaterial(THREE,index%2?FIRE_GOLD:FIRE_DEEP,.84,{additive:false}));ember.position.set((index%2?1:-1)*(.16+.06*index)*size,(index%3-1)*.11*size,-(.82+index*.15)*size);ember.userData.dragonEmber=index;ember.userData.baseX=ember.position.x;group.add(ember);
  }
  group.renderOrder=7;scene.add(group);return group;
}
function makeDragonMuzzleVisual(THREE,scene,size){
  const group=new THREE.Group();group.name='Wizard Arcana Dragon Arc muzzle flare';
  const core=new THREE.Mesh(new THREE.SphereGeometry(.14*size,11,7),makeMaterial(THREE,FIRE_HOT,.78));core.position.z=.30*size;core.userData.baseOpacity=.78;group.add(core);
  for(let index=0;index<6;index++){const angle=index*TAU/6,petal=new THREE.Mesh(new THREE.ConeGeometry(.085*size,.46*size,5),makeMaterial(THREE,index%2?FIRE:FIRE_GOLD,.94,{additive:false}));petal.rotation.x=Math.PI/2;petal.rotation.z=angle;petal.position.set(Math.cos(angle)*.18*size,Math.sin(angle)*.18*size,.18*size);petal.userData.baseOpacity=.94;group.add(petal);}
  group.renderOrder=8;scene.add(group);return group;
}
function makeDragonImpactVisual(THREE,scene,position,size){
  const group=new THREE.Group();group.name='Wizard Arcana Dragon Arc impact flash';
  const core=new THREE.Mesh(new THREE.SphereGeometry(.34*size,13,9),makeMaterial(THREE,0xffffff,.98));core.position.y=.06*size;core.userData.baseOpacity=.98;group.add(core);
  const gold=new THREE.Mesh(new THREE.SphereGeometry(.48*size,12,8),makeMaterial(THREE,FIRE_GOLD,.74,{additive:false}));gold.userData.baseOpacity=.74;group.add(gold);
  for(let index=0;index<9;index++){const angle=index*TAU/9,shard=new THREE.Mesh(new THREE.ConeGeometry(.08*size,.62*size,5),makeMaterial(THREE,index%3?FIRE_GOLD:FIRE,.92,{additive:false}));shard.rotation.z=-angle;shard.position.set(Math.cos(angle)*.38*size,(index%3-1)*.08*size,Math.sin(angle)*.38*size);shard.userData.baseOpacity=.92;group.add(shard);}
  group.position.set(position.x,position.y,position.z);group.renderOrder=10;scene.add(group);return group;
}
function makeTornadoVisual(THREE,scene,size){
  const group=new THREE.Group();group.name='Wizard Arcana Whirling Tornado source-first vortex';
  const shell=new THREE.Mesh(new THREE.ConeGeometry(1.5*size,2.9*size,30,1,true),makeMaterial(THREE,AIR,.16));shell.position.y=1.38*size;group.add(shell);
  for(let index=0;index<5;index++){const radius=(.62+index*.22)*size,ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.075*size,8,36),makeMaterial(THREE,index%2?AIR_HOT:AIR,.70-index*.07));ring.rotation.x=Math.PI/2;ring.position.y=(.28+index*.48)*size;ring.userData.tornadoRing=index;group.add(ring);}
  for(let index=0;index<12;index++){const wisp=new THREE.Mesh(new THREE.SphereGeometry((.10+(index%3)*.025)*size,9,6),makeMaterial(THREE,index%3?AIR:AIR_HOT,.64));const angle=index*TAU/12,radius=(.72+(index%4)*.16)*size;wisp.position.set(Math.cos(angle)*radius,(.24+(index%5)*.47)*size,Math.sin(angle)*radius);wisp.scale.set(1.8,.5,.7);wisp.userData.tornadoWisp=index;group.add(wisp);}
  const floor=new THREE.Mesh(new THREE.RingGeometry(.55*size,1.52*size,48),makeMaterial(THREE,AIR,.25));floor.rotation.x=-Math.PI/2;floor.position.y=.035;floor.userData.tornadoFloor=true;group.add(floor);
  group.renderOrder=6;scene.add(group);return group;
}
function makeWaterPrisonVisual(THREE,scene,size){
  const group=new THREE.Group();group.name='Wizard Arcana Water Prison source-first bubble';
  const outer=new THREE.Mesh(new THREE.SphereGeometry(.72*size,22,14),makeMaterial(THREE,WATER,.24,{additive:false}));outer.userData.prisonOuter=true;group.add(outer);
  const rim=new THREE.Mesh(new THREE.SphereGeometry(.76*size,16,10),makeMaterial(THREE,WATER_HOT,.28,{wireframe:true}));rim.rotation.y=.4;rim.userData.prisonRim=true;group.add(rim);
  const core=new THREE.Mesh(new THREE.SphereGeometry(.36*size,14,9),makeMaterial(THREE,WATER,.18));core.userData.prisonCore=true;group.add(core);
  for(let index=0;index<8;index++){const droplet=new THREE.Mesh(new THREE.SphereGeometry((.07+(index%2)*.025)*size,9,6),makeMaterial(THREE,index%3?WATER:WATER_HOT,.78));droplet.userData.prisonDroplet=index;group.add(droplet);}
  const seal=new THREE.Mesh(new THREE.TorusGeometry(.64*size,.035*size,8,28),makeMaterial(THREE,WATER_HOT,.68));seal.rotation.x=Math.PI/2;seal.userData.prisonSeal=true;group.add(seal);
  group.renderOrder=7;scene.add(group);return group;
}
function makePulse(THREE,scene,{x,y=.12,z,color,size=1,ring=false}={}){
  const mesh=new THREE.Mesh(ring?new THREE.RingGeometry(.35*size,.62*size,32):new THREE.SphereGeometry(.32*size,14,9),makeMaterial(THREE,color,.9));if(ring)mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);mesh.renderOrder=9;scene.add(mesh);return mesh;
}

export function installWizardRebuiltArcanaRuntime({THREE,scene,getPlayer,getEnemySystem,getMazeSegments=()=>[]}={}){
  const initial=readArcanaTweaks();
  const inert={state:{effects:[],sizeMultiplier:initial.sizeMultiplier,dragonStock:DRAGON_ARC_SPEC.stockMax,waterAmmo:WATER_PRISON_SPEC.ammoMax},update(){},reset(){},dispose(){}};
  if(!THREE||!scene||!isEnemyLabRuntime())return inert;
  const prisonLocks=new WeakMap();
  const state={effects:[],sizeMultiplier:initial.sizeMultiplier,dragonStock:DRAGON_ARC_SPEC.stockMax,dragonRechargeT:0,dragonVisualSerial:0,waterAmmo:WATER_PRISON_SPEC.ammoMax,waterRechargeT:0,lastCast:null};
  const add=effect=>(state.effects.push(effect),effect);
  function releasePrison(effect){
    const enemy=effect?.captured,lock=enemy&&prisonLocks.get(enemy);if(!lock)return;
    lock.count=Math.max(0,lock.count-1);enemy.__wizardWaterPrisonCount=lock.count;
    if(lock.count===0){prisonLocks.delete(enemy);delete enemy.__wizardWaterPrisonCount;if(enemy.stunState==='waterPrison'){enemy.stunState=null;enemy.stunStateRemaining=0;}}
  }
  function remove(effect){
    if(effect?.type==='waterPrison')releasePrison(effect);
    if(effect.mesh)disposeObject(effect.mesh);for(const mesh of effect.meshes||[])disposeObject(mesh);for(const flare of effect.flares||[])disposeObject(flare.mesh);
    const index=state.effects.indexOf(effect);if(index>=0)state.effects.splice(index,1);
  }
  function reset(){for(const effect of[...state.effects])remove(effect);state.dragonStock=DRAGON_ARC_SPEC.stockMax;state.dragonRechargeT=0;state.dragonVisualSerial=0;state.waterAmmo=WATER_PRISON_SPEC.ammoMax;state.waterRechargeT=0;}
  const currentSize=()=>clampArcanaSize(state.sizeMultiplier);
  function addPulse(position,color,size,ring=false,life=.28){add({type:'pulse',age:0,life,mesh:makePulse(THREE,scene,{x:position.x,y:position.y,z:position.z,color,size,ring})});}

  function castHomingFlares(){
    const spec=homingFlaresSpec(),size=currentSize(),flares=[];
    for(let index=0;index<spec.count;index++)flares.push({slot:index,mesh:makeFlareVisual(THREE,scene,size),position:{x:0,z:0},velocity:{x:0,z:0},launched:false,done:false,target:null,scanT:index*.025,flightAge:0});
    add({type:'homingFlares',age:0,spec,size,flares});return true;
  }
  function castDragonArc(){
    const count=Math.floor(state.dragonStock);if(count<=0)return false;state.dragonStock=0;state.dragonRechargeT=0;
    add({type:'dragonRelease',age:0,nextEmission:.03,remaining:count,emitted:0});return true;
  }
  function emitDragon(){
    const frame=playerFrame(getPlayer),spec=DRAGON_ARC_SPEC,size=currentSize(),position={x:frame.x+frame.forward.x*.9,z:frame.z+frame.forward.z*.9},mesh=makeDragonVisual(THREE,scene,size);
    mesh.position.set(position.x,.72*size,position.z);mesh.rotation.y=Math.atan2(frame.forward.x,frame.forward.z);
    add({type:'dragonProjectile',age:0,phase:(state.dragonVisualSerial++%13)*1.37,position,previous:{...position},direction:{...frame.forward},velocity:{x:frame.forward.x*spec.speed,z:frame.forward.z*spec.speed},distance:0,spec,size,hit:new Set(),mesh,walls:[...(getMazeSegments?.()||[])]});
    const muzzle=makeDragonMuzzleVisual(THREE,scene,size);muzzle.position.set(frame.x+frame.forward.x*.62,.70*size,frame.z+frame.forward.z*.62);muzzle.rotation.y=Math.atan2(frame.forward.x,frame.forward.z);add({type:'dragonMuzzle',age:0,life:.11,mesh:muzzle});
  }
  function castWhirlingTornado(){
    const frame=playerFrame(getPlayer),spec=whirlingTornadoSpec(),size=currentSize(),mesh=makeTornadoVisual(THREE,scene,size),position={x:frame.x,z:frame.z};mesh.position.set(position.x,0,position.z);
    add({type:'whirlingTornado',age:0,position,spec,size,nextTick:0,finished:false,mesh});return true;
  }
  function castWaterPrison(){
    if(state.waterAmmo<1)return false;state.waterAmmo-=1;if(state.waterAmmo<WATER_PRISON_SPEC.ammoMax&&state.waterRechargeT<=0)state.waterRechargeT=WATER_PRISON_SPEC.rechargeInterval;
    const frame=playerFrame(getPlayer),spec=waterPrisonSpec(),size=currentSize(),position={x:frame.x+frame.forward.x*1.0,z:frame.z+frame.forward.z*1.0},mesh=makeWaterPrisonVisual(THREE,scene,size*.78);
    mesh.position.set(position.x,.72*size,position.z);mesh.rotation.y=Math.atan2(frame.forward.x,frame.forward.z);
    add({type:'waterPrison',age:0,position,previous:{...position},direction:{...frame.forward},velocity:{x:frame.forward.x*spec.projectileSpeed,z:frame.forward.z*spec.projectileSpeed},distance:0,spec,size,captured:null,nextTick:0,mesh,walls:[...(getMazeSegments?.()||[])]});return true;
  }
  function cast(card){
    const id=card?.arcanaId;let didCast=false;if(id==='HOMING-FLARES')didCast=castHomingFlares();else if(id==='DRAGON-ARC')didCast=castDragonArc();else if(id==='WHIRLING-TORNADO')didCast=castWhirlingTornado();else if(id==='WATER-PRISON')didCast=castWaterPrison();else return false;
    if(didCast){state.lastCast=id;window.dispatchEvent(new CustomEvent('wizard-arcana:cast',{detail:{card,rebuilt:true}}));}return didCast;
  }

  function updateResources(dt){
    if(state.dragonStock<DRAGON_ARC_SPEC.stockMax){state.dragonRechargeT+=dt;while(state.dragonRechargeT>=DRAGON_ARC_SPEC.rechargeInterval&&state.dragonStock<DRAGON_ARC_SPEC.stockMax){state.dragonRechargeT-=DRAGON_ARC_SPEC.rechargeInterval;state.dragonStock++;}}
    if(state.waterAmmo<WATER_PRISON_SPEC.ammoMax){state.waterRechargeT-=dt;while(state.waterRechargeT<=0&&state.waterAmmo<WATER_PRISON_SPEC.ammoMax){state.waterAmmo++;if(state.waterAmmo<WATER_PRISON_SPEC.ammoMax)state.waterRechargeT+=WATER_PRISON_SPEC.rechargeInterval;else state.waterRechargeT=0;}}
  }
  function interceptAt(position,radius,system){for(const projectile of hostileProjectiles(system)){if(Math.hypot(projectile.x-position.x,projectile.z-position.z)<=radius+(Number(projectile.r)||.16)){destroyHostileProjectile(projectile);return projectile;}}return null;}
  function updateHomingFlares(effect,dt,system,now){
    effect.age+=dt;const frame=playerFrame(getPlayer);let remaining=0;
    for(const flare of effect.flares){
      if(flare.done)continue;remaining++;
      if(!flare.launched){
        const orbit=clockwiseOrbitPosition({ownerX:frame.x,ownerZ:frame.z,slot:flare.slot,count:effect.spec.count,age:effect.age,radius:1.28*effect.size});flare.position.x=orbit.x;flare.position.z=orbit.z;flare.mesh.position.set(orbit.x,(.72+.12*Math.sin(orbit.angle*2+now*5))*effect.size,orbit.z);flare.mesh.rotation.y=-orbit.angle;
        flare.scanT-=dt;if(flare.scanT<=0){flare.scanT=.11;const target=nearestEnemy(system,flare.position,effect.spec.acquisitionRange*effect.size);if(target){flare.launched=true;flare.target=target;const direction=normalize2(target.x-flare.position.x,target.z-flare.position.z,frame.forward);flare.velocity={x:direction.x*effect.spec.projectileSpeed,z:direction.z*effect.spec.projectileSpeed};}}
      }else{
        flare.flightAge+=dt;if(!flare.target||flare.target.hp<=0||!system?.enemies?.includes(flare.target))flare.target=nearestEnemy(system,flare.position,effect.spec.acquisitionRange*1.4*effect.size);
        if(flare.target){const desired=normalize2(flare.target.x-flare.position.x,flare.target.z-flare.position.z),turn=1-Math.exp(-dt*9.5);flare.velocity.x+=(desired.x*effect.spec.projectileSpeed-flare.velocity.x)*turn;flare.velocity.z+=(desired.z*effect.spec.projectileSpeed-flare.velocity.z)*turn;}
        const start={...flare.position};flare.position.x+=flare.velocity.x*dt;flare.position.z+=flare.velocity.z*dt;flare.mesh.position.set(flare.position.x,.67*effect.size,flare.position.z);flare.mesh.rotation.y=Math.atan2(flare.velocity.x,flare.velocity.z);flare.mesh.children.forEach((child,index)=>{if(child.userData?.hotCore)child.scale.setScalar(1+.18*Math.sin(now*21+index));});
        if(flare.target&&pointSegmentDistance2D(flare.target,start,flare.position)<=enemyRadius(flare.target,system)+.28*effect.size){damageEnemy(system,flare.target,effect.spec.damage,knockFrom(start,flare.target,effect.spec.sourceKnockback*.1),{power:.28,pop:.05,homingFlares:true});addPulse({x:flare.position.x,y:.62,z:flare.position.z},FIRE_HOT,effect.size,false,.22);flare.done=true;disposeObject(flare.mesh);flare.mesh=null;continue;}
        if(flare.flightAge>=effect.spec.projectileLifetime){flare.done=true;disposeObject(flare.mesh);flare.mesh=null;continue;}
      }
      if(interceptAt(flare.position,.28*effect.size,system)){addPulse({x:flare.position.x,y:.62,z:flare.position.z},FIRE_GOLD,effect.size,true,.24);flare.done=true;disposeObject(flare.mesh);flare.mesh=null;}
    }
    if(!remaining||effect.age>=effect.spec.storageDuration+effect.spec.projectileLifetime)remove(effect);
  }
  function updateDragonRelease(effect,dt){effect.age+=dt;while(effect.remaining>0&&effect.age>=effect.nextEmission){emitDragon();effect.remaining--;effect.emitted++;effect.nextEmission+=DRAGON_ARC_SPEC.emissionInterval;}if(effect.remaining<=0&&effect.age>=effect.nextEmission+.08)remove(effect);}
  function updateDragonProjectile(effect,dt,system,now){
    effect.age+=dt;const phase=effect.phase||0,start={...effect.position},end={x:start.x+effect.velocity.x*dt,z:start.z+effect.velocity.z*dt};if(firstWallHit(start,end,effect.walls)){const dissolve=makeDragonMuzzleVisual(THREE,scene,effect.size*.48);dissolve.position.set(start.x,.58*effect.size,start.z);dissolve.rotation.y=Math.atan2(effect.direction.x,effect.direction.z);add({type:'dragonMuzzle',age:0,life:.09,mesh:dissolve});remove(effect);return;}effect.previous=start;effect.position=end;effect.distance+=Math.hypot(end.x-start.x,end.z-start.z);effect.mesh.position.set(end.x,(.72+.045*Math.sin(now*13+phase))*effect.size,end.z);effect.mesh.rotation.y=Math.atan2(effect.direction.x,effect.direction.z);
    effect.mesh.children.forEach(child=>{
      if(Number.isFinite(child.userData?.dragonBodyLayer)){const index=child.userData.dragonBodyLayer,pulse=Math.sin(now*19-index*.9+effect.age*7+phase);child.scale.x=1+pulse*(.08-index*.015);child.scale.z=child.userData.baseScaleZ*(1-pulse*.07);child.rotation.z=pulse*(.025+index*.008);}
      else if(Number.isFinite(child.userData?.dragonTongue)){const index=child.userData.dragonTongue,wave=Math.sin(now*22-index*.73+effect.age*9+phase);child.position.x=child.userData.baseX+wave*(.08+.008*index)*effect.size;child.position.y=child.userData.baseY+Math.cos(now*18-index*.61+phase)*.045*effect.size;child.rotation.y=wave*.18;}
      else if(Number.isFinite(child.userData?.dragonEmber)){const index=child.userData.dragonEmber;child.position.x=child.userData.baseX+Math.sin(now*14+index*1.8+phase)*.12*effect.size;child.position.y=Math.cos(now*17+index+phase)*.10*effect.size;child.scale.setScalar(.75+.28*Math.sin(now*20+index+phase));}
      else if(Number.isFinite(child.userData?.dragonJaw)){const open=.050+.015*Math.sin(now*16+effect.age*8+phase);child.position.y=(child.userData.baseJawY+child.userData.dragonJaw*open)*effect.size;}
      else if(child.userData?.dragonHead||child.userData?.dragonFace){const pulse=1+.045*Math.sin(now*17+effect.age*6+phase);child.scale.x=(child.userData.baseScaleX||1)*pulse;}
      else if(child.userData?.dragonMouth)child.material.opacity=.70+.16*Math.sin(now*24+phase);
    });
    for(const enemy of aliveEnemies(system)){if(effect.hit.has(enemy))continue;if(pointSegmentDistance2D(enemy,start,end)>enemyRadius(enemy,system)+.52*effect.size)continue;effect.hit.add(enemy);damageEnemy(system,enemy,effect.spec.damage,knockFrom(start,enemy,effect.spec.sourceKnockback*.1),{power:.28,pop:.05,dragonArc:true});const impact=makeDragonImpactVisual(THREE,scene,{x:enemy.x,y:enemyCenterY(enemy,system),z:enemy.z},effect.size);add({type:'dragonImpact',age:0,life:.24,mesh:impact});}
    if(effect.distance>=effect.spec.range)remove(effect);
  }
  function updateDragonFlash(effect,dt){effect.age+=dt;const k=clamp(effect.age/effect.life,0,1),muzzle=effect.type==='dragonMuzzle';effect.mesh.traverse(child=>{if(child.material)child.material.opacity=(child.userData?.baseOpacity??child.material.opacity??.8)*Math.pow(1-k,muzzle?.58:.38);});effect.mesh.scale.setScalar(1+k*(muzzle?.34:1.12));effect.mesh.rotation.z+=(muzzle?1:-1)*dt*3.4;if(k>=1)remove(effect);}
  function resolveTornadoTick(effect,system){for(const enemy of aliveEnemies(system)){const distance=Math.hypot(enemy.x-effect.position.x,enemy.z-effect.position.z);if(distance>effect.spec.radius*effect.size+enemyRadius(enemy,system))continue;const inward=normalize2(effect.position.x-enemy.x,effect.position.z-enemy.z);damageEnemy(system,enemy,effect.spec.tickDamage,{x:inward.x*.34,z:inward.z*.34},{power:.22,pop:.025,whirlingTornadoTick:true,tick:effect.nextTick+1});}}
  function resolveTornadoFinisher(effect,system){for(const enemy of aliveEnemies(system)){const distance=Math.hypot(enemy.x-effect.position.x,enemy.z-effect.position.z);if(distance>effect.spec.radius*1.12*effect.size+enemyRadius(enemy,system))continue;damageEnemy(system,enemy,effect.spec.finisherDamage,knockFrom(effect.position,enemy,1.85),{power:.62,pop:.18,whirlingTornadoFinisher:true});}addPulse({x:effect.position.x,y:.06,z:effect.position.z},AIR_HOT,effect.spec.radius*effect.size,true,.38);}
  function updateWhirlingTornado(effect,dt,system,now){
    effect.age+=dt;while(effect.nextTick<effect.spec.tickTimes.length&&effect.age>=effect.spec.tickTimes[effect.nextTick]){resolveTornadoTick(effect,system);effect.nextTick++;}
    for(const projectile of hostileProjectiles(system)){if(Math.hypot(projectile.x-effect.position.x,projectile.z-effect.position.z)<=effect.spec.radius*effect.size+(Number(projectile.r)||.16)){addPulse({x:projectile.x,y:.32,z:projectile.z},AIR_HOT,effect.size,true,.18);destroyHostileProjectile(projectile);}}
    effect.mesh.rotation.y+=dt*4.8;effect.mesh.children.forEach(child=>{if(Number.isFinite(child.userData?.tornadoRing)){const index=child.userData.tornadoRing;child.rotation.z+=(index%2?1:-1)*dt*(5.2+index*.65);child.material.opacity=(.70-index*.07)*(.78+.22*Math.sin(now*12+index));}else if(Number.isFinite(child.userData?.tornadoWisp)){const index=child.userData.tornadoWisp,angle=now*(4.8+index%3)+index*TAU/12,radius=(.72+(index%4)*.16)*effect.size;child.position.x=Math.cos(angle)*radius;child.position.z=Math.sin(angle)*radius;}});
    if(!effect.finished&&effect.age>=effect.spec.duration){effect.finished=true;resolveTornadoFinisher(effect,system);}if(effect.finished&&effect.age>=effect.spec.duration+.18)remove(effect);
  }
  function captureWithWaterPrison(effect,enemy,system){
    effect.captured=enemy;effect.age=0;effect.nextTick=0;damageEnemy(system,enemy,effect.spec.impactDamage,{x:0,z:0},{power:.38,pop:.04,waterPrisonImpact:true});
    let lock=prisonLocks.get(enemy);if(!lock){lock={count:0,x:enemy.x,z:enemy.z};prisonLocks.set(enemy,lock);}lock.count++;effect.lock=lock;enemy.__wizardWaterPrisonCount=lock.count;effect.mesh.scale.setScalar(1.22+Math.min(3,lock.count-1)*.07);addPulse({x:enemy.x,y:enemyCenterY(enemy,system),z:enemy.z},WATER_HOT,effect.size,true,.28);
  }
  function lockPrisoner(effect,enemy){const lock=effect.lock;if(!lock)return;enemy.x=lock.x;enemy.z=lock.z;for(const key of['vx','vz','knockX','knockZ'])if(Number.isFinite(enemy[key]))enemy[key]=0;enemy.stunned=Math.max(enemy.stunned||0,.18);enemy.stunState='waterPrison';enemy.stunStateRemaining=Math.max(enemy.stunStateRemaining||0,.18);}
  function updateWaterPrison(effect,dt,system,now){
    if(!effect.captured){effect.age+=dt;const start={...effect.position},end={x:start.x+effect.velocity.x*dt,z:start.z+effect.velocity.z*dt};const wall=firstWallHit(start,end,effect.walls);if(wall){addPulse({x:wall.hit.x,y:.18,z:wall.hit.z},WATER,effect.size,true,.22);remove(effect);return;}effect.previous=start;effect.position=end;effect.distance+=Math.hypot(end.x-start.x,end.z-start.z);effect.mesh.position.set(end.x,.72*effect.size,end.z);effect.mesh.rotation.z+=dt*2.8;for(const enemy of aliveEnemies(system)){if(pointSegmentDistance2D(enemy,start,end)<=enemyRadius(enemy,system)+effect.spec.radius*effect.size){captureWithWaterPrison(effect,enemy,system);break;}}if(!effect.captured&&effect.distance>=effect.spec.range)remove(effect);return;}
    const enemy=effect.captured;if(!enemy||enemy.hp<=0||!system?.enemies?.includes(enemy)){remove(effect);return;}effect.age+=dt;lockPrisoner(effect,enemy);effect.mesh.position.set(effect.lock.x,enemyCenterY(enemy,system),effect.lock.z);effect.mesh.rotation.y+=dt*1.4;effect.mesh.rotation.z+=dt*.9;effect.mesh.children.forEach(child=>{if(Number.isFinite(child.userData?.prisonDroplet)){const index=child.userData.prisonDroplet,angle=now*(1.6+index%3*.28)+index*TAU/8,radius=(.48+.08*(index%2))*effect.size;child.position.set(Math.cos(angle)*radius,Math.sin(angle*1.7)*.44*effect.size,Math.sin(angle)*radius);}else if(child.userData?.prisonCore)child.scale.setScalar(.92+.13*Math.sin(now*7));});
    while(effect.nextTick<effect.spec.tickTimes.length&&effect.age>=effect.spec.tickTimes[effect.nextTick]){damageEnemy(system,enemy,effect.spec.tickDamage,{x:0,z:0},{power:.16,pop:.015,waterPrisonTick:true,tick:effect.nextTick+1});lockPrisoner(effect,enemy);addPulse({x:effect.lock.x,y:enemyCenterY(enemy,system),z:effect.lock.z},WATER_HOT,effect.size*.72,false,.18);effect.nextTick++;}
    if(effect.age>=effect.spec.captureDuration){addPulse({x:effect.lock.x,y:.06,z:effect.lock.z},WATER_HOT,effect.size*1.35,true,.34);remove(effect);}
  }
  function updatePulse(effect,dt){effect.age+=dt;const k=clamp(effect.age/effect.life,0,1);effect.mesh.material.opacity=.9*Math.pow(1-k,.5);effect.mesh.scale.setScalar(1+k*2.1);if(k>=1)remove(effect);}

  const onPlay=event=>cast(event?.detail?.card);
  const onTweaks=event=>{state.sizeMultiplier=clampArcanaSize(event?.detail?.sizeMultiplier);};
  window.addEventListener('wizard-arcana:play',onPlay);window.addEventListener(ARCANA_TWEAKS_EVENT,onTweaks);window.__WIZARD_REBUILT_ARCANA_RUNTIME__=state;
  return{state,cast,reset,update(dt,now=0){const frame=Math.max(0,Number(dt)||0),time=Number(now)||0,system=getEnemySystem?.();updateResources(frame);for(const effect of[...state.effects]){if(effect.type==='homingFlares')updateHomingFlares(effect,frame,system,time);else if(effect.type==='dragonRelease')updateDragonRelease(effect,frame);else if(effect.type==='dragonProjectile')updateDragonProjectile(effect,frame,system,time);else if(effect.type==='dragonMuzzle'||effect.type==='dragonImpact')updateDragonFlash(effect,frame);else if(effect.type==='whirlingTornado')updateWhirlingTornado(effect,frame,system,time);else if(effect.type==='waterPrison')updateWaterPrison(effect,frame,system,time);else if(effect.type==='pulse')updatePulse(effect,frame);}},dispose(){window.removeEventListener('wizard-arcana:play',onPlay);window.removeEventListener(ARCANA_TWEAKS_EVENT,onTweaks);reset();if(window.__WIZARD_REBUILT_ARCANA_RUNTIME__===state)delete window.__WIZARD_REBUILT_ARCANA_RUNTIME__;}};
}
