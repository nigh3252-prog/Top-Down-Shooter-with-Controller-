import assert from 'node:assert/strict';
import {
  AIR_BURST_SPEC,CHAOTIC_RIFT_SPEC,CIRCUIT_LINE_SPEC,FLARE_RUSH_SPEC,FROST_FEINT_SPEC,FROST_WING_SPEC,
  GUST_BURST_SPEC,IGNITION_RUSH_SPEC,RAZOR_BURST_SPEC,SEARING_RUSH_SPEC,SHOCK_LINE_SPEC,SNARE_TRACK_SPEC,
  SPIKE_TRACK_SPEC,THUNDER_LINE_SPEC,TOXIC_TRAP_SPEC,WAVE_FRONT_SPEC,WIZARD_CONTINUOUS_DASH_IDS,
  WIZARD_NEXT_TWENTY_DASH_IDS,WIZARD_NEXT_TWENTY_DASH_SEMANTIC_EVENT,WIZARD_NEXT_TWENTY_DASH_SPECS,
  installWizardNextTwentyDashRuntime,resolveChaoticRiftEndpoint,sampleCircuitConnections,sampleDashTrack,sampleRearVolley,
} from '../src/wizard-next-twenty-dash-runtime.js';
import {
  advanceWizardEnemyControl,applyWizardEnemyStatus,wizardEnemyAttackLocked,wizardEnemyMovementScale,
} from '../src/arena-enemies-base.js';

class Transform{
  constructor(){this.x=0;this.y=0;this.z=0;}
  set(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;return this;}
  copy(value={}){return this.set(value.x,value.y,value.z);}
  setScalar(value){return this.set(value,value,value);}
  multiplyScalar(value){this.x*=value;this.y*=value;this.z*=value;return this;}
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
const geometryNames=['SphereGeometry','RingGeometry','ConeGeometry','DodecahedronGeometry','TorusGeometry','BoxGeometry'];
const THREE={Group,Mesh,MeshBasicMaterial:Material,AdditiveBlending:'add',NormalBlending:'normal',DoubleSide:'double'};
for(const name of geometryNames)THREE[name]=Geometry;

class EventTargetMock{
  constructor(){this.listeners=new Map();this.parent=this;this.frameElement=null;this.semantic=[];}
  addEventListener(type,listener){const values=this.listeners.get(type)||[];values.push(listener);this.listeners.set(type,values);}
  removeEventListener(type,listener){this.listeners.set(type,(this.listeners.get(type)||[]).filter(value=>value!==listener));}
  dispatchEvent(event){if(event.type===WIZARD_NEXT_TWENTY_DASH_SEMANTIC_EVENT)this.semantic.push(event.detail);for(const listener of this.listeners.get(event.type)||[])listener(event);return true;}
}
globalThis.CustomEvent=class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}};
globalThis.location={search:'?enemyLab=1&capture=1&stage=style',pathname:'/combat-arena.html'};
globalThis.window=new EventTargetMock();globalThis.window.__abilityCapture={snapshot:()=>({stage:'style'})};
globalThis.localStorage={getItem:()=>JSON.stringify({sizeMultiplier:1,damageMultiplier:1}),setItem:()=>{}};

const controlledEnemy={movementLocked:true,moveSpeedMultiplier:0,wizardSlowRemaining:0,stunned:0};
assert.equal(wizardEnemyMovementScale(controlledEnemy),0,'reference-counted Arcana movement locks must stop real arena locomotion');
assert.equal(wizardEnemyAttackLocked(controlledEnemy),false,'movement-only entangle must not suppress attacks');
controlledEnemy.movementLocked=false;controlledEnemy.moveSpeedMultiplier=1;applyWizardEnemyStatus(controlledEnemy,'slow',1,{multiplier:.4});
assert.equal(wizardEnemyMovementScale(controlledEnemy),.4,'Razor slow must reduce real arena locomotion');
advanceWizardEnemyControl(controlledEnemy,1.1);assert.equal(wizardEnemyMovementScale(controlledEnemy),1,'slow must release after its authored duration');
applyWizardEnemyStatus(controlledEnemy,'freeze',1);assert.equal(wizardEnemyAttackLocked(controlledEnemy),true,'freeze must suppress real arena attacks');
advanceWizardEnemyControl(controlledEnemy,1.1);assert.equal(wizardEnemyAttackLocked(controlledEnemy),false,'freeze attack suppression must expire');

