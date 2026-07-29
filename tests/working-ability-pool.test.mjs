import assert from 'node:assert/strict';
import { STANCE_CARDS } from '../src/stance-cards.js';
import { BLOOD_SLASH_CARD } from '../src/combat-modifier-cards.js';
import { WIZARD_ARCANA_CATALOG } from '../src/wizard-arcana-catalog.js';
import { ARENA_ABILITY_CATALOG } from '../src/arena-ability-catalog.js';
import {
  ENEMY_LAB_WORKING_ABILITY_POOL_KEY,
  normalizeWorkingAbilityPoolIds,
  readWorkingAbilityPool,
  toggleWorkingAbilityPoolId,
  writeWorkingAbilityPool,
} from '../src/enemy-lab-working-ability-pool.js';

const stanceId=STANCE_CARDS[0].id;
const arcanaId=WIZARD_ARCANA_CATALOG[0].id;
const modifierId=BLOOD_SLASH_CARD.id;

assert.deepEqual(normalizeWorkingAbilityPoolIds([modifierId,'missing',arcanaId,stanceId,arcanaId]),[
  stanceId,
  arcanaId,
  modifierId,
]);
assert.deepEqual(toggleWorkingAbilityPoolId([],arcanaId),[arcanaId]);
assert.deepEqual(toggleWorkingAbilityPoolId([arcanaId],arcanaId),[]);
assert.deepEqual(toggleWorkingAbilityPoolId([stanceId],'missing'),[stanceId]);

const data=new Map();
const storage={
  getItem:key=>data.get(key)??null,
  setItem:(key,value)=>data.set(key,String(value)),
};
assert.deepEqual(readWorkingAbilityPool(storage),[],'a new working pool starts empty');
assert.deepEqual(writeWorkingAbilityPool(storage,[modifierId,stanceId,arcanaId,'missing']),[
  stanceId,
  arcanaId,
  modifierId,
]);
assert.equal(data.get(ENEMY_LAB_WORKING_ABILITY_POOL_KEY),JSON.stringify([stanceId,arcanaId,modifierId]));
assert.deepEqual(readWorkingAbilityPool(storage),[stanceId,arcanaId,modifierId]);

data.set(ENEMY_LAB_WORKING_ABILITY_POOL_KEY,'not-json');
assert.deepEqual(readWorkingAbilityPool(storage),[]);
assert.equal(ARENA_ABILITY_CATALOG.length,79);

console.log('Working ability pool persistence: ok');
