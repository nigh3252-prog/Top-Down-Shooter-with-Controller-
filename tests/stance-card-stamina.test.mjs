import assert from 'node:assert/strict';
import { provideArenaRuntime } from '../src/arena-runtime-context.js';
import {
  cardRestoresStamina,
  captureStaminaState,
  createStanceDeck,
  restoreStaminaState,
} from '../src/stance-deck.js';

if (typeof globalThis.CustomEvent === 'undefined') {
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };
}

const events = [];
const stamina = { v:37, pending:9, recoverDelayT:.25 };
globalThis.window = {
  __arena:{ arena:{ stamina } },
  __POWBUNKER_CAN_PLAY__:() => true,
  dispatchEvent:event => events.push(event.type),
};
provideArenaRuntime({config:{mode:'arena',enemyLab:false},arena:{stamina}});

assert.equal(cardRestoresStamina({ type:'stance' }), true);
assert.equal(cardRestoresStamina({ type:'ability' }), false);
assert.equal(cardRestoresStamina({ type:'modifier' }), false);
assert.equal(cardRestoresStamina({ __restoresStamina:false }), false);

const snapshot = captureStaminaState(stamina);
stamina.v = 100;
stamina.pending = 0;
stamina.recoverDelayT = 0;
assert.equal(restoreStaminaState(stamina, snapshot), true);
assert.deepEqual(stamina, { v:37, pending:9, recoverDelayT:.25 });

const stance = {
  id:'S01-TEST',
  name:'S01 TEST STANCE',
  type:'stance',
  chain:['horizontal4', 'vertical8', 'horizontal5'],
};
const deck = createStanceDeck({ rng:() => 0 });
deck.rebuild([stance]);

// Deterministic shuffle puts Bing Bong in slot 0 and Pilebunker in slot 1.
assert.equal(deck.hand[0].type, 'stance');
assert.equal(deck.hand[1].type, 'ability');
assert.equal(cardRestoresStamina(deck.hand[0]), true);

stamina.v = 42;
stamina.pending = 6;
stamina.recoverDelayT = .12;
const abilityProxy = deck.play(1);
assert.equal(abilityProxy.__abilityProxy, true);
assert.equal(abilityProxy.__restoresStamina, false);

// Simulate combat-arena's existing unconditional post-play refill.
stamina.v = 100;
stamina.pending = 0;
stamina.recoverDelayT = 0;
await Promise.resolve();
assert.deepEqual(stamina, { v:42, pending:6, recoverDelayT:.12 });
assert.deepEqual(events, ['powbunker:play']);

// Pilebunker drew Blood Slash into the same slot.
assert.equal(deck.hand[1].type, 'modifier');
stamina.v = 19;
stamina.pending = 4;
stamina.recoverDelayT = .08;
const modifierProxy = deck.play(1);
assert.equal(modifierProxy.__modifierProxy, true);
assert.equal(modifierProxy.__restoresStamina, false);

stamina.v = 100;
stamina.pending = 0;
stamina.recoverDelayT = 0;
await Promise.resolve();
assert.deepEqual(stamina, { v:19, pending:4, recoverDelayT:.08 });
assert.deepEqual(events, ['powbunker:play', 'bloodslash:play']);

console.log('stance stamina policy tests passed');
