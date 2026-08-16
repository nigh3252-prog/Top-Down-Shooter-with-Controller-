import assert from 'node:assert/strict';
import { provideArenaRuntime } from '../src/arena-runtime-context.js';
import {
  CARD_DEFINITIONS,
  CARD_FAMILIES,
  CARD_REGISTRY,
  CARD_REGISTRY_ENTRIES,
  CARD_IDS,
  listCards,
} from '../src/card-registry.js';
import {
  ARCANA_EFFECT_DEFINITIONS,
  EFFECT_DEFINITIONS,
  EFFECT_IDS,
  EFFECT_REGISTRY,
  RUNTIME_HANDLER_IDS,
  createEffectDispatcher,
  createRuntimeHandlerTable,
} from '../src/effect-registry.js';
import { STANCE_CARDS } from '../src/stance-cards.js';
import { BING_BONG_CARD, BLOOD_SLASH_CARD } from '../src/combat-modifier-cards.js';
import { POW_BUNKER_CARD } from '../src/powbunker-card.js';
import { WIZARD_ARCANA_CATALOG } from '../src/wizard-arcana-catalog.js';
import { WIZARD_NEXT_SOURCE_CARDS } from '../src/wizard-next-source-cards.js';
import { createStanceDeck } from '../src/stance-deck.js';
import { arcanaDownStanceId, arcanaElementStanceClass } from '../src/arcana-stance-pairings.js';
import { getStanceClass } from '../src/stance-compatibility.js';
import { WEAPON_STARTER_ARCANA_IDS, WEAPON_STARTER_STANCE_IDS } from '../src/weapon-stance-plan.js';

if(typeof globalThis.CustomEvent==='undefined')globalThis.CustomEvent=class CustomEvent{
  constructor(type,init={}){this.type=type;this.detail=init.detail;}
};

assert.deepEqual(CARD_FAMILIES,['stance','special-stance','non-stance','arcana']);
assert.equal(CARD_DEFINITIONS.length,103,'the registry inventory must include every current card');
assert.equal(CARD_REGISTRY_ENTRIES.length,CARD_DEFINITIONS.length);
assert.equal(new Set(CARD_IDS).size,CARD_IDS.length,'card IDs must be unique');
assert.equal(listCards({family:'stance'}).length,30);
assert.equal(listCards({family:'special-stance'}).length,1);
assert.equal(listCards({family:'non-stance'}).length,2);
assert.equal(listCards({family:'arcana'}).length,70);
const arcanaCards=listCards({family:'arcana'});
assert.ok(arcanaCards.every(card=>/^S\d+$/.test(arcanaDownStanceId(card.arcanaId))),'every Arcana must have a down-side stance pairing');
const downStanceCounts=new Map(STANCE_CARDS.map(card=>[card.id,0]));
for(const card of arcanaCards){
  const stanceId=arcanaDownStanceId(card.arcanaId),expectedClass=arcanaElementStanceClass(card.element);
  downStanceCounts.set(stanceId,(downStanceCounts.get(stanceId)||0)+1);
  if(expectedClass)assert.equal(getStanceClass(stanceId),expectedClass,`${card.name} must follow the ${card.element} stance-category rule`);
  else assert.equal(card.element,'Chaos',`${card.name} has an unsupported stance-category element`);
}
assert.ok([...downStanceCounts.values()].every(count=>count>=1),'every stance must appear on at least one combined card');
for(const stanceClass of ['Light','Medium','Heavy']){
  const counts=STANCE_CARDS.filter(card=>getStanceClass(card)===stanceClass).map(card=>downStanceCounts.get(card.id));
  assert.ok(Math.max(...counts)-Math.min(...counts)<=1,`${stanceClass} pairings must be as even as their element catalog allows`);
}
const arcanaById=new Map(arcanaCards.map(card=>[card.arcanaId,card]));
const starterArcanaIds=[];
assert.deepEqual(Object.keys(WEAPON_STARTER_ARCANA_IDS),Object.keys(WEAPON_STARTER_STANCE_IDS));
for(const weaponId of Object.keys(WEAPON_STARTER_STANCE_IDS)){
  const stanceIds=WEAPON_STARTER_STANCE_IDS[weaponId],arcanaIds=WEAPON_STARTER_ARCANA_IDS[weaponId];
  assert.equal(arcanaIds.length,2,`${weaponId} must have two combined starter cards`);
  assert.equal(stanceIds.length,2,`${weaponId} must have two starter stances`);
  for(let index=0;index<2;index++){
    assert.ok(arcanaById.has(arcanaIds[index]),`${weaponId} starter ${arcanaIds[index]} must be one of the 70 Arcana`);
    assert.equal(arcanaDownStanceId(arcanaIds[index]),stanceIds[index],`${weaponId} starter card ${index+1} must carry its authored starter stance`);
    starterArcanaIds.push(arcanaIds[index]);
  }
}
assert.equal(new Set(starterArcanaIds).size,starterArcanaIds.length,'the 22 weapon starter cards must use unique Arcana');
const effectCards=[...listCards({family:'non-stance'}),...listCards({family:'arcana'})];
assert.equal(effectCards.length,72,'the canonical non-stance inventory is Pilebunker, Blood Slash, and 70 Arcana');
assert.ok(effectCards.every(card=>card.effectId),'every canonical non-stance card must own an effectId');
assert.equal(ARCANA_EFFECT_DEFINITIONS.length,70);
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
assert.equal(EFFECT_DEFINITIONS.length,73,'Bing Bong plus 72 non-stance effects must be registered');
assert.equal(EFFECT_IDS.length,EFFECT_DEFINITIONS.length);
assert.equal(RUNTIME_HANDLER_IDS.length,15);
for(const definition of EFFECT_DEFINITIONS){
  assert.equal(Object.isFrozen(definition),true);
  assert.equal(typeof definition.effectId,'string');
  assert.equal(typeof definition.runtimeHandlerId,'string');
  assert.equal(EFFECT_REGISTRY.get(definition.effectId),definition);
}
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

