import assert from 'node:assert/strict';
import {
  DRAGON_ARC_PLAYER_DIAMETER,
  DRAGON_ARC_SPEC,
  dragonArcMotionMetrics,
  installWizardRebuiltArcanaRuntime,
  sampleDragonArcBody,
  sampleDragonArcPath,
} from '../src/wizard-rebuilt-arcana-runtime.js';

class Transform{
  constructor(){this.x=0;this.y=0;this.z=0;}
  set(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;return this;}
  setScalar(value){return this.set(value,value,value);}
}
class Object3D{
  constructor(){this.children=[];this.position=new Transform();this.rotation=new Transform();this.scale=new Transform().set(1,1,1);this.userData={};this.parent=null;this.visible=true;}
  add(child){child.parent=this;this.children.push(child);return this;}
  remove(child){const index=this.children.indexOf(child);if(index>=0)this.children.splice(index,1);child.parent=null;}
  traverse(visitor){visitor(this);for(const child of this.children)child.traverse?.(visitor);}
}
class Group extends Object3D{}
class Geometry{dispose(){this.disposed=true;}}
class Material{constructor(options={}){Object.assign(this,options);}dispose(){this.disposed=true;}}
class Mesh extends Object3D{constructor(geometry=new Geometry(),material=new Material()){super();this.geometry=geometry;this.material=material;}}

const THREE={
  Group,Mesh,
  SphereGeometry:Geometry,DodecahedronGeometry:Geometry,ConeGeometry:Geometry,CylinderGeometry:Geometry,
  TorusGeometry:Geometry,RingGeometry:Geometry,
  MeshBasicMaterial:Material,
  AdditiveBlending:'add',NormalBlending:'normal',DoubleSide:'double',
};

class EventTargetMock{
  constructor(){this.listeners=new Map();this.parent=this;this.frameElement=null;}
  addEventListener(type,listener){const values=this.listeners.get(type)||[];values.push(listener);this.listeners.set(type,values);}
  removeEventListener(type,listener){this.listeners.set(type,(this.listeners.get(type)||[]).filter(value=>value!==listener));}
  dispatchEvent(event){for(const listener of this.listeners.get(event.type)||[])listener(event);return true;}
}

globalThis.CustomEvent=class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}};
globalThis.location={search:'?enemyLab=1',pathname:'/combat-arena.html'};
globalThis.window=new EventTargetMock();
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};

const scene=new Group();
const player={x:0,z:0,forwardX:0,forwardZ:1};
const hits=[];
const system={
  enemies:[],heightScale:1,hostileProjectiles:[],
  damageEnemy(enemy,amount,knock,options){hits.push({enemy,amount,knock,options});enemy.hp-=amount;return true;},
};
const mazeSegments=[];
const runtime=installWizardRebuiltArcanaRuntime({THREE,scene,getPlayer:()=>player,getEnemySystem:()=>system,getMazeSegments:()=>mazeSegments});
const cast=id=>runtime.cast({id:`WOL-${id}`,arcanaId:id});
const step=(seconds,dt=.025,mutate=()=>{})=>{for(let elapsed=0;elapsed<seconds;elapsed+=dt){mutate();runtime.update(dt,elapsed);}};
const near=(actual,expected,tolerance=1e-9,message='')=>assert.ok(Math.abs(actual-expected)<=tolerance,message||`expected ${actual} to be within ${tolerance} of ${expected}`);

const dragonMetrics=dragonArcMotionMetrics();
near(dragonMetrics.playerDiameter,DRAGON_ARC_PLAYER_DIAMETER);
near(DRAGON_ARC_SPEC.emissionInterval,.1);
near(dragonMetrics.baseReleaseSpan,.7);
assert.ok(DRAGON_ARC_SPEC.emissionInterval>=.09&&DRAGON_ARC_SPEC.emissionInterval<=.12);
assert.ok(dragonMetrics.baseReleaseSpan>=.63&&dragonMetrics.baseReleaseSpan<=.84);
assert.ok(dragonMetrics.peakToPeakPlayerDiameters>=1.6&&dragonMetrics.peakToPeakPlayerDiameters<=2.2);
assert.ok(dragonMetrics.wavelengthPlayerDiameters>=8&&dragonMetrics.wavelengthPlayerDiameters<=10);
near(dragonMetrics.amplitudePlayerDiameters,.95);
near(dragonMetrics.proxyLengthPlayerDiameters,2.5);
near(dragonMetrics.speed,39.4);
near(dragonMetrics.adjacentPhaseDegrees,180);
near(dragonMetrics.everyOtherPhaseDifferenceDegrees,0);

