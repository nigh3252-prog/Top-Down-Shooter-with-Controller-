import {
  WARDEN_TRIAL_BAZAAR_FALLBACK_PENDING_SECONDS,
  wardenTrialBazaarPendingCooldownSeconds,
} from './warden-trial-bazaar-catalog.js';

export const WARDEN_TRIAL_CARD_PENDING_FALLBACK_SECONDS = WARDEN_TRIAL_BAZAAR_FALLBACK_PENDING_SECONDS;

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
  if (direction === 'up' && abilityCooldowns === false) return 0;
  return wardenTrialBazaarPendingCooldownSeconds(bazaarItemForCard(card));
}

export function createWardenTrialCardCooldown() {
  let serial = 0;
  let instanceId = null;
  let cardId = null;
  let itemId = null;
  let sourceCooldownSeconds = null;
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
    const active = hasCard && remaining > EPSILON;
    return Object.freeze({
      active,
      ready: hasCard && !active,
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
    duration = 0;
    remaining = 0;
    clearStatuses();
    return snapshot();
  };

  const begin = card => {
    if (!card) return reset();
    const item = bazaarItemForCard(card);
    const rawCooldown = item?.cooldownSeconds;
    sourceCooldownSeconds = rawCooldown === null || rawCooldown === undefined
      ? null
      : finiteSeconds(rawCooldown);
    duration = wardenTrialBazaarPendingCooldownSeconds(item);
    remaining = duration;
    cardId = String(card.__wardenTrialPairId || card.id || item?.id || '').trim() || null;
    itemId = String(item?.id || card.__wardenTrialBazaarItemId || '').trim() || null;
    serial += 1;
    instanceId = `${cardId || itemId || 'warden-card'}:${serial}`;
    clearStatuses();
    return snapshot();
  };

  const applyEffect = (effect, seconds) => {
    const kind = String(effect || '').trim().toLowerCase();
    const amount = finiteSeconds(seconds);
    if (remaining <= EPSILON || amount <= 0) return snapshot();
    if (kind === 'charge') {
      remaining = Math.max(0, remaining - amount);
      if (remaining <= EPSILON) {
        remaining = 0;
        clearStatuses();
      }
      return snapshot();
    }
    if (kind === 'haste') hasteRemaining += amount;
    else if (kind === 'slow') slowRemaining += amount;
    else if (kind === 'freeze') freezeRemaining += amount;
    return snapshot();
  };

  return Object.freeze({
    begin,
    deal: begin,
    canPlay(direction, { abilityCooldowns = true } = {}) {
      if (!instanceId || (direction !== 'up' && direction !== 'down')) return false;
      return remaining <= EPSILON || (direction === 'up' && abilityCooldowns === false);
    },
    update(deltaSeconds = 0) {
      let elapsed = finiteSeconds(deltaSeconds);
      if (remaining <= EPSILON || elapsed <= 0) return snapshot();

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
