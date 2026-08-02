import { ARCANA_TWEAKS_EVENT, clampArcanaSize, readArcanaTweaks } from './wizard-arcana-settings.js';
import {
  AQUA_BEAM_SPEC,
  ARCANE_INTERVENTION_SPEC,
  BALL_LIGHTNING_SPEC,
  CYCLONE_BOOMERANG_SPEC,
  EARTHEN_AEGIS_SPEC,
  WIZARD_ARCANE_TYPE_IDS,
  WIZARD_ARCANE_TYPE_SPECS,
  normalizeWizardArcaneTypeId,
} from './wizard-arcane-types-data.js';

export {
  AQUA_BEAM_SPEC,
  ARCANE_INTERVENTION_SPEC,
  BALL_LIGHTNING_SPEC,
  CYCLONE_BOOMERANG_SPEC,
  EARTHEN_AEGIS_SPEC,
  WIZARD_ARCANE_TYPE_IDS,
  WIZARD_ARCANE_TYPE_SPECS,
};

const TAU = Math.PI * 2;
const EPSILON = 1e-9;
const SOURCE_KNOCKBACK_WORLD_SCALE = .1;
const CYCLONE_AUDITED_BASE_ROUND_TRIP = .8;
const COLORS = Object.freeze({
  air: 0x9cebf0,
  airHot: 0xebffff,
  earth: 0xb9905d,
  earthHot: 0xf0d49a,
  lightning: 0xf4dc54,
  lightningHot: 0xffffcf,
  water: 0x4cbce9,
  waterHot: 0xd9f8ff,
  chaos: 0xc36bf2,
  chaosHot: 0xf3d7ff,
});

export const WIZARD_ARCANE_TYPES_SEMANTIC_EVENT = 'wizard-arcana:semantic';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function normalize2(x, z, fallback = {x: 0, z: 1}) {
  const length = Math.hypot(finite(x), finite(z));
  return length > 1e-7 ? {x: finite(x) / length, z: finite(z) / length} : {...fallback};
}

function playerFrame(getPlayer) {
  const player = getPlayer?.() || {};
  const forward = normalize2(player.forwardX, player.forwardZ);
  return {x: finite(player.x), z: finite(player.z), forward, player};
}

function aimDirection(detail, frame) {
  const explicit = detail?.direction || detail?.aimDirection;
  if (explicit) return normalize2(explicit.x, explicit.z, frame.forward);
  if (Number.isFinite(Number(detail?.aimX)) || Number.isFinite(Number(detail?.aimZ))) {
    return normalize2(detail?.aimX, detail?.aimZ, frame.forward);
  }
  return {...frame.forward};
}

export function pointSegmentDistanceArcane2D(point, a, b) {
  const dx = finite(b?.x) - finite(a?.x), dz = finite(b?.z) - finite(a?.z);
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= EPSILON) return Math.hypot(finite(point?.x) - finite(a?.x), finite(point?.z) - finite(a?.z));
  const t = clamp(((finite(point?.x) - finite(a?.x)) * dx + (finite(point?.z) - finite(a?.z)) * dz) / lengthSquared, 0, 1);
  return Math.hypot(finite(point?.x) - (finite(a?.x) + dx * t), finite(point?.z) - (finite(a?.z) + dz * t));
}

function segmentProgress(point, a, b) {
  const dx = finite(b?.x) - finite(a?.x), dz = finite(b?.z) - finite(a?.z);
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= EPSILON) return 0;
  return clamp(((finite(point?.x) - finite(a?.x)) * dx + (finite(point?.z) - finite(a?.z)) * dz) / lengthSquared, 0, 1);
}

export function segmentIntersectionArcane2D(a, b, c, d) {
  const r = {x: finite(b?.x) - finite(a?.x), z: finite(b?.z) - finite(a?.z)};
  const s = {x: finite(d?.x) - finite(c?.x), z: finite(d?.z) - finite(c?.z)};
  const cross = (u, v) => u.x * v.z - u.z * v.x;
  const denominator = cross(r, s);
  if (Math.abs(denominator) <= EPSILON) return null;
  const q = {x: finite(c?.x) - finite(a?.x), z: finite(c?.z) - finite(a?.z)};
  const t = cross(q, s) / denominator, u = cross(q, r) / denominator;
  if (t < -EPSILON || t > 1 + EPSILON || u < -EPSILON || u > 1 + EPSILON) return null;
  return {x: finite(a?.x) + r.x * t, z: finite(a?.z) + r.z * t, t: clamp(t, 0, 1), u: clamp(u, 0, 1)};
}

function firstWallHit(start, end, walls = []) {
  let best = null;
  for (const wall of walls || []) {
    if (!wall?.a || !wall?.b) continue;
    const hit = segmentIntersectionArcane2D(start, end, wall.a, wall.b);
    if (hit && (!best || hit.t < best.hit.t)) best = {wall, hit};
  }
  return best;
}

function cycloneTravelSpeed() {
  const outboundDistance = Math.max(0, finite(CYCLONE_BOOMERANG_SPEC.range));
  const returnDistance = Math.max(0, outboundDistance - Math.max(0, finite(CYCLONE_BOOMERANG_SPEC.catchRadius)));
  return (outboundDistance + returnDistance) / CYCLONE_AUDITED_BASE_ROUND_TRIP;
}

function clipCycloneCarrierSweep(start, requestedEnd, walls = [], clearance = 0) {
  const dx = finite(requestedEnd?.x) - finite(start?.x), dz = finite(requestedEnd?.z) - finite(start?.z);
  const distance = Math.hypot(dx, dz);
  if (distance <= EPSILON) return {end: copyPoint(start), wall: null, wallPosition: null};
  const direction = {x: dx / distance, z: dz / distance};
  const safeClearance = Math.max(0, finite(clearance));
  const probeDistance = distance + safeClearance;
  const probeEnd = {x: finite(start?.x) + direction.x * probeDistance, z: finite(start?.z) + direction.z * probeDistance};
  const wall = firstWallHit(start, probeEnd, walls);
  if (!wall) return {end: copyPoint(requestedEnd), wall: null, wallPosition: null};
  const wallDistance = probeDistance * wall.hit.t;
  const resolvedDistance = clamp(wallDistance - safeClearance, 0, distance);
  return {
    end: {x: finite(start?.x) + direction.x * resolvedDistance, z: finite(start?.z) + direction.z * resolvedDistance},
    wall,
    wallPosition: {x: wall.hit.x, z: wall.hit.z},
  };
}

function cycloneTargetHasClearSweep(start, enemy, walls = []) {
  return !firstWallHit(start, {x: finite(enemy?.x), z: finite(enemy?.z)}, walls);
}

export function clampArcaneAimDirection(initialDirection, requestedDirection, maxRadians = AQUA_BEAM_SPEC.maxAimRadians) {
  const initial = normalize2(initialDirection?.x, initialDirection?.z);
  const requested = normalize2(requestedDirection?.x, requestedDirection?.z, initial);
  const limit = Math.max(0, finite(maxRadians));
  const angle = Math.acos(clamp(initial.x * requested.x + initial.z * requested.z, -1, 1));
  if (angle <= limit + EPSILON) return requested;
  const cross = initial.x * requested.z - initial.z * requested.x;
  const signed = (cross >= 0 ? 1 : -1) * limit;
  const cosine = Math.cos(signed), sine = Math.sin(signed);
  return normalize2(initial.x * cosine - initial.z * sine, initial.x * sine + initial.z * cosine, initial);
}

export function normalizeWizardArcaneTypesRenderMode(value = 'style') {
  const mode = String(value || '').trim().toLowerCase();
  if (mode === 'contract' || mode === 'motion' || mode === 'proxy') return 'contract';
  if (mode === 'source' || mode === 'reference') return 'source';
  return 'style';
}

function activeRenderMode(eventTarget = globalThis.window) {
  try {
    const params = new URLSearchParams(globalThis.location?.search || '');
    if (params.get('capture') !== '1') return 'style';
    const capture = eventTarget?.__abilityCapture?.snapshot?.() || {};
    return normalizeWizardArcaneTypesRenderMode(capture.stage || capture.renderMode || params.get('stage') || params.get('renderMode') || 'style');
  } catch {
    return 'style';
  }
}

export function isLargeArcaneEnemy(enemy, radiusThreshold = ARCANE_INTERVENTION_SPEC.largeEnemyRadius) {
  if (!enemy) return false;
  if (enemy.isBoss || enemy.boss || enemy.large || enemy.isLarge || enemy.teleportImmune) return true;
  if (String(enemy.sizeClass || '').toLowerCase() === 'large') return true;
  return finite(enemy.radius, 0) >= Math.max(0, finite(radiusThreshold));
}

