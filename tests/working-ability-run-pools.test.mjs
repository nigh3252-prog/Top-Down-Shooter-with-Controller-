import assert from 'node:assert/strict';
import { ARENA_ABILITY_CATALOG } from '../src/arena-ability-catalog.js';
import { ENEMY_LAB_WORKING_ABILITY_POOL_KEY } from '../src/enemy-lab-working-ability-pool.js';
import { buildRunOffers, drawRewardChoices } from '../src/run-draft.js';
import { resolveWorkingAbilityRunPools } from '../src/working-ability-run-pools.js';

function storageWith(ids=[]){
  const data=new Map([[ENEMY_LAB_WORKING_ABILITY_POOL_KEY,JSON.stringify(ids)]]);
  return{getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
}

const legacy=resolveWorkingAbilityRunPools({storage:storageWith([])});
assert.equal(legacy.active,false);
assert.equal(legacy.source,'legacy-fallback');
assert.equal(legacy.stancePool.length,31);
assert.equal(legacy.nonStancePool.length,2);
assert.equal(legacy.rewardPool.length,33);

const stance=ARENA_ABILITY_CATALOG.find(entry=>entry.family==='STANCES');
const special=ARENA_ABILITY_CATALOG.find(entry=>entry.family==='SPECIAL STANCES');
const arcana=ARENA_ABILITY_CATALOG.find(entry=>entry.family==='ARCANA');
const direct=ARENA_ABILITY_CATALOG.find(entry=>entry.family==='ABILITIES');
const modifier=ARENA_ABILITY_CATALOG.find(entry=>entry.family==='MODIFIERS');
const selectedIds=[stance.id,special.id,arcana.id,direct.id,modifier.id];
const selected=resolveWorkingAbilityRunPools({storage:storageWith(selectedIds)});
assert.equal(selected.active,true);
assert.equal(selected.source,'working-ability-pool');
assert.deepEqual(selected.ids,selectedIds);
assert.equal(selected.cards.length,5);
assert.equal(selected.stancePool.length,2);
assert.equal(selected.nonStancePool.length,3);
assert.equal(selected.rewardPool.length,5);
assert.equal(selected.cards[0],stance.card,'selected pools preserve canonical card identity');
assert.equal(selected.cards[2],arcana.card);

const offers=buildRunOffers({weaponOrder:['longsword'],nonStancePool:[arcana.card],count:1,rng:()=>0});
assert.equal(offers.length,1);
assert.deepEqual(offers[0].cards,[arcana.card],'a one-card selected pool does not duplicate the starter card');

const rewardChoices=drawRewardChoices({stancePool:[stance.card],nonStancePool:[arcana.card],count:3,rng:()=>0});
assert.equal(rewardChoices.length,2,'reward choices do not duplicate a small selected pool');
assert.deepEqual(new Set(rewardChoices),new Set([stance.card,arcana.card]));

console.log('Working Ability Pool run offers and rewards: ok');
