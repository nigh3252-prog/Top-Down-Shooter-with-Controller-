const EPSILON = 1e-6;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function readVector(value) {
  return {
    x: Number(value?.x) || 0,
    y: Number(value?.y) || 0,
    z: Number(value?.z) || 0,
  };
}

function writeVector(target, value) {
  if (typeof target?.set === 'function') target.set(value.x, value.y, value.z);
  else if (target) Object.assign(target, value);
}

function normalize(value) {
  const length = Math.hypot(value.x, value.y, value.z);
  if (length <= EPSILON) return { x: 0, y: 1, z: 0 };
  return { x: value.x / length, y: value.y / length, z: value.z / length };
}

export function raisedDirection(direction, amount = 0) {
  const source = normalize(readVector(direction));
  const y = clamp(source.y + (Number(amount) || 0), -1, 1);
  const horizontalLength = Math.hypot(source.x, source.z);
  const horizontalScale = Math.sqrt(Math.max(0, 1 - y * y));
  if (horizontalLength <= EPSILON) return { x: 0, y, z: horizontalScale };
  return {
    x: source.x / horizontalLength * horizontalScale,
    y,
    z: source.z / horizontalLength * horizontalScale,
  };
}

export function groundClearanceViolation(minY, { groundY = 0, clearance = 0.05 } = {}) {
  const actual = Number(minY);
  const targetY = (Number(groundY) || 0) + Math.max(0, Number(clearance) || 0);
  if (!Number.isFinite(actual)) return { targetY, violation: 0, safe: false };
  const violation = Math.max(0, targetY - actual);
  return { targetY, violation, safe: violation <= EPSILON };
}

/**
 * Keep a procedural weapon envelope above a floor without changing weapon
 * length. `applyPose` must place the candidate pose in the scene, and
 * `measureMinY` must return the resulting world-space lowest point.
 */
export function enforceGroundClearance({
  pose,
  groundY = 0,
  clearance = 0.05,
  holdScale = 1,
  allowTipCorrection = true,
  maxTipRaise = 0.58,
  tipSteps = 5,
  liftIterations = 3,
  applyPose,
  measureMinY,
} = {}) {
  const noOp = {
    corrected: false,
    minY: Number.NaN,
    targetY: (Number(groundY) || 0) + Math.max(0, Number(clearance) || 0),
    tipRaise: 0,
    gripLift: 0,
  };
  if (!pose?.hold || !pose?.tip || typeof applyPose !== 'function' || typeof measureMinY !== 'function') return noOp;

  const targetY = (Number(groundY) || 0) + Math.max(0, Number(clearance) || 0);
  applyPose();
  let minY = Number(measureMinY());
  if (!Number.isFinite(minY)) return { ...noOp, minY, targetY };
  if (minY >= targetY - EPSILON) return { ...noOp, minY, targetY };

  const originalTip = readVector(pose.tip);
  let bestTip = { ...originalTip };
  let bestMinY = minY;
  let bestTipRaise = 0;
  const steps = Math.max(0, Math.floor(Number(tipSteps) || 0));

  if (allowTipCorrection && Number(maxTipRaise) > 0 && steps > 0) {
    for (let index = 1; index <= steps; index += 1) {
      const tipRaise = Number(maxTipRaise) * index / steps;
      writeVector(pose.tip, raisedDirection(originalTip, tipRaise));
      applyPose();
      const candidateMinY = Number(measureMinY());
      if (!Number.isFinite(candidateMinY)) continue;
      if (candidateMinY > bestMinY) {
        bestMinY = candidateMinY;
        bestTip = readVector(pose.tip);
        bestTipRaise = tipRaise;
      }
      if (candidateMinY >= targetY - EPSILON) {
        return {
          corrected: true,
          minY: candidateMinY,
          targetY,
          tipRaise,
          gripLift: 0,
        };
      }
    }
    writeVector(pose.tip, bestTip);
    applyPose();
    minY = bestMinY;
  }

  let gripLift = 0;
  const iterations = Math.max(1, Math.floor(Number(liftIterations) || 1));
  const scale = Math.max(EPSILON, Number(holdScale) || 1);
  for (let index = 0; index < iterations; index += 1) {
    const violation = Math.max(0, targetY - minY);
    if (violation <= EPSILON) break;
    const poseLift = violation / scale;
    pose.hold.y += poseLift;
    gripLift += poseLift;
    applyPose();
    const nextMinY = Number(measureMinY());
    if (!Number.isFinite(nextMinY)) break;
    minY = nextMinY;
  }

  return {
    corrected: bestTipRaise > 0 || gripLift > 0,
    minY,
    targetY,
    tipRaise: bestTipRaise,
    gripLift,
  };
}
