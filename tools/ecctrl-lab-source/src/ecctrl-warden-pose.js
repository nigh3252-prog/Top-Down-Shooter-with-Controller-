export const ECCTRL_ATTACK_SEQUENCE = Object.freeze([
  Object.freeze({ key: 'vertical5', group: 'vertical', shortLabel: 'OVERHEAD' }),
  Object.freeze({ key: 'horizontal', group: 'horizontal', shortLabel: 'CROSSCUT' }),
  Object.freeze({ key: 'stab', group: 'stab', shortLabel: 'THRUST' }),
]);

export function attackSpecAt(index = 0) {
  const length = ECCTRL_ATTACK_SEQUENCE.length;
  const normalized = ((Math.trunc(Number(index) || 0) % length) + length) % length;
  return ECCTRL_ATTACK_SEQUENCE[normalized];
}

function planar(vector, fallback = { x: 0, z: 0 }) {
  if (!vector) return fallback;
  return {
    x: Number(vector.x) || 0,
    z: Number(vector.z) || 0,
  };
}

export function chooseCombatFacing({ aim, move, forward } = {}) {
  for (const candidate of [aim, move, forward]) {
    const value = planar(candidate);
    const magnitude = Math.hypot(value.x, value.z);
    if (magnitude > 0.12) {
      return Object.freeze({ x: value.x / magnitude, z: value.z / magnitude });
    }
  }
  return Object.freeze({ x: 0, z: 1 });
}

export function wardenPoseDelta(pose, idle) {
  const p = pose || {};
  const base = idle || {};
  return {
    twist: (Number(p.twist) || 0) - (Number(base.twist) || 0),
    pitch: (Number(p.pitch) || 0) - (Number(base.pitch) || 0),
    lean: (Number(p.lean) || 0) - (Number(base.lean) || 0),
    hipTwist: (Number(p.hipTwist) || 0) - (Number(base.hipTwist) || 0),
    lower: (Number(p.lower) || 0) - (Number(base.lower) || 0),
    lunge: (Number(p.lunge) || 0) - (Number(base.lunge) || 0),
    hipX: (Number(p.hip?.x) || 0) - (Number(base.hip?.x) || 0),
    hipZ: (Number(p.hip?.z) || 0) - (Number(base.hip?.z) || 0),
    headX: (Number(p.head?.x) || 0) - (Number(base.head?.x) || 0),
    headY: (Number(p.head?.y) || 0) - (Number(base.head?.y) || 0),
  };
}
