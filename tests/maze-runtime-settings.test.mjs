import assert from 'node:assert/strict';
import {
  MAZE_CELL_SIZE_OPTIONS,
  MAZE_ROOM_SIZE_OPTIONS,
  configuredHexSize,
  configuredRoomSize,
  getMazeRuntimeSettings,
} from '../src/maze-runtime-settings.js';

assert.deepEqual(getMazeRuntimeSettings().cellSize, MAZE_CELL_SIZE_OPTIONS.find(option => option.id === 'current'));
assert.deepEqual(getMazeRuntimeSettings().roomSize, MAZE_ROOM_SIZE_OPTIONS.find(option => option.id === 'current'));
assert.equal(configuredHexSize(2.6), 2.6, 'debug-scale geometry should not inherit gameplay cell size');
assert.equal(configuredHexSize(20), 20, 'gameplay geometry should default to the current 20-unit cell');

for(const preset of MAZE_ROOM_SIZE_OPTIONS){
  const resolved = configuredRoomSize(4, 7, preset.id);
  assert.deepEqual(resolved, { min:preset.min, max:preset.max, id:preset.id });
}

console.log('Validated maze runtime setting presets.');
