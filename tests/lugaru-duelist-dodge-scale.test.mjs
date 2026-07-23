import assert from 'node:assert/strict';
import {
  LUGARU_DODGE_DISTANCE_SCALE,
  installLugaruDuelistDodgeScale,
  scaledDodgeExtension,
} from '../src/lugaru-duelist-dodge-scale.js';

assert.equal(LUGARU_DODGE_DISTANCE_SCALE,1.5);
assert.deepEqual(scaledDodgeExtension({x:0,z:0},{x:4,z:-2}),{x:2,z:-1},'the wrapper should add half of the original dodge displacement');

const enemy={
  hp:50,_lugaruDuelist:true,duelistIntent:'assess',x:0,z:0,radius:1,collisionScale:1,
  root:{position:{x:0,z:0}},
};
const system={
  enemies:[enemy],heightScale:1,
  update(){enemy.x=4;enemy.z=-2;enemy.duelistIntent='evade';},
};
installLugaruDuelistDodgeScale(system,{arenaRadius:50});
system.update(.016,{x:0,z:0});
assert.equal(enemy.x,6);
assert.equal(enemy.z,-3);
assert.equal(enemy.root.position.x,6);
assert.equal(enemy.root.position.z,-3);
assert.equal(enemy.duelistDodgeScale,1.5);

const finalFrame={
  hp:50,_lugaruDuelist:true,duelistIntent:'evade',x:0,z:0,radius:1,collisionScale:1,
  root:{position:{x:0,z:0}},
};
const finalFrameSystem={
  enemies:[finalFrame],heightScale:1,
  update(){finalFrame.x=2;finalFrame.duelistIntent='assess';},
};
installLugaruDuelistDodgeScale(finalFrameSystem,{arenaRadius:50});
finalFrameSystem.update(.016,{});
assert.equal(finalFrame.x,3,'the frame that finishes the evade should still receive the final 50% extension');

const idle={hp:50,_lugaruDuelist:true,duelistIntent:'assess',x:0,z:0,root:{position:{x:0,z:0}}};
const idleSystem={enemies:[idle],update(){idle.x=2;idle.duelistIntent='assess';}};
installLugaruDuelistDodgeScale(idleSystem,{arenaRadius:50});
idleSystem.update(.016,{});
assert.equal(idle.x,2,'ordinary approach movement must not be enlarged');

console.log('Lugaru 1.5x dodge-distance tests passed.');
