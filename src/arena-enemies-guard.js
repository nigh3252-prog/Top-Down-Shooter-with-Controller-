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
import { installOriginalEncounterGroupSupport } from './original-encounter-groups.js';

export { LUGARU_DUELIST_ID };
export const ARENA_ENEMY_ARCHETYPES = Object.freeze({
  ...BASE_ARENA_ENEMY_ARCHETYPES,
  [LUGARU_DUELIST_ID]:LUGARU_DUELIST_ARCHETYPE,
});

export function createArenaEnemySystem(options={}){
  const guarded=installGoblinDuelGuard(createBaseArenaEnemySystem(options),options);
  // Install the range handshake *inside* the Lugaru controller. The Lugaru update
  // first establishes its preferred spacing, then this inner wrapper narrows that
  // distance for the next authored attack immediately before base movement runs.
  const closing=installGoblinAttackRangeClosing(guarded,{includeDuelists:true});
  const duelist=installLugaruDuelist(closing,options);
  const released=installLugaruDuelistCounterRelease(duelist);
  const scaled=installLugaruDuelistDodgeScale(released,options);
  return installOriginalEncounterGroupSupport(scaled,{
    releaseTarget:enemy=>options.factionService?.releaseTarget?.(enemy),
    maxTotal:20,
  });
}
