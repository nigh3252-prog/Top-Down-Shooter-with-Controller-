// Mixed Warden combat deck. Stance cards change the current guard and discard
// immediately. Ability cards stay in their hand slot while cooling down, then
// discard and draw a replacement. Manual shuffle discards every current card,
// including cooling abilities, intentionally allowing cooldown skips.

import { WARDEN_ABILITY_CARDS } from './warden-ability-cards.js';
import {
  effectiveWardenAbilityCooldown,
  playWardenAbility,
  resetWardenAbilityRuntime,
  updateWardenAbilityRuntime,
} from './warden-ability-runtime.js';

export function createStanceDeck({ rng = Math.random, shuffleTime = 2 } = {}) {
  const s = {
    draw:[], discard:[], hand:[null, null], cooldowns:[0, 0], pool:[], stancePool:[],
    shuffleT:-1, shuffleSource:null, lastStance:null, stanceButtonBound:false,
  };

  function shuffle(cards) {
    for (let index = cards.length - 1; index > 0; index--) {
      const next = Math.floor(rng() * (index + 1));
      [cards[index], cards[next]] = [cards[next], cards[index]];
    }
    return cards;
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

  function ensureAbilityDecoration(element) {
    let shade = element.querySelector('.abilityCooldownShade');
    if (!shade) {
      shade = document.createElement('span');
      shade.className = 'abilityCooldownShade';
      element.appendChild(shade);
    }
    let text = element.querySelector('.abilityCooldownText');
    if (!text) {
      text = document.createElement('span');
      text.className = 'abilityCooldownText';
      element.appendChild(text);
    }
    return { shade, text };
  }

  function clamp01(value) { return Math.max(0, Math.min(1, value)); }

  function decorateCards() {
    if (typeof document === 'undefined') return;
    for (let slot = 0; slot < 2; slot++) {
      const element = document.getElementById(`card${slot}`);
      if (!element) continue;
      const card = s.hand[slot];
      const isAbility = card?.type === 'ability';
      const cooling = isAbility && s.cooldowns[slot] > 0;
      const { shade, text } = ensureAbilityDecoration(element);

      element.dataset.cardType = card ? (isAbility ? 'ability' : 'stance') : 'empty';
      element.dataset.cardId = card?.id || '';
      element.classList.toggle('empty', !card);
      element.classList.toggle('cooling', cooling);

      if (isAbility) {
        const icon = element.querySelector('.cicon');
        const light = element.querySelector('.cardLight');
        const heavy = element.querySelector('.cardHeavy');
        const total = Math.max(.001, effectiveWardenAbilityCooldown(card));
        const remaining = Math.max(0, s.cooldowns[slot]);
        if (icon) icon.textContent = card.short || card.name.slice(0, 5);
        if (light) light.textContent = `${card.cost} SP`;
        if (heavy) heavy.textContent = `${total.toFixed(total < 2 ? 1 : 0)}s`;
        shade.style.height = cooling ? `${clamp01(remaining / total) * 100}%` : '0%';
        text.textContent = cooling ? remaining.toFixed(1) : '';
        element.setAttribute('aria-label', `${card.name}. Cost ${card.cost} D-Stamina. Cooldown ${total.toFixed(1)} seconds${cooling ? `. ${remaining.toFixed(1)} seconds remaining` : ''}`);
      } else {
        const icon = element.querySelector('.cicon');
        const light = element.querySelector('.cardLight');
        const heavy = element.querySelector('.cardHeavy');
        shade.style.height = '0%';
        text.textContent = '';
        if (icon) icon.textContent = '';
        if (card) {
          const attacks = globalThis.window?.__arena?.PC?.ATTACKS || {};
          if (light) light.textContent = card.chain.slice(0, 2).map(key => moveArrow(attacks[key] || {})).join(' ');
          if (heavy) heavy.textContent = moveArrow(attacks[card.chain[2]] || {});
        } else {
          if (light) light.textContent = '· ·';
          if (heavy) heavy.textContent = '·';
        }
        element.setAttribute('aria-label', card ? `Play ${card.name} stance card` : 'Empty card slot');
      }
    }

    const queue = document.getElementById('drawQueue');
    const queued = queue ? [...queue.querySelectorAll('.queuedCard')] : [];
    const upcoming = [...s.draw.slice(0, queued.length)].reverse();
    const offset = queued.length - upcoming.length;
    queued.forEach((element, index) => {
      const card = index >= offset ? upcoming[index - offset] : null;
      element.classList.toggle('filled', !!card);
      element.dataset.cardId = card?.id || '';
      element.dataset.cardType = card ? (card.type === 'ability' ? 'ability' : 'stance') : 'empty';
      element.title = card?.name || '';
      element.setAttribute('aria-label', card ? `Upcoming ${card.name}` : 'Empty draw slot');
    });
  }

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
      const index = s.stancePool.findIndex(card => card.id === s.lastStance?.id);
      s.lastStance = s.stancePool[(index + 1 + s.stancePool.length) % s.stancePool.length];
    });
  }

  function allCurrentCards() {
    const cards = [...s.draw, ...s.discard, ...s.hand.filter(Boolean)];
    const byId = new Map(cards.map(card => [card.id, card]));
    return byId.size === s.pool.length ? [...byId.values()] : s.pool.slice();
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
      s.pool = [...s.stancePool, ...WARDEN_ABILITY_CARDS];
      s.shuffleT = -1;
      s.shuffleSource = null;
      resetWardenAbilityRuntime();
      dealFresh(s.pool);
      bindStanceButton();
    },

    play(slot) {
      if (s.shuffleT >= 0) return null;
      if (s.cooldowns[slot] > 0) { suppressAttackStaminaFlash(); return null; }
      const card = s.hand[slot];
      if (!card) return null;

      if (card.type === 'ability') {
        if (!playWardenAbility(card)) return null;
        const stance = activeStanceFallback();
        if (!stance) return null;
        s.cooldowns[slot] = Math.max(.05, effectiveWardenAbilityCooldown(card));
        scheduleDecoration();
        return { ...stance, name:card.name, __abilityProxy:true, __abilityCard:card };
      }

      s.lastStance = card;
      consumeSlot(slot, card);
      scheduleDecoration();
      return card;
    },

    startShuffle() {
      if (s.shuffleT >= 0 || !s.pool.length) return false;
      s.shuffleSource = allCurrentCards();
      s.discard = [...s.hand.filter(Boolean), ...s.discard];
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
          dealFresh(s.shuffleSource?.length ? s.shuffleSource : s.pool);
          s.shuffleSource = null;
        }
        scheduleDecoration();
        return;
      }

      let changed = false;
      for (let slot = 0; slot < 2; slot++) {
        if (s.cooldowns[slot] <= 0) continue;
        const card = s.hand[slot];
        if (card?.type === 'ability') s.cooldowns[slot] = Math.min(s.cooldowns[slot], effectiveWardenAbilityCooldown(card));
        s.cooldowns[slot] = Math.max(0, s.cooldowns[slot] - dt);
        if (s.cooldowns[slot] <= 0) {
          const old = s.hand[slot];
          consumeSlot(slot, old);
          changed = true;
          const element = typeof document !== 'undefined' ? document.getElementById(`card${slot}`) : null;
          if (element) {
            element.classList.remove('draw-in');
            void element.offsetWidth;
            element.classList.add('draw-in');
          }
        }
      }
      if (changed || s.cooldowns.some(value => value > 0)) decorateCards();
    },
  };
}

export function moveArrow({ group, label = '' } = {}) {
  if (group === 'stab')       return /rising/i.test(label) ? '↗' : '→';
  if (group === 'horizontal') return '↔';
  if (group === 'vertical')   return /rising|skyhook|launch|uppercut/i.test(label) ? '↑' : '↓';
  return '·';
}
