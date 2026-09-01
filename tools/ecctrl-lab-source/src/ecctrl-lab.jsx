import * as THREE from 'three';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier';
import {
  Ecctrl,
  EcctrlAnimationStateController,
  useEcctrlAnimationStore,
} from '../vendor/ecctrl/index.ts';
import { TimeControl } from '../vendor/ecctrl/time.ts';
import {
  RUN_ANIMATION_THRESHOLD,
  readEcctrlGamepad,
} from './ecctrl-input.js';
import {
  EcctrlWardenCombat,
  ECCTRL_WEAPON_IDS,
  createEcctrlSkeletonPoseApplier,
} from './ecctrl-warden-combat.jsx';

const MODEL_URL = new URL('./media/ecctrl/AnimationLibrary.glb', document.baseURI).href;
const CAMERA_OFFSET = new THREE.Vector3(0, 20, 17.6);
const CAMERA_TARGET_HEIGHT = 0.45;
const CHAMBER_APOTHEM = 9.5;
const CHAMBER_SIDE = CHAMBER_APOTHEM * 2 * Math.tan(Math.PI / 6);
const CHAMBER_RADIUS = CHAMBER_APOTHEM / Math.cos(Math.PI / 6);

const ANIMATION_FOR_STATE = Object.freeze({
  IDLE: 'Idle_Loop',
  WALK: 'Walk_Loop',
  RUN: 'Jog_Fwd_Loop',
  JUMP_START: 'Jump_Start',
  JUMP_IDLE: 'Jump_Loop',
  JUMP_FALL: 'Jump_Loop',
  JUMP_LAND: 'Jump_Land',
});

function readGamepad() {
  if (typeof navigator.getGamepads !== 'function') return null;
  const gamepad = Array.from(navigator.getGamepads()).find(Boolean);
  return readEcctrlGamepad(gamepad);
}

function useKeyboard(active) {
  const keys = useRef(new Set());

  useEffect(() => {
    const controlledCodes = new Set([
      'KeyW', 'KeyA', 'KeyS', 'KeyD',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Space', 'ShiftLeft', 'ShiftRight', 'KeyJ', 'KeyR',
    ]);
    const onKeyDown = event => {
      if (!active) return;
      if (controlledCodes.has(event.code)) event.preventDefault();
      keys.current.add(event.code);
    };
    const onKeyUp = event => {
      if (controlledCodes.has(event.code) && active) event.preventDefault();
      keys.current.delete(event.code);
    };
    addEventListener('keydown', onKeyDown, { passive: false });
    addEventListener('keyup', onKeyUp, { passive: false });
    return () => {
      removeEventListener('keydown', onKeyDown);
      removeEventListener('keyup', onKeyUp);
      keys.current.clear();
    };
  }, [active]);

  useEffect(() => {
    if (!active) keys.current.clear();
  }, [active]);

  return keys;
}

