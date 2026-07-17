// Compatibility adapter retained for the branch-local player-combat wrapper.
// Attack executions now live entirely in combat-card-effects.js; this module no
// longer wraps hooks or mutates authored attack definitions.
const TRANSIENT_ATTACK_KEYS=Object.freeze([
  '__bloodSlashBoosted','__bloodSlashSpent','__bingBongPrimaries','__combatSwingId',
]);

export function clearTransientAttackState(attack){
  if(!attack||typeof attack!=='object')return attack;
  for(const key of TRANSIENT_ATTACK_KEYS)delete attack[key];
  return attack;
}

export function createCombatSwingInstance(authoredAttack){
  if(!authoredAttack||typeof authoredAttack!=='object')return null;
  return clearTransientAttackState({...authoredAttack});
}

export function installCombatSwingInstances({PC,cardEffects}={}){
  for(const attack of Object.values(PC?.ATTACKS||{}))clearTransientAttackState(attack);
  return{
    state:cardEffects?.state||{},
    update(){},
    isCurrentBoosted(){return!!cardEffects?.isBloodSlashEmpowered?.();},
  };
}