const productionCalls=[];
const effectIdsByRuntime=new Map(RUNTIME_HANDLER_IDS.map(runtimeHandlerId=>[
  runtimeHandlerId,
  new Set(EFFECT_DEFINITIONS.filter(definition=>definition.runtimeHandlerId===runtimeHandlerId).map(definition=>definition.effectId)),
]));
const productionHandlers=Object.fromEntries(RUNTIME_HANDLER_IDS.map(runtimeHandlerId=>[runtimeHandlerId,{
  canPlay(card){const accepted=effectIdsByRuntime.get(runtimeHandlerId).has(card.effectId);if(accepted)productionCalls.push(['canPlay',runtimeHandlerId,card.effectId]);return accepted;},
  play(card){const accepted=effectIdsByRuntime.get(runtimeHandlerId).has(card.effectId);if(accepted)productionCalls.push(['play',runtimeHandlerId,card.effectId]);return accepted;},
}]));
const productionTable=createRuntimeHandlerTable(productionHandlers);
const productionDispatcher=createEffectDispatcher({runtimeHandlers:productionTable});
assert.equal(productionTable.size,15,'the deterministic runtime table must contain every runtime handler');
assert.equal(productionDispatcher.handlers.size,15,'dispatcher construction must preserve a readonly runtime table');
assert.equal(productionDispatcher.list().length,73);
assert.ok(productionDispatcher.list().every(entry=>entry.handler===productionTable.get(entry.runtimeHandlerId)),'each effect must resolve to exactly one table handler');
productionCalls.length=0;
assert.equal(productionDispatcher.canPlay(POW_BUNKER_CARD,{slot:0}),true);
assert.equal(productionDispatcher.play(POW_BUNKER_CARD,{slot:0}),true);
assert.deepEqual(productionCalls,[['canPlay','pilebunker','pilebunker'],['play','pilebunker','pilebunker']],'a production-shaped dispatcher must call one injected handler exactly once per method');
const cardsByEffectId=new Map(CARD_DEFINITIONS.filter(card=>card.effectId).map(card=>[card.effectId,card]));
for(const definition of EFFECT_DEFINITIONS){
  const card=cardsByEffectId.get(definition.effectId);
  assert.ok(card,`${definition.effectId} must have a card reference`);
  productionCalls.length=0;
  assert.equal(productionDispatcher.canPlay(card),true,`${definition.effectId} canPlay must reach its mapped handler`);
  assert.equal(productionDispatcher.play(card),true,`${definition.effectId} play must reach its mapped handler`);
  assert.deepEqual(productionCalls,[
    ['canPlay',definition.runtimeHandlerId,definition.effectId],
    ['play',definition.runtimeHandlerId,definition.effectId],
  ],`${definition.effectId} must resolve to exactly one runtime handler`);
}
assert.equal(productionDispatcher.canPlay({effectId:'missing'}),false,'unknown effects must fail closed');
assert.equal(productionDispatcher.play({effectId:'missing'}),false,'unknown effects must not broadcast or fan out');

const stamina={v:42,pending:6,recoverDelayT:.12};
const events=[];
globalThis.window={
  __arena:{arena:{stamina}},
  dispatchEvent:event=>{events.push(event.type);return true;},
};
provideArenaRuntime({config:{mode:'arena',enemyLab:false},arena:{stamina}});
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

const downCalls=[];
const combinedDeck=createStanceDeck({rng:()=>0,stanceCatalog:STANCE_CARDS,effectDispatcher:createEffectDispatcher({handlers:{wizardNextSource:{canPlay:()=>true,play:()=>{downCalls.push('unexpected');return true;}}}})});
combinedDeck.beginRun([STANCE_CARDS[0],volt],{openingStanceId:STANCE_CARDS[0].id});
const combined=combinedDeck.play(0,{direction:'down'});
assert.equal(combined.id,arcanaDownStanceId(volt.arcanaId),'a downward Arcana play must resolve to its authored paired stance');
assert.equal(combined.__pairedStanceId,arcanaDownStanceId(volt.arcanaId));
assert.deepEqual(downCalls,[],'a downward Arcana play must not dispatch the Arcana effect');

const upCalls=[];
const upDeck=createStanceDeck({rng:()=>0,stanceCatalog:STANCE_CARDS,effectDispatcher:createEffectDispatcher({handlers:{wizardNextSource:{canPlay:()=>true,play:card=>{upCalls.push(card.arcanaId);return true;}}}})});
upDeck.beginRun([STANCE_CARDS[0],volt],{openingStanceId:STANCE_CARDS[0].id});
const up=upDeck.play(0,{direction:'up'});
assert.equal(up.id,STANCE_CARDS[0].id,'an upward Arcana play must preserve the active stance');
await Promise.resolve();
assert.deepEqual(upCalls,['VOLT-DISC'],'an upward Arcana play must dispatch the Arcana effect');

console.log('card/effect registry, dispatch ownership, stamina, and persistence tests passed');
