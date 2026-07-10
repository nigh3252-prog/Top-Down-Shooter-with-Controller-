// One Step From Eden-style stance-card deck: a shuffled draw pile feeds two
// hand slots; playing a card discards it and draws its replacement into the
// same slot. When every card has been played (both slots empty, draw pile
// dry) the discard instantly reshuffles into a fresh hand. A manual shuffle
// tosses the current hand and takes a countdown before the new hand arrives.
// Pure logic — no DOM, no stamina (the page owns resources).

export function createStanceDeck({ rng = Math.random, shuffleTime = 2 } = {}) {
  const s = { draw: [], discard: [], hand: [null, null], pool: [], shuffleT: -1 };

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
      s.pool = cards.slice();
      s.shuffleT = -1;
      dealFresh(s.pool);
    },

    play(slot) {
      if (s.shuffleT >= 0) return null;
      const card = s.hand[slot];
      if (!card) return null;
      s.discard.push(card);
      refill(slot);
      // deck fully exhausted: every card sits in the discard — instant reshuffle
      if (!s.hand[0] && !s.hand[1] && !s.draw.length && s.discard.length) dealFresh(s.discard);
      return card;
    },

    startShuffle() {
      if (s.shuffleT >= 0 || !s.pool.length) return false;
      s.discard = [];       // everything (hand included) comes back in the fresh deal
      s.hand = [null, null];
      s.draw = [];
      s.shuffleT = shuffleTime;
      return true;
    },

    update(dt) {
      if (s.shuffleT < 0) return;
      s.shuffleT -= dt;
      if (s.shuffleT <= 0) {
        s.shuffleT = -1;
        dealFresh(s.pool);
      }
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
