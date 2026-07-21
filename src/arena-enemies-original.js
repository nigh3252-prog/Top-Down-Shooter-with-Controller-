// Branch-local lion behavior wrapper. The full current main implementation remains
// pinned below so the Pilebunker rigid-body work and all existing enemy tuning stay
// intact while this branch adds delayed pursuit plus a confirmed-hit pounce maul.

import {
  ARENA_ENEMY_ARCHETYPES,
  createArenaEnemySystem as createPinnedArenaEnemySystem,
} from 'https://cdn.jsdelivr.net/gh/nigh3252-prog/Top-Down-Shooter-with-Controller-@5cc93e68f6d48234127bc838a38a3a810025f786/src/arena-enemies-original.js';
import { setArenaEnemySource } from './arena-enemy-registry.js';
import { FUSION_ATTACKS } from './fusion-enemies.js';
import {
  DEFAULT_LION_MAUL_PRESET,
  LION_MAUL_PRESETS,
  createLionMaulSequence,
  lionMaulPreset,
  normalizeLionMaulSettings,
} from './lion-maul.js';
import { createDelayedPositionTracker } from './player-position-history.js';
import { StoneSettings } from './settings.js';

export { ARENA_ENEMY_ARCHETYPES };

const LION_TRAIL_DELAY = 3;
const LION_ATTACK = FUSION_ATTACKS.lionPounce;
const ATTACK_START_PADDING = .22 * 4.3;
const PLAYER_RADIUS = 1.075;
const ARENA_MARGIN = 1;
const MAUL_PIN_DISTANCE = 1.34;
const MAUL_COLLISION_SCALE = .02;
const MAUL_PRESET_SETTING = 'arena.lionMaulPreset';
const MAUL_SETTINGS_SETTING = 'arena.lionMaulSettings';
const MAUL_SECTION_SETTING = 'arena.section.lionMaulTuning';
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const approach = (current, target, dt, rate = 6) => current + (target - current) * Math.min(1, Math.max(0, dt) * rate);