assert.equal(WIZARD_NEXT_TWENTY_DASH_IDS.length,16);
assert.equal(WIZARD_CONTINUOUS_DASH_IDS.length,15);
assert.deepEqual(new Set(WIZARD_NEXT_TWENTY_DASH_IDS),new Set(Object.keys(WIZARD_NEXT_TWENTY_DASH_SPECS)));
assert.deepEqual({cooldown:SEARING_RUSH_SPEC.cooldown,ticks:SEARING_RUSH_SPEC.burnTicks,damage:SEARING_RUSH_SPEC.burnDamage},{cooldown:5.5,ticks:4,damage:7});
assert.deepEqual({count:FLARE_RUSH_SPEC.count,damage:FLARE_RUSH_SPEC.damage},{count:3,damage:10});
assert.deepEqual({duration:IGNITION_RUSH_SPEC.duration,ticks:IGNITION_RUSH_SPEC.burnTicks},{duration:3,ticks:2});
assert.equal(AIR_BURST_SPEC.damage,15);assert.deepEqual({charges:GUST_BURST_SPEC.charges,recharge:GUST_BURST_SPEC.recharge,damage:GUST_BURST_SPEC.draughtDamage},{charges:2,recharge:3.5,damage:10});
assert.deepEqual(RAZOR_BURST_SPEC.tickTimes,[.12,.30,.48,.66]);assert.equal(SPIKE_TRACK_SPEC.damage,30);assert.deepEqual({damage:TOXIC_TRAP_SPEC.poisonDamage,ticks:TOXIC_TRAP_SPEC.poisonTicks},{damage:5,ticks:5});assert.deepEqual({count:SNARE_TRACK_SPEC.count,damage:SNARE_TRACK_SPEC.damage},{count:3,damage:20});
assert.deepEqual({charges:THUNDER_LINE_SPEC.charges,broad:THUNDER_LINE_SPEC.broadDamage,core:THUNDER_LINE_SPEC.coreDamage},{charges:2,broad:10,core:10});assert.deepEqual({charges:CIRCUIT_LINE_SPEC.charges,recharge:CIRCUIT_LINE_SPEC.recharge,damage:CIRCUIT_LINE_SPEC.tickDamage},{charges:3,recharge:4,damage:2});
assert.deepEqual({damage:SHOCK_LINE_SPEC.shockDamage,ticks:SHOCK_LINE_SPEC.shockTicks},{damage:8,ticks:2});assert.deepEqual({damage:WAVE_FRONT_SPEC.tickDamage,ticks:WAVE_FRONT_SPEC.tickTimes.length,shield:WAVE_FRONT_SPEC.shield},{damage:9,ticks:3,shield:25});assert.deepEqual({charges:FROST_FEINT_SPEC.charges,damage:FROST_FEINT_SPEC.shatterDamage},{charges:2,damage:12});assert.deepEqual({count:FROST_WING_SPEC.count,damage:FROST_WING_SPEC.damage,knockback:FROST_WING_SPEC.knockback},{count:4,damage:20,knockback:20});assert.deepEqual({duration:CHAOTIC_RIFT_SPEC.transitDuration,damage:CHAOTIC_RIFT_SPEC.damage},{duration:.5,damage:0});

assert.deepEqual(sampleRearVolley({origin:{x:0,z:0},direction:{x:0,z:1},count:3,laneSpacing:1}).map(value=>value.position),[{x:-1,z:0},{x:0,z:0},{x:1,z:0}]);
const sampledTrack=sampleDashTrack([{x:0,z:0},{x:0,z:2}],.5);assert.equal(sampledTrack.length,5);assert.deepEqual(sampledTrack.at(-1),{x:0,z:2});
assert.equal(sampleCircuitConnections([{x:0,z:0},{x:0,z:3},{x:3,z:3}],10).length,3,'three nearby nodes close a loop');
assert.equal(sampleCircuitConnections([{x:0,z:0},{x:0,z:3},{x:3,z:3},{x:3,z:0}],10).length,6,'Circuit connects every nearby node pair, not only chronological neighbors');
const rift=resolveChaoticRiftEndpoint({origin:{x:0,z:0},direction:{x:1,z:0},distance:8.4,walls:[{a:{x:8,z:-2},b:{x:8,z:2}}],clearance:1});assert.equal(rift.blocked,true);assert.ok(rift.resolved.x<=7);

