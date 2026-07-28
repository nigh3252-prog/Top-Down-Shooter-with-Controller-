import assert from 'node:assert/strict';
import {
  AQUA_ARC_BEATS,
  CHAOS_CRUSHER_BEATS,
  ICE_DAGGER_BEATS,
  RIP_TIDE_BEATS,
  SOURCE_KNOCKBACK_WORLD_SCALE,
  WIZARD_NEXT_TWENTY_BASICS_SEMANTIC_EVENT,
  aquaArcStreamSpec,
  buildAquaArcSchedule,
  chaosCrusherBeatSpec,
  iceDaggerBeatSpec,
  installWizardNextTwentyBasicsRuntime,
  normalizeNextTwentyBasicsVisualMode,
  ripTideRippleSpec,
  sampleAttachedThrust,
  sampleChaosCompression,
  sampleWaterCarrier,
} from '../src/wizard-next-twenty-basics-runtime.js';

class Transform{
  constructor(){this.x=0;this.y=0;this.z=0;}
  set(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;return this;}
  setScalar(value){return this.set(value,value,value);}
}
class Object3D{
  constructor(){this.children=[];this.position=new Transform();this.rotation=new Transform();this.scale=new Transform().set(1,1,1);this.userData={};this.parent=null;this.visible=true;this.name='';}
  add(...children){for(const child of children){child.parent=this;this.children.push(child);}return this;}
  remove(child){const index=this.children.indexOf(child);if(index>=0)this.children.splice(index,1);child.parent=null;}
  traverse(visitor){visitor(this);for(const child of this.children)child.traverse?.(visitor);}
}
class Group extends Object3D{}
class Geometry{constructor(...args){this.args=args;}setFromPoints(points){this.points=points;return this;}dispose(){this.disposed=true;}}
class Material{constructor(options={}){Object.assign(this,options);}dispose(){this.disposed=true;}}
class Mesh extends Object3D{constructor(geometry=new Geometry(),material=new Material()){super();this.geometry=geometry;this.material=material;}}
const THREE={
  Group,Mesh,
  BoxGeometry:Geometry,ConeGeometry:Geometry,RingGeometry:Geometry,SphereGeometry:Geometry,TorusGeometry:Geometry,
  MeshBasicMaterial:Material,AdditiveBlending:'add',NormalBlending:'normal',DoubleSide:'double',
};

class EventTargetMock{
  constructor(){this.listeners=new Map();this.parent=this;this.frameElement=null;this.semantic=[];}
  addEventListener(type,listener){const list=this.listeners.get(type)||[];list.push(listener);this.listeners.set(type,list);}
  removeEventListener(type,listener){this.listeners.set(type,(this.listeners.get(type)||[]).filter(value=>value!==listener));}
  dispatchEvent(event){if(event.type===WIZARD_NEXT_TWENTY_BASICS_SEMANTIC_EVENT)this.semantic.push(event.detail);for(const listener of this.listeners.get(event.type)||[])listener(event);return true;}
}

globalThis.CustomEvent=class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}};
globalThis.location={search:'?enemyLab=1&capture=1&stage=contract',pathname:'/combat-arena.html'};
globalThis.window=new EventTargetMock();
globalThis.window.__abilityCapture={snapshot:()=>({stage:'contract'})};
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};

assert.deepEqual(ICE_DAGGER_BEATS.map(beat=>beat.damage),[6,6,8,10]);
assert.deepEqual(RIP_TIDE_BEATS.map(beat=>beat.damage),[8,7,5]);
assert.deepEqual(AQUA_ARC_BEATS.map(beat=>beat.count),[1,1,2]);
assert.equal(CHAOS_CRUSHER_BEATS.length,3);
assert.equal(SOURCE_KNOCKBACK_WORLD_SCALE,.1);
for(const schedule of[ICE_DAGGER_BEATS,RIP_TIDE_BEATS,AQUA_ARC_BEATS,CHAOS_CRUSHER_BEATS])assert.ok(schedule.every((entry,index)=>index===0||entry.time>schedule[index-1].time));

