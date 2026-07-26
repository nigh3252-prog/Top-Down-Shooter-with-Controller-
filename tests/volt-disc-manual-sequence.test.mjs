import assert from 'node:assert/strict';
import { createStanceDeck, normalizeManualSequence } from '../src/stance-deck.js';
import { WIZARD_NEXT_SOURCE_BY_ID } from '../src/wizard-next-source-cards.js';

if(typeof globalThis.CustomEvent==='undefined')globalThis.CustomEvent=class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}};

const events=[];
const stamina={v:28,pending:3,recoverDelayT:.1};
globalThis.window={
  __arena:{arena:{stamina}},
  dispatchEvent:event=>{events.push(event);return true;},
};

const stance={id:'S-VOLT-TEST',name:'TEST STANCE',type:'stance',chain:['horizontal4','vertical8','horizontal5']};
const otherAbility={id:'OTHER-ABILITY',name:'OTHER ABILITY',type:'ability',playEvent:'other:play',chain:['stab4','stab4','horizontal5']};
const volt=[...WIZARD_NEXT_SOURCE_BY_ID.values()].find(card=>card.arcanaId==='VOLT-DISC');
assert.deepEqual(normalizeManualSequence(volt),{presses:3,timeout:.9,label:'DISC'});

const deck=createStanceDeck({rng:()=>0});
deck.beginRun([stance,volt,otherAbility],{openingStanceId:stance.id});
assert.equal(deck.hand[0].id,volt.id,'deterministic fixture must place Volt Disc in the retained slot');
assert.equal(deck.hand[1].id,otherAbility.id);

const first=deck.play(0);assert.equal(first.__abilityProxy,true);assert.equal(first.__manualSequence.press,1);
assert.equal(deck.hand[0].id,volt.id,'the first press must keep Volt Disc visibly in its slot');
assert.deepEqual(deck.manualSequence,{slot:0,cardId:volt.id,press:1,total:3,remaining:.9,timeout:.9,label:'DISC'});
assert.equal(deck.startShuffle(),false,'shuffle cannot discard a retained combo card mid-window');

const opposite=deck.play(1);assert.equal(opposite.__abilityProxy,true,'the opposite hand slot remains usable during the Volt window');
assert.equal(deck.manualSequence.press,1,'using the opposite slot must not consume or advance Volt Disc');
await Promise.resolve();
assert.deepEqual(events.filter(event=>event.type==='wizard-arcana:play').map(event=>event.detail.sequence.press),[1]);
assert.equal(events.some(event=>event.type==='other:play'),true);

const second=deck.play(0);assert.equal(second.__manualSequence.press,2);assert.equal(deck.hand[0].id,volt.id);
deck.update(.89);assert.equal(deck.hand[0].id,volt.id);assert.ok(deck.manualSequence.remaining>0&&deck.manualSequence.remaining<.02);
assert.equal(deck.update(.02),true,'rolling timeout must close the retained-card window');
assert.notEqual(deck.hand[0]?.id,volt.id);assert.equal(deck.manualSequence,null);
assert.equal(events.some(event=>event.type==='stance-deck:changed'&&event.detail.reason==='manual-sequence-timeout'),true);

const completeDeck=createStanceDeck({rng:()=>0});
completeDeck.beginRun([stance,volt],{openingStanceId:stance.id});
assert.equal(completeDeck.hand[0].id,volt.id);
const p1=completeDeck.play(0),p2=completeDeck.play(0),p3=completeDeck.play(0);
assert.deepEqual([p1.__manualSequence.press,p2.__manualSequence.press,p3.__manualSequence.press],[1,2,3]);
assert.equal(p3.__manualSequence.complete,true);assert.equal(completeDeck.manualSequence,null);assert.notEqual(completeDeck.hand[0]?.id,volt.id,'third press consumes the card normally');
await Promise.resolve();
const completedSequence=events.filter(event=>event.type==='wizard-arcana:play').slice(-3).map(event=>event.detail.sequence);
assert.deepEqual(completedSequence.map(sequence=>sequence.press),[1,2,3]);assert.equal(completedSequence.at(-1).complete,true);

console.log('Volt Disc manual sequence deck tests passed');
