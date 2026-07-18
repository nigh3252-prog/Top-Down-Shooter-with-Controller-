// Physical room-reward gate for the run draft.
// Enemy clear spawns a strikeable totem and keeps every exit sealed until the
// player hits it, then chooses a card or explicitly skips the reward.

let THREE = null;

export function pointSegmentDistance2D(point, a, b) {
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const lenSq = abx * abx + abz * abz;
  if (lenSq <= 1e-8) return Math.hypot(point.x - a.x, point.z - a.z);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * abx + (point.z - a.z) * abz) / lenSq));
  return Math.hypot(point.x - (a.x + abx * t), point.z - (a.z + abz * t));
}

export function chooseTotemPosition({ actorX = 0, actorZ = 0, centerX = 0, centerZ = 0, segments = [] } = {}) {
  const towardX = centerX - actorX;
  const towardZ = centerZ - actorZ;
  const towardLen = Math.hypot(towardX, towardZ) || 1;
  const nx = towardX / towardLen;
  const nz = towardZ / towardLen;
  const sideX = -nz;
  const sideZ = nx;
  const candidates = [
    { x:centerX, z:centerZ },
    { x:actorX + nx * 3.4, z:actorZ + nz * 3.4 },
    { x:actorX + nx * 2.8 + sideX * 1.8, z:actorZ + nz * 2.8 + sideZ * 1.8 },
    { x:actorX + nx * 2.8 - sideX * 1.8, z:actorZ + nz * 2.8 - sideZ * 1.8 },
    { x:actorX + sideX * 3.2, z:actorZ + sideZ * 3.2 },
    { x:actorX - sideX * 3.2, z:actorZ - sideZ * 3.2 },
  ];
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const actorDistance = Math.hypot(candidate.x - actorX, candidate.z - actorZ);
    if (actorDistance < 1.8) continue;
    let wallClearance = 8;
    for (const segment of segments || []) {
      if (!segment?.a || !segment?.b) continue;
      wallClearance = Math.min(wallClearance, pointSegmentDistance2D(candidate, segment.a, segment.b));
    }
    const score = Math.min(wallClearance, 5) - Math.abs(actorDistance - 3.8) * .18;
    if (score > bestScore) { best = candidate; bestScore = score; }
  }
  return best;
}

function arenaApi() { return typeof window === 'undefined' ? null : window.__arena; }
function rewardGateElement() { return typeof document === 'undefined' ? null : document.getElementById('cardRewardGate'); }
function setupIsOpen() { return !document.getElementById('startGate')?.classList.contains('hidden'); }

function showMessage(text) {
  const msg = document.getElementById('msg');
  if (!msg) return;
  msg.textContent = text;
  msg.style.opacity = '1';
}

function makeLabelSprite(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 112;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(7,18,20,.88)';
  ctx.strokeStyle = 'rgba(232,160,76,.92)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(7, 7, canvas.width - 14, canvas.height - 14, 20);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f0d8b0';
  ctx.font = '900 38px ui-monospace, Menlo, Consolas, monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map:texture, transparent:true, depthWrite:false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(5.6, 1.22, 1);
  sprite.userData.rewardTotemTexture = texture;
  return sprite;
}

function disposeTotem(record) {
  const group = record?.group;
  if (!group) return;
  group.parent?.remove(group);
  group.traverse(object => {
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) object.material.forEach(material => material?.dispose?.());
    else object.material?.dispose?.();
    object.userData?.rewardTotemTexture?.dispose?.();
  });
  record.group = null;
}

