// One Step From Eden-style card deck: a shuffled draw pile feeds two hand
// slots; playing a card discards it and draws its replacement into the same
// slot. When every card has been played, the discard reshuffles immediately.
// A manual shuffle tosses the current hand and takes a countdown before the
// new hand arrives. Pure deck logic; the arena owns combat resources.

function isNonStanceCard(card) {
  return !!card?.type && card.type !== 'stance';
}

function cardInitials(card) {
  if (card?.icon) return String(card.icon).slice(0, 3).toUpperCase();
  return String(card?.name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();
}

export function createStanceDeck({ rng = Math.random, shuffleTime = 2 } = {}) {
  const s = {
    draw: [], discard: [], hand: [null, null], pool: [], stancePool: [],
    shuffleT: -1, lastStance: null, stanceButtonBound:false, runLocked:false,
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
  function applyPool(cards) {
    const next = cards.slice();
    s.stancePool = next.filter(card => !isNonStanceCard(card));
    const previous = activeStanceFallback();
    s.lastStance = previous && s.stancePool.some(card => card.id === previous.id)
      ? s.stancePool.find(card => card.id === previous.id)
      : (s.stancePool[0] || null);
    s.pool = next;
    s.shuffleT = -1;
    dealFresh(s.pool);
    bindStanceButton();
  }

  function decorateCards() {
    if (typeof document === 'undefined') return;
    for (let i=0;i<2;i++) {
      const el = document.getElementById(`card${i}`);
      if (!el) continue;
      const card = s.hand[i];
      const icon = el.querySelector('.cicon');
      const isAbility = isNonStanceCard(card);
      el.dataset.cardType = !card ? 'empty' : (isAbility ? card.type : 'stance');
      el.setAttribute('aria-label', !card ? 'Empty card slot' : `Play ${card.name} ${isAbility ? 'card' : 'stance card'}`);
      if (icon) {
        icon.textContent = isAbility ? cardInitials(card) : '';
        icon.style.display = 'grid';
        icon.style.placeItems = 'center';
        icon.style.fontWeight = isAbility ? '900' : '';
        icon.style.fontSize = isAbility ? '14px' : '';
        icon.style.letterSpacing = isAbility ? '.06em' : '';
        icon.style.color = isAbility ? '#ffb066' : '';
        icon.style.borderColor = isAbility ? 'rgba(255,176,102,.72)' : '';
        icon.style.background = isAbility ? 'radial-gradient(circle,rgba(255,176,102,.22),rgba(18,36,38,.42))' : '';
      }
      el.style.borderColor = isAbility ? '#a95b35' : '';
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

  const api = {
    get hand() { return s.hand; },
    get upcoming() { return s.draw.slice(0, 4); },
    get drawCount() { return s.draw.length; },
    get discardCount() { return s.discard.length; },
    get shuffling() { return s.shuffleT >= 0; },
    get shuffleT() { return s.shuffleT; },
    get shuffleTime() { return shuffleTime; },
    get pool() { return s.pool.slice(); },
    get runLocked() { return s.runLocked; },

    rebuild(cards) {
      // Once a run loadout is chosen, arena respawns and dev weapon swaps keep
      // that run deck instead of rebuilding a weapon-filtered stance pool.
      applyPool(s.runLocked ? s.pool : cards);
    },

    beginRun(cards, { openingStanceId = 'S24' } = {}) {
      s.runLocked = true;
      applyPool(cards);
      const opening = s.stancePool.find(card => card.id === openingStanceId);
      if (opening) s.lastStance = opening;
    },

    unlockRun() { s.runLocked = false; },

    addCard(card) {
      if (!card) return false;
      s.pool.push(card);
      if (!isNonStanceCard(card)) s.stancePool.push(card);
      // Rewards join the discard so they enter naturally on the next reshuffle.
      s.discard.push(card);
      return true;
    },

    play(slot) {
      if (s.shuffleT >= 0) return null;
      const card = s.hand[slot];
      if (!card) return null;

      if (isNonStanceCard(card)) {
        const canPlayHook = card.canPlayGlobal && typeof window !== 'undefined'
          ? window[card.canPlayGlobal]
          : null;
        if (typeof canPlayHook === 'function' && !canPlayHook(card)) return null;
        const stance = activeStanceFallback();
        if (!stance) return null;
        consumeSlot(slot, card);
        const fire = () => {
          if (typeof window === 'undefined') return;
          const eventName = card.playEvent || 'arena-card:play';
          window.dispatchEvent(new CustomEvent(eventName, { detail:{ card } }));
        };
        if (typeof queueMicrotask === 'function') queueMicrotask(fire); else setTimeout(fire, 0);
        scheduleDecoration();
        // The arena's playCard() function is stance-shaped. Returning a proxy
        // preserves the active stance while the dedicated card event resolves.
        return { ...stance, name:card.name, __abilityProxy:true, __card:card };
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

  // The arena already imports this module, so install the run-draft UI lazily
  // without forcing the large combat page to own another integration layer.
  if (typeof document !== 'undefined' && document.getElementById('startGate')) {
    const install = () => import('./run-draft.js')
      .then(module => module.installRunDraft(api))
      .catch(error => console.error('Run draft UI failed to install', error));
    if (typeof queueMicrotask === 'function') queueMicrotask(install); else setTimeout(install,0);
  }

  return api;
}

// Directional glyph for a chain move, from its ATTACKS entry { group, label }:
// chops point down, risers point up, thrusts point forward.
export function moveArrow({ group, label = '' } = {}) {
  if (group === 'stab')       return /rising/i.test(label) ? '↗' : '→';
  if (group === 'horizontal') return '↔';
  if (group === 'vertical')   return /rising|skyhook|launch|uppercut/i.test(label) ? '↑' : '↓';
  return '·';
}
