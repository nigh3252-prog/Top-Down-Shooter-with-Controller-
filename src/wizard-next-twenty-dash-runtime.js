import { ARCANA_TWEAKS_EVENT, clampArcanaSize, readArcanaTweaks } from './wizard-arcana-settings.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const TAU=Math.PI*2;
const PLAYER_DIAMETER=2.1;
const BASE_DASH_DISTANCE=8.4;

export const WIZARD_NEXT_TWENTY_DASH_SEMANTIC_EVENT='wizard-next-twenty-dash:semantic';

export const SEARING_RUSH_SPEC=Object.freeze({id:'SEARING-RUSH',element:'Fire',cooldown:5.5,trackLife:.35,trackRadius:.72,burnDamage:7,burnTicks:4,burnInterval:.10,destroysProjectiles:true});
export const FLARE_RUSH_SPEC=Object.freeze({id:'FLARE-RUSH',element:'Fire',cooldown:5.5,count:3,damage:10,burnDamage:8,burnTicks:2,burnInterval:.48,speed:18,range:13,radius:.38,laneSpacing:.72});
export const IGNITION_RUSH_SPEC=Object.freeze({id:'IGNITION-RUSH',element:'Fire',cooldown:6,duration:3,innerRadius:1.05,outerRadius:2.25,burnDamage:8,burnTicks:2,burnInterval:.48,outwardNudge:.62});
export const AIR_BURST_SPEC=Object.freeze({id:'AIR-BURST',element:'Air',cooldown:4,damage:15,radius:2.35,carryDuration:.24});
export const GUST_BURST_SPEC=Object.freeze({id:'GUST-BURST',element:'Air',charges:2,recharge:3.5,gatherDamage:5,draughtDamage:10,gatherRadius:2.15,pathRadius:1.15,transportFraction:.78});
export const RAZOR_BURST_SPEC=Object.freeze({id:'RAZOR-BURST',element:'Air',cooldown:5.12,duration:1,tickTimes:Object.freeze([.12,.30,.48,.66]),tickDamage:5,radius:2.05,pull:.38,slowDuration:1.1});
export const SPIKE_TRACK_SPEC=Object.freeze({id:'SPIKE-TRACK',element:'Earth',cooldown:5,damage:30,knockback:10,pathRadius:.82,spikeSpacing:.85,eruptionInterval:.055});
export const TOXIC_TRAP_SPEC=Object.freeze({id:'TOXIC-TRAP',element:'Earth',cooldown:6,seedDelay:.18,duration:3.2,radius:2.05,poisonDamage:5,poisonTicks:5,poisonInterval:.72});
export const SNARE_TRACK_SPEC=Object.freeze({id:'SNARE-TRACK',element:'Earth',cooldown:6,count:3,damage:20,speed:10.5,range:8.5,radius:.40,laneAngles:Object.freeze([0,-.26,.26]),entangleDuration:1.35});
export const THUNDER_LINE_SPEC=Object.freeze({id:'THUNDER-LINE',element:'Lightning',charges:2,recharge:5,delay:.35,broadRadius:2.25,coreHalfWidth:.48,coreLength:4.5,broadDamage:10,coreDamage:10,shockDamage:6,shockTicks:2,shockInterval:.42});
export const CIRCUIT_LINE_SPEC=Object.freeze({id:'CIRCUIT-LINE',element:'Lightning',charges:3,recharge:4,activationDelay:1.5,nodeLinkRange:10.5,streamRadius:.42,tickDamage:2,baseTicks:4,tickInterval:.18,fieldLife:2.4});
export const SHOCK_LINE_SPEC=Object.freeze({id:'SHOCK-LINE',element:'Lightning',cooldown:6,duration:1.25,halfLength:2.2,radius:.34,shockDamage:8,shockTicks:2,shockInterval:.42,hitStun:.18,destroysProjectiles:true});
export const WAVE_FRONT_SPEC=Object.freeze({id:'WAVE-FRONT',element:'Water',cooldown:5,radius:2.3,tickDamage:9,tickTimes:Object.freeze([.04,.16,.28]),shield:25,detachedDuration:.45,detachedSpeed:10,carryFraction:.88});
export const FROST_FEINT_SPEC=Object.freeze({id:'FROST-FEINT',element:'Ice',charges:2,recharge:3.5,duration:2,shatterDamage:12,shatterRadius:2.15,freezeDuration:1.25});
export const FROST_WING_SPEC=Object.freeze({id:'FROST-WING',element:'Ice',cooldown:5.5,count:4,damage:20,knockback:20,speed:12.5,range:9,radius:.34,angles:Object.freeze([-.38,-.15,.15,.38]),freezeDuration:1.15,destroysProjectiles:true});
export const CHAOTIC_RIFT_SPEC=Object.freeze({id:'CHAOTIC-RIFT',element:'Chaos',cooldown:.5,transitDuration:.5,distance:BASE_DASH_DISTANCE,damage:0,clearance:1.05});

export const WIZARD_NEXT_TWENTY_DASH_SPECS=Object.freeze({
  'SEARING-RUSH':SEARING_RUSH_SPEC,'FLARE-RUSH':FLARE_RUSH_SPEC,'IGNITION-RUSH':IGNITION_RUSH_SPEC,
  'AIR-BURST':AIR_BURST_SPEC,'GUST-BURST':GUST_BURST_SPEC,'RAZOR-BURST':RAZOR_BURST_SPEC,
  'SPIKE-TRACK':SPIKE_TRACK_SPEC,'TOXIC-TRAP':TOXIC_TRAP_SPEC,'SNARE-TRACK':SNARE_TRACK_SPEC,
  'THUNDER-LINE':THUNDER_LINE_SPEC,'CIRCUIT-LINE':CIRCUIT_LINE_SPEC,'SHOCK-LINE':SHOCK_LINE_SPEC,
  'WAVE-FRONT':WAVE_FRONT_SPEC,'FROST-FEINT':FROST_FEINT_SPEC,'FROST-WING':FROST_WING_SPEC,
  'CHAOTIC-RIFT':CHAOTIC_RIFT_SPEC,
});
export const WIZARD_NEXT_TWENTY_DASH_IDS=Object.freeze(Object.keys(WIZARD_NEXT_TWENTY_DASH_SPECS));
export const WIZARD_CONTINUOUS_DASH_IDS=Object.freeze(WIZARD_NEXT_TWENTY_DASH_IDS.filter(id=>id!=='CHAOTIC-RIFT'));

export function normalizeWizardNextTwentyDashVisualMode(stage='style'){
  const value=String(stage||'style').trim().toLowerCase();
  if(value==='motion'||value==='contract')return'contract';
  if(value==='reference'||value==='source')return'source';
  return'style';
}

export function normalizeDashDirection(direction,fallback={x:0,z:1}){
  const x=Number(direction?.x)||0,z=Number(direction?.z)||0,length=Math.hypot(x,z);
  if(length>1e-6)return Object.freeze({x:x/length,z:z/length});
  const fx=Number(fallback?.x)||0,fz=Number(fallback?.z)||1,fl=Math.hypot(fx,fz)||1;
  return Object.freeze({x:fx/fl,z:fz/fl});
}

export function sampleDashTrack(path=[],spacing=.75){
  const points=(path||[]).filter(point=>Number.isFinite(Number(point?.x))&&Number.isFinite(Number(point?.z))).map(point=>({x:Number(point.x),z:Number(point.z)}));
  if(points.length<2)return Object.freeze(points.map(point=>Object.freeze(point)));
  const interval=Math.max(.05,Number(spacing)||.75),result=[{...points[0]}];let carry=0;
  for(let index=1;index<points.length;index++){
    const start=points[index-1],end=points[index],dx=end.x-start.x,dz=end.z-start.z,length=Math.hypot(dx,dz);if(length<1e-8)continue;
    let distance=interval-carry;while(distance<=length+1e-9){const t=distance/length;result.push({x:start.x+dx*t,z:start.z+dz*t});distance+=interval;}carry=Math.max(0,length-(distance-interval));
  }
  const last=points.at(-1),tail=result.at(-1);if(!tail||Math.hypot(last.x-tail.x,last.z-tail.z)>.05)result.push({...last});
  return Object.freeze(result.map(point=>Object.freeze(point)));
}

export function pointSegmentDistance2D(point,a,b){
  const abx=b.x-a.x,abz=b.z-a.z,apx=point.x-a.x,apz=point.z-a.z,denom=abx*abx+abz*abz,t=denom>1e-9?clamp((apx*abx+apz*abz)/denom,0,1):0;
  return Math.hypot(point.x-(a.x+abx*t),point.z-(a.z+abz*t));
}

export function pointPolylineDistance2D(point,path=[]){
  if(!path?.length)return Infinity;if(path.length===1)return Math.hypot(point.x-path[0].x,point.z-path[0].z);
  let best=Infinity;for(let index=1;index<path.length;index++)best=Math.min(best,pointSegmentDistance2D(point,path[index-1],path[index]));return best;
}

export function sampleRearVolley({origin={x:0,z:0},direction={x:0,z:1},count=3,laneSpacing=.72}={}){
  const forward=normalizeDashDirection(direction),right={x:forward.z,z:-forward.x},middle=(Math.max(1,count)-1)/2;
  return Object.freeze(Array.from({length:Math.max(1,Math.trunc(count))},(_,index)=>Object.freeze({index,position:Object.freeze({x:origin.x+right.x*(index-middle)*laneSpacing,z:origin.z+right.z*(index-middle)*laneSpacing}),direction:forward})));
}

export function sampleCircuitConnections(nodes=[],maxDistance=CIRCUIT_LINE_SPEC.nodeLinkRange){
  const valid=(nodes||[]).filter(node=>Number.isFinite(Number(node?.x))&&Number.isFinite(Number(node?.z)));if(valid.length<2)return Object.freeze([]);
  const edges=[],seen=new Set(),add=(a,b)=>{if(a===b)return;const key=[a,b].sort((x,y)=>x-y).join(':');if(seen.has(key))return;const start=valid[a],end=valid[b],distance=Math.hypot(end.x-start.x,end.z-start.z);if(distance>.05&&distance<=maxDistance){seen.add(key);edges.push(Object.freeze({a,b,start:Object.freeze({x:start.x,z:start.z}),end:Object.freeze({x:end.x,z:end.z}),distance}));}};
  for(let a=0;a<valid.length-1;a++)for(let b=a+1;b<valid.length;b++)add(a,b);
  return Object.freeze(edges);
}

function segmentIntersection2D(a,b,c,d){const rx=b.x-a.x,rz=b.z-a.z,sx=d.x-c.x,sz=d.z-c.z,cross=rx*sz-rz*sx;if(Math.abs(cross)<1e-9)return null;const qx=c.x-a.x,qz=c.z-a.z,t=(qx*sz-qz*sx)/cross,u=(qx*rz-qz*rx)/cross;return t>=0&&t<=1&&u>=0&&u<=1?{t,u,x:a.x+rx*t,z:a.z+rz*t}:null;}
function distanceToWall(point,wall){return pointSegmentDistance2D(point,wall.a,wall.b);}

export function resolveChaoticRiftEndpoint({origin={x:0,z:0},direction={x:0,z:1},distance=CHAOTIC_RIFT_SPEC.distance,walls=[],clearance=CHAOTIC_RIFT_SPEC.clearance}={}){
  const forward=normalizeDashDirection(direction),requested={x:origin.x+forward.x*distance,z:origin.z+forward.z*distance};
  const valid=point=>(walls||[]).every(wall=>!wall?.a||!wall?.b||distanceToWall(point,wall)>=clearance);
  if(valid(requested))return Object.freeze({requested:Object.freeze(requested),resolved:Object.freeze({...requested}),blocked:false});
  for(let back=.25;back<=distance;back+=.25){const point={x:requested.x-forward.x*back,z:requested.z-forward.z*back};if(valid(point))return Object.freeze({requested:Object.freeze(requested),resolved:Object.freeze(point),blocked:true});}
  return Object.freeze({requested:Object.freeze(requested),resolved:Object.freeze({...origin}),blocked:true});
}

export function dashPayloadContract(id){const spec=WIZARD_NEXT_TWENTY_DASH_SPECS[String(id||'').replace(/^WOL-/,'')];return spec?Object.freeze({...spec}):null;}

const PALETTES=Object.freeze({
  Fire:Object.freeze({deep:0x8d1d12,main:0xff5d1f,hot:0xffbd3f,core:0xffffdc,smoke:0x3c211f}),
  Air:Object.freeze({deep:0x146f87,main:0x38cfe5,hot:0xa8fbff,core:0xf2ffff,smoke:0x355a69}),
  Earth:Object.freeze({deep:0x4c3824,main:0xa57840,hot:0xd8bd71,core:0xf5edb4,smoke:0x24351f}),
  Lightning:Object.freeze({deep:0x6b4cb2,main:0xd36cff,hot:0xffe34f,core:0xffffe5,smoke:0x30264b}),
  Water:Object.freeze({deep:0x155d99,main:0x24aeea,hot:0x7eecff,core:0xe5fdff,smoke:0x173c64}),
  Ice:Object.freeze({deep:0x417ab7,main:0x79cfff,hot:0xb8f2ff,core:0xf4ffff,smoke:0x425b80}),
  Chaos:Object.freeze({deep:0x3b155e,main:0x9b36e5,hot:0xef72ff,core:0xffdcff,smoke:0x21102e}),
  Poison:Object.freeze({deep:0x31541d,main:0x72aa2f,hot:0xb8df4d,core:0xedff99,smoke:0x27331e}),
  Vine:Object.freeze({deep:0x28531f,main:0x5f9d35,hot:0xa7d84b,core:0xe8f899,smoke:0x20331c}),
});

