import assert from 'node:assert/strict';
import { WIZARD_ARCANA_CARDS } from '../src/wizard-arcana-cards.js';
import { WIZARD_AIR_BASIC_CARDS } from '../src/wizard-air-basics-cards.js';
import { WIZARD_NEXT_SOURCE_CARDS } from '../src/wizard-next-source-cards.js';
import { WIZARD_NEXT_TWENTY_CARDS } from '../src/wizard-next-twenty-cards.js';
import { WIZARD_ARCHETYPE_SAMPLER_CARDS } from '../src/wizard-archetype-sampler-cards.js';
import {
  WIZARD_ARCANA_CATALOG,
  WIZARD_ARCANA_CATALOG_BY_ARCANA_ID,
  WIZARD_ARCANA_CATALOG_BY_ID,
  wizardArcanaCardById,
  wizardArcanaShowcaseStart,
  wizardArcanaSourceOrder,
} from '../src/wizard-arcana-catalog.js';
import { ABILITY_CAPTURE_CARDS, captureCardById, normalizeCaptureArcanaId } from '../src/ability-capture.js';
import { createStanceDeck } from '../src/stance-deck.js';

const nextTwentyIds=[
  'ICE-DAGGER','RIP-TIDE','AQUA-ARC','CHAOS-CRUSHER',
  'SEARING-RUSH','FLARE-RUSH','IGNITION-RUSH','AIR-BURST',
  'GUST-BURST','RAZOR-BURST','SPIKE-TRACK','TOXIC-TRAP',
  'SNARE-TRACK','THUNDER-LINE','CIRCUIT-LINE','SHOCK-LINE',
  'WAVE-FRONT','FROST-FEINT','FROST-WING','CHAOTIC-RIFT',
];
const archetypeSamplerIds=[
  'FLAME-FUSION','RAPID-FIRE-AGENT','WARD-OF-FLAMES','MENTIS-IMPERIUM','HEROIC-LEAP',
  'CYCLONE-BOOMERANG','EARTHEN-AEGIS','BALL-LIGHTNING','AQUA-BEAM','ARCANE-INTERVENTION',
];

assert.equal(WIZARD_NEXT_TWENTY_CARDS.length,20);
assert.deepEqual(WIZARD_NEXT_TWENTY_CARDS.map(card=>card.arcanaId),nextTwentyIds);
assert.deepEqual(WIZARD_NEXT_TWENTY_CARDS.map(card=>card.sourceOrder),Array.from({length:20},(_,index)=>index+13));
assert.ok(WIZARD_NEXT_TWENTY_CARDS.every(card=>card.id===`WOL-${card.arcanaId}`));
assert.ok(WIZARD_NEXT_TWENTY_CARDS.every(card=>card.sourceGame==='Wizard of Legend'&&card.type==='ability'&&card.playEvent==='wizard-arcana:play'));
assert.ok(WIZARD_NEXT_TWENTY_CARDS.every(card=>card.baseFormOnly===true&&Object.isFrozen(card)&&Object.isFrozen(card.baseForm)&&Object.isFrozen(card.details.rows)));
assert.ok(WIZARD_NEXT_TWENTY_CARDS.every(card=>card.sourceClip.start<card.sourceClip.end));

const basics=WIZARD_NEXT_TWENTY_CARDS.filter(card=>card.sourceCategory==='Basic');
const dashes=WIZARD_NEXT_TWENTY_CARDS.filter(card=>card.sourceCategory==='Dash');
assert.equal(basics.length,4);
assert.equal(dashes.length,16);
assert.ok(basics.every(card=>!card.dashMotion));
assert.equal(dashes.filter(card=>card.dashMotion.kind==='continuous'&&card.dashMotion.profile==='basic').length,15);
assert.deepEqual(wizardArcanaCardById('CHAOTIC-RIFT').dashMotion,{kind:'teleport',profile:'basic-direction-distance'});

assert.deepEqual(wizardArcanaCardById('ICE-DAGGER').baseForm.damage,[6,6,8,10]);
assert.deepEqual(wizardArcanaCardById('RIP-TIDE').baseForm.damage,[8,7,5]);
assert.deepEqual(wizardArcanaCardById('AQUA-ARC').baseForm.emissions,[1,1,2]);
assert.deepEqual(wizardArcanaCardById('CHAOS-CRUSHER').baseForm,{cycles:3,proximal:{damage:8,knockback:15},core:{damage:6,knockback:10,piercing:true},interceptsProjectiles:['proximal','core'],independentPhaseHits:true});
assert.deepEqual(wizardArcanaCardById('SEARING-RUSH').baseForm.ticks,[7,7,7,7]);
assert.equal(wizardArcanaCardById('CIRCUIT-LINE').baseForm.additionalTicksPerChain,2);
assert.equal(wizardArcanaCardById('WAVE-FRONT').baseForm.absorption,25);
assert.equal(wizardArcanaCardById('FROST-FEINT').baseForm.proximityTrigger,false);
assert.equal(wizardArcanaCardById('CHAOTIC-RIFT').baseForm.damage,0);

