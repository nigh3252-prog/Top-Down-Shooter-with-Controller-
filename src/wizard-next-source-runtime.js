import { ARCANA_TWEAKS_EVENT, clampArcanaSize, readArcanaTweaks } from './wizard-arcana-settings.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const TAU=Math.PI*2;
const EARTH=0xb78a52;
const EARTH_LIGHT=0xd7b77d;
const EARTH_DARK=0x5f452b;
const VINE=0x92c34f;
const VINE_LIGHT=0xd7ed72;
const VINE_DARK=0x385d25;
const SPARK=0xffdd49;
const SPARK_HOT=0xffffd0;
const VOLT=0xf0df3f;
const VOLT_HOT=0xffffd9;

export const EARTH_KNUCKLES_BEATS=Object.freeze([
  Object.freeze({time:.08,beat:1,damage:16}),
  Object.freeze({time:.56,beat:2,damage:18}),
]);
export const BLADED_VINE_BEATS=Object.freeze([
  Object.freeze({time:.06,beat:1,damage:7}),
  Object.freeze({time:.32,beat:2,damage:7}),
  Object.freeze({time:.61,beat:3,damage:15}),
]);
export const STONE_SHOT_BEATS=Object.freeze([
  Object.freeze({time:.07,beat:1,damage:12}),
  Object.freeze({time:.34,beat:2,damage:12}),
  Object.freeze({time:.63,beat:3,damage:15}),
]);
export const SPARK_CONTACT_BEATS=Object.freeze([
  Object.freeze({time:.04,beat:1,damage:6}),
  Object.freeze({time:.17,beat:2,damage:7}),
  Object.freeze({time:.30,beat:3,damage:8}),
  Object.freeze({time:.43,beat:4,damage:9,overlayDamage:10}),
]);
export const BOLT_RAIL_BEATS=Object.freeze([
  Object.freeze({time:.04,beat:1,damage:5}),
  Object.freeze({time:.16,beat:2,damage:5}),
  Object.freeze({time:.28,beat:3,damage:5}),
  Object.freeze({time:.40,beat:4,damage:5}),
  Object.freeze({time:.52,beat:5,damage:5,finisher:true}),
]);
export const VOLT_DISC_BEATS=Object.freeze([
  Object.freeze({time:.07,beat:1,damage:9}),
  Object.freeze({time:.34,beat:2,damage:9}),
  Object.freeze({time:.61,beat:3,damage:9}),
]);

export function earthKnucklesBeatSpec({beat=1,enhanced=false}={}){
  if(enhanced)return Object.freeze({enhanced:true,beat:1,damage:28,reach:4.25,width:1.65,advance:.68,push:2.25,life:.46,scale:1.45});
  const second=Number(beat)>=2;
  return Object.freeze({enhanced:false,beat:second?2:1,damage:second?18:16,reach:second?3.45:3.2,width:second?1.28:1.18,advance:second?.56:.50,push:second?1.85:1.65,life:second?.38:.35,scale:second?1.08:1});
}

export function bladedVineBeatSpec({beat=1,enhanced=false}={}){
  const index=clamp(Math.round(Number(beat)||1),1,3)-1;
  const finisher=index===2;
  return Object.freeze({beat:index+1,damage:finisher?15:7,range:finisher?7.0:5.25,halfWidth:finisher?1.05:.48,strands:finisher?3:1,sweepSign:index===1?-1:1,life:finisher?.34:.25,enhanced:!!enhanced,enhancedEmissions:enhanced&&finisher?3:1,enhancedDamage:enhanced&&finisher?9:null});
}

export function stoneShotProjectileSpec({beat=1,enhanced=false}={}){
  const finisher=Number(beat)>=3;
  return Object.freeze({beat:finisher?3:Math.max(1,Math.round(Number(beat)||1)),boulder:finisher,damage:finisher?15:12,speed:finisher?12.2:14.4,range:finisher?16.5:15,radius:finisher?.72:.40,push:finisher?2.15:1.65,enhanced:!!enhanced,enhancedShotCount:enhanced&&!finisher?2:1,enhancedDamage:enhanced&&!finisher?8:(finisher?15:null)});
}

export function sparkContactBeatSpec({beat=1,enhanced=false}={}){
  const index=clamp(Math.round(Number(beat)||1),1,4)-1;
  const final=index===3;
  return Object.freeze({beat:index+1,damage:[6,7,8,9][index],range:final?2.2:1.75,halfWidth:final?.72:.54,advance:final?.34:.29,push:final?.78:.52,life:final?.20:.14,overlay:final?Object.freeze({damage:10,radius:3.15,halfAngle:1.02,push:1.05,shock:!!enhanced}):null,enhanced:!!enhanced});
}

export function boltRailStreamSpec({beat=1,enhanced=false}={}){
  const index=clamp(Math.round(Number(beat)||1),1,5),finisher=index===5;
  return Object.freeze({beat:index,damage:5,range:3.85,halfWidth:.48,life:.13,finisher,burst:finisher?Object.freeze({damage:10,radius:1.45,chains:!!enhanced,shock:!!enhanced}):null,ignoresWorldCollision:true,enhanced:!!enhanced});
}

