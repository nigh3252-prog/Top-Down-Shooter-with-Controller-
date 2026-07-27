import assert from 'node:assert/strict';
import {LUGARU_DODGE_DISTANCE_SCALE,installLugaruDuelistDodgeScale,scaledLugaruDodgeDelta} from '../src/lugaru-duelist-dodge-scale.js';

assert.equal(LUGARU_DODGE_DISTANCE_SCALE,1.5);
assert.deepEqual(scaledLugaruDodgeDelta({x:2,z:-4}),{x:3,z:-6});

const enemy={_lugaruDuelist:true,_lugaruEvading:true,x:0,z:0,radius:1,collisionScale:1};
const system={heightScale:1,enemies:[enemy],update(){enemy.x+=2;enemy.z+=1;enemy._lugaruEvading=false;}};
installLugaruDuelistDodgeScale(system,{arenaRadius:50});
system.update(.016,{});
assert.equal(enemy.x,3);
assert.equal(enemy.z,1.5);

const normal={_lugaruDuelist:true,_lugaruEvading:false,x:0,z:0,radius:1,collisionScale:1};
const normalSystem={heightScale:1,enemies:[normal],update(){normal.x+=2;}};
installLugaruDuelistDodgeScale(normalSystem,{arenaRadius:50});
normalSystem.update(.016,{});
assert.equal(normal.x,2);

let collisionCalled=false;
const colliding={_lugaruDuelist:true,_lugaruEvading:true,x:0,z:0,radius:1,collisionScale:1};
const collisionSystem={heightScale:1,enemies:[colliding],update(){colliding.x+=2;}};
installLugaruDuelistDodgeScale(collisionSystem,{navigation:{resolveMovement(origin,delta){collisionCalled=true;return{x:origin.x+delta.x*.5,z:origin.z+delta.z*.5};}}});
collisionSystem.update(.016,{});
assert.equal(collisionCalled,true);
assert.equal(colliding.x,2.5);
console.log('Lugaru dodge-distance tests passed.');