const scene=new Group(),player={x:0,z:0,forwardX:0,forwardZ:1},hits=[];
const system={enemies:[],heightScale:1,hostileProjectiles:[],damageEnemy(enemy,amount,knock,options){hits.push({enemy,amount,knock,options});enemy.hp-=amount;return true;}};
const motionCalls=[],motions=[];
function startDashMotion(options){
  motionCalls.push({...options});const start={x:player.x,z:player.z},direction=options.direction||{x:0,z:-1},value={phase:'moving',start,previous:start,current:start,end:start,direction,elapsed:0,plannedDistance:0,distance:0,blocked:false,path:[start],movementComplete:false,complete:false};
  const token={value,snapshot:()=>({...value,path:value.path.map(point=>({...point}))}),cancel(){value.phase='complete';value.movementComplete=true;value.complete=true;}};motions.push(token);return token;
}
function finishMotion({x=0,z=8.4,blocked=false}={}){const token=motions.at(-1),value=token.value,previous=value.current;Object.assign(value,{phase:'post',previous,current:{x,z},end:{x,z},elapsed:.24,plannedDistance:8.4,distance:Math.hypot(x-value.start.x,z-value.start.z),blocked,path:[value.start,{x,z}],movementComplete:true,complete:false});player.x=x;player.z=z;runtime.update(.02,.24);value.phase='complete';value.complete=true;runtime.update(.02,.46);return token;}
function step(seconds,dt=.02){for(let elapsed=0;elapsed<seconds-1e-9;elapsed+=dt)runtime.update(Math.min(dt,seconds-elapsed),elapsed);}
function freshEnemy(id,x,z,hp=1000){return{id,x,z,hp,radius:.25};}
function reset(){runtime.reset();hits.length=0;system.enemies=[];system.hostileProjectiles=[];mazeWalls.length=0;player.x=0;player.z=0;player.forwardX=0;player.forwardZ=1;motionCalls.length=0;motions.length=0;teleports.length=0;targetability.length=0;teleportValidator=()=>true;teleportResponder=position=>{player.x=position.x;player.z=position.z;return true;};}
const teleports=[],targetability=[],playerHits=[],mazeWalls=[];let teleportValidator=()=>true,teleportResponder=position=>{player.x=position.x;player.z=position.z;return true;};
const runtime=installWizardNextTwentyDashRuntime({THREE,scene,getPlayer:()=>player,getMoveInput:()=>({x:0,z:0}),getEnemySystem:()=>system,getMazeSegments:()=>mazeWalls,startDashMotion,validateTeleportEndpoint:endpoint=>teleportValidator(endpoint),teleportPlayer:position=>{teleports.push(position);return teleportResponder(position);},setPlayerTargetable:value=>targetability.push(value),damagePlayer:(amount,options)=>playerHits.push({amount,options})});
const cast=id=>runtime.cast({id:`WOL-${id}`,arcanaId:id});

for(const id of WIZARD_NEXT_TWENTY_DASH_IDS){
  runtime.reset();
  const card={id:`WOL-${id}`,arcanaId:id};
  assert.equal(runtime.canPlay(card),true,`${id} must be accepted by the direct dash canPlay method`);
  assert.equal(runtime.play(card),true,`${id} must be accepted by the direct dash play method`);
}
runtime.reset();

// Neutral movement delegates direction selection to the accepted ordinary-dash fallback.
assert.equal(cast('SEARING-RUSH'),true);assert.equal('direction' in motionCalls[0],false);assert.deepEqual({source:motionCalls[0].source,grantIframes:motionCalls[0].grantIframes,applyDodgeCooldown:motionCalls[0].applyDodgeCooldown},{source:'arcana',grantIframes:false,applyDodgeCooldown:false});assert.equal(cast('AIR-BURST'),false,'a second Arcana dash cannot consume while dash recovery is active');finishMotion({x:0,z:-8.4});step(.4,.02);assert.equal(runtime.snapshot().resources['SEARING-RUSH'].remaining>0,true);assert.ok(runtime.snapshot().semanticEvents.some(event=>event.kind==='dash-complete'&&event.arcanaId==='SEARING-RUSH'));

