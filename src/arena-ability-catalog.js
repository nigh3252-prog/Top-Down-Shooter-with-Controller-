import { STANCE_CARDS } from './stance-cards.js';
import { BING_BONG_CARD, BLOOD_SLASH_CARD } from './combat-modifier-cards.js';
import { POW_BUNKER_CARD } from './powbunker-card.js';
import { WIZARD_ARCANA_CATALOG, isWizardArcanaCard } from './wizard-arcana-catalog.js';

export const ARENA_ABILITY_FAMILIES=Object.freeze([
  'STANCES',
  'SPECIAL STANCES',
  'ARCANA',
  'ABILITIES',
  'MODIFIERS',
]);

const specialIds=new Set([BING_BONG_CARD.id,POW_BUNKER_CARD.id,BLOOD_SLASH_CARD.id]);
const unique=values=>[...new Set((values||[]).filter(Boolean))];
const cleanName=card=>String(card?.name||card?.id||'ABILITY').replace(/^S\d+\s*/, '');
const standardStances=STANCE_CARDS.filter(card=>card?.id&&!specialIds.has(card.id)&&!isWizardArcanaCard(card));

function abilityEntry(card,{family,source='Combat Arena',readiness='candidate'}={}){
  const type=card?.type||'stance';
  const tags=unique([
    ...(card?.styleTags||[]),
    card?.element,
    card?.sourceCategory,
    type,
  ]);
  return Object.freeze({
    id:String(card.id),
    card,
    name:cleanName(card),
    family,
    type,
    source:card?.sourceGame||source,
    tags:Object.freeze(tags),
    description:String(card?.description||card?.details?.summary||''),
    readiness,
    arcanaId:card?.arcanaId||null,
    element:card?.element||null,
  });
}

export const ARENA_ABILITY_CATALOG=Object.freeze([
  ...standardStances.map(card=>abilityEntry(card,{family:'STANCES'})),
  abilityEntry(BING_BONG_CARD,{family:'SPECIAL STANCES'}),
  ...WIZARD_ARCANA_CATALOG.map(card=>abilityEntry(card,{family:'ARCANA',source:'Wizard of Legend'})),
  abilityEntry(POW_BUNKER_CARD,{family:'ABILITIES'}),
  abilityEntry(BLOOD_SLASH_CARD,{family:'MODIFIERS'}),
]);

export const ARENA_ABILITY_CARDS=Object.freeze(ARENA_ABILITY_CATALOG.map(entry=>entry.card));
export const ARENA_ABILITY_CATALOG_BY_ID=new Map(ARENA_ABILITY_CATALOG.map(entry=>[entry.id,entry]));

export function getArenaAbilityCatalogEntry(value){
  return ARENA_ABILITY_CATALOG_BY_ID.get(String(value||''))||null;
}

export function getArenaAbilityCard(value){
  return getArenaAbilityCatalogEntry(value)?.card||null;
}

export function normalizeArenaAbilityIds(ids,catalog=ARENA_ABILITY_CATALOG){
  const requested=new Set(Array.isArray(ids)?ids.map(id=>String(id)):[]);
  return (catalog||[]).filter(entry=>requested.has(String(entry?.id))).map(entry=>String(entry.id));
}

export const ARENA_ABILITY_COUNTS=Object.freeze(Object.fromEntries(
  ARENA_ABILITY_FAMILIES.map(family=>[
    family,
    ARENA_ABILITY_CATALOG.filter(entry=>entry.family===family).length,
  ])
));
