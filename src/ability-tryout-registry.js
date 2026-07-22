import { STANCE_CARDS } from './stance-cards.js';
import { BING_BONG_CARD, BLOOD_SLASH_CARD } from './combat-modifier-cards.js';
import { POW_BUNKER_CARD } from './powbunker-card.js';
import { EDEN_SPELLS } from './eden-spell-catalog.js';

const freeze = value => Object.freeze(value);
const words = values => Array.isArray(values) && values.length ? values.join(', ') : 'None listed';
const EDEN_SUMMARIES=Object.freeze({
  'ANIMA-FROSTBOLT':'Projectile · 40 damage · 1 Frost',
  'ANIMA-COLD-SNAP':'All enemies · apply 1 Frost',
  'ANIMA-THUNDER':'Ground target · 100 damage',
  'ANIMA-FIREWALL':'Place five persistent Flames',
  'ANIMA-RING-OF-FIRE':'Place an eight-Flame ring',
  'ANIMA-MELTDOWN':'Detonate Frosted enemies into Flame',
  'CONVERGENCE-FOCUS':'Gain 2 Spell Power',
  'CONVERGENCE-MANA-FUSION':'Spend 2 mana · restore 5',
  'CONVERGENCE-TRI-FORCE':'Gain Trinity · power at 3',
  'CONVERGENCE-LIMIT-BREAK':'40-shot aimed barrage',
});

function cleanStanceName(name=''){
  return String(name).replace(/^S\d+\s*/i,'').trim() || String(name);
}

function stanceDescription(card){
  const tags=words(card.styleTags);
  const weapons=words(card.preferredWeapons);
  return `${cleanStanceName(card.name)} changes Warden's light-light-heavy attack chain. Style: ${tags}. Preferred weapons: ${weapons}.`;
}

function stanceEntry(card){
  const tags=Array.isArray(card.styleTags)?card.styleTags.slice(0,2):[];
  return freeze({
    id:`stance:${card.id}`,
    sourceId:card.id,
    kind:'stance',
    family:'Stances',
    name:card.name,
    shortName:cleanStanceName(card.name),
    summary:`Equip stance${tags.length?` · ${tags.join(' · ')}`:''}`,
    description:stanceDescription(card),
    control:'Press RB to equip this stance.',
    activation:'press',
    card,
  });
}

function modifierEntry(card){
  return freeze({
    id:`modifier:${card.id}`,
    sourceId:card.id,
    kind:'modifier',
    family:'Modifiers',
    name:card.name,
    shortName:card.name,
    summary:'Gain 3 empowered attacks',
    description:'Gain three Blood Slash charges. Each following attack spends one charge; horizontal attacks gain a much larger red trail and apply movement-powered Bleed on hit.',
    control:'Press RB to gain three charges.',
    activation:'press',
    card,
  });
}

function pilebunkerEntry(card){
  return freeze({
    id:`ability:${card.id}`,
    sourceId:card.id,
    kind:'pilebunker',
    family:'Warden Ability',
    name:card.name,
    shortName:'Pilebunker',
    summary:'Heavy lunge + direct hit + shockwave',
    description:'Brace, ratchet the pile mechanism, lunge forward, then drive a heavy direct strike and frontal shockwave into enemies.',
    control:'Press RB to activate when the Pilebunker is ready.',
    activation:'press',
    card,
  });
}

function edenEntry(card){
  const aimed=card.targeting?.kind!=='instant';
  return freeze({
    id:`eden:${card.id}`,
    sourceId:card.id,
    kind:'eden',
    family:`Eden · ${card.brand}`,
    name:card.name,
    shortName:card.name,
    summary:EDEN_SUMMARIES[card.id]||card.description,
    description:card.description,
    control:aimed?'Hold RB to channel and aim, then release to cast.':'Press RB to cast immediately.',
    activation:aimed?'hold':'press',
    card,
  });
}

const stanceCards=[...STANCE_CARDS];
if(!stanceCards.some(card=>card.id===BING_BONG_CARD.id))stanceCards.push(BING_BONG_CARD);

export const ABILITY_TRYOUT_ENTRIES=freeze([
  ...stanceCards.map(stanceEntry),
  modifierEntry(BLOOD_SLASH_CARD),
  pilebunkerEntry(POW_BUNKER_CARD),
  ...EDEN_SPELLS.map(edenEntry),
]);

export const ABILITY_TRYOUT_BY_ID=freeze(Object.fromEntries(ABILITY_TRYOUT_ENTRIES.map(entry=>[entry.id,entry])));
export const ABILITY_TRYOUT_FAMILIES=freeze([...new Set(ABILITY_TRYOUT_ENTRIES.map(entry=>entry.family))]);

export function cycleTryoutIndex(index,delta,count=ABILITY_TRYOUT_ENTRIES.length){
  const size=Math.max(0,Math.floor(Number(count)||0));
  if(size<=0)return 0;
  const current=Math.floor(Number(index)||0),step=Math.trunc(Number(delta)||0);
  return((current+step)%size+size)%size;
}

export function firstTryoutIndexForFamily(family){
  const index=ABILITY_TRYOUT_ENTRIES.findIndex(entry=>entry.family===family);
  return index<0?0:index;
}