function isEnemyLabRuntime(){
  if(typeof window==='undefined')return false;
  try{const params=new URLSearchParams(globalThis.location?.search||'');if(params.get('enemyLab')==='1'||params.get('mode')==='enemy-lab')return true;return !!(window.parent&&window.parent!==window&&window.frameElement?.id==='arenaFrame'&&/(?:^|\/)enemy-lab\.html$/i.test(window.parent.location?.pathname||''));}catch{return false;}
}
function isCaptureRuntime(){try{return new URLSearchParams(globalThis.location?.search||'').get('capture')==='1';}catch{return false;}}
function currentVisualMode(){
  if(!isCaptureRuntime())return'style';let stage='style';
  try{stage=window.__abilityCapture?.snapshot?.().stage||new URLSearchParams(globalThis.location?.search||'').get('stage')||'style';}catch{}
  return normalizeWizardNextTwentyDashVisualMode(stage);
}
function playerFrame(getPlayer){const player=getPlayer?.()||{},forward=normalizeDashDirection({x:Number(player.forwardX)||0,z:Number(player.forwardZ)||1});return{x:Number(player.x)||0,z:Number(player.z)||0,forward,right:{x:forward.z,z:-forward.x}};}
function aliveEnemies(system){return(system?.enemies||[]).filter(enemy=>enemy&&Number(enemy.hp)>0);}
function enemyRadius(enemy,system){return Math.max(.42,(Number(enemy?.radius)||1)*(Number(system?.heightScale)||1)*.72);}
function enemyCenterY(enemy,system){const scale=(Number(system?.heightScale)||1)*(Number(enemy?.currentTargetScale)||Number(enemy?.targetScale)||1);return(Number(enemy?.targetYOffset)||Number(enemy?.rootLift)||0)+(Number(enemy?.height)||2)*scale*.52;}
function targetId(enemy,system){const explicit=enemy?.__abilityCaptureDummyId??enemy?.id??enemy?.spawnId??enemy?.captureId;if(explicit!==undefined&&explicit!==null)return String(explicit);return`enemy-${Math.max(0,system?.enemies?.indexOf?.(enemy)??0)}`;}
function hostileProjectiles(system){const values=system?.hostileProjectiles;return Array.isArray(values)?values.filter(projectile=>projectile&&!projectile.dead):[];}
function destroyProjectile(system,projectile){if(!projectile||projectile.dead)return false;if(system?.destroyHostileProjectile?.(projectile)!==undefined)return true;projectile.dead=true;projectile.life=0;if(projectile.mesh)projectile.mesh.visible=false;return true;}
function moveEnemy(system,enemy,x,z){if(system?.moveEnemy)system.moveEnemy(enemy,{x,z});else{enemy.x=x;enemy.z=z;if(enemy.mesh?.position)enemy.mesh.position.set(x,enemy.mesh.position.y||0,z);if(enemy.root?.position)enemy.root.position.set(x,enemy.root.position.y||0,z);}}
function closestPointOnSegment2D(point,a,b){const abx=b.x-a.x,abz=b.z-a.z,denom=abx*abx+abz*abz,t=denom>1e-9?clamp(((point.x-a.x)*abx+(point.z-a.z)*abz)/denom,0,1):0;return{x:a.x+abx*t,z:a.z+abz*t,t};}
function closestPointOnPolyline2D(point,path=[]){if(!path.length)return null;if(path.length===1)return{x:path[0].x,z:path[0].z,index:0,t:0};let best=null;for(let index=1;index<path.length;index++){const candidate=closestPointOnSegment2D(point,path[index-1],path[index]),distance=Math.hypot(point.x-candidate.x,point.z-candidate.z);if(!best||distance<best.distance)best={...candidate,index:index-1,distance};}return best;}
function resolvedRouteDirection(path=[],fallback={x:0,z:1}){for(let index=path.length-1;index>0;index--){const dx=Number(path[index]?.x)-Number(path[index-1]?.x),dz=Number(path[index]?.z)-Number(path[index-1]?.z);if(Math.hypot(dx,dz)>.02)return normalizeDashDirection({x:dx,z:dz},fallback);}return normalizeDashDirection(fallback);}
function dealDamage(system,enemy,amount,knock={x:0,z:0},options={}){if(!system||!enemy||Number(enemy.hp)<=0)return false;return system.damageEnemy?.(enemy,amount,knock,{source:'wizardArcana',power:.38,pop:.07,...options})??false;}
function disposeObject(root){if(!root)return;root.parent?.remove?.(root);root.traverse?.(object=>{object.geometry?.dispose?.();if(Array.isArray(object.material))object.material.forEach(material=>material?.dispose?.());else object.material?.dispose?.();});}
function makeMaterial(THREE,color,opacity=.86,{additive=true,wireframe=false}={}){return new THREE.MeshBasicMaterial({color,transparent:true,opacity,wireframe,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,depthWrite:false,side:THREE.DoubleSide});}
function palette(element){return PALETTES[element]||PALETTES.Chaos;}
function tag(object,key,value=true){object.userData[key]=value;return object;}
function addMesh(THREE,group,geometry,color,opacity=.8,options={}){const mesh=new THREE.Mesh(geometry,makeMaterial(THREE,color,opacity,options));mesh.userData.baseOpacity=opacity;group.add(mesh);return mesh;}
function setPosition(object,position,y=0){object.position.set(Number(position?.x)||0,Number(position?.y)??y,Number(position?.z)||0);}
function rememberScale(object,key='baseScale'){object.userData[key]={x:object.scale.x,y:object.scale.y,z:object.scale.z};return object;}
function setOpacity(root,factor=1){root?.traverse?.(child=>{if(child.material)child.material.opacity=(child.userData?.baseOpacity??.72)*clamp(factor,0,1);});}

function addSegment(THREE,group,a,b,{color,width=.1,opacity=.85,y=.22,marker='segment',additive=true}={}){
  const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<1e-5)return null;
  const mesh=addMesh(THREE,group,new THREE.SphereGeometry(1,9,6),color,opacity,{additive});mesh.position.set((a.x+b.x)/2,y,(a.z+b.z)/2);mesh.scale.set(width,width*.55,length*.52);mesh.rotation.y=Math.atan2(dx,dz);mesh.userData[marker]=true;return mesh;
}

function finishVisual(scene,group,{name,position={x:0,z:0},direction={x:0,z:1},mode='style',scale=1}={}){
  group.name=name;group.userData.visualMode=mode;group.position.set(position.x,0,position.z);group.rotation.y=Math.atan2(direction.x,direction.z);group.scale.setScalar(scale);group.renderOrder=8;scene.add(group);return group;
}

function makeBurstVisual(THREE,scene,{name,element,position,direction={x:0,z:1},radius=1,mode='style',rearBias=0}={}){
  const colors=palette(element),group=new THREE.Group(),layers=mode==='contract'?1:mode==='source'?3:5;
  for(let index=0;index<layers;index++){
    const fraction=(index+1)/layers,color=index===layers-1?colors.core:index%2?colors.hot:colors.main,ring=addMesh(THREE,group,new THREE.RingGeometry(radius*(.18+.15*index),radius*(.25+.17*index),32),color,.92-index*.11);ring.rotation.x=-Math.PI/2;ring.position.set(0,.05+index*.035,-rearBias*radius*(1-fraction));ring.userData.burstLayer=index;
  }
  const core=addMesh(THREE,group,new THREE.SphereGeometry(radius*(mode==='contract'?.16:.28),12,8),colors.core,.94);core.position.set(0,.38,-rearBias*radius*.5);core.scale.set(1,.7,1.25);tag(core,'burstCore');
  if(mode==='style')for(let index=0;index<10;index++){const angle=index*TAU/10,spark=addMesh(THREE,group,new THREE.SphereGeometry(radius*(.035+(index%3)*.008),7,5),index%2?colors.hot:colors.core,.82);spark.position.set(Math.cos(angle)*radius*(.48+.05*(index%2)),.22+(index%3)*.07,Math.sin(angle)*radius*(.48+.05*(index%2))-rearBias*radius*.35);tag(spark,'styleSpark',index);}
  return finishVisual(scene,group,{name,position,direction,mode});
}

function makeFieldVisual(THREE,scene,{name,element,position,radius=1,mode='style',hollow=false,wire=false}={}){
  const colors=palette(element),group=new THREE.Group(),rings=mode==='contract'?1:mode==='source'?3:5;
  for(let index=0;index<rings;index++){const outer=radius*(.52+.48*(index+1)/rings),inner=Math.max(.08,hollow?outer-.13:outer-.22),ring=addMesh(THREE,group,new THREE.RingGeometry(inner,outer,40),index===rings-1?colors.hot:index%2?colors.main:colors.deep,.76-index*.075);ring.rotation.x=-Math.PI/2;ring.position.y=.035+index*.025;tag(ring,'fieldRing',index);}
  if(wire){const line=addMesh(THREE,group,new THREE.SphereGeometry(1,9,6),colors.core,.98);line.scale.set(radius,.055,.08);line.position.y=.16;tag(line,'wireCore');}
  if(mode!=='contract')for(let index=0;index<(mode==='style'?12:6);index++){const angle=index*TAU/(mode==='style'?12:6),node=addMesh(THREE,group,new THREE.SphereGeometry(radius*(mode==='style'?.045:.035),7,5),index%3?colors.hot:colors.core,.82);node.position.set(Math.cos(angle)*radius*(.68+.13*(index%2)),.16+.10*(index%3),Math.sin(angle)*radius*(.68+.13*(index%2)));tag(node,'orbitNode',index);}
  return finishVisual(scene,group,{name,position,mode});
}

function makeTrailVisual(THREE,scene,{name,element,path,mode='style',width=.42,spikes=false}={}){
  const colors=palette(element),group=new THREE.Group(),fire=element==='Fire'&&!spikes,sampled=sampleDashTrack(path,fire?.22:spikes?.58:.44),layers=mode==='contract'?1:mode==='source'?2:3;
  if(fire){
    for(let index=1;index<sampled.length;index++){
      const a=sampled[index-1],b=sampled[index],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<1e-5)continue;
      const angle=Math.atan2(dx,dz),midX=(a.x+b.x)/2,midZ=(a.z+b.z)/2;
      const ribbons=[
        {span:2.20,height:.045,color:colors.deep,opacity:.48,y:.035,additive:false},
        {span:1.58,height:.055,color:colors.main,opacity:.68,y:.075,additive:true},
        {span:.78,height:.045,color:colors.hot,opacity:.86,y:.115,additive:true},
      ];
      for(let layer=0;layer<layers;layer++){
        const ribbon=ribbons[layer],mesh=addMesh(THREE,group,new THREE.BoxGeometry(width*ribbon.span,ribbon.height,length*1.18),ribbon.color,ribbon.opacity,{additive:ribbon.additive});
        mesh.position.set(midX,ribbon.y,midZ);mesh.rotation.y=angle;tag(mesh,'trailSegment',index*10+layer);
      }
    }
    if(mode!=='contract')sampled.forEach((point,index)=>{
      if(index===0||index===sampled.length-1||index%2)return;
      const prior=sampled[Math.max(0,index-1)],next=sampled[Math.min(sampled.length-1,index+1)],tangent=normalizeDashDirection({x:next.x-prior.x,z:next.z-prior.z}),right={x:tangent.z,z:-tangent.x};
      const lateral=Math.sin(index*2.17)*width*.50,height=width*(.75+(index%5)*.13),outer=addMesh(THREE,group,new THREE.ConeGeometry(width*(.25+(index%3)*.025),height,7),index%3?colors.main:colors.hot,.80);
      outer.position.set(point.x+right.x*lateral,height*.50+.08,point.z+right.z*lateral);outer.rotation.z=Math.sin(index*1.73)*.20;outer.rotation.x=Math.cos(index*1.11)*.12;tag(outer,'flameTongue',index);
      if(mode==='style'){
        const innerHeight=height*.66,inner=addMesh(THREE,group,new THREE.ConeGeometry(width*.13,innerHeight,7),index%4?colors.hot:colors.core,.92);
        inner.position.set(point.x+right.x*lateral,innerHeight*.50+.10,point.z+right.z*lateral);inner.rotation.copy(outer.rotation);tag(inner,'flameCore',index);
      }
    });
  }else for(let index=1;index<sampled.length;index++)for(let layer=0;layer<layers;layer++){
    addSegment(THREE,group,sampled[index-1],sampled[index],{color:layer===layers-1?colors.core:layer?colors.main:colors.deep,width:width*(1.5-layer*.38),opacity:.32+layer*.25,y:.07+layer*.05,marker:'trailSegment'});
  }
  if(spikes)sampled.forEach((point,index)=>{const spike=addMesh(THREE,group,new THREE.ConeGeometry(width*(.48+(index%3)*.08),1.25+(index%2)*.32,7),index%3?colors.main:colors.hot,.95,{additive:false});spike.position.set(point.x,.55+(index%2)*.12,point.z);spike.rotation.z=(index%2?1:-1)*.14;tag(spike,'trackSpike',index);});
  else if(mode==='style'&&!fire)sampled.forEach((point,index)=>{if(index%2)return;const ember=addMesh(THREE,group,new THREE.SphereGeometry(width*.12,7,5),index%4?colors.hot:colors.core,.76);ember.position.set(point.x,.18+(index%3)*.08,point.z);tag(ember,'trailEmber',index);});
  group.name=name;group.userData.visualMode=mode;group.renderOrder=7;scene.add(group);return group;
}

