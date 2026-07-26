import assert from 'node:assert/strict';
import {
  installWizardNextSourceRuntime,
  WIZARD_NEXT_SOURCE_SEMANTIC_EVENT,
} from '../src/wizard-next-source-runtime.js';

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
class Geometry{setFromPoints(points){this.points=points;return this;}dispose(){this.disposed=true;}}
class Material{constructor(options={}){Object.assign(this,options);}dispose(){this.disposed=true;}}
class Mesh extends Object3D{constructor(geometry=new Geometry(),material=new Material()){super();this.geometry=geometry;this.material=material;}}
class Line extends Mesh{}
class Vector3{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}}
const THREE={
  Group,Mesh,Line,Vector3,BufferGeometry:Geometry,
  SphereGeometry:Geometry,DodecahedronGeometry:Geometry,ConeGeometry:Geometry,
  TorusGeometry:Geometry,RingGeometry:Geometry,CircleGeometry:Geometry,
  MeshBasicMaterial:Material,LineBasicMaterial:Material,
  AdditiveBlending:'add',NormalBlending:'normal',DoubleSide:'double',
};

class EventTargetMock{
  constructor(){this.listeners=new Map();this.parent=this;this.frameElement=null;this.semantic=[];}
  addEventListener(type,listener){const values=this.listeners.get(type)||[];values.push(listener);this.listeners.set(type,values);}
  removeEventListener(type,listener){this.listeners.set(type,(this.listeners.get(type)||[]).filter(value=>value!==listener));}
  dispatchEvent(event){if(event.type===WIZARD_NEXT_SOURCE_SEMANTIC_EVENT)this.semantic.push(event.detail);for(const listener of this.listeners.get(event.type)||[])listener(event);return true;}
}

globalThis.CustomEvent=class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}};
globalThis.location={search:'?enemyLab=1&capture=1&stage=motion',pathname:'/combat-arena.html'};
globalThis.window=new EventTargetMock();
globalThis.window.__abilityCapture={snapshot:()=>({stage:'motion'})};
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};

const scene=new Group();
const player={x:0,z:0,forwardX:0,forwardZ:1};
const hits=[];
const system={
  enemies:[],heightScale:1,
  damageEnemy(enemy,amount,knock,options){hits.push({enemy,amount,knock,options});enemy.hp-=amount;return true;},
};
const walls=[];
const runtime=installWizardNextSourceRuntime({THREE,scene,getPlayer:()=>player,getEnemySystem:()=>system,getMazeSegments:()=>walls});
const cast=id=>runtime.cast({id:`WOL-${id}`,arcanaId:id});
const step=(seconds,dt=.02)=>{for(let elapsed=0;elapsed<seconds-1e-9;elapsed+=dt)runtime.update(Math.min(dt,seconds-elapsed),elapsed);};

const boltTarget={id:'bolt-target',x:0,z:2.6,hp:1000,radius:.4};
system.enemies=[boltTarget];walls.push({a:{x:-2,z:1},b:{x:2,z:1}});
assert.equal(cast('BOLT-RAIL'),true);step(.8);
assert.deepEqual(hits.map(hit=>hit.amount),[5,5,5,5,5,10],'five instant streams plus the gated finisher must resolve through world geometry');
const successfulStreamIds=runtime.snapshot().semanticEvents.filter(event=>event.kind==='bolt-rail-stream').map(event=>event.stableId);
assert.equal(successfulStreamIds.length,5);assert.equal(new Set(successfulStreamIds).size,5);assert.deepEqual(successfulStreamIds,['BOLT-RAIL:0001:stream:01','BOLT-RAIL:0001:stream:02','BOLT-RAIL:0001:stream:03','BOLT-RAIL:0001:stream:04','BOLT-RAIL:0001:stream:05']);
const successfulFinisher=runtime.snapshot().semanticEvents.find(event=>event.kind==='bolt-rail-finisher');
assert.equal(successfulFinisher.triggered,true);assert.equal(successfulFinisher.primaryTargetId,'bolt-target');
assert.ok(runtime.snapshot().semanticEvents.filter(event=>event.kind==='bolt-rail-stream').every(event=>event.instantaneous&&event.ignoresWorldCollision&&event.visualMode==='contract'));

runtime.reset();hits.length=0;walls.length=0;
const boltNear={id:'bolt-near',x:0,z:1.8,hp:1000,radius:.3},boltFar={id:'bolt-far',x:0,z:3.4,hp:1000,radius:.3};system.enemies=[boltNear,boltFar];
assert.equal(cast('BOLT-RAIL'),true);step(.8);
const multiStreams=runtime.snapshot().semanticEvents.filter(event=>event.kind==='bolt-rail-stream');
assert.equal(multiStreams.length,5);assert.ok(multiStreams.every(event=>event.endpointTargetId==='bolt-far'&&event.endpointPolicy==='farthest-hit'),'the visible carrier must reach the farthest damaged target so every per-hit bloom remains connected');
assert.deepEqual(multiStreams.map(event=>event.stableId),successfulStreamIds,'reset must deterministically restart authored Bolt emission IDs');
const multiFinisher=runtime.snapshot().semanticEvents.find(event=>event.kind==='bolt-rail-finisher');
assert.equal(multiFinisher.primaryTargetId,'bolt-near');assert.equal(multiFinisher.primaryPolicy,'nearest-hit','the documented primary contact owns the fifth-beat burst');