export function voltDiscProjectileSpec({enhanced=false}={}){
  return Object.freeze({damage:9,speed:11.2,range:7.4,radius:.52,burstRadius:1.38,missBurstDamage:9,directBurstDamage:0,redirects:!!enhanced,enhanced:!!enhanced});
}

export function pointSegmentDistance2D(point,a,b){
  const abx=b.x-a.x,abz=b.z-a.z,apx=point.x-a.x,apz=point.z-a.z;
  const denom=abx*abx+abz*abz;
  const t=denom>1e-8?clamp((apx*abx+apz*abz)/denom,0,1):0;
  return Math.hypot(point.x-(a.x+abx*t),point.z-(a.z+abz*t));
}

export function pointInForwardStrip({originX=0,originZ=0,forwardX=0,forwardZ=1,targetX=0,targetZ=0,range=1,halfWidth=.5,targetRadius=0}={}){
  const length=Math.hypot(forwardX,forwardZ)||1,fx=forwardX/length,fz=forwardZ/length,rx=fz,rz=-fx;
  const dx=targetX-originX,dz=targetZ-originZ,radius=Math.max(0,Number(targetRadius)||0);
  const forward=dx*fx+dz*fz,lateral=Math.abs(dx*rx+dz*rz);
  return forward>=-radius&&forward<=range+radius&&lateral<=halfWidth+radius;
}

export function pointInForwardArc({originX=0,originZ=0,forwardX=0,forwardZ=1,targetX=0,targetZ=0,radius=1,halfAngle=Math.PI/3,targetRadius=0}={}){
  const length=Math.hypot(forwardX,forwardZ)||1,fx=forwardX/length,fz=forwardZ/length;
  const dx=targetX-originX,dz=targetZ-originZ,distance=Math.hypot(dx,dz),extra=Math.max(0,Number(targetRadius)||0);
  if(distance>radius+extra)return false;
  if(distance<1e-6)return true;
  const angle=Math.acos(clamp((dx*fx+dz*fz)/distance,-1,1));
  const padding=Math.asin(clamp(extra/Math.max(distance,extra||1),0,1));
  return angle<=halfAngle+padding;
}

export function segmentIntersection2D(a,b,c,d){
  const rx=b.x-a.x,rz=b.z-a.z,sx=d.x-c.x,sz=d.z-c.z,cross=rx*sz-rz*sx;
  if(Math.abs(cross)<1e-8)return null;
  const qx=c.x-a.x,qz=c.z-a.z,t=(qx*sz-qz*sx)/cross,u=(qx*rz-qz*rx)/cross;
  return t>=0&&t<=1&&u>=0&&u<=1?{t,u,x:a.x+rx*t,z:a.z+rz*t}:null;
}

export function safeAdvanceDistance(frame,distance,walls=[],clearance=.52){
  const start={x:frame.x,z:frame.z},end={x:start.x+frame.forward.x*distance,z:start.z+frame.forward.z*distance};
  let allowed=Math.max(0,distance);
  for(const wall of walls||[]){if(!wall?.a||!wall?.b)continue;const hit=segmentIntersection2D(start,end,wall.a,wall.b);if(hit)allowed=Math.min(allowed,Math.max(0,distance*hit.t-clearance));}
  return allowed;
}

function isEnemyLabRuntime(){
  if(typeof window==='undefined')return false;
  try{const params=new URLSearchParams(location.search||'');if(params.get('enemyLab')==='1'||params.get('mode')==='enemy-lab')return true;return !!(window.parent&&window.parent!==window&&window.frameElement?.id==='arenaFrame'&&/(?:^|\/)enemy-lab\.html$/i.test(window.parent.location?.pathname||''));}catch{return false;}
}
function normalize2(x,z){const length=Math.hypot(x,z)||1;return{x:x/length,z:z/length};}
function playerFrame(getPlayer){const p=getPlayer?.()||{},forward=normalize2(Number(p.forwardX)||0,Number(p.forwardZ)||1);return{x:Number(p.x)||0,z:Number(p.z)||0,forward};}
function aliveEnemies(system){return(system?.enemies||[]).filter(enemy=>enemy&&enemy.hp>0);}
function enemyRadius(enemy,system){return Math.max(.42,(Number(enemy?.radius)||1)*(Number(system?.heightScale)||1)*.72);}
function enemyCenterY(enemy,system){const scale=(system?.heightScale||1)*(enemy?.currentTargetScale||enemy?.targetScale||1);return(enemy?.targetYOffset||enemy?.rootLift||0)+(enemy?.height||2)*scale*.55;}
function makeMaterial(THREE,color,opacity=.86,additive=false){return new THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,depthWrite:false,side:THREE.DoubleSide});}
function disposeObject(root){if(!root)return;root.parent?.remove(root);root.traverse?.(object=>{object.geometry?.dispose?.();if(Array.isArray(object.material))object.material.forEach(material=>material?.dispose?.());else object.material?.dispose?.();});}
function firstWallHit(start,end,walls){let best=null;for(const wall of walls||[]){if(!wall?.a||!wall?.b)continue;const hit=segmentIntersection2D(start,end,wall.a,wall.b);if(hit&&(!best||hit.t<best.hit.t))best={wall,hit};}return best;}

