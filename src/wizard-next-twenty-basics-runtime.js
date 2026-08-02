import { ARCANA_TWEAKS_EVENT, clampArcanaSize, readArcanaTweaks } from './wizard-arcana-settings.js';
import { pointSegmentDistance2D, segmentIntersection2D } from './wizard-arcana-runtime.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const TAU=Math.PI*2;
const ICE=0x82dfff;
const ICE_HOT=0xf4ffff;
const ICE_DEEP=0x3a79db;
const WATER=0x55c9ed;
const WATER_HOT=0xf1ffff;
const WATER_DEEP=0x167eb5;
const CHAOS=0x8c45e8;
const CHAOS_HOT=0xf0d9ff;
const CHAOS_DEEP=0x160923;

export const WIZARD_NEXT_TWENTY_BASICS_SEMANTIC_EVENT='wizard-arcana:semantic';
export const SOURCE_KNOCKBACK_WORLD_SCALE=.1;

// Frame-audited base-form timing. Enhanced carriers are intentionally absent.
export const ICE_DAGGER_BEATS=Object.freeze([
  Object.freeze({time:.05,beat:1,damage:6}),
  Object.freeze({time:.27,beat:2,damage:6}),
  Object.freeze({time:.49,beat:3,damage:8}),
  Object.freeze({time:.73,beat:4,damage:10}),
]);
export const RIP_TIDE_BEATS=Object.freeze([
  Object.freeze({time:.05,beat:1,damage:8}),
  Object.freeze({time:.19,beat:2,damage:7}),
  Object.freeze({time:.33,beat:3,damage:5}),
]);
export const AQUA_ARC_BEATS=Object.freeze([
  Object.freeze({time:.05,beat:1,count:1}),
  Object.freeze({time:.31,beat:2,count:1}),
  Object.freeze({time:.58,beat:3,count:2}),
]);
export const CHAOS_CRUSHER_BEATS=Object.freeze([
  Object.freeze({time:.05,beat:1}),
  Object.freeze({time:.34,beat:2}),
  Object.freeze({time:.63,beat:3}),
]);

export function iceDaggerBeatSpec({beat=1}={}){
  const index=clamp(Math.round(Number(beat)||1),1,4)-1;
  return Object.freeze({
    beat:index+1,
    damage:[6,6,8,10][index],
    reach:[2.75,2.85,3.05,3.35][index],
    halfWidth:[.31,.32,.35,.40][index],
    advance:[.58,.62,.72,.84][index],
    targetPush:[.82,.86,1.02,1.24][index],
    life:[.19,.19,.21,.25][index],
    movementGate:.12,
    steerable:true,
    releasesShard:false,
    freezes:false,
  });
}

export function ripTideRippleSpec({beat=1}={}){
  const index=clamp(Math.round(Number(beat)||1),1,3)-1;
  return Object.freeze({
    beat:index+1,
    damage:[8,7,5][index],
    speed:14.8,
    range:7.25,
    radius:.63,
    visualWidth:1.72,
    visualLength:1.12,
    knockback:.45,
    piercesEnemies:true,
    destroysHostileProjectiles:true,
    aimPolicy:'activation-snapshot',
  });
}

export function aquaArcStreamSpec({beat=1,streamIndex=0}={}){
  const safeBeat=clamp(Math.round(Number(beat)||1),1,3);
  const count=safeBeat===3?2:1;
  const safeIndex=clamp(Math.round(Number(streamIndex)||0),0,count-1);
  return Object.freeze({
    beat:safeBeat,
    streamIndex:safeIndex,
    count,
    damage:8,
    knockback:safeBeat===3?8:5,
    speed:15.6,
    range:6.8,
    radius:.36,
    visualLength:1.42,
    lateralOffset:count===2?(safeIndex===0?-.28:.28):0,
    piercesEnemies:true,
    endpointBurst:false,
    freezes:false,
  });
}

export function chaosCrusherBeatSpec({beat=1}={}){
  const safeBeat=clamp(Math.round(Number(beat)||1),1,3);
  return Object.freeze({
    beat:safeBeat,
    rift:Object.freeze({damage:8,knockback:15,forwardOffset:1.28,radius:1.25,life:.18}),
    compression:Object.freeze({begins:.08,launches:.16}),
    core:Object.freeze({damage:6,knockback:10,speed:17.2,range:10.8,radius:.34,piercesEnemies:true}),
    destroysHostileProjectiles:true,
    subtypes:Object.freeze(['melee','projectile']),
    enhanced:false,
  });
}

export function buildAquaArcSchedule(){
  return Object.freeze(AQUA_ARC_BEATS.flatMap(entry=>Array.from({length:entry.count},(_,streamIndex)=>Object.freeze({
    time:entry.time,
    beat:entry.beat,
    streamIndex,
    count:entry.count,
    ...aquaArcStreamSpec({beat:entry.beat,streamIndex}),
  }))));
}

export function sampleAttachedThrust({origin={x:0,z:0},direction={x:0,z:1},progress=0,reach=3}={}){
  const forward=normalize2(direction.x,direction.z),k=clamp(Number(progress)||0,0,1);
  const extension=Math.sin(k*Math.PI)*.18+Math.sin(Math.min(1,k*1.8)*Math.PI/2)*.82;
  const distance=Math.max(0,Number(reach)||0)*extension;
  return Object.freeze({
    x:(Number(origin.x)||0)+forward.x*distance,
    z:(Number(origin.z)||0)+forward.z*distance,
    direction:Object.freeze(forward),
    extension,
    distance,
  });
}

export function sampleWaterCarrier({origin={x:0,z:0},direction={x:0,z:1},distance=0,lateralOffset=0,wave=.08,phase=0}={}){
  const forward=normalize2(direction.x,direction.z),right={x:forward.z,z:-forward.x};
  const safeDistance=Math.max(0,Number(distance)||0),lateral=(Number(lateralOffset)||0)+Math.sin(safeDistance*2.7+(Number(phase)||0))*(Number(wave)||0);
  return Object.freeze({
    x:(Number(origin.x)||0)+forward.x*safeDistance+right.x*lateral,
    z:(Number(origin.z)||0)+forward.z*safeDistance+right.z*lateral,
    forward:Object.freeze(forward),
    right:Object.freeze(right),
    distance:safeDistance,
    lateral,
  });
}

export function sampleChaosCompression({progress=0,expandedRadius=1.25,coreRadius=.34}={}){
  const k=clamp(Number(progress)||0,0,1),eased=k*k*(3-2*k);
  const radius=(Number(expandedRadius)||1.25)+((Number(coreRadius)||.34)-(Number(expandedRadius)||1.25))*eased;
  return Object.freeze({progress:k,eased,radius,brightness:.68+.32*Math.sin(k*Math.PI)});
}

export function normalizeNextTwentyBasicsVisualMode(stage='style'){
  const value=String(stage||'style').trim().toLowerCase();
  if(value==='motion'||value==='proxy'||value==='contract')return'contract';
  if(value==='reference'||value==='source')return'source';
  return'style';
}

