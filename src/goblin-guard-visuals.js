const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const smooth=value=>{const t=clamp(value,0,1);return t*t*(3-2*t);};

export function createGoblinGuardVisuals({THREE,worldRoot,system}={}){
  const effects=[];
  const up=new THREE.Vector3(0,1,0);
  const tip=new THREE.Vector3();
  const targetQ=new THREE.Quaternion();
  const rollQ=new THREE.Quaternion();
  const targetPos=new THREE.Vector3();
  const sparkGeometry=new THREE.OctahedronGeometry(.085,0);
  const sparkMaterial=new THREE.MeshBasicMaterial({color:0xffd985,transparent:true,opacity:.96,depthWrite:false});
  const bgMaterial=new THREE.MeshBasicMaterial({color:0x2e2924,transparent:true,opacity:.88,depthWrite:false});
  const fillMaterial=new THREE.MeshBasicMaterial({color:0xf0c96b,transparent:true,opacity:.98,depthWrite:false});

  function ensureBar(enemy,state){
    if(state.bar||!enemy.root)return;
    const width=Math.max(1.05,enemy.radius*1.85);
    const geometry=new THREE.BoxGeometry(1,.06,.04);
    const bg=new THREE.Mesh(geometry,bgMaterial);
    const fill=new THREE.Mesh(geometry,fillMaterial);
    bg.name='Goblin duel guard background';
    fill.name='Goblin duel guard';
    bg.position.set(0,enemy.height+.18,0);
    fill.position.copy(bg.position);fill.position.z+=.015;
    bg.visible=fill.visible=false;
    enemy.root.add(bg,fill);
    state.bar={bg,fill,width};
  }

  function spawnSparks(enemy,strong=false){
    if(!worldRoot)return;
    const count=strong?14:7;
    const facing=enemy.facing||{x:0,z:1};
    const height=Math.max(1.2,enemy.height*(system.heightScale||1)*.54);
    for(let i=0;i<count;i++){
      const material=sparkMaterial.clone();
      const mesh=new THREE.Mesh(sparkGeometry,material);
      mesh.position.set(enemy.x+facing.x*.48,height,enemy.z+facing.z*.48);
      mesh.scale.setScalar(strong?1.45:1);
      worldRoot.add(mesh);
      effects.push({mesh,age:0,life:strong?.48:.30,vx:(Math.random()-.5)*(strong?5.4:3.6)+facing.x*1.2,vy:1.7+Math.random()*(strong?4.3:2.6),vz:(Math.random()-.5)*(strong?5.4:3.6)+facing.z*1.2,spin:(Math.random()-.5)*17});
    }
  }

  function applyPose(enemy,state){
    if(system.isRigidBodyActive?.(enemy)||!enemy.weaponRoot)return;
    const guarding=state.phase==='raising'||state.phase==='holding'||state.phase==='counterTell';
    const lowering=state.phase==='lowering';
    if(guarding||lowering){
      const raise=state.phase==='raising'?smooth(state.phaseT/Math.max(.001,state.profile.raise)):1;
      const lower=lowering?1-smooth(state.phaseT/Math.max(.001,state.profile.lower)):1;
      const mix=raise*lower;
      const side=enemy.id%2?1:-1;
      const impact=clamp(state.impactT/.22,0,1);
      tip.set(side,.04,.10).normalize();
      targetQ.setFromUnitVectors(up,tip);
      rollQ.setFromAxisAngle(tip,side*.08);targetQ.premultiply(rollQ);
      targetPos.set(0,(enemy.height||4)*.54,(enemy.radius||1)*(.60-impact*.12));
      enemy.weaponRoot.position.lerp(targetPos,mix);
      enemy.weaponRoot.quaternion.slerp(targetQ,mix);
      if(enemy.torsoRoot){enemy.torsoRoot.rotation.x+=(-.11-impact*.11)*mix;enemy.torsoRoot.rotation.z+=side*.055*mix;}
      if(enemy.pelvis)enemy.pelvis.position.y-=(enemy.height||4)*.025*mix;
      if(enemy.headRoot)enemy.headRoot.rotation.x+=.10*mix;
    }else if(state.phase==='broken'){
      const mix=1-smooth(state.phaseT/Math.max(.001,state.profile.breakStun));
      const side=enemy.id%2?1:-1;
      if(enemy.torsoRoot){enemy.torsoRoot.rotation.x-=.38*mix;enemy.torsoRoot.rotation.z-=side*.22*mix;}
      if(enemy.headRoot)enemy.headRoot.rotation.x-=.22*mix;
    }
  }

  function updateBar(enemy,state,player,isOwner=false){
    ensureBar(enemy,state);
    if(!state.bar)return;
    const visible=isOwner||state.phase!=='idle'||state.impactT>0||state.value<state.max-.5;
    state.bar.bg.visible=state.bar.fill.visible=visible;
    if(!visible)return;
    const ratio=clamp(state.value/state.max,0,1),width=state.bar.width;
    state.bar.bg.scale.x=width;
    state.bar.fill.scale.x=width*ratio;
    state.bar.fill.position.x=-(1-ratio)*width*.5;
    state.bar.bg.lookAt(player.x??0,2,player.z??0);
    state.bar.fill.lookAt(player.x??0,2,player.z??0);
  }

  function update(dt){
    for(let i=effects.length-1;i>=0;i--){
      const fx=effects[i];fx.age+=dt;
      if(fx.age>=fx.life){fx.mesh.parent?.remove(fx.mesh);fx.mesh.material?.dispose?.();effects.splice(i,1);continue;}
      fx.vy-=12*dt;fx.mesh.position.x+=fx.vx*dt;fx.mesh.position.y+=fx.vy*dt;fx.mesh.position.z+=fx.vz*dt;
      fx.mesh.rotation.x+=fx.spin*dt;fx.mesh.rotation.z-=fx.spin*.7*dt;fx.mesh.material.opacity=Math.max(.05,1-fx.age/fx.life);
    }
  }

  function clear(){for(const fx of effects){fx.mesh.parent?.remove(fx.mesh);fx.mesh.material?.dispose?.();}effects.length=0;}
  function hide(state){if(state?.bar){state.bar.bg.visible=false;state.bar.fill.visible=false;}}

  return {spawnSparks,applyPose,updateBar,update,clear,hide};
}