const canonicalIds=[
  'FLAME-STRIKE','FLAME-CROSS','BOUNCING-BLAZE','WIND-SLASH',
  'AIR-SPINNER','PERFORATING-JET','EARTH-KNUCKLES','BLADED-VINE',
  'STONE-SHOT','SPARK-CONTACT','BOLT-RAIL','VOLT-DISC',
  ...nextTwentyIds,
  'HOMING-FLARES','DRAGON-ARC','FLAME-FUSION','RAPID-FIRE-AGENT','WARD-OF-FLAMES',
  'WHIRLING-TORNADO','MENTIS-IMPERIUM','HEROIC-LEAP','CYCLONE-BOOMERANG',
  'EARTHEN-AEGIS','BALL-LIGHTNING','WATER-PRISON','AQUA-BEAM','ARCANE-INTERVENTION',
];
assert.equal(WIZARD_ARCHETYPE_SAMPLER_CARDS.length,10);
assert.deepEqual(WIZARD_ARCHETYPE_SAMPLER_CARDS.map(card=>card.arcanaId),archetypeSamplerIds);
assert.ok(WIZARD_ARCHETYPE_SAMPLER_CARDS.every(card=>card.baseFormOnly===true&&card.playEvent==='wizard-arcana:play'));
assert.ok(WIZARD_ARCHETYPE_SAMPLER_CARDS.every(card=>card.sourceClip.start<card.sourceClip.end));
assert.equal(wizardArcanaCardById('AQUA-BEAM').chargedVariantEnabled,false,'only Aqua Beam base form ships in this pass');

assert.equal(WIZARD_ARCANA_CATALOG.length,46);
assert.equal(new Set(WIZARD_ARCANA_CATALOG.map(card=>card.id)).size,46);
assert.deepEqual(WIZARD_ARCANA_CATALOG.map(card=>card.arcanaId),canonicalIds);
assert.deepEqual(WIZARD_ARCANA_CATALOG.map(wizardArcanaSourceOrder),[
  ...Array.from({length:32},(_,index)=>index+1),42,44,47,53,54,58,60,62,68,69,70,67,71,72,
]);
for(const id of archetypeSamplerIds){
  const card=wizardArcanaCardById(id);
  assert.equal(wizardArcanaSourceOrder(id),card.analysisOrder,`${id} must retain its source order through a bare string lookup`);
  assert.equal(wizardArcanaSourceOrder(`WOL-${id}`),card.analysisOrder,`${id} must retain its source order through a card-ID lookup`);
  assert.equal(wizardArcanaShowcaseStart(id),card.sourceClip.start,`${id} must retain its showcase timestamp through a bare string lookup`);
  assert.equal(wizardArcanaShowcaseStart(`WOL-${id}`),card.sourceClip.start,`${id} must retain its showcase timestamp through a card-ID lookup`);
}

const originalCards=[...WIZARD_ARCANA_CARDS,...WIZARD_AIR_BASIC_CARDS,...WIZARD_NEXT_SOURCE_CARDS,...WIZARD_ARCHETYPE_SAMPLER_CARDS];
assert.ok(originalCards.every(card=>WIZARD_ARCANA_CATALOG_BY_ID.get(card.id)===card),'the catalog must preserve every existing frozen card object');
assert.ok(WIZARD_ARCANA_CATALOG.every(card=>WIZARD_ARCANA_CATALOG_BY_ARCANA_ID.get(card.arcanaId)===card));
assert.equal(wizardArcanaCardById('ice-dagger'),WIZARD_NEXT_TWENTY_CARDS[0]);
assert.equal(wizardArcanaCardById('WOL-ICE-DAGGER'),WIZARD_NEXT_TWENTY_CARDS[0]);
assert.equal(wizardArcanaCardById('missing'),null);

assert.equal(ABILITY_CAPTURE_CARDS,WIZARD_ARCANA_CATALOG,'capture and Enemy Lab must consume the same canonical catalog');
assert.equal(normalizeCaptureArcanaId('WOL-FROST-WING'),'FROST-WING');
assert.equal(captureCardById('FROST-WING'),wizardArcanaCardById('FROST-WING'));
assert.equal(captureCardById('AQUA-BEAM'),wizardArcanaCardById('AQUA-BEAM'));

const stance={id:'S24',name:'S24 RAT STEP',type:'stance',chain:['vertical10','stab5','horizontal6']};
const selected=wizardArcanaCardById('CIRCUIT-LINE');
const deck=createStanceDeck({rng:()=>0});
deck.beginRun([stance,selected],{openingStanceId:'S24'});
assert.equal(deck.pool.find(card=>card.id===selected.id),selected,'run-deck construction must preserve the catalog card object and metadata');
deck.rebuild([{id:'S99',name:'replacement',type:'stance',chain:[]}]);
assert.equal(deck.pool.find(card=>card.id===selected.id),selected,'saved run rebuilds must retain a selected next-twenty Arcana');

console.log('wizard arcana canonical catalog tests passed');
