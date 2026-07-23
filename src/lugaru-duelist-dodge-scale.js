export const LUGARU_DODGE_DISTANCE_SCALE = 1.5;

const finite = value => Number.isFinite(Number(value));

export function scaledDodgeExtension(before, after, scale=LUGARU_DODGE_DISTANCE_SCALE){
  const multiplier=Math.max(1,Number(scale)||1)-1;
  const beforeX=Number(before?.x)||0,beforeZ=Number(before?.z)||0;
  const afterX=Number(after?.x)||0,afterZ=Number(after?.z)||0;
  return {x:(afterX-beforeX)*multiplier,z:(afterZ-beforeZ)*multiplier};
}

export function installLugaruDuelistDodgeScale(system,{navigation=null,arenaRadius=18}={},scale=LUGARU_DODGE_DISTANCE_SCALE){
  if(!system||typeof system.update!=='function')return system;
  const baseUpdate=system.update.bind(system);

  system.update=function updateWithLongerLugaruDodge(dt,player){
    const before=new Map();
    for(const enemy of system.enemies||[]){
      if(enemy?._lugaruDuelist&&enemy.hp>0)before.set(enemy,{x:enemy.x,z:enemy.z});
    }

    const result=baseUpdate(dt,player);

    for(const [enemy,start] of before){
      if(!system.enemies.includes(enemy)||enemy.hp<=0||enemy.duelistIntent!=='evade')continue;
      const extension=scaledDodgeExtension(start,{x:enemy.x,z:enemy.z},scale);
      if(Math.hypot(extension.x,extension.z)<=1e-5)continue;
      let moved={x:enemy.x+extension.x,z:enemy.z+extension.z};
      if(navigation?.resolveMovement){
        const radius=(Number(enemy.radius)||1)*(Number(system.heightScale)||1)*(Number(enemy.collisionScale)||1);
        moved=navigation.resolveMovement({x:enemy.x,z:enemy.z},extension,radius)||moved;
      }else{
        const limit=Math.max(1,(Number(arenaRadius)||18)-1.2);
        const r=Math.hypot(moved.x,moved.z);
        if(r>limit)moved={x:moved.x*limit/r,z:moved.z*limit/r};
      }
      enemy.x=finite(moved.x)?moved.x:enemy.x;
      enemy.z=finite(moved.z)?moved.z:enemy.z;
      if(enemy.root?.position){enemy.root.position.x=enemy.x;enemy.root.position.z=enemy.z;}
      enemy.duelistDodgeScale=scale;
    }
    return result;
  };

  return system;
}
