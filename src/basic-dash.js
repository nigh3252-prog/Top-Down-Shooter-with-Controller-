import { getArenaRuntime } from './arena-runtime-context.js';
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
const clamp01 = value => Math.max(0, Math.min(1, value));
const smoothstep01 = value => { const u=clamp01(value); return u*u*(3-2*u); };

export function installBasicDashRuntime(api, config = BASIC_DASH){
  const { THREE } = api;
  const keyState = Object.create(null);
  const forwardVector = new THREE.Vector3(0, 0, 1);
  const yAxis = THREE.Vector3 ? new THREE.Vector3(0, 1, 0) : Y_AXIS_FALLBACK;
  const state = {
    active:false,
    postActive:false,
    source:'idle',
    motionId:0,
    cancelled:false,
    elapsed:0,
    postElapsed:0,
    plannedDistance:0,
    actualDistance:0,
    distanceMultiplier:1,
    blocked:false,
    direction:{ x:0, z:1 },
    resolvedDirection:{ x:0, z:1 },
    facingForward:{ x:0, z:1 },
    facingAngle:0,
    localDashForward:0,
    localDashRight:0,
    position:null,
    previous:null,
    start:null,
    end:null,
    path:[],
    lastStablePosition:null,
    lastForward:{ x:0, z:1 },
    poseModel:null,
    poseBase:null,
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
    const handle = getArenaRuntime();
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
    const position={ x:result.x, z:result.z };
    const applied=Math.hypot(position.x-start.x,position.z-start.z);
    return { position, applied, blocked:applied+1e-5<Math.max(0,distance) };
  }

  function syncPosition(handle, position){
    handle.actorPos.set(position.x, position.z);
    const root = api.actorVisual?.parent;
    if(root?.position) root.position.set(position.x, root.position.y || 0, position.z);
  }

  function holdFacing(handle){
    handle.arena.dodge.dirX = state.facingForward.x;
    handle.arena.dodge.dirZ = state.facingForward.z;
    handle.arena.dodge.t = .001;
    api.hooks?.commitFacing?.(state.facingAngle);
    api.yawQ?.setFromAxisAngle?.(yAxis, state.facingAngle);
    api.actorVisual?.quaternion?.copy?.(api.yawQ);
  }

  function capturePose(){
    const model = api.activeModel;
    if(!model?.position || !model?.rotation){
      state.poseModel = null;
      state.poseBase = null;
      return;
    }
    state.poseModel = model;
    state.poseBase = {
      x:model.position.x || 0,
      y:model.position.y || 0,
      z:model.position.z || 0,
      rx:model.rotation.x || 0,
      ry:model.rotation.y || 0,
      rz:model.rotation.z || 0,
    };
    const facing = state.facingForward;
    const right = { x:facing.z, z:-facing.x };
    state.localDashForward = state.direction.x*facing.x + state.direction.z*facing.z;
    state.localDashRight = state.direction.x*right.x + state.direction.z*right.z;
  }

  function applyPose({ lean=0, crouch=0, recoil=0 } = {}){
    const model = state.poseModel, base = state.poseBase;
    if(!model || !base || model !== api.activeModel) return;
    model.position.x = base.x - state.localDashRight * recoil;
    model.position.y = base.y - crouch;
    model.position.z = base.z - state.localDashForward * recoil;
    model.rotation.x = base.rx + state.localDashForward * lean;
    model.rotation.y = base.ry;
    model.rotation.z = base.rz - state.localDashRight * lean;
  }

  function resetPose(){
    const model = state.poseModel, base = state.poseBase;
    if(model && base && model === api.activeModel){
      model.position.x=base.x; model.position.y=base.y; model.position.z=base.z;
      model.rotation.x=base.rx; model.rotation.y=base.ry; model.rotation.z=base.rz;
    }
    state.poseModel = null;
    state.poseBase = null;
  }

  function recordPath(position){
    if(!position)return;
    const last=state.path[state.path.length-1];
    if(last&&Math.hypot(last.x-position.x,last.z-position.z)<1e-5)return;
    state.path.push({x:position.x,z:position.z});
    if(state.path.length>128)state.path.splice(1,state.path.length-128);
  }

  function completedPathDirection(fallback=state.direction){
    for(let index=state.path.length-1;index>0;index--){
      const dx=state.path[index].x-state.path[index-1].x,dz=state.path[index].z-state.path[index-1].z;
      const direction=normalizeDirection(dx,dz);if(direction)return direction;
    }
    return normalizeDirection(fallback.x,fallback.z)||{x:0,z:1};
  }

  function beginDash(handle,options={}){
    const facing = normalizeDirection(state.lastForward.x, state.lastForward.z) || { x:0, z:1 };
    const requested=normalizeDirection(Number(options.direction?.x)||0,Number(options.direction?.z)||0);
    const direction = requested || selectDashDirection({ input:movementInput(), forward:facing, config });
    const current = handle.actorPos;
    state.active = true;
    state.postActive = false;
    state.source=String(options.source||'ordinary-dodge');
    state.motionId++;
    state.cancelled=false;
    state.elapsed = 0;
    state.postElapsed = 0;
    state.plannedDistance = 0;
    state.actualDistance = 0;
    const requestedMultiplier=Number(options.distanceMultiplier);
    state.distanceMultiplier=Number.isFinite(requestedMultiplier)&&requestedMultiplier>0
      ? requestedMultiplier
      : 1;
    state.blocked = false;
    state.direction = direction;
    state.resolvedDirection = {...direction};
    state.facingForward = facing;
    state.facingAngle = Math.atan2(facing.x, facing.z);
    state.position = state.lastStablePosition
      ? { ...state.lastStablePosition }
      : { x:current.x, z:current.y };
    state.previous={...state.position};
    state.start={...state.position};
    state.end=null;
    state.path=[];
    recordPath(state.position);
    capturePose();
    syncPosition(handle, state.position);
    holdFacing(handle);
    applyPose();
    return state.motionId;
  }

  function updateActiveDash(handle, dt){
    state.elapsed = Math.min(config.duration, state.elapsed + dt);
    const targetDistance = dashDistanceAt(state.elapsed, config) * state.distanceMultiplier;
    const stepDistance = Math.max(0, targetDistance - state.plannedDistance);
    state.previous={...state.position};
    const movement=moveFrom(handle, state.position, state.direction, stepDistance);
    state.position = movement.position;
    state.actualDistance += movement.applied;
    state.blocked = state.blocked || movement.blocked;
    recordPath(state.position);
    state.plannedDistance = targetDistance;
    syncPosition(handle, state.position);
    holdFacing(handle);

    const u = clamp01(state.elapsed / Math.max(.001, config.duration));
    const anticipationWindow=Math.max(.01,config.movingAnticipationFraction||.18);
    const anticipation=1-smoothstep01(u/anticipationWindow);
    const launch=smoothstep01(u/Math.min(1,anticipationWindow+.10))*(1-smoothstep01((u-.28)/.72));
    applyPose({
      lean:-config.anticipationLean*anticipation+config.launchLean*launch,
      crouch:config.anticipationCrouch*anticipation,
      recoil:config.anticipationRecoil*anticipation,
    });

    if(state.elapsed >= config.duration - 1e-6){
      state.active = false;
      state.postActive = true;
      state.postElapsed = 0;
      state.end={...state.position};
      state.resolvedDirection=completedPathDirection(state.direction);
      handle.arena.dodge.t = -1;
    }
  }

  function updatePostDash(handle, dt){
    state.postElapsed = Math.min(config.postLockDuration, state.postElapsed + dt);
    const input = movementInput();
    const direction = postDashDirection(state.direction, input, state.postElapsed, config);
    const speed = postDashSpeed(input, state.postElapsed, config);
    state.previous={...state.position};
    const movement=moveFrom(handle, state.position, direction, speed * dt);
    state.position = movement.position;
    state.blocked = state.blocked || movement.blocked;
    state.direction = direction;
    syncPosition(handle, state.position);

    const recover = 1 - smoothstep01(state.postElapsed / Math.max(.001, config.poseRecoverDuration));
    applyPose({ lean:config.launchLean * .30 * recover });

    if(state.postElapsed >= config.postLockDuration - 1e-6){
      state.postActive = false;
      state.lastStablePosition = { ...state.position };
      resetPose();
    }
  }

  function cancel(handle){
    state.cancelled=state.active||state.postActive;
    state.active = false;
    state.postActive = false;
    state.position = null;
    state.plannedDistance = 0;
    resetPose();
    if(handle?.arena?.dodge) handle.arena.dodge.t = -1;
  }

  function motionSnapshot(id=state.motionId){
    const current=id===state.motionId;
    return{
      id,
      current,
      source:current?state.source:'expired',
      phase:!current?'expired':state.active?'moving':state.postActive?'post':state.cancelled?'cancelled':state.end?'complete':'idle',
      active:current&&(state.active||state.postActive),
      movementComplete:current&&!!state.end,
      complete:current&&!!state.end&&!state.active&&!state.postActive&&!state.cancelled,
      cancelled:current&&state.cancelled,
      start:current&&state.start?{...state.start}:null,
      previous:current&&state.previous?{...state.previous}:null,
      current:current&&state.position?{...state.position}:null,
      end:current&&state.end?{...state.end}:null,
      direction:current?{...state.direction}:null,
      resolvedDirection:current?{...state.resolvedDirection}:null,
      elapsed:current?state.elapsed:0,
      postElapsed:current?state.postElapsed:0,
      plannedDistance:current?state.plannedDistance:0,
      distanceMultiplier:current?state.distanceMultiplier:1,
      distance:current?state.actualDistance:0,
      blocked:current&&state.blocked,
      path:current?state.path.map(point=>({...point})):[],
    };
  }

  function startDashMotion(options={}){
    const handle=arenaHandle();
    if(!handle||handle.arena?.deadT>=0||handle.roomTransition?.active||state.active||state.postActive||handle.arena?.dodge?.t>=0)return null;
    const id=beginDash(handle,{...options,source:options.source||'arcana'});
    state.sawArenaDash=true;
    if(options.applyDodgeCooldown)handle.arena.dodge.cool=Math.max(Number(handle.arena.dodge.cool)||0,Number(options.dodgeCooldown)||.55);
    if(options.grantIframes)handle.arena.invulnT=Math.max(Number(handle.arena.invulnT)||0,Number(options.iframeDuration)||.30);
    const token={
      id,
      snapshot:()=>motionSnapshot(id),
      cancel:()=>{if(id===state.motionId)cancel(arenaHandle());},
    };
    return Object.freeze(token);
  }

  function reset(){
    const handle=arenaHandle();
    cancel(handle);
    state.motionId=0;
    state.source='ordinary-dodge';
    state.cancelled=false;
    state.elapsed=0;
    state.postElapsed=0;
    state.plannedDistance=0;
    state.actualDistance=0;
    state.distanceMultiplier=1;
    state.blocked=false;
    state.resolvedDirection={x:0,z:1};
    state.start=null;
    state.previous=null;
    state.end=null;
    state.path=[];
    state.sawArenaDash=false;
    state.lastForward=currentForward();
    // A room transition/respawn deliberately cancels before the arena moves the
    // player. Do not retain that old position: the next dash must sample the
    // arena's new authoritative position even if it starts before another tick.
    state.lastStablePosition=null;
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
      beginDash(handle,{source:'ordinary-dodge'});
    }

    if(state.active) updateActiveDash(handle, dt);
    else if(state.postActive) updatePostDash(handle, dt);
    else state.lastStablePosition = { x:handle.actorPos.x, z:handle.actorPos.y };

    if(!state.active) state.lastForward = currentForward();
    state.sawArenaDash = dodge.t >= 0;
  }

  function dispose(){
    resetPose();
    globalThis.removeEventListener?.('keydown', onKeyDown);
    globalThis.removeEventListener?.('keyup', onKeyUp);
  }

  return { state, config, update, reset, dispose, startDashMotion, snapshot:motionSnapshot, get busy(){return state.active||state.postActive;} };
}
