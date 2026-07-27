export const LUGARU_COUNTER_RELEASE_WINDOW = .34;
export const LUGARU_POSE_LOCK_STUN_MAX = .085;

export function shouldReleaseLugaruPoseLock(enemy){
  if(!enemy?._lugaruDuelist) return false;
  if((Number(enemy.duelistCounterReleaseT)||0)<=0) return false;
  const stun=Math.max(0,Number(enemy.stunned)||0);
  return stun>0&&stun<=LUGARU_POSE_LOCK_STUN_MAX;
}

export function installLugaruDuelistCounterRelease(system){
  if(!system||typeof system.update!=='function')return system;
  const baseUpdate=system.update.bind(system);
  system.update=function updateWithLugaruCounterRelease(dt,player){
    for(const enemy of system.enemies||[]){
      if(!enemy?._lugaruDuelist)continue;
      enemy.duelistCounterReleaseT=Math.max(0,(Number(enemy.duelistCounterReleaseT)||0)-dt);
      if(shouldReleaseLugaruPoseLock(enemy))enemy.stunned=0;
    }
    return baseUpdate(dt,player);
  };
  return system;
}
