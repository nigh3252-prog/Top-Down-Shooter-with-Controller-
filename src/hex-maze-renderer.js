export { drawMazeDebug } from './hex-maze-renderer-base.js';

import { createMazeWorld as createBaseMazeWorld } from './hex-maze-renderer-base.js';
import { configuredHexSize } from './maze-runtime-settings.js';

export function createMazeWorld(options = {}){
  const world = createBaseMazeWorld({
    ...options,
    hexSize:configuredHexSize(options.hexSize ?? 2.6),
  });
  if(options.maze?.options?.layout === 'arena' && world.forest?.group){
    // Keep the forest collision segments as the arena perimeter, but suppress
    // every tree, shrub, and forest-region visual in the Enemy Lab chamber.
    world.forest.group.visible = false;
    world.forest.trees.length = 0;
    world.forest.placements.length = 0;
  }
  return world;
}
