import assert from 'node:assert/strict';
import { STANCE_CARDS } from '../src/stance-cards.js';
import { wizardArcanaCardById } from '../src/wizard-arcana-catalog.js';
import {
  dispatchWardenTrialUpArcana,
  isWardenTrialRuntime,
  isWardenTrialStaminaCard,
  resolveWardenTrialCardPlay,
  starterCardsForWardenTrialWeapon,
  wardenTrialCardDirection,
  wardenTrialUpArcanaIdForCard,
} from '../src/warden-trial-card-policy.js';
import {
  WARDEN_TRIAL_CARD_DOWN_COOLDOWN_SECONDS,
  WARDEN_TRIAL_CARD_UP_COOLDOWN_SECONDS,
  createWardenTrialCardCooldown,
  wardenTrialCardCooldownSeconds,
  wardenTrialCardTiming,
} from '../src/warden-trial-card-cooldown.js';
import { createWardenTrialHand } from '../src/warden-trial-hand.js';

assert.equal(isWardenTrialRuntime({variant:'warden-trial'}),true);
assert.equal(isWardenTrialRuntime({mode:'arena'}),false);
assert.equal(WARDEN_TRIAL_CARD_UP_COOLDOWN_SECONDS,3);
assert.equal(WARDEN_TRIAL_CARD_DOWN_COOLDOWN_SECONDS,1);
assert.equal(wardenTrialCardCooldownSeconds('up'),3);
assert.equal(wardenTrialCardCooldownSeconds('down'),1);
assert.equal(wardenTrialCardCooldownSeconds('up',{abilityCooldowns:false}),0);
assert.equal(wardenTrialCardCooldownSeconds('down',{abilityCooldowns:false}),1);

const starters=starterCardsForWardenTrialWeapon('longsword',STANCE_CARDS);
assert.equal(starters.length,4,'each weapon starts with two independent Abilities and two independent Stances');
assert.deepEqual(starters.map(wardenTrialCardDirection),['up','down','up','down']);
const [rapidFire,longBlade,aquaVortex,crossguard]=starters;
assert.equal(wardenTrialUpArcanaIdForCard(rapidFire),'RAPID-FIRE-AGENT');
assert.equal(wardenTrialUpArcanaIdForCard(longBlade),null,'a Stance has no hidden upward ability');
assert.equal(isWardenTrialStaminaCard(longBlade,{deckCards:starters}),true);
assert.equal(isWardenTrialStaminaCard(rapidFire,{deckCards:starters}),false);

assert.deepEqual(
  resolveWardenTrialCardPlay({direction:'up',started:false,card:rapidFire,deckCards:starters,stamina:0}),
  {accepted:false,reason:'draw-required',started:false,stamina:0,refill:false},
  'cards cannot replace the initial Draw 3 action',
);
assert.deepEqual(
  resolveWardenTrialCardPlay({direction:'down',started:true,card:rapidFire,deckCards:starters,stamina:12}),
  {accepted:false,reason:'wrong-direction',started:true,stamina:12,refill:false},
);
assert.deepEqual(
  resolveWardenTrialCardPlay({direction:'up',started:true,card:rapidFire,deckCards:starters,stamina:12}),
  {accepted:true,reason:'arcana-fired',started:true,stamina:12,refill:false,arcanaId:'RAPID-FIRE-AGENT'},
);
assert.deepEqual(
  resolveWardenTrialCardPlay({direction:'down',started:true,card:longBlade,deckCards:starters,stamina:0,maxStamina:200}),
  {accepted:true,reason:'stamina-card',started:true,stamina:200,refill:true},
);
assert.equal(wardenTrialUpArcanaIdForCard(aquaVortex),'AQUA-VORTEX');
assert.equal(isWardenTrialStaminaCard(crossguard,{deckCards:starters}),true);

const dispatches=[];
const dispatch=dispatchWardenTrialUpArcana({
  arcanaId:'RAPID-FIRE-AGENT',
  resolveArcanaCard:wizardArcanaCardById,
  dispatcher:{
    canPlay(card){dispatches.push(['can',card.arcanaId]);return true;},
    play(card){dispatches.push(['play',card.arcanaId]);return true;},
  },
});
assert.equal(dispatch.accepted,true);
assert.deepEqual(dispatches,[['can','RAPID-FIRE-AGENT'],['play','RAPID-FIRE-AGENT']]);

const cooldown=createWardenTrialCardCooldown();
assert.equal(cooldown.snapshot().phase,'ready');
const upStart=cooldown.begin(rapidFire);
assert.equal(upStart.accepted,true);
assert.equal(upStart.effectReady,true);
assert.equal(upStart.snapshot.phase,'cooldown');
assert.equal(upStart.snapshot.remaining,3);
const blocked=cooldown.begin(longBlade);
assert.equal(blocked.accepted,false,'the one global lane rejects Down while an Up card is cooling');
assert.equal(blocked.snapshot.direction,'up');
assert.equal(cooldown.update(3).snapshot.phase,'ready');
assert.equal(cooldown.begin(longBlade).snapshot.remaining,1);
assert.equal(cooldown.update(1).snapshot.phase,'ready');

const futureCard=Object.freeze({
  ...rapidFire,
  __wardenTrialCardId:'up:FUTURE',
  __wardenTrialTiming:Object.freeze({setupSeconds:.5,cooldownSeconds:2}),
});
assert.deepEqual(wardenTrialCardTiming(futureCard),{cardId:'up:FUTURE',direction:'up',setupSeconds:.5,cooldownSeconds:2});
const setup=cooldown.begin(futureCard);
assert.equal(setup.effectReady,false);
assert.equal(setup.snapshot.phase,'setup');
assert.equal(cooldown.update(.4).effectReady,false);
const resolves=cooldown.update(.2);
assert.equal(resolves.effectReady,true,'effect resolution is emitted at the setup/cooldown boundary');
assert.equal(resolves.snapshot.phase,'cooldown');
assert.ok(Math.abs(resolves.snapshot.remaining-1.9)<1e-9);

const hand=createWardenTrialHand({rng:()=>.999999});
hand.beginRun(starters);
hand.discardAndDraw();
const beforeRedeal=cooldown.snapshot();
hand.discardAndDraw();
assert.deepEqual(cooldown.snapshot(),beforeRedeal,'discard and draw does not reset an active card-system timer');

console.log('Warden Trial independent card policy: ok');