function isEnemyLabRuntime(){
  if(typeof window==='undefined')return false;
  try{
    const params=new URLSearchParams(globalThis.location?.search||'');
    if(params.get('enemyLab')==='1'||params.get('mode')==='enemy-lab')return true;
    return !!(window.parent&&window.parent!==window&&window.frameElement?.id==='arenaFrame'&&/(?:^|\/)enemy-lab\.html$/i.test(window.parent.location?.pathname||''));
  }catch{return false;}
}
function isCaptureRuntime(){try{return new URLSearchParams(globalThis.location?.search||'').get('capture')==='1';}catch{return false;}}
function currentVisualMode(){
  if(!isCaptureRuntime())return'style';
  let stage='style';
  try{
    const capture=window.__abilityCapture?.snapshot?.()||{},params=new URLSearchParams(globalThis.location?.search||'');
    stage=capture.stage||capture.renderMode||params.get('stage')||params.get('renderMode')||'style';
  }catch{}
  return normalizeNextTwentyBasicsVisualMode(stage);
}
function normalize2(x,z,fallback={x:0,z:1}){const length=Math.hypot(Number(x)||0,Number(z)||0);return length>1e-8?{x:(Number(x)||0)/length,z:(Number(z)||0)/length}:{...fallback};}
function playerFrame(getPlayer){
  const player=getPlayer?.()||{},forward=normalize2(player.forwardX,player.forwardZ);
  return{x:Number(player.x)||0,z:Number(player.z)||0,forward,right:{x:forward.z,z:-forward.x}};
}
function readMovement(getMoveInput,frame){
  const input=getMoveInput?.()||{},rawX=Number(input.x??input.moveX),rawZ=Number(input.z??input.y??input.moveZ);
  const hasVector=Number.isFinite(rawX)&&Number.isFinite(rawZ),magnitude=Number(input.magnitude);
  if(hasVector)return{direction:normalize2(rawX,rawZ,frame.forward),magnitude:Number.isFinite(magnitude)?clamp(magnitude,0,1):clamp(Math.hypot(rawX,rawZ),0,1)};
  return{direction:{...frame.forward},magnitude:Number.isFinite(magnitude)?clamp(magnitude,0,1):1};
}
function aliveEnemies(system){return(system?.enemies||[]).filter(enemy=>enemy&&enemy.hp>0);}
function enemyRadius(enemy,system){return Math.max(.42,(Number(enemy?.radius)||1)*(Number(system?.heightScale)||1)*.72);}
function enemyCenterY(enemy,system){const scale=(system?.heightScale||1)*(enemy?.currentTargetScale||enemy?.targetScale||1);return(enemy?.targetYOffset||enemy?.rootLift||0)+(enemy?.height||2)*scale*.53;}
function targetId(target){return String(target?.__abilityCaptureDummyId??target?.id??target?.stableId??target?.kind??'enemy');}
function hostileProjectileId(projectile){return String(projectile?.id||projectile?.stableId||projectile?.kind||'hostile-projectile');}
function hostileProjectiles(system){return Array.isArray(system?.hostileProjectiles)?system.hostileProjectiles.filter(projectile=>projectile&&!projectile.dead):[];}
function destroyHostileProjectile(projectile){if(!projectile||projectile.dead)return false;projectile.dead=true;projectile.life=0;if(projectile.mesh)projectile.mesh.visible=false;return true;}
function firstWallHit(start,end,walls){let best=null;for(const wall of walls||[]){if(!wall?.a||!wall?.b)continue;const hit=segmentIntersection2D(start,end,wall.a,wall.b);if(hit&&(!best||hit.t<best.hit.t))best={wall,hit};}return best;}
function safeTravelDistance(origin,direction,distance,walls,clearance=.50){
  const end={x:origin.x+direction.x*distance,z:origin.z+direction.z*distance},wall=firstWallHit(origin,end,walls);
  return wall?Math.max(0,distance*wall.hit.t-clearance):Math.max(0,distance);
}
function sourceKnockback(direction,value){const forward=normalize2(direction.x,direction.z);return{x:forward.x*value*SOURCE_KNOCKBACK_WORLD_SCALE,z:forward.z*value*SOURCE_KNOCKBACK_WORLD_SCALE};}
function makeMaterial(THREE,color,opacity=.86,{additive=true,wireframe=false}={}){
  return new THREE.MeshBasicMaterial({color,transparent:true,opacity,wireframe,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,depthWrite:false,side:THREE.DoubleSide});
}
function tagged(mesh,key,value=true){mesh.userData[key]=value;return mesh;}
function disposeObject(root){if(!root)return;root.parent?.remove(root);root.traverse?.(object=>{object.geometry?.dispose?.();if(Array.isArray(object.material))object.material.forEach(material=>material?.dispose?.());else object.material?.dispose?.();});}
function orient(group,direction){group.rotation.y=Math.atan2(direction.x,direction.z);}
function baseOpacity(mesh,value){mesh.userData.baseOpacity=value;return mesh;}

function finishVisual(scene,group,{name,mode,size=1,y=0}={}){
  group.name=name;group.userData.visualMode=mode;group.userData.baseScale=size;group.position.y=y;group.scale.setScalar(size);group.renderOrder=8;scene.add(group);return group;
}

function makeIceDaggerVisual(THREE,scene,spec,size,mode){
  const group=new THREE.Group(),length=spec.reach;
  if(mode==='contract'){
    const proxy=baseOpacity(tagged(new THREE.Mesh(new THREE.BoxGeometry(.10,.10,length),makeMaterial(THREE,ICE_HOT,.94,{wireframe:true})),'contractCarrier'),.94);proxy.position.z=length*.52;group.add(proxy);
  }else{
    // Keep the carrier source-sized but visually narrow: a translucent blade, a
    // white-hot inner edge, and a wire edge read as one attached thrust instead
    // of the former opaque fan.
    const shellOpacity=mode==='style'?.64:.76;
    const shell=baseOpacity(tagged(new THREE.Mesh(new THREE.ConeGeometry(.23,length*1.02,6),makeMaterial(THREE,ICE,shellOpacity)),'iceBladeShell'),shellOpacity);shell.rotation.x=Math.PI/2;shell.position.set(0,.09,length*.50);group.add(shell);
    const edge=baseOpacity(tagged(new THREE.Mesh(new THREE.ConeGeometry(.245,length*1.035,6),makeMaterial(THREE,ICE_HOT,.88,{wireframe:true})),'iceHotEdge'),.88);edge.rotation.x=Math.PI/2;edge.position.set(0,.095,length*.505);group.add(edge);
    const core=baseOpacity(tagged(new THREE.Mesh(new THREE.ConeGeometry(.075,length*.92,5),makeMaterial(THREE,ICE_HOT,.98)),'iceBladeCore'),.98);core.rotation.x=Math.PI/2;core.position.set(0,.115,length*.46);group.add(core);
    const guard=baseOpacity(tagged(new THREE.Mesh(new THREE.RingGeometry(.11,.28,16),makeMaterial(THREE,ICE_DEEP,.72)),'iceDaggerGuard'),.72);guard.position.set(0,.10,.16);guard.rotation.x=-Math.PI/2;group.add(guard);
    const shardCount=mode==='style'?7:4;
    for(let index=0;index<shardCount;index++){
      const side=index%2?-1:1,shard=baseOpacity(tagged(new THREE.Mesh(new THREE.ConeGeometry(.035+(index%3)*.012,.24+(index%2)*.10,4),makeMaterial(THREE,index%3?ICE:ICE_HOT,.78)),'iceTrailingShard',index),.78);
      shard.rotation.x=-Math.PI/2;shard.rotation.z=side*(.18+(index%3)*.10);shard.position.set(side*(.11+(index%3)*.065),.08+(index%2)*.07,.08+index*.085);group.add(shard);
    }
    if(mode==='style'){
      const glow=baseOpacity(tagged(new THREE.Mesh(new THREE.ConeGeometry(.31,length*1.055,7),makeMaterial(THREE,ICE,.17)),'iceBladeGlow'),.17);glow.rotation.x=Math.PI/2;glow.position.set(0,.075,length*.515);group.add(glow);
      for(let index=0;index<6;index++){
        const chip=baseOpacity(tagged(new THREE.Mesh(new THREE.SphereGeometry(.035+(index%3)*.012,6,4),makeMaterial(THREE,index%3?ICE:ICE_HOT,.70)),'iceChip',index),.70);chip.position.set(Math.sin(index*2.2)*(.15+index*.012),.12+(index%2)*.07,.32+index*length/8);group.add(chip);
      }
    }
  }
  return finishVisual(scene,group,{name:`Wizard Arcana Ice Dagger ${mode} beat ${spec.beat}`,mode,size,y:.48});
}

