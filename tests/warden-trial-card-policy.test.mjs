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
import {
  WARDEN_TRIAL_CARD_DOWN_COOLDOWN_SECONDS,
  WARDEN_TRIAL_CARD_UP_COOLDOWN_SECONDS,
  createWardenTrialCardCooldown,
  wardenTrialCardCooldownSeconds,
} from '../src/warden-trial-card-cooldown.js';

assert.equal(isWardenTrialRuntime({ variant:'warden-trial' }), true);
assert.equal(isWardenTrialRuntime({ wardenTrial:true }), true);
assert.equal(isWardenTrialRuntime({ mode:'arena' }), false);
assert.equal(WARDEN_TRIAL_CARD_UP_COOLDOWN_SECONDS,3);
assert.equal(WARDEN_TRIAL_CARD_DOWN_COOLDOWN_SECONDS,1);
assert.equal(wardenTrialCardCooldownSeconds('up'),3);
assert.equal(wardenTrialCardCooldownSeconds('down'),1);
assert.equal(wardenTrialCardCooldownSeconds('up',{abilityCooldowns:false}),0,'the toggle removes only the upward ability cooldown');
assert.equal(wardenTrialCardCooldownSeconds('down',{abilityCooldowns:false}),1,'the downward stance cooldown remains authored');
assert.equal(wardenTrialCardCooldownSeconds('sideways'),0);

const cardCooldown=createWardenTrialCardCooldown();
assert.deepEqual(cardCooldown.snapshot(),{active:false,direction:null,duration:0,remaining:0,progress:0});
assert.deepEqual(cardCooldown.begin('up'),{active:true,direction:'up',duration:3,remaining:3,progress:1});
const partialUpCooldown=cardCooldown.update(1.25);
assert.equal(partialUpCooldown.direction,'up');
assert.equal(partialUpCooldown.remaining,1.75);
assert.ok(Math.abs(partialUpCooldown.progress-(1.75/3))<1e-9);
assert.deepEqual(cardCooldown.begin('down'),{active:true,direction:'down',duration:1,remaining:1,progress:1},
  'a successful downward play starts its shorter cooldown immediately');
assert.deepEqual(cardCooldown.update(1),{active:false,direction:null,duration:0,remaining:0,progress:0});
assert.deepEqual(cardCooldown.reset(),{active:false,direction:null,duration:0,remaining:0,progress:0});
assert.deepEqual(cardCooldown.begin('up',{abilityCooldowns:false}),{active:false,direction:null,duration:0,remaining:0,progress:0},
  'an upward ability play skips the card lock when the toggle is off');
assert.deepEqual(cardCooldown.begin('down',{abilityCooldowns:false}),{active:true,direction:'down',duration:1,remaining:1,progress:1},
  'a downward stance play still starts its one-second lock when ability cooldowns are off');
cardCooldown.reset();

assert.deepEqual(Object.keys(WEAPON_STARTER_ARCANA_IDS),Object.keys(WEAPON_STARTER_STANCE_IDS));
const allStarterArcanaIds=Object.values(WEAPON_STARTER_ARCANA_IDS).flat();
assert.equal(allStarterArcanaIds.length,22,'every weapon contributes two authored starter Arcana');
assert.equal(new Set(allStarterArcanaIds).size,22,'starter Arcana remain unique even when stance IDs repeat');
assert.deepEqual(starterArcanaIdsForWeapon('rapier'), ['ICE-DAGGER', 'STAR-BOLT'],
  'Rapier starts with Ice Dagger after Perforating Jet becomes generated-only');
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

const rapierStarters = starterCardsForWardenTrialWeapon('rapier', STANCE_CARDS);
assert.deepEqual(rapierStarters.map(card => card.__wardenTrialArcanaId), ['ICE-DAGGER', 'STAR-BOLT']);
assert.deepEqual(rapierStarters.map(card => card.id), ['S07', 'S19'],
  'Warden starter cards use each replacement Arcana\'s authored down-side stance');

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
assert.equal(weaponDeck.handSize,2,'the shared deck keeps its normal two-card default');

const trialQueueDeck=createStanceDeck({rng:()=>0,handSize:1,compatibilityAdapter:null});
trialQueueDeck.beginRun(longswordStarters,{openingStanceId:null});
assert.equal(trialQueueDeck.handSize,1,'Warden Trial can opt into one authoritative current card');
assert.equal(trialQueueDeck.hand.length,1,'the one-card option does not park a second hidden hand card');
assert.equal(trialQueueDeck.drawCount,1,'the other starter remains honestly counted in the draw pile');
const expectedNextCard=trialQueueDeck.upcoming[0];
const firstTrialCard=trialQueueDeck.hand[0];
assert.ok(firstTrialCard&&expectedNextCard&&firstTrialCard!==expectedNextCard,'the active and next cards are distinct authored starters');
assert.equal(trialQueueDeck.play(0),firstTrialCard,'the current Warden card plays through the shared deck');
assert.equal(trialQueueDeck.hand[0],expectedNextCard,'the displayed preview becomes the next active card');
assert.equal(trialQueueDeck.drawCount,0,'drawing the preview decrements the visible draw count');
assert.equal(trialQueueDeck.discardCount,1,'playing the active card increments the visible discard count');
trialQueueDeck.play(0);
assert.equal(trialQueueDeck.discardCount,0,'exhausting the one-card queue reshuffles its discard pile');
assert.equal(trialQueueDeck.drawCount,1,'the reshuffled two-card deck exposes one current and one upcoming card');

console.log('Warden Trial card policy: ok');