// All continuous cards use the same motion service, and a cooling payload still permits locomotion.
reset();for(const id of WIZARD_CONTINUOUS_DASH_IDS){assert.equal(cast(id),true,id);finishMotion({x:0,z:8.4});runtime.reset();motions.length=0;motionCalls.length=0;player.x=0;player.z=0;}assert.equal(motionCalls.length,0);
reset();cast('AIR-BURST');finishMotion();player.x=0;player.z=0;assert.equal(cast('AIR-BURST'),true,'cooldown fallback still begins shared movement');assert.equal(runtime.snapshot().activeDash.payloadActive,false);finishMotion();

// Searing Rush resolves four distinct 7-damage contacts across its actual, collision-clipped path.
reset();const searingTarget=freshEnemy('searing',0,4);system.enemies=[searingTarget];cast('SEARING-RUSH');finishMotion();step(.4,.01);assert.deepEqual(hits.map(hit=>hit.amount),[7,7,7,7]);assert.ok(hits.every(hit=>hit.options.hitReaction===false),'Searing burn ticks deal HP damage without repeated hit-stun or attack cancel');

// Rear fireballs remain three independent non-homing carriers and add level-one burn.
reset();const flareTarget=freshEnemy('flare',0,3);system.enemies=[flareTarget];cast('FLARE-RUSH');finishMotion();assert.equal(runtime.snapshot().effects.filter(effect=>effect.semanticKind==='rear-fireball').length,3);step(1.2,.01);assert.equal(hits.filter(hit=>hit.amount===10).length,3);assert.equal(hits.filter(hit=>hit.amount===8).length,6,'each independently successful fireball owns its level-one burn');
const flareStatusIds=runtime.snapshot().semanticEvents.filter(event=>event.kind==='status-applied'&&event.status==='burn').map(event=>event.stableId);assert.equal(new Set(flareStatusIds).size,flareStatusIds.length,'each target/status application receives a stable unique ordinal');

// Ignition is an open annulus attached to the player for its full three seconds; its center is safe.
reset();const ignitionOuter=freshEnemy('ignition-outer',1.6,0),ignitionCenter=freshEnemy('ignition-center',0,0);system.enemies=[ignitionOuter,ignitionCenter];cast('IGNITION-RUSH');step(1.1,.01);assert.deepEqual(hits.map(hit=>hit.amount),[8,8]);assert.equal(ignitionCenter.hp,1000);finishMotion();player.x=3;player.z=7;runtime.update(.01,1.2);let ignition=runtime.state.effects.find(effect=>effect.type==='ignitionRing');assert.deepEqual(ignition.position,{x:3,z:7});assert.deepEqual({x:ignition.mesh.position.x,z:ignition.mesh.position.z},{x:3,z:7});step(1.7,.01);assert.ok(runtime.state.effects.includes(ignition),'ring remains attached until the three-second lifetime completes');step(.3,.01);assert.equal(runtime.state.effects.some(effect=>effect.type==='ignitionRing'),false);

// Air Burst damages once and transports its captured target with the real dash delta.
reset();const airTarget=freshEnemy('air',0,.5);system.enemies=[airTarget];cast('AIR-BURST');assert.deepEqual(hits.map(hit=>hit.amount),[15]);finishMotion({x:0,z:6});assert.ok(airTarget.z>5,'caught target follows the collision-clipped player route');
reset();const airRear=freshEnemy('air-rear',0,2),airFront=freshEnemy('air-front',0,-2.1);system.enemies=[airRear,airFront];cast('AIR-BURST');assert.deepEqual(hits.map(hit=>hit.enemy.id),['air-rear'],'Air Burst collision uses its rear-biased curl instead of a symmetric origin circle');

// Gust Burst preserves its gather and draught as separate contacts and charge resource.
reset();const gustTarget=freshEnemy('gust',0,1.2);system.enemies=[gustTarget];cast('GUST-BURST');finishMotion();assert.deepEqual(hits.map(hit=>hit.amount),[5,10]);assert.equal(runtime.snapshot().resources['GUST-BURST'].current,1);

// Razor Burst owns exactly four ticks; Spike Track owns one logical hit across every segment.
reset();const razor=freshEnemy('razor',0,.5);system.enemies=[razor];cast('RAZOR-BURST');finishMotion();step(.8,.01);assert.deepEqual(hits.map(hit=>hit.amount),[5,5,5,5]);
reset();const spike=freshEnemy('spike',0,4);system.enemies=[spike];cast('SPIKE-TRACK');finishMotion();step(1,.01);assert.deepEqual(hits.map(hit=>hit.amount),[30]);