function makeRippleVisual(THREE,scene,spec,size,mode){
  const group=new THREE.Group(),width=spec.visualWidth;
  if(mode==='contract'){
    const proxy=baseOpacity(tagged(new THREE.Mesh(new THREE.RingGeometry(width*.36,width*.48,30,1,.18,Math.PI*.84),makeMaterial(THREE,WATER_HOT,.92,{wireframe:true})),'contractCarrier'),.92);proxy.rotation.x=-Math.PI/2;group.add(proxy);
  }else{
    // RingGeometry is authored in XY here so the crescent stands up across the
    // route. A slight lean keeps its thickness readable from the arena camera.
    const body=baseOpacity(tagged(new THREE.Mesh(new THREE.RingGeometry(width*.18,width*.62,40,2,.08,Math.PI*.95),makeMaterial(THREE,WATER,mode==='style'?.66:.78)),'rippleBody'),mode==='style'?.66:.78);tagged(body,'uprightCrescent');body.rotation.x=-.46;body.position.set(0,.10,.02);body.scale.y=.78;group.add(body);
    const foam=baseOpacity(tagged(new THREE.Mesh(new THREE.RingGeometry(width*.52,width*.69,44,1,.04,Math.PI*.98),makeMaterial(THREE,WATER_HOT,.98)),'rippleFoam'),.98);tagged(foam,'uprightCrescent');foam.rotation.x=-.40;foam.position.set(0,.15,.08);foam.scale.y=.80;group.add(foam);
    const deep=baseOpacity(tagged(new THREE.Mesh(new THREE.RingGeometry(width*.27,width*.43,36,1,.16,Math.PI*.82),makeMaterial(THREE,WATER_DEEP,.68)),'rippleDepth'),.68);tagged(deep,'uprightCrescent');deep.rotation.x=-.52;deep.position.set(0,.05,-.08);deep.scale.y=.74;group.add(deep);
    const drops=mode==='style'?14:8;
    for(let index=0;index<drops;index++){
      const p=index/(drops-1),angle=.08+p*Math.PI*.84,drop=baseOpacity(tagged(new THREE.Mesh(new THREE.SphereGeometry(.045+(index%3)*.020,7,5),makeMaterial(THREE,index%3?WATER:WATER_HOT,.82)),'rippleSpray',index),.82);drop.position.set(Math.cos(angle)*width*.63,.22+Math.sin(angle)*width*.46+(index%2)*.06,.05+Math.sin(index*2.4)*.12);group.add(drop);
    }
    if(mode==='style'){
      const glow=baseOpacity(tagged(new THREE.Mesh(new THREE.RingGeometry(width*.12,width*.74,44,1,.04,Math.PI*.98),makeMaterial(THREE,WATER,.17)),'rippleGlow'),.17);tagged(glow,'uprightCrescent');glow.rotation.x=-.36;glow.position.set(0,.12,.12);glow.scale.y=.82;group.add(glow);
    }
  }
  return finishVisual(scene,group,{name:`Wizard Arcana Rip Tide ${mode} ripple ${spec.beat}`,mode,size,y:.30});
}

function makeAquaStreamVisual(THREE,scene,spec,size,mode){
  const group=new THREE.Group(),length=spec.visualLength;
  if(mode==='contract'){
    const proxy=baseOpacity(tagged(new THREE.Mesh(new THREE.BoxGeometry(spec.radius*1.25,.10,length),makeMaterial(THREE,WATER_HOT,.94,{wireframe:true})),'contractCarrier'),.94);proxy.position.z=length*.5;group.add(proxy);
  }else{
    const segments=mode==='style'?7:5,segmentLength=length/(segments-1)*1.55;
    for(let index=0;index<segments;index++){
      const p=index/(segments-1),radius=spec.radius*(.56-.20*p),x=Math.sin(p*Math.PI*1.55)*.075,y=.10+Math.sin(p*Math.PI)*.30;
      const shell=baseOpacity(tagged(new THREE.Mesh(new THREE.ConeGeometry(radius,segmentLength,7),makeMaterial(THREE,index<segments-1?WATER:WATER_HOT,.69)),'aquaArcSegment',index),.69);shell.rotation.x=Math.PI/2;shell.rotation.z=Math.sin(p*Math.PI*2)*.06;shell.position.set(x,y,p*length*.92);group.add(shell);
      const spine=baseOpacity(tagged(new THREE.Mesh(new THREE.ConeGeometry(radius*.34,segmentLength*.94,6),makeMaterial(THREE,WATER_HOT,.91)),'aquaArcSpine',index),.91);spine.rotation.x=Math.PI/2;spine.position.set(x,y+.025,p*length*.92+.015);group.add(spine);
      if(mode==='style'&&index%2===0){const glow=baseOpacity(tagged(new THREE.Mesh(new THREE.SphereGeometry(radius*1.30,8,6),makeMaterial(THREE,WATER,.14)),'aquaStreamGlow',index),.14);glow.position.set(x,y,p*length*.92);glow.scale.set(.88,.82,1.34);group.add(glow);}
    }
    const crest=baseOpacity(tagged(new THREE.Mesh(new THREE.ConeGeometry(spec.radius*.26,segmentLength*.84,7),makeMaterial(THREE,WATER_HOT,.98)),'aquaFoamCrest'),.98);crest.rotation.x=Math.PI/2;crest.position.set(.02,.13,length*.98);group.add(crest);
    for(let index=0;index<(mode==='style'?7:4);index++){
      const p=(index+1)/8,spray=baseOpacity(tagged(new THREE.Mesh(new THREE.SphereGeometry(.035+(index%2)*.018,6,4),makeMaterial(THREE,index%3?WATER:WATER_HOT,.76)),'aquaSpray',index),.76);spray.position.set(Math.sin(index*2.1)*.24,.18+Math.sin(p*Math.PI)*.34+(index%2)*.06,length*(.18+p*.72));group.add(spray);
    }
  }
  return finishVisual(scene,group,{name:`Wizard Arcana Aqua Arc ${mode} stream ${spec.beat}-${spec.streamIndex+1}`,mode,size,y:.38});
}

