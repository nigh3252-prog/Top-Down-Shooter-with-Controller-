export const MOVEMENT_BLEED = Object.freeze({
  duration:5,
  storeMultiplier:.65,
  minimumStored:1,
  damagePerUnit:2.2,
});

const DARK_RED=0x5a0712;
const BRIGHT_RED=0xff1835;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function createBleedPool({x=0,z=0}={}){
  return {storedDamage:0,expiresIn:0,lastX:Number(x)||0,lastZ:Number(z)||0};
}

export function stackBleed(pool,amount,duration=MOVEMENT_BLEED.duration){
  if(!pool)return 0;
  const added=Math.max(0,Number(amount)||0);
  pool.storedDamage=Math.max(0,Number(pool.storedDamage)||0)+added;
  if(added>0)pool.expiresIn=Math.max(0,Number(duration)||0);
  return added;
}

export function releaseBleedByMovement(pool,{x=pool?.lastX||0,z=pool?.lastZ||0}={},rate=MOVEMENT_BLEED.damagePerUnit){
  if(!pool)return{distance:0,damage:0,remaining:0};
  const nx=Number(x)||0,nz=Number(z)||0;
  const distance=Math.hypot(nx-(Number(pool.lastX)||0),nz-(Number(pool.lastZ)||0));
  pool.lastX=nx;pool.lastZ=nz;
  const damage=Math.min(Math.max(0,Number(pool.storedDamage)||0),distance*Math.max(0,Number(rate)||0));
  pool.storedDamage=Math.max(0,pool.storedDamage-damage);
  return{distance,damage,remaining:pool.storedDamage};
}

export function advanceBleed(pool,dt){
  if(!pool)return false;
  pool.expiresIn=Math.max(0,(Number(pool.expiresIn)||0)-Math.max(0,Number(dt)||0));
  if(pool.expiresIn>0&&(Number(pool.storedDamage)||0)>1e-6)return false;
  pool.storedDamage=0;
  return true;
}

