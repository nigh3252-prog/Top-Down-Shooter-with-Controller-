// Lifecycle shell for the magic-jet dash effect. Observes the basic dash
// runtime's state (no changes to basic-dash.js): while a dash is active the
// player's displacement drives a virtual drag brush through the fluid patch,
// the post-dash lock keeps a tapering wake, then the fade ramp kills the trail
// and the whole effect goes fully idle until the next dash.
import {
  DASH_JET_SETTINGS,
  DASH_JET_SETTING_DEFAULTS,
  DASH_JET_LIFECYCLE,
  DASH_JET_PALETTES,
  buildDashJetLayout,
  buildDashJetSamples,
  clampGrainScale,
  clampZoneScale,
  loadDashJetOverrides,
  saveDashJetOverrides,
} from './dash-magic-jet-config.js';
import { createDashJetSimulation } from './dash-magic-jet-sim.js';
import { createDashJetRenderer } from './dash-magic-jet-render.js';

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

  // Saved Lab-slider overrides apply on top of the tuned defaults.
  const overrides = loadDashJetOverrides();
  for(const [key, value] of Object.entries(overrides))
    if(key in DASH_JET_SETTING_DEFAULTS) DASH_JET_SETTINGS[key] = value;
  DASH_JET_SETTINGS.fade = DASH_JET_SETTINGS.fadeDash;
  let zoneScale = clampZoneScale(overrides.zoneScale ?? 1);
  let grainScale = clampGrainScale(overrides.grainScale ?? 1);

  // The zone is a fixed world-size square and the grain a fixed world cell
  // size, so the effect looks identical in every scene regardless of the
  // maze's cell-size setting; the Lab's Zone Size and Grain Size sliders
  // scale the two independently.
  let layout, sim, renderer;
  function buildStack(){
    layout = buildDashJetLayout(zoneScale, grainScale);
    sim = createDashJetSimulation({ settings, layout, getMazeSegments });
    renderer = createDashJetRenderer({ THREE, scene, settings, layout, sim });
  }
  buildStack();

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
    const desiredX = position.x + direction.x * DASH_JET_LIFECYCLE.dashDistance * .5;
    const desiredZ = position.z + direction.z * DASH_JET_LIFECYCLE.dashDistance * .5;
    if(phase === 'idle'){
      sim.setCenter(desiredX, desiredZ);
    }else if(!dashFits(position, direction)){
      // Shift the live field instead of clearing it so a chained dash never
      // visibly wipes the previous trail.
      sim.moveCenter(desiredX, desiredZ);
    }
    renderer.setCenter(sim.centerX, sim.centerZ);
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

    // Arcana reuse the exact locomotion controller, but own their elemental
    // payload rendering. Keeping the ordinary dodge's cyan fluid jet here
    // would obscure source-lock silhouettes such as Searing Rush and Wave
    // Front, so the jet remains an ordinary-dodge-only effect.
    if(state.source === 'arcana'){
      if(phase !== 'idle') clear();
      return;
    }

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

  // --- Lab tuning API (dash-magic-jet-panel.js drives these) ---
  function saveOverride(key, value){
    overrides[key] = value;
    saveDashJetOverrides(overrides);
  }

  function setZoneScale(scale){
    const next = clampZoneScale(scale);
    if(Math.abs(next - zoneScale) < 1e-6) return zoneScale;
    zoneScale = next;
    clear();
    renderer.dispose();
    buildStack();
    return zoneScale;
  }

  function setGrainScale(scale){
    const next = clampGrainScale(scale);
    if(Math.abs(next - grainScale) < 1e-6) return grainScale;
    grainScale = next;
    clear();
    renderer.dispose();
    buildStack();
    return grainScale;
  }

  function applySetting(key, value){
    if(key === 'zoneScale'){
      const applied = setZoneScale(value);
      saveOverride('zoneScale', applied);
      return applied;
    }
    if(key === 'grainScale'){
      const applied = setGrainScale(value);
      saveOverride('grainScale', applied);
      return applied;
    }
    if(key === 'palette'){
      if(!DASH_JET_PALETTES.includes(value)) return DASH_JET_SETTINGS.palette;
      DASH_JET_SETTINGS.palette = value;
      saveOverride('palette', value);
      return value;
    }
    if(!(key in DASH_JET_SETTING_DEFAULTS)) return undefined;
    const numeric = Number(value);
    if(!Number.isFinite(numeric)) return DASH_JET_SETTINGS[key];
    DASH_JET_SETTINGS[key] = numeric;
    // fade is the live solver value the runtime ramps; keep it in sync when
    // the base fade slider moves outside a fade-out.
    if(key === 'fadeDash' && phase !== 'fading') DASH_JET_SETTINGS.fade = numeric;
    saveOverride(key, numeric);
    return numeric;
  }

  function resetSettings(){
    Object.assign(DASH_JET_SETTINGS, DASH_JET_SETTING_DEFAULTS);
    DASH_JET_SETTINGS.fade = DASH_JET_SETTINGS.fadeDash;
    for(const key of Object.keys(overrides)) delete overrides[key];
    saveDashJetOverrides(overrides);
    setZoneScale(1);
    setGrainScale(1);
  }

  const runtime = {
    update,
    clear,
    dispose,
    applySetting,
    resetSettings,
    setZoneScale,
    setGrainScale,
    get zoneScale(){ return zoneScale; },
    get grainScale(){ return grainScale; },
    settings: DASH_JET_SETTINGS,
    get layout(){ return layout; },
    lifecycle: DASH_JET_LIFECYCLE,
    debug: {
      get sim(){ return sim; },
      get renderer(){ return renderer; },
      get phase(){ return phase; },
      get active(){ return phase !== 'idle'; },
    },
  };
  if(globalThis.window) globalThis.window.__dashMagicJet = runtime;
  return runtime;
}