function AnimatedCharacterModel({
  active,
  character,
  combatApi,
  mountHeight,
  weaponScale,
  weaponId,
  onReady,
  onCombatStatus,
}) {
  const previousActionName = useRef('Idle_Loop');
  const initialActionStarted = useRef(false);
  const [canPlayNext, setCanPlayNext] = useState(true);
  const { nodes, materials, animations } = useGLTF(MODEL_URL);
  const { ref, actions, mixer } = useAnimations(animations);
  const animationState = useEcctrlAnimationStore(state => state.animationState);
  const combatPoseOverlay = useRef(null);
  const lastCombatRenderFrame = useRef(-1);
  const applyCombatPose = useMemo(() => createEcctrlSkeletonPoseApplier(nodes), [nodes]);
  const applyCombatBeforeRender = useCallback(renderer => {
    const renderFrame = renderer.info.render.frame;
    if (lastCombatRenderFrame.current === renderFrame) return;
    lastCombatRenderFrame.current = renderFrame;
    applyCombatPose(combatPoseOverlay.current);
    nodes.root.updateMatrixWorld(true);
    nodes.Mannequin_1.skeleton.update();
    nodes.Mannequin_2.skeleton.update();
  }, [applyCombatPose, nodes]);

  useEffect(() => {
    materials.M_Joints.side = THREE.FrontSide;
    materials.M_Joints.color.set(0x00ffff);
    materials.M_Main.side = THREE.FrontSide;
    materials.M_Main.color.set(0xdedede);
    onReady?.();
  }, [materials, onReady]);

  useEffect(() => {
    const idle = actions.Idle_Loop;
    if (!idle || initialActionStarted.current) return;
    idle.reset().play();
    initialActionStarted.current = true;
  }, [actions]);

  useEffect(() => {
    const nextActionName = ANIMATION_FOR_STATE[animationState];
    const nextAction = actions[nextActionName];
    if (!nextAction) return;

    const previousName = previousActionName.current;
    const previousAction = actions[previousName];
    if (nextActionName !== previousName && canPlayNext) {
      const isOneShot = nextActionName === ANIMATION_FOR_STATE.JUMP_START
        || nextActionName === ANIMATION_FOR_STATE.JUMP_LAND;
      if (isOneShot) {
        setCanPlayNext(false);
        nextAction.timeScale = 1.6;
        nextAction.reset();
        if (previousAction) nextAction.crossFadeFrom(previousAction, 0.1);
        nextAction.setLoop(THREE.LoopOnce, 1).play();
        nextAction.clampWhenFinished = true;
      } else {
        setCanPlayNext(true);
        nextAction.timeScale = 1;
        nextAction.reset();
        if (previousAction) nextAction.crossFadeFrom(previousAction, 0.2);
        nextAction.play();
      }
      previousActionName.current = nextActionName;
    }

    if (!canPlayNext && previousName === ANIMATION_FOR_STATE.JUMP_START
      && animationState !== 'JUMP_IDLE' && animationState !== 'JUMP_START') {
      setCanPlayNext(true);
    }
    if (!canPlayNext && previousName === ANIMATION_FOR_STATE.JUMP_LAND
      && animationState !== 'IDLE' && animationState !== 'JUMP_LAND') {
      setCanPlayNext(true);
    }
  }, [actions, animationState, canPlayNext]);

  useEffect(() => {
    const onFinished = event => {
      const clipName = event.action?._clip?.name;
      if (clipName === ANIMATION_FOR_STATE.JUMP_START || clipName === ANIMATION_FOR_STATE.JUMP_LAND) {
        setCanPlayNext(true);
      }
    };
    mixer.addEventListener('finished', onFinished);
    return () => mixer.removeEventListener('finished', onFinished);
  }, [mixer]);

  return (
    <group ref={ref} dispose={null} position={[0, -0.95, 0]}>
      <group name="Mannequin">
        <skinnedMesh
          name="Mannequin_1"
          geometry={nodes.Mannequin_1.geometry}
          material={materials.M_Main}
          skeleton={nodes.Mannequin_1.skeleton}
          castShadow
          receiveShadow
          onBeforeRender={applyCombatBeforeRender}
        />
        <skinnedMesh
          name="Mannequin_2"
          geometry={nodes.Mannequin_2.geometry}
          material={materials.M_Joints}
          skeleton={nodes.Mannequin_2.skeleton}
          castShadow
          receiveShadow
          onBeforeRender={applyCombatBeforeRender}
        />
      </group>
      <primitive object={nodes.root} />
      <EcctrlWardenCombat
        active={active}
        character={character}
        combatApi={combatApi}
        poseOverlay={combatPoseOverlay}
        mountHeight={mountHeight}
        weaponScale={weaponScale}
        weaponId={weaponId}
        onCombatStatus={onCombatStatus}
      />
    </group>
  );
}

function TopDownCamera({ character }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, CAMERA_TARGET_HEIGHT, 0));
  const desired = useMemo(() => new THREE.Vector3(), []);

  useFrame((_state, delta) => {
    const handle = character.current;
    if (handle?.body) {
      const position = handle.currPos;
      const follow = 1 - Math.exp(-9 * Math.min(delta, 0.05));
      target.current.lerp(
        desired.set(position.x, position.y + CAMERA_TARGET_HEIGHT, position.z),
        follow,
      );
    }
    camera.position.copy(target.current).add(CAMERA_OFFSET);
    camera.up.set(0, 1, 0);
    camera.lookAt(target.current);
    camera.updateMatrixWorld();
  }, -1);

  return null;
}

