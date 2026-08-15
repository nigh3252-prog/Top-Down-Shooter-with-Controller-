import assert from 'node:assert/strict';
import {
  ALL_STANCE_CARDS,
  STARTER_STANCE_IDS_BY_WEAPON,
  starterStanceCardsForWeapon,
  buildRewardPool,
  buildRunOffers,
  drawCards,
} from '../src/run-draft.js';
import { STONE_WEAPONS } from '../src/weapons.js';
import { resolveStanceWeaponCompatibility } from '../src/stance-compatibility.js';

assert.deepEqual(new Set(Object.keys(STARTER_STANCE_IDS_BY_WEAPON)), new Set(Object.keys(STONE_WEAPONS)));
assert.deepEqual(STARTER_STANCE_IDS_BY_WEAPON.dagger, ['S24','S25']);
assert.deepEqual(STARTER_STANCE_IDS_BY_WEAPON.rapier, ['S16','S19']);
assert.deepEqual(STARTER_STANCE_IDS_BY_WEAPON.spear, ['S20','S22']);
assert.deepEqual(STARTER_STANCE_IDS_BY_WEAPON.greatsword, ['S27','S28']);

for (const [weaponId, stanceIds] of Object.entries(STARTER_STANCE_IDS_BY_WEAPON)) {
  assert.equal(stanceIds.length, 2, `${weaponId} should have two starter stances`);
  const cards = starterStanceCardsForWeapon(weaponId);
  assert.deepEqual(cards.map(card => card.id), stanceIds);
  for (const card of cards) {
    const compatibility = resolveStanceWeaponCompatibility({
      stance:card,
      weapon:STONE_WEAPONS[weaponId],
      weaponId,
    });
    assert.notEqual(compatibility.tier, 'unusable', `${weaponId} starter ${card.id} should remain usable`);
  }
}
for (const weaponId of ['rapier', 'spear']) {
  const cards = starterStanceCardsForWeapon(weaponId);
  assert.ok(cards.every(card => card.chain.filter(key => String(key).startsWith('stab')).length >= 2),
    `${weaponId} starter stances should emphasize piercing`);
}
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
  assert.equal(offer.starterStanceIds.length,2);
  assert.ok(offer.cards.every(card => card.type !== 'stance'));
}
assert.deepEqual(offers.find(offer => offer.weaponId === 'spear')?.starterStanceIds, ['S20','S22']);
assert.deepEqual(offers.find(offer => offer.weaponId === 'rapier')?.starterStanceIds, ['S16','S19']);

const rewardPool = buildRewardPool([{ id:'stance' }], nonStances);
assert.deepEqual(rewardPool.map(card => card.id), ['stance','ability','modifier']);
assert.equal(drawCards([{ id:'only' }],3,()=>0).length,3,'small pools should repeat rather than produce empty choices');

console.log('run draft tests passed');
