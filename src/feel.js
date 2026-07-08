// Hold-to-charge feel continuum — four keyframes (WIMPY → DEFAULT → HAYMAKER →
// CARTOON) on one commitment axis, ported from the Director Punch prototype.
// Data-only: pages own the charge state machine and apply these multipliers to
// the player-combat attack timing/damage.

export const FEEL_PARAMS = [
  { k:'windup',    label:'WINDUP TIME', min:.2, max:3 },
  { k:'strike',    label:'STRIKE TIME', min:.3, max:2 },
  { k:'lunge',     label:'LUNGE STEP',  min:0,  max:3 },
  { k:'recover',   label:'RECOVERY',    min:.3, max:3 },
  { k:'impact',    label:'IMPACT',      min:.2, max:2.5 },
  { k:'dmg',       label:'DAMAGE ×14',  min:1,  max:60 },
  { k:'knock',     label:'KNOCKBACK',   min:0,  max:3 },
  { k:'stun',      label:'STUN SEC',    min:0,  max:1.5 },
];

export const FEEL_KEY_ORDER = ['WIMPY', 'DEFAULT', 'HAYMAKER', 'CARTOON'];

const FEEL_KEY_DEFAULTS = {
  WIMPY:    { windup:.55, strike:.75, lunge:.25, recover:.60, impact:.35, dmg:7,  knock:.25, stun:.06 },
  DEFAULT:  { windup:1,   strike:1,   lunge:1,   recover:1,   impact:1,   dmg:14, knock:.55, stun:.20 },
  HAYMAKER: { windup:1.9, strike:1.1, lunge:1.9, recover:1.5, impact:1.8, dmg:26, knock:1.15, stun:.45 },
  CARTOON:  { windup:2.7, strike:.85, lunge:2.5, recover:2.2, impact:2.2, dmg:40, knock:1.9,  stun:.80 },
};

export function createFeelKeys(){
  const out = {};
  for(const key of FEEL_KEY_ORDER) out[key] = { ...FEEL_KEY_DEFAULTS[key] };
  return out;
}

const clamp01 = t => Math.max(0, Math.min(1, t));

// t in 0..1 across the four keyframes.
export function feelAt(keys, t){
  const x = clamp01(t) * 3, i = Math.min(2, Math.floor(x)), f = x - i;
  const A = keys[FEEL_KEY_ORDER[i]], B = keys[FEEL_KEY_ORDER[i + 1]];
  const out = {};
  for(const p of FEEL_PARAMS) out[p.k] = A[p.k] + (B[p.k] - A[p.k]) * f;
  return out;
}

export function tierName(t){ return t < .22 ? 'WEAK' : t < .52 ? 'REGULAR' : t < .86 ? 'HAYMAKER' : 'CARTOON'; }

// Hold seconds → tier. Taps stay at the DEFAULT keyframe (1/3); a full hold
// reaches CARTOON after ~1.2s.
export function holdToTier(hold){ return 1/3 + (1 - 1/3) * clamp01((hold - .14) / 1.05); }
