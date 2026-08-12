import { freezeCard } from './card-definition.js';
import { BING_BONG_CARD, BLOOD_SLASH_CARD } from './combat-modifier-cards.js';
import { getEffectDefinition } from './effect-registry.js';
import { POW_BUNKER_CARD } from './powbunker-card.js';
import { STANCE_CARD_DEFINITIONS } from './stance-card-definitions.js';
import { WIZARD_AIR_BASIC_CARDS } from './wizard-air-basics-cards.js';
import { WIZARD_ARCANA_CARDS } from './wizard-arcana-cards.js';
import { WIZARD_ARCHETYPE_SAMPLER_CARDS } from './wizard-archetype-sampler-cards.js';
import { WIZARD_CURATED_DEMO_CARDS } from './wizard-curated-demo-cards.js';
import { WIZARD_NEXT_SOURCE_CARDS } from './wizard-next-source-cards.js';
import { WIZARD_NEXT_TWENTY_CARDS } from './wizard-next-twenty-cards.js';
import { WIZARD_VFX_ARCANA_CARDS } from './wizard-vfx-arcana-cards.js';

const CONTRIBUTIONS = Object.freeze([
  Object.freeze({family:'stance',cards:STANCE_CARD_DEFINITIONS}),
  Object.freeze({family:'special-stance',cards:Object.freeze([BING_BONG_CARD])}),
  Object.freeze({family:'non-stance',cards:Object.freeze([POW_BUNKER_CARD,BLOOD_SLASH_CARD])}),
  Object.freeze({family:'arcana',cards:Object.freeze([
    ...WIZARD_ARCANA_CARDS,
    ...WIZARD_AIR_BASIC_CARDS,
    ...WIZARD_NEXT_SOURCE_CARDS,
    ...WIZARD_NEXT_TWENTY_CARDS,
    ...WIZARD_ARCHETYPE_SAMPLER_CARDS,
    ...WIZARD_VFX_ARCANA_CARDS,
    ...WIZARD_CURATED_DEMO_CARDS,
  ])}),
]);

const entries=[];
const entriesById=new Map();
for(const contribution of CONTRIBUTIONS){
  for(const sourceCard of contribution.cards){
    const card=freezeCard(sourceCard);
    const id=String(card?.id||'').trim();
    if(!id)throw new Error(`Card definition in ${contribution.family} is missing an id`);
    if(entriesById.has(id))throw new Error(`Duplicate card definition: ${id}`);
    if((card.type==='ability'||card.type==='modifier')&&!card.effectId)throw new Error(`Non-stance card ${id} is missing an effectId`);
    if(card.effectId&&!getEffectDefinition(card.effectId))throw new Error(`Card ${id} references unknown effect: ${card.effectId}`);
    const entry=Object.freeze({id,family:contribution.family,card});
    entries.push(entry);entriesById.set(id,entry);
  }
}

const ALL_ENTRIES=Object.freeze(entries.slice());
const CARD_IDS=Object.freeze(ALL_ENTRIES.map(entry=>entry.id));
const normalizeId=value=>String(value?.id??value??'').trim();
const entryFor=value=>entriesById.get(normalizeId(value))||null;

export const CARD_FAMILIES = Object.freeze(CONTRIBUTIONS.map(contribution=>contribution.family));
export const CARD_REGISTRY_ENTRIES = ALL_ENTRIES;
export const CARD_DEFINITIONS = Object.freeze(ALL_ENTRIES.map(entry=>entry.card));
export { CARD_IDS };

export function getCard(value){
  return entryFor(value)?.card||null;
}

export function requireCard(value){
  const card=getCard(value);
  if(!card)throw new Error(`Unknown card definition: ${normalizeId(value)}`);
  return card;
}

export const getCardDefinition=getCard;
export const requireCardDefinition=requireCard;

export function listCards({family,type,sourceGame,effectId}={}){
  const result=ALL_ENTRIES
    .filter(entry=>family===undefined||entry.family===family)
    .map(entry=>entry.card)
    .filter(card=>type===undefined||card.type===type)
    .filter(card=>sourceGame===undefined||card.sourceGame===sourceGame)
    .filter(card=>effectId===undefined||card.effectId===effectId);
  return Object.freeze(result);
}

export const listCardDefinitions=listCards;

export function getCardEntry(value){
  return entryFor(value);
}

export const CARD_REGISTRY = Object.freeze({get:getCard,require:requireCard,list:listCards});
export const cardRegistry = CARD_REGISTRY;