// Toxic Trap has no direct hit and its poison persists for five ticks after contact.
reset();const toxic=freshEnemy('toxic',0,.5);system.enemies=[toxic];cast('TOXIC-TRAP');assert.equal(hits.length,0);step(.22,.01);toxic.x=20;toxic.z=20;step(4,.02);assert.deepEqual(hits.map(hit=>hit.amount),[5,5,5,5,5]);

// Three Snare lines travel rearward and entangle movement without suppressing attacks.
reset();const snared=freshEnemy('snared',0,-3);snared.canAttack=true;system.enemies=[snared];cast('SNARE-TRACK');finishMotion();assert.equal(runtime.snapshot().effects.filter(effect=>effect.semanticKind==='rear-vine').length,3);step(.5,.01);assert.ok(hits.some(hit=>hit.amount===20));assert.equal(snared.movementLocked,true);assert.equal(snared.canAttack,true);assert.ok(hits.find(hit=>hit.amount===20).options.hitReaction===false,'Snare contact must preserve attack state while entangling movement');

// Thunder's broad hit and core are independent, while Shock Line has no direct damage event.
reset();const thunder=freshEnemy('thunder',0,.5);system.enemies=[thunder];cast('THUNDER-LINE');finishMotion();step(1.3,.01);assert.deepEqual(hits.map(hit=>hit.amount),[10,10,6,6]);
reset();const shock=freshEnemy('shock',1,0);system.enemies=[shock];cast('SHOCK-LINE');finishMotion();step(1.2,.01);assert.deepEqual(hits.map(hit=>hit.amount),[8,8]);assert.ok(hits.every(hit=>hit.options.damageOverTime));
reset();cast('THUNDER-LINE');finishMotion({x:8,z:0});const tangentThunder=freshEnemy('tangent-thunder',2,0),offTangentThunder=freshEnemy('off-tangent-thunder',0,2);system.enemies=[tangentThunder,offTangentThunder];step(.4,.01);assert.deepEqual(hits.filter(hit=>hit.options.thunderLine&&hit.options.core).map(hit=>hit.enemy.id),['tangent-thunder'],'Thunder core follows the completed collision-resolved route tangent');
reset();cast('SHOCK-LINE');finishMotion({x:8,z:0});const tangentShock=freshEnemy('tangent-shock',0,1),offTangentShock=freshEnemy('off-tangent-shock',1,0);system.enemies=[tangentShock,offTangentShock];runtime.update(.02,.5);assert.ok(runtime.state.effects.some(effect=>effect.type==='status'&&effect.target===tangentShock));assert.equal(runtime.state.effects.some(effect=>effect.type==='status'&&effect.target===offTangentShock),false,'Shock wire rotates perpendicular to the resolved completed path');

// Circuit nodes remain visibly charged through activation, then deterministic jagged streams clean up as one field.
reset();const circuitTarget=freshEnemy('circuit',0,4);system.enemies=[circuitTarget];cast('CIRCUIT-LINE');finishMotion({x:0,z:8});cast('CIRCUIT-LINE');finishMotion({x:8,z:8});cast('CIRCUIT-LINE');finishMotion({x:0,z:2});let circuitNodes=runtime.state.effects.filter(effect=>effect.type==='circuitNode');assert.equal(circuitNodes.length,6);assert.ok(circuitNodes.every(node=>node.phase==='charging'&&node.mesh.children.some(child=>child.userData.circuitNodeCore)));step(1.4,.01);assert.equal(runtime.state.effects.filter(effect=>effect.type==='circuitNode').length,6,'charged nodes persist through the activation delay');step(.2,.01);const activated=runtime.snapshot().semanticEvents.findLast(event=>event.kind==='circuit-activated'),field=runtime.state.effects.find(effect=>effect.type==='circuitField');assert.ok(activated.edgeCount>=3);assert.equal(activated.ticks,CIRCUIT_LINE_SPEC.baseTicks+(activated.edgeCount-1)*2);assert.ok(hits.some(hit=>hit.amount===2));assert.ok(field&&circuitNodes.every(node=>node.phase==='active'));const streams=[field.mesh,...field.meshes].flatMap(mesh=>mesh?.children||[]).filter(child=>child.userData.circuitStream);assert.ok(streams.length>activated.edgeCount*3,'each edge uses a deterministic jagged multi-segment stream');assert.ok(streams.every(stream=>stream.userData.circuitBaseScale));step(.8,.01);assert.ok(streams.every(stream=>{const base=stream.userData.circuitBaseScale;return stream.scale.x/base.x>.75&&stream.scale.x/base.x<1.25;}),'stream pulse is absolute rather than cumulatively drifting');step(2,.01);assert.equal(runtime.state.effects.some(effect=>effect.type==='circuitNode'||effect.type==='circuitField'),false,'nodes and field share cleanup ownership');

