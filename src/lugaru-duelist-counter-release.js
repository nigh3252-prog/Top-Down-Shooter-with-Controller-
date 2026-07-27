export const LUGARU_COUNTER_RELEASE_WINDOW = .34;
export const LUGARU_POSE_LOCK_STUN_MAX = .085;

export function shouldReleaseLugaruPoseLock(enemy){
  if(!enemy?._lugaruDuelist) return false;
  if((Number(enemy._lugaruCounterReleaseT)||0) <= 0) return false;
  const stun = Number(enemy.stunned)||0;
  return stun > 0 && stun <= LUGARU_POSE_LOCK_STUN_MAX;
}

export function installLugaruDuelistCounterRelease(system){
  if(!system) return system;
  const baseUpdate = system.update?.bind(system);
  const baseDamageEnemy = system.damageEnemy?.bind(system);
  const baseReset = system.reset?.bind(system);
  const baseStartRoomEncounter = system.startRoomEncounter?.bind(system);
  const baseClearRoomRuntime = system.clearRoomRuntime?.bind(system);

  if(baseDamageEnemy){
    system.damageEnemy = function damageEnemyWithCounterRelease(enemy,...args){
      const previousBlock = enemy?.duelistLastBlock;
      const result = baseDamageEnemy(enemy,...args);
      const nextBlock = enemy?.duelistLastBlock;
      if(enemy?._lugaruDuelist && nextBlock?.blocked && nextBlock !== previousBlock){
        enemy._lugaruCounterReleaseT = LUGARU_COUNTER_RELEASE_WINDOW;
      }
      return result;
    };
  }

  if(baseUpdate){
    system.update = function updateWithCounterRelease(dt,player){
      for(const enemy of system.enemies || []){
        const remaining = Number(enemy?._lugaruCounterReleaseT)||0;
        if(remaining <= 0) continue;
        if(shouldReleaseLugaruPoseLock(enemy)) enemy.stunned = 0;
        enemy._lugaruCounterReleaseT = Math.max(0,remaining-Math.max(0,Number(dt)||0));
      }
      return baseUpdate(dt,player);
    };
  }

  const clearReleaseWindows = ()=>{
    for(const enemy of system.enemies || []) enemy._lugaruCounterReleaseT = 0;
  };
  if(baseReset) system.reset = function resetCounterRelease(){ clearReleaseWindows(); return baseReset(); };
  if(baseStartRoomEncounter) system.startRoomEncounter = function startCounterReleaseRoom(roomId){ clearReleaseWindows(); return baseStartRoomEncounter(roomId); };
  if(baseClearRoomRuntime) system.clearRoomRuntime = function clearCounterReleaseRoom(){ clearReleaseWindows(); return baseClearRoomRuntime(); };

  return system;
}
