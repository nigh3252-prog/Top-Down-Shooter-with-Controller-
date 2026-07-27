import assert from 'node:assert/strict';
import { createStanceDeck } from '../src/stance-deck.js';
import { WIZARD_NEXT_SOURCE_CARDS } from '../src/wizard-next-source-cards.js';
import { WIZARD_ARCHETYPE_SAMPLER_BY_ID } from '../src/wizard-archetype-sampler-cards.js';

const ratStep = { id:'S24', name:'S24 RAT STEP', type:'stance', chain:['vertical10','stab5','horizontal6'] };
const deepLaunch = { id:'S09', name:'S09 DEEP LAUNCH', type:'stance', chain:['vertical8','stab4','vertical9'] };
const ability = { id:'A-TEST', name:'TEST ABILITY', type:'ability', chain:['vertical16','horizontal5','stab6'] };
const modifier = { id:'M-TEST', name:'TEST MODIFIER', type:'modifier', chain:['horizontal6','horizontal4','horizontal5'] };
const voltDisc=WIZARD_NEXT_SOURCE_CARDS.find(card=>card.arcanaId==='VOLT-DISC');
const intervention=WIZARD_ARCHETYPE_SAMPLER_BY_ID.get('ARCANE-INTERVENTION');
assert.ok(voltDisc,'Volt Disc must remain available to saved run decks');
assert.ok(intervention,'Arcane Intervention must remain available to saved run decks');

const deck = createStanceDeck({ rng:()=>0 });
deck.beginRun([ratStep,deepLaunch,ability,modifier,voltDisc,intervention],{openingStanceId:'S24'});
assert.equal(deck.runLocked,true);
assert.deepEqual(deck.pool.map(card=>card.id).sort(),['A-TEST','M-TEST','S09','S24',voltDisc.id,intervention.id].sort());
assert.deepEqual(deck.pool.find(card=>card.id===voltDisc.id)?.manualSequence,{presses:3,timeout:.9,label:'DISC'},'the temporary Volt input contract must survive run-deck construction');
assert.deepEqual(deck.pool.find(card=>card.id===intervention.id)?.manualSequence,{presses:2,timeout:2.1,label:'RIFT'},'the Intervention reactivation contract must survive run-deck construction');

deck.rebuild([{ id:'S99', name:'SHOULD NOT REPLACE RUN', type:'stance', chain:[] }]);
assert.deepEqual(deck.pool.map(card=>card.id).sort(),['A-TEST','M-TEST','S09','S24',voltDisc.id,intervention.id].sort(),'respawn rebuild should preserve the chosen run, including retained-input Arcana');
assert.deepEqual(deck.pool.find(card=>card.id===voltDisc.id)?.manualSequence,{presses:3,timeout:.9,label:'DISC'},'respawn must not strip Volt Disc sequence metadata');
assert.deepEqual(deck.pool.find(card=>card.id===intervention.id)?.manualSequence,{presses:2,timeout:2.1,label:'RIFT'},'respawn must not strip Intervention reactivation metadata');

const reward = { id:'S50', name:'REWARD STANCE', type:'stance', chain:['vertical8','stab','horizontal'] };
assert.equal(deck.addCard(reward),true);
assert.ok(deck.pool.some(card=>card.id==='S50'));

console.log('run deck persistence tests passed');
