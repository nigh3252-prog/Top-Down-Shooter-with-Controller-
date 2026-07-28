import assert from 'node:assert/strict';
import {
  FIRE_BURN_LEVELS,FLAME_FUSION_SPEC,HEROIC_LEAP_SPEC,WIZARD_FUSION_LEAP_SEMANTIC_EVENT,
  createReferenceCountedLease,defaultHeroicLeapCarryEligible,installWizardFusionLeapRuntime,
  movingCircleFirstHit,normalizeFusionLeapVisualMode,resolveHeroicLeapRush,segmentCircleFirstHit,
} from '../src/wizard-fusion-leap-runtime.js';

class Transform{
  constructor(){this.x=0;this.y=0;this.z=0;}
  set(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;return this;}
  copy(value={}){return this.set(value.x,value.y,value.z);}
  setScalar(value){return this.set(value,value,value);}
}
class Object3D{
  constructor(){this.children=[];this.position=new Transform();this.rotation=new Transform();this.scale=new Transform().set(1,1,1);this.userData={};this.parent=null;this.visible=true;this.name='';}
  add(...children){for(const child of children){child.parent=this;this.children.push(child);}return this;}
  remove(child){const index=this.children.indexOf(child);if(index>=0)this.children.splice(index,1);child.parent=null;}
  traverse(visitor){visitor(this);for(const child of this.children)child.traverse?.(visitor);}
}
class Group extends Object3D{}
class Geometry{dispose(){this.disposed=true;}}
class Material{constructor(options={}){Object.assign(this,options);}dispose(){this.disposed=true;}}
class Mesh extends Object3D{constructor(geometry=new Geometry(),material=new Material()){super();this.geometry=geometry;this.material=material;}}
const THREE={Group,Mesh,MeshBasicMaterial:Material,AdditiveBlending:'add',NormalBlending:'normal',DoubleSide:'double'};
for(const name of['SphereGeometry','RingGeometry','ConeGeometry','TorusGeometry','CylinderGeometry'])THREE[name]=Geometry;

class EventTargetMock{
  constructor(){this.listeners=new Map();this.parent=this;this.frameElement=null;this.semantic=[];}
  addEventListener(type,listener){const values=this.listeners.get(type)||[];values.push(listener);this.listeners.set(type,values);}
  removeEventListener(type,listener){this.listeners.set(type,(this.listeners.get(type)||[]).filter(value=>value!==listener));}
  dispatchEvent(event){if(event.type===WIZARD_FUSION_LEAP_SEMANTIC_EVENT)this.semantic.push(event.detail);for(const listener of this.listeners.get(event.type)||[])listener(event);return true;}
}
globalThis.CustomEvent=class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}};
globalThis.location={search:'?enemyLab=1&capture=1&stage=style',pathname:'/combat-arena.html'};
globalThis.window=new EventTargetMock();globalThis.window.__abilityCapture={snapshot:()=>({stage:'style'})};
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};

assert.deepEqual({cooldown:FLAME_FUSION_SPEC.cooldown,fireball:FLAME_FUSION_SPEC.fireball.damage,arrow:FLAME_FUSION_SPEC.arrow.damage,count:FLAME_FUSION_SPEC.fusion.count,fused:FLAME_FUSION_SPEC.fusion.damage},{cooldown:6,fireball:28,arrow:10,count:5,fused:12});
assert.deepEqual({cooldown:HEROIC_LEAP_SPEC.cooldown,ticks:HEROIC_LEAP_SPEC.vortexTickTimes.length,tickDamage:HEROIC_LEAP_SPEC.vortexDamage,landing:HEROIC_LEAP_SPEC.landingDamage,carried:HEROIC_LEAP_SPEC.carriedDamage},{cooldown:6,ticks:5,tickDamage:5,landing:25,carried:50});
assert.deepEqual({l1:FIRE_BURN_LEVELS[1].tickDamage,l2:FIRE_BURN_LEVELS[2].tickDamage,ticks:FIRE_BURN_LEVELS[1].ticks},{l1:2,l2:4,ticks:8});
assert.equal(normalizeFusionLeapVisualMode('motion'),'contract');assert.equal(normalizeFusionLeapVisualMode('reference'),'source');assert.equal(normalizeFusionLeapVisualMode('anything-else'),'style');
assert.deepEqual(segmentCircleFirstHit({x:0,z:0},{x:10,z:0},{x:5,z:0},1),{t:.4,x:4,z:0});
const movingHit=movingCircleFirstHit({x:0,z:0},{x:4,z:0},.5,{x:3,z:0},{x:3,z:0},.5);assert.equal(movingHit.t,.5);assert.equal(movingHit.x,2.5);
const clipped=resolveHeroicLeapRush({origin:{x:0,z:0},direction:{x:0,z:1},distance:5.6,clearance:.6,walls:[{a:{x:-3,z:3},b:{x:3,z:3}}]});assert.equal(clipped.blocked,true);assert.ok(Math.abs(clipped.resolved.z-2.4)<1e-9);
assert.equal(defaultHeroicLeapCarryEligible({hp:10}),true);assert.equal(defaultHeroicLeapCarryEligible({hp:10,isLarge:true}),false);assert.equal(defaultHeroicLeapCarryEligible({hp:10,rank:'BOSS'}),false);assert.equal(defaultHeroicLeapCarryEligible({hp:10,knockbackImmune:true}),false);assert.equal(defaultHeroicLeapCarryEligible({hp:10,isElite:true}),false);assert.equal(defaultHeroicLeapCarryEligible({hp:10,def:{radius:1.45}}),false);

