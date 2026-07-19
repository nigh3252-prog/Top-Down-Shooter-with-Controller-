// Magic-jet dash effect tuning. All rendering/simulation numbers are the
// "Duel" preset of threejs_midair_lifted_ground_slice_v1.html taken verbatim:
// the prototype's patch scale and camera tilt already match combat-arena, so
// nothing is rescaled — only the patch center moves to follow each dash.
export const DASH_JET_SETTINGS = {
  push: 1.95,
  // ink/heat are well below the Duel preset (1.45/1.85): the prototype ran on
  // a near-black scene where dense white-hot dye looked right, but over the
  // arena's bright ground full density clips the whole trail to white. These
  // values keep the core in the cyan/teal part of the ramp.
  ink: .7,
  heat: .45,
  curl: 2.45,
  momentum: .984,
  // `fade` is the live value the solver reads; the runtime ramps it from
  // fadeDash toward fadeOut after the dash so the trail dies in about a second
  // instead of the prototype's multi-second linger.
  fade: .989,
  fadeDash: .989,
  fadeOut: .965,
  radius: 42,
  layers: 4,
  height: .95,
  voxelSize: .82,
  breakup: .38,
  glow: 2.25,
  accent: 1.8,
  // Multiplies the lifted air-slice plane opacities (1 = prototype look,
  // 0 = voxel cloud only). Kept as a knob because the planes were what made
  // earlier integration attempts read flat under the perspective camera.
  airSheetScale: .12,
  // Multiplies voxel/stroke instance colors. The prototype tuned its additive
  // ramp against a near-black background; over the arena's bright ground the
  // full-gain colors clip to white, so this pulls intensity down until the
  // blue ramp reads.
  voxelGain: .28,
  // Opacity of the dark understain plane drawn beneath the trail. It locally
  // recreates the prototype's dark background so the additive glow keeps its
  // color instead of washing out on bright ground. 0 disables it.
  groundStain: 1,
};

export const DASH_JET_LAYOUT = Object.freeze({
  patchWidth: 15.5,
  patchDepth: 13.5,
  simulationColumns: 48,
  simulationRows: 42,
  pressureIterations: 4,
  visualColumns: 26,
  visualRows: 24,
  maxLayers: 6,
  maxStrokes: 40,
  wallMaskRadius: .45,
});

export const DASH_JET_LIFECYCLE = Object.freeze({
  jetTrailOffset: 1.8,
  postDashPressure: .4,
  fadeRampTime: .4,
  killDyeThreshold: .02,
  hardTimeout: 2.5,
  simHz: 60,
  maxStepsPerFrame: 2,
  dashDistance: 8.4,
  patchMargin: 2.5,
});

// Reproduce the prototype's dragMove subdivision, but point each virtual brush
// motion opposite the player's displacement so the plume reads as thrust wake.
export function buildDashJetSamples(from, to){
  const dx = (Number(to?.x) || 0) - (Number(from?.x) || 0);
  const dz = (Number(to?.z) || 0) - (Number(from?.z) || 0);
  const distance = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(distance / .25));
  const samples = [];
  for(let step = 1; step <= steps; step++){
    const t = step / steps;
    const characterX = (Number(from?.x) || 0) + dx * t;
    const characterZ = (Number(from?.z) || 0) + dz * t;
    const jetDx = -dx / steps;
    const jetDz = -dz / steps;
    samples.push({
      x: characterX + jetDx * DASH_JET_LIFECYCLE.jetTrailOffset,
      z: characterZ + jetDz * DASH_JET_LIFECYCLE.jetTrailOffset,
      dx: jetDx,
      dz: jetDz,
    });
  }
  return samples;
}
