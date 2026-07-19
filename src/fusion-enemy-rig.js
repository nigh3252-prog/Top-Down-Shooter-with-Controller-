import { installFusionEnemyRig as installBaseFusionEnemyRig } from './fusion-enemy-rig-base.js';

const TAU = Math.PI * 2;
const ANT_CHARGE_PHASE_MULTIPLIER = 3.2;
const BOUND_CYCLES_PER_SECOND = 1.5;
const BLOCK_SPEED_THRESHOLD = .35;
const BLOCK_HOLD_TIME = .16;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth01 = value => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
const expStep = (current, target, response, dt) =>
  lerp(current, target, 1 - Math.exp(-response * Math.max(0, dt)));
const wrap01 = value => ((value % 1) + 1) % 1;

// The combat simulation may split one visible frame into several high-speed charge
// substeps. This independent RAF serial lets the procedural rig update once per
// displayed frame instead of sampling a different leg pose on every physics substep.
let visualFrameSerial = 0;
if(typeof requestAnimationFrame === 'function'){
  const markVisualFrame = ()=>{
    visualFrameSerial++;
    requestAnimationFrame(markVisualFrame);
  };
  requestAnimationFrame(markVisualFrame);
}

function sampleLoop4(values, cycle){
  const position = wrap01(cycle) * 4;
  const index = Math.floor(position) % 4;
  const amount = smooth01(position - Math.floor(position));
  return lerp(values[index], values[(index + 1) % 4], amount);
}

function firstGroupChild(object){
  return object?.children?.find(child => child?.isGroup) || null;
}

function chainJoints(root, count=3){
  const joints = [];
  let current = root;
  for(let index = 0; index < count && current; index++){
    joints.push(current);
    current = firstGroupChild(current);
  }
  return joints;
}

function ensureAntelopeBoundState(handle){
  if(handle._antelopeBoundState) return handle._antelopeBoundState;

  const body = handle?.model?.chassis?.body || null;
  const legs = body?.children
    ?.filter(child => child?.isGroup
      && child.position.y < -.25
      && Math.abs(child.position.x) > .2
      && Math.abs(child.position.z) > .8)
    .map(root => ({
      root,
      joints:chainJoints(root, 3),
      rear:root.position.z < 0,
      basePosition:root.position.clone(),
    }))
    .filter(leg => leg.joints.length === 3) || [];

  const tailRoot = body?.children?.find(child => child?.isGroup
    && Math.abs(child.position.x) < .15
    && child.position.y > .1
    && child.position.z < -1.5) || null;

  handle._antelopeBoundState = {
    body,
    bodyScale:body?.scale?.clone?.() || null,
    legs,
    tailJoints:chainJoints(tailRoot, 2),
    phase:0,
    rate:0,
    blend:0,
    filteredSpeed:0,
    blockedTime:0,
    wasActive:false,
    lastVisualFrame:-1,
    lastVisualTime:null,
  };
  return handle._antelopeBoundState;
}

function resetBoundTransforms(state){
  if(state.body && state.bodyScale) state.body.scale.copy(state.bodyScale);
  for(const leg of state.legs) leg.root.position.copy(leg.basePosition);
}

function visualDelta(state, fallbackDt, time){
  if(visualFrameSerial > 0 && state.lastVisualFrame === visualFrameSerial) return null;

  let dt = Number(fallbackDt) || 0;
  if(state.lastVisualTime !== null){
    const elapsed = Number(time) - state.lastVisualTime;
    if(Number.isFinite(elapsed) && elapsed > 0) dt = elapsed;
  }
  state.lastVisualFrame = visualFrameSerial;
  state.lastVisualTime = Number(time) || 0;
  return clamp(dt, 0, .05);
}

