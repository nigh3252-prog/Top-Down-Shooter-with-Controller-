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
import { installWorldPerformancePhase1 } from './performance-phase1.js';

const BOUNDARY_VISUAL_BUILD = 'boundary-districts-performance-phase1-20260721';
const nowMs = () => globalThis.performance?.now?.() ?? Date.now();

installAkaiInterfaceStyle();
installAkaiCompactInterface();

export function createMazeWorld(options = {}){
  const buildStarted = nowMs();
  const configuredOptions = {
    ...options,
    hexSize:configuredHexSize(options.hexSize ?? 2.6),
  };
  const arenaLayout = configuredOptions.maze?.options?.layout === 'arena';
  if(!arenaLayout) replaceHalfInternalWallsWithGaps(configuredOptions.maze);
  const world = createBaseMazeWorld(configuredOptions);
  world.group.userData.boundaryVisualBuild = BOUNDARY_VISUAL_BUILD;
  world.group.userData.boundaryVisualEnabled = !arenaLayout;
  if(arenaLayout){
    if(world.forest?.group){
      // Keep the forest collision segments as the arena perimeter, but suppress
      // every tree, shrub, and forest-region visual in the Enemy Lab chamber.
      world.forest.group.visible = false;
      world.forest.trees.length = 0;
      world.forest.placements.length = 0;
    }
    return installWorldPerformancePhase1(world, { buildMs:nowMs() - buildStarted });
  }
  applyBoundaryRoomWallGaps({ ...configuredOptions, world });
  applyAkaiMazeStyle({ ...configuredOptions, world });
  applyBoundaryDistrictExtensions({ ...configuredOptions, world });
  applyBoundaryRoomFloor({ ...configuredOptions, world });
  applyBoundaryRoomProps({ ...configuredOptions, world });
  return installWorldPerformancePhase1(world, { buildMs:nowMs() - buildStarted });
}
