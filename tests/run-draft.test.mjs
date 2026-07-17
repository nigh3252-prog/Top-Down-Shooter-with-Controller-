import assert from 'node:assert/strict';
import { createStanceDeck } from '../src/stance-deck.js';
import { NON_STANCE_CARDS } from '../src/ability-cards.js';
import { buildRewardPool, buildRunOffers, drawCards, STARTER_STANCE_IDS } from '../src/run-draft.js';

const ratStep = { id:'S24', name:'S24 Rat Step', chain:['a','b','c'] };
const deepLaunch = { id:'S09', name:'S09 Deep Launch', chain:['a','b','c'] };
const otherStance = { id:'S99', name:'S99 Test', chain:['a','b','c'], preferredWeapons:['dagger'] };
const ability = NON_STANCE_CARDS[0];

assert.deepEqual(STARTER_STANCE_IDS, ['S24','S09']);
assert.equal(drawCards([ability], 2, () => 0).length, 2, 'small pools repeat to fill starter slots');

const offers = buildRunOffers({ weaponOrder:['spear','rapier','mace'], nonStancePool:[ability], rng:()=>0 });
assert.equal(offers.length, 3);
assert.equal(new Set(offers.map(offer => offer.weaponId)).size, 3, 'three available weapons remain distinct');
assert.ok(offers.every(offer => offer.cards.length === 2 && offer.cards.every(card => card.type !== 'stance')));

const rewards = buildRewardPool([ratStep, otherStance], [ability]);
assert.deepEqual(rewards, [ratStep, otherStance, ability], 'reward pool ignores preferredWeapons metadata');

const deck = createStanceDeck({ rng:()=>0, shuffleTime:1 });
deck.beginRun([ratStep, deepLaunch, ability, ability]);
assert.equal(deck.runLocked, true);
assert.equal(deck.pool.length, 4);

deck.addCard(otherStance);
assert.equal(deck.pool.length, 5);
deck.rebuild([ratStep]);
assert.equal(deck.pool.length, 5, 'respawn rebuild preserves the chosen run deck');

deck.unlockRun();
deck.rebuild([ratStep]);
assert.equal(deck.pool.length, 1, 'unlocked rebuild accepts a fresh setup pool');

console.log('run draft tests passed');
