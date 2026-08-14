import assert from 'node:assert/strict';
import {
  ARENA_ENEMY_FAMILIES,
  ARENA_ENEMY_IDS,
  ARENA_ENEMY_REGISTRY,
  ARENA_ENEMY_STATUSES,
  getArenaEnemy,
  getArenaEnemyBySpawnKind,
  listArenaEnemies,
  normalizeArenaEnemyStatus,
  requireArenaEnemy,
} from '../src/arena-enemy-content-registry.js';
import {
  ARENA_ENEMY_CATALOG,
  ARENA_ENEMY_OPTIONS,
  COMBINED_ENCOUNTER_GROUPS,
  getArenaEnemyCatalogEntry,
} from '../src/arena-enemy-catalog.js';
import {
  ENEMY_LAB_WORKING_ROSTER_STORAGE_KEY,
  readWorkingRoster,
  writeWorkingRoster,
} from '../src/enemy-lab-working-roster.js';

assert.deepEqual(ARENA_ENEMY_FAMILIES, ['GOBLINS', 'FUSION', 'FLARE', 'HADES']);
assert.deepEqual(ARENA_ENEMY_STATUSES, ['candidate', 'arena', 'lab', 'disabled']);
assert.equal(ARENA_ENEMY_REGISTRY.length, 30);
assert.equal(new Set(ARENA_ENEMY_IDS).size, ARENA_ENEMY_REGISTRY.length);
assert.equal(new Set(ARENA_ENEMY_REGISTRY.map(enemy => enemy.spawnKind)).size, ARENA_ENEMY_REGISTRY.length);
assert.ok(Object.isFrozen(ARENA_ENEMY_REGISTRY));
assert.ok(Object.isFrozen(ARENA_ENEMY_CATALOG));
assert.ok(Object.isFrozen(ARENA_ENEMY_OPTIONS));

for (const enemy of ARENA_ENEMY_REGISTRY) {
  assert.ok(Object.isFrozen(enemy), `${enemy.id} should be frozen`);
  assert.ok(Object.isFrozen(enemy.stats), `${enemy.id} stats should be frozen`);
  assert.ok(Object.isFrozen(enemy.attacks), `${enemy.id} attacks should be frozen`);
  assert.ok(Object.isFrozen(enemy.encounter), `${enemy.id} encounter metadata should be frozen`);
  assert.ok(enemy.family && enemy.runtimeAdapter && enemy.system);
  assert.equal(getArenaEnemy(enemy.id), enemy);
  assert.equal(getArenaEnemyBySpawnKind(enemy.spawnKind), enemy);
  assert.equal(requireArenaEnemy(enemy.id), enemy);

  const catalogEntry = getArenaEnemyCatalogEntry(enemy.id);
  assert.equal(catalogEntry.id, enemy.id);
  assert.equal(catalogEntry.encounterCost, enemy.encounter.encounterCost);
  assert.equal(catalogEntry.activeWeight, enemy.encounter.activeWeight);
  assert.equal(catalogEntry.maxCount, enemy.encounter.maxCount);
  assert.equal(catalogEntry.introductionDepth, enemy.encounter.introductionDepth);
  assert.equal(catalogEntry.arenaStatus, enemy.arenaStatus);
}

assert.equal(listArenaEnemies(), ARENA_ENEMY_REGISTRY);
assert.equal(listArenaEnemies({ family: 'HADES' }).length, 8);
assert.equal(listArenaEnemies({ system: 'flare' }).length, 5);
assert.equal(getArenaEnemy('missing'), null);
assert.throws(() => requireArenaEnemy('missing'), /Unknown enemy/);

assert.equal(requireArenaEnemy('grunt').stats.hp, 45);
assert.equal(requireArenaEnemy('trialDot').arenaStatus,'lab');
assert.equal(requireArenaEnemy('trialDot').stats.trialOnly,true);
assert.equal(requireArenaEnemy('lion').attacks[0].id, 'lionPounce');
assert.equal(requireArenaEnemy('flareGoblinRunner').attacks.length, 2);
assert.equal(requireArenaEnemy('hadesWretchedWitch').attacks[0].id, 'hadesWitchOrb');
assert.equal(requireArenaEnemy('lion').presentation.color, 0xc99d52);

for (const group of COMBINED_ENCOUNTER_GROUPS) {
  if (group.spawnKind === 'goblins') continue;
  const enemy = requireArenaEnemy(group.spawnKind);
  assert.ok(Object.isFrozen(group));
  assert.equal(group.system, enemy.system);
  assert.equal(group.encounterCost, enemy.encounter.encounterCost);
  assert.equal(group.activeWeight, enemy.encounter.activeWeight);
  assert.equal(group.maxCount, enemy.encounter.maxCount);
  assert.deepEqual(group.tags, enemy.encounter.tags);
}

const legacyStatus = 'lab-only';
const normalizedStatus = normalizeArenaEnemyStatus(legacyStatus);
assert.equal(normalizedStatus, 'lab');
assert.equal(getArenaEnemy('lion').arenaStatus, normalizedStatus);
assert.equal(normalizeArenaEnemyStatus('arena-ready'), 'arena');
assert.equal(normalizeArenaEnemyStatus('unknown'), 'candidate');
console.log(`Arena status normalization: ${legacyStatus} -> ${normalizedStatus}`);

const data = new Map();
const storage = {
  getItem: key => data.get(key) ?? null,
  setItem: (key, value) => data.set(key, String(value)),
};
const saved = writeWorkingRoster(storage, ['lion', 'hadesWretchedWitch', 'missing', 'lion'], ARENA_ENEMY_CATALOG);
assert.deepEqual(saved, ['lion', 'hadesWretchedWitch']);
assert.equal(data.has(ENEMY_LAB_WORKING_ROSTER_STORAGE_KEY), true);
assert.deepEqual(readWorkingRoster(storage, ARENA_ENEMY_CATALOG), saved);

console.log('Arena enemy registry inventory, references, compatibility, and persistence: ok');