const quarterWave=sampleDragonArcPath({distance:DRAGON_ARC_SPEC.pathWavelength/4,emissionIndex:0});
const threeQuarterWave=sampleDragonArcPath({distance:DRAGON_ARC_SPEC.pathWavelength*3/4,emissionIndex:0});
const adjacentWave=sampleDragonArcPath({distance:DRAGON_ARC_SPEC.pathWavelength/4,emissionIndex:1});
near(quarterWave.lateral,DRAGON_ARC_SPEC.pathAmplitude);
near(threeQuarterWave.lateral,-DRAGON_ARC_SPEC.pathAmplitude);
near(adjacentWave.lateral,-quarterWave.lateral);
near(adjacentWave.phaseOffset-quarterWave.phaseOffset,Math.PI);
near(sampleDragonArcPath({distance:2,emissionIndex:2}).phaseOffset,quarterWave.phaseOffset);
const maximumYaw=Math.atan(DRAGON_ARC_SPEC.pathAmplitude*Math.PI*2/DRAGON_ARC_SPEC.pathWavelength);
assert.ok(maximumYaw>=15*Math.PI/180&&maximumYaw<=40*Math.PI/180,'proxy yaw must visibly follow the S curve without snapping sideways');
const sampledBody=sampleDragonArcBody({headDistance:DRAGON_ARC_SPEC.proxyLength+1,emissionIndex:0});
assert.equal(sampledBody.length,DRAGON_ARC_SPEC.proxySegments);
assert.ok(sampledBody.every((sample,index)=>index===0||sample.distance<sampledBody[index-1].distance),'body samples must trail the head along earlier distances');
assert.ok(sampledBody.every(sample=>sample.visible&&Number.isFinite(sample.tangent.x)&&Number.isFinite(sample.tangent.z)));

assert.equal(cast('HOMING-FLARES'),true);
let flares=runtime.state.effects.find(effect=>effect.type==='homingFlares');
assert.equal(flares.flares.length,7,'base Homing Flares must create exactly seven owned visuals');
runtime.update(.05,0);
assert.ok(flares.flares.every(flare=>flare.mesh&&Number.isFinite(flare.position.x)),'stored halo must remain visible and positioned around the caster');
const flareTarget={x:0,z:6,hp:1000,radius:.5};system.enemies=[flareTarget];step(2.4);
assert.equal(hits.filter(hit=>hit.options.homingFlares).length,7,'every stored flare must independently acquire and hit');
assert.ok(hits.filter(hit=>hit.options.homingFlares).every(hit=>hit.amount===7));
runtime.reset();hits.length=0;system.enemies=[];

assert.equal(cast('DRAGON-ARC'),true);
assert.equal(runtime.state.dragonStock,0,'Dragon Arc must snapshot and spend all available stock');
const dragonOrigin={x:0,z:DRAGON_ARC_SPEC.originOffset};
system.enemies=[6,14].flatMap(distance=>[0,1].map(emissionIndex=>{const sample=sampleDragonArcPath({origin:dragonOrigin,distance,emissionIndex});return{x:sample.x,z:sample.z,hp:1000,radius:.35,pathDistance:distance,parity:emissionIndex};}));
step(2.2);
const dragonHits=hits.filter(hit=>hit.options.dragonArc);
assert.equal(dragonHits.length,16,'each of eight dragons must pierce through both matching-path targets');
assert.ok(dragonHits.every(hit=>hit.amount===8));
for(let emissionIndex=0;emissionIndex<8;emissionIndex++)assert.equal(dragonHits.filter(hit=>hit.options.dragonArcEmission===emissionIndex).length,2,`dragon ${emissionIndex+1} must own its piercing hits`);
assert.ok(runtime.state.dragonStock>=3,'Dragon Arc must recover one stock every 0.6 seconds');
assert.equal(runtime.snapshot().effects.some(effect=>effect.type==='dragonProjectile'),false,'every proxy must expire when its curved head reaches range');
assert.equal(runtime.snapshot().effects.some(effect=>effect.type==='pulse'),false,'Gate 1 must not add muzzle, wall, or impact polish');
runtime.reset();hits.length=0;

assert.equal(cast('DRAGON-ARC'),true);
const emissionTimes=new Map();
for(let frame=0;frame<50;frame++){
  runtime.update(1/60,frame/60);
  for(const effect of runtime.snapshot().effects.filter(effect=>effect.type==='dragonProjectile'))emissionTimes.set(effect.emissionIndex,effect.emittedAt);
}
assert.deepEqual([...emissionTimes.keys()],[0,1,2,3,4,5,6,7]);
const orderedEmissionTimes=[...emissionTimes.values()];
for(let index=1;index<orderedEmissionTimes.length;index++)near(orderedEmissionTimes[index]-orderedEmissionTimes[index-1],.1,1e-9,'adjacent dragons must be emitted exactly six 60 FPS frames apart');
near(orderedEmissionTimes.at(-1)-orderedEmissionTimes[0],.7,1e-9);
const captureSnapshot=runtime.snapshot();
near(captureSnapshot.simulationTime,50/60,1e-9);
assert.deepEqual(captureSnapshot.dragonArc,dragonMetrics,'capture snapshot must expose semantic motion calibration rather than requiring pixel inference');
runtime.reset();