assert.equal(iceDaggerBeatSpec({beat:4}).damage,10);
assert.equal(iceDaggerBeatSpec({beat:4}).releasesShard,false);
assert.equal(iceDaggerBeatSpec({beat:1}).freezes,false);
assert.deepEqual([1,2,3].map(beat=>ripTideRippleSpec({beat}).damage),[8,7,5]);
assert.equal(ripTideRippleSpec().aimPolicy,'activation-snapshot');
assert.equal(ripTideRippleSpec().piercesEnemies,true);
assert.equal(ripTideRippleSpec().destroysHostileProjectiles,true);
const aquaSchedule=buildAquaArcSchedule();
assert.equal(aquaSchedule.length,4);
assert.deepEqual(aquaSchedule.map(event=>event.beat),[1,2,3,3]);
assert.deepEqual(aquaSchedule.map(event=>event.knockback),[5,5,8,8]);
assert.ok(aquaSchedule.every(event=>event.damage===8&&event.piercesEnemies&&!event.endpointBurst&&!event.freezes));
assert.deepEqual(aquaSchedule.slice(2).map(event=>event.lateralOffset),[-.28,.28]);
const chaos=chaosCrusherBeatSpec();
assert.deepEqual({rift:chaos.rift.damage,core:chaos.core.damage,riftKnockback:chaos.rift.knockback,coreKnockback:chaos.core.knockback},{rift:8,core:6,riftKnockback:15,coreKnockback:10});
assert.deepEqual(chaos.subtypes,['melee','projectile']);
assert.equal(chaos.enhanced,false);

const thrustStart=sampleAttachedThrust({origin:{x:2,z:3},direction:{x:0,z:1},progress:0,reach:4});
const thrustPeak=sampleAttachedThrust({origin:{x:2,z:3},direction:{x:0,z:1},progress:.62,reach:4});
assert.equal(thrustStart.distance,0);
assert.ok(thrustPeak.distance>3.5&&thrustPeak.x===2&&thrustPeak.z>6.5);
const waterSample=sampleWaterCarrier({origin:{x:1,z:2},direction:{x:1,z:0},distance:3,lateralOffset:.4,wave:0});
assert.deepEqual({x:waterSample.x,z:waterSample.z},{x:4,z:1.6});
const compressed=sampleChaosCompression({progress:1,expandedRadius:1.25,coreRadius:.34});
assert.ok(Math.abs(compressed.radius-.34)<1e-9);
assert.ok(sampleChaosCompression({progress:.5}).radius<1.25);
assert.deepEqual(['motion','proxy','contract','reference','source','style'].map(normalizeNextTwentyBasicsVisualMode),['contract','contract','contract','source','source','style']);

const scene=new Group(),player={x:0,z:0,forwardX:0,forwardZ:1},moveInput={x:0,z:1,magnitude:1},hits=[],walls=[],lockCalls=[],facingLockCalls=[];
const system={
  enemies:[],hostileProjectiles:[],heightScale:1,
  damageEnemy(enemy,amount,knock,options){hits.push({enemy,amount,knock,options});enemy.hp-=amount;return true;},
};
const runtime=installWizardNextTwentyBasicsRuntime({
  THREE,scene,getPlayer:()=>player,getMoveInput:()=>moveInput,getEnemySystem:()=>system,getMazeSegments:()=>walls,
  translatePlayer(dx,dz){player.x+=dx;player.z+=dz;return Math.hypot(dx,dz);},
  setMovementLock(locked,detail){lockCalls.push({locked,detail});},
  setFacingLock(direction,detail){facingLockCalls.push({direction,detail});},
});
const cast=id=>runtime.cast({id:`WOL-${id}`,arcanaId:id});
const step=(seconds,dt=.01)=>{for(let elapsed=0;elapsed<seconds-1e-9;elapsed+=dt)runtime.update(Math.min(dt,seconds-elapsed),elapsed);};
const resetWorld=()=>{runtime.reset();hits.length=0;walls.length=0;system.enemies=[];system.hostileProjectiles=[];player.x=0;player.z=0;player.forwardX=0;player.forwardZ=1;moveInput.x=0;moveInput.z=1;moveInput.magnitude=1;lockCalls.length=0;facingLockCalls.length=0;location.search='?enemyLab=1&capture=1&stage=contract';window.__abilityCapture.snapshot=()=>({stage:'contract'});};
const partsWithTag=(root,key)=>{const parts=[];root?.traverse?.(part=>{if(Object.prototype.hasOwnProperty.call(part.userData||{},key))parts.push(part);});return parts;};