runtime.reset();hits.length=0;system.enemies=[];walls.length=0;
assert.equal(cast('BOLT-RAIL'),true);step(.8);
const missedFinisher=runtime.snapshot().semanticEvents.find(event=>event.kind==='bolt-rail-finisher');
assert.deepEqual({triggered:missedFinisher.triggered,reason:missedFinisher.reason,damage:missedFinisher.damage},{triggered:false,reason:'fifth-stream-missed',damage:0});
assert.equal(hits.length,0);

runtime.reset();hits.length=0;
const directTarget={id:'direct-target',x:0,z:3,hp:1000,radius:.35};system.enemies=[directTarget];
assert.equal(cast('VOLT-DISC'),true);step(.3);
assert.deepEqual(hits.map(hit=>hit.amount),[9],'the zero-damage contact event must not call the ordinary damage pipeline');
const directEvents=runtime.snapshot().semanticEvents;
assert.equal(directEvents.filter(event=>event.kind==='volt-disc-carrier-hit').length,1);
const contactEvent=directEvents.find(event=>event.kind==='volt-disc-contact-event');
assert.deepEqual({damage:contactEvent.damage,countsAsContact:contactEvent.countsAsContact,ordinaryDamageSideEffects:contactEvent.ordinaryDamageSideEffects},{damage:0,countsAsContact:true,ordinaryDamageSideEffects:false});

runtime.reset();hits.length=0;system.enemies=[];
player.forwardX=0;player.forwardZ=1;cast('VOLT-DISC');
player.forwardX=1;player.forwardZ=0;cast('VOLT-DISC');
let discs=runtime.snapshot().effects.filter(effect=>effect.type==='voltDiscProjectile');
assert.deepEqual(discs.map(effect=>effect.press),[1,2]);
assert.deepEqual(discs.map(effect=>effect.stableId),['VOLT-DISC:0001:disc:01','VOLT-DISC:0001:disc:02']);
assert.deepEqual(discs.map(effect=>effect.direction),[{x:0,z:1},{x:1,z:0}],'every manual press must sample live aim');
assert.equal(runtime.snapshot().voltDiscCombo.press,2);assert.equal(runtime.snapshot().voltDiscCombo.remaining,.9);
step(.91,.01);assert.equal(runtime.snapshot().voltDiscCombo.active,false);assert.equal(runtime.snapshot().semanticEvents.at(-1).kind,'volt-disc-combo-expired');
cast('VOLT-DISC');assert.equal(runtime.snapshot().voltDiscCombo.press,1,'a post-timeout press must begin a fresh combo');
cast('VOLT-DISC');cast('VOLT-DISC');assert.equal(runtime.snapshot().voltDiscCombo.active,false,'the third press completes and closes the combo lock');

runtime.reset();hits.length=0;system.enemies=[];walls.push({a:{x:1.5,z:-2},b:{x:1.5,z:2}});
player.forwardX=1;player.forwardZ=0;cast('VOLT-DISC');step(.2);
assert.equal(hits.length,0);const wallEvent=runtime.snapshot().semanticEvents.find(event=>event.kind==='volt-disc-wall-fizzle');
assert.deepEqual({damage:wallEvent.damage,harmless:wallEvent.harmless,ordinaryDamageSideEffects:wallEvent.ordinaryDamageSideEffects},{damage:0,harmless:true,ordinaryDamageSideEffects:false});
assert.equal(runtime.snapshot().semanticEvents.some(event=>event.kind==='volt-disc-terminal-burst'),false,'wall contact must not inherit the range-expiry payload');

runtime.reset();hits.length=0;walls.length=0;player.forwardX=0;player.forwardZ=1;
const terminalTarget={id:'terminal-target',x:1.15,z:8.1,hp:1000,radius:.25};system.enemies=[terminalTarget];
cast('VOLT-DISC');step(.7);
assert.deepEqual(hits.map(hit=>hit.amount),[9]);assert.equal(hits[0].options.terminal,true);
const terminalEvent=runtime.snapshot().semanticEvents.find(event=>event.kind==='volt-disc-terminal-burst');
assert.equal(terminalEvent.damage,9);assert.deepEqual(terminalEvent.targetIds,['terminal-target']);

