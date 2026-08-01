import { getWeaponDamageMultiplier } from './combat-balance.js';
import { guardPoseFor } from './guard-poses.js';

export const BLOOD_SLASH_MAX_CHARGES = 3;
export const BING_BONG_STANCE_ID = 'S31-BING-BONG';
export const BING_BONG_STUN_DURATION = 3;
export const MOVEMENT_BLEED = Object.freeze({
  duration:5,
  storeMultiplier:.65,
  minimumStored:1,
  damagePerUnit:2.2,
});

const BING_BONG_WAVE_LIFE=.52;
const BING_BONG_MIN_RANGE=4.5;
const BING_BONG_MAX_RANGE=14.5;
const DARK_RED=0x5a0712;
const BRIGHT_RED=0xff1835;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

// Compatibility metadata for current weapons. New weapon zones should declare
// tags:['blunt'] and concussion directly on the zone definition instead.
const CURRENT_BLUNT_ZONES=Object.freeze({
  rapierGuard:.22,
  spearShaft:.50,
  hammerHead:1.00,
  hammerShaft:.46,
  maceHead:.92,
  maceHandle:.45,
  axeShaft:.48,
  guard:.28,
});

export function contactTagsForZone(zone={}){
  const declared=Array.isArray(zone.tags)?zone.tags:[];
  const tags=new Set(declared);
  if(Object.hasOwn(CURRENT_BLUNT_ZONES,zone.id)) tags.add('blunt');
  // Deliberately do not derive blunt from zone.type. Katana tsuba and other
  // incidental zones are not Bing Bong contacts unless explicitly authored so.
  return [...tags];
}

export function concussionCoefficient(zone={}){
  if(!contactTagsForZone(zone).includes('blunt')) return 0;
  const declared=Number(zone.concussion);
  if(Number.isFinite(declared)&&declared>0) return declared;
  return CURRENT_BLUNT_ZONES[zone.id]||0;
}

export function bingBongProfile(damage,coefficient=0){
  const concussionPower=Math.max(0,Number(damage)||0)*Math.max(0,Number(coefficient)||0);
  if(concussionPower<=0) return null;
  const normalized=concussionPower/28;
  return{
    concussionPower,
    range:clamp(BING_BONG_MIN_RANGE+6.2*Math.pow(normalized,1.2),BING_BONG_MIN_RANGE,BING_BONG_MAX_RANGE),
    stun:BING_BONG_STUN_DURATION,
  };
}

export function pointInRadius({originX=0,originZ=0,targetX=0,targetZ=0,range=0}={}){
  return Math.hypot(targetX-originX,targetZ-originZ)<=Math.max(0,Number(range)||0);
}

export function pointInForwardCone({originX,originZ,playerX,playerZ,forwardX,forwardZ,targetX,targetZ,range,angle}){
  const ox=Number.isFinite(originX)?originX:(Number(playerX)||0);
  const oz=Number.isFinite(originZ)?originZ:(Number(playerZ)||0);
  const dx=targetX-ox,dz=targetZ-oz,distance=Math.hypot(dx,dz);
  if(distance<=1e-6||distance>range)return false;
  const forwardLength=Math.hypot(forwardX,forwardZ)||1;
  return(dx*forwardX+dz*forwardZ)/(distance*forwardLength)>=Math.cos(angle*.5);
}

export function bingBongImpactDirection({playerX=0,playerZ=0,impactX=0,impactZ=0,fallbackX=0,fallbackZ=1}={}){
  let dx=impactX-playerX,dz=impactZ-playerZ,length=Math.hypot(dx,dz);
  if(length<=1e-6){dx=Number(fallbackX)||0;dz=Number(fallbackZ)||1;length=Math.hypot(dx,dz)||1;}
  return{x:dx/length,z:dz/length};
}

export function expandBloodSlashZone(zone,gripCenter=-.14){
  const from=zone.from.clone(),to=zone.to.clone();
  from.y=gripCenter+(from.y-gripCenter)*2;
  to.y=gripCenter+(to.y-gripCenter)*2;
  return{...zone,from,to,radius:zone.radius*Math.SQRT2,bloodSlashExpanded:true};
}

export function consumeBloodSlashCharge(charges,group){
  const available=Math.max(0,Number(charges)||0);
  if(group==='ability'||available<=0)return{charges:available,spent:false,empowered:false};
  return{charges:available-1,spent:true,empowered:group==='horizontal'};
}

export function createAttackExecution({id=0,attackKey='',group='',weaponId='',stanceId='',bloodSlash={}}={}){
  return{
    id:Math.max(0,Number(id)||0),
    attackKey:String(attackKey||''),
    group:String(group||''),
    weaponId:String(weaponId||''),
    stanceId:String(stanceId||''),
    modifiers:{bloodSlash:{spent:!!bloodSlash.spent,empowered:!!bloodSlash.empowered}},
    hitTargets:new Set(),
    bingBongPrimaries:new Set(),
    candidates:new Map(),
  };
}

