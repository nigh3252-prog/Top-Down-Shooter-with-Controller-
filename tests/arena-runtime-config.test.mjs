import assert from 'node:assert/strict';
import { ARENA_RUNTIME_MODES, resolveArenaRuntimeConfig } from '../src/arena-runtime-config.js';

{
  const config=resolveArenaRuntimeConfig({
    search:'?seed=lab-seed&layout=arena&cellSize=large&tune=1&enemyLab=1',
    pathname:'/combat-arena.html',
  });
  assert.equal(config.mode,ARENA_RUNTIME_MODES.ENEMY_LAB);
  assert.equal(config.seed,'lab-seed');
  assert.equal(config.layout,'arena');
  assert.equal(config.cellSize,'large');
  assert.equal(config.tune,true);
}

{
  const config=resolveArenaRuntimeConfig({pathname:'/enemy-lab.html'});
  assert.equal(config.mode,ARENA_RUNTIME_MODES.ENEMY_LAB);
  assert.equal(config.seed,'enemy-lab-001');
  assert.equal(config.layout,'arena');
}

{
  const config=resolveArenaRuntimeConfig({search:'?mode=arena&seed=maze-seed'});
  assert.equal(config.mode,ARENA_RUNTIME_MODES.ARENA);
  assert.equal(config.layout,'maze');
  assert.equal(config.seed,'maze-seed');
  assert.equal(config.enemyLab,false);
}

{
  const config=resolveArenaRuntimeConfig({mode:'arena',pathname:'/enemy-lab.html'});
  assert.equal(config.mode,ARENA_RUNTIME_MODES.ARENA);
  assert.equal(config.enemyLab,false);
}

console.log('arena-runtime-config: ok');
