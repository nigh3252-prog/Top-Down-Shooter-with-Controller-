import assert from 'node:assert/strict';
import { STANCE_CARDS } from '../src/stance-cards.js';
import { BING_BONG_CARD, BLOOD_SLASH_CARD } from '../src/combat-modifier-cards.js';
import { POW_BUNKER_CARD } from '../src/powbunker-card.js';
import { WIZARD_ARCANA_CATALOG } from '../src/wizard-arcana-catalog.js';
import {
  ARENA_ABILITY_CARDS,
  ARENA_ABILITY_CATALOG,
  ARENA_ABILITY_COUNTS,
  ARENA_ABILITY_FAMILIES,
  getArenaAbilityCard,
  getArenaAbilityCatalogEntry,
  normalizeArenaAbilityIds,
} from '../src/arena-ability-catalog.js';

assert.equal(STANCE_CARDS.length,30);
assert.equal(WIZARD_ARCANA_CATALOG.length,56);
assert.equal(ARENA_ABILITY_CATALOG.length,89);
assert.equal(ARENA_ABILITY_CARDS.length,89);
assert.equal(new Set(ARENA_ABILITY_CATALOG.map(entry=>entry.id)).size,89);
assert.deepEqual(ARENA_ABILITY_FAMILIES,['STANCES','SPECIAL STANCES','ARCANA','ABILITIES','MODIFIERS']);
assert.deepEqual(ARENA_ABILITY_COUNTS,{
  STANCES:30,
  'SPECIAL STANCES':1,
  ARCANA:56,
  ABILITIES:1,
  MODIFIERS:1,
});

for(const stance of STANCE_CARDS){
  const entry=getArenaAbilityCatalogEntry(stance.id);
  assert.equal(entry?.card,stance);
  assert.equal(entry?.family,'STANCES');
  assert.equal(entry?.type,'stance');
}
for(const arcana of WIZARD_ARCANA_CATALOG){
  const entry=getArenaAbilityCatalogEntry(arcana.id);
  assert.equal(entry?.card,arcana,'the canonical ability catalog must preserve the frozen Arcana object');
  assert.equal(entry?.family,'ARCANA');
  assert.equal(entry?.arcanaId,arcana.arcanaId);
}
assert.equal(getArenaAbilityCard(BING_BONG_CARD.id),BING_BONG_CARD);
assert.equal(getArenaAbilityCard(POW_BUNKER_CARD.id),POW_BUNKER_CARD);
assert.equal(getArenaAbilityCard(BLOOD_SLASH_CARD.id),BLOOD_SLASH_CARD);
assert.equal(getArenaAbilityCatalogEntry('missing'),null);

const requested=[BLOOD_SLASH_CARD.id,'missing',STANCE_CARDS[0].id,WIZARD_ARCANA_CATALOG[0].id,STANCE_CARDS[0].id];
assert.deepEqual(normalizeArenaAbilityIds(requested),[
  STANCE_CARDS[0].id,
  WIZARD_ARCANA_CATALOG[0].id,
  BLOOD_SLASH_CARD.id,
]);

console.log('Arena ability catalog: 89 canonical cards');