function EcctrlCharacter({
  active,
  touchInput,
  combatApi,
  mountHeight,
  weaponScale,
  weaponId,
  onCharacterReady,
  onInputChange,
  onCombatStatus,
}) {
  const character = useRef(null);
  const keyboard = useKeyboard(active);
  const previousFullscreen = useRef(false);
  const previousAttack = useRef(false);
  const previousTouchAttackSerial = useRef(0);
  const previousInputKind = useRef('KEYBOARD');
  const respawnRequested = useRef(false);

  useEffect(() => {
    if (!active) {
      character.current?.setMovement({
        forward: false,
        backward: false,
        leftward: false,
        rightward: false,
        joystick: { x: 0, y: 0 },
        run: false,
        jump: false,
      });
      previousAttack.current = false;
      previousTouchAttackSerial.current = touchInput.current.attackSerial || 0;
    }
  }, [active, touchInput]);

  useFrame(() => {
    const handle = character.current;
    if (!active || !handle?.body) return;

    const keys = keyboard.current;
    const gamepadState = readGamepad();
    const touch = touchInput.current;
    const touchAttack = touch.attackSerial !== previousTouchAttackSerial.current;
    const hasTouchMovement = Math.hypot(touch.x, touch.y) > 0.0001;
    const inputKind = gamepadState ? 'GAMEPAD' : hasTouchMovement || touch.jump || touchAttack ? 'TOUCH' : 'KEYBOARD';
    if (inputKind !== previousInputKind.current) {
      previousInputKind.current = inputKind;
      onInputChange?.(inputKind);
    }

    const analog = gamepadState?.stick || (hasTouchMovement ? { x: touch.x, y: touch.y } : { x: 0, y: 0 });
    const analogMagnitude = Math.hypot(analog.x, analog.y);
    handle.setMovement({
      forward: keys.has('KeyW') || keys.has('ArrowUp'),
      backward: keys.has('KeyS') || keys.has('ArrowDown'),
      leftward: keys.has('KeyA') || keys.has('ArrowLeft'),
      rightward: keys.has('KeyD') || keys.has('ArrowRight'),
      joystick: analog,
      run: Boolean(gamepadState?.run || (hasTouchMovement && analogMagnitude >= RUN_ANIMATION_THRESHOLD)
        || keys.has('ShiftLeft') || keys.has('ShiftRight')),
      jump: Boolean(gamepadState?.jump || touch.jump || keys.has('Space')),
    });

    const attackPressed = Boolean(gamepadState?.attack || keys.has('KeyJ'));
    if (touchAttack || (attackPressed && !previousAttack.current)) {
      combatApi.current?.triggerAttack({ aimStick: gamepadState?.aimStick });
    }
    previousAttack.current = attackPressed;
    previousTouchAttackSerial.current = touch.attackSerial;

    const fullscreenPressed = Boolean(gamepadState?.fullscreen);
    if (fullscreenPressed && !previousFullscreen.current) {
      const fullscreenAction = document.fullscreenElement
        ? document.exitFullscreen?.()
        : document.documentElement.requestFullscreen?.();
      fullscreenAction?.catch?.(() => {});
    }
    previousFullscreen.current = fullscreenPressed;

    const resetPressed = keys.has('KeyR');
    if ((resetPressed && !respawnRequested.current) || handle.currPos.y < -6) {
      handle.body.setTranslation({ x: 0, y: 2, z: 0 }, true);
      handle.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      handle.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
    respawnRequested.current = resetPressed;
  });

  return (
    <>
      <TopDownCamera character={character} />
      <Ecctrl
        ref={character}
        enable={active}
        position={[0, 2, 0]}
        density={200}
        canSleep
        capsuleHalfHeight={0.3}
        capsuleRadius={0.3}
        maxWalkVel={1.1}
        maxRunVel={5.5}
        accDeltaTime={0.2}
        decDeltaTime={0.2}
        rejectVelFactor={1}
        moveImpulsePointOffset={0}
        jumpVel={6}
        jumpDuration={0.1}
        slopeJumpFactor={0}
        airDragFactor={0.1}
        slideGripFactor={0.5}
        fallingGravityScale={3}
        fallingMaxVel={20}
        enableToggleRun
        enableCustomGravity
        gravityDirLerpSpeed={6}
        groundDetection="shapeCast"
        slopeMaxAngle={1}
        floatHeight={0.3}
        rayOriginOffest={-0.35}
        rayHitForgiveness={0.3}
        rayLength={1.3}
        rayRadius={0.15}
        springK={6400}
        dampingC={860}
        autoBalance
        autoBalanceSpringK={50}
        autoBalanceDampingC={3}
        autoBalanceSpringOnY={8}
        autoBalanceDampingOnY={0.76}
      >
        <EcctrlAnimationStateController ecctrl={character} enabled={active} />
        <AnimatedCharacterModel
          active={active}
          character={character}
          combatApi={combatApi}
          mountHeight={mountHeight}
          weaponScale={weaponScale}
          weaponId={weaponId}
          onReady={onCharacterReady}
          onCombatStatus={onCombatStatus}
        />
      </Ecctrl>
    </>
  );
}

function ChamberWall({ index }) {
  const angle = index * Math.PI / 3;
  const position = [
    Math.sin(angle) * CHAMBER_APOTHEM,
    1.25,
    Math.cos(angle) * CHAMBER_APOTHEM,
  ];
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, angle, 0]}>
      <CuboidCollider args={[CHAMBER_SIDE / 2, 1.5, 0.28]} friction={0.8} />
      <mesh castShadow receiveShadow>
        <boxGeometry args={[CHAMBER_SIDE, 3, 0.56]} />
        <meshStandardMaterial color="#18383a" roughness={0.82} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.15, -0.291]}>
        <planeGeometry args={[CHAMBER_SIDE - 0.5, 2.25]} />
        <meshBasicMaterial color="#315f5c" transparent opacity={0.2} />
      </mesh>
    </RigidBody>
  );
}