export function installBloodSlashStatusV2({THREE,scene,PC,cardEffects,getEnemySystem}={}){
  if(!THREE||!scene||!PC||!cardEffects)throw new Error('[blood-slash-status] THREE, scene, PC, and cardEffects are required.');
  const entries=new Map();
  const state={system:null,damage:null,reset:null,statusDamage:false,coreTrail:null,coreColor:null,trail:null};

  function legacyState(){return cardEffects.state||{};}
  function isBoosted(){return PC.combatState.attack===legacyState().boostedAttack&&PC.combatState.attackGroup==='horizontal';}
  function storedFromHit(damage){return Math.max(MOVEMENT_BLEED.minimumStored,(Number(damage)||0)*MOVEMENT_BLEED.storeMultiplier);}

  function disposeLegacy(entry){
    if(entry?.mesh?.parent)entry.mesh.parent.remove(entry.mesh);
    entry?.mesh?.geometry?.dispose?.();entry?.mesh?.material?.dispose?.();
  }
  function clearLegacyFor(enemy){
    const map=legacyState().bleeds,entry=map?.get?.(enemy);
    if(!entry)return false;
    disposeLegacy(entry);map.delete(enemy);return true;
  }
  function drainLegacy(){
    const map=legacyState().bleeds;
    if(!map?.size)return;
    for(const [enemy,entry] of [...map]){disposeLegacy(entry);map.delete(enemy);}
  }

  function findCoreTrail(){
    if(state.coreTrail?.parent)return state.coreTrail;
    const trail=scene.children.find(o=>o?.isMesh&&o.frustumCulled===false&&o.geometry?.getAttribute?.('color')&&o.material?.vertexColors===true&&o.name!=='Blood Slash expanded trail');
    if(trail){state.coreTrail=trail;state.coreColor=trail.material.color?.clone?.()||new THREE.Color(0xffffff);trail.name||='Combat weapon trail';}
    return trail||null;
  }
  function styleCoreTrail(){
    const trail=findCoreTrail();if(!trail?.material?.color)return;
    if(isBoosted())trail.material.color.setHex(BRIGHT_RED);
    else if((legacyState().charges||0)>0)trail.material.color.setHex(DARK_RED);
    else if(state.coreColor)trail.material.color.copy(state.coreColor);
  }

  function makeTrail(){
    if(state.trail)return state.trail;
    const N=24,pos=new Float32Array(N*2*3),col=new Float32Array(N*2*3),idx=[];
    for(let i=0;i<N-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setIndex(idx);
    const m=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,fog:false,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(g,m);mesh.name='Blood Slash expanded trail';mesh.frustumCulled=false;mesh.renderOrder=1;mesh.visible=false;scene.add(mesh);
    state.trail={N,pos,col,mesh,tips:[],bases:[],intensity:0,prev:new THREE.Vector3(),have:false,attack:null};return state.trail;
  }
  function setV(a,i,v){a[i*3]=v.x;a[i*3+1]=v.y;a[i*3+2]=v.z;}
  function setC(a,i,f){a[i*3]=f;a[i*3+1]=f*.035;a[i*3+2]=f*.075;}
  function trailEnds(){
    if(!PC.weaponRoot)return null;
    const zones=(PC.getWeaponHitZones?.()||[]).filter(z=>z?.bloodSlashExpanded&&!z?.id?.startsWith('pilebunker'));
    if(!zones.length)return null;
    let near=null,far=null;
    for(const z of zones)for(const p of[z.from,z.to]){if(!near||p.y<near.y)near=p;if(!far||p.y>far.y)far=p;}
    return near&&far?{base:PC.weaponRoot.localToWorld(near.clone()),tip:PC.weaponRoot.localToWorld(far.clone())}:null;
  }
  function resetTrail(){const t=makeTrail();t.tips.length=t.bases.length=0;t.intensity=0;t.have=false;t.attack=null;t.mesh.visible=false;}
  function updateTrail(dt){
    const t=makeTrail(),attack=PC.combatState.attack,ends=isBoosted()?trailEnds():null;
    if(ends){
      if(t.attack!==attack){resetTrail();t.attack=attack;}
      t.mesh.visible=true;const speed=t.have&&dt>0?t.prev.distanceTo(ends.tip)/dt:0;t.prev.copy(ends.tip);t.have=true;
      t.tips.unshift(ends.tip.clone());t.bases.unshift(ends.base.clone());if(t.tips.length>t.N){t.tips.pop();t.bases.pop();}
      while(t.tips.length<t.N){t.tips.push(ends.tip.clone());t.bases.push(ends.base.clone());}
      const target=clamp((speed-1.5)/6,0,1)*1.55;t.intensity+=(target-t.intensity)*Math.min(1,dt*20);
    }else{t.intensity=Math.max(0,t.intensity-dt*5.5);t.have=false;if(t.intensity<=.01){t.mesh.visible=false;return;}}
    if(!t.tips.length)return;const mid=new THREE.Vector3();
    for(let i=0;i<t.N;i++){
      const age=i/(t.N-1),tip=t.tips[i],base=t.bases[i];mid.addVectors(tip,base).multiplyScalar(.5);
      const taper=age*.55,A=tip.clone().lerp(mid,taper),B=base.clone().lerp(mid,taper),f=Math.pow(1-age,1.25)*t.intensity;
      setV(t.pos,i*2,A);setV(t.pos,i*2+1,B);setC(t.col,i*2,f);setC(t.col,i*2+1,f*.78);
    }
    t.mesh.geometry.attributes.position.needsUpdate=true;t.mesh.geometry.attributes.color.needsUpdate=true;
  }

  function drawIcon(entry,warning=false){
    if(!entry.canvas)return;const c=entry.canvas,ctx=c.getContext('2d');ctx.clearRect(0,0,128,64);ctx.save();ctx.translate(25,27);ctx.rotate(-Math.PI/4);ctx.beginPath();ctx.moveTo(0,-18);ctx.bezierCurveTo(17,-4,19,10,0,20);ctx.bezierCurveTo(-19,10,-17,-4,0,-18);ctx.closePath();ctx.fillStyle=warning?'#ff304d':'#9e1128';ctx.strokeStyle='#35030a';ctx.lineWidth=4;ctx.fill();ctx.stroke();ctx.restore();
    const label=String(Math.max(0,Math.ceil(entry.pool.storedDamage)));ctx.font='900 25px ui-monospace,Menlo,Consolas,monospace';ctx.textAlign='left';ctx.textBaseline='middle';ctx.lineWidth=5;ctx.strokeStyle='rgba(25,0,4,.95)';ctx.strokeText(label,50,29);ctx.fillStyle='#ffe8eb';ctx.fillText(label,50,29);
    const timer=clamp(entry.pool.expiresIn/MOVEMENT_BLEED.duration,0,1);ctx.fillStyle='rgba(35,0,5,.8)';ctx.fillRect(49,48,68,7);ctx.fillStyle=warning?'#ff5d69':'#b51d35';ctx.fillRect(49,48,68*timer,7);entry.texture.needsUpdate=true;
  }
  function makeEntry(enemy){
    const pool=createBleedPool({x:enemy.x,z:enemy.z}),group=new THREE.Group();group.name='Movement Bleed indicator';
    const wound=new THREE.Mesh(new THREE.OctahedronGeometry(.18,0),new THREE.MeshBasicMaterial({color:0x8f0d22,transparent:true,opacity:.82,depthWrite:false}));wound.scale.set(.8,1.5,.8);group.add(wound);
    let canvas=null,texture=null,icon=null;if(typeof document!=='undefined'){canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;icon=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,depthTest:false}));icon.scale.set(2.05,1.02,1);group.add(icon);}scene.add(group);
    let bar=null;if(enemy.root&&enemy.bar){const w=Math.max(.4,(enemy.radius||1)*1.7);bar=new THREE.Mesh(new THREE.BoxGeometry(w,.074,.052),new THREE.MeshBasicMaterial({color:0x690817,transparent:true,opacity:.94,depthWrite:false,depthTest:false}));bar.name='Stored Bleed health-bar section';bar.renderOrder=4;enemy.root.add(bar);}
    const entry={enemy,pool,group,wound,icon,canvas,texture,bar,phase:Math.random()*Math.PI*2,pulse:0,lastLabel:-1,lastWarning:false,ending:null,fade:0};drawIcon(entry);return entry;
  }
  function disposeEntry(entry){
    if(entry.group?.parent)entry.group.parent.remove(entry.group);if(entry.bar?.parent)entry.bar.parent.remove(entry.bar);
    entry.wound?.geometry?.dispose?.();entry.wound?.material?.dispose?.();entry.icon?.material?.dispose?.();entry.texture?.dispose?.();entry.bar?.geometry?.dispose?.();entry.bar?.material?.dispose?.();
    if(entry.enemy){entry.enemy.bleedStoredDamage=0;entry.enemy.bleedExpiresIn=0;}
  }
  function clearAll(){for(const e of entries.values())disposeEntry(e);entries.clear();resetTrail();styleCoreTrail();}
  function apply(enemy,damage){
    if(!enemy||enemy.hp<=0)return;let entry=entries.get(enemy);if(!entry){entry=makeEntry(enemy);entries.set(enemy,entry);}entry.ending=null;entry.fade=0;
    stackBleed(entry.pool,storedFromHit(damage));entry.pool.lastX=Number(enemy.x)||0;entry.pool.lastZ=Number(enemy.z)||0;entry.pulse=Math.max(entry.pulse,.55);enemy.bleedStoredDamage=entry.pool.storedDamage;enemy.bleedExpiresIn=entry.pool.expiresIn;drawIcon(entry);
  }
  function damageByMovement(entry,amount){
    const e=entry.enemy;if(!e||e.hp<=0||amount<=0)return;const damage=Math.min(amount,e.hp);entry.pulse=Math.min(1.6,entry.pulse+.35+damage*.035);
    if(damage>=e.hp-1e-6){state.statusDamage=true;legacyState().bleedTicking=true;try{state.damage(e,Math.max(damage,e.hp),{x:0,z:0},{power:.22,pop:.16,status:'movementBleed'});}finally{legacyState().bleedTicking=false;state.statusDamage=false;}}
    else{e.hp-=damage;e.flash=Math.max(e.flash||0,.055);}
  }
  function end(entry,reason){if(entry.ending)return;entry.ending=reason;entry.fade=.32;entry.pool.storedDamage=0;entry.pulse=reason==='consumed'?1.65:.72;entry.enemy.bleedStoredDamage=0;entry.enemy.bleedExpiresIn=0;if(entry.bar)entry.bar.visible=false;drawIcon(entry,reason==='expired');}
  function updateVisual(entry,dt,now){
    const e=entry.enemy,system=state.system,hs=system?.heightScale||1,ts=e.currentTargetScale||e.targetScale||1,height=(e.height||2)*hs*ts,lift=e.targetYOffset||e.rootLift||0;entry.phase+=dt*2.8;entry.pulse=Math.max(0,entry.pulse-dt*2.5);
    const warning=!entry.ending&&entry.pool.expiresIn<=1,pulse=1+entry.pulse*.22+(warning ? .07*Math.sin(now*15) : .025*Math.sin(now*6+entry.phase));entry.group.position.set(e.x,lift,e.z);entry.wound.position.set(0,height*.56,0);entry.wound.rotation.y+=dt*(2.2+entry.pulse*3);entry.wound.scale.set(.8*pulse,1.5*pulse,.8*pulse);entry.wound.material.opacity=entry.ending?clamp(entry.fade/.32,0,1)*.82:(warning ? .98 : .78);
    if(entry.icon){entry.icon.position.set(0,height+.92,0);entry.icon.scale.set(2.05*pulse,1.02*pulse,1);entry.icon.material.opacity=entry.ending?clamp(entry.fade/.32,0,1):(warning ? .88+.12*Math.sin(now*18) : 1);const label=Math.ceil(entry.pool.storedDamage);if(label!==entry.lastLabel||warning!==entry.lastWarning){entry.lastLabel=label;entry.lastWarning=warning;drawIcon(entry,warning);}}
    if(entry.bar&&e.bar&&e.root){entry.bar.visible=!entry.ending&&entry.pool.storedDamage>0;if(entry.bar.visible){const max=Math.max(1,e.maxHp||e.hp),hp=clamp(e.hp/max,0,1),potential=clamp(Math.min(entry.pool.storedDamage,e.hp)/max,0,hp),w=Math.max(.4,(e.radius||1)*1.7);entry.bar.scale.x=potential;entry.bar.position.set(w*(hp-potential*.5-.5),e.bar.position.y,e.bar.position.z+.022);entry.bar.quaternion.copy(e.bar.quaternion);entry.bar.material.opacity=warning ? .78+.18*Math.sin(now*16) : .94;}}
  }
  function updateEntries(dt,now){
    const system=state.system;if(!system)return;
    for(const[e,entry]of[...entries]){
      if(!e||e.hp<=0||!system.enemies?.includes(e)){disposeEntry(entry);entries.delete(e);continue;}
      if(entry.ending){entry.fade-=dt;updateVisual(entry,dt,now);if(entry.fade<=0){disposeEntry(entry);entries.delete(e);}continue;}
      const move=releaseBleedByMovement(entry.pool,{x:e.x,z:e.z});if(move.damage>0)damageByMovement(entry,move.damage);if(e.hp<=0){disposeEntry(entry);entries.delete(e);continue;}
      const consumed=entry.pool.storedDamage<=1e-6,expired=consumed?false:advanceBleed(entry.pool,dt);e.bleedStoredDamage=entry.pool.storedDamage;e.bleedExpiresIn=entry.pool.expiresIn;if(consumed)end(entry,'consumed');else if(expired)end(entry,'expired');updateVisual(entry,dt,now);
    }
  }

  function patchSystem(){
    let system=null;try{system=getEnemySystem?.();}catch(_){return;}if(!system||system===state.system||typeof system.damageEnemy!=='function')return;
    state.system=system;state.damage=system.damageEnemy.bind(system);state.reset=system.reset?.bind(system)||null;
    system.damageEnemy=function movementBleedDamage(enemy,amount,knock,opts){
      const before=Number(enemy?.hp),result=state.damage(enemy,amount,knock,opts),landed=Number.isFinite(before)&&Number.isFinite(enemy?.hp)&&enemy.hp<before;
      if(!state.statusDamage&&landed&&clearLegacyFor(enemy))apply(enemy,Number(amount)||0);return result;
    };
    if(state.reset)system.reset=function movementBleedReset(){clearAll();return state.reset();};
  }

  findCoreTrail();makeTrail();
  return{state,entries,reset:clearAll,update(dt,now=0){patchSystem();drainLegacy();styleCoreTrail();const frame=Math.max(0,Number(dt)||0);updateTrail(frame);updateEntries(frame,Number(now)||0);}};
}