// Wave Front absorbs a finite pool, never grants generic dash iframes, and keeps a dense ribbed globe during detached travel.
reset();cast('WAVE-FRONT');let globe=runtime.state.effects.find(effect=>effect.type==='waveGlobe');assert.ok(globe.mesh.children.filter(child=>child.userData.waveRib!==undefined).length>=6);assert.ok(globe.mesh.children.filter(child=>child.userData.waveShell!==undefined).length>=3);const absorbed=runtime.absorbPlayerDamage(30);assert.deepEqual(absorbed,{absorbed:25,remaining:5});assert.equal(motionCalls[0].grantIframes,false);finishMotion();globe=runtime.state.effects.find(effect=>effect.type==='waveGlobe');assert.equal(globe.phase,'detached');const detachedStart={...globe.position};runtime.update(.05,.5);assert.ok(Math.hypot(globe.position.x-detachedStart.x,globe.position.z-detachedStart.z)>.4);step(.5,.01);assert.equal(runtime.state.effects.some(effect=>effect.type==='waveGlobe'),false);

// Frost Feint presents a complete player-shaped decoy, only shatters when explicitly attacked, and times out harmlessly.
reset();const frostTarget=freshEnemy('frost',0,.5);system.enemies=[frostTarget];cast('FROST-FEINT');const decoy=runtime.state.effects.find(effect=>effect.type==='frostDecoy'),decoyId=decoy.stableId;assert.equal(decoy.mesh.children.filter(child=>child.userData.decoyLimb!==undefined).length,4);assert.ok(decoy.mesh.children.some(child=>child.userData.decoyBody)&&decoy.mesh.children.some(child=>child.userData.decoyHead));assert.equal(runtime.strikeDecoy(decoyId),true);assert.deepEqual(hits.map(hit=>hit.amount),[12]);assert.ok(runtime.snapshot().semanticEvents.some(event=>event.kind==='decoy-shattered'));
reset();system.enemies=[frostTarget];cast('FROST-FEINT');step(2.1,.02);assert.equal(hits.length,0);assert.ok(runtime.snapshot().semanticEvents.some(event=>event.kind==='decoy-expired'));

// Frost Wing preserves the center gap as four independent rear-facing nonpiercing feathers.
reset();const featherTarget=freshEnemy('feather',1.15,5.8);system.enemies=[featherTarget];cast('FROST-WING');finishMotion({x:0,z:8.4});const feathers=runtime.snapshot().effects.filter(effect=>effect.semanticKind==='frost-feather');assert.equal(feathers.length,4);assert.ok(feathers.every(effect=>effect.direction.z<0));step(.5,.01);assert.ok(hits.some(hit=>hit.amount===20));

