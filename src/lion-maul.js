const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const DEFAULT_LION_MAUL_PRESET = 'triple';

export const LION_MAUL_PRESETS = Object.freeze({
  quick: Object.freeze({
    id:'quick',
    label:'Quick Snap',
    biteCount:2,
    biteDamage:4,
    biteInterval:.22,
    firstBiteDelay:.16,
    stunDuration:.72,
    recovery:.55,
    interruptOnStagger:true,
  }),
  triple: Object.freeze({
    id:'triple',
    label:'Triple Maul',
    biteCount:3,
    biteDamage:4,
    biteInterval:.28,
    firstBiteDelay:.20,
    stunDuration:1.05,
    recovery:.75,
    interruptOnStagger:true,
  }),
  apex: Object.freeze({
    id:'apex',
    label:'Apex Frenzy',
    biteCount:4,
    biteDamage:5,
    biteInterval:.24,
    firstBiteDelay:.16,
    stunDuration:1.22,
    recovery:.95,
    interruptOnStagger:true,
  }),
});

export function normalizeLionMaulSettings(settings = {}) {
  const fallback = LION_MAUL_PRESETS[DEFAULT_LION_MAUL_PRESET];
  const biteCount = clamp(Math.round(Number(settings.biteCount) || fallback.biteCount), 1, 6);
  const biteInterval = clamp(Number(settings.biteInterval) || fallback.biteInterval, .12, .7);
  const firstBiteDelay = clamp(Number(settings.firstBiteDelay) || fallback.firstBiteDelay, .08, .65);
  const minimumDuration = firstBiteDelay + Math.max(0, biteCount - 1) * biteInterval + .16;
  return {
    biteCount,
    biteDamage:clamp(Math.round(Number(settings.biteDamage) || fallback.biteDamage), 1, 20),
    biteInterval,
    firstBiteDelay,
    stunDuration:clamp(Math.max(Number(settings.stunDuration) || fallback.stunDuration, minimumDuration), .35, 3),
    recovery:clamp(Number(settings.recovery) || fallback.recovery, .2, 2.5),
    interruptOnStagger:settings.interruptOnStagger === undefined
      ? fallback.interruptOnStagger
      : !!settings.interruptOnStagger,
  };
}

export function lionMaulPreset(id = DEFAULT_LION_MAUL_PRESET) {
  const preset = LION_MAUL_PRESETS[id] || LION_MAUL_PRESETS[DEFAULT_LION_MAUL_PRESET];
  return normalizeLionMaulSettings(preset);
}

export function createLionMaulSequence(settings = {}) {
  const config = normalizeLionMaulSettings(settings);
  let elapsed = 0;
  let scheduledBites = 0;
  let pendingBites = 0;
  let complete = false;

  function advance(dt) {
    if (complete) return snapshot();
    elapsed += Math.max(0, Number(dt) || 0);
    while (scheduledBites < config.biteCount) {
      const biteAt = config.firstBiteDelay + scheduledBites * config.biteInterval;
      if (elapsed + 1e-9 < biteAt) break;
      scheduledBites++;
      pendingBites++;
    }
    if (scheduledBites >= config.biteCount && pendingBites <= 0 && elapsed >= config.stunDuration) complete = true;
    return snapshot();
  }

  function consumeBite() {
    if (pendingBites <= 0 || complete) return null;
    const index = scheduledBites - pendingBites;
    pendingBites--;
    if (scheduledBites >= config.biteCount && pendingBites <= 0 && elapsed >= config.stunDuration) complete = true;
    return index;
  }

  function biteVisualProgress() {
    const nearest = Math.round((elapsed - config.firstBiteDelay) / config.biteInterval);
    const index = clamp(nearest, 0, config.biteCount - 1);
    const biteAt = config.firstBiteDelay + index * config.biteInterval;
    const start = biteAt - config.biteInterval * .72;
    const span = Math.max(.08, config.biteInterval * .92);
    return clamp((elapsed - start) / span, 0, 1);
  }

  function snapshot() {
    return {
      elapsed,
      scheduledBites,
      pendingBites,
      complete,
      remaining:Math.max(0, config.stunDuration - elapsed),
      visualProgress:biteVisualProgress(),
      config:{ ...config },
    };
  }

  return { advance, consumeBite, snapshot, get config(){ return { ...config }; } };
}