// Ice Dagger: four attached, independently aimed thrusts with movement gated by stick magnitude.
const iceTarget={id:'ice-target',x:0,z:2.6,hp:1000,radius:2};system.enemies=[iceTarget];
assert.equal(cast('ICE-DAGGER'),true);
assert.equal(runtime.snapshot().movementLocked,true,'Ice Dagger must suppress ordinary locomotion while reading movement intent for authored advances');
assert.equal(lockCalls.at(-1).locked,true);
assert.equal(cast('AQUA-ARC'),false,'another basic cannot overlap Ice Dagger movement commitment');
step(1.05);
assert.deepEqual(hits.map(hit=>hit.amount),[6,6,8,10]);
assert.ok(hits.every(hit=>hit.options.iceDagger&&hit.options.freeze===false));
assert.ok(player.z>2.6,'non-neutral movement should advance once per thrust');
assert.equal(runtime.snapshot().movementLocked,false);
assert.equal(lockCalls.at(-1).locked,false);
let events=runtime.snapshot().semanticEvents.filter(event=>event.kind==='ice-dagger-thrust');
assert.equal(events.length,4);assert.deepEqual(events.map(event=>event.stableId),['ICE-DAGGER:0001:thrust:01','ICE-DAGGER:0001:thrust:02','ICE-DAGGER:0001:thrust:03','ICE-DAGGER:0001:thrust:04']);
assert.ok(events.every(event=>event.liveAim&&!event.releasesShard&&!event.freezes&&event.movementApplied>0));

resetWorld();moveInput.magnitude=0;assert.equal(cast('ICE-DAGGER'),true);step(.07);player.forwardX=1;player.forwardZ=0;step(.23);player.forwardX=0;player.forwardZ=-1;step(.23);player.forwardX=-1;player.forwardZ=0;step(.50);
events=runtime.snapshot().semanticEvents.filter(event=>event.kind==='ice-dagger-thrust');
assert.deepEqual(events.map(event=>event.direction),[{x:0,z:1},{x:1,z:0},{x:0,z:-1},{x:-1,z:0}],'each thrust must sample current aim');
assert.ok(events.every(event=>event.movementApplied===0&&event.movementMagnitude===0));
assert.deepEqual({x:player.x,z:player.z},{x:0,z:0});

resetWorld();walls.push({a:{x:-3,z:1},b:{x:3,z:1}});system.enemies=[{id:'behind-ice-wall',x:0,z:2,hp:100,radius:.3}];cast('ICE-DAGGER');step(.10);
assert.equal(hits.length,0,'attached thrust damage must not pass through scenery');
const clippedThrust=runtime.snapshot().semanticEvents.find(event=>event.kind==='ice-dagger-thrust');assert.equal(clippedThrust.attackWallClipped,true);

// Rip Tide: one press, locked aim/movement, three piercing projectile-erasing crescents.
resetWorld();const ripNear={id:'rip-near',x:0,z:2.2,hp:1000,radius:.3},ripFar={id:'rip-far',x:0,z:4.6,hp:1000,radius:.3},ripProjectile={id:'rip-shot',x:0,z:3,r:.14,life:2,dead:false,mesh:{visible:true}};system.enemies=[ripNear,ripFar];system.hostileProjectiles=[ripProjectile];
assert.equal(cast('RIP-TIDE'),true);assert.equal(runtime.snapshot().movementLocked,true);assert.equal(runtime.snapshot().facingLocked,true);assert.equal(lockCalls.at(-1).locked,true);assert.deepEqual(facingLockCalls.at(-1).direction,{x:0,z:1});assert.equal(cast('RIP-TIDE'),false,'an authored Rip Tide sequence cannot be restarted mid-commitment');assert.equal(cast('AQUA-ARC'),false,'another basic cannot overlap Rip Tide commitment');player.forwardX=1;player.forwardZ=0;step(.50);assert.equal(runtime.snapshot().movementLocked,true,'Rip Tide lock must span its complete authored sequence');assert.equal(runtime.snapshot().facingLocked,true,'Rip Tide facing must remain locked for the complete authored sequence');step(.06);assert.equal(runtime.snapshot().movementLocked,false);assert.equal(runtime.snapshot().facingLocked,false);assert.equal(facingLockCalls.at(-1).direction,null);step(.44);
for(const enemy of[ripNear,ripFar])assert.deepEqual(hits.filter(hit=>hit.enemy===enemy).map(hit=>hit.amount),[8,7,5]);
assert.equal(ripProjectile.dead,true);assert.equal(ripProjectile.mesh.visible,false);assert.equal(runtime.snapshot().movementLocked,false);assert.equal(lockCalls.at(-1).locked,false);
events=runtime.snapshot().semanticEvents.filter(event=>event.kind==='rip-tide-ripple-emitted');assert.equal(events.length,3);assert.ok(events.every(event=>event.direction.x===0&&event.direction.z===1&&event.aimPolicy==='activation-snapshot'));
assert.equal(runtime.snapshot().semanticEvents.filter(event=>event.kind==='rip-tide-projectile-intercepted').length,1);

