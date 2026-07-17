import assert from 'node:assert/strict';

import { getLastCombatHitContext, getWeaponDamageMultiplier } from '../src/combat-balance.js';
import {
  AVALANCHE_MODE_ID,
  classifyEnemyPressure,
  installEnemyPressureLab,
  shouldStaggerHit,
} from '../src/enemy-pressure-lab.js';
import { DIRECTOR_MODES } from '../src/combat-director.js';
import { clearArenaEnemyRegistry, setArenaEnemySource } from '../src/arena-enemy-registry.js';

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

function makeHarness() {
  let mode = 'pressureBudget';
  const target = {
    id:21,
    hp:100,
    maxHp:100,
    state:'idle',
    stateTime:0,
    attack:null,
    windup:0,
    active:0,
    recovery:0,
    hitDone:false,
    token:null,
    cooldown:0,
    stunned:0,
    x:8,
    z:0,
    vx:0,
    vz:0,
    speed:2,
    approachPermit:false,
    directEngaged:false,
    role:'goblin',
  };
  const director = {
    settings:{ pressureBudget:3 },
    setMode(next){ mode = next; },
    getMode(){ return mode; },
    update(){},
    canGrant(){ return false; },
    grant(nextEnemy, attack){
      const token = { enemy:nextEnemy, attack, kind:attack.kind, cost:attack.tokenCost || 1 };
      nextEnemy.token = token;
      return token;
    },
    hasApproachPermit(){ return false; },
    requestRally(){ return true; },
    getDebugState(){ return { mode }; },
    releaseAllForEnemy(nextEnemy){ nextEnemy.token = null; },
    onWaveClear(){ mode = AVALANCHE_MODE_ID; return mode; },
  };
  const system = {
    enemies:[target],
    director,
    setDirectorMode(next){ director.setMode(next); },
    update(){},
    damageEnemy(nextEnemy, amount, knock={x:0,z:0}){
      nextEnemy.hp -= amount;
      nextEnemy.knockX = (nextEnemy.knockX || 0) + (knock.x || 0);
      nextEnemy.knockZ = (nextEnemy.knockZ || 0) + (knock.z || 0);
      nextEnemy.stunned = Math.max(nextEnemy.stunned || 0, .3);
      director.releaseAllForEnemy(nextEnemy);
      nextEnemy.state = 'idle';
      nextEnemy.stateTime = 0;
      return nextEnemy.hp <= 0;
    },
  };
  const api = {
    originalSystem:system,
    flareSystem:null,
    hadesSystem:null,
    get enemies(){ return system.enemies; },
    get director(){ return system.director; },
    update(dt, player){ system.update(dt, player); },
    damageEnemy(...args){ return system.damageEnemy(...args); },
  };
  installEnemyPressureLab({ api, systemsByKey:{ original:system }, getVisibleSystems:() => [system] });
  return { api, system, director, target };
}

const direct = makeHarness();
direct.api.setEnemyWindupScale(2);
direct.api.setAvalancheRecoveryScale(.5);
direct.system.setDirectorMode(AVALANCHE_MODE_ID);
assert.equal(direct.director.getMode(), AVALANCHE_MODE_ID);
direct.director.update(.016, { enemies:direct.system.enemies, player:{x:0,z:0} });
assert.equal(direct.target.approachPermit, true, 'Avalanche permits every live enemy to approach');
assert.equal(direct.target.directEngaged, true, 'Avalanche marks every live enemy as actively engaging');
assert.equal(direct.director.hasApproachPermit(direct.target), true);
assert.equal(direct.director.canGrant(direct.target, { kind:'melee' }), true);

const attack = { kind:'melee', windup:1, recovery:1, tokenCost:1 };
direct.target.windup = 1;
direct.target.recovery = 1;
direct.director.grant(direct.target, attack);
assert.equal(direct.target.windup, 2, 'global windup scale applies per attack instance');
assert.equal(direct.target.recovery, .5, 'Avalanche recovery scale applies per attack instance');

getWeaponDamageMultiplier({
  weaponId:'longsword',
  attackKey:'horizontal3',
  attackGroup:'horizontal',
  hitType:'slice',
  zoneId:'blade',
});
direct.target.state = 'windup';
direct.target.stateTime = .2;
direct.target.stunned = 0;
direct.system.damageEnemy(direct.target, 8, {x:2,z:0});
assert.equal(direct.target.state, 'windup', 'ordinary knockback preserves an in-progress enemy attack');
assert.ok(direct.target.knockX > 0, 'ordinary hit still applies physical knockback');
direct.target.stunned = .5; // mirrors the arena's retained legacy post-hit assignment
direct.system.update(.016, {x:0,z:0});
assert.equal(direct.target.stunned, 0, 'legacy automatic stun is removed before the enemy update');

getWeaponDamageMultiplier({
  weaponId:'warhammer',
  attackKey:'vertical9',
  attackGroup:'vertical',
  hitType:'blunt',
  zoneId:'hammer-head',
});
direct.target.state = 'windup';
direct.target.stunned = 0;
direct.system.damageEnemy(direct.target, 8, {x:0,z:2});
assert.equal(direct.target.state, 'idle', 'qualifying chop cancels the enemy attack');
assert.ok(direct.target.stunned > 0, 'qualifying chop applies true stagger');

const cycled = makeHarness();
setArenaEnemySource(cycled.api);
cycled.director.onWaveClear();
assert.equal(cycled.director.getMode(), AVALANCHE_MODE_ID, 'Cycle All re-enters Avalanche through the public wrapper');
cycled.director.update(.016, { enemies:cycled.system.enemies, player:{x:0,z:0} });
assert.equal(cycled.target.approachPermit, true, 'cycled Avalanche activates the same all-enemy pressure overrides');
clearArenaEnemyRegistry();

console.log('enemy pressure lab tests passed');
