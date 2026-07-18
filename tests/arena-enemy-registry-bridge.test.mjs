import assert from 'node:assert/strict';
import { createArenaEnemyRegistryBridge } from '../src/arena-enemy-registry-bridge.js';

let localSystem = null;
const pinnedSources = [];
const bridge = createArenaEnemyRegistryBridge({
  getLocalSystem:() => {
    if (!localSystem) throw new Error('not registered');
    return localSystem;
  },
  setPinnedSource:system => pinnedSources.push(system),
});

assert.equal(bridge.sync(), null);
assert.match(bridge.lastError.message, /not registered/);
assert.throws(() => bridge.sync({ required:true }), /not registered/);

const first = { enemies:[], damageEnemy(){} };
localSystem = first;
assert.equal(bridge.sync(), first);
assert.equal(bridge.current, first);
assert.deepEqual(pinnedSources, [first]);

// Repeated frames must not re-register the same router.
assert.equal(bridge.sync(), first);
assert.deepEqual(pinnedSources, [first]);

// A replaced arena router is bridged immediately.
const second = { enemies:[], damageEnemy(){} };
localSystem = second;
assert.equal(bridge.sync(), second);
assert.deepEqual(pinnedSources, [first, second]);

localSystem = { enemies:[] };
assert.equal(bridge.sync(), null);
assert.match(bridge.lastError.message, /damageEnemy/);
assert.throws(() => bridge.sync({ required:true }), /damageEnemy/);

console.log('arena enemy registry bridge tests passed');
