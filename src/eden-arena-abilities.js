import { EDEN_SPELLS, EDEN_SPELL_BY_ID, spellManaCost } from './eden-spell-catalog.js';
import { createEdenSpellRuntime } from './eden-spell-runtime.js';
import { assistedDirection, clampGroundTarget, normalizeDirection, selectSoftTarget } from './eden-spell-targeting.js';

const CELL_SIZE = 1.8;
const AIM_CONE_DEGREES = 38;
const EPSILON = 1e-6;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function isEnemyLabRuntime(){
  if(typeof window==='undefined'||typeof document==='undefined')return false;
  try{
    const params=new URLSearchParams(location.search||'');
    if(params.get('enemyLab')==='1'||params.get('mode')==='enemy-lab')return true;
    return window.parent!==window&&window.frameElement?.id==='arenaFrame'&&/(?:^|\/)enemy-lab\.html$/i.test(window.parent.location?.pathname||'');
  }catch{return false;}
}

function segmentsIntersect(a,b,c,d){
  const rx=b.x-a.x,rz=b.z-a.z,sx=d.x-c.x,sz=d.z-c.z,cross=rx*sz-rz*sx;
  if(Math.abs(cross)<1e-8)return false;
  const qx=c.x-a.x,qz=c.z-a.z,t=(qx*sz-qz*sx)/cross,u=(qx*rz-qz*rx)/cross;
  return t>=0&&t<=1&&u>=0&&u<=1;
}

function blockedByWalls(start,end,walls=[]){
  return walls.some(wall=>wall?.a&&wall?.b&&segmentsIntersect(start,end,wall.a,wall.b));
}

function clonePlan(plan){
  try{return plan?JSON.parse(JSON.stringify(plan)):null;}catch{return null;}
}

function disposeObject(object){
  if(!object)return;
  object.parent?.remove(object);
  object.traverse?.(child=>{
    child.geometry?.dispose?.();
    if(Array.isArray(child.material))child.material.forEach(material=>material?.dispose?.());
    else child.material?.dispose?.();
    child.material?.map?.dispose?.();
  });
}

