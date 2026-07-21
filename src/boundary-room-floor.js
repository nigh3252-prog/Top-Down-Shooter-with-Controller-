import { createSeededRandom } from './hex-maze.js';
import { axialToWorld } from './hex-maze-navigation.js';
import { districtForRoom } from './boundary-districts.js';

const STYLES = Object.freeze({
  'boundary-courtyard':{ base:0x275e67, emissive:0x123640, accent:0xd83027, secondary:0x72d4d9, pattern:'court' },
  'lantern-arcade':{ base:0x102f38, emissive:0x071b22, accent:0xe03a2e, secondary:0xffd27e, pattern:'arcade' },
  'transit-overlook':{ base:0x405f66, emissive:0x152f36, accent:0xc72d23, secondary:0x7de1e6, pattern:'transit' },
  'vermilion-garden':{ base:0x315c5a, emissive:0x153431, accent:0xef4034, secondary:0xffe5a0, pattern:'garden' },
  'utility-basin':{ base:0x33484d, emissive:0x111f24, accent:0xb92820, secondary:0x58bdc5, pattern:'utility' },
  'watch-station':{ base:0x172d35, emissive:0x08151a, accent:0xd42c23, secondary:0x8bdce0, pattern:'watch' },
});

function material(THREE, color, opacity){
  return new THREE.MeshBasicMaterial({
    color,
    transparent:opacity < 1,
    opacity,
    side:THREE.DoubleSide,
    depthWrite:false,
  });
}

function rect(THREE, root, mat, x, z, width, depth, yaw = 0, y = .079){
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = yaw;
  mesh.position.set(x, y, z);
  mesh.renderOrder = 2;
  root.add(mesh);
}

function circle(THREE, root, mat, x, z, radius, y = .08){
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 14), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.renderOrder = 2;
  root.add(mesh);
}

function roomCenters(maze, roomId, hexSize){
  const room = maze.rooms.find(candidate => candidate.id === roomId);
  return (room?.cellKeys || [])
    .map(key => maze.cells.get(key))
    .filter(Boolean)
    .map(cell => axialToWorld(cell.q, cell.r, hexSize));
}

function recolorFloor(world, style){
  const materials = new Set();
  world.group.traverse(object => {
    if(!object?.isMesh || object.geometry?.type !== 'CylinderGeometry' || object.position.y > .01) return;
    if(object.geometry.parameters?.radialSegments !== 6 || !object.material || materials.has(object.material)) return;
    materials.add(object.material);
    object.material.color?.setHex(style.base);
    object.material.emissive?.setHex(style.emissive);
    if('emissiveIntensity' in object.material) object.material.emissiveIntensity = .12;
    if('roughness' in object.material) object.material.roughness = .94;
    if('metalness' in object.material) object.material.metalness = .025;
    object.material.needsUpdate = true;
  });
}

function drawCourt(THREE, root, mats, centers, center, random, hexSize){
  circle(THREE, root, mats.secondary, center.x, center.z, 2.45);
  circle(THREE, root, mats.ink, center.x, center.z, 1.75, .081);
  rect(THREE, root, mats.accent, center.x, center.z, 3.2, .14, Math.PI / 4, .083);
  rect(THREE, root, mats.accent, center.x, center.z, 3.2, .14, -Math.PI / 4, .084);
  for(const point of centers) if(random() < .28) rect(THREE, root, mats.ink, point.x, point.z, hexSize * .42, .08, random() * Math.PI);
}

function drawArcade(THREE, root, mats, centers, random, hexSize){
  const yaw = random() > .5 ? Math.PI / 3 : 0;
  for(const point of centers){
    rect(THREE, root, mats.ink, point.x, point.z, hexSize * 1.22, hexSize * .24, yaw);
    rect(THREE, root, mats.cream, point.x, point.z, hexSize * .84, .12, yaw, .082);
    for(const side of [-1, 1]){
      const x = point.x + Math.cos(yaw + Math.PI / 2) * side * hexSize * .28;
      const z = point.z + Math.sin(yaw + Math.PI / 2) * side * hexSize * .28;
      circle(THREE, root, mats.cream, x, z, .45 + random() * .18, .083);
    }
  }
}

function drawTransit(THREE, root, mats, centers, random, hexSize){
  for(const point of centers){
    const yaw = Math.floor(random() * 3) * Math.PI / 3;
    rect(THREE, root, mats.ink, point.x, point.z, hexSize * 1.18, .14, yaw);
    rect(THREE, root, mats.secondary, point.x, point.z, hexSize * .72, .08, yaw + Math.PI / 2, .082);
    for(const side of [-1, 1]){
      const x = point.x + Math.cos(yaw + Math.PI / 2) * side * hexSize * .31;
      const z = point.z + Math.sin(yaw + Math.PI / 2) * side * hexSize * .31;
      rect(THREE, root, mats.accent, x, z, hexSize * .42, .13, yaw + side * .55, .084);
    }
  }
}

function drawGarden(THREE, root, mats, centers, center, random, hexSize){
  for(const point of centers){
    for(let index = 0; index < 3; index++){
      const angle = random() * Math.PI * 2;
      const distance = random() * hexSize * .38;
      circle(THREE, root, index === 0 ? mats.ink : mats.accent,
        point.x + Math.cos(angle) * distance,
        point.z + Math.sin(angle) * distance,
        .45 + random() * 1.15,
        .081 + index * .0002);
    }
  }
  circle(THREE, root, mats.cream, center.x, center.z, 1.15, .085);
}

