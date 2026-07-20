// Lifecycle shell for the magic-jet dash effect. Observes the basic dash
// runtime's state (no changes to basic-dash.js): while a dash is active the
// player's displacement drives a virtual drag brush through the fluid patch,
// the post-dash lock keeps a tapering wake, then the fade ramp kills the trail
// and the whole effect goes fully idle until the next dash.
import {
  DASH_JET_SETTINGS,
  DASH_JET_LIFECYCLE,
  buildDashJetLayout,
  buildDashJetSamples,
} from './dash-magic-jet-config.js';
import { createDashJetSimulation } from './dash-magic-jet-sim.js';
import { createDashJetRenderer } from './dash-magic-jet-render.js';
import { configuredHexSize } from './maze-runtime-settings.js';

export function installDashMagicJet({
  THREE,
  scene,
  getDashState,
  getMazeSegments = () => [],
  getRoomKey = () => null,
  getInterrupted = () => false,
} = {}){
  if(!THREE || !scene) throw new Error('[dash-magic-jet] THREE and scene are required.');
  if(typeof getDashState !== 'function') throw new Error('[dash-magic-jet] getDashState is required.');

  const settings = () => DASH_JET_SETTINGS;
  // The zone spans a 2-hex-cell radius around the dash, derived from the same
  // configured cell size the arena maze uses (20 is the arena's requested
  // HEX_SIZE; the runtime setting overrides it in combat-arena).
  const layout = buildDashJetLayout(configuredHexSize(20));
  const sim = createDashJetSimulation({ settings, layout, getMazeSegments });
  const renderer = createDashJetRenderer({ THREE, scene, settings, layout, sim });

  let phase = 'idle'; // idle | dashing | post | fading
  let lastRoomKey = getRoomKey?.() ?? null;
  let lastInjected = null;
  let fadeElapsed = 0;
  let sinceDashEnd = 0;
  let simAccumulator = 0;

  const localPoint = point => ({
    x: (Number(point?.x) || 0) - sim.centerX,
    z: (Number(point?.z) || 0) - sim.centerZ,
  });

  function dashFits(position, direction){
    const start = localPoint(position);
    const reach = DASH_JET_LIFECYCLE.dashDistance;
    const end = {
      x: start.x + (Number(direction?.x) || 0) * reach,
      z: start.z + (Number(direction?.z) || 0) * reach,
    };
    const margin = DASH_JET_LIFECYCLE.patchMargin;
    return Math.abs(start.x) < sim.PATCH_W * .5 - margin
      && Math.abs(start.z) < sim.PATCH_D * .5 - margin
      && Math.abs(end.x) < sim.PATCH_W * .5 - margin
      && Math.abs(end.z) < sim.PATCH_D * .5 - margin;
  }

  function beginJet(state){
    const position = { x: Number(state.position?.x) || 0, z: Number(state.position?.z) || 0 };
    const direction = { x: Number(state.direction?.x) || 0, z: Number(state.direction?.z) || -1 };
    if(phase === 'idle' || !dashFits(position, direction)){
      const centerX = position.x + direction.x * DASH_JET_LIFECYCLE.dashDistance * .5;
      const centerZ = position.z + direction.z * DASH_JET_LIFECYCLE.dashDistance * .5;
      sim.setCenter(centerX, centerZ);
      renderer.setCenter(centerX, centerZ);
    }
    DASH_JET_SETTINGS.fade = DASH_JET_SETTINGS.fadeDash;
    fadeElapsed = 0;
    sinceDashEnd = 0;
    phase = 'dashing';
    lastInjected = position;
    renderer.setVisible(true);
    const local = localPoint(position);
    sim.injectWorld(local.x, local.z, 0, 0, 1);
  }

  function injectAlong(state, pressureValue){
    const to = { x: Number(state.position?.x) || 0, z: Number(state.position?.z) || 0 };
    if(!lastInjected){ lastInjected = to; return; }
    if(Math.hypot(to.x - lastInjected.x, to.z - lastInjected.z) < 1e-4) return;
    for(const sample of buildDashJetSamples(lastInjected, to)){
      const local = localPoint(sample);
      sim.injectWorld(local.x, local.z, sample.dx, sample.dz, pressureValue);
    }
    lastInjected = to;
  }

  function clear(){
    phase = 'idle';
    lastInjected = null;
    fadeElapsed = 0;
    sinceDashEnd = 0;
    simAccumulator = 0;
    DASH_JET_SETTINGS.fade = DASH_JET_SETTINGS.fadeDash;
    sim.clearSim();
    renderer.setVisible(false);
  }

  function update(_dt, now, rawDt = _dt){
    const roomKey = getRoomKey?.() ?? null;
    if(lastRoomKey !== null && roomKey !== null && roomKey !== lastRoomKey && phase !== 'idle') clear();
    lastRoomKey = roomKey;
    if(phase !== 'idle' && getInterrupted?.()){ clear(); return; }

    const state = getDashState();
    if(!state) return;

    if(state.active && phase !== 'dashing') beginJet(state);

    if(phase === 'idle') return;

    if(phase === 'dashing'){
      if(state.active){
        injectAlong(state, 1);
      }else if(state.postActive){
        phase = 'post';
      }else{
        phase = 'fading';
      }
    }
    if(phase === 'post'){
      if(state.postActive){
        injectAlong(state, DASH_JET_LIFECYCLE.postDashPressure);
      }else{
        phase = 'fading';
        lastInjected = null;
      }
    }
    if(phase === 'fading'){
      sinceDashEnd += rawDt;
      fadeElapsed += rawDt;
      const t = Math.min(1, fadeElapsed / Math.max(.001, DASH_JET_LIFECYCLE.fadeRampTime));
      DASH_JET_SETTINGS.fade = DASH_JET_SETTINGS.fadeDash
        + (DASH_JET_SETTINGS.fadeOut - DASH_JET_SETTINGS.fadeDash) * t;
      if(sinceDashEnd > DASH_JET_LIFECYCLE.hardTimeout){ clear(); return; }
      if(sim.maxDye() < DASH_JET_LIFECYCLE.killDyeThreshold && sim.strokes.length === 0){
        clear();
        return;
      }
    }

    // The prototype solver advances one step per rendered frame and is tuned
    // for 60Hz; a fixed-step accumulator keeps the same feel on other refresh
    // rates and during hitstop-scaled frames.
    simAccumulator += Math.min(Number(rawDt) || 0, .05);
    const stepLength = 1 / DASH_JET_LIFECYCLE.simHz;
    let steps = 0;
    while(simAccumulator >= stepLength && steps < DASH_JET_LIFECYCLE.maxStepsPerFrame){
      sim.updateSim();
      steps++;
      simAccumulator -= stepLength;
    }
    if(simAccumulator >= stepLength) simAccumulator = stepLength; // drop backlog beyond the cap

    renderer.update(Number.isFinite(now) ? now : (globalThis.performance?.now?.() || 0) / 1000);
  }

  function dispose(){
    renderer.dispose();
  }

  const runtime = {
    update,
    clear,
    dispose,
    settings: DASH_JET_SETTINGS,
    layout,
    lifecycle: DASH_JET_LIFECYCLE,
    debug: {
      sim,
      renderer,
      get phase(){ return phase; },
      get active(){ return phase !== 'idle'; },
    },
  };
  if(globalThis.window) globalThis.window.__dashMagicJet = runtime;
  return runtime;
}
