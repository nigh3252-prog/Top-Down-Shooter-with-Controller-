import assert from 'node:assert/strict';
import {createArenaFactionService} from '../src/arena-faction-service.js';
import {clearArenaRuntime,getArenaCollisionSegments,provideArenaRuntime} from '../src/arena-runtime-context.js';
import {
  installWizardAlliedArcanaRuntime,
  resolveAgentLeashPosition,
  RAPID_FIRE_AGENT_SPEC,
  WARD_OF_FLAMES_SPEC,
  MENTIS_IMPERIUM_SPEC,
} from '../src/wizard-allied-arcana-runtime.js';

// Faction routing is intentionally tested without rendering so cross-family
// target identity and charm transfer remain a deterministic pure contract.
{
  const service=createArenaFactionService();
  const originalEnemy={id:1,x:4,z:0,hp:100,radius:.6,wizardFaction:'hostile'};
  const flareEnemy={id:1,x:-4,z:0,hp:100,radius:.6,wizardFaction:'hostile'};
  const hadesLarge={id:1,x:8,z:0,hp:100,radius:1.45,wizardFaction:'hostile'};
  const makeSystem=enemies=>({
    enemies,
    damageEnemy(enemy,amount){enemy.hp-=amount;return enemy.hp<=0;},
    setEnemyFaction(enemy,faction){enemy.wizardFaction=faction;return true;},
  });
  const original=makeSystem([originalEnemy]),flare=makeSystem([flareEnemy]),hades=makeSystem([hadesLarge]);
  service.registerEnemySystem('original',original);service.registerEnemySystem('flare',flare);service.registerEnemySystem('hades',hades);
  const actor={x:0,z:0,hp:100,wizardFaction:'hostile'};
  const ward={stableId:'WARD:0001',x:2,z:0,hp:50,radius:.7,active:true,onDamage(){return true;}};
  const agent={stableId:'AGENT:0001',x:-2,z:0,hp:50,radius:.7,active:true,onDamage(){return true;}};
  service.registerAlliedTarget(ward);service.registerAlliedTarget(agent);
  assert.equal(service.chooseTarget(actor,{x:10,z:0,targetable:true}).__arenaTargetId,'AGENT:0001','equal-distance target ties use stable IDs');
  const locked=service.chooseTarget(actor,{x:10,z:0,targetable:true});service.lockTarget(actor,locked);agent.x=20;ward.x=.1;
  assert.equal(service.resolveLockedTarget(actor,{x:10,z:0,targetable:true}).__arenaTargetId,'AGENT:0001','an attack retains its selected target even when another target becomes nearer');
  service.releaseTarget(actor);

  const alliedActor={x:0,z:0,hp:100,wizardFaction:'allied'};
  assert.equal(service.chooseTarget(alliedActor,null).__arenaTargetId,'flare:0001','cross-family equal-distance hostile ties use namespaced stable IDs');
  assert.equal(service.charmEnemy(originalEnemy).accepted,true);assert.equal(originalEnemy.wizardFaction,'allied');
  assert.equal(service.charmEnemy(flareEnemy).accepted,true);assert.equal(flareEnemy.wizardFaction,'allied');assert.equal(originalEnemy.wizardFaction,'hostile','a new charm restores the previous enemy faction');
  assert.deepEqual(service.charmEnemy(hadesLarge),{accepted:false,reason:'immune',enemy:hadesLarge},'large enemies are charm immune');

  service.registerDamageModifier({id:'ward-a',apply:()=>({multiplier:1.2,stackKey:'ward-fire'})});
  service.registerDamageModifier({id:'ward-b',apply:()=>({multiplier:1.2,stackKey:'ward-fire'})});
  service.registerDamageModifier({id:'other-fire-bonus',priority:1,apply:()=>({multiplier:1.1})});
  assert.equal(service.modifyDamage(originalEnemy,100,{element:'Fire'}).damage,132,'same-key wards do not stack while independent modifiers compose');
}

