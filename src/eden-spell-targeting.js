const EPSILON = 1e-6;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function normalizeDirection(direction = {}) {
  const x = Number(direction.x) || 0;
  const z = Number(direction.z) || 0;
  const length = Math.hypot(x, z);
  if (length <= EPSILON) return { x:0, z:-1 };
  return { x:x / length, z:z / length };
}

export function selectSoftTarget({
  enemies = [],
  origin = { x:0, z:0 },
  aim = { x:0, z:-1 },
  maxRange = 14,
  coneDegrees = 38,
} = {}) {
  const direction = normalizeDirection(aim);
  const minimumDot = Math.cos(Math.max(0, Number(coneDegrees) || 0) * Math.PI / 180);
  const range = Math.max(0, Number(maxRange) || 0);
  let best = null;
  let bestScore = Infinity;

  for (const enemy of enemies) {
    if (!enemy || enemy.hp <= 0) continue;
    const dx = (Number(enemy.x) || 0) - (Number(origin.x) || 0);
    const dz = (Number(enemy.z) || 0) - (Number(origin.z) || 0);
    const distance = Math.hypot(dx, dz);
    if (distance <= EPSILON || distance > range + (Number(enemy.radius) || 0)) continue;
    const dot = (dx * direction.x + dz * direction.z) / distance;
    if (dot < minimumDot) continue;
    // Mirrors the arena's alignment-first selection: angle matters much more than distance.
    const score = (1 - dot) * 9 + distance / Math.max(range, EPSILON) * .35;
    if (score < bestScore) {
      best = enemy;
      bestScore = score;
    }
  }
  return best;
}

function wrapPi(angle) {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

export function assistedDirection({
  origin = { x:0, z:0 },
  rawDirection = { x:0, z:-1 },
  target = null,
  strength = .35,
  maxCorrectionDegrees = 12,
} = {}) {
  const raw = normalizeDirection(rawDirection);
  if (!target || target.hp <= 0) return raw;
  const toTarget = normalizeDirection({
    x:(Number(target.x) || 0) - (Number(origin.x) || 0),
    z:(Number(target.z) || 0) - (Number(origin.z) || 0),
  });
  const rawAngle = Math.atan2(raw.x, raw.z);
  const targetAngle = Math.atan2(toTarget.x, toTarget.z);
  const delta = wrapPi(targetAngle - rawAngle);
  const cap = Math.max(0, Number(maxCorrectionDegrees) || 0) * Math.PI / 180;
  const correction = clamp(delta, -cap, cap) * clamp(Number(strength) || 0, 0, 1);
  const angle = rawAngle + correction;
  return { x:Math.sin(angle), z:Math.cos(angle) };
}

export function clampGroundTarget({
  origin = { x:0, z:0 },
  target = origin,
  maxRange = 14,
  minRange = 1.5,
} = {}) {
  const ox = Number(origin.x) || 0;
  const oz = Number(origin.z) || 0;
  const dx = (Number(target.x) || 0) - ox;
  const dz = (Number(target.z) || 0) - oz;
  const length = Math.hypot(dx, dz);
  const minimum = Math.max(0, Number(minRange) || 0);
  const maximum = Math.max(minimum, Number(maxRange) || 0);
  if (length <= EPSILON) return { x:ox, z:oz - minimum };
  const distance = clamp(length, minimum, maximum);
  return { x:ox + dx / length * distance, z:oz + dz / length * distance };
}