function makeProjectileVisual(THREE,scene,{name,element,position,direction,radius=.35,mode='style',shape='orb'}={}){
  const colors=palette(element),group=new THREE.Group();
  if(shape==='feather'){
    const blade=addMesh(THREE,group,new THREE.ConeGeometry(radius*.62,radius*3.2,6),colors.hot,.94);blade.rotation.x=Math.PI/2;blade.position.z=radius*.4;tag(blade,'featherBlade');
  }else if(shape==='vine'){
    const stem=addMesh(THREE,group,new THREE.SphereGeometry(1,8,6),colors.main,.94,{additive:false});stem.scale.set(radius*.38,radius*.30,radius*3.4);tag(stem,'vineCarrier');
  }else{
    const shell=addMesh(THREE,group,new THREE.SphereGeometry(radius,12,8),colors.main,.88);shell.scale.set(1,.76,1.65);tag(shell,'projectileShell');
  }
  if(mode!=='contract'){const core=addMesh(THREE,group,new THREE.SphereGeometry(radius*.48,10,7),colors.core,.98);core.scale.set(1,.72,1.72);tag(core,'projectileCore');}
  if(mode==='style')for(let index=1;index<=4;index++){const echo=addMesh(THREE,group,new THREE.SphereGeometry(radius*(.30-index*.035),7,5),index%2?colors.hot:colors.main,.54-index*.06);echo.position.z=-index*radius*.62;tag(echo,'projectileEcho',index);}
  return finishVisual(scene,group,{name,position,direction,mode});
}

function makeDecoyVisual(THREE,scene,{position,mode='style'}={}){
  const colors=PALETTES.Ice,group=new THREE.Group(),body=addMesh(THREE,group,new THREE.BoxGeometry(.70,1.05,.46),colors.main,.66);body.position.y=1.12;tag(body,'decoyBody');
  const chest=addMesh(THREE,group,new THREE.DodecahedronGeometry(.46,1),colors.hot,.46);chest.position.y=1.18;chest.scale.set(.88,1.18,.64);tag(chest,'decoyChest');
  const head=addMesh(THREE,group,new THREE.DodecahedronGeometry(.34,1),colors.core,.88);head.position.y=1.96;head.scale.set(.90,1.05,.86);tag(head,'decoyHead');
  const limbParts=[
    {x:-.48,y:1.16,z:0,sx:.18,sy:.78,sz:.22,rz:.16,kind:'arm'},
    {x:.48,y:1.16,z:0,sx:.18,sy:.78,sz:.22,rz:-.16,kind:'arm'},
    {x:-.21,y:.39,z:0,sx:.23,sy:.72,sz:.28,rz:.06,kind:'leg'},
    {x:.21,y:.39,z:0,sx:.23,sy:.72,sz:.28,rz:-.06,kind:'leg'},
  ];
  for(let index=0;index<limbParts.length;index++){const part=limbParts[index],limb=addMesh(THREE,group,new THREE.BoxGeometry(part.sx,part.sy,part.sz),index<2?colors.main:colors.deep,.70);limb.position.set(part.x,part.y,part.z);limb.rotation.z=part.rz;tag(limb,'decoyLimb',part.kind);tag(limb,'decoyLimbIndex',index);}
  const base=addMesh(THREE,group,new THREE.RingGeometry(.48,.84,28),colors.hot,.38);base.rotation.x=-Math.PI/2;base.position.y=.035;tag(base,'decoyBase');
  if(mode!=='contract')for(let index=0;index<(mode==='style'?12:6);index++){const angle=index*TAU/(mode==='style'?12:6),shard=addMesh(THREE,group,new THREE.ConeGeometry(.065,.44+(index%3)*.08,5),index%2?colors.hot:colors.core,.76);shard.position.set(Math.cos(angle)*(.68+.08*(index%2)),.34+(index%4)*.42,Math.sin(angle)*(.68+.08*(index%2)));shard.rotation.z=angle;tag(shard,'decoyShard',index);}
  return finishVisual(scene,group,{name:'Wizard Arcana Frost Feint decoy',position,mode});
}

function makeRiftVisual(THREE,scene,{position,mode='style',exit=false}={}){
  const colors=PALETTES.Chaos,group=new THREE.Group(),layers=mode==='contract'?1:mode==='source'?3:5;
  const shadow=addMesh(THREE,group,new THREE.SphereGeometry(1.12,24,14),0x050008,.98,{additive:false});shadow.position.y=.58;shadow.scale.set(1,.72,.92);tag(shadow,'riftVoid');
  const throat=addMesh(THREE,group,new THREE.SphereGeometry(.78,18,12),0x160321,.94,{additive:false});throat.position.y=.64;throat.scale.set(1,.58,.88);tag(throat,'riftThroat');
  for(let index=0;index<layers;index++){const ring=addMesh(THREE,group,new THREE.TorusGeometry(.72+index*.105,.075-index*.006,8,36),index===layers-1?colors.hot:index%2?colors.main:colors.deep,.76-index*.07);ring.rotation.x=Math.PI/2;ring.rotation.z=(exit?-1:1)*index*.31;ring.position.y=.09+index*.025;tag(ring,'riftFringe',index);}
  const iris=addMesh(THREE,group,new THREE.TorusGeometry(.46,.065,8,32),colors.core,.58);iris.rotation.x=Math.PI/2;iris.position.y=.20;tag(iris,'riftIris');
  if(mode!=='contract')for(let index=0;index<(mode==='style'?12:7);index++){const angle=index*TAU/(mode==='style'?12:7),shard=addMesh(THREE,group,new THREE.ConeGeometry(.055,.36+(index%3)*.07,5),index%2?colors.hot:colors.main,.70);shard.position.set(Math.cos(angle)*(.87+.05*(index%2)),.16+(index%3)*.05,Math.sin(angle)*(.87+.05*(index%2)));shard.rotation.z=angle+(exit?Math.PI:0);tag(shard,'riftShard',index);}
  group.userData.riftRole=exit?'exit':'entry';
  return finishVisual(scene,group,{name:`Wizard Arcana Chaotic Rift ${exit?'exit':'entry'} aperture`,position,mode,scale:1.28});
}

function sampleCircuitJaggedPath(edge,mode='style'){
  const dx=edge.end.x-edge.start.x,dz=edge.end.z-edge.start.z,length=Math.hypot(dx,dz)||1,right={x:dz/length,z:-dx/length},segments=mode==='contract'?3:mode==='source'?7:11,seed=Math.sin((edge.start.x+edge.end.z)*1.731+(edge.start.z-edge.end.x)*2.117);
  return Array.from({length:segments+1},(_,index)=>{const t=index/segments,envelope=Math.sin(Math.PI*t),jag=Math.sin(index*2.41+seed*3.7)*.22+Math.sin(index*5.13-seed)*.09,offset=envelope*jag;return{x:edge.start.x+dx*t+right.x*offset,z:edge.start.z+dz*t+right.z*offset};});
}

function makeCircuitNodeVisual(THREE,scene,{position,mode='style'}={}){
  const group=new THREE.Group(),layers=mode==='contract'?1:mode==='source'?2:3;
  const core=addMesh(THREE,group,new THREE.SphereGeometry(.24,12,8),0xffffdf,.96);core.position.y=.28;tag(rememberScale(core,'circuitBaseScale'),'circuitNodeCore');
  for(let index=0;index<layers;index++){const ring=addMesh(THREE,group,new THREE.TorusGeometry(.30+index*.11,.045+index*.008,7,28),index===layers-1?0xffa51f:0xffe45a,.86-index*.12);ring.rotation.x=Math.PI/2;ring.position.y=.09+index*.035;tag(rememberScale(ring,'circuitBaseScale'),'circuitNodeRing',index);}
  if(mode!=='contract')for(let index=0;index<(mode==='style'?8:4);index++){const angle=index*TAU/(mode==='style'?8:4),spark=addMesh(THREE,group,new THREE.ConeGeometry(.04,.30,5),index%2?0xffffd4:0xffc12b,.82);spark.position.set(Math.cos(angle)*.46,.22+(index%3)*.08,Math.sin(angle)*.46);spark.rotation.z=angle;tag(rememberScale(spark,'circuitBaseScale'),'circuitNodeSpark',index);}
  return finishVisual(scene,group,{name:'Wizard Arcana Circuit Line charged node',position,mode});
}

function makeCircuitVisual(THREE,scene,{edge,mode='style'}={}){
  const group=new THREE.Group(),layers=mode==='contract'?1:mode==='source'?2:3,path=sampleCircuitJaggedPath(edge,mode),layerStyles=[
    {color:0xff8a18,width:.24,opacity:.34,y:.16},
    {color:0xffd22f,width:.135,opacity:.78,y:.22},
    {color:0xffffd8,width:.055,opacity:.98,y:.28},
  ];
  for(let layer=0;layer<layers;layer++)for(let index=1;index<path.length;index++){const style=layerStyles[layer],stream=addSegment(THREE,group,path[index-1],path[index],{...style,marker:'circuitStream'});if(stream){stream.userData.circuitLayer=layer;stream.userData.circuitSegment=index;rememberScale(stream,'circuitBaseScale');}}
  group.name='Wizard Arcana Circuit Line connection';group.userData.visualMode=mode;group.renderOrder=8;scene.add(group);return group;
}

function makeWaveGlobeVisual(THREE,scene,{position,direction={x:0,z:1},radius=2.3,mode='style'}={}){
  const colors=PALETTES.Water,group=new THREE.Group(),shells=mode==='contract'?1:mode==='source'?3:5;
  for(let index=0;index<shells;index++){const fraction=shells===1?1:index/(shells-1),shell=addMesh(THREE,group,new THREE.SphereGeometry(radius*(.68+fraction*.36),24,16),index===shells-1?colors.hot:index%2?colors.main:colors.deep,.24+fraction*.16,{wireframe:index===0&&mode==='source',additive:index!==0});shell.position.y=radius*.60;shell.scale.set(1,.86,1.12);tag(rememberScale(shell,'waveBaseScale'),'waveShell',index);}
  const ribs=mode==='contract'?2:mode==='source'?6:10;for(let index=0;index<ribs;index++){const angle=(index/ribs-.5)*Math.PI*.88,rib=addMesh(THREE,group,new THREE.TorusGeometry(radius*(.69+.12*(index%2)),radius*(.035+.008*(index%3)),7,40),index%3?colors.hot:colors.core,.42+(index%2)*.13);rib.position.set(0,radius*.60,(index-ribs/2)*radius*.035);rib.rotation.y=angle;rib.rotation.z=(index%2?1:-1)*.10;tag(rememberScale(rib,'waveBaseScale'),'waveRib',index);}
  const core=addMesh(THREE,group,new THREE.SphereGeometry(radius*.28,14,10),colors.core,.92);core.position.set(0,radius*.63,radius*.30);core.scale.set(1,.78,1.82);tag(rememberScale(core,'waveBaseScale'),'waveCore');
  const wakes=mode==='contract'?1:mode==='source'?3:5;for(let index=0;index<wakes;index++){const wake=addMesh(THREE,group,new THREE.SphereGeometry(radius*(.23-index*.022),12,8),index%2?colors.main:colors.hot,.32+index*.045);wake.position.set((index%2?1:-1)*radius*.12,radius*(.47-index*.035),-radius*(.50+index*.24));wake.scale.set(1.05,.66,1.72);tag(rememberScale(wake,'waveBaseScale'),'waveWake',index);}
  if(mode!=='contract')for(let index=0;index<(mode==='style'?18:9);index++){const angle=index*TAU/(mode==='style'?18:9),drop=addMesh(THREE,group,new THREE.SphereGeometry(radius*(.035+(index%3)*.010),8,5),index%2?colors.hot:colors.core,.76);drop.position.set(Math.cos(angle)*radius*(.88+.08*(index%2)),radius*(.24+.13*(index%4)),Math.sin(angle)*radius*(.88+.08*(index%2)));drop.scale.set(.72,1.35,.72);drop.userData.waveBaseY=drop.position.y;tag(drop,'waveDroplet',index);}
  return finishVisual(scene,group,{name:'Wizard Arcana Wave Front dense ribbed moving globe',position,direction,mode});
}

function makeThunderStrikeVisual(THREE,scene,{position,direction,radius=2.25,mode='style'}={}){
  const colors=PALETTES.Lightning,group=new THREE.Group(),ground=addMesh(THREE,group,new THREE.RingGeometry(radius*.58,radius,40),colors.hot,.68);ground.rotation.x=-Math.PI/2;ground.position.y=.04;tag(ground,'thunderGround');
  const bolts=mode==='contract'?1:mode==='source'?3:6;for(let index=0;index<bolts;index++){const bolt=addMesh(THREE,group,new THREE.SphereGeometry(1,8,6),index===0?colors.core:index%2?colors.hot:colors.main,.94-index*.08);bolt.scale.set(.08+index*.014,1.45+index*.16,.08+index*.014);bolt.position.set((index-2.5)*.12,1.3+index*.04,(index%2?1:-1)*.10);bolt.rotation.z=(index-2.5)*.06;tag(bolt,'thunderBolt',index);}
  if(mode==='style')for(let index=0;index<10;index++){const angle=index*TAU/10,spark=addMesh(THREE,group,new THREE.SphereGeometry(.07,7,5),index%2?colors.core:colors.hot,.84);spark.position.set(Math.cos(angle)*radius*.72,.18+(index%3)*.16,Math.sin(angle)*radius*.72);tag(spark,'thunderSpark',index);}
  return finishVisual(scene,group,{name:'Wizard Arcana Thunder Line broad strike and hot core',position,direction,mode});
}

function fadeVisual(effect,k,spin=0){for(const object of[effect.mesh,...(effect.meshes||[])])object?.traverse?.(child=>{if(child.material)child.material.opacity=(child.userData?.baseOpacity??.72)*Math.pow(1-k,.48);});if(effect.mesh&&spin)effect.mesh.rotation.y+=spin;}