const leaseTransitions=[],lease=createReferenceCountedLease((active,detail)=>leaseTransitions.push({active,count:detail.count})),releaseA=lease.acquire('a'),releaseB=lease.acquire('b');assert.deepEqual(lease.snapshot(),{active:true,count:2,tokens:['a:0001','b:0002']});releaseA();assert.equal(lease.snapshot().active,true);releaseB();assert.deepEqual(leaseTransitions,[{active:true,count:1},{active:false,count:0}]);
lease.reset();const releaseAfterReset=lease.acquire('a');assert.deepEqual(lease.snapshot().tokens,['a:0001'],'lease reset must restart deterministic ownership IDs');releaseAfterReset();

const scene=new Group(),player={x:0,z:0,forwardX:0,forwardZ:1},hits=[],walls=[],invulnerability=[],airborne=[],heights=[],carryTransitions=[];
let liveAim={x:0,z:1};
// Real arena families return true only for a killing blow. Keeping that return
// contract here ensures nonlethal Flame Fusion burns and Heroic telemetry stay covered.
const system={enemies:[],heightScale:1,hostileProjectiles:[],damageEnemy(enemy,amount,knock,options){hits.push({enemy,amount,knock,options});enemy.hp-=amount;return enemy.hp<=0;}};
function enemy(id,x,z,extra={}){return{id,x,z,hp:1000,radius:.12,...extra};}
const runtime=installWizardFusionLeapRuntime({
  THREE,scene,getPlayer:()=>player,getEnemySystem:()=>system,getMazeSegments:()=>walls,getAimDirection:()=>liveAim,
  setPlayerPosition(position){player.x=position.x;player.z=position.z;},
  setPlayerInvulnerable(value,detail){invulnerability.push({value,detail});player.invulnerable=value;},
  setPlayerAirborne(value,detail){airborne.push({value,detail});player.airborne=value;},
  setPlayerHeight(value){heights.push(value);player.height=value;},
  setEnemyCarried(target,detail){carryTransitions.push({targetId:target.id,...detail});target.x=detail.x;target.z=detail.z;if(detail.active){target.__heroicLeapCarried=true;target.wizardAirborneOffset=detail.height;}else{delete target.__heroicLeapCarried;delete target.wizardAirborneOffset;}},
});
const cast=id=>runtime.cast({id:`WOL-${id}`,arcanaId:id});
function step(seconds,dt=.01){for(let elapsed=0;elapsed<seconds-1e-9;elapsed+=dt)runtime.update(Math.min(dt,seconds-elapsed));}
function reset(){runtime.reset();hits.length=0;walls.length=0;system.enemies=[];system.hostileProjectiles=[];player.x=0;player.z=0;player.forwardX=0;player.forwardZ=1;player.invulnerable=false;player.airborne=false;player.height=0;liveAim={x:0,z:1};invulnerability.length=0;airborne.length=0;heights.length=0;carryTransitions.length=0;window.semantic.length=0;globalThis.location.search='?enemyLab=1&capture=1&stage=style';window.__abilityCapture.snapshot=()=>({stage:'style'});}