function makeChaosRiftVisual(THREE,scene,spec,size,mode){
  const group=new THREE.Group(),radius=spec.rift.radius;
  if(mode==='contract'){
    const proxy=baseOpacity(tagged(new THREE.Mesh(new THREE.SphereGeometry(radius,12,8),makeMaterial(THREE,CHAOS_HOT,.72,{wireframe:true})),'contractCarrier'),.72);group.add(proxy);
  }else{
    const shadow=baseOpacity(tagged(new THREE.Mesh(new THREE.SphereGeometry(radius*.88,20,14),makeMaterial(THREE,CHAOS_DEEP,.98,{additive:false})),'chaosRiftVoid'),.98);shadow.position.y=.28;shadow.scale.set(1,.88,1);group.add(shadow);
    const inner=baseOpacity(tagged(new THREE.Mesh(new THREE.SphereGeometry(radius*.68,18,12),makeMaterial(THREE,0x08020d,.96,{additive:false})),'chaosRiftInnerVoid'),.96);inner.position.y=.31;inner.scale.set(1,.90,1);group.add(inner);
    const shell=baseOpacity(tagged(new THREE.Mesh(new THREE.SphereGeometry(radius*1.02,18,12),makeMaterial(THREE,CHAOS,.30)),'chaosRiftShell'),.30);shell.position.y=.28;shell.scale.set(1,.92,1);group.add(shell);
    const lobeCount=mode==='style'?9:6;
    for(let index=0;index<lobeCount;index++){
      const angle=index*TAU/lobeCount,radiusScale=.22+(index%3)*.055,lobe=baseOpacity(tagged(new THREE.Mesh(new THREE.SphereGeometry(radius*radiusScale,12,8),makeMaterial(THREE,index%3===0?CHAOS:CHAOS_DEEP,.80,{additive:false})),'chaosMassLobe',index),.80);lobe.position.set(Math.cos(angle)*radius*.69,.22+(index%3)*.15,Math.sin(angle)*radius*.69);lobe.scale.set(1,.82,1);group.add(lobe);
    }
    const orbit=baseOpacity(tagged(new THREE.Mesh(new THREE.TorusGeometry(radius*.78,.07,8,32),makeMaterial(THREE,CHAOS_HOT,.35)),'chaosRiftOrbit'),.35);orbit.position.y=.29;orbit.rotation.x=.58;orbit.rotation.z=.42;group.add(orbit);
    const count=mode==='style'?10:6;
    for(let index=0;index<count;index++){
      const angle=index*TAU/count,spike=baseOpacity(tagged(new THREE.Mesh(new THREE.ConeGeometry(.055,radius*(mode==='style'?.48:.36),5),makeMaterial(THREE,index%3?CHAOS:CHAOS_HOT,.64)),'chaosRiftTendril',index),.64);spike.position.set(Math.cos(angle)*radius*.88,.20+(index%3)*.12,Math.sin(angle)*radius*.88);spike.rotation.z=Math.PI/2;spike.rotation.y=-angle;group.add(spike);
    }
    if(mode==='style'){
      const corona=baseOpacity(tagged(new THREE.Mesh(new THREE.SphereGeometry(radius*1.16,16,10),makeMaterial(THREE,CHAOS,.12)),'chaosRiftCorona'),.12);corona.position.y=.28;corona.scale.set(1,.90,1);group.add(corona);
      const core=baseOpacity(tagged(new THREE.Mesh(new THREE.SphereGeometry(radius*.27,12,8),makeMaterial(THREE,CHAOS_DEEP,.98,{additive:false})),'chaosCompressionCore'),.98);core.position.y=.32;group.add(core);
      for(let index=0;index<6;index++){const angle=index*TAU/6,wisp=baseOpacity(tagged(new THREE.Mesh(new THREE.SphereGeometry(.05+(index%2)*.025,7,5),makeMaterial(THREE,index%2?CHAOS:CHAOS_HOT,.72)),'chaosRiftWisp',index),.72);wisp.position.set(Math.cos(angle)*radius*1.05,.28+(index%3)*.13,Math.sin(angle)*radius*1.05);group.add(wisp);}
    }
  }
  group.userData.collisionRadius=radius;group.userData.hoveringMass=mode!=='contract';
  return finishVisual(scene,group,{name:`Wizard Arcana Chaos Crusher ${mode} expanding rift ${spec.beat}`,mode,size,y:.52});
}

function makeChaosCoreVisual(THREE,scene,spec,size,mode){
  const group=new THREE.Group(),radius=spec.core.radius;
  if(mode==='contract'){
    const proxy=baseOpacity(tagged(new THREE.Mesh(new THREE.SphereGeometry(radius,10,7),makeMaterial(THREE,CHAOS_HOT,.94,{wireframe:true})),'contractCarrier'),.94);group.add(proxy);
  }else{
    const visualRadius=Math.max(radius*1.70,.56);
    const body=baseOpacity(tagged(new THREE.Mesh(new THREE.SphereGeometry(visualRadius*.78,14,10),makeMaterial(THREE,0x08020d,.99,{additive:false})),'chaosCoreVoid'),.99);body.position.y=.14;group.add(body);
    const shell=baseOpacity(tagged(new THREE.Mesh(new THREE.SphereGeometry(visualRadius,14,10),makeMaterial(THREE,CHAOS,.34)),'chaosCoreShell'),.34);shell.position.y=.14;group.add(shell);
    const ring=baseOpacity(tagged(new THREE.Mesh(new THREE.TorusGeometry(visualRadius*.88,.045,7,26),makeMaterial(THREE,CHAOS_HOT,.58)),'chaosCoreRing'),.58);ring.position.y=.14;ring.rotation.x=.64;ring.rotation.z=.38;group.add(ring);
    if(mode==='style')for(let index=0;index<9;index++){
      const ember=baseOpacity(tagged(new THREE.Mesh(new THREE.SphereGeometry(.04+(index%3)*.012,6,4),makeMaterial(THREE,index%2?CHAOS:CHAOS_HOT,.72)),'chaosCoreWisp',index),.72);ember.position.set(Math.sin(index*2.1)*(.16+index*.022),.10+(index%3)*.07,-.24-index*.105);group.add(ember);
    }
    group.userData.visualRadius=visualRadius;
  }
  group.userData.collisionRadius=radius;
  return finishVisual(scene,group,{name:`Wizard Arcana Chaos Crusher ${mode} compressed core ${spec.beat}`,mode,size,y:.52});
}

function makeImpactVisual(THREE,scene,{position,color=0xffffff,size=1,mode='style',kind='impact'}={}){
  const group=new THREE.Group(),count=mode==='contract'?1:mode==='source'?5:9;
  const core=baseOpacity(tagged(new THREE.Mesh(new THREE.SphereGeometry(.20*size,10,7),makeMaterial(THREE,0xffffff,.98)),'impactCore'),.98);group.add(core);
  for(let index=0;index<count;index++){
    const angle=index*TAU/count,ray=baseOpacity(tagged(new THREE.Mesh(new THREE.ConeGeometry(.035*size,.48*size,5),makeMaterial(THREE,index%3?color:0xffffff,.82)),'impactRay',index),.82);ray.rotation.z=Math.PI/2;ray.rotation.y=-angle;ray.position.set(Math.cos(angle)*.24*size,0,Math.sin(angle)*.24*size);group.add(ray);
  }
  group.position.set(position.x,position.y||0,position.z);return finishVisual(scene,group,{name:`Wizard Arcana ${kind} ${mode}`,mode,size:1,y:position.y||0});
}

