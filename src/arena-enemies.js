// Branch-local arena-enemy wrapper for the Pilebunker gameplay effect.
// The combat implementation is pinned to the exact main commit this branch began
// from. This wrapper only exposes its real enemy array to the ability-effect layer.

import {
  ARENA_ENEMY_ARCHETYPES,
  createArenaEnemySystem as createBaseArenaEnemySystem,
} from 'https://cdn.jsdelivr.net/gh/nigh3252-prog/Top-Down-Shooter-with-Controller-@47cf02020b1e728e05fbd123127674807cf50571/src/arena-enemies.js';
import { setArenaEnemySource } from './arena-enemy-registry.js';

export { ARENA_ENEMY_ARCHETYPES };

export function createArenaEnemySystem(options = {}) {
  const system = createBaseArenaEnemySystem(options);
  setArenaEnemySource(system);
  return system;
}