class Transform{
  constructor(){this.x=0;this.y=0;this.z=0;}
  set(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;return this;}
}
class Object3D{
  constructor(){this.children=[];this.position=new Transform();this.rotation=new Transform();this.scale=new Transform().set(1,1,1);this.parent=null;this.name='';}
  add(...children){for(const child of children){child.parent=this;this.children.push(child);}return this;}
  remove(child){const index=this.children.indexOf(child);if(index>=0)this.children.splice(index,1);child.parent=null;}
  traverse(visitor){visitor(this);for(const child of this.children)child.traverse?.(visitor);}
}
class Group extends Object3D{}
class Geometry{dispose(){this.disposed=true;}}
class Material{constructor(options={}){Object.assign(this,options);}dispose(){this.disposed=true;}}
class Mesh extends Object3D{constructor(geometry=new Geometry(),material=new Material()){super();this.geometry=geometry;this.material=material;}}
const THREE={
  Group,Mesh,DodecahedronGeometry:Geometry,TorusGeometry:Geometry,RingGeometry:Geometry,
  ConeGeometry:Geometry,IcosahedronGeometry:Geometry,MeshBasicMaterial:Material,MeshStandardMaterial:Material,
};
const leashResolution=resolveAgentLeashPosition({
  owner:{x:0,z:0},desired:{x:0,z:-1.7},clearance:.3,
  walls:[{a:{x:-2,z:-.7},b:{x:2,z:-.7}}],
});
assert.equal(leashResolution.blockedByWall,true);
assert.ok(leashResolution.z>-.7&&leashResolution.z<0,'hard-leash recovery stays on the owner side of scenery');
assert.ok(Number.isFinite(RAPID_FIRE_AGENT_SPEC.attackRange)&&RAPID_FIRE_AGENT_SPEC.attackRange<RAPID_FIRE_AGENT_SPEC.shotSpeed*RAPID_FIRE_AGENT_SPEC.shotLife,'agent acquisition is explicitly bounded within projectile travel range');

// Warden Trial's projected stage is intentionally open even if a stale maze
// object still exposes the old theoretical hex boundary. Normal Arena keeps
// that collision source unchanged.
const theoreticalWardenWall={a:{x:-2,z:-.7},b:{x:2,z:-.7}};
const wardenRuntime={config:{mode:'arena',wardenTrial:true,variant:'warden-trial'},mazeWorld:{getCollisionSegments:()=>[theoreticalWardenWall]}};
assert.deepEqual(getArenaCollisionSegments(wardenRuntime),[],'Warden Trial must not expose hidden maze walls to Arcana');
const normalRuntime={config:{mode:'arena'},mazeWorld:{getCollisionSegments:()=>[theoreticalWardenWall]}};
assert.deepEqual(getArenaCollisionSegments(normalRuntime),[theoreticalWardenWall],'normal Arena must preserve maze wall collision');

const scene=new Group();
const player={x:0,z:0,forwardX:0,forwardZ:1,targetable:true,invulnerable:false};
const factionService=createArenaFactionService();
const enemies=[];const hits=[];const walls=[];
const enemySystem={
  enemies,factionService,
  get hostileEnemies(){return enemies.filter(enemy=>enemy.hp>0&&factionService.arenaFactionOf(enemy)==='hostile');},
  get charmedEnemy(){return factionService.charmedEnemy;},
  damageEnemy(enemy,amount,knock={},options={}){
    const modified=factionService.modifyDamage(enemy,amount,options);amount=modified.damage;
    hits.push({enemy,amount,knock,options,modifiers:modified.applied});enemy.hp-=amount;
    if(enemy.hp<=0){const index=enemies.indexOf(enemy);if(index>=0)enemies.splice(index,1);}
    return enemy.hp<=0;
  },
  setEnemyFaction(enemy,faction){enemy.wizardFaction=faction;enemy.state='idle';return true;},
  registerAlliedTarget:target=>factionService.registerAlliedTarget(target),
  unregisterAlliedTarget:id=>factionService.unregisterAlliedTarget(id),
  registerDamageModifier:modifier=>factionService.registerDamageModifier(modifier),
  unregisterDamageModifier:id=>factionService.unregisterDamageModifier(id),
  charmEnemy:(enemy,options)=>factionService.charmEnemy(enemy,options),
  releaseCharmedEnemy:enemy=>factionService.releaseCharm(enemy),
  getNearestHostile:position=>factionService.chooseTarget({...position,wizardFaction:'allied'},null)?.__arenaEntity||null,
};
factionService.registerEnemySystem('original',enemySystem);
let wallSource=()=>walls;
const runtime=installWizardAlliedArcanaRuntime({THREE,scene,getPlayer:()=>player,getEnemySystem:()=>enemySystem,getMazeSegments:()=>wallSource()});
const cast=id=>runtime.cast({id:`WOL-${id}`});
const step=(seconds,dt=.02)=>{for(let elapsed=0;elapsed<seconds-1e-9;elapsed+=dt)runtime.update(Math.min(dt,seconds-elapsed));};
const makeEnemy=(id,x,z,extra={})=>({id,x,z,hp:extra.hp??500,radius:extra.radius??.35,wizardFaction:'hostile',state:'idle',...extra});

