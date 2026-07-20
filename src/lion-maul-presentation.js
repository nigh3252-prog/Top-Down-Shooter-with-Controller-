import { LION_MAUL_ANIMATION_DEFAULTS } from './lion-maul-animation.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const deg = value => Number(value || 0) * Math.PI / 180;
const DEMO_PIN_DISTANCE = LION_MAUL_ANIMATION_DEFAULTS.lionDistance;
const GAME_PIN_DISTANCE = 1.34;

let installed = false;
let playerPose = null;
const lionParts = new WeakMap();

function runtimeHandle() {
  try { return globalThis.window?.__arena || null; }
  catch { return null; }
}

function disableDamageVignette() {
  if (typeof document === 'undefined') return;
  const vignette = document.getElementById('vig');
  if (!vignette) return;
  vignette.style.setProperty('display', 'none', 'important');
  vignette.style.setProperty('opacity', '0', 'important');
}

function actorWorldZ(actorPos) {
  if (Number.isFinite(Number(actorPos?.y))) return Number(actorPos.y);
  if (Number.isFinite(Number(actorPos?.z))) return Number(actorPos.z);
  return 0;
}

function findActorVisual(runtime) {
  if (playerPose?.visual?.parent === playerPose?.pivot && playerPose?.pivot?.parent) return playerPose.visual;
  const actorPos = runtime?.actorPos;
  const enemyGroup = runtime?.enemySystem?.group;
  const worldRoot = enemyGroup?.parent;
  const mazeGroup = runtime?.mazeWorld?.group;
  if (!worldRoot || !actorPos) return null;

  const playerX = Number(actorPos.x) || 0;
  const playerZ = actorWorldZ(actorPos);
  const candidates = worldRoot.children
    .filter(child => child?.isGroup && child !== enemyGroup && child !== mazeGroup)
    .map(root => ({
      root,
      distance:Math.hypot(
        Number(root.position?.x || 0) - playerX,
        Number(root.position?.z || 0) - playerZ,
      ),
    }))
    .filter(entry => entry.distance < .35 && entry.root.children?.some(child => child?.isGroup))
    .sort((a, b) => a.distance - b.distance);

  const actorRoot = candidates[0]?.root || null;
  return actorRoot?.children?.find(child => child?.isGroup) || null;
}

function ensurePlayerPivot(runtime) {
  if (playerPose?.pivot?.parent && playerPose.visual?.parent === playerPose.pivot) return playerPose;
  const visual = findActorVisual(runtime);
  const root = visual?.parent;
  if (!visual || !root) return null;
  const pivot = new visual.constructor();
  pivot.name = 'Lion maul player pivot (standalone lab pose)';
  root.add(pivot);
  pivot.add(visual);
  playerPose = { root, pivot, visual };
  return playerPose;
}

function visualState(lion) {
  const state = lion?._lionMaulProgress;
  return state && typeof state === 'object' ? state : null;
}

function poseQuaternion(pivot, visual, fallAngle, roll) {
  const yaw = visual.quaternion.clone();
  const inverseYaw = yaw.clone().invert();
  const fall = pivot.quaternion.clone().set(Math.sin(-fallAngle / 2), 0, 0, Math.cos(fallAngle / 2));
  const twist = pivot.quaternion.clone().set(0, 0, Math.sin(roll / 2), Math.cos(roll / 2));
  pivot.quaternion.copy(yaw).multiply(fall).multiply(twist).multiply(inverseYaw);
}

function applyPronePlayerPose(runtime, lion) {
  const pose = ensurePlayerPivot(runtime);
  if (!pose) return;
  const state = visualState(lion);
  const fall = clamp(Number(state?.fall) || 0, 0, 1);
  const snap = clamp(Number(state?.snap) || 0, 0, 1);
  const elapsed = Math.max(0, Number(state?.elapsed) || 0);
  const facingX = Number(lion?.facing?.x) || 0;
  const facingZ = Number(lion?.facing?.z) || 0;
  const slide = (Number(state?.playerBackSlide) || LION_MAUL_ANIMATION_DEFAULTS.playerBackSlide) * fall;

  pose.pivot.position.set(
    facingX * slide,
    (Number(state?.playerGroundY) || LION_MAUL_ANIMATION_DEFAULTS.playerGroundY) * fall,
    facingZ * slide,
  );
  poseQuaternion(
    pose.pivot,
    pose.visual,
    deg((Number(state?.playerFallAngle) || LION_MAUL_ANIMATION_DEFAULTS.playerFallAngle) * fall),
    Math.sin(elapsed * 10) * snap * .025,
  );
  pose.root.updateMatrixWorld?.(true);
}

function firstGroupChild(object) {
  return object?.children?.find(child => child?.isGroup) || null;
}

function chainJoints(root, count=3) {
  const joints = [];
  let current = root;
  for (let index = 0; index < count && current; index++) {
    joints.push(current);
    current = firstGroupChild(current);
  }
  return joints;
}

