// Base values come from threejs_midair_lifted_ground_slice_v1.html's Duel/Ember setup.
// The game integration deliberately expands the world-space canvas while preserving
// the submitted 48 x 42 solver so large magic can span several maze cells.
export const PROTOTYPE_MAGIC_SETTINGS=Object.freeze({
  push:1.9,ink:1.45,heat:1.85,curl:2.45,momentum:.984,fade:.989,
  // The physical field is 3x larger, so one-third of the prototype percentage keeps
  // the dash brush approximately the same world-space diameter.
  radius:14,layers:4,height:.95,voxelSize:.52,breakup:.38,
  ground:0,glow:2.25,accent:1.8,quality:0,
  // Remap the prototype's absolute heights around the Warden's measured model center.
  verticalScale:2,stackCenter:.95,torsoBias:-.08,
  // Only affects the outer three coarse cells, preventing a rectangular cutoff.
  edgeFadeCells:3,
});

export const PROTOTYPE_MAGIC_LAYOUT=Object.freeze({
  patchWidth:46.5,patchDepth:40.5,maxLayers:6,
  // Sample every simulation cell. This is heavier than the prototype's 26 x 24
  // display grid, but prevents the smaller source from disappearing between samples.
  visualColumns:48,visualRows:42,maxStrokes:40,
  simulationColumns:48,simulationRows:42,pressureIterations:4,
  // The enlarged cells are roughly one world unit wide; this keeps maze walls from
  // falling between coarse cell centers and leaking fluid.
  wallMaskRadius:.78,
});

// Integration adapter: reproduce the prototype's dragMove subdivision, but point
// each virtual brush motion opposite the player's displacement so it reads as thrust.
export function buildDashJetSamples(from,to){
  const dx=(Number(to?.x)||0)-(Number(from?.x)||0);
  const dz=(Number(to?.z)||0)-(Number(from?.z)||0);
  const distance=Math.hypot(dx,dz);
  const steps=Math.max(1,Math.ceil(distance/.25));
  const samples=[];
  for(let step=1;step<=steps;step++){
    const t=step/steps;
    const characterX=(Number(from?.x)||0)+dx*t;
    const characterZ=(Number(from?.z)||0)+dz*t;
    const jetDx=-dx/steps;
    const jetDz=-dz/steps;
    samples.push({x:characterX+jetDx*1.8,z:characterZ+jetDz*1.8,dx:jetDx,dz:jetDz});
  }
  return samples;
}