// The summon follows/leashes, owns exactly 50 HP, shoots at a 0.4 s cadence,
// and refuses a cast while its 15 s cooldown is live.
let target=makeEnemy('agent-target',0,3);enemies.push(target);
assert.equal(cast(RAPID_FIRE_AGENT_SPEC.id),true);assert.equal(cast(RAPID_FIRE_AGENT_SPEC.id),false);
let agent=runtime.effects.find(effect=>effect.type==='agent');assert.equal(agent.hp,50);assert.equal(factionService.alliedTargets.length,1);
step(.8);
assert.ok(hits.some(hit=>hit.options.agentShot&&hit.amount===5),'agent shots deal the authored five damage');
assert.deepEqual(runtime.snapshot().semanticEvents.filter(event=>event.kind==='agent-shot-fired').slice(0,2).map(event=>event.stableId),['RAPID-FIRE-AGENT:0001:shot:01','RAPID-FIRE-AGENT:0001:shot:02']);
player.x=30;step(.02);assert.ok(Math.hypot(agent.x-player.x,agent.z-player.z)<RAPID_FIRE_AGENT_SPEC.leashDistance,'the summon teleports back inside its owner leash');
agent.onDamage(50,{},{sourceEnemyId:'original:0001'});assert.equal(runtime.effects.includes(agent),false);assert.equal(factionService.alliedTargets.length,0);

runtime.reset();hits.length=0;enemies.length=0;player.x=0;target=makeEnemy('cadence-target',0,3,{hp:10000});enemies.push(target);
assert.equal(cast(RAPID_FIRE_AGENT_SPEC.id),true);step(RAPID_FIRE_AGENT_SPEC.duration);
assert.equal(runtime.snapshot().semanticEvents.filter(event=>event.kind==='agent-shot-fired').length,25,'ten seconds at 2.5 shots per second emits exactly 25 shots');
assert.equal(runtime.effects.some(effect=>effect.type==='agent'),false);assert.ok(Math.abs(runtime.cooldowns.get(RAPID_FIRE_AGENT_SPEC.id)-5)<1e-9);

runtime.reset();hits.length=0;enemies.length=0;walls.length=0;target=makeEnemy('snapshot-target',0,5,{hp:10000});enemies.push(target);
assert.equal(cast(RAPID_FIRE_AGENT_SPEC.id),true);runtime.update(.01);const snapshottedShot=runtime.effects.find(effect=>effect.type==='agentShot');assert.ok(snapshottedShot);const launchDirection={...snapshottedShot.direction};target.x=4;target.z=0;runtime.update(.05);assert.deepEqual(snapshottedShot.direction,launchDirection,'agent projectiles snapshot their target direction when fired');

runtime.reset();hits.length=0;enemies.length=0;walls.length=0;target=makeEnemy('out-of-range',0,RAPID_FIRE_AGENT_SPEC.attackRange+2,{hp:10000});enemies.push(target);
assert.equal(cast(RAPID_FIRE_AGENT_SPEC.id),true);step(.81);assert.equal(runtime.snapshot().semanticEvents.filter(event=>event.kind==='agent-shot-fired').length,0,'the agent does not acquire enemies outside its authored attack range');
target.z=2;step(.41);assert.ok(runtime.snapshot().semanticEvents.some(event=>event.kind==='agent-shot-fired'),'the same enemy becomes eligible after entering attack range');

