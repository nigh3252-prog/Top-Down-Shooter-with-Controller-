import assert from 'node:assert/strict';
import {
  DASH_JET_SETTINGS,
  DASH_JET_LAYOUT,
  DASH_JET_LIFECYCLE,
  buildDashJetSamples,
} from '../src/dash-magic-jet-config.js';
import { createDashJetSimulation } from '../src/dash-magic-jet-sim.js';

function makeSim({ segments=[] }={}){
  return createDashJetSimulation({
    settings: () => DASH_JET_SETTINGS,
    layout: DASH_JET_LAYOUT,
    getMazeSegments: () => segments,
  });
}

function dyeNear(sim, wx, wz){
  const gx=(wx/sim.PATCH_W+.5)*sim.simW;
  const gz=(wz/sim.PATCH_D+.5)*sim.simH;
  return sim.sample(sim.dye, gx, gz);
}

// --- buildDashJetSamples ---
{
  const from={ x:0, z:0 }, to={ x:0, z:-2 };
  const samples=buildDashJetSamples(from, to);
  assert.equal(samples.length, Math.ceil(2/.25), 'displacement subdivides into ~0.25-unit steps');
  for(const sample of samples){
    assert.ok(Math.abs(sample.dx) < 1e-9, 'straight -z dash has no x velocity');
    assert.ok(sample.dz > 0, 'jet velocity points opposite the displacement');
    assert.ok(Math.abs(Math.hypot(sample.dx, sample.dz) - .25) < 1e-9, 'per-sample speed matches the step length');
  }
  const last=samples[samples.length-1];
  assert.ok(Math.abs(last.z - (to.z + .25*DASH_JET_LIFECYCLE.jetTrailOffset)) < 1e-9,
    'samples sit behind the character by the jet trail offset');
}

// --- injection raises dye/heat near the brush ---
{
  const sim=makeSim();
  sim.injectWorld(0, 0, 0, -.25, 1);
  assert.ok(dyeNear(sim, 0, 0) > .05, 'dye appears at the injection point');
  assert.ok(sim.maxDye() > .05, 'maxDye sees the injected mass');
  let heatMax=0;
  for(let i=0;i<sim.N;i++) heatMax=Math.max(heatMax, sim.heat[i]);
  assert.ok(heatMax > .05, 'heat appears at the injection point');
  assert.equal(sim.strokes.length, 1, 'fast brush motion spawns an accent stroke');
  sim.injectWorld(sim.PATCH_W, 0, 0, -.25, 1);
  assert.ok(dyeNear(sim, sim.PATCH_W*.5, 0) < 1e-6, 'injection outside the patch is ignored');
}

// --- updateSim advects mass along the injection velocity and fades it ---
{
  const sim=makeSim();
  sim.injectWorld(0, 0, 0, .5, 1);
  const before=sim.maxDye();
  // Probe just beyond the injection brush (radius ~3.8 grid cells), scaled to
  // world units so the test holds for any patch size.
  const probeZ=5.5*(sim.PATCH_D/sim.simH);
  const upstream0=dyeNear(sim, 0, probeZ);
  for(let i=0;i<12;i++) sim.updateSim();
  assert.ok(dyeNear(sim, 0, probeZ) > upstream0, 'dye advects downstream (+z) of the jet');
  assert.ok(sim.maxDye() < before, 'fade decays the dye peak');
}

// --- fadeOut kills the trail within a bounded number of steps ---
{
  const sim=makeSim();
  for(let i=0;i<10;i++) sim.injectWorld(0, -i*.25, 0, -.25, 1);
  const originalFade=DASH_JET_SETTINGS.fade;
  DASH_JET_SETTINGS.fade=DASH_JET_SETTINGS.fadeOut;
  let steps=0;
  while(sim.maxDye() >= DASH_JET_LIFECYCLE.killDyeThreshold && steps < 400){
    sim.updateSim();
    steps++;
  }
  DASH_JET_SETTINGS.fade=originalFade;
  assert.ok(steps < 400, `dye drops below killDyeThreshold at fadeOut (took ${steps} steps)`);
  assert.ok(sim.maxDye() < DASH_JET_LIFECYCLE.killDyeThreshold);
}

// --- setCenter clears fields and rebuilds the solid mask from segments ---
{
  // Outside the patch when centered at origin (half-span ~41.5 + mask radius),
  // inside once the patch re-centers at x=20.
  const nearWall={ a:{ x:50, z:-2 }, b:{ x:54, z:2 } };
  const farWall={ a:{ x:400, z:400 }, b:{ x:404, z:404 } };
  const sim=makeSim({ segments:[nearWall, farWall] });
  let solidCount=0;
  for(let i=0;i<sim.N;i++) solidCount+=sim.solid[i];
  assert.equal(solidCount, 0, 'no solids while both walls are outside the patch');

  sim.injectWorld(0, 0, 0, -.25, 1);
  assert.ok(sim.maxDye() > 0);
  sim.setCenter(20, 0);
  assert.equal(sim.maxDye(), 0, 'setCenter clears the dye field');
  assert.equal(sim.strokes.length, 0, 'setCenter clears strokes');
  solidCount=0;
  for(let i=0;i<sim.N;i++) solidCount+=sim.solid[i];
  assert.ok(solidCount > 0, 'wall inside the re-centered patch masks solid cells');

  // A solid cell exists near the wall midpoint (52,0) in the re-centered grid.
  const gx=Math.floor(((52-20)/sim.PATCH_W+.5)*sim.simW);
  const gz=Math.floor((0/sim.PATCH_D+.5)*sim.simH);
  let nearWallSolid=0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)
    nearWallSolid+=sim.solid[sim.idx(gx+dx, gz+dy)];
  assert.ok(nearWallSolid > 0, 'solid cells sit on the wall segment');
}

console.log('dash-magic-jet tests passed');
