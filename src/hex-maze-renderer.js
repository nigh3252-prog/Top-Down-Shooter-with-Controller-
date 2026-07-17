export { drawMazeDebug } from './hex-maze-renderer-base.js';

import { createMazeWorld as createBaseMazeWorld } from './hex-maze-renderer-base.js';
import { configuredHexSize } from './maze-runtime-settings.js';
import { applyAkaiMazeStyle, installAkaiInterfaceStyle } from './akai-visual-style.js';
import { installAkaiCompactInterface } from './akai-compact-interface.js';
import { applyBoundaryDistrictExtensions } from './boundary-districts.js';
import { replaceHalfInternalWallsWithGaps } from './boundary-room-topology.js';
import { applyBoundaryRoomWallGaps } from './boundary-room-wall-gaps.js';
import { applyBoundaryRoomFloor } from './boundary-room-floor.js';
import { applyBoundaryRoomProps } from './boundary-room-props.js';

installAkaiInterfaceStyle();
installAkaiCompactInterface();

export function createMazeWorld(options = {}){
  const configuredOptions = {
    ...options,
    hexSize:configuredHexSize(options.hexSize ?? 2.6),
  };
  replaceHalfInternalWallsWithGaps(configuredOptions.maze);
  const world = createBaseMazeWorld(configuredOptions);
  applyBoundaryRoomWallGaps({ ...configuredOptions, world });
  applyAkaiMazeStyle({ ...configuredOptions, world });
  applyBoundaryDistrictExtensions({ ...configuredOptions, world });
  applyBoundaryRoomFloor({ ...configuredOptions, world });
  return applyBoundaryRoomProps({ ...configuredOptions, world });
}
