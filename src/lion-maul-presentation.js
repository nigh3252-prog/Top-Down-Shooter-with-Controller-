const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smooth01 = value => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

let installed = false;
let actorVisual = null;

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

function findActorVisual(runtime) {
  if (actorVisual?.parent) return actorVisual;
  const enemyGroup = runtime?.enemySystem?.group;
  const worldRoot = enemyGroup?.parent;
  const mazeGroup = runtime?.mazeWorld?.group;
  if (!worldRoot) return null;

  const actorRoot = worldRoot.children.find(child =>
    child?.isGroup &&
    child !== enemyGroup &&
    child !== mazeGroup &&
    child.children?.some(grandchild => grandchild?.isGroup)
  );
  actorVisual = actorRoot?.children?.find(child => child?.isGroup) || null;
  return actorVisual;
}

function biteShape(progress) {
  const p = clamp(Number(progress) || 0, 0, 1);
  const braceIn = smooth01(p / .24);
  const braceOut = 1 - smooth01((p - .88) / .12);
  const brace = braceIn * braceOut;
  const snap = Math.exp(-Math.pow((p - .74) / .105, 2));
  const shake = Math.sin(p * Math.PI * 2) * brace * (1 - snap * .35);
  return { p, brace, snap, shake };
}

function applyPronePlayerPose(runtime, lion) {
  const visual = findActorVisual(runtime);
  if (!visual) return;
  const { p, snap } = biteShape(lion?._lionMaulProgress);

  // The regular player update restores the standing transform each frame. Applying
  // this immediately before render makes the whole character lie flat only while pinned.
  visual.rotateX(-Math.PI * .47);
  visual.rotateZ(.10 + Math.sin(p * Math.PI * 2) * .035);
  visual.position.y = .24 + snap * .055;
}

function applyLionMaulPose(lion) {
  const body = lion?.fusionVisual?.model?.chassis?.body;
  const socket = lion?.fusionVisual?.model?.chassis?.socket;
  if (!body && !socket) return;
  const { p, brace, snap, shake } = biteShape(lion._lionMaulProgress);

  // The authored maul pose already opens the jaw. This pass makes the animal read as
  // planted over its prey: shoulders low, forequarters braced, and the head sawing
  // side-to-side before snapping down on each bite.
  if (body) {
    body.position.y -= .44 * brace;
    body.rotation.x += .24 * brace + .20 * snap;
    body.rotation.y += shake * .09;
    body.rotation.z += Math.sin(p * Math.PI * 4) * .055 * brace;
  }
  if (socket) {
    socket.rotation.x -= .28 * brace + .52 * snap;
    socket.rotation.y += shake * .48;
    socket.rotation.z += Math.sin(p * Math.PI * 4) * .14 * brace;
    socket.position.y -= .08 * brace;
    socket.position.z += .15 * brace;
  }
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
      const lion = currentRuntime?.enemySystem?.enemies?.find(enemy => enemy?._lionMaulActive && enemy.hp > 0);
      if (!lion) return;
      applyPronePlayerPose(currentRuntime, lion);
      applyLionMaulPose(lion);
    };
  };

  requestAnimationFrame(tryInstall);
}

installLionMaulPresentation();

export { applyLionMaulPose, applyPronePlayerPose, disableDamageVignette, installLionMaulPresentation };
