import './lion-maul-presentation.js';
import {
  lionMaulAnimationDuration,
  lionMaulAnimationState,
} from './lion-maul-animation.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const DEFAULT_LION_MAUL_PRESET = 'triple';

export const LION_MAUL_PRESETS = Object.freeze({
  quick: Object.freeze({
    id:'quick',
    label:'Quick Snap',
    biteCount:2,
    biteDamage:4,
    biteInterval:.48,
    firstBiteDelay:.58,
    stunDuration:1.88,
    recovery:.55,
    interruptOnStagger:true,
  }),
  triple: Object.freeze({
    id:'triple',
    label:'Triple Maul',
    biteCount:3,
    biteDamage:4,
    biteInterval:.58,
    firstBiteDelay:.78,
    stunDuration:2.76,
    recovery:.75,
    interruptOnStagger:true,
  }),
  apex: Object.freeze({
    id:'apex',
    label:'Apex Frenzy',
    biteCount:4,
    biteDamage:5,
    biteInterval:.48,
    firstBiteDelay:.68,
    stunDuration:2.94,
    recovery:.95,
    interruptOnStagger:true,
  }),
});

export function normalizeLionMaulSettings(settings = {}) {
  const fallback = LION_MAUL_PRESETS[DEFAULT_LION_MAUL_PRESET];
  const biteCount = clamp(Math.round(Number(settings.biteCount) || fallback.biteCount), 1, 6);
  const biteInterval = clamp(Number(settings.biteInterval) || fallback.biteInterval, .12, 1.2);
  const firstBiteDelay = clamp(Number(settings.firstBiteDelay) || fallback.firstBiteDelay, .08, 1.8);
  const minimumDuration = lionMaulAnimationDuration({ biteCount, biteInterval, firstBiteDelay });
  return {
    biteCount,
    biteDamage:clamp(Math.round(Number(settings.biteDamage) || fallback.biteDamage), 1, 20),
    biteInterval,
    firstBiteDelay,
    stunDuration:clamp(Math.max(Number(settings.stunDuration) || fallback.stunDuration, minimumDuration), .35, 5),
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

  function snapshot() {
    return {
      elapsed,
      scheduledBites,
      pendingBites,
      complete,
      remaining:Math.max(0, config.stunDuration - elapsed),
      // Keep the existing bridge field, but carry the complete standalone-lab pose
      // state through it so both rendered characters use one synchronized timeline.
      visualProgress:lionMaulAnimationState(elapsed, config),
      config:{ ...config },
    };
  }

  return { advance, consumeBite, snapshot, get config(){ return { ...config }; } };
}
