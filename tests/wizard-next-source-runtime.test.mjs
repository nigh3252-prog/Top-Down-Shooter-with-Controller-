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
  add(child){child.parent=this;this.children.push(child);return this;}
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
assert.equal(runtime.snapshot().semanticEvents.filter(event=>event.kind==='bolt-rail-stream').length,5);
const successfulFinisher=runtime.snapshot().semanticEvents.find(event=>event.kind==='bolt-rail-finisher');
assert.equal(successfulFinisher.triggered,true);assert.equal(successfulFinisher.primaryTargetId,'bolt-target');
assert.ok(runtime.snapshot().semanticEvents.filter(event=>event.kind==='bolt-rail-stream').every(event=>event.instantaneous&&event.ignoresWorldCollision&&event.visualMode==='contract'));

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

runtime.dispose();
console.log('wizard next source runtime tests passed');
