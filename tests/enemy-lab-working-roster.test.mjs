import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ARENA_ENEMY_CATALOG,
  ARENA_ENEMY_FAMILIES,
} from '../src/arena-enemy-catalog.js';
import {
  ENEMY_LAB_WORKING_ROSTER_STORAGE_KEY,
  normalizeWorkingRosterIds,
  readWorkingRoster,
  toggleWorkingRosterId,
  writeWorkingRoster,
} from '../src/enemy-lab-working-roster.js';

const catalogIds=ARENA_ENEMY_CATALOG.map(enemy=>enemy.id);
assert.equal(ARENA_ENEMY_CATALOG.length,29);
assert.deepEqual(ARENA_ENEMY_FAMILIES,['GOBLINS','FUSION','FLARE','HADES']);
assert.equal(new Set(catalogIds).size,catalogIds.length);
assert.equal(ARENA_ENEMY_CATALOG.find(enemy=>enemy.id==='lion')?.arenaStatus,'lab');
assert.ok(ARENA_ENEMY_CATALOG.every(enemy=>enemy.arenaStatus!=='arena-ready'),'no enemy should be approved automatically');

assert.deepEqual(normalizeWorkingRosterIds([],ARENA_ENEMY_CATALOG),[]);
assert.deepEqual(
  normalizeWorkingRosterIds(['not-real','lion','grunt','lion'],ARENA_ENEMY_CATALOG),
  catalogIds.filter(id=>id==='grunt'||id==='lion'),
);
assert.deepEqual(toggleWorkingRosterId([], 'lion', ARENA_ENEMY_CATALOG),['lion']);
assert.deepEqual(toggleWorkingRosterId(['lion'], 'lion', ARENA_ENEMY_CATALOG),[]);
assert.deepEqual(toggleWorkingRosterId(['grunt'], 'not-real', ARENA_ENEMY_CATALOG),['grunt']);

const memory=new Map();
const storage={
  getItem:key=>memory.has(key)?memory.get(key):null,
  setItem:(key,value)=>memory.set(key,String(value)),
};
assert.deepEqual(readWorkingRoster(storage,ARENA_ENEMY_CATALOG),[],'the working roster starts empty');
const saved=writeWorkingRoster(storage,['lion','grunt','bad-id'],ARENA_ENEMY_CATALOG);
assert.deepEqual(saved,catalogIds.filter(id=>id==='grunt'||id==='lion'));
assert.equal(memory.has(ENEMY_LAB_WORKING_ROSTER_STORAGE_KEY),true);
assert.deepEqual(readWorkingRoster(storage,ARENA_ENEMY_CATALOG),saved);

const catalogSource=fs.readFileSync(new URL('../src/arena-enemy-catalog.js',import.meta.url),'utf8');
const installerSource=fs.readFileSync(new URL('../src/install-enemy-lab-development-tools.js',import.meta.url),'utf8');
const labSource=fs.readFileSync(new URL('../enemy-lab.html',import.meta.url),'utf8');
assert.doesNotMatch(catalogSource,/enemy-lab-working-roster\.js/,'the shared catalog should remain free of Lab installer side effects');
assert.match(installerSource,/enemy-lab-working-roster\.js/,'the explicit Enemy Lab installer should own roster setup');
assert.match(labSource,/installEnemyLabDevelopmentTools\(\)/,'roster tooling should remain explicitly scoped to Enemy Lab');

console.log('Enemy Lab working roster: ok');
