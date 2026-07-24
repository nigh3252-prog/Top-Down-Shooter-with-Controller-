import assert from 'node:assert/strict';
import { createStanceDeck } from '../src/stance-deck.js';
import { claimArcanaTileDecoration } from '../src/enemy-lab-deck-editor-refinements.js';
import { WIZARD_ARCANA_CARDS, isWizardArcanaCard } from '../src/wizard-arcana-cards.js';
import {
  FLAME_CROSS_BEATS,
  flameCrossWaveSpec,
  pointSegmentDistance2D,
  reflectVelocity2D,
  segmentIntersection2D,
} from '../src/wizard-arcana-runtime.js';

if(typeof globalThis.CustomEvent==='undefined'){
  globalThis.CustomEvent=class CustomEvent{
    constructor(type,init={}){this.type=type;this.detail=init.detail;}
  };
}

assert.equal(WIZARD_ARCANA_CARDS.length,6);
assert.equal(new Set(WIZARD_ARCANA_CARDS.map(card=>card.id)).size,6);
assert.ok(WIZARD_ARCANA_CARDS.every(isWizardArcanaCard));
assert.ok(WIZARD_ARCANA_CARDS.every(card=>card.type==='ability'&&card.playEvent==='wizard-arcana:play'));

const flameCross=WIZARD_ARCANA_CARDS.find(card=>card.arcanaId==='FLAME-CROSS');
assert.match(flameCross.description,/one diagonal flame wave/i);
assert.deepEqual(FLAME_CROSS_BEATS.map(beat=>beat.sides.length),[1,1,2]);
assert.equal(FLAME_CROSS_BEATS.flatMap(beat=>beat.sides).length,4);
assert.ok(FLAME_CROSS_BEATS[0].time<FLAME_CROSS_BEATS[1].time&&FLAME_CROSS_BEATS[1].time<FLAME_CROSS_BEATS[2].time);
const baseRight=flameCrossWaveSpec({side:1,finisher:false});
const baseLeft=flameCrossWaveSpec({side:-1,finisher:false});
const finisher=flameCrossWaveSpec({side:1,finisher:true});
assert.ok(baseRight.lateralOffset>0&&baseRight.lateralAim<0,'right-starting wave must travel back across the aim line');
assert.ok(baseLeft.lateralOffset<0&&baseLeft.lateralAim>0,'left-starting wave must mirror across the aim line');
assert.equal(baseRight.damage,6);
assert.equal(finisher.damage,9);
assert.ok(finisher.range>baseRight.range&&finisher.push>baseRight.push);

const decorationTile={dataset:{}};
assert.equal(claimArcanaTileDecoration(decorationTile,WIZARD_ARCANA_CARDS[0]),true);
assert.equal(claimArcanaTileDecoration(decorationTile,WIZARD_ARCANA_CARDS[0]),false);
assert.equal(decorationTile.dataset.wizardArcanaDecorated,WIZARD_ARCANA_CARDS[0].id);
assert.equal(claimArcanaTileDecoration({dataset:{}},{id:'ordinary-card'}),false);

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