export function installEdenArenaAbilities({
  THREE,
  scene,
  PC,
  getPlayer,
  getActorRoot,
  getActorVisual,
  getYawQuaternion,
  getEnemySystem,
  getMazeSegments=()=>[],
}={}){
  if(!isEnemyLabRuntime())return null;
  if(!THREE||!scene||!PC||typeof getPlayer!=='function'||typeof getEnemySystem!=='function'){
    console.error('[eden-arena] Missing required arena hooks.');
    return null;
  }

  const state={
    selectedId:EDEN_SPELLS[0].id,
    assist:true,
    manaMode:'normal',
    active:null,
    lastPlan:null,
    padInside:false,
    padCooldown:0,
    gamepadHeld:false,
    disposed:false,
  };
  const projectiles=[];
  const grounds=[];
  const strikes=[];
  const scheduled=[];
  const frostVisuals=new Map();
  const pressedKeys=new Set();
  const touchAim={id:null,startX:0,startY:0,x:0,z:0};
  const aimQuaternion=new THREE.Quaternion();
  const yAxis=new THREE.Vector3(0,1,0);
  let patchedEnemySystem=null;
  let originalStartLabScenario=null;
  let originalClearRoomRuntime=null;
  let respawnPad=null;
  let preview=null;
  let noticeTimer=0;

  const selectedCard=()=>EDEN_SPELL_BY_ID[state.selectedId]||EDEN_SPELLS[0];
  const aliveEnemies=()=>[...(getEnemySystem()?.enemies||[])].filter(enemy=>enemy&&enemy.hp>0);
  const playerPoint=()=>{
    const value=getPlayer()||{};
    return{x:Number(value.x)||0,z:Number(value.z)||0,forwardX:Number(value.forwardX)||0,forwardZ:Number(value.forwardZ)||1};
  };

  function announce(text,duration=.9){
    const node=document.getElementById('edenNotice');
    if(!node)return;
    node.textContent=String(text||'');
    node.classList.add('on');
    clearTimeout(noticeTimer);
    noticeTimer=setTimeout(()=>node.classList.remove('on'),duration*1000);
  }

  function dealDamage(enemy,amount,options={}){
    const system=getEnemySystem();
    if(!enemy||enemy.hp<=0||!system)return;
    const player=playerPoint();
    const dx=(enemy.x||0)-player.x,dz=(enemy.z||0)-player.z,length=Math.hypot(dx,dz)||1;
    if(typeof system.damageEnemy==='function'){
      system.damageEnemy(enemy,amount,{x:dx/length,z:dz/length},{source:'edenSpell',status:options.status||'eden'});
    }else enemy.hp=Math.max(0,enemy.hp-amount);
  }

  function schedule(delay,action){scheduled.push({remaining:Math.max(0,Number(delay)||0),action});}

  function spawnProjectile(spec){
    const direction=normalizeDirection(spec.direction);
    const geometry=new THREE.IcosahedronGeometry(spec.radius||.24,1);
    const material=new THREE.MeshBasicMaterial({color:spec.color||0xffffff,transparent:true,opacity:.96});
    const mesh=new THREE.Mesh(geometry,material);
    mesh.position.set(spec.origin.x,1.05,spec.origin.z);
    mesh.renderOrder=3;
    scene.add(mesh);
    projectiles.push({
      x:spec.origin.x,z:spec.origin.z,direction,speed:spec.speed||18,life:2.25,
      radius:spec.radius||.24,mesh,onHit:spec.onHit,
    });
  }

  function spawnStrike(spec){
    const ring=new THREE.Mesh(
      new THREE.RingGeometry(.72,1,36),
      new THREE.MeshBasicMaterial({color:spec.color||0xfff2a0,transparent:true,opacity:.92,side:THREE.DoubleSide,depthWrite:false})
    );
    ring.rotation.x=-Math.PI/2;
    ring.position.set(spec.point.x,.1,spec.point.z);
    scene.add(ring);
    strikes.push({mesh:ring,age:0,life:.38});
    for(const enemy of aliveEnemies()){
      const allowance=(enemy.radius||1)*(getEnemySystem()?.heightScale||1);
      if(Math.hypot(enemy.x-spec.point.x,enemy.z-spec.point.z)<=spec.radius+allowance){
        spec.damageEnemy(enemy,spec.damage);
        enemy.flash=Math.max(enemy.flash||0,.12);
      }
    }
  }

  function flameAt(point,duration,damageEnemy){
    const mesh=new THREE.Mesh(
      new THREE.CircleGeometry(.7,20),
      new THREE.MeshBasicMaterial({color:0xff6b2f,transparent:true,opacity:.62,side:THREE.DoubleSide,depthWrite:false})
    );
    mesh.rotation.x=-Math.PI/2;
    mesh.position.set(point.x,.07,point.z);
    scene.add(mesh);
    grounds.push({x:point.x,z:point.z,radius:.82,remaining:duration,tick:0,phase:Math.random()*6,mesh,damageEnemy});
  }

  function patternPoints(spec){
    const frame=spec.frame;
    const center=frame.targetPoint||frame.toWorld(spec.forward||0,0);
    const forward=normalizeDirection(frame.forward);
    const right={x:-forward.z,z:forward.x};
    if(spec.pattern==='single')return[spec.point||center];
    if(spec.pattern==='column'){
      const points=[];
      for(let lateral=-spec.halfWidth;lateral<=spec.halfWidth;lateral++){
        points.push({x:center.x+right.x*lateral*CELL_SIZE,z:center.z+right.z*lateral*CELL_SIZE});
      }
      return points;
    }
    if(spec.pattern==='ring'){
      return [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]].map(([f,l])=>({
        x:center.x+forward.x*f*CELL_SIZE+right.x*l*CELL_SIZE,
        z:center.z+forward.z*f*CELL_SIZE+right.z*l*CELL_SIZE,
      }));
    }
    return[center];
  }

  function spawnGround(spec){
    for(const point of patternPoints(spec))flameAt(point,spec.duration||6,spec.damageEnemy);
  }

  const runtime=createEdenSpellRuntime({
    getEnemies:aliveEnemies,
    dealDamage,
    spawnProjectile,
    spawnStrike,
    spawnGround,
    announce,
    schedule,
  });

  function clearFrostVisuals(){
    for(const entry of frostVisuals.values())disposeObject(entry.group);
    frostVisuals.clear();
  }

  function clearEffects({resetResources=false}={}){
    for(const projectile of projectiles)disposeObject(projectile.mesh);
    projectiles.length=0;
    for(const ground of grounds)disposeObject(ground.mesh);
    grounds.length=0;
    for(const strike of strikes)disposeObject(strike.mesh);
    strikes.length=0;
    scheduled.length=0;
    clearFrostVisuals();
    for(const enemy of getEnemySystem()?.enemies||[]){
      if(enemy?.statuses)enemy.statuses.frost=0;
    }
    cancelCast(false);
    if(resetResources)runtime.reset();
    syncHud();
  }

  function patchSystem(){
    const system=getEnemySystem();
    if(!system||system===patchedEnemySystem)return;
    patchedEnemySystem=system;
    originalStartLabScenario=typeof system.startLabScenario==='function'?system.startLabScenario.bind(system):null;
    originalClearRoomRuntime=typeof system.clearRoomRuntime==='function'?system.clearRoomRuntime.bind(system):null;
    if(originalStartLabScenario){
      system.startLabScenario=function edenStartLabScenario(roomId,plan){
        state.lastPlan=clonePlan(plan)||state.lastPlan;
        clearEffects({resetResources:true});
        return originalStartLabScenario(roomId,plan);
      };
    }
    if(originalClearRoomRuntime){
      system.clearRoomRuntime=function edenClearRoomRuntime(){
        clearEffects();
        return originalClearRoomRuntime();
      };
    }
  }

  function repeatCurrentTest(){
    patchSystem();
    const system=getEnemySystem();
    const plan=state.lastPlan||clonePlan(system?.currentEncounterPlan);
    if(!system||!plan||typeof system.startLabScenario!=='function'){
      announce('RUN A TEST FIRST');
      return false;
    }
    system.clearRoomRuntime?.();
    const result=system.startLabScenario(-777,clonePlan(plan));
    if(result?.ok===false){announce(result.error||'RESPAWN FAILED');return false;}
    announce('ENEMIES RESPAWNED');
    return true;
  }

  function makeFrame(direction,targetPoint=null){
    const player=playerPoint();
    const forward=normalizeDirection(direction||{x:player.forwardX,z:player.forwardZ});
    const right={x:-forward.z,z:forward.x};
    return{
      origin:{x:player.x,z:player.z},forward,right,targetPoint:targetPoint?{...targetPoint}:null,
      toWorld(forwardCells,lateralCells){return{
        x:player.x+forward.x*forwardCells*CELL_SIZE+right.x*lateralCells*CELL_SIZE,
        z:player.z+forward.z*forwardCells*CELL_SIZE+right.z*lateralCells*CELL_SIZE,
      };},
    };
  }

  function validSoftTargets(origin,range){
    const walls=getMazeSegments?.()||[];
    return aliveEnemies().filter(enemy=>!blockedByWalls(origin,{x:enemy.x,z:enemy.z},walls)&&Math.hypot(enemy.x-origin.x,enemy.z-origin.z)<=range+(enemy.radius||0));
  }

  function assistedFor(card,rawDirection){
    if(!state.assist)return{direction:normalizeDirection(rawDirection),target:null};
    const player=playerPoint();
    const origin={x:player.x,z:player.z};
    const target=selectSoftTarget({
      enemies:validSoftTargets(origin,card.targeting.range||14),origin,aim:rawDirection,
      maxRange:card.targeting.range||14,coneDegrees:AIM_CONE_DEGREES,
    });
    return{
      target,
      direction:assistedDirection({
        origin,rawDirection,target,
        strength:card.targeting.assistStrength??.35,
        maxCorrectionDegrees:card.targeting.maxCorrectionDegrees??12,
      }),
    };
  }

  function castSelected(frame){
    const card=selectedCard();
    const ok=runtime.cast(card,frame,{unlimitedMana:state.manaMode==='unlimited'});
    if(ok)announce(card.name);
    syncHud();
    return ok;
  }

  function beginCast(){
    const card=selectedCard();
    const arena=window.__arena;
    if(state.active||arena?.combatState?.attack||arena?.arena?.deadT>=0||arena?.roomTransition?.active){announce('BUSY');return false;}
    const cost=spellManaCost(card,runtime.state);
    if(state.manaMode!=='unlimited'&&runtime.state.mana+1e-6<cost){announce('NOT ENOUGH MANA');return false;}
    const player=playerPoint();
    const raw=normalizeDirection({x:player.forwardX,z:player.forwardZ});
    if(card.targeting.kind==='instant')return castSelected(makeFrame(raw));
    const defaultDistance=card.targeting.defaultDistance||Math.min(7.2,card.targeting.range||13);
    state.active={
      card,elapsed:0,rawDirection:raw,assistedDirection:raw,target:null,
      targetPoint:{x:player.x+raw.x*defaultDistance,z:player.z+raw.z*defaultDistance},
      lock:{x:player.x,z:player.z},ready:false,
    };
    buildPreview(card);
    syncHud();
    return true;
  }

  function releaseCast(){
    const cast=state.active;
    if(!cast)return false;
    if(!cast.ready){cancelCast();announce('CHANNEL CANCELED');return false;}
    const frame=makeFrame(cast.assistedDirection,cast.card.targeting.kind==='ground'?cast.targetPoint:null);
    const ok=castSelected(frame);
    cancelCast(false);
    return ok;
  }

  function cancelCast(update=true){
    state.active=null;
    hidePreview();
    if(update)syncHud();
  }

  function inputVector(){
    let best={x:0,z:0,magnitude:0};
    const key={
      x:(pressedKeys.has('d')||pressedKeys.has('arrowright')?1:0)-(pressedKeys.has('a')||pressedKeys.has('arrowleft')?1:0),
      z:(pressedKeys.has('s')||pressedKeys.has('arrowdown')?1:0)-(pressedKeys.has('w')||pressedKeys.has('arrowup')?1:0),
    };
    key.magnitude=Math.hypot(key.x,key.z);
    if(key.magnitude>best.magnitude)best=key;
    const touchMagnitude=Math.hypot(touchAim.x,touchAim.z);
    if(touchMagnitude>best.magnitude)best={x:touchAim.x,z:touchAim.z,magnitude:touchMagnitude};
    const gamepad=navigator.getGamepads?.()[0];
    if(gamepad){
      const dead=value=>Math.abs(value)>.16?value:0;
      const x=dead(gamepad.axes[0]||0),z=dead(gamepad.axes[1]||0),magnitude=Math.hypot(x,z);
      if(magnitude>best.magnitude)best={x,z,magnitude};
    }
    if(best.magnitude>1){best.x/=best.magnitude;best.z/=best.magnitude;best.magnitude=1;}
    return best;
  }

  function applyCastLock(){
    const cast=state.active,arena=window.__arena;
    if(!cast||!arena)return;
    if(arena.actorPos?.set)arena.actorPos.set(cast.lock.x,cast.lock.z);
    const root=getActorRoot?.();
    if(root?.position)root.position.set(cast.lock.x,0,cast.lock.z);
    if(arena.arena?.chain)arena.arena.chain.inputLockT=Math.max(arena.arena.chain.inputLockT||0,.08);
    if(arena.arena?.dodge){arena.arena.dodge.t=-1;arena.arena.dodge.cool=Math.max(arena.arena.dodge.cool||0,.08);}
    if(arena.arena?.charge){arena.arena.charge.active=false;arena.arena.charge.queued=false;}
    const angle=Math.atan2(cast.rawDirection.x,cast.rawDirection.z);
    aimQuaternion.setFromAxisAngle(yAxis,angle);
    getYawQuaternion?.()?.copy?.(aimQuaternion);
    getActorVisual?.()?.quaternion?.copy?.(aimQuaternion);
  }

  function updateCast(dt){
    const cast=state.active;
    if(!cast)return;
    cast.elapsed+=dt;
    cast.ready=cast.elapsed>=Math.max(0,cast.card.targeting.channel||0);
    const input=inputVector();
    if(cast.card.targeting.kind==='directional'){
      if(input.magnitude>.14)cast.rawDirection=normalizeDirection(input);
      const assisted=assistedFor(cast.card,cast.rawDirection);
      cast.assistedDirection=assisted.direction;
      cast.target=assisted.target;
    }else if(cast.card.targeting.kind==='ground'){
      if(input.magnitude>.08){
        cast.targetPoint.x+=input.x*10*dt;
        cast.targetPoint.z+=input.z*10*dt;
      }
      cast.targetPoint=clampGroundTarget({
        origin:cast.lock,target:cast.targetPoint,maxRange:cast.card.targeting.range||13,minRange:1.5,
      });
      const dx=cast.targetPoint.x-cast.lock.x,dz=cast.targetPoint.z-cast.lock.z;
      if(Math.hypot(dx,dz)>EPSILON)cast.rawDirection=normalizeDirection({x:dx,z:dz});
      cast.assistedDirection=cast.rawDirection;
      cast.target=null;
    }
    applyCastLock();
    updatePreview();
  }

  function updateProjectiles(dt){
    const walls=getMazeSegments?.()||[];
    const system=getEnemySystem();
    const enemies=aliveEnemies();
    for(let index=projectiles.length-1;index>=0;index--){
      const projectile=projectiles[index];
      const previous={x:projectile.x,z:projectile.z};
      projectile.x+=projectile.direction.x*projectile.speed*dt;
      projectile.z+=projectile.direction.z*projectile.speed*dt;
      projectile.life-=dt;
      projectile.mesh.position.set(projectile.x,1.05,projectile.z);
      let remove=projectile.life<=0||blockedByWalls(previous,{x:projectile.x,z:projectile.z},walls);
      if(!remove){
        for(const enemy of enemies){
          const radius=(enemy.radius||1)*(system?.heightScale||1)+projectile.radius;
          if(Math.hypot(enemy.x-projectile.x,enemy.z-projectile.z)<=radius){
            projectile.onHit?.(enemy);remove=true;break;
          }
        }
      }
      if(remove){disposeObject(projectile.mesh);projectiles.splice(index,1);}
    }
  }

  function updateGrounds(dt,now){
    for(let index=grounds.length-1;index>=0;index--){
      const ground=grounds[index];
      ground.remaining-=dt;ground.tick-=dt;
      ground.mesh.material.opacity=.48+.16*Math.sin(now*8+ground.phase);
      ground.mesh.scale.setScalar(.92+.08*Math.sin(now*6+ground.phase));
      if(ground.tick<=0){
        ground.tick=.35;
        for(const enemy of aliveEnemies()){
          const radius=ground.radius+(enemy.radius||1)*(getEnemySystem()?.heightScale||1)*.55;
          if(Math.hypot(enemy.x-ground.x,enemy.z-ground.z)<=radius)ground.damageEnemy(enemy,10);
        }
      }
      if(ground.remaining<=0){disposeObject(ground.mesh);grounds.splice(index,1);}
    }
  }

  function updateStrikes(dt){
    for(let index=strikes.length-1;index>=0;index--){
      const strike=strikes[index];strike.age+=dt;
      const k=clamp(strike.age/strike.life,0,1);
      strike.mesh.scale.setScalar(.6+k*1.8);
      strike.mesh.material.opacity=.92*(1-k);
      if(k>=1){disposeObject(strike.mesh);strikes.splice(index,1);}
    }
  }

  function updateScheduled(dt){
    for(let index=scheduled.length-1;index>=0;index--){
      const item=scheduled[index];item.remaining-=dt;
      if(item.remaining<=0){scheduled.splice(index,1);item.action?.();}
    }
  }

  function makeFrostVisual(enemy){
    const group=new THREE.Group();group.name='Eden Frost stacks';
    const shards=[];
    for(let index=0;index<3;index++){
      const shard=new THREE.Mesh(new THREE.OctahedronGeometry(.18,0),new THREE.MeshBasicMaterial({color:0xa7efff,transparent:true,opacity:.92}));
      group.add(shard);shards.push(shard);
    }
    scene.add(group);
    const entry={group,shards,phase:Math.random()*6};frostVisuals.set(enemy,entry);return entry;
  }

  function updateFrostVisuals(now){
    const current=new Set(getEnemySystem()?.enemies||[]);
    for(const enemy of current){
      const stacks=Math.max(0,Math.floor(enemy?.statuses?.frost||0));
      if(enemy.hp<=0||stacks<=0)continue;
      const entry=frostVisuals.get(enemy)||makeFrostVisual(enemy);
      const hs=getEnemySystem()?.heightScale||1;
      const height=(enemy.height||2)*hs*(enemy.currentTargetScale||enemy.targetScale||1)+(enemy.targetYOffset||enemy.rootLift||0);
      entry.group.position.set(enemy.x,height+.5,enemy.z);
      entry.shards.forEach((shard,index)=>{
        shard.visible=index<stacks;
        const angle=now*2.5+entry.phase+index*Math.PI*2/3;
        shard.position.set(Math.cos(angle)*.5,.1*Math.sin(now*5+index),Math.sin(angle)*.5);
        shard.rotation.y=angle;
      });
    }
    for(const[enemy,entry]of[...frostVisuals]){
      if(!current.has(enemy)||enemy.hp<=0||(enemy.statuses?.frost||0)<=0){disposeObject(entry.group);frostVisuals.delete(enemy);}
    }
  }

  function createCircle(color=0xffd477,radius=.74){
    const mesh=new THREE.Mesh(new THREE.RingGeometry(radius*.78,radius,28),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.82,side:THREE.DoubleSide,depthWrite:false,depthTest:false}));
    mesh.rotation.x=-Math.PI/2;mesh.visible=false;scene.add(mesh);return mesh;
  }

  function createLine(color){
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));
    const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity:.9,depthTest:false}));
    line.visible=false;scene.add(line);return line;
  }

  function buildPreview(card){
    hidePreview();
    const count=card.targeting.preview==='column'?5:card.targeting.preview==='ring'?8:1;
    preview={rawLine:createLine(0x9aa3ad),assistLine:createLine(0xffd477),target:createCircle(0xffd477,.72),soft:createCircle(0xffb95a,.65),cells:[]};
    for(let index=0;index<count;index++)preview.cells.push(createCircle(card.brand==='Anima'?0x9cecff:0xe8c9ff,.64));
  }

  function setLine(line,start,direction,length){
    const array=line.geometry.attributes.position.array;
    array[0]=start.x;array[1]=.18;array[2]=start.z;
    array[3]=start.x+direction.x*length;array[4]=.18;array[5]=start.z+direction.z*length;
    line.geometry.attributes.position.needsUpdate=true;line.visible=true;
  }

  function updatePreview(){
    if(!preview||!state.active)return;
    const cast=state.active;
    const length=cast.card.targeting.range||13;
    preview.target.visible=false;preview.soft.visible=false;
    preview.cells.forEach(cell=>cell.visible=false);
    if(cast.card.targeting.kind==='directional'){
      setLine(preview.rawLine,cast.lock,cast.rawDirection,length);
      setLine(preview.assistLine,cast.lock,cast.assistedDirection,length);
      if(cast.target){preview.soft.position.set(cast.target.x,.12,cast.target.z);preview.soft.visible=true;}
    }else{
      preview.rawLine.visible=false;preview.assistLine.visible=false;
      preview.target.position.set(cast.targetPoint.x,.11,cast.targetPoint.z);preview.target.visible=true;
      const points=patternPoints({pattern:cast.card.targeting.preview==='column'?'column':cast.card.targeting.preview==='ring'?'ring':'single',halfWidth:2,frame:makeFrame(cast.rawDirection,cast.targetPoint),point:cast.targetPoint});
      points.forEach((point,index)=>{const cell=preview.cells[index];if(cell){cell.position.set(point.x,.1,point.z);cell.visible=true;}});
    }
    const opacity=cast.ready?.96:.46;
    for(const object of[preview.rawLine,preview.assistLine,preview.target,preview.soft,...preview.cells])if(object?.material)object.material.opacity=opacity;
  }

  function hidePreview(){
    if(!preview)return;
    for(const object of[preview.rawLine,preview.assistLine,preview.target,preview.soft,...preview.cells])disposeObject(object);
    preview=null;
  }

  function buildUi(){
    const style=document.createElement('style');
    style.textContent=`
#edenAbilityHud{position:fixed;right:max(144px,calc(env(safe-area-inset-right) + 144px));bottom:max(80px,calc(env(safe-area-inset-bottom) + 80px));z-index:24;width:116px;pointer-events:none;font-family:ui-monospace,Menlo,Consolas,monospace}
#edenAbilityCard{width:116px;min-height:76px;padding:7px;border:1px solid #7e72a8;border-radius:9px;background:rgba(16,24,31,.92);color:#e7e1ff;text-align:left;pointer-events:auto;touch-action:none;box-shadow:0 3px 0 #081112}
#edenAbilityCard.held{transform:translateY(2px);box-shadow:0 1px 0 #081112;background:rgba(49,57,73,.96)}
#edenAbilityCard.disabled{opacity:.48}#edenAbilityCard b{display:block;font-size:11px;line-height:1.15;padding-right:25px}#edenAbilityCard small{display:block;margin-top:3px;color:#9faabd;font-size:8px;line-height:1.25}#edenAbilityCard .cost{position:absolute;right:7px;top:7px;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#3268bd;border:1px solid #a7cbff;color:white;font-size:10px;font-weight:900}
#edenAbilityCard{position:relative}.edenMeter{height:5px;margin-top:6px;background:#101922;border:1px solid #304355;border-radius:5px;overflow:hidden}.edenMeter span{display:block;height:100%;background:#6d9ff0;width:100%}.edenStats{margin-top:4px;color:#b9c7d8;font-size:8px}.edenHint{margin-top:3px;color:#f0c979;font-size:7px;letter-spacing:.08em}
#edenCancel{display:none;width:100%;margin-top:5px;min-height:30px;border:1px solid #8b573d;border-radius:6px;background:rgba(75,32,26,.9);color:#ffb391;font:9px ui-monospace,Menlo,Consolas,monospace;pointer-events:auto}#edenCancel.on{display:block}
#edenNotice{position:fixed;left:0;right:0;top:31%;z-index:28;text-align:center;color:#f0d8b0;font:900 14px ui-monospace,Menlo,Consolas,monospace;letter-spacing:.14em;text-shadow:0 2px 7px #000;opacity:0;pointer-events:none;transition:opacity .12s}#edenNotice.on{opacity:1}
@media(max-width:660px) and (orientation:landscape){#edenAbilityHud{right:max(132px,calc(env(safe-area-inset-right) + 132px));bottom:max(72px,calc(env(safe-area-inset-bottom) + 72px));width:104px}#edenAbilityCard{width:104px;min-height:68px;padding:6px}#edenAbilityCard small{display:none}}
`;
    document.head.appendChild(style);
    const hud=document.createElement('div');hud.id='edenAbilityHud';hud.innerHTML=`<button id="edenAbilityCard" type="button" aria-label="Hold selected Eden spell"></button><button id="edenCancel" type="button">CANCEL AIM</button>`;
    const notice=document.createElement('div');notice.id='edenNotice';document.body.append(hud,notice);

    const panel=document.createElement('section');panel.id='edenAbilityPanel';panel.style.display='none';panel.setAttribute('aria-label','EDEN');
    panel.innerHTML=`
      <h3>EDEN SPELLS</h3>
      <label for="edenCardSelect">SELECT EDEN CARD</label><select id="edenCardSelect" aria-label="Select Eden card">${EDEN_SPELLS.map(card=>`<option value="${card.id}">${card.brand} · ${card.name} · ${card.mana==='max'?'MAX':card.mana} mana</option>`).join('')}</select>
      <label for="edenAssistToggle">AIM ASSIST</label><input id="edenAssistToggle" type="checkbox" aria-label="Eden aim assist" checked>
      <label for="edenManaMode">MANA MODE</label><select id="edenManaMode" aria-label="Eden mana mode"><option value="normal">Normal regeneration</option><option value="unlimited">Unlimited testing mana</option></select>
      <button id="edenResetResources" type="button" title="Reset mana, Spell Power, Trinity, and active Eden effects">RESET EDEN RESOURCES</button>
      <button id="edenRepeatTest" type="button" title="Respawn the currently configured Enemy Lab test">REPEAT CURRENT TEST</button>
    `;
    document.body.appendChild(panel);

    const cardButton=document.getElementById('edenAbilityCard');
    const cancelButton=document.getElementById('edenCancel');
    const select=document.getElementById('edenCardSelect');
    const assist=document.getElementById('edenAssistToggle');
    const manaMode=document.getElementById('edenManaMode');
    select.value=state.selectedId;
    select.addEventListener('change',()=>{state.selectedId=select.value;cancelCast();syncHud();});
    assist.addEventListener('change',()=>{state.assist=assist.checked;syncHud();});
    manaMode.addEventListener('change',()=>{state.manaMode=manaMode.value;syncHud();});
    document.getElementById('edenResetResources').addEventListener('click',()=>{clearEffects({resetResources:true});announce('EDEN RESET');});
    document.getElementById('edenRepeatTest').addEventListener('click',repeatCurrentTest);
    cancelButton.addEventListener('click',()=>cancelCast());
    cardButton.addEventListener('pointerdown',event=>{event.preventDefault();cardButton.setPointerCapture?.(event.pointerId);cardButton.classList.add('held');beginCast();});
    for(const type of['pointerup','pointercancel','pointerleave'])cardButton.addEventListener(type,event=>{if(type!=='pointerleave'||event.buttons===0){cardButton.classList.remove('held');releaseCast();}});
  }

  function buildRespawnPad(){
    const center=window.__arena?.mazeWorld?.center||{x:0,z:0};
    const group=new THREE.Group();group.name='Enemy Lab Eden respawn pad';
    const disc=new THREE.Mesh(new THREE.CylinderGeometry(1.22,1.22,.08,36),new THREE.MeshStandardMaterial({color:0x315b58,emissive:0x173f3d,emissiveIntensity:.8,roughness:.7}));
    disc.position.y=.04;group.add(disc);
    const ring=new THREE.Mesh(new THREE.RingGeometry(.82,1.12,36),new THREE.MeshBasicMaterial({color:0x8de1d3,transparent:true,opacity:.82,side:THREE.DoubleSide,depthWrite:false}));
    ring.rotation.x=-Math.PI/2;ring.position.y=.095;group.add(ring);
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const context=canvas.getContext('2d');
    context.clearRect(0,0,256,64);context.font='900 25px ui-monospace,Menlo,Consolas,monospace';context.textAlign='center';context.textBaseline='middle';context.lineWidth=6;context.strokeStyle='rgba(0,20,20,.95)';context.strokeText('RESPAWN',128,32);context.fillStyle='#d7fff8';context.fillText('RESPAWN',128,32);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,depthTest:false}));label.position.set(0,.45,0);label.scale.set(3.2,.8,1);group.add(label);
    group.position.set((center.x||0)-6.5,0,(center.z||0)+5.5);scene.add(group);
    respawnPad={group,ring,label,phase:0};
  }

  function updatePad(dt,now){
    if(!respawnPad&&window.__arena?.mazeWorld)buildRespawnPad();
    if(!respawnPad)return;
    state.padCooldown=Math.max(0,state.padCooldown-dt);
    respawnPad.ring.material.opacity=.6+.22*Math.sin(now*4);
    respawnPad.ring.rotation.z+=dt*.35;
    const player=playerPoint();
    const inside=Math.hypot(player.x-respawnPad.group.position.x,player.z-respawnPad.group.position.z)<1.35;
    if(inside&&!state.padInside&&state.padCooldown<=0){state.padCooldown=1.2;repeatCurrentTest();}
    state.padInside=inside;
  }

  function syncHud(){
    const button=document.getElementById('edenAbilityCard');
    const cancel=document.getElementById('edenCancel');
    if(!button)return;
    const card=selectedCard();
    const cost=spellManaCost(card,runtime.state);
    const affordable=state.manaMode==='unlimited'||runtime.state.mana+1e-6>=cost;
    const progress=runtime.state.maxMana>0?clamp(runtime.state.mana/runtime.state.maxMana,0,1)*100:0;
    button.classList.toggle('disabled',!affordable&&!state.active);
    button.innerHTML=`<b>${card.name}</b><span class="cost">${card.mana==='max'?'M':card.mana}</span><small>${card.targeting.kind==='instant'?'Tap to cast':'Hold · aim · release'}</small><div class="edenMeter"><span style="width:${progress}%"></span></div><div class="edenStats">M ${runtime.state.mana.toFixed(1)}/${runtime.state.maxMana} · P ${runtime.state.spellPower} · T ${runtime.state.trinity}/3</div><div class="edenHint">F / HOLD CARD / R3${state.assist?' · ASSIST':''}</div>`;
    cancel?.classList.toggle('on',!!state.active);
    const select=document.getElementById('edenCardSelect');if(select&&select.value!==state.selectedId)select.value=state.selectedId;
  }

  function bindInput(){
    addEventListener('keydown',event=>{
      const key=event.key.toLowerCase();pressedKeys.add(key);
      if(key==='f'&&!event.repeat){event.preventDefault();beginCast();}
      if(key==='escape'&&state.active){event.preventDefault();cancelCast();}
    },true);
    addEventListener('keyup',event=>{
      const key=event.key.toLowerCase();pressedKeys.delete(key);
      if(key==='f'){event.preventDefault();releaseCast();}
    },true);
    addEventListener('pointerdown',event=>{
      if(event.clientX>innerWidth*.58||event.target.closest?.('#edenAbilityHud,#panel,button,select,input'))return;
      if(touchAim.id!==null)return;
      touchAim.id=event.pointerId;touchAim.startX=event.clientX;touchAim.startY=event.clientY;touchAim.x=0;touchAim.z=0;
    },true);
    addEventListener('pointermove',event=>{
      if(event.pointerId!==touchAim.id)return;
      let dx=event.clientX-touchAim.startX,dy=event.clientY-touchAim.startY;const length=Math.hypot(dx,dy),max=52;
      if(length>max){dx*=max/length;dy*=max/length;}
      touchAim.x=dx/max;touchAim.z=dy/max;
    },true);
    const clearTouch=event=>{if(event.pointerId===touchAim.id){touchAim.id=null;touchAim.x=0;touchAim.z=0;}};
    addEventListener('pointerup',clearTouch,true);addEventListener('pointercancel',clearTouch,true);
    addEventListener('pointerdown',event=>{
      if(!state.active||event.target.closest?.('#edenAbilityHud'))return;
      if(event.target.closest?.('.pbtn,.scard,#shuffleBtn')){event.preventDefault();event.stopImmediatePropagation();}
    },true);
  }

  function pollGamepad(){
    const gamepad=navigator.getGamepads?.()[0];
    const held=!!gamepad?.buttons?.[11]?.pressed;
    if(held&&!state.gamepadHeld)beginCast();
    if(!held&&state.gamepadHeld)releaseCast();
    state.gamepadHeld=held;
  }

  buildUi();bindInput();syncHud();
  window.__EDEN_ARENA_RUNTIME__={state,runtime,beginCast,releaseCast,cancelCast,repeatCurrentTest,clearEffects,selectCard(id){if(EDEN_SPELL_BY_ID[id]){state.selectedId=id;cancelCast();syncHud();return true;}return false;}};

  return{
    state,runtime,beginCast,releaseCast,cancelCast,repeatCurrentTest,clearEffects,
    update(dt,now=0){
      if(state.disposed)return;
      patchSystem();
      const system=getEnemySystem();
      if(system?.currentEncounterPlan)state.lastPlan=clonePlan(system.currentEncounterPlan)||state.lastPlan;
      runtime.update(dt,{unlimitedMana:state.manaMode==='unlimited'});
      pollGamepad();updateCast(dt);updateScheduled(dt);updateProjectiles(dt);updateGrounds(dt,now);updateStrikes(dt);updateFrostVisuals(now);updatePad(dt,now);syncHud();
    },
    dispose(){state.disposed=true;clearEffects();hidePreview();if(respawnPad)disposeObject(respawnPad.group);document.getElementById('edenAbilityHud')?.remove();document.getElementById('edenAbilityPanel')?.remove();document.getElementById('edenNotice')?.remove();},
  };
}
