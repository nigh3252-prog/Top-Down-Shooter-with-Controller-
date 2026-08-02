// Shared weapon-class stamina, cleave, and focused rapier tuning rules.

export const WEAPON_STAMINA_MULTIPLIERS = Object.freeze({
  Light: 0.5,
  Medium: 1.0,
  Heavy: 1.5,
});

export const RAPIER_TIP_TUNING = Object.freeze({
  from: 0.92,
  to: 1.04,
  radius: 0.11,
  damage: 36,
  stagger: 0.50,
});

export function getWeaponStaminaMultiplier(weaponDef) {
  const staminaClass = weaponDef?.staminaClass;
  const multiplier = WEAPON_STAMINA_MULTIPLIERS[staminaClass];
  if (!Number.isFinite(multiplier)) {
    throw new Error(`[weapon-balance] Missing or invalid staminaClass: ${JSON.stringify(staminaClass)}`);
  }
  return multiplier;
}

export function staminaCostForWeapon(baseCost, weaponDef) {
  const base = Number(baseCost);
  if (!Number.isFinite(base)) throw new Error(`[weapon-balance] Invalid base stamina cost: ${JSON.stringify(baseCost)}`);
  return base * getWeaponStaminaMultiplier(weaponDef);
}

export function weaponAllowsCleave({ weaponDef, attackSlot = -1, maxCharge = false } = {}) {
  const staminaClass = weaponDef?.staminaClass;
  if (!WEAPON_STAMINA_MULTIPLIERS[staminaClass]) {
    throw new Error(`[weapon-balance] Missing or invalid staminaClass: ${JSON.stringify(staminaClass)}`);
  }
  if (staminaClass !== 'Light') return true;
  return attackSlot === 2 && maxCharge === true;
}
