export { drawMazeDebug } from './hex-maze-renderer-base.js';

import { createMazeWorld as createBaseMazeWorld } from './hex-maze-renderer-base.js';
import { configuredHexSize } from './maze-runtime-settings.js';

export function createMazeWorld(options = {}){
  const world = createBaseMazeWorld({
    ...options,
    hexSize:configuredHexSize(options.hexSize ?? 2.6),
  });
  if(options.maze?.options?.layout === 'arena' && world.forest?.group){
    world.forest.group.visible = false;
  }
  return world;
}
