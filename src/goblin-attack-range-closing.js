// Keeps a director-approved melee enemy moving until the *next* authored attack is
// actually legal. The base enemy code parks real-combat goblins at a hold distance
// derived from the longest move in their set, while chooseAttack() checks only the
// current move. A shorter next move can therefore leave the enemy orbiting forever
// just outside its own attack threshold.

export const GOBLIN_ARENA_SCALE = 4.3;
export const GOBLIN_ATTACK_TRIGGER_PADDING = .22 * GOBLIN_ARENA_SCALE;
export const GOBLIN_PERMITTED_MOVE_DEADBAND = .45 * GOBLIN_ARENA_SCALE;
export const GOBLIN_RANGE_HANDSHAKE_EPSILON = .04;

const finite = value => Number.isFinite(Number(value));

export function nextAuthoredMeleeAttack(enemy){
  if(!enemy?.useRealCombat || !Array.isArray(enemy.realAttacks) || !enemy.realAttacks.length) return null;
  const index = Math.max(0, Math.floor(Number(enemy.combatAttackIndex) || 0)) % enemy.realAttacks.length;
  const attack = enemy.realAttacks[index];
  if(!attack || attack.kind === 'ranged' || !finite(attack.range)) return null;
  return attack;
}

export function attackReadyHoldDistance(
  attackRange,
  {
    triggerPadding = GOBLIN_ATTACK_TRIGGER_PADDING,
    movementDeadband = GOBLIN_PERMITTED_MOVE_DEADBAND,
    epsilon = GOBLIN_RANGE_HANDSHAKE_EPSILON,
  } = {},
){
  const range = Math.max(0, Number(attackRange) || 0);
  // Base movement closes while distance > holdDist + movementDeadband.
  // Base attack selection succeeds at distance <= range + triggerPadding.
  // Make those two boundaries meet, with a tiny inward bias for float/collision noise.
  return Math.max(.05, range + triggerPadding - movementDeadband - Math.max(0, epsilon));
}

function isEligibleMelee(system, enemy, options={}){
  if(!enemy || enemy.hp <= 0 || enemy.fusion || enemy.thrower) return false;
  const originalGoblin = enemy.role === 'goblin';
  const includedDuelist = !!options.includeDuelists && !!enemy._lugaruDuelist;
  if(!originalGoblin && !includedDuelist) return false;
  if(enemy.state !== 'idle' || (enemy.stunned || 0) > 0 || system.isRigidBodyActive?.(enemy)) return false;
  const permit = system.director?.hasApproachPermit?.(enemy);
  return permit === undefined
    ? !!(enemy.approachPermit || enemy.directEngaged || includedDuelist)
    : !!permit;
}

export function installGoblinAttackRangeClosing(system, options = {}){
  if(!system || typeof system.update !== 'function') return system;
  const baseUpdate = system.update.bind(system);

  system.update = function updateWithAttackRangeHandshake(dt, player){
    const restore = [];
    for(const enemy of system.enemies || []){
      if(!isEligibleMelee(system, enemy, options)) continue;
      const attack = nextAuthoredMeleeAttack(enemy);
      if(!attack) continue;

      const originalHold = enemy.holdDist;
      const originalStop = enemy.stop;
      const attackHold = attackReadyHoldDistance(attack.range, options);
      const temporaryHold = finite(originalHold) ? Math.min(Number(originalHold), attackHold) : attackHold;
      const temporaryStop = finite(originalStop) ? Math.min(Number(originalStop), temporaryHold) : temporaryHold;

      restore.push({ enemy, originalHold, originalStop });
      enemy.holdDist = temporaryHold;
      enemy.stop = temporaryStop;
      enemy.attackReadyRange = Number(attack.range) + (options.triggerPadding ?? GOBLIN_ATTACK_TRIGGER_PADDING);
      enemy.attackReadyHoldDist = temporaryHold;
      enemy.attackReadyAttack = attack.attackKey || attack.name || enemy.attackId || 'melee';
    }

    try{
      return baseUpdate(dt, player);
    }finally{
      for(const item of restore){
        item.enemy.holdDist = item.originalHold;
        item.enemy.stop = item.originalStop;
      }
    }
  };

  return system;
}
