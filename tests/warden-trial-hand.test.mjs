import assert from 'node:assert/strict';
import {
  createWardenTrialDiscardDrawCharge,
  createWardenTrialHand,
  hasNearbyWardenTrialEnemy,
} from '../src/warden-trial-hand.js';

const up = id => Object.freeze({ id, name:id, __wardenTrialCard:true, __wardenTrialCardId:`up:${id}`, __wardenTrialDirection:'up' });
const down = id => Object.freeze({ id, name:id, __wardenTrialCard:true, __wardenTrialCardId:`down:${id}`, __wardenTrialDirection:'down' });

const allUpHand=createWardenTrialHand({rng:()=>.999999});
allUpHand.beginRun([down('D0'),up('A1'),up('A2'),up('A3')]);
assert.deepEqual(allUpHand.hand,[null,null,null],'a run starts with no cards until the free draw is pressed');
const allUpDeal=allUpHand.discardAndDraw();
assert.equal(allUpDeal.drawn.length,3);
assert.ok(allUpHand.hand.every(card=>card.__wardenTrialDirection==='up'),'draws are random deck draws with no direction normalization');
const allDownHand=createWardenTrialHand({rng:()=>.999999});
allDownHand.beginRun([up('A0'),down('D1'),down('D2'),down('D3')]);
allDownHand.discardAndDraw();
assert.ok(allDownHand.hand.every(card=>card.__wardenTrialDirection==='down'),'an all-Stance hand is equally valid');

const hand=createWardenTrialHand({rng:()=>.999999});
const cards=[down('D0'),up('A1'),up('A2'),down('D1')];
hand.beginRun(cards);
hand.discardAndDraw();
const firstUpSlot=hand.hand.findIndex(card=>card?.__wardenTrialDirection==='up');
const firstUp=hand.hand[firstUpSlot];
assert.equal(hand.play(firstUpSlot,'down'),null,'an Up card cannot be played downward');
assert.equal(hand.hand[firstUpSlot],firstUp,'a rejected direction does not consume the card');
const firstPlay=hand.play(firstUpSlot,'up');
assert.equal(firstPlay.card,firstUp);
assert.equal(hand.slots.up,firstUp,'a played Ability moves into the Up slot');
assert.equal(hand.hand.filter(Boolean).length,2,'playing is one-shot and does not auto-draw a replacement');

const secondUpSlot=hand.hand.findIndex(card=>card?.__wardenTrialDirection==='up');
assert.ok(secondUpSlot>=0,'the fixture contains a second Up card');
const secondUp=hand.hand[secondUpSlot];
const replacement=hand.play(secondUpSlot,'up');
assert.equal(replacement.replaced,firstUp);
assert.equal(hand.slots.up,secondUp,'a later Up card replaces the displayed Up slot card');
assert.equal(hand.discardCount,1,'the replaced slot card enters discard exactly once');
const cardsBeforeRedeal=[...hand.hand.filter(Boolean),...Object.values(hand.slots).filter(Boolean)];
const redeal=hand.discardAndDraw();
assert.equal(redeal.discarded.length,cardsBeforeRedeal.length,'redeal sweeps every remaining hand and slot card once');
assert.deepEqual(hand.slots,{up:null,down:null});
assert.equal(redeal.drawn.length,3);

const charge=createWardenTrialDiscardDrawCharge({requiredSeconds:4});
assert.deepEqual(charge.snapshot(),{opening:true,available:true,chargedSeconds:4,requiredSeconds:4,progress:1});
assert.equal(charge.spend(),true,'the opening draw is free');
assert.equal(charge.snapshot().available,false);
charge.update(1.5,{nearEnemy:true,active:true});
assert.equal(charge.snapshot().chargedSeconds,1.5);
charge.update(10,{nearEnemy:false,active:true});
assert.equal(charge.snapshot().chargedSeconds,1.5,'leaving proximity pauses instead of resetting or advancing charge');
charge.update(1,{nearEnemy:true,active:false});
assert.equal(charge.snapshot().chargedSeconds,1.5,'pause and reward gates pause charge');
charge.update(10,{nearEnemy:true,active:true});
assert.equal(charge.snapshot().chargedSeconds,4);
assert.equal(charge.snapshot().available,true);
assert.equal(charge.spend(),true);
assert.equal(charge.spend(),false,'the meter stores at most one redeal');

const player={x:0,z:0};
assert.equal(hasNearbyWardenTrialEnemy({player,enemies:[{x:7,z:0,hp:1}],range:8}),true);
assert.equal(hasNearbyWardenTrialEnemy({player,enemies:[{x:7,z:0,hp:0}],range:8}),false,'dead enemies do not charge redeal');
assert.equal(hasNearbyWardenTrialEnemy({player,enemies:[{x:9,z:0,hp:1}],range:8}),false);

console.log('Warden Trial three-card hand: ok');