// Conservative scenery integration: payload contact, interception, and forced movement never cross walls.
reset();mazeWalls.push({a:{x:-3,z:.5},b:{x:3,z:.5}});const walledThunder=freshEnemy('walled-thunder',0,1);system.enemies=[walledThunder];cast('THUNDER-LINE');finishMotion();step(.5,.01);assert.equal(hits.length,0,'Thunder broad/core and its shock status are line-of-sight gated');
reset();mazeWalls.push({a:{x:.5,z:-3},b:{x:.5,z:3}});const walledIgnition=freshEnemy('walled-ignition',1.6,0);system.enemies=[walledIgnition];cast('IGNITION-RUSH');step(1,.01);assert.equal(hits.length,0,'Ignition contact cannot apply burn through scenery');
reset();mazeWalls.push({a:{x:.5,z:-3},b:{x:.5,z:3}});const walledToxic=freshEnemy('walled-toxic',1.2,0);system.enemies=[walledToxic];cast('TOXIC-TRAP');step(1,.01);assert.equal(hits.length,0,'Toxic Trap cannot acquire a poison target through scenery');
reset();mazeWalls.push({a:{x:.5,z:-3},b:{x:.5,z:3}});const walledShock=freshEnemy('walled-shock',1,0),walledHostile={id:'walled-hostile',x:1,z:0,r:.15,dead:false};system.enemies=[walledShock];system.hostileProjectiles=[walledHostile];cast('SHOCK-LINE');step(1,.01);assert.equal(hits.length,0);assert.equal(walledHostile.dead,false,'Shock wire damage and interception stop at walls');
reset();mazeWalls.push({a:{x:-3,z:.5},b:{x:3,z:.5}});const walledWave=freshEnemy('walled-wave',0,1);system.enemies=[walledWave];cast('WAVE-FRONT');step(.3,.01);assert.equal(hits.length,0,'Wave Front ticks cannot acquire through-wall targets');
reset();mazeWalls.push({a:{x:-3,z:2},b:{x:3,z:2}});const walledRazor=freshEnemy('walled-razor',0,2.1);system.enemies=[walledRazor];cast('RAZOR-BURST');step(.8,.01);assert.equal(hits.length,0,'shared circle gating protects Razor and other area payloads');
reset();mazeWalls.push({a:{x:.5,z:-3},b:{x:.5,z:3}});const walledFrost=freshEnemy('walled-frost',1,0);system.enemies=[walledFrost];cast('FROST-FEINT');runtime.strikeDecoy();assert.equal(hits.length,0,'Frost Feint shatter cannot damage or freeze through scenery');
reset();mazeWalls.push({a:{x:-3,z:2},b:{x:3,z:2}});const carried=freshEnemy('carry-clamp',0,.5);system.enemies=[carried];cast('AIR-BURST');finishMotion({x:0,z:6});assert.ok(carried.z<2&&carried.z>.5,'enemy carrying is collision-clamped before the wall');
reset();mazeWalls.push({a:{x:-3,z:.5},b:{x:3,z:.5}});const walledAirRear=freshEnemy('walled-air-rear',0,1.1);system.enemies=[walledAirRear];cast('AIR-BURST');assert.equal(hits.length,0,'Air Burst rear-biased contact cannot shift its damage center through scenery');
reset();mazeWalls.push({a:{x:-3,z:2},b:{x:3,z:2}});const beyondTrack={id:'beyond-track',x:0,z:3,r:.15,dead:false},walledTrackTarget=freshEnemy('walled-track-target',0,3);system.hostileProjectiles=[beyondTrack];system.enemies=[walledTrackTarget];cast('SEARING-RUSH');finishMotion();step(.4,.01);assert.equal(beyondTrack.dead,false,'path interception cannot jump across a wall even if a supplied route crosses it');assert.equal(hits.length,0,'path damage cannot jump across a wall even if a supplied route crosses it');
reset();mazeWalls.push({a:{x:-3,z:4},b:{x:3,z:4}});const walledCircuit=freshEnemy('walled-circuit',0,6);system.enemies=[walledCircuit];cast('CIRCUIT-LINE');finishMotion({x:0,z:8});step(1.7,.01);const walledActivation=runtime.snapshot().semanticEvents.find(event=>event.kind==='circuit-activated');assert.equal(walledActivation.edgeCount,0,'Circuit omits node connections that cross scenery');assert.equal(hits.length,0);
reset();mazeWalls.push({a:{x:-3,z:4},b:{x:3,z:4}});const beforeWall=freshEnemy('before-wall',0,3.5);system.enemies=[beforeWall];cast('FLARE-RUSH');finishMotion();runtime.update(.5,.5);assert.ok(hits.some(hit=>hit.enemy===beforeWall&&hit.amount===10),'a fast carrier resolves its pre-wall sweep before harmless wall fizzle');
reset();mazeWalls.push({a:{x:-3,z:6},b:{x:3,z:6}});const interceptBeforeWall={id:'prewall-projectile',x:.45,z:7,r:.2,dead:false};system.hostileProjectiles=[interceptBeforeWall];cast('FROST-WING');finishMotion({x:0,z:8.4});runtime.update(.3,.5);assert.equal(interceptBeforeWall.dead,true,'eligible projectile interception on a pre-wall sweep wins over wall cleanup');
reset();cast('WAVE-FRONT');finishMotion({x:0,z:8.4});mazeWalls.push({a:{x:-3,z:9},b:{x:3,z:9}});const prewallWaveTarget=freshEnemy('prewall-wave',0,8.8);system.enemies=[prewallWaveTarget];runtime.update(.12,.5);assert.ok(hits.some(hit=>hit.enemy===prewallWaveTarget&&hit.amount===9),'detached Wave Front resolves a due contact on its valid pre-wall sweep before fizzling');assert.equal(runtime.state.effects.some(effect=>effect.type==='waveGlobe'),false);

