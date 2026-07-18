import assert from 'node:assert/strict';
import {
  ALL_STANCE_CARDS,
  STARTER_STANCE_IDS,
  buildRewardPool,
  buildRunOffers,
  drawCards,
} from '../src/run-draft.js';

assert.deepEqual(STARTER_STANCE_IDS, ['S24','S09']);
assert.ok(ALL_STANCE_CARDS.some(card => card.id === 'S31-BING-BONG'), 'Bing Bong should be in unrestricted stance rewards');

const nonStances = [
  { id:'ability', type:'ability' },
  { id:'modifier', type:'modifier' },
];
const offers = buildRunOffers({
  weaponOrder:['sword','spear','rapier'],
  nonStancePool:nonStances,
  count:3,
  rng:()=>.25,
});
assert.equal(offers.length,3);
assert.equal(new Set(offers.map(offer => offer.weaponId)).size,3);
for (const offer of offers) {
  assert.equal(offer.cards.length,2);
  assert.ok(offer.cards.every(card => card.type !== 'stance'));
}

const rewardPool = buildRewardPool([{ id:'stance' }], nonStances);
assert.deepEqual(rewardPool.map(card => card.id), ['stance','ability','modifier']);
assert.equal(drawCards([{ id:'only' }],3,()=>0).length,3,'small pools should repeat rather than produce empty choices');

console.log('run draft tests passed');
