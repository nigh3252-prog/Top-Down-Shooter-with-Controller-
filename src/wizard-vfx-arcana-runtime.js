import {
  ARCANA_TWEAKS_EVENT,
  clampArcanaSize,
  readArcanaTweaks,
} from './wizard-arcana-settings.js';
import { getArenaRuntimeConfig } from './arena-runtime-context.js';

const TAU=Math.PI*2;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const sat=value=>clamp(Number(value)||0,0,1);
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=value=>{const t=sat(value);return t*t*(3-2*t);};
const easeOut=value=>1-Math.pow(1-sat(value),3);
const rnd=(index,salt)=>{const value=Math.sin(index*127.1+salt*311.7)*43758.5453;return value-Math.floor(value);};

const PAL=Object.freeze({
  water:Object.freeze({deep:0x164e78,mid:0x2e86b7,base:0x65bddd,hi:0xb7f1f1,foam:0xf4ffff}),
  breaker:Object.freeze({deep:0x425a69,mid:0x759dad,base:0xa5cbd0,hi:0xd8f2ed,foam:0xffffff}),
  fire:Object.freeze({deep:0x7b2415,mid:0xc84b20,base:0xf0782b,hi:0xffc34d,foam:0xffffd2}),
  air:Object.freeze({deep:0x536e78,mid:0x8faeb4,base:0xc8eef0,hi:0xf4ffff,foam:0xffffff}),
  earth:Object.freeze({deep:0x4a3316,mid:0x63481f,base:0x74562a,hi:0x9b7a47,foam:0xf6e6b5}),
  stone:Object.freeze({deep:0x302b22,mid:0x655942,base:0xa49470,hi:0xe3d2a5,foam:0xffffff}),
});

const VFX_IDS=Object.freeze(new Set([
  'FLAME-BREATH','SEARING-CROWN','IGNITION-DRIVE','ENGULFING-FISSURE','DRAGON-BLAST',
  'SHEARING-CHAIN','TECTONIC-DRILL','ROCK-SOLID-TOMAHAWK','AQUA-VORTEX','AQUA-BREAKER',
]));

