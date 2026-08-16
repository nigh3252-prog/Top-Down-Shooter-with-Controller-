import assert from 'node:assert/strict';
import { listCards } from '../src/card-registry.js';
import { createStanceDeck } from '../src/stance-deck.js';
import { STANCE_CARDS } from '../src/stance-cards.js';
import { arcanaDownStanceId } from '../src/arcana-stance-pairings.js';
import { starterArcanaIdsForWeapon } from '../src/weapon-stance-plan.js';
import {
  isWardenTrialRuntime,
  isWardenTrialArcanaCard,
  isWardenTrialStaminaCard,
  resolveWardenTrialCardPlay,
  starterCardsForWardenTrialWeapon,
  wardenTrialStarterArcanaIdsForWeapon,
  wardenTrialStarterIdsForWeapon,
} from '../src/warden-trial-card-policy.js';

assert.equal(isWardenTrialRuntime({ variant:'warden-trial' }), true);
assert.equal(isWardenTrialRuntime({ wardenTrial:true }), true);
assert.equal(isWardenTrialRuntime({ mode:'arena' }), false);

const arcanaDeck=listCards({family:'arcana'});
const arcanaById=new Map(arcanaDeck.map(card=>[card.arcanaId,card]));
const rapidFire=arcanaById.get('RAPID-FIRE-AGENT');
const aquaVortex=arcanaById.get('AQUA-VORTEX');
const flameStrike=arcanaById.get('FLAME-STRIKE');
const longBlade=STANCE_CARDS.find(card=>card.id==='S26');
assert.ok(rapidFire&&aquaVortex&&flameStrike&&longBlade);

assert.deepEqual(wardenTrialStarterIdsForWeapon('longsword'), ['S26','S29']);
assert.deepEqual(wardenTrialStarterArcanaIdsForWeapon('longsword'), ['RAPID-FIRE-AGENT','AQUA-VORTEX']);
assert.deepEqual(
  starterCardsForWardenTrialWeapon('longsword', arcanaDeck).map(card => card.arcanaId),
  ['RAPID-FIRE-AGENT','AQUA-VORTEX'],
  'the trial starter view should return the two combined cards in authored weapon order',
);
assert.equal(isWardenTrialStaminaCard(rapidFire, { weaponId:'longsword', deckCards:arcanaDeck }), true);
assert.equal(isWardenTrialStaminaCard(aquaVortex, { weaponId:'longsword', deckCards:arcanaDeck }), true);
assert.equal(isWardenTrialStaminaCard(flameStrike, { weaponId:'longsword', deckCards:arcanaDeck }), false,
  'a different combined card cannot start the Longsword trial');
assert.equal(isWardenTrialStaminaCard(longBlade, { weaponId:'longsword', deckCards:arcanaDeck }), false,
  'a bare stance is never a Warden Trial starter card');
assert.equal(isWardenTrialArcanaCard(rapidFire), true);
assert.equal(isWardenTrialArcanaCard(longBlade), false);
assert.equal(isWardenTrialStaminaCard(rapidFire, { weaponId:'longsword', deckCards:[aquaVortex] }), false,
  'a combined starter card must still be present in the active deck');

assert.deepEqual(
  resolveWardenTrialCardPlay({ direction:'up', started:false, card:rapidFire, weaponId:'longsword', deckCards:arcanaDeck }),
  { accepted:false, reason:'starter-card-required', started:false, stamina:0, refill:false },
  'even the correct combined starter must be played down to start the trial',
);
assert.deepEqual(
  resolveWardenTrialCardPlay({ direction:'up', started:true, card:flameStrike, weaponId:'longsword', deckCards:arcanaDeck, stamina:42 }),
  { accepted:true, reason:'arcana-fired', started:true, stamina:42, refill:false },
  'an upward Arcana play fires after the trial has started',
);
assert.deepEqual(
  resolveWardenTrialCardPlay({ direction:'up', started:true, card:longBlade, weaponId:'longsword', deckCards:arcanaDeck, stamina:42 }),
  { accepted:false, reason:'direction-inert', started:true, stamina:42, refill:false },
  'standalone stance cards are inert in the combined-card trial',
);
assert.deepEqual(
  resolveWardenTrialCardPlay({ direction:'down', started:false, card:rapidFire, weaponId:'longsword', deckCards:arcanaDeck }),
  { accepted:true, reason:'stamina-card', started:true, stamina:100, refill:true },
  'the first eligible combined card starts the trial and fills stamina when played down',
);
assert.deepEqual(
  resolveWardenTrialCardPlay({ direction:'down', started:true, card:aquaVortex, weaponId:'longsword', deckCards:arcanaDeck, stamina:0 }),
  { accepted:true, reason:'stamina-card', started:true, stamina:100, refill:true },
  'a starter combined card still changes stance and restores stamina after startup',
);
assert.deepEqual(
  resolveWardenTrialCardPlay({ direction:'down', started:true, card:flameStrike, weaponId:'longsword', deckCards:arcanaDeck, stamina:0 }),
  { accepted:true, reason:'card-played', started:true, stamina:100, refill:true },
  'every combined card restores stamina when its stance side is played down',
);
assert.deepEqual(
  resolveWardenTrialCardPlay({ direction:'down', started:false, card:flameStrike, weaponId:'longsword', deckCards:arcanaDeck }),
  { accepted:false, reason:'starter-card-required', started:false, stamina:0, refill:false },
  'a non-starter combined card cannot open the trial',
);
assert.deepEqual(
  resolveWardenTrialCardPlay({ direction:'down', started:true, card:longBlade, weaponId:'longsword', deckCards:arcanaDeck }),
  { accepted:false, reason:'direction-inert', started:true, stamina:0, refill:false },
  'a bare stance cannot enter the combined-card play path',
);

const weaponDeck=createStanceDeck({
  rng:()=>0,
  compatibilityAdapter:null,
  stanceCatalog:STANCE_CARDS,
  cardDispatcher:{canPlay:()=>true,play:()=>true},
});
weaponDeck.beginRun(arcanaDeck,{openingStanceId:null,openingCardIds:starterArcanaIdsForWeapon('longsword')});
assert.equal(weaponDeck.pool.length,70,'the Warden run contains every combined Arcana card');
assert.ok(weaponDeck.pool.every(isWardenTrialArcanaCard),'the Warden run contains no bare stance cards');
assert.deepEqual(
  weaponDeck.hand.map(card=>card.arcanaId).sort(),
  starterArcanaIdsForWeapon('longsword').slice().sort(),
  'Longsword opens with Rapid Fire Agent / S26 and Aqua Vortex / S29',
);
const openingCard=weaponDeck.hand[0];
const pairedStance=weaponDeck.play(0,{direction:'down'});
assert.equal(pairedStance.id,arcanaDownStanceId(openingCard.arcanaId),'playing the opening card down enters its printed stance');
const preservedStance=weaponDeck.play(0,{direction:'up'});
assert.equal(preservedStance.id,pairedStance.id,'playing the next Arcana up preserves the active paired stance');

weaponDeck.beginRun(arcanaDeck,{openingStanceId:null,openingCardIds:starterArcanaIdsForWeapon('greatsword')});
assert.deepEqual(
  weaponDeck.hand.map(card=>card.arcanaId).sort(),
  starterArcanaIdsForWeapon('greatsword').slice().sort(),
  'a weapon swap resets the opening hand to the new weapon combined starters',
);

console.log('Warden Trial card policy: ok');
