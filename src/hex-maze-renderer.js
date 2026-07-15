export { drawMazeDebug } from './hex-maze-renderer-base.js';

import { createMazeWorld as createBaseMazeWorld } from './hex-maze-renderer-base.js';
import { configuredHexSize } from './maze-runtime-settings.js';
import { applyAkaiMazeStyle, installAkaiInterfaceStyle } from './akai-visual-style.js';

installAkaiInterfaceStyle();

export function createMazeWorld(options = {}){
  const configuredOptions = {
    ...options,
    hexSize:configuredHexSize(options.hexSize ?? 2.6),
  };
  const world = createBaseMazeWorld(configuredOptions);
  return applyAkaiMazeStyle({ ...configuredOptions, world });
}
