export { drawMazeDebug } from './hex-maze-renderer-base.js';

import { createMazeWorld as createBaseMazeWorld } from './hex-maze-renderer-base.js';
import { configuredHexSize } from './maze-runtime-settings.js';
import { applyAkaiMazeStyle } from './akai-visual-style.js';
import {
  CLASSIC_WALL_HEIGHT,
  CLASSIC_WALL_THICKNESS,
} from './arena-classic-walls.js';
import { applyArenaThemeWorldStyle, getArenaTheme } from './arena-theme-registry.js';
import { applyBoundaryDistrictExtensions } from './boundary-districts.js';
import { replaceHalfInternalWallsWithGaps } from './boundary-room-topology.js';
import { applyBoundaryRoomWallGaps } from './boundary-room-wall-gaps.js';
import { applyBoundaryRoomFloor } from './boundary-room-floor.js';
import { applyBoundaryRoomProps } from './boundary-room-props.js';

const BOUNDARY_VISUAL_BUILD = 'boundary-districts-post-main-sync-20260720';

const THEME_WORLD_HOOKS=Object.freeze({
  neutral:({world})=>world,
  original:({world})=>world,
  akai:context=>applyAkaiMazeStyle(context),
});

export function createMazeWorld(options = {}){
  const configuredOptions = {
    ...options,
    hexSize:configuredHexSize(options.hexSize ?? 2.6),
  };
  const arenaLayout = configuredOptions.maze?.options?.layout === 'arena';
  const theme = getArenaTheme(configuredOptions.theme) || getArenaTheme('neutral');
  const worldStyle = configuredOptions.worldStyle || theme.worldStyle;
  if(!arenaLayout) replaceHalfInternalWallsWithGaps(configuredOptions.maze);
  // The Enemy Lab chamber is intentionally a presentation-neutral open arena:
  // keep its established hidden forest perimeter even when the saved Arena
  // theme is Neutral. Normal Combat Arena rooms consume the explicit policy.
  const classicDimensions = worldStyle.barrierStyle === 'classic'
    ? { wallHeight:CLASSIC_WALL_HEIGHT, wallThickness:CLASSIC_WALL_THICKNESS }
    : {};
  const baseOptions = arenaLayout
    ? { ...configuredOptions, worldStyle:null }
    : { ...configuredOptions, ...classicDimensions, worldStyle };
  const world = createBaseMazeWorld(baseOptions);
  world.group.userData.boundaryVisualBuild = BOUNDARY_VISUAL_BUILD;
  world.group.userData.boundaryVisualEnabled = !arenaLayout;
  world.group.userData.arenaWorldStyle = worldStyle;
  if(arenaLayout){
    if(world.forest?.group){
      // Keep the forest collision segments as the arena perimeter, but suppress
      // every tree, shrub, and forest-region visual in the Enemy Lab chamber.
      world.forest.group.visible = false;
      world.forest.trees.length = 0;
      world.forest.placements.length = 0;
    }
    return world;
  }
  if(worldStyle.barrierStyle === 'forest'){
    applyBoundaryRoomWallGaps({ ...configuredOptions, world });
  }
  const styledWorld = applyArenaThemeWorldStyle(theme,{
    ...configuredOptions,world,worldStyle,hooks:THEME_WORLD_HOOKS,
  }) || world;
  if(worldStyle.districtDressing){
    applyBoundaryDistrictExtensions({ ...configuredOptions, world:styledWorld });
    applyBoundaryRoomFloor({ ...configuredOptions, world:styledWorld });
  }
  if(worldStyle.roomProps){
    return applyBoundaryRoomProps({ ...configuredOptions, world:styledWorld });
  }
  return styledWorld;
}
