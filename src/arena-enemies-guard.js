import {
  ARENA_ENEMY_ARCHETYPES,
  createArenaEnemySystem as createBaseArenaEnemySystem,
} from './arena-enemies-original.js';
import { installGoblinDuelGuard } from './goblin-duel-guard.js';
import { installGoblinAttackRangeClosing } from './goblin-attack-range-closing.js';

export { ARENA_ENEMY_ARCHETYPES };

export function createArenaEnemySystem(options={}){
  const guarded = installGoblinDuelGuard(createBaseArenaEnemySystem(options),options);
  return installGoblinAttackRangeClosing(guarded);
}
