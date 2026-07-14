import assert from 'node:assert/strict';
import {
  MAZE_CELL_SIZE_OPTIONS,
  MAZE_ROOM_SIZE_OPTIONS,
  configuredHexSize,
  configuredRoomSize,
  getMazeRuntimeSettings,
} from '../src/maze-runtime-settings.js';

assert.deepEqual(getMazeRuntimeSettings().cellSize, MAZE_CELL_SIZE_OPTIONS.find(option => option.id === 'compact'));
assert.deepEqual(getMazeRuntimeSettings().roomSize, MAZE_ROOM_SIZE_OPTIONS.find(option => option.id === 'medium'));
assert.equal(configuredHexSize(2.6), 2.6, 'debug-scale geometry should not inherit gameplay cell size');
assert.equal(configuredHexSize(20), 20, 'non-gameplay callers should retain their explicitly requested world scale');
assert.deepEqual(configuredRoomSize(4, 7), { min:4, max:7, id:'custom' }, 'non-gameplay callers should retain explicit room bounds');

for(const preset of MAZE_ROOM_SIZE_OPTIONS){
  const resolved = configuredRoomSize(4, 7, preset.id);
  assert.deepEqual(resolved, { min:preset.min, max:preset.max, id:preset.id });
}

console.log('Validated compact/medium gameplay defaults and isolated maze setting presets.');