// The two parent projectiles sample aim independently and retain independent hit/burn routes on a miss.
reset();const fireballTarget=enemy('fireball-target',0,2);system.enemies=[fireballTarget];assert.equal(cast('FLAME-FUSION'),true);assert.equal(runtime.canCast('FLAME-FUSION'),false);assert.equal(runtime.snapshot().resources['FLAME-FUSION'].remaining,6);step(.25);assert.deepEqual(hits.map(hit=>hit.amount),[28]);fireballTarget.x=20;fireballTarget.z=20;liveAim={x:1,z:0};step(.08);let arrow=runtime.state.effects.find(effect=>effect.semanticKind==='arrow');assert.deepEqual(arrow.direction,{x:1,z:0},'the authored kick beat must sample live aim instead of reusing phase one');const arrowTarget=enemy('arrow-target',2,0);system.enemies.push(arrowTarget);step(.2);assert.ok(hits.some(hit=>hit.enemy===arrowTarget&&hit.amount===10));assert.equal(runtime.snapshot().semanticEvents.some(event=>event.kind==='flame-fusion-transformed'),false);step(2);assert.equal(hits.filter(hit=>hit.enemy===fireballTarget&&hit.amount===2).length,8);assert.equal(hits.filter(hit=>hit.enemy===arrowTarget&&hit.amount===2).length,8);assert.ok(runtime.snapshot().semanticEvents.filter(event=>event.kind==='burn-applied').every(event=>event.level===1));

// A same-route swept meeting consumes both parents and creates five deterministic, independent level-two arrows.
reset();assert.equal(cast('FLAME-FUSION'),true);step(.43,.005);let fusionEvent=runtime.snapshot().semanticEvents.find(event=>event.kind==='flame-fusion-transformed');assert.ok(fusionEvent);assert.equal(fusionEvent.parentPayloadSuppressed,true);let fan=runtime.state.effects.filter(effect=>effect.semanticKind==='fusion-arrow');assert.equal(fan.length,5);assert.deepEqual(fan.map(effect=>effect.stableId),['FLAME-FUSION:0001:fusion-arrow:01','FLAME-FUSION:0001:fusion-arrow:02','FLAME-FUSION:0001:fusion-arrow:03','FLAME-FUSION:0001:fusion-arrow:04','FLAME-FUSION:0001:fusion-arrow:05']);assert.equal(runtime.state.effects.some(effect=>effect.semanticKind==='fireball'||effect.semanticKind==='arrow'),false);
const fanTargets=fan.map((projectile,index)=>enemy(`fan-${index+1}`,fusionEvent.collisionPoint.x+projectile.direction.x*3.25,fusionEvent.collisionPoint.z+projectile.direction.z*3.25));system.enemies=fanTargets;step(.25,.005);assert.equal(hits.filter(hit=>hit.amount===12).length,5);assert.equal(hits.some(hit=>hit.amount===28||hit.amount===10),false);const levelTwoBurns=runtime.snapshot().semanticEvents.filter(event=>event.kind==='burn-applied'&&event.level===2);assert.equal(levelTwoBurns.length,5);assert.equal(new Set(levelTwoBurns.map(event=>event.stableId)).size,5);

// Geometry, not timing alone, controls fusion; walls harmlessly fizzle both parents.
reset();walls.push({a:{x:-3,z:1},b:{x:3,z:1}});cast('FLAME-FUSION');step(.6,.005);assert.equal(hits.length,0);assert.equal(runtime.snapshot().semanticEvents.filter(event=>event.kind==='flame-projectile-fizzled').length,2);assert.equal(runtime.snapshot().semanticEvents.some(event=>event.kind==='flame-fusion-transformed'),false);
reset();walls.push({a:{x:-3,z:1},b:{x:3,z:1}});const flameBehindWall=enemy('flame-behind-wall',0,1.1);system.enemies=[flameBehindWall];cast('FLAME-FUSION');step(.6,.005);assert.equal(hits.filter(hit=>hit.enemy===flameBehindWall).length,0,'carrier-radius contact cannot beat a wall that occludes the target center');assert.equal(runtime.snapshot().semanticEvents.filter(event=>event.kind==='flame-projectile-fizzled'&&event.reason==='wall').length,2);assert.equal(runtime.snapshot().semanticEvents.some(event=>event.kind==='flame-projectile-hit'),false);
const resourceBefore=runtime.snapshot().resources['FLAME-FUSION'].remaining;assert.equal(cast('FLAME-FUSION'),false);assert.equal(runtime.snapshot().resources['FLAME-FUSION'].remaining,resourceBefore,'rejected cooldown casts cannot consume or restart the resource');step(6.01,.05);assert.equal(runtime.canCast('FLAME-FUSION'),true);

