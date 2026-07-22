import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ABILITY_TRYOUT_ENTRIES,
  ABILITY_TRYOUT_FAMILIES,
  cycleTryoutIndex,
  firstTryoutIndexForFamily,
} from '../src/ability-tryout-registry.js';
import { maskTryoutGamepad } from '../src/ability-tryout-runtime.js';

test('tryout registry contains current merged cards without unmerged Warden actives',()=>{
  assert.equal(ABILITY_TRYOUT_ENTRIES.length,43);
  assert.equal(ABILITY_TRYOUT_ENTRIES[0].sourceId,'S01');
  assert.ok(ABILITY_TRYOUT_ENTRIES.some(entry=>entry.sourceId==='S31-BING-BONG'));
  assert.ok(ABILITY_TRYOUT_ENTRIES.some(entry=>entry.sourceId==='M01-BLOOD-SLASH'));
  assert.ok(ABILITY_TRYOUT_ENTRIES.some(entry=>entry.sourceId==='A01-PILEBUNKER'));
  assert.equal(ABILITY_TRYOUT_ENTRIES.filter(entry=>entry.kind==='eden').length,10);
  assert.equal(ABILITY_TRYOUT_ENTRIES.some(entry=>/^A1[0-9]-/.test(entry.sourceId)),false);
  assert.deepEqual(ABILITY_TRYOUT_FAMILIES,['Stances','Modifiers','Warden Ability','Eden · Anima','Eden · Convergence']);
});

test('selection wraps and family jumps land on the first matching card',()=>{
  const count=ABILITY_TRYOUT_ENTRIES.length;
  assert.equal(cycleTryoutIndex(0,-1,count),count-1);
  assert.equal(cycleTryoutIndex(count-1,1,count),0);
  assert.equal(ABILITY_TRYOUT_ENTRIES[firstTryoutIndexForFamily('Modifiers')].sourceId,'M01-BLOOD-SLASH');
  assert.equal(ABILITY_TRYOUT_ENTRIES[firstTryoutIndexForFamily('Eden · Convergence')].sourceId,'CONVERGENCE-FOCUS');
});

test('gamepad mask preserves attacks, dodge and weapon cycling only',()=>{
  const buttons=Array.from({length:16},(_,index)=>({pressed:true,touched:true,value:index/15}));
  const source={id:'pad',index:0,connected:true,mapping:'standard',timestamp:4,axes:[.25,-.5],buttons};
  const masked=maskTryoutGamepad(source,true);
  for(const index of[0,2,3,6,7,8,9,12,13])assert.equal(masked.buttons[index].pressed,true,`button ${index} should pass through`);
  for(const index of[1,4,5,11,14,15]){
    assert.equal(masked.buttons[index].pressed,false,`button ${index} should be reserved`);
    assert.equal(masked.buttons[index].value,0);
  }
  assert.deepEqual(masked.axes,[.25,-.5]);
  assert.equal(maskTryoutGamepad(source,false),source);
});
