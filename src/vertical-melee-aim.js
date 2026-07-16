// Small, deterministic helpers for the arena's vertical melee aim assist.
// The runtime wrapper owns THREE transforms; this module keeps target selection
// and correction math testable without a renderer.

export const VERTICAL_AIM_GROUPS = Object.freeze(new Set(['horizontal', 'stab']));

export function isVerticalAimGroup(group) {
  return VERTICAL_AIM_GROUPS.has(group);
}

export function wrapAngle(angle) {
  let value = Number(angle) || 0;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

export function enemyAimCenterY(enemy, heightScale = 1) {
  if (!enemy) return 0;
  const scale = Math.max(0.01, Number(heightScale) || 1);
  const targetScale = Math.max(0.01, Number(enemy.currentTargetScale ?? enemy.targetScale ?? 1) || 1);
  const baseHeight = Math.max(0.1, Number(enemy.height) || (Number(enemy.radius) || 1) * 2);
  return (Number(enemy.targetYOffset) || 0) + baseHeight * scale * targetScale * 0.52;
}

export function selectVerticalAimTarget({
  enemies,
  playerX,
  playerZ,
  committedYaw,
  heightScale = 1,
  maxDistance = 16,
  maxAngle = 0.38,
} = {}) {
  let best = null;
  let bestScore = Infinity;
  const px = Number(playerX) || 0;
  const pz = Number(playerZ) || 0;
  const yaw = Number(committedYaw) || 0;
  const distanceLimit = Math.max(0.1, Number(maxDistance) || 16);
  const angleLimit = Math.max(0.01, Number(maxAngle) || 0.38);

  for (const enemy of Array.isArray(enemies) ? enemies : []) {
    if (!enemy || Number(enemy.hp) <= 0) continue;
    const dx = (Number(enemy.x) || 0) - px;
    const dz = (Number(enemy.z) || 0) - pz;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.01 || distance > distanceLimit) continue;
    const angleError = Math.abs(wrapAngle(Math.atan2(dx, dz) - yaw));
    if (angleError > angleLimit) continue;

    // Facing agreement matters most; distance breaks ties between enemies in the cone.
    const score = angleError / angleLimit * 0.78 + distance / distanceLimit * 0.22;
    if (score >= bestScore) continue;
    bestScore = score;
    best = {
      enemy,
      targetY: enemyAimCenterY(enemy, heightScale),
      distance,
      angleError,
    };
  }
  return best;
}

export function correctionForSegmentY(targetY, aY, bY, maxOffset) {
  const target = Number(targetY) || 0;
  const low = Math.min(Number(aY) || 0, Number(bY) || 0);
  const high = Math.max(Number(aY) || 0, Number(bY) || 0);
  const nearest = Math.min(high, Math.max(low, target));
  const cap = Math.max(0, Number(maxOffset) || 0);
  const raw = Math.min(cap, Math.max(-cap, target - nearest));
  return Math.abs(raw) < 0.06 ? 0 : raw;
}

export function verticalAimPhaseWeight({ t, contactAt, total } = {}) {
  const now = Math.max(0, Number(t) || 0);
  const contact = Math.max(0.001, Number(contactAt) || 0.001);
  const duration = Math.max(contact + 0.001, Number(total) || contact + 0.001);
  const smooth = value => {
    const x = Math.min(1, Math.max(0, value));
    return x * x * (3 - 2 * x);
  };
  const windup = smooth(now / Math.max(0.001, contact * 0.82));
  const fadeStart = contact + (duration - contact) * 0.48;
  const recovery = 1 - smooth((now - fadeStart) / Math.max(0.001, duration - fadeStart));
  return Math.min(1, Math.max(0, windup * recovery));
}
