import * as THREE from 'three';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { installPlayerCombat } from '../../../src/player-combat-core.js';
import { cloneWeaponDefinitions, STONE_WEAPON_ORDER } from '../../../src/weapons.js';
import {
  attackSpecAt,
  chooseCombatFacing,
  wardenPoseDelta,
} from './ecctrl-warden-pose.js';

export const ECCTRL_WEAPON_IDS = Object.freeze([...STONE_WEAPON_ORDER]);

function createCombatMaterials() {
  return {
    matCoat: new THREE.MeshStandardMaterial({ color: 0x26383a, roughness: 0.92, flatShading: true }),
    matIron: new THREE.MeshStandardMaterial({ color: 0x373c3c, roughness: 0.42, metalness: 0.68, flatShading: true }),
    matBronze: new THREE.MeshStandardMaterial({ color: 0xb57a35, roughness: 0.35, metalness: 0.82 }),
    matLeather: new THREE.MeshStandardMaterial({ color: 0x33251b, roughness: 0.9 }),
    matSilver: new THREE.MeshStandardMaterial({ color: 0xcad7d4, roughness: 0.28, metalness: 0.74, flatShading: true }),
    matGlow: new THREE.MeshStandardMaterial({ color: 0xffb061, emissive: 0xff7a26, emissiveIntensity: 1.4, roughness: 0.4 }),
  };
}

