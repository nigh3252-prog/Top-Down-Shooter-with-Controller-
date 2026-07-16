export { drawMazeDebug } from './hex-maze-renderer-base.js';

import { createMazeWorld as createBoundaryMazeWorld } from './boundary-maze-renderer.js';
import { configuredHexSize } from './maze-runtime-settings.js';

export function createMazeWorld(options = {}){
  return createBoundaryMazeWorld({
    ...options,
    hexSize:configuredHexSize(options.hexSize ?? 2.6),
  });
}