export function installWizardNextTwentyBasicsRuntime({
  THREE,
  scene,
  getPlayer,
  getMoveInput,
  getEnemySystem,
  getMazeSegments=()=>[],
  translatePlayer,
  setMovementLock,
  setFacingLock,
}={}){
  const initial=readArcanaTweaks();
  const emptySnapshot=()=>({simulationTime:0,castSerial:0,lastCast:null,visualMode:'style',movementLocked:false,facingLocked:false,effects:[],semanticEvents:[]});
  if(!THREE||!scene||!isEnemyLabRuntime())return{state:{effects:[],sizeMultiplier:initial.sizeMultiplier},canPlay(){return false;},play(){return false;},cast(){return false;},snapshot:emptySnapshot,update(){},reset(){},dispose(){}};

  const state={
    effects:[],sizeMultiplier:initial.sizeMultiplier,elapsed:0,castSerial:0,lastCast:null,
    semanticSerial:0,semanticEvents:[],visualMode:'style',instanceCounters:new Map(),movementLocks:new Set(),facingLocks:new Map(),
  };
  const currentSize=()=>clampArcanaSize(state.sizeMultiplier);
  function add(effect){state.effects.push(effect);return effect;}
  function callMovementLock(){
    const locked=state.movementLocks.size>0;
    try{setMovementLock?.(locked,{source:'wizardArcana',locks:[...state.movementLocks]});}catch{try{setMovementLock?.({locked,source:'wizardArcana',locks:[...state.movementLocks]});}catch{}}
  }
  function acquireMovementLock(token){const before=state.movementLocks.size;state.movementLocks.add(token);if(state.movementLocks.size!==before)callMovementLock();}
  function releaseMovementLock(token){const changed=state.movementLocks.delete(token);if(changed)callMovementLock();}
  function callFacingLock(){
    const direction=[...state.facingLocks.values()].at(-1)||null;
    try{setFacingLock?.(direction?{...direction}:null,{source:'wizardArcana',locks:[...state.facingLocks.keys()]});}catch{try{setFacingLock?.({direction:direction?{...direction}:null,source:'wizardArcana',locks:[...state.facingLocks.keys()]});}catch{}}
  }
  function acquireFacingLock(token,direction){const x=Number(direction?.x)||0,z=Number(direction?.z)||0,length=Math.hypot(x,z)||1;state.facingLocks.set(token,{x:x/length,z:z/length});callFacingLock();}
  function releaseFacingLock(token){if(state.facingLocks.delete(token))callFacingLock();}
  function remove(effect){
    if(effect.lockToken)releaseMovementLock(effect.lockToken);
    if(effect.facingLockToken)releaseFacingLock(effect.facingLockToken);
    if(effect.mesh)disposeObject(effect.mesh);for(const mesh of effect.meshes||[])disposeObject(mesh);
    const index=state.effects.indexOf(effect);if(index>=0)state.effects.splice(index,1);
  }
  function reset(){
    for(const effect of[...state.effects])remove(effect);
    state.elapsed=0;state.castSerial=0;state.lastCast=null;state.semanticSerial=0;state.semanticEvents.length=0;state.instanceCounters.clear();state.movementLocks.clear();state.facingLocks.clear();state.visualMode='style';callMovementLock();callFacingLock();
  }
  function nextStableId(arcanaId){const serial=(state.instanceCounters.get(arcanaId)||0)+1;state.instanceCounters.set(arcanaId,serial);return`${arcanaId}:${String(serial).padStart(4,'0')}`;}
  function semantic(kind,detail={}){
    const entry=Object.freeze({serial:++state.semanticSerial,time:Number(state.elapsed.toFixed(6)),kind,...detail});
    state.semanticEvents.push(entry);if(state.semanticEvents.length>256)state.semanticEvents.shift();
    try{window.dispatchEvent(new CustomEvent(WIZARD_NEXT_TWENTY_BASICS_SEMANTIC_EVENT,{detail:entry}));}catch{}
    return entry;
  }
  function damage(system,enemy,amount,knock,options={}){return system?.damageEnemy?.(enemy,amount,knock,{source:'wizardArcana',power:.34,pop:.06,...options})??false;}
  function addImpact(position,color,size,mode,kind='impact'){return add({type:'basicImpact',arcanaId:kind,age:0,life:.20,visualMode:mode,mesh:makeImpactVisual(THREE,scene,{position,color,size,mode,kind})});}
  function applyTranslation(frame,direction,distance,stableId){
    const walls=getMazeSegments?.()||[],allowed=safeTravelDistance({x:frame.x,z:frame.z},direction,distance,walls,.50),player=getPlayer?.()||{},before={x:Number(player.x)||frame.x,z:Number(player.z)||frame.z};
    if(allowed<=0)return 0;
    const dx=direction.x*allowed,dz=direction.z*allowed;
    let result;
    try{result=translatePlayer?.(dx,dz,{source:'wizardArcana',arcanaId:'ICE-DAGGER',stableId,collisionChecked:true});}catch{try{result=translatePlayer?.({dx,dz,source:'wizardArcana',arcanaId:'ICE-DAGGER',stableId});}catch{}}
    if(!translatePlayer){player.x=before.x+dx;player.z=before.z+dz;}
    const after=getPlayer?.()||player,actual=Math.hypot((Number(after.x)||before.x)-before.x,(Number(after.z)||before.z)-before.z);
    if(actual>1e-6)return Math.min(allowed,actual);
    if(result===false)return 0;
    if(Number.isFinite(Number(result)))return clamp(Number(result),0,allowed);
    return allowed;
  }
  function interceptCircle(system,position,radius,{arcanaId,stableId,event='projectile-intercepted',walls=[]}={}){
    const ids=[];
    for(const projectile of hostileProjectiles(system)){
      if(firstWallHit(position,{x:projectile.x,z:projectile.z},walls)||Math.hypot(projectile.x-position.x,projectile.z-position.z)>radius+(Number(projectile.r??projectile.radius)||.16))continue;
      if(destroyHostileProjectile(projectile)){const id=hostileProjectileId(projectile);ids.push(id);semantic(event,{arcanaId,stableId,projectileId:id,position:{x:projectile.x,z:projectile.z}});}
    }
    return ids;
  }
  function interceptSweep(system,start,end,radius,{arcanaId,stableId,event='projectile-intercepted',walls=[]}={}){
    const ids=[];
    for(const projectile of hostileProjectiles(system)){
      if(firstWallHit(start,{x:projectile.x,z:projectile.z},walls)||pointSegmentDistance2D(projectile,start,end)>radius+(Number(projectile.r??projectile.radius)||.16))continue;
      if(destroyHostileProjectile(projectile)){const id=hostileProjectileId(projectile);ids.push(id);semantic(event,{arcanaId,stableId,projectileId:id,position:{x:projectile.x,z:projectile.z}});}
    }
    return ids;
  }

  function emitIceDagger(effect,event){
    const before=playerFrame(getPlayer),movement=readMovement(getMoveInput,before),spec=iceDaggerBeatSpec({beat:event.beat}),direction={...before.forward};
    const movementRequested=movement.magnitude>=spec.movementGate?spec.advance*movement.magnitude:0,movementApplied=applyTranslation(before,direction,movementRequested,effect.stableId),after=playerFrame(getPlayer),size=currentSize(),mode=effect.visualMode;
    const walls=getMazeSegments?.()||[],attackRange=safeTravelDistance({x:after.x,z:after.z},direction,spec.reach*size,walls,.08),reachScale=clamp(attackRange/Math.max(.001,spec.reach*size),.04,1),mesh=makeIceDaggerVisual(THREE,scene,spec,size,mode);mesh.position.set(after.x,.48,after.z);orient(mesh,direction);mesh.scale.z*=reachScale;
    const start={x:before.x+direction.x*.28,z:before.z+direction.z*.28},end={x:after.x+direction.x*attackRange,z:after.z+direction.z*attackRange},system=getEnemySystem?.(),targetIds=[];
    for(const enemy of aliveEnemies(system)){
      if(firstWallHit({x:after.x,z:after.z},{x:enemy.x,z:enemy.z},walls)||pointSegmentDistance2D(enemy,start,end)>enemyRadius(enemy,system)+spec.halfWidth*size)continue;
      targetIds.push(targetId(enemy));damage(system,enemy,spec.damage,{x:direction.x*spec.targetPush,z:direction.z*spec.targetPush},{iceDagger:true,beat:spec.beat,freeze:false});addImpact({x:enemy.x,y:enemyCenterY(enemy,system),z:enemy.z},ICE_HOT,size*.72,mode,'ice-dagger-impact');
    }
    const stableId=`${effect.stableId}:thrust:${String(spec.beat).padStart(2,'0')}`;
    semantic('ice-dagger-thrust',{arcanaId:'ICE-DAGGER',stableId,comboStableId:effect.stableId,beat:spec.beat,damage:spec.damage,origin:{x:before.x,z:before.z},direction,movementMagnitude:movement.magnitude,movementRequested,movementApplied,wallClipped:movementApplied+1e-6<movementRequested,attackRange,attackWallClipped:reachScale<.999,targetIds,liveAim:true,releasesShard:false,freezes:false,visualMode:mode});
    add({type:'iceDaggerStrike',arcanaId:'ICE-DAGGER',stableId,comboStableId:effect.stableId,beat:spec.beat,age:0,life:spec.life,spec,size,visualMode:mode,mesh,direction,targetIds,movementApplied,reachScale});
  }

  function emitRipTide(effect,event){
    const spec=ripTideRippleSpec({beat:event.beat}),size=currentSize(),origin={x:effect.frame.x+effect.frame.forward.x*.68,z:effect.frame.z+effect.frame.forward.z*.68},stableId=`${effect.stableId}:ripple:${String(event.beat).padStart(2,'0')}`,mesh=makeRippleVisual(THREE,scene,spec,size,effect.visualMode);
    mesh.position.set(origin.x,.30,origin.z);orient(mesh,effect.frame.forward);
    semantic('rip-tide-ripple-emitted',{arcanaId:'RIP-TIDE',stableId,comboStableId:effect.stableId,beat:event.beat,damage:spec.damage,origin,direction:{...effect.frame.forward},aimPolicy:'activation-snapshot',piercesEnemies:true,destroysHostileProjectiles:true,visualMode:effect.visualMode});
    add({type:'ripTideRipple',arcanaId:'RIP-TIDE',stableId,comboStableId:effect.stableId,beat:event.beat,age:0,position:{...origin},previous:{...origin},origin:{...origin},direction:{...effect.frame.forward},distance:0,spec,size,visualMode:effect.visualMode,mesh,walls:[...(getMazeSegments?.()||[])],hit:new Set(),targetIds:[],interceptedIds:[]});
  }

  function emitAquaArc(effect,event){
    const frame=playerFrame(getPlayer),spec=aquaArcStreamSpec({beat:event.beat,streamIndex:event.streamIndex}),size=currentSize(),sample=sampleWaterCarrier({origin:{x:frame.x+frame.forward.x*.66,z:frame.z+frame.forward.z*.66},direction:frame.forward,distance:0,lateralOffset:spec.lateralOffset*size,wave:0}),stableId=`${effect.stableId}:stream:${String(event.beat).padStart(2,'0')}-${String(event.streamIndex+1).padStart(2,'0')}`,mesh=makeAquaStreamVisual(THREE,scene,spec,size,effect.visualMode);
    mesh.position.set(sample.x,.38,sample.z);orient(mesh,frame.forward);
    semantic('aqua-arc-stream-emitted',{arcanaId:'AQUA-ARC',stableId,comboStableId:effect.stableId,beat:event.beat,streamIndex:event.streamIndex,count:event.count,damage:spec.damage,knockback:spec.knockback,origin:{x:sample.x,z:sample.z},direction:{...frame.forward},liveAim:true,piercesEnemies:true,endpointBurst:false,freezes:false,visualMode:effect.visualMode});
    add({type:'aquaArcStream',arcanaId:'AQUA-ARC',stableId,comboStableId:effect.stableId,beat:event.beat,streamIndex:event.streamIndex,age:0,position:{x:sample.x,z:sample.z},previous:{x:sample.x,z:sample.z},origin:{x:sample.x,z:sample.z},direction:{...frame.forward},distance:0,spec,size,visualMode:effect.visualMode,mesh,walls:[...(getMazeSegments?.()||[])],hit:new Set(),targetIds:[]});
  }

  function emitChaosRift(effect,event){
    const frame=playerFrame(getPlayer),spec=chaosCrusherBeatSpec({beat:event.beat}),size=currentSize(),walls=getMazeSegments?.()||[],offset=safeTravelDistance({x:frame.x,z:frame.z},frame.forward,spec.rift.forwardOffset*size,walls,.12),position={x:frame.x+frame.forward.x*offset,z:frame.z+frame.forward.z*offset},stableId=`${effect.stableId}:rift:${String(event.beat).padStart(2,'0')}`,mesh=makeChaosRiftVisual(THREE,scene,spec,size,effect.visualMode),system=getEnemySystem?.(),targetIds=[];
    mesh.position.set(position.x,.52,position.z);orient(mesh,frame.forward);
    for(const enemy of aliveEnemies(system)){
      if(firstWallHit(position,{x:enemy.x,z:enemy.z},walls)||Math.hypot(enemy.x-position.x,enemy.z-position.z)>spec.rift.radius*size+enemyRadius(enemy,system))continue;
      targetIds.push(targetId(enemy));const knock=normalize2(enemy.x-position.x,enemy.z-position.z,frame.forward),worldKnockback=sourceKnockback(knock,spec.rift.knockback);damage(system,enemy,spec.rift.damage,worldKnockback,{chaosCrusher:true,chaosRift:true,beat:spec.beat,sourceKnockback:spec.rift.knockback,worldKnockback:Math.hypot(worldKnockback.x,worldKnockback.z),melee:true,projectile:true,subtypes:spec.subtypes});addImpact({x:enemy.x,y:enemyCenterY(enemy,system),z:enemy.z},CHAOS_HOT,size*.80,effect.visualMode,'chaos-rift-impact');
    }
    const interceptedIds=interceptCircle(system,position,spec.rift.radius*size,{arcanaId:'CHAOS-CRUSHER',stableId,event:'chaos-rift-projectile-intercepted',walls});
    semantic('chaos-crusher-rift-struck',{arcanaId:'CHAOS-CRUSHER',stableId,comboStableId:effect.stableId,beat:spec.beat,damage:spec.rift.damage,knockback:spec.rift.knockback,position,targetIds,interceptedIds,subtypes:spec.subtypes,transformsIntoCore:true,visualMode:effect.visualMode});
    add({type:'chaosCrusherRift',arcanaId:'CHAOS-CRUSHER',stableId,comboStableId:effect.stableId,beat:spec.beat,age:0,spec,size,position,direction:{...frame.forward},visualMode:effect.visualMode,mesh,targetIds,interceptedIds,launched:false});
  }

  function emitChaosCore(rift){
    const spec=rift.spec,size=rift.size,stableId=`${rift.comboStableId}:core:${String(rift.beat).padStart(2,'0')}`,mesh=makeChaosCoreVisual(THREE,scene,spec,size,rift.visualMode),position={...rift.position};
    mesh.position.set(position.x,.52,position.z);orient(mesh,rift.direction);
    semantic('chaos-crusher-core-fired',{arcanaId:'CHAOS-CRUSHER',stableId,comboStableId:rift.comboStableId,riftStableId:rift.stableId,beat:rift.beat,damage:spec.core.damage,knockback:spec.core.knockback,position,direction:{...rift.direction},piercesEnemies:true,subtypes:spec.subtypes,transformedFromRift:true,visualMode:rift.visualMode});
    add({type:'chaosCrusherCore',arcanaId:'CHAOS-CRUSHER',stableId,comboStableId:rift.comboStableId,riftStableId:rift.stableId,beat:rift.beat,age:0,position:{...position},previous:{...position},origin:{...position},direction:{...rift.direction},distance:0,spec,size,visualMode:rift.visualMode,mesh,walls:[...(getMazeSegments?.()||[])],hit:new Set(),targetIds:[],interceptedIds:[]});
  }

  function startCombo(arcanaId,type,schedule,{frame=null,life=.95,lock=false,lockFacing=false}={}){
    if(state.movementLocks.size>0||(lock&&state.effects.some(effect=>effect.type===type)))return false;
    const stableId=nextStableId(arcanaId),visualMode=currentVisualMode(),effect={type,arcanaId,stableId,age:0,nextEmission:0,schedule,life,visualMode,frame};
    if(lock){effect.lockToken=stableId;acquireMovementLock(stableId);}
    if(lockFacing&&frame?.forward){effect.facingLockToken=stableId;acquireFacingLock(stableId,frame.forward);}
    state.visualMode=visualMode;add(effect);semantic('arcana-cast',{arcanaId,stableId,visualMode,baseForm:true,enhanced:false});return true;
  }

  function cast(card){
    const id=typeof card==='string'?card:card?.arcanaId;let casted=false;
    if(id==='ICE-DAGGER')casted=startCombo(id,'iceDaggerCombo',ICE_DAGGER_BEATS,{life:1,lock:true});
    else if(id==='RIP-TIDE')casted=startCombo(id,'ripTideCombo',RIP_TIDE_BEATS,{frame:playerFrame(getPlayer),life:.55,lock:true,lockFacing:true});
    else if(id==='AQUA-ARC')casted=startCombo(id,'aquaArcCombo',buildAquaArcSchedule(),{life:.83});
    else if(id==='CHAOS-CRUSHER')casted=startCombo(id,'chaosCrusherCombo',CHAOS_CRUSHER_BEATS,{life:.95});
    if(casted){state.castSerial++;state.lastCast=id;}
    return casted;
  }
  const canPlayIds=new Set(['ICE-DAGGER','RIP-TIDE','AQUA-ARC','CHAOS-CRUSHER']);
  function canPlay(card){return canPlayIds.has(card?.arcanaId);}
  function play(card,context={}){return canPlay(card)?cast(card,context):false;}

  function updateCombo(effect,dt,emitter){
    effect.age+=dt;
    while(effect.nextEmission<effect.schedule.length&&effect.age+1e-9>=effect.schedule[effect.nextEmission].time)emitter(effect,effect.schedule[effect.nextEmission++]);
    if(effect.nextEmission>=effect.schedule.length&&effect.age+1e-9>=effect.life){semantic('arcana-sequence-complete',{arcanaId:effect.arcanaId,stableId:effect.stableId,emissions:effect.schedule.length});remove(effect);}
  }
  function updateIceStrike(effect,dt){
    effect.age+=dt;const k=clamp(effect.age/effect.life,0,1),sample=sampleAttachedThrust({origin:{x:0,z:0},direction:{x:0,z:1},progress:k,reach:1}),frame=playerFrame(getPlayer);
    effect.mesh.position.set(frame.x,.48,frame.z);orient(effect.mesh,effect.direction);effect.mesh.scale.set(effect.size,effect.size,effect.size*(effect.reachScale??1)*clamp(sample.extension,.08,1));
    effect.mesh.traverse(child=>{if(child.material)child.material.opacity=(child.userData?.baseOpacity??.8)*Math.pow(1-k,.34);});if(k>=1)remove(effect);
  }
  function updateProjectile(effect,dt,now){
    effect.age+=dt;const speed=effect.spec.speed??effect.spec.core?.speed??0,range=effect.spec.range??effect.spec.core?.range??0,radius=(effect.spec.radius??effect.spec.core?.radius??.3)*effect.size,start={...effect.position},travel=Math.min(speed*dt,Math.max(0,range-effect.distance)),plannedEnd={x:start.x+effect.direction.x*travel,z:start.z+effect.direction.z*travel},wall=firstWallHit(start,plannedEnd,effect.walls),resolvedTravel=wall?travel*wall.hit.t:travel,end=wall?{x:wall.hit.x,z:wall.hit.z}:plannedEnd;
    effect.previous=start;effect.position=end;effect.distance+=resolvedTravel;effect.mesh.position.set(end.x,effect.arcanaId==='CHAOS-CRUSHER'?.52:.34+Math.sin(now*17+effect.beat)*.035,end.z);orient(effect.mesh,effect.direction);
    if(effect.type==='ripTideRipple'){effect.mesh.rotation.z=Math.sin(now*9+effect.beat)*.06;effect.interceptedIds.push(...interceptSweep(getEnemySystem?.(),start,end,radius,{arcanaId:effect.arcanaId,stableId:effect.stableId,event:'rip-tide-projectile-intercepted',walls:effect.walls}));}
    if(effect.type==='chaosCrusherCore'){effect.mesh.rotation.x+=dt*4.8;effect.mesh.rotation.z+=dt*5.6;effect.interceptedIds.push(...interceptSweep(getEnemySystem?.(),start,end,radius,{arcanaId:effect.arcanaId,stableId:effect.stableId,event:'chaos-core-projectile-intercepted',walls:effect.walls}));}
    const system=getEnemySystem?.();
    for(const enemy of aliveEnemies(system)){
      if(effect.hit.has(enemy)||firstWallHit(start,{x:enemy.x,z:enemy.z},effect.walls)||pointSegmentDistance2D(enemy,start,end)>enemyRadius(enemy,system)+radius)continue;
      effect.hit.add(enemy);const id=targetId(enemy);effect.targetIds.push(id);
      const damageAmount=effect.type==='chaosCrusherCore'?effect.spec.core.damage:effect.spec.damage,knockback=effect.type==='chaosCrusherCore'?effect.spec.core.knockback:effect.spec.knockback;
      const worldKnockback=effect.type==='ripTideRipple'?{x:effect.direction.x*knockback,z:effect.direction.z*knockback}:sourceKnockback(effect.direction,knockback);
      damage(system,enemy,damageAmount,worldKnockback,{
        [effect.type==='ripTideRipple'?'ripTide':effect.type==='aquaArcStream'?'aquaArc':'chaosCrusher']:true,
        beat:effect.beat,streamIndex:effect.streamIndex,sourceKnockback:knockback,worldKnockback:Math.hypot(worldKnockback.x,worldKnockback.z),melee:effect.type==='chaosCrusherCore',projectile:true,subtypes:effect.type==='chaosCrusherCore'?effect.spec.subtypes:undefined,
      });
      addImpact({x:enemy.x,y:enemyCenterY(enemy,system),z:enemy.z},effect.arcanaId==='CHAOS-CRUSHER'?CHAOS_HOT:WATER_HOT,effect.size*(effect.type==='ripTideRipple'?.72:.58),effect.visualMode,`${effect.arcanaId.toLowerCase()}-impact`);
      semantic(effect.type==='ripTideRipple'?'rip-tide-ripple-hit':effect.type==='aquaArcStream'?'aqua-arc-stream-hit':'chaos-crusher-core-hit',{arcanaId:effect.arcanaId,stableId:effect.stableId,comboStableId:effect.comboStableId,beat:effect.beat,streamIndex:effect.streamIndex,targetId:id,damage:damageAmount,knockback,pierced:true});
    }
    effect.mesh.traverse(child=>{if(child.material&&child.userData?.baseOpacity!==undefined)child.material.opacity=child.userData.baseOpacity*(.82+.18*Math.sin(now*10+effect.beat));});
    if(wall){semantic(`${effect.type==='ripTideRipple'?'rip-tide-ripple':effect.type==='aquaArcStream'?'aqua-arc-stream':'chaos-crusher-core'}-wall-fizzle`,{arcanaId:effect.arcanaId,stableId:effect.stableId,position:{x:wall.hit.x,z:wall.hit.z},harmless:true,targetIds:effect.targetIds.slice(),interceptedIds:(effect.interceptedIds||[]).slice()});addImpact({x:wall.hit.x,y:.34*effect.size,z:wall.hit.z},effect.arcanaId==='CHAOS-CRUSHER'?CHAOS:WATER_HOT,effect.size*.52,effect.visualMode,'wall-fizzle');remove(effect);return;}
    if(effect.distance+1e-8>=range){semantic(effect.type==='ripTideRipple'?'rip-tide-ripple-expired':effect.type==='aquaArcStream'?'aqua-arc-stream-expired':'chaos-crusher-core-expired',{arcanaId:effect.arcanaId,stableId:effect.stableId,distance:effect.distance,targetIds:effect.targetIds.slice(),interceptedIds:(effect.interceptedIds||[]).slice()});remove(effect);}
  }
  function updateChaosRift(effect,dt,now){
    effect.age+=dt;const begin=effect.spec.compression.begins,launch=effect.spec.compression.launches,k=clamp((effect.age-begin)/(launch-begin),0,1),sample=sampleChaosCompression({progress:k,expandedRadius:effect.spec.rift.radius,coreRadius:effect.spec.core.radius});
    effect.mesh.scale.setScalar(effect.size*(sample.radius/effect.spec.rift.radius));effect.mesh.rotation.y+=dt*(2.2+5*k);effect.mesh.traverse(child=>{if(child.material&&child.userData?.baseOpacity!==undefined)child.material.opacity=child.userData.baseOpacity*(.72+.28*sample.brightness);});
    if(!effect.launched&&effect.age+1e-9>=launch){effect.launched=true;semantic('chaos-crusher-rift-compressed',{arcanaId:'CHAOS-CRUSHER',stableId:effect.stableId,comboStableId:effect.comboStableId,beat:effect.beat,fromRadius:effect.spec.rift.radius,toRadius:effect.spec.core.radius});emitChaosCore(effect);remove(effect);}
  }
  function updateImpact(effect,dt){effect.age+=dt;const k=clamp(effect.age/effect.life,0,1);effect.mesh.scale.setScalar(1+k*1.75);effect.mesh.traverse(child=>{if(child.material)child.material.opacity=(child.userData?.baseOpacity??.8)*Math.pow(1-k,.40);});if(k>=1)remove(effect);}

  function effectSnapshot(effect){
    const value={type:effect.type,arcanaId:effect.arcanaId||'',stableId:effect.stableId||'',comboStableId:effect.comboStableId||'',visualMode:effect.visualMode||'',age:Number(effect.age)||0};
    for(const key of['life','beat','streamIndex','distance','movementApplied'])if(Number.isFinite(Number(effect[key])))value[key]=Number(effect[key]);
    for(const key of['position','previous','origin','direction'])if(effect[key])value[key]={x:Number(effect[key].x)||0,z:Number(effect[key].z)||0};
    if(Array.isArray(effect.targetIds))value.targetIds=effect.targetIds.slice();if(Array.isArray(effect.interceptedIds))value.interceptedIds=effect.interceptedIds.slice();
    if(effect.spec){value.damage=Number(effect.spec.damage??effect.spec.core?.damage)||0;value.piercesEnemies=!!(effect.spec.piercesEnemies??effect.spec.core?.piercesEnemies);}
    return value;
  }
  function snapshot(){return{simulationTime:state.elapsed,castSerial:state.castSerial,lastCast:state.lastCast,visualMode:state.visualMode,movementLocked:state.movementLocks.size>0,movementLocks:[...state.movementLocks],facingLocked:state.facingLocks.size>0,facingLocks:[...state.facingLocks.keys()],effects:state.effects.map(effectSnapshot),semanticEvents:state.semanticEvents.map(event=>({...event}))};}

  const onPlay=event=>play(event?.detail?.card,event?.detail||{});
  const onTweaks=event=>{state.sizeMultiplier=clampArcanaSize(event?.detail?.sizeMultiplier);};
  window.addEventListener('wizard-arcana:play',onPlay);window.addEventListener(ARCANA_TWEAKS_EVENT,onTweaks);
  return{
    state,cast,canPlay,play,snapshot,reset,
    update(dt,now=0){
      const frame=Math.max(0,Number(dt)||0),time=Number(now)||0;state.elapsed+=frame;
      for(const effect of[...state.effects]){
        if(effect.type==='iceDaggerCombo')updateCombo(effect,frame,emitIceDagger);
        else if(effect.type==='ripTideCombo')updateCombo(effect,frame,emitRipTide);
        else if(effect.type==='aquaArcCombo')updateCombo(effect,frame,emitAquaArc);
        else if(effect.type==='chaosCrusherCombo')updateCombo(effect,frame,emitChaosRift);
        else if(effect.type==='iceDaggerStrike')updateIceStrike(effect,frame);
        else if(effect.type==='ripTideRipple'||effect.type==='aquaArcStream'||effect.type==='chaosCrusherCore')updateProjectile(effect,frame,time);
        else if(effect.type==='chaosCrusherRift')updateChaosRift(effect,frame,time);
        else if(effect.type==='basicImpact')updateImpact(effect,frame);
      }
    },
    dispose(){window.removeEventListener('wizard-arcana:play',onPlay);window.removeEventListener(ARCANA_TWEAKS_EVENT,onTweaks);reset();},
  };
}
