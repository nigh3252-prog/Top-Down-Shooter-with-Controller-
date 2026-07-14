// Cyclone Strike + Shield Bash: One on One gameplay layer for Pilebunker.
// Owns gathering, target lock, guaranteed front-arc impact, stun, detonation,
// selectable pooled suction visuals, and guided-aim settings.

import { damageRegisteredArenaEnemy } from './arena-enemy-registry.js';

const EFFECT_SCHEMA=2;
const STORAGE_PREFIX='arena.pilebunker.effect.';
const SUCTION_STYLES=Object.freeze({
  orbits:'CONVERGING ORBITS (RECOMMENDED)',
  tunnel:'VACUUM TUNNEL',
  crossed:'CROSSED COMPRESSION RINGS',
  particles:'PARTICLE CONE (OLD)',
  off:'OFF',
});
const AIM_MODES=Object.freeze({guided:'GUIDED STICK AIM (RECOMMENDED)',auto:'AUTO-FACE ENEMIES'});
const PRESETS=Object.freeze({
  heroic:Object.freeze({label:'HEROIC (RECOMMENDED)',description:'A strong all-purpose Pilebunker: kills light primary targets, visibly stuns survivors, and clears the front of the player.',values:Object.freeze({pullRadius:8.5,pullStrength:15.5,compressionDistance:2.2,frontReach:8.5,primaryDamage:145,primaryStun:2.4,primaryHitRadius:4,secondaryDamage:48,secondaryRadius:6.5,secondaryKnock:14,secondaryStun:.28,eliteControl:.65,aimMoveMultiplier:.28})}),
  duelist:Object.freeze({label:'ONE ON ONE / DUELIST',description:'Smaller crowd effect, but a devastating primary hit and long stun for the chosen victim.',values:Object.freeze({pullRadius:7,pullStrength:13,compressionDistance:2,frontReach:7,primaryDamage:190,primaryStun:3.25,primaryHitRadius:4.2,secondaryDamage:28,secondaryRadius:4.8,secondaryKnock:10,secondaryStun:.15,eliteControl:.55,aimMoveMultiplier:.25})}),
  crowd:Object.freeze({label:'CROWD BREAKER',description:'Wide, aggressive suction and a much stronger secondary detonation for clearing packed encounters.',values:Object.freeze({pullRadius:10,pullStrength:19,compressionDistance:2.4,frontReach:10,primaryDamage:125,primaryStun:2,primaryHitRadius:4.2,secondaryDamage:65,secondaryRadius:8,secondaryKnock:18,secondaryStun:.4,eliteControl:.68,aimMoveMultiplier:.30})}),
  original:Object.freeze({label:'ORIGINAL PROTOTYPE',description:'The initial conservative tuning retained for comparison.',values:Object.freeze({pullRadius:7.5,pullStrength:13,compressionDistance:2.4,frontReach:7.5,primaryDamage:60,primaryStun:1.2,primaryHitRadius:3.2,secondaryDamage:18,secondaryRadius:5.5,secondaryKnock:11,secondaryStun:.08,eliteControl:.55,aimMoveMultiplier:.34})}),
});

