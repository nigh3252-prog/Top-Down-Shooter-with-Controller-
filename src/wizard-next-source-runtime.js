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
export const WIZARD_NEXT_SOURCE_SEMANTIC_EVENT='wizard-arcana:semantic';
export const VOLT_DISC_COMBO=Object.freeze({presses:3,rollingTimeout:.9});

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
  Object.freeze({press:1,beat:1,damage:9}),
  Object.freeze({press:2,beat:2,damage:9}),
  Object.freeze({press:3,beat:3,damage:9}),
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
  return Object.freeze({damage:9,speed:11.2,range:7.4,radius:.52,burstRadius:1.38,missBurstDamage:9,directBurstDamage:0,wallFizzleDamage:0,comboPresses:VOLT_DISC_COMBO.presses,rollingTimeout:VOLT_DISC_COMBO.rollingTimeout,redirects:!!enhanced,enhanced:!!enhanced});
}

export function sampleBoltRailStream({beat=1,length=3.85,segments=10}={}){
  const safeBeat=clamp(Math.round(Number(beat)||1),1,5),safeLength=Math.max(.2,Number(length)||3.85),count=Math.max(4,Math.trunc(Number(segments)||10));
  const main=Array.from({length:count},(_,index)=>{
    const p=index/(count-1),envelope=Math.sin(p*Math.PI),phase=index*2.31+safeBeat*1.73;
    return{x:Math.sin(phase)*(.095+.095*envelope)*envelope,y:1.12+Math.cos(phase*.83)*.105*envelope,z:p*safeLength,p};
  });
  const roots=[2,4,6,8].filter(index=>index<count-1),branches=roots.map((root,branchIndex)=>{
    const anchor=main[root],side=(branchIndex+safeBeat)%2?1:-1,span=(.42+.11*((safeBeat+branchIndex)%3))*Math.min(1,safeLength/3.85),forward=.25+.08*(branchIndex%2);
    return[
      {...anchor},
      {x:anchor.x+side*span*.58,y:anchor.y+.08*((branchIndex%2)*2-1),z:Math.min(safeLength,anchor.z+forward*.45)},
      {x:anchor.x+side*span,y:anchor.y+.03*((safeBeat+branchIndex)%3-1),z:Math.min(safeLength,anchor.z+forward)},
    ];
  });
  return Object.freeze({beat:safeBeat,length:safeLength,main:Object.freeze(main.map(point=>Object.freeze(point))),branches:Object.freeze(branches.map(branch=>Object.freeze(branch.map(point=>Object.freeze(point)))))});
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
function isAbilityCaptureRuntime(){
  if(typeof window==='undefined')return false;
  try{return new URLSearchParams(globalThis.location?.search||'').get('capture')==='1';}catch{return false;}
}
export function normalizeWizardVisualMode(stage='style'){
  const value=String(stage||'style').trim().toLowerCase();
  if(value==='motion'||value==='contract')return'contract';
  if(value==='reference'||value==='source')return'source';
  return'style';
}
function currentWizardVisualMode(){
  if(!isAbilityCaptureRuntime())return'style';
  let stage='style';
  try{stage=window.__abilityCapture?.snapshot?.().stage||new URLSearchParams(globalThis.location?.search||'').get('stage')||'style';}catch{}
  return normalizeWizardVisualMode(stage);
}
function normalize2(x,z){const length=Math.hypot(x,z)||1;return{x:x/length,z:z/length};}
function playerFrame(getPlayer){const p=getPlayer?.()||{},rawX=Number(p.forwardX),rawZ=Number(p.forwardZ),forward=normalize2(Number.isFinite(rawX)?rawX:0,Number.isFinite(rawZ)?rawZ:1);return{x:Number(p.x)||0,z:Number(p.z)||0,forward};}
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

function addLightningSegment(THREE,group,a,b,{color=VOLT_HOT,radius=.05,opacity=.9,additive=true,marker=''}={}){
  const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,length=Math.hypot(dx,dy,dz);if(length<1e-5)return null;
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,8,6),makeMaterial(THREE,color,opacity,additive));mesh.position.set((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);mesh.scale.set(radius,radius,length*.52);mesh.rotation.set(-Math.atan2(dy,Math.hypot(dx,dz)),Math.atan2(dx,dz),0);mesh.userData.baseOpacity=opacity;if(marker)mesh.userData[marker]=true;group.add(mesh);return mesh;
}
function addLightningPath(THREE,group,points,style){for(let index=1;index<points.length;index++)addLightningSegment(THREE,group,points[index-1],points[index],style);}
function addBoltPathLayers(THREE,group,sample,{shellRadius,coreRadius,glowRadius=0,branches=true,style=false}={}){
  if(glowRadius)addLightningPath(THREE,group,sample.main,{color:VOLT,radius:glowRadius,opacity:.24,marker:'boltGlow'});
  addLightningPath(THREE,group,sample.main,{color:VOLT,radius:shellRadius,opacity:.93,marker:'boltShell'});addLightningPath(THREE,group,sample.main,{color:VOLT_HOT,radius:coreRadius,opacity:1,marker:'boltCore'});
  if(branches)for(const branch of sample.branches){if(style)addLightningPath(THREE,group,branch,{color:VOLT,radius:shellRadius*.72,opacity:.72,marker:'boltBranchGlow'});addLightningPath(THREE,group,branch,{color:VOLT_HOT,radius:coreRadius*.72,opacity:.94,marker:'boltBranch'});}
}
function finishBoltVisual(THREE,scene,group,spec,size,visualMode){group.name=`Wizard Arcana Bolt Rail ${visualMode} beat ${spec.beat}`;group.userData.visualMode=visualMode;group.scale.setScalar(size);group.renderOrder=8;scene.add(group);return group;}
function makeBoltRailContractVisual(THREE,scene,spec,size){const group=new THREE.Group(),sample=sampleBoltRailStream({beat:spec.beat,length:spec.range});addLightningPath(THREE,group,sample.main,{color:VOLT_HOT,radius:.035,opacity:.92,marker:'boltContract'});return finishBoltVisual(THREE,scene,group,spec,size,'contract');}
function makeBoltRailSourceVisual(THREE,scene,spec,size){const group=new THREE.Group(),sample=sampleBoltRailStream({beat:spec.beat,length:spec.range});addBoltPathLayers(THREE,group,sample,{shellRadius:.155,coreRadius:.066,branches:true});return finishBoltVisual(THREE,scene,group,spec,size,'source');}
function makeBoltRailStyleVisual(THREE,scene,spec,size){
  const group=new THREE.Group(),sample=sampleBoltRailStream({beat:spec.beat,length:spec.range});addBoltPathLayers(THREE,group,sample,{shellRadius:.19,coreRadius:.078,glowRadius:.30,branches:true,style:true});
  for(let index=1;index<sample.main.length-1;index+=2){const point=sample.main[index],spark=new THREE.Mesh(new THREE.SphereGeometry(.10,8,6),makeMaterial(THREE,index%4===1?VOLT_HOT:VOLT,.88,true));spark.position.set(point.x,point.y,point.z);spark.userData.baseOpacity=.88;spark.userData.boltSpark=index;group.add(spark);}
  return finishBoltVisual(THREE,scene,group,spec,size,'style');
}
function makeBoltRailVisual(THREE,scene,spec,size,visualMode='style'){return visualMode==='contract'?makeBoltRailContractVisual(THREE,scene,spec,size):visualMode==='source'?makeBoltRailSourceVisual(THREE,scene,spec,size):makeBoltRailStyleVisual(THREE,scene,spec,size);}

