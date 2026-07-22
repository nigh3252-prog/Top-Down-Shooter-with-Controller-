import test from 'node:test';
import assert from 'node:assert/strict';
import { EDEN_SPELL_BY_ID } from '../src/eden-spell-catalog.js';
import { addFrost, createEdenSpellRuntime, createEdenSpellState } from '../src/eden-spell-runtime.js';

const frame={origin:{x:0,z:0},forward:{x:0,z:1},targetPoint:{x:2,z:3},toWorld:()=>({x:0,z:0})};

test('three Frost stacks burst for 150 and clear the stacks',()=>{
  const enemy={hp:300,statuses:{frost:2}};
  const result=addFrost(enemy,1);
  assert.equal(result.bursts,1);
  assert.equal(enemy.statuses.frost,0);
  assert.equal(enemy.hp,150);
});

test('Focus spends mana and adds Spell Power',()=>{
  const state=createEdenSpellState({mana:3,maxMana:3});
  const runtime=createEdenSpellRuntime({state});
  assert.equal(runtime.cast(EDEN_SPELL_BY_ID['CONVERGENCE-FOCUS'],frame),true);
  assert.equal(state.mana,2);
  assert.equal(state.spellPower,2);
});

test('Tri Force completion grants Spell Power',()=>{
  const state=createEdenSpellState({trinity:2});
  const runtime=createEdenSpellRuntime({state});
  runtime.cast(EDEN_SPELL_BY_ID['CONVERGENCE-TRI-FORCE'],frame);
  assert.equal(state.trinity,0);
  assert.equal(state.spellPower,3);
});

test('Spell Power is included in adapter damage',()=>{
  const enemy={hp:100,statuses:{}};
  const state=createEdenSpellState({mana:3,maxMana:3,spellPower:4});
  let projectile=null,reported=0;
  const runtime=createEdenSpellRuntime({
    state,
    dealDamage:(target,amount)=>{reported=amount;target.hp-=amount;},
    spawnProjectile:spec=>{projectile=spec;},
    schedule:(_delay,action)=>action(),
  });
  runtime.cast(EDEN_SPELL_BY_ID['CONVERGENCE-LIMIT-BREAK'],frame);
  projectile.onHit(enemy);
  assert.equal(reported,14);
  assert.equal(enemy.hp,86);
});

test('unlimited mana casts without spending mana',()=>{
  const state=createEdenSpellState({mana:0,maxMana:3});
  const runtime=createEdenSpellRuntime({state});
  assert.equal(runtime.cast(EDEN_SPELL_BY_ID['CONVERGENCE-FOCUS'],frame,{unlimitedMana:true}),true);
  assert.equal(state.mana,0);
  assert.equal(state.spellPower,2);
});