function updateBoundClock(state, enemy, dt){
  const active = !enemy._antScreamActive && enemy.state === 'active';
  const measuredSpeed = Math.max(0, Number(enemy.visualGroundSpeed) || 0);
  state.filteredSpeed = expStep(state.filteredSpeed, measuredSpeed, 11, dt);

  if(active){
    if(!state.wasActive){
      state.phase = 0;
      state.rate = 0;
      state.blockedTime = 0;
      state.filteredSpeed = Math.max(state.filteredSpeed, measuredSpeed, 1);
    }

    if(state.filteredSpeed < BLOCK_SPEED_THRESHOLD) state.blockedTime += dt;
    else state.blockedTime = Math.max(0, state.blockedTime - dt * 3);

    // Hold a stable two-beat bounding rhythm through short collision corrections.
    // Only a sustained block eases the legs toward a stop.
    const targetRate = state.blockedTime >= BLOCK_HOLD_TIME ? 0 : TAU * BOUND_CYCLES_PER_SECOND;
    state.rate = expStep(state.rate, targetRate, 8, dt);
    state.phase += state.rate * dt;
    state.blend = expStep(state.blend, 1, 12, dt);
  } else {
    state.blockedTime = 0;
    state.rate = expStep(state.rate, 0, 10, dt);
    state.blend = expStep(state.blend, 0, 10, dt);
  }

  state.wasActive = active;
}

function applyLongBoundPose(state){
  const blend = state.blend;
  if(blend <= .001 || !state.body || state.legs.length !== 4) return;

  const cycle = state.phase / TAU;

  // Four continuous keys: rear compression -> rear push -> long airborne reach ->
  // front landing/rear recovery. Smooth interpolation keeps the loop free of snaps.
  const bodyLift = sampleLoop4([-.08, .20, .38, .06], cycle);
  const bodyPitch = sampleLoop4([.14, -.06, -.18, .08], cycle);
  const bodyStretch = sampleLoop4([0, .48, 1, .34], cycle);

  state.body.position.y += bodyLift * blend;
  state.body.rotation.x += bodyPitch * blend;
  state.body.rotation.z += Math.sin(state.phase) * .018 * blend;
  if(state.bodyScale){
    state.body.scale.set(
      state.bodyScale.x * (1 - bodyStretch * .018 * blend),
      state.bodyScale.y * (1 - bodyStretch * .055 * blend),
      state.bodyScale.z * (1 + bodyStretch * .14 * blend),
    );
  }

  for(const leg of state.legs){
    const hip = leg.rear
      ? sampleLoop4([.78, -.98, -.22, .58], cycle)
      : sampleLoop4([-.18, .42, -1.30, -.55], cycle);
    const knee = leg.rear
      ? sampleLoop4([-1.45, -.12, -.72, -1.18], cycle)
      : sampleLoop4([.42, 1.02, .26, 1.18], cycle);
    const ankle = leg.rear
      ? sampleLoop4([.56, .04, .34, .48], cycle)
      : sampleLoop4([-.18, -.54, .14, -.48], cycle);

    leg.root.position.z = leg.basePosition.z
      + (leg.rear ? -.16 : .21) * bodyStretch * blend;
    leg.joints[0].rotation.x = lerp(leg.joints[0].rotation.x, hip, blend);
    leg.joints[1].rotation.x = lerp(leg.joints[1].rotation.x, knee, blend);
    leg.joints[2].rotation.x = lerp(leg.joints[2].rotation.x, ankle, blend);
  }

  if(state.tailJoints.length >= 2){
    state.tailJoints[0].rotation.x = lerp(
      state.tailJoints[0].rotation.x,
      2.42 + sampleLoop4([.08, -.18, -.28, .02], cycle),
      blend,
    );
    state.tailJoints[1].rotation.x = lerp(
      state.tailJoints[1].rotation.x,
      sampleLoop4([.15, -.22, -.34, .05], cycle),
      blend,
    );
  }
}

function phaseProxy(enemy, phaseCuts){
  const [windupCut, activeCut] = phaseCuts;
  let state = enemy.state;
  let stateTime = enemy.stateTime;

  if(enemy._antScreamActive){
    const progress = clamp((enemy.gestureTime || 0) / Math.max(.001, enemy.gestureDuration || 1.9), 0, 1);
    if(progress < windupCut){
      state = 'windup';
      stateTime = progress;
    } else if(progress < activeCut){
      state = 'active';
      stateTime = progress - windupCut;
    } else {
      state = 'recovery';
      stateTime = progress - activeCut;
    }
  } else if(state === 'windup'){
    stateTime = clamp(stateTime / Math.max(.001, enemy.windup), 0, 1) * windupCut;
  } else if(state === 'active'){
    stateTime = clamp(stateTime / Math.max(.001, enemy.active), 0, 1) * (activeCut - windupCut);
  } else if(state === 'recovery'){
    stateTime = clamp(stateTime / Math.max(.001, enemy.recovery), 0, 1) * (1 - activeCut);
  }

  return {
    ...enemy,
    state,
    stateTime,
    windup:windupCut,
    active:activeCut - windupCut,
    recovery:1 - activeCut,
    attack:enemy._antScreamActive ? { name:'Scream' } : enemy.attack,
    visualGroundSpeed:enemy._antScreamActive ? 0 : enemy.visualGroundSpeed,
    vx:enemy._antScreamActive ? 0 : enemy.vx,
    vz:enemy._antScreamActive ? 0 : enemy.vz,
  };
}