export function resolveArcaneRodDestination({
  origin = {x: 0, z: 0},
  direction = {x: 0, z: 1},
  distance = ARCANE_INTERVENTION_SPEC.throwRange,
  maxDistance = ARCANE_INTERVENTION_SPEC.throwRange,
  minimumDistance = ARCANE_INTERVENTION_SPEC.minimumThrowDistance,
  clearance = ARCANE_INTERVENTION_SPEC.wallClearance,
  walls = [],
  isNavigable = () => true,
} = {}) {
  const start = {x: finite(origin?.x), z: finite(origin?.z)};
  const forward = normalize2(direction?.x, direction?.z);
  const requestedDistance = clamp(finite(distance, maxDistance), 0, Math.max(0, finite(maxDistance)));
  const requested = {x: start.x + forward.x * requestedDistance, z: start.z + forward.z * requestedDistance};
  const wall = firstWallHit(start, requested, walls);
  let resolvedDistance = requestedDistance;
  if (wall) resolvedDistance = Math.max(0, requestedDistance * wall.hit.t - Math.max(0, finite(clearance)));

  const navigable = typeof isNavigable === 'function' ? isNavigable : () => true;
  let position = {x: start.x + forward.x * resolvedDistance, z: start.z + forward.z * resolvedDistance};
  while (resolvedDistance >= minimumDistance - EPSILON && !navigable(position)) {
    resolvedDistance = Math.max(0, resolvedDistance - .25);
    position = {x: start.x + forward.x * resolvedDistance, z: start.z + forward.z * resolvedDistance};
  }
  const valid = resolvedDistance >= minimumDistance - EPSILON && !!navigable(position);
  return Object.freeze({
    valid,
    position: Object.freeze({...position}),
    direction: Object.freeze({...forward}),
    requestedDistance,
    resolvedDistance,
    blockedByWall: !!wall,
    wallHit: wall ? Object.freeze({x: wall.hit.x, z: wall.hit.z}) : null,
  });
}

function pointInBeam(point, origin, direction, range, halfWidth, radius = 0) {
  const dx = finite(point?.x) - finite(origin?.x), dz = finite(point?.z) - finite(origin?.z);
  const along = dx * direction.x + dz * direction.z;
  if (along < -radius || along > range + radius) return false;
  const lateral = Math.abs(dx * direction.z - dz * direction.x);
  return lateral <= halfWidth + radius;
}

function visualMarkers(kind, mode) {
  const layers = mode === 'contract' ? 1 : mode === 'source' ? 3 : 6;
  return Object.freeze({
    kind,
    mode,
    layers,
    silhouetteLayers: mode === 'contract' ? 1 : 2,
    polishLayers: mode === 'style' ? 3 : 0,
  });
}

function makeMaterial(THREE, color, opacity = .88, additive = true) {
  if (!THREE?.MeshBasicMaterial) return null;
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function visualPalette(kind) {
  if (kind === 'cyclone') return [COLORS.air, COLORS.airHot];
  if (kind === 'aegis') return [COLORS.earth, COLORS.earthHot];
  if (kind === 'ball' || kind === 'ball-charge') return [COLORS.lightning, COLORS.lightningHot];
  if (kind === 'beam') return [COLORS.water, COLORS.waterHot];
  return [COLORS.chaos, COLORS.chaosHot];
}

function makeVisual(THREE, parent, {kind, mode, name, position = {x: 0, z: 0}, scale = 1} = {}) {
  const markers = visualMarkers(kind, mode);
  if (!THREE?.Group || !THREE?.Mesh || !parent?.add) return {mesh: null, markers};
  const group = new THREE.Group();
  group.name = name || `Wizard Arcane Types ${kind} ${mode}`;
  group.userData.arcaneVisualKind = kind;
  group.userData.arcaneVisualMode = mode;
  group.position?.set?.(finite(position.x), finite(position.y, .45), finite(position.z));
  group.scale?.setScalar?.(Math.max(.01, finite(scale, 1)));
  const palette = visualPalette(kind);
  const addLayer=(geometry,color,opacity=.8,additive=true,index=group.children.length)=>{
    const material=makeMaterial(THREE,color,opacity,additive);if(!geometry||!material)return null;
    const mesh=new THREE.Mesh(geometry,material);
    mesh.userData.arcaneVisualLayer = index;
    mesh.userData.arcaneVisualKind = kind;
    group.add(mesh);return mesh;
  };
  if(kind==='cyclone'){
    for(let index=0;index<markers.layers;index++){
      const ring=addLayer(new THREE.TorusGeometry(.92+index*.23,.13+index*.018,7,34,TAU*(.70+(index%3)*.08)),index===markers.layers-1?COLORS.airHot:index%2?COLORS.air:0xc8e4e5,clamp(.88-index*.095,.28,.88),true,index);
      ring.rotation.x=Math.PI/2;ring.rotation.z=index*.39;ring.position.z=-index*.25;ring.position.x=(index%2?1:-1)*index*.035;ring.userData.cycloneWake=index;
    }
  }else if(kind==='aegis'){
    const rim=addLayer(new THREE.BoxGeometry(1.16,1.58,.18),0x6d492d,.98,false,0);rim.position.y=.20;
    if(mode!=='contract'){
      const face=addLayer(new THREE.BoxGeometry(.98,1.38,.20),0xa87945,.98,false,1);face.position.set(0,.20,.025);
      const rune=addLayer(new THREE.BoxGeometry(.18,.84,.035),0xb8e978,.94,true,2);rune.position.set(0,.20,.145);rune.rotation.z=.25;
      if(mode==='style'){
        const cross=addLayer(new THREE.BoxGeometry(.68,.14,.035),0xd6e77f,.84,true,3);cross.position.set(0,.20,.146);cross.rotation.z=-.18;
        for(let index=4;index<markers.layers;index++){const chip=addLayer(new THREE.DodecahedronGeometry(.08+(index%2)*.025,0),index%2?COLORS.earthHot:COLORS.earth,.68,true,index);chip.position.set((index%2?1:-1)*(.56+(index-4)*.07),.34-(index-4)*.28,.05);chip.userData.aegisChip=index;}
      }
    }
  }else if(kind==='beam'){
    const body=addLayer(new THREE.CylinderGeometry(.46,.58,1,12,1,true),COLORS.water,.78,false,0);body.rotation.x=Math.PI/2;body.position.y=.12;
    if(mode!=='contract'){
      const lower=addLayer(new THREE.CylinderGeometry(.38,.49,1,12,1,true),0x156ca9,.70,false,1);lower.rotation.x=Math.PI/2;lower.position.y=.07;
      const core=addLayer(new THREE.CylinderGeometry(.15,.22,1.012,10,1,true),COLORS.waterHot,.90,true,2);core.rotation.x=Math.PI/2;core.position.y=.15;
      if(mode==='style'){
        for(let index=3;index<15;index++){
          const side=index%2?1:-1,progress=(index-3)/11;
          const spray=addLayer(new THREE.DodecahedronGeometry(.06+(index%3)*.022,0),index%3?COLORS.water:COLORS.waterHot,.58+(index%2)*.14,index%3===0,index);
          spray.position.set(side*(.39+(index%4)*.055),.08+(index%3)*.045,.04+progress*.92);
          spray.scale.set(1.35,.72,.52+(index%4)*.12);
          spray.userData.beamSpray=index;
        }
      }
    }
  }else if(kind==='intervention-field'){
    for(let index=0;index<markers.layers;index++){const ring=addLayer(new THREE.RingGeometry(.64+index*.06,.70+index*.065,48),index%2?COLORS.chaosHot:COLORS.chaos,clamp(.46-index*.045,.18,.46),true,index);ring.rotation.x=-Math.PI/2;ring.position.y=index*.012;ring.rotation.z=index*.42;}
  }else if(kind==='rod'){
    const rod=addLayer(new THREE.BoxGeometry(.18,1.4,.18),0x1a071f,.96,false,0);rod.position.y=.65;rod.rotation.z=.18;
    if(mode!=='contract'){const core=addLayer(new THREE.BoxGeometry(.07,1.18,.07),COLORS.chaosHot,.94,true,1);core.position.y=.65;core.rotation.z=.18;const halo=addLayer(new THREE.TorusGeometry(.26,.045,6,20),COLORS.chaos,.72,true,2);halo.position.y=.64;halo.rotation.x=Math.PI/2;}
    if(mode==='style')for(let index=3;index<markers.layers;index++){const mote=addLayer(new THREE.DodecahedronGeometry(.055,0),index%2?COLORS.chaosHot:COLORS.chaos,.7,true,index);mote.position.set((index%2?1:-1)*.26,.25+(index-3)*.28,(index%3-1)*.16);mote.userData.rodMote=index;}
  }else if(kind==='storm'){
    const voidDisk=addLayer(new THREE.RingGeometry(0,1.42,56),0x09050d,.94,false,0);voidDisk.rotation.x=-Math.PI/2;
    if(mode!=='contract'){const rim=addLayer(new THREE.TorusGeometry(1.30,.14,7,30),0x7b19aa,.92,true,1);rim.rotation.x=Math.PI/2;rim.scale.set(1.06,1,.94);const inner=addLayer(new THREE.TorusGeometry(.72,.12,7,28),COLORS.chaosHot,.68,true,2);inner.rotation.x=Math.PI/2;}
    if(mode==='style'){
      for(let index=3;index<markers.layers;index++){
        const stroke=addLayer(new THREE.TorusGeometry(.55+(index-3)*.23,.07+(index%2)*.025,6,24),index%2?COLORS.chaosHot:COLORS.chaos,.7,true,index);
        stroke.rotation.x=Math.PI/2;stroke.rotation.z=index*.74;stroke.position.y=.04+(index-3)*.035;stroke.userData.stormStroke=index;
      }
      for(let index=0;index<12;index++){
        const angle=index*TAU/12+(index%3)*.11;
        const shard=addLayer(new THREE.ConeGeometry(.10+(index%2)*.035,.42+(index%3)*.08,4),index%2?COLORS.chaosHot:COLORS.chaos,.82,true,markers.layers+index);
        shard.position.set(Math.cos(angle)*1.34,.08+index%2*.045,Math.sin(angle)*1.34);
        shard.rotation.z=Math.PI/2;shard.rotation.y=-angle;shard.userData.stormStroke=markers.layers+index;
      }
    }
  }else if(kind==='ball'||kind==='ball-charge'){
    const shell=addLayer(new THREE.IcosahedronGeometry(1.32,1),0xffbd28,.84,false,0);
    shell.scale.set(1.02,.88,1.02);
    if(mode!=='contract'){
      const core=addLayer(new THREE.IcosahedronGeometry(.68,1),COLORS.lightningHot,.98,true,1);
      const equator=addLayer(new THREE.TorusGeometry(1.42,.09,6,24,TAU*.82),COLORS.lightningHot,.88,true,2);
      equator.rotation.x=Math.PI/2;equator.rotation.z=.28;equator.userData.lightningArc=2;
    }
    if(mode==='style'){
      for(let index=3;index<11;index++){
        const angle=index*2.399963;
        const fragment=addLayer(new THREE.ConeGeometry(.085+(index%2)*.025,.62+(index%3)*.15,4),index%3?COLORS.lightning:COLORS.lightningHot,.82,true,index);
        fragment.position.set(Math.cos(angle)*1.64,(index%3-1)*.38,Math.sin(angle)*1.64);
        fragment.rotation.z=Math.PI/2;fragment.rotation.y=-angle;fragment.userData.lightningFragment=index;
      }
    }
  }else{
    for(let index=0;index<markers.layers;index++){
      const geometry=new THREE.SphereGeometry(.68+index*.075,10,7),mesh=addLayer(geometry,index===markers.layers-1?palette[1]:palette[index%palette.length],clamp(.92-index*.105,.28,.92),true,index);
      mesh.rotation.y=index*.51;
    }
  }
  parent.add(group);
  return {mesh: group, markers};
}

function disposeObject(root) {
  if (!root) return;
  root.parent?.remove?.(root);
  root.traverse?.(object => {
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) object.material.forEach(material => material?.dispose?.());
    else object.material?.dispose?.();
  });
}