function buildTotem(api, roomId) {
  const center = api.mazeWorld?.center || { x:api.actorPos.x, z:api.actorPos.y };
  const segments = api.mazeWorld?.getCollisionSegments?.() || [];
  const position = chooseTotemPosition({
    actorX:api.actorPos.x, actorZ:api.actorPos.y,
    centerX:center.x, centerZ:center.z,
    segments,
  });

  const group = new THREE.Group();
  group.name = `reward-totem-room-${roomId}`;
  group.position.set(position.x, 0, position.z);

  const stone = new THREE.MeshStandardMaterial({ color:0x31504d, roughness:.82, metalness:.04 });
  const darkStone = new THREE.MeshStandardMaterial({ color:0x152b2c, roughness:.9, metalness:.02 });
  const gold = new THREE.MeshStandardMaterial({ color:0xe8a04c, emissive:0x6d2f12, emissiveIntensity:1.15, roughness:.34, metalness:.52 });
  const rune = new THREE.MeshStandardMaterial({ color:0xffc36c, emissive:0xe86b24, emissiveIntensity:2.2, roughness:.18, metalness:.2 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.25, .42, 8), darkStone);
  base.position.y = .21; group.add(base);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(.72, .92, .62, 8), stone);
  plinth.position.y = .66; group.add(plinth);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(.34, .46, 1.15, 6), stone);
  pillar.position.y = 1.45; group.add(pillar);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.58, 0), rune);
  crystal.position.y = 2.18; crystal.rotation.z = Math.PI / 4; group.add(crystal);
  const crown = new THREE.Mesh(new THREE.TorusGeometry(.72, .075, 6, 24), gold);
  crown.position.y = 2.15; crown.rotation.x = Math.PI / 2; group.add(crown);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(.94, .035, 5, 28), rune.clone());
  halo.position.y = 2.2; halo.rotation.x = Math.PI / 2; group.add(halo);
  const light = new THREE.PointLight(0xff9b45, 16, 8, 1.7);
  light.position.y = 2.25; group.add(light);
  const label = makeLabelSprite('STRIKE FOR REWARD');
  label.position.y = 3.35; group.add(label);

  api.mazeWorld.group.add(group);
  return { group, crystal, crown, halo, light, hitToken:{ roomId, rewardTotem:true }, position };
}

function applyDoorGate(api, roomId, unlocked) {
  if (!api?.mazeWorld || api.activeRoomId !== roomId) return;
  const cleared = api.encounterState?.isCleared?.(roomId) || false;
  api.mazeWorld.setDoorStates({
    sealedRoomIds: unlocked ? api.encounterState.sealedRoomIds : new Set([roomId]),
    openedDoorEdges: api.encounterState.openedDoorEdges,
    roomCleared: unlocked && cleared,
  });
}

function contactWindow(combatState) {
  const attack = combatState?.attack;
  if (!attack) return false;
  const contact = Number(attack.contactAt) || 0;
  return combatState.t >= Math.max(0, contact - .11) && combatState.t <= contact + .23;
}

function weaponHitsTotem(api, record) {
  const combatState = api.combatState;
  const PC = api.PC;
  if (!record?.group || !contactWindow(combatState) || !PC?.weaponRoot) return false;
  if (combatState.hitIds?.has(record.hitToken)) return false;
  const zones = PC.getWeaponHitZones?.() || [];
  const world = new THREE.Vector3();
  record.group.getWorldPosition(world);
  const samples = [.45, 1.05, 1.62, 2.18, 2.65].map(y => new THREE.Vector3(world.x, world.y + y, world.z));
  for (const zone of zones) {
    const a = PC.weaponRoot.localToWorld(zone.from.clone());
    const b = PC.weaponRoot.localToWorld(zone.to.clone());
    const threshold = (zone.radius || .2) + .82;
    for (const sample of samples) {
      if (PC.pointSegmentDistance(sample, a, b) <= threshold) {
        if (!combatState.hitIds) combatState.hitIds = new Set();
        combatState.hitIds.add(record.hitToken);
        return true;
      }
    }
  }
  return false;
}