export function createBleedPool({x=0,z=0}={}){
  return{storedDamage:0,expiresIn:0,lastX:Number(x)||0,lastZ:Number(z)||0};
}
export function stackBleed(pool,amount,duration=MOVEMENT_BLEED.duration){
  if(!pool)return 0;const added=Math.max(0,Number(amount)||0);
  pool.storedDamage=Math.max(0,Number(pool.storedDamage)||0)+added;
  if(added>0)pool.expiresIn=Math.max(0,Number(duration)||0);
  return added;
}
export function releaseBleedByMovement(pool,{x=pool?.lastX||0,z=pool?.lastZ||0}={},rate=MOVEMENT_BLEED.damagePerUnit){
  if(!pool)return{distance:0,damage:0,remaining:0};
  const nx=Number(x)||0,nz=Number(z)||0,distance=Math.hypot(nx-(Number(pool.lastX)||0),nz-(Number(pool.lastZ)||0));
  pool.lastX=nx;pool.lastZ=nz;
  const damage=Math.min(Math.max(0,Number(pool.storedDamage)||0),distance*Math.max(0,Number(rate)||0));
  pool.storedDamage=Math.max(0,pool.storedDamage-damage);
  return{distance,damage,remaining:pool.storedDamage};
}
export function advanceBleed(pool,dt){
  if(!pool)return false;
  pool.expiresIn=Math.max(0,(Number(pool.expiresIn)||0)-Math.max(0,Number(dt)||0));
  if(pool.expiresIn>0&&(Number(pool.storedDamage)||0)>1e-6)return false;
  pool.storedDamage=0;return true;
}

export function selectCapturedHitCandidate({records=[],enemy,enemySystem,weaponId,weaponDef,attackKey,attackGroup,swingDamageMult=1}={}){
  if(!enemy||!enemySystem)return null;
  const enemyScale=enemySystem.heightScale||1;
  const scaledRadius=(enemy.radius||1)*enemyScale*(enemy.collisionScale||1);
  let best=null;
  for(const record of records){
    const zone=record?.zone;if(!zone)continue;
    const threshold=scaledRadius+(Number(zone.radius)||0)+.38;
    const distance=Number(record.minDistance);
    if(!Number.isFinite(distance)||distance>threshold)continue;
    const quality=1-clamp(distance/threshold,0,1);
    const mult=getWeaponDamageMultiplier({weaponId,weaponDef,attackKey,attackGroup,hitType:zone.type,zoneId:zone.id});
    const predicted=Math.max(1,Math.round((Number(zone.damage)||0)*(.82+quality*.42)*mult*(Number(swingDamageMult)||1)));
    const candidate={zone,predicted,quality,minDistance:distance};
    if(!best||candidate.predicted>best.predicted)best=candidate;
  }
  return best;
}

function segmentsIntersect(a,b,c,d){
  const rx=b.x-a.x,rz=b.z-a.z,sx=d.x-c.x,sz=d.z-c.z,cross=rx*sz-rz*sx;
  if(Math.abs(cross)<1e-8)return false;
  const qx=c.x-a.x,qz=c.z-a.z,t=(qx*sz-qz*sx)/cross,u=(qx*rz-qz*rx)/cross;
  return t>=0&&t<=1&&u>=0&&u<=1;
}
function blockedByWall(start,end,segments){return(segments||[]).some(w=>w?.a&&w?.b&&segmentsIntersect(start,end,w.a,w.b));}