export const WIZARD_VFX_ARCANA_SPECS=Object.freeze({
  'FLAME-BREATH':Object.freeze({life:.82,damage:18,hits:3}),
  'SEARING-CROWN':Object.freeze({life:1.34,tickDamage:5,ticks:5,finisherDamage:20}),
  'IGNITION-DRIVE':Object.freeze({life:1.45,beats:5,carryDamage:10,finisherDamage:30}),
  'ENGULFING-FISSURE':Object.freeze({life:8.35,trapCount:3,tickDamage:5,ticks:5}),
  'DRAGON-BLAST':Object.freeze({life:1.45,pullDamage:8,pulls:5,finisherDamage:24}),
  'SHEARING-CHAIN':Object.freeze({life:1.28,slashes:6,slashDamage:7,finisherDamage:15}),
  'TECTONIC-DRILL':Object.freeze({life:1.42,damage:10,speed:9.4}),
  'ROCK-SOLID-TOMAHAWK':Object.freeze({life:1.86,damage:15}),
  'AQUA-VORTEX':Object.freeze({life:.78,damage:8,ticks:3}),
  'AQUA-BREAKER':Object.freeze({life:3.60,charge:1.90,entryDamage:15,passDamage:10,finisherDamage:35}),
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

function material(THREE,color,opacity=.8,{additive=true,depthWrite=false}={}){
  return new THREE.MeshBasicMaterial({
    color,transparent:opacity<1,opacity,depthWrite,side:THREE.DoubleSide,
    blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,
  });
}

function setMaterialOpacity(value,alpha){
  const mat=value?.material;
  if(!mat)return;
  if(mat.uniforms?.uAlpha)mat.uniforms.uAlpha.value=alpha;
  else mat.opacity=(value.userData?.baseOpacity??1)*alpha;
}

function setGroupOpacity(root,alpha){
  root?.traverse?.(object=>setMaterialOpacity(object,alpha));
}

function makeRing(THREE,inner,outer,color,opacity=.7,start=0,length=TAU){
  const ring=new THREE.Mesh(new THREE.RingGeometry(Math.max(.01,inner),Math.max(inner+.01,outer),48,1,start,length),material(THREE,color,opacity));
  ring.rotation.x=-Math.PI/2;ring.userData.baseOpacity=opacity;return ring;
}

function makeImpact(THREE,scene,color=0xffffff,size=1){
  const group=new THREE.Group();group.name='Wizard VFX Arcana impact';
  const core=new THREE.Mesh(new THREE.SphereGeometry(.22*size,12,8),material(THREE,color,.96));core.userData.baseOpacity=.96;group.add(core);
  const ring=makeRing(THREE,.28*size,.42*size,color,.78);group.add(ring);
  group.renderOrder=12;scene.add(group);return group;
}

function updateImpact(impact,age,life){
  const alpha=1-sat(age/life);
  setGroupOpacity(impact,alpha);
  impact.scale.setScalar(1+sat(age/life)*1.8);
}

const NOISE_GLSL=`
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float vnoise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);}
  float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vnoise(p);p*=2.03;a*=.5;}return s;}
`;

const WATER_VERT=`
  varying vec2 vUv;varying float vEdge;attribute float aEdge;
  void main(){vUv=uv;vEdge=aEdge;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
`;
const WATER_FRAG=`
  precision highp float;uniform vec3 uDeep,uMid,uBase,uHi,uFoam;
  uniform float uTime,uAlpha,uFlow,uRag,uBands,uFoamAmt,uNoiseScale;varying vec2 vUv;varying float vEdge;
  ${NOISE_GLSL}
  void main(){vec2 np=vec2(vUv.x*uNoiseScale,vUv.y*1.6)+vec2(-uTime*uFlow,uTime*uFlow*.35);float n=fbm(np),n2=fbm(np*2.7+11.3);float body=1.-abs(vEdge);float cut=body-uRag*(.55*n+.45*n2)-.06;float a=smoothstep(0.,.16,cut);a*=smoothstep(0.,.10,vUv.x)*smoothstep(0.,.22,1.-vUv.x);if(a<=.004)discard;float shade=clamp(.42+.44*vEdge+(n-.5)*1.10+(.5-vUv.x)*.26,0.,1.);shade=floor(shade*uBands)/(uBands-1.);vec3 col=shade<.34?mix(uDeep,uMid,shade/.34):shade<.68?mix(uMid,uBase,(shade-.34)/.34):mix(uBase,uHi,(shade-.68)/.32);float edgeBand=smoothstep(.42,.04,body),crest=edgeBand*smoothstep(.44,.78,n2)*uFoamAmt;col=mix(col,uFoam,crest*.8);gl_FragColor=vec4(col,a*uAlpha);}
`;

function painterlyMaterial(THREE,pal,options={}){
  return new THREE.ShaderMaterial({
    uniforms:{
      uDeep:{value:new THREE.Color(pal.deep)},uMid:{value:new THREE.Color(pal.mid)},uBase:{value:new THREE.Color(pal.base)},
      uHi:{value:new THREE.Color(pal.hi)},uFoam:{value:new THREE.Color(pal.foam)},uTime:{value:0},uAlpha:{value:1},
      uFlow:{value:options.flow??.9},uRag:{value:options.rag??.3},uBands:{value:options.bands??4},
      uFoamAmt:{value:options.foam??.55},uNoiseScale:{value:options.noiseScale??5},
    },
    vertexShader:WATER_VERT,fragmentShader:WATER_FRAG,transparent:true,depthWrite:false,side:THREE.DoubleSide,
  });
}

function ribbon(THREE,fn,segs=36){
  const positions=[],uvs=[],edges=[],indices=[];
  const up=new THREE.Vector3(0,1,0);let previous=null;
  for(let index=0;index<=segs;index++){
    const t=index/segs,current=fn(t),next=fn(Math.min(1,t+1/segs));
    const direction=new THREE.Vector3().subVectors(next.p,current.p);
    if(direction.lengthSq()<1e-9&&previous)direction.copy(previous);
    direction.normalize();previous=direction.clone();
    const side=new THREE.Vector3().crossVectors(up,direction).normalize().multiplyScalar(current.w);
    if(side.lengthSq()<1e-9)side.set(current.w,0,0);
    positions.push(current.p.x-side.x,current.p.y,current.p.z-side.z,current.p.x+side.x,current.p.y,current.p.z+side.z);
    uvs.push(t,0,t,1);edges.push(-1,1);
    if(index<segs){const base=index*2;indices.push(base,base+1,base+2,base+1,base+3,base+2);}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setAttribute('aEdge',new THREE.Float32BufferAttribute(edges,1));
  geometry.setIndex(indices);return geometry;
}

function addWaterSpiral(THREE,root,pal,{arms=6,radius=2.5,height=.12,width=.3,phase=0}={}){
  for(let index=0;index<arms;index++){
    const mesh=new THREE.Mesh(ribbon(THREE,t=>{
      const angle=index/arms*TAU+phase+t*2.1;
      const r=.36+(radius-.36)*Math.pow(t,.78);
      return{p:new THREE.Vector3(Math.cos(angle)*r,height+.16*Math.pow(t,1.8),Math.sin(angle)*r),w:width*Math.pow(Math.sin(Math.PI*Math.pow(t,1.2)),.48)};
    },42),painterlyMaterial(THREE,pal,{flow:1.05,rag:.32,bands:4,foam:.56,noiseScale:5.4}));
    mesh.userData.baseOpacity=.78;mesh.renderOrder=5;root.add(mesh);
  }
}

function makeFlameBreathVisual(THREE,scene,size){
  const group=new THREE.Group();group.name='Wizard VFX Flame Breath';
  const cone=new THREE.Mesh(new THREE.ConeGeometry(1.18,3.5,24,1,true),material(THREE,0xf0782b,.58));
  cone.rotation.z=-Math.PI/2;cone.position.x=1.7;cone.scale.set(1,.72,1);cone.userData.baseOpacity=.58;group.add(cone);
  const inner=new THREE.Mesh(new THREE.ConeGeometry(.72,2.8,20,1,true),material(THREE,0xffc34d,.46));
  inner.rotation.z=-Math.PI/2;inner.position.x=1.38;inner.userData.baseOpacity=.46;group.add(inner);
  const glow=makeRing(THREE,.40,1.0,0xfff6b6,.68);glow.position.set(.28,.04,0);group.add(glow);
  group.scale.setScalar(size);group.renderOrder=5;scene.add(group);return group;
}

function makeCrownVisual(THREE,scene,size){
  const group=new THREE.Group();group.name='Wizard VFX Searing Crown';
  const ring=makeRing(THREE,.45,1.1,0xf0782b,.9);ring.userData.crownRing=true;group.add(ring);
  const inner=makeRing(THREE,.15,.47,0xffc34d,.7);group.add(inner);
  for(let index=0;index<12;index++){
    const angle=index/12*TAU,flame=new THREE.Mesh(new THREE.SphereGeometry(.22+(index%3)*.06,9,7),material(THREE,index%2?0xf0782b:0xffc34d,.78));
    flame.position.set(Math.cos(angle)*1.2,.28+rnd(index,2.7)*.7,Math.sin(angle)*1.1);flame.userData.baseOpacity=.78;flame.userData.crownIndex=index;group.add(flame);
  }
  group.scale.setScalar(size);group.renderOrder=5;scene.add(group);return group;
}

function makeFireBurst(THREE,scene,size=1,finisher=false){
  const group=new THREE.Group();group.name=finisher?'Wizard VFX Ignition finisher':'Wizard VFX Ignition beat';
  const radius=finisher?1.42:1.0;
  const core=new THREE.Mesh(new THREE.SphereGeometry(finisher?.55:.38,12,8),material(THREE,0xffffc7,.96));core.userData.baseOpacity=.96;group.add(core);
  for(let index=0;index<(finisher?16:10);index++){
    const angle=index/(finisher?16:10)*TAU,blob=new THREE.Mesh(new THREE.SphereGeometry(.22+(index%3)*.06,9,7),material(THREE,index%2?0xf0782b:0xffc34d,.76));
    blob.position.set(Math.cos(angle)*radius*(.56+rnd(index,3.1)*.42),.25+Math.sin(index*1.7)*.18,Math.sin(angle)*radius*(.56+rnd(index,4.6)*.42));blob.userData.baseOpacity=.76;group.add(blob);
  }
  const scorch=makeRing(THREE,.6,radius+0.35,0x632317,.55);scorch.userData.baseOpacity=.55;group.add(scorch);
  group.scale.setScalar(size);group.visible=false;group.renderOrder=6;scene.add(group);return group;
}

function makeFissureTrap(THREE,scene,size){
  const group=new THREE.Group();group.name='Wizard VFX Engulfing Fissure trap';
  const crack=makeRing(THREE,.25,1.05,0xe86524,.62);crack.userData.baseOpacity=.62;group.add(crack);
  const inner=makeRing(THREE,.06,.32,0xffbd45,.75);inner.userData.baseOpacity=.75;group.add(inner);
  for(let index=0;index<4;index++){
    const line=new THREE.Mesh(new THREE.BoxGeometry(1.65,.025,.035),material(THREE,index%2?0x7b2415:0xf0782b,.58,{additive:false}));
    line.rotation.y=index/4*TAU;line.position.y=.025;line.userData.baseOpacity=.58;group.add(line);
  }
  group.scale.setScalar(size);group.renderOrder=3;scene.add(group);return group;
}

function makeDragonVisual(THREE,scene,size){
  const group=new THREE.Group();group.name='Wizard VFX Dragon Blast';
  addWaterSpiral(THREE,group,PAL.air,{arms:9,radius:2.15,height:.28,width:.26});
  const mouth=new THREE.Mesh(new THREE.SphereGeometry(.43,12,8),material(THREE,0xf4ffff,.72));mouth.position.x=.15;mouth.userData.baseOpacity=.72;group.add(mouth);
  const ring=makeRing(THREE,.45,2.6,0xc8eef0,.28);ring.position.y=.05;ring.userData.baseOpacity=.28;group.add(ring);
  group.scale.setScalar(size);group.renderOrder=5;scene.add(group);return group;
}

function makeSlashVisual(THREE,scene,size,finisher=false){
  const group=new THREE.Group();group.name=finisher?'Wizard VFX Shearing Chain finisher':'Wizard VFX Shearing Chain slash';
  const outer=finisher?2.55:1.9,inner=outer-(finisher?.58:.46),length=finisher?2.15:1.72;
  const blade=new THREE.Mesh(new THREE.RingGeometry(inner,outer,42,1,-length/2,length),material(THREE,0xe9fbfb,.92));
  blade.rotation.x=-Math.PI/2;blade.userData.baseOpacity=.92;group.add(blade);
  const edge=makeRing(THREE,outer-.12,outer+.03,0xffffff,.98,-length/2,length);group.add(edge);
  group.scale.setScalar(size);group.renderOrder=7;scene.add(group);return group;
}

function makeDrillVisual(THREE,scene,size){
  const group=new THREE.Group();group.name='Wizard VFX Tectonic Drill';
  const core=new THREE.Mesh(new THREE.ConeGeometry(.92,2.9,10,1,true),material(THREE,0x74562a,.94,{additive:false}));
  core.rotation.z=-Math.PI/2;core.position.x=.25;group.add(core);
  for(let index=0;index<7;index++){
    const u=index/6,r=lerp(.98,.20,Math.pow(u,.9));
    const fin=new THREE.Mesh(new THREE.TorusGeometry(r,lerp(.18,.07,u),6,18),material(THREE,index%2?0x9b7a47:0x63481f,.92,{additive:false}));
    fin.rotation.y=Math.PI/2;fin.rotation.z=index*1.02;fin.position.x=lerp(-1.18,1.28,u);group.add(fin);
  }
  const tip=new THREE.Mesh(new THREE.ConeGeometry(.24,.78,8),material(THREE,0xf6e6b5,.88,{additive:false}));tip.rotation.z=-Math.PI/2;tip.position.x=1.72;group.add(tip);
  const track=makeRing(THREE,.55,1.25,0x5a4326,.42);track.scale.set(1.8,1,1);track.userData.baseOpacity=.42;group.add(track);
  group.scale.setScalar(size);group.renderOrder=6;scene.add(group);return group;
}

function makeTomahawkVisual(THREE,scene,size){
  const group=new THREE.Group();group.name='Wizard VFX Rock Solid Tomahawk';
  const haft=new THREE.Mesh(new THREE.CylinderGeometry(.075,.085,.98,7),material(THREE,0x8a5a30,.98,{additive:false}));haft.rotation.x=Math.PI/2;group.add(haft);
  for(const sign of [1,-1]){
    const blade=new THREE.Mesh(new THREE.BoxGeometry(.45,.14,.62),material(THREE,0xa49470,.98,{additive:false}));blade.position.x=sign*.34;blade.rotation.y=sign>0?.35:-.35;group.add(blade);
  }
  const binding=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.20,7),material(THREE,0x6f7a3a,.98,{additive:false}));binding.rotation.x=Math.PI/2;group.add(binding);
  const shadow=makeRing(THREE,.12,.36,0x000000,.28);shadow.userData.baseOpacity=.28;group.add(shadow);
  group.scale.setScalar(size);group.renderOrder=7;scene.add(group);return group;
}

function makeBreakerVisual(THREE,scene,size){
  const group=new THREE.Group();group.name='Wizard VFX Aqua Breaker';
  const coil=new THREE.Group();addWaterSpiral(THREE,coil,PAL.breaker,{arms:7,radius:1.12,height:.05,width:.22});group.add(coil);group.userData.coil=coil;
  const fan=new THREE.Mesh(new THREE.ConeGeometry(2.6,.65,32,1,true),material(THREE,0xd8f2ed,.78));fan.rotation.z=-Math.PI/2;fan.position.x=1.4;fan.userData.baseOpacity=.78;fan.visible=false;group.add(fan);group.userData.fan=fan;
  const trail=makeRing(THREE,.1,1.2,0x759dad,.34);trail.scale.set(2.8,1,1);trail.userData.baseOpacity=.34;group.add(trail);group.userData.trail=trail;
  group.scale.setScalar(size);group.renderOrder=6;scene.add(group);return group;
}

function makeChargeBar(THREE,scene){
  const group=new THREE.Group();group.name='Wizard VFX Aqua Breaker charge';
  const back=new THREE.Mesh(new THREE.PlaneGeometry(1.8,.22),material(THREE,0x0a1119,.88,{additive:false}));back.userData.baseOpacity=.88;group.add(back);
  const fill=new THREE.Mesh(new THREE.PlaneGeometry(1.64,.13),material(THREE,0x59a8ff,.96,{additive:false}));fill.position.z=.01;fill.userData.baseOpacity=.96;group.add(fill);
  group.renderOrder=20;scene.add(group);return{group,fill};
}

function makeVortexVisual(THREE,scene,size){
  const group=new THREE.Group();group.name='Wizard VFX Aqua Vortex';
  addWaterSpiral(THREE,group,PAL.water,{arms:6,radius:3.05,height:.08,width:.40});
  const wash=new THREE.Mesh(new THREE.CircleGeometry(1.18,48),material(THREE,0x65bddd,.28));wash.rotation.x=-Math.PI/2;wash.position.y=.04;wash.userData.baseOpacity=.28;group.add(wash);
  const sheet=makeRing(THREE,.2,1.35,0x65bddd,.42);sheet.userData.baseOpacity=.42;sheet.visible=false;group.add(sheet);group.userData.sheet=sheet;
  const decal=makeRing(THREE,1.8,3.05,0x2e86b7,.22);decal.userData.baseOpacity=.22;group.add(decal);
  group.scale.setScalar(size);group.renderOrder=5;scene.add(group);return group;
}

function pointInCone({origin,forward,target,reach,halfAngle,radius=0}){
  const dx=target.x-origin.x,dz=target.z-origin.z,distance=Math.hypot(dx,dz);
  if(distance>reach+radius||distance<.01)return false;
  const dot=(dx*forward.x+dz*forward.z)/distance;
  const padding=Math.asin(clamp(radius/Math.max(distance,radius||1),0,1));
  return Math.acos(clamp(dot,-1,1))<=halfAngle+padding;
}

function positionAlong(origin,direction,distance){return{x:origin.x+direction.x*distance,z:origin.z+direction.z*distance};}
function distance2D(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}

function setFacing(root,direction){if(root)root.rotation.y=Math.atan2(direction.x,direction.z);}

export function installWizardVfxArcanaRuntime({
  THREE,scene,getPlayer,getEnemySystem,getMazeSegments=()=>[],translatePlayer=()=>false,
}={}){
  const initialTweaks=readArcanaTweaks();
  const empty={state:{effects:[],sizeMultiplier:initialTweaks.sizeMultiplier},canPlay(){return false;},play(){return false;},update(){},reset(){},snapshot(){return[];},dispose(){}};
  if(!THREE||!scene||!isEnemyLabRuntime())return empty;

  const state={effects:[],castSerial:0,lastCast:null,sizeMultiplier:initialTweaks.sizeMultiplier};
  const currentSize=()=>clampArcanaSize(state.sizeMultiplier);
  const add=effect=>{state.effects.push(effect);return effect;};
  function remove(effect){
    effect.onRemove?.();
    if(effect.mesh)disposeObject(effect.mesh);
    for(const mesh of effect.meshes||[])disposeObject(mesh);
    for(const impact of effect.impacts||[])disposeObject(impact.mesh||impact);
    const index=state.effects.indexOf(effect);if(index>=0)state.effects.splice(index,1);
  }
  function reset(){for(const effect of[...state.effects])remove(effect);state.castSerial=0;state.lastCast=null;}
  function crossed(effect,time){return effect.previousAge<time&&effect.age>=time;}
  function advance(effect,dt){effect.previousAge=effect.age;effect.age+=Math.max(0,Number(dt)||0);}
  function intercept(position,radius,system){destroyProjectiles(system,position,radius);}
  function effectImpact(effect,position,color=0xffffff,size=1){
    const impact=makeImpact(THREE,scene,color,size);impact.position.set(position.x,.72,position.z);
    effect.impacts??=[];effect.impacts.push({mesh:impact,age:0,life:.28});
  }
  function updateImpacts(effect,dt){
    for(const impact of effect.impacts||[]){impact.age+=dt;updateImpact(impact.mesh,impact.age,impact.life);}
    effect.impacts=(effect.impacts||[]).filter(impact=>{
      if(impact.age<impact.life)return true;disposeObject(impact.mesh);return false;
    });
  }

  function startFlameBreath(){
    const frame=playerFrame(getPlayer),size=currentSize(),mesh=makeFlameBreathVisual(THREE,scene,size);
    mesh.position.set(frame.x+frame.forward.x*.45,.42,frame.z+frame.forward.z*.45);setFacing(mesh,frame.forward);
    return add({type:'flameBreath',arcanaId:'FLAME-BREATH',age:0,previousAge:0,life:.82,frame,size,mesh,impacts:[]});
  }
  function updateFlameBreath(effect,dt,system){
    advance(effect,dt);const progress=sat(effect.age/effect.life),grow=smooth(effect.age/.16),fade=smooth((effect.age-.45)/.18);
    effect.mesh.scale.setScalar(effect.size*(.72+grow*.34));setGroupOpacity(effect.mesh,Math.max(0,(1-fade)*.92));
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
    const frame=playerFrame(getPlayer),size=currentSize(),mesh=makeCrownVisual(THREE,scene,size);
    mesh.position.set(frame.x,0,frame.z);return add({type:'searingCrown',arcanaId:'SEARING-CROWN',age:0,previousAge:0,life:1.34,frame,size,mesh,impacts:[]});
  }
  function updateSearingCrown(effect,dt,system){
    advance(effect,dt);const radius=(.72+2.55*easeOut(effect.age/.98))*effect.size,alpha=(1-smooth((effect.age-1.0)/.32))*.94;
    effect.mesh.scale.setScalar(radius/2.6);setGroupOpacity(effect.mesh,Math.max(0,alpha));
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
    const frame=playerFrame(getPlayer),size=currentSize(),root=new THREE.Group();root.name='Wizard VFX Ignition Drive';scene.add(root);
    const times=[.08,.155,.23,.305,.40],bursts=times.map((time,index)=>{const mesh=makeFireBurst(THREE,scene,size,index===4);root.add(mesh);return{time,finisher:index===4,position:positionAlong(frame,frame.forward,1.2+index*1.75),mesh,resolved:false};});
    return add({type:'ignitionDrive',arcanaId:'IGNITION-DRIVE',age:0,previousAge:0,life:1.45,frame,size,mesh:root,bursts,impacts:[]});
  }
  function updateIgnitionDrive(effect,dt,system){
    advance(effect,dt);
    for(const beat of effect.bursts){
      const local=effect.age-beat.time,life=beat.finisher?.48:.32;
      beat.mesh.visible=local>=0&&local<life;
      if(beat.mesh.visible){beat.mesh.position.set(beat.position.x,.12,beat.position.z);beat.mesh.scale.setScalar(effect.size*(beat.finisher?1.15:1)*(1+easeOut(local/life)*.12));setGroupOpacity(beat.mesh,1-sat(local/life));}
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
    const frame=playerFrame(getPlayer),size=currentSize(),offsets=[[1.9,-1.5],[3.1,1.4],[.5,2.2]];
    const root=new THREE.Group();root.name='Wizard VFX Engulfing Fissure';scene.add(root);
    const traps=offsets.map((offset,index)=>{
      const center={x:frame.x+frame.forward.x*offset[0]+frame.right.x*offset[1],z:frame.z+frame.forward.z*offset[0]+frame.right.z*offset[1]};
      const mesh=makeFissureTrap(THREE,scene,size);root.add(mesh);mesh.position.set(center.x,0,center.z);
      return{index,center,mesh,triggered:false,consumed:false,target:null,age:0,nextHit:0};
    });
    return add({type:'engulfingFissure',arcanaId:'ENGULFING-FISSURE',age:0,previousAge:0,life:8.35,frame,size,mesh:root,traps,impacts:[]});
  }
  function updateEngulfingFissure(effect,dt,system){
    advance(effect,dt);let finished=0;
    for(const trap of effect.traps){
      trap.age=effect.age-(trap.triggerAt??Infinity);
      if(!trap.triggered&&!trap.consumed&&effect.age<8){
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
      if(!trap.triggered&&!trap.consumed&&effect.age>=8)trap.consumed=true;
      const active=!trap.consumed,triggered=trap.triggered;
      setGroupOpacity(trap.mesh,active?(triggered?.95:(.46+.16*Math.sin(effect.age*5+trap.index))):Math.max(0,1-sat((effect.age-(trap.triggerAt??effect.age+1))/.24)));
      trap.mesh.scale.setScalar(effect.size*(triggered?1.08:1));
      if(trap.consumed)finished++;
    }
    updateImpacts(effect,dt);if(finished===effect.traps.length||effect.age>=effect.life)remove(effect);
  }

  function startDragonBlast(){
    const frame=playerFrame(getPlayer),size=currentSize(),head=positionAlong(frame,frame.forward,1.5),mesh=makeDragonVisual(THREE,scene,size);
    mesh.position.set(head.x,0,head.z);setFacing(mesh,frame.forward);
    return add({type:'dragonBlast',arcanaId:'DRAGON-BLAST',age:0,previousAge:0,life:1.45,frame,head,size,mesh,impacts:[]});
  }
  function updateDragonBlast(effect,dt,system){
    advance(effect,dt);const form=smooth(effect.age/.16),fade=1-smooth((effect.age-.90)/.35);effect.mesh.rotation.y=-effect.age*TAU*.85;setGroupOpacity(effect.mesh,form*fade);
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
    const frame=playerFrame(getPlayer),size=currentSize(),root=new THREE.Group();root.name='Wizard VFX Shearing Chain';scene.add(root);
    const slashTimes=Array.from({length:7},(_,index)=>index<6?.18+index*.10:.82);
    const slashes=slashTimes.map((time,index)=>{const mesh=makeSlashVisual(THREE,scene,size,index===6);root.add(mesh);return{time,finisher:index===6,mesh,resolved:false};});
    return add({type:'shearingChain',arcanaId:'SHEARING-CHAIN',age:0,previousAge:0,life:1.28,frame,size,mesh:root,slashes,travel:0,impacts:[]});
  }
  function updateShearingChain(effect,dt,system){
    advance(effect,dt);
    const travel=Math.min(3.8,effect.age/.90*3.8),delta=Math.max(0,travel-effect.travel);effect.travel=travel;
    if(delta>0)translatePlayer(effect.frame.forward.x*delta,effect.frame.forward.z*delta);
    for(const slash of effect.slashes){
      const local=effect.age-slash.time,life=slash.finisher?.38:.28,progress=clamp((slash.time-.18)/.72,0,1);
      const side=slash.finisher?0:(slash.mesh.userData.side??(effect.slashes.indexOf(slash)%2?1:-1));slash.mesh.userData.side=side;
      const position={x:effect.frame.x+effect.frame.forward.x*(.55+progress*3.2)+effect.frame.right.x*side*.62,z:effect.frame.z+effect.frame.forward.z*(.55+progress*3.2)+effect.frame.right.z*side*.62};
      slash.mesh.position.set(position.x,.30,position.z);setFacing(slash.mesh,effect.frame.forward);slash.mesh.visible=local>=0&&local<life;setGroupOpacity(slash.mesh,slash.mesh.visible?1-sat(local/life):0);
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
    const frame=playerFrame(getPlayer),size=currentSize(),mesh=makeDrillVisual(THREE,scene,size),start=positionAlong(frame,frame.forward,.65);
    setFacing(mesh,frame.forward);return add({type:'tectonicDrill',arcanaId:'TECTONIC-DRILL',age:0,previousAge:0,life:1.42,frame,start,size,mesh,distance:0,playerDistance:0,hitAt:new Map(),impacts:[]});
  }
  function updateTectonicDrill(effect,dt,system){
    advance(effect,dt);const targetDistance=Math.min(7.6,Math.max(0,effect.age-.18)*9.4),position=positionAlong(effect.start,effect.frame.forward,targetDistance);
    const delta=Math.max(0,targetDistance-effect.distance);effect.distance=targetDistance;
    if(delta>0&&effect.playerDistance<2.6){const move=Math.min(delta*.36,2.6-effect.playerDistance);effect.playerDistance+=move;translatePlayer(effect.frame.forward.x*move,effect.frame.forward.z*move);}
    effect.mesh.position.set(position.x,.25+smooth(effect.age/.22)*.32,position.z);effect.mesh.rotation.x=effect.age*TAU*3.2;setGroupOpacity(effect.mesh,effect.age<1.2?1:1-smooth((effect.age-1.2)/.22));
    for(const enemy of aliveEnemies(system)){
      const distance=distance2D(enemy,position),last=effect.hitAt.get(enemy)||-Infinity;
      if(distance>1.35*effect.size+enemyRadius(enemy,system)||effect.age-last<.18)continue;
      effect.hitAt.set(enemy,effect.age);damageEnemy(system,enemy,10,{x:effect.frame.forward.x*1.05,z:effect.frame.forward.z*1.05},{tectonicDrill:true});
      moveEnemy(system,enemy,positionAlong(position,effect.frame.forward,.55));effectImpact(effect,{x:enemy.x,z:enemy.z},0xffffff,effect.size*.68);
    }
    updateImpacts(effect,dt);if(effect.age>=effect.life)remove(effect);
  }

  function startTomahawk(){
    const frame=playerFrame(getPlayer),size=currentSize(),mesh=makeTomahawkVisual(THREE,scene,size),home=positionAlong(frame,frame.forward,.55),out=positionAlong(home,frame.forward,7.4);
    return add({type:'rockSolidTomahawk',arcanaId:'ROCK-SOLID-TOMAHAWK',age:0,previousAge:0,life:1.86,frame,home,out,size,mesh,hit:new Set(),impacts:[]});
  }
  function tomahawkPosition(effect){
    if(effect.age<.35){const k=smooth(effect.age/.35);return{x:lerp(effect.home.x,effect.home.x+.18,k),z:lerp(effect.home.z,effect.home.z+.18,k),y:.65+k*.28};}
    if(effect.age<1.05){const k=easeOut((effect.age-.35)/.70);return{x:lerp(effect.home.x,effect.out.x,k),z:lerp(effect.home.z,effect.out.z,k),y:1.0+Math.sin(k*Math.PI)*.4};}
    if(effect.age<1.86){const k=smooth((effect.age-1.05)/.81);return{x:lerp(effect.out.x,effect.home.x,k),z:lerp(effect.out.z,effect.home.z,k)+Math.sin(k*Math.PI)*1.9,y:1.0+Math.sin(k*Math.PI)*.25};}
    return{x:effect.home.x,z:effect.home.z,y:.8};
  }
  function updateTomahawk(effect,dt,system){
    advance(effect,dt);const position=tomahawkPosition(effect);effect.mesh.position.set(position.x,position.y,position.z);
    effect.mesh.rotation.y=effect.age<.35?-.4:effect.age<1.86?effect.age*TAU*6.2:-1.05;setGroupOpacity(effect.mesh,effect.age<1.72?1:1-sat((effect.age-1.72)/.14));
    if(effect.age>=.35&&effect.age<1.86)for(const enemy of aliveEnemies(system)){
      if(effect.hit.has(enemy)||distance2D(enemy,position)>.95*effect.size+enemyRadius(enemy,system))continue;
      effect.hit.add(enemy);damageEnemy(system,enemy,15,{x:effect.frame.forward.x*1.18,z:effect.frame.forward.z*1.18},{rockSolidTomahawk:true});effectImpact(effect,{x:enemy.x,z:enemy.z},0xffffff,effect.size*.82);
    }
    updateImpacts(effect,dt);if(effect.age>=effect.life)remove(effect);
  }

  function startAquaVortex(){
    const frame=playerFrame(getPlayer),size=currentSize(),mesh=makeVortexVisual(THREE,scene,size);
    mesh.position.set(frame.x,0,frame.z);return add({type:'aquaVortex',arcanaId:'AQUA-VORTEX',age:0,previousAge:0,life:.78,frame,size,mesh,impacts:[]});
  }
  function updateAquaVortex(effect,dt,system){
    advance(effect,dt);const bloom=smooth((effect.age-.045)/.155),collapse=smooth((effect.age-.42)/.18),scale=lerp(.18,1.08,bloom)*(1-collapse*.88),alpha=sat(bloom*1.2)*(1-smooth((effect.age-.44)/.17));
    effect.mesh.scale.setScalar(effect.size*scale);effect.mesh.rotation.y=-effect.age*TAU*2.5;setGroupOpacity(effect.mesh,alpha);
    const position=effect.frame;
    intercept(position,3.1*effect.size*scale,system);
    for(let tick=0;tick<3;tick++)if(crossed(effect,.205+tick*.145)){
      for(const enemy of aliveEnemies(system)){
        const distance=distance2D(enemy,position);if(distance>3.1*effect.size*scale+enemyRadius(enemy,system))continue;
        const inward=normalize2(position.x-enemy.x,position.z-enemy.z);
        damageEnemy(system,enemy,8,{x:inward.x*.42,z:inward.z*.42},{aquaVortex:true,tick:tick+1});
        moveEnemy(system,enemy,{x:lerp(enemy.x,position.x,.10),z:lerp(enemy.z,position.z,.10)});effectImpact(effect,{x:enemy.x,z:enemy.z},0xffffff,effect.size*.48);
      }
    }
    if(effect.mesh.userData.sheet){effect.mesh.userData.sheet.visible=collapse>.02;setMaterialOpacity(effect.mesh.userData.sheet,collapse*(1-smooth((effect.age-.60)/.16)));}
    updateImpacts(effect,dt);if(effect.age>=effect.life)remove(effect);
  }

  function startAquaBreaker(){
    const frame=playerFrame(getPlayer),size=currentSize(),mesh=makeBreakerVisual(THREE,scene,size),bar=makeChargeBar(THREE,scene),origin=positionAlong(frame,frame.forward,1.35);
    mesh.add(bar.group);
    return add({type:'aquaBreaker',arcanaId:'AQUA-BREAKER',age:0,previousAge:0,life:3.60,frame,origin,size,mesh,bar,hit:new Map(),finisher:false,impacts:[]});
  }
  function updateAquaBreaker(effect,dt,system){
    advance(effect,dt);const charge=1.90,rollEnd=2.65,breakEnd=3.15,charging=effect.age<charge,chargeK=sat(effect.age/charge),rollK=sat((effect.age-charge)/(rollEnd-charge)),breakK=sat((effect.age-rollEnd)/(breakEnd-rollEnd));
    const grow=easeOut((effect.age-.10)/1.55),size=charging?lerp(.18,1,grow):lerp(1,1.22,easeOut(rollK))*(1-.9*breakK),distance=charging?0:11*(effect.age-charge)*(1-.35*breakK),position=positionAlong(effect.origin,effect.frame.forward,distance);
    effect.mesh.position.set(position.x,.20+.05*Math.sin(effect.age*22),position.z);effect.mesh.userData.coil.scale.setScalar(Math.max(.01,effect.size*size*1.55));effect.mesh.userData.coil.rotation.y=-effect.age*(charging?TAU*.85:TAU*2.6);setGroupOpacity(effect.mesh,charging?1:(1-smooth((breakK-.35)/.65)));
    effect.mesh.userData.trail.scale.set(Math.max(.6,distance+2.4),3.1*size,1);effect.mesh.userData.trail.position.set(-distance/2,0,0);
    effect.bar.group.visible=charging;effect.bar.group.position.set(0,2.5,0);effect.bar.fill.scale.x=Math.max(.001,chargeK);effect.bar.fill.position.x=-.82*(1-chargeK);effect.bar.fill.material.color.setHex(chargeK<.55?0x59a8ff:0x63e07a);
    if(effect.mesh.userData.fan){effect.mesh.userData.fan.visible=breakK>.01&&breakK<1;effect.mesh.userData.fan.scale.set(lerp(.35,1.5,easeOut(breakK)),lerp(.5,1.25,easeOut(breakK)),lerp(.35,1.5,easeOut(breakK)));setMaterialOpacity(effect.mesh.userData.fan,1-smooth((breakK-.45)/.55));}
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

  function cast(card){
    const id=String(card?.arcanaId||card?.id||'').replace(/^WOL-/,'').toUpperCase();if(!VFX_IDS.has(id))return false;
    state.castSerial++;state.lastCast={serial:state.castSerial,cardId:card?.id||`WOL-${id}`,arcanaId:id};
    if(id==='FLAME-BREATH')startFlameBreath();
    else if(id==='SEARING-CROWN')startSearingCrown();
    else if(id==='IGNITION-DRIVE')startIgnitionDrive();
    else if(id==='ENGULFING-FISSURE')startEngulfingFissure();
    else if(id==='DRAGON-BLAST')startDragonBlast();
    else if(id==='SHEARING-CHAIN')startShearingChain();
    else if(id==='TECTONIC-DRILL')startTectonicDrill();
    else if(id==='ROCK-SOLID-TOMAHAWK')startTomahawk();
    else if(id==='AQUA-VORTEX')startAquaVortex();
    else if(id==='AQUA-BREAKER')startAquaBreaker();
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
