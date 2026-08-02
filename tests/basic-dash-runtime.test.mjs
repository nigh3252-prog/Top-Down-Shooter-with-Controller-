import assert from 'node:assert/strict';
import { installBasicDashRuntime } from '../src/basic-dash.js';
import { provideArenaRuntime } from '../src/arena-runtime-context.js';

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

function makeScenario({ moveX=0, moveZ=0 }={}){
  const actorPos={ x:0, y:0, set(x,z){ this.x=x; this.y=z; } };
  const root={ position:{ x:0, y:0, z:0, set(x,y,z){ this.x=x; this.y=y; this.z=z; } } };
  const yawQ=new Quaternion();
  let facing=0;
  const actorVisual={ parent:root, quaternion:new Quaternion() };
  const activeModel={position:{x:0,y:3.05,z:0},rotation:{x:0,y:0,z:0}};
  const handle={
    arena:{ deadT:-1, dodge:{ t:-1, dirX:0, dirZ:1 } },
    actorPos,
    roomTransition:{ active:false },
    mazeWorld:{ getCollisionSegments(){ return []; } },
  };
  const gamepad={ axes:[moveX,moveZ], buttons:Array.from({length:16},()=>({pressed:false})) };
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads(){return[gamepad];}}});
  globalThis.window={ __arena:handle };
  provideArenaRuntime({...handle,config:{mode:'arena',enemyLab:false}});
  const runtime=installBasicDashRuntime({
    THREE:{ Vector3, Quaternion },actorVisual,activeModel,yawQ,
    hooks:{ commitFacing(value){ facing=value; } },
  });
  return{actorPos,actorVisual,activeModel,handle,runtime,get facing(){return facing;}};
}

const backward=makeScenario();
backward.runtime.update(.016);
backward.handle.arena.dodge.t=0;
backward.runtime.update(.016);
assert.ok(backward.actorPos.y<0,'dash should move immediately on the first triggered frame');
assert.ok(backward.activeModel.position.y<3.05,'the moving dash can overlap a slight body compression');
assert.ok(backward.activeModel.rotation.x>0,'backward dash should briefly lean forward while already moving');
assert.equal(backward.facing,0,'idle backward dash should preserve the original facing');

let backwardEnd=null;
for(let frame=0;frame<40;frame++){
  backward.runtime.update(.016);
  if(!backward.runtime.state.active&&backward.runtime.state.postActive&&backwardEnd===null)backwardEnd={x:backward.actorPos.x,z:backward.actorPos.y};
}
assert.ok(backwardEnd,'dash should enter its post-dash steering lock');
assert.ok(Math.abs(backwardEnd.z+8.4)<1e-8,`backward dash distance should be 8.4, got ${backwardEnd.z}`);
assert.ok(Math.abs(backwardEnd.x)<1e-8);
assert.equal(backward.facing,0,'backward travel must not turn the Warden away from the target');
assert.equal(backward.actorVisual.quaternion.angle,0,'visual yaw should remain locked to the pre-dash facing');
for(let frame=0;frame<30;frame++)backward.runtime.update(.016);
assert.equal(backward.activeModel.position.y,3.05,'Warden pose should return to its exact baseline after recovery');
assert.equal(backward.activeModel.rotation.x,0,'Warden fore-aft lean should reset after recovery');
assert.equal(backward.activeModel.rotation.z,0,'Warden side lean should reset after recovery');

const sideways=makeScenario({moveX:1});
sideways.runtime.update(.016);
sideways.handle.arena.dodge.t=0;
sideways.runtime.update(.016);
assert.ok(sideways.actorPos.x>0,'sideways dash should also move immediately');
assert.ok(sideways.activeModel.rotation.z>0,'right dash should briefly lean left while moving');
let sidewaysEnd=null;
for(let frame=0;frame<40;frame++){
  sideways.runtime.update(.016);
  if(!sideways.runtime.state.active&&sideways.runtime.state.postActive&&sidewaysEnd===null)sidewaysEnd={x:sideways.actorPos.x,z:sideways.actorPos.y};
}
assert.ok(sidewaysEnd,'sideways dash should enter recovery');
assert.ok(Math.abs(sidewaysEnd.x-8.4)<1e-8,`sideways dash distance should be 8.4, got ${sidewaysEnd.x}`);
assert.ok(Math.abs(sidewaysEnd.z)<1e-8);
assert.equal(sideways.facing,0,'sideways travel must preserve target-facing yaw');
assert.equal(sideways.actorVisual.quaternion.angle,0,'sideways dash must not rotate the visual toward travel');

const arcana=makeScenario({moveX:1});
arcana.runtime.update(.016);
const token=arcana.runtime.startDashMotion({
  source:'arcana',
  direction:{x:1,z:0},
  grantIframes:false,
  applyDodgeCooldown:false,
});
assert.ok(token,'an idle runtime should accept an authored Arcana dash');
assert.equal(arcana.runtime.state.source,'arcana');
assert.equal(arcana.handle.arena.invulnT,undefined,'Arcana motion must not grant ordinary dodge iframes');
assert.equal(arcana.handle.arena.dodge.cool,undefined,'Arcana motion must not spend the ordinary dodge cooldown');
assert.equal(arcana.runtime.startDashMotion({source:'arcana'}),null,'overlapping authored dashes must be rejected');
let motionEnd=null;
for(let frame=0;frame<60;frame++){
  arcana.runtime.update(.016);
  const snapshot=token.snapshot();
  if(snapshot.movementComplete&&!motionEnd)motionEnd=snapshot;
}
assert.ok(motionEnd,'the motion token should report the completed movement phase');
assert.ok(Math.abs(motionEnd.end.x-8.4)<1e-8,'authored Arcana motion must reuse the exact four-width dash distance');
assert.equal(motionEnd.blocked,false);
assert.ok(motionEnd.path.length>2,'the motion token should retain the actual sampled route');
assert.deepEqual(motionEnd.resolvedDirection,{x:1,z:0},'the shared motion token exposes its completed-path tangent independently of recovery steering');
assert.equal(token.snapshot().complete,true,'the motion token should finish after the shared post-dash recovery');
assert.equal(arcana.runtime.busy,false);
arcana.actorPos.set(0,0);arcana.actorVisual.parent.position.set(0,0,0);
arcana.runtime.reset();
arcana.actorPos.set(4,-3);arcana.actorVisual.parent.position.set(4,0,-3);
const replayToken=arcana.runtime.startDashMotion({source:'arcana',direction:{x:1,z:0}});
assert.equal(replayToken.snapshot().id,1,'capture reset should restore deterministic motion ids');
assert.deepEqual(replayToken.snapshot().start,{x:4,z:-3},'a dash starting after a room/respawn relocation must sample the new authoritative player position');

console.log('basic dash runtime tests passed');
