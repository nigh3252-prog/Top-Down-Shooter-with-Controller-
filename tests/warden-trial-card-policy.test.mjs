import assert from 'node:assert/strict';
import {
  isWardenTrialRuntime,
  isWardenTrialStaminaCard,
  resolveWardenTrialCardPlay,
  starterCardsForWardenTrialWeapon,
  wardenTrialStarterIdsForWeapon,
} from '../src/warden-trial-card-policy.js';

assert.equal(isWardenTrialRuntime({ variant:'warden-trial' }), true);
assert.equal(isWardenTrialRuntime({ wardenTrial:true }), true);
assert.equal(isWardenTrialRuntime({ mode:'arena' }), false);

const longswordDeck = [
  { id:'A01', type:'ability' },
  { id:'S29', name:'S29 Crossguard Bloom', type:'stance' },
  { id:'S24', name:'S24 Rat Step', type:'stance' },
  { id:'S26', name:'S26 Long Blade Form', type:'stance' },
];

assert.deepEqual(wardenTrialStarterIdsForWeapon('longsword'), ['S26','S29']);
assert.deepEqual(
  starterCardsForWardenTrialWeapon('longsword', longswordDeck).map(card => card.id),
  ['S26','S29'],
  'the trial starter view should follow the authored weapon order',
);
assert.equal(isWardenTrialStaminaCard(longswordDeck[3], { weaponId:'longsword', deckCards:longswordDeck }), true);
assert.equal(isWardenTrialStaminaCard(longswordDeck[2], { weaponId:'longsword', deckCards:longswordDeck }), false,
  'Rat Step must not become a Longsword stamina card just because it exists in the registry');
assert.equal(isWardenTrialStaminaCard(longswordDeck[0], { weaponId:'longsword', deckCards:longswordDeck }), false,
  'non-stance cards cannot refill the trial');
assert.equal(isWardenTrialStaminaCard(longswordDeck[3], { weaponId:'longsword', deckCards:[longswordDeck[1]] }), false,
  'a starter card must still be present in the active deck');

assert.deepEqual(
  resolveWardenTrialCardPlay({ direction:'up', started:false, card:longswordDeck[3], weaponId:'longsword', deckCards:longswordDeck }),
  { accepted:false, reason:'direction-inert', started:false, stamina:0, refill:false },
  'upward registration must not start the trial or refill stamina',
);
assert.deepEqual(
  resolveWardenTrialCardPlay({ direction:'down', started:false, card:longswordDeck[3], weaponId:'longsword', deckCards:longswordDeck }),
  { accepted:true, reason:'stamina-card', started:true, stamina:100, refill:true },
  'the first eligible downward card starts the trial and fills stamina',
);
assert.deepEqual(
  resolveWardenTrialCardPlay({ direction:'down', started:true, card:longswordDeck[3], weaponId:'longsword', deckCards:longswordDeck, stamina:0 }),
  { accepted:true, reason:'stamina-card', started:true, stamina:100, refill:true },
  'an eligible starter card is the exhaustion recovery path',
);
assert.deepEqual(
  resolveWardenTrialCardPlay({ direction:'down', started:true, card:longswordDeck[0], weaponId:'longsword', deckCards:longswordDeck, stamina:0 }),
  { accepted:true, reason:'card-played', started:true, stamina:0, refill:false },
  'a non-stamina card cannot refill an exhausted trial',
);

console.log('Warden Trial card policy: ok');