function facet(geometry, amount = 0) {
  const position = geometry?.attributes?.position;
  if (!position || amount <= 0) return geometry;
  for (let index = 0; index < position.count; index += 1) {
    const seed = Math.sin((index + 1) * 91.73) * amount;
    position.setXYZ(
      index,
      position.getX(index) + seed * 0.45,
      position.getY(index) + seed * 0.25,
      position.getZ(index) - seed * 0.35,
    );
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function applyRotationOffset(bone, x, y, z, euler, quaternion) {
  if (!bone) return;
  euler.set(x, y, z, 'XYZ');
  quaternion.setFromEuler(euler);
  bone.quaternion.multiply(quaternion);
}

export function createEcctrlSkeletonPoseApplier(nodes) {
  const bones = {
    hips: nodes['DEF-hips'],
    spine1: nodes['DEF-spine.001'],
    spine2: nodes['DEF-spine.002'],
    spine3: nodes['DEF-spine.003'],
    neck: nodes['DEF-neck'],
    head: nodes['DEF-head'],
  };
  const euler = new THREE.Euler();
  const quaternion = new THREE.Quaternion();

  return ({ pose, idle, state }) => {
    if (!state?.attack) return;
    const delta = wardenPoseDelta(pose, idle);

    if (bones.hips) {
      bones.hips.position.x += delta.hipX * 0.16;
      bones.hips.position.y -= delta.lower * 0.18;
      bones.hips.position.z += delta.lunge * 0.42 + delta.hipZ * 0.1;
    }
    applyRotationOffset(bones.hips, delta.pitch * 0.04, delta.hipTwist * 0.12, delta.lean * 0.04, euler, quaternion);
    applyRotationOffset(bones.spine1, delta.pitch * 0.08, delta.twist * 0.10, delta.lean * 0.09, euler, quaternion);
    applyRotationOffset(bones.spine2, delta.pitch * 0.10, delta.twist * 0.14, delta.lean * 0.13, euler, quaternion);
    applyRotationOffset(bones.spine3, delta.pitch * 0.10, delta.twist * 0.14, delta.lean * 0.12, euler, quaternion);
    applyRotationOffset(bones.neck, delta.headY * 0.11, delta.headX * 0.14, 0, euler, quaternion);
    applyRotationOffset(bones.head, delta.headY * 0.17, delta.headX * 0.22, 0, euler, quaternion);
  };
}

export function EcctrlWardenCombat({
  active,
  character,
  combatApi,
  poseOverlay,
  mountHeight,
  weaponScale,
  weaponId,
  onCombatStatus,
}) {
  const mount = useRef(null);
  const driver = useRef(null);
  const controller = useRef(null);
  const statusCallback = useRef(onCombatStatus);
  const scaleValue = useRef(weaponScale);
  const weaponValue = useRef(weaponId);
  const attackCursor = useRef(0);
  const pendingFacing = useRef(null);
  const direction = useRef(new THREE.Vector3(0, 0, 1));
  const cameraForward = useRef(new THREE.Vector3());
  const cameraRight = useRef(new THREE.Vector3());
  const yaw = useRef(new THREE.Quaternion());
  const { camera, scene } = useThree();

  useEffect(() => { statusCallback.current = onCombatStatus; }, [onCombatStatus]);
  useEffect(() => { scaleValue.current = weaponScale; }, [weaponScale]);
  useEffect(() => { weaponValue.current = weaponId; }, [weaponId]);

  useLayoutEffect(() => {
    if (!mount.current || !driver.current) return undefined;
    const WEAPONS = cloneWeaponDefinitions();
    const materials = createCombatMaterials();

    const worldDirectionFor = aimStick => {
      const handle = character.current;
      let aim = null;
      if (aimStick && Math.hypot(Number(aimStick.x) || 0, Number(aimStick.y) || 0) > 0.12) {
        camera.getWorldDirection(cameraForward.current);
        cameraForward.current.y = 0;
        if (cameraForward.current.lengthSq() < 1e-6) cameraForward.current.set(0, 0, -1);
        cameraForward.current.normalize();
        cameraRight.current.setFromMatrixColumn(camera.matrixWorld, 0);
        cameraRight.current.y = 0;
        cameraRight.current.normalize();
        direction.current
          .copy(cameraRight.current).multiplyScalar(Number(aimStick.x) || 0)
          .addScaledVector(cameraForward.current, Number(aimStick.y) || 0);
        aim = direction.current;
      }
      return chooseCombatFacing({
        aim,
        move: handle?.inputDir,
        forward: handle?.bodyZAxis,
      });
    };

    const PC = installPlayerCombat({
      THREE,
      scene,
      get WEAPONS() { return WEAPONS; },
      get WEAPON_ORDER() { return ECCTRL_WEAPON_IDS; },
      materials,
      facet,
      get activeModel() { return driver.current; },
      get actorVisual() { return mount.current; },
      get W() { return null; },
      get yawQ() { return yaw.current; },
      getGroundHeight() { return 0; },
      hooks: {
        resolveAttackFacing() {
          const facing = pendingFacing.current || worldDirectionFor(null);
          pendingFacing.current = null;
          return { angle: Math.atan2(facing.x, facing.z) };
        },
        commitFacing(angle) {
          const handle = character.current;
          direction.current.set(Math.sin(angle), 0, Math.cos(angle));
          handle?.setFacingOverride(direction.current);
          yaw.current.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        },
        onAttackStart(info) {
          statusCallback.current?.({ phase: 'ATTACK', label: info.label, group: info.group });
        },
        onAttackComplete() {
          statusCallback.current?.({ phase: 'RECOVERY', label: 'RECOVERY' });
        },
        onAttackChainIdle() {
          character.current?.setFacingOverride(null);
          statusCallback.current?.({ phase: 'READY', label: 'READY' });
        },
        onPoseSample(payload) {
          poseOverlay.current = payload;
        },
        detectHits() {},
        onWeaponSelected() {},
        onWeaponUISync() {},
      },
    });

    PC.combatState.hideArms = true;
    PC.combatState.floorBlend = 0;
    PC.combatState.puppetScale = scaleValue.current;
    PC.attachCombatToActiveModel();
    PC.selectCombatWeapon(weaponValue.current);
    controller.current = PC;

    const api = {
      triggerAttack({ aimStick } = {}) {
        const spec = attackSpecAt(attackCursor.current);
        attackCursor.current += 1;
        pendingFacing.current = worldDirectionFor(aimStick);
        PC.triggerCombatAttack(spec.key);
        return spec;
      },
      getSnapshot() {
        return {
          attack: PC.combatState.attackKey,
          group: PC.combatState.attackGroup,
          weapon: PC.combatState.weapon,
          lockedFacing: Boolean(PC.combatState.attack),
        };
      },
    };
    combatApi.current = api;
    statusCallback.current?.({ phase: 'READY', label: 'READY' });

    return () => {
      if (combatApi.current === api) combatApi.current = null;
      poseOverlay.current = null;
      character.current?.setFacingOverride(null);
      PC.disposeCombat();
      Object.values(materials).forEach(material => material.dispose());
      controller.current = null;
    };
  }, [camera, character, combatApi, poseOverlay, scene]);

  useEffect(() => {
    const PC = controller.current;
    if (!PC) return;
    PC.combatState.puppetScale = weaponScale;
  }, [weaponScale]);

  useEffect(() => {
    const PC = controller.current;
    if (!PC) return;
    PC.selectCombatWeapon(weaponId);
    statusCallback.current?.({ phase: 'READY', label: 'READY', weapon: weaponId });
  }, [weaponId]);

  useEffect(() => {
    if (!active) character.current?.setFacingOverride(null);
  }, [active, character]);

  useFrame(({ clock }, delta) => {
    if (!active || !controller.current) return;
    const frameDelta = Math.min(0.05, Math.max(0, delta));
    controller.current.updateCombat(frameDelta, clock.elapsedTime, 0, frameDelta);
  });

  return (
    <group ref={mount} position={[0, mountHeight, 0]}>
      <group ref={driver} />
    </group>
  );
}
