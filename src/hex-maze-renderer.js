export { drawMazeDebug } from './hex-maze-renderer-base.js';

import { createMazeWorld as createBaseMazeWorld } from './hex-maze-renderer-base.js';
import { configuredHexSize } from './maze-runtime-settings.js';

export function createMazeWorld(options = {}){
  return createBaseMazeWorld({
    ...options,
    hexSize:configuredHexSize(options.hexSize ?? 2.6),
  });
}
