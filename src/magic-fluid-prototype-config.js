// Values copied from threejs_midair_lifted_ground_slice_v1.html's default Duel/Ember setup.
export const PROTOTYPE_MAGIC_SETTINGS=Object.freeze({
  push:1.9,ink:1.45,heat:1.85,curl:2.45,momentum:.984,fade:.989,
  radius:42,layers:4,height:.95,voxelSize:.82,breakup:.38,
  ground:0,glow:2.25,accent:1.8,quality:0,
});

export const PROTOTYPE_MAGIC_LAYOUT=Object.freeze({
  patchWidth:15.5,patchDepth:13.5,maxLayers:6,
  visualColumns:26,visualRows:24,maxStrokes:40,
  simulationColumns:48,simulationRows:42,pressureIterations:4,
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