function drawUtility(THREE, root, mats, centers, random, hexSize){
  for(const point of centers){
    const yaw = Math.floor(random() * 3) * Math.PI / 3;
    rect(THREE, root, mats.ink, point.x, point.z, hexSize * 1.28, .54, yaw);
    for(let index = -3; index <= 3; index++){
      const x = point.x + Math.cos(yaw + Math.PI / 2) * index * .16;
      const z = point.z + Math.sin(yaw + Math.PI / 2) * index * .16;
      rect(THREE, root, mats.secondary, x, z, hexSize * .58, .035, yaw, .083);
    }
    circle(THREE, root, mats.accent, point.x + (random() - .5) * hexSize * .3, point.z + (random() - .5) * hexSize * .3, .42, .084);
  }
}

function drawWatch(THREE, root, mats, centers, center, random, hexSize){
  for(const point of centers){
    const yaw = Math.floor(random() * 3) * Math.PI / 3;
    for(const side of [-1, 1]){
      const x = point.x + Math.cos(yaw + Math.PI / 2) * side * hexSize * .29;
      const z = point.z + Math.sin(yaw + Math.PI / 2) * side * hexSize * .29;
      rect(THREE, root, mats.accent, x, z, hexSize * .76, .18, yaw);
    }
    rect(THREE, root, mats.secondary, point.x, point.z, hexSize * .38, hexSize * .38, yaw, .082);
    rect(THREE, root, mats.ink, point.x, point.z, hexSize * .28, hexSize * .28, yaw, .083);
  }
  rect(THREE, root, mats.accent, center.x, center.z, 4.8, .2, Math.PI / 4, .086);
  rect(THREE, root, mats.accent, center.x, center.z, 4.8, .2, -Math.PI / 4, .087);
}

function drawThresholds(THREE, root, mats, world, district){
  for(const door of world.getDoorTargets?.() || []){
    const dx = door.b.x - door.a.x;
    const dz = door.b.z - door.a.z;
    const width = Math.hypot(dx, dz);
    const yaw = -Math.atan2(dz, dx);
    rect(THREE, root, mats.ink, door.center.x, door.center.z, width * .92, 1.35, yaw, .088);
    rect(THREE, root, mats.accent, door.center.x, door.center.z, width * .76, .17, yaw, .09);
    if(district.id === 'lantern-arcade' || district.id === 'vermilion-garden'){
      for(const side of [-1, 1]){
        circle(THREE, root, mats.cream,
          door.center.x - dz / Math.max(.001, width) * side * width * .32,
          door.center.z + dx / Math.max(.001, width) * side * width * .32,
          .3, .091);
      }
    }
  }
}

function showDistrictLabel(district){
  if(typeof document === 'undefined') return;
  let label = document.getElementById('boundaryDistrictLabel');
  if(!label){
    label = document.createElement('div');
    label.id = 'boundaryDistrictLabel';
    label.style.cssText = 'position:fixed;z-index:23;top:max(10px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);padding:5px 11px;color:#f6edcf;background:rgba(3,14,19,.76);border:1px solid rgba(255,255,255,.22);font:700 9px/1.1 ui-monospace,monospace;letter-spacing:.15em;text-transform:uppercase;pointer-events:none;opacity:0;transition:opacity .25s;white-space:nowrap';
    document.body.appendChild(label);
  }
  label.textContent = district.label;
  label.style.opacity = '1';
  clearTimeout(showDistrictLabel.timer);
  showDistrictLabel.timer = setTimeout(() => { label.style.opacity = '0'; }, 1800);
}

export function applyBoundaryRoomFloor({ THREE, maze, roomId = null, hexSize = 20, world } = {}){
  if(!THREE || !maze || !world?.group || roomId === null) return world;
  const district = districtForRoom(maze.seed, roomId);
  const style = STYLES[district.id] || STYLES['boundary-courtyard'];
  const random = createSeededRandom(`${maze.seed}:${roomId}:boundary-floor-v1`);
  const root = new THREE.Group();
  root.name = `boundary room floor: ${district.id}`;
  world.group.add(root);
  const mats = {
    ink:material(THREE, 0x061116, .36),
    accent:material(THREE, style.accent, .75),
    secondary:material(THREE, style.secondary, .5),
    cream:material(THREE, 0xffe5a0, .6),
  };
  const centers = roomCenters(maze, roomId, hexSize);
  recolorFloor(world, style);
  if(style.pattern === 'arcade') drawArcade(THREE, root, mats, centers, random, hexSize);
  else if(style.pattern === 'transit') drawTransit(THREE, root, mats, centers, random, hexSize);
  else if(style.pattern === 'garden') drawGarden(THREE, root, mats, centers, world.center, random, hexSize);
  else if(style.pattern === 'utility') drawUtility(THREE, root, mats, centers, random, hexSize);
  else if(style.pattern === 'watch') drawWatch(THREE, root, mats, centers, world.center, random, hexSize);
  else drawCourt(THREE, root, mats, centers, world.center, random, hexSize);
  drawThresholds(THREE, root, mats, world, district);
  world.boundaryFloorStyle = style.pattern;
  showDistrictLabel(district);
  return world;
}
