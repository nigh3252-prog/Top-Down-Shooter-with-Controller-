// Fully local retained/original enemy roster.
// The previous wrapper imported a pinned jsDelivr snapshot, which made the real
// attack loop difficult to reason about and patch safely. This entrypoint uses the
// checked-in base implementation and layers only the Pilebunker rigid-body adapter.

import {
  ARENA_ENEMY_ARCHETYPES,
  createArenaEnemySystem as createBaseArenaEnemySystem,
} from './arena-enemies-base.js';
import { installRigidGoblinBodies } from './rigid-goblin-bodies.js';

export { ARENA_ENEMY_ARCHETYPES };

export function createArenaEnemySystem(options={}){
  const system=createBaseArenaEnemySystem(options);
  installRigidGoblinBodies(system,options);
  return system;
}
