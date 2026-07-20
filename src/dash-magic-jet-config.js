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
  ink: .6,
  heat: .4,
  curl: 2.45,
  momentum: .984,
  // `fade` is the live value the solver reads; the runtime ramps it from
  // fadeDash toward fadeOut after the dash so the trail dies in about a second
  // instead of the prototype's multi-second linger.
  fade: .989,
  fadeDash: .989,
  fadeOut: .965,
  // Brush radius as a percent of the sim grid (prototype semantics). 16 keeps
  // the injected trail ~2.5 world units wide on the 2-hex-radius patch; the
  // old 42 was tuned for the much smaller prototype patch.
  radius: 16,
  layers: 4,
  height: .95,
  voxelSize: .82,
  breakup: .5,
  // World-Y the voxel stack starts at. Lifts the plume so it emits from the
  // middle of the puppet instead of its feet — the same band other magical
  // effects should emit from.
  baseLift: 1.0,
  // Multiplies the per-layer vertical step so the layer separation stays
  // readable now that the blocks are twice the size.
  layerSpread: 2,
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
  voxelGain: .12,
  // Opacity of the dark understain plane drawn beneath the trail. It locally
  // recreates the prototype's dark background so the additive glow keeps its
  // color instead of washing out on bright ground. 0 disables it.
  groundStain: 1,
};

// The effect zone is defined in maze terms: a square patch spanning a radius
// of `hexRadius` hex cells (center-to-center spacings) around the dash. Sim
// and visual resolution scale with the span (within caps) so grid cells and
// voxel blocks stay near their tuned world size whatever the maze cell size.
export function buildDashJetLayout(hexSize = 12, hexRadius = 2){
  const spacing = Math.sqrt(3) * hexSize;
  const span = spacing * hexRadius * 2;
  const even = value => Math.round(value / 2) * 2;
  const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
  const simCells = clamp(even(span / 1.3), 48, 72);
  const visCells = clamp(even(span / 2.1), 26, 40);
  return Object.freeze({
    patchWidth: span,
    patchDepth: span,
    simulationColumns: simCells,
    simulationRows: simCells,
    pressureIterations: 4,
    visualColumns: visCells,
    visualRows: visCells,
    maxLayers: 6,
    maxStrokes: 40,
    // Coarser sim cells need a wider mask so maze walls can't slip between
    // cell centers.
    wallMaskRadius: Math.max(.45, .55 * span / simCells),
  });
}

export const DASH_JET_LAYOUT = buildDashJetLayout();

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

// Frozen copy of the tuned defaults, taken before any saved overrides are
// applied, so the Lab panel's reset can restore them.
export const DASH_JET_SETTING_DEFAULTS = Object.freeze({ ...DASH_JET_SETTINGS });

// The Lab zone slider scales the 2-hex patch radius between 10% and 100%.
export function clampZoneScale(value){
  const numeric = Number(value);
  if(!Number.isFinite(numeric)) return 1;
  return Math.max(.1, Math.min(1, numeric));
}

// --- Saved tuning overrides (Enemy Lab sliders) ---
export const DASH_JET_STORAGE_KEY = 'dashJet.settings.v1';

export function loadDashJetOverrides(storage = globalThis.localStorage){
  try {
    const raw = storage?.getItem?.(DASH_JET_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if(!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const overrides = {};
    for(const [key, value] of Object.entries(parsed)){
      const numeric = Number(value);
      if(!Number.isFinite(numeric)) continue;
      if(key === 'zoneScale' || key in DASH_JET_SETTING_DEFAULTS) overrides[key] = numeric;
    }
    return overrides;
  } catch { return {}; }
}

export function saveDashJetOverrides(overrides, storage = globalThis.localStorage){
  try {
    if(!overrides || Object.keys(overrides).length === 0) storage?.removeItem?.(DASH_JET_STORAGE_KEY);
    else storage?.setItem?.(DASH_JET_STORAGE_KEY, JSON.stringify(overrides));
    return true;
  } catch { return false; }
}

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
