export const LUGARU_DODGE_DISTANCE_SCALE = 1.5;

export function scaledLugaruDodgeDelta(delta,scale=LUGARU_DODGE_DISTANCE_SCALE){
  const multiplier=Math.max(1,Number(scale)||1);
  return {x:(Number(delta?.x)||0)*multiplier,z:(Number(delta?.z)||0)*multiplier};
}

export function installLugaruDuelistDodgeScale(system,{navigation=null,arenaRadius=18}={}){
  if(!system||typeof system.update!=='function')return system;
  const baseUpdate=system.update.bind(system);
  system.update=function updateWithScaledLugaruDodge(dt,player){
    const before=new Map();
    for(const enemy of system.enemies||[]){
      if(enemy?._lugaruDuelist)before.set(enemy,{x:enemy.x,z:enemy.z,evading:!!enemy._lugaruEvading});
    }
    const result=baseUpdate(dt,player);
    for(const [enemy,start] of before){
      if(!system.enemies.includes(enemy)||(!start.evading&&!enemy._lugaruEvading))continue;
      const delta={x:enemy.x-start.x,z:enemy.z-start.z};
      const extra={x:delta.x*(LUGARU_DODGE_DISTANCE_SCALE-1),z:delta.z*(LUGARU_DODGE_DISTANCE_SCALE-1)};
      if(Math.hypot(extra.x,extra.z)<1e-6)continue;
      let moved={x:enemy.x+extra.x,z:enemy.z+extra.z};
      if(navigation?.resolveMovement)moved=navigation.resolveMovement({x:enemy.x,z:enemy.z},extra,enemy.radius*(system.heightScale||1)*(enemy.collisionScale||1))||moved;
      else{
        const radius=Math.hypot(moved.x,moved.z),limit=Math.max(1,arenaRadius-1.2);
        if(radius>limit)moved={x:moved.x*limit/radius,z:moved.z*limit/radius};
      }
      enemy.x=moved.x;enemy.z=moved.z;
    }
    return result;
  };
  return system;
}
