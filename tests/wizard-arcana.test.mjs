import assert from 'node:assert/strict';
import { createStanceDeck } from '../src/stance-deck.js';
import {
  claimArcanaTileDecoration,
  wizardArcanaCards,
} from '../src/enemy-lab-deck-editor-refinements.js';
import { setTextIfChanged } from '../src/enemy-lab-arcana-controls-hotfix.js';
import { WIZARD_ARCANA_CARDS, isWizardArcanaCard } from '../src/wizard-arcana-cards.js';
import { scaleWizardArcanaDamage } from '../src/wizard-arcana-damage-scaler.js';
import {
  ARCANA_DAMAGE_MAX,
  ARCANA_DAMAGE_MIN,
  ARCANA_TWEAKS_EVENT,
  ARCANA_SIZE_MAX,
  ARCANA_SIZE_MIN,
  clampArcanaDamage,
  clampArcanaSize,
  readArcanaTweaks,
  writeArcanaTweaks,
} from '../src/wizard-arcana-settings.js';
import {
  BOUNCING_BLAZE_BEATS,
  FLAME_CROSS_BEATS,
  bouncingBlazeHeightAtDistance,
  bouncingBlazeShotSpec,
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

const groupedArcana=wizardArcanaCards([
  {id:'S-ORDINARY',type:'stance'},
  ...WIZARD_ARCANA_CARDS,
  {id:'A-ORDINARY',type:'ability'},
]);
assert.deepEqual(groupedArcana.map(card=>card.id),WIZARD_ARCANA_CARDS.map(card=>card.id));

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

const bouncingBlaze=WIZARD_ARCANA_CARDS.find(card=>card.arcanaId==='BOUNCING-BLAZE');
assert.match(bouncingBlaze.description,/three large fireballs/i);
assert.match(bouncingBlaze.description,/hop twice/i);
assert.doesNotMatch(bouncingBlaze.description,/ricochet/i);
assert.equal(BOUNCING_BLAZE_BEATS.length,3);
assert.ok(BOUNCING_BLAZE_BEATS.every((beat,index,beats)=>index===0||beat.time>beats[index-1].time));
const blazeGaps=BOUNCING_BLAZE_BEATS.slice(1).map((beat,index)=>beat.time-BOUNCING_BLAZE_BEATS[index].time);
assert.ok(blazeGaps.every(gap=>gap>=.18&&gap<=.32),'release spacing should stay in the quick three-shot range observed in the showcase');
const blazeBase=bouncingBlazeShotSpec();
const blazeEnhanced=bouncingBlazeShotSpec({enhanced:true});
assert.equal(blazeBase.damage,12);
assert.equal(blazeBase.bounceCount,2);
assert.equal(blazeBase.range,blazeBase.bounceSpacing*blazeBase.bounceCount);
assert.equal(blazeBase.enhanced,false);
assert.equal(blazeEnhanced.enhanced,true);
assert.equal(bouncingBlazeHeightAtDistance(0,blazeBase),blazeBase.groundY);
assert.ok(Math.abs(bouncingBlazeHeightAtDistance(blazeBase.bounceSpacing*.5,blazeBase)-(blazeBase.groundY+blazeBase.hopHeight))<1e-9);
assert.ok(Math.abs(bouncingBlazeHeightAtDistance(blazeBase.bounceSpacing,blazeBase)-blazeBase.groundY)<1e-9);
assert.ok(Math.abs(bouncingBlazeHeightAtDistance(blazeBase.bounceSpacing*1.5,blazeBase)-(blazeBase.groundY+blazeBase.hopHeight))<1e-9);
assert.ok(Math.abs(bouncingBlazeHeightAtDistance(blazeBase.range,blazeBase)-blazeBase.groundY)<1e-9);

assert.equal(ARCANA_SIZE_MIN,1);
assert.equal(ARCANA_SIZE_MAX,5);
assert.equal(ARCANA_DAMAGE_MIN,1);
assert.equal(ARCANA_DAMAGE_MAX,5);
assert.equal(clampArcanaSize(-4),1);
assert.equal(clampArcanaSize(12),5);
assert.equal(clampArcanaSize(2.63),2.75);
assert.equal(clampArcanaDamage(-4),1);
assert.equal(clampArcanaDamage(12),5);
assert.equal(clampArcanaDamage(3.12),3);
assert.equal(scaleWizardArcanaDamage(12,1),12);
assert.equal(scaleWizardArcanaDamage(12,2.5),30);
assert.equal(scaleWizardArcanaDamage(12,99),60);

const stored=new Map();
const storage={
  getItem:key=>stored.has(key)?stored.get(key):null,
  setItem:(key,value)=>stored.set(key,value),
};
const tweakEvents=[];
const eventTarget={dispatchEvent:event=>{tweakEvents.push(event);return true;}};
assert.deepEqual(readArcanaTweaks(storage),{sizeMultiplier:1,damageMultiplier:1});
const savedSize=writeArcanaTweaks({sizeMultiplier:4.87},{storage,eventTarget});
assert.deepEqual(savedSize,{sizeMultiplier:4.75,damageMultiplier:1});
const savedDamage=writeArcanaTweaks({damageMultiplier:3.12},{storage,eventTarget});
assert.deepEqual(savedDamage,{sizeMultiplier:4.75,damageMultiplier:3});
assert.deepEqual(readArcanaTweaks(storage),{sizeMultiplier:4.75,damageMultiplier:3});
assert.equal(tweakEvents.length,2);
assert.equal(tweakEvents[1].type,ARCANA_TWEAKS_EVENT);
assert.deepEqual(tweakEvents[1].detail,{sizeMultiplier:4.75,damageMultiplier:3});

// The previous freeze was a self-triggering MutationObserver loop. Reapplying
// the same filter labels must therefore perform zero child-list text writes.
let textWrites=0;
const observedText={
  _value:'6 SHOWN',
  get textContent(){return this._value;},
  set textContent(value){textWrites++;this._value=value;},
};
assert.equal(setTextIfChanged(observedText,'6 SHOWN'),false);
assert.equal(textWrites,0,'identical filter labels must not mutate the observed DOM');
assert.equal(setTextIfChanged(observedText,'5 SHOWN'),true);
assert.equal(textWrites,1);
assert.equal(setTextIfChanged(observedText,'5 SHOWN'),false);
assert.equal(textWrites,1,'reapplying the active filter must remain idempotent');

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
