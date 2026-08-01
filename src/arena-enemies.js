import {
  ARENA_ENEMY_ARCHETYPES,
  createArenaEnemySystem as createCoreArenaEnemySystem,
} from './arena-enemies-core.js';

export { ARENA_ENEMY_ARCHETYPES };

// The enemy system is a local dependency of the runtime.  Entry points receive
// the returned API directly; this module intentionally has no DOM or frame
// bridge side effects.
export function createArenaEnemySystem(options={}){
  return createCoreArenaEnemySystem(options);
}
