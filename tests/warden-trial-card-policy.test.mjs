import assert from 'node:assert/strict';
import { createStanceDeck } from '../src/stance-deck.js';
import { STANCE_CARDS } from '../src/stance-cards.js';
import { wizardArcanaCardById } from '../src/wizard-arcana-catalog.js';
import {
  dispatchWardenTrialUpArcana,
  isWardenTrialRuntime,
  isWardenTrialStaminaCard,
  resolveWardenTrialCardPlay,
  starterCardsForWardenTrialWeapon,
  wardenTrialStarterIdsForWeapon,
  wardenTrialUpArcanaIdForCard,
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
assert.equal(wardenTrialUpArcanaIdForCard(longswordDeck[3]), 'RAPID-FIRE-AGENT');
assert.equal(wardenTrialUpArcanaIdForCard(longswordDeck[1]), 'AQUA-VORTEX');
assert.equal(wardenTrialUpArcanaIdForCard(longswordDeck[2]), null);

assert.deepEqual(
  resolveWardenTrialCardPlay({ direction:'up', started:false, card:longswordDeck[3], weaponId:'longsword', deckCards:longswordDeck }),
  { accepted:false, reason:'starter-card-required', started:false, stamina:0, refill:false },
  'the trial still begins with a downward starter play',
);
assert.deepEqual(
  resolveWardenTrialCardPlay({ direction:'up', started:true, card:longswordDeck[3], weaponId:'longsword', deckCards:longswordDeck, stamina:42 }),
  { accepted:true, reason:'arcana-fired', started:true, stamina:42, refill:false, arcanaId:'RAPID-FIRE-AGENT' },
  'S26 fires Rapid Fire Agent upward without changing stamina',
);
assert.deepEqual(
  resolveWardenTrialCardPlay({ direction:'up', started:true, card:longswordDeck[1], weaponId:'longsword', deckCards:longswordDeck, stamina:42 }),
  { accepted:true, reason:'arcana-fired', started:true, stamina:42, refill:false, arcanaId:'AQUA-VORTEX' },
  'S29 fires Aqua Vortex upward without changing stamina',
);
assert.deepEqual(
  resolveWardenTrialCardPlay({ direction:'up', started:true, card:longswordDeck[2], weaponId:'longsword', deckCards:longswordDeck, stamina:42 }),
  { accepted:false, reason:'direction-inert', started:true, stamina:42, refill:false },
  'an unmapped stance remains inert upward',
);
const arcanaDispatches=[];
const dispatcher={
  canPlay(card,context){arcanaDispatches.push({phase:'can-play',card,context});return true;},
  play(card,context){arcanaDispatches.push({phase:'play',card,context});return true;},
};
const rapidFireDispatch=dispatchWardenTrialUpArcana({
  arcanaId:wardenTrialUpArcanaIdForCard(longswordDeck[3]),
  resolveArcanaCard:wizardArcanaCardById,
  dispatcher,
  context:{source:'warden-trial-card',stanceCardId:'S26'},
});
assert.equal(rapidFireDispatch.accepted,true);
assert.equal(rapidFireDispatch.arcanaCard.name,'Rapid Fire Agent');
assert.deepEqual(arcanaDispatches.map(entry=>[entry.phase,entry.card.arcanaId]),[
  ['can-play','RAPID-FIRE-AGENT'],
  ['play','RAPID-FIRE-AGENT'],
]);
const aquaVortexDispatch=dispatchWardenTrialUpArcana({
  arcanaId:wardenTrialUpArcanaIdForCard(longswordDeck[1]),
  resolveArcanaCard:wizardArcanaCardById,
  dispatcher,
});
assert.equal(aquaVortexDispatch.accepted,true);
assert.equal(aquaVortexDispatch.arcanaCard.name,'Aqua Vortex');
let blockedPlay=false;
assert.deepEqual(
  dispatchWardenTrialUpArcana({
    arcanaId:'RAPID-FIRE-AGENT',
    resolveArcanaCard:wizardArcanaCardById,
    dispatcher:{canPlay:()=>false,play:()=>{blockedPlay=true;return true;}},
  }).reason,
  'arcana-not-ready',
);
assert.equal(blockedPlay,false,'a rejected Arcana does not fire or consume the stance card');
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

const weaponDeck=createStanceDeck({rng:()=>0,compatibilityAdapter:null});
const longswordStarters=starterCardsForWardenTrialWeapon('longsword',STANCE_CARDS);
const greatswordStarters=starterCardsForWardenTrialWeapon('greatsword',STANCE_CARDS);
weaponDeck.beginRun(longswordStarters,{openingStanceId:null});
weaponDeck.beginRun(greatswordStarters,{openingStanceId:null});
assert.deepEqual(weaponDeck.pool.map(card=>card.id),['S27','S28'],'a new Warden weapon run replaces the locked prior weapon pool');
assert.equal(weaponDeck.pool.some(card=>card.id==='S22'),false,'Greatsword must not retain Spear starter Hook and Thrust');

console.log('Warden Trial card policy: ok');
