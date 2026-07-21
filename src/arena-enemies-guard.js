import {
  ARENA_ENEMY_ARCHETYPES,
  createArenaEnemySystem as createBaseArenaEnemySystem,
} from './arena-enemies-original.js';
import { installGoblinDuelGuard } from './goblin-duel-guard.js';

export { ARENA_ENEMY_ARCHETYPES };

export function createArenaEnemySystem(options={}){
  return installGoblinDuelGuard(createBaseArenaEnemySystem(options),options);
}