export function createPilebunkerCombatEffect({THREE,scene,getEnemies=()=>[],getPlayer=()=>({x:0,z:0,forwardX:0,forwardZ:1}),hitEnemy=null}={}){
  if(!THREE||!scene)throw new Error('[pilebunker-effect] THREE and scene are required.');
  const clamp=THREE.MathUtils.clamp,lerp=THREE.MathUtils.lerp;
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const tuning={...PRESETS.heroic.values};
  let activePreset='heroic',suctionStyle='orbits',aimMode='guided';

  function saveTuning(){
    try{
      localStorage.setItem(STORAGE_PREFIX+'schema',String(EFFECT_SCHEMA));
      localStorage.setItem(STORAGE_PREFIX+'preset',activePreset);
      localStorage.setItem(STORAGE_PREFIX+'suctionStyle',suctionStyle);
      localStorage.setItem(STORAGE_PREFIX+'aimMode',aimMode);
      for(const [key,value] of Object.entries(tuning))localStorage.setItem(STORAGE_PREFIX+key,String(value));
    }catch(_){}
  }
  function loadTuning(){
    try{
      const schema=Number(localStorage.getItem(STORAGE_PREFIX+'schema'));
      if(schema!==EFFECT_SCHEMA){activePreset='heroic';Object.assign(tuning,PRESETS.heroic.values);saveTuning();return;}
      const savedPreset=localStorage.getItem(STORAGE_PREFIX+'preset');activePreset=PRESETS[savedPreset]?savedPreset:'custom';
      const savedStyle=localStorage.getItem(STORAGE_PREFIX+'suctionStyle');if(SUCTION_STYLES[savedStyle])suctionStyle=savedStyle;
      const savedAim=localStorage.getItem(STORAGE_PREFIX+'aimMode');if(AIM_MODES[savedAim])aimMode=savedAim;
      for(const key of Object.keys(tuning)){const saved=Number(localStorage.getItem(STORAGE_PREFIX+key));if(Number.isFinite(saved))tuning[key]=saved;}
    }catch(_){}
  }
  loadTuning();

  const state={active:false,phase:'READY',progress:0,primary:null,locked:false,pullWeight:0,impactPoint:new THREE.Vector3(),compression:new THREE.Vector3(),forward:new THREE.Vector3(0,0,1)};

  /* primary marker */
  const targetMaterial=new THREE.MeshBasicMaterial({color:0xffb066,transparent:true,opacity:.92,blending:THREE.AdditiveBlending,depthWrite:false});
  const targetRing=new THREE.Mesh(new THREE.TorusGeometry(1,.055,8,40),targetMaterial);
  targetRing.rotation.x=Math.PI/2;targetRing.visible=false;targetRing.renderOrder=8;scene.add(targetRing);

  /* shared suction geometry */
  const Z_AXIS=new THREE.Vector3(0,0,1),UP_AXIS=new THREE.Vector3(0,1,0);
  const particleDir=new THREE.Vector3(),particleTarget=new THREE.Vector3(),rightAxis=new THREE.Vector3(),baseQ=new THREE.Quaternion(),tiltQ=new THREE.Quaternion();
  const suctionMaterial=()=>new THREE.MeshBasicMaterial({color:0x9de9df,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});

  /* old particles retained only as a selectable comparison */
  const suctionGeometry=new THREE.BoxGeometry(.055,.055,.72);
  const suctionBaseMaterial=suctionMaterial();
  const suctionParticles=Array.from({length:28},(_,i)=>{
    const mesh=new THREE.Mesh(suctionGeometry,suctionBaseMaterial.clone());mesh.visible=false;mesh.renderOrder=6;scene.add(mesh);
    return{mesh,phase:(i+.5)/28,angle:(i*2.399963229728653)%(Math.PI*2),swirl:.7+((i*37)%11)/11*1.4,widthSeed:.55+((i*17)%13)/13*.75,heightSeed:((i*29)%17)/17,speedSeed:.82+((i*23)%19)/19*.48};
  });

  const ringGeometry=new THREE.TorusGeometry(1,.045,8,56);
  function makeRingPool(count,color=0x8fe1d8){
    return Array.from({length:count},(_,i)=>{
      const material=suctionMaterial();material.color.setHex(color);
      const mesh=new THREE.Mesh(ringGeometry,material);mesh.visible=false;mesh.renderOrder=6;scene.add(mesh);
      return{mesh,phase:(i+.35)/count,seed:i};
    });
  }
  const orbitRings=makeRingPool(5,0x91e7dd);
  const tunnelRings=makeRingPool(7,0xa6eee6);
  const crossedRings=makeRingPool(3,0x86d9d2);

  function hidePool(pool){for(const item of pool)item.mesh.visible=false;}
  function hideSuction(){hidePool(suctionParticles);hidePool(orbitRings);hidePool(tunnelRings);hidePool(crossedRings);}
  function suctionBasis(player){
    const fx=player.forwardX,fz=player.forwardZ;
    particleDir.set(fx,0,fz).normalize();
    rightAxis.set(fz,0,-fx).normalize();
    baseQ.setFromUnitVectors(Z_AXIS,particleDir);
    particleTarget.set(state.compression.x,1.12,state.compression.z);
    return{fx,fz,rx:rightAxis.x,rz:rightAxis.z};
  }
  function updateParticleCone(rawDt,weight,player){
    const {fx,fz,rx,rz}=suctionBasis(player);
    for(const particle of suctionParticles){
      particle.phase=(particle.phase+rawDt*(.38+weight*1.16)*particle.speedSeed)%1;
      const u=particle.phase,eased=smooth(u),distance=lerp(tuning.pullRadius+.5,.15,eased),coneWidth=(.18+distance*.31)*particle.widthSeed;
      const angle=particle.angle+u*particle.swirl*2.4,side=Math.cos(angle)*coneWidth,vertical=Math.sin(angle)*coneWidth*.58+(particle.heightSeed-.5)*.72,curl=Math.sin(u*Math.PI*2+particle.angle)*coneWidth*.16;
      const mesh=particle.mesh;
      mesh.position.set(particleTarget.x+fx*distance+rx*(side+curl),Math.max(.18,particleTarget.y+vertical+distance*.055),particleTarget.z+fz*distance+rz*(side+curl));
      particleDir.copy(particleTarget).sub(mesh.position);if(particleDir.lengthSq()<1e-7)particleDir.set(-fx,0,-fz);particleDir.normalize();
      mesh.quaternion.setFromUnitVectors(Z_AXIS,particleDir);mesh.scale.set(.72+weight*.32,.72+weight*.32,.52+weight*1.45+(1-u)*.42);
      mesh.material.opacity=(.10+weight*.48)*Math.sin(Math.PI*clamp(u,0,1));mesh.visible=true;
    }
  }
  function updateOrbitRings(rawDt,weight,player){
    suctionBasis(player);
    for(const ring of orbitRings){
      ring.phase=(ring.phase+rawDt*(.30+weight*.72)*(1+ring.seed*.035))%1;
      const u=ring.phase,distance=lerp(tuning.pullRadius*.92,.10,smooth(u)),radius=.42+distance*.20;
      const mesh=ring.mesh;
      mesh.position.copy(particleTarget).addScaledVector(particleDir,distance);
      mesh.position.y+=Math.sin(u*Math.PI*2+ring.seed)*(.20+distance*.025);
      mesh.quaternion.copy(baseQ);
      mesh.rotateZ(u*2.7+ring.seed*1.17);
      mesh.rotateX((ring.seed%2?1:-1)*(.34+.12*Math.sin(u*Math.PI*2)));
      mesh.rotateY((ring.seed-2)*.12);
      mesh.scale.setScalar(radius*(.92+weight*.16));
      mesh.material.opacity=(.16+weight*.48)*Math.sin(Math.PI*u);mesh.visible=true;
    }
  }
  function updateTunnelRings(rawDt,weight,player){
    suctionBasis(player);
    for(const ring of tunnelRings){
      ring.phase=(ring.phase+rawDt*(.42+weight*.94))%1;
      const u=ring.phase,distance=lerp(tuning.pullRadius,.10,smooth(u)),radius=.34+distance*.22;
      const mesh=ring.mesh;
      mesh.position.copy(particleTarget).addScaledVector(particleDir,distance);
      mesh.position.y+=.05*Math.sin(ring.seed+u*Math.PI*2);
      mesh.quaternion.copy(baseQ);mesh.rotateZ(ring.seed*.43+u*.65);
      mesh.scale.setScalar(radius);mesh.material.opacity=(.13+weight*.42)*Math.sin(Math.PI*u);mesh.visible=true;
    }
  }
  function updateCrossedRings(rawDt,weight,player){
    suctionBasis(player);
    for(const ring of crossedRings){
      ring.phase=(ring.phase+rawDt*(.28+weight*.62))%1;
      const u=ring.phase,radius=lerp(tuning.pullRadius*.48,.45,smooth(u)),mesh=ring.mesh;
      mesh.position.copy(particleTarget);mesh.position.y+=.08*Math.sin(u*Math.PI*2+ring.seed);
      if(ring.seed===0)mesh.quaternion.copy(baseQ);
      else if(ring.seed===1)mesh.quaternion.setFromUnitVectors(Z_AXIS,rightAxis);
      else mesh.quaternion.setFromUnitVectors(Z_AXIS,UP_AXIS);
      mesh.rotateZ(u*1.9+ring.seed*.7);mesh.scale.setScalar(radius);
      mesh.material.opacity=(.11+weight*.40)*Math.sin(Math.PI*u);mesh.visible=true;
    }
  }
  function updateSuctionVisuals(rawDt){
    const weight=state.pullWeight,visible=state.active&&weight>.015&&suctionStyle!=='off';
    hideSuction();if(!visible)return;
    const player=currentPlayer();
    if(suctionStyle==='particles')updateParticleCone(rawDt,weight,player);
    else if(suctionStyle==='tunnel')updateTunnelRings(rawDt,weight,player);
    else if(suctionStyle==='crossed')updateCrossedRings(rawDt,weight,player);
    else updateOrbitRings(rawDt,weight,player);
  }

  /* pooled impact explosion */
  const explosionShellGeometry=new THREE.IcosahedronGeometry(1,2),explosionCoreGeometry=new THREE.IcosahedronGeometry(1,1);
  const shellPool=Array.from({length:4},()=>{const material=new THREE.MeshBasicMaterial({color:0xffa449,transparent:true,opacity:0,wireframe:true,blending:THREE.AdditiveBlending,depthWrite:false});const mesh=new THREE.Mesh(explosionShellGeometry,material);mesh.visible=false;mesh.renderOrder=9;scene.add(mesh);return{mesh,age:0,life:.42,maxScale:3};});
  const corePool=Array.from({length:4},()=>{const material=new THREE.MeshBasicMaterial({color:0xffe2a1,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});const mesh=new THREE.Mesh(explosionCoreGeometry,material);mesh.visible=false;mesh.renderOrder=10;scene.add(mesh);return{mesh,age:0,life:.22,maxScale:1};});
  const burstGeometry=new THREE.BoxGeometry(.065,.065,.9),burstBaseMaterial=new THREE.MeshBasicMaterial({color:0xffbc68,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});
  const burstLines=Array.from({length:40},()=>{const mesh=new THREE.Mesh(burstGeometry,burstBaseMaterial.clone());mesh.visible=false;mesh.renderOrder=11;scene.add(mesh);return{mesh,velocity:new THREE.Vector3(),age:0,life:.35,spin:0};});
  function activatePool(pool){return pool.find(item=>!item.mesh.visible)||pool[0];}
  function spawnExplosion(point,radius,intensity=1){
    const origin=point.clone();origin.y=Math.max(.72,Math.min(2.2,Number(origin.y)||.9));
    const shell=activatePool(shellPool);shell.age=0;shell.life=.38+.05*intensity;shell.maxScale=Math.min(5,2.1+radius*.34);shell.mesh.position.copy(origin);shell.mesh.scale.setScalar(.18);shell.mesh.material.opacity=.92;shell.mesh.visible=true;
    const core=activatePool(corePool);core.age=0;core.life=.18+.035*intensity;core.maxScale=1.05+.34*intensity;core.mesh.position.copy(origin);core.mesh.scale.setScalar(.12);core.mesh.material.opacity=.98;core.mesh.visible=true;
    const count=Math.min(burstLines.length,24+Math.round(intensity*6));
    for(let i=0;i<count;i++){
      const line=burstLines[i],angle=(i/count)*Math.PI*2+(i%3)*.18+Math.random()*.13,vertical=.08+Math.random()*.72,horizontal=Math.sqrt(Math.max(.08,1-vertical*vertical)),speed=(7.5+Math.random()*7.5)*(1+intensity*.09);
      line.velocity.set(Math.cos(angle)*horizontal*speed,vertical*speed,Math.sin(angle)*horizontal*speed);line.age=0;line.life=.28+Math.random()*.22;line.spin=(Math.random()*2-1)*5;line.mesh.position.copy(origin);
      particleDir.copy(line.velocity).normalize();line.mesh.quaternion.setFromUnitVectors(Z_AXIS,particleDir);line.mesh.scale.set(.8,.8,.7+Math.random()*1.25);line.mesh.material.opacity=.95;line.mesh.visible=true;
    }
    for(let i=count;i<burstLines.length;i++)burstLines[i].mesh.visible=false;
  }
  function updateImpactVisuals(rawDt){
    const dt=Math.max(0,Math.min(.08,rawDt||0));
    for(const shell of shellPool){if(!shell.mesh.visible)continue;shell.age+=dt;const p=shell.age/shell.life;if(p>=1){shell.mesh.visible=false;continue;}shell.mesh.scale.setScalar(lerp(.18,shell.maxScale,smooth(p)));shell.mesh.material.opacity=(1-p)*(1-p)*.9;shell.mesh.rotation.x+=dt*2.1;shell.mesh.rotation.y-=dt*2.7;}
    for(const core of corePool){if(!core.mesh.visible)continue;core.age+=dt;const p=core.age/core.life;if(p>=1){core.mesh.visible=false;continue;}core.mesh.scale.setScalar(lerp(.12,core.maxScale,smooth(p)));core.mesh.material.opacity=(1-p)*.95;}
    for(const line of burstLines){if(!line.mesh.visible)continue;line.age+=dt;const p=line.age/line.life;if(p>=1){line.mesh.visible=false;continue;}line.velocity.y-=10.5*dt;line.mesh.position.addScaledVector(line.velocity,dt);particleDir.copy(line.velocity);if(particleDir.lengthSq()>1e-7){particleDir.normalize();line.mesh.quaternion.setFromUnitVectors(Z_AXIS,particleDir);line.mesh.rotateZ(line.spin*dt);}line.mesh.scale.z=lerp(1.6,.28,p);line.mesh.material.opacity=(1-p)*(1-p)*.94;}
  }

  /* gameplay */
  function liveEnemies(){return getEnemies().filter(enemy=>enemy&&enemy.hp>0&&enemy.root?.parent);}
  function controlMultiplier(enemy){return enemy?.isElite?tuning.eliteControl:1;}
  function currentPlayer(){const p=getPlayer()||{},fx=Number(p.forwardX)||0,fz=Number(p.forwardZ)||1,length=Math.hypot(fx,fz)||1;return{x:Number(p.x)||0,z:Number(p.z)||0,forwardX:fx/length,forwardZ:fz/length};}
  function updateCompression(){const p=currentPlayer();state.forward.set(p.forwardX,0,p.forwardZ);state.compression.set(p.x+p.forwardX*tuning.compressionDistance,.08,p.z+p.forwardZ*tuning.compressionDistance);return p;}
  function frontMetrics(enemy,player){const dx=enemy.x-player.x,dz=enemy.z-player.z;return{dx,dz,distance:Math.hypot(dx,dz),along:dx*player.forwardX+dz*player.forwardZ,lateral:Math.abs(dx*player.forwardZ-dz*player.forwardX)};}
  function isFrontAffected(enemy,player){const m=frontMetrics(enemy,player),closeAllowance=Math.max(.55,(enemy.radius||1)*.72);return m.distance<=tuning.frontReach&&m.along>=-closeAllowance;}
  function pullWeightForPhase(phase,progress){if(phase==='OVERHEAD RATCHET')return .28+smooth(progress)*.16;if(phase==='DEEP COIL')return .62+smooth(progress)*.18;if(phase==='FINAL HOLD')return 1;return 0;}
  function interruptForControl(enemy){enemy.vx*=.12;enemy.vz*=.12;enemy.stunned=Math.max(enemy.stunned||0,.09);if(enemy.state==='windup'||enemy.state==='active'||enemy.state==='recovery'){enemy.state='idle';enemy.stateTime=0;enemy.hitDone=false;}}
  function applyPull(enemy,dt,weight){
    const dx=state.compression.x-enemy.x,dz=state.compression.z-enemy.z,distance=Math.hypot(dx,dz);if(distance<=.001||distance>tuning.pullRadius)return;
    const comfort=.62+(enemy.radius||1)*.78;if(distance<=comfort){enemy.knockX*=Math.pow(.08,dt);enemy.knockZ*=Math.pow(.08,dt);interruptForControl(enemy);return;}
    const resistance=controlMultiplier(enemy),speed=Math.min(tuning.pullStrength,(distance-comfort)*4.2)*weight*resistance,blend=1-Math.exp(-dt*13),nx=dx/distance,nz=dz/distance;
    enemy.knockX=lerp(enemy.knockX||0,nx*speed,blend);enemy.knockZ=lerp(enemy.knockZ||0,nz*speed,blend);interruptForControl(enemy);
  }
  function primaryScore(enemy,player){const m=frontMetrics(enemy,player),pointBlankBonus=m.distance<2.1?1.3:0;return m.lateral*.92+Math.abs(m.along-tuning.compressionDistance)*.54+m.distance*.045-pointBlankBonus;}
  function lockPrimary(forceRefresh=false){
    if(!forceRefresh&&state.locked&&state.primary?.hp>0&&state.primary.root?.parent)return state.primary;
    const player=currentPlayer(),candidates=liveEnemies().filter(enemy=>isFrontAffected(enemy,player));candidates.sort((a,b)=>primaryScore(a,player)-primaryScore(b,player));
    state.primary=candidates[0]||null;state.locked=!!state.primary;return state.primary;
  }
  function updateTargetRing(rawDt){const enemy=state.primary,valid=state.active&&state.locked&&enemy?.hp>0&&enemy.root?.parent;targetRing.visible=!!valid;if(!valid)return;const heightScale=Math.max(.8,enemy.root.scale?.y||1),radius=Math.max(1,(enemy.radius||1)*1.45*heightScale);targetRing.position.set(enemy.x,.11+(enemy.yOff||0),enemy.z);targetRing.scale.setScalar(radius);targetRing.rotation.z+=rawDt*2.8;targetMaterial.opacity=.68+Math.sin(performance.now()*.011)*.18;}
  function dealEnemyHit(enemy,options){try{return damageRegisteredArenaEnemy(enemy,options);}catch(error){if(typeof hitEnemy==='function')return!!hitEnemy(enemy,options);throw error;}}

  function start(){state.active=true;state.phase='PALM BRACE';state.progress=0;state.primary=null;state.locked=false;state.pullWeight=0;updateCompression();}
  function update({phase='READY',progress=0,dt=0,rawDt=dt}={}){
    updateImpactVisuals(Math.max(0,rawDt));if(!state.active)return;
    state.phase=phase;state.progress=progress;updateCompression();state.pullWeight=pullWeightForPhase(phase,progress);
    if(state.pullWeight>0)for(const enemy of liveEnemies())applyPull(enemy,Math.max(0,dt),state.pullWeight);
    if(phase==='FINAL HOLD')lockPrimary(aimMode==='guided');
    if(state.primary&&(state.primary.hp<=0||!state.primary.root?.parent)){state.primary=null;state.locked=false;}
    updateSuctionVisuals(Math.max(0,rawDt));updateTargetRing(Math.max(0,rawDt));
  }
  function impact({point,forward}={}){
    if(!state.active)return{landed:false,primaryHit:false,secondaryHits:0};
    const player=updateCompression(),primary=lockPrimary(aimMode==='guided'),impactPoint=point?.isVector3?point.clone():new THREE.Vector3(state.compression.x,.9,state.compression.z);
    state.impactPoint.copy(impactPoint);
    const forward2=forward?.isVector3?forward.clone():state.forward.clone();forward2.y=0;if(forward2.lengthSq()<1e-6)forward2.copy(state.forward);forward2.normalize();
    let primaryHit=false,secondaryHits=0;
    const primaryAtCompression=primary?Math.hypot(primary.x-state.compression.x,primary.z-state.compression.z):Infinity;
    const primaryStillValid=primary?.hp>0&&primary.root?.parent&&(primaryAtCompression<=tuning.primaryHitRadius||isFrontAffected(primary,player));
    if(primaryStillValid){const control=controlMultiplier(primary);primaryHit=dealEnemyHit(primary,{damage:tuning.primaryDamage,stun:tuning.primaryStun*control,knock:1.15*control,motion:{x:forward2.x,z:forward2.z},point:new THREE.Vector3(primary.x,Math.max(.8,(primary.height||2)*.48),primary.z),role:'primary',power:2.8,pop:1.35});}
    const centerX=state.compression.x,centerZ=state.compression.z;
    for(const enemy of [...liveEnemies()]){
      if(enemy===primary||enemy.hp<=0)continue;
      const frontCaught=isFrontAffected(enemy,player);let dx=enemy.x-centerX,dz=enemy.z-centerZ,blastDistance=Math.hypot(dx,dz);const inBlast=blastDistance<=tuning.secondaryRadius;if(!frontCaught&&!inBlast)continue;
      let nx,nz,falloff;
      if(frontCaught){nx=player.forwardX;nz=player.forwardZ;falloff=lerp(1,.82,clamp(frontMetrics(enemy,player).distance/tuning.frontReach,0,1));}
      else{if(blastDistance<.001){const angle=(enemy.id||1)*2.399963;dx=Math.cos(angle);dz=Math.sin(angle);blastDistance=1;}nx=dx/blastDistance;nz=dz/blastDistance;falloff=lerp(1,.72,clamp(blastDistance/tuning.secondaryRadius,0,1));}
      const control=controlMultiplier(enemy),landed=dealEnemyHit(enemy,{damage:Math.max(1,Math.round(tuning.secondaryDamage*falloff)),stun:tuning.secondaryStun*control,knock:tuning.secondaryKnock*falloff*control,motion:{x:nx,z:nz},point:new THREE.Vector3(enemy.x,Math.max(.7,(enemy.height||2)*.45),enemy.z),role:'secondary',power:1.55,pop:1.2});if(landed)secondaryHits++;
    }
    const landed=primaryHit||secondaryHits>0;spawnExplosion(impactPoint,Math.max(tuning.secondaryRadius,tuning.frontReach*.72),landed?1+Math.min(1.5,secondaryHits*.12):.7);
    state.pullWeight=0;hideSuction();targetRing.visible=false;return{landed,primaryHit,secondaryHits,primary};
  }
  function finish(){state.active=false;state.phase='READY';state.pullWeight=0;state.primary=null;state.locked=false;hideSuction();targetRing.visible=false;}

  /* panel */
  const panelState={inputs:new Map(),presetSelect:null,styleSelect:null,aimSelect:null,description:null};
  function syncPanel(){
    for(const [key,entry] of panelState.inputs){entry.input.value=tuning[key];entry.value.textContent=Number(tuning[key]).toFixed(entry.digits);}
    if(panelState.presetSelect)panelState.presetSelect.value=PRESETS[activePreset]?activePreset:'custom';
    if(panelState.styleSelect)panelState.styleSelect.value=suctionStyle;
    if(panelState.aimSelect)panelState.aimSelect.value=aimMode;
    if(panelState.description)panelState.description.textContent=PRESETS[activePreset]?.description||'Custom advanced tuning. Choose a preset to restore a designed package.';
  }
  function applyPreset(id,{persist=true}={}){const preset=PRESETS[id];if(!preset)return false;Object.assign(tuning,preset.values);activePreset=id;if(persist)saveTuning();syncPanel();return true;}
  function setTuning(key,value){if(!(key in tuning))return;const number=Number(value);if(!Number.isFinite(number))return;tuning[key]=number;activePreset='custom';saveTuning();syncPanel();}
  function setSuctionStyle(value){suctionStyle=SUCTION_STYLES[value]?value:'orbits';hideSuction();saveTuning();syncPanel();return suctionStyle;}
  function setAimMode(value){aimMode=AIM_MODES[value]?value:'guided';state.primary=null;state.locked=false;saveTuning();syncPanel();return aimMode;}
  function addSelect(wrap,labelText,values,current,onChange,aria){
    const row=document.createElement('div');row.className='srow';const label=document.createElement('div');label.className='slabel';label.textContent=labelText;
    const select=document.createElement('select');select.setAttribute('aria-label',aria);select.style.cssText='width:100%;padding:8px;border:1px solid rgba(232,160,76,.45);border-radius:6px;background:#102426;color:#f0d7b1;font:inherit;';
    for(const [value,text] of Object.entries(values)){const option=document.createElement('option');option.value=value;option.textContent=text;select.appendChild(option);}select.value=current;select.addEventListener('change',()=>onChange(select.value));row.append(label,select);wrap.appendChild(row);return select;
  }
  function installPanel(){
    if(typeof document==='undefined')return;const body=document.getElementById('body-powbunker');if(!body||document.getElementById('pilebunkerEffectControls'))return;
    const wrap=document.createElement('div');wrap.id='pilebunkerEffectControls';const heading=document.createElement('div');heading.className='ptitle';heading.textContent='CYCLONE + ONE ON ONE EFFECT';wrap.appendChild(heading);
    panelState.presetSelect=addSelect(wrap,'EFFECT PRESET',Object.fromEntries(Object.entries(PRESETS).map(([id,p])=>[id,p.label])),activePreset,value=>applyPreset(value),'Pilebunker effect preset');
    const customOption=document.createElement('option');customOption.value='custom';customOption.textContent='CUSTOM';panelState.presetSelect.appendChild(customOption);panelState.presetSelect.value=PRESETS[activePreset]?activePreset:'custom';
    panelState.styleSelect=addSelect(wrap,'SUCTION VISUAL',SUCTION_STYLES,suctionStyle,setSuctionStyle,'Pilebunker suction visual');
    panelState.aimSelect=addSelect(wrap,'AIM DURING PILEBUNKER',AIM_MODES,aimMode,setAimMode,'Pilebunker aim mode');
    const description=document.createElement('div');description.className='ptitle';description.style.cssText='line-height:1.4;opacity:.82;margin:5px 0 9px;';wrap.appendChild(description);panelState.description=description;
    const details=document.createElement('details');details.id='pilebunkerAdvancedTuning';details.style.cssText='border-top:1px solid rgba(232,160,76,.20);padding-top:7px;';const summary=document.createElement('summary');summary.className='ptitle';summary.style.cssText='cursor:pointer;user-select:none;padding:7px 0;';summary.textContent='ADVANCED EFFECT TUNING';details.appendChild(summary);
    const defs=[['pullRadius','PULL RADIUS',3,14,.1,1],['pullStrength','PULL STRENGTH',3,26,.25,2],['compressionDistance','COMPRESSION POINT',.5,5,.05,2],['frontReach','GUARANTEED FRONT REACH',3,14,.1,1],['primaryDamage','PRIMARY DAMAGE',20,260,5,0],['primaryStun','PRIMARY STUN',.1,5,.05,2],['primaryHitRadius','PRIMARY CATCH RADIUS',1.5,7,.1,1],['secondaryDamage','SECONDARY DAMAGE',1,120,2,0],['secondaryRadius','BLAST RADIUS',2,12,.1,1],['secondaryKnock','SECONDARY KNOCKBACK',2,26,.25,2],['secondaryStun','SECONDARY STUN',0,1.5,.05,2],['eliteControl','ELITE CONTROL MULTIPLIER',.2,1,.05,2],['aimMoveMultiplier','GUIDED MOVEMENT MULTIPLIER',.08,.60,.01,2]];
    for(const [key,label,min,max,step,digits] of defs){const row=document.createElement('div');row.className='srow';const lab=document.createElement('div');lab.className='slabel';const value=document.createElement('span');value.className='sval';lab.textContent=label+' ';lab.appendChild(value);const input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.step=step;input.setAttribute('aria-label',label);input.addEventListener('input',()=>setTuning(key,input.value));panelState.inputs.set(key,{input,value,digits});row.append(lab,input);details.appendChild(row);}
    wrap.appendChild(details);body.appendChild(wrap);syncPanel();
  }

  function dispose(){
    finish();scene.remove(targetRing);targetRing.geometry.dispose();targetMaterial.dispose();
    for(const particle of suctionParticles){scene.remove(particle.mesh);particle.mesh.material.dispose();}suctionGeometry.dispose();suctionBaseMaterial.dispose();
    for(const pool of [orbitRings,tunnelRings,crossedRings])for(const ring of pool){scene.remove(ring.mesh);ring.mesh.material.dispose();}ringGeometry.dispose();
    for(const shell of shellPool){scene.remove(shell.mesh);shell.mesh.material.dispose();}for(const core of corePool){scene.remove(core.mesh);core.mesh.material.dispose();}explosionShellGeometry.dispose();explosionCoreGeometry.dispose();
    for(const line of burstLines){scene.remove(line.mesh);line.mesh.material.dispose();}burstGeometry.dispose();burstBaseMaterial.dispose();
  }

  return{start,update,impact,finish,installPanel,dispose,setTuning,applyPreset,setSuctionStyle,setAimMode,tuning,state,presets:PRESETS,get activePreset(){return activePreset;},get suctionStyle(){return suctionStyle;},get aimMode(){return aimMode;},get primary(){return state.primary;}};
}