function Chamber() {
  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[13, 0.25, 13]} position={[0, -0.25, 0]} friction={1} />
        <mesh position={[0, -0.22, 0]} receiveShadow>
          <cylinderGeometry args={[CHAMBER_RADIUS, CHAMBER_RADIUS, 0.4, 6]} />
          <meshStandardMaterial color="#102729" roughness={0.92} metalness={0.03} />
        </mesh>
      </RigidBody>
      <gridHelper
        args={[CHAMBER_RADIUS * 1.65, 18, 0x315f5c, 0x1b3a3a]}
        position={[0, 0.012, 0]}
      />
      {Array.from({ length: 6 }, (_, index) => <ChamberWall key={index} index={index} />)}
    </>
  );
}

function LabScene({
  active,
  touchInput,
  combatApi,
  mountHeight,
  weaponScale,
  weaponId,
  onCharacterReady,
  onInputChange,
  onCombatStatus,
}) {
  return (
    <>
      <color attach="background" args={['#071113']} />
      <fog attach="fog" args={['#071113', 18, 42]} />
      <hemisphereLight args={['#9fd2c9', '#071113', 1.7]} />
      <directionalLight
        castShadow
        color="#ffe0ad"
        intensity={2.3}
        position={[7, 15, 10]}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <Physics paused gravity={[0, 0, 0]} timeStep="vary">
        <TimeControl paused={!active} />
        <Chamber />
        <EcctrlCharacter
          active={active}
          touchInput={touchInput}
          combatApi={combatApi}
          mountHeight={mountHeight}
          weaponScale={weaponScale}
          weaponId={weaponId}
          onCharacterReady={onCharacterReady}
          onInputChange={onInputChange}
          onCombatStatus={onCombatStatus}
        />
      </Physics>
    </>
  );
}

function TouchControls({ input, active }) {
  const stickElement = useRef(null);
  const pointerId = useRef(null);

  const updateStick = useCallback(event => {
    const element = stickElement.current;
    if (!element || pointerId.current !== event.pointerId) return;
    const bounds = element.getBoundingClientRect();
    const radius = bounds.width * 0.36;
    let x = (event.clientX - (bounds.left + bounds.width / 2)) / radius;
    let y = -((event.clientY - (bounds.top + bounds.height / 2)) / radius);
    const magnitude = Math.hypot(x, y);
    if (magnitude > 1) {
      x /= magnitude;
      y /= magnitude;
    }
    input.current.x = x;
    input.current.y = y;
    element.style.setProperty('--stick-x', `${x * radius}px`);
    element.style.setProperty('--stick-y', `${-y * radius}px`);
  }, [input]);

  const releaseStick = useCallback(event => {
    if (pointerId.current !== event.pointerId) return;
    pointerId.current = null;
    input.current.x = 0;
    input.current.y = 0;
    stickElement.current?.style.setProperty('--stick-x', '0px');
    stickElement.current?.style.setProperty('--stick-y', '0px');
  }, [input]);

  useEffect(() => {
    if (active) return;
    pointerId.current = null;
    input.current.x = 0;
    input.current.y = 0;
    input.current.jump = false;
  }, [active, input]);

  return (
    <div className="ecctrl-touch-controls" aria-label="Touch movement controls">
      <div
        ref={stickElement}
        className="ecctrl-touch-stick"
        role="application"
        aria-label="Move"
        onPointerDown={event => {
          pointerId.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          updateStick(event);
        }}
        onPointerMove={updateStick}
        onPointerUp={releaseStick}
        onPointerCancel={releaseStick}
      >
        <span />
      </div>
      <button
        type="button"
        className="ecctrl-jump-button"
        aria-label="Jump"
        onPointerDown={event => {
          event.currentTarget.setPointerCapture(event.pointerId);
          input.current.jump = true;
        }}
        onPointerUp={() => { input.current.jump = false; }}
        onPointerCancel={() => { input.current.jump = false; }}
      >
        <strong>×</strong>
        <small>JUMP</small>
      </button>
      <button
        type="button"
        className="ecctrl-attack-button"
        aria-label="Attack"
        onPointerDown={event => {
          event.preventDefault();
          input.current.attackSerial += 1;
        }}
      >
        <strong>□</strong>
        <small>ATTACK</small>
      </button>
    </div>
  );
}