function lionMaulProxy(enemy){
  const progress = clamp(Number(enemy._lionMaulProgress) || 0, 0, 1);
  const windup = .44;
  const active = .18;
  const recovery = .38;
  let state;
  let stateTime;
  if(progress < windup){
    state = 'windup';
    stateTime = progress;
  }else if(progress < windup + active){
    state = 'active';
    stateTime = progress - windup;
  }else{
    state = 'recovery';
    stateTime = progress - windup - active;
  }
  return {
    ...enemy,
    state,
    stateTime,
    windup,
    active,
    recovery,
    attack:{ ...(enemy.attack || {}), name:'Maul Bite' },
    visualGroundSpeed:0,
    vx:0,
    vz:0,
  };
}

function applyLionMaulPose(handle, enemy){
  const progress = clamp(Number(enemy._lionMaulProgress) || 0, 0, 1);
  const body = handle?.model?.chassis?.body;
  const socket = handle?.model?.chassis?.socket;
  const brace = smooth01(clamp(progress / .34, 0, 1)) * (1 - smooth01(clamp((progress - .82) / .18, 0, 1)));
  const snap = Math.exp(-Math.pow((progress - .76) / .09, 2));
  if(body){
    body.position.y -= .22 * brace;
    body.rotation.x += .18 * brace + .20 * snap;
    body.rotation.z += Math.sin((Number(enemy._lionMaulBiteIndex) || 0) * 2.7) * .035 * brace;
  }
  if(socket){
    socket.rotation.x += .20 * brace - .42 * snap;
    socket.position.z += .12 * brace;
  }
}

export function installFusionEnemyRig(THREE){
  const rig = installBaseFusionEnemyRig(THREE);
  const baseUpdate = rig.update.bind(rig);

  rig.update = function updateWithBranchAnimations(handle, enemy, dt, time, heightScale=1){
    if(enemy?.kind === 'lion' && enemy._lionMaulActive){
      const animations = handle?.model?.bodyDef?.anims;
      const previousAnimation = animations?.[0];
      if(animations) animations[0] = 'LION_ROAR';
      baseUpdate(handle, lionMaulProxy(enemy), dt, time, heightScale);
      applyLionMaulPose(handle, enemy);
      if(animations) animations[0] = previousAnimation;
      return;
    }

    if(enemy?.kind !== 'ant') return baseUpdate(handle, enemy, dt, time, heightScale);

    const boundState = ensureAntelopeBoundState(handle);
    const frameDt = visualDelta(boundState, dt, time);
    if(frameDt === null) return;

    resetBoundTransforms(boundState);
    updateBoundClock(boundState, enemy, frameDt);

    const animations = handle?.model?.bodyDef?.anims;
    const previousAnimation = animations?.[0];
    if(animations) animations[0] = enemy._antScreamActive ? 'ANT_SCREAM' : 'ANT_CHARGE';

    // ANT_CHARGE multiplies phase by 3.2 internally. Feed it the inverse-scaled
    // stable visual clock so the authored body motion follows one smooth bound cycle.
    if(!enemy._antScreamActive && enemy.state === 'active'){
      handle.gaitPhase = boundState.phase / ANT_CHARGE_PHASE_MULTIPLIER;
    }

    const proxy = phaseProxy(enemy, enemy._antScreamActive ? [.30, .75] : [.28, .68]);
    baseUpdate(handle, proxy, frameDt, time, heightScale);
    applyLongBoundPose(boundState);

    if(animations) animations[0] = previousAnimation;
  };

  return rig;
}
