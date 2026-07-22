export const DASH_JET_QUALITY_PROFILES = Object.freeze({
  high:Object.freeze({
    id:'high',
    minGrainScale:1,
    simHz:60,
    renderHz:60,
    maxStepsPerFrame:2,
  }),
  balanced:Object.freeze({
    id:'balanced',
    minGrainScale:1.25,
    simHz:40,
    renderHz:40,
    maxStepsPerFrame:1,
  }),
  low:Object.freeze({
    id:'low',
    minGrainScale:1.6,
    simHz:30,
    renderHz:30,
    maxStepsPerFrame:1,
  }),
});

const QUALITY_IDS = Object.freeze(Object.keys(DASH_JET_QUALITY_PROFILES));

function requestedQuality(environment){
  try{
    const search = environment?.location?.search || '';
    const value = new URLSearchParams(search).get('dashQuality');
    return QUALITY_IDS.includes(value) ? value : null;
  }catch{
    return null;
  }
}

export function detectDashJetQuality(environment = globalThis){
  const requested = requestedQuality(environment);
  if(requested) return DASH_JET_QUALITY_PROFILES[requested];

  const navigator = environment?.navigator || {};
  const coarsePointer = !!environment?.matchMedia?.('(pointer: coarse)')?.matches;
  const touchDevice = Number(navigator.maxTouchPoints || 0) > 0;
  const limitedMemory = Number.isFinite(Number(navigator.deviceMemory))
    && Number(navigator.deviceMemory) <= 4;
  const limitedCpu = Number.isFinite(Number(navigator.hardwareConcurrency))
    && Number(navigator.hardwareConcurrency) <= 6;

  return coarsePointer || touchDevice || limitedMemory || limitedCpu
    ? DASH_JET_QUALITY_PROFILES.balanced
    : DASH_JET_QUALITY_PROFILES.high;
}

export function effectiveDashJetGrainScale(grainScale, profile){
  const numeric = Number(grainScale);
  const requested = Number.isFinite(numeric) ? numeric : 1;
  const minimum = Number(profile?.minGrainScale) || 1;
  return Math.max(requested, minimum);
}
