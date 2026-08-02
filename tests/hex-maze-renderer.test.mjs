import assert from 'node:assert/strict';
import { createHexMaze } from '../src/hex-maze.js';
import { buildMazeEdges } from '../src/hex-maze-navigation.js';
import { replaceHalfInternalWallsWithGaps } from '../src/boundary-room-topology.js';
import {
  classicBarrierEdges,
  splitClassicWallEdgeWithGap,
} from '../src/arena-classic-walls.js';
import { createMazeWorld as createBaseMazeWorld } from '../src/hex-maze-renderer-base.js';
import { createMazeWorld as createArenaMazeWorld } from '../src/hex-maze-renderer.js';

class FakeVector {
  constructor(x = 0, y = 0, z = 0){ this.set(x, y, z); }
  set(x = 0, y = 0, z = 0){ this.x = x; this.y = y; this.z = z; return this; }
  setScalar(value){ return this.set(value, value, value); }
}

class FakeColor {
  constructor(value = 0){ this.value = value; }
  setHSL(){ return this; }
  clone(){ return new FakeColor(this.value); }
  copy(other){ this.value = other.value; return this; }
  offsetHSL(){ return this; }
}

class FakeGeometry {
  constructor(...args){ this.args = args; }
  dispose(){ this.disposed = true; }
}

class FakeMaterial {
  constructor(options = {}){
    Object.assign(this, options);
    this.color = options.color instanceof FakeColor ? options.color : new FakeColor(options.color);
  }
  clone(){ return new this.constructor({ ...this, color:this.color.clone() }); }
  dispose(){ this.disposed = true; }
}

class FakeNode {
  constructor(){
    this.children = [];
    this.parent = null;
    this.userData = {};
    this.position = new FakeVector();
    this.rotation = new FakeVector();
    this.scale = new FakeVector(1, 1, 1);
    this.visible = true;
  }
  add(...children){
    for(const child of children){
      child.parent = this;
      this.children.push(child);
    }
    return this;
  }
  remove(child){
    const index = this.children.indexOf(child);
    if(index >= 0) this.children.splice(index, 1);
    child.parent = null;
    return this;
  }
  traverse(callback){
    callback(this);
    for(const child of this.children) child.traverse(callback);
  }
}

class FakeGroup extends FakeNode {}

class FakeMesh extends FakeNode {
  constructor(geometry, material){
    super();
    this.geometry = geometry;
    this.material = material;
    this.castShadow = false;
    this.receiveShadow = false;
  }
}

class FakeInstancedMesh extends FakeMesh {
  constructor(geometry, material, count){
    super(geometry, material);
    this.count = count;
    this.instanceMatrix = { needsUpdate:false };
  }
  setMatrixAt(){ return this; }
}

class FakeMatrix4 {
  compose(){ return this; }
}

class FakeQuaternion {
  setFromEuler(){ return this; }
  setFromAxisAngle(){ return this; }
}

class FakeEuler extends FakeVector {}

const THREE = {
  Group:FakeGroup,
  Mesh:FakeMesh,
  InstancedMesh:FakeInstancedMesh,
  BoxGeometry:class extends FakeGeometry {},
  CylinderGeometry:class extends FakeGeometry {},
  DodecahedronGeometry:class extends FakeGeometry {},
  ConeGeometry:class extends FakeGeometry {},
  PlaneGeometry:class extends FakeGeometry {},
  CircleGeometry:class extends FakeGeometry {},
  RingGeometry:class extends FakeGeometry {},
  MeshStandardMaterial:FakeMaterial,
  MeshBasicMaterial:FakeMaterial,
  Color:FakeColor,
  Matrix4:FakeMatrix4,
  Vector3:FakeVector,
  Quaternion:FakeQuaternion,
  Euler:FakeEuler,
  DoubleSide:2,
};

const maze = createHexMaze({
  seed:'classic-renderer-test',
  radius:5,
  minRoomSize:4,
  maxRoomSize:7,
  minLoopLength:6,
});
replaceHalfInternalWallsWithGaps(maze);
const roomId = maze.startRoomId;
const expectedClassicEdges = classicBarrierEdges(maze, { roomId, hexSize:20 });
assert.ok(expectedClassicEdges.length > 0, 'Neutral must have classic barrier edges');
assert.ok(expectedClassicEdges.some(edge => edge.part?.startsWith('classic-gapped-wall')));

const simpleGap = splitClassicWallEdgeWithGap({
  edge:'a|b',
  a:{ x:-10, z:4 },
  b:{ x:10, z:4 },
}, { hexSize:20 });
assert.equal(simpleGap.length, 2);
assert.ok(simpleGap[0].b.x < simpleGap[1].a.x, 'classic gap must leave a traversable center');
assert.ok(simpleGap.every(edge => edge.blocked && !edge.open && !edge.door));

