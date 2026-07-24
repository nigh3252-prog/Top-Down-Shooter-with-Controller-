import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ABILITY_TRYOUT_ENTRIES,
  ABILITY_TRYOUT_FAMILIES,
  DEFAULT_ENEMY_LAB_DECK_IDS,
  dependenciesForEntries,
  selectedEntries,
} from '../src/ability-tryout-registry.js';
import { createEnemyLabDeckModel } from '../src/enemy-lab-deck-model.js';
import { maskCardControllerGamepad } from '../src/enemy-lab-card-input.js';

test('combined catalog includes current cards, Eden, and Dragon Age abilities',()=>{
  assert.equal(ABILITY_TRYOUT_ENTRIES.length,72);
  assert.equal(ABILITY_TRYOUT_ENTRIES.filter(entry=>entry.kind==='stance').length,31);
  assert.equal(ABILITY_TRYOUT_ENTRIES.filter(entry=>entry.kind==='modifier').length,1);
  assert.equal(ABILITY_TRYOUT_ENTRIES.filter(entry=>entry.kind==='warden').length,30);
  assert.equal(ABILITY_TRYOUT_ENTRIES.filter(entry=>entry.kind==='eden').length,10);
  assert.deepEqual(ABILITY_TRYOUT_FAMILIES,['Stances','Modifiers','Dragon Age Abilities','Eden · Anima','Eden · Convergence']);
  assert.equal(DEFAULT_ENEMY_LAB_DECK_IDS.length,33);
  assert.equal(DEFAULT_ENEMY_LAB_DECK_IDS.filter(id=>id==='warden:A01-PILEBUNKER').length,1);
});

test('dependencies are the union of selected cards',()=>{
  const entries=selectedEntries(['eden:CONVERGENCE-TRI-FORCE','warden:A11-CHALLENGE','modifier:M01-BLOOD-SLASH']);
  const deps=dependenciesForEntries(entries);
  assert.deepEqual(new Set(deps.resources),new Set(['mana','spellPower','trinity','dStamina','guard','bloodSlash']));
  assert.deepEqual(new Set(deps.enemyStatuses),new Set(['taunt','bleed']));
});

test('regular deck keeps cooldown cards in hand then replaces them',()=>{
  const sample=ABILITY_TRYOUT_ENTRIES.filter(entry=>['stance:S01','warden:A10-COMBAT-ROLL','modifier:M01-BLOOD-SLASH'].includes(entry.id));
  const model=createEnemyLabDeckModel({entries:sample,rng:()=>.99,shuffleTime:.1});
  model.apply(sample.map(entry=>entry.id));
  const warden=sample.find(entry=>entry.kind==='warden'),stance=sample.find(entry=>entry.kind==='stance'),modifier=sample.find(entry=>entry.kind==='modifier');
  model.state.hand=[warden,stance];model.state.draw=[modifier];model.state.discard=[];model.state.cooldowns=[0,0];
  model.startCooldown(0,.2);model.update(.1);assert.equal(model.state.hand[0].kind,'warden');
  model.update(.11);assert.equal(model.state.hand[0].kind,'modifier');
});

test('input masking preserves ordinary combat and weapon switching',()=>{
  const buttons=Array.from({length:16},()=>({pressed:true,touched:true,value:1}));
  const pad={id:'pad',index:0,connected:true,mapping:'standard',timestamp:1,axes:[.2,-.4],buttons};
  const regular=maskCardControllerGamepad(pad,'regular');
  for(const index of [0,2,3,6,7,8,9,12,13,14,15])assert.equal(regular.buttons[index].pressed,true);
  for(const index of [1,4,5,11])assert.equal(regular.buttons[index].pressed,false);
  const ability=maskCardControllerGamepad(pad,'test');
  for(const index of [14,15])assert.equal(ability.buttons[index].pressed,false);
});

test('regular mode reuses the real Combat Arena hand instead of creating duplicate HUD ids',async()=>{
  const ui=await readFile(new URL('../src/ability-tryout-ui.js',import.meta.url),'utf8');
  assert.match(ui,/getElementById\('cardRow'\)/);
  assert.match(ui,/getElementById\('card0'\)/);
  assert.match(ui,/getElementById\('card1'\)/);
  assert.doesNotMatch(ui,/id=["']handCards["']/);
  assert.doesNotMatch(ui,/id=["']deckSide["']/);
  assert.doesNotMatch(ui,/enemyLabCardsPanel/);
  assert.match(ui,/addEventListener\('pointerdown',down,true\)/);
});

test('deck editor uses explicit draft, apply, and three-preset APIs',async()=>{
  const runtime=await readFile(new URL('../src/ability-tryout-runtime.js',import.meta.url),'utf8');
  const lab=await readFile(new URL('../enemy-lab.html',import.meta.url),'utf8');
  assert.match(runtime,/draftDeckIds/);
  assert.match(runtime,/getDeckEditorSnapshot:editorSnapshot/);
  assert.match(runtime,/toggleDraftCard/);
  assert.match(runtime,/applyDraft/);
  assert.match(runtime,/const PRESET_COUNT=3/);
  assert.match(runtime,/savePreset,loadPreset,clearPreset/);
  assert.match(lab,/\['cards','CARDS'/);
  assert.match(lab,/cardsBridge/);
  assert.match(lab,/CLEAR ALL/);
  assert.match(lab,/RESET TO APPLIED/);
  assert.match(lab,/APPLY & SHUFFLE/);
  assert.match(lab,/PRESET \$\{preset\.index\+1\}/);
  assert.match(lab,/aria-pressed/);
});

test('ability-test mode and resource controls remain available through the dedicated cards category',async()=>{
  const lab=await readFile(new URL('../enemy-lab.html',import.meta.url),'utf8');
  assert.match(lab,/REGULAR DECK/);
  assert.match(lab,/ABILITY TEST/);
  assert.match(lab,/TEST FAMILY/);
  assert.match(lab,/TEST CARD/);
  assert.match(lab,/Unlimited testing mana/);
  assert.match(lab,/RESET CARD STATE/);
});