async function installRewardTotemGate() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__REWARD_TOTEM_GATE_INSTALLED__) return;
  window.__REWARD_TOTEM_GATE_INSTALLED__ = true;
  try { THREE = await import('three'); }
  catch (error) {
    console.error('Reward totem failed to load Three.js', error);
    return;
  }

  const records = new Map();
  let lastCleared = 0;
  let observedGate = null;
  let gateObserver = null;

  window.__RUN_REWARD_GATE_CAN_LEAVE__ = roomId => {
    const record = records.get(roomId);
    return !record || record.phase === 'resolved';
  };

  function activeRecord(api = arenaApi()) { return api ? records.get(api.activeRoomId) : null; }

  function resetAll() {
    for (const record of records.values()) disposeTotem(record);
    records.clear();
    const gate = rewardGateElement();
    gate?.classList.add('hidden');
  }

  function ensurePending(api, roomId) {
    let record = records.get(roomId);
    if (record && record.phase !== 'resolved') return record;
    if (record) disposeTotem(record);
    record = { roomId, phase:'awaitingTotem', ...buildTotem(api, roomId) };
    records.set(roomId, record);
    applyDoorGate(api, roomId, false);
    showMessage(`ROOM ${roomId + 1} CLEAR · STRIKE THE TOTEM`);
    return record;
  }

  function resolveReward(record) {
    const api = arenaApi();
    if (!record || record.phase !== 'choosing') return;
    record.phase = 'resolved';
    disposeTotem(record);
    applyDoorGate(api, record.roomId, true);
    showMessage('REWARD CLAIMED · STRIKE A DOOR');
  }

  function onGateVisibilityChanged() {
    const gate = rewardGateElement();
    const api = arenaApi();
    if (!gate || !api) return;
    const visible = !gate.classList.contains('hidden');
    const record = activeRecord(api);
    if (visible) {
      if (!api.arena.started || setupIsOpen() || !api.encounterState?.isCleared?.(api.activeRoomId)) return;
      const pending = record || ensurePending(api, api.activeRoomId);
      if (pending.phase === 'awaitingTotem') {
        gate.classList.add('hidden');
        api.arena.paused = false;
        applyDoorGate(api, pending.roomId, false);
      }
    } else if (record?.phase === 'choosing') {
      resolveReward(record);
    }
  }

  function observeRewardGate() {
    const gate = rewardGateElement();
    if (!gate || gate === observedGate) return;
    gateObserver?.disconnect();
    observedGate = gate;
    gateObserver = new MutationObserver(onGateVisibilityChanged);
    gateObserver.observe(gate, { attributes:true, attributeFilter:['class'] });
    onGateVisibilityChanged();
  }

  const bodyObserver = new MutationObserver(observeRewardGate);
  bodyObserver.observe(document.body, { childList:true, subtree:true });
  observeRewardGate();

  function frame(nowMs = performance.now()) {
    const api = arenaApi();
    observeRewardGate();
    if (api?.encounterState) {
      const cleared = api.encounterState.progress?.cleared || 0;
      if (cleared < lastCleared || (!api.arena.started && records.size)) resetAll();
      if (api.arena.started && !setupIsOpen() && cleared > lastCleared && api.encounterState.isCleared(api.activeRoomId)) {
        ensurePending(api, api.activeRoomId);
      }
      lastCleared = cleared;

      const record = activeRecord(api);
      if (record?.phase === 'awaitingTotem') {
        applyDoorGate(api, record.roomId, false);
        const t = nowMs / 1000;
        record.crystal.rotation.y = t * 1.7;
        record.crystal.position.y = 2.18 + Math.sin(t * 3.2) * .10;
        record.crown.rotation.z = t * .55;
        record.halo.rotation.z = -t * .82;
        record.light.intensity = 14 + Math.sin(t * 4.6) * 3;
        if (weaponHitsTotem(api, record)) {
          record.phase = 'choosing';
          record.crystal.scale.setScalar(1.45);
          record.light.intensity = 34;
          showMessage('REWARD TOTEM OPENED');
          const gate = rewardGateElement();
          api.arena.paused = true;
          gate?.classList.remove('hidden');
        }
      } else if (record?.phase === 'choosing') {
        applyDoorGate(api, record.roomId, false);
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

installRewardTotemGate();