function makeResourceState(){
  const resources={};for(const [id,spec] of Object.entries(WIZARD_NEXT_TWENTY_DASH_SPECS))resources[id]=Number(spec.charges)>0?{kind:'charges',current:spec.charges,max:spec.charges,recharge:spec.recharge,remaining:0}:{kind:'cooldown',remaining:0,duration:Number(spec.cooldown)||0};return resources;
}
function cloneResources(resources){const result={};for(const [id,value] of Object.entries(resources))result[id]={...value};return result;}
function emptyMotionSnapshot(frame,direction){return{phase:'complete',start:{x:frame.x,z:frame.z},previous:{x:frame.x,z:frame.z},current:{x:frame.x,z:frame.z},direction:{...direction},distance:0,blocked:false,complete:true,path:[{x:frame.x,z:frame.z}]};}
function normalizeMotionSnapshot(handle,fallbackFrame,direction){
  const raw=handle?.snapshot?.()||handle||{},start=raw.start||{x:fallbackFrame.x,z:fallbackFrame.z},current=raw.current||raw.position||start,previous=raw.previous||current,path=Array.isArray(raw.path)&&raw.path.length?raw.path:[start,current];
  const end=raw.end||current;return{phase:String(raw.phase||((raw.complete||raw.completed)?'complete':'moving')),start:{x:Number(start.x)||0,z:Number(start.z)||0},previous:{x:Number(previous.x)||0,z:Number(previous.z)||0},current:{x:Number(current.x)||0,z:Number(current.z)||0},end:{x:Number(end.x)||0,z:Number(end.z)||0},direction:{...normalizeDashDirection(raw.resolvedDirection||raw.direction||direction)},elapsed:Number(raw.elapsed)||0,distance:Number.isFinite(Number(raw.distance))?Number(raw.distance):Math.hypot((Number(current.x)||0)-(Number(start.x)||0),(Number(current.z)||0)-(Number(start.z)||0)),blocked:!!raw.blocked,movementComplete:!!(raw.movementComplete||raw.phase==='post'||raw.phase==='complete'||raw.phase==='done'),complete:!!(raw.complete||raw.completed||raw.phase==='complete'||raw.phase==='done'),path:path.map(point=>({x:Number(point.x)||0,z:Number(point.z)||0}))};
}

