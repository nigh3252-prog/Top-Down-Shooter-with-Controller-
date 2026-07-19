import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PROTOTYPE_MAGIC_LAYOUT,PROTOTYPE_MAGIC_SETTINGS,buildDashJetSamples,resolveRenderCamera} from '../src/magic-fluid-runtime.js';

assert.deepEqual(PROTOTYPE_MAGIC_SETTINGS,{
  push:1.9,ink:1.45,heat:1.85,curl:2.45,momentum:.984,fade:.989,
  radius:14,layers:4,height:.95,voxelSize:.52,breakup:.38,
  ground:0,glow:2.25,accent:1.8,quality:0,
  verticalScale:3.25,stackCenter:.95,anchorHeightScale:.25,torsoBias:-.08,
  edgeFadeCells:3,
});
assert.deepEqual(PROTOTYPE_MAGIC_LAYOUT,{
  patchWidth:46.5,patchDepth:40.5,maxLayers:6,
  visualColumns:48,visualRows:42,maxStrokes:40,
  simulationColumns:48,simulationRows:42,pressureIterations:4,
  wallMaskRadius:.78,
});
assert.equal(PROTOTYPE_MAGIC_LAYOUT.patchWidth/15.5,3,'field width should be exactly three times the submitted prototype');
assert.equal(PROTOTYPE_MAGIC_LAYOUT.patchDepth/13.5,3,'field depth should be exactly three times the submitted prototype');
assert.equal(PROTOTYPE_MAGIC_SETTINGS.radius,42/3,'brush percentage should shrink by three to preserve its world-space radius');
assert.equal(PROTOTYPE_MAGIC_SETTINGS.anchorHeightScale,.25,'the whole stack should anchor at one quarter of the measured model-center height');
assert.equal(PROTOTYPE_MAGIC_LAYOUT.visualColumns,PROTOTYPE_MAGIC_LAYOUT.simulationColumns,'expanded field should render every coarse simulation column');
assert.equal(PROTOTYPE_MAGIC_LAYOUT.visualRows,PROTOTYPE_MAGIC_LAYOUT.simulationRows,'expanded field should render every coarse simulation row');
assert.ok(PROTOTYPE_MAGIC_SETTINGS.verticalScale>=3,'voxel layers should be substantially separated vertically for the comparison pass');
assert.ok(PROTOTYPE_MAGIC_SETTINGS.edgeFadeCells>=3,'expanded field should soften its rectangular boundary');
assert.ok(PROTOTYPE_MAGIC_LAYOUT.wallMaskRadius>.7,'coarse field should use a wall mask wider than half a cell');

const rendererSource=readFileSync(new URL('../src/magic-fluid-prototype-render.js',import.meta.url),'utf8');
assert.match(rendererSource,/blending:THREE\.NormalBlending/,'primary cubes should retain normal blending and readable solid faces');
assert.match(rendererSource,/attribute float instanceOpacity/,'cube opacity should be controlled per voxel');
assert.match(rendererSource,/attribute float instanceGlow/,'bright voxels should have per-voxel glow strength');
assert.match(rendererSource,/const glowMesh=new THREE\.InstancedMesh/,'glow should use a cube-shaped instanced shell');
assert.match(rendererSource,/fluidPlane\.material\.opacity=0;fluidGlowPlane\.material\.opacity=0;/,'broad ground sheets should remain disabled');
assert.match(rendererSource,/airPlane\.material\.opacity=0;airGlowPlane\.material\.opacity=0;airHaloPlane\.material\.opacity=0;/,'broad lifted sheets should remain disabled');

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

console.log('glowing age-faded cube-layer magic tests passed');