function finite(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function enemyCollisionRadius(enemy, system) {
  return Math.max(.05, finite(enemy?.radius, .94) * finite(system?.heightScale, 1) * finite(enemy?.collisionScale, 1));
}

function setLionFacing(lion, x, z) {
  const length = Math.hypot(x, z);
  if (length <= 1e-5) return;
  const nx = x / length;
  const nz = z / length;
  lion.facing = lion.facing || { x:nx, z:nz };
  lion.facing.x = nx;
  lion.facing.z = nz;
  lion.facingAngle = Math.atan2(nx, nz);
  lion.targetFacingAngle = lion.facingAngle;
  if (lion.root?.rotation) lion.root.rotation.y = lion.facingAngle;
}

function savedMaulConfiguration() {
  const savedPreset = StoneSettings.get(MAUL_PRESET_SETTING, DEFAULT_LION_MAUL_PRESET);
  const presetId = savedPreset === 'custom' || LION_MAUL_PRESETS[savedPreset]
    ? savedPreset
    : DEFAULT_LION_MAUL_PRESET;
  const stored = StoneSettings.get(MAUL_SETTINGS_SETTING, null);
  const settings = presetId === 'custom' && stored
    ? normalizeLionMaulSettings(stored)
    : lionMaulPreset(presetId);
  return { presetId, settings };
}

export function createArenaEnemySystem(options = {}) {
  const system = createPinnedArenaEnemySystem(options);
  const { THREE, worldRoot = null } = options;
  const navigation = options.navigation || null;
  const arenaRadius = finite(options.arenaRadius, 18);
  const history = createDelayedPositionTracker({ delaySeconds:LION_TRAIL_DELAY, retentionSeconds:4.5 });
  const baseUpdate = system.update.bind(system);
  const baseDamageEnemy = system.damageEnemy.bind(system);
  const baseReset = system.reset?.bind(system);
  const baseStartRoomEncounter = system.startRoomEncounter?.bind(system);
  const baseClearRoomRuntime = system.clearRoomRuntime?.bind(system);
  const hpDescriptor = Object.getOwnPropertyDescriptor(system, 'playerHp');
  const hitDescriptor = Object.getOwnPropertyDescriptor(system, 'lastPlayerHit');
  const hitDirDescriptor = Object.getOwnPropertyDescriptor(system, 'lastPlayerHitDir');
  const readBasePlayerHp = hpDescriptor?.get
    ? hpDescriptor.get.bind(system)
    : () => finite(hpDescriptor?.value, 100);
  const readBaseLastHit = hitDescriptor?.get
    ? hitDescriptor.get.bind(system)
    : () => String(hitDescriptor?.value || '');
  const readBaseLastHitDir = hitDirDescriptor?.get
    ? hitDirDescriptor.get.bind(system)
    : () => hitDirDescriptor?.value || null;
  const initialConfiguration = savedMaulConfiguration();
  let maulPresetId = initialConfiguration.presetId;
  let maulSettings = initialConfiguration.settings;
  let elapsed = 0;
  let lastPlayer = null;
  let supplementalPlayerDamage = 0;
  let manualLastPlayerHit = '';
  let manualLastPlayerHitDir = null;
  let activeMaul = null;
  let starTexture = null;
  let tuningControls = null;

  const reportedPlayerHp = () => Math.max(0, finite(readBasePlayerHp(), 100) - supplementalPlayerDamage);

  function persistMaulConfiguration() {
    StoneSettings.set(MAUL_PRESET_SETTING, maulPresetId);
    StoneSettings.set(MAUL_SETTINGS_SETTING, maulSettings);
  }

  function resetTrail() {
    elapsed = 0;
    lastPlayer = null;
    history.clear();
  }

  function resolveMovement(lion, previous, dx, dz) {
    const radius = enemyCollisionRadius(lion, system);
    if (navigation?.resolveMovement) {
      const moved = navigation.resolveMovement(previous, { x:dx, z:dz }, radius);
      if (Number.isFinite(moved?.x) && Number.isFinite(moved?.z)) return moved;
    }

    let x = previous.x + dx;
    let z = previous.z + dz;
    const distance = Math.hypot(x, z);
    const limit = Math.max(1, arenaRadius - radius - ARENA_MARGIN);
    if (distance > limit) {
      x *= limit / distance;
      z *= limit / distance;
    }
    return { x, z };
  }

  function trailVector(lion, trailPoint) {
    const rawTarget = { x:trailPoint.x, z:trailPoint.z };
    const waypoint = navigation?.nextWaypoint?.(lion, rawTarget, system.activeEncounterRoomId) || rawTarget;
    const x = finite(waypoint.x) - lion.x;
    const z = finite(waypoint.z) - lion.z;
    return { x, z, distance:Math.hypot(x, z) };
  }

  function moveLionAlongTrail(lion, before, trailPoint, dt) {
    lion.x = before.x;
    lion.z = before.z;

    const target = trailVector(lion, trailPoint);
    const stopDistance = Math.max(.2, finite(lion.radius, .94) * .2);
    const maxSpeed = Math.max(.1, finite(lion.speed, 4) * finite(system.speedScale, 1));

    let targetVx = 0;
    let targetVz = 0;
    if (target.distance > stopDistance) {
      const amount = clamp((target.distance - stopDistance) / Math.max(.5, stopDistance), 0, 1);
      targetVx = target.x / target.distance * maxSpeed * amount;
      targetVz = target.z / target.distance * maxSpeed * amount;
    }

    lion.vx = approach(finite(before.vx), targetVx, dt);
    lion.vz = approach(finite(before.vz), targetVz, dt);
    const previous = { x:lion.x, z:lion.z };
    const moved = resolveMovement(lion, previous, lion.vx * dt, lion.vz * dt);
    lion.x = moved.x;
    lion.z = moved.z;
    lion.maxGroundSpeed = maxSpeed;
    lion.visualGroundSpeed = Math.min(maxSpeed, Math.hypot(lion.x - previous.x, lion.z - previous.z) / Math.max(dt, .001));
    setLionFacing(lion, target.x, target.z);
  }

  function lionAttackRange() {
    return finite(LION_ATTACK?.range, 3.45) + ATTACK_START_PADDING;
  }

  function delayedTargetIsAttackable(lion, trailPoint) {
    return trailVector(lion, trailPoint).distance <= lionAttackRange();
  }

  function canStartDelayedAttack(lion, trailPoint) {
    if (!LION_ATTACK || finite(lion.cooldown) > 0 || finite(lion.stunned) > 0) return false;
    if (!delayedTargetIsAttackable(lion, trailPoint)) return false;
    const director = system.director;
    if (!director?.hasApproachPermit?.(lion)) return false;
    return director.canGrant?.(lion, LION_ATTACK, {
      enemies:system.enemies,
      pressureBudget:director.settings?.pressureBudget,
      aggression:system.aggression,
    }) !== false;
  }

  function startDelayedAttack(lion, trailPoint) {
    const target = trailVector(lion, trailPoint);
    setLionFacing(lion, target.x, target.z);
    lion.attack = LION_ATTACK;
    lion.state = 'windup';
    lion.stateTime = 0;
    lion.windup = LION_ATTACK.windup;
    lion.active = LION_ATTACK.active;
    lion.recovery = LION_ATTACK.recovery;
    lion.hitDone = false;
    system.director?.grant?.(lion, LION_ATTACK);
  }

  function cancelWrongTargetAttack(lion) {
    system.director?.release?.(lion);
    lion.state = 'idle';
    lion.stateTime = 0;
    lion.attack = null;
    lion.windup = 0;
    lion.active = 0;
    lion.recovery = 0;
    lion.hitDone = false;
    lion.cooldown = Math.max(finite(lion.cooldown), .12);
  }

  function separateLion(lion, other) {
    let dx = lion.x - other.x;
    let dz = lion.z - other.z;
    let distance = Math.hypot(dx, dz);
    const minimum = enemyCollisionRadius(lion, system) + enemyCollisionRadius(other, system) + .22;
    if (distance >= minimum) return;
    if (distance < 1e-5) {
      const angle = ((finite(lion.id) * 31 + finite(other.id) * 17) % 360) * Math.PI / 180;
      dx = Math.cos(angle);
      dz = Math.sin(angle);
      distance = 1;
    }
    const push = (minimum - distance) / distance;
    lion.x += dx * push;
    lion.z += dz * push;
  }

  function keepLionOffPlayer(lion, player) {
    if (!player) return;
    let dx = lion.x - finite(player.x);
    let dz = lion.z - finite(player.z);
    let distance = Math.hypot(dx, dz);
    const minimum = enemyCollisionRadius(lion, system) + PLAYER_RADIUS;
    if (distance >= minimum) return;
    if (distance < 1e-5) {
      dx = Math.cos(finite(lion.id) * 1.7);
      dz = Math.sin(finite(lion.id) * 1.7);
      distance = 1;
    }
    const push = (minimum - distance) / distance;
    lion.x += dx * push;
    lion.z += dz * push;
  }

  function syncLionRoot(lion) {
    if (!lion.root?.position) return;
    lion.root.position.x = lion.x;
    lion.root.position.z = lion.z;
    if (lion.root.rotation && lion.facing) lion.root.rotation.y = Math.atan2(lion.facing.x, lion.facing.z);
  }

  function runtimeHandle() {
    try { return globalThis.window?.__arena || null; }
    catch { return null; }
  }

  function setRuntimePlayerPosition(x, z) {
    const actorPos = runtimeHandle()?.actorPos;
    if (typeof actorPos?.set === 'function') actorPos.set(x, z);
    else if (actorPos) { actorPos.x = x; actorPos.y = z; }
  }

  function lockPlayerToMaul(maul) {
    if (!maul) return;
    setRuntimePlayerPosition(maul.playerX, maul.playerZ);
    const runtime = runtimeHandle();
    const arena = runtime?.arena;
    const combatState = runtime?.combatState;
    if (arena?.dodge) {
      arena.dodge.t = -1;
      arena.dodge.cool = Math.max(finite(arena.dodge.cool), .16);
    }
    if (arena?.charge) {
      arena.charge.active = false;
      arena.charge.queued = false;
      arena.charge.buttonHeld = false;
      arena.charge.hold = 0;
      arena.charge.forceTier = null;
    }
    if (arena?.chain) {
      arena.chain.inputLockT = Math.max(finite(arena.chain.inputLockT), .14);
      arena.chain.pendingInput = null;
      arena.chain.pendingStage = null;
      arena.chain.pendingSlot = -1;
      arena.chain.pendingExpiresAt = 0;
    }
    if (combatState) {
      combatState.attack = null;
      combatState.t = 0;
      combatState.pending = null;
      combatState.pendingGroup = null;
      combatState.readyLock = Math.max(finite(combatState.readyLock), .14);
      combatState.chargePull = 0;
    }
  }

  function makeStarTexture() {
    if (starTexture || !THREE || typeof document === 'undefined') return starTexture;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d');
    context.translate(32, 32);
    context.beginPath();
    for (let index = 0; index < 10; index++) {
      const angle = -Math.PI / 2 + index * Math.PI / 5;
      const radius = index % 2 === 0 ? 25 : 11;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.fillStyle = '#ffe36e';
    context.strokeStyle = '#8b4e12';
    context.lineWidth = 4;
    context.lineJoin = 'round';
    context.stroke();
    context.fill();
    starTexture = new THREE.CanvasTexture(canvas);
    if ('colorSpace' in starTexture && THREE.SRGBColorSpace) starTexture.colorSpace = THREE.SRGBColorSpace;
    return starTexture;
  }

  function createPlayerStunVisual() {
    if (!THREE || !worldRoot) return null;
    const texture = makeStarTexture();
    if (!texture) return null;
    const group = new THREE.Group();
    group.name = 'Lion maul stun stars (Bing Bong cue)';
    const stars = [];
    for (let index = 0; index < 3; index++) {
      const material = new THREE.SpriteMaterial({
        map:texture,
        color:0xffffff,
        transparent:true,
        depthWrite:false,
        depthTest:false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(.72, .72, 1);
      group.add(sprite);
      stars.push(sprite);
    }
    worldRoot.add(group);
    return { group, stars, phase:Math.random() * Math.PI * 2 };
  }

  function updatePlayerStunVisual(maul, dt) {
    const visual = maul?.stunVisual;
    if (!visual) return;
    visual.phase += Math.max(0, dt) * 4.4;
    const now = elapsed;
    visual.group.position.set(maul.playerX, 4.85, maul.playerZ);
    visual.stars.forEach((star, index) => {
      const angle = visual.phase + index * Math.PI * 2 / visual.stars.length;
      star.position.set(Math.cos(angle) * 1.02, Math.sin(now * 7 + angle) * .13, Math.sin(angle) * 1.02);
      const pulse = .64 + .13 * Math.sin(now * 8 + index * 2.1);
      star.scale.set(pulse, pulse, 1);
      star.material.opacity = .82 + .18 * Math.sin(now * 6 + index);
    });
  }

  function disposePlayerStunVisual(visual) {
    if (!visual) return;
    visual.group?.parent?.remove(visual.group);
    for (const star of visual.stars || []) star.material?.dispose?.();
  }

  function applyBiteDamage(maul, biteIndex) {
    if (!maul || reportedPlayerHp() <= 0) return;
    const damage = Math.min(maul.config.biteDamage, reportedPlayerHp());
    supplementalPlayerDamage += damage;
    manualLastPlayerHit = `lion Maul Bite ${biteIndex + 1} hit for ${damage}`;
    manualLastPlayerHitDir = maul.lion?.facing
      ? { x:maul.lion.facing.x, z:maul.lion.facing.z }
      : { x:maul.direction.x, z:maul.direction.z };
    maul.lastBiteIndex = biteIndex;
    if (maul.lion) {
      maul.lion._lionMaulBiteIndex = biteIndex;
      maul.lion.flash = Math.max(finite(maul.lion.flash), .08);
    }
  }

  function endMaul({ interrupted=false, skipRecovery=false } = {}) {
    const maul = activeMaul;
    if (!maul) return;
    activeMaul = null;
    disposePlayerStunVisual(maul.stunVisual);
    const lion = maul.lion;
    if (!lion) return;
    lion._lionMaulActive = false;
    lion._lionMaulProgress = 0;
    lion._lionMaulBiteIndex = -1;
    lion.collisionScale = maul.collisionScale;
    lion.separationScale = maul.separationScale;
    lion.vx = 0;
    lion.vz = 0;
    lion.knockX = 0;
    lion.knockZ = 0;
    if (lion.hp <= 0 || skipRecovery) return;
    lion.stunned = 0;
    if (interrupted) {
      lion.state = 'idle';
      lion.stateTime = 0;
      lion.attack = null;
      lion.hitDone = false;
      system.director?.releaseAllForEnemy?.(lion);
      return;
    }
    lion.state = 'recovery';
    lion.stateTime = 0;
    lion.attack = LION_ATTACK;
    lion.windup = 0;
    lion.active = 0;
    lion.recovery = maul.config.recovery;
    lion.hitDone = true;
    syncLionRoot(lion);
  }

  function clearMaulRuntime() {
    endMaul({ interrupted:true, skipRecovery:true });
  }

  function startMaul(lion, player) {
    if (activeMaul || !lion || lion.hp <= 0 || reportedPlayerHp() <= 0) return false;
    const runtimePosition = runtimeHandle()?.actorPos;
    const playerX = finite(runtimePosition?.x, finite(player?.x));
    const playerZ = finite(runtimePosition?.y, finite(player?.z));
    let directionX = playerX - lion.x;
    let directionZ = playerZ - lion.z;
    let directionLength = Math.hypot(directionX, directionZ);
    if (directionLength <= 1e-5) {
      directionX = finite(lion.facing?.x, 0);
      directionZ = finite(lion.facing?.z, 1);
      directionLength = Math.hypot(directionX, directionZ) || 1;
    }
    const direction = { x:directionX / directionLength, z:directionZ / directionLength };
    setLionFacing(lion, direction.x, direction.z);
    const sequence = createLionMaulSequence(maulSettings);
    activeMaul = {
      lion,
      sequence,
      config:sequence.config,
      direction,
      playerX,
      playerZ,
      lionX:playerX - direction.x * MAUL_PIN_DISTANCE,
      lionZ:playerZ - direction.z * MAUL_PIN_DISTANCE,
      collisionScale:lion.collisionScale,
      separationScale:lion.separationScale,
      lastBiteIndex:-1,
      stunVisual:createPlayerStunVisual(),
    };
    lion._lionMaulActive = true;
    lion._lionMaulProgress = 0;
    lion._lionMaulBiteIndex = -1;
    lion.collisionScale = MAUL_COLLISION_SCALE;
    lion.separationScale = MAUL_COLLISION_SCALE;
    lion.state = 'idle';
    lion.stateTime = 0;
    lion.attack = LION_ATTACK;
    lion.hitDone = true;
    lion.vx = lion.vz = lion.knockX = lion.knockZ = 0;
    lion.x = activeMaul.lionX;
    lion.z = activeMaul.lionZ;
    system.director?.releaseAllForEnemy?.(lion);
    lockPlayerToMaul(activeMaul);
    updatePlayerStunVisual(activeMaul, 0);
    syncLionRoot(lion);
    return true;
  }

  function prepareMaulBeforeBase(dt) {
    const maul = activeMaul;
    if (!maul) return null;
    const lion = maul.lion;
    if (!lion || lion.hp <= 0 || !system.enemies.includes(lion) || reportedPlayerHp() <= 0) {
      endMaul({ interrupted:true, skipRecovery:true });
      return null;
    }
    const snapshot = maul.sequence.advance(dt);
    lion._lionMaulActive = true;
    lion._lionMaulProgress = snapshot.visualProgress;
    lion._lionMaulBiteIndex = maul.lastBiteIndex;
    lion.state = 'idle';
    lion.stateTime = 0;
    lion.attack = LION_ATTACK;
    lion.hitDone = true;
    lion.stunned = Math.max(finite(lion.stunned), dt + .045);
    lion.collisionScale = MAUL_COLLISION_SCALE;
    lion.separationScale = MAUL_COLLISION_SCALE;
    lion.x = maul.lionX;
    lion.z = maul.lionZ;
    lion.vx = lion.vz = lion.knockX = lion.knockZ = 0;
    setLionFacing(lion, maul.direction.x, maul.direction.z);
    lockPlayerToMaul(maul);
    return {
      ...(lastPlayer || {}),
      x:maul.playerX,
      z:maul.playerZ,
      invulnerable:true,
    };
  }

  function finishMaulAfterBase(dt) {
    const maul = activeMaul;
    if (!maul) return;
    const lion = maul.lion;
    if (!lion || lion.hp <= 0 || !system.enemies.includes(lion)) {
      endMaul({ interrupted:true, skipRecovery:true });
      return;
    }
    lion.x = maul.lionX;
    lion.z = maul.lionZ;
    lion.vx = lion.vz = lion.knockX = lion.knockZ = 0;
    while (true) {
      const biteIndex = maul.sequence.consumeBite();
      if (biteIndex === null) break;
      applyBiteDamage(maul, biteIndex);
    }
    const snapshot = maul.sequence.snapshot();
    lion._lionMaulProgress = snapshot.visualProgress;
    lion._lionMaulBiteIndex = maul.lastBiteIndex;
    lockPlayerToMaul(maul);
    updatePlayerStunVisual(maul, dt);
    syncLionRoot(lion);
    if (reportedPlayerHp() <= 0) {
      endMaul({ skipRecovery:false });
      return;
    }
    if (snapshot.complete) endMaul();
  }

  function pounceHitLion(snapshots, baseHpBefore, baseHpAfter, player) {
    if (activeMaul || baseHpAfter >= baseHpBefore || !/^lion\b/i.test(readBaseLastHit())) return null;
    const candidates = [];
    for (const [lion, before] of snapshots) {
      if (lion.hp <= 0 || before.hitDone || !lion.hitDone) continue;
      if (before.state !== 'active' && lion.state !== 'active' && lion.state !== 'recovery') continue;
      const attack = before.attack || lion.attack;
      if (attack !== LION_ATTACK && attack?.movement !== 'pounce' && lion.attackId !== 'lionPounce') continue;
      candidates.push(lion);
    }
    candidates.sort((a, b) =>
      Math.hypot(a.x - finite(player?.x), a.z - finite(player?.z)) -
      Math.hypot(b.x - finite(player?.x), b.z - finite(player?.z))
    );
    return candidates[0] || null;
  }

  system.update = function updateWithLionTrailAndMaul(dt, player) {
    const frameDt = Math.max(0, finite(dt));
    lastPlayer = player || lastPlayer;
    elapsed += frameDt;
    const recordedPlayer = activeMaul
      ? { x:activeMaul.playerX, z:activeMaul.playerZ }
      : lastPlayer;
    if (recordedPlayer) history.record(elapsed, recordedPlayer);
    const trailPoint = history.sample(elapsed);
    const baseHpBefore = readBasePlayerHp();
    const baseHitBefore = readBaseLastHit();

    const snapshots = new Map();
    for (const enemy of system.enemies) {
      if (enemy?.kind !== 'lion' || enemy.hp <= 0) continue;
      snapshots.set(enemy, {
        x:finite(enemy.x), z:finite(enemy.z), vx:finite(enemy.vx), vz:finite(enemy.vz),
        state:enemy.state, stunned:finite(enemy.stunned), hitDone:!!enemy.hitDone,
        attack:enemy.attack,
        knock:Math.hypot(finite(enemy.knockX), finite(enemy.knockZ)),
      });
    }

    const pinnedPlayer = prepareMaulBeforeBase(frameDt);
    baseUpdate(dt, pinnedPlayer || player);
    const baseHpAfter = readBasePlayerHp();
    if (baseHpAfter < baseHpBefore || readBaseLastHit() !== baseHitBefore) {
      manualLastPlayerHit = '';
      manualLastPlayerHitDir = null;
    }

    if (activeMaul) finishMaulAfterBase(frameDt);
    const landedLion = pounceHitLion(snapshots, baseHpBefore, baseHpAfter, player);
    if (landedLion) startMaul(landedLion, player);
    if (!trailPoint) return;

    const movedLions = [];
    for (const [lion, before] of snapshots) {
      if (lion.hp <= 0 || activeMaul?.lion === lion) continue;

      if (before.state === 'idle' && lion.state === 'windup') {
        if (!delayedTargetIsAttackable(lion, trailPoint)) {
          cancelWrongTargetAttack(lion);
          if (before.stunned <= 0 && before.knock <= .05) {
            moveLionAlongTrail(lion, before, trailPoint, frameDt);
            movedLions.push(lion);
          }
        } else {
          const target = trailVector(lion, trailPoint);
          setLionFacing(lion, target.x, target.z);
          syncLionRoot(lion);
        }
        continue;
      }

      if ((before.state === 'windup' && lion.state === 'windup') ||
          (before.state === 'windup' && lion.state === 'active')) {
        const target = trailVector(lion, trailPoint);
        setLionFacing(lion, target.x, target.z);
        syncLionRoot(lion);
        continue;
      }

      if (before.state !== 'idle' || lion.state !== 'idle') continue;
      if (before.stunned > 0 || finite(lion.stunned) > 0 || before.knock > .05) continue;

      if (canStartDelayedAttack(lion, trailPoint)) {
        startDelayedAttack(lion, trailPoint);
        syncLionRoot(lion);
      } else {
        moveLionAlongTrail(lion, before, trailPoint, frameDt);
        movedLions.push(lion);
      }
    }

    for (const lion of movedLions) {
      const preCorrection = { x:lion.x, z:lion.z };
      for (const other of system.enemies) {
        if (other !== lion && other?.hp > 0) separateLion(lion, other);
      }
      keepLionOffPlayer(lion, lastPlayer);
      if (navigation?.resolveMovement) {
        const corrected = navigation.resolveMovement(
          preCorrection,
          { x:lion.x - preCorrection.x, z:lion.z - preCorrection.z },
          enemyCollisionRadius(lion, system)
        );
        if (Number.isFinite(corrected?.x) && Number.isFinite(corrected?.z)) {
          lion.x = corrected.x;
          lion.z = corrected.z;
        }
      }
      syncLionRoot(lion);
    }
  };

  system.damageEnemy = function damageEnemyWithMaulInterrupt(enemy, amount, knock = { x:0, z:0 }, opts = {}) {
    const maul = activeMaul?.lion === enemy ? activeMaul : null;
    if (maul?.config.interruptOnStagger) endMaul({ interrupted:true });
    const result = baseDamageEnemy(enemy, amount, knock, opts);
    if (activeMaul?.lion === enemy && (result || enemy.hp <= 0)) {
      endMaul({ interrupted:true, skipRecovery:true });
    }
    return result;
  };

  system.setLionMaulPreset = function setLionMaulPreset(id, { persist=true } = {}) {
    const nextId = LION_MAUL_PRESETS[id] ? id : DEFAULT_LION_MAUL_PRESET;
    maulPresetId = nextId;
    maulSettings = lionMaulPreset(nextId);
    if (persist) persistMaulConfiguration();
    syncMaulControls();
    return { presetId:maulPresetId, settings:{ ...maulSettings } };
  };

  system.setLionMaulSettings = function setLionMaulSettings(settings, { presetId='custom', persist=true } = {}) {
    maulSettings = normalizeLionMaulSettings({ ...maulSettings, ...(settings || {}) });
    maulPresetId = LION_MAUL_PRESETS[presetId] ? presetId : 'custom';
    if (persist) persistMaulConfiguration();
    syncMaulControls();
    return { presetId:maulPresetId, settings:{ ...maulSettings } };
  };

  system.setLionMaulSetting = function setLionMaulSetting(key, value, options = {}) {
    if (!Object.hasOwn(maulSettings, key)) return { presetId:maulPresetId, settings:{ ...maulSettings } };
    return system.setLionMaulSettings({ [key]:value }, { ...options, presetId:'custom' });
  };

  function formatControlValue(key, value) {
    if (key === 'biteCount' || key === 'biteDamage') return String(Math.round(value));
    return `${Number(value).toFixed(2)}s`;
  }

  function syncMaulControls() {
    if (!tuningControls) return;
    tuningControls.preset.value = maulPresetId;
    for (const [key, entry] of Object.entries(tuningControls.ranges)) {
      entry.input.value = maulSettings[key];
      entry.value.textContent = formatControlValue(key, maulSettings[key]);
    }
    tuningControls.interrupt.checked = maulSettings.interruptOnStagger;
    const totalBiteDamage = maulSettings.biteCount * maulSettings.biteDamage;
    tuningControls.note.textContent = `${maulSettings.biteCount} bites · ${totalBiteDamage} follow-up damage · pounce damage remains separate`;
  }

  function installLionMaulTuningControl() {
    if (typeof document === 'undefined') return;
    const dirTab = document.getElementById('dirTab');
    const resetButton = document.getElementById('resetBtn');
    if (!dirTab || !resetButton || document.getElementById('lionMaulTuningHeader')) return;

    const header = document.createElement('button');
    header.type = 'button';
    header.id = 'lionMaulTuningHeader';
    header.className = 'ptitle';

    const body = document.createElement('div');
    body.id = 'body-lionMaulTuning';
    body.className = 'sbody';

    const selectRow = document.createElement('div');
    selectRow.className = 'selectRow';
    const selectLabel = document.createElement('label');
    selectLabel.htmlFor = 'lionMaulPresetSelect';
    selectLabel.textContent = 'MAUL VARIATION';
    const preset = document.createElement('select');
    preset.id = 'lionMaulPresetSelect';
    preset.setAttribute('aria-label', 'Lion maul variation');
    for (const config of Object.values(LION_MAUL_PRESETS)) {
      const option = document.createElement('option');
      option.value = config.id;
      option.textContent = config.label;
      preset.appendChild(option);
    }
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Custom (sliders)';
    preset.appendChild(customOption);
    preset.addEventListener('change', () => {
      if (preset.value === 'custom') return;
      system.setLionMaulPreset(preset.value);
    });
    selectRow.append(selectLabel, preset);
    body.appendChild(selectRow);

    const ranges = {};
    const rangeDefinitions = [
      ['biteCount', 'BITE COUNT', 1, 6, 1],
      ['biteDamage', 'DAMAGE PER BITE', 1, 20, 1],
      ['biteInterval', 'BITE INTERVAL', .12, .7, .01],
      ['firstBiteDelay', 'FIRST BITE DELAY', .08, .65, .01],
      ['stunDuration', 'STUN / PIN TIME', .35, 3, .05],
      ['recovery', 'LION RECOVERY', .2, 2.5, .05],
    ];
    for (const [key, labelText, min, max, step] of rangeDefinitions) {
      const row = document.createElement('div');
      row.className = 'srow';
      const label = document.createElement('div');
      label.className = 'slabel';
      label.textContent = `${labelText} `;
      const value = document.createElement('span');
      value.className = 'sval';
      label.appendChild(value);
      const input = document.createElement('input');
      input.type = 'range';
      input.min = min;
      input.max = max;
      input.step = step;
      input.setAttribute('aria-label', `Lion ${labelText.toLowerCase()}`);
      input.addEventListener('input', () => system.setLionMaulSetting(key, Number(input.value)));
      row.append(label, input);
      body.appendChild(row);
      ranges[key] = { input, value };
    }

    const interruptRow = document.createElement('div');
    interruptRow.className = 'srow';
    const interruptLabel = document.createElement('label');
    interruptLabel.className = 'slabel';
    interruptLabel.htmlFor = 'lionMaulInterrupt';
    interruptLabel.textContent = 'STAGGER BREAKS MAUL';
    const interrupt = document.createElement('input');
    interrupt.type = 'checkbox';
    interrupt.id = 'lionMaulInterrupt';
    interrupt.setAttribute('aria-label', 'Stagger breaks lion maul');
    interrupt.addEventListener('change', () => system.setLionMaulSetting('interruptOnStagger', interrupt.checked));
    interruptRow.append(interruptLabel, interrupt);
    body.appendChild(interruptRow);

    const note = document.createElement('div');
    note.className = 'ptitle';
    note.style.marginTop = '-10px';
    note.style.lineHeight = '1.45';
    body.appendChild(note);

    dirTab.insertBefore(header, resetButton);
    dirTab.insertBefore(body, resetButton);
    tuningControls = { preset, ranges, interrupt, note };

    let collapsed = !!StoneSettings.get(MAUL_SECTION_SETTING, false);
    const applyCollapsed = () => {
      body.style.display = collapsed ? 'none' : 'block';
      header.textContent = `${collapsed ? '▸' : '▾'} LION POUNCE + MAUL`;
    };
    header.addEventListener('click', () => {
      collapsed = !collapsed;
      StoneSettings.set(MAUL_SECTION_SETTING, collapsed);
      applyCollapsed();
    });
    applyCollapsed();
    syncMaulControls();
  }

  if (baseReset) {
    system.reset = function resetWithLionRuntime() {
      clearMaulRuntime();
      supplementalPlayerDamage = 0;
      manualLastPlayerHit = '';
      manualLastPlayerHitDir = null;
      resetTrail();
      return baseReset();
    };
  }

  if (baseStartRoomEncounter) {
    system.startRoomEncounter = function startRoomEncounterWithLionRuntime(roomId) {
      clearMaulRuntime();
      resetTrail();
      return baseStartRoomEncounter(roomId);
    };
  }

  if (baseClearRoomRuntime) {
    system.clearRoomRuntime = function clearRoomRuntimeWithLionRuntime() {
      clearMaulRuntime();
      resetTrail();
      return baseClearRoomRuntime();
    };
  }

  Object.defineProperties(system, {
    playerHp:{ configurable:true, enumerable:true, get:reportedPlayerHp },
    lastPlayerHit:{
      configurable:true,
      enumerable:true,
      get:() => manualLastPlayerHit || readBaseLastHit(),
    },
    lastPlayerHitDir:{
      configurable:true,
      enumerable:true,
      get:() => manualLastPlayerHitDir || readBaseLastHitDir() || null,
    },
    playerActionLocked:{
      configurable:true,
      enumerable:true,
      get:() => !!activeMaul,
    },
    playerMoveScale:{
      configurable:true,
      enumerable:true,
      get:() => activeMaul ? 0 : 1,
    },
    lionTrailDelaySeconds:{
      configurable:true,
      enumerable:true,
      get:() => LION_TRAIL_DELAY,
    },
    lionMaulPresetId:{
      configurable:true,
      enumerable:true,
      get:() => maulPresetId,
    },
    lionMaulSettings:{
      configurable:true,
      enumerable:true,
      get:() => ({ ...maulSettings }),
    },
    lionMaulActive:{
      configurable:true,
      enumerable:true,
      get:() => !!activeMaul,
    },
  });

  installLionMaulTuningControl();
  setArenaEnemySource(system);
  return system;
}