function WeaponTuner({ weaponId, mountHeight, weaponScale, onWeaponCycle, onHeightChange, onScaleChange }) {
  return (
    <div className="ecctrl-weapon-tuner">
      <button type="button" onClick={onWeaponCycle}>
        <span>WEAPON</span>
        <strong>{weaponId.toUpperCase()}</strong>
      </button>
      <label>
        <span>ATTACH Y <output>{mountHeight.toFixed(2)}</output></span>
        <input
          type="range"
          min="-1.25"
          max="1.25"
          step="0.05"
          value={mountHeight}
          onChange={event => onHeightChange(Number(event.target.value))}
        />
      </label>
      <label>
        <span>WEAPON SCALE <output>{weaponScale.toFixed(2)}</output></span>
        <input
          type="range"
          min="0.65"
          max="1.75"
          step="0.05"
          value={weaponScale}
          onChange={event => onScaleChange(Number(event.target.value))}
        />
      </label>
    </div>
  );
}

function LoadingCharacter() {
  return (
    <div className="ecctrl-loading" role="status">
      <strong>ECCTRL</strong>
      <span>Loading mannequin + animation library…</span>
    </div>
  );
}

export function EcctrlLab({ active, onCharacterReady, onInputChange }) {
  const touchInput = useRef({ x: 0, y: 0, jump: false, attackSerial: 0 });
  const combatApi = useRef(null);
  const [ready, setReady] = useState(false);
  const [inputKind, setInputKind] = useState('KEYBOARD');
  const [combatStatus, setCombatStatus] = useState({ phase: 'READY', label: 'READY' });
  const [mountHeight, setMountHeight] = useState(0);
  const [weaponScale, setWeaponScale] = useState(1);
  const [weaponIndex, setWeaponIndex] = useState(0);
  const weaponId = ECCTRL_WEAPON_IDS[weaponIndex % ECCTRL_WEAPON_IDS.length];
  const reportReady = useCallback(() => {
    setReady(true);
    onCharacterReady?.();
  }, [onCharacterReady]);
  const reportInput = useCallback(kind => {
    setInputKind(kind);
    onInputChange?.(kind);
  }, [onInputChange]);
  const reportCombat = useCallback(status => {
    setCombatStatus(previous => ({ ...previous, ...status }));
  }, []);
  const cycleWeapon = useCallback(() => {
    setWeaponIndex(index => (index + 1) % ECCTRL_WEAPON_IDS.length);
  }, []);

  return (
    <div className="ecctrl-lab" data-active={active ? 'true' : 'false'}>
      <Canvas
        frameloop={active ? 'always' : 'never'}
        dpr={[1, 1.5]}
        shadows
        camera={{ position: [0, 20.45, 17.6], fov: 40, near: 0.1, far: 100 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <LabScene
            active={active}
            touchInput={touchInput}
            combatApi={combatApi}
            mountHeight={mountHeight}
            weaponScale={weaponScale}
            weaponId={weaponId}
            onCharacterReady={reportReady}
            onInputChange={reportInput}
            onCombatStatus={reportCombat}
          />
        </Suspense>
      </Canvas>
      {!ready && <LoadingCharacter />}
      <div className="ecctrl-mode-card" aria-live="polite">
        <strong>ECCTRL + WARDEN WEAPON</strong>
        <span>{inputKind} · {weaponId.toUpperCase()} · {combatStatus.label}</span>
      </div>
      <WeaponTuner
        weaponId={weaponId}
        mountHeight={mountHeight}
        weaponScale={weaponScale}
        onWeaponCycle={cycleWeapon}
        onHeightChange={setMountHeight}
        onScaleChange={setWeaponScale}
      />
      <div className="ecctrl-control-hint">
        <span>WASD / LEFT STICK</span>
        <span>SPACE / CROSS · JUMP</span>
        <span>J / SQUARE / R2 · ATTACK</span>
        <span>RIGHT STICK · ATTACK FACING</span>
        <span>R · RESET</span>
      </div>
      <TouchControls input={touchInput} active={active} />
    </div>
  );
}

useGLTF.preload(MODEL_URL);