function finishVoltDiscVisual(scene,group,size,visualMode){group.name=`Wizard Arcana Volt Disc ${visualMode} hollow ring`;group.userData.visualMode=visualMode;group.scale.setScalar(size);group.renderOrder=8;scene.add(group);return group;}
function makeVoltDiscContractVisual(THREE,scene,size){const group=new THREE.Group(),ring=new THREE.Mesh(new THREE.TorusGeometry(.50,.055,8,30),makeMaterial(THREE,VOLT_HOT,.94,true));ring.userData.baseOpacity=.94;group.add(ring);return finishVoltDiscVisual(scene,group,size,'contract');}
function makeVoltDiscSourceVisual(THREE,scene,size){
  const group=new THREE.Group(),outer=new THREE.Mesh(new THREE.TorusGeometry(.50,.105,10,36),makeMaterial(THREE,VOLT,.92,true)),hotFace=new THREE.Mesh(new THREE.TorusGeometry(.43,.058,8,34),makeMaterial(THREE,VOLT_HOT,1,true)),lead=new THREE.Mesh(new THREE.SphereGeometry(.13,9,7),makeMaterial(THREE,VOLT_HOT,1,true));outer.userData.baseOpacity=.92;hotFace.position.z=.055;hotFace.userData.baseOpacity=1;lead.userData.baseOpacity=1;lead.userData.discLead=true;group.add(outer,hotFace,lead);
  for(let index=0;index<6;index++){const angle=index*TAU/6,fragment=new THREE.Mesh(new THREE.SphereGeometry(.055,7,5),makeMaterial(THREE,index%2?VOLT:VOLT_HOT,.88,true));fragment.position.set(Math.cos(angle)*.56,Math.sin(angle)*.56,(index%3-1)*.025);fragment.userData.baseOpacity=.88;fragment.userData.discSpark=index;group.add(fragment);}
  return finishVoltDiscVisual(scene,group,size,'source');
}
function makeVoltDiscStyleVisual(THREE,scene,size){
  const group=new THREE.Group(),corona=new THREE.Mesh(new THREE.TorusGeometry(.51,.18,10,38),makeMaterial(THREE,VOLT,.27,true)),outer=new THREE.Mesh(new THREE.TorusGeometry(.49,.115,10,38),makeMaterial(THREE,VOLT,.94,true)),hotFace=new THREE.Mesh(new THREE.TorusGeometry(.42,.065,9,36),makeMaterial(THREE,VOLT_HOT,1,true)),lead=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),makeMaterial(THREE,VOLT_HOT,1,true));corona.position.z=-.02;outer.userData.baseOpacity=.94;corona.userData.baseOpacity=.27;hotFace.position.z=.08;hotFace.userData.baseOpacity=1;lead.userData.baseOpacity=1;lead.userData.discLead=true;group.add(corona,outer,hotFace,lead);
  for(let index=0;index<10;index++){const angle=index*TAU/10,fragment=new THREE.Mesh(new THREE.SphereGeometry(index%3===0?.075:.045,8,6),makeMaterial(THREE,index%2?VOLT:VOLT_HOT,.92,true));fragment.position.set(Math.cos(angle)*(.55+(index%2)*.06),Math.sin(angle)*(.55+(index%2)*.06),-.02-(index%3)*.025);fragment.userData.baseOpacity=.92;fragment.userData.discSpark=index;group.add(fragment);}
  for(let trail=1;trail<=2;trail++){const echo=new THREE.Mesh(new THREE.TorusGeometry(.40-trail*.05,.035,7,26),makeMaterial(THREE,VOLT,.24/trail,true));echo.userData.baseOpacity=.24/trail;echo.userData.discEcho=trail;group.add(echo);}
  return finishVoltDiscVisual(scene,group,size,'style');
}
function makeVoltDiscVisual(THREE,scene,size,visualMode='style'){return visualMode==='contract'?makeVoltDiscContractVisual(THREE,scene,size):visualMode==='source'?makeVoltDiscSourceVisual(THREE,scene,size):makeVoltDiscStyleVisual(THREE,scene,size);}

