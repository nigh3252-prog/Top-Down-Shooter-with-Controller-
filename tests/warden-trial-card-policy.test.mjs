import assert from 'node:assert/strict';
import { createStanceDeck } from '../src/stance-deck.js';
import { STANCE_CARDS } from '../src/stance-cards.js';
import { wizardArcanaCardById } from '../src/wizard-arcana-catalog.js';
import {
  starterArcanaIdsForWeapon,
  WEAPON_STARTER_ARCANA_IDS,
  WEAPON_STARTER_STANCE_IDS,
} from '../src/weapon-stance-plan.js';
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

assert.deepEqual(Object.keys(WEAPON_STARTER_ARCANA_IDS),Object.keys(WEAPON_STARTER_STANCE_IDS));
const allStarterArcanaIds=Object.values(WEAPON_STARTER_ARCANA_IDS).flat();
assert.equal(allStarterArcanaIds.length,22,'every weapon contributes two authored starter Arcana');
assert.equal(new Set(allStarterArcanaIds).size,22,'starter Arcana remain unique even when stance IDs repeat');
for(const [weaponId,stanceIds] of Object.entries(WEAPON_STARTER_STANCE_IDS)){
  const arcanaIds=starterArcanaIdsForWeapon(weaponId);
  assert.equal(stanceIds.length,2,`${weaponId} has two starter stances`);
  assert.equal(arcanaIds.length,2,`${weaponId} has two starter Arcana`);
  for(const [index,stanceId] of stanceIds.entries()){
    const arcanaId=arcanaIds[index];
    assert.ok(wizardArcanaCardById(arcanaId),`${weaponId} starter ${arcanaId} exists in the canonical Arcana catalog`);
    assert.equal(
      wardenTrialUpArcanaIdForCard({id:stanceId},weaponId),
      arcanaId,
      `${weaponId} starter ${stanceId} resolves to its authored Arcana`,
    );
    assert.deepEqual(
      resolveWardenTrialCardPlay({direction:'up',started:true,card:{id:stanceId},weaponId,stamina:42}),
      {accepted:true,reason:'arcana-fired',started:true,stamina:42,refill:false,arcanaId},
      `${weaponId} starter ${stanceId} fires its authored Arcana without changing stamina`,
    );
  }
}
assert.equal(wardenTrialUpArcanaIdForCard({id:'S14'},'katana'),'WIND-SLASH',
  'shared S14 resolves to Katana\'s authored Arcana');
assert.equal(wardenTrialUpArcanaIdForCard({id:'S14'},'whip'),'AIR-BURST',
  'shared S14 resolves to Whip\'s authored Arcana');
assert.equal(wardenTrialUpArcanaIdForCard({id:'S26'},'longsword'),'RAPID-FIRE-AGENT',
  'shared S26 resolves to Longsword\'s authored Arcana');
assert.equal(wardenTrialUpArcanaIdForCard({id:'S26'},'claymore'),'BOUNCING-BLAZE',
  'shared S26 resolves to Claymore\'s authored Arcana');
assert.equal(wardenTrialUpArcanaIdForCard({id:'S27'},'claymore'),'FROST-WING',
  'shared S27 resolves to Claymore\'s authored Arcana');
assert.equal(wardenTrialUpArcanaIdForCard({id:'S27'},'greatsword'),'TERRA-RING',
  'shared S27 resolves to Greatsword\'s authored Arcana');

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
assert.equal(wardenTrialUpArcanaIdForCard(longswordDeck[3], 'longsword'), 'RAPID-FIRE-AGENT');
assert.equal(wardenTrialUpArcanaIdForCard(longswordDeck[1], 'longsword'), 'AQUA-VORTEX');
assert.equal(wardenTrialUpArcanaIdForCard(longswordDeck[2], 'longsword'), null);

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
  arcanaId:wardenTrialUpArcanaIdForCard(longswordDeck[3], 'longsword'),
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
  arcanaId:wardenTrialUpArcanaIdForCard(longswordDeck[1], 'longsword'),
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
  { accepted:true, reason:'stamina-card', started:true, stamina:200, refill:true },
  'the first eligible downward card starts the trial and fills the doubled stamina bar',
);
assert.deepEqual(
  resolveWardenTrialCardPlay({ direction:'down', started:true, card:longswordDeck[3], weaponId:'longsword', deckCards:longswordDeck, stamina:0 }),
  { accepted:true, reason:'stamina-card', started:true, stamina:200, refill:true },
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
