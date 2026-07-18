export const BASIC_DASH = Object.freeze({
  playerRadius:1.05,
  playerWidths:4,
  duration:.24,
  movingAnticipationFraction:.18,
  postLockDuration:.22,
  fullDirectionLock:.10,
  poseRecoverDuration:.12,
  anticipationLean:4 * Math.PI / 180,
  launchLean:2.5 * Math.PI / 180,
  anticipationCrouch:.10,
  anticipationRecoil:.06,
  playerMoveSpeed:8.5,
  inputDeadzone:.20,
  speedCurveBias:.70,
  postStartSpeed:8.5 * 1.55,
});

export function dashDistance(config = BASIC_DASH){
  return config.playerRadius * 2 * config.playerWidths;
}

export function normalizeDirection(x, z, deadzone = 0){
  const length = Math.hypot(x, z);
  if(length <= deadzone) return null;
  return { x:x / length, z:z / length };
}

function cleanZero(value){ return Math.abs(value) < 1e-12 ? 0 : value; }

export function selectDashDirection({ input, forward, config = BASIC_DASH }){
  const held = normalizeDirection(input?.x || 0, input?.z || 0, config.inputDeadzone);
  if(held) return held;
  const facing = normalizeDirection(forward?.x || 0, forward?.z || 0) || { x:0, z:1 };
  return { x:cleanZero(-facing.x), z:cleanZero(-facing.z) };
}

export function dashProgress(elapsed, config = BASIC_DASH){
  const u = Math.max(0, Math.min(1, elapsed / config.duration));
  return u + config.speedCurveBias * u * (1 - u);
}

export function dashDistanceAt(elapsed, config = BASIC_DASH){
  return dashDistance(config) * dashProgress(elapsed, config);
}

function smoothstep01(value){
  const u = Math.max(0, Math.min(1, value));
  return u * u * (3 - 2 * u);
}

export function postDashDirection(dashDirection, input, elapsed, config = BASIC_DASH){
  const dash = normalizeDirection(dashDirection?.x || 0, dashDirection?.z || 0) || { x:0, z:1 };
  const held = normalizeDirection(input?.x || 0, input?.z || 0, config.inputDeadzone);
  if(!held || elapsed <= config.fullDirectionLock) return dash;
  const blendWindow = Math.max(.001, config.postLockDuration - config.fullDirectionLock);
  const mix = smoothstep01((elapsed - config.fullDirectionLock) / blendWindow);
  return normalizeDirection(
    dash.x + (held.x - dash.x) * mix,
    dash.z + (held.z - dash.z) * mix,
  ) || dash;
}

export function postDashSpeed(input, elapsed, config = BASIC_DASH){
  const progress = Math.max(0, Math.min(1, elapsed / config.postLockDuration));
  const held = !!normalizeDirection(input?.x || 0, input?.z || 0, config.inputDeadzone);
  if(held) return config.postStartSpeed + (config.playerMoveSpeed - config.postStartSpeed) * progress;
  return config.postStartSpeed * Math.pow(1 - progress, 2);
}