function discoverLionParts(lion) {
  const existing = lionParts.get(lion);
  const model = lion?.fusionVisual?.model;
  if (existing?.model === model) return existing;
  const body = model?.chassis?.body || null;
  const socket = model?.chassis?.socket || null;
  const legs = body?.children
    ?.filter(child => child?.isGroup
      && child.position.y < -.45
      && Math.abs(child.position.x) > .55
      && Math.abs(child.position.z) > 1)
    .map(root => ({ root, joints:chainJoints(root, 3), rear:root.position.z < 0 }))
    .filter(leg => leg.joints.length === 3) || [];
  const headGroup = model?.head?.group || null;
  const jaw = headGroup?.children?.find(child => child?.isGroup
    && child.position.y < -.2
    && child.position.z > .25) || null;
  const parts = { model, group:model?.group || null, body, socket, legs, jaw };
  lionParts.set(lion, parts);
  return parts;
}

function applyLionMaulPose(lion) {
  const state = visualState(lion);
  if (!state) return;
  const parts = discoverLionParts(lion);
  if (!parts.body || !parts.socket) return;
  const hold = clamp(Number(state.hold) || 0, 0, 1);
  const snap = clamp(Number(state.snap) || 0, 0, 1);
  const shake = clamp(Number(state.shake) || 0, -1, 1);
  const open = clamp(Number(state.open) || 0, 0, 1);

  // The standalone lab resets the real rig to its authored idle pose every frame,
  // then applies these exact local deltas. The combat rig has just completed the same
  // base update, so applying them here reproduces the lab without fighting AI state.
  if (parts.group) parts.group.position.z -= Math.max(0, DEMO_PIN_DISTANCE - GAME_PIN_DISTANCE);
  parts.body.position.y -= (Number(state.lionBodyDrop) || LION_MAUL_ANIMATION_DEFAULTS.lionBodyDrop) * hold;
  parts.body.rotation.x += deg(Number(state.lionBodyPitch) || LION_MAUL_ANIMATION_DEFAULTS.lionBodyPitch) * hold
    + deg(3) * snap;
  parts.body.rotation.z += shake * .025;

  for (const leg of parts.legs) {
    const crouch = leg.rear
      ? (Number(state.rearCrouch) || LION_MAUL_ANIMATION_DEFAULTS.rearCrouch)
      : (Number(state.frontCrouch) || LION_MAUL_ANIMATION_DEFAULTS.frontCrouch);
    const amount = hold * crouch;
    const hip = leg.rear ? .98 : .58;
    const knee = leg.rear ? -1.66 : 1.28;
    const ankle = leg.rear ? .44 : -.18;
    leg.joints[0].rotation.x += (hip - leg.joints[0].rotation.x) * amount;
    leg.joints[1].rotation.x += (knee - leg.joints[1].rotation.x) * amount;
    leg.joints[2].rotation.x += (ankle - leg.joints[2].rotation.x) * amount;
  }

  parts.socket.rotation.x += deg(Number(state.headBasePitch) || LION_MAUL_ANIMATION_DEFAULTS.headBasePitch) * hold
    + deg(Number(state.biteSnap) || LION_MAUL_ANIMATION_DEFAULTS.biteSnap) * snap;
  parts.socket.rotation.y += deg(Number(state.headShake) || LION_MAUL_ANIMATION_DEFAULTS.headShake) * shake * hold;
  parts.socket.rotation.z += shake * .08 * hold;
  if (parts.jaw) {
    parts.jaw.rotation.x += deg(Number(state.jawOpen) || LION_MAUL_ANIMATION_DEFAULTS.jawOpen) * open * hold;
  }
  lion.root?.updateMatrixWorld?.(true);
}

function installLionMaulPresentation() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  disableDamageVignette();

  const tryInstall = () => {
    if (installed) return;
    disableDamageVignette();
    const runtime = runtimeHandle();
    const scene = runtime?.enemySystem?.group?.parent?.parent;
    if (!scene) {
      requestAnimationFrame(tryInstall);
      return;
    }

    installed = true;
    const previous = scene.onBeforeRender;
    scene.onBeforeRender = function lionMaulBeforeRender(...args) {
      previous?.apply(this, args);
      disableDamageVignette();
      const currentRuntime = runtimeHandle();
      const lion = currentRuntime?.enemySystem?.enemies?.find(enemy => enemy?._lionMaulActive && enemy.hp > 0) || null;
      if (currentRuntime?.arena?.paused) return;
      applyPronePlayerPose(currentRuntime, lion);
      if (lion) applyLionMaulPose(lion);
    };
  };

  requestAnimationFrame(tryInstall);
}

installLionMaulPresentation();

export {
  applyLionMaulPose,
  applyPronePlayerPose,
  disableDamageVignette,
  findActorVisual,
  installLionMaulPresentation,
};
