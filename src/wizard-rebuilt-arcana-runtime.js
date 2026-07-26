import { ARCANA_TWEAKS_EVENT, clampArcanaSize, readArcanaTweaks } from './wizard-arcana-settings.js';
import { pointSegmentDistance2D, segmentIntersection2D } from './wizard-arcana-runtime.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const TAU=Math.PI*2;
const FIRE=0xff6c31;
const FIRE_GOLD=0xffc74d;
const FIRE_HOT=0xffffc7;
const FIRE_WHITE=0xffffff;
const FIRE_DEEP=0xb52c16;
const FIRE_DARK=0x5a160f;
const FIRE_SOOT=0x24100c;
const DRAGON_ORANGE=0xff742c;
const DRAGON_DEEP=0xe63d18;
const DRAGON_SOOT=0x6f371b;
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
export const DRAGON_ARC_PLAYER_DIAMETER=2.1;
export const DRAGON_ARC_SPEC=Object.freeze({
  stockMax:8,rechargeInterval:.6,damage:8,sourceKnockback:8,
  initialEmissionDelay:2/60,emissionInterval:6/60,speed:39.4,range:17,
  originOffset:.9,pathAmplitude:.95*DRAGON_ARC_PLAYER_DIAMETER,
  pathWavelength:9*DRAGON_ARC_PLAYER_DIAMETER,
  proxyLength:2.5*DRAGON_ARC_PLAYER_DIAMETER,proxySegments:9,collisionRadius:.46,
  enhancedStockMax:10,enhancedPerBeat:2,chargedCount:20,
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
export function sampleDragonArcPath({origin={x:0,z:0},forward={x:0,z:1},right=null,distance=0,emissionIndex=0,amplitude=DRAGON_ARC_SPEC.pathAmplitude,wavelength=DRAGON_ARC_SPEC.pathWavelength}={}){
  const basisForward=normalize2(Number(forward?.x)||0,Number(forward?.z)||0),basisRight=right?normalize2(Number(right.x)||0,Number(right.z)||0,{x:basisForward.z,z:-basisForward.x}):{x:basisForward.z,z:-basisForward.x};
  const progress=Math.max(0,Number(distance)||0),safeAmplitude=Math.max(0,Number(amplitude)||0),safeWavelength=Math.max(1e-6,Number(wavelength)||DRAGON_ARC_SPEC.pathWavelength),parity=((Math.trunc(Number(emissionIndex)||0)%2)+2)%2;
  const phaseOffset=parity*Math.PI,wavePhase=TAU*progress/safeWavelength+phaseOffset,lateral=safeAmplitude*Math.sin(wavePhase),lateralDerivative=safeAmplitude*(TAU/safeWavelength)*Math.cos(wavePhase),tangent=normalize2(basisForward.x+basisRight.x*lateralDerivative,basisForward.z+basisRight.z*lateralDerivative,basisForward);
  return{x:(Number(origin?.x)||0)+basisForward.x*progress+basisRight.x*lateral,z:(Number(origin?.z)||0)+basisForward.z*progress+basisRight.z*lateral,distance:progress,lateral,phaseOffset,wavePhase,tangent,yaw:Math.atan2(tangent.x,tangent.z)};
}
export function sampleDragonArcBody({headDistance=0,length=DRAGON_ARC_SPEC.proxyLength,segmentCount=DRAGON_ARC_SPEC.proxySegments,...path}={}){
  const count=Math.max(2,Math.trunc(Number(segmentCount)||DRAGON_ARC_SPEC.proxySegments)),span=Math.max(0,Number(length)||0),spacing=span/(count-1),head=Math.max(0,Number(headDistance)||0);
  return Array.from({length:count},(_,index)=>{const rawDistance=head-index*spacing,sample=sampleDragonArcPath({...path,distance:Math.max(0,rawDistance)});return{...sample,index,visible:rawDistance>=-1e-9};});
}
export function dragonArcMotionMetrics(){
  return{
    playerDiameter:DRAGON_ARC_PLAYER_DIAMETER,
    amplitude:DRAGON_ARC_SPEC.pathAmplitude,amplitudePlayerDiameters:DRAGON_ARC_SPEC.pathAmplitude/DRAGON_ARC_PLAYER_DIAMETER,
    peakToPeak:DRAGON_ARC_SPEC.pathAmplitude*2,peakToPeakPlayerDiameters:DRAGON_ARC_SPEC.pathAmplitude*2/DRAGON_ARC_PLAYER_DIAMETER,
    wavelength:DRAGON_ARC_SPEC.pathWavelength,wavelengthPlayerDiameters:DRAGON_ARC_SPEC.pathWavelength/DRAGON_ARC_PLAYER_DIAMETER,
    initialEmissionDelay:DRAGON_ARC_SPEC.initialEmissionDelay,cadence:DRAGON_ARC_SPEC.emissionInterval,baseReleaseSpan:(DRAGON_ARC_SPEC.stockMax-1)*DRAGON_ARC_SPEC.emissionInterval,
    adjacentPhaseDegrees:180,everyOtherPhaseDifferenceDegrees:0,
    speed:DRAGON_ARC_SPEC.speed,proxyLength:DRAGON_ARC_SPEC.proxyLength,proxyLengthPlayerDiameters:DRAGON_ARC_SPEC.proxyLength/DRAGON_ARC_PLAYER_DIAMETER,proxySegments:DRAGON_ARC_SPEC.proxySegments,
  };
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
function playerFrame(getPlayer){const player=getPlayer?.()||{},rawX=Number(player.forwardX),rawZ=Number(player.forwardZ),forward=normalize2(Number.isFinite(rawX)?rawX:0,Number.isFinite(rawZ)?rawZ:1);return{x:Number(player.x)||0,z:Number(player.z)||0,forward,right:{x:forward.z,z:-forward.x}};}
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
function tagged(mesh,key,value=true){mesh.userData[key]=value;return mesh;}
function makeDragonSerpentVisual(THREE,scene,size){
  const group=new THREE.Group();group.name='Wizard Arcana Dragon Arc source-locked flame serpent';const nodes=[];
  const markers={stage:'finished',head:1,headLength:3.35,headWidth:1.95,headShare:.64,openJaw:true,jawLateralSpread:.36,upperJaw:1,lowerJaw:1,mouth:1,teeth:4,horns:2,eyeSockets:2,eyes:2,throatFan:3,mantleSegments:2,flameTongues:3,luminousMasses:5,bodySegments:DRAGON_ARC_SPEC.proxySegments-1,hotBodyCores:2,tail:1,flameLayers:3,embers:0,sootPuffs:0,groundGlows:0};
  for(let index=0;index<DRAGON_ARC_SPEC.proxySegments;index++){
    const progress=index/(DRAGON_ARC_SPEC.proxySegments-1),node=new THREE.Group();node.name=index===0?'Dragon Arc articulated head':`Dragon Arc articulated body ${index}`;node.userData.dragonPathSample=index;
    if(index===0){
      const skull=tagged(new THREE.Mesh(new THREE.DodecahedronGeometry(.48*size,1),makeMaterial(THREE,DRAGON_ORANGE,.98,{additive:false})),'dragonHead');skull.position.z=-.14*size;skull.scale.set(1.76,.82,1.80);node.add(skull);
      const crown=tagged(new THREE.Mesh(new THREE.DodecahedronGeometry(.42*size,0),makeMaterial(THREE,DRAGON_ORANGE,.68)),'dragonFlameShell');crown.position.set(0,.025*size,-.22*size);crown.scale.set(1.72,.68,1.76);node.add(crown);
      const core=tagged(new THREE.Mesh(new THREE.DodecahedronGeometry(.10*size,0),makeMaterial(THREE,FIRE_GOLD,.72)),'dragonFlameCore');core.position.set(0,.12*size,.05*size);core.scale.set(1.55,.38,2.20);node.add(core);
      const upperJaw=tagged(new THREE.Mesh(new THREE.DodecahedronGeometry(.34*size,0),makeMaterial(THREE,DRAGON_ORANGE,.98,{additive:false})),'dragonUpperJaw');upperJaw.position.set(-.18*size,.08*size,.72*size);upperJaw.scale.set(1.38,.42,1.92);upperJaw.rotation.y=.21;node.add(upperJaw);
      const lowerJaw=tagged(new THREE.Mesh(new THREE.DodecahedronGeometry(.31*size,0),makeMaterial(THREE,DRAGON_DEEP,.98,{additive:false})),'dragonLowerJaw');lowerJaw.position.set(.18*size,-.27*size,.68*size);lowerJaw.scale.set(1.34,.31,1.90);lowerJaw.rotation.x=.12;lowerJaw.rotation.y=-.21;node.add(lowerJaw);
      const mouth=tagged(new THREE.Mesh(new THREE.DodecahedronGeometry(.30*size,0),makeMaterial(THREE,FIRE_SOOT,1,{additive:false})),'dragonMouth');mouth.position.set(0,-.10*size,.68*size);mouth.scale.set(1.65,.44,2.00);node.add(mouth);
      const snoutGlow=tagged(new THREE.Mesh(new THREE.DodecahedronGeometry(.10*size,0),makeMaterial(THREE,FIRE_GOLD,.70)),'dragonSnoutGlow');snoutGlow.position.set(-.16*size,.18*size,.98*size);snoutGlow.scale.set(1.16,.28,1.48);node.add(snoutGlow);
      for(let toothIndex=0;toothIndex<4;toothIndex++){const side=toothIndex%2?1:-1,tooth=tagged(new THREE.Mesh(new THREE.ConeGeometry(.065*size,.22*size,5),makeMaterial(THREE,toothIndex<2?FIRE_WHITE:FIRE_GOLD,.90)),'dragonTooth',toothIndex);tooth.position.set(side*(.19+(toothIndex>1?.13:0))*size,(toothIndex<2?-.04:-.19)*size,(.91-(toothIndex>1?.10:0))*size);tooth.rotation.z=toothIndex<2?Math.PI:0;node.add(tooth);}
      for(const side of[-1,1]){
        const horn=tagged(new THREE.Mesh(new THREE.ConeGeometry(.15*size,.92*size,6),makeMaterial(THREE,FIRE_GOLD,.90,{additive:false})),'dragonHorn',side);horn.position.set(side*.55*size,.22*size,-.38*size);horn.rotation.x=-1.08;horn.rotation.z=side*.28;node.add(horn);
        const brow=tagged(new THREE.Mesh(new THREE.DodecahedronGeometry(.13*size,0),makeMaterial(THREE,FIRE_GOLD,.70)),'dragonBrow',side);brow.position.set(side*.39*size,.19*size,.30*size);brow.scale.set(1.42,.38,1.24);node.add(brow);
        const socket=tagged(new THREE.Mesh(new THREE.DodecahedronGeometry(.12*size,0),makeMaterial(THREE,FIRE_SOOT,1,{additive:false})),'dragonEyeSocket',side);socket.position.set(side*.43*size,.15*size,.40*size);socket.scale.set(1.45,.58,1.35);node.add(socket);
        const eye=tagged(new THREE.Mesh(new THREE.SphereGeometry(.036*size,8,5),makeMaterial(THREE,FIRE_GOLD,.84)),'dragonEye',side);eye.position.set(side*.44*size,.16*size,.43*size);node.add(eye);
      }
      for(let crestIndex=0;crestIndex<3;crestIndex++){
        const crestLength=(.98-crestIndex*.12)*size,crest=tagged(new THREE.Mesh(new THREE.ConeGeometry((.17-crestIndex*.020)*size,crestLength,6),makeMaterial(THREE,crestIndex===0?DRAGON_ORANGE:FIRE_GOLD,.76,{additive:crestIndex!==0})),'dragonCrest',crestIndex);crest.position.set((crestIndex%2?-.13:.13)*size,(.28-crestIndex*.02)*size,(-.65-crestIndex*.34)*size);crest.rotation.x=-Math.PI/2;crest.rotation.z=(crestIndex%2?1:-1)*.16;node.add(crest);
      }
      for(let fanIndex=0;fanIndex<3;fanIndex++){const side=fanIndex-1,fan=tagged(new THREE.Mesh(new THREE.ConeGeometry((.17-Math.abs(side)*.022)*size,(.78-Math.abs(side)*.08)*size,5),makeMaterial(THREE,fanIndex===1?FIRE_GOLD:DRAGON_ORANGE,.66)),'dragonThroatFan',fanIndex);fan.position.set(side*.35*size,-.03*size,(-.65-Math.abs(side)*.10)*size);fan.rotation.x=-Math.PI/2;fan.rotation.z=side*.22;node.add(fan);}
    }else{
      const radii=[0,.45,.35,.24,.15,.10,.07,0,0],radius=radii[index]*size,length=radius*4,mantle=index<=2,smokeOnly=index>=6;
      if(!smokeOnly){
        const solid=tagged(new THREE.Mesh(mantle?new THREE.DodecahedronGeometry(radius,0):new THREE.ConeGeometry(radius,length,5),makeMaterial(THREE,index%3===0?DRAGON_DEEP:DRAGON_ORANGE,.96,{additive:false})),'dragonBodySegment',index);if(mantle){solid.scale.set(1,.72,2);solid.position.z=-.18*size;solid.userData.dragonMantle=index;}else{solid.rotation.x=-Math.PI/2;solid.position.z=-length*.34;solid.userData.dragonFlameTongue=index;}node.add(solid);
        if(index<=4){const shell=tagged(new THREE.Mesh(new THREE.ConeGeometry(radius*.60,length*.90,5),makeMaterial(THREE,index%2?DRAGON_ORANGE:FIRE_GOLD,.56-progress*.08)),'dragonFlameShell',index);shell.rotation.x=-Math.PI/2;shell.position.set((index%2?1:-1)*.035*size,.025*size,-length*.32);node.add(shell);}
        if(mantle){const core=tagged(new THREE.Mesh(new THREE.ConeGeometry(radius*.24,length*.65,5),makeMaterial(THREE,FIRE_GOLD,.66)),'dragonFlameCore',index);core.rotation.x=-Math.PI/2;core.position.set(0,.05*size,-length*.26);node.add(core);}
        const wispLength=length*.58,wisp=tagged(new THREE.Mesh(new THREE.ConeGeometry(radius*.32,wispLength,4),makeMaterial(THREE,index%2?FIRE_GOLD:DRAGON_ORANGE,.40-progress*.08)),'dragonFlameWisp',index);wisp.rotation.x=-Math.PI/2;wisp.rotation.z=(index%2?1:-1)*.28;wisp.position.set((index%2?1:-1)*radius*.66,.03*size,-length*.31);node.add(wisp);
        const crest=tagged(new THREE.Mesh(new THREE.ConeGeometry(Math.max(.03*size,radius*.25),Math.max(.12*size,length*.38),4),makeMaterial(THREE,index%2?FIRE_GOLD:DRAGON_ORANGE,.48)),'dragonBodyCrest',index);crest.position.set(0,radius*.58,-length*.20);crest.rotation.x=-Math.PI/2;crest.rotation.z=(index%2?1:-1)*.18;node.add(crest);
      }
      if(index===DRAGON_ARC_SPEC.proxySegments-1)node.userData.dragonTail=true;
    }
    const emberCount=index===0?2:index<=5?1:0;
    for(let emberIndex=0;emberIndex<emberCount;emberIndex++){
      const phase=index*1.73+emberIndex*2.31,ember=tagged(new THREE.Mesh(new THREE.SphereGeometry((.035+(emberIndex%2)*.016)*size,7,5),makeMaterial(THREE,emberIndex%2?FIRE_HOT:FIRE_GOLD,.78)),'dragonEmber',index*3+emberIndex);ember.userData.emberPhase=phase;ember.userData.baseX=(emberIndex?1:-1)*(.16+.035*index)*size;ember.userData.baseY=(.16+.035*(emberIndex%2))*size;ember.userData.baseZ=(-.18-.12*emberIndex)*size;ember.position.set(ember.userData.baseX,ember.userData.baseY,ember.userData.baseZ);node.add(ember);markers.embers++;
    }
    if(index>=6)for(let puffIndex=0;puffIndex<2;puffIndex++){const puffRadius=(.14+puffIndex*.04+(index%2)*.01)*size,puff=tagged(new THREE.Mesh(new THREE.SphereGeometry(puffRadius,8,5),makeMaterial(THREE,(index+puffIndex)%2?DRAGON_SOOT:DRAGON_DEEP,.28+puffIndex*.07,{additive:false})),'dragonSootPuff',(index-6)*2+puffIndex);puff.userData.sootPhase=index*1.91+puffIndex*2.17;puff.userData.baseX=(puffIndex?1:-1)*(.10+.018*index)*size;puff.userData.baseY=(.07+.04*puffIndex)*size;puff.userData.baseZ=(-.20-.07*index-.10*puffIndex)*size;puff.position.set(puff.userData.baseX,puff.userData.baseY,puff.userData.baseZ);puff.scale.set(1.12,.72,1.30);node.add(puff);markers.sootPuffs++;}
    nodes.push(node);group.add(node);
  }
  group.renderOrder=7;scene.add(group);return{mesh:group,nodes,markers};
}
function makeDragonLaunchVisual(THREE,scene,position,forward,size){
  const group=new THREE.Group();group.name='Wizard Arcana Dragon Arc launch flare';group.position.set(position.x,0,position.z);group.rotation.y=Math.atan2(forward.x,forward.z);
  const core=tagged(new THREE.Mesh(new THREE.SphereGeometry(.24*size,12,8),makeMaterial(THREE,FIRE_WHITE,.94)),'dragonLaunchCore');core.position.set(0,.70*size,.12*size);core.scale.set(1,.72,1.45);core.userData.baseOpacity=.94;group.add(core);
  for(let index=0;index<5;index++){const streak=tagged(new THREE.Mesh(new THREE.SphereGeometry((.13-index*.014)*size,9,6),makeMaterial(THREE,index%2?DRAGON_ORANGE:FIRE_GOLD,.72-index*.07)),'dragonLaunchStreak',index);streak.position.set((index%2?1:-1)*(.11+.025*index)*size,(.38+.07*(index%3))*size,(-.12-.18*index)*size);streak.scale.set(.72,.64,1.55);streak.userData.baseOpacity=.72-index*.07;group.add(streak);}
  group.renderOrder=8;scene.add(group);return group;
}
function makeDragonImpactVisual(THREE,scene,position,size){
  const group=new THREE.Group();group.name='Wizard Arcana Dragon Arc white-gold impact';group.position.set(position.x,position.y??.55*size,position.z);
  const shell=tagged(new THREE.Mesh(new THREE.SphereGeometry(.38*size,14,9),makeMaterial(THREE,FIRE_GOLD,.74)),'dragonImpactShell');shell.userData.baseOpacity=.74;group.add(shell);
  const core=tagged(new THREE.Mesh(new THREE.SphereGeometry(.23*size,12,8),makeMaterial(THREE,FIRE_WHITE,.99)),'dragonImpactCore');core.userData.baseOpacity=.99;group.add(core);
  const ring=tagged(new THREE.Mesh(new THREE.TorusGeometry(.37*size,.045*size,7,28),makeMaterial(THREE,FIRE_HOT,.88)),'dragonImpactRing');ring.rotation.x=Math.PI/2;ring.userData.baseOpacity=.88;group.add(ring);
  for(let index=0;index<6;index++){const angle=index*TAU/6,spark=tagged(new THREE.Mesh(new THREE.SphereGeometry(.065*size,8,5),makeMaterial(THREE,index%2?FIRE_WHITE:FIRE_GOLD,.90)),'dragonImpactSpark',index);spark.userData.baseX=Math.cos(angle)*.37*size;spark.userData.baseZ=Math.sin(angle)*.37*size;spark.position.set(spark.userData.baseX,(index%2?-.07:.07)*size,spark.userData.baseZ);spark.scale.set(.55,.55,1.42);spark.rotation.y=angle;spark.userData.baseOpacity=.90;group.add(spark);}
  group.renderOrder=10;scene.add(group);return group;
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
  const inertState={effects:[],elapsed:0,sizeMultiplier:initial.sizeMultiplier,dragonStock:DRAGON_ARC_SPEC.stockMax,waterAmmo:WATER_PRISON_SPEC.ammoMax};
  const inert={state:inertState,update(){},reset(){},snapshot(){return{simulationTime:0,dragonStock:inertState.dragonStock,dragonArc:dragonArcMotionMetrics(),effects:[]};},dispose(){}};
  if(!THREE||!scene||!isEnemyLabRuntime())return inert;
  const prisonLocks=new WeakMap();
  const state={effects:[],elapsed:0,sizeMultiplier:initial.sizeMultiplier,dragonStock:DRAGON_ARC_SPEC.stockMax,dragonRechargeT:0,waterAmmo:WATER_PRISON_SPEC.ammoMax,waterRechargeT:0,lastCast:null};
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
  function reset(){for(const effect of[...state.effects])remove(effect);state.elapsed=0;state.dragonStock=DRAGON_ARC_SPEC.stockMax;state.dragonRechargeT=0;state.waterAmmo=WATER_PRISON_SPEC.ammoMax;state.waterRechargeT=0;}
  const currentSize=()=>clampArcanaSize(state.sizeMultiplier);
  function addPulse(position,color,size,ring=false,life=.28){add({type:'pulse',age:0,life,mesh:makePulse(THREE,scene,{x:position.x,y:position.y,z:position.z,color,size,ring})});}
  function addDragonTransient(mesh,position,size,visualKind,life){return add({type:'arcanaTransientFx',arcanaId:'DRAGON-ARC',visualStage:'finished',visualKind,age:0,life,position:{x:position.x,y:position.y??0,z:position.z},size,mesh});}
  function emitDragonImpact(position,size,impactKind='enemy'){return addDragonTransient(makeDragonImpactVisual(THREE,scene,position,size),position,size,`impact-${impactKind}`,.15);}

  function castHomingFlares(){
    const spec=homingFlaresSpec(),size=currentSize(),flares=[];
    for(let index=0;index<spec.count;index++)flares.push({slot:index,mesh:makeFlareVisual(THREE,scene,size),position:{x:0,z:0},velocity:{x:0,z:0},launched:false,done:false,target:null,scanT:index*.025,flightAge:0});
    add({type:'homingFlares',age:0,spec,size,flares});return true;
  }
  function castDragonArc(){
    const count=Math.floor(state.dragonStock);if(count<=0)return false;state.dragonStock=0;state.dragonRechargeT=0;
    add({type:'dragonRelease',age:0,castAt:state.elapsed,nextEmission:DRAGON_ARC_SPEC.initialEmissionDelay,remaining:count,emitted:0});return true;
  }
  function updateDragonMotionProxy(effect){
    const body=sampleDragonArcBody({origin:effect.origin,forward:effect.forward,right:effect.right,headDistance:effect.distance,emissionIndex:effect.emissionIndex,length:effect.spec.proxyLength,segmentCount:effect.spec.proxySegments,amplitude:effect.spec.pathAmplitude,wavelength:effect.spec.pathWavelength});effect.bodySamples=body;
    body.forEach((sample,index)=>{
      const node=effect.proxyNodes[index];if(!node)return;node.visible=sample.visible;node.position.set(sample.x,.72*effect.size,sample.z);node.rotation.y=sample.yaw;const launchFrames=effect.age*60,launchScale=launchFrames<=3?.65+launchFrames/3*.40:launchFrames<=5?1.05-(launchFrames-3)/2*.05:1;node.scale.setScalar(launchScale);
      node.children.forEach((child,childIndex)=>{
        if(child.userData?.dragonEmber!==undefined){const phase=child.userData.emberPhase+effect.age*(11+index*.27),pulse=.72+.28*Math.sin(phase*1.37);child.position.set(child.userData.baseX+Math.sin(phase)*.065*effect.size,child.userData.baseY+Math.abs(Math.cos(phase*.83))*.075*effect.size,child.userData.baseZ-Math.abs(Math.sin(phase*.61))*.10*effect.size);child.scale.setScalar(.78+.22*pulse);child.material.opacity=.52+.30*Math.max(0,pulse);return;}
        if(child.userData?.dragonSootPuff!==undefined){const phase=child.userData.sootPhase+effect.age*(5.2+index*.12);child.position.set(child.userData.baseX+Math.sin(phase)*.055*effect.size,child.userData.baseY+Math.abs(Math.sin(phase*.73))*.08*effect.size,child.userData.baseZ-Math.abs(Math.cos(phase*.61))*.10*effect.size);child.material.opacity=.18+.16*(.5+.5*Math.sin(phase));return;}
        if(child.userData?.dragonFlameCore!==undefined||child.userData?.dragonFlameShell!==undefined||child.userData?.dragonFlameWisp!==undefined){if(!child.userData.baseDragonScale)child.userData.baseDragonScale={x:child.scale.x,y:child.scale.y,z:child.scale.z};const base=child.userData.baseDragonScale,pulse=1+(child.userData?.dragonFlameCore!==undefined ? .075 : .045)*Math.sin(effect.age*(18+index*.35)+index*1.43+childIndex*.31);child.scale.set(base.x*pulse,base.y/pulse,base.z*(2-pulse));}
        if(child.userData?.dragonEye!==undefined)child.material.opacity=.86+.14*Math.sin(effect.age*22+index);
      });
    });
  }
  function emitDragon(emissionIndex=0,emittedAt=state.elapsed){
    const frame=playerFrame(getPlayer),spec=DRAGON_ARC_SPEC,size=currentSize(),origin={x:frame.x+frame.forward.x*spec.originOffset,z:frame.z+frame.forward.z*spec.originOffset},proxy=makeDragonSerpentVisual(THREE,scene,size),sample=sampleDragonArcPath({origin,forward:frame.forward,right:frame.right,distance:0,emissionIndex,amplitude:spec.pathAmplitude,wavelength:spec.pathWavelength});
    addDragonTransient(makeDragonLaunchVisual(THREE,scene,origin,frame.forward,size),origin,size,'launch',.16);
    const effect=add({type:'dragonProjectile',visualStage:'finished',visualMarkers:proxy.markers,age:0,emittedAt,emissionIndex,origin,forward:{...frame.forward},right:{...frame.right},position:{x:sample.x,z:sample.z},previous:{x:sample.x,z:sample.z},tangent:{...sample.tangent},lateral:sample.lateral,distance:0,spec,size,hit:new Set(),mesh:proxy.mesh,proxyNodes:proxy.nodes,bodySamples:[],walls:[...(getMazeSegments?.()||[])]});updateDragonMotionProxy(effect);
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
  function updateDragonRelease(effect,dt){effect.age+=dt;while(effect.remaining>0&&effect.age+1e-9>=effect.nextEmission){emitDragon(effect.emitted,effect.castAt+effect.nextEmission);effect.remaining--;effect.emitted++;effect.nextEmission+=DRAGON_ARC_SPEC.emissionInterval;}if(effect.remaining<=0&&effect.age>=effect.nextEmission+.08)remove(effect);}
  function updateDragonProjectile(effect,dt,system){
    effect.age+=dt;const start={...effect.position},nextDistance=Math.min(effect.spec.range,effect.distance+effect.spec.speed*dt),sample=sampleDragonArcPath({origin:effect.origin,forward:effect.forward,right:effect.right,distance:nextDistance,emissionIndex:effect.emissionIndex,amplitude:effect.spec.pathAmplitude,wavelength:effect.spec.pathWavelength}),end={x:sample.x,z:sample.z};
    const wall=firstWallHit(start,end,effect.walls);if(wall){emitDragonImpact({x:wall.hit.x,y:.55*effect.size,z:wall.hit.z},effect.size,'wall');remove(effect);return;}
    effect.previous=start;effect.position=end;effect.distance=nextDistance;effect.tangent={...sample.tangent};effect.lateral=sample.lateral;updateDragonMotionProxy(effect);
    for(const enemy of aliveEnemies(system)){if(effect.hit.has(enemy))continue;if(pointSegmentDistance2D(enemy,start,end)>enemyRadius(enemy,system)+effect.spec.collisionRadius*effect.size)continue;effect.hit.add(enemy);damageEnemy(system,enemy,effect.spec.damage,knockFrom(start,enemy,effect.spec.sourceKnockback*.1),{power:.28,pop:.05,dragonArc:true,dragonArcEmission:effect.emissionIndex});emitDragonImpact({x:enemy.x,y:enemyCenterY(enemy,system),z:enemy.z},effect.size,'enemy');}
    if(effect.distance>=effect.spec.range)remove(effect);
  }
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
  function updateDragonTransient(effect,dt){
    effect.age+=dt;const k=clamp(effect.age/effect.life,0,1),launch=effect.visualKind==='launch',scale=launch ? .88+k*.22 : .78+k*1.04;effect.mesh.scale.setScalar(scale);
    effect.mesh.children.forEach((child,index)=>{const base=child.userData?.baseOpacity??child.material?.opacity??.8;if(child.material)child.material.opacity=base*Math.pow(1-k,launch ? .62 : .42);if(child.userData?.dragonImpactSpark!==undefined){const outward=1+k*1.25;child.position.x=child.userData.baseX*outward;child.position.z=child.userData.baseZ*outward;child.scale.z=1.48*(1+k*.72);}else if(child.userData?.dragonLaunchStreak!==undefined)child.position.z-=dt*(1.2+index*.18)*effect.size;});
    if(k>=1)remove(effect);
  }

  function snapshot(){
    const effects=state.effects.map(effect=>{
      const base={type:effect.type,age:Number(effect.age)||0};
      if(effect.type==='dragonRelease')return{...base,remaining:effect.remaining,emitted:effect.emitted,nextEmission:effect.nextEmission,castAt:effect.castAt};
      if(effect.type==='arcanaTransientFx')return{...base,arcanaId:effect.arcanaId,visualStage:effect.visualStage,visualKind:effect.visualKind,position:{...effect.position}};
      if(effect.type!=='dragonProjectile')return base;
      return{...base,visualStage:effect.visualStage,visualMarkers:{...effect.visualMarkers},emittedAt:effect.emittedAt,emissionIndex:effect.emissionIndex,distance:effect.distance,position:{x:effect.position.x,z:effect.position.z},previous:{x:effect.previous.x,z:effect.previous.z},tangent:{x:effect.tangent.x,z:effect.tangent.z},lateral:effect.lateral,origin:{x:effect.origin.x,z:effect.origin.z},forward:{x:effect.forward.x,z:effect.forward.z},right:{x:effect.right.x,z:effect.right.z},body:(effect.bodySamples||[]).map(sample=>({index:sample.index,visible:sample.visible,distance:sample.distance,x:sample.x,z:sample.z,lateral:sample.lateral,tangent:{x:sample.tangent.x,z:sample.tangent.z},yaw:sample.yaw}))};
    });
    return{simulationTime:state.elapsed,dragonStock:state.dragonStock,dragonArc:dragonArcMotionMetrics(),effects};
  }

  const onPlay=event=>cast(event?.detail?.card);
  const onTweaks=event=>{state.sizeMultiplier=clampArcanaSize(event?.detail?.sizeMultiplier);};
  window.addEventListener('wizard-arcana:play',onPlay);window.addEventListener(ARCANA_TWEAKS_EVENT,onTweaks);window.__WIZARD_REBUILT_ARCANA_RUNTIME__=state;
  return{state,cast,reset,snapshot,update(dt,now=0){const frame=Math.max(0,Number(dt)||0),time=Number(now)||0,system=getEnemySystem?.();state.elapsed+=frame;updateResources(frame);for(const effect of[...state.effects]){if(effect.type==='homingFlares')updateHomingFlares(effect,frame,system,time);else if(effect.type==='dragonRelease')updateDragonRelease(effect,frame);else if(effect.type==='dragonProjectile')updateDragonProjectile(effect,frame,system);else if(effect.type==='arcanaTransientFx')updateDragonTransient(effect,frame);else if(effect.type==='whirlingTornado')updateWhirlingTornado(effect,frame,system,time);else if(effect.type==='waterPrison')updateWaterPrison(effect,frame,system,time);else if(effect.type==='pulse')updatePulse(effect,frame);}},dispose(){window.removeEventListener('wizard-arcana:play',onPlay);window.removeEventListener(ARCANA_TWEAKS_EVENT,onTweaks);reset();if(window.__WIZARD_REBUILT_ARCANA_RUNTIME__===state)delete window.__WIZARD_REBUILT_ARCANA_RUNTIME__;}};
}
