// Physical room-reward gate. A cleared room stays sealed until the player hits
// the spawned totem and then chooses a card or explicitly skips the reward.

let THREE = null;

export function pointSegmentDistance2D(point, a, b) {
  const abx = b.x - a.x, abz = b.z - a.z;
  const lenSq = abx * abx + abz * abz;
  if (lenSq <= 1e-8) return Math.hypot(point.x - a.x, point.z - a.z);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * abx + (point.z - a.z) * abz) / lenSq));
  return Math.hypot(point.x - (a.x + abx * t), point.z - (a.z + abz * t));
}

export function chooseTotemPosition({ actorX=0, actorZ=0, centerX=0, centerZ=0, segments=[] } = {}) {
  const dx = centerX - actorX, dz = centerZ - actorZ;
  const length = Math.hypot(dx, dz) || 1;
  const nx = dx / length, nz = dz / length, sx = -nz, sz = nx;
  const candidates = [
    { x:centerX, z:centerZ },
    { x:actorX + nx*3.4, z:actorZ + nz*3.4 },
    { x:actorX + nx*2.8 + sx*1.8, z:actorZ + nz*2.8 + sz*1.8 },
    { x:actorX + nx*2.8 - sx*1.8, z:actorZ + nz*2.8 - sz*1.8 },
    { x:actorX + sx*3.2, z:actorZ + sz*3.2 },
    { x:actorX - sx*3.2, z:actorZ - sz*3.2 },
  ];
  let best = candidates[0], bestScore = -Infinity;
  for (const candidate of candidates) {
    const actorDistance = Math.hypot(candidate.x - actorX, candidate.z - actorZ);
    if (actorDistance < 1.8) continue;
    let clearance = 8;
    for (const segment of segments || []) {
      if (segment?.a && segment?.b) clearance = Math.min(clearance, pointSegmentDistance2D(candidate, segment.a, segment.b));
    }
    const score = Math.min(clearance, 5) - Math.abs(actorDistance - 3.8) * .18;
    if (score > bestScore) { best = candidate; bestScore = score; }
  }
  return best;
}

function showLoadError(error) {
  console.error('Reward totem did not load', error);
  const err = document.getElementById('err');
  if (!err) return;
  err.style.display = 'block';
  err.textContent = `Reward totem did not load\n${error?.message || error}`;
}

function makeLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 112;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(7,18,20,.88)';
  ctx.strokeStyle = 'rgba(232,160,76,.92)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(7, 7, 498, 98, 20);
  else ctx.rect(7, 7, 498, 98);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f0d8b0';
  ctx.font = '900 38px ui-monospace,Menlo,Consolas,monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 57);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map:texture, transparent:true, depthWrite:false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(5.6, 1.22, 1);
  sprite.userData.rewardTotemTexture = texture;
  return sprite;
}

function buildTotem(api, roomId) {
  const center = api.mazeWorld?.center || { x:api.actorPos.x, z:api.actorPos.y };
  const position = chooseTotemPosition({
    actorX:api.actorPos.x, actorZ:api.actorPos.y,
    centerX:center.x, centerZ:center.z,
    segments:api.mazeWorld?.getCollisionSegments?.() || [],
  });
  const group = new THREE.Group();
  group.name = `reward-totem-room-${roomId}`;
  group.position.set(position.x, 0, position.z);
  const stone = new THREE.MeshStandardMaterial({ color:0x31504d, roughness:.82, metalness:.04 });
  const dark = new THREE.MeshStandardMaterial({ color:0x152b2c, roughness:.9, metalness:.02 });
  const gold = new THREE.MeshStandardMaterial({ color:0xe8a04c, emissive:0x6d2f12, emissiveIntensity:1.15, roughness:.34, metalness:.52 });
  const rune = new THREE.MeshStandardMaterial({ color:0xffc36c, emissive:0xe86b24, emissiveIntensity:2.2, roughness:.18, metalness:.2 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.25,.42,8), dark); base.position.y=.21; group.add(base);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(.72,.92,.62,8), stone); plinth.position.y=.66; group.add(plinth);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(.34,.46,1.15,6), stone); pillar.position.y=1.45; group.add(pillar);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.58,0), rune); crystal.position.y=2.18; crystal.rotation.z=Math.PI/4; group.add(crystal);
  const crown = new THREE.Mesh(new THREE.TorusGeometry(.72,.075,6,24), gold); crown.position.y=2.15; crown.rotation.x=Math.PI/2; group.add(crown);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(.94,.035,5,28), rune.clone()); halo.position.y=2.2; halo.rotation.x=Math.PI/2; group.add(halo);
  const light = new THREE.PointLight(0xff9b45,16,8,1.7); light.position.y=2.25; group.add(light);
  const label = makeLabel('STRIKE FOR REWARD'); label.position.y=3.35; group.add(label);
  api.mazeWorld.group.add(group);
  return { roomId, phase:'awaiting', group, crystal, crown, halo, light, hitToken:{ roomId, rewardTotem:true } };
}

