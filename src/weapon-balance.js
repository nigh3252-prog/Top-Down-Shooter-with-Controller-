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
  const actualCost=base*getWeaponStaminaMultiplier(weaponDef);
  const quoteHook=typeof globalThis.__STANCE_SPEND_QUOTE__==='function'?globalThis.__STANCE_SPEND_QUOTE__:null;
  if(!quoteHook)return actualCost;
  try{
    const quote=quoteHook({cost:actualCost,baseCost:base,weaponDef});
    const quoted=Number(quote?.quotedCost);
    return Number.isFinite(quoted)&&quoted>=0?quoted:actualCost;
  }catch(error){
    console.warn('[weapon-balance] stance spend quote failed',error);
    return actualCost;
  }
}

export function weaponAllowsCleave({ weaponDef, attackSlot = -1, maxCharge = false } = {}) {
  const staminaClass = weaponDef?.staminaClass;
  if (!WEAPON_STAMINA_MULTIPLIERS[staminaClass]) {
    throw new Error(`[weapon-balance] Missing or invalid staminaClass: ${JSON.stringify(staminaClass)}`);
  }

  // Stance 2.0 Gate 3 writes an expression mode onto the arena's cloned weapon
  // definition. Outside the nine-pair pilot this field is absent, preserving the
  // original weapon-class cleave behavior exactly.
  const mode=weaponDef?.stance2CleaveMode;
  const group=String(weaponDef?.stance2CurrentAttackGroup||'');
  if(mode==='failed')return false;
  if(mode==='full-light')return attackSlot===2&&maxCharge===true;
  if(mode==='adapted-light')return false;
  if(mode==='full-medium')return group==='horizontal'||group==='vertical';
  if(mode==='adapted-medium')return attackSlot===2&&maxCharge===true;
  if(mode==='full-heavy')return true;
  if(mode==='adapted-heavy')return attackSlot===2&&maxCharge===true;

  if (staminaClass !== 'Light') return true;
  return attackSlot === 2 && maxCharge === true;
}

async function bootStanceRuntimes(){
  if(typeof window==='undefined'||typeof location==='undefined')return;
  if(!/(?:^|\/)combat-arena\.html$/i.test(location.pathname||''))return;
  if(new URLSearchParams(location.search||'').get('capture')==='1')return;
  try{
    const gate2=await import('./stance-gate2-runtime.js');
    gate2.installStanceGate2Runtime({windowRef:window});
    const gate3=await import('./stance-gate3-payoffs.js');
    gate3.installStanceGate3Runtime({windowRef:window});
    const gate4=await import('./stance-gate4-exhaustion.js');
    gate4.installStanceGate4Runtime({windowRef:window});
    const ringSize=await import('./stance-gate4-ring-size.js');
    ringSize.installStanceGate4RingSize({windowRef:window});
  }catch(error){
    console.warn('[stance-2] runtime did not install',error);
  }
}

if(typeof queueMicrotask==='function')queueMicrotask(bootStanceRuntimes);
else if(typeof setTimeout==='function')setTimeout(bootStanceRuntimes,0);
