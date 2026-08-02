import assert from 'node:assert/strict';
import {
  CARD_DEFINITIONS,
  CARD_FAMILIES,
  CARD_REGISTRY,
  CARD_REGISTRY_ENTRIES,
  CARD_IDS,
  listCards,
} from '../src/card-registry.js';
import {
  EFFECT_DEFINITIONS,
  EFFECT_IDS,
  EFFECT_REGISTRY,
  createEffectDispatcher,
} from '../src/effect-registry.js';
import { STANCE_CARDS } from '../src/stance-cards.js';
import { BING_BONG_CARD, BLOOD_SLASH_CARD } from '../src/combat-modifier-cards.js';
import { POW_BUNKER_CARD } from '../src/powbunker-card.js';
import { WIZARD_ARCANA_CATALOG } from '../src/wizard-arcana-catalog.js';
import { WIZARD_NEXT_SOURCE_CARDS } from '../src/wizard-next-source-cards.js';
import { createStanceDeck } from '../src/stance-deck.js';

if(typeof globalThis.CustomEvent==='undefined')globalThis.CustomEvent=class CustomEvent{
  constructor(type,init={}){this.type=type;this.detail=init.detail;}
};

assert.deepEqual(CARD_FAMILIES,['stance','special-stance','non-stance','arcana']);
assert.equal(CARD_DEFINITIONS.length,79,'the registry inventory must include every current card');
assert.equal(CARD_REGISTRY_ENTRIES.length,CARD_DEFINITIONS.length);
assert.equal(new Set(CARD_IDS).size,CARD_IDS.length,'card IDs must be unique');
assert.equal(listCards({family:'stance'}).length,30);
assert.equal(listCards({family:'special-stance'}).length,1);
assert.equal(listCards({family:'non-stance'}).length,2);
assert.equal(listCards({family:'arcana'}).length,46);
for(const entry of CARD_REGISTRY_ENTRIES){
  assert.equal(CARD_REGISTRY.get(entry.id),entry.card);
  assert.equal(Object.isFrozen(entry),true);
  assert.equal(Object.isFrozen(entry.card),true,`${entry.id} must be frozen`);
  assert.equal(Object.isFrozen(entry.card.chain),true,`${entry.id} chain must be frozen`);
  if(entry.card.effectId)assert.ok(EFFECT_REGISTRY.get(entry.card.effectId),`${entry.id} effect reference must resolve`);
}
assert.equal(CARD_REGISTRY.get(STANCE_CARDS[0]),STANCE_CARDS[0]);
assert.equal(CARD_REGISTRY.get(BLOOD_SLASH_CARD),BLOOD_SLASH_CARD);
assert.equal(CARD_REGISTRY.get('missing'),null);
assert.throws(()=>CARD_REGISTRY.require('missing'),/Unknown card definition/);
assert.equal(Object.isFrozen(STANCE_CARDS),true,'STANCE_CARDS must be an immutable compatibility view');
assert.throws(()=>STANCE_CARDS.push(STANCE_CARDS[0]),TypeError);
assert.equal(POW_BUNKER_CARD.playEvent,'powbunker:play');
assert.equal(BLOOD_SLASH_CARD.playEvent,'bloodslash:play');
assert.equal(BING_BONG_CARD.effectId,'bingBong');
assert.deepEqual(EFFECT_IDS,['bloodSlash','bingBong']);
assert.equal(new Set(EFFECT_DEFINITIONS.map(definition=>definition.effectId)).size,EFFECT_DEFINITIONS.length);
assert.deepEqual(EFFECT_REGISTRY.list().map(definition=>definition.effectId),EFFECT_IDS);
assert.throws(()=>EFFECT_REGISTRY.require('missing'),/Unknown effect definition/);

const calls=[];
const dispatcher=createEffectDispatcher({handlers:{
  bloodSlash:{
    canPlay(card,context){calls.push(['canPlay',card.id,context.slot]);return context.allow!==false;},
    play(card,context){calls.push(['play',card.id,context.slot,context.staminaSnapshot.v]);return true;},
  },
  bingBong:{play(card){calls.push(['play',card.id]);return true;}},
}});
assert.deepEqual(dispatcher.list().map(entry=>entry.effectId),EFFECT_IDS);
assert.equal(dispatcher.canPlay(BLOOD_SLASH_CARD,{slot:0,allow:true}),true);
assert.equal(dispatcher.canPlay(BLOOD_SLASH_CARD,{slot:0,allow:false}),false);
assert.equal(dispatcher.has('bloodSlash'),true);
assert.equal(dispatcher.has('missing'),false);

const stamina={v:42,pending:6,recoverDelayT:.12};
const events=[];
globalThis.window={
  __arena:{arena:{stamina}},
  dispatchEvent:event=>{events.push(event.type);return true;},
};
const stance={id:'S-REGISTRY-TEST',name:'TEST STANCE',type:'stance',chain:['horizontal4','vertical8','horizontal5']};
const blockingDispatcher=createEffectDispatcher({handlers:{bloodSlash:{canPlay:()=>false,play:()=>true}}});
const deck=createStanceDeck({rng:()=>0,effectDispatcher:blockingDispatcher});
deck.beginRun([stance,BLOOD_SLASH_CARD],{openingStanceId:stance.id});
assert.equal(deck.hand[0],BLOOD_SLASH_CARD);
const blocked=deck.play(0);
assert.equal(blocked,null,'a rejected canPlay check must retain the card');
assert.equal(deck.hand[0],BLOOD_SLASH_CARD);
assert.equal(calls.filter(call=>call[0]==='play').length,0);
const allowDispatcher=createEffectDispatcher({handlers:{
  bloodSlash:{canPlay:()=>true,play:(card,context)=>{calls.push(['direct-play',card.id,context.slot,context.staminaSnapshot.v]);return true;}},
}});
deck.setEffectDispatcher(allowDispatcher);
const proxy=deck.play(0);
assert.equal(proxy.__modifierProxy,true);
stamina.v=100;stamina.pending=0;stamina.recoverDelayT=0;
await Promise.resolve();
assert.deepEqual(stamina,{v:42,pending:6,recoverDelayT:.12},'direct effect dispatch must preserve stamina before runtime play');
assert.deepEqual(events,[],'migrated effects must not broadcast their legacy play event');
assert.deepEqual(calls.at(-1),['direct-play',BLOOD_SLASH_CARD.id,0,42]);

const volt=WIZARD_NEXT_SOURCE_CARDS.find(card=>card.arcanaId==='VOLT-DISC');
const persistenceDeck=createStanceDeck({rng:()=>0});
persistenceDeck.beginRun([stance,volt],{openingStanceId:stance.id});
assert.equal(persistenceDeck.pool.find(card=>card.id===volt.id),volt);
assert.deepEqual(persistenceDeck.pool.find(card=>card.id===volt.id).manualSequence,{presses:3,timeout:.9,label:'DISC'});
persistenceDeck.rebuild([{id:'S-REPLACEMENT',type:'stance',chain:[]}]);
assert.equal(persistenceDeck.pool.find(card=>card.id===volt.id),volt,'rebuild must preserve saved Arcana IDs and metadata');
assert.equal(WIZARD_ARCANA_CATALOG.find(card=>card.id===volt.id),volt,'Arcana catalog and registry must share object identity');

console.log('card/effect registry, dispatch ownership, stamina, and persistence tests passed');
