import assert from 'node:assert/strict';
import { createHexMaze } from '../src/hex-maze.js';
import {
  closedInternalEdgesForRoom,
  openHalfInternalWalls,
} from '../src/boundary-room-topology.js';

const maze = createHexMaze({ seed:'boundary-room-test', radius:5, minRoomSize:4, maxRoomSize:7, minLoopLength:6 });
const originalCounts = new Map(maze.rooms.map(room => [room.id, closedInternalEdgesForRoom(maze, room.id).length]));
const doorEdges = new Set(maze.doors.map(door => door.edge));
const pass = openHalfInternalWalls(maze);

for(const room of maze.rooms){
  const expected = Math.floor((originalCounts.get(room.id) || 0) * .5);
  const summary = pass.byRoom.get(room.id);
  assert.equal(summary.removed, expected);
  assert.equal(summary.remaining, (originalCounts.get(room.id) || 0) - expected);
  for(const edge of summary.edges){
    const [a, b] = edge.split('|');
    assert.equal(maze.cells.get(a).roomId, room.id);
    assert.equal(maze.cells.get(b).roomId, room.id);
    assert.ok(!doorEdges.has(edge));
    assert.ok(maze.openEdges.has(edge));
  }
}

assert.equal(openHalfInternalWalls(maze), pass, 'pass should be idempotent');
const duplicate = createHexMaze({ seed:'boundary-room-test', radius:5, minRoomSize:4, maxRoomSize:7, minLoopLength:6 });
assert.deepEqual([...openHalfInternalWalls(duplicate).opened].sort(), [...pass.opened].sort());
console.log('boundary room topology contracts passed');