runtime.reset();hits.length=0;enemies.length=0;walls.length=0;target=makeEnemy('selected-target',0,6,{hp:10000});enemies.push(target);
assert.equal(cast(RAPID_FIRE_AGENT_SPEC.id),true);runtime.update(.01);const pathShot=runtime.effects.find(effect=>effect.type==='agentShot');assert.equal(pathShot.target,target);
const pathBlocker=makeEnemy('path-blocker',0,1,{hp:10000});enemies.push(pathBlocker);runtime.update(.1);
assert.equal(pathBlocker.hp,9995,'a shot belongs to the first hostile swept contact, even when another target was selected at launch');
assert.equal(target.hp,10000);const pathHitEvent=runtime.snapshot().semanticEvents.find(event=>event.kind==='agent-shot-hit');assert.notEqual(pathHitEvent.targetId,pathHitEvent.selectedTargetId);

runtime.reset();hits.length=0;enemies.length=0;walls.length=0;player.x=0;player.z=0;player.forwardX=0;player.forwardZ=1;
assert.equal(cast(RAPID_FIRE_AGENT_SPEC.id),true);agent=runtime.effects.find(effect=>effect.type==='agent');agent.x=20;agent.z=0;walls.push({a:{x:-2,z:-.7},b:{x:2,z:-.7}});runtime.update(.01);
assert.ok(agent.z>-.7&&agent.z<=0,'hard-leash recovery cannot place the summon through a wall behind its owner');
assert.ok(runtime.snapshot().semanticEvents.some(event=>event.kind==='agent-leash-teleport'&&event.blockedByWall===true));walls.length=0;

runtime.reset();hits.length=0;enemies.length=0;walls.length=0;target=makeEnemy('wall-target',0,4,{hp:10000});enemies.push(target);walls.push({a:{x:-2,z:1},b:{x:2,z:1}});
assert.equal(cast(RAPID_FIRE_AGENT_SPEC.id),true);step(.3);assert.equal(hits.filter(hit=>hit.options.agentShot).length,0);assert.ok(runtime.snapshot().semanticEvents.some(event=>event.kind==='agent-shot-fizzled'&&event.reason==='wall'),'agent projectiles fizzle harmlessly at scenery');walls.length=0;

runtime.reset();hits.length=0;enemies.length=0;walls.length=0;target=makeEnemy('near-wall-target',0,1.2,{hp:10000,radius:.5});enemies.push(target);walls.push({a:{x:-2,z:1},b:{x:2,z:1}});
assert.equal(cast(RAPID_FIRE_AGENT_SPEC.id),true);step(.3);assert.equal(hits.filter(hit=>hit.options.agentShot).length,0,'an expanded target collider immediately behind a wall cannot steal the projectile contact');walls.length=0;

provideArenaRuntime(wardenRuntime);
wallSource=()=>getArenaCollisionSegments();
runtime.reset();hits.length=0;enemies.length=0;player.x=0;player.z=0;player.forwardX=0;player.forwardZ=1;
assert.equal(cast(RAPID_FIRE_AGENT_SPEC.id),true);
agent=runtime.effects.find(effect=>effect.type==='agent');
step(.35);
assert.ok(agent.z<theoreticalWardenWall.a.z,'Rapid Fire Agent must cross the removed Warden Trial wall position');
assert.equal(runtime.snapshot().semanticEvents.some(event=>event.kind==='agent-leash-teleport'&&event.blockedByWall===true),false,'Warden Trial agent movement must not report a hidden wall block');
wallSource=()=>walls;
clearArenaRuntime();

