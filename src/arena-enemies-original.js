// Compatibility entrypoint for the retained/original enemy roster.
// The implementation is now fully local; no pinned CDN snapshot is involved.
export {
  ARENA_ENEMY_ARCHETYPES,
  createArenaEnemySystem,
} from './arena-enemies-original-local.js';
