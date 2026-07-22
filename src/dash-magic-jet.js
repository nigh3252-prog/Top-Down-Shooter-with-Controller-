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
import {
  detectDashJetQuality,
  effectiveDashJetGrainScale,
} from './dash-magic-jet-performance.js';

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
  const quality = detectDashJetQuality(globalThis);

  // Saved Lab-slider overrides apply on top of the tuned defaults.
  const overrides = loadDashJetOverrides();
  for(const [key, value] of Object.entries(overrides))
    if(key in DASH_JET_SETTING_DEFAULTS) DASH_JET_SETTINGS[key] = value;
  DASH_JET_SETTINGS.fade = DASH_JET_SETTINGS.fadeDash;
  let zoneScale = clampZoneScale(overrides.zoneScale ?? 1);
  let grainScale = clampGrainScale(overrides.grainScale ?? 1);
  let effectiveGrainScale = effectiveDashJetGrainScale(grainScale, quality);

  // Phones default to a balanced grid. ?dashQuality=high restores the exact
  // prototype density; ?dashQuality=low is available for direct A/B testing.
  let layout, sim, renderer;
  function buildStack(){
    effectiveGrainScale = effectiveDashJetGrainScale(grainScale, quality);
    layout = buildDashJetLayout(zoneScale, effectiveGrainScale);
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
  let renderAccumulator = 0;
  let killCheckAccumulator = 0;
  let justStarted = false;
  let idlePrewarmHandle = null;
  let idlePrewarmKind = null;
  let prewarmedRoomKey = null;
  let prewarmCenter = null;
  let maskPrepared = false;

  const performanceStats = {
    quality:quality.id,
    simHz:quality.simHz,
    renderHz:quality.renderHz,
    effectiveGrainScale,
    prewarms:0,
    simulationSteps:0,
    visualUpdates:0,
    deferredStarts:0,
    get layout(){ return layout; },
  };

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

  function cancelIdlePrewarm(){
    if(idlePrewarmHandle === null) return;
    if(idlePrewarmKind === 'idle') globalThis.cancelIdleCallback?.(idlePrewarmHandle);
    else globalThis.clearTimeout?.(idlePrewarmHandle);
    idlePrewarmHandle = null;
    idlePrewarmKind = null;
  }

  function idleDashOrigin(state){
    const position = state?.lastStablePosition || state?.position;
    if(!position) return null;
    const direction = state?.lastForward || state?.direction || { x:0, z:1 };
    return {
      position:{ x:Number(position.x) || 0, z:Number(position.z) || 0 },
      direction:{ x:Number(direction.x) || 0, z:Number(direction.z) || 1 },
    };
  }

  function scheduleIdlePrewarm(state, roomKey){
    if(idlePrewarmHandle !== null || phase !== 'idle') return;
    const origin = idleDashOrigin(state);
    if(!origin || (maskPrepared && dashFits(origin.position, origin.direction))) return;
    const desiredX = origin.position.x + origin.direction.x * DASH_JET_LIFECYCLE.dashDistance * .5;
    const desiredZ = origin.position.z + origin.direction.z * DASH_JET_LIFECYCLE.dashDistance * .5;

    const run = () => {
      idlePrewarmHandle = null;
      idlePrewarmKind = null;
      if(phase !== 'idle' || (getRoomKey?.() ?? null) !== roomKey) return;
      sim.setCenter(desiredX, desiredZ);
      maskPrepared = true;
      renderer.setCenter(sim.centerX, sim.centerZ);
      prewarmedRoomKey = roomKey;
      prewarmCenter = { x:sim.centerX, z:sim.centerZ };
      performanceStats.prewarms++;
    };

    if(typeof globalThis.requestIdleCallback === 'function'){
      idlePrewarmKind = 'idle';
      idlePrewarmHandle = globalThis.requestIdleCallback(run, { timeout:500 });
    }else{
      idlePrewarmKind = 'timeout';
      idlePrewarmHandle = globalThis.setTimeout?.(run, 120) ?? null;
    }
  }

  function beginJet(state){
    cancelIdlePrewarm();
    const position = { x: Number(state.position?.x) || 0, z: Number(state.position?.z) || 0 };
    const direction = { x: Number(state.direction?.x) || 0, z: Number(state.direction?.z) || -1 };
    const desiredX = position.x + direction.x * DASH_JET_LIFECYCLE.dashDistance * .5;
    const desiredZ = position.z + direction.z * DASH_JET_LIFECYCLE.dashDistance * .5;
    if(phase === 'idle'){
      // The idle prewarm normally makes this a no-op. Fall back to the old
      // synchronous rebuild only when the player moved beyond the prepared patch.
      if(!maskPrepared || !dashFits(position, direction)){
        sim.setCenter(desiredX, desiredZ);
        maskPrepared = true;
      }
    }else if(!dashFits(position, direction)){
      // Shift the live field instead of clearing it so a chained dash never
      // visibly wipes the previous trail.
      sim.moveCenter(desiredX, desiredZ);
      maskPrepared = true;
    }
    renderer.setCenter(sim.centerX, sim.centerZ);
    DASH_JET_SETTINGS.fade = DASH_JET_SETTINGS.fadeDash;
    fadeElapsed = 0;
    sinceDashEnd = 0;
    killCheckAccumulator = 0;
    phase = 'dashing';
    lastInjected = position;
    justStarted = true;
    renderAccumulator = 1 / Math.max(1, quality.renderHz);
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
    renderAccumulator = 0;
    killCheckAccumulator = 0;
    justStarted = false;
    DASH_JET_SETTINGS.fade = DASH_JET_SETTINGS.fadeDash;
    sim.clearSim();
    renderer.setVisible(false);
  }

  function update(_dt, now, rawDt = _dt){
    const roomKey = getRoomKey?.() ?? null;
    if(lastRoomKey !== null && roomKey !== null && roomKey !== lastRoomKey){
      cancelIdlePrewarm();
      prewarmedRoomKey = null;
      prewarmCenter = null;
      maskPrepared = false;
      if(phase !== 'idle') clear();
    }
    lastRoomKey = roomKey;
    if(phase !== 'idle' && getInterrupted?.()){ clear(); return; }

    const state = getDashState();
    if(!state) return;

    if(state.active && phase !== 'dashing') beginJet(state);

    if(phase === 'idle'){
      scheduleIdlePrewarm(state, roomKey);
      return;
    }

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
      killCheckAccumulator += rawDt;
      const t = Math.min(1, fadeElapsed / Math.max(.001, DASH_JET_LIFECYCLE.fadeRampTime));
      DASH_JET_SETTINGS.fade = DASH_JET_SETTINGS.fadeDash
        + (DASH_JET_SETTINGS.fadeOut - DASH_JET_SETTINGS.fadeDash) * t;
      if(sinceDashEnd > DASH_JET_LIFECYCLE.hardTimeout){ clear(); return; }
      if(killCheckAccumulator >= .1){
        killCheckAccumulator = 0;
        if(sim.maxDye() < DASH_JET_LIFECYCLE.killDyeThreshold && sim.strokes.length === 0){
          clear();
          return;
        }
      }
    }

    simAccumulator += Math.min(Number(rawDt) || 0, .05);
    const stepLength = 1 / Math.max(1, quality.simHz);
    let steps = 0;
    while(simAccumulator >= stepLength && steps < quality.maxStepsPerFrame){
      sim.updateSim();
      steps++;
      performanceStats.simulationSteps++;
      simAccumulator -= stepLength;
    }
    if(simAccumulator >= stepLength) simAccumulator = stepLength;

    // Let the movement frame land before the first full texture/instance upload.
    // The effect appears one rendered frame later, which is effectively invisible
    // but prevents the dash start and the largest visual update sharing a frame.
    if(justStarted){
      justStarted = false;
      performanceStats.deferredStarts++;
      return;
    }

    renderAccumulator += Math.min(Number(rawDt) || 0, .05);
    const renderLength = 1 / Math.max(1, quality.renderHz);
    if(renderAccumulator >= renderLength){
      renderAccumulator %= renderLength;
      renderer.update(Number.isFinite(now) ? now : (globalThis.performance?.now?.() || 0) / 1000);
      performanceStats.visualUpdates++;
    }
  }

  function dispose(){
    cancelIdlePrewarm();
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
    maskPrepared = false;
    return zoneScale;
  }

  function setGrainScale(scale){
    const next = clampGrainScale(scale);
    if(Math.abs(next - grainScale) < 1e-6) return grainScale;
    grainScale = next;
    clear();
    renderer.dispose();
    buildStack();
    maskPrepared = false;
    performanceStats.effectiveGrainScale = effectiveGrainScale;
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
    get effectiveGrainScale(){ return effectiveGrainScale; },
    quality,
    performanceStats,
    settings: DASH_JET_SETTINGS,
    get layout(){ return layout; },
    lifecycle: DASH_JET_LIFECYCLE,
    debug: {
      get sim(){ return sim; },
      get renderer(){ return renderer; },
      get phase(){ return phase; },
      get active(){ return phase !== 'idle'; },
      get prewarmedRoomKey(){ return prewarmedRoomKey; },
      get prewarmCenter(){ return prewarmCenter; },
    },
  };
  if(globalThis.window) globalThis.window.__dashMagicJet = runtime;
  return runtime;
}