export function installWizardNextTwentyDashRuntime({
  THREE,scene,getPlayer,getMoveInput=()=>null,getEnemySystem,getMazeSegments=()=>[],startDashMotion,
  teleportPlayer=()=>false,validateTeleportEndpoint=null,setPlayerTargetable=()=>{},setPlayerVisible=()=>{},registerPlayerDamageInterceptor,
  registerDecoy,unregisterDecoy,damagePlayer=()=>false,
}={}){
  const initial=readArcanaTweaks(),inertState={effects:[],elapsed:0,sizeMultiplier:initial.sizeMultiplier,resources:makeResourceState(),semanticEvents:[]};
  const inert={state:inertState,cast(){return false;},canCast(){return false;},update(){},postEnemyUpdate(){},applyPlayerStatus(){return false;},absorbPlayerDamage(amount){return{absorbed:0,remaining:Math.max(0,Number(amount)||0)};},strikeDecoy(){return false;},snapshot(){return{simulationTime:0,lastCast:null,activeDash:null,resources:cloneResources(inertState.resources),effects:[],semanticEvents:[]};},reset(){},dispose(){},get busy(){return false;}};
  if(!THREE||!scene||!isEnemyLabRuntime())return inert;

  const state={effects:[],elapsed:0,sizeMultiplier:initial.sizeMultiplier,lastCast:null,castSerials:new Map(),statusSerials:new Map(),semanticSerial:0,semanticEvents:[],resources:makeResourceState(),activeDash:null,visualMode:'style',circuitNodes:[]};
  const movementLocks=new Map();
  const add=effect=>(state.effects.push(effect),effect);
  function stableId(id){const serial=(state.castSerials.get(id)||0)+1;state.castSerials.set(id,serial);return`${id}:cast:${String(serial).padStart(3,'0')}`;}
  function semantic(kind,detail={}){const entry=Object.freeze({serial:++state.semanticSerial,time:Number(state.elapsed.toFixed(6)),kind,...detail});state.semanticEvents.push(entry);if(state.semanticEvents.length>384)state.semanticEvents.splice(0,state.semanticEvents.length-384);try{window.dispatchEvent(new CustomEvent(WIZARD_NEXT_TWENTY_DASH_SEMANTIC_EVENT,{detail:entry}));}catch{}return entry;}
  function remove(effect){
    if(effect.type==='circuitField')for(const node of effect.nodeEffects||[])if(state.effects.includes(node))remove(node);
    if(effect.type==='circuitNode'){const nodeIndex=state.circuitNodes.indexOf(effect);if(nodeIndex>=0)state.circuitNodes.splice(nodeIndex,1);}
    if(effect.type==='status'&&effect.locked)releaseMovementLock(effect.target,effect.status);
    if(effect.type==='frostDecoy')unregisterDecoy?.(effect.stableId,effect);
    if(effect.mesh)disposeObject(effect.mesh);for(const mesh of effect.meshes||[])disposeObject(mesh);
    const index=state.effects.indexOf(effect);if(index>=0)state.effects.splice(index,1);if(state.activeDash===effect)state.activeDash=null;
  }
  function reset(){for(const effect of[...state.effects])remove(effect);for(const [enemy,entry] of movementLocks)restoreMovementLock(enemy,entry);movementLocks.clear();state.elapsed=0;state.lastCast=null;state.castSerials.clear();state.statusSerials.clear();state.semanticSerial=0;state.semanticEvents.length=0;state.resources=makeResourceState();state.activeDash=null;state.visualMode='style';state.circuitNodes.length=0;setPlayerTargetable?.(true,{source:'wizardArcanaReset'});setPlayerVisible?.(true,{source:'wizardArcanaReset'});}
  function currentSize(){return clampArcanaSize(state.sizeMultiplier);}
  function acquireMovementLock(enemy,kind,duration){
    if(!enemy)return;let entry=movementLocks.get(enemy);if(!entry){entry={count:0,previousMoveSpeedMultiplier:enemy.moveSpeedMultiplier,previousMovementLocked:enemy.movementLocked};movementLocks.set(enemy,entry);}entry.count++;enemy.__wizardArcanaMovementLockCount=entry.count;enemy.movementLocked=true;enemy.moveSpeedMultiplier=0;getEnemySystem?.()?.applyStatus?.(enemy,kind,duration,{movementOnly:true,source:'wizardArcana'});
  }
  function restoreMovementLock(enemy,entry){if(!enemy||!entry)return;if(entry.previousMoveSpeedMultiplier===undefined)delete enemy.moveSpeedMultiplier;else enemy.moveSpeedMultiplier=entry.previousMoveSpeedMultiplier;if(entry.previousMovementLocked===undefined)delete enemy.movementLocked;else enemy.movementLocked=entry.previousMovementLocked;delete enemy.__wizardArcanaMovementLockCount;}
  function releaseMovementLock(enemy){const entry=movementLocks.get(enemy);if(!entry)return;entry.count=Math.max(0,entry.count-1);if(entry.count>0){enemy.__wizardArcanaMovementLockCount=entry.count;return;}restoreMovementLock(enemy,entry);movementLocks.delete(enemy);}
  function addStatus(target,kind,{duration=1,ticks=0,damage=0,interval=.5,hitStun=0,stableId:id='',arcanaId=''}={}){
    const system=getEnemySystem?.();if(!target||Number(target.hp)<=0)return null;const targetStableId=targetId(target,system),lock=kind==='freeze'||kind==='entangle',serialKey=`${id}|${kind}|${targetStableId}`,ordinal=(state.statusSerials.get(serialKey)||0)+1,statusStableId=`${id}:status:${kind}:${targetStableId}:${String(ordinal).padStart(2,'0')}`;state.statusSerials.set(serialKey,ordinal);if(lock)acquireMovementLock(target,kind,duration);if(kind==='shock'&&hitStun>0){target.stunState='wizardShock';target.stunStateRemaining=Math.max(Number(target.stunStateRemaining)||0,hitStun);system?.stunEnemy?.(target,hitStun,{source:'wizardArcana',kind});}
    const effect=add({type:'status',status:kind,arcanaId,stableId:statusStableId,sourceStableId:id,target,targetId:targetStableId,age:0,life:duration,nextTick:interval,ticksRemaining:ticks,tickDamage:damage,interval,locked:lock});semantic('status-applied',{arcanaId,stableId:statusStableId,sourceStableId:id,status:kind,targetId:targetStableId,duration,ticks,damage});return effect;
  }
  function payloadReady(id){const resource=state.resources[id];return resource?.kind==='charges'?resource.current>=1:(resource?.remaining||0)<=0;}
  function consumePayload(id){const resource=state.resources[id];if(!resource)return false;if(resource.kind==='charges'){if(resource.current<1)return false;resource.current--;if(resource.current<resource.max&&resource.remaining<=0)resource.remaining=resource.recharge;return true;}if(resource.remaining>0)return false;resource.remaining=resource.duration;return true;}
  function updateResources(dt){for(const [id,resource] of Object.entries(state.resources)){if(resource.kind==='cooldown'){resource.remaining=Math.max(0,resource.remaining-dt);continue;}if(resource.current>=resource.max){resource.remaining=0;continue;}resource.remaining-=dt;while(resource.remaining<=0&&resource.current<resource.max){resource.current++;semantic('resource-recharged',{arcanaId:id,stableId:`${id}:resource`,charges:resource.current,max:resource.max});resource.remaining=resource.current<resource.max?resource.remaining+resource.recharge:0;}}}
  function directionSelection(detail={}){const frame=playerFrame(getPlayer),candidate=detail.direction||detail.moveInput||getMoveInput?.()||null,x=Number(candidate?.x)||0,z=Number(candidate?.z)||0,held=Math.hypot(x,z)>.20;return{held,direction:held?normalizeDashDirection({x,z},frame.forward):normalizeDashDirection({x:-frame.forward.x,z:-frame.forward.z})};}
  function canCast(id){const clean=String(id?.arcanaId||id||'').replace(/^WOL-/,'');if(!WIZARD_NEXT_TWENTY_DASH_SPECS[clean])return false;if(state.activeDash)return false;if(clean==='CHAOTIC-RIFT'&&!payloadReady(clean))return false;return true;}

  function addImpact(position,element,size=currentSize(),radius=.72,stable='',kind='impact'){
    const mode=currentVisualMode(),mesh=makeBurstVisual(THREE,scene,{name:`Wizard Arcana ${element} ${kind}`,element,position,radius:radius*size,mode});add({type:'transient',arcanaId:'',stableId:stable,semanticKind:kind,age:0,life:.24,mesh,position:{x:position.x,z:position.z},visualMode:mode});
  }
  function wallBlocksSegment(start,end){const distance=Math.hypot(end.x-start.x,end.z-start.z);if(distance<1e-6)return false;for(const wall of getMazeSegments?.()||[]){if(!wall?.a||!wall?.b)continue;const hit=segmentIntersection2D(start,end,wall.a,wall.b);if(hit&&hit.t>1e-5&&hit.t<=1)return true;}return false;}
  function hasSceneryLineOfSight(start,end){return !wallBlocksSegment(start,end);}
  function pathContactVisible(path,target,{origin=null}={}){const closest=closestPointOnPolyline2D(target,path);if(!closest||!hasSceneryLineOfSight(closest,target))return false;for(let index=1;index<=closest.index;index++)if(wallBlocksSegment(path[index-1],path[index]))return false;if(path[closest.index]&&wallBlocksSegment(path[closest.index],closest))return false;return !origin||hasSceneryLineOfSight(origin,target);}
  function clipPointBeforeWall(start,end,clearance=.02){const distance=Math.hypot(end.x-start.x,end.z-start.z);if(distance<1e-6)return{x:start.x,z:start.z,blocked:false};const wall=firstWallHit(start,end);if(!wall)return{x:end.x,z:end.z,blocked:false};const t=Math.max(0,wall.hit.t-Math.max(0,clearance)/distance);return{x:start.x+(end.x-start.x)*t,z:start.z+(end.z-start.z)*t,blocked:true};}
  function clipPathAtScenery(path=[]){if(!path.length)return[];const result=[{x:path[0].x,z:path[0].z}];for(let index=1;index<path.length;index++){const start=result.at(-1),end=path[index],clipped=clipPointBeforeWall(start,end,.02);result.push({x:clipped.x,z:clipped.z});if(clipped.blocked)break;}return result;}
  function moveEnemyClamped(system,enemy,x,z){if(!enemy)return{x:Number(x)||0,z:Number(z)||0,blocked:false};const start={x:Number(enemy.x)||0,z:Number(enemy.z)||0},desired={x:Number(x)||0,z:Number(z)||0},distance=Math.hypot(desired.x-start.x,desired.z-start.z);if(distance<1e-6)return{...start,blocked:false};const clearance=Math.max(.12,enemyRadius(enemy,system)*.72),clipped=clipPointBeforeWall(start,desired,clearance);let resolved={x:clipped.x,z:clipped.z},blocked=clipped.blocked;const walls=getMazeSegments?.()||[],startValid=walls.every(wall=>!wall?.a||!wall?.b||distanceToWall(start,wall)>=clearance);if(startValid&&!walls.every(wall=>!wall?.a||!wall?.b||distanceToWall(resolved,wall)>=clearance)){let low=0,high=Math.hypot(resolved.x-start.x,resolved.z-start.z)/distance;for(let iteration=0;iteration<14;iteration++){const middle=(low+high)/2,candidate={x:start.x+(desired.x-start.x)*middle,z:start.z+(desired.z-start.z)*middle};if(walls.every(wall=>!wall?.a||!wall?.b||distanceToWall(candidate,wall)>=clearance))low=middle;else high=middle;}resolved={x:start.x+(desired.x-start.x)*low,z:start.z+(desired.z-start.z)*low};blocked=true;}moveEnemy(system,enemy,resolved.x,resolved.z);return{...resolved,blocked};}
  function damageCircle(position,radius,amount,{arcanaId,stableId:id,knock=0,options={},once=null,losOrigin=null}={}){
    const system=getEnemySystem?.(),hits=[];for(const enemy of aliveEnemies(system)){if(once?.has(enemy))continue;if(Math.hypot(enemy.x-position.x,enemy.z-position.z)>radius+enemyRadius(enemy,system)||!hasSceneryLineOfSight(position,enemy)||losOrigin&&!hasSceneryLineOfSight(losOrigin,enemy))continue;if(once)once.add(enemy);const direction=normalizeDashDirection({x:enemy.x-position.x,z:enemy.z-position.z});dealDamage(system,enemy,amount,{x:direction.x*knock,z:direction.z*knock},{arcanaId,...options});hits.push(enemy);}
    if(hits.length)semantic('damage',{arcanaId,stableId:id,damage:amount,targetIds:hits.map(enemy=>targetId(enemy,system)),position:{x:position.x,z:position.z}});return hits;
  }
  function damagePath(path,radius,amount,{arcanaId,stableId:id,knock=0,once=null,options={},losOrigin=null}={}){
    const system=getEnemySystem?.(),hits=[];for(const enemy of aliveEnemies(system)){if(once?.has(enemy))continue;if(pointPolylineDistance2D(enemy,path)>radius+enemyRadius(enemy,system)||!pathContactVisible(path,enemy,{origin:losOrigin}))continue;if(once)once.add(enemy);const direction=resolvedRouteDirection(path);dealDamage(system,enemy,amount,{x:direction.x*knock,z:direction.z*knock},{arcanaId,...options});hits.push(enemy);}
    if(hits.length)semantic('damage',{arcanaId,stableId:id,damage:amount,targetIds:hits.map(enemy=>targetId(enemy,system)),pathSamples:path.length});return hits;
  }
  function interceptPath(path,radius,arcanaId,id,{origin=null}={}){const system=getEnemySystem?.();for(const projectile of hostileProjectiles(system)){if(pointPolylineDistance2D(projectile,path)>radius+(Number(projectile.r)||.16)||!pathContactVisible(path,projectile,{origin}))continue;if(destroyProjectile(system,projectile))semantic('projectile-intercepted',{arcanaId,stableId:id,projectileId:String(projectile.id||projectile.kind||'hostile-projectile')});}}
  function firstWallHit(start,end){let best=null;for(const wall of getMazeSegments?.()||[]){if(!wall?.a||!wall?.b)continue;const hit=segmentIntersection2D(start,end,wall.a,wall.b);if(hit&&(!best||hit.t<best.hit.t))best={wall,hit};}return best;}

  function startImmediatePayload(effect){
    const {arcanaId:id,stableId:idStable,origin,direction,visualMode,size}=effect,spec=WIZARD_NEXT_TWENTY_DASH_SPECS[id];
    if(id==='SEARING-RUSH'){const mesh=makeTrailVisual(THREE,scene,{name:'Wizard Arcana Searing Rush flame path',element:'Fire',path:[origin,{x:origin.x+direction.x*.05,z:origin.z+direction.z*.05}],mode:visualMode,width:.46*size});add({type:'searingTrack',arcanaId:id,stableId:`${idStable}:track`,age:0,settled:false,path:[{...origin}],spec,size,mesh,nextTick:0,ticksDone:0});}
    else if(id==='IGNITION-RUSH'){const mesh=makeFieldVisual(THREE,scene,{name:'Wizard Arcana Ignition Rush open flame ring',element:'Fire',position:origin,radius:spec.outerRadius*size,mode:visualMode,hollow:true});add({type:'ignitionRing',arcanaId:id,stableId:`${idStable}:ring`,age:0,life:spec.duration,spec,size,mesh,position:{...origin},previous:{...origin},affected:new Set()});}
    else if(id==='AIR-BURST'){const mesh=makeBurstVisual(THREE,scene,{name:'Wizard Arcana Air Burst curled wake',element:'Air',position:origin,direction,radius:spec.radius*size,mode:visualMode,rearBias:.65}),requestedContact={x:origin.x-direction.x*spec.radius*size*.45,z:origin.z-direction.z*spec.radius*size*.45},clippedContact=clipPointBeforeWall(origin,requestedContact,.02),contact={x:clippedContact.x,z:clippedContact.z},targets=damageCircle(contact,spec.radius*size,spec.damage,{arcanaId:id,stableId:idStable,losOrigin:origin,options:{airBurst:true,rearBiased:true}});add({type:'airBurst',arcanaId:id,stableId:`${idStable}:burst`,age:0,life:spec.carryDuration,spec,size,mesh,targets,previous:{...origin},contact});}
    else if(id==='GUST-BURST'){const mesh=makeBurstVisual(THREE,scene,{name:'Wizard Arcana Gust Burst gather',element:'Air',position:origin,direction,radius:spec.gatherRadius*size,mode:visualMode,rearBias:.2});const targets=damageCircle(origin,spec.gatherRadius*size,spec.gatherDamage,{arcanaId:id,stableId:idStable,options:{gustGather:true}}),system=getEnemySystem?.();for(const enemy of targets)moveEnemyClamped(system,enemy,enemy.x+(origin.x-enemy.x)*.42,enemy.z+(origin.z-enemy.z)*.42);add({type:'transient',arcanaId:id,stableId:`${idStable}:gather`,age:0,life:.28,mesh,position:{...origin},visualMode});}
    else if(id==='RAZOR-BURST'){const mesh=makeFieldVisual(THREE,scene,{name:'Wizard Arcana Razor Burst compact vortex',element:'Air',position:origin,radius:spec.radius*size,mode:visualMode,hollow:true});add({type:'razorVortex',arcanaId:id,stableId:`${idStable}:vortex`,age:0,life:spec.duration,spec,size,mesh,nextTick:0,tickIndex:0});}
    else if(id==='TOXIC-TRAP'){const mesh=makeProjectileVisual(THREE,scene,{name:'Wizard Arcana Toxic Trap seed',element:'Poison',position:origin,direction:{x:-direction.x,z:-direction.z},radius:.28*size,mode:visualMode});add({type:'toxicSeed',arcanaId:id,stableId:`${idStable}:seed`,age:0,life:spec.seedDelay,spec,size,mesh,position:{...origin},visualMode});}
    else if(id==='THUNDER-LINE'){add({type:'thunderDelay',arcanaId:id,stableId:`${idStable}:strike`,age:0,life:spec.delay,spec,size,position:{...origin},direction:{...direction},visualMode});}
    else if(id==='SHOCK-LINE'){const mesh=makeFieldVisual(THREE,scene,{name:'Wizard Arcana Shock Line cross-wire',element:'Lightning',position:origin,radius:spec.halfLength*size,mode:visualMode,wire:true});mesh.rotation.y=Math.atan2(direction.x,direction.z)+Math.PI/2;add({type:'shockWire',arcanaId:id,stableId:`${idStable}:wire`,age:0,life:spec.duration,spec,size,mesh,position:{...origin},direction:{...direction},affected:new Set()});}
    else if(id==='WAVE-FRONT'){const mesh=makeWaveGlobeVisual(THREE,scene,{position:origin,direction,radius:spec.radius*size,mode:visualMode});add({type:'waveGlobe',arcanaId:id,stableId:`${idStable}:globe`,age:0,phase:'attached',spec,size,mesh,position:{...origin},previous:{...origin},direction:{...direction},tickIndex:0,shieldRemaining:spec.shield,carried:new Set(),visualMode});}
    else if(id==='FROST-FEINT'){const mesh=makeDecoyVisual(THREE,scene,{position:origin,mode:visualMode});const decoy=add({type:'frostDecoy',arcanaId:id,stableId:`${idStable}:decoy`,age:0,life:spec.duration,spec,size,mesh,position:{...origin},attacked:false,shattered:false,visualMode});registerDecoy?.({id:decoy.stableId,x:origin.x,z:origin.z,radius:.72*size,onAttack:()=>{decoy.attacked=true;}});}
  }

  function castChaoticRift(card,detail,direction){
    const id='CHAOTIC-RIFT',frame=playerFrame(getPlayer),resolution=resolveChaoticRiftEndpoint({origin:frame,direction,distance:CHAOTIC_RIFT_SPEC.distance,walls:getMazeSegments?.()||[],clearance:CHAOTIC_RIFT_SPEC.clearance});let validation=true;try{if(typeof validateTeleportEndpoint==='function')validation=validateTeleportEndpoint({x:resolution.resolved.x,z:resolution.resolved.z,arcanaId:id});}catch{return false;}const accepted=validation===true||validation===undefined||validation?.ok===true;if(!accepted)return false;const validated=validation&&typeof validation==='object'?(validation.end||validation.endpoint||validation.position||validation.resolved):null,validEndpoint=validated&&Number.isFinite(Number(validated.x))&&Number.isFinite(Number(validated.z)),endpoint=validEndpoint?{x:Number(validated.x),z:Number(validated.z)}:{...resolution.resolved};if(!consumePayload(id))return false;const stable=stableId(id),size=currentSize(),visualMode=currentVisualMode(),entry=makeRiftVisual(THREE,scene,{position:frame,mode:visualMode}),exit=makeRiftVisual(THREE,scene,{position:endpoint,mode:visualMode,exit:true});
    const effect=add({type:'chaoticRift',arcanaId:id,stableId:stable,age:0,life:CHAOTIC_RIFT_SPEC.transitDuration,phase:'transit',spec:CHAOTIC_RIFT_SPEC,size,mesh:entry,meshes:[exit],origin:{x:frame.x,z:frame.z},position:{...endpoint},direction:{...direction},blocked:resolution.blocked||Math.hypot(endpoint.x-resolution.requested.x,endpoint.z-resolution.requested.z)>.01,teleported:false,visualMode});state.activeDash=effect;state.lastCast=id;entry.scale.setScalar(size*1.08);exit.scale.setScalar(size*.34);setPlayerTargetable?.(false,{source:'wizardArcana',arcanaId:id,stableId:stable});setPlayerVisible?.(false,{source:'wizardArcana',arcanaId:id,stableId:stable});semantic('rift-entered',{arcanaId:id,stableId:stable,origin:{x:frame.x,z:frame.z},requested:resolution.requested,endpoint,blocked:effect.blocked,damage:0});return true;
  }

  function cast(card,detail={}){
    const id=String(card?.arcanaId||card?.id||'').replace(/^WOL-/,'');if(!canCast(id))return false;const selection=directionSelection(detail),direction=selection.direction;if(id==='CHAOTIC-RIFT')return castChaoticRift(card,detail,direction);
    const frame=playerFrame(getPlayer),motionOptions={source:'arcana',grantIframes:false,applyDodgeCooldown:false};if(selection.held)motionOptions.direction={...direction};const handle=startDashMotion?.(motionOptions);if(!handle)return false;
    const payloadActive=consumePayload(id),stable=stableId(id),visualMode=currentVisualMode(),snap=normalizeMotionSnapshot(handle,frame,direction),effect=add({type:'dashMotion',arcanaId:id,stableId:stable,age:0,handle,spec:WIZARD_NEXT_TWENTY_DASH_SPECS[id],size:currentSize(),visualMode,payloadActive,origin:{...snap.start},position:{...snap.current},previous:{...snap.previous},direction:{...snap.direction},distance:snap.distance,blocked:snap.blocked,path:snap.path.map(point=>({...point})),complete:false});state.activeDash=effect;state.lastCast=id;state.visualMode=visualMode;
    semantic('dash-started',{arcanaId:id,stableId:stable,payloadActive,source:'arcana',grantIframes:false,applyDodgeCooldown:false,origin:{...effect.origin},direction:{...effect.direction},resource:{...state.resources[id]},visualMode});if(payloadActive)startImmediatePayload(effect);else semantic('payload-suppressed',{arcanaId:id,stableId:stable,reason:'resource-cooldown'});return true;
  }

  function spawnCarrier({arcanaId,stable,element,position,direction,spec,lane=0,shape='orb',semanticKind='projectile'}){
    const size=currentSize(),visualMode=currentVisualMode(),mesh=makeProjectileVisual(THREE,scene,{name:`Wizard Arcana ${arcanaId} ${semanticKind}`,element,position,direction,radius:spec.radius*size,mode:visualMode,shape});
    return add({type:'dashProjectile',arcanaId,stableId:stable,semanticKind,age:0,position:{...position},previous:{...position},origin:{...position},direction:{...direction},velocity:{x:direction.x*spec.speed,z:direction.z*spec.speed},distance:0,spec,size,lane,shape,mesh,visualMode});
  }
  function spawnFlareRush(effect){const spec=FLARE_RUSH_SPEC,volley=sampleRearVolley({origin:effect.origin,direction:effect.direction,count:spec.count,laneSpacing:spec.laneSpacing*effect.size});for(const item of volley)spawnCarrier({arcanaId:effect.arcanaId,stable:`${effect.stableId}:flare:${String(item.index+1).padStart(2,'0')}`,element:'Fire',position:item.position,direction:item.direction,spec,lane:item.index,shape:'orb',semanticKind:'rear-fireball'});semantic('payload-emitted',{arcanaId:effect.arcanaId,stableId:effect.stableId,count:spec.count,origin:{...effect.origin},direction:{...effect.direction},parallel:true});}
  function spawnSnareTrack(effect){const spec=SNARE_TRACK_SPEC,back={x:-effect.direction.x,z:-effect.direction.z};for(let index=0;index<spec.count;index++){const direction=normalizeDashDirection({x:back.x*Math.cos(spec.laneAngles[index])-back.z*Math.sin(spec.laneAngles[index]),z:back.x*Math.sin(spec.laneAngles[index])+back.z*Math.cos(spec.laneAngles[index])}),position={...effect.origin};spawnCarrier({arcanaId:effect.arcanaId,stable:`${effect.stableId}:vine:${String(index+1).padStart(2,'0')}`,element:'Vine',position,direction,spec,lane:index,shape:'vine',semanticKind:'rear-vine'});}semantic('payload-emitted',{arcanaId:effect.arcanaId,stableId:effect.stableId,count:spec.count,rearMoving:true});}
  function spawnFrostWing(effect){const spec=FROST_WING_SPEC,back={x:-effect.direction.x,z:-effect.direction.z};for(let index=0;index<spec.count;index++){const angle=spec.angles[index],direction=normalizeDashDirection({x:back.x*Math.cos(angle)-back.z*Math.sin(angle),z:back.x*Math.sin(angle)+back.z*Math.cos(angle)});spawnCarrier({arcanaId:effect.arcanaId,stable:`${effect.stableId}:feather:${String(index+1).padStart(2,'0')}`,element:'Ice',position:{...effect.position},direction,spec,lane:index,shape:'feather',semanticKind:'frost-feather'});}addImpact(effect.position,'Ice',effect.size,1.4,effect.stableId,'wing-flash');semantic('payload-emitted',{arcanaId:effect.arcanaId,stableId:effect.stableId,count:spec.count,centerGap:true,direction:{x:-effect.direction.x,z:-effect.direction.z}});}
  function spawnSpikeTrack(effect){const spec=SPIKE_TRACK_SPEC,path=sampleDashTrack(clipPathAtScenery(effect.path),spec.spikeSpacing*effect.size),mesh=makeTrailVisual(THREE,scene,{name:'Wizard Arcana Spike Track sequential eruptions',element:'Earth',path,mode:effect.visualMode,width:.56*effect.size,spikes:true});add({type:'spikeTrack',arcanaId:effect.arcanaId,stableId:`${effect.stableId}:track`,age:0,spec,size:effect.size,mesh,path:path.map(point=>({...point})),nextSpike:0,hit:new Set(),visualMode:effect.visualMode});semantic('payload-emitted',{arcanaId:effect.arcanaId,stableId:effect.stableId,spikeCount:path.length,pathSamples:effect.path.length});}
  function finishGustBurst(effect){const spec=GUST_BURST_SPEC,path=clipPathAtScenery(effect.path.length>1?effect.path:[effect.origin,effect.position]),mesh=makeTrailVisual(THREE,scene,{name:'Wizard Arcana Gust Burst transporting draught',element:'Air',path,mode:effect.visualMode,width:spec.pathRadius*effect.size});const hits=damagePath(path,spec.pathRadius*effect.size,spec.draughtDamage,{arcanaId:effect.arcanaId,stableId:effect.stableId,options:{gustDraught:true}}),endpoint=path.at(-1)||effect.position,system=getEnemySystem?.();for(const enemy of hits)moveEnemyClamped(system,enemy,enemy.x+(endpoint.x-enemy.x)*spec.transportFraction,enemy.z+(endpoint.z-enemy.z)*spec.transportFraction);add({type:'transient',arcanaId:effect.arcanaId,stableId:`${effect.stableId}:draught`,age:0,life:.42,mesh,position:{...endpoint},visualMode:effect.visualMode});semantic('transport',{arcanaId:effect.arcanaId,stableId:effect.stableId,targetIds:hits.map(enemy=>targetId(enemy,system)),endpoint:{...endpoint}});}
  function depositCircuit(effect){
    const spec=CIRCUIT_LINE_SPEC,start={...effect.origin},end={...effect.position},serial=Math.floor(state.circuitNodes.length/2)+1;
    for(const pending of state.effects.filter(value=>value.type==='circuitDelay'))remove(pending);
    for(const [role,position] of [['start',start],['end',end]]){const stableId=`${effect.stableId}:${role}`,mesh=makeCircuitNodeVisual(THREE,scene,{position,mode:effect.visualMode}),node=add({type:'circuitNode',arcanaId:effect.arcanaId,stableId,semanticKind:'charged-node',age:0,phase:'charging',size:effect.size,x:position.x,z:position.z,position:{...position},cast:serial,mesh,visualMode:effect.visualMode});state.circuitNodes.push(node);}
    while(state.circuitNodes.length>8)remove(state.circuitNodes[0]);
    add({type:'circuitDelay',arcanaId:effect.arcanaId,stableId:`${effect.stableId}:circuit`,age:0,life:spec.activationDelay,spec,size:effect.size,visualMode:effect.visualMode});semantic('circuit-nodes-deposited',{arcanaId:effect.arcanaId,stableId:effect.stableId,start,end,nodeCount:state.circuitNodes.length});
  }

  function finalizePayload(effect){
    if(!effect.payloadActive||effect.payloadFinalized)return;effect.payloadFinalized=true;const id=effect.arcanaId;
    if(id==='SEARING-RUSH'){const track=state.effects.find(value=>value.type==='searingTrack'&&value.stableId===`${effect.stableId}:track`);if(track){track.path=clipPathAtScenery(effect.path);track.settled=true;track.age=0;disposeObject(track.mesh);track.mesh=makeTrailVisual(THREE,scene,{name:'Wizard Arcana Searing Rush flame path',element:'Fire',path:track.path,mode:effect.visualMode,width:effect.spec.trackRadius*effect.size});}}
    else if(id==='FLARE-RUSH')spawnFlareRush(effect);
    else if(id==='GUST-BURST')finishGustBurst(effect);
    else if(id==='SPIKE-TRACK')spawnSpikeTrack(effect);
    else if(id==='SNARE-TRACK')spawnSnareTrack(effect);
    else if(id==='CIRCUIT-LINE')depositCircuit(effect);
    else if(id==='WAVE-FRONT'){const globe=state.effects.find(value=>value.type==='waveGlobe'&&value.stableId===`${effect.stableId}:globe`);if(globe){globe.phase='detached';globe.phaseAge=0;globe.position={...effect.position};globe.previous={...effect.position};globe.direction={...effect.direction};}}
    else if(id==='FROST-WING')spawnFrostWing(effect);
    semantic('payload-finalized',{arcanaId:id,stableId:effect.stableId,endpoint:{...effect.position},distance:effect.distance,blocked:effect.blocked,pathSamples:effect.path.length});
  }

  function updateDashMotion(effect,dt){
    effect.age+=dt;const frame=playerFrame(getPlayer),snap=normalizeMotionSnapshot(effect.handle,frame,effect.direction);effect.previous={...effect.position};effect.position={...(snap.movementComplete?snap.end:snap.current)};effect.direction={...snap.direction};effect.distance=snap.distance;effect.blocked=snap.blocked;if(snap.path.length>=effect.path.length)effect.path=snap.path.map(point=>({...point}));if(snap.movementComplete)effect.direction={...resolvedRouteDirection(effect.path,snap.direction)};
    if(effect.payloadActive){
      const searing=state.effects.find(value=>value.type==='searingTrack'&&value.stableId===`${effect.stableId}:track`);if(searing&&!searing.settled&&effect.path.length>searing.path.length){searing.path=effect.path.map(point=>({...point}));disposeObject(searing.mesh);searing.mesh=makeTrailVisual(THREE,scene,{name:'Wizard Arcana Searing Rush flame path',element:'Fire',path:searing.path,mode:effect.visualMode,width:effect.spec.trackRadius*effect.size});}
      for(const attached of state.effects.filter(value=>(value.type==='ignitionRing'||value.type==='waveGlobe')&&value.stableId.startsWith(effect.stableId))){attached.previous={...attached.position};attached.position={...effect.position};attached.mesh.position.set(effect.position.x,0,effect.position.z);}
      if(snap.movementComplete)for(const directional of state.effects.filter(value=>(value.type==='thunderDelay'||value.type==='shockWire'||value.type==='waveGlobe')&&value.stableId.startsWith(effect.stableId))){directional.direction={...effect.direction};if(directional.type==='shockWire')directional.mesh.rotation.y=Math.atan2(effect.direction.x,effect.direction.z)+Math.PI/2;else if(directional.type==='waveGlobe')directional.mesh.rotation.y=Math.atan2(effect.direction.x,effect.direction.z);}
      const air=state.effects.find(value=>value.type==='airBurst'&&value.stableId.startsWith(effect.stableId));if(air){const dx=effect.position.x-air.previous.x,dz=effect.position.z-air.previous.z,system=getEnemySystem?.();for(const enemy of air.targets||[])if(enemy.hp>0)moveEnemyClamped(system,enemy,enemy.x+dx,enemy.z+dz);air.previous={...effect.position};}
    }
    if(snap.movementComplete&&!effect.payloadFinalized)finalizePayload(effect);
    if(snap.complete){if(!effect.payloadFinalized)finalizePayload(effect);semantic('dash-complete',{arcanaId:effect.arcanaId,stableId:effect.stableId,distance:effect.distance,blocked:effect.blocked,endpoint:{...effect.position},path:effect.path.map(point=>({...point}))});remove(effect);}
  }

  function updateStatus(effect,dt){
    effect.age+=dt;const system=getEnemySystem?.();if(!effect.target||Number(effect.target.hp)<=0||!system?.enemies?.includes?.(effect.target)){remove(effect);return;}
    while(effect.ticksRemaining>0&&effect.age+1e-9>=effect.nextTick){dealDamage(system,effect.target,effect.tickDamage,{x:0,z:0},{arcanaId:effect.arcanaId,status:effect.status,damageOverTime:true,hitReaction:false,power:.10,pop:0});semantic('status-tick',{arcanaId:effect.arcanaId,stableId:effect.stableId,status:effect.status,targetId:effect.targetId,damage:effect.tickDamage,tick:Number((effect.age/effect.interval).toFixed(0))});effect.ticksRemaining--;effect.nextTick+=effect.interval;}
    if(effect.age>=effect.life||effect.ticksRemaining<=0&&!effect.locked&&effect.age>=effect.nextTick-effect.interval)remove(effect);
  }
  function updateSearingTrack(effect,dt){
    if(!effect.path.length)return;interceptPath(effect.path,effect.spec.trackRadius*effect.size,effect.arcanaId,effect.stableId);if(!effect.settled)return;effect.age+=dt;
    while(effect.ticksDone<effect.spec.burnTicks&&effect.age+1e-9>=effect.nextTick){damagePath(effect.path,effect.spec.trackRadius*effect.size,effect.spec.burnDamage,{arcanaId:effect.arcanaId,stableId:effect.stableId,options:{searingRush:true,burn:true,tick:effect.ticksDone+1,hitReaction:false}});effect.ticksDone++;effect.nextTick+=effect.spec.burnInterval;}
    const k=clamp(effect.age/effect.spec.trackLife,0,1);fadeVisual(effect,k);if(effect.age>=effect.spec.trackLife)remove(effect);
  }
  function updateIgnitionRing(effect,dt,now){
    effect.age+=dt;const frame=playerFrame(getPlayer);effect.previous={...effect.position};effect.position={x:frame.x,z:frame.z};effect.mesh.position.set(frame.x,0,frame.z);const system=getEnemySystem?.(),position=effect.position;for(const enemy of aliveEnemies(system)){if(effect.affected.has(enemy))continue;const distance=Math.hypot(enemy.x-position.x,enemy.z-position.z);if(distance<effect.spec.innerRadius*effect.size-enemyRadius(enemy,system)||distance>effect.spec.outerRadius*effect.size+enemyRadius(enemy,system)||!hasSceneryLineOfSight(position,enemy))continue;effect.affected.add(enemy);const direction=normalizeDashDirection({x:enemy.x-position.x,z:enemy.z-position.z});moveEnemyClamped(system,enemy,enemy.x+direction.x*effect.spec.outwardNudge,enemy.z+direction.z*effect.spec.outwardNudge);addStatus(enemy,'burn',{duration:effect.spec.burnInterval*effect.spec.burnTicks+.05,ticks:effect.spec.burnTicks,damage:effect.spec.burnDamage,interval:effect.spec.burnInterval,stableId:effect.stableId,arcanaId:effect.arcanaId});}
    effect.mesh.rotation.y+=dt*2.2;effect.mesh.children.forEach((child,index)=>{if(child.userData?.orbitNode!==undefined){const pulse=.82+.22*Math.sin(now*10+index);child.scale.setScalar(pulse);}});if(effect.age>=effect.life)remove(effect);
  }
  function updateAirBurst(effect,dt){effect.age+=dt;const k=clamp(effect.age/effect.life,0,1);fadeVisual(effect,k,dt*4);if(k>=1)remove(effect);}
  function updateRazorVortex(effect,dt){
    effect.age+=dt;const system=getEnemySystem?.(),position={x:effect.mesh.position.x,z:effect.mesh.position.z};while(effect.tickIndex<effect.spec.tickTimes.length&&effect.age+1e-9>=effect.spec.tickTimes[effect.tickIndex]){const hits=damageCircle(position,effect.spec.radius*effect.size,effect.spec.tickDamage,{arcanaId:effect.arcanaId,stableId:effect.stableId,options:{razorBurst:true,tick:effect.tickIndex+1}});for(const enemy of hits){moveEnemyClamped(system,enemy,enemy.x+(position.x-enemy.x)*effect.spec.pull,enemy.z+(position.z-enemy.z)*effect.spec.pull);enemy.wizardSlowRemaining=Math.max(Number(enemy.wizardSlowRemaining)||0,effect.spec.slowDuration);}effect.tickIndex++;}
    effect.mesh.rotation.y+=dt*7;effect.mesh.children.forEach((child,index)=>{if(child.userData?.fieldRing!==undefined)child.rotation.z+=(index%2?1:-1)*dt*3;});if(effect.age>=effect.life)remove(effect);
  }
  function updateToxicSeed(effect,dt){effect.age+=dt;effect.mesh.position.y=.18+Math.sin(effect.age*18)*.10;if(effect.age<effect.life)return;const mesh=makeFieldVisual(THREE,scene,{name:'Wizard Arcana Toxic Trap poison puddle',element:'Poison',position:effect.position,radius:effect.spec.radius*effect.size,mode:effect.visualMode,hollow:false});add({type:'toxicPuddle',arcanaId:effect.arcanaId,stableId:`${effect.stableId}:puddle`,age:0,life:effect.spec.duration,spec:effect.spec,size:effect.size,mesh,position:{...effect.position},affected:new Set(),visualMode:effect.visualMode});semantic('puddle-opened',{arcanaId:effect.arcanaId,stableId:effect.stableId,position:{...effect.position},directDamage:0});remove(effect);}
  function updateToxicPuddle(effect,dt,now){effect.age+=dt;const system=getEnemySystem?.();for(const enemy of aliveEnemies(system)){if(effect.affected.has(enemy))continue;if(Math.hypot(enemy.x-effect.position.x,enemy.z-effect.position.z)>effect.spec.radius*effect.size+enemyRadius(enemy,system)||!hasSceneryLineOfSight(effect.position,enemy))continue;effect.affected.add(enemy);addStatus(enemy,'poison',{duration:effect.spec.poisonInterval*effect.spec.poisonTicks+.05,ticks:effect.spec.poisonTicks,damage:effect.spec.poisonDamage,interval:effect.spec.poisonInterval,stableId:effect.stableId,arcanaId:effect.arcanaId});}effect.mesh.rotation.y+=dt*.9;effect.mesh.children.forEach((child,index)=>{if(child.userData?.orbitNode!==undefined)child.position.y=.12+.08*Math.sin(now*5+index);});if(effect.age>=effect.life)remove(effect);}
  function updateThunderDelay(effect,dt){
    effect.age+=dt;if(effect.age<effect.life)return;const system=getEnemySystem?.(),position=effect.position,spec=effect.spec,mesh=makeThunderStrikeVisual(THREE,scene,{position,direction:effect.direction,radius:spec.broadRadius*effect.size,mode:effect.visualMode});const broad=damageCircle(position,spec.broadRadius*effect.size,spec.broadDamage,{arcanaId:effect.arcanaId,stableId:effect.stableId,options:{thunderLine:true,broad:true}});for(const enemy of broad)addStatus(enemy,'shock',{duration:spec.shockInterval*spec.shockTicks+.05,ticks:spec.shockTicks,damage:spec.shockDamage,interval:spec.shockInterval,stableId:effect.stableId,arcanaId:effect.arcanaId});const half=spec.coreLength*.5*effect.size,rawA={x:position.x-effect.direction.x*half,z:position.z-effect.direction.z*half},rawB={x:position.x+effect.direction.x*half,z:position.z+effect.direction.z*half},clippedA=clipPointBeforeWall(position,rawA),clippedB=clipPointBeforeWall(position,rawB),a={x:clippedA.x,z:clippedA.z},b={x:clippedB.x,z:clippedB.z},core=[];for(const enemy of aliveEnemies(system)){if(pointSegmentDistance2D(enemy,a,b)>spec.coreHalfWidth*effect.size+enemyRadius(enemy,system)||!hasSceneryLineOfSight(position,enemy))continue;dealDamage(system,enemy,spec.coreDamage,{x:0,z:0},{arcanaId:effect.arcanaId,thunderLine:true,core:true});core.push(targetId(enemy,system));}add({type:'transient',arcanaId:effect.arcanaId,stableId:`${effect.stableId}:visual`,age:0,life:.34,mesh,position:{...position},visualMode:effect.visualMode});semantic('thunder-strike',{arcanaId:effect.arcanaId,stableId:effect.stableId,broadTargetIds:broad.map(enemy=>targetId(enemy,system)),coreTargetIds:core,broadDamage:spec.broadDamage,coreDamage:spec.coreDamage});remove(effect);
  }
  function updateShockWire(effect,dt){
    effect.age+=dt;const system=getEnemySystem?.(),right={x:effect.direction.z,z:-effect.direction.x},rawA={x:effect.position.x-right.x*effect.spec.halfLength*effect.size,z:effect.position.z-right.z*effect.spec.halfLength*effect.size},rawB={x:effect.position.x+right.x*effect.spec.halfLength*effect.size,z:effect.position.z+right.z*effect.spec.halfLength*effect.size},clippedA=clipPointBeforeWall(effect.position,rawA),clippedB=clipPointBeforeWall(effect.position,rawB),a={x:clippedA.x,z:clippedA.z},b={x:clippedB.x,z:clippedB.z};for(const enemy of aliveEnemies(system)){if(effect.affected.has(enemy)||pointSegmentDistance2D(enemy,a,b)>effect.spec.radius*effect.size+enemyRadius(enemy,system)||!hasSceneryLineOfSight(effect.position,enemy))continue;effect.affected.add(enemy);addStatus(enemy,'shock',{duration:effect.spec.shockInterval*effect.spec.shockTicks+.05,ticks:effect.spec.shockTicks,damage:effect.spec.shockDamage,interval:effect.spec.shockInterval,hitStun:effect.spec.hitStun,stableId:effect.stableId,arcanaId:effect.arcanaId});}interceptPath([a,b],effect.spec.radius*effect.size,effect.arcanaId,effect.stableId,{origin:effect.position});effect.mesh.children.forEach((child,index)=>{if(child.userData?.wireCore)child.scale.y=.055*(.82+.24*Math.sin(effect.age*27+index));});if(effect.age>=effect.life)remove(effect);
  }
  function updateWaveGlobe(effect,dt){
    effect.age+=dt;const system=getEnemySystem?.();let wall=null;if(effect.phase==='detached'){effect.phaseAge=(effect.phaseAge||0)+dt;effect.previous={...effect.position};const requested={x:effect.position.x+effect.direction.x*effect.spec.detachedSpeed*dt,z:effect.position.z+effect.direction.z*effect.spec.detachedSpeed*dt};wall=firstWallHit(effect.previous,requested);const clipped=wall?clipPointBeforeWall(effect.previous,requested,.01):requested;effect.position={x:clipped.x,z:clipped.z};effect.mesh.position.set(effect.position.x,0,effect.position.z);}
    while(effect.tickIndex<effect.spec.tickTimes.length&&effect.age+1e-9>=effect.spec.tickTimes[effect.tickIndex]){const hits=damageCircle(effect.position,effect.spec.radius*effect.size,effect.spec.tickDamage,{arcanaId:effect.arcanaId,stableId:effect.stableId,options:{waveFront:true,tick:effect.tickIndex+1}});for(const enemy of hits)effect.carried.add(enemy);effect.tickIndex++;}
    const dx=effect.position.x-effect.previous.x,dz=effect.position.z-effect.previous.z;for(const enemy of [...effect.carried]){if(Number(enemy.hp)<=0){effect.carried.delete(enemy);continue;}moveEnemyClamped(system,enemy,enemy.x+dx*effect.spec.carryFraction,enemy.z+dz*effect.spec.carryFraction);}effect.previous={...effect.position};if(wall){semantic('wave-fizzle',{arcanaId:effect.arcanaId,stableId:effect.stableId,reason:'wall',position:{...effect.position}});remove(effect);return;}effect.mesh.rotation.y=Math.atan2(effect.direction.x,effect.direction.z);const phaseTime=effect.phase==='detached'?(effect.phaseAge||0):effect.age;effect.mesh.children.forEach((child,index)=>{if(child.userData?.waveRib!==undefined){child.rotation.z+=(index%2?1:-1)*dt*(1.8+index*.06);const base=child.userData.waveBaseScale,pulse=.92+.12*Math.sin(phaseTime*15+index*.71);child.scale.set(base.x*pulse,base.y*pulse,base.z);}else if(child.userData?.waveShell!==undefined){const base=child.userData.waveBaseScale,pulse=1+.035*Math.sin(phaseTime*12+index);child.scale.set(base.x*pulse,base.y*(1+.05*Math.sin(phaseTime*10+index)),base.z*(effect.phase==='detached'?1.12:1)*pulse);}else if(child.userData?.waveWake!==undefined){const base=child.userData.waveBaseScale,pulse=effect.phase==='detached'?1.18+.10*Math.sin(phaseTime*18+index):.82;child.scale.set(base.x*pulse,base.y*pulse,base.z*pulse);}else if(child.userData?.waveDroplet!==undefined)child.position.y=child.userData.waveBaseY+Math.sin(phaseTime*9+index)*effect.size*.10;});if(effect.phase==='detached'&&effect.phaseAge>=effect.spec.detachedDuration)remove(effect);
  }
  function shatterDecoy(effect,reason='enemy-attack'){
    if(!effect||effect.shattered)return false;effect.shattered=true;const hits=damageCircle(effect.position,effect.spec.shatterRadius*effect.size,effect.spec.shatterDamage,{arcanaId:effect.arcanaId,stableId:effect.stableId,options:{frostFeint:true,shatter:true}});for(const enemy of hits)addStatus(enemy,'freeze',{duration:effect.spec.freezeDuration,stableId:effect.stableId,arcanaId:effect.arcanaId});addImpact(effect.position,'Ice',effect.size,1.8,effect.stableId,'decoy-shatter');semantic('decoy-shattered',{arcanaId:effect.arcanaId,stableId:effect.stableId,reason,damage:effect.spec.shatterDamage,targetIds:hits.map(enemy=>targetId(enemy,getEnemySystem?.()))});remove(effect);return true;
  }
  function strikeDecoy(stable=null){const effect=state.effects.find(value=>value.type==='frostDecoy'&&(!stable||value.stableId===stable||value.stableId.startsWith(stable)));if(!effect)return false;effect.attacked=true;return shatterDecoy(effect,'enemy-attack');}
  function updateFrostDecoy(effect,dt,now){effect.age+=dt;if(effect.attacked){shatterDecoy(effect,'enemy-attack');return;}effect.mesh.children.forEach((child,index)=>{if(child.userData?.decoyShard!==undefined)child.rotation.y+=dt*(1.5+index*.12);else if(child.userData?.decoyBody)child.material.opacity=(child.userData.baseOpacity??.66)*(.88+.12*Math.sin(now*7));});if(effect.age>=effect.life){semantic('decoy-expired',{arcanaId:effect.arcanaId,stableId:effect.stableId,damage:0});remove(effect);}}
  function updateSpikeTrack(effect,dt){effect.age+=dt;const targetCount=effect.path.length;while(effect.nextSpike<targetCount&&effect.age+1e-9>=effect.nextSpike*effect.spec.eruptionInterval){const index=effect.nextSpike++,position=effect.path[index];damageCircle(position,effect.spec.pathRadius*effect.size,effect.spec.damage,{arcanaId:effect.arcanaId,stableId:effect.stableId,knock:effect.spec.knockback,once:effect.hit,options:{spikeTrack:true,sharedHitLedger:true}});semantic('spike-erupted',{arcanaId:effect.arcanaId,stableId:effect.stableId,index,position:{...position}});}const life=Math.max(.35,targetCount*effect.spec.eruptionInterval+.38),k=clamp(effect.age/life,0,1);if(effect.age>targetCount*effect.spec.eruptionInterval)fadeVisual(effect,(effect.age-targetCount*effect.spec.eruptionInterval)/.38);if(k>=1)remove(effect);}
  function updateCircuitNode(effect,dt){effect.age+=dt;effect.mesh.rotation.y+=(effect.phase==='active'?2.8:1.35)*dt;effect.mesh.children.forEach((child,index)=>{const base=child.userData?.circuitBaseScale;if(!base)return;const pulse=(effect.phase==='active'?1.04:.94)+Math.sin(effect.age*(effect.phase==='active'?18:9)+index*.83)*(effect.phase==='active'?.18:.09);child.scale.set(base.x*pulse,base.y*pulse,base.z*pulse);});}
  function updateCircuitDelay(effect,dt){effect.age+=dt;if(effect.age<effect.life)return;for(const existing of state.effects.filter(value=>value.type==='circuitField'))remove(existing);const nodeEffects=[...state.circuitNodes],edges=sampleCircuitConnections(nodeEffects,effect.spec.nodeLinkRange*effect.size).filter(edge=>hasSceneryLineOfSight(edge.start,edge.end)),meshes=edges.map(edge=>makeCircuitVisual(THREE,scene,{edge,mode:effect.visualMode})),ticks=edges.length?effect.spec.baseTicks+Math.max(0,edges.length-1)*2:0;for(const node of nodeEffects)node.phase='active';add({type:'circuitField',arcanaId:effect.arcanaId,stableId:effect.stableId,age:0,life:effect.spec.fieldLife,spec:effect.spec,size:effect.size,edges:[...edges],nodeEffects,mesh:meshes.shift()||null,meshes,nextTick:0,ticksRemaining:ticks,tickSerial:0,visualMode:effect.visualMode});semantic('circuit-activated',{arcanaId:effect.arcanaId,stableId:effect.stableId,nodeCount:nodeEffects.length,edgeCount:edges.length,ticks});remove(effect);}
  function updateCircuitField(effect,dt){effect.age+=dt;while(effect.ticksRemaining>0&&effect.age+1e-9>=effect.nextTick){effect.tickSerial++;const system=getEnemySystem?.(),hit=[];for(const enemy of aliveEnemies(system)){if(!effect.edges.some(edge=>pointSegmentDistance2D(enemy,edge.start,edge.end)<=effect.spec.streamRadius*effect.size+enemyRadius(enemy,system)&&pathContactVisible([edge.start,edge.end],enemy)))continue;dealDamage(system,enemy,effect.spec.tickDamage,{x:0,z:0},{arcanaId:effect.arcanaId,circuitLine:true,tick:effect.tickSerial});hit.push(targetId(enemy,system));}for(const node of effect.nodeEffects||[])addImpact(node.position,'Lightning',effect.size,.48,effect.stableId,'circuit-tick-bloom');semantic('circuit-tick',{arcanaId:effect.arcanaId,stableId:effect.stableId,tick:effect.tickSerial,damage:effect.spec.tickDamage,targetIds:hit});effect.ticksRemaining--;effect.nextTick+=effect.spec.tickInterval;}for(const mesh of[effect.mesh,...effect.meshes])if(mesh)mesh.children.forEach((child,index)=>{if(!child.userData?.circuitStream)return;const base=child.userData.circuitBaseScale,pulse=.94+.14*Math.sin(effect.age*22+index*.61);child.scale.set(base.x*pulse,base.y*pulse,base.z);});if(effect.age>=effect.life||effect.ticksRemaining<=0&&effect.age>=effect.nextTick-effect.spec.tickInterval+.12)remove(effect);}
  function updateProjectile(effect,dt,now){
    effect.age+=dt;const start={...effect.position},requestedEnd={x:start.x+effect.velocity.x*dt,z:start.z+effect.velocity.z*dt},wall=firstWallHit(start,requestedEnd),clipped=wall?clipPointBeforeWall(start,requestedEnd,.01):{x:requestedEnd.x,z:requestedEnd.z},end={x:clipped.x,z:clipped.z};effect.previous=start;effect.position=end;effect.distance+=Math.hypot(end.x-start.x,end.z-start.z);effect.mesh.position.set(end.x,.42+Math.sin(now*15+effect.lane)*.06,end.z);effect.mesh.rotation.y=Math.atan2(effect.direction.x,effect.direction.z);
    const system=getEnemySystem?.();if(effect.spec.destroysProjectiles)for(const projectile of hostileProjectiles(system)){if(pointSegmentDistance2D(projectile,start,end)>effect.spec.radius*effect.size+(Number(projectile.r)||.16)||!pathContactVisible([start,end],projectile,{origin:start}))continue;if(destroyProjectile(system,projectile))semantic('projectile-intercepted',{arcanaId:effect.arcanaId,stableId:effect.stableId,projectileId:String(projectile.id||projectile.kind||'hostile-projectile')});remove(effect);return;}
    for(const enemy of aliveEnemies(system)){if(pointSegmentDistance2D(enemy,start,end)>effect.spec.radius*effect.size+enemyRadius(enemy,system)||!pathContactVisible([start,end],enemy,{origin:start}))continue;let knock=0;if(effect.arcanaId==='FLARE-RUSH'){dealDamage(system,enemy,effect.spec.damage,{x:effect.direction.x*.8,z:effect.direction.z*.8},{arcanaId:effect.arcanaId,flareRush:true});addStatus(enemy,'burn',{duration:effect.spec.burnInterval*effect.spec.burnTicks+.05,ticks:effect.spec.burnTicks,damage:effect.spec.burnDamage,interval:effect.spec.burnInterval,stableId:effect.stableId,arcanaId:effect.arcanaId});}
      else if(effect.arcanaId==='SNARE-TRACK'){dealDamage(system,enemy,effect.spec.damage,{x:0,z:0},{arcanaId:effect.arcanaId,snareTrack:true,movementOnly:true,hitReaction:false,noHitStun:true,noAttackCancel:true});addStatus(enemy,'entangle',{duration:effect.spec.entangleDuration,stableId:effect.stableId,arcanaId:effect.arcanaId});}
      else if(effect.arcanaId==='FROST-WING'){knock=effect.spec.knockback;dealDamage(system,enemy,effect.spec.damage,{x:effect.direction.x*knock,z:effect.direction.z*knock},{arcanaId:effect.arcanaId,frostWing:true});addStatus(enemy,'freeze',{duration:effect.spec.freezeDuration,stableId:effect.stableId,arcanaId:effect.arcanaId});}
      addImpact({x:enemy.x,z:enemy.z},WIZARD_NEXT_TWENTY_DASH_SPECS[effect.arcanaId].element,effect.size,.62,effect.stableId,'contact');semantic('projectile-hit',{arcanaId:effect.arcanaId,stableId:effect.stableId,targetId:targetId(enemy,system),damage:effect.spec.damage,nonpiercing:true});remove(effect);return;}
    if(wall){semantic('projectile-fizzle',{arcanaId:effect.arcanaId,stableId:effect.stableId,reason:'wall',position:{x:wall.hit.x,z:wall.hit.z}});addImpact({x:wall.hit.x,z:wall.hit.z},effect.spec.element||WIZARD_NEXT_TWENTY_DASH_SPECS[effect.arcanaId].element,effect.size,.42,effect.stableId,'wall-fizzle');remove(effect);return;}
    if(effect.distance>=effect.spec.range*effect.size){semantic('projectile-expired',{arcanaId:effect.arcanaId,stableId:effect.stableId,distance:effect.distance});remove(effect);}
  }
  function updateTransient(effect,dt){effect.age+=dt;const k=clamp(effect.age/effect.life,0,1);fadeVisual(effect,k,dt*2.8);if(k>=1)remove(effect);}
  function updateChaoticRift(effect,dt){
    effect.age+=dt;
    if(effect.phase==='emergence'){const exit=effect.meshes?.[0],k=clamp(effect.age/effect.life,0,1);if(exit){exit.rotation.y-=dt*7;exit.scale.setScalar(effect.size*(1.18-.30*k));setOpacity(exit,1-Math.pow(k,1.6));}if(k>=1)remove(effect);return;}
    const k=clamp(effect.age/effect.life,0,1),entry=effect.mesh,exit=effect.meshes?.[0],ease=k*k*(3-2*k);if(entry){entry.rotation.y+=dt*(5+3*k);entry.scale.setScalar(effect.size*(1.08-.42*ease));setOpacity(entry,1-.72*ease);}if(exit){exit.rotation.y-=dt*(3+5*k);exit.scale.setScalar(effect.size*(.34+.78*ease));setOpacity(exit,.30+.70*ease);}if(effect.age<effect.life)return;
    const requestedEndpoint={...effect.position},teleportResult=teleportPlayer?.({x:requestedEndpoint.x,z:requestedEndpoint.z,arcanaId:effect.arcanaId,stableId:effect.stableId})??false,teleported=teleportResult===true||teleportResult?.ok===true,reportedEndpoint=teleportResult&&typeof teleportResult==='object'?(teleportResult.end||teleportResult.endpoint||teleportResult.position||teleportResult.resolved):null,playerAfter=playerFrame(getPlayer),validReported=reportedEndpoint&&Number.isFinite(Number(reportedEndpoint.x))&&Number.isFinite(Number(reportedEndpoint.z)),actualEndpoint=teleported?(validReported?{x:Number(reportedEndpoint.x),z:Number(reportedEndpoint.z)}:{x:playerAfter.x,z:playerAfter.z}):{x:playerAfter.x,z:playerAfter.z},reason=teleported?null:String(teleportResult?.reason||teleportResult?.error||'teleport-rejected');effect.teleported=teleported;effect.position={...actualEndpoint};if(exit)exit.position.set(actualEndpoint.x,0,actualEndpoint.z);setPlayerVisible?.(true,{source:'wizardArcana',arcanaId:effect.arcanaId,stableId:effect.stableId});setPlayerTargetable?.(true,{source:'wizardArcana',arcanaId:effect.arcanaId,stableId:effect.stableId});semantic('rift-exited',{arcanaId:effect.arcanaId,stableId:effect.stableId,requestedEndpoint,endpoint:{...actualEndpoint},teleported,reason,damage:0,intermediatePositions:0});state.activeDash=null;disposeObject(entry);effect.mesh=null;effect.meshes=exit?[exit]:[];effect.phase='emergence';effect.age=0;effect.life=.24;if(exit){exit.scale.setScalar(effect.size*1.18);setOpacity(exit,1);}addImpact(actualEndpoint,'Chaos',effect.size,1.12,effect.stableId,teleported?'rift-emergence':'rift-rejected');
  }

  function absorbPlayerDamage(amount){const incoming=Math.max(0,Number(amount)||0),globe=state.effects.find(effect=>effect.type==='waveGlobe'&&effect.shieldRemaining>0);if(!globe)return{absorbed:0,remaining:incoming};const absorbed=Math.min(incoming,globe.shieldRemaining);globe.shieldRemaining-=absorbed;const remaining=incoming-absorbed;semantic('wave-shield-absorbed',{arcanaId:globe.arcanaId,stableId:globe.stableId,incoming,absorbed,remaining,shieldRemaining:globe.shieldRemaining});if(globe.shieldRemaining<=0)addImpact(globe.position,'Water',globe.size,1.15,globe.stableId,'shield-break');return{absorbed,remaining};}
  function applyPlayerStatus(status='capture-dot',{damage=1,ticks=1,interval=.25}={}){const count=Math.max(1,Math.trunc(Number(ticks)||1)),spacing=Math.max(1/60,Number(interval)||.25),stable=`PLAYER-STATUS:${String(status||'capture-dot')}:${String(state.semanticSerial+1).padStart(3,'0')}`;add({type:'playerStatus',arcanaId:'',stableId:stable,status:String(status||'capture-dot'),age:0,life:spacing*count,nextTick:spacing,ticksRemaining:count,tickDamage:Math.max(0,Number(damage)||0),interval:spacing});semantic('player-status-applied',{stableId:stable,status:String(status||'capture-dot'),damage:Math.max(0,Number(damage)||0),ticks:count,interval:spacing});return true;}
  function updatePlayerStatus(effect,dt){effect.age+=dt;while(effect.ticksRemaining>0&&effect.age+1e-9>=effect.nextTick){damagePlayer?.(effect.tickDamage,{source:'wizardArcanaStatus',status:effect.status,targetableIndependent:true});semantic('player-status-tick',{stableId:effect.stableId,status:effect.status,damage:effect.tickDamage,tick:Number((effect.age/effect.interval).toFixed(0))});effect.ticksRemaining--;effect.nextTick+=effect.interval;}if(effect.ticksRemaining<=0)remove(effect);}

  function effectSnapshot(effect){
    const result={type:effect.type,arcanaId:effect.arcanaId||'',stableId:effect.stableId||'',semanticKind:effect.semanticKind||'',visualMode:effect.visualMode||'',age:Number(effect.age)||0};
    for(const key of['life','distance','shieldRemaining','ticksRemaining','tickIndex','nextSpike'])if(Number.isFinite(Number(effect[key])))result[key]=Number(effect[key]);
    for(const key of['position','previous','origin','direction','velocity'])if(effect[key])result[key]={x:Number(effect[key].x)||0,z:Number(effect[key].z)||0};
    if(effect.path)result.path=effect.path.map(point=>({x:Number(point.x)||0,z:Number(point.z)||0}));if(effect.phase)result.phase=effect.phase;if(effect.status)result.status=effect.status;if(typeof effect.payloadActive==='boolean')result.payloadActive=effect.payloadActive;if(typeof effect.blocked==='boolean')result.blocked=effect.blocked;if(effect.targetIds)result.targetIds=[...effect.targetIds];return result;
  }
  function snapshot(){
    const active=state.activeDash?effectSnapshot(state.activeDash):null;return{simulationTime:state.elapsed,lastCast:state.lastCast,visualMode:state.visualMode,activeDash:active,resources:cloneResources(state.resources),circuitNodes:state.circuitNodes.map(node=>({x:node.x,z:node.z,stableId:node.stableId,cast:node.cast})),effects:state.effects.map(effectSnapshot),semanticEvents:state.semanticEvents.map(event=>({...event}))};
  }
  function postEnemyUpdate(){const attacks=getEnemySystem?.()?.consumeWizardDecoyAttacks?.()||[];for(const attack of attacks){const id=typeof attack==='string'?attack:attack?.decoyId;if(id)strikeDecoy(id);}for(const effect of [...state.effects])if(effect.type==='frostDecoy'&&effect.attacked)shatterDecoy(effect,'enemy-attack');}
  function update(dt,now=0){
    const frame=Math.max(0,Number(dt)||0),time=Number(now)||0;state.elapsed+=frame;updateResources(frame);
    for(const effect of[...state.effects]){
      if(!state.effects.includes(effect))continue;
      if(effect.type==='dashMotion')updateDashMotion(effect,frame);
      else if(effect.type==='status')updateStatus(effect,frame);
      else if(effect.type==='searingTrack')updateSearingTrack(effect,frame);
      else if(effect.type==='ignitionRing')updateIgnitionRing(effect,frame,time);
      else if(effect.type==='airBurst')updateAirBurst(effect,frame);
      else if(effect.type==='razorVortex')updateRazorVortex(effect,frame);
      else if(effect.type==='toxicSeed')updateToxicSeed(effect,frame);
      else if(effect.type==='toxicPuddle')updateToxicPuddle(effect,frame,time);
      else if(effect.type==='thunderDelay')updateThunderDelay(effect,frame);
      else if(effect.type==='shockWire')updateShockWire(effect,frame);
      else if(effect.type==='waveGlobe')updateWaveGlobe(effect,frame);
      else if(effect.type==='frostDecoy')updateFrostDecoy(effect,frame,time);
      else if(effect.type==='spikeTrack')updateSpikeTrack(effect,frame);
      else if(effect.type==='circuitNode')updateCircuitNode(effect,frame);
      else if(effect.type==='circuitDelay')updateCircuitDelay(effect,frame);
      else if(effect.type==='circuitField')updateCircuitField(effect,frame);
      else if(effect.type==='dashProjectile')updateProjectile(effect,frame,time);
      else if(effect.type==='playerStatus')updatePlayerStatus(effect,frame);
      else if(effect.type==='transient')updateTransient(effect,frame);
      else if(effect.type==='chaoticRift')updateChaoticRift(effect,frame);
    }
  }
  const onPlay=event=>cast(event?.detail?.card,event?.detail||{}),onTweaks=event=>{state.sizeMultiplier=clampArcanaSize(event?.detail?.sizeMultiplier);};
  window.addEventListener('wizard-arcana:play',onPlay);window.addEventListener(ARCANA_TWEAKS_EVENT,onTweaks);
  const unregisterDamage=typeof registerPlayerDamageInterceptor==='function'?registerPlayerDamageInterceptor(absorbPlayerDamage):null;
  return{state,cast,canCast,update,postEnemyUpdate,applyPlayerStatus,absorbPlayerDamage,strikeDecoy,snapshot,reset,dispose(){window.removeEventListener('wizard-arcana:play',onPlay);window.removeEventListener(ARCANA_TWEAKS_EVENT,onTweaks);if(typeof unregisterDamage==='function')unregisterDamage();reset();},get busy(){return !!state.activeDash;}};
}
