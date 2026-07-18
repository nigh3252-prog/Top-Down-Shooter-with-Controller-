import assert from 'node:assert/strict';
import { createMagicFluidField } from '../src/magic-fluid-sim.js';
import { ORANGE_DASH_MAGIC, createOrangeDashJet, emberPaletteRGBA } from '../src/magic-brush-presets.js';

const backward=createOrangeDashJet({position:{x:2,z:3},dashDirection:{x:0,z:-1}});
assert.deepEqual(backward.origin,{x:2,z:3});
assert.deepEqual(backward.direction,{x:0,z:1},'backward dash should vent magic forward');
assert.equal(backward.school,'orange');
assert.ok(backward.radius>=1.5,'orange jet source should remain substantially broader than the first pass');
assert.ok(backward.length<=.8,'the moving jet should inject locally instead of pre-painting a long hard-edged beam');
assert.equal(ORANGE_DASH_MAGIC.visualLayers,4,'one 2D simulation should render through four stacked voxel layers');
assert.ok(ORANGE_DASH_MAGIC.patchDepth*.5>8.4+backward.length+1,'one enlarged patch should cover the full dash and jet without a seam');

const sideways=createOrangeDashJet({position:{x:0,z:0},dashDirection:{x:1,z:0}});
assert.deepEqual(sideways.direction,{x:-1,z:0},'right dash should vent magic left');

const orange=emberPaletteRGBA(.3,.18);
assert.ok(orange[0]>.9&&orange[1]>.35&&orange[1]<.55&&orange[2]<.15,'mid-energy material should use the uploaded ember-orange range');

const field=createMagicFluidField({centerX:0,centerZ:0});
assert.equal(field.state.active,false,'empty field should sleep and render nothing');
field.rebuildSolids([]);
assert.equal(field.injectBurst(backward),true);
assert.equal(field.state.active,true,'a dash jet should wake the field');
assert.ok(field.sampleWorld(field.dye,2,3)>0,'the renderer should be able to sample the 2D field at the character source');
const initial=field.materialCentroid();
assert.ok(initial.z>backward.origin.z,'jet material should be painted in the thrust direction');
for(let i=0;i<12;i++)field.update(1/30);
const moved=field.materialCentroid();
assert.ok(moved.z>=initial.z-.2,'fluid should retain forward-biased momentum after injection');

const streamed=createMagicFluidField({centerX:0,centerZ:0});
streamed.rebuildSolids([]);
for(let z=2.5;z>=-2.5;z-=ORANGE_DASH_MAGIC.jetSpacing){
  streamed.injectBurst(createOrangeDashJet({position:{x:0,z},dashDirection:{x:0,z:-1}}));
}
assert.ok(streamed.materialCentroid().total>initial.total*3,'repeated local source injections should form a sustained jet rather than one launch puff');

const walled=createMagicFluidField({centerX:0,centerZ:0});
walled.rebuildSolids([{a:{x:0,z:-5},b:{x:0,z:5}}]);
assert.ok(walled.solid.some(value=>value===1),'maze segments should rasterize into the 2D solid mask');
walled.injectBurst({origin:{x:-1,z:0},direction:{x:1,z:0},length:.7,radius:1.5,steps:3,push:.52,material:.3,heat:.4});
for(let i=0;i<walled.dye.length;i++)if(walled.solid[i])assert.equal(walled.dye[i],0,'solid cells should never retain magic material');

for(let i=0;i<360&&field.state.active;i++)field.update(1/30);
assert.equal(field.state.active,false,'an exhausted field should return to sleep');
assert.equal(field.materialCentroid().total,0,'sleeping clears stale material');

console.log('magic fluid simulation tests passed');
