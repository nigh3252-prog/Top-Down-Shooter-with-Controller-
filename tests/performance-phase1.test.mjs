import assert from 'node:assert/strict';
import {
  installStableCollisionCache,
  reduceSmallSceneryShadows,
} from '../src/performance-phase1.js';

function group(name = '', children = [], userData = {}){
  return { name, children, userData };
}

function mesh({ castShadow = true, userData = {} } = {}){
  return { isMesh:true, castShadow, children:[], userData };
}

{
  let sourceBuilds = 0;
  let doorUpdates = 0;
  let doorBlocked = true;
  const wall = { id:'wall' };
  const door = { id:'door' };
  const world = {
    getCollisionSegments(){
      sourceBuilds++;
      return doorBlocked ? [wall, door] : [wall];
    },
    setDoorStates(next){
      doorUpdates++;
      doorBlocked = !next.open;
    },
  };

  const cache = installStableCollisionCache(world);
  const first = world.getCollisionSegments();
  const second = world.getCollisionSegments();
  const third = world.getCollisionSegments();

  assert.equal(sourceBuilds, 1, 'repeated collision reads should build once');
  assert.strictEqual(first, second, 'cache should preserve array identity');
  assert.strictEqual(second, third, 'all readers should receive the shared array');
  assert.deepEqual(first, [wall, door]);
  assert.equal(cache.stats.queries, 3);
  assert.equal(cache.stats.rebuilds, 1);

  world.setDoorStates({ open:true });
  assert.equal(doorUpdates, 1, 'door state wrapper should preserve original behavior');
  const afterDoor = world.getCollisionSegments();
  assert.strictEqual(afterDoor, first, 'door invalidation should update the stable array in place');
  assert.deepEqual(afterDoor, [wall]);
  assert.equal(sourceBuilds, 2, 'door changes should cause exactly one rebuild');
  assert.equal(cache.stats.rebuilds, 2);
  assert.equal(cache.stats.invalidations, 1);

  world.getCollisionSegments();
  assert.equal(sourceBuilds, 2, 'post-door repeated reads should remain cached');
}

{
  const akaiMesh = mesh();
  const knockableMesh = mesh();
  const facadeMesh = mesh();
  const smallDistrictMesh = mesh();
  const blockerMesh = mesh();
  const world = {
    group:group('room', [
      group('akai courtyard visual skin', [akaiMesh]),
      group('boundary district extensions: test', [
        group('facade', [facadeMesh], { boundaryBuildingKind:'station' }),
        group('small props', [smallDistrictMesh]),
      ]),
      group('boundary interactive props: test', [blockerMesh]),
    ]),
    boundaryKnockableProps:[{ root:group('knockable crate', [knockableMesh]) }],
  };

  const disabled = reduceSmallSceneryShadows(world);
  assert.equal(disabled, 3, 'only small scenery should lose shadow casting');
  assert.equal(akaiMesh.castShadow, false);
  assert.equal(knockableMesh.castShadow, false);
  assert.equal(smallDistrictMesh.castShadow, false);
  assert.equal(facadeMesh.castShadow, true, 'large facade silhouettes should keep shadows');
  assert.equal(blockerMesh.castShadow, true, 'large blocking props should keep shadows');
}

console.log('performance phase 1 tests passed');
