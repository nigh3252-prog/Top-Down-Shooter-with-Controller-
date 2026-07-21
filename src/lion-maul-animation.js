const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smooth = value => {
  const t = clamp(Number(value) || 0, 0, 1);
  return t * t * (3 - 2 * t);
};
const gauss = (value, width) => Math.exp(-Math.pow(value / Math.max(.001, width), 2));

export const LION_MAUL_ANIMATION_DEFAULTS = Object.freeze({
  playerFallAngle:92,
  playerFallDuration:.42,
  playerGroundY:.08,
  playerBackSlide:.18,
  lionDistance:2.05,
  lionSettleDuration:.48,
  lionBodyDrop:.92,
  frontCrouch:.92,
  rearCrouch:.88,
  lionBodyPitch:10,
  headBasePitch:-12,
  headShake:28,
  biteSnap:35,
  jawOpen:62,
  biteWindup:.30,
  biteSnapWidth:.09,
  holdAfterLast:.30,
  releaseDuration:.52,
});

export function lionMaulAnimationConfig(settings = {}) {
  const fallback = LION_MAUL_ANIMATION_DEFAULTS;
  return {
    ...fallback,
    ...settings,
    biteCount:clamp(Math.round(Number(settings.biteCount) || 3), 1, 6),
    firstBiteDelay:clamp(Number(settings.firstBiteDelay) || .78, .08, 1.8),
    biteInterval:clamp(Number(settings.biteInterval) || .58, .12, 1.2),
    playerFallDuration:clamp(Number(settings.playerFallDuration) || fallback.playerFallDuration, .08, 1),
    lionSettleDuration:clamp(Number(settings.lionSettleDuration) || fallback.lionSettleDuration, .08, 1.2),
    biteWindup:clamp(Number(settings.biteWindup) || fallback.biteWindup, .08, .6),
    biteSnapWidth:clamp(Number(settings.biteSnapWidth) || fallback.biteSnapWidth, .035, .22),
    holdAfterLast:clamp(Number(settings.holdAfterLast) || fallback.holdAfterLast, 0, 1),
    releaseDuration:clamp(Number(settings.releaseDuration) || fallback.releaseDuration, .1, 1.4),
  };
}

export function lionMaulAnimationDuration(settings = {}) {
  const config = lionMaulAnimationConfig(settings);
  const lastBite = config.firstBiteDelay + (config.biteCount - 1) * config.biteInterval;
  return Math.max(
    config.playerFallDuration,
    config.lionSettleDuration,
    lastBite + config.holdAfterLast + config.releaseDuration,
  );
}

export function lionMaulAnimationState(elapsed, settings = {}) {
  const config = lionMaulAnimationConfig(settings);
  const time = Math.max(0, Number(elapsed) || 0);
  const lastBite = config.firstBiteDelay + (config.biteCount - 1) * config.biteInterval;
  const releaseStart = lastBite + config.holdAfterLast;
  const release = smooth((time - releaseStart) / config.releaseDuration);
  const hold = smooth(time / config.lionSettleDuration) * (1 - release);
  const fall = smooth(time / config.playerFallDuration) * (1 - release);

  let snap = 0;
  let shake = 0;
  let open = 0;
  let nearest = -1;
  for (let index = 0; index < config.biteCount; index++) {
    const biteAt = config.firstBiteDelay + index * config.biteInterval;
    const start = biteAt - config.biteWindup;
    const wind = smooth((time - start) / config.biteWindup)
      * (1 - smooth((time - biteAt) / .12));
    const thisSnap = gauss(time - biteAt, config.biteSnapWidth);
    const local = clamp((time - start) / Math.max(.01, config.biteWindup + .12), 0, 1);
    const thisShake = Math.sin(local * Math.PI * 3.2 + index * .8)
      * wind * (1 - thisSnap * .55);
    if (thisSnap > snap) {
      snap = thisSnap;
      nearest = index;
    }
    shake += thisShake;
    open = Math.max(open, wind, thisSnap * .30);
  }

  return {
    ...config,
    elapsed:time,
    totalDuration:lionMaulAnimationDuration(config),
    releaseStart,
    release,
    hold,
    fall,
    snap:clamp(snap, 0, 1),
    shake:clamp(shake, -1, 1),
    open:clamp(open, 0, 1),
    nearestBite:nearest,
  };
}