assert.equal(cast('DRAGON-ARC'),true);
runtime.update(1/60,0);runtime.update(1/60,1/60);
let liveAimSnapshot=runtime.snapshot();
const firstDragon=liveAimSnapshot.effects.find(effect=>effect.type==='dragonProjectile'&&effect.emissionIndex===0);
assert.deepEqual(firstDragon.forward,{x:0,z:1});
assert.equal(firstDragon.body.length,DRAGON_ARC_SPEC.proxySegments);
assert.ok(firstDragon.body.some(sample=>sample.visible)&&firstDragon.body.some(sample=>!sample.visible),'segmented body must emerge behind the moving head');
const visibleProxy=scene.children.find(child=>/Dragon Arc neutral motion proxy/.test(child.name));
assert.equal(visibleProxy.children.length,DRAGON_ARC_SPEC.proxySegments);
firstDragon.body.forEach((sample,index)=>{assert.equal(visibleProxy.children[index].visible,sample.visible);near(visibleProxy.children[index].rotation.y,sample.yaw);});
const proxyTags=[];visibleProxy.traverse(object=>proxyTags.push(...Object.keys(object.userData||{})));
assert.ok(proxyTags.includes('dragonProxyMarker')&&proxyTags.includes('dragonProxyTangent'),'Gate 1 visuals must expose neutral path markers and tangent indicators');
assert.ok(!proxyTags.includes('dragonHead')&&!proxyTags.includes('dragonSegment'),'rejected dragon art must not survive in the motion proxy');
player.forwardX=1;player.forwardZ=0;
for(let frame=0;frame<6;frame++)runtime.update(1/60,(frame+2)/60);
liveAimSnapshot=runtime.snapshot();
assert.deepEqual(liveAimSnapshot.effects.find(effect=>effect.type==='dragonProjectile'&&effect.emissionIndex===0).forward,{x:0,z:1},'an emitted dragon keeps its sampled path basis');
assert.deepEqual(liveAimSnapshot.effects.find(effect=>effect.type==='dragonProjectile'&&effect.emissionIndex===1).forward,{x:1,z:0},'later emissions must sample live aim independently');
runtime.reset();player.forwardX=0;player.forwardZ=1;

mazeSegments.push({a:{x:-10,z:3},b:{x:10,z:3}});
assert.equal(cast('DRAGON-ARC'),true);step(.3,1/60);
assert.equal(runtime.snapshot().effects.filter(effect=>effect.type==='dragonProjectile').length,0,'curved swept carriers must stop at walls');
assert.equal(scene.children.filter(child=>/Dragon Arc neutral motion proxy/.test(child.name)).length,0,'wall cleanup must remove every proxy mesh');
mazeSegments.length=0;runtime.reset();

const tornadoTarget={x:1,z:0,hp:1000,radius:.5};const hostileRock={x:.8,z:0,r:.1,life:2,dead:false,mesh:{visible:true}};system.enemies=[tornadoTarget];system.hostileProjectiles=[hostileRock];
assert.equal(cast('WHIRLING-TORNADO'),true);const vortex=runtime.state.effects.find(effect=>effect.type==='whirlingTornado'),vortexOrigin={...vortex.position};step(1.1);
assert.deepEqual(vortexOrigin,{x:0,z:0},'base vortex must be stationary at the cast position');
assert.deepEqual(hits.filter(hit=>hit.options.whirlingTornadoTick).map(hit=>hit.amount),[8,8,8,8]);
assert.deepEqual(hits.filter(hit=>hit.options.whirlingTornadoFinisher).map(hit=>hit.amount),[10]);
assert.equal(hostileRock.dead,true,'visible vortex must erase eligible hostile projectiles');
runtime.reset();hits.length=0;system.hostileProjectiles=[];

const prisoner={x:0,z:3,hp:1000,radius:.5,vx:0,vz:0,knockX:0,knockZ:0,stunned:0};system.enemies=[prisoner];
assert.equal(cast('WATER-PRISON'),true);assert.equal(cast('WATER-PRISON'),true);assert.equal(runtime.state.waterAmmo,0,'two base ammo charges must be independently spendable');
step(.5);assert.equal(prisoner.__wizardWaterPrisonCount,2,'two projectiles may stack independent prison ownership on one target');
const prisonAnchor={x:prisoner.x,z:prisoner.z};step(4.8,.025,()=>{prisoner.x=7;prisoner.z=7;prisoner.knockX=5;prisoner.knockZ=5;});
assert.deepEqual({x:prisoner.x,z:prisoner.z},prisonAnchor,'active prison ownership must defeat external movement and displacement');
step(.8);
assert.equal(hits.filter(hit=>hit.options.waterPrisonImpact).length,2);
assert.equal(hits.filter(hit=>hit.options.waterPrisonTick).length,10,'each stacked prison must own exactly five ticks');
assert.ok(hits.filter(hit=>hit.options.waterPrisonTick).every(hit=>hit.amount===5));
assert.equal(prisoner.__wizardWaterPrisonCount,undefined,'final instance cleanup must release shared lock ownership');

runtime.dispose();
console.log('wizard rebuilt arcana runtime tests passed');
