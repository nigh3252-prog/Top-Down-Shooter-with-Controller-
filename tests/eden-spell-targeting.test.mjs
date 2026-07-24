import test from 'node:test';
import assert from 'node:assert/strict';
import { assistedDirection, clampGroundTarget, selectSoftTarget } from '../src/eden-spell-targeting.js';

test('soft target stays inside the forward cone',()=>{
  const front={x:0,z:-8,hp:10,radius:1};
  const side={x:8,z:0,hp:10,radius:1};
  assert.equal(selectSoftTarget({enemies:[side,front],origin:{x:0,z:0},aim:{x:0,z:-1},maxRange:14,coneDegrees:38}),front);
});

test('angular alignment is preferred over a closer off-axis target',()=>{
  const aligned={x:0,z:-10,hp:10,radius:1};
  const closer={x:2.2,z:-5,hp:10,radius:1};
  assert.equal(selectSoftTarget({enemies:[closer,aligned],origin:{x:0,z:0},aim:{x:0,z:-1},maxRange:14,coneDegrees:38}),aligned);
});

test('partial assist does not become a hard lock',()=>{
  const direction=assistedDirection({origin:{x:0,z:0},rawDirection:{x:0,z:-1},target:{x:5,z:-8,hp:10},strength:.35,maxCorrectionDegrees:12});
  const angle=Math.abs(Math.atan2(direction.x,-direction.z))*180/Math.PI;
  assert.ok(angle>0);
  assert.ok(angle<=4.21);
});

test('ground target is clamped to maximum range',()=>{
  assert.deepEqual(clampGroundTarget({origin:{x:0,z:0},target:{x:30,z:0},maxRange:13,minRange:1.5}),{x:13,z:0});
});

test('ground target keeps a minimum distance',()=>{
  const point=clampGroundTarget({origin:{x:0,z:0},target:{x:.1,z:0},maxRange:13,minRange:1.5});
  assert.equal(point.x,1.5);
  assert.equal(point.z,0);
});
