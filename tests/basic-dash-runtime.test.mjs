import assert from 'node:assert/strict';
import { installBasicDashRuntime } from '../src/basic-dash.js';

class Quaternion {
  constructor(){ this.angle=0; }
  setFromAxisAngle(_axis, angle){ this.angle=angle; return this; }
  copy(other){ this.angle=other.angle; return this; }
}

class Vector3 {
  constructor(x=0, y=0, z=0){ this.set(x, y, z); }
  set(x, y, z){ this.x=x; this.y=y; this.z=z; return this; }
  applyQuaternion(quaternion){
    const x=this.x, z=this.z;
    this.x=x*Math.cos(quaternion.angle)+z*Math.sin(quaternion.angle);
    this.z=-x*Math.sin(quaternion.angle)+z*Math.cos(quaternion.angle);
    return this;
  }
  lengthSq(){ return this.x*this.x+this.y*this.y+this.z*this.z; }
  normalize(){
    const length=Math.hypot(this.x,this.y,this.z)||1;
    this.x/=length; this.y/=length; this.z/=length;
    return this;
  }
}

const actorPos={ x:0, y:0, set(x,z){ this.x=x; this.y=z; } };
const root={ position:{ x:0, y:0, z:0, set(x,y,z){ this.x=x; this.y=y; this.z=z; } } };
const yawQ=new Quaternion();
let facing=0;
const actorVisual={ parent:root, quaternion:new Quaternion() };
const handle={
  arena:{ deadT:-1, dodge:{ t:-1, dirX:0, dirZ:1 } },
  actorPos,
  roomTransition:{ active:false },
  mazeWorld:{ getCollisionSegments(){ return []; } },
};

globalThis.window={ __arena:handle };
const runtime=installBasicDashRuntime({
  THREE:{ Vector3, Quaternion },
  actorVisual,
  yawQ,
  hooks:{ commitFacing(value){ facing=value; } },
});

runtime.update(.016);
handle.arena.dodge.t=0;
let endDashPosition=null;
for(let frame=0; frame<40; frame++){
  runtime.update(.016);
  if(!runtime.state.active && runtime.state.postActive && endDashPosition===null){
    endDashPosition={ x:actorPos.x, z:actorPos.y };
  }
}

assert.ok(endDashPosition, 'dash should enter its post-dash steering lock');
assert.ok(Math.abs(endDashPosition.z + 10.5)<1e-8, `dash distance should be 10.5, got ${endDashPosition.z}`);
assert.ok(Math.abs(endDashPosition.x)<1e-8);
assert.ok(Math.abs(Math.abs(facing)-Math.PI)<1e-8, 'idle dash should face backward');

console.log('basic dash runtime test passed');