// Contract/source/style paths preserve increasing visual detail, while production always uses style.
function flameParts(stage,search=`?enemyLab=1&capture=1&stage=${stage}`){reset();globalThis.location.search=search;window.__abilityCapture.snapshot=()=>({stage});cast('FLAME-FUSION');return runtime.state.effects.find(effect=>effect.semanticKind==='fireball').mesh.children.length;}
const flameContract=flameParts('contract'),flameSource=flameParts('source'),flameStyle=flameParts('style');assert.ok(flameContract<flameSource&&flameSource<flameStyle);assert.equal(flameParts('contract','?enemyLab=1'),flameStyle);

// Heroic Leap clamps its rush, acquires only on an actual eligible contact, and becomes invulnerable only after takeoff.
reset();walls.push({a:{x:-3,z:3},b:{x:3,z:3}});const large=enemy('large',0,.65,{isLarge:true}),carried=enemy('carried',0,1.2),ground=enemy('ground',1.1,2.35),beyondWall=enemy('beyond-wall',0,3.45);system.enemies=[large,carried,ground,beyondWall];const hostile={id:'vortex-shot',x:.4,z:2.2,r:.12,dead:false};system.hostileProjectiles=[hostile];assert.equal(cast('HEROIC-LEAP'),true);assert.equal(runtime.snapshot().activeLeap.carryTargetId,undefined,'cast time must not predict a carry across the whole planned path');assert.equal(runtime.snapshot().activeLeap.blocked,true);assert.ok(runtime.snapshot().activeLeap.endpoint.z<3);assert.equal(player.invulnerable,false);step(.10);assert.equal(runtime.snapshot().activeLeap.carryTargetId,'carried');assert.ok(runtime.snapshot().semanticEvents.some(event=>event.kind==='heroic-leap-carry-contact'&&event.targetId==='carried'));assert.equal(player.invulnerable,false,'the collision-clamped ground rush must not inherit airborne invulnerability');step(.09);assert.equal(player.invulnerable,true);assert.equal(carried.__heroicLeapCarried,true);assert.equal(large.__heroicLeapCarried,undefined);assert.equal(runtime.snapshot().invulnerability.count,1);step(.60,.01);assert.equal(player.invulnerable,true);assert.equal(hostile.dead,true);assert.deepEqual(hits.filter(hit=>hit.enemy===ground).map(hit=>hit.amount),[5,5,5,5,5]);assert.equal(hits.some(hit=>hit.enemy===carried&&hit.amount===5),false,'the carried route is excluded from every vortex tick');assert.equal(hits.some(hit=>hit.enemy===beyondWall),false,'stationary vortex contacts cannot cross scenery');step(.17,.01);assert.equal(player.invulnerable,false);assert.equal(player.airborne,false);assert.equal(carried.__heroicLeapCarried,undefined);assert.deepEqual(hits.filter(hit=>hit.enemy===carried).map(hit=>hit.amount),[25,50]);assert.deepEqual(hits.filter(hit=>hit.enemy===ground).map(hit=>hit.amount),[5,5,5,5,5,25]);assert.deepEqual(hits.filter(hit=>hit.enemy===large).map(hit=>hit.amount),[5,5,5,5,5,25]);assert.equal(hits.some(hit=>hit.enemy===beyondWall),false);assert.equal(runtime.snapshot().semanticEvents.filter(event=>event.kind==='heroic-leap-vortex-tick').length,5);const landing=runtime.snapshot().semanticEvents.find(event=>event.kind==='heroic-leap-landed');assert.deepEqual({landingDamage:landing.landingDamage,carriedDamage:landing.carriedDamage,vortexTicks:landing.vortexTicks,invulnerable:landing.invulnerable},{landingDamage:25,carriedDamage:50,vortexTicks:5,invulnerable:false});assert.equal(runtime.snapshot().activeLeap,null);