// Chaotic Rift is the teleport exception: differentiated dark apertures linger visually without extending transit or damage.
reset();playerHits.length=0;runtime.applyPlayerStatus('test-dot',{damage:3,ticks:2,interval:.2});assert.equal(cast('CHAOTIC-RIFT'),true);assert.equal(runtime.busy,true);assert.equal(motionCalls.length,0);assert.deepEqual(targetability,[false]);let riftEffect=runtime.state.effects.find(effect=>effect.type==='chaoticRift');assert.equal(riftEffect.mesh.userData.riftRole,'entry');assert.equal(riftEffect.meshes[0].userData.riftRole,'exit');assert.ok(riftEffect.mesh.children.some(child=>child.userData.riftVoid)&&riftEffect.mesh.children.some(child=>child.userData.riftFringe!==undefined));step(.51,.01);assert.equal(teleports.length,1);assert.deepEqual(targetability,[false,true]);assert.deepEqual(playerHits.map(hit=>hit.amount),[3,3],'existing damage-over-time continues during untargetable transit');assert.equal(hits.length,0);assert.equal(runtime.busy,false);assert.ok(runtime.snapshot().semanticEvents.some(event=>event.kind==='rift-exited'&&event.damage===0&&event.intermediatePositions===0));riftEffect=runtime.state.effects.find(effect=>effect.type==='chaoticRift');assert.equal(riftEffect.phase,'emergence');assert.equal(riftEffect.meshes[0].userData.riftRole,'exit');step(.25,.01);assert.equal(runtime.state.effects.some(effect=>effect.type==='chaoticRift'),false);
reset();teleportResponder=()=>({ok:false,end:{x:99,z:99},reason:'invalid-endpoint'});assert.equal(cast('CHAOTIC-RIFT'),true);step(.51,.01);const rejectedExit=runtime.snapshot().semanticEvents.find(event=>event.kind==='rift-exited');assert.deepEqual({teleported:rejectedExit.teleported,endpoint:rejectedExit.endpoint,reason:rejectedExit.reason},{teleported:false,endpoint:{x:0,z:0},reason:'invalid-endpoint'},'object-form teleport rejection cannot masquerade as a successful or invalid exit');
reset();teleportValidator=()=>({ok:false,reason:'outside-maze'});const riftResourceBefore=runtime.snapshot().resources['CHAOTIC-RIFT'].remaining;assert.equal(cast('CHAOTIC-RIFT'),false);assert.equal(runtime.snapshot().resources['CHAOTIC-RIFT'].remaining,riftResourceBefore);assert.equal(runtime.state.effects.length,0);assert.equal(runtime.snapshot().semanticEvents.length,0);assert.deepEqual(targetability,[],'preflight rejection occurs before resource, visuals, semantic events, or untargetability mutate');

// Capture stages are deliberately denser from contract to source to final style; production always selects style.
function airBurstParts(stage,search=`?enemyLab=1&capture=1&stage=${stage}`){reset();globalThis.location.search=search;window.__abilityCapture.snapshot=()=>({stage});cast('AIR-BURST');return runtime.state.effects.find(effect=>effect.type==='airBurst').mesh.children.length;}
const contractParts=airBurstParts('contract'),sourceParts=airBurstParts('source'),styleParts=airBurstParts('style');assert.ok(contractParts<sourceParts&&sourceParts<styleParts);const productionParts=airBurstParts('contract','?enemyLab=1');assert.equal(productionParts,styleParts);globalThis.location.search='?enemyLab=1&capture=1&stage=style';window.__abilityCapture.snapshot=()=>({stage:'style'});

runtime.dispose();
console.log('wizard next twenty dash runtime tests passed');