function addRadialLightning(THREE,group,{count=8,radius=.9,height=.3,colorA=VOLT_HOT,colorB=VOLT,opacity=.86,marker='burstRay'}={}){
  for(let ray=0;ray<count;ray++){const angle=ray*TAU/count,twist=(ray%3-1)*.16,start={x:0,y:height,z:0},middle={x:Math.cos(angle)*radius*.48,y:height+(ray%2?.08:-.03),z:Math.sin(angle)*radius*.48},end={x:Math.cos(angle+twist)*radius,y:.12+(ray%3)*.045,z:Math.sin(angle+twist)*radius};addLightningPath(THREE,group,[start,middle,end],{color:ray%2?colorA:colorB,radius:ray%3===0?.055:.035,opacity,marker});}
}
function makeBurstBase(THREE,scene,position,size,visualMode,semanticKind){const group=new THREE.Group();group.name=`Wizard Arcana ${semanticKind} ${visualMode}`;group.userData.visualMode=visualMode;group.userData.semanticKind=semanticKind;group.userData.baseScale=size;group.position.set(position.x,Number(position.y)||0,position.z);group.scale.setScalar(size);group.renderOrder=9;scene.add(group);return group;}
function makeVoltBurstContractVisual(THREE,scene,position,size,semanticKind){const group=makeBurstBase(THREE,scene,position,size,'contract',semanticKind),ring=new THREE.Mesh(new THREE.RingGeometry(.22,.58,28),makeMaterial(THREE,VOLT_HOT,.82,true));ring.rotation.x=-Math.PI/2;ring.position.y=.08;ring.userData.baseOpacity=.82;group.add(ring);return group;}
function addScreenBurstStar(THREE,group,{reach=.72,radius=.055,opacity=.96,marker='screenBurstRay'}={}){const directions=[[-1,0,0],[1,0,0],[0,-.82,0],[0,1,0],[-.65,-.58,.05],[.65,.58,.05],[-.65,.58,-.05],[.65,-.58,-.05]];for(const [x,y,z] of directions)addLightningSegment(THREE,group,{x:0,y:0,z:0},{x:x*reach,y:y*reach,z:z*reach},{color:VOLT_HOT,radius,opacity,marker});}
function makeVoltBurstSourceVisual(THREE,scene,position,size,semanticKind){const group=makeBurstBase(THREE,scene,position,size,'source',semanticKind),ring=new THREE.Mesh(new THREE.RingGeometry(.20,.68,34),makeMaterial(THREE,VOLT,.88,true)),core=new THREE.Mesh(new THREE.SphereGeometry(.25,12,8),makeMaterial(THREE,VOLT_HOT,.96,true));ring.position.z=.04;ring.userData.baseOpacity=.88;core.userData.baseOpacity=.96;group.add(ring,core);addScreenBurstStar(THREE,group,{reach:.78,radius:.060,marker:'sourceBurstRay'});addRadialLightning(THREE,group,{count:9,radius:.88,height:0,marker:'sourceBurstDepthRay'});return group;}
function makeVoltBurstStyleVisual(THREE,scene,position,size,semanticKind){
  const wall=semanticKind==='wall-fizzle',contact=semanticKind==='contact',group=makeBurstBase(THREE,scene,position,size,'style',semanticKind),rings=wall?1:3;
  for(let index=0;index<rings;index++){const opacity=wall ? .52 : .82-index*.12,ring=new THREE.Mesh(new THREE.RingGeometry(.14+index*.16,.42+index*.17,36),makeMaterial(THREE,index===0?VOLT_HOT:VOLT,opacity,true));ring.position.z=index*.025;ring.userData.baseOpacity=opacity;group.add(ring);}
  if(!wall){for(let index=0;index<(contact?2:3);index++){const core=new THREE.Mesh(new THREE.SphereGeometry(.22+index*.10,12,8),makeMaterial(THREE,index===0?VOLT_HOT:VOLT,.88-index*.20,true));core.position.z=-index*.04;core.userData.baseOpacity=.88-index*.20;group.add(core);}addScreenBurstStar(THREE,group,{reach:contact?.92:1.12,radius:.075,marker:'styleBurstScreenRay'});addRadialLightning(THREE,group,{count:contact?12:16,radius:contact ? .92 : 1.18,height:0,opacity:.82,marker:'styleBurstDepthRay'});}
  else addRadialLightning(THREE,group,{count:5,radius:.48,opacity:.48,marker:'wallFizzleRay'});
  return group;
}
function makeVoltBurstVisual(THREE,scene,position,size,visualMode,semanticKind){return visualMode==='contract'?makeVoltBurstContractVisual(THREE,scene,position,size,semanticKind):visualMode==='source'?makeVoltBurstSourceVisual(THREE,scene,position,size,semanticKind):makeVoltBurstStyleVisual(THREE,scene,position,size,semanticKind);}
function addBoltImpactStar(THREE,group,{style=false,finisher=false}={}){
  const reach=finisher?.92:.64,directions=[[-1,0,0],[1,0,0],[0,-.8,0],[0,1,0],[-.65,-.58,.06],[.65,.58,.06],[-.65,.58,-.06],[.65,-.58,-.06]];
  for(let index=0;index<directions.length;index++){const [x,y,z]=directions[index],end={x:x*reach,y:y*reach,z:z*reach};addLightningSegment(THREE,group,{x:0,y:0,z:0},end,{color:index%3===0?VOLT:VOLT_HOT,radius:style?.075:.060,opacity:.98,marker:style?'boltImpactStyleRay':'boltImpactSourceRay'});}
  if(style)addRadialLightning(THREE,group,{count:finisher?14:10,radius:reach*.92,height:0,colorA:VOLT_HOT,colorB:VOLT,opacity:.74,marker:'boltImpactGroundRay'});
}
function makeBoltImpactContractVisual(THREE,scene,position,size,finisher){const group=makeBurstBase(THREE,scene,position,size, 'contract',finisher?'bolt-finisher':'bolt-impact'),core=new THREE.Mesh(new THREE.SphereGeometry(finisher?.22:.15,10,7),makeMaterial(THREE,VOLT_HOT,.96,true));core.userData.baseOpacity=.96;group.add(core);return group;}
function makeBoltImpactSourceVisual(THREE,scene,position,size,finisher){const group=makeBurstBase(THREE,scene,position,size,'source',finisher?'bolt-finisher':'bolt-impact'),core=new THREE.Mesh(new THREE.SphereGeometry(finisher?.34:.24,12,8),makeMaterial(THREE,VOLT_HOT,1,true));core.userData.baseOpacity=1;group.add(core);addBoltImpactStar(THREE,group,{finisher});return group;}
function makeBoltImpactStyleVisual(THREE,scene,position,size,finisher){const group=makeBurstBase(THREE,scene,position,size,'style',finisher?'bolt-finisher':'bolt-impact'),glow=new THREE.Mesh(new THREE.SphereGeometry(finisher?.54:.38,12,8),makeMaterial(THREE,VOLT,.30,true)),core=new THREE.Mesh(new THREE.SphereGeometry(finisher?.32:.22,12,8),makeMaterial(THREE,VOLT_HOT,1,true));glow.userData.baseOpacity=.30;core.userData.baseOpacity=1;group.add(glow,core);addBoltImpactStar(THREE,group,{style:true,finisher});return group;}
function makeBoltImpactVisual(THREE,scene,position,size,visualMode,finisher=false){const scaled=size*(finisher?1.12:.72);return visualMode==='contract'?makeBoltImpactContractVisual(THREE,scene,position,scaled,finisher):visualMode==='source'?makeBoltImpactSourceVisual(THREE,scene,position,scaled,finisher):makeBoltImpactStyleVisual(THREE,scene,position,scaled,finisher);}

