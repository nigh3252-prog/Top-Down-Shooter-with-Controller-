export const WARDEN_TRIAL_CARD_UP_COOLDOWN_SECONDS = 3;
export const WARDEN_TRIAL_CARD_DOWN_COOLDOWN_SECONDS = 1;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function wardenTrialCardDirection(cardOrDirection) {
  const value = typeof cardOrDirection === 'string'
    ? cardOrDirection
    : cardOrDirection?.__wardenTrialDirection;
  const direction = String(value || '').trim().toLowerCase();
  return direction === 'up' || direction === 'down' ? direction : null;
}

export function wardenTrialCardCooldownSeconds(cardOrDirection, { abilityCooldowns = true } = {}) {
  const direction = wardenTrialCardDirection(cardOrDirection);
  const authored = Number(typeof cardOrDirection === 'object'
    ? cardOrDirection?.__wardenTrialTiming?.cooldownSeconds
    : Number.NaN);
  if (Number.isFinite(authored)) return Math.max(0, authored);
  if (direction === 'up') return abilityCooldowns === false ? 0 : WARDEN_TRIAL_CARD_UP_COOLDOWN_SECONDS;
  if (direction === 'down') return WARDEN_TRIAL_CARD_DOWN_COOLDOWN_SECONDS;
  return 0;
}

export function wardenTrialCardSetupSeconds(cardOrDirection) {
  const authored = Number(typeof cardOrDirection === 'object'
    ? cardOrDirection?.__wardenTrialTiming?.setupSeconds
    : 0);
  return Number.isFinite(authored) ? Math.max(0, authored) : 0;
}

export function wardenTrialCardTiming(cardOrDirection, options = {}) {
  const direction = wardenTrialCardDirection(cardOrDirection);
  return Object.freeze({
    cardId:typeof cardOrDirection === 'object'
      ? String(cardOrDirection?.__wardenTrialCardId || cardOrDirection?.id || '').trim() || null
      : null,
    direction,
    setupSeconds:wardenTrialCardSetupSeconds(cardOrDirection),
    cooldownSeconds:wardenTrialCardCooldownSeconds(cardOrDirection, options),
  });
}

export function createWardenTrialCardCooldown() {
  let phase = 'ready';
  let direction = null;
  let cardId = null;
  let duration = 0;
  let remaining = 0;
  let setupDuration = 0;
  let cooldownDuration = 0;

  const snapshot = () => Object.freeze({
    active:phase !== 'ready',
    phase,
    direction:phase === 'ready' ? null : direction,
    cardId:phase === 'ready' ? null : cardId,
    duration:phase === 'ready' ? 0 : duration,
    remaining:phase === 'ready' ? 0 : remaining,
    progress:phase !== 'ready' && duration > 0 ? clamp(remaining / duration, 0, 1) : 0,
    setupDuration:phase === 'ready' ? 0 : setupDuration,
    cooldownDuration:phase === 'ready' ? 0 : cooldownDuration,
  });

  const reset = () => {
    phase = 'ready';
    direction = null;
    cardId = null;
    duration = 0;
    remaining = 0;
    setupDuration = 0;
    cooldownDuration = 0;
    return snapshot();
  };

  const startCooldown = () => {
    if (cooldownDuration <= 0) return reset();
    phase = 'cooldown';
    duration = cooldownDuration;
    remaining = cooldownDuration;
    return snapshot();
  };

  return Object.freeze({
    begin(cardOrDirection, options = {}) {
      if (phase !== 'ready') {
        return Object.freeze({ accepted:false, effectReady:false, snapshot:snapshot() });
      }
      const timing = wardenTrialCardTiming(cardOrDirection, options);
      if (!timing.direction) {
        return Object.freeze({ accepted:false, effectReady:false, snapshot:snapshot() });
      }
      direction = timing.direction;
      cardId = timing.cardId;
      setupDuration = timing.setupSeconds;
      cooldownDuration = timing.cooldownSeconds;
      if (setupDuration > 0) {
        phase = 'setup';
        duration = setupDuration;
        remaining = setupDuration;
        return Object.freeze({ accepted:true, effectReady:false, snapshot:snapshot() });
      }
      const next = startCooldown();
      return Object.freeze({ accepted:true, effectReady:true, snapshot:next });
    },
    update(deltaSeconds = 0) {
      let elapsed = Number(deltaSeconds);
      let effectReady = false;
      if (phase === 'ready' || !Number.isFinite(elapsed) || elapsed <= 0) {
        return Object.freeze({ effectReady, snapshot:snapshot() });
      }
      while (elapsed > 0 && phase !== 'ready') {
        const consumed = Math.min(remaining, elapsed);
        remaining = Math.max(0, remaining - consumed);
        elapsed -= consumed;
        if (remaining > 0) break;
        if (phase === 'setup') {
          effectReady = true;
          startCooldown();
        } else {
          reset();
        }
      }
      return Object.freeze({ effectReady, snapshot:snapshot() });
    },
    reset,
    snapshot,
  });
}
