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
import {
  FLAME_STRIKE_BEATS,
  FLAME_STRIKE_CHARGE,
  flameStrikeBurstSpec,
  pointInFlameStrikePlume,
} from '../src/wizard-flame-strike-runtime.js';
import {
  WIND_SLASH_BEATS,
  WIND_SLASH_ENHANCED_GUST_DAMAGE,
  pointInWindSlashArc,
  windSlashArcSpec,
} from '../src/wizard-wind-slash-runtime.js';

if(typeof globalThis.CustomEvent==='undefined'){
  globalThis.CustomEvent=class CustomEvent{
    constructor(type,init={}){this.type=type;this.detail=init.detail;}
  };
}

assert.equal(WIZARD_ARCANA_CARDS.length,8);
assert.equal(new Set(WIZARD_ARCANA_CARDS.map(card=>card.id)).size,8);
assert.ok(WIZARD_ARCANA_CARDS.every(isWizardArcanaCard));
assert.ok(WIZARD_ARCANA_CARDS.every(card=>card.type==='ability'&&card.playEvent==='wizard-arcana:play'));

const groupedArcana=wizardArcanaCards([
  {id:'S-ORDINARY',type:'stance'},
  ...WIZARD_ARCANA_CARDS,
  {id:'A-ORDINARY',type:'ability'},
]);
assert.deepEqual(groupedArcana.map(card=>card.id),WIZARD_ARCANA_CARDS.map(card=>card.id));

const flameStrike=WIZARD_ARCANA_CARDS.find(card=>card.arcanaId==='FLAME-STRIKE');
assert.ok(flameStrike);
assert.match(flameStrike.description,/two compact frontal fire plumes/i);
assert.match(flameStrike.description,/held/i);
assert.deepEqual(FLAME_STRIKE_BEATS.map(beat=>beat.damage),[7,7,14]);
assert.ok(FLAME_STRIKE_BEATS.every((beat,index,beats)=>index===0||beat.time>beats[index-1].time));
const strikeOne=flameStrikeBurstSpec({beat:1});
const strikeThree=flameStrikeBurstSpec({beat:3});
const strikeCharged=flameStrikeBurstSpec({charged:true});
assert.equal(strikeOne.damage,7);
assert.equal(strikeThree.damage,14);
assert.equal(strikeCharged.damage,28);
assert.equal(FLAME_STRIKE_CHARGE.damage,28);
assert.ok(strikeThree.range>strikeOne.range&&strikeThree.width>strikeOne.width);
assert.ok(strikeCharged.range>strikeThree.range&&strikeCharged.width>strikeThree.width);
assert.equal(pointInFlameStrikePlume({originX:0,originZ:0,forwardX:0,forwardZ:1,targetX:0,targetZ:2,range:3,width:1.5}),true);
assert.equal(pointInFlameStrikePlume({originX:0,originZ:0,forwardX:0,forwardZ:1,targetX:0,targetZ:-1,range:3,width:1.5}),false);
assert.equal(pointInFlameStrikePlume({originX:0,originZ:0,forwardX:0,forwardZ:1,targetX:3,targetZ:1,range:3,width:1}),false);
assert.equal(pointInFlameStrikePlume({originX:0,originZ:0,forwardX:0,forwardZ:1,targetX:1.2,targetZ:2.7,range:3,width:1.5}),true);

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

const windSlash=WIZARD_ARCANA_CARDS.find(card=>card.arcanaId==='WIND-SLASH');
assert.ok(windSlash);
assert.match(windSlash.description,/three pale air crescents/i);
assert.deepEqual(WIND_SLASH_BEATS.map(beat=>beat.damage),[8,10,12]);
assert.ok(WIND_SLASH_BEATS.every((beat,index,beats)=>index===0||beat.time>beats[index-1].time));
const windOne=windSlashArcSpec({beat:1});
const windTwo=windSlashArcSpec({beat:2});
const windThree=windSlashArcSpec({beat:3});
assert.equal(windOne.primary.damage,8);
assert.equal(windTwo.primary.damage,10);
assert.equal(windThree.primary.damage,12);
assert.ok(windTwo.primary.outerRadius>windOne.primary.outerRadius);
assert.ok(windThree.primary.outerRadius>windTwo.primary.outerRadius);
assert.ok(windTwo.primary.halfAngle>windOne.primary.halfAngle);
assert.ok(windThree.primary.halfAngle>windTwo.primary.halfAngle);
assert.deepEqual(WIND_SLASH_ENHANCED_GUST_DAMAGE,[3,3,4]);
const enhancedWind=windSlashArcSpec({beat:3,enhanced:true});
assert.equal(enhancedWind.gust.damage,4);
assert.ok(enhancedWind.gust.outerRadius>enhancedWind.primary.outerRadius);
assert.equal(enhancedWind.gust.piercesEnemies,true);
assert.equal(enhancedWind.gust.destroysProjectiles,true);
assert.equal(pointInWindSlashArc({originX:0,originZ:0,forwardX:0,forwardZ:1,targetX:0,targetZ:2,innerRadius:.2,outerRadius:3,halfAngle:.8}),true);
assert.equal(pointInWindSlashArc({originX:0,originZ:0,forwardX:0,forwardZ:1,targetX:0,targetZ:-2,innerRadius:.2,outerRadius:3,halfAngle:.8}),false);
assert.equal(pointInWindSlashArc({originX:0,originZ:0,forwardX:0,forwardZ:1,targetX:4,targetZ:1,innerRadius:.2,outerRadius:3,halfAngle:.8}),false);
assert.equal(pointInWindSlashArc({originX:0,originZ:0,forwardX:0,forwardZ:1,targetX:1.5,targetZ:2.2,innerRadius:.2,outerRadius:3,halfAngle:.8}),true);

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
assert.equal(scaleWizardArcanaDamage(strikeCharged.damage,5),140);
assert.equal(scaleWizardArcanaDamage(windThree.primary.damage,5),60);

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
  _value:'8 SHOWN',
  get textContent(){return this._value;},
  set textContent(value){textWrites++;this._value=value;},
};
assert.equal(setTextIfChanged(observedText,'8 SHOWN'),false);
assert.equal(textWrites,0,'identical filter labels must not mutate the observed DOM');
assert.equal(setTextIfChanged(observedText,'7 SHOWN'),true);
assert.equal(textWrites,1);
assert.equal(setTextIfChanged(observedText,'7 SHOWN'),false);
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