// Ward placement/pulses stay exact while Fire damage from other sources is
// amplified once. The ward is itself a finite-health registered ally.
runtime.reset();hits.length=0;enemies.length=0;player.x=0;player.z=0;
target=makeEnemy('ward-target',0,1);enemies.push(target);
assert.equal(cast(WARD_OF_FLAMES_SPEC.id),true);assert.equal(hits[0].amount,25);let ward=runtime.effects.find(effect=>effect.type==='ward');assert.equal(ward.hp,50);assert.ok(ward.z>player.z,'the ward is placed ahead of the caster');
assert.ok(Math.abs(ward.z-WARD_OF_FLAMES_SPEC.placementDistance)<1e-9,'unobstructed ward placement preserves its authored distance');
assert.equal(runtime.snapshot().semanticEvents.filter(event=>event.kind==='ward-placed').length,1);
enemySystem.damageEnemy(target,10,{},{source:'wizardArcana',arcanaId:'FLAME-STRIKE',sourceId:'external-fire'});assert.equal(hits.at(-1).amount,12,'the field applies one 20% multiplier to inferred Fire-tagged Wizard damage');
step(1.01);assert.equal(hits.filter(hit=>hit.options.pulse).at(-1).amount,6,'the ward field amplifies its own raw five-damage Fire pulse once');
ward.onDamage(50,{},{sourceEnemyId:'flare:0001'});assert.equal(runtime.effects.includes(ward),false);assert.equal(factionService.alliedTargets.length,0);

runtime.reset();hits.length=0;enemies.length=0;target=makeEnemy('ward-duration-target',0,1,{hp:10000});enemies.push(target);
assert.equal(cast(WARD_OF_FLAMES_SPEC.id),true);step(WARD_OF_FLAMES_SPEC.duration);
assert.equal(runtime.snapshot().semanticEvents.filter(event=>event.kind==='ward-pulse').length,8);assert.equal(runtime.effects.some(effect=>effect.type==='ward'),false);

// Mentis deals damage before conversion, transfers one indefinite charm, and
// leaves the existing charm intact when the arrow hits an immune large enemy.
runtime.reset();hits.length=0;enemies.length=0;walls.length=0;
const occluded=makeEnemy('occluded',0,2,{hp:200});enemies.push(occluded);walls.push({a:{x:-2,z:1},b:{x:2,z:1}});
assert.equal(cast(MENTIS_IMPERIUM_SPEC.id),true);step(.2);assert.equal(occluded.hp,200);assert.equal(occluded.wizardFaction,'hostile');assert.equal(factionService.charmedEnemy,null);
assert.ok(runtime.snapshot().semanticEvents.some(event=>event.kind==='mentis-arrow-fizzled'&&event.reason==='wall'&&event.damage===0&&event.charmed===false),'Mentis fizzles without damage or charm at scenery');

runtime.reset();hits.length=0;enemies.length=0;walls.length=0;const nearOccluded=makeEnemy('near-occluded',0,1.2,{hp:200,radius:.5});enemies.push(nearOccluded);walls.push({a:{x:-2,z:1},b:{x:2,z:1}});
assert.equal(cast(MENTIS_IMPERIUM_SPEC.id),true);step(.2);assert.equal(nearOccluded.hp,200,'Mentis cannot hit an expanded collider whose center is immediately behind scenery');assert.equal(factionService.charmedEnemy,null);walls.length=0;

runtime.reset();hits.length=0;enemies.length=0;walls.length=0;
const first=makeEnemy('first',0,2,{hp:200}),second=makeEnemy('second',0,4,{hp:200});enemies.push(first,second);
assert.equal(cast(MENTIS_IMPERIUM_SPEC.id),true);step(.2);assert.equal(first.hp,165);assert.equal(first.wizardFaction,'allied');assert.equal(factionService.charmedEnemy,first);
step(MENTIS_IMPERIUM_SPEC.cooldown);assert.equal(cast(MENTIS_IMPERIUM_SPEC.id),true);step(.35);assert.equal(second.hp,165);assert.equal(second.wizardFaction,'allied');assert.equal(first.wizardFaction,'hostile');assert.equal(factionService.charmedEnemy,second);
step(MENTIS_IMPERIUM_SPEC.cooldown);const large=makeEnemy('large',0,2,{hp:200,radius:1.45});enemies.unshift(large);assert.equal(cast(MENTIS_IMPERIUM_SPEC.id),true);step(.2);assert.equal(large.hp,165);assert.equal(large.wizardFaction,'hostile');assert.equal(factionService.charmedEnemy,second,'an immune hit must not release the current charm');

runtime.reset();assert.equal(first.wizardFaction,'hostile');assert.equal(second.wizardFaction,'hostile');assert.equal(runtime.snapshot().effects.length,0);
runtime.dispose();
console.log('wizard allied Arcana runtime and faction service tests passed');
