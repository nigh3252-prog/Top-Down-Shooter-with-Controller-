import {
  WARDEN_TRIAL_BAZAAR_FALLBACK_PENDING_SECONDS,
  wardenTrialBazaarPendingCooldownSeconds,
} from './warden-trial-bazaar-catalog.js';

export const WARDEN_TRIAL_CARD_PENDING_FALLBACK_SECONDS = WARDEN_TRIAL_BAZAAR_FALLBACK_PENDING_SECONDS;
export const WARDEN_TRIAL_CARD_DOWN_RECOVERY_SECONDS = 1;

const EPSILON = 1e-9;
const finiteSeconds = value => {
  const seconds = Number(value);
  return Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
};

function bazaarItemForCard(card) {
  return card?.__wardenTrialBazaar || card?.bazaarItem || card || null;
}

export function wardenTrialCardCooldownSeconds(card, {
  direction = 'down',
  abilityCooldowns = true,
} = {}) {
  if (!card || (direction !== 'up' && direction !== 'down')) return 0;
  if (direction === 'down') return WARDEN_TRIAL_CARD_DOWN_RECOVERY_SECONDS;
  if (direction === 'up' && abilityCooldowns === false) return 0;
  return wardenTrialBazaarPendingCooldownSeconds(bazaarItemForCard(card));
}

export function createWardenTrialCardCooldown() {
  let serial = 0;
  let instanceId = null;
  let cardId = null;
  let itemId = null;
  let sourceCooldownSeconds = null;
  let phase = 'empty';
  let direction = null;
  let duration = 0;
  let remaining = 0;
  let hasteRemaining = 0;
  let slowRemaining = 0;
  let freezeRemaining = 0;

  const activeDrainRate = () => {
    if (remaining <= EPSILON || freezeRemaining > EPSILON) return 0;
    return (hasteRemaining > EPSILON ? 2 : 1) * (slowRemaining > EPSILON ? .5 : 1);
  };

  const snapshot = () => {
    const hasCard = instanceId !== null;
    const active = hasCard && phase === 'recovering' && remaining > EPSILON;
    return Object.freeze({
      active,
      ready: hasCard && phase === 'ready',
      complete: hasCard && phase === 'complete',
      played: hasCard && (phase === 'recovering' || phase === 'complete'),
      phase,
      direction,
      instanceId,
      cardId,
      itemId,
      sourceCooldownSeconds,
      duration,
      remaining: active ? remaining : 0,
      progress: duration > 0 ? Math.max(0, Math.min(1, remaining / duration)) : 0,
      drainRate: activeDrainRate(),
      hasteRemaining,
      slowRemaining,
      freezeRemaining,
    });
  };

  const clearStatuses = () => {
    hasteRemaining = 0;
    slowRemaining = 0;
    freezeRemaining = 0;
  };

  const reset = () => {
    instanceId = null;
    cardId = null;
    itemId = null;
    sourceCooldownSeconds = null;
    phase = 'empty';
    direction = null;
    duration = 0;
    remaining = 0;
    clearStatuses();
    return snapshot();
  };

  const deal = (card, { durationSeconds } = {}) => {
    if (!card) return reset();
    const item = bazaarItemForCard(card);
    const rawCooldown = item?.cooldownSeconds;
    sourceCooldownSeconds = rawCooldown === null || rawCooldown === undefined
      ? null
      : finiteSeconds(rawCooldown);
    duration = durationSeconds !== null && durationSeconds !== undefined && Number.isFinite(Number(durationSeconds))
      ? finiteSeconds(durationSeconds)
      : wardenTrialBazaarPendingCooldownSeconds(item);
    remaining = 0;
    cardId = String(card.__wardenTrialPairId || card.id || item?.id || '').trim() || null;
    itemId = String(item?.id || card.__wardenTrialBazaarItemId || '').trim() || null;
    serial += 1;
    instanceId = `${cardId || itemId || 'warden-card'}:${serial}`;
    phase = 'ready';
    direction = null;
    clearStatuses();
    return snapshot();
  };

  const applyEffect = (effect, seconds) => {
    const kind = String(effect || '').trim().toLowerCase();
    const amount = finiteSeconds(seconds);
    if (phase !== 'recovering' || remaining <= EPSILON || amount <= 0) {
      return Object.freeze({...snapshot(), effectApplied:false});
    }
    if (kind === 'charge') {
      remaining = Math.max(0, remaining - amount);
      if (remaining <= EPSILON) {
        remaining = 0;
        phase = 'complete';
        clearStatuses();
      }
      return Object.freeze({...snapshot(), effectApplied:true});
    }
    if (kind === 'haste') hasteRemaining += amount;
    else if (kind === 'slow') slowRemaining += amount;
    else if (kind === 'freeze') freezeRemaining += amount;
    else return Object.freeze({...snapshot(), effectApplied:false});
    return Object.freeze({...snapshot(), effectApplied:true});
  };

  const begin = (card, { durationSeconds, direction:playedDirection='up', effects=[] } = {}) => {
    const nextDirection = playedDirection === 'down' ? 'down' : 'up';
    const suppliedDuration = durationSeconds !== null && durationSeconds !== undefined && Number.isFinite(Number(durationSeconds));
    const recoveryDuration = suppliedDuration
      ? finiteSeconds(durationSeconds)
      : nextDirection === 'down' ? WARDEN_TRIAL_CARD_DOWN_RECOVERY_SECONDS : null;
    const expectedCardId = String(card?.__wardenTrialPairId || card?.id || bazaarItemForCard(card)?.id || '').trim() || null;
    if (!card) return reset();
    if (!instanceId || cardId !== expectedCardId) deal(card,{durationSeconds:recoveryDuration});
    if (recoveryDuration !== null) duration = recoveryDuration;
    remaining = duration;
    phase = remaining > EPSILON ? 'recovering' : 'complete';
    direction = nextDirection;
    clearStatuses();
    for (const timerEffect of Array.isArray(effects) ? effects : []) {
      applyEffect(timerEffect?.effect,timerEffect?.seconds);
    }
    return snapshot();
  };

  return Object.freeze({
    begin,
    deal,
    canPlay(requestedDirection) {
      if (!instanceId || (requestedDirection !== 'up' && requestedDirection !== 'down')) return false;
      return phase === 'ready';
    },
    update(deltaSeconds = 0) {
      let elapsed = finiteSeconds(deltaSeconds);
      if (phase !== 'recovering' || remaining <= EPSILON || elapsed <= 0) return snapshot();

      while (elapsed > EPSILON && remaining > EPSILON) {
        const expirations = [hasteRemaining, slowRemaining, freezeRemaining]
          .filter(value => value > EPSILON);
        const step = Math.min(elapsed, ...(expirations.length ? expirations : [elapsed]));
        const rate = activeDrainRate();
        remaining = Math.max(0, remaining - step * rate);
        hasteRemaining = Math.max(0, hasteRemaining - step);
        slowRemaining = Math.max(0, slowRemaining - step);
        freezeRemaining = Math.max(0, freezeRemaining - step);
        elapsed -= step;
      }

      if (remaining <= EPSILON) {
        remaining = 0;
        phase = 'complete';
        clearStatuses();
      }
      return snapshot();
    },
    applyEffect,
    haste: seconds => applyEffect('haste', seconds),
    charge: seconds => applyEffect('charge', seconds),
    slow: seconds => applyEffect('slow', seconds),
    freeze: seconds => applyEffect('freeze', seconds),
    reset,
    snapshot,
  });
}
