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
import { createStanceDeck } from '../src/stance-deck.js';
import { maskCardControllerGamepad } from '../src/enemy-lab-card-input.js';

const source=path=>readFile(new URL(path,import.meta.url),'utf8');

test('combined catalog includes current cards, Eden, and Dragon Age abilities',()=>{
  assert.equal(ABILITY_TRYOUT_ENTRIES.length,72);
  assert.equal(ABILITY_TRYOUT_ENTRIES.filter(entry=>entry.kind==='stance').length,31);
  assert.equal(ABILITY_TRYOUT_ENTRIES.filter(entry=>entry.kind==='modifier').length,1);
  assert.equal(ABILITY_TRYOUT_ENTRIES.filter(entry=>entry.kind==='warden').length,30);
  assert.equal(ABILITY_TRYOUT_ENTRIES.filter(entry=>entry.kind==='eden').length,10);
  assert.deepEqual(ABILITY_TRYOUT_FAMILIES,['Stances','Modifiers','Dragon Age Abilities','Eden · Anima','Eden · Convergence']);
  assert.equal(DEFAULT_ENEMY_LAB_DECK_IDS.length,33);
});

test('dependencies are the union of selected cards',()=>{
  const entries=selectedEntries(['eden:CONVERGENCE-TRI-FORCE','warden:A11-CHALLENGE','modifier:M01-BLOOD-SLASH']);
  const deps=dependenciesForEntries(entries);
  assert.deepEqual(new Set(deps.resources),new Set(['mana','spellPower','trinity','dStamina','guard','bloodSlash']));
  assert.deepEqual(new Set(deps.enemyStatuses),new Set(['taunt','bleed']));
});

test('the shared arena deck consumes a successful ability immediately',async()=>{
  let plays=0;
  const stance={id:'S-TEST',name:'Test Stance',chain:['a','b','c']};
  const ability={id:'A-TEST',name:'Test Ability',type:'ability',canPlay:()=>true,onPlay:()=>{plays++;}};
  const deck=createStanceDeck({rng:()=>.99,shuffleTime:.1});
  deck.beginRun([ability,stance]);
  assert.equal(deck.hand[0],ability);
  const result=deck.play(0);
  assert.ok(result?.__abilityProxy);
  assert.equal(deck.hand[0],null);
  assert.equal(deck.discardCount,1);
  await Promise.resolve();
  assert.equal(plays,1);
});

test('the shared arena deck leaves an unavailable ability in its slot',()=>{
  const stance={id:'S-TEST',name:'Test Stance',chain:['a','b','c']};
  const ability={id:'A-TEST',name:'Test Ability',type:'ability',canPlay:()=>false};
  const deck=createStanceDeck({rng:()=>.99});
  deck.beginRun([ability,stance]);
  assert.equal(deck.play(0),null);
  assert.equal(deck.hand[0],ability);
  assert.equal(deck.discardCount,0);
});

test('test-mode masking preserves normal combat outside the isolated test controls',()=>{
  const buttons=Array.from({length:16},()=>({pressed:true,touched:true,value:1}));
  const pad={id:'pad',index:0,connected:true,mapping:'standard',timestamp:1,axes:[.2,-.4],buttons};
  const masked=maskCardControllerGamepad(pad,'test');
  for(const index of[0,2,3,6,7,8,9,12,13])assert.equal(masked.buttons[index].pressed,true);
  for(const index of[1,4,5,11,14,15])assert.equal(masked.buttons[index].pressed,false);
});

test('regular Enemy Lab mode delegates to the actual Combat Arena deck and inputs',async()=>{
  const runtime=await source('../src/ability-tryout-runtime.js');
  const ui=await source('../src/ability-tryout-ui.js');
  assert.doesNotMatch(runtime,/createEnemyLabDeckModel/);
  assert.match(runtime,/api\.deck\.beginRun/);
  assert.match(runtime,/api\.startDeckShuffle/);
  assert.match(runtime,/state\.mode==='test'\?maskCardControllerGamepad\(pad,'test'\):pad/);
  assert.match(runtime,/get deck\(\)\{return arena\(\)\?\.deck/);
  assert.doesNotMatch(ui,/onHandDown|onShuffle/);
  assert.match(ui,/arena owns pointerdown/i);
  assert.match(ui,/onRegularRelease/);
});

test('compact Enemy Lab chrome restores fullscreen and separates deck actions',async()=>{
  const runtime=await source('../src/ability-tryout-runtime.js');
  assert.match(runtime,/enemyLabFullscreenBtn/);
  assert.match(runtime,/#dockHead\{display:none!important\}/);
  assert.match(runtime,/labCardSubnav/);
  assert.match(runtime,/\['deck','DECK'\],\['actions','ACTIONS'\],\['presets','PRESETS'\]/);
  assert.match(runtime,/cardsActions/);
});

test('deck editor retains explicit draft, applied, and three preset APIs',async()=>{
  const runtime=await source('../src/ability-tryout-runtime.js');
  assert.match(runtime,/draftDeckIds/);
  assert.match(runtime,/applyDraft/);
  assert.match(runtime,/PRESET_COUNT=3/);
  assert.match(runtime,/savePreset,loadPreset,clearPreset/);
});
