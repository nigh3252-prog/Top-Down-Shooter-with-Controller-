// One Step From Eden-style ability deck. Two hand slots draw from the Warden's
// current ability pool. A played ability remains visible and blocks its slot
// while cooling down; only when the cooldown ends does it move to discard and
// draw a replacement into that same slot.
//
// Stance selection is intentionally preserved outside this deck. Ability cards
// return a proxy of the currently active stance so combat-arena keeps its normal
// weapon/stance attack chain while the dedicated ability runtime resolves.

import { WARDEN_ABILITY_CARDS } from './warden-ability-cards.js';
import {
  playWardenAbility,
  resetWardenAbilityRuntime,
  updateWardenAbilityRuntime,
} from './warden-ability-runtime.js';

export function createStanceDeck({ rng = Math.random, shuffleTime = 2 } = {}) {
  const s = {
    draw: [], discard: [], hand: [null, null], cooldowns: [0, 0], pool: [], stancePool: [],
    shuffleT: -1, lastStance: null, stanceButtonBound:false,
  };

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function refill(slot) {
    s.hand[slot] = s.draw.shift() ?? null;
    s.cooldowns[slot] = 0;
  }

  function dealFresh(cards) {
    s.draw = shuffle(cards.slice());
    s.discard = [];
    s.cooldowns = [0, 0];
    refill(0);
    refill(1);
    scheduleDecoration();
  }

  function consumeSlot(slot, card) {
    if (card) s.discard.push(card);
    s.hand[slot] = null;
    s.cooldowns[slot] = 0;
    refill(slot);
    if (!s.hand[0] && !s.hand[1] && !s.draw.length && s.discard.length) dealFresh(s.discard);
  }

  function activeStanceFallback() {
    const found = s.lastStance && s.stancePool.find(card => card.id === s.lastStance.id);
    return found || s.stancePool[0] || null;
  }

  function ensureAbilityDecoration(el) {
    let shade = el.querySelector('.abilityCooldownShade');
    if (!shade) {
      shade = document.createElement('span');
      shade.className = 'abilityCooldownShade';
      el.appendChild(shade);
    }
    let text = el.querySelector('.abilityCooldownText');
    if (!text) {
      text = document.createElement('span');
      text.className = 'abilityCooldownText';
      el.appendChild(text);
    }
    return { shade, text };
  }

  function decorateCards() {
    if (typeof document === 'undefined') return;
    for (let i = 0; i < 2; i++) {
      const el = document.getElementById(`card${i}`);
      if (!el) continue;
      const card = s.hand[i];
      const icon = el.querySelector('.cicon');
      const light = el.querySelector('.cardLight');
      const heavy = el.querySelector('.cardHeavy');
      const cooling = !!card && s.cooldowns[i] > 0;
      const total = Math.max(.001, Number(card?.cooldown) || 0);
      const remaining = Math.max(0, s.cooldowns[i]);
      const { shade, text } = ensureAbilityDecoration(el);

      el.dataset.cardType = card?.type === 'ability' ? 'ability' : 'empty';
      el.classList.toggle('empty', !card);
      el.classList.toggle('cooling', cooling);
      el.dataset.cardId = card?.id || '';
      el.setAttribute('aria-label', card
        ? `${card.name}. Cost ${card.cost}. Cooldown ${card.cooldown} seconds${cooling ? `. ${remaining.toFixed(1)} seconds remaining` : ''}`
        : 'Empty card slot');

      if (icon) icon.textContent = card ? (card.short || card.name.slice(0, 5)) : '';
      if (light) light.textContent = card ? `${card.cost} SP` : '·';
      if (heavy) heavy.textContent = card ? `${card.cooldown}s` : '·';
      shade.style.height = cooling ? `${clamp01(remaining / total) * 100}%` : '0%';
      text.textContent = cooling ? remaining.toFixed(1) : '';
    }

    const queue = document.getElementById('drawQueue');
    const queued = queue ? [...queue.querySelectorAll('.queuedCard')] : [];
    const upcoming = [...s.draw.slice(0, queued.length)].reverse();
    const offset = queued.length - upcoming.length;
    queued.forEach((el, index) => {
      const card = index >= offset ? upcoming[index - offset] : null;
      el.classList.toggle('filled', !!card);
      el.dataset.cardId = card?.id || '';
      el.title = card?.name || '';
      el.setAttribute('aria-label', card ? `Upcoming ${card.name}` : 'Empty draw slot');
    });
  }

  function clamp01(value) { return Math.max(0, Math.min(1, value)); }

  function scheduleDecoration() {
    if (typeof queueMicrotask === 'function') queueMicrotask(decorateCards);
    else setTimeout(decorateCards, 0);
  }

  function suppressAttackStaminaFlash() {
    if (typeof document === 'undefined') return;
    const clear = () => document.getElementById('stWrap')?.classList.remove('exhaust');
    if (typeof queueMicrotask === 'function') queueMicrotask(clear);
    else setTimeout(clear, 0);
  }

  function bindStanceButton() {
    if (s.stanceButtonBound || typeof document === 'undefined') return;
    const button = document.getElementById('stanceBtn');
    if (!button) { setTimeout(bindStanceButton, 0); return; }
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
    cooldownForSlot(slot) { return Math.max(0, s.cooldowns[slot] || 0); },

    rebuild(cards) {
      s.stancePool = cards.slice();
      const previous = activeStanceFallback();
      s.lastStance = previous && s.stancePool.some(card => card.id === previous.id)
        ? s.stancePool.find(card => card.id === previous.id)
        : (s.stancePool[0] || null);
      s.pool = WARDEN_ABILITY_CARDS.slice();
      s.shuffleT = -1;
      resetWardenAbilityRuntime();
      dealFresh(s.pool);
      bindStanceButton();
    },

    play(slot) {
      if (s.shuffleT >= 0) return null;
      if (s.cooldowns[slot] > 0) { suppressAttackStaminaFlash(); return null; }
      const card = s.hand[slot];
      if (!card || card.type !== 'ability') return null;
      if (!playWardenAbility(card)) return null;
      const stance = activeStanceFallback();
      if (!stance) return null;
      s.cooldowns[slot] = Math.max(.05, Number(card.cooldown) || .05);
      scheduleDecoration();
      return { ...stance, name:card.name, __abilityProxy:true, __abilityCard:card };
    },

    startShuffle() {
      if (s.shuffleT >= 0 || !s.pool.length) return false;
      s.discard = [];
      s.hand = [null, null];
      s.cooldowns = [0, 0];
      s.draw = [];
      s.shuffleT = shuffleTime;
      scheduleDecoration();
      return true;
    },

    update(dt) {
      updateWardenAbilityRuntime(dt);
      if (s.shuffleT >= 0) {
        s.shuffleT -= dt;
        if (s.shuffleT <= 0) {
          s.shuffleT = -1;
          dealFresh(s.pool);
        }
        scheduleDecoration();
        return;
      }

      let changed = false;
      for (let slot = 0; slot < 2; slot++) {
        if (s.cooldowns[slot] <= 0) continue;
        s.cooldowns[slot] = Math.max(0, s.cooldowns[slot] - dt);
        if (s.cooldowns[slot] <= 0) {
          const old = s.hand[slot];
          consumeSlot(slot, old);
          changed = true;
          const el = typeof document !== 'undefined' ? document.getElementById(`card${slot}`) : null;
          if (el) {
            el.classList.remove('draw-in');
            void el.offsetWidth;
            el.classList.add('draw-in');
          }
        }
      }
      if (changed || s.cooldowns.some(value => value > 0)) decorateCards();
    },
  };
}

// Directional glyph for a chain move, retained for the Combat Arena's attack
// preview UI even though the hand itself now contains ability cards.
export function moveArrow({ group, label = '' } = {}) {
  if (group === 'stab')       return /rising/i.test(label) ? '↗' : '→';
  if (group === 'horizontal') return '↔';
  if (group === 'vertical')   return /rising|skyhook|launch|uppercut/i.test(label) ? '↑' : '↓';
  return '·';
}
