export const WARDEN_TRIAL_CARD_UP_COOLDOWN_SECONDS = 3;
export const WARDEN_TRIAL_CARD_DOWN_COOLDOWN_SECONDS = 1;

export function wardenTrialCardCooldownSeconds(direction, { abilityCooldowns = true } = {}) {
  if (direction === 'up') return abilityCooldowns === false ? 0 : WARDEN_TRIAL_CARD_UP_COOLDOWN_SECONDS;
  if (direction === 'down') return WARDEN_TRIAL_CARD_DOWN_COOLDOWN_SECONDS;
  return 0;
}

export function createWardenTrialCardCooldown() {
  let direction = null;
  let duration = 0;
  let remaining = 0;

  const snapshot = () => Object.freeze({
    active: remaining > 0,
    direction: remaining > 0 ? direction : null,
    duration: remaining > 0 ? duration : 0,
    remaining,
    progress: duration > 0 ? Math.max(0, Math.min(1, remaining / duration)) : 0,
  });

  const reset = () => {
    direction = null;
    duration = 0;
    remaining = 0;
    return snapshot();
  };

  return Object.freeze({
    begin(nextDirection, options = {}) {
      const seconds = wardenTrialCardCooldownSeconds(nextDirection, options);
      if (seconds <= 0) return reset();
      direction = nextDirection;
      duration = seconds;
      remaining = seconds;
      return snapshot();
    },
    update(deltaSeconds = 0) {
      const elapsed = Number(deltaSeconds);
      if (remaining <= 0 || !Number.isFinite(elapsed) || elapsed <= 0) return snapshot();
      remaining = Math.max(0, remaining - elapsed);
      if (remaining <= 0) {
        direction = null;
        duration = 0;
      }
      return snapshot();
    },
    reset,
    snapshot,
  });
}
