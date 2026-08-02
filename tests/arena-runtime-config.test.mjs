import assert from 'node:assert/strict';
import {
  ARENA_RUNTIME_MODES,
  ARENA_STORAGE_KEYS,
  normalizeArenaRuntimeMode,
  resolveArenaRuntimeConfig,
  runtimeConfigFromLocation,
} from '../src/arena-runtime-config.js';

assert.equal(normalizeArenaRuntimeMode('lab'),ARENA_RUNTIME_MODES.ENEMY_LAB);
assert.equal(normalizeArenaRuntimeMode('anything'),ARENA_RUNTIME_MODES.ARENA);

const arena=resolveArenaRuntimeConfig({search:'?seed=keep-me&layout=maze&cellSize=compact&tune=1',pathname:'/combat-arena.html'});
assert.deepEqual({mode:arena.mode,seed:arena.seed,layout:arena.layout,cellSize:arena.cellSize,tune:arena.tune},{mode:'arena',seed:'keep-me',layout:'maze',cellSize:'compact',tune:true});
assert.equal(arena.enemyLab,false);
assert.equal(arena.storageKeys.theme,'arena.theme');

const lab=runtimeConfigFromLocation({pathname:'/enemy-lab.html',search:'?capture=1&stage=style'});
assert.equal(lab.mode,'enemy-lab');
assert.equal(lab.enemyLab,true);
assert.equal(lab.layout,'arena');
assert.equal(lab.seed,'enemy-lab-001');
assert.equal(lab.capture,true);
assert.equal(lab.query.stage,'style');
assert.equal(Object.isFrozen(lab),true);
assert.equal(Object.isFrozen(lab.query),true);

const explicit=resolveArenaRuntimeConfig({search:'?enemyLab=1&layout=maze',mode:'arena',seed:'explicit'});
assert.equal(explicit.mode,'arena');
assert.equal(explicit.layout,'maze');
assert.equal(explicit.seed,'explicit');
assert.equal(ARENA_STORAGE_KEYS.enemyLabSettings,'enemyLab.settings.v3');

console.log('Arena runtime configuration and legacy URL compatibility: ok');