function makeImpactFlash(THREE,scene,x,y,z,size,color=0xffffff){const mesh=new THREE.Mesh(new THREE.SphereGeometry(.38*size,12,8),makeMaterial(THREE,color,.96,true));mesh.position.set(x,y,z);mesh.userData.baseOpacity=.96;mesh.renderOrder=9;scene.add(mesh);return mesh;}

function makeEarthFist(THREE,scene,spec,side,size){
  const group=new THREE.Group();group.name=`Wizard Arcana Earth Knuckles beat ${spec.beat}`;
  for(let index=0;index<5;index++){const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.34+.04*(index%2),0),makeMaterial(THREE,index%2?EARTH_DARK:EARTH,.96));rock.position.set(side*(.14+.06*index),.48+.05*Math.sin(index),.42+index*.42);rock.rotation.set(index*.43,index*.72,index*.31);group.add(rock);}
  const palm=new THREE.Mesh(new THREE.DodecahedronGeometry(.92,1),makeMaterial(THREE,EARTH,.98));palm.position.set(side*.22,.62,2.72);palm.scale.set(1.15,.82,1.05);group.add(palm);
  for(let finger=0;finger<4;finger++){const knuckle=new THREE.Mesh(new THREE.DodecahedronGeometry(.34,0),makeMaterial(THREE,EARTH_LIGHT,.98));knuckle.position.set((finger-1.5)*.38+side*.22,.70,3.38+Math.abs(finger-1.5)*-.08);knuckle.scale.set(.9,.8,1.35);group.add(knuckle);}
  group.scale.set(size*spec.scale,size*spec.scale,.02);group.renderOrder=5;scene.add(group);return group;
}

function makeVineVisual(THREE,scene,spec,size){
  const group=new THREE.Group();group.name=`Wizard Arcana Bladed Vine beat ${spec.beat}`;
  for(let strand=0;strand<spec.strands;strand++){const lateral=(strand-(spec.strands-1)/2)*.42,nodes=spec.beat===3?17:14;for(let index=0;index<nodes;index++){const p=index/(nodes-1),wave=Math.sin(p*Math.PI*2+strand*.8)*(.18+.14*p);const node=new THREE.Mesh(new THREE.SphereGeometry(.11+(index%3===0?.045:0),9,6),makeMaterial(THREE,index%3===0?VINE_LIGHT:VINE,.94));node.position.set(lateral+wave,.34+.08*Math.sin(p*Math.PI),.28+p*spec.range);node.scale.set(1,.86,1.35);group.add(node);if(index>1&&index%3===0){const thorn=new THREE.Mesh(new THREE.ConeGeometry(.09,.34,7),makeMaterial(THREE,VINE_DARK,.92));thorn.position.set(node.position.x+(index%2?.16:-.16),node.position.y+.05,node.position.z);thorn.rotation.z=index%2?-.8:.8;group.add(thorn);}}}
  group.scale.set(size,size,.08);group.renderOrder=5;scene.add(group);return group;
}

function makeStoneProjectile(THREE,scene,spec,size){
  const group=new THREE.Group();group.name=spec.boulder?'Wizard Arcana Stone Shot spiked boulder':'Wizard Arcana Stone Shot';
  const core=new THREE.Mesh(new THREE.DodecahedronGeometry(spec.radius*size,spec.boulder?1:0),makeMaterial(THREE,spec.boulder?EARTH:EARTH_LIGHT,.98));core.rotation.set(.4,.3,.2);group.add(core);
  if(spec.boulder){for(let index=0;index<8;index++){const angle=index*TAU/8,spike=new THREE.Mesh(new THREE.ConeGeometry(.13*size,.48*size,7),makeMaterial(THREE,EARTH_DARK,.96));spike.position.set(Math.cos(angle)*spec.radius*size*.86,.08*size,Math.sin(angle)*spec.radius*size*.86);spike.rotation.z=Math.PI/2;spike.rotation.y=-angle;group.add(spike);}}
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(spec.radius*size*1.05,22),makeMaterial(THREE,0x1f1710,.28));shadow.rotation.x=-Math.PI/2;shadow.position.y=.025;scene.add(shadow);group.renderOrder=5;scene.add(group);return{mesh:group,shadow};
}