export function installWizardNextSourceRuntime({THREE,scene,getPlayer,getEnemySystem,getMazeSegments=()=>[],advancePlayer=()=>false}={}){
  const initial=readArcanaTweaks();
  if(!THREE||!scene||!isEnemyLabRuntime())return{state:{effects:[],sizeMultiplier:initial.sizeMultiplier},canPlay(){return false;},play(){return false;},cast(){return false;},snapshot(){return{simulationTime:0,effects:[],semanticEvents:[],voltDiscCombo:{active:false,press:0,total:VOLT_DISC_COMBO.presses,remaining:0}};},update(){},reset(){},dispose(){}};
  const state={effects:[],sizeMultiplier:initial.sizeMultiplier,elapsed:0,castSerial:0,lastCast:null,semanticSerial:0,semanticEvents:[],boltComboSerial:0,voltComboPress:0,voltComboRemaining:0,voltComboSerial:0,visualMode:'style'};
  const add=effect=>(state.effects.push(effect),effect);
  function remove(effect){if(effect.mesh)disposeObject(effect.mesh);for(const mesh of effect.meshes||[])disposeObject(mesh);for(const flash of effect.flashes||[])disposeObject(flash);const index=state.effects.indexOf(effect);if(index>=0)state.effects.splice(index,1);}
  function reset(){for(const effect of[...state.effects])remove(effect);state.elapsed=0;state.castSerial=0;state.lastCast=null;state.semanticSerial=0;state.semanticEvents.length=0;state.boltComboSerial=0;state.voltComboPress=0;state.voltComboRemaining=0;state.voltComboSerial=0;state.visualMode='style';}
  function currentSize(){return clampArcanaSize(state.sizeMultiplier);}
  function targetId(enemy,system){const explicit=enemy?.__abilityCaptureDummyId??enemy?.id??enemy?.spawnId;if(explicit!==undefined&&explicit!==null)return String(explicit);const index=system?.enemies?.indexOf?.(enemy)??-1;return`enemy-${Math.max(0,index)}`;}
  function semantic(kind,detail={}){
    const entry=Object.freeze({serial:++state.semanticSerial,time:Number(state.elapsed.toFixed(6)),kind,...detail});
    state.semanticEvents.push(entry);if(state.semanticEvents.length>96)state.semanticEvents.shift();
    window.dispatchEvent(new CustomEvent(WIZARD_NEXT_SOURCE_SEMANTIC_EVENT,{detail:entry}));return entry;
  }
  function advance(frame,distance){const allowed=safeAdvanceDistance(frame,distance,getMazeSegments?.()||[]);if(allowed>0)advancePlayer?.(frame.forward.x*allowed,frame.forward.z*allowed);return allowed;}
  function damageStrip(frame,{range,halfWidth,damage,push,sourceTag},size){const system=getEnemySystem?.(),flashes=[];if(!system)return flashes;for(const enemy of aliveEnemies(system)){if(!pointInForwardStrip({originX:frame.x,originZ:frame.z,forwardX:frame.forward.x,forwardZ:frame.forward.z,targetX:enemy.x,targetZ:enemy.z,range:range*size,halfWidth:halfWidth*size,targetRadius:enemyRadius(enemy,system)}))continue;const direction=normalize2(enemy.x-frame.x,enemy.z-frame.z);system.damageEnemy?.(enemy,damage,{x:direction.x*push,z:direction.z*push},{source:'wizardArcana',power:.42,pop:.09,[sourceTag]:true});flashes.push(makeImpactFlash(THREE,scene,enemy.x,enemyCenterY(enemy,system),enemy.z,size));}return flashes;}
  function damageArc(frame,{radius,halfAngle,damage,push,shock=false},size){const system=getEnemySystem?.(),flashes=[];if(!system)return flashes;for(const enemy of aliveEnemies(system)){if(!pointInForwardArc({originX:frame.x,originZ:frame.z,forwardX:frame.forward.x,forwardZ:frame.forward.z,targetX:enemy.x,targetZ:enemy.z,radius:radius*size,halfAngle,targetRadius:enemyRadius(enemy,system)}))continue;const direction=normalize2(enemy.x-frame.x,enemy.z-frame.z);system.damageEnemy?.(enemy,damage,{x:direction.x*push,z:direction.z*push},{source:'wizardArcana',power:.46,pop:.11,sparkContactArc:true,shock});flashes.push(makeImpactFlash(THREE,scene,enemy.x,enemyCenterY(enemy,system),enemy.z,size,SPARK_HOT));}return flashes;}

  function emitEarthPunch(beat){let frame=playerFrame(getPlayer);const spec=earthKnucklesBeatSpec({beat}),size=currentSize();advance(frame,spec.advance);frame=playerFrame(getPlayer);const side=beat===1?-1:1,mesh=makeEarthFist(THREE,scene,spec,side,size);mesh.position.set(frame.x,0,frame.z);mesh.rotation.y=Math.atan2(frame.forward.x,frame.forward.z);add({type:'earthPunch',age:0,life:spec.life,mesh,spec,size,frame,hitDone:false,flashes:[]});}
  function emitVine(beat){const frame=playerFrame(getPlayer),spec=bladedVineBeatSpec({beat}),size=currentSize(),mesh=makeVineVisual(THREE,scene,spec,size);mesh.position.set(frame.x,0,frame.z);mesh.rotation.y=Math.atan2(frame.forward.x,frame.forward.z)-spec.sweepSign*.42;const flashes=damageStrip(frame,{range:spec.range,halfWidth:spec.halfWidth,damage:spec.damage,push:beat===3?.85:.42,sourceTag:'bladedVine'},size);add({type:'vineStrike',age:0,life:spec.life,mesh,spec,size,frame,baseYaw:Math.atan2(frame.forward.x,frame.forward.z),flashes});}
  function emitStone(beat){const frame=playerFrame(getPlayer),spec=stoneShotProjectileSpec({beat}),size=currentSize(),visual=makeStoneProjectile(THREE,scene,spec,size);const position={x:frame.x+frame.forward.x*.9,z:frame.z+frame.forward.z*.9};visual.mesh.position.set(position.x,.62+(spec.boulder?.16:0),position.z);visual.shadow.position.set(position.x,.025,position.z);add({type:'stoneProjectile',age:0,position,previous:{...position},direction:{...frame.forward},velocity:{x:frame.forward.x*spec.speed,z:frame.forward.z*spec.speed},distance:0,spec,size,mesh:visual.mesh,meshes:[visual.shadow],shadow:visual.shadow,walls:[...(getMazeSegments?.()||[])],hit:new Set()});}
  function emitSpark(beat){let frame=playerFrame(getPlayer);const spec=sparkContactBeatSpec({beat}),size=currentSize();advance(frame,spec.advance);frame=playerFrame(getPlayer);const mesh=makeSparkStrike(THREE,scene,spec,size);mesh.position.set(frame.x,0,frame.z);mesh.rotation.y=Math.atan2(frame.forward.x,frame.forward.z);const flashes=damageStrip(frame,{range:spec.range,halfWidth:spec.halfWidth,damage:spec.damage,push:spec.push,sourceTag:'sparkContact'},size),meshes=[];if(spec.overlay){const arc=makeSparkArc(THREE,scene,spec,size);arc.position.set(frame.x,0,frame.z);arc.rotation.y=Math.atan2(frame.forward.x,frame.forward.z);meshes.push(arc);flashes.push(...damageArc(frame,spec.overlay,size));}add({type:'sparkStrike',age:0,life:spec.life,mesh,meshes,flashes,spec,size});}
  function emitBoltRail(beat,comboEffect={}){
    const frame=playerFrame(getPlayer),spec=boltRailStreamSpec({beat}),size=currentSize(),visualMode=currentWizardVisualMode(),system=getEnemySystem?.(),hits=[];
    const comboStableId=comboEffect.stableId||`BOLT-RAIL:${String(state.boltComboSerial||1).padStart(4,'0')}`,stableId=`${comboStableId}:stream:${String(spec.beat).padStart(2,'0')}`;
    state.visualMode=visualMode;
    for(const enemy of aliveEnemies(system)){if(pointInForwardStrip({originX:frame.x,originZ:frame.z,forwardX:frame.forward.x,forwardZ:frame.forward.z,targetX:enemy.x,targetZ:enemy.z,range:spec.range*size,halfWidth:spec.halfWidth*size,targetRadius:enemyRadius(enemy,system)}))hits.push(enemy);}
    const endpointTarget=hits.length?hits.reduce((farthest,enemy)=>Math.hypot(enemy.x-frame.x,enemy.z-frame.z)>Math.hypot(farthest.x-frame.x,farthest.z-frame.z)?enemy:farthest):null;
    const endpoint=endpointTarget?{x:endpointTarget.x,z:endpointTarget.z}:{x:frame.x+frame.forward.x*spec.range*size,z:frame.z+frame.forward.z*spec.range*size},visualDirection=normalize2(endpoint.x-frame.x,endpoint.z-frame.z),visualRange=Math.max(.35,Math.hypot(endpoint.x-frame.x,endpoint.z-frame.z)/size),visualSpec={...spec,range:visualRange},mesh=makeBoltRailVisual(THREE,scene,visualSpec,size,visualMode);
    mesh.position.set(frame.x,0,frame.z);mesh.rotation.y=Math.atan2(visualDirection.x,visualDirection.z);
    const hitTargetIds=hits.map(enemy=>targetId(enemy,system)),meshes=[];let finisherTriggered=false;
    for(const enemy of hits){const direction=normalize2(enemy.x-frame.x,enemy.z-frame.z);system.damageEnemy?.(enemy,spec.damage,{x:direction.x*.22,z:direction.z*.22},{source:'wizardArcana',power:.20,pop:.025,boltRail:true,beat});meshes.push(makeBoltImpactVisual(THREE,scene,{x:enemy.x,y:enemyCenterY(enemy,system),z:enemy.z},size,visualMode,false));}
    semantic('bolt-rail-stream',{arcanaId:'BOLT-RAIL',stableId,comboStableId,beat:spec.beat,damage:spec.damage,instantaneous:true,ignoresWorldCollision:true,origin:{x:frame.x,z:frame.z},direction:{...frame.forward},endpoint,endpointTargetId:endpointTarget?targetId(endpointTarget,system):null,endpointPolicy:hits.length?'farthest-hit':'maximum-range',visualDirection,visualRange,branchCount:sampleBoltRailStream({beat:spec.beat,length:visualRange}).branches.length,hitTargetIds,visualMode});
    if(spec.finisher&&hits.length){
      finisherTriggered=true;const primary=hits.reduce((best,enemy)=>Math.hypot(enemy.x-frame.x,enemy.z-frame.z)<Math.hypot(best.x-frame.x,best.z-frame.z)?enemy:best),position={x:primary.x,z:primary.z},burstTargets=[];
      meshes.push(makeBoltImpactVisual(THREE,scene,{...position,y:enemyCenterY(primary,system)},spec.burst.radius*size,visualMode,true));
      for(const enemy of aliveEnemies(system)){if(Math.hypot(enemy.x-position.x,enemy.z-position.z)>spec.burst.radius*size+enemyRadius(enemy,system))continue;burstTargets.push(targetId(enemy,system));const direction=normalize2(enemy.x-position.x,enemy.z-position.z);system.damageEnemy?.(enemy,spec.burst.damage,{x:direction.x*.72,z:direction.z*.72},{source:'wizardArcana',power:.44,pop:.10,boltRailFinisher:true});}
      semantic('bolt-rail-finisher',{arcanaId:'BOLT-RAIL',stableId:`${comboStableId}:finisher`,comboStableId,beat:5,triggered:true,primaryTargetId:targetId(primary,system),primaryPolicy:'nearest-hit',damage:spec.burst.damage,targetIds:burstTargets,position,visualMode});
    }else if(spec.finisher)semantic('bolt-rail-finisher',{arcanaId:'BOLT-RAIL',stableId:`${comboStableId}:finisher`,comboStableId,beat:5,triggered:false,reason:'fifth-stream-missed',damage:0,targetIds:[],visualMode});
    add({type:'boltRailStrike',arcanaId:'BOLT-RAIL',stableId,comboStableId,semanticKind:'instant-stream',visualMode,age:0,life:spec.finisher?.24:spec.life,mesh,meshes,spec,size,beat:spec.beat,origin:{x:frame.x,z:frame.z},direction:{...frame.forward},visualDirection,endpoint,endpointTargetId:endpointTarget?targetId(endpointTarget,system):null,endpointPolicy:hits.length?'farthest-hit':'maximum-range',visualRange,hitTargetIds,finisherTriggered});
  }
  function emitVoltDisc(press,comboSerial,comboStableId=`VOLT-DISC:${String(comboSerial).padStart(4,'0')}`){
    const frame=playerFrame(getPlayer),spec=voltDiscProjectileSpec(),size=currentSize(),visualMode=currentWizardVisualMode(),mesh=makeVoltDiscVisual(THREE,scene,size,visualMode),position={x:frame.x+frame.forward.x*.88,z:frame.z+frame.forward.z*.88};
    const stableId=`${comboStableId}:disc:${String(press).padStart(2,'0')}`;
    state.visualMode=visualMode;mesh.position.set(position.x,.84*size,position.z);mesh.children.forEach(child=>{if(child.userData?.discLead)child.position.set(frame.forward.x*.50,0,frame.forward.z*.50);if(Number.isFinite(child.userData?.discEcho)){const distance=.20*child.userData.discEcho;child.position.set(-frame.forward.x*distance,0,-frame.forward.z*distance);}});
    semantic('volt-disc-press',{arcanaId:'VOLT-DISC',stableId,comboStableId,press,total:spec.comboPresses,comboSerial,rollingTimeout:spec.rollingTimeout,origin:{x:frame.x,z:frame.z},direction:{...frame.forward},liveAim:true,visualMode});
    add({type:'voltDiscProjectile',arcanaId:'VOLT-DISC',stableId,comboStableId,semanticKind:'carrier',visualMode,age:0,press,comboSerial,position,previous:{...position},origin:{x:frame.x,z:frame.z},direction:{...frame.forward},velocity:{x:frame.forward.x*spec.speed,z:frame.forward.z*spec.speed},distance:0,spec,size,mesh,walls:[...(getMazeSegments?.()||[])]});
  }
  function emitVoltBurst(position,size,{kind,primary=null,press=0,comboSerial=0,stableId='',comboStableId='',visualMode='style'}={}){
    const spec=voltDiscProjectileSpec(),system=getEnemySystem?.(),contact=kind==='contact',wall=kind==='wall-fizzle',mesh=makeVoltBurstVisual(THREE,scene,position,(wall ? .52 : 1)*spec.burstRadius*size,visualMode,kind),targetIds=[];
    const burstStableId=`${stableId||`VOLT-DISC:${String(comboSerial).padStart(4,'0')}:disc:${String(press).padStart(2,'0')}`}:${kind}`;
    if(kind==='terminal')for(const enemy of aliveEnemies(system)){if(Math.hypot(enemy.x-position.x,enemy.z-position.z)>spec.burstRadius*size+enemyRadius(enemy,system))continue;targetIds.push(targetId(enemy,system));const direction=normalize2(enemy.x-position.x,enemy.z-position.z);system.damageEnemy?.(enemy,spec.missBurstDamage,{x:direction.x*.62,z:direction.z*.62},{source:'wizardArcana',power:.38,pop:.08,voltDiscBurst:true,terminal:true});}
    if(contact&&primary)targetIds.push(targetId(primary,system));
    semantic(kind==='terminal'?'volt-disc-terminal-burst':contact?'volt-disc-contact-event':'volt-disc-wall-fizzle',{arcanaId:'VOLT-DISC',stableId:burstStableId,comboStableId,press,comboSerial,position:{x:position.x,z:position.z},damage:kind==='terminal'?spec.missBurstDamage:0,targetIds,countsAsContact:contact,ordinaryDamageSideEffects:false,harmless:wall,visualMode});
    add({type:'voltDiscBurst',arcanaId:'VOLT-DISC',stableId:burstStableId,comboStableId,semanticKind:kind,visualMode,age:0,life:wall?.16:.30,mesh,direct:contact,harmless:wall,press,comboSerial,position:{...position},damage:kind==='terminal'?spec.missBurstDamage:0,targetIds});
  }
  function pressVoltDisc(detail={}){
    if(state.voltComboPress<=0||state.voltComboRemaining<=0||state.voltComboPress>=VOLT_DISC_COMBO.presses){state.voltComboPress=0;state.voltComboSerial++;const comboStableId=`VOLT-DISC:${String(state.voltComboSerial).padStart(4,'0')}`;semantic('volt-disc-combo-start',{arcanaId:'VOLT-DISC',stableId:comboStableId,comboStableId,comboSerial:state.voltComboSerial,total:VOLT_DISC_COMBO.presses,rollingTimeout:VOLT_DISC_COMBO.rollingTimeout});}
    state.voltComboPress++;state.voltComboRemaining=VOLT_DISC_COMBO.rollingTimeout;const press=state.voltComboPress,comboSerial=state.voltComboSerial,comboStableId=`VOLT-DISC:${String(comboSerial).padStart(4,'0')}`;
    emitVoltDisc(press,comboSerial,comboStableId);
    if(press>=VOLT_DISC_COMBO.presses){semantic('volt-disc-combo-complete',{arcanaId:'VOLT-DISC',stableId:comboStableId,comboStableId,comboSerial,press,total:VOLT_DISC_COMBO.presses,deckSequence:detail?.sequence||null});state.voltComboPress=0;state.voltComboRemaining=0;}
    return true;
  }
  function startCombo(type){const life=type==='earthCombo'?1.05:type==='vineCombo'?.92:type==='stoneCombo'?.96:type==='sparkCombo'?.72:.76,stableId=type==='boltRailCombo'?`BOLT-RAIL:${String(++state.boltComboSerial).padStart(4,'0')}`:'';add({type,...(stableId?{arcanaId:'BOLT-RAIL',stableId}:{}),age:0,nextBeat:0,life});}
  function updateCombo(effect,dt,beats,emit){effect.age+=dt;while(effect.nextBeat<beats.length&&effect.age>=beats[effect.nextBeat].time){emit(beats[effect.nextBeat].beat,effect);effect.nextBeat++;}if(effect.nextBeat>=beats.length&&effect.age>=effect.life)remove(effect);}
  function updateEarthPunch(effect,dt){effect.age+=dt;const k=clamp(effect.age/effect.life,0,1),extension=Math.sin(k*Math.PI);effect.mesh.scale.set(effect.size*effect.spec.scale,effect.size*effect.spec.scale,Math.max(.02,extension)*effect.size*effect.spec.scale);if(!effect.hitDone&&k>=.38){effect.hitDone=true;effect.flashes.push(...damageStrip(effect.frame,{range:effect.spec.reach,halfWidth:effect.spec.width,damage:effect.spec.damage,push:effect.spec.push,sourceTag:'earthKnuckles'},effect.size));}for(const flash of effect.flashes){flash.material.opacity=.96*Math.pow(1-k,.35);flash.scale.setScalar(1+k*2.2);}if(k>=1)remove(effect);}
  function updateVine(effect,dt,now){effect.age+=dt;const k=clamp(effect.age/effect.life,0,1),ease=1-Math.pow(1-k,3),frame=playerFrame(getPlayer);effect.mesh.position.set(frame.x,0,frame.z);effect.mesh.rotation.y=effect.baseYaw+effect.spec.sweepSign*(ease-.5)*.82;effect.mesh.scale.z=Math.max(.08,Math.sin(k*Math.PI))*effect.size;effect.mesh.children.forEach((child,index)=>{child.material.opacity=.94*Math.pow(1-k,.48);child.rotation.y+=dt*(index%2?2.1:-1.7);});for(const flash of effect.flashes){flash.material.opacity=.96*Math.pow(1-k,.35);flash.scale.setScalar(1+k*1.8);}if(k>=1)remove(effect);}
  function updateStone(effect,dt,now){effect.age+=dt;const start={...effect.position},end={x:start.x+effect.velocity.x*dt,z:start.z+effect.velocity.z*dt};const wall=firstWallHit(start,end,effect.walls);if(wall){remove(effect);return;}effect.position=end;effect.distance+=Math.hypot(end.x-start.x,end.z-start.z);effect.mesh.position.set(end.x,.62+(effect.spec.boulder?.16:0)+Math.sin(now*12)*.04,end.z);effect.mesh.rotation.x+=dt*5.5;effect.mesh.rotation.y+=dt*4.2;effect.shadow.position.set(end.x,.025,end.z);const system=getEnemySystem?.();for(const enemy of aliveEnemies(system)){if(effect.hit.has(enemy))continue;if(pointSegmentDistance2D(enemy,start,end)>enemyRadius(enemy,system)+effect.spec.radius*effect.size)continue;effect.hit.add(enemy);const direction=normalize2(enemy.x-start.x,enemy.z-start.z);system.damageEnemy?.(enemy,effect.spec.damage,{x:direction.x*effect.spec.push,z:direction.z*effect.spec.push},{source:'wizardArcana',power:effect.spec.boulder?.62:.46,pop:effect.spec.boulder?.16:.10,stoneShot:true,boulder:effect.spec.boulder});const flash=makeImpactFlash(THREE,scene,enemy.x,enemyCenterY(enemy,system),enemy.z,effect.size*(effect.spec.boulder?1.5:1));add({type:'impactOnly',age:0,life:.24,mesh:flash});remove(effect);return;}if(effect.distance>=effect.spec.range)remove(effect);}
  function updateSpark(effect,dt){effect.age+=dt;const k=clamp(effect.age/effect.life,0,1);for(const object of[effect.mesh,...effect.meshes])object?.traverse?.(child=>{if(child.material)child.material.opacity=(child.userData?.baseOpacity??.78)*Math.pow(1-k,.42);});for(const flash of effect.flashes){flash.material.opacity=.96*Math.pow(1-k,.35);flash.scale.setScalar(1+k*1.7);}if(k>=1)remove(effect);}
  function updateBoltRail(effect,dt){effect.age+=dt;const k=clamp(effect.age/effect.life,0,1);for(const object of[effect.mesh,...effect.meshes])object?.traverse?.(child=>{if(child.material)child.material.opacity=(child.userData?.baseOpacity??.78)*Math.pow(1-k,.4);});effect.mesh.scale.set(effect.size,effect.size*(.82+.24*Math.sin(k*Math.PI)),effect.size);if(k>=1)remove(effect);}
  function updateVoltDisc(effect,dt,now){
    const start={...effect.position},end={x:start.x+effect.velocity.x*dt,z:start.z+effect.velocity.z*dt},wall=firstWallHit(start,end,effect.walls);
    if(wall){emitVoltBurst({x:wall.hit.x,y:.32*effect.size,z:wall.hit.z},effect.size,{kind:'wall-fizzle',press:effect.press,comboSerial:effect.comboSerial,stableId:effect.stableId,comboStableId:effect.comboStableId,visualMode:effect.visualMode});remove(effect);return;}
    effect.age+=dt;effect.position=end;effect.distance+=Math.hypot(end.x-start.x,end.z-start.z);effect.mesh.position.set(end.x,.84*effect.size+Math.sin(now*14)*.04,end.z);effect.mesh.children.forEach(child=>{if(Number.isFinite(child.userData?.discSpark)){const pulse=.82+.25*Math.sin(now*19+child.userData.discSpark);child.scale.setScalar(pulse);}});
    const system=getEnemySystem?.();
    for(const enemy of aliveEnemies(system)){
      if(pointSegmentDistance2D(enemy,start,end)>enemyRadius(enemy,system)+effect.spec.radius*effect.size)continue;
      system.damageEnemy?.(enemy,effect.spec.damage,{x:effect.direction.x*.72,z:effect.direction.z*.72},{source:'wizardArcana',power:.36,pop:.08,voltDisc:true,press:effect.press,comboSerial:effect.comboSerial});
      semantic('volt-disc-carrier-hit',{arcanaId:'VOLT-DISC',stableId:effect.stableId,comboStableId:effect.comboStableId,press:effect.press,comboSerial:effect.comboSerial,targetId:targetId(enemy,system),damage:effect.spec.damage,position:{x:enemy.x,z:enemy.z},visualMode:effect.visualMode});
      emitVoltBurst({x:enemy.x,y:enemyCenterY(enemy,system),z:enemy.z},effect.size,{kind:'contact',primary:enemy,press:effect.press,comboSerial:effect.comboSerial,stableId:effect.stableId,comboStableId:effect.comboStableId,visualMode:effect.visualMode});remove(effect);return;
    }
    if(effect.distance>=effect.spec.range){emitVoltBurst({...effect.position,y:.48*effect.size},effect.size,{kind:'terminal',press:effect.press,comboSerial:effect.comboSerial,stableId:effect.stableId,comboStableId:effect.comboStableId,visualMode:effect.visualMode});remove(effect);}
  }
  function updateLightningBurst(effect,dt){effect.age+=dt;const k=clamp(effect.age/effect.life,0,1),base=Number(effect.mesh.userData?.baseScale)||1,growth=effect.harmless ? .42 : effect.direct ? .9 : 1.35;effect.mesh.traverse(child=>{if(child.material)child.material.opacity=(child.userData?.baseOpacity??.82)*Math.pow(1-k,.42);});effect.mesh.scale.setScalar(base*(1+k*growth));effect.mesh.rotation.y+=dt*2.7;if(k>=1)remove(effect);}
  function updateImpact(effect,dt){effect.age+=dt;const k=clamp(effect.age/effect.life,0,1);effect.mesh.material.opacity=.96*Math.pow(1-k,.35);effect.mesh.scale.setScalar(1+k*2);if(k>=1)remove(effect);}

  function cast(card,detail={}){
    const id=card?.arcanaId;let casted=true;
    if(id==='EARTH-KNUCKLES')startCombo('earthCombo');else if(id==='BLADED-VINE')startCombo('vineCombo');else if(id==='STONE-SHOT')startCombo('stoneCombo');else if(id==='SPARK-CONTACT')startCombo('sparkCombo');else if(id==='BOLT-RAIL')startCombo('boltRailCombo');else if(id==='VOLT-DISC')casted=pressVoltDisc(detail);else casted=false;
    if(casted){state.castSerial++;state.lastCast=id;}return casted;
  }
  const canPlayIds=new Set(['EARTH-KNUCKLES','BLADED-VINE','STONE-SHOT','SPARK-CONTACT','BOLT-RAIL','VOLT-DISC']);
  function canPlay(card){return canPlayIds.has(card?.arcanaId);}
  function play(card,context={}){return canPlay(card)?cast(card,context):false;}
  function effectSnapshot(effect){
    const value={type:effect.type,semanticKind:effect.semanticKind||'',visualMode:effect.visualMode||'',age:Number(effect.age)||0};
    for(const key of['arcanaId','stableId','comboStableId'])if(effect[key]!==undefined)value[key]=effect[key];
    for(const key of['life','distance','beat','press','comboSerial','damage','visualRange'])if(Number.isFinite(Number(effect[key])))value[key]=Number(effect[key]);
    for(const key of['position','previous','origin','direction','velocity','endpoint','visualDirection'])if(effect[key])value[key]={x:Number(effect[key].x)||0,z:Number(effect[key].z)||0};
    for(const key of['endpointTargetId','endpointPolicy'])if(effect[key]!==undefined)value[key]=effect[key];
    if(Array.isArray(effect.hitTargetIds))value.hitTargetIds=effect.hitTargetIds.slice();if(Array.isArray(effect.targetIds))value.targetIds=effect.targetIds.slice();
    if(typeof effect.finisherTriggered==='boolean')value.finisherTriggered=effect.finisherTriggered;if(typeof effect.harmless==='boolean')value.harmless=effect.harmless;return value;
  }
  function snapshot(){return{simulationTime:state.elapsed,castSerial:state.castSerial,lastCast:state.lastCast,visualMode:state.visualMode,voltDiscCombo:{active:state.voltComboPress>0&&state.voltComboRemaining>0,press:state.voltComboPress,total:VOLT_DISC_COMBO.presses,remaining:state.voltComboRemaining,serial:state.voltComboSerial},effects:state.effects.map(effectSnapshot),semanticEvents:state.semanticEvents.map(event=>({...event}))};}
  const onPlay=event=>play(event?.detail?.card,event?.detail||{});
  const onTweaks=event=>{state.sizeMultiplier=clampArcanaSize(event?.detail?.sizeMultiplier);};
  window.addEventListener('wizard-arcana:play',onPlay);window.addEventListener(ARCANA_TWEAKS_EVENT,onTweaks);
  return{state,cast,canPlay,play,snapshot,reset,update(dt,now=0){
    const frame=Math.max(0,Number(dt)||0),time=Number(now)||0;state.elapsed+=frame;
    if(state.voltComboPress>0&&state.voltComboRemaining>0){state.voltComboRemaining=Math.max(0,state.voltComboRemaining-frame);if(state.voltComboRemaining<=0){const comboStableId=`VOLT-DISC:${String(state.voltComboSerial).padStart(4,'0')}`;semantic('volt-disc-combo-expired',{arcanaId:'VOLT-DISC',stableId:comboStableId,comboStableId,comboSerial:state.voltComboSerial,press:state.voltComboPress,total:VOLT_DISC_COMBO.presses});state.voltComboPress=0;}}
    for(const effect of[...state.effects]){if(effect.type==='earthCombo')updateCombo(effect,frame,EARTH_KNUCKLES_BEATS,emitEarthPunch);else if(effect.type==='vineCombo')updateCombo(effect,frame,BLADED_VINE_BEATS,emitVine);else if(effect.type==='stoneCombo')updateCombo(effect,frame,STONE_SHOT_BEATS,emitStone);else if(effect.type==='sparkCombo')updateCombo(effect,frame,SPARK_CONTACT_BEATS,emitSpark);else if(effect.type==='boltRailCombo')updateCombo(effect,frame,BOLT_RAIL_BEATS,emitBoltRail);else if(effect.type==='earthPunch')updateEarthPunch(effect,frame);else if(effect.type==='vineStrike')updateVine(effect,frame,time);else if(effect.type==='stoneProjectile')updateStone(effect,frame,time);else if(effect.type==='sparkStrike')updateSpark(effect,frame);else if(effect.type==='boltRailStrike')updateBoltRail(effect,frame);else if(effect.type==='voltDiscProjectile')updateVoltDisc(effect,frame,time);else if(effect.type==='lightningBurst'||effect.type==='voltDiscBurst')updateLightningBurst(effect,frame);else if(effect.type==='impactOnly')updateImpact(effect,frame);}
  },dispose(){window.removeEventListener('wizard-arcana:play',onPlay);window.removeEventListener(ARCANA_TWEAKS_EVENT,onTweaks);reset();}};
}
