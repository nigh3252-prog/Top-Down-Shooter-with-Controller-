import {
  ARENA_ENEMY_ARCHETYPES as BASE_ARENA_ENEMY_ARCHETYPES,
  createArenaEnemySystem as createBaseArenaEnemySystem,
} from './arena-enemies-original.js';
import { installGoblinDuelGuard } from './goblin-duel-guard.js';
import { installGoblinAttackRangeClosing } from './goblin-attack-range-closing.js';
import {
  LUGARU_DUELIST_ARCHETYPE,
  LUGARU_DUELIST_ID,
  installLugaruDuelist,
} from './lugaru-duelist.js';
import { installLugaruDuelistCounterRelease } from './lugaru-duelist-counter-release.js';
import { installLugaruDuelistDodgeScale } from './lugaru-duelist-dodge-scale.js';

export { LUGARU_DUELIST_ID };
export const ARENA_ENEMY_ARCHETYPES = Object.freeze({
  ...BASE_ARENA_ENEMY_ARCHETYPES,
  [LUGARU_DUELIST_ID]:LUGARU_DUELIST_ARCHETYPE,
});

export function createArenaEnemySystem(options={}){
  const guarded=installGoblinDuelGuard(createBaseArenaEnemySystem(options),options);
  const duelist=installLugaruDuelist(guarded,options);
  const released=installLugaruDuelistCounterRelease(duelist);
  const closing=installGoblinAttackRangeClosing(released,{includeDuelists:true});
  return installLugaruDuelistDodgeScale(closing,options);
}