function makeSparkStrike(THREE,scene,spec,size){
  const group=new THREE.Group();group.name=`Wizard Arcana Spark Contact beat ${spec.beat}`;
  for(let line=0;line<3;line++){const points=[];for(let index=0;index<7;index++){const p=index/6;points.push(new THREE.Vector3((line-1)*.13+Math.sin(index*2.3+line)*.11,.48+Math.sin(index*1.8+line)*.12,p*spec.range));}const geometry=new THREE.BufferGeometry().setFromPoints(points);const material=new THREE.LineBasicMaterial({color:line===1?SPARK_HOT:SPARK,transparent:true,opacity:line===1?.98:.72,blending:THREE.AdditiveBlending,depthWrite:false});const bolt=new THREE.Line(geometry,material);bolt.userData.baseOpacity=material.opacity;group.add(bolt);}
  const flash=new THREE.Mesh(new THREE.SphereGeometry(.34,12,8),makeMaterial(THREE,SPARK_HOT,.92,true));flash.position.set(0,.48,spec.range*.78);flash.userData.baseOpacity=.92;group.add(flash);group.scale.setScalar(size);group.renderOrder=7;scene.add(group);return group;
}

function makeSparkArc(THREE,scene,spec,size){
  const group=new THREE.Group();group.name='Wizard Arcana Spark Contact final arc';const start=Math.PI/2-spec.overlay.halfAngle,length=spec.overlay.halfAngle*2;
  const ring=new THREE.Mesh(new THREE.RingGeometry(spec.overlay.radius*.72*size,spec.overlay.radius*size,48,1,start,length),makeMaterial(THREE,SPARK,.84,true));ring.rotation.x=Math.PI/2;ring.position.y=.32;ring.userData.baseOpacity=.84;group.add(ring);
  const edge=new THREE.Mesh(new THREE.RingGeometry((spec.overlay.radius-.12)*size,(spec.overlay.radius+.04)*size,48,1,start,length),makeMaterial(THREE,SPARK_HOT,.96,true));edge.rotation.x=Math.PI/2;edge.position.y=.39;edge.userData.baseOpacity=.96;group.add(edge);group.renderOrder=7;scene.add(group);return group;
}

function makeBoltRailStream(THREE,scene,spec,size){
  const group=new THREE.Group();group.name=`Wizard Arcana Bolt Rail beat ${spec.beat}`;
  for(let line=0;line<5;line++){const points=[];for(let index=0;index<9;index++){const p=index/8;points.push(new THREE.Vector3(Math.sin(index*2.6+line*1.7)*(.09+.025*line)+(line-2)*.045,.42+Math.cos(index*1.9+line)*.08,p*spec.range));}const geometry=new THREE.BufferGeometry().setFromPoints(points),material=new THREE.LineBasicMaterial({color:line===2?VOLT_HOT:VOLT,transparent:true,opacity:line===2?1:.72,blending:THREE.AdditiveBlending,depthWrite:false}),bolt=new THREE.Line(geometry,material);bolt.userData.baseOpacity=material.opacity;group.add(bolt);}
  for(let index=0;index<3;index++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.24+index*.11,.035,7,22),makeMaterial(THREE,index===1?VOLT_HOT:VOLT,.72,true));ring.position.set(0,.42,.55+index*1.25);ring.userData.baseOpacity=.72;group.add(ring);}
  group.scale.setScalar(size);group.renderOrder=8;scene.add(group);return group;
}

function makeVoltDisc(THREE,scene,spec,size){
  const group=new THREE.Group();group.name='Wizard Arcana Volt Disc hollow ring';
  const outer=new THREE.Mesh(new THREE.TorusGeometry(.52*size,.105*size,10,34),makeMaterial(THREE,VOLT,.88,true));outer.userData.baseOpacity=.88;group.add(outer);
  const inner=new THREE.Mesh(new THREE.TorusGeometry(.34*size,.045*size,8,30),makeMaterial(THREE,VOLT_HOT,.96,true));inner.userData.baseOpacity=.96;group.add(inner);
  for(let index=0;index<6;index++){const angle=index*Math.PI/3,point=new THREE.Mesh(new THREE.SphereGeometry(.075*size,8,6),makeMaterial(THREE,index%2?VOLT:VOLT_HOT,.9,true));point.position.set(Math.cos(angle)*.5*size,Math.sin(angle)*.5*size,0);point.userData.discSpark=index;group.add(point);}
  group.renderOrder=8;scene.add(group);return group;
}

function makeLightningBurst(THREE,scene,position,size,direct=false){
  const group=new THREE.Group();group.name=direct?'Wizard Arcana Volt Disc zero-damage contact burst':'Wizard Arcana lightning damage burst';
  const ring=new THREE.Mesh(new THREE.RingGeometry(.28*size,.72*size,34),makeMaterial(THREE,VOLT,.82,true));ring.rotation.x=-Math.PI/2;ring.userData.baseOpacity=.82;group.add(ring);
  const core=new THREE.Mesh(new THREE.SphereGeometry(.26*size,12,8),makeMaterial(THREE,VOLT_HOT,direct?.64:.94,true));core.position.y=.32*size;core.userData.baseOpacity=direct?.64:.94;group.add(core);
  for(let ray=0;ray<8;ray++){const angle=ray*Math.PI/4,points=[new THREE.Vector3(0,.32*size,0),new THREE.Vector3(Math.cos(angle)*.45*size,.34*size,Math.sin(angle)*.45*size),new THREE.Vector3(Math.cos(angle+.12)*.92*size,.18*size,Math.sin(angle+.12)*.92*size)],geometry=new THREE.BufferGeometry().setFromPoints(points),material=new THREE.LineBasicMaterial({color:ray%2?VOLT:VOLT_HOT,transparent:true,opacity:.84,blending:THREE.AdditiveBlending,depthWrite:false}),line=new THREE.Line(geometry,material);line.userData.baseOpacity=.84;group.add(line);}
  group.position.set(position.x,0,position.z);group.renderOrder=9;scene.add(group);return group;
}

