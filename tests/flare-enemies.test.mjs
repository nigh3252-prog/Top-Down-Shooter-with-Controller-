import assert from 'node:assert/strict';
import {
  FLARE_ATTACKS, FLARE_ENEMY_ARCHETYPES, FLARE_LEVEL_1_IDS,
  FLARE_LEVEL_1_POOL_ID, FLARE_ENEMY_OPTIONS, isFlareSpawnKind,
} from '../src/flare-enemies.js';

assert.equal(FLARE_LEVEL_1_IDS.length,5,'the introductory FLARE pool should contain five authored level-one enemies');
assert.deepEqual(FLARE_LEVEL_1_IDS,[
  'flareGoblinRunner','flareGoblinScamp','flareCrackedSkeleton','flareCursedZombie','flareRottingZombie'
]);
assert.equal(FLARE_ENEMY_ARCHETYPES.flareGoblinRunner.source.speed,4.5);
assert.equal(FLARE_ENEMY_ARCHETYPES.flareGoblinScamp.source.meleeRange,1.125);
assert.equal(FLARE_ENEMY_ARCHETYPES.flareCrackedSkeleton.statusImmunities[0],'bleeding');
assert.equal(FLARE_ENEMY_ARCHETYPES.flareCursedZombie.source.hp,30);
assert.equal(FLARE_ENEMY_ARCHETYPES.flareRottingZombie.source.cooldownMs,1800);
assert.ok(FLARE_ATTACKS.flareBloodStrike.bleed);
assert.ok(isFlareSpawnKind(FLARE_LEVEL_1_POOL_ID));
assert.ok(FLARE_ENEMY_OPTIONS.some(option=>option.id===FLARE_LEVEL_1_POOL_ID));
console.log('FLARE enemy research data: ok');
