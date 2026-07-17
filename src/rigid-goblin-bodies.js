// Local rigid-body adapter used by Pilebunker for retained goblins.
// It preserves the existing model and enemy object while temporarily handing
// movement to a small deterministic capsule simulation.

const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

const DEFAULTS=Object.freeze({
  gravity:20,
  floorBounce:.42,
  wallBounce:.55,
  airDrag:.80,
  groundDrag:.12,
  angularAirDrag:.62,
  angularGroundDrag:.18,
  settleSpeed:1.0,
  settleAngular:1.2,
  settleTime:.42,
  maxTime:4.2,
  recoveryStun:.55,
});

export function installRigidGoblinBodies(system,{THREE,navigation=null,arenaRadius=18}={}){
  if(!system||system._rigidGoblinBodiesInstalled) return system;
  if(!THREE) throw new Error('[rigid-goblins] THREE is required.');
  system._rigidGoblinBodiesInstalled=true;

  const bodies=new Map();
  const baseUpdate=system.update.bind(system);
  const baseDamage=system.damageEnemy.bind(system);
  const baseReset=system.reset.bind(system);
  const baseStart=system.startRoomEncounter?.bind(system);
  const baseClear=system.clearRoomRuntime?.bind(system);
  const axis=new THREE.Vector3();
  const deltaQ=new THREE.Quaternion();

  const isEligible=enemy=>!!enemy&&enemy.hp>0&&enemy.role==='goblin'&&!enemy.fusion&&enemy.root?.isObject3D;
  const markerList=enemy=>[enemy.bar,enemy.barBg,enemy.telegraph,enemy.tokenRing].filter(Boolean);

  function removePivot(body){
    body?.pivot?.parent?.remove(body.pivot);
    bodies.delete(body?.enemy);
  }

  function restore(body,{immediate=false}={}){
    if(!body||!bodies.has(body.enemy)) return;
    const enemy=body.enemy;
    const root=body.root;
    if(!root||enemy.hp<=0){removePivot(body);return;}

    body.pivot.remove(root);
    body.parent?.add(root);
    root.position.set(body.x,0,body.z);
    root.quaternion.copy(body.rootQuaternion);
    root.scale.copy(body.rootScale);
    root.visible=true;
    for(const [marker,visible] of body.markerVisibility) marker.visible=visible;

    enemy.x=body.x;enemy.z=body.z;
    enemy.vx=enemy.vz=enemy.knockX=enemy.knockZ=0;
    enemy.yOff=enemy.vyOff=enemy.spin=enemy.spinVel=0;
    enemy.state='idle';enemy.stateTime=0;enemy.attack=null;enemy.hitDone=false;
    enemy.collisionScale=body.collisionScale;
    enemy.separationScale=body.separationScale;
    if(!immediate) enemy.stunned=Math.max(finite(enemy.stunned),DEFAULTS.recoveryStun);
    removePivot(body);
  }

  function clear(){
    for(const body of [...bodies.values()]) restore(body,{immediate:true});
    bodies.clear();
  }

  function launch(enemy,launch={}){
    if(!isEligible(enemy)) return false;
    const existing=bodies.get(enemy);
    if(existing){
      existing.vx+=finite(launch.velocityX);
      existing.vz+=finite(launch.velocityZ);
      existing.vy=Math.max(existing.vy,finite(launch.verticalVelocity,5.5));
      const spin=finite(launch.spin,7);
      existing.angular.x+=(Math.random()*2-1)*spin*.55;
      existing.angular.y+=(Math.random()*2-1)*spin*.35;
      existing.angular.z+=(Math.random()*2-1)*spin;
      existing.settle=0;
      return true;
    }

    const root=enemy.root,parent=root.parent;
    if(!parent) return false;
    const heightScale=Math.max(.5,finite(system.heightScale,1));
    const centerY=Math.max(1.2,finite(enemy.height,3)*heightScale)*.5;
    const pivot=new THREE.Group();
    pivot.name=`${enemy.kind||'goblin'} rigid capsule pivot`;
    parent.add(pivot);

    const rootQuaternion=root.quaternion.clone();
    const rootScale=root.scale.clone();
    const markers=markerList(enemy);
    const markerVisibility=new Map(markers.map(marker=>[marker,marker.visible]));
    parent.remove(root);pivot.add(root);
    pivot.position.set(enemy.x,centerY,enemy.z);
    pivot.quaternion.copy(rootQuaternion);
    root.position.set(0,-centerY,0);
    root.quaternion.identity();
    root.scale.copy(rootScale);
    for(const marker of markers) marker.visible=false;

    const speed=Math.hypot(finite(launch.velocityX),finite(launch.velocityZ));
    const spin=Math.max(4,finite(launch.spin,7));
    const body={
      enemy,root,parent,pivot,rootQuaternion,rootScale,markerVisibility,centerY,
      radius:Math.max(.62,finite(enemy.radius,1)*heightScale*.82),
      collisionScale:enemy.collisionScale,
      separationScale:enemy.separationScale,
      x:finite(enemy.x),z:finite(enemy.z),airY:0,
      vx:finite(launch.velocityX),vz:finite(launch.velocityZ),
      vy:Math.max(3.5,finite(launch.verticalVelocity,5.5)),
      angular:new THREE.Vector3((Math.random()*2-1)*spin*.6,(Math.random()*2-1)*spin*.35,(Math.random()*2-1||1)*(spin+speed*.15)),
      age:0,settle:0,
    };
    enemy.state='idle';enemy.stateTime=0;enemy.attack=null;enemy.hitDone=false;
    enemy.vx=enemy.vz=enemy.knockX=enemy.knockZ=0;
    enemy.collisionScale=.02;enemy.separationScale=.02;
    enemy.stunned=Math.max(finite(enemy.stunned),.3);
    system.director?.releaseAllForEnemy?.(enemy);
    bodies.set(enemy,body);
    return true;
  }

  function resolveHorizontal(body,step){
    const dx=body.vx*step,dz=body.vz*step;
    const start={x:body.x,z:body.z};
    const desired={x:body.x+dx,z:body.z+dz};
    let moved=desired;
    if(navigation?.resolveMovement){
      moved=navigation.resolveMovement(start,{x:dx,z:dz},body.radius)||desired;
    }else{
      const radius=Math.hypot(desired.x,desired.z),limit=Math.max(1,arenaRadius-body.radius-1);
      if(radius>limit) moved={x:desired.x*limit/radius,z:desired.z*limit/radius};
    }
    const blockedX=desired.x-finite(moved.x,body.x),blockedZ=desired.z-finite(moved.z,body.z);
    const blocked=Math.hypot(blockedX,blockedZ);
    body.x=finite(moved.x,body.x);body.z=finite(moved.z,body.z);
    if(blocked>.008){
      const nx=blockedX/blocked,nz=blockedZ/blocked;
      const into=body.vx*nx+body.vz*nz;
      if(into>0){
        body.vx-=(1+DEFAULTS.wallBounce)*into*nx;
        body.vz-=(1+DEFAULTS.wallBounce)*into*nz;
      }else{
        body.vx*=-DEFAULTS.wallBounce;body.vz*=-DEFAULTS.wallBounce;
      }
      body.angular.x+=nz*3.2;body.angular.z-=nx*3.2;body.settle=0;
    }
  }

  function rotate(body,step){
    const speed=body.angular.length();
    if(speed<1e-5) return;
    axis.copy(body.angular).multiplyScalar(1/speed);
    deltaQ.setFromAxisAngle(axis,speed*step);
    body.pivot.quaternion.premultiply(deltaQ).normalize();
  }

  function updateBody(body,dt){
    const enemy=body.enemy;
    if(!enemy||enemy.hp<=0||!body.root?.parent){removePivot(body);return;}
    const frameDt=clamp(finite(dt),0,.08);
    const steps=clamp(Math.ceil(frameDt/(1/60)),1,5);
    const step=steps?frameDt/steps:0;
    for(let i=0;i<steps;i++){
      body.age+=step;
      resolveHorizontal(body,step);
      body.vy-=DEFAULTS.gravity*step;
      body.airY+=body.vy*step;
      let grounded=false;
      if(body.airY<=0){
        body.airY=0;grounded=true;
        if(body.vy<-1.1){
          body.vy=-body.vy*DEFAULTS.floorBounce;
          body.vx*=.86;body.vz*=.86;body.settle=0;
        }else body.vy=0;
      }
      body.vx*=Math.pow(grounded?DEFAULTS.groundDrag:DEFAULTS.airDrag,step);
      body.vz*=Math.pow(grounded?DEFAULTS.groundDrag:DEFAULTS.airDrag,step);
      body.angular.multiplyScalar(Math.pow(grounded?DEFAULTS.angularGroundDrag:DEFAULTS.angularAirDrag,step));
      rotate(body,step);
      if(grounded&&body.vy===0&&Math.hypot(body.vx,body.vz)<DEFAULTS.settleSpeed&&body.angular.length()<DEFAULTS.settleAngular) body.settle+=step;
      else body.settle=0;
    }
    enemy.x=body.x;enemy.z=body.z;
    enemy.vx=enemy.vz=enemy.knockX=enemy.knockZ=0;
    enemy.yOff=enemy.vyOff=0;
    enemy.stunned=Math.max(finite(enemy.stunned),.25);
    body.root.position.set(0,-body.centerY,0);
    body.root.quaternion.identity();
    body.root.scale.copy(body.rootScale);
    body.pivot.position.set(body.x,body.centerY+body.airY,body.z);
    if(body.settle>=DEFAULTS.settleTime||body.age>=DEFAULTS.maxTime) restore(body);
  }

  function prepare(){
    for(const body of [...bodies.values()]){
      const enemy=body.enemy;
      if(!enemy||enemy.hp<=0){removePivot(body);continue;}
      enemy.x=body.x;enemy.z=body.z;
      enemy.state='idle';enemy.stateTime=0;enemy.attack=null;enemy.hitDone=false;
      enemy.vx=enemy.vz=enemy.knockX=enemy.knockZ=0;
      enemy.collisionScale=.02;enemy.separationScale=.02;
      enemy.stunned=Math.max(finite(enemy.stunned),.3);
    }
  }

  system.update=function updateWithRigidBodies(dt,player){
    prepare();
    baseUpdate(dt,player);
    for(const body of [...bodies.values()]) updateBody(body,dt);
  };
  system.damageEnemy=function damageEnemyWithRigidBodies(enemy,amount,knock={x:0,z:0},opts={}){
    const body=bodies.get(enemy);
    const result=baseDamage(enemy,amount,knock,opts);
    if(!body) return result;
    if(enemy.hp<=0||!enemy.root?.parent){removePivot(body);return result;}
    body.vx+=finite(knock.x)*.65;body.vz+=finite(knock.z)*.65;
    body.vy=Math.max(body.vy,2.8+Math.hypot(finite(knock.x),finite(knock.z))*.12);
    body.angular.x+=(Math.random()*2-1)*2.2;
    body.angular.z+=(Math.random()*2-1)*3.4;
    body.settle=0;
    enemy.knockX=enemy.knockZ=0;
    return result;
  };
  system.reset=function resetWithRigidBodies(){clear();return baseReset();};
  if(baseStart) system.startRoomEncounter=function startWithRigidBodies(roomId){clear();return baseStart(roomId);};
  if(baseClear) system.clearRoomRuntime=function clearWithRigidBodies(){clear();return baseClear();};
  system.launchRigidBody=launch;
  system.isRigidBodyActive=enemy=>bodies.has(enemy);
  Object.defineProperty(system,'rigidBodyCount',{enumerable:true,get:()=>bodies.size});
  return system;
}
