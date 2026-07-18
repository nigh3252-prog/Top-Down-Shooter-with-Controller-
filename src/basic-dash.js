import { resolveCircleMovement } from './hex-maze-navigation.js';
import {
  BASIC_DASH,
  dashDistanceAt,
  normalizeDirection,
  postDashDirection,
  postDashSpeed,
  selectDashDirection,
} from './basic-dash-logic.js';

const Y_AXIS_FALLBACK = { x:0, y:1, z:0 };

export function installBasicDashRuntime(api, config = BASIC_DASH){
  const { THREE } = api;
  const keyState = Object.create(null);
  const forwardVector = new THREE.Vector3(0, 0, 1);
  const yAxis = THREE.Vector3 ? new THREE.Vector3(0, 1, 0) : Y_AXIS_FALLBACK;
  const state = {
    active:false,
    postActive:false,
    elapsed:0,
    postElapsed:0,
    plannedDistance:0,
    direction:{ x:0, z:1 },
    position:null,
    lastStablePosition:null,
    lastForward:{ x:0, z:1 },
    sawArenaDash:false,
  };

  const onKeyDown = event => { keyState[event.key.toLowerCase()] = true; };
  const onKeyUp = event => { keyState[event.key.toLowerCase()] = false; };
  globalThis.addEventListener?.('keydown', onKeyDown);
  globalThis.addEventListener?.('keyup', onKeyUp);

  function keyboardInput(){
    let x = 0, z = 0;
    if(keyState.a || keyState.arrowleft) x -= 1;
    if(keyState.d || keyState.arrowright) x += 1;
    if(keyState.w || keyState.arrowup) z -= 1;
    if(keyState.s || keyState.arrowdown) z += 1;
    return normalizeDirection(x, z) || { x:0, z:0 };
  }

  function gamepadInput(){
    const gamepad = globalThis.navigator?.getGamepads?.()[0];
    if(!gamepad) return { x:0, z:0 };
    const buttonDown = index => !!gamepad.buttons?.[index]?.pressed;
    const deadzone = value => Math.abs(value) > .16 ? value : 0;
    let x = deadzone(gamepad.axes?.[0] || 0);
    let z = deadzone(gamepad.axes?.[1] || 0);
    if(buttonDown(14)) x -= 1;
    if(buttonDown(15)) x += 1;
    const normalized = normalizeDirection(x, z);
    return normalized || { x:0, z:0 };
  }

  function movementInput(){
    const pad = gamepadInput();
    if(Math.hypot(pad.x, pad.z) > .08) return pad;
    return keyboardInput();
  }

  function currentForward(){
    forwardVector.set(0, 0, 1).applyQuaternion(api.yawQ);
    forwardVector.y = 0;
    if(forwardVector.lengthSq() < 1e-6) forwardVector.set(0, 0, 1);
    forwardVector.normalize();
    return { x:forwardVector.x, z:forwardVector.z };
  }

  function arenaHandle(){
    const handle = globalThis.window?.__arena || globalThis.__arena;
    return handle?.arena && handle?.actorPos ? handle : null;
  }

  function collisionSegments(handle){
    return handle.mazeWorld?.getCollisionSegments?.() || [];
  }

  function moveFrom(handle, start, direction, distance){
    const result = resolveCircleMovement(
      { x:start.x, z:start.z },
      { x:direction.x * distance, z:direction.z * distance },
      config.playerRadius,
      collisionSegments(handle),
    );
    return { x:result.x, z:result.z };
  }

  function syncPlayer(handle, position, direction){
    handle.actorPos.set(position.x, position.z);
    const root = api.actorVisual?.parent;
    if(root?.position) root.position.set(position.x, root.position.y || 0, position.z);
    const angle = Math.atan2(direction.x, direction.z);
    api.hooks?.commitFacing?.(angle);
    api.yawQ?.setFromAxisAngle?.(yAxis, angle);
    api.actorVisual?.quaternion?.copy?.(api.yawQ);
  }

  function beginDash(handle){
    const input = movementInput();
    const direction = selectDashDirection({
      input,
      forward:state.lastForward,
      config,
    });
    const current = handle.actorPos;
    state.active = true;
    state.postActive = false;
    state.elapsed = 0;
    state.postElapsed = 0;
    state.plannedDistance = 0;
    state.direction = direction;
    state.position = state.lastStablePosition
      ? { ...state.lastStablePosition }
      : { x:current.x, z:current.y };
    handle.arena.dodge.dirX = direction.x;
    handle.arena.dodge.dirZ = direction.z;
  }

  function updateActiveDash(handle, dt){
    state.elapsed = Math.min(config.duration, state.elapsed + dt);
    const targetDistance = dashDistanceAt(state.elapsed, config);
    const stepDistance = Math.max(0, targetDistance - state.plannedDistance);
    state.position = moveFrom(handle, state.position, state.direction, stepDistance);
    state.plannedDistance = targetDistance;
    handle.arena.dodge.dirX = state.direction.x;
    handle.arena.dodge.dirZ = state.direction.z;
    handle.arena.dodge.t = Math.min(state.elapsed, config.duration - 1e-4);
    syncPlayer(handle, state.position, state.direction);

    if(state.elapsed >= config.duration - 1e-6){
      state.active = false;
      state.postActive = true;
      state.postElapsed = 0;
      handle.arena.dodge.t = -1;
    }
  }

  function updatePostDash(handle, dt){
    state.postElapsed = Math.min(config.postLockDuration, state.postElapsed + dt);
    const input = movementInput();
    const direction = postDashDirection(state.direction, input, state.postElapsed, config);
    const speed = postDashSpeed(input, state.postElapsed, config);
    state.position = moveFrom(handle, state.position, direction, speed * dt);
    state.direction = direction;
    syncPlayer(handle, state.position, direction);

    if(state.postElapsed >= config.postLockDuration - 1e-6){
      state.postActive = false;
      state.lastStablePosition = { ...state.position };
    }
  }

  function cancel(handle){
    state.active = false;
    state.postActive = false;
    state.position = null;
    state.plannedDistance = 0;
    if(handle?.arena?.dodge) handle.arena.dodge.t = -1;
  }

  function update(dt){
    const handle = arenaHandle();
    if(!handle) return;
    const dodge = handle.arena.dodge;
    const interrupted = handle.arena.deadT >= 0 || handle.roomTransition?.active;
    if(interrupted){
      cancel(handle);
      state.sawArenaDash = dodge.t >= 0;
      return;
    }

    const arenaDashActive = dodge.t >= 0;
    if(arenaDashActive && !state.active && !state.postActive && !state.sawArenaDash){
      beginDash(handle);
    }

    if(state.active) updateActiveDash(handle, dt);
    else if(state.postActive) updatePostDash(handle, dt);
    else {
      state.lastStablePosition = { x:handle.actorPos.x, z:handle.actorPos.y };
    }

    state.lastForward = currentForward();
    state.sawArenaDash = dodge.t >= 0;
  }

  function dispose(){
    globalThis.removeEventListener?.('keydown', onKeyDown);
    globalThis.removeEventListener?.('keyup', onKeyUp);
  }

  return { state, config, update, dispose };
}