function projectilePosition(projectile) {
  return {
    x: finite(projectile?.x, finite(projectile?.position?.x, finite(projectile?.mesh?.position?.x))),
    z: finite(projectile?.z, finite(projectile?.position?.z, finite(projectile?.mesh?.position?.z))),
  };
}

function projectileRadius(projectile) {
  return Math.max(.08, finite(projectile?.radius, finite(projectile?.r, .16)));
}

function eligibleHostileProjectiles(system) {
  const values = Array.isArray(system?.hostileProjectiles) ? system.hostileProjectiles : [];
  return values.filter(projectile => projectile && !projectile.dead && projectile.life !== 0 && projectile.arcanaInterceptable !== false && !projectile.unblockable);
}

function destroyProjectile(system, projectile) {
  if (!projectile || projectile.dead) return false;
  if (system?.destroyHostileProjectile?.(projectile) === false) return false;
  projectile.dead = true;
  projectile.life = 0;
  if (projectile.mesh) projectile.mesh.visible = false;
  return true;
}

function aliveEnemies(system) {
  return (system?.enemies || []).filter(enemy => enemy && enemy.hp > 0 && !enemy.dead);
}

function enemyRadius(enemy, system) {
  return Math.max(.25, finite(enemy?.radius, .5) * finite(system?.heightScale, 1) * .72);
}

function enemyStableId(enemy, system) {
  if (enemy?.__abilityCaptureDummyId !== undefined) return String(enemy.__abilityCaptureDummyId);
  if (enemy?.wizardStableId !== undefined) return String(enemy.wizardStableId);
  if (enemy?.stableId !== undefined) return String(enemy.stableId);
  if (enemy?.id !== undefined) return String(enemy.id);
  const index = (system?.enemies || []).indexOf(enemy);
  return `enemy-${String(Math.max(0, index) + 1).padStart(3, '0')}`;
}

function copyPoint(point) {
  return {x: finite(point?.x), z: finite(point?.z)};
}

