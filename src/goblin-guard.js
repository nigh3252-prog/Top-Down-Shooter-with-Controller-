const DEFAULT_PROFILE = Object.freeze({
  max:72,
  chance:.64,
  raise:.14,
  hold:.78,
  lower:.16,
  cooldown:1.05,
  breakStun:1.08,
  regenDelay:1.35,
  regenRate:24,
});

export const GOBLIN_GUARD_PROFILES = Object.freeze({
  grunt:Object.freeze({ ...DEFAULT_PROFILE }),
  dagger:Object.freeze({ ...DEFAULT_PROFILE, max:52, chance:.72, raise:.09, hold:.62, lower:.12, cooldown:.82, breakStun:.88, regenRate:28 }),
  mace:Object.freeze({ ...DEFAULT_PROFILE, max:108, chance:.62, raise:.19, hold:.92, cooldown:1.22, breakStun:1.28, regenRate:20 }),
  rock:Object.freeze({ ...DEFAULT_PROFILE, max:64, chance:.56, raise:.15, hold:.70, cooldown:1.12, breakStun:1.02, regenRate:22 }),
  captain:Object.freeze({ ...DEFAULT_PROFILE, max:152, chance:.80, raise:.21, hold:1.02, lower:.20, cooldown:1.28, breakStun:1.48, regenRate:18 }),
});

const UPWARD_ATTACK_KEYS = new Set(['vertical2','vertical7','vertical8','vertical9']);
const HEAVY_WEAPON_PATTERN = /(hammer|mace|axe|great|maul|pile|bunker)/i;
const UPWARD_LABEL_PATTERN = /(rising|upper|upswing|launcher|launch)/i;

export function guardProfileForKind(kind){
  return GOBLIN_GUARD_PROFILES[kind] || DEFAULT_PROFILE;
}

export function isGuardableGoblin(enemy){
  return !!enemy && enemy.hp > 0 && enemy.role === 'goblin' && !enemy.fusion;
}

export function classifyGuardAttack({ attackGroup='', attackKey='', attackLabel='', weaponId='', charged=false, chargeTier=0 } = {}){
  const group = String(attackGroup || '').toLowerCase();
  const key = String(attackKey || '').toLowerCase();
  const label = String(attackLabel || '');
  const upward = UPWARD_ATTACK_KEYS.has(key) || UPWARD_LABEL_PATTERN.test(label);
  const chop = group === 'vertical' && !upward;
  const heavyWeapon = HEAVY_WEAPON_PATTERN.test(String(weaponId || ''));
  let guardMultiplier = group === 'stab' ? .58 : group === 'horizontal' ? .72 : 1;
  let guardClass = group || 'standard';
  if(chop){ guardMultiplier = 1.55; guardClass = 'chop'; }
  if(upward){ guardMultiplier = 2.55; guardClass = 'upward'; }
  if(heavyWeapon) guardMultiplier *= 1.16;
  const tier = Math.max(0, Number(chargeTier) || 0);
  if(charged || tier > 0) guardMultiplier *= 1.20 + Math.min(.65, tier * .22);
  return { guardClass, guardMultiplier, upward, chop, heavyWeapon, charged:!!charged, chargeTier:tier };
}

export function computeGuardDamage({ amount=0, knock={x:0,z:0}, attack={} } = {}){
  const damage = Math.max(0, Number(amount) || 0);
  const impulse = Math.hypot(Number(knock?.x) || 0, Number(knock?.z) || 0);
  const multiplier = Math.max(.1, Number(attack.guardMultiplier) || 1);
  return Math.max(4, Math.round((damage * .72 + impulse * .80 + 3) * multiplier));
}
