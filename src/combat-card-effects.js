import { getWeaponDamageMultiplier } from './combat-balance.js';
import { guardPoseFor } from './guard-poses.js';

export const BLOOD_SLASH_MAX_CHARGES = 3;
export const BLOOD_SLASH_BLEED = Object.freeze({
  duration:4,
  tickInterval:1,
  damage:3,
});
export const BING_BONG_STANCE_ID = 'S31-BING-BONG';
export const BING_BONG_STUN_DURATION = 3;

const BING_BONG_WAVE_LIFE = .52;
const BING_BONG_MIN_RANGE = 4.5;
const BING_BONG_MAX_RANGE = 14.5;
const CONCUSSION_BY_ZONE = Object.freeze({
  rapierTip:.03,
  rapierSide:.12,
  rapierGuard:.22,
  katanaKissaki:.05,
  katanaHa:.08,
  katanaTsuba:.25,
  spearTip:.05,
  spearShaft:.50,
  hammerHead:1.00,
  hammerPick:.14,
  hammerShaft:.46,
  maceHead:.92,
  maceHandle:.45,
  axeBit:.09,
  axeSpike:.16,
  axeShaft:.48,
  bladeTip:.05,
  bladeEdge:.08,
  guard:.28,
});
const CONCUSSION_BY_TYPE = Object.freeze({
  blunt:.42,
  hybrid:.55,
  weak:.14,
  slice:.08,
  pierce:.04,
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function concussionCoefficient(zone = {}){
  const exact = CONCUSSION_BY_ZONE[zone.id];
  return Number.isFinite(exact) ? exact : (CONCUSSION_BY_TYPE[zone.type] ?? .05);
}

export function bingBongProfile(damage, coefficient = 1){
  const concussionPower = Math.max(0, Number(damage) || 0) * Math.max(0, Number(coefficient) || 0);
  const normalized = concussionPower / 28;
  return {
    concussionPower,
    // Even weak contacts make a visible local ring. Mace and hammer heads reach
    // across a substantial portion of a room, while the hard cap keeps it readable.
    range:clamp(BING_BONG_MIN_RANGE + 6.2 * Math.pow(normalized, 1.2), BING_BONG_MIN_RANGE, BING_BONG_MAX_RANGE),
    stun:BING_BONG_STUN_DURATION,
  };
}

export function pointInRadius({ originX = 0, originZ = 0, targetX = 0, targetZ = 0, range = 0 } = {}){
  return Math.hypot(targetX - originX, targetZ - originZ) <= Math.max(0, Number(range) || 0);
}

// Retained for compatibility with older test/debug callers. Bing Bong no longer
// uses directional cones; gameplay uses pointInRadius and an expanding ring.
export function pointInForwardCone({
  originX,
  originZ,
  playerX,
  playerZ,
  forwardX,
  forwardZ,
  targetX,
  targetZ,
  range,
  angle,
}){
  const ox = Number.isFinite(originX) ? originX : (Number(playerX) || 0);
  const oz = Number.isFinite(originZ) ? originZ : (Number(playerZ) || 0);
  const dx = targetX - ox;
  const dz = targetZ - oz;
  const distance = Math.hypot(dx, dz);
  if(distance <= 1e-6 || distance > range) return false;
  const forwardLength = Math.hypot(forwardX, forwardZ) || 1;
  const dot = (dx * forwardX + dz * forwardZ) / (distance * forwardLength);
  return dot >= Math.cos(angle * .5);
}

export function bingBongImpactDirection({
  playerX = 0,
  playerZ = 0,
  impactX = 0,
  impactZ = 0,
  fallbackX = 0,
  fallbackZ = 1,
} = {}){
  let dx = impactX - playerX;
  let dz = impactZ - playerZ;
  let length = Math.hypot(dx, dz);
  if(length <= 1e-6){
    dx = Number(fallbackX) || 0;
    dz = Number(fallbackZ) || 1;
    length = Math.hypot(dx, dz) || 1;
  }
  return { x:dx / length, z:dz / length };
}

export function expandBloodSlashZone(zone, gripCenter = -.14){
  const from = zone.from.clone();
  const to = zone.to.clone();
  from.y = gripCenter + (from.y - gripCenter) * 2;
  to.y = gripCenter + (to.y - gripCenter) * 2;
  return {
    ...zone,
    from,
    to,
    radius:zone.radius * Math.SQRT2,
    bloodSlashExpanded:true,
  };
}

function segmentsIntersect(a,b,c,d){
  const rx=b.x-a.x, rz=b.z-a.z, sx=d.x-c.x, sz=d.z-c.z;
  const cross=rx*sz-rz*sx;
  if(Math.abs(cross)<1e-8) return false;
  const qx=c.x-a.x, qz=c.z-a.z;
  const t=(qx*sz-qz*sx)/cross;
  const u=(qx*rz-qz*rx)/cross;
  return t>=0&&t<=1&&u>=0&&u<=1;
}

function blockedByWall(start,end,segments){
  return (segments||[]).some(wall=>wall?.a&&wall?.b&&segmentsIntersect(start,end,wall.a,wall.b));
}

export function installCombatCardEffects({
  THREE,
  scene,
  PC,
  hooks,
  getPlayer,
  getEnemySystem,
  getStance = () => null,
  getMazeSegments = () => [],
} = {}){
  if(!THREE || !scene || !PC) throw new Error('[combat-card-effects] THREE, scene, and PC are required.');

  const state = {
    charges:0,
    activeAttack:null,
    boostedAttack:null,
    savedStaminaClass:null,
    bleeds:new Map(),
    shockwaves:[],
    stunVisuals:new Map(),
    enemySystem:null,
    originalDamageEnemy:null,
    originalReset:null,
    bleedTicking:false,
    badge:null,
    lastStanceId:null,
    starTexture:null,
  };

  function currentArenaSwing(){ return globalThis.window?.__arena?.arena?.swing || null; }
  function currentStance(){ return getStance?.() || globalThis.window?.__arena?.arena?.stance || null; }
  function currentMazeSegments(){ return getMazeSegments?.() || globalThis.window?.__arena?.mazeWorld?.getCollisionSegments?.() || []; }

  function installBadge(){
    if(typeof document==='undefined' || state.badge) return;
    const style=document.createElement('style');
    style.textContent=`#bloodSlashCharges{position:fixed;top:72px;left:max(10px,env(safe-area-inset-left));z-index:12;display:none;align-items:center;gap:5px;padding:3px 7px 3px 5px;border:1px solid rgba(208,55,66,.72);border-radius:10px;background:rgba(28,9,12,.78);color:#ffd5d8;font:900 12px ui-monospace,Menlo,Consolas,monospace;pointer-events:none;box-shadow:0 2px 0 rgba(0,0,0,.35)}#bloodSlashCharges .drop{width:10px;height:10px;background:#d83b4d;border-radius:70% 0 70% 70%;transform:rotate(-45deg);box-shadow:0 0 7px rgba(216,59,77,.65)}#bloodSlashCharges.on{display:flex}`;
    document.head.appendChild(style);
    const badge=document.createElement('div');
    badge.id='bloodSlashCharges';
    badge.setAttribute('aria-label','Blood Slash charges');
    badge.innerHTML='<span class="drop"></span><span class="count">0</span>';
    document.body.appendChild(badge);
    state.badge=badge;
  }

  function syncBadge(){
    installBadge();
    if(!state.badge) return;
    state.badge.classList.toggle('on', state.charges>0);
    state.badge.querySelector('.count').textContent=String(state.charges);
  }

  function clearBleedVisual(entry){
    if(entry?.mesh?.parent) entry.mesh.parent.remove(entry.mesh);
    entry?.mesh?.geometry?.dispose?.();
    entry?.mesh?.material?.dispose?.();
  }

  function clearBleeds(){
    for(const entry of state.bleeds.values()) clearBleedVisual(entry);
    state.bleeds.clear();
  }

  function clearShockwave(wave){
    if(wave?.mesh?.parent) wave.mesh.parent.remove(wave.mesh);
    wave?.mesh?.geometry?.dispose?.();
    wave?.mesh?.material?.dispose?.();
  }

  function clearShockwaves(){
    for(const wave of state.shockwaves) clearShockwave(wave);
    state.shockwaves.length=0;
  }

  function clearStunVisual(entry){
    if(!entry) return;
    if(entry.group?.parent) entry.group.parent.remove(entry.group);
    for(const sprite of entry.stars||[]) sprite.material?.dispose?.();
    const enemy=entry.enemy;
    if(enemy){
      enemy.__bingBongStunned=false;
      enemy.stunState=null;
      enemy.stunStateRemaining=0;
    }
  }

  function clearStunVisuals(){
    for(const entry of state.stunVisuals.values()) clearStunVisual(entry);
    state.stunVisuals.clear();
  }

  function resetEffects(){
    restoreWeaponClass();
    state.charges=0;
    state.activeAttack=null;
    state.boostedAttack=null;
    clearBleeds();
    clearShockwaves();
    clearStunVisuals();
    syncBadge();
  }

  function makeBleedVisual(){
    const mesh=new THREE.Mesh(
      new THREE.OctahedronGeometry(.16,0),
      new THREE.MeshBasicMaterial({color:0xd83b4d,transparent:true,opacity:.92,depthWrite:false})
    );
    mesh.scale.set(.72,1.35,.72);
    scene.add(mesh);
    return mesh;
  }

  function applyBleed(enemy){
    if(!enemy || enemy.hp<=0) return;
    let entry=state.bleeds.get(enemy);
    if(!entry){
      entry={enemy,remaining:BLOOD_SLASH_BLEED.duration,tick:BLOOD_SLASH_BLEED.tickInterval,mesh:makeBleedVisual(),phase:Math.random()*Math.PI*2};
      state.bleeds.set(enemy,entry);
    }else{
      entry.remaining=BLOOD_SLASH_BLEED.duration;
      entry.tick=BLOOD_SLASH_BLEED.tickInterval;
    }
  }

  function restoreWeaponClass(){
    if(!state.savedStaminaClass) return;
    const {weaponDef,value}=state.savedStaminaClass;
    if(weaponDef) weaponDef.staminaClass=value;
    state.savedStaminaClass=null;
  }

  function beginAttack(info={}){
    restoreWeaponClass();
    const attack=PC.combatState.attack;
    state.activeAttack=attack;
    state.boostedAttack=null;
    if(!attack || info.group==='ability' || state.charges<=0) return;
    state.charges=Math.max(0,state.charges-1);
    attack.__bloodSlashSpent=true;
    if(info.group==='horizontal'){
      attack.__bloodSlashBoosted=true;
      state.boostedAttack=attack;
      const weaponDef=PC.currentWeapon?.();
      if(weaponDef?.staminaClass==='Light'){
        state.savedStaminaClass={weaponDef,value:'Light'};
        weaponDef.staminaClass='Medium';
      }
    }
    syncBadge();
  }

  function finishAttack(){
    restoreWeaponClass();
    state.activeAttack=null;
    state.boostedAttack=null;
  }

  function resolveHitZone(enemy, finalDamage){
    if(!enemy || !PC.weaponRoot) return null;
    const system=state.enemySystem;
    const zones=PC.getWeaponHitZones?.()||[];
    const enemyScale=system?.heightScale||1;
    const scaledRadius=(enemy.radius||1)*enemyScale*(enemy.collisionScale||1);
    const height=(enemy.height||enemy.radius*2||2)*enemyScale*(enemy.currentTargetScale||enemy.targetScale||1);
    const targetOffsetY=enemy.targetYOffset||0;
    const origins=[{x:enemy.x,z:enemy.z}];
    if(enemy.attackOriginForward>0) origins.push({x:enemy.x+enemy.facing.x*enemy.attackOriginForward*enemyScale,z:enemy.z+enemy.facing.z*enemy.attackOriginForward*enemyScale});
    const samples=origins.flatMap(origin=>[.24,.52,.80].map(k=>new THREE.Vector3(origin.x,targetOffsetY+height*k,origin.z)));
    const weaponDef=PC.currentWeapon?.();
    const swing=currentArenaSwing();
    let best=null;
    for(const zone of zones){
      const a=PC.weaponRoot.localToWorld(zone.from.clone());
      const b=PC.weaponRoot.localToWorld(zone.to.clone());
      const threshold=scaledRadius+zone.radius+.38;
      let bestDist=Infinity;
      for(const sample of samples){const d=PC.pointSegmentDistance(sample,a,b);if(d<bestDist)bestDist=d;}
      if(bestDist>threshold) continue;
      const quality=1-clamp(bestDist/threshold,0,1);
      const mult=getWeaponDamageMultiplier({weaponId:PC.combatState.weapon,weaponDef,attackKey:PC.combatState.attackKey,attackGroup:PC.combatState.attackGroup,hitType:zone.type,zoneId:zone.id});
      const predicted=Math.max(1,Math.round(zone.damage*(.82+quality*.42)*mult*(swing?.dmgMult||1)));
      const candidate={zone,predicted,delta:Math.abs(predicted-finalDamage)};
      if(!best||candidate.predicted>best.predicted||(candidate.predicted===best.predicted&&candidate.delta<best.delta))best=candidate;
    }
    return best?.zone||null;
  }

  function makeStarTexture(){
    if(state.starTexture || typeof document==='undefined') return state.starTexture;
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=64;
    const ctx=canvas.getContext('2d');
    ctx.translate(32,32);
    ctx.beginPath();
    for(let i=0;i<10;i++){
      const angle=-Math.PI/2+i*Math.PI/5;
      const radius=i%2===0?25:11;
      const x=Math.cos(angle)*radius;
      const y=Math.sin(angle)*radius;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.closePath();
    ctx.fillStyle='#ffe36e';
    ctx.strokeStyle='#8b4e12';
    ctx.lineWidth=4;
    ctx.lineJoin='round';
    ctx.stroke();
    ctx.fill();
    const texture=new THREE.CanvasTexture(canvas);
    texture.colorSpace=THREE.SRGBColorSpace;
    state.starTexture=texture;
    return texture;
  }

  function makeStunVisual(enemy){
    const group=new THREE.Group();
    group.name='Bing Bong stun stars';
    const texture=makeStarTexture();
    const stars=[];
    for(let i=0;i<3;i++){
      const material=new THREE.SpriteMaterial({map:texture,color:0xffffff,transparent:true,depthWrite:false,depthTest:false});
      const sprite=new THREE.Sprite(material);
      sprite.scale.set(.72,.72,1);
      group.add(sprite);
      stars.push(sprite);
    }
    scene.add(group);
    const entry={enemy,group,stars,phase:Math.random()*Math.PI*2};
    state.stunVisuals.set(enemy,entry);
    return entry;
  }

  function applyExplicitStun(enemy){
    if(!enemy || enemy.hp<=0) return false;
    // The Screaming Antelope keeps its established committed-charge immunity.
    if(enemy.kind==='ant'&&enemy.state==='active') return false;
    enemy.stunned=Math.max(enemy.stunned||0,BING_BONG_STUN_DURATION);
    enemy.__bingBongStunned=true;
    enemy.stunState='bingBong';
    enemy.stunStateRemaining=enemy.stunned;
    if(!state.stunVisuals.has(enemy)) makeStunVisual(enemy);
    return true;
  }

  function makeShockwaveRing(profile, origin){
    const mesh=new THREE.Mesh(
      new THREE.RingGeometry(.965,1,72),
      new THREE.MeshBasicMaterial({color:0xffc45f,transparent:true,opacity:.72,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,side:THREE.DoubleSide})
    );
    mesh.rotation.x=-Math.PI/2;
    mesh.position.set(origin.x,.11,origin.z);
    mesh.scale.setScalar(.04);
    scene.add(mesh);
    return mesh;
  }

  function startBingBongShockwave(primary, profile){
    const origin={x:primary.x,z:primary.z};
    const wave={
      origin,
      profile,
      age:0,
      life:BING_BONG_WAVE_LIFE,
      previousRadius:0,
      affected:new Set(),
      walls:[...currentMazeSegments()],
      mesh:makeShockwaveRing(profile,origin),
    };
    state.shockwaves.push(wave);
    wave.affected.add(primary);
    applyExplicitStun(primary);
  }

  function applyBingBong(primary, damage, zone){
    const attack=PC.combatState.attack;
    if(!attack || zone?.id?.startsWith('pilebunker')) return;
    if(currentStance()?.id!==BING_BONG_STANCE_ID && currentStance()?.effectId!=='bingBong') return;

    // Each enemy directly struck emits one full radial shockwave for this attack.
    attack.__bingBongPrimaries ||= new Set();
    if(attack.__bingBongPrimaries.has(primary)) return;
    attack.__bingBongPrimaries.add(primary);

    const profile=bingBongProfile(damage,concussionCoefficient(zone));
    startBingBongShockwave(primary,profile);
  }

  function patchEnemySystem(){
    let system=null;
    try{system=getEnemySystem?.();}catch(_error){return;}
    if(!system||system===state.enemySystem||typeof system.damageEnemy!=='function') return;
    state.enemySystem=system;
    state.originalDamageEnemy=system.damageEnemy.bind(system);
    state.originalReset=system.reset?.bind(system)||null;
    system.damageEnemy=function damageEnemyWithCardEffects(enemy,amount,knock,opts){
      const before=Number(enemy?.hp);
      const result=state.originalDamageEnemy(enemy,amount,knock,opts);
      const landed=Number.isFinite(before)&&Number.isFinite(enemy?.hp)&&enemy.hp<before;
      if(!landed||state.bleedTicking) return result;
      const zone=resolveHitZone(enemy,Number(amount)||0);
      const attack=PC.combatState.attack;
      if(attack?.__bloodSlashBoosted&&PC.combatState.attackGroup==='horizontal'&&!zone?.id?.startsWith('pilebunker')) applyBleed(enemy);
      applyBingBong(enemy,Number(amount)||0,zone);
      return result;
    };
    if(state.originalReset){
      system.reset=function resetWithCardEffects(){resetEffects();return state.originalReset();};
    }
  }

  function updateBleeds(dt,now){
    const system=state.enemySystem;
    if(!system) return;
    for(const [enemy,entry] of [...state.bleeds]){
      if(!enemy||enemy.hp<=0||!system.enemies?.includes(enemy)){
        clearBleedVisual(entry);state.bleeds.delete(enemy);continue;
      }
      entry.remaining-=dt;
      entry.tick-=dt;
      const heightScale=system.heightScale||1;
      entry.mesh.position.set(enemy.x,(enemy.height||2)*heightScale+.55+Math.sin(now*5+entry.phase)*.10,enemy.z);
      entry.mesh.rotation.y+=dt*2.8;
      entry.mesh.material.opacity=.55+.35*clamp(entry.remaining/BLOOD_SLASH_BLEED.duration,0,1);
      while(entry.tick<=0&&entry.remaining>0&&enemy.hp>0){
        entry.tick+=BLOOD_SLASH_BLEED.tickInterval;
        const damage=BLOOD_SLASH_BLEED.damage;
        if(enemy.hp>damage){
          enemy.hp-=damage;
          enemy.flash=Math.max(enemy.flash||0,.08);
        }else{
          state.bleedTicking=true;
          try{state.originalDamageEnemy(enemy,damage,{x:0,z:0},{power:.35,pop:.20,status:'bleed'});}finally{state.bleedTicking=false;}
        }
      }
      if(entry.remaining<=0||enemy.hp<=0){clearBleedVisual(entry);state.bleeds.delete(enemy);}
    }
  }

  function updateShockwaves(dt){
    const system=state.enemySystem;
    if(!system) return;
    for(let i=state.shockwaves.length-1;i>=0;i--){
      const wave=state.shockwaves[i];
      wave.age+=dt;
      const k=clamp(wave.age/wave.life,0,1);
      const outward=1-Math.pow(1-k,3);
      const currentRadius=wave.profile.range*outward;
      wave.mesh.scale.setScalar(Math.max(.04,currentRadius));
      wave.mesh.material.opacity=.72*Math.pow(1-k,.68);

      for(const enemy of [...(system.enemies||[])]){
        if(!enemy||enemy.hp<=0||wave.affected.has(enemy)) continue;
        const allowance=(enemy.radius||1)*(system.heightScale||1)*.35;
        if(!pointInRadius({originX:wave.origin.x,originZ:wave.origin.z,targetX:enemy.x,targetZ:enemy.z,range:currentRadius+allowance})) continue;
        wave.affected.add(enemy);
        if(blockedByWall(wave.origin,{x:enemy.x,z:enemy.z},wave.walls)) continue;
        applyExplicitStun(enemy);
      }

      wave.previousRadius=currentRadius;
      if(k>=1){
        clearShockwave(wave);
        state.shockwaves.splice(i,1);
      }
    }
  }

  function updateStunVisuals(dt,now){
    const system=state.enemySystem;
    if(!system) return;
    for(const [enemy,entry] of [...state.stunVisuals]){
      if(!enemy||enemy.hp<=0||!system.enemies?.includes(enemy)||(enemy.stunned||0)<=0){
        clearStunVisual(entry);
        state.stunVisuals.delete(enemy);
        continue;
      }
      enemy.__bingBongStunned=true;
      enemy.stunState='bingBong';
      enemy.stunStateRemaining=enemy.stunned;
      entry.phase+=dt*4.4;
      const heightScale=system.heightScale||1;
      const targetScale=enemy.currentTargetScale||enemy.targetScale||1;
      const height=(enemy.height||2)*heightScale*targetScale;
      const y=(enemy.targetYOffset||enemy.rootLift||0)+height+.72;
      const orbitRadius=Math.max(.72,(enemy.radius||1)*heightScale*.72);
      entry.group.position.set(enemy.x,y,enemy.z);
      entry.stars.forEach((star,index)=>{
        const angle=entry.phase+index*Math.PI*2/entry.stars.length;
        star.position.set(Math.cos(angle)*orbitRadius,Math.sin(now*7+angle)*.13,Math.sin(angle)*orbitRadius);
        const pulse=.64+.13*Math.sin(now*8+index*2.1);
        star.scale.set(pulse,pulse,1);
        star.material.opacity=.82+.18*Math.sin(now*6+index);
      });
    }
  }

  function syncBingBongReadyPose(){
    const stance=currentStance();
    if(!stance||stance.id===state.lastStanceId) return;
    state.lastStanceId=stance.id;
    if(stance.id===BING_BONG_STANCE_ID||stance.effectId==='bingBong') PC.setReadyPose?.(guardPoseFor(stance));
  }

  const hookBag=hooks||{};
  const originalAttackStart=hookBag.onAttackStart;
  const originalAttackComplete=hookBag.onAttackComplete;
  hookBag.onAttackStart=function cardEffectAttackStart(info){
    const out=originalAttackStart?.(info);
    beginAttack(info);
    return out;
  };
  hookBag.onAttackComplete=function cardEffectAttackComplete(...args){
    finishAttack();
    return originalAttackComplete?.(...args);
  };

  const baseZones=PC.getWeaponHitZones.bind(PC);
  PC.getWeaponHitZones=function getCardModifiedHitZones(){
    const zones=baseZones();
    if(PC.combatState.attack!==state.boostedAttack||PC.combatState.attackGroup!=='horizontal') return zones;
    return zones.map(zone=>expandBloodSlashZone(zone,PC.RIG?.gripCenter??-.14));
  };

  if(typeof window!=='undefined'){
    window.addEventListener('bloodslash:play',()=>{
      state.charges=BLOOD_SLASH_MAX_CHARGES;
      syncBadge();
      window.dispatchEvent(new CustomEvent('bloodslash:charged',{detail:{charges:state.charges}}));
    });
    window.__COMBAT_CARD_EFFECTS__=state;
  }
  syncBadge();

  return {
    state,
    reset:resetEffects,
    update(dt,now=0){
      patchEnemySystem();
      syncBingBongReadyPose();
      if(state.savedStaminaClass&&PC.combatState.attack!==state.activeAttack) finishAttack();
      const frameDt=Math.max(0,Number(dt)||0);
      const time=Number(now)||0;
      updateBleeds(frameDt,time);
      updateShockwaves(frameDt);
      updateStunVisuals(frameDt,time);
    },
  };
}