export function installWizardArcaneTypesRuntime({
  THREE = null,
  scene = null,
  getPlayer = () => ({}),
  getEnemySystem = () => null,
  getMazeSegments = () => [],
  validatePosition = () => true,
  isEnemyTeleportEligible = enemy => !isLargeArcaneEnemy(enemy),
  applyEnemyStatus = null,
  eventTarget = globalThis.window,
  initialAquaCharges = 0,
} = {}) {
  const initialTweaks = readArcanaTweaks();
  const makeCooldowns = () => Object.fromEntries(WIZARD_ARCANE_TYPE_IDS.map(id => [id, 0]));
  const makeCastCounts = () => Object.fromEntries(WIZARD_ARCANE_TYPE_IDS.map(id => [id, 0]));
  const state = {
    effects: [],
    elapsed: 0,
    castSerial: 0,
    castCounts: makeCastCounts(),
    lastCast: null,
    cooldowns: makeCooldowns(),
    semanticSerial: 0,
    semanticEvents: [],
    sizeMultiplier: initialTweaks.sizeMultiplier,
    renderMode: activeRenderMode(eventTarget),
    aquaCharges: clamp(Math.trunc(finite(initialAquaCharges)), 0, AQUA_BEAM_SPEC.maxCharges),
    aquaChargeProgress: 0,
    ballCharge: null,
    activeIntervention: null,
  };

  const addEffect = effect => (state.effects.push(effect), effect);

  function semantic(kind, payload = {}) {
    const detail = {
      sequence: ++state.semanticSerial,
      time: state.elapsed,
      kind,
      event: kind,
      ...payload,
    };
    state.semanticEvents.push(detail);
    try {
      if (eventTarget?.dispatchEvent && typeof globalThis.CustomEvent === 'function') {
        eventTarget.dispatchEvent(new CustomEvent(WIZARD_ARCANE_TYPES_SEMANTIC_EVENT, {detail}));
      }
    } catch {}
    return detail;
  }

  function removeEffect(effect) {
    if (!effect) return;
    const visuals = new Set([effect.mesh, effect.rodMesh, ...(effect.meshes || [])].filter(Boolean));
    for (const visual of visuals) disposeObject(visual);
    const index = state.effects.indexOf(effect);
    if (index >= 0) state.effects.splice(index, 1);
    if (state.activeIntervention === effect) state.activeIntervention = null;
  }

  function nextCastStableId(id) {
    state.castSerial++;
    state.castCounts[id]++;
    state.lastCast = id;
    return `${id}:${String(state.castCounts[id]).padStart(4, '0')}`;
  }

  function setCooldown(id, duration) {
    state.cooldowns[id] = Math.max(state.cooldowns[id] || 0, Math.max(0, finite(duration)));
  }

  function damageEnemy(enemy, amount, knock, options = {}) {
    const system = getEnemySystem?.();
    if (!enemy || enemy.hp <= 0) return false;
    if (typeof system?.damageEnemy === 'function') {
      const before = Number(enemy.hp);
      const killed = system.damageEnemy(enemy, amount, knock, {source: 'wizardArcana', ...options});
      return killed === true || Number(enemy.hp) < before;
    }
    enemy.hp = Math.max(0, finite(enemy.hp) - amount);
    return true;
  }

  function makeEffectVisual(kind, stableId, position, scale = 1) {
    return makeVisual(THREE, scene, {
      kind,
      mode: state.renderMode,
      name: `${stableId} ${kind} ${state.renderMode}`,
      position,
      scale: scale * state.sizeMultiplier,
    });
  }

  function updateCarrierVisual(effect, position = effect.position, direction = effect.direction) {
    if (!effect.mesh) return;
    effect.mesh.position?.set?.(finite(position?.x), finite(effect.visualY, .52) * state.sizeMultiplier, finite(position?.z));
    if (direction) effect.mesh.rotation.y = Math.atan2(finite(direction.x), finite(direction.z));
  }

  function castCyclone(detail = {}) {
    const id = CYCLONE_BOOMERANG_SPEC.id;
    if (!canCast(id, detail)) return false;
    const frame = playerFrame(getPlayer), direction = aimDirection(detail, frame), stableId = nextCastStableId(id);
    const visual = makeEffectVisual('cyclone', stableId, frame, CYCLONE_BOOMERANG_SPEC.radius);
    addEffect({
      type: 'cycloneBoomerang', arcanaId: id, stableId,
      phase: 'outbound', age: 0, distance: 0,
      origin: {x: frame.x, z: frame.z}, position: {x: frame.x, z: frame.z}, previous: {x: frame.x, z: frame.z}, direction,
      outboundHits: new Set(), returnHits: new Set(), walls: [...(getMazeSegments?.() || [])],
      mesh: visual.mesh, visualMarkers: visual.markers, visualMode: state.renderMode, visualY: .56,
    });
    setCooldown(id, CYCLONE_BOOMERANG_SPEC.cooldown);
    semantic('cyclone-launched', {
      arcanaId: id,
      stableId,
      direction: {...direction},
      cooldown: CYCLONE_BOOMERANG_SPEC.cooldown,
      travelSpeed: cycloneTravelSpeed(),
      targetRoundTrip: CYCLONE_AUDITED_BASE_ROUND_TRIP,
      visualMode: state.renderMode,
    });
    return true;
  }

  function makeAegisShieldVisual(stableId, position) {
    return makeEffectVisual('aegis', stableId, position, 1);
  }

  function castAegis(detail = {}) {
    const id = EARTHEN_AEGIS_SPEC.id;
    if (!canCast(id, detail)) return false;
    const frame = playerFrame(getPlayer), stableId = nextCastStableId(id), shields = [], meshes = [];
    for (let slot = 0; slot < EARTHEN_AEGIS_SPEC.shieldCount; slot++) {
      const angle = slot * TAU / EARTHEN_AEGIS_SPEC.shieldCount;
      const position = {x: frame.x + Math.cos(angle) * EARTHEN_AEGIS_SPEC.orbitRadius, z: frame.z + Math.sin(angle) * EARTHEN_AEGIS_SPEC.orbitRadius};
      const shieldStableId = `${stableId}:shield:${String(slot + 1).padStart(2, '0')}`;
      const visual = makeAegisShieldVisual(shieldStableId, position);
      shields.push({slot, stableId: shieldStableId, angle, position, hitTargets: new Set(), mesh: visual.mesh, visualMarkers: visual.markers});
      if (visual.mesh) meshes.push(visual.mesh);
    }
    addEffect({
      type: 'earthenAegis', arcanaId: id, stableId, age: 0, shields, meshes,
      visualMode: state.renderMode, visualMarkers: visualMarkers('aegis-ring', state.renderMode),
    });
    setCooldown(id, EARTHEN_AEGIS_SPEC.cooldown);
    semantic('aegis-created', {arcanaId: id, stableId, shieldCount: shields.length, duration: EARTHEN_AEGIS_SPEC.duration, cooldown: EARTHEN_AEGIS_SPEC.cooldown, visualMode: state.renderMode});
    return true;
  }

  function beginBallLightning(detail = {}) {
    const id = BALL_LIGHTNING_SPEC.id;
    if (!canCast(id, {...detail, phase: 'begin'})) return false;
    const frame = playerFrame(getPlayer), stableId = nextCastStableId(id), visual = makeEffectVisual('ball-charge', `${stableId}:charge`, frame, BALL_LIGHTNING_SPEC.minRadius);
    state.ballCharge = {
      arcanaId: id, stableId, age: 0, vulnerable: true,
      inputSlot: Number.isInteger(Number(detail?.slot)) ? Number(detail.slot) : null,
      initialDirection: aimDirection(detail, frame),
      mesh: visual.mesh, visualMarkers: visual.markers, visualMode: state.renderMode,
    };
    semantic('ball-charge-began', {arcanaId: id, stableId, vulnerable: true, visualMode: state.renderMode});
    return true;
  }

  function applyMaximumShock(enemy, stableId, contact) {
    const system = getEnemySystem?.();
    const status = {level: 'maximum', duration: BALL_LIGHTNING_SPEC.maximumShockDuration, source: idForStatus(stableId), contact};
    if (typeof applyEnemyStatus === 'function') applyEnemyStatus(enemy, 'shock', status.duration, status);
    else if (typeof system?.applyEnemyStatus === 'function') system.applyEnemyStatus(enemy, 'shock', status.duration, status);
    else {
      enemy.wizardShockRemaining = Math.max(finite(enemy.wizardShockRemaining), status.duration);
      enemy.wizardShockLevel = 'maximum';
    }
    semantic('ball-maximum-shock', {arcanaId: BALL_LIGHTNING_SPEC.id, stableId, targetId: enemyStableId(enemy, system), contact, duration: status.duration});
  }

  function idForStatus(stableId) {
    return `wizardArcana:${stableId}`;
  }

  function releaseBallLightning(detail = {}) {
    const charge = state.ballCharge;
    if (!charge) return false;
    const releaseSlot = Number.isInteger(Number(detail?.slot)) ? Number(detail.slot) : null;
    if (charge.inputSlot !== null && releaseSlot !== charge.inputSlot) {
      semantic('ball-release-ignored', {arcanaId: charge.arcanaId, stableId: charge.stableId, inputSlot: charge.inputSlot, releaseSlot, reason: 'input-owner-mismatch'});
      return false;
    }
    const frame = playerFrame(getPlayer), direction = aimDirection(detail, frame);
    const chargeRatio = clamp(charge.age / BALL_LIGHTNING_SPEC.fullChargeDuration, 0, 1);
    const hitCount = BALL_LIGHTNING_SPEC.minHits + Math.min(BALL_LIGHTNING_SPEC.maxHits - BALL_LIGHTNING_SPEC.minHits, Math.floor(chargeRatio * (BALL_LIGHTNING_SPEC.maxHits - BALL_LIGHTNING_SPEC.minHits) + EPSILON));
    const fullyCharged = chargeRatio >= 1 - EPSILON;
    disposeObject(charge.mesh);
    const radius = BALL_LIGHTNING_SPEC.minRadius + (BALL_LIGHTNING_SPEC.maxRadius - BALL_LIGHTNING_SPEC.minRadius) * chargeRatio;
    const visual = makeEffectVisual('ball', charge.stableId, frame, radius);
    addEffect({
      type: 'ballLightningProjectile', arcanaId: BALL_LIGHTNING_SPEC.id, stableId: charge.stableId,
      age: 0, distance: 0, position: {x: frame.x, z: frame.z}, previous: {x: frame.x, z: frame.z}, direction,
      velocity: {x: direction.x * BALL_LIGHTNING_SPEC.speed, z: direction.z * BALL_LIGHTNING_SPEC.speed},
      chargeRatio, hitCount, fullyCharged, radius, walls: [...(getMazeSegments?.() || [])],
      mesh: visual.mesh, visualMarkers: visual.markers, visualMode: charge.visualMode, visualY: .62,
    });
    state.ballCharge = null;
    setCooldown(BALL_LIGHTNING_SPEC.id, BALL_LIGHTNING_SPEC.cooldown);
    semantic('ball-released', {arcanaId: BALL_LIGHTNING_SPEC.id, stableId: charge.stableId, direction: {...direction}, chargeRatio, hitCount, fullyCharged, cooldown: BALL_LIGHTNING_SPEC.cooldown, visualMode: charge.visualMode});
    return true;
  }

  function interruptBallLightning(reason = 'interrupted') {
    const charge = state.ballCharge;
    if (!charge) return false;
    disposeObject(charge.mesh);
    state.ballCharge = null;
    setCooldown(BALL_LIGHTNING_SPEC.id, BALL_LIGHTNING_SPEC.cooldown);
    semantic('ball-charge-interrupted', {arcanaId: BALL_LIGHTNING_SPEC.id, stableId: charge.stableId, reason: String(reason || 'interrupted'), vulnerable: true, cooldown: BALL_LIGHTNING_SPEC.cooldown});
    return true;
  }

  function castAquaBeam(detail = {}) {
    const id = AQUA_BEAM_SPEC.id;
    if (!canCast(id, detail)) return false;
    const frame = playerFrame(getPlayer), direction = aimDirection(detail, frame), charges = state.aquaCharges, stableId = nextCastStableId(id);
    state.aquaCharges = 0;
    const visual = makeEffectVisual('beam', stableId, frame, 1);
    addEffect({
      type: 'aquaBeam', arcanaId: id, stableId, age: 0, nextTick: 0, ticksEmitted: 0, tickTotal: charges,
      origin: {x: frame.x, z: frame.z}, initialDirection: direction, direction: {...direction},
      mesh: visual.mesh, visualMarkers: visual.markers, visualMode: state.renderMode,
    });
    semantic('aqua-beam-started', {arcanaId: id, stableId, chargesSpent: charges, tickTotal: charges, minCharges: AQUA_BEAM_SPEC.minCharges, direction: {...direction}, visualMode: state.renderMode});
    return true;
  }

  function interventionDestination(detail = {}) {
    const frame = playerFrame(getPlayer);
    const target = detail?.targetPosition || detail?.destination;
    let direction = aimDirection(detail, frame), distance = ARCANE_INTERVENTION_SPEC.throwRange;
    if (target && Number.isFinite(Number(target.x)) && Number.isFinite(Number(target.z))) {
      const dx = finite(target.x) - frame.x, dz = finite(target.z) - frame.z;
      distance = Math.min(ARCANE_INTERVENTION_SPEC.throwRange, Math.hypot(dx, dz));
      direction = normalize2(dx, dz, direction);
    }
    return resolveArcaneRodDestination({
      origin: frame,
      direction,
      distance,
      walls: getMazeSegments?.() || [],
      isNavigable: position => validatePosition?.(position, {kind: 'arcane-intervention-rod'}) !== false,
    });
  }

  function castIntervention(detail = {}) {
    const id = ARCANE_INTERVENTION_SPEC.id;
    if (state.activeIntervention) return activateIntervention('recast');
    if (!canCast(id, detail)) return false;
    const frame = playerFrame(getPlayer), destination = interventionDestination(detail);
    if (!destination.valid) return false;
    const stableId = nextCastStableId(id);
    const fieldVisual = makeEffectVisual('intervention-field', `${stableId}:capture`, frame, ARCANE_INTERVENTION_SPEC.captureRadius);
    const rodVisual = makeEffectVisual('rod', `${stableId}:rod`, destination.position, 1);
    const effect = addEffect({
      type: 'arcaneInterventionField', arcanaId: id, stableId, age: 0,
      captureCenter: {x: frame.x, z: frame.z}, rodPosition: {...destination.position}, destination,
      mesh: fieldVisual.mesh, rodMesh: rodVisual.mesh,
      visualMarkers: fieldVisual.markers, rodVisualMarkers: rodVisual.markers, visualMode: state.renderMode,
    });
    state.activeIntervention = effect;
    setCooldown(id, ARCANE_INTERVENTION_SPEC.cooldown);
    semantic('intervention-rod-thrown', {arcanaId: id, stableId, rodPosition: {...effect.rodPosition}, requestedDistance: destination.requestedDistance, resolvedDistance: destination.resolvedDistance, blockedByWall: destination.blockedByWall, activationDelay: ARCANE_INTERVENTION_SPEC.activationDelay, cooldown: ARCANE_INTERVENTION_SPEC.cooldown, visualMode: state.renderMode});
    return true;
  }

  function landingCandidates(rodPosition, index, total) {
    const values = [];
    const baseAngle = index * TAU / Math.max(1, total);
    for (let attempt = 0; attempt < 16; attempt++) {
      const ring = 1 + Math.floor(attempt / 8), angle = baseAngle + attempt * 2.399963229728653;
      const radius = ARCANE_INTERVENTION_SPEC.landingSpacing * ring;
      values.push({x: rodPosition.x + Math.cos(angle) * radius, z: rodPosition.z + Math.sin(angle) * radius});
    }
    return values;
  }

  function resolveLanding(rodPosition, enemy, index, total, occupied) {
    for (const candidate of landingCandidates(rodPosition, index, total)) {
      if (occupied.some(point => Math.hypot(point.x - candidate.x, point.z - candidate.z) < ARCANE_INTERVENTION_SPEC.landingSpacing * .72)) continue;
      if (validatePosition?.(candidate, {kind: 'arcane-intervention-landing', enemy}) === false) continue;
      return candidate;
    }
    return null;
  }

  function activateIntervention(reason = 'delay') {
    const field = state.activeIntervention;
    if (!field) return false;
    const system = getEnemySystem?.(), frame = playerFrame(getPlayer);
    field.captureCenter = {x: frame.x, z: frame.z};
    const inside = aliveEnemies(system)
      .filter(enemy => Math.hypot(finite(enemy.x) - frame.x, finite(enemy.z) - frame.z) <= ARCANE_INTERVENTION_SPEC.captureRadius + enemyRadius(enemy, system))
      .sort((a, b) => enemyStableId(a, system).localeCompare(enemyStableId(b, system)));
    const eligible = [], immune = [];
    for (const enemy of inside) {
      if (isEnemyTeleportEligible?.(enemy, system) === false || isLargeArcaneEnemy(enemy)) immune.push(enemy);
      else eligible.push(enemy);
    }
    const occupied = [], teleported = [];
    for (let index = 0; index < eligible.length; index++) {
      const enemy = eligible[index], landing = resolveLanding(field.rodPosition, enemy, index, eligible.length, occupied);
      if (!landing) {
        semantic('intervention-landing-rejected', {arcanaId: field.arcanaId, stableId: field.stableId, targetId: enemyStableId(enemy, system)});
        continue;
      }
      const requestedPosition = {...landing};
      const hasMover = typeof system?.moveEnemyResolved === 'function';
      const moveResult = hasMover ? system.moveEnemyResolved(enemy, landing, {resetVelocity: true, source: 'arcane-intervention'}) : null;
      if (moveResult === false) {
        semantic('intervention-landing-rejected', {
          arcanaId: field.arcanaId, stableId: field.stableId, targetId: enemyStableId(enemy, system),
          reason: 'move-rejected', requestedPosition,
        });
        continue;
      }
      if (!hasMover) { enemy.x = landing.x; enemy.z = landing.z; }
      const resolvedPosition = {
        x: finite(moveResult?.current?.x, finite(enemy.x, landing.x)),
        z: finite(moveResult?.current?.z, finite(enemy.z, landing.z)),
      };
      // The arena collision resolver owns the final position. Keep every later
      // calculation on that same point so subsequent landings cannot overlap a
      // collision-adjusted target and capture telemetry describes what rendered.
      enemy.x = resolvedPosition.x;
      enemy.z = resolvedPosition.z;
      occupied.push(resolvedPosition);
      for (const key of ['vx', 'vz', 'knockX', 'knockZ']) if (key in enemy) enemy[key] = 0;
      const outward = normalize2(
        resolvedPosition.x - field.rodPosition.x,
        resolvedPosition.z - field.rodPosition.z,
        {x: 0, z: 0},
      );
      const pull = ARCANE_INTERVENTION_SPEC.arrivalSourceKnockback * SOURCE_KNOCKBACK_WORLD_SCALE;
      damageEnemy(enemy, ARCANE_INTERVENTION_SPEC.arrivalDamage, {x: outward.x * pull, z: outward.z * pull}, {arcaneInterventionArrival: true, teleport: true});
      const targetId = enemyStableId(enemy, system), adjusted = Math.hypot(resolvedPosition.x - requestedPosition.x, resolvedPosition.z - requestedPosition.z) > EPSILON;
      const landingRecord = {enemy, targetId, requestedPosition, resolvedPosition, adjusted};
      teleported.push(landingRecord);
      semantic('intervention-target-teleported', {
        arcanaId: field.arcanaId, stableId: field.stableId, targetId,
        requestedPosition: {...requestedPosition}, resolvedPosition: {...resolvedPosition}, adjusted,
      });
    }
    for (const enemy of immune) {
      semantic('intervention-teleport-immune', {arcanaId: field.arcanaId, stableId: field.stableId, targetId: enemyStableId(enemy, system), large: true});
    }
    const stormStableId = `${field.stableId}:storm`;
    const stormVisual = makeEffectVisual('storm', stormStableId, field.rodPosition, ARCANE_INTERVENTION_SPEC.stormRadius);
    addEffect({
      type: 'arcaneInterventionStorm', arcanaId: field.arcanaId, stableId: stormStableId, parentStableId: field.stableId,
      age: 0, nextTick: 0, position: {...field.rodPosition},
      mesh: stormVisual.mesh, visualMarkers: stormVisual.markers, visualMode: field.visualMode,
    });
    semantic('intervention-activated', {
      arcanaId: field.arcanaId, stableId: field.stableId, stormStableId, reason,
      captureCenter: {...field.captureCenter}, rodPosition: {...field.rodPosition},
      targetIds: teleported.map(entry => entry.targetId),
      landings: teleported.map(entry => ({
        targetId: entry.targetId,
        requestedPosition: {...entry.requestedPosition},
        resolvedPosition: {...entry.resolvedPosition},
        adjusted: entry.adjusted,
      })),
      immuneTargetIds: immune.map(enemy => enemyStableId(enemy, system)),
      arrivalDamage: ARCANE_INTERVENTION_SPEC.arrivalDamage,
      arrivalSourceKnockback: ARCANE_INTERVENTION_SPEC.arrivalSourceKnockback,
    });
    removeEffect(field);
    return true;
  }

  function canCast(value, detail = {}) {
    const id = normalizeWizardArcaneTypeId(value);
    if (!WIZARD_ARCANE_TYPE_SPECS[id]) return false;
    if (detail?.enhanced || detail?.charged || detail?.chargedSignature || value?.enhanced || value?.charged) return false;
    const phase = String(detail?.phase || detail?.inputPhase || detail?.input || '').toLowerCase();
    if (id === BALL_LIGHTNING_SPEC.id && state.ballCharge) return phase !== 'begin' && phase !== 'press';
    if (id === ARCANE_INTERVENTION_SPEC.id && state.activeIntervention) return true;
    if ((state.cooldowns[id] || 0) > EPSILON) return false;
    if (id === AQUA_BEAM_SPEC.id) return state.aquaCharges >= AQUA_BEAM_SPEC.minCharges && !state.effects.some(effect => effect.type === 'aquaBeam');
    if (id === BALL_LIGHTNING_SPEC.id) return !state.ballCharge;
    if (id === ARCANE_INTERVENTION_SPEC.id) return interventionDestination(detail).valid;
    return true;
  }

  function cast(card, detail = {}) {
    const id = normalizeWizardArcaneTypeId(card);
    const phase = String(detail?.phase || detail?.inputPhase || detail?.input || '').toLowerCase();
    if (detail?.enhanced || detail?.charged || detail?.chargedSignature || card?.enhanced || card?.charged) return false;
    if (id === CYCLONE_BOOMERANG_SPEC.id) return castCyclone(detail);
    if (id === EARTHEN_AEGIS_SPEC.id) return castAegis(detail);
    if (id === BALL_LIGHTNING_SPEC.id) {
      if (phase === 'cancel' || phase === 'interrupt') return interruptBallLightning(phase);
      if (phase === 'release' || (state.ballCharge && phase !== 'begin' && phase !== 'press')) return releaseBallLightning(detail);
      return beginBallLightning(detail);
    }
    if (id === AQUA_BEAM_SPEC.id) return castAquaBeam(detail);
    if (id === ARCANE_INTERVENTION_SPEC.id) return castIntervention(detail);
    return false;
  }
  function canPlay(card,context={}){return canCast(card,context);}
  function play(card,context={}){return canPlay(card,context)?cast(card,context):false;}

  function hitCycloneLeg(effect, start, end, phase) {
    const system = getEnemySystem?.(), ledger = phase === 'outbound' ? effect.outboundHits : effect.returnHits;
    const damage = phase === 'outbound' ? CYCLONE_BOOMERANG_SPEC.outboundDamage : CYCLONE_BOOMERANG_SPEC.returnDamage;
    const candidates = aliveEnemies(system)
      .filter(enemy => !ledger.has(enemy)
        && cycloneTargetHasClearSweep(start, enemy, effect.walls)
        && pointSegmentDistanceArcane2D(enemy, start, end) <= enemyRadius(enemy, system) + CYCLONE_BOOMERANG_SPEC.radius * state.sizeMultiplier)
      .sort((a, b) => segmentProgress(a, start, end) - segmentProgress(b, start, end) || enemyStableId(a, system).localeCompare(enemyStableId(b, system)));
    for (const enemy of candidates) {
      ledger.add(enemy);
      const knock = {x: effect.direction.x * CYCLONE_BOOMERANG_SPEC.worldKnockback, z: effect.direction.z * CYCLONE_BOOMERANG_SPEC.worldKnockback};
      damageEnemy(enemy, damage, knock, {cycloneBoomerang: true, leg: phase});
      semantic('cyclone-hit', {arcanaId: effect.arcanaId, stableId: effect.stableId, leg: phase, targetId: enemyStableId(enemy, system), damage});
    }
  }

  function turnCyclone(effect, reason, position = effect.position) {
    effect.phase = 'return';
    effect.position = {...position};
    const frame = playerFrame(getPlayer);
    effect.direction = normalize2(frame.x - effect.position.x, frame.z - effect.position.z, {x: -effect.direction.x, z: -effect.direction.z});
    semantic('cyclone-turned', {arcanaId: effect.arcanaId, stableId: effect.stableId, reason, position: {...effect.position}});
  }

  function updateCyclone(effect, dt) {
    effect.age += dt;
    const start = {...effect.position};
    const speed = cycloneTravelSpeed();
    const wallClearance = CYCLONE_BOOMERANG_SPEC.radius * state.sizeMultiplier;
    if (effect.phase === 'outbound') {
      const remaining = Math.max(0, CYCLONE_BOOMERANG_SPEC.range - effect.distance);
      const travel = Math.min(remaining, speed * dt);
      const requestedEnd = {x: start.x + effect.direction.x * travel, z: start.z + effect.direction.z * travel};
      const sweep = clipCycloneCarrierSweep(start, requestedEnd, effect.walls, wallClearance);
      const end = sweep.end;
      effect.previous = start;
      effect.position = end;
      effect.distance += Math.hypot(end.x - start.x, end.z - start.z);
      hitCycloneLeg(effect, start, end, 'outbound');
      if (sweep.wall) turnCyclone(effect, 'wall', end);
      else if (effect.distance >= CYCLONE_BOOMERANG_SPEC.range - EPSILON) turnCyclone(effect, 'range', end);
    } else {
      const frame = playerFrame(getPlayer), toPlayer = {x: frame.x - start.x, z: frame.z - start.z}, distance = Math.hypot(toPlayer.x, toPlayer.z);
      if (distance <= CYCLONE_BOOMERANG_SPEC.catchRadius) {
        semantic('cyclone-caught', {arcanaId: effect.arcanaId, stableId: effect.stableId, ownerPosition: {x: frame.x, z: frame.z}, returnHits: effect.returnHits.size});
        removeEffect(effect);
        return;
      }
      effect.direction = normalize2(toPlayer.x, toPlayer.z, effect.direction);
      const travel = Math.min(distance, speed * dt);
      const requestedEnd = {x: start.x + effect.direction.x * travel, z: start.z + effect.direction.z * travel};
      const sweep = clipCycloneCarrierSweep(start, requestedEnd, effect.walls, wallClearance);
      const end = sweep.end;
      effect.previous = start;
      effect.position = end;
      hitCycloneLeg(effect, start, end, 'return');
      if (sweep.wall) {
        semantic('cyclone-fizzled', {
          arcanaId: effect.arcanaId,
          stableId: effect.stableId,
          leg: 'return',
          reason: 'wall',
          position: {...end},
          wallPosition: sweep.wallPosition,
          damage: 0,
        });
        removeEffect(effect);
        return;
      }
      if (Math.hypot(frame.x - end.x, frame.z - end.z) <= CYCLONE_BOOMERANG_SPEC.catchRadius) {
        semantic('cyclone-caught', {arcanaId: effect.arcanaId, stableId: effect.stableId, ownerPosition: {x: frame.x, z: frame.z}, returnHits: effect.returnHits.size});
        removeEffect(effect);
        return;
      }
    }
    updateCarrierVisual(effect);
    if (effect.mesh) effect.mesh.children?.forEach((child,index)=>{child.rotation.z+=(index%2?1:-1)*dt*(5.4+index*.7);});
  }

  function updateAegis(effect, dt) {
    effect.age += dt;
    const frame = playerFrame(getPlayer), system = getEnemySystem?.();
    const spunAge = Math.min(effect.age, EARTHEN_AEGIS_SPEC.spinDuration);
    for (const shield of effect.shields) {
      shield.angle = shield.slot * TAU / EARTHEN_AEGIS_SPEC.shieldCount + spunAge * EARTHEN_AEGIS_SPEC.angularSpeed;
      shield.position = {x: frame.x + Math.cos(shield.angle) * EARTHEN_AEGIS_SPEC.orbitRadius, z: frame.z + Math.sin(shield.angle) * EARTHEN_AEGIS_SPEC.orbitRadius};
      if (shield.mesh) {
        shield.mesh.position?.set?.(shield.position.x, .48 * state.sizeMultiplier, shield.position.z);
        const outwardYaw=Math.atan2(Math.cos(shield.angle),Math.sin(shield.angle));
        shield.mesh.rotation.y=outwardYaw+effect.age*EARTHEN_AEGIS_SPEC.shieldYawSpeed+(shield.slot%2)*Math.PI;
        shield.mesh.rotation.z=0;
      }
      for (const enemy of aliveEnemies(system)) {
        if (shield.hitTargets.has(enemy)) continue;
        if (Math.hypot(finite(enemy.x) - shield.position.x, finite(enemy.z) - shield.position.z) > enemyRadius(enemy, system) + EARTHEN_AEGIS_SPEC.shieldRadius * state.sizeMultiplier) continue;
        shield.hitTargets.add(enemy);
        const direction = normalize2(finite(enemy.x) - frame.x, finite(enemy.z) - frame.z);
        damageEnemy(enemy, EARTHEN_AEGIS_SPEC.damage, {x: direction.x * EARTHEN_AEGIS_SPEC.worldKnockback, z: direction.z * EARTHEN_AEGIS_SPEC.worldKnockback}, {earthenAegis: true, shieldSlot: shield.slot});
        semantic('aegis-hit', {arcanaId: effect.arcanaId, stableId: effect.stableId, shieldStableId: shield.stableId, shieldSlot: shield.slot, targetId: enemyStableId(enemy, system), damage: EARTHEN_AEGIS_SPEC.damage});
      }
      for (const projectile of eligibleHostileProjectiles(system)) {
        const position = projectilePosition(projectile);
        if (Math.hypot(position.x - shield.position.x, position.z - shield.position.z) > projectileRadius(projectile) + EARTHEN_AEGIS_SPEC.shieldRadius * state.sizeMultiplier) continue;
        if (destroyProjectile(system, projectile)) semantic('aegis-projectile-intercepted', {arcanaId: effect.arcanaId, stableId: effect.stableId, shieldStableId: shield.stableId, shieldSlot: shield.slot, projectileId: projectile.id ?? null, shieldConsumed: false});
      }
    }
    if (effect.age >= EARTHEN_AEGIS_SPEC.duration - EPSILON) {
      semantic('aegis-expired', {arcanaId: effect.arcanaId, stableId: effect.stableId, shieldCount: effect.shields.length});
      removeEffect(effect);
    }
  }

  function updateBallProjectile(effect, dt) {
    effect.age += dt;
    const start = {...effect.position}, end = {x: start.x + effect.velocity.x * dt, z: start.z + effect.velocity.z * dt};
    const wall = firstWallHit(start, end, effect.walls);
    if (wall) {
      semantic('ball-ended', {arcanaId: effect.arcanaId, stableId: effect.stableId, reason: 'wall', position: {x: wall.hit.x, z: wall.hit.z}});
      removeEffect(effect);
      return;
    }
    const system = getEnemySystem?.();
    const targets = aliveEnemies(system)
      .filter(enemy => pointSegmentDistanceArcane2D(enemy, start, end) <= enemyRadius(enemy, system) + effect.radius * state.sizeMultiplier)
      .sort((a, b) => segmentProgress(a, start, end) - segmentProgress(b, start, end) || enemyStableId(a, system).localeCompare(enemyStableId(b, system)));
    if (targets.length) {
      const target = targets[0];
      effect.type = 'ballLightningContact';
      effect.target = target;
      effect.position = {x: finite(target.x), z: finite(target.z)};
      effect.contactAge = 0;
      effect.nextHit = 0;
      semantic('ball-contacted', {arcanaId: effect.arcanaId, stableId: effect.stableId, targetId: enemyStableId(target, system), hitCount: effect.hitCount, fullyCharged: effect.fullyCharged});
      updateCarrierVisual(effect, effect.position);
      updateBallContact(effect, 0);
      return;
    }
    effect.previous = start;
    effect.position = end;
    effect.distance += Math.hypot(end.x - start.x, end.z - start.z);
    updateCarrierVisual(effect);
    effect.mesh?.children?.forEach((child,index)=>{if(child.userData?.lightningFragment!==undefined){child.rotation.x+=dt*(5+index);child.rotation.z-=dt*(7+index*.4);}});
    if (effect.distance >= BALL_LIGHTNING_SPEC.range - EPSILON) {
      semantic('ball-ended', {arcanaId: effect.arcanaId, stableId: effect.stableId, reason: 'range', position: {...effect.position}});
      removeEffect(effect);
    }
  }

  function updateBallContact(effect, dt) {
    const system = getEnemySystem?.(), enemy = effect.target;
    if (!enemy || enemy.hp <= 0 || !(system?.enemies || []).includes(enemy)) {
      semantic('ball-ended', {arcanaId: effect.arcanaId, stableId: effect.stableId, reason: 'target-invalid', hitsApplied: effect.nextHit});
      removeEffect(effect);
      return;
    }
    effect.contactAge += dt;
    effect.position = {x: finite(enemy.x), z: finite(enemy.z)};
    updateCarrierVisual(effect, effect.position);
    if(effect.mesh){const strobe=1+Math.sin(effect.contactAge*Math.PI*2/BALL_LIGHTNING_SPEC.hitInterval)*.18;effect.mesh.scale?.setScalar?.(effect.radius*state.sizeMultiplier*strobe);effect.mesh.children?.forEach((child,index)=>{if(child.userData?.lightningFragment!==undefined)child.rotation.z+=dt*(10+index);});}
    while (effect.nextHit < effect.hitCount && effect.contactAge + EPSILON >= effect.nextHit * BALL_LIGHTNING_SPEC.hitInterval) {
      const hit = effect.nextHit + 1;
      if (effect.fullyCharged && hit === 1) applyMaximumShock(enemy, effect.stableId, 'initial');
      const knock = hit === 1 ? {x: effect.direction.x * BALL_LIGHTNING_SPEC.worldKnockback, z: effect.direction.z * BALL_LIGHTNING_SPEC.worldKnockback} : {x: 0, z: 0};
      damageEnemy(enemy, BALL_LIGHTNING_SPEC.damage, knock, {ballLightning: true, hit, hitCount: effect.hitCount, fullyCharged: effect.fullyCharged});
      semantic('ball-hit', {arcanaId: effect.arcanaId, stableId: effect.stableId, targetId: enemyStableId(enemy, system), hit, hitCount: effect.hitCount, damage: BALL_LIGHTNING_SPEC.damage, fullyCharged: effect.fullyCharged});
      effect.nextHit++;
      if (effect.fullyCharged && hit === effect.hitCount) applyMaximumShock(enemy, effect.stableId, 'final');
    }
    if (effect.nextHit >= effect.hitCount) {
      semantic('ball-complete', {arcanaId: effect.arcanaId, stableId: effect.stableId, targetId: enemyStableId(enemy, system), hitCount: effect.hitCount, totalDamage: effect.hitCount * BALL_LIGHTNING_SPEC.damage, maximumShock: effect.fullyCharged});
      removeEffect(effect);
    }
  }

  function updateAquaBeam(effect, dt) {
    effect.age += dt;
    const frame = playerFrame(getPlayer);
    effect.origin = {x: frame.x, z: frame.z};
    effect.direction = clampArcaneAimDirection(effect.initialDirection, frame.forward, AQUA_BEAM_SPEC.maxAimRadians);
    const requestedEnd = {
      x: effect.origin.x + effect.direction.x * AQUA_BEAM_SPEC.range,
      z: effect.origin.z + effect.direction.z * AQUA_BEAM_SPEC.range,
    };
    const wall = firstWallHit(effect.origin, requestedEnd, getMazeSegments?.() || []);
    effect.blockedByWall = !!wall;
    effect.resolvedRange = wall
      ? Math.max(0, AQUA_BEAM_SPEC.range * wall.hit.t - .08)
      : AQUA_BEAM_SPEC.range;
    if (effect.mesh) {
      effect.mesh.position?.set?.(frame.x + effect.direction.x * effect.resolvedRange * .5, .48 * state.sizeMultiplier, frame.z + effect.direction.z * effect.resolvedRange * .5);
      effect.mesh.rotation.y = Math.atan2(effect.direction.x, effect.direction.z);
      effect.mesh.scale?.set?.(AQUA_BEAM_SPEC.halfWidth * 2 * state.sizeMultiplier, state.sizeMultiplier, effect.resolvedRange * state.sizeMultiplier);
      effect.mesh.children?.forEach((child,index)=>{if(child.userData?.beamSpray!==undefined){child.scale.y=1+Math.sin(effect.age*24+index)*.22;child.rotation.z+=dt*(5+index);}});
    }
    const system = getEnemySystem?.();
    for (const projectile of eligibleHostileProjectiles(system)) {
      const position = projectilePosition(projectile);
      if (!pointInBeam(position, effect.origin, effect.direction, effect.resolvedRange, AQUA_BEAM_SPEC.halfWidth * state.sizeMultiplier, projectileRadius(projectile))) continue;
      if (destroyProjectile(system, projectile)) semantic('aqua-projectile-intercepted', {arcanaId: effect.arcanaId, stableId: effect.stableId, projectileId: projectile.id ?? null, direction: {...effect.direction}});
    }
    while (effect.nextTick < effect.tickTotal && effect.age + EPSILON >= (effect.nextTick + 1) * AQUA_BEAM_SPEC.tickInterval) {
      const tick = effect.nextTick + 1, targets = [];
      for (const enemy of aliveEnemies(system)) {
        if (!pointInBeam(enemy, effect.origin, effect.direction, effect.resolvedRange, AQUA_BEAM_SPEC.halfWidth * state.sizeMultiplier, enemyRadius(enemy, system))) continue;
        damageEnemy(enemy, AQUA_BEAM_SPEC.tickDamage, {x: effect.direction.x * AQUA_BEAM_SPEC.worldKnockback, z: effect.direction.z * AQUA_BEAM_SPEC.worldKnockback}, {aquaBeam: true, tick, tickTotal: effect.tickTotal, pierces: true});
        targets.push(enemyStableId(enemy, system));
      }
      effect.ticksEmitted++;
      effect.nextTick++;
      semantic('aqua-beam-tick', {arcanaId: effect.arcanaId, stableId: effect.stableId, tick, tickTotal: effect.tickTotal, damage: AQUA_BEAM_SPEC.tickDamage, targetIds: targets, direction: {...effect.direction}, resolvedRange: effect.resolvedRange, blockedByWall: effect.blockedByWall, piercesEnemies: true});
    }
    if (effect.nextTick >= effect.tickTotal) {
      semantic('aqua-beam-complete', {arcanaId: effect.arcanaId, stableId: effect.stableId, ticks: effect.tickTotal, totalDamagePerTarget: effect.tickTotal * AQUA_BEAM_SPEC.tickDamage});
      removeEffect(effect);
    }
  }

  function updateInterventionField(effect, dt) {
    effect.age += dt;
    const frame = playerFrame(getPlayer);
    effect.captureCenter = {x: frame.x, z: frame.z};
    if (effect.mesh) effect.mesh.position?.set?.(frame.x, .04, frame.z);
    if (effect.rodMesh) effect.rodMesh.rotation.y += dt * 3.2;
    if (effect.age >= ARCANE_INTERVENTION_SPEC.activationDelay - EPSILON) activateIntervention('delay');
  }

  function updateInterventionStorm(effect, dt) {
    effect.age += dt;
    const system = getEnemySystem?.();
    while (effect.nextTick < ARCANE_INTERVENTION_SPEC.stormTickTimes.length && effect.age + EPSILON >= ARCANE_INTERVENTION_SPEC.stormTickTimes[effect.nextTick]) {
      const tick = effect.nextTick + 1, targets = [];
      for (const enemy of aliveEnemies(system)) {
        if (Math.hypot(finite(enemy.x) - effect.position.x, finite(enemy.z) - effect.position.z) > ARCANE_INTERVENTION_SPEC.stormRadius + enemyRadius(enemy, system)) continue;
        const outward = normalize2(finite(enemy.x) - effect.position.x, finite(enemy.z) - effect.position.z, {x: 0, z: 0});
        const pull = ARCANE_INTERVENTION_SPEC.stormSourceKnockback * SOURCE_KNOCKBACK_WORLD_SCALE;
        damageEnemy(enemy, ARCANE_INTERVENTION_SPEC.stormTickDamage, {x: outward.x * pull, z: outward.z * pull}, {arcaneInterventionStorm: true, tick});
        targets.push(enemyStableId(enemy, system));
      }
      effect.nextTick++;
      semantic('intervention-storm-tick', {arcanaId: effect.arcanaId, stableId: effect.stableId, parentStableId: effect.parentStableId, tick, damage: ARCANE_INTERVENTION_SPEC.stormTickDamage, targetIds: targets});
    }
    if (effect.mesh) {
      effect.mesh.rotation.y += dt * 5;
      const pulse = 1 + Math.sin(effect.age * 22) * .08;
      effect.mesh.scale?.setScalar?.(state.sizeMultiplier * ARCANE_INTERVENTION_SPEC.stormRadius * pulse);
    }
    const finalTime = ARCANE_INTERVENTION_SPEC.stormTickTimes.at(-1) || 0;
    if (effect.nextTick >= ARCANE_INTERVENTION_SPEC.stormTickTimes.length && effect.age >= finalTime + .12) {
      semantic('intervention-storm-complete', {arcanaId: effect.arcanaId, stableId: effect.stableId, parentStableId: effect.parentStableId, ticks: effect.nextTick});
      removeEffect(effect);
    }
  }

  function updateAquaResource(dt) {
    if (state.aquaCharges >= AQUA_BEAM_SPEC.maxCharges) {
      state.aquaCharges = AQUA_BEAM_SPEC.maxCharges;
      state.aquaChargeProgress = 0;
      return;
    }
    state.aquaChargeProgress += dt;
    while (state.aquaCharges < AQUA_BEAM_SPEC.maxCharges && state.aquaChargeProgress + EPSILON >= AQUA_BEAM_SPEC.chargeInterval) {
      state.aquaChargeProgress = Math.max(0, state.aquaChargeProgress - AQUA_BEAM_SPEC.chargeInterval);
      state.aquaCharges++;
      semantic('aqua-charge-gained', {arcanaId: AQUA_BEAM_SPEC.id, charges: state.aquaCharges, maxCharges: AQUA_BEAM_SPEC.maxCharges});
    }
    if (state.aquaCharges >= AQUA_BEAM_SPEC.maxCharges) state.aquaChargeProgress = 0;
  }

  function updateBallCharge(dt) {
    if (!state.ballCharge) return;
    state.ballCharge.age = Math.min(BALL_LIGHTNING_SPEC.fullChargeDuration, state.ballCharge.age + dt);
    const frame = playerFrame(getPlayer), ratio = state.ballCharge.age / BALL_LIGHTNING_SPEC.fullChargeDuration;
    if (state.ballCharge.mesh) {
      state.ballCharge.mesh.position?.set?.(frame.x + frame.forward.x * .72, .58 * state.sizeMultiplier, frame.z + frame.forward.z * .72);
      const scale = state.sizeMultiplier * (BALL_LIGHTNING_SPEC.minRadius + (BALL_LIGHTNING_SPEC.maxRadius - BALL_LIGHTNING_SPEC.minRadius) * ratio);
      state.ballCharge.mesh.scale?.setScalar?.(scale);
      state.ballCharge.mesh.rotation.y += dt * (4 + ratio * 5);
    }
  }

  function effectSnapshot(effect) {
    const base = {
      type: effect.type,
      arcanaId: effect.arcanaId,
      stableId: effect.stableId,
      age: finite(effect.age),
      visualMode: effect.visualMode || '',
      visualMarkers: effect.visualMarkers ? {...effect.visualMarkers} : null,
    };
    if (effect.type === 'cycloneBoomerang') Object.assign(base, {phase: effect.phase, position: copyPoint(effect.position), previous: copyPoint(effect.previous), direction: copyPoint(effect.direction), distance: effect.distance, outboundHitCount: effect.outboundHits.size, returnHitCount: effect.returnHits.size});
    else if (effect.type === 'earthenAegis') Object.assign(base, {duration: EARTHEN_AEGIS_SPEC.duration, shields: effect.shields.map(shield => ({stableId: shield.stableId, slot: shield.slot, angle: shield.angle, position: copyPoint(shield.position), hitCount: shield.hitTargets.size, visualMarkers: {...shield.visualMarkers}}))});
    else if (effect.type === 'ballLightningProjectile' || effect.type === 'ballLightningContact') Object.assign(base, {position: copyPoint(effect.position), direction: copyPoint(effect.direction), distance: effect.distance, chargeRatio: effect.chargeRatio, hitCount: effect.hitCount, hitsApplied: finite(effect.nextHit), fullyCharged: effect.fullyCharged, targetId: effect.target ? enemyStableId(effect.target, getEnemySystem?.()) : null});
    else if (effect.type === 'aquaBeam') Object.assign(base, {origin: copyPoint(effect.origin), initialDirection: copyPoint(effect.initialDirection), direction: copyPoint(effect.direction), resolvedRange: finite(effect.resolvedRange, AQUA_BEAM_SPEC.range), blockedByWall: !!effect.blockedByWall, tickTotal: effect.tickTotal, ticksEmitted: effect.ticksEmitted});
    else if (effect.type === 'arcaneInterventionField') Object.assign(base, {captureCenter: copyPoint(effect.captureCenter), rodPosition: copyPoint(effect.rodPosition), activationDelay: ARCANE_INTERVENTION_SPEC.activationDelay, destination: {valid: effect.destination.valid, requestedDistance: effect.destination.requestedDistance, resolvedDistance: effect.destination.resolvedDistance, blockedByWall: effect.destination.blockedByWall}, rodVisualMarkers: {...effect.rodVisualMarkers}});
    else if (effect.type === 'arcaneInterventionStorm') Object.assign(base, {parentStableId: effect.parentStableId, position: copyPoint(effect.position), nextTick: effect.nextTick, tickTotal: ARCANE_INTERVENTION_SPEC.stormTickTimes.length});
    return base;
  }

  function snapshot() {
    const ball = state.ballCharge;
    const chargeRatio = ball ? clamp(ball.age / BALL_LIGHTNING_SPEC.fullChargeDuration, 0, 1) : 0;
    return {
      simulationTime: state.elapsed,
      castSerial: state.castSerial,
      castCounts: {...state.castCounts},
      lastCast: state.lastCast,
      renderMode: state.renderMode,
      cooldowns: {...state.cooldowns},
      resources: {
        aqua: {
          charges: state.aquaCharges,
          minCharges: AQUA_BEAM_SPEC.minCharges,
          maxCharges: AQUA_BEAM_SPEC.maxCharges,
          chargeProgress: state.aquaChargeProgress,
          secondsToNext: state.aquaCharges >= AQUA_BEAM_SPEC.maxCharges ? 0 : Math.max(0, AQUA_BEAM_SPEC.chargeInterval - state.aquaChargeProgress),
          ready: state.aquaCharges >= AQUA_BEAM_SPEC.minCharges,
        },
      },
      ballLightningCharge: ball ? {
        stableId: ball.stableId,
        inputSlot: ball.inputSlot,
        age: ball.age,
        chargeRatio,
        projectedHits: BALL_LIGHTNING_SPEC.minHits + Math.min(BALL_LIGHTNING_SPEC.maxHits - BALL_LIGHTNING_SPEC.minHits, Math.floor(chargeRatio * (BALL_LIGHTNING_SPEC.maxHits - BALL_LIGHTNING_SPEC.minHits) + EPSILON)),
        fullyCharged: chargeRatio >= 1 - EPSILON,
        vulnerable: true,
        visualMode: ball.visualMode,
        visualMarkers: {...ball.visualMarkers},
      } : null,
      activeInterventionStableId: state.activeIntervention?.stableId || null,
      effects: state.effects.map(effectSnapshot),
      semanticEvents: state.semanticEvents.map(event => ({
        ...event,
        ...(event.direction ? {direction: {...event.direction}} : {}),
        ...(event.position ? {position: {...event.position}} : {}),
        ...(event.requestedPosition ? {requestedPosition: {...event.requestedPosition}} : {}),
        ...(event.resolvedPosition ? {resolvedPosition: {...event.resolvedPosition}} : {}),
        ...(event.targetIds ? {targetIds: event.targetIds.slice()} : {}),
        ...(event.immuneTargetIds ? {immuneTargetIds: event.immuneTargetIds.slice()} : {}),
        ...(event.landings ? {landings: event.landings.map(landing => ({
          ...landing,
          requestedPosition: {...landing.requestedPosition},
          resolvedPosition: {...landing.resolvedPosition},
        }))} : {}),
      })),
    };
  }

  function cleanup(value = null) {
    const id = value ? normalizeWizardArcaneTypeId(value) : null;
    if (!id || id === BALL_LIGHTNING_SPEC.id) {
      if (state.ballCharge) disposeObject(state.ballCharge.mesh);
      state.ballCharge = null;
    }
    for (const effect of [...state.effects]) if (!id || effect.arcanaId === id) removeEffect(effect);
  }

  function reset() {
    cleanup();
    state.elapsed = 0;
    state.castSerial = 0;
    state.castCounts = makeCastCounts();
    state.lastCast = null;
    state.cooldowns = makeCooldowns();
    state.semanticSerial = 0;
    state.semanticEvents.length = 0;
    state.aquaCharges = clamp(Math.trunc(finite(initialAquaCharges)), 0, AQUA_BEAM_SPEC.maxCharges);
    state.aquaChargeProgress = 0;
    state.activeIntervention = null;
    state.renderMode = activeRenderMode(eventTarget);
  }

  function update(dt, now = 0) {
    const frame = Math.max(0, finite(dt));
    if (frame <= 0) return;
    state.elapsed += frame;
    for (const id of WIZARD_ARCANE_TYPE_IDS) state.cooldowns[id] = Math.max(0, state.cooldowns[id] - frame);
    updateAquaResource(frame);
    updateBallCharge(frame);
    for (const effect of [...state.effects]) {
      if (!state.effects.includes(effect)) continue;
      if (effect.type === 'cycloneBoomerang') updateCyclone(effect, frame);
      else if (effect.type === 'earthenAegis') updateAegis(effect, frame);
      else if (effect.type === 'ballLightningProjectile') updateBallProjectile(effect, frame);
      else if (effect.type === 'ballLightningContact') updateBallContact(effect, frame);
      else if (effect.type === 'aquaBeam') updateAquaBeam(effect, frame);
      else if (effect.type === 'arcaneInterventionField') updateInterventionField(effect, frame);
      else if (effect.type === 'arcaneInterventionStorm') updateInterventionStorm(effect, frame);
    }
    void now;
  }

  const onPlay = event => play(event?.detail?.card || event?.detail?.arcanaId || event?.detail?.id, event?.detail || {});
  const onTweaks = event => { state.sizeMultiplier = clampArcanaSize(event?.detail?.sizeMultiplier); };
  eventTarget?.addEventListener?.('wizard-arcana:play', onPlay);
  eventTarget?.addEventListener?.(ARCANA_TWEAKS_EVENT, onTweaks);

  return {
    state,
    cast,
    canCast,
    canPlay,
    play,
    beginBallLightning,
    releaseBallLightning,
    interruptBallLightning,
    activateIntervention,
    update,
    postEnemyUpdate() {},
    snapshot,
    cleanup,
    reset,
    dispose() {
      eventTarget?.removeEventListener?.('wizard-arcana:play', onPlay);
      eventTarget?.removeEventListener?.(ARCANA_TWEAKS_EVENT, onTweaks);
      cleanup();
    },
    get busy() {
      return !!state.ballCharge || state.effects.some(effect => effect.type === 'aquaBeam' || effect.type === 'arcaneInterventionField');
    },
  };
}