// Moving targets are evaluated against each resolved rush slice, not their cast-time position.
reset();const movingOut=enemy('moving-out',0,4.8);system.enemies=[movingOut];cast('HEROIC-LEAP');step(.01);movingOut.x=4;step(.18);assert.equal(runtime.snapshot().activeLeap.carried,false,'a target that leaves before contact must not be carried');assert.equal(runtime.snapshot().semanticEvents.some(event=>event.kind==='heroic-leap-carry-contact'),false);
reset();const movingIn=enemy('moving-in',4,4.5);system.enemies=[movingIn];cast('HEROIC-LEAP');step(.02);movingIn.x=0;step(.17);assert.equal(runtime.snapshot().activeLeap.carryTargetId,'moving-in','a target entering an untraversed rush slice must be acquired');assert.equal(runtime.snapshot().activeLeap.carried,true);assert.ok(runtime.snapshot().semanticEvents.some(event=>event.kind==='heroic-leap-carry-contact'&&event.targetId==='moving-in'));

// The carried slam remains its own 50-damage dispatch even when the preceding 25-damage landing kills.
reset();const fragileCarry=enemy('fragile-carry',0,1,{hp:25});system.enemies=[fragileCarry];cast('HEROIC-LEAP');step(1,.01);assert.deepEqual(hits.filter(hit=>hit.enemy===fragileCarry).map(hit=>[hit.amount,!!hit.options.landing,!!hit.options.carriedSlam]),[[25,true,false],[50,false,true]]);const carriedSlam=runtime.snapshot().semanticEvents.find(event=>event.kind==='heroic-leap-carried-slam');assert.deepEqual({targetId:carriedSlam?.targetId,damage:carriedSlam?.damage,separatePayload:carriedSlam?.separatePayload,landingKilledTarget:carriedSlam?.landingKilledTarget,applied:carriedSlam?.applied},{targetId:'fragile-carry',damage:50,separatePayload:true,landingKilledTarget:true,applied:true});const fragileLanding=runtime.snapshot().semanticEvents.find(event=>event.kind==='heroic-leap-landed');assert.deepEqual({carriedSlamDispatched:fragileLanding?.carriedSlamDispatched,carriedSlamApplied:fragileLanding?.carriedSlamApplied,landingKilledCarriedTarget:fragileLanding?.landingKilledCarriedTarget},{carriedSlamDispatched:true,carriedSlamApplied:true,landingKilledCarriedTarget:true});

// Cleanup is a hard ownership boundary: it unwinds carry and the reference-counted invulnerability lease.
reset();const cleanupCarry=enemy('cleanup-carry',0,1);system.enemies=[cleanupCarry];cast('HEROIC-LEAP');step(.19,.01);assert.equal(player.invulnerable,true);assert.equal(cleanupCarry.__heroicLeapCarried,true);runtime.cleanup();assert.equal(player.invulnerable,false);assert.equal(player.airborne,false);assert.equal(cleanupCarry.__heroicLeapCarried,undefined);assert.equal(runtime.state.effects.length,0);assert.equal(runtime.snapshot().invulnerability.count,0);assert.equal(runtime.canCast('HEROIC-LEAP'),true);

function leapParts(stage,search=`?enemyLab=1&capture=1&stage=${stage}`){reset();globalThis.location.search=search;window.__abilityCapture.snapshot=()=>({stage});cast('HEROIC-LEAP');return runtime.state.effects.find(effect=>effect.type==='heroicLeapAction').mesh.children.length;}
const leapContract=leapParts('contract'),leapSource=leapParts('source'),leapStyle=leapParts('style');assert.ok(leapContract<leapSource&&leapSource<leapStyle);assert.equal(leapParts('contract','?enemyLab=1'),leapStyle);

// Reset restarts authored IDs and semantic order exactly.
function deterministicFusionTrace(){reset();cast('FLAME-FUSION');step(.43,.005);return runtime.snapshot().semanticEvents.map(event=>({eventId:event.eventId,kind:event.kind,stableId:event.stableId,childStableIds:event.childStableIds||null}));}
assert.deepEqual(deterministicFusionTrace(),deterministicFusionTrace());
function deterministicLeapTakeoff(){reset();system.enemies=[enemy('deterministic-carry',0,1)];cast('HEROIC-LEAP');step(.19,.01);const value=runtime.snapshot();return{activeLeap:value.activeLeap,invulnerability:value.invulnerability,events:value.semanticEvents.map(event=>({eventId:event.eventId,kind:event.kind,stableId:event.stableId}))};}
assert.deepEqual(deterministicLeapTakeoff(),deterministicLeapTakeoff());

runtime.dispose();
console.log('wizard fusion/leap runtime tests passed');
