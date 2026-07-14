export * from './hex-maze-base.js';

import { createHexMaze as createRoomFirstHexMaze } from './hex-maze-base.js';
import { configuredRoomSize } from './maze-runtime-settings.js';

export function createHexMaze(options = {}){
  const roomSize = configuredRoomSize(
    options.minRoomSize ?? 4,
    options.maxRoomSize ?? 7,
    options.roomSizePreset ?? null,
  );
  return createRoomFirstHexMaze({
    ...options,
    minRoomSize:roomSize.min,
    maxRoomSize:roomSize.max,
  });
}
