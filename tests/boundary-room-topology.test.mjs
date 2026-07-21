import assert from 'node:assert/strict';
import { createHexMaze } from '../src/hex-maze.js';
import {
  closedInternalEdgesForRoom,
  replaceHalfInternalWallsWithGaps,
} from '../src/boundary-room-topology.js';
import { splitWallEdgeWithGap } from '../src/boundary-room-wall-gaps.js';

const maze = createHexMaze({ seed:'boundary-room-test', radius:5, minRoomSize:4, maxRoomSize:7, minLoopLength:6 });
const originalCounts = new Map(maze.rooms.map(room => [room.id, closedInternalEdgesForRoom(maze, room.id).length]));
const doorEdges = new Set(maze.doors.map(door => door.edge));
const pass = replaceHalfInternalWallsWithGaps(maze);

for(const room of maze.rooms){
  const expected = Math.floor((originalCounts.get(room.id) || 0) * .5);
  const summary = pass.byRoom.get(room.id);
  assert.equal(summary.gapped, expected);
  assert.equal(summary.solid, (originalCounts.get(room.id) || 0) - expected);
  for(const edge of summary.edges){
    const [a, b] = edge.split('|');
    assert.equal(maze.cells.get(a).roomId, room.id);
    assert.equal(maze.cells.get(b).roomId, room.id);
    assert.ok(!doorEdges.has(edge));
    assert.ok(maze.openEdges.has(edge), 'the cell graph must route through the wall gap');
  }
}

assert.equal(replaceHalfInternalWallsWithGaps(maze), pass, 'pass should be idempotent');
const duplicate = createHexMaze({ seed:'boundary-room-test', radius:5, minRoomSize:4, maxRoomSize:7, minLoopLength:6 });
assert.deepEqual([...replaceHalfInternalWallsWithGaps(duplicate).gapped].sort(), [...pass.gapped].sort());

const pieces = splitWallEdgeWithGap({
  edge:'a|b',
  a:{ x:0, z:0 },
  b:{ x:12, z:0 },
  cellA:'a',
  cellB:'b',
});
assert.equal(pieces.length, 2);
assert.equal(pieces[0].a.x, 0);
assert.equal(pieces[1].b.x, 12);
assert.ok(pieces[0].b.x < pieces[1].a.x, 'partial wall pieces must leave a real center gap');
assert.ok(pieces[1].a.x - pieces[0].b.x >= 3.8, 'gap must be comfortably traversable');
assert.ok(pieces.every(piece => piece.blocked && !piece.open && !piece.door));

console.log('boundary room topology and wall-gap contracts passed');