function disposeTotem(record) {
  if (!record?.group) return;
  record.group.parent?.remove(record.group);
  record.group.traverse(object => {
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) object.material.forEach(material => material?.dispose?.());
    else object.material?.dispose?.();
    object.userData?.rewardTotemTexture?.dispose?.();
  });
  record.group = null;
}

function applyDoorGate(api, roomId, unlocked) {
  if (!api?.mazeWorld || api.activeRoomId !== roomId) return;
  api.mazeWorld.setDoorStates({
    sealedRoomIds:unlocked ? api.encounterState.sealedRoomIds : new Set([roomId]),
    openedDoorEdges:api.encounterState.openedDoorEdges,
    roomCleared:unlocked && api.encounterState.isCleared(roomId),
  });
}

function contactWindow(combatState) {
  const attack = combatState?.attack;
  if (!attack) return false;
  const contact = Number(attack.contactAt) || 0;
  return combatState.t >= Math.max(0, contact-.11) && combatState.t <= contact+.23;
}

function weaponHits(api, record) {
  const PC = api.PC, combatState = api.combatState;
  if (!record?.group || !PC?.weaponRoot || !contactWindow(combatState)) return false;
  if (combatState.hitIds?.has(record.hitToken)) return false;
  const center = new THREE.Vector3(); record.group.getWorldPosition(center);
  const samples = [.45,1.05,1.62,2.18,2.65].map(y => new THREE.Vector3(center.x,center.y+y,center.z));
  for (const zone of PC.getWeaponHitZones?.() || []) {
    const a = PC.weaponRoot.localToWorld(zone.from.clone());
    const b = PC.weaponRoot.localToWorld(zone.to.clone());
    for (const sample of samples) {
      if (PC.pointSegmentDistance(sample,a,b) <= (zone.radius||.2)+.82) {
        if (!combatState.hitIds) combatState.hitIds = new Set();
        combatState.hitIds.add(record.hitToken);
        return true;
      }
    }
  }
  return false;
}

export async function createRewardTotemGate({ getApi, onTriggered, onMessage } = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { arm(){}, resolve(){}, reset(){}, canLeave(){ return true; } };
  }
  try { THREE = await import('three'); }
  catch (error) { showLoadError(error); throw error; }
  let record = null;
  let running = true;
  const message = text => onMessage?.(text);

  function arm(roomId) {
    const api = getApi?.();
    if (!api || record?.roomId === roomId) return false;
    disposeTotem(record);
    record = buildTotem(api, roomId);
    applyDoorGate(api, roomId, false);
    message(`ROOM ${roomId + 1} CLEAR · STRIKE THE TOTEM`);
    return true;
  }
  function resolve(roomId) {
    const api = getApi?.();
    if (!record || record.roomId !== roomId) return false;
    record.phase = 'resolved';
    disposeTotem(record);
    applyDoorGate(api, roomId, true);
    message('REWARD CLAIMED · STRIKE A DOOR');
    return true;
  }
  function reset() { disposeTotem(record); record = null; }
  function canLeave(roomId) { return !record || record.roomId !== roomId || record.phase === 'resolved'; }

  function frame(nowMs) {
    if (!running) return;
    const api = getApi?.();
    if (api && record && record.phase !== 'resolved') {
      applyDoorGate(api, record.roomId, false);
      if (record.group) {
        const t = nowMs/1000;
        record.crystal.rotation.y=t*1.7;
        record.crystal.position.y=2.18+Math.sin(t*3.2)*.10;
        record.crown.rotation.z=t*.55;
        record.halo.rotation.z=-t*.82;
        record.light.intensity=14+Math.sin(t*4.6)*3;
      }
      if (record.phase === 'awaiting' && weaponHits(api,record)) {
        record.phase = 'choosing';
        record.crystal.scale.setScalar(1.45);
        record.light.intensity = 34;
        message('REWARD TOTEM OPENED');
        onTriggered?.(record.roomId);
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { arm, resolve, reset, canLeave, destroy(){ running=false; reset(); } };
}
