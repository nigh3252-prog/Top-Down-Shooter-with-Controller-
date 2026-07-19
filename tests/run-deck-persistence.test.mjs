import assert from 'node:assert/strict';
import { createStanceDeck } from '../src/stance-deck.js';

const ratStep = { id:'S24', name:'S24 RAT STEP', type:'stance', chain:['vertical10','stab5','horizontal6'] };
const deepLaunch = { id:'S09', name:'S09 DEEP LAUNCH', type:'stance', chain:['vertical8','stab4','vertical9'] };
const ability = { id:'A-TEST', name:'TEST ABILITY', type:'ability', chain:['vertical16','horizontal5','stab6'] };
const modifier = { id:'M-TEST', name:'TEST MODIFIER', type:'modifier', chain:['horizontal6','horizontal4','horizontal5'] };

const deck = createStanceDeck({ rng:()=>0 });
deck.beginRun([ratStep,deepLaunch,ability,modifier],{openingStanceId:'S24'});
assert.equal(deck.runLocked,true);
assert.deepEqual(deck.pool.map(card=>card.id).sort(),['A-TEST','M-TEST','S09','S24'].sort());

deck.rebuild([{ id:'S99', name:'SHOULD NOT REPLACE RUN', type:'stance', chain:[] }]);
assert.deepEqual(deck.pool.map(card=>card.id).sort(),['A-TEST','M-TEST','S09','S24'].sort(),'respawn rebuild should preserve the chosen run');

const reward = { id:'S50', name:'REWARD STANCE', type:'stance', chain:['vertical8','stab','horizontal'] };
assert.equal(deck.addCard(reward),true);
assert.ok(deck.pool.some(card=>card.id==='S50'));

console.log('run deck persistence tests passed');
