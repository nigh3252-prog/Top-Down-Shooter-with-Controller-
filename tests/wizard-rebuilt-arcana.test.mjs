import assert from 'node:assert/strict';
import { installWizardRebuiltArcanaRuntime } from '../src/wizard-rebuilt-arcana-runtime.js';

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
  SphereGeometry:Geometry,DodecahedronGeometry:Geometry,ConeGeometry:Geometry,
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
const runtime=installWizardRebuiltArcanaRuntime({THREE,scene,getPlayer:()=>player,getEnemySystem:()=>system,getMazeSegments:()=>[]});
const cast=id=>runtime.cast({id:`WOL-${id}`,arcanaId:id});
const step=(seconds,dt=.025,mutate=()=>{})=>{for(let elapsed=0;elapsed<seconds;elapsed+=dt){mutate();runtime.update(dt,elapsed);}};

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
const dragonTarget={x:0,z:6,hp:1000,radius:.5};system.enemies=[dragonTarget];step(2.2);
assert.equal(hits.filter(hit=>hit.options.dragonArc).length,8,'full base stock must emit eight piercing dragons');
assert.ok(hits.filter(hit=>hit.options.dragonArc).every(hit=>hit.amount===8));
assert.ok(runtime.state.dragonStock>=3,'Dragon Arc must recover one stock every 0.6 seconds');
runtime.reset();hits.length=0;

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
