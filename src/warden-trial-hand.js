export const WARDEN_TRIAL_HAND_SIZE = 3;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function shuffle(cards, rng = Math.random) {
  const result = [...cards];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const random = Number(rng?.());
    const unit = Number.isFinite(random) ? clamp(random, 0, .999999999) : 0;
    const swap = Math.floor(unit * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function wardenTrialCardId(card) {
  return String(card?.__wardenTrialCardId || card?.id || '').trim();
}

export function createWardenTrialHand({ rng = Math.random, handSize = WARDEN_TRIAL_HAND_SIZE } = {}) {
  const size = Math.max(1, Math.trunc(Number(handSize) || WARDEN_TRIAL_HAND_SIZE));
  let pool = [];
  let drawPile = [];
  let discardPile = [];
  let hand = Array(size).fill(null);
  let slots = { up:null, down:null };

  const recycleDiscard = () => {
    if (drawPile.length || !discardPile.length) return;
    drawPile = shuffle(discardPile, rng);
    discardPile = [];
  };

  const drawOne = () => {
    recycleDiscard();
    return drawPile.pop() || null;
  };

  const snapshot = () => Object.freeze({
    hand:Object.freeze([...hand]),
    slots:Object.freeze({ ...slots }),
    drawCount:drawPile.length,
    discardCount:discardPile.length,
    poolSize:pool.length,
  });

  const discardCurrentCards = () => {
    const discarded = hand.filter(Boolean);
    if (slots.up) discarded.push(slots.up);
    if (slots.down) discarded.push(slots.down);
    discardPile.push(...discarded);
    hand = Array(size).fill(null);
    slots = { up:null, down:null };
    return discarded;
  };

  return Object.freeze({
    handSize:size,
    get hand(){ return [...hand]; },
    get slots(){ return Object.freeze({ ...slots }); },
    get pool(){ return [...pool]; },
    get drawCount(){ return drawPile.length; },
    get discardCount(){ return discardPile.length; },
    get shuffling(){ return false; },
    get shuffleT(){ return 0; },
    get upcoming(){ return [...drawPile].reverse(); },
    beginRun(cards = []) {
      pool = (Array.isArray(cards) ? cards : []).filter(Boolean);
      drawPile = shuffle(pool, rng);
      discardPile = [];
      hand = Array(size).fill(null);
      slots = { up:null, down:null };
      return snapshot();
    },
    discardAndDraw() {
      const discarded = discardCurrentCards();
      const drawn = [];
      for (let index = 0; index < size; index += 1) {
        const card = drawOne();
        hand[index] = card;
        if (card) drawn.push(card);
      }
      return Object.freeze({ discarded:Object.freeze(discarded), drawn:Object.freeze(drawn), snapshot:snapshot() });
    },
    play(handSlot, direction = null) {
      const index = Math.trunc(Number(handSlot));
      const card = index >= 0 && index < size ? hand[index] : null;
      if (!card) return null;
      const cardDirection = String(card.__wardenTrialDirection || '').toLowerCase();
      const requestedDirection = String(direction || cardDirection).toLowerCase();
      if ((cardDirection !== 'up' && cardDirection !== 'down') || requestedDirection !== cardDirection) return null;
      const replaced = slots[cardDirection] || null;
      if (replaced) discardPile.push(replaced);
      hand[index] = null;
      slots = { ...slots, [cardDirection]:card };
      return Object.freeze({ card, direction:cardDirection, handSlot:index, replaced });
    },
    addCard(card) {
      if (!card) return false;
      const cardId = wardenTrialCardId(card);
      if (cardId && pool.some(candidate => wardenTrialCardId(candidate) === cardId)) return false;
      pool.push(card);
      discardPile.push(card);
      return true;
    },
    update(){ return snapshot(); },
    reset(){
      pool = [];
      drawPile = [];
      discardPile = [];
      hand = Array(size).fill(null);
      slots = { up:null, down:null };
      return snapshot();
    },
    snapshot,
  });
}

export function hasNearbyWardenTrialEnemy({ player = null, enemies = [], range = 0 } = {}) {
  const x = Number(player?.x);
  const z = Number(player?.z ?? player?.y);
  const radius = Math.max(0, Number(range) || 0);
  if (!Number.isFinite(x) || !Number.isFinite(z) || radius <= 0) return false;
  return (Array.isArray(enemies) ? enemies : []).some(enemy => {
    if (!enemy || Number(enemy.hp) <= 0) return false;
    const enemyX = Number(enemy.x);
    const enemyZ = Number(enemy.z ?? enemy.y);
    return Number.isFinite(enemyX) && Number.isFinite(enemyZ)
      && Math.hypot(enemyX - x, enemyZ - z) <= radius;
  });
}

export function createWardenTrialDiscardDrawCharge({ requiredSeconds = 4 } = {}) {
  const duration = Math.max(.001, Number(requiredSeconds) || 4);
  let opening = true;
  let chargedSeconds = duration;

  const snapshot = () => Object.freeze({
    opening,
    available:chargedSeconds >= duration,
    chargedSeconds,
    requiredSeconds:duration,
    progress:clamp(chargedSeconds / duration, 0, 1),
  });

  return Object.freeze({
    spend() {
      if (chargedSeconds < duration) return false;
      opening = false;
      chargedSeconds = 0;
      return true;
    },
    update(deltaSeconds = 0, { nearEnemy = false, active = true } = {}) {
      const elapsed = Number(deltaSeconds);
      if (!opening && active && nearEnemy && chargedSeconds < duration && Number.isFinite(elapsed) && elapsed > 0) {
        chargedSeconds = Math.min(duration, chargedSeconds + elapsed);
      }
      return snapshot();
    },
    reset() {
      opening = true;
      chargedSeconds = duration;
      return snapshot();
    },
    snapshot,
  });
}