resetWorld();assert.equal(cast('RIP-TIDE'),true);runtime.reset();assert.equal(runtime.snapshot().movementLocked,false);assert.equal(runtime.snapshot().facingLocked,false);assert.equal(lockCalls.at(-1).locked,false);assert.equal(facingLockCalls.at(-1).direction,null,'room/respawn cleanup must release a mid-sequence facing lock');

resetWorld();walls.push({a:{x:-3,z:2.5},b:{x:3,z:2.5}});system.enemies=[{id:'behind-rip-wall',x:0,z:4,hp:100,radius:.3}];cast('RIP-TIDE');step(.8);assert.equal(hits.length,0);assert.ok(runtime.snapshot().semanticEvents.some(event=>event.kind==='rip-tide-ripple-wall-fizzle'));

// A coarse fixed step must still resolve eligible contact/interception before the carrier reaches scenery.
resetWorld();walls.push({a:{x:-3,z:2},b:{x:3,z:2}});const beforeWallTarget={id:'before-rip-wall',x:0,z:1.54,hp:100,radius:.18},beforeWallShot={id:'before-rip-shot',x:0,z:1.72,r:.10,life:2,dead:false,mesh:{visible:true}};system.enemies=[beforeWallTarget];system.hostileProjectiles=[beforeWallShot];cast('RIP-TIDE');runtime.update(.06,0);runtime.update(.10,.06);
assert.equal(hits.length,1);assert.equal(hits[0].amount,8);assert.equal(beforeWallShot.dead,true);assert.ok(runtime.snapshot().semanticEvents.some(event=>event.kind==='rip-tide-ripple-wall-fizzle'&&event.targetIds.includes('before-rip-wall')&&event.interceptedIds.includes('before-rip-shot')));

// Aqua Arc: 1 -> 1 -> 2, with independent final carriers and source knockback values.
resetWorld();const aquaTarget={id:'aqua-target',x:0,z:3.3,hp:1000,radius:.65};system.enemies=[aquaTarget];cast('AQUA-ARC');step(1.15);
assert.deepEqual(hits.map(hit=>hit.amount),[8,8,8,8]);
assert.deepEqual(hits.map(hit=>Number(Math.hypot(hit.knock.x,hit.knock.z).toFixed(3))),[.5,.5,.8,.8]);
assert.deepEqual(hits.map(hit=>hit.options.sourceKnockback),[5,5,8,8],'telemetry must preserve source knockback units');
assert.deepEqual(hits.map(hit=>Number(hit.options.worldKnockback.toFixed(3))),[.5,.5,.8,.8],'runtime must convert source knockback into world displacement units');
events=runtime.snapshot().semanticEvents.filter(event=>event.kind==='aqua-arc-stream-emitted');assert.equal(events.length,4);assert.equal(new Set(events.map(event=>event.stableId)).size,4);assert.deepEqual(events.map(event=>event.beat),[1,2,3,3]);
assert.ok(events.every(event=>event.piercesEnemies&&!event.endpointBurst&&!event.freezes));

resetWorld();cast('AQUA-ARC');step(.07);player.forwardX=1;player.forwardZ=0;step(.27);player.forwardX=0;player.forwardZ=-1;step(.50);
events=runtime.snapshot().semanticEvents.filter(event=>event.kind==='aqua-arc-stream-emitted');assert.deepEqual(events.map(event=>event.direction),[{x:0,z:1},{x:1,z:0},{x:0,z:-1},{x:0,z:-1}]);