export function installCombatCardEffects({THREE,scene,PC,hooks,getPlayer,getEnemySystem,getStance=()=>null,getSwing=()=>null,getMazeSegments=()=>[]}={}){
  if(!THREE||!scene||!PC)throw new Error('[combat-card-effects] THREE, scene, and PC are required.');
  const hookBag=hooks||{};
  const baseZones=PC.getWeaponHitZones.bind(PC);
  const baseDistance=PC.pointSegmentDistance.bind(PC);
  const state={
    charges:0,executionSerial:0,execution:null,savedStaminaClass:null,
    enemySystem:null,originalDamageEnemy:null,originalReset:null,statusDamage:false,
    bleeds:new Map(),shockwaves:[],stunVisuals:new Map(),badge:null,lastStanceId:null,starTexture:null,
    coreTrail:null,coreTrailColor:null,expandedTrail:null,
  };

  function currentStance(){return getStance?.()||null;}
  function currentSwing(){return getSwing?.()||null;}
  function currentWalls(){return getMazeSegments?.()||[];}
  function activeExecution(){
    const ex=state.execution;
    return!!ex&&!!PC.combatState.attack&&PC.combatState.attackKey===ex.attackKey&&PC.combatState.attackGroup===ex.group;
  }
  function isBloodSlashEmpowered(){return activeExecution()&&!!state.execution.modifiers.bloodSlash.empowered;}

  function installBadge(){
    if(typeof document==='undefined'||state.badge)return;
    const style=document.createElement('style');
    style.textContent=`#bloodSlashCharges{position:fixed;top:72px;left:max(10px,env(safe-area-inset-left));z-index:12;display:none;align-items:center;gap:5px;padding:3px 7px 3px 5px;border:1px solid rgba(208,55,66,.72);border-radius:10px;background:rgba(28,9,12,.78);color:#ffd5d8;font:900 12px ui-monospace,Menlo,Consolas,monospace;pointer-events:none;box-shadow:0 2px 0 rgba(0,0,0,.35)}#bloodSlashCharges .drop{width:10px;height:10px;background:#d83b4d;border-radius:70% 0 70% 70%;transform:rotate(-45deg);box-shadow:0 0 7px rgba(216,59,77,.65)}#bloodSlashCharges.on{display:flex}`;
    document.head.appendChild(style);
    const badge=document.createElement('div');badge.id='bloodSlashCharges';badge.setAttribute('aria-label','Blood Slash charges');badge.innerHTML='<span class="drop"></span><span class="count">0</span>';document.body.appendChild(badge);state.badge=badge;
  }
  function syncBadge(){installBadge();if(!state.badge)return;state.badge.classList.toggle('on',state.charges>0);state.badge.querySelector('.count').textContent=String(state.charges);}

  function findCoreTrail(){
    if(state.coreTrail?.parent)return state.coreTrail;
    const trail=scene.children.find(o=>o?.isMesh&&o.frustumCulled===false&&o.geometry?.getAttribute?.('color')&&o.material?.vertexColors===true&&o.name!=='Blood Slash expanded trail');
    if(trail){state.coreTrail=trail;state.coreTrailColor=trail.material.color?.clone?.()||new THREE.Color(0xffffff);trail.name||='Combat weapon trail';}
    return trail||null;
  }
  function styleCoreTrail(){
    const trail=findCoreTrail();if(!trail?.material?.color)return;
    if(isBloodSlashEmpowered())trail.material.color.setHex(BRIGHT_RED);
    else if(state.charges>0)trail.material.color.setHex(DARK_RED);
    else if(state.coreTrailColor)trail.material.color.copy(state.coreTrailColor);
  }

  function makeExpandedTrail(){
    if(state.expandedTrail)return state.expandedTrail;
    const N=24,pos=new Float32Array(N*2*3),col=new Float32Array(N*2*3),idx=[];
    for(let i=0;i<N-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(pos,3));geometry.setAttribute('color',new THREE.BufferAttribute(col,3));geometry.setIndex(idx);
    const material=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,fog:false,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(geometry,material);mesh.name='Blood Slash expanded trail';mesh.frustumCulled=false;mesh.renderOrder=1;mesh.visible=false;scene.add(mesh);
    state.expandedTrail={N,pos,col,mesh,tips:[],bases:[],intensity:0,previous:new THREE.Vector3(),have:false,ownerExecutionId:0};return state.expandedTrail;
  }
  function setVector(array,index,v){array[index*3]=v.x;array[index*3+1]=v.y;array[index*3+2]=v.z;}
  function setTrailColor(array,index,f){array[index*3]=f;array[index*3+1]=f*.035;array[index*3+2]=f*.075;}
  function resetExpandedTrail(){
    const t=makeExpandedTrail();t.tips.length=0;t.bases.length=0;t.intensity=0;t.have=false;t.ownerExecutionId=0;t.mesh.visible=false;
  }
  function expandedTrailEnds(){
    if(!PC.weaponRoot)return null;
    const zones=(PC.getWeaponHitZones?.()||[]).filter(z=>z?.bloodSlashExpanded&&!z?.id?.startsWith('pilebunker'));
    if(!zones.length)return null;
    let near=null,far=null;
    for(const zone of zones)for(const p of[zone.from,zone.to]){if(!near||p.y<near.y)near=p;if(!far||p.y>far.y)far=p;}
    return near&&far?{base:PC.weaponRoot.localToWorld(near.clone()),tip:PC.weaponRoot.localToWorld(far.clone())}:null;
  }
  function updateExpandedTrail(dt){
    const t=makeExpandedTrail(),ex=state.execution;
    if(!isBloodSlashEmpowered()||!ex){if(t.mesh.visible)resetExpandedTrail();return;}
    const ends=expandedTrailEnds();if(!ends){resetExpandedTrail();return;}
    if(t.ownerExecutionId!==ex.id){resetExpandedTrail();t.ownerExecutionId=ex.id;}
    t.mesh.visible=true;const speed=t.have&&dt>0?t.previous.distanceTo(ends.tip)/dt:0;t.previous.copy(ends.tip);t.have=true;
    t.tips.unshift(ends.tip.clone());t.bases.unshift(ends.base.clone());if(t.tips.length>t.N){t.tips.pop();t.bases.pop();}
    while(t.tips.length<t.N){t.tips.push(ends.tip.clone());t.bases.push(ends.base.clone());}
    const target=clamp((speed-1.5)/6,0,1)*1.55;t.intensity+=(target-t.intensity)*Math.min(1,dt*20);
    const mid=new THREE.Vector3();
    for(let i=0;i<t.N;i++){
      const age=i/(t.N-1),tip=t.tips[i],base=t.bases[i];mid.addVectors(tip,base).multiplyScalar(.5);
      const taper=age*.55,A=tip.clone().lerp(mid,taper),B=base.clone().lerp(mid,taper),f=Math.pow(1-age,1.25)*t.intensity;
      setVector(t.pos,i*2,A);setVector(t.pos,i*2+1,B);setTrailColor(t.col,i*2,f);setTrailColor(t.col,i*2+1,f*.78);
    }
    t.mesh.geometry.attributes.position.needsUpdate=true;t.mesh.geometry.attributes.color.needsUpdate=true;
  }

  function restoreWeaponClass(){if(!state.savedStaminaClass)return;const{weaponDef,value}=state.savedStaminaClass;if(weaponDef)weaponDef.staminaClass=value;state.savedStaminaClass=null;}
  function endExecution(){restoreWeaponClass();state.execution=null;resetExpandedTrail();styleCoreTrail();}
  function beginExecution(info={}){
    endExecution();
    const spent=consumeBloodSlashCharge(state.charges,info.group);state.charges=spent.charges;
    const stance=currentStance();
    state.execution=createAttackExecution({id:++state.executionSerial,attackKey:info.key,group:info.group,weaponId:PC.combatState.weapon,stanceId:stance?.id||'',bloodSlash:spent});
    if(spent.empowered){const weaponDef=PC.currentWeapon?.();if(weaponDef?.staminaClass==='Light'){state.savedStaminaClass={weaponDef,value:'Light'};weaponDef.staminaClass='Medium';}}
    syncBadge();styleCoreTrail();
  }

  function trackedPoint(point,zone){
    const originalClone=point.clone.bind(point);
    point.clone=function trackedClone(){const clone=originalClone();clone.__combatHitZone=zone;return clone;};
    return point;
  }
  function prepareZone(source){
    let zone={...source,from:source.from.clone(),to:source.to.clone()};
    if(isBloodSlashEmpowered()&&!zone.id?.startsWith('pilebunker'))zone=expandBloodSlashZone(zone,PC.RIG?.gripCenter??-.14);
    zone.tags=contactTagsForZone(zone);zone.concussion=concussionCoefficient(zone);zone.__executionId=state.execution?.id||0;
    trackedPoint(zone.from,zone);trackedPoint(zone.to,zone);return zone;
  }
  PC.getWeaponHitZones=function effectRuntimeHitZones(){return(baseZones()||[]).map(prepareZone);};

  function findEnemyForSample(point){
    const system=state.enemySystem;if(!system||!point)return null;let best=null,bestDistance=.06;
    for(const enemy of system.enemies||[]){
      const origins=[[enemy.x,enemy.z]];
      if(enemy.attackOriginForward>0)origins.push([enemy.x+enemy.facing.x*enemy.attackOriginForward*(system.heightScale||1),enemy.z+enemy.facing.z*enemy.attackOriginForward*(system.heightScale||1)]);
      for(const[x,z]of origins){const d=Math.hypot(point.x-x,point.z-z);if(d<bestDistance){bestDistance=d;best=enemy;}}
    }
    return best;
  }
  function captureCandidate(point,zone,distance){
    const ex=state.execution;if(!ex||zone.__executionId!==ex.id)return;
    const enemy=findEnemyForSample(point);if(!enemy)return;
    let byZone=ex.candidates.get(enemy);if(!byZone){byZone=new Map();ex.candidates.set(enemy,byZone);}
    const previous=byZone.get(zone.id);if(!previous||distance<previous.minDistance)byZone.set(zone.id,{zone,minDistance:distance});
  }
  PC.pointSegmentDistance=function effectRuntimeDistance(point,a,b){const distance=baseDistance(point,a,b);const zone=a?.__combatHitZone||b?.__combatHitZone;if(zone&&activeExecution())captureCandidate(point,zone,distance);return distance;};

  function makeStarTexture(){
    if(state.starTexture||typeof document==='undefined')return state.starTexture;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d');ctx.translate(32,32);ctx.beginPath();
    for(let i=0;i<10;i++){const angle=-Math.PI/2+i*Math.PI/5,radius=i%2===0?25:11,x=Math.cos(angle)*radius,y=Math.sin(angle)*radius;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
    ctx.closePath();ctx.fillStyle='#ffe36e';ctx.strokeStyle='#8b4e12';ctx.lineWidth=4;ctx.lineJoin='round';ctx.stroke();ctx.fill();
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;state.starTexture=texture;return texture;
  }
  function makeStunVisual(enemy){
    const group=new THREE.Group();group.name='Bing Bong stun stars';const texture=makeStarTexture(),stars=[];
    for(let i=0;i<3;i++){const material=new THREE.SpriteMaterial({map:texture,color:0xffffff,transparent:true,depthWrite:false,depthTest:false}),sprite=new THREE.Sprite(material);sprite.scale.set(.72,.72,1);group.add(sprite);stars.push(sprite);}
    scene.add(group);const entry={enemy,group,stars,phase:Math.random()*Math.PI*2};state.stunVisuals.set(enemy,entry);return entry;
  }
  function clearStunVisual(entry){
    if(!entry)return;if(entry.group?.parent)entry.group.parent.remove(entry.group);for(const sprite of entry.stars||[])sprite.material?.dispose?.();
    const enemy=entry.enemy;if(enemy){enemy.__bingBongStunned=false;enemy.stunState=null;enemy.stunStateRemaining=0;}
  }
  function applyExplicitStun(enemy){
    if(!enemy||enemy.hp<=0)return false;if(enemy.kind==='ant'&&enemy.state==='active')return false;
    enemy.stunned=Math.max(enemy.stunned||0,BING_BONG_STUN_DURATION);enemy.__bingBongStunned=true;enemy.stunState='bingBong';enemy.stunStateRemaining=enemy.stunned;
    if(!state.stunVisuals.has(enemy))makeStunVisual(enemy);return true;
  }
  function makeShockwaveRing(origin){
    const mesh=new THREE.Mesh(new THREE.RingGeometry(.965,1,72),new THREE.MeshBasicMaterial({color:0xffc45f,transparent:true,opacity:.72,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,side:THREE.DoubleSide}));
    mesh.rotation.x=-Math.PI/2;mesh.position.set(origin.x,.11,origin.z);mesh.scale.setScalar(.04);scene.add(mesh);return mesh;
  }
  function startShockwave(primary,profile){
    const origin={x:primary.x,z:primary.z},wave={origin,profile,age:0,life:BING_BONG_WAVE_LIFE,affected:new Set(),walls:[...currentWalls()],mesh:makeShockwaveRing(origin)};
    state.shockwaves.push(wave);wave.affected.add(primary);applyExplicitStun(primary);
  }

  function makeBleedEntry(enemy){
    const pool=createBleedPool({x:enemy.x,z:enemy.z}),group=new THREE.Group();group.name='Movement Bleed indicator';
    const wound=new THREE.Mesh(new THREE.OctahedronGeometry(.18,0),new THREE.MeshBasicMaterial({color:0x8f0d22,transparent:true,opacity:.82,depthWrite:false}));wound.scale.set(.8,1.5,.8);group.add(wound);
    let canvas=null,texture=null,icon=null;if(typeof document!=='undefined'){canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;icon=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,depthTest:false}));icon.scale.set(2.05,1.02,1);group.add(icon);}scene.add(group);
    let bar=null;if(enemy.root&&enemy.bar){const width=Math.max(.4,(enemy.radius||1)*1.7);bar=new THREE.Mesh(new THREE.BoxGeometry(width,.074,.052),new THREE.MeshBasicMaterial({color:0x690817,transparent:true,opacity:.94,depthWrite:false,depthTest:false}));bar.name='Stored Bleed health-bar section';bar.renderOrder=4;enemy.root.add(bar);}
    const entry={enemy,pool,group,wound,icon,canvas,texture,bar,phase:Math.random()*Math.PI*2,pulse:0,lastLabel:-1,lastWarning:false,ending:null,fade:0};drawBleedIcon(entry);return entry;
  }
  function drawBleedIcon(entry,warning=false){
    if(!entry.canvas)return;const ctx=entry.canvas.getContext('2d');ctx.clearRect(0,0,128,64);ctx.save();ctx.translate(25,27);ctx.rotate(-Math.PI/4);ctx.beginPath();ctx.moveTo(0,-18);ctx.bezierCurveTo(17,-4,19,10,0,20);ctx.bezierCurveTo(-19,10,-17,-4,0,-18);ctx.closePath();ctx.fillStyle=warning?'#ff304d':'#9e1128';ctx.strokeStyle='#35030a';ctx.lineWidth=4;ctx.fill();ctx.stroke();ctx.restore();
    const label=String(Math.max(0,Math.ceil(entry.pool.storedDamage)));ctx.font='900 25px ui-monospace,Menlo,Consolas,monospace';ctx.textAlign='left';ctx.textBaseline='middle';ctx.lineWidth=5;ctx.strokeStyle='rgba(25,0,4,.95)';ctx.strokeText(label,50,29);ctx.fillStyle='#ffe8eb';ctx.fillText(label,50,29);
    const timer=clamp(entry.pool.expiresIn/MOVEMENT_BLEED.duration,0,1);ctx.fillStyle='rgba(35,0,5,.8)';ctx.fillRect(49,48,68,7);ctx.fillStyle=warning?'#ff5d69':'#b51d35';ctx.fillRect(49,48,68*timer,7);entry.texture.needsUpdate=true;
  }
  function disposeBleed(entry){
    if(entry.group?.parent)entry.group.parent.remove(entry.group);if(entry.bar?.parent)entry.bar.parent.remove(entry.bar);entry.wound?.geometry?.dispose?.();entry.wound?.material?.dispose?.();entry.icon?.material?.dispose?.();entry.texture?.dispose?.();entry.bar?.geometry?.dispose?.();entry.bar?.material?.dispose?.();
    if(entry.enemy){entry.enemy.bleedStoredDamage=0;entry.enemy.bleedExpiresIn=0;}
  }
  function applyBleed(enemy,directDamage){
    if(!enemy||enemy.hp<=0)return;let entry=state.bleeds.get(enemy);if(!entry){entry=makeBleedEntry(enemy);state.bleeds.set(enemy,entry);}entry.ending=null;entry.fade=0;
    stackBleed(entry.pool,Math.max(MOVEMENT_BLEED.minimumStored,(Number(directDamage)||0)*MOVEMENT_BLEED.storeMultiplier));entry.pool.lastX=Number(enemy.x)||0;entry.pool.lastZ=Number(enemy.z)||0;entry.pulse=Math.max(entry.pulse,.55);enemy.bleedStoredDamage=entry.pool.storedDamage;enemy.bleedExpiresIn=entry.pool.expiresIn;drawBleedIcon(entry);
  }
  function endBleed(entry,reason){if(entry.ending)return;entry.ending=reason;entry.fade=.32;entry.pool.storedDamage=0;entry.pulse=reason==='consumed'?1.65:.72;entry.enemy.bleedStoredDamage=0;entry.enemy.bleedExpiresIn=0;if(entry.bar)entry.bar.visible=false;drawBleedIcon(entry,reason==='expired');}
  function damageByBleed(entry,amount){
    const enemy=entry.enemy;if(!enemy||enemy.hp<=0||amount<=0)return;const damage=Math.min(amount,enemy.hp);entry.pulse=Math.min(1.6,entry.pulse+.35+damage*.035);
    if(damage>=enemy.hp-1e-6){state.statusDamage=true;try{state.originalDamageEnemy(enemy,Math.max(damage,enemy.hp),{x:0,z:0},{power:.22,pop:.16,status:'movementBleed'});}finally{state.statusDamage=false;}}
    else{enemy.hp-=damage;enemy.flash=Math.max(enemy.flash||0,.055);}
  }

  function buildHitContext(enemy,amount,knock,opts){
    const ex=state.execution,byZone=ex?.candidates.get(enemy);if(!activeExecution()||!byZone?.size)return null;
    const weaponDef=PC.currentWeapon?.();
    const selected=selectCapturedHitCandidate({records:[...byZone.values()],enemy,enemySystem:state.enemySystem,weaponId:ex.weaponId,weaponDef,attackKey:ex.attackKey,attackGroup:ex.group,swingDamageMult:currentSwing()?.dmgMult||1});
    ex.candidates.delete(enemy);if(!selected)return null;
    const zone=selected.zone;
    return{executionId:ex.id,execution:ex,source:'player',target:enemy,weaponId:ex.weaponId,zoneId:zone.id,zone,contactTags:new Set(contactTagsForZone(zone)),directDamage:Number(amount)||0,knockback:knock||{x:0,z:0},options:opts||{}};
  }
  function processHit(hit){
    const ex=hit.execution;if(!ex||ex.id!==state.execution?.id)return;
    ex.hitTargets.add(hit.target);
    if(ex.modifiers.bloodSlash.empowered&&ex.group==='horizontal'&&!hit.zoneId?.startsWith('pilebunker'))applyBleed(hit.target,hit.directDamage);
    if(ex.stanceId===BING_BONG_STANCE_ID&&hit.contactTags.has('blunt')&&!hit.zoneId?.startsWith('pilebunker')&&!ex.bingBongPrimaries.has(hit.target)){
      const profile=bingBongProfile(hit.directDamage,concussionCoefficient(hit.zone));
      if(profile){ex.bingBongPrimaries.add(hit.target);startShockwave(hit.target,profile);}
    }
  }

  function patchEnemySystem(){
    let system=null;try{system=getEnemySystem?.();}catch(_){return;}if(!system||system===state.enemySystem||typeof system.damageEnemy!=='function')return;
    state.enemySystem=system;state.originalDamageEnemy=system.damageEnemy.bind(system);state.originalReset=system.reset?.bind(system)||null;
    system.damageEnemy=function effectRuntimeDamage(enemy,amount,knock,opts){
      const before=Number(enemy?.hp),result=state.originalDamageEnemy(enemy,amount,knock,opts),landed=Number.isFinite(before)&&Number.isFinite(enemy?.hp)&&enemy.hp<before;
      if(landed&&!state.statusDamage){const hit=buildHitContext(enemy,amount,knock,opts);if(hit)processHit(hit);}else state.execution?.candidates.delete(enemy);
      return result;
    };
    if(state.originalReset)system.reset=function effectRuntimeReset(){resetEffects();return state.originalReset();};
  }

  function updateBleeds(dt,now){
    const system=state.enemySystem;if(!system)return;
    for(const[enemy,entry]of[...state.bleeds]){
      if(!enemy||enemy.hp<=0||!system.enemies?.includes(enemy)){disposeBleed(entry);state.bleeds.delete(enemy);continue;}
      if(entry.ending){entry.fade-=dt;updateBleedVisual(entry,dt,now);if(entry.fade<=0){disposeBleed(entry);state.bleeds.delete(enemy);}continue;}
      const movement=releaseBleedByMovement(entry.pool,{x:enemy.x,z:enemy.z});if(movement.damage>0)damageByBleed(entry,movement.damage);if(enemy.hp<=0){disposeBleed(entry);state.bleeds.delete(enemy);continue;}
      const consumed=entry.pool.storedDamage<=1e-6,expired=consumed?false:advanceBleed(entry.pool,dt);enemy.bleedStoredDamage=entry.pool.storedDamage;enemy.bleedExpiresIn=entry.pool.expiresIn;if(consumed)endBleed(entry,'consumed');else if(expired)endBleed(entry,'expired');updateBleedVisual(entry,dt,now);
    }
  }
  function updateBleedVisual(entry,dt,now){
    const enemy=entry.enemy,system=state.enemySystem,hs=system?.heightScale||1,ts=enemy.currentTargetScale||enemy.targetScale||1,height=(enemy.height||2)*hs*ts,lift=enemy.targetYOffset||enemy.rootLift||0;entry.phase+=dt*2.8;entry.pulse=Math.max(0,entry.pulse-dt*2.5);
    const warning=!entry.ending&&entry.pool.expiresIn<=1,pulse=1+entry.pulse*.22+(warning ? .07*Math.sin(now*15) : .025*Math.sin(now*6+entry.phase));entry.group.position.set(enemy.x,lift,enemy.z);entry.wound.position.set(0,height*.56,0);entry.wound.rotation.y+=dt*(2.2+entry.pulse*3);entry.wound.scale.set(.8*pulse,1.5*pulse,.8*pulse);entry.wound.material.opacity=entry.ending?clamp(entry.fade/.32,0,1)*.82:(warning ? .98 : .78);
    if(entry.icon){entry.icon.position.set(0,height+.92,0);entry.icon.scale.set(2.05*pulse,1.02*pulse,1);entry.icon.material.opacity=entry.ending?clamp(entry.fade/.32,0,1):(warning ? .88+.12*Math.sin(now*18) : 1);const label=Math.ceil(entry.pool.storedDamage);if(label!==entry.lastLabel||warning!==entry.lastWarning){entry.lastLabel=label;entry.lastWarning=warning;drawBleedIcon(entry,warning);}}
    if(entry.bar&&enemy.bar&&enemy.root){entry.bar.visible=!entry.ending&&entry.pool.storedDamage>0;if(entry.bar.visible){const max=Math.max(1,enemy.maxHp||enemy.hp),hp=clamp(enemy.hp/max,0,1),potential=clamp(Math.min(entry.pool.storedDamage,enemy.hp)/max,0,hp),width=Math.max(.4,(enemy.radius||1)*1.7);entry.bar.scale.x=potential;entry.bar.position.set(width*(hp-potential*.5-.5),enemy.bar.position.y,enemy.bar.position.z+.022);entry.bar.quaternion.copy(enemy.bar.quaternion);entry.bar.material.opacity=warning ? .78+.18*Math.sin(now*16) : .94;}}
  }
  function updateShockwaves(dt){
    const system=state.enemySystem;if(!system)return;
    for(let i=state.shockwaves.length-1;i>=0;i--){const wave=state.shockwaves[i];wave.age+=dt;const k=clamp(wave.age/wave.life,0,1),radius=wave.profile.range*(1-Math.pow(1-k,3));wave.mesh.scale.setScalar(Math.max(.04,radius));wave.mesh.material.opacity=.72*Math.pow(1-k,.68);
      for(const enemy of[...(system.enemies||[])]){if(!enemy||enemy.hp<=0||wave.affected.has(enemy))continue;const allowance=(enemy.radius||1)*(system.heightScale||1)*.35;if(!pointInRadius({originX:wave.origin.x,originZ:wave.origin.z,targetX:enemy.x,targetZ:enemy.z,range:radius+allowance}))continue;wave.affected.add(enemy);if(blockedByWall(wave.origin,{x:enemy.x,z:enemy.z},wave.walls))continue;applyExplicitStun(enemy);}
      if(k>=1){if(wave.mesh?.parent)wave.mesh.parent.remove(wave.mesh);wave.mesh?.geometry?.dispose?.();wave.mesh?.material?.dispose?.();state.shockwaves.splice(i,1);}
    }
  }
  function updateStunVisuals(dt,now){
    const system=state.enemySystem;if(!system)return;
    for(const[enemy,entry]of[...state.stunVisuals]){if(!enemy||enemy.hp<=0||!system.enemies?.includes(enemy)||(enemy.stunned||0)<=0){clearStunVisual(entry);state.stunVisuals.delete(enemy);continue;}enemy.__bingBongStunned=true;enemy.stunState='bingBong';enemy.stunStateRemaining=enemy.stunned;entry.phase+=dt*4.4;const hs=system.heightScale||1,ts=enemy.currentTargetScale||enemy.targetScale||1,height=(enemy.height||2)*hs*ts,y=(enemy.targetYOffset||enemy.rootLift||0)+height+.72,orbit=Math.max(.72,(enemy.radius||1)*hs*.72);entry.group.position.set(enemy.x,y,enemy.z);entry.stars.forEach((star,index)=>{const angle=entry.phase+index*Math.PI*2/entry.stars.length;star.position.set(Math.cos(angle)*orbit,Math.sin(now*7+angle)*.13,Math.sin(angle)*orbit);const pulse=.64+.13*Math.sin(now*8+index*2.1);star.scale.set(pulse,pulse,1);star.material.opacity=.82+.18*Math.sin(now*6+index);});}
  }
  function syncBingBongReadyPose(){const stance=currentStance();if(!stance||stance.id===state.lastStanceId)return;state.lastStanceId=stance.id;if(stance.id===BING_BONG_STANCE_ID||stance.effectId==='bingBong')PC.setReadyPose?.(guardPoseFor(stance));}

  function clearStatuses(){for(const entry of state.bleeds.values())disposeBleed(entry);state.bleeds.clear();for(const wave of state.shockwaves){if(wave.mesh?.parent)wave.mesh.parent.remove(wave.mesh);wave.mesh?.geometry?.dispose?.();wave.mesh?.material?.dispose?.();}state.shockwaves.length=0;for(const entry of state.stunVisuals.values())clearStunVisual(entry);state.stunVisuals.clear();}
  function resetEffects(){endExecution();state.charges=0;clearStatuses();syncBadge();styleCoreTrail();}

  const originalAttackStart=hookBag.onAttackStart,originalAttackComplete=hookBag.onAttackComplete;
  hookBag.onAttackStart=function effectRuntimeAttackStart(info){const out=originalAttackStart?.(info);beginExecution(info);return out;};
  hookBag.onAttackComplete=function effectRuntimeAttackComplete(...args){endExecution();return originalAttackComplete?.(...args);};

  if(typeof window!=='undefined'){
    window.addEventListener('bloodslash:play',()=>{state.charges=BLOOD_SLASH_MAX_CHARGES;syncBadge();styleCoreTrail();window.dispatchEvent(new CustomEvent('bloodslash:charged',{detail:{charges:state.charges}}));});
    window.__COMBAT_EFFECT_RUNTIME__=state;
  }
  findCoreTrail();makeExpandedTrail();syncBadge();styleCoreTrail();

  return{
    state,reset:resetEffects,isBloodSlashEmpowered,
    update(dt,now=0){
      patchEnemySystem();syncBingBongReadyPose();
      if(state.execution&&!activeExecution())endExecution();
      const frame=Math.max(0,Number(dt)||0),time=Number(now)||0;
      styleCoreTrail();updateExpandedTrail(frame);updateBleeds(frame,time);updateShockwaves(frame);updateStunVisuals(frame,time);
    },
  };
}
