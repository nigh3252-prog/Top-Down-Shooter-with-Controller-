import assert from 'node:assert/strict';
import {
  MOVEMENT_BLEED,
  advanceBleed,
  createBleedPool,
  releaseBleedByMovement,
  stackBleed,
} from '../src/combat-card-effects.js';

assert.equal(MOVEMENT_BLEED.duration,5);

const pool=createBleedPool({x:0,z:0});
stackBleed(pool,10);
assert.equal(pool.storedDamage,10);
assert.equal(pool.expiresIn,5);
assert.equal(advanceBleed(pool,2),false);
assert.equal(pool.expiresIn,3);

stackBleed(pool,15);
assert.equal(pool.storedDamage,25);
assert.equal(pool.expiresIn,5);

const firstMove=releaseBleedByMovement(pool,{x:3,z:4});
assert.equal(firstMove.distance,5);
assert.equal(firstMove.damage,11);
assert.equal(pool.storedDamage,14);
assert.equal(pool.expiresIn,5);

const finalMove=releaseBleedByMovement(pool,{x:103,z:4});
assert.equal(finalMove.damage,14);
assert.equal(pool.storedDamage,0);

const expiring=createBleedPool({x:1,z:1});
stackBleed(expiring,40);
assert.equal(advanceBleed(expiring,4.99),false);
assert.equal(expiring.storedDamage,40);
assert.equal(advanceBleed(expiring,.02),true);
assert.equal(expiring.storedDamage,0);

console.log('central movement bleed tests passed');