// Chaos Crusher: every beat transforms one proximal hybrid rift into one piercing hybrid core.
resetWorld();const chaosClose={id:'chaos-close',x:0,z:1.5,hp:1000,radius:.3},chaosFar={id:'chaos-far',x:0,z:5.0,hp:1000,radius:.3},riftShot={id:'rift-shot',x:0,z:1.3,r:.12,life:2,dead:false},coreShot={id:'core-shot',x:0,z:4,r:.12,life:2,dead:false};system.enemies=[chaosClose,chaosFar];system.hostileProjectiles=[riftShot,coreShot];cast('CHAOS-CRUSHER');step(1.5);
assert.deepEqual(hits.filter(hit=>hit.enemy===chaosClose).map(hit=>hit.amount),[8,6,8,6,8,6]);
assert.deepEqual(hits.filter(hit=>hit.enemy===chaosFar).map(hit=>hit.amount),[6,6,6]);
assert.ok(hits.every(hit=>hit.options.chaosCrusher&&hit.options.melee&&hit.options.projectile));
const chaosRiftHits=hits.filter(hit=>hit.options.chaosRift),chaosCoreHits=hits.filter(hit=>!hit.options.chaosRift);
assert.ok(chaosRiftHits.every(hit=>hit.options.sourceKnockback===15&&Number(hit.options.worldKnockback.toFixed(3))===1.5&&Number(Math.hypot(hit.knock.x,hit.knock.z).toFixed(3))===1.5));
assert.ok(chaosCoreHits.every(hit=>hit.options.sourceKnockback===10&&Number(hit.options.worldKnockback.toFixed(3))===1&&Number(Math.hypot(hit.knock.x,hit.knock.z).toFixed(3))===1));
assert.equal(riftShot.dead,true);assert.equal(coreShot.dead,true);
assert.equal(runtime.snapshot().semanticEvents.filter(event=>event.kind==='chaos-crusher-rift-struck').length,3);
assert.equal(runtime.snapshot().semanticEvents.filter(event=>event.kind==='chaos-crusher-rift-compressed').length,3);
assert.equal(runtime.snapshot().semanticEvents.filter(event=>event.kind==='chaos-crusher-core-fired').length,3);

resetWorld();walls.push({a:{x:-3,z:2.7},b:{x:3,z:2.7}});system.enemies=[{id:'behind-chaos-wall',x:0,z:4.5,hp:100,radius:.3}];cast('CHAOS-CRUSHER');step(1.2);assert.equal(hits.length,0);assert.ok(runtime.snapshot().semanticEvents.some(event=>event.kind==='chaos-crusher-core-wall-fizzle'));

resetWorld();walls.push({a:{x:-3,z:2},b:{x:3,z:2}});const behindRiftWallShot={id:'behind-rift-wall-shot',x:0,z:2.2,r:.12,life:2,dead:false,mesh:{visible:true}};system.hostileProjectiles=[behindRiftWallShot];cast('CHAOS-CRUSHER');step(.06);
assert.equal(behindRiftWallShot.dead,false,'an expanded Chaos rift must not intercept a hostile projectile through scenery');
assert.equal(runtime.snapshot().semanticEvents.filter(event=>event.kind==='chaos-rift-projectile-intercepted').length,0);

// Capture modes are stage-specific; production is always final style.
resetWorld();cast('CHAOS-CRUSHER');step(.06);let rift=runtime.state.effects.find(effect=>effect.type==='chaosCrusherRift');assert.equal(rift.visualMode,'contract');assert.equal(rift.mesh.children.length,1);runtime.reset();
location.search='?enemyLab=1&capture=1&stage=reference';window.__abilityCapture.snapshot=()=>({stage:'reference'});cast('CHAOS-CRUSHER');step(.06);rift=runtime.state.effects.find(effect=>effect.type==='chaosCrusherRift');const sourceParts=rift.mesh.children.length;assert.equal(rift.visualMode,'source');assert.ok(sourceParts>5);runtime.reset();
location.search='?enemyLab=1&capture=1&stage=style';window.__abilityCapture.snapshot=()=>({stage:'style'});cast('CHAOS-CRUSHER');step(.06);rift=runtime.state.effects.find(effect=>effect.type==='chaosCrusherRift');assert.equal(rift.visualMode,'style');assert.ok(rift.mesh.children.length>sourceParts);runtime.reset();
location.search='?enemyLab=1';window.__abilityCapture.snapshot=()=>({stage:'contract'});cast('CHAOS-CRUSHER');step(.06);rift=runtime.state.effects.find(effect=>effect.type==='chaosCrusherRift');assert.equal(rift.visualMode,'style','production must never expose the neutral contract proxy');

