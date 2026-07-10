import assert from 'node:assert/strict';
import { createHexMaze, validateHexMaze } from '../src/hex-maze.js';
import { axialToWorld, buildMazeEdges, findCellAtPoint, findPath, raycastWalls, resolveCircleMovement } from '../src/hex-maze-navigation.js';
import { createRoomEncounterState } from '../src/room-encounters.js';
import { createRoomTransitionController } from '../src/room-transition.js';

let cellCount = null;
for(let i = 0; i < 500; i++){
  const maze = createHexMaze({ seed:`validation-${i}`, radius:5, minRoomSize:4, maxRoomSize:7, minLoopLength:6 });
  const validation = validateHexMaze(maze);
  assert.equal(validation.valid, true, `seed ${maze.seed}: ${validation.errors.join(' | ')}`);
  assert.equal(validation.deadEnds.length, 0, `seed ${maze.seed} retained dead ends`);
  assert.equal(maze.cells.size, cellCount ?? maze.cells.size, 'cell count changed for a fixed radius');
  assert.equal(maze.cells.size, new Set(maze.rooms.flatMap(room => room.cellKeys)).size, 'not every cell has one room');
  cellCount ??= maze.cells.size;
}

const first = createHexMaze({ seed:'deterministic-check' });
const second = createHexMaze({ seed:'deterministic-check' });
assert.deepEqual([...first.openEdges].sort(), [...second.openEdges].sort(), 'same seed should carve the same maze');
assert.deepEqual(first.rooms, second.rooms, 'same seed should segment the same rooms');

const startCell = first.cells.get(first.startCellKey);
const arenaHexSize = 20;
const arenaArea = Math.PI * 18 * 18;
const hexArea = 3 * Math.sqrt(3) / 2 * arenaHexSize * arenaHexSize;
assert.ok(Math.abs(hexArea - arenaArea) / arenaArea < .03, 'one hex should be approximately one original arena');
const startPoint = axialToWorld(startCell.q, startCell.r, arenaHexSize);
assert.equal(findCellAtPoint(first, startPoint, arenaHexSize)?.key, first.startCellKey, 'world lookup should find the start cell');
const collisionEdges = buildMazeEdges(first, { hexSize:arenaHexSize }).filter(edge => edge.blocked);
assert.ok(collisionEdges.length > 0, 'maze should expose collision walls');
const wall = collisionEdges[0];
const wallMid = { x:(wall.a.x + wall.b.x) / 2, z:(wall.a.z + wall.b.z) / 2 };
const wallDx = wall.b.x - wall.a.x, wallDz = wall.b.z - wall.a.z, wallLength = Math.hypot(wallDx, wallDz);
const wallNormal = { x:-wallDz / wallLength, z:wallDx / wallLength };
assert.ok(raycastWalls(
  { x:wallMid.x - wallNormal.x, z:wallMid.z - wallNormal.z },
  { x:wallMid.x + wallNormal.x, z:wallMid.z + wallNormal.z },
  [wall]
), 'wall raycast should hit a wall segment');
const moved = resolveCircleMovement(startPoint, { x:.2, z:.2 }, 1.05, collisionEdges);
assert.ok(Number.isFinite(moved.x) && Number.isFinite(moved.z), 'circle movement should remain finite');
const path = findPath(first, first.rooms[0].cellKeys[0], first.rooms[0].cellKeys.at(-1), { allowedCellKeys:first.rooms[0].cellKeys });
assert.ok(path.length > 0, 'room-local path should connect every room cell');

const entered = [], started = [], cleared = [];
const encounters = createRoomEncounterState(first, {
  onRoomEnter:event => entered.push(event.roomId),
  onEncounterStart:event => started.push(event.roomId),
  onRoomCleared:event => cleared.push(event.roomId),
});
encounters.enterRoom(first.startRoomId);
assert.deepEqual([...encounters.sealedRoomIds], [first.startRoomId], 'uncleared room should seal');
encounters.clearRoom();
assert.equal(encounters.isCleared(first.startRoomId), true, 'cleared room should persist');
assert.equal(encounters.sealedRoomIds.size, 0, 'cleared room should reopen');
const startDoor = first.doors.find(door => door.roomA === first.startRoomId || door.roomB === first.startRoomId);
assert.ok(startDoor, 'starting room should have a door');
assert.equal(encounters.canOpenDoor(startDoor.edge), true, 'cleared room door should become breakable');
assert.equal(encounters.openDoor(startDoor.edge), true, 'breakable door should open once');
assert.equal(encounters.openDoor(startDoor.edge), false, 'opened door should not open twice');
assert.equal(encounters.isDoorOpened(startDoor.edge), true, 'opened door should persist');
const closedDoor = buildMazeEdges(first, { hexSize:arenaHexSize, closedDoorEdges:new Set([startDoor.edge]) })
  .find(edge => edge.edge === startDoor.edge);
assert.equal(closedDoor.blocked, true, 'closed door edge should participate in collision');
assert.deepEqual([entered.length, started.length, cleared.length], [1, 1, 1], 'encounter hooks should fire once');

let swaps = 0, completes = 0;
const transition = createRoomTransitionController({ duration:1, swapAt:.5, onSwap:()=>swaps++, onComplete:()=>completes++ });
assert.equal(transition.start({ toRoomId:1 }), true, 'room transition should start');
assert.equal(transition.start({ toRoomId:2 }), false, 'a second transition should not interrupt the first');
assert.equal(transition.update(.49).swapped, false, 'room should remain loaded before the occluded midpoint');
assert.equal(transition.update(.02).swapped, true, 'room should swap once behind the transition veil');
assert.equal(swaps, 1, 'room swap callback should fire once');
assert.equal(transition.update(.49).completed, true, 'transition should finish at its duration');
assert.equal(completes, 1, 'room completion callback should fire once');

console.log(`Validated 500 deterministic braided mazes (${cellCount} cells each).`);
