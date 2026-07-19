import assert from 'node:assert/strict';
import {PROTOTYPE_MAGIC_LAYOUT,PROTOTYPE_MAGIC_SETTINGS,buildDashJetSamples,resolveRenderCamera} from '../src/magic-fluid-runtime.js';

assert.deepEqual(PROTOTYPE_MAGIC_SETTINGS,{
  push:1.9,ink:1.45,heat:1.85,curl:2.45,momentum:.984,fade:.989,
  radius:42,layers:4,height:.95,voxelSize:.82,breakup:.38,
  ground:0,glow:2.25,accent:1.8,quality:0,
});
assert.deepEqual(PROTOTYPE_MAGIC_LAYOUT,{
  patchWidth:15.5,patchDepth:13.5,maxLayers:6,
  visualColumns:26,visualRows:24,maxStrokes:40,
  simulationColumns:48,simulationRows:42,pressureIterations:4,
});

const backward=buildDashJetSamples({x:0,z:0},{x:0,z:-1});
assert.equal(backward.length,4,'one world unit should use the prototype drag spacing of 0.25');
assert.ok(backward.every(sample=>sample.dz>0),'backward player movement should inject forward jet velocity');

const right=buildDashJetSamples({x:0,z:0},{x:1,z:0});
assert.ok(right.every(sample=>sample.dx<0),'rightward player movement should inject magic to the left');

class MockObject3D{
  constructor(){this.quaternion={proxy:true};this.position={set:(x,y,z)=>{this.positionValue={x,y,z};}};}
  lookAt(x,y,z){this.lookAtValue={x,y,z};}
}
const originalWarn=console.warn;
console.warn=()=>{};
const fallbackCamera=resolveRenderCamera({Object3D:MockObject3D},null);
console.warn=originalWarn;
assert.deepEqual(fallbackCamera.positionValue,{x:0,y:20,z:17.6},'missing camera should use the combat-arena relative camera position');
assert.deepEqual(fallbackCamera.lookAtValue,{x:0,y:1.8,z:-1.4},'fallback billboard angle should match the combat-arena look target');
const realCamera={quaternion:{real:true}};
assert.equal(resolveRenderCamera({},realCamera),realCamera,'a supplied game camera must be used unchanged');

console.log('direct prototype magic port tests passed');