// Style silhouettes must remain source-readable without leaking into the
// neutral contract renderer or changing collision geometry.
resetWorld();location.search='?enemyLab=1&capture=1&stage=style';window.__abilityCapture.snapshot=()=>({stage:'style'});cast('ICE-DAGGER');step(.06);const iceStrike=runtime.state.effects.find(effect=>effect.type==='iceDaggerStrike'),iceShell=partsWithTag(iceStrike.mesh,'iceBladeShell')[0],iceEdge=partsWithTag(iceStrike.mesh,'iceHotEdge')[0];
assert.ok(iceShell&&iceShell.geometry.args[0]<=.25&&iceShell.geometry.args[1]>=iceDaggerBeatSpec().reach,'Ice Dagger must be narrow and source-length');assert.equal(iceEdge.material.wireframe,true);assert.ok(partsWithTag(iceStrike.mesh,'iceTrailingShard').length>=7);

resetWorld();location.search='?enemyLab=1&capture=1&stage=style';window.__abilityCapture.snapshot=()=>({stage:'style'});cast('RIP-TIDE');step(.06);const ripple=runtime.state.effects.find(effect=>effect.type==='ripTideRipple'),rippleBody=partsWithTag(ripple.mesh,'rippleBody')[0];
assert.equal(rippleBody.userData.uprightCrescent,true);assert.ok(Math.abs(rippleBody.rotation.x)<.6,'Rip Tide must stand up rather than lie flat on the arena floor');assert.ok(rippleBody.geometry.args[1]>1,'Rip Tide crest must remain broad relative to the player');assert.ok(partsWithTag(ripple.mesh,'rippleSpray').length>=14);

resetWorld();location.search='?enemyLab=1&capture=1&stage=style';window.__abilityCapture.snapshot=()=>({stage:'style'});cast('AQUA-ARC');step(.60);const finalStreams=runtime.state.effects.filter(effect=>effect.type==='aquaArcStream'&&effect.beat===3);
assert.equal(finalStreams.length,2,'Aqua Arc final beat must visibly preserve its two independent streams');for(const stream of finalStreams){const segments=partsWithTag(stream.mesh,'aquaArcSegment');assert.equal(segments.length,7);const heights=segments.map(segment=>segment.position.y);assert.ok(Math.max(...heights)-Math.min(...heights)>=.29,'Aqua Arc must describe a raised forward arc instead of a flattened puddle');}

resetWorld();location.search='?enemyLab=1&capture=1&stage=style';window.__abilityCapture.snapshot=()=>({stage:'style'});cast('CHAOS-CRUSHER');step(.06);rift=runtime.state.effects.find(effect=>effect.type==='chaosCrusherRift');assert.equal(rift.mesh.userData.hoveringMass,true);assert.ok(partsWithTag(rift.mesh,'chaosMassLobe').length>=9);const chaosVoid=partsWithTag(rift.mesh,'chaosRiftVoid')[0];assert.ok(chaosVoid.position.y>.2&&chaosVoid.scale.y>.8,'Chaos Crusher must read as a hovering mass rather than a flat ring');step(.17);const darkCore=runtime.state.effects.find(effect=>effect.type==='chaosCrusherCore');assert.ok(darkCore.mesh.userData.visualRadius>darkCore.mesh.userData.collisionRadius,'the launched dark core may be source-readable without enlarging its gameplay carrier');assert.ok(partsWithTag(darkCore.mesh,'chaosCoreVoid').length===1);

runtime.reset();assert.equal(scene.children.length,0);assert.deepEqual(runtime.snapshot().effects,[]);assert.deepEqual(runtime.snapshot().semanticEvents,[]);cast('RIP-TIDE');assert.equal(runtime.snapshot().effects[0].stableId,'RIP-TIDE:0001','reset must restore deterministic stable IDs');runtime.dispose();assert.equal(scene.children.length,0);assert.equal(lockCalls.at(-1).locked,false);

console.log('wizard next twenty basics tests passed');