export function installWizardNextSourceRuntime({THREE,scene,getPlayer,getEnemySystem,getMazeSegments=()=>[],advancePlayer=()=>false}={}){
  const initial=readArcanaTweaks();
  if(!THREE||!scene||!isEnemyLabRuntime())return{state:{effects:[],sizeMultiplier:initial.sizeMultiplier},update(){},reset(){},dispose(){}};
  const state={effects:[],sizeMultiplier:initial.sizeMultiplier};
  const add=effect=>(state.effects.push(effect),effect);
  function remove(effect){if(effect.mesh)disposeObject(effect.mesh);for(const mesh of effect.meshes||[])disposeObject(mesh);for(const flash of effect.flashes||[])disposeObject(flash);const index=state.effects.indexOf(effect);if(index>=0)state.effects.splice(index,1);}
  function reset(){for(const effect of[...state.effects])remove(effect);}
  function currentSize(){return clampArcanaSize(state.sizeMultiplier);}
  function advance(frame,distance){const allowed=safeAdvanceDistance(frame,distance,getMazeSegments?.()||[]);if(allowed>0)advancePlayer?.(frame.forward.x*allowed,frame.forward.z*allowed);return allowed;}
  function damageStrip(frame,{range,halfWidth,damage,push,sourceTag},size){const system=getEnemySystem?.(),flashes=[];if(!system)return flashes;for(const enemy of aliveEnemies(system)){if(!pointInForwardStrip({originX:frame.x,originZ:frame.z,forwardX:frame.forward.x,forwardZ:frame.forward.z,targetX:enemy.x,targetZ:enemy.z,range:range*size,halfWidth:halfWidth*size,targetRadius:enemyRadius(enemy,system)}))continue;const direction=normalize2(enemy.x-frame.x,enemy.z-frame.z);system.damageEnemy?.(enemy,damage,{x:direction.x*push,z:direction.z*push},{source:'wizardArcana',power:.42,pop:.09,[sourceTag]:true});flashes.push(makeImpactFlash(THREE,scene,enemy.x,enemyCenterY(enemy,system),enemy.z,size));}return flashes;}
  function damageArc(frame,{radius,halfAngle,damage,push,shock=false},size){const system=getEnemySystem?.(),flashes=[];if(!system)return flashes;for(const enemy of aliveEnemies(system)){if(!pointInForwardArc({originX:frame.x,originZ:frame.z,forwardX:frame.forward.x,forwardZ:frame.forward.z,targetX:enemy.x,targetZ:enemy.z,radius:radius*size,halfAngle,targetRadius:enemyRadius(enemy,system)}))continue;const direction=normalize2(enemy.x-frame.x,enemy.z-frame.z);system.damageEnemy?.(enemy,damage,{x:direction.x*push,z:direction.z*push},{source:'wizardArcana',power:.46,pop:.11,sparkContactArc:true,shock});flashes.push(makeImpactFlash(THREE,scene,enemy.x,enemyCenterY(enemy,system),enemy.z,size,SPARK_HOT));}return flashes;}

  function emitEarthPunch(beat){let frame=playerFrame(getPlayer);const spec=earthKnucklesBeatSpec({beat}),size=currentSize();advance(frame,spec.advance);frame=playerFrame(getPlayer);const side=beat===1?-1:1,mesh=makeEarthFist(THREE,scene,spec,side,size);mesh.position.set(frame.x,0,frame.z);mesh.rotation.y=Math.atan2(frame.forward.x,frame.forward.z);add({type:'earthPunch',age:0,life:spec.life,mesh,spec,size,frame,hitDone:false,flashes:[]});}
  function emitVine(beat){const frame=playerFrame(getPlayer),spec=bladedVineBeatSpec({beat}),size=currentSize(),mesh=makeVineVisual(THREE,scene,spec,size);mesh.position.set(frame.x,0,frame.z);mesh.rotation.y=Math.atan2(frame.forward.x,frame.forward.z)-spec.sweepSign*.42;const flashes=damageStrip(frame,{range:spec.range,halfWidth:spec.halfWidth,damage:spec.damage,push:beat===3?.85:.42,sourceTag:'bladedVine'},size);add({type:'vineStrike',age:0,life:spec.life,mesh,spec,size,frame,baseYaw:Math.atan2(frame.forward.x,frame.forward.z),flashes});}
  function emitStone(beat){const frame=playerFrame(getPlayer),spec=stoneShotProjectileSpec({beat}),size=currentSize(),visual=makeStoneProjectile(THREE,scene,spec,size);const position={x:frame.x+frame.forward.x*.9,z:frame.z+frame.forward.z*.9};visual.mesh.position.set(position.x,.62+(spec.boulder?.16:0),position.z);visual.shadow.position.set(position.x,.025,position.z);add({type:'stoneProjectile',age:0,position,previous:{...position},direction:{...frame.forward},velocity:{x:frame.forward.x*spec.speed,z:frame.forward.z*spec.speed},distance:0,spec,size,mesh:visual.mesh,meshes:[visual.shadow],shadow:visual.shadow,walls:[...(getMazeSegments?.()||[])],hit:new Set()});}
  function emitSpark(beat){let frame=playerFrame(getPlayer);const spec=sparkContactBeatSpec({beat}),size=currentSize();advance(frame,spec.advance);frame=playerFrame(getPlayer);const mesh=makeSparkStrike(THREE,scene,spec,size);mesh.position.set(frame.x,0,frame.z);mesh.rotation.y=Math.atan2(frame.forward.x,frame.forward.z);const flashes=damageStrip(frame,{range:spec.range,halfWidth:spec.halfWidth,damage:spec.damage,push:spec.push,sourceTag:'sparkContact'},size),meshes=[];if(spec.overlay){const arc=makeSparkArc(THREE,scene,spec,size);arc.position.set(frame.x,0,frame.z);arc.rotation.y=Math.atan2(frame.forward.x,frame.forward.z);meshes.push(arc);flashes.push(...damageArc(frame,spec.overlay,size));}add({type:'sparkStrike',age:0,life:spec.life,mesh,meshes,flashes,spec,size});}
  function emitBoltRail(beat){
    const frame=playerFrame(getPlayer),spec=boltRailStreamSpec({beat}),size=currentSize(),mesh=makeBoltRailStream(THREE,scene,spec,size),system=getEnemySystem?.(),hits=[];
    mesh.position.set(frame.x,0,frame.z);mesh.rotation.y=Math.atan2(frame.forward.x,frame.forward.z);
    for(const enemy of aliveEnemies(system)){if(!pointInForwardStrip({originX:frame.x,originZ:frame.z,forwardX:frame.forward.x,forwardZ:frame.forward.z,targetX:enemy.x,targetZ:enemy.z,range:spec.range*size,halfWidth:spec.halfWidth*size,targetRadius:enemyRadius(enemy,system)}))continue;hits.push(enemy);const direction=normalize2(enemy.x-frame.x,enemy.z-frame.z);system.damageEnemy?.(enemy,spec.damage,{x:direction.x*.22,z:direction.z*.22},{source:'wizardArcana',power:.20,pop:.025,boltRail:true,beat});}
    const meshes=[];
    if(spec.finisher&&hits.length){const primary=hits.reduce((best,enemy)=>Math.hypot(enemy.x-frame.x,enemy.z-frame.z)<Math.hypot(best.x-frame.x,best.z-frame.z)?enemy:best),position={x:primary.x,z:primary.z};meshes.push(makeLightningBurst(THREE,scene,position,spec.burst.radius*size,false));for(const enemy of aliveEnemies(system)){if(Math.hypot(enemy.x-position.x,enemy.z-position.z)>spec.burst.radius*size+enemyRadius(enemy,system))continue;const direction=normalize2(enemy.x-position.x,enemy.z-position.z);system.damageEnemy?.(enemy,spec.burst.damage,{x:direction.x*.72,z:direction.z*.72},{source:'wizardArcana',power:.44,pop:.10,boltRailFinisher:true});}}
    add({type:'boltRailStrike',age:0,life:spec.finisher?.22:spec.life,mesh,meshes,spec,size});
  }
  function emitVoltDisc(){const frame=playerFrame(getPlayer),spec=voltDiscProjectileSpec(),size=currentSize(),mesh=makeVoltDisc(THREE,scene,spec,size),position={x:frame.x+frame.forward.x*.88,z:frame.z+frame.forward.z*.88};mesh.position.set(position.x,.68*size,position.z);mesh.rotation.y=Math.atan2(frame.forward.x,frame.forward.z);add({type:'voltDiscProjectile',age:0,position,previous:{...position},direction:{...frame.forward},velocity:{x:frame.forward.x*spec.speed,z:frame.forward.z*spec.speed},distance:0,spec,size,mesh,walls:[...(getMazeSegments?.()||[])]});}
  function emitVoltBurst(position,size,direct,primary=null){
    const spec=voltDiscProjectileSpec(),system=getEnemySystem?.(),mesh=makeLightningBurst(THREE,scene,position,spec.burstRadius*size,direct);
    if(direct&&primary)system?.damageEnemy?.(primary,spec.directBurstDamage,{x:0,z:0},{source:'wizardArcana',power:.08,pop:.01,voltDiscBurst:true,zeroDamageEvent:true});
    if(!direct)for(const enemy of aliveEnemies(system)){if(Math.hypot(enemy.x-position.x,enemy.z-position.z)>spec.burstRadius*size+enemyRadius(enemy,system))continue;const direction=normalize2(enemy.x-position.x,enemy.z-position.z);system.damageEnemy?.(enemy,spec.missBurstDamage,{x:direction.x*.62,z:direction.z*.62},{source:'wizardArcana',power:.38,pop:.08,voltDiscBurst:true});}
    add({type:'lightningBurst',age:0,life:.30,mesh,direct});
  }
  function startCombo(type){const life=type==='earthCombo'?1.05:type==='vineCombo'?.92:type==='stoneCombo'?.96:type==='sparkCombo'?.72:type==='boltRailCombo'?.76:.92;add({type,age:0,nextBeat:0,life});}
  function updateCombo(effect,dt,beats,emit){effect.age+=dt;while(effect.nextBeat<beats.length&&effect.age>=beats[effect.nextBeat].time){emit(beats[effect.nextBeat].beat);effect.nextBeat++;}if(effect.nextBeat>=beats.length&&effect.age>=effect.life)remove(effect);}
  function updateEarthPunch(effect,dt){effect.age+=dt;const k=clamp(effect.age/effect.life,0,1),extension=Math.sin(k*Math.PI);effect.mesh.scale.set(effect.size*effect.spec.scale,effect.size*effect.spec.scale,Math.max(.02,extension)*effect.size*effect.spec.scale);if(!effect.hitDone&&k>=.38){effect.hitDone=true;effect.flashes.push(...damageStrip(effect.frame,{range:effect.spec.reach,halfWidth:effect.spec.width,damage:effect.spec.damage,push:effect.spec.push,sourceTag:'earthKnuckles'},effect.size));}for(const flash of effect.flashes){flash.material.opacity=.96*Math.pow(1-k,.35);flash.scale.setScalar(1+k*2.2);}if(k>=1)remove(effect);}
  function updateVine(effect,dt,now){effect.age+=dt;const k=clamp(effect.age/effect.life,0,1),ease=1-Math.pow(1-k,3),frame=playerFrame(getPlayer);effect.mesh.position.set(frame.x,0,frame.z);effect.mesh.rotation.y=effect.baseYaw+effect.spec.sweepSign*(ease-.5)*.82;effect.mesh.scale.z=Math.max(.08,Math.sin(k*Math.PI))*effect.size;effect.mesh.children.forEach((child,index)=>{child.material.opacity=.94*Math.pow(1-k,.48);child.rotation.y+=dt*(index%2?2.1:-1.7);});for(const flash of effect.flashes){flash.material.opacity=.96*Math.pow(1-k,.35);flash.scale.setScalar(1+k*1.8);}if(k>=1)remove(effect);}
  function updateStone(effect,dt,now){effect.age+=dt;const start={...effect.position},end={x:start.x+effect.velocity.x*dt,z:start.z+effect.velocity.z*dt};const wall=firstWallHit(start,end,effect.walls);if(wall){remove(effect);return;}effect.position=end;effect.distance+=Math.hypot(end.x-start.x,end.z-start.z);effect.mesh.position.set(end.x,.62+(effect.spec.boulder?.16:0)+Math.sin(now*12)*.04,end.z);effect.mesh.rotation.x+=dt*5.5;effect.mesh.rotation.y+=dt*4.2;effect.shadow.position.set(end.x,.025,end.z);const system=getEnemySystem?.();for(const enemy of aliveEnemies(system)){if(effect.hit.has(enemy))continue;if(pointSegmentDistance2D(enemy,start,end)>enemyRadius(enemy,system)+effect.spec.radius*effect.size)continue;effect.hit.add(enemy);const direction=normalize2(enemy.x-start.x,enemy.z-start.z);system.damageEnemy?.(enemy,effect.spec.damage,{x:direction.x*effect.spec.push,z:direction.z*effect.spec.push},{source:'wizardArcana',power:effect.spec.boulder?.62:.46,pop:effect.spec.boulder?.16:.10,stoneShot:true,boulder:effect.spec.boulder});const flash=makeImpactFlash(THREE,scene,enemy.x,enemyCenterY(enemy,system),enemy.z,effect.size*(effect.spec.boulder?1.5:1));add({type:'impactOnly',age:0,life:.24,mesh:flash});remove(effect);return;}if(effect.distance>=effect.spec.range)remove(effect);}
  function updateSpark(effect,dt){effect.age+=dt;const k=clamp(effect.age/effect.life,0,1);for(const object of[effect.mesh,...effect.meshes])object?.traverse?.(child=>{if(child.material)child.material.opacity=(child.userData?.baseOpacity??.78)*Math.pow(1-k,.42);});for(const flash of effect.flashes){flash.material.opacity=.96*Math.pow(1-k,.35);flash.scale.setScalar(1+k*1.7);}if(k>=1)remove(effect);}
  function updateBoltRail(effect,dt){effect.age+=dt;const k=clamp(effect.age/effect.life,0,1);for(const object of[effect.mesh,...effect.meshes])object?.traverse?.(child=>{if(child.material)child.material.opacity=(child.userData?.baseOpacity??.78)*Math.pow(1-k,.4);});effect.mesh.scale.y=.82+.24*Math.sin(k*Math.PI);if(k>=1)remove(effect);}
  function updateVoltDisc(effect,dt,now){const start={...effect.position},end={x:start.x+effect.velocity.x*dt,z:start.z+effect.velocity.z*dt},wall=firstWallHit(start,end,effect.walls);if(wall){emitVoltBurst({x:wall.hit.x,z:wall.hit.z},effect.size,false);remove(effect);return;}effect.age+=dt;effect.position=end;effect.distance+=Math.hypot(end.x-start.x,end.z-start.z);effect.mesh.position.set(end.x,.68*effect.size+Math.sin(now*14)*.04,end.z);effect.mesh.rotation.z+=dt*7.5;effect.mesh.children.forEach(child=>{if(Number.isFinite(child.userData?.discSpark)){const pulse=.82+.25*Math.sin(now*19+child.userData.discSpark);child.scale.setScalar(pulse);}});const system=getEnemySystem?.();for(const enemy of aliveEnemies(system)){if(pointSegmentDistance2D(enemy,start,end)>enemyRadius(enemy,system)+effect.spec.radius*effect.size)continue;system.damageEnemy?.(enemy,effect.spec.damage,{x:effect.direction.x*.72,z:effect.direction.z*.72},{source:'wizardArcana',power:.36,pop:.08,voltDisc:true});emitVoltBurst({x:enemy.x,z:enemy.z},effect.size,true,enemy);remove(effect);return;}if(effect.distance>=effect.spec.range){emitVoltBurst(effect.position,effect.size,false);remove(effect);}}
  function updateLightningBurst(effect,dt){effect.age+=dt;const k=clamp(effect.age/effect.life,0,1);effect.mesh.traverse(child=>{if(child.material)child.material.opacity=(child.userData?.baseOpacity??.82)*Math.pow(1-k,.42);});effect.mesh.scale.setScalar(1+k*(effect.direct?.9:1.35));effect.mesh.rotation.y+=dt*2.7;if(k>=1)remove(effect);}
  function updateImpact(effect,dt){effect.age+=dt;const k=clamp(effect.age/effect.life,0,1);effect.mesh.material.opacity=.96*Math.pow(1-k,.35);effect.mesh.scale.setScalar(1+k*2);if(k>=1)remove(effect);}

  const onPlay=event=>{const id=event?.detail?.card?.arcanaId;if(id==='EARTH-KNUCKLES')startCombo('earthCombo');else if(id==='BLADED-VINE')startCombo('vineCombo');else if(id==='STONE-SHOT')startCombo('stoneCombo');else if(id==='SPARK-CONTACT')startCombo('sparkCombo');else if(id==='BOLT-RAIL')startCombo('boltRailCombo');else if(id==='VOLT-DISC')startCombo('voltDiscCombo');};
  const onTweaks=event=>{state.sizeMultiplier=clampArcanaSize(event?.detail?.sizeMultiplier);};
  window.addEventListener('wizard-arcana:play',onPlay);window.addEventListener(ARCANA_TWEAKS_EVENT,onTweaks);
  return{state,reset,update(dt,now=0){const frame=Math.max(0,Number(dt)||0),time=Number(now)||0;for(const effect of[...state.effects]){if(effect.type==='earthCombo')updateCombo(effect,frame,EARTH_KNUCKLES_BEATS,emitEarthPunch);else if(effect.type==='vineCombo')updateCombo(effect,frame,BLADED_VINE_BEATS,emitVine);else if(effect.type==='stoneCombo')updateCombo(effect,frame,STONE_SHOT_BEATS,emitStone);else if(effect.type==='sparkCombo')updateCombo(effect,frame,SPARK_CONTACT_BEATS,emitSpark);else if(effect.type==='boltRailCombo')updateCombo(effect,frame,BOLT_RAIL_BEATS,emitBoltRail);else if(effect.type==='voltDiscCombo')updateCombo(effect,frame,VOLT_DISC_BEATS,emitVoltDisc);else if(effect.type==='earthPunch')updateEarthPunch(effect,frame);else if(effect.type==='vineStrike')updateVine(effect,frame,time);else if(effect.type==='stoneProjectile')updateStone(effect,frame,time);else if(effect.type==='sparkStrike')updateSpark(effect,frame);else if(effect.type==='boltRailStrike')updateBoltRail(effect,frame);else if(effect.type==='voltDiscProjectile')updateVoltDisc(effect,frame,time);else if(effect.type==='lightningBurst')updateLightningBurst(effect,frame);else if(effect.type==='impactOnly')updateImpact(effect,frame);}},dispose(){window.removeEventListener('wizard-arcana:play',onPlay);window.removeEventListener(ARCANA_TWEAKS_EVENT,onTweaks);reset();}};
}
