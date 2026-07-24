import assert from 'node:assert/strict';
import { createStanceDeck } from '../src/stance-deck.js';
import { WIZARD_ARCANA_CARDS, isWizardArcanaCard } from '../src/wizard-arcana-cards.js';
import { pointSegmentDistance2D, reflectVelocity2D, segmentIntersection2D } from '../src/wizard-arcana-runtime.js';

if(typeof globalThis.CustomEvent==='undefined'){
  globalThis.CustomEvent=class CustomEvent{
    constructor(type,init={}){this.type=type;this.detail=init.detail;}
  };
}

assert.equal(WIZARD_ARCANA_CARDS.length,6);
assert.equal(new Set(WIZARD_ARCANA_CARDS.map(card=>card.id)).size,6);
assert.ok(WIZARD_ARCANA_CARDS.every(isWizardArcanaCard));
assert.ok(WIZARD_ARCANA_CARDS.every(card=>card.type==='ability'&&card.playEvent==='wizard-arcana:play'));

assert.equal(pointSegmentDistance2D({x:1,z:1},{x:0,z:0},{x:2,z:0}),1);
assert.deepEqual(segmentIntersection2D({x:0,z:0},{x:2,z:0},{x:1,z:-1},{x:1,z:1}),{t:.5,u:.5,x:1,z:0});
const reflected=reflectVelocity2D({x:1,z:0},{x:0,z:-1},{x:0,z:1});
assert.ok(Math.abs(reflected.x+1)<1e-9&&Math.abs(reflected.z)<1e-9);

const events=[];
const stamina={v:31,pending:5,recoverDelayT:.2};
globalThis.window={
  __arena:{arena:{stamina}},
  dispatchEvent:event=>events.push(event),
};
const stance={id:'S-ARCANA-TEST',name:'TEST STANCE',type:'stance',chain:['horizontal4','vertical8','horizontal5']};
const card=WIZARD_ARCANA_CARDS[0];
const deck=createStanceDeck({rng:()=>0});
deck.beginRun([stance,card],{openingStanceId:stance.id});
assert.equal(deck.hand[0].id,card.id);
const proxy=deck.play(0);
assert.equal(proxy.__abilityProxy,true);
assert.equal(proxy.__restoresStamina,false);
stamina.v=100;stamina.pending=0;stamina.recoverDelayT=0;
await Promise.resolve();
assert.deepEqual(stamina,{v:31,pending:5,recoverDelayT:.2});
assert.equal(events.length,1);
assert.equal(events[0].type,'wizard-arcana:play');
assert.equal(events[0].detail.card.id,card.id);

console.log('wizard arcana card tests passed');
