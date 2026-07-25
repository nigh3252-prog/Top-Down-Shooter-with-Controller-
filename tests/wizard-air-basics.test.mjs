import assert from 'node:assert/strict';
import { WIZARD_AIR_BASIC_CARDS } from '../src/wizard-air-basics-cards.js';
import {
  AIR_SPINNER_BEATS,
  AIR_SPINNER_DISC,
  AIR_SPINNER_RING,
  PERFORATING_JET_ENHANCED_VOLLEYS,
  PERFORATING_JET_VOLLEYS,
  airSpinnerDiscSpec,
  airSpinnerOrbitPosition,
  buildPerforatingJetSchedule,
  perforatingJetShotSpec,
  perforatingJetVolleyCounts,
} from '../src/wizard-air-basics-runtime.js';

assert.equal(WIZARD_AIR_BASIC_CARDS.length,2);
assert.deepEqual(WIZARD_AIR_BASIC_CARDS.map(card=>card.arcanaId),['AIR-SPINNER','PERFORATING-JET']);
assert.ok(WIZARD_AIR_BASIC_CARDS.every(card=>card.sourceGame==='Wizard of Legend'&&card.type==='ability'&&card.playEvent==='wizard-arcana:play'));

const airSpinner=WIZARD_AIR_BASIC_CARDS[0];
assert.match(airSpinner.description,/orbit the caster/i);
assert.deepEqual(AIR_SPINNER_BEATS.map(beat=>beat.carrier),['disc','disc','ring']);
assert.ok(AIR_SPINNER_BEATS.every((beat,index,beats)=>index===0||beat.time>beats[index-1].time));
const disc=airSpinnerDiscSpec();
const enhancedDisc=airSpinnerDiscSpec({enhanced:true});
assert.equal(disc.damage,6);
assert.equal(disc.revolutions,1);
assert.equal(disc.copies,1);
assert.equal(enhancedDisc.copies,2);
assert.equal(enhancedDisc.oppositePhase,true);
assert.equal(AIR_SPINNER_RING.damage,10);
assert.ok(AIR_SPINNER_RING.push>AIR_SPINNER_DISC.damage/10);
const orbitStart=airSpinnerOrbitPosition({ownerX:2,ownerZ:3,startAngle:0,progress:0,radius:2});
const orbitHalf=airSpinnerOrbitPosition({ownerX:2,ownerZ:3,startAngle:0,progress:.5,radius:2});
const orbitEnd=airSpinnerOrbitPosition({ownerX:2,ownerZ:3,startAngle:0,progress:1,radius:2});
assert.ok(Math.abs(orbitStart.x-2)<1e-9&&Math.abs(orbitStart.z-5)<1e-9);
assert.ok(Math.abs(orbitHalf.x-2)<1e-9&&Math.abs(orbitHalf.z-1)<1e-9);
assert.ok(Math.abs(orbitEnd.x-orbitStart.x)<1e-9&&Math.abs(orbitEnd.z-orbitStart.z)<1e-9,'one revolution must return to the aimed start side');

const perforatingJet=WIZARD_AIR_BASIC_CARDS[1];
assert.match(perforatingJet.description,/two shots, then three, then four/i);
assert.deepEqual(perforatingJetVolleyCounts(),PERFORATING_JET_VOLLEYS);
assert.deepEqual(perforatingJetVolleyCounts({enhanced:true}),PERFORATING_JET_ENHANCED_VOLLEYS);
const baseSchedule=buildPerforatingJetSchedule();
const enhancedSchedule=buildPerforatingJetSchedule({enhanced:true});
assert.equal(baseSchedule.length,9);
assert.equal(enhancedSchedule.length,12);
assert.deepEqual([1,2,3].map(beat=>baseSchedule.filter(event=>event.beat===beat).length),[2,3,4]);
assert.deepEqual([1,2,3].map(beat=>enhancedSchedule.filter(event=>event.beat===beat).length),[3,4,5]);
assert.ok(baseSchedule.every((event,index,events)=>index===0||event.time>=events[index-1].time));
for(const beat of[1,2,3]){
  const times=baseSchedule.filter(event=>event.beat===beat).map(event=>event.time);
  assert.ok(times.every((time,index)=>index===0||time>times[index-1]),`beat ${beat} must emit separate jets, not one combined beam`);
}
const jet=perforatingJetShotSpec();
assert.equal(jet.damage,3);
assert.equal(jet.piercesEnemies,true);
assert.ok(jet.range>10&&jet.radius<.3,'jets should be long-range and narrow');

console.log('wizard air basics tests passed');