runtime.reset();hits.length=0;walls.length=0;player.forwardX=0;player.forwardZ=1;
const nearBoltTarget={id:'near-bolt-target',x:0,z:1.8,hp:1000,radius:.3},farBoltTarget={id:'far-bolt-target',x:0,z:3.4,hp:1000,radius:.3};system.enemies=[farBoltTarget,nearBoltTarget];
cast('BOLT-RAIL');step(.8);const multiTargetBoltEvents=runtime.snapshot().semanticEvents,finalMultiStream=multiTargetBoltEvents.filter(event=>event.kind==='bolt-rail-stream').at(-1),multiTargetFinisher=multiTargetBoltEvents.find(event=>event.kind==='bolt-rail-finisher');
assert.deepEqual({endpointTargetId:finalMultiStream.endpointTargetId,endpointPolicy:finalMultiStream.endpointPolicy,endpoint:finalMultiStream.endpoint},{endpointTargetId:'far-bolt-target',endpointPolicy:'farthest-hit',endpoint:{x:0,z:3.4}},'a piercing stream must remain visibly connected through its farthest contact');
assert.deepEqual(new Set(finalMultiStream.hitTargetIds),new Set(['near-bolt-target','far-bolt-target']),'every contacted target must retain its own per-hit bloom contract');
assert.deepEqual({primaryTargetId:multiTargetFinisher.primaryTargetId,primaryPolicy:multiTargetFinisher.primaryPolicy,position:multiTargetFinisher.position},{primaryTargetId:'near-bolt-target',primaryPolicy:'nearest-hit',position:{x:0,z:1.8}},'the gated finisher deliberately erupts from the first contacted target even though the piercing stream continues farther');

runtime.reset();hits.length=0;runtime.state.sizeMultiplier=1.4;system.enemies=[boltTarget];globalThis.location.search='?enemyLab=1&capture=1&stage=reference';window.__abilityCapture.snapshot=()=>({stage:'reference'});
cast('BOLT-RAIL');runtime.update(.05,0);let boltVisual=runtime.state.effects.find(effect=>effect.type==='boltRailStrike');
assert.equal(boltVisual.visualMode,'source');assert.ok(boltVisual.visualRange<boltVisual.spec.range,'a contacted Bolt Rail visual must stop at its actual target instead of drawing to maximum range');
assert.deepEqual(boltVisual.endpoint,{x:boltTarget.x,z:boltTarget.z});const sourceBoltParts=boltVisual.mesh.children.length;assert.ok(sourceBoltParts>20,'source silhouette must be one layered main carrier with visible forks');
assert.notEqual(boltVisual.size,1);assert.equal(boltVisual.mesh.scale.x,boltVisual.size);assert.equal(boltVisual.mesh.scale.z,boltVisual.size,'Bolt Rail updates must preserve the configured global size instead of collapsing the stream to unit scale');
runtime.reset();window.__abilityCapture.snapshot=()=>({stage:'style'});globalThis.location.search='?enemyLab=1&capture=1&stage=style';system.enemies=[boltTarget];cast('BOLT-RAIL');runtime.update(.05,0);boltVisual=runtime.state.effects.find(effect=>effect.type==='boltRailStrike');
assert.equal(boltVisual.visualMode,'style');assert.ok(boltVisual.mesh.children.length>sourceBoltParts,'style rendering must add glow and hot spark density beyond the source silhouette');

runtime.reset();runtime.state.sizeMultiplier=1.35;system.enemies=[];window.__abilityCapture.snapshot=()=>({stage:'reference'});globalThis.location.search='?enemyLab=1&capture=1&stage=reference';cast('VOLT-DISC');runtime.update(.01,0);let voltVisual=runtime.state.effects.find(effect=>effect.type==='voltDiscProjectile');const sourceDiscParts=voltVisual.mesh.children.length;
assert.equal(voltVisual.visualMode,'source');assert.ok(sourceDiscParts>=8,'source disc needs a layered hot hollow rim plus surrounding fragments');
assert.notEqual(voltVisual.size,1);assert.deepEqual({x:voltVisual.mesh.scale.x,y:voltVisual.mesh.scale.y,z:voltVisual.mesh.scale.z},{x:voltVisual.size,y:voltVisual.size,z:voltVisual.size},'Volt Disc updates must animate internal fragments without overwriting the configured projectile scale');
runtime.reset();window.__abilityCapture.snapshot=()=>({stage:'style'});globalThis.location.search='?enemyLab=1&capture=1&stage=style';cast('VOLT-DISC');voltVisual=runtime.state.effects.find(effect=>effect.type==='voltDiscProjectile');
assert.equal(voltVisual.visualMode,'style');assert.ok(voltVisual.mesh.children.length>sourceDiscParts,'style disc must preserve the source ring while adding corona, fragments, and echoes');
runtime.reset();globalThis.location.search='?enemyLab=1';window.__abilityCapture.snapshot=()=>({stage:'motion'});cast('VOLT-DISC');voltVisual=runtime.state.effects.find(effect=>effect.type==='voltDiscProjectile');
assert.equal(voltVisual.visualMode,'style','production Enemy Lab rendering must always use the polished style path even if a stale capture controller reports motion');

runtime.dispose();
console.log('wizard next source runtime tests passed');
