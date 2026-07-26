import assert from 'node:assert/strict';
import {
  DRAGON_ARC_PLAYER_DIAMETER,
  DRAGON_ARC_SPEC,
  clockwiseOrbitPosition,
  dragonArcMotionMetrics,
  homingFlaresContractMetrics,
  installWizardRebuiltArcanaRuntime,
  sampleDragonArcBody,
  sampleDragonArcPath,
  sourceLockedAbilityRenderMode,
  waterPrisonContractMetrics,
  whirlingTornadoContractMetrics,
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
  TorusGeometry:Geometry,RingGeometry:Geometry,CircleGeometry:Geometry,
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

assert.equal(sourceLockedAbilityRenderMode('?capture=1&renderMode=proxy'),'proxy');
assert.equal(sourceLockedAbilityRenderMode('?capture=1&renderMode=source'),'source');
assert.equal(sourceLockedAbilityRenderMode('?capture=1&renderMode=style'),'style');
assert.equal(sourceLockedAbilityRenderMode('?renderMode=proxy'),'style','non-capture production must always use final style rendering');
const homingContract=homingFlaresContractMetrics(),tornadoContract=whirlingTornadoContractMetrics(),prisonContract=waterPrisonContractMetrics();
assert.deepEqual([homingContract.count,homingContract.storageDuration,homingContract.orbitDirection],[7,4,'clockwise']);
assert.equal(tornadoContract.gameplayRadius,tornadoContract.visibleRadius,'vortex art must cover the complete gameplay/defense footprint');
assert.deepEqual([tornadoContract.duration,tornadoContract.tickDamage,tornadoContract.finisherDamage],[.8,8,10]);
assert.ok(prisonContract.attachedVisualRadius>=prisonContract.projectileVisualRadius*3.9,'attached Water Prison must transform into a materially larger source globe');
assert.deepEqual(prisonContract.tickTimes,[1,2,3,4,5]);

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
assert.equal(new Set(flares.flares.map(flare=>flare.stableId)).size,7,'capture scenarios need one stable semantic ID per flare');
assert.equal(flares.renderMode,'style');
assert.ok(flares.flares.every(flare=>flare.visualMarkers.sourceSilhouette==='large-teardrop-flame'&&flare.visualMarkers.tails===3));
const flareLayers=[];flares.flares[0].mesh.traverse(object=>flareLayers.push(object.userData?.visualRole));
for(const role of['homingFlareBody','homingFlareShell','homingFlareCore','homingFlareTail','homingFlareSmoke'])assert.ok(flareLayers.includes(role),`production flare is missing ${role}`);
runtime.update(.05,0);
assert.ok(flares.flares.every(flare=>flare.mesh&&Number.isFinite(flare.position.x)),'stored halo must remain visible and positioned around the caster');
const flareTarget={x:0,z:6,hp:1000,radius:.5};system.enemies=[flareTarget];step(2.4);
assert.equal(hits.filter(hit=>hit.options.homingFlares).length,7,'every stored flare must independently acquire and hit');
assert.ok(hits.filter(hit=>hit.options.homingFlares).every(hit=>hit.amount===7));
assert.equal(runtime.snapshot().semanticEvents.filter(event=>event.arcanaId==='HOMING-FLARES'&&event.event==='flare-launched').length,7);
assert.equal(runtime.snapshot().semanticEvents.filter(event=>event.arcanaId==='HOMING-FLARES'&&event.event==='flare-hit').length,7);
assert.equal(scene.children.some(child=>/Homing Flares source-locked flare/.test(child.name)),false,'hit flares and their trails must clean completely');
runtime.reset();hits.length=0;system.enemies=[];

assert.equal(cast('HOMING-FLARES'),true);flares=runtime.state.effects.find(effect=>effect.type==='homingFlares');
for(let frame=0;frame<239;frame++)runtime.update(1/60,frame/60);
assert.ok(runtime.state.effects.includes(flares),'stored halo must still exist one frame before its four-second deadline');
runtime.update(1/60,239/60);
assert.equal(runtime.state.effects.some(effect=>effect.type==='homingFlares'),false,'unused flares must expire at four seconds, not four seconds plus flight life');
const expiryEvents=runtime.snapshot().semanticEvents.filter(event=>event.event==='flare-expired');
assert.equal(expiryEvents.length,7);assert.ok(expiryEvents.every(event=>event.reason==='storage-duration'&&event.storageAge===4));
runtime.reset();

assert.equal(cast('HOMING-FLARES'),true);flares=runtime.state.effects.find(effect=>effect.type==='homingFlares');
const interceptPosition=clockwiseOrbitPosition({slot:0,count:7,age:1/60,radius:flares.spec.orbitRadius});
const hostileFlareTarget={id:'capture-projectile',x:interceptPosition.x,z:interceptPosition.z,r:.12,life:2,dead:false,mesh:{visible:true}};system.hostileProjectiles=[hostileFlareTarget];runtime.update(1/60,0);
assert.equal(hostileFlareTarget.dead,true);assert.equal(runtime.snapshot().semanticEvents.filter(event=>event.event==='flare-intercepted').length,1);
assert.equal(flares.flares[0].state,'intercepted');
runtime.reset();system.hostileProjectiles=[];

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
assert.equal(runtime.snapshot().effects.some(effect=>effect.type==='pulse'),false,'finished Dragon Arc must own semantic launch/impact FX rather than generic pulses');
assert.equal(scene.children.some(child=>/Dragon Arc/.test(child.name)),false,'range expiry must clean finished Dragon Arc carriers and transient FX');
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
assert.equal(firstDragon.visualStage,'finished');
assert.deepEqual(firstDragon.visualMarkers,{stage:'finished',head:1,headLength:3.35,headWidth:1.95,headShare:.64,openJaw:true,jawLateralSpread:.36,upperJaw:1,lowerJaw:1,mouth:1,teeth:4,horns:2,eyeSockets:2,eyes:2,throatFan:3,mantleSegments:2,flameTongues:3,luminousMasses:5,bodySegments:8,hotBodyCores:2,tail:1,flameLayers:3,embers:7,sootPuffs:6,groundGlows:0});
const visibleProxy=scene.children.find(child=>/Dragon Arc source-locked flame serpent/.test(child.name));
assert.equal(visibleProxy.children.length,DRAGON_ARC_SPEC.proxySegments);
firstDragon.body.forEach((sample,index)=>{assert.equal(visibleProxy.children[index].visible,sample.visible);near(visibleProxy.children[index].rotation.y,sample.yaw);});
const proxyObjects=[];visibleProxy.traverse(object=>proxyObjects.push(object));const proxyTags=proxyObjects.flatMap(object=>Object.keys(object.userData||{}));
for(const tag of['dragonHead','dragonUpperJaw','dragonLowerJaw','dragonMouth','dragonTooth','dragonHorn','dragonBrow','dragonEyeSocket','dragonEye','dragonThroatFan','dragonMantle','dragonFlameTongue','dragonBodySegment','dragonTail','dragonFlameShell','dragonFlameCore','dragonFlameWisp','dragonEmber','dragonSootPuff'])assert.ok(proxyTags.includes(tag),`finished serpent is missing semantic layer ${tag}`);
const upperJawObject=proxyObjects.find(object=>object.userData?.dragonUpperJaw),lowerJawObject=proxyObjects.find(object=>object.userData?.dragonLowerJaw),mouthObject=proxyObjects.find(object=>object.userData?.dragonMouth);
assert.ok(upperJawObject.position.x<=-.18&&lowerJawObject.position.x>=.18,'jaw halves must separate laterally into a screen-readable V');
assert.ok(Math.abs(upperJawObject.rotation.y-lowerJawObject.rotation.y)>=.4,'jaw halves must oppose one another in yaw, not collapse into a bright tip');
assert.equal(mouthObject.material?.blending,THREE.NormalBlending,'the enlarged dark mouth wedge must survive additive bloom');
assert.ok(!proxyTags.includes('dragonGroundGlow'),'two-lane silhouette must remain unobscured by persistent ground glows');
assert.equal(proxyObjects.filter(object=>object.userData?.dragonFlameTongue!==undefined).length,3,'samples 3–5 must read as three source-sized tapered flame masses');
assert.equal(proxyObjects.filter(object=>object.userData?.dragonFlameCore!==undefined).length,3,'only the dominant head and two mantle samples may retain concentrated hot cores');
assert.equal(proxyObjects.filter(object=>object.userData?.dragonEmber!==undefined).length,7,'the full dragon must stay within the restrained ember budget');
assert.equal(proxyObjects.filter(object=>object.userData?.dragonSootPuff!==undefined).length,6,'the three tail samples must dissolve into two smoke puffs each');
for(let index=6;index<DRAGON_ARC_SPEC.proxySegments;index++){const tailObjects=[];visibleProxy.children[index].traverse(object=>tailObjects.push(object));assert.ok(tailObjects.some(object=>object.userData?.dragonSootPuff!==undefined),`tail sample ${index} needs smoke articulation`);assert.ok(!tailObjects.some(object=>object.userData?.dragonBodySegment!==undefined||object.userData?.dragonFlameShell!==undefined||object.userData?.dragonFlameCore!==undefined||object.userData?.dragonFlameTongue!==undefined),`tail sample ${index} must be smoke/embers only`);}
assert.ok(proxyObjects.find(object=>object.userData?.dragonHead)?.material?.blending===THREE.NormalBlending,'solid head silhouette must remain readable beneath additive fire');
assert.ok(proxyObjects.find(object=>object.userData?.dragonBodySegment!==undefined)?.material?.blending===THREE.NormalBlending,'body needs a solid non-additive silhouette');
assert.ok(proxyObjects.find(object=>object.userData?.dragonFlameCore!==undefined)?.material?.blending===THREE.AdditiveBlending,'white-hot core must use the established luminous layer');
near(visibleProxy.children[0].scale.x,.65,1e-9,'finished carrier must begin the approved 3–5 frame scale-in on its sampled path');
const launchFx=liveAimSnapshot.effects.find(effect=>effect.type==='arcanaTransientFx'&&effect.visualKind==='launch');
assert.equal(launchFx?.arcanaId,'DRAGON-ARC');assert.doesNotMatch(launchFx.type,/dragon|projectile/i,'launch polish must not inflate capture projectile metrics');
const launchMesh=scene.children.find(child=>/Dragon Arc launch flare/.test(child.name)),launchTags=[];launchMesh.traverse(object=>launchTags.push(...Object.keys(object.userData||{})));
assert.ok(launchTags.includes('dragonLaunchCore')&&launchTags.includes('dragonLaunchStreak'));assert.ok(!launchTags.includes('dragonLaunchRing'),'launch must be a short throat flare, not a ground ring');
const animatedEmber=proxyObjects.find(object=>object.userData?.dragonEmber!==undefined),emberBefore={x:animatedEmber.position.x,y:animatedEmber.position.y,z:animatedEmber.position.z};
player.forwardX=1;player.forwardZ=0;
for(let frame=0;frame<3;frame++)runtime.update(1/60,(frame+2)/60);
near(visibleProxy.children[0].scale.x,1.05,1e-9,'carrier must overshoot authored scale on the third launch frame');
for(let frame=3;frame<6;frame++)runtime.update(1/60,(frame+2)/60);
liveAimSnapshot=runtime.snapshot();
assert.deepEqual(liveAimSnapshot.effects.find(effect=>effect.type==='dragonProjectile'&&effect.emissionIndex===0).forward,{x:0,z:1},'an emitted dragon keeps its sampled path basis');
assert.deepEqual(liveAimSnapshot.effects.find(effect=>effect.type==='dragonProjectile'&&effect.emissionIndex===1).forward,{x:1,z:0},'later emissions must sample live aim independently');
assert.notDeepEqual({x:animatedEmber.position.x,y:animatedEmber.position.y,z:animatedEmber.position.z},emberBefore,'seeded embers must articulate along the sampled body');
near(visibleProxy.children[0].scale.x,1,1e-9,'carrier must settle to authored scale after the fifth frame without changing its path');
runtime.reset();player.forwardX=0;player.forwardZ=1;

hits.length=0;const impactSample=sampleDragonArcPath({origin:dragonOrigin,distance:3,emissionIndex:0}),impactTarget={x:impactSample.x,z:impactSample.z,hp:1000,radius:.35};system.enemies=[impactTarget];
assert.equal(cast('DRAGON-ARC'),true);step(.16,1/60);
const enemyImpact=runtime.snapshot().effects.find(effect=>effect.type==='arcanaTransientFx'&&effect.visualKind==='impact-enemy');
assert.ok(enemyImpact,'enemy contact must create a semantic white-gold impact');
assert.ok(runtime.snapshot().effects.some(effect=>effect.type==='dragonProjectile'),'impact polish must not consume the piercing carrier');
const impactMesh=scene.children.find(child=>/Dragon Arc white-gold impact/.test(child.name)),impactTags=[];impactMesh.traverse(object=>impactTags.push(...Object.keys(object.userData||{})));
assert.ok(impactTags.includes('dragonImpactCore')&&impactTags.includes('dragonImpactShell')&&impactTags.includes('dragonImpactRing')&&impactTags.includes('dragonImpactSpark'));
assert.equal(hits.filter(hit=>hit.options.dragonArc).length,1);assert.equal(hits.find(hit=>hit.options.dragonArc).amount,8);
runtime.reset();system.enemies=[];hits.length=0;

mazeSegments.push({a:{x:-10,z:3},b:{x:10,z:3}});
assert.equal(cast('DRAGON-ARC'),true);step(.3,1/60);
assert.equal(runtime.snapshot().effects.filter(effect=>effect.type==='dragonProjectile').length,0,'curved swept carriers must stop at walls');
assert.equal(scene.children.filter(child=>/Dragon Arc source-locked flame serpent/.test(child.name)).length,0,'wall cleanup must remove every articulated carrier mesh');
assert.ok(runtime.snapshot().effects.some(effect=>effect.type==='arcanaTransientFx'&&effect.visualKind==='impact-wall'),'wall contact must retain a short white-gold impact');
mazeSegments.length=0;runtime.reset();assert.equal(scene.children.some(child=>/Dragon Arc/.test(child.name)),false,'reset must clean launch, impact, ember, glow, and carrier meshes');

const tornadoTarget={x:1,z:0,hp:1000,radius:.5};const hostileRock={x:.8,z:0,r:.1,life:2,dead:false,mesh:{visible:true}};system.enemies=[tornadoTarget];system.hostileProjectiles=[hostileRock];
assert.equal(cast('WHIRLING-TORNADO'),true);const vortex=runtime.state.effects.find(effect=>effect.type==='whirlingTornado'),vortexOrigin={...vortex.position};step(1.1);
assert.equal(vortex.visualMarkers.visibleRadius,vortex.spec.radius,'source silhouette and collision footprint must use one radius contract');
assert.equal(vortex.visualMarkers.lanes,7);assert.equal(vortex.visualMarkers.cores,6);assert.equal(vortex.visualMarkers.wisps,14);
const vortexLayers=[];vortex.mesh.traverse(object=>vortexLayers.push(object.userData?.visualRole));
for(const role of['whirlingTornadoFootprint','whirlingTornadoBody','whirlingTornadoLane','whirlingTornadoCore','whirlingTornadoWisp'])assert.ok(vortexLayers.includes(role),`production vortex is missing ${role}`);
assert.deepEqual(vortexOrigin,{x:0,z:0},'base vortex must be stationary at the cast position');
assert.deepEqual(hits.filter(hit=>hit.options.whirlingTornadoTick).map(hit=>hit.amount),[8,8,8,8]);
assert.deepEqual(hits.filter(hit=>hit.options.whirlingTornadoFinisher).map(hit=>hit.amount),[10]);
assert.ok(hits.find(hit=>hit.options.whirlingTornadoFinisher).knock.x>0,'finisher must push a target on the positive-x side outward');
assert.equal(hostileRock.dead,true,'visible vortex must erase eligible hostile projectiles');
const tornadoEvents=runtime.snapshot().semanticEvents.filter(event=>event.arcanaId==='WHIRLING-TORNADO');
assert.deepEqual(tornadoEvents.filter(event=>event.event==='tick').map(event=>event.tick),[1,2,3,4]);
assert.equal(tornadoEvents.filter(event=>event.event==='finisher').length,1);assert.equal(tornadoEvents.filter(event=>event.event==='projectile-intercepted').length,1);assert.equal(tornadoEvents.filter(event=>event.event==='complete').length,1);
assert.equal(scene.children.some(child=>/Whirling Tornado source-locked vortex/.test(child.name)),false,'vortex mesh must clean after its authored finisher window');
runtime.reset();hits.length=0;system.hostileProjectiles=[];

const prisoner={id:'capture-prisoner',x:0,z:3,hp:1000,radius:.5,vx:0,vz:0,knockX:0,knockZ:0,stunned:0};system.enemies=[prisoner];
assert.equal(cast('WATER-PRISON'),true);assert.equal(cast('WATER-PRISON'),true);assert.equal(runtime.state.waterAmmo,0,'two base ammo charges must be independently spendable');
let prisonSnapshots=runtime.snapshot().effects.filter(effect=>effect.type==='waterPrison');
assert.equal(new Set(prisonSnapshots.map(effect=>effect.stableId)).size,2);assert.ok(prisonSnapshots.every(effect=>effect.phase==='carrier'&&effect.visualMarkers.carrierRadius===.34));
assert.equal(scene.children.filter(child=>/compact source-locked carrier/.test(child.name)).length,2,'each ammo charge owns a compact incoming carrier visual');
step(.5);assert.equal(prisoner.__wizardWaterPrisonCount,2,'two projectiles may stack independent prison ownership on one target');
prisonSnapshots=runtime.snapshot().effects.filter(effect=>effect.type==='waterPrison');
assert.ok(prisonSnapshots.every(effect=>effect.phase==='attached'&&effect.visualMarkers.attachedRadius===1.35));
assert.ok(prisonSnapshots.every(effect=>effect.visualMarkers.attachedRadius>=effect.visualMarkers.carrierRadius*3.9));
assert.equal(scene.children.filter(child=>/large source-locked attached globe/.test(child.name)).length,2,'carrier contact must replace, not merely enlarge, the incoming mesh');
const prisonLayers=[];runtime.state.effects.find(effect=>effect.type==='waterPrison')?.mesh.traverse(object=>prisonLayers.push(object.userData?.visualRole));
for(const role of['waterPrisonAttachedShell','waterPrisonAttachedRim','waterPrisonShellPatch','waterPrisonInternalFragment','waterPrisonAttachedDroplet'])assert.ok(prisonLayers.includes(role),`production prison is missing ${role}`);
const prisonAnchor={x:prisoner.x,z:prisoner.z};step(4.8,.025,()=>{prisoner.x=7;prisoner.z=7;prisoner.knockX=5;prisoner.knockZ=5;});
assert.deepEqual({x:prisoner.x,z:prisoner.z},prisonAnchor,'active prison ownership must defeat external movement and displacement');
step(.8);
assert.equal(hits.filter(hit=>hit.options.waterPrisonImpact).length,2);
assert.equal(hits.filter(hit=>hit.options.waterPrisonTick).length,10,'each stacked prison must own exactly five ticks');
assert.ok(hits.filter(hit=>hit.options.waterPrisonTick).every(hit=>hit.amount===5));
assert.equal(prisoner.__wizardWaterPrisonCount,undefined,'final instance cleanup must release shared lock ownership');
const waterEvents=runtime.snapshot().semanticEvents.filter(event=>event.arcanaId==='WATER-PRISON');
assert.equal(waterEvents.filter(event=>event.event==='attached').length,2);assert.equal(waterEvents.filter(event=>event.event==='tick').length,10);assert.equal(waterEvents.filter(event=>event.event==='released'&&event.reason==='duration').length,2);
assert.equal(scene.children.some(child=>/Water Prison large source-locked attached globe/.test(child.name)),false,'every independently owned attached globe must clean after release');

runtime.reset();hits.length=0;const doomedPrisoner={id:'doomed-prisoner',x:0,z:2.6,hp:100,radius:.5,vx:0,vz:0,knockX:0,knockZ:0,stunned:0};system.enemies=[doomedPrisoner];assert.equal(cast('WATER-PRISON'),true);step(.3);assert.equal(doomedPrisoner.__wizardWaterPrisonCount,1);doomedPrisoner.hp=0;system.enemies=[];runtime.update(1/60,0);
assert.equal(doomedPrisoner.__wizardWaterPrisonCount,undefined,'target death must release the final position-lock owner');
assert.equal(runtime.snapshot().semanticEvents.filter(event=>event.event==='released'&&event.reason==='target-invalid').length,1);

runtime.reset();mazeSegments.push({a:{x:-4,z:2},b:{x:4,z:2}});system.enemies=[];assert.equal(cast('WATER-PRISON'),true);step(.2,1/60);assert.equal(runtime.state.effects.some(effect=>effect.type==='waterPrison'),false,'carrier must terminate at the first wall');assert.equal(runtime.snapshot().semanticEvents.filter(event=>event.event==='carrier-ended'&&event.reason==='wall').length,1);mazeSegments.length=0;

runtime.dispose();

const productionSearch=location.search;
for(const mode of['proxy','source']){
  location.search=`?enemyLab=1&capture=1&renderMode=${mode}`;const modeScene=new Group(),modeRuntime=installWizardRebuiltArcanaRuntime({THREE,scene:modeScene,getPlayer:()=>player,getEnemySystem:()=>system,getMazeSegments:()=>[]});
  assert.equal(modeRuntime.cast({arcanaId:'HOMING-FLARES'}),true);assert.equal(modeRuntime.cast({arcanaId:'WHIRLING-TORNADO'}),true);assert.equal(modeRuntime.cast({arcanaId:'WATER-PRISON'}),true);
  const modeSnapshot=modeRuntime.snapshot(),modeEffects=modeSnapshot.effects.filter(effect=>['homingFlares','whirlingTornado','waterPrison'].includes(effect.type));assert.equal(modeSnapshot.renderMode,mode);assert.equal(modeEffects.length,3);assert.ok(modeEffects.every(effect=>effect.renderMode===mode));
  const modeHoming=modeEffects.find(effect=>effect.type==='homingFlares'),modeTornado=modeEffects.find(effect=>effect.type==='whirlingTornado'),modeWater=modeEffects.find(effect=>effect.type==='waterPrison');
  if(mode==='proxy'){assert.ok(modeHoming.flares.every(flare=>flare.visualMarkers.tails===0&&flare.visualMarkers.solidBodies===0));assert.equal(modeTornado.visualMarkers.lanes,0);assert.equal(modeWater.visualMarkers.droplets,0);}
  else{assert.ok(modeHoming.flares.every(flare=>flare.visualMarkers.tails===3&&flare.visualMarkers.smoke===0));assert.equal(modeTornado.visualMarkers.lanes,7);assert.equal(modeTornado.visualMarkers.wisps,0);assert.equal(modeWater.visualMarkers.droplets,3);}
  modeRuntime.dispose();assert.equal(modeScene.children.length,0,`${mode} capture reset must dispose every contract/source mesh`);
}
location.search=productionSearch;
console.log('wizard rebuilt arcana runtime tests passed');
