import assert from 'node:assert/strict';

import { getLastCombatHitContext, getWeaponDamageMultiplier } from '../src/combat-balance.js';
import {
  AVALANCHE_MODE_ID,
  classifyEnemyPressure,
  shouldStaggerHit,
} from '../src/enemy-pressure-lab.js';
import { DIRECTOR_MODES } from '../src/combat-director.js';

assert.ok(DIRECTOR_MODES.some(mode => mode.id === AVALANCHE_MODE_ID), 'Avalanche mode is registered');

const counts = classifyEnemyPressure([
  { id:1, hp:10, state:'windup', stunned:0, x:0, z:0 },
  { id:2, hp:10, state:'active', stunned:0, x:0, z:0 },
  { id:3, hp:10, state:'recovery', stunned:0, x:0, z:0 },
  { id:4, hp:10, state:'idle', stunned:0, cooldown:.4, x:0, z:0 },
  { id:5, hp:10, state:'idle', stunned:0, cooldown:0, x:12, z:0, vx:0, vz:0, holdDist:3 },
  { id:6, hp:10, state:'idle', stunned:.2, cooldown:0, x:2, z:0 },
], { x:0, z:0 });

assert.deepEqual(counts, {
  live:6,
  approaching:1,
  inRange:0,
  windup:1,
  active:1,
  recovery:1,
  cooldown:1,
  blocked:1,
  stunned:1,
});

getWeaponDamageMultiplier({
  weaponId:'warhammer',
  attackKey:'vertical9',
  attackGroup:'vertical',
  hitType:'blunt',
  zoneId:'hammer-head',
});
const context = getLastCombatHitContext();
assert.equal(context.weaponId, 'warhammer');
assert.equal(context.attackGroup, 'vertical');

const enemy = { id:7, hp:100, maxHp:100, state:'windup' };
assert.equal(
  shouldStaggerHit(enemy, 8, {}, { ...context, at:performance.now() }),
  true,
  'a real heavy chop reliably staggers'
);
assert.equal(
  shouldStaggerHit(enemy, 8, {}, { ...context, attackGroup:'horizontal', at:performance.now() }),
  false,
  'ordinary horizontal damage does not automatically cancel attacks'
);

console.log('enemy pressure lab tests passed');