const neutralWorld = createBaseMazeWorld({
  THREE,
  maze,
  roomId,
  hexSize:20,
  wallHeight:3.2,
  wallThickness:.34,
  doorWidth:7,
  worldStyle:{ barrierStyle:'classic' },
});
assert.equal(neutralWorld.forest, null, 'classic policy must not create a forest');
assert.equal(neutralWorld.group.userData.barrierStyle, 'classic');
const classicRoot = neutralWorld.group.children.find(child => child.name === 'classic slate maze barriers');
assert.ok(classicRoot, 'classic barriers should be grouped separately');
assert.ok(classicRoot.children.length >= expectedClassicEdges.length);
assert.ok(classicRoot.children.every(mesh => mesh.material.color.value === 0x253e42));
assert.ok(classicRoot.children.every(mesh => mesh.geometry.args[1] === 1.8 && mesh.geometry.args[2] === .18));

const firstSegments = neutralWorld.getCollisionSegments();
assert.ok(firstSegments.length > 0);
assert.ok(firstSegments.every(segment => segment.forest !== true && segment.forestOffset === undefined));
assert.deepEqual(
  firstSegments.filter(segment => segment.part?.startsWith('classic-')),
  expectedClassicEdges,
  'classic collision should use the exact wall-aligned barrier edges without parallel forest lanes',
);
assert.equal(neutralWorld.getCollisionSegments(), firstSegments, 'collision segments should remain cached');

const doorKey = [...neutralWorld.doorMeshes.keys()][0];
if(doorKey){
  neutralWorld.setDoorStates({ openedDoorEdges:new Set() });
  const closed = neutralWorld.getCollisionSegments();
  assert.ok(closed.some(segment => segment.part === 'door' && segment.edge === doorKey));
  neutralWorld.setDoorStates({ openedDoorEdges:new Set([doorKey]) });
  const opened = neutralWorld.getCollisionSegments();
  assert.ok(!opened.some(segment => segment.part === 'door' && segment.edge === doorKey));
  assert.ok(opened.some(segment => segment.part === 'door-wing' && segment.edge.startsWith(`${doorKey}:`)));
}

const arenaWorld = createArenaMazeWorld({
  THREE,
  maze:createHexMaze({ seed:'enemy-lab-renderer-test', layout:'arena', radius:5, minRoomSize:4, maxRoomSize:7, minLoopLength:6 }),
  roomId:null,
  hexSize:20,
  wallHeight:1.8,
  wallThickness:.18,
  theme:'neutral',
});
assert.equal(arenaWorld.group.userData.boundaryVisualEnabled, false);
assert.equal(arenaWorld.group.userData.barrierStyle, 'forest', 'Lab keeps the established forest perimeter policy');
assert.equal(arenaWorld.forest.group.visible, false, 'Lab forest visuals stay hidden');
assert.equal(arenaWorld.forest.trees.length, 0);
assert.equal(arenaWorld.forest.placements.length, 0);
assert.ok(arenaWorld.getCollisionSegments().some(segment => segment.forest === true), 'Lab perimeter collision remains active');

const wrapperNeutralWorld = createArenaMazeWorld({
  THREE,
  maze:createHexMaze({ seed:'neutral-wrapper-dimensions', radius:5, minRoomSize:4, maxRoomSize:7, minLoopLength:6 }),
  roomId:null,
  hexSize:20,
  wallHeight:3.2,
  wallThickness:.34,
  doorWidth:7,
  theme:'neutral',
});
const wrapperClassicRoot = wrapperNeutralWorld.group.children.find(child => child.name === 'classic slate maze barriers');
assert.ok(wrapperClassicRoot?.children.length);
assert.ok(wrapperClassicRoot.children.every(mesh => mesh.geometry.args[1] === 1.8 && mesh.geometry.args[2] === .18));
const wrapperDoor = [...wrapperNeutralWorld.doorMeshes.values()][0];
if(wrapperDoor){
  assert.equal(wrapperDoor.geometry.args[1], 1.8 * 1.84);
  assert.equal(wrapperDoor.geometry.args[2], .18 * 1.7);
}

const forestWorld = createBaseMazeWorld({
  THREE,
  maze:createHexMaze({ seed:'forest-renderer-dimensions', radius:5, minRoomSize:4, maxRoomSize:7, minLoopLength:6 }),
  roomId:null,
  hexSize:20,
  wallHeight:3.2,
  wallThickness:.34,
  worldStyle:{ barrierStyle:'forest' },
});
assert.ok(forestWorld.forest, 'forest policy must keep the forest barrier implementation');
const forestDoor = [...forestWorld.doorMeshes.values()][0];
if(forestDoor){
  assert.equal(forestDoor.geometry.args[1], 3.2 * 1.84);
  assert.equal(forestDoor.geometry.args[2], .34 * 1.7);
}

const graphEdges = buildMazeEdges(maze, { hexSize:20 });
assert.ok(graphEdges.some(edge => edge.open && !edge.door), 'modern topology should retain open internal routes');

neutralWorld.dispose();
arenaWorld.dispose();
wrapperNeutralWorld.dispose();
forestWorld.dispose();
console.log('Validated policy-driven classic barriers, direct collision, gapped topology, door progression, and Lab arena preservation.');
