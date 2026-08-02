import {
  ARENA_ENEMY_ARCHETYPES,
  createArenaEnemySystem as createCoreArenaEnemySystem,
} from './arena-enemies-core.js';

export { ARENA_ENEMY_ARCHETYPES };

export function createArenaEnemySystem(options={}){
  return createCoreArenaEnemySystem(options);
}
