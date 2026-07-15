// One Step From Eden-style stance-card deck: a shuffled draw pile feeds two
// hand slots; playing a card discards it and draws its replacement into the
// same slot. When every card has been played (both slots empty, draw pile
// dry) the discard instantly reshuffles into a fresh hand. A manual shuffle
// tosses the current hand and takes a countdown before the new hand arrives.
// Pure logic — no DOM, no stamina (the page owns resources).
//
// Ability and modifier cards return a proxy of the active stance after firing
// their event. That preserves the stance/weapon while the existing discard,
// draw, stamina-refill, announcement, and card-animation pipeline still runs.

import { POW_BUNKER_CARD } from './powbunker-card.js';
import { BLOOD_SLASH_CARD, BING_BONG_CARD } from './combat-modifier-cards.js';

export function createStanceDeck({ rng = Math.random, shuffleTime = 2 } = {}) {
  const s = {
    draw: [], discard: [], hand: [null, null], pool: [], stancePool: [],
    shuffleT: -1, lastStance: null, stanceButtonBound:false,
  };

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function refill(slot) { s.hand[slot] = s.draw.shift() ?? null; }
  function dealFresh(cards) {
    s.draw = shuffle(cards.slice());
    s.discard = [];
    refill(0); refill(1);
    scheduleDecoration();
  }
  function consumeSlot(slot, card) {
    s.discard.push(card);
    refill(slot);
    if (!s.hand[0] && !s.hand[1] && !s.draw.length && s.discard.length) dealFresh(s.discard);
  }
  function activeStanceFallback() {
    const found = s.lastStance && s.stancePool.find(card => card.id === s.lastStance.id);
    return found || s.stancePool[0] || null;
  }
  function proxyActiveStance(card, marker) {
    const stance = activeStanceFallback();
    return stance ? { ...stance, name:card.name, [marker]:true } : null;
  }

  function decorateCards() {
    if (typeof document === 'undefined') return;
    for (let i=0;i<2;i++) {
      const el = document.getElementById(`card${i}`);
      if (!el) continue;
      const card = s.hand[i];
      const icon = el.querySelector('.cicon');
      const rows = el.querySelector('.crows');
      const isAbility = card?.type === 'ability';
      const isModifier = card?.type === 'modifier';
      const isBingBong = card?.effectId === 'bingBong';
      const type = isAbility ? 'ability' : (isModifier ? 'modifier' : 'stance');
      el.dataset.cardType = type;
      el.setAttribute('aria-label', card ? `Play ${card.name.replace(/^S\d+\s*/,'')} ${type} card` : 'Empty card slot');
      if (rows) rows.style.display = isModifier ? 'none' : 'flex';
      if (icon) {
        icon.textContent = isAbility ? 'PB' : (isModifier ? 'BLOOD\nSLASH' : (isBingBong ? 'BING\nBONG' : ''));
        icon.style.display = 'grid';
        icon.style.placeItems = 'center';
        icon.style.textAlign = 'center';
        icon.style.whiteSpace = 'pre-line';
        icon.style.lineHeight = isModifier || isBingBong ? '1.02' : '';
        icon.style.fontWeight = isAbility || isModifier || isBingBong ? '900' : '';
        icon.style.fontSize = isAbility ? '16px' : (isModifier || isBingBong ? '10px' : '');
        icon.style.letterSpacing = isAbility ? '.08em' : (isModifier || isBingBong ? '.04em' : '');
        icon.style.color = isAbility ? '#ffb066' : (isModifier ? '#ff9aa7' : (isBingBong ? '#ffd07b' : ''));
        icon.style.borderColor = isAbility ? 'rgba(255,176,102,.72)' : (isModifier ? 'rgba(216,59,77,.78)' : (isBingBong ? 'rgba(255,208,123,.72)' : ''));
        icon.style.background = isAbility
          ? 'radial-gradient(circle,rgba(255,176,102,.22),rgba(18,36,38,.42))'
          : (isModifier
            ? 'radial-gradient(circle,rgba(216,59,77,.28),rgba(32,10,14,.58))'
            : (isBingBong ? 'radial-gradient(circle,rgba(255,208,123,.20),rgba(18,36,38,.42))' : ''));
      }
      el.style.borderColor = isAbility ? '#a95b35' : (isModifier ? '#b62d43' : (isBingBong ? '#b98639' : ''));
    }
  }
  function scheduleDecoration() {
    if (typeof queueMicrotask === 'function') queueMicrotask(decorateCards);
    else setTimeout(decorateCards,0);
  }
  function bindStanceButton() {
    if (s.stanceButtonBound || typeof document === 'undefined') return;
    const button = document.getElementById('stanceBtn');
    if (!button) { setTimeout(bindStanceButton,0); return; }
    s.stanceButtonBound = true;
    button.addEventListener('click', () => {
      if (!s.stancePool.length) return;
      const idx = s.stancePool.findIndex(card => card.id === s.lastStance?.id);
      s.lastStance = s.stancePool[(idx + 1 + s.stancePool.length) % s.stancePool.length];
    });
  }

  return {
    get hand() { return s.hand; },
    get upcoming() { return s.draw.slice(0, 4); },
    get drawCount() { return s.draw.length; },
    get discardCount() { return s.discard.length; },
    get shuffling() { return s.shuffleT >= 0; },
    get shuffleT() { return s.shuffleT; },
    get shuffleTime() { return shuffleTime; },

    rebuild(cards) {
      s.stancePool = cards.some(card => card.id === BING_BONG_CARD.id) ? cards.slice() : [...cards, BING_BONG_CARD];
      const previous = activeStanceFallback();
      s.lastStance = previous && s.stancePool.some(card => card.id === previous.id)
        ? s.stancePool.find(card => card.id === previous.id)
        : (s.stancePool[0] || null);
      s.pool = [...s.stancePool, POW_BUNKER_CARD, BLOOD_SLASH_CARD];
      s.shuffleT = -1;
      dealFresh(s.pool);
      bindStanceButton();
    },

    play(slot) {
      if (s.shuffleT >= 0) return null;
      const card = s.hand[slot];
      if (!card) return null;

      if (card.type === 'ability') {
        const canPlay = typeof window !== 'undefined' && typeof window.__POWBUNKER_CAN_PLAY__ === 'function'
          ? window.__POWBUNKER_CAN_PLAY__()
          : false;
        if (!canPlay) return null;
        const proxy = proxyActiveStance(card, '__abilityProxy');
        if (!proxy) return null;
        consumeSlot(slot, card);
        const fire = () => window.dispatchEvent(new CustomEvent('powbunker:play', { detail:{ card } }));
        if (typeof queueMicrotask === 'function') queueMicrotask(fire); else setTimeout(fire, 0);
        scheduleDecoration();
        return proxy;
      }

      if (card.type === 'modifier') {
        const proxy = proxyActiveStance(card, '__modifierProxy');
        if (!proxy) return null;
        consumeSlot(slot, card);
        const fire = () => window.dispatchEvent(new CustomEvent('bloodslash:play', { detail:{ card } }));
        if (typeof queueMicrotask === 'function') queueMicrotask(fire); else setTimeout(fire, 0);
        scheduleDecoration();
        return proxy;
      }

      s.lastStance = card;
      consumeSlot(slot, card);
      scheduleDecoration();
      return card;
    },

    startShuffle() {
      if (s.shuffleT >= 0 || !s.pool.length) return false;
      s.discard = [];
      s.hand = [null, null];
      s.draw = [];
      s.shuffleT = shuffleTime;
      scheduleDecoration();
      return true;
    },

    update(dt) {
      if (s.shuffleT < 0) return;
      s.shuffleT -= dt;
      if (s.shuffleT <= 0) {
        s.shuffleT = -1;
        dealFresh(s.pool);
      }
      scheduleDecoration();
    },
  };
}

// Directional glyph for a chain move, from its ATTACKS entry { group, label }:
// chops point down, risers point up, thrusts point forward.
export function moveArrow({ group, label = '' } = {}) {
  if (group === 'stab')       return /rising/i.test(label) ? '↗' : '→';
  if (group === 'horizontal') return '↔';
  if (group === 'vertical')   return /rising|skyhook|launch|uppercut/i.test(label) ? '↑' : '↓';
  return '·';
}
