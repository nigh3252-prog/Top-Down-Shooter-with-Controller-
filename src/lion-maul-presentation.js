const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

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

function actorWorldZ(actorPos) {
  if (Number.isFinite(Number(actorPos?.y))) return Number(actorPos.y);
  if (Number.isFinite(Number(actorPos?.z))) return Number(actorPos.z);
  return 0;
}

function findActorVisual(runtime) {
  const actorPos = runtime?.actorPos;
  if (actorVisual?.parent && actorPos) {
    const root = actorVisual.parent;
    const distance = Math.hypot(
      Number(root.position?.x || 0) - Number(actorPos.x || 0),
      Number(root.position?.z || 0) - actorWorldZ(actorPos),
    );
    if (distance < .35) return actorVisual;
  }

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
  actorVisual = actorRoot?.children?.find(child => child?.isGroup) || null;
  return actorVisual;
}

function applyPronePlayerPose(runtime, lion) {
  const visual = findActorVisual(runtime);
  if (!visual) return;
  const progress = clamp(Number(lion?._lionMaulProgress) || 0, 0, 1);
  const impact = Math.exp(-Math.pow((progress - .75) / .11, 2));

  // actorVisual is reset to its upright yaw every player update. A local -90° X turn
  // therefore lays the entire model on its back while preserving its world facing.
  visual.rotateX(-Math.PI * .5);
  visual.rotateZ(.06 + Math.sin(progress * Math.PI * 2) * .025);
  visual.position.y = .10 + impact * .035;
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
      if (!lion || currentRuntime?.arena?.paused) return;
      applyPronePlayerPose(currentRuntime, lion);
    };
  };

  requestAnimationFrame(tryInstall);
}

installLionMaulPresentation();

export { applyPronePlayerPose, disableDamageVignette, findActorVisual, installLionMaulPresentation };
