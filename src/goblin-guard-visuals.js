const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const smooth01=value=>{const t=clamp(value,0,1);return t*t*(3-2*t);};
const guardedPhase=phase=>phase==='raising'||phase==='holding'||phase==='counterTell'||phase==='lowering';

export function createGoblinGuardVisuals({THREE,worldRoot,system}){
  const effects=[];
  const up=new THREE.Vector3(0,1,0);
  const tip=new THREE.Vector3();
  const targetQ=new THREE.Quaternion();
  const rollQ=new THREE.Quaternion();
  const gripOffset=new THREE.Vector3();
  const targetPos=new THREE.Vector3();
  const sparkGeometry=new THREE.OctahedronGeometry(.09,0);
  const sparkMaterial=new THREE.MeshBasicMaterial({color:0xffd985,transparent:true,opacity:.95,depthWrite:false});
  const barGeometry=new THREE.BoxGeometry(1,.06,.04);
  const barBgMaterial=new THREE.MeshBasicMaterial({color:0x332f2a,transparent:true,opacity:.88,depthWrite:false});
  const barMaterial=new THREE.MeshBasicMaterial({color:0xe7c56f,transparent:true,opacity:.95,depthWrite:false});

  function ensureBar(enemy,state){
    if(state.bar||!enemy.root)return;
    const width=Math.max(1.05,enemy.radius*1.85);
    const bg=new THREE.Mesh(barGeometry,barBgMaterial);
    const fill=new THREE.Mesh(barGeometry,barMaterial);
    bg.scale.set(width,1,1);fill.scale.set(width,1.08,1.08);
    bg.position.set(0,enemy.height+.18,0);fill.position.copy(bg.position);fill.position.z+=.015;
    bg.visible=fill.visible=false;enemy.root.add(bg,fill);state.bar={bg,fill,width};
  }

  function hide(state){if(state?.bar){state.bar.bg.visible=false;state.bar.fill.visible=false;}}

  function updateBar(enemy,state,player,isOwner){
    ensureBar(enemy,state);if(!state.bar)return;
    const visible=isOwner||state.phase==='broken'||state.impactT>0||state.value<state.max-.5;
    state.bar.bg.visible=visible;state.bar.fill.visible=visible;if(!visible)return;
    const ratio=clamp(state.value/state.max,0,1),width=state.bar.width;
    state.bar.fill.scale.x=width*ratio;state.bar.fill.position.x=-(1-ratio)*width*.5;
    state.bar.bg.lookAt(player.x??0,2,player.z??0);state.bar.fill.lookAt(player.x??0,2,player.z??0);
  }

  function spawnSparks(enemy,strong=false){
    if(!worldRoot)return;
    const count=strong?14:7,height=Math.max(1.2,enemy.height*(system.heightScale||1)*.54),facing=enemy.facing||{x:0,z:1};
    for(let index=0;index<count;index++){
      const mesh=new THREE.Mesh(sparkGeometry,sparkMaterial);
      mesh.position.set(enemy.x+facing.x*.48,height,enemy.z+facing.z*.48);mesh.scale.setScalar(strong?1.45:1);worldRoot.add(mesh);
      effects.push({mesh,age:0,life:strong?.52:.31,vx:(Math.random()-.5)*(strong?5.8:3.6)+facing.x*1.2,vy:1.7+Math.random()*(strong?4.5:2.7),vz:(Math.random()-.5)*(strong?5.8:3.6)+facing.z*1.2,spin:(Math.random()-.5)*17});
    }
  }

  function applyPose(enemy,state){
    if(system.isRigidBodyActive?.(enemy))return;
    const h=enemy.height||4,r=enemy.radius||1,impact=clamp(state.impactT/.22,0,1),side=enemy.id%2?1:-1;
    if(guardedPhase(state.phase)){
      const raise=state.phase==='raising'?smooth01(state.phaseT/Math.max(.001,state.profile.raise)):1;
      const lower=state.phase==='lowering'?1-smooth01(state.phaseT/Math.max(.001,state.profile.lower)):1;
      const mix=raise*lower;
      if(enemy.weaponRoot){
        tip.set(side,.04,.10).normalize();targetQ.setFromUnitVectors(up,tip);rollQ.setFromAxisAngle(tip,side*.08);targetQ.premultiply(rollQ);
        const weaponScale=enemy.weaponScale||enemy.RIG?.scale||1;
        gripOffset.set(0,enemy.RIG?.gripCenter??-.14,0).applyQuaternion(targetQ).multiplyScalar(weaponScale);
        targetPos.set(0,h*.54,r*(.60-impact*.12)).sub(gripOffset);
        enemy.weaponRoot.position.lerp(targetPos,mix);enemy.weaponRoot.quaternion.slerp(targetQ,mix);enemy.weaponRoot.scale.setScalar(weaponScale);
      }
      if(enemy.torsoRoot){enemy.torsoRoot.rotation.x+=(-.10-impact*.10)*mix;enemy.torsoRoot.rotation.z+=side*.055*mix;enemy.torsoRoot.position.y-=.04*mix;}
      if(enemy.pelvis)enemy.pelvis.position.y-=h*.025*mix;if(enemy.headRoot)enemy.headRoot.rotation.x+=.10*mix;
    }else if(state.phase==='broken'){
      const mix=1-smooth01(state.phaseT/Math.max(.001,state.profile.breakStun));
      if(enemy.weaponRoot){
        tip.set(side*.75,.64,-.16).normalize();targetQ.setFromUnitVectors(up,tip);
        const weaponScale=enemy.weaponScale||enemy.RIG?.scale||1;
        gripOffset.set(0,enemy.RIG?.gripCenter??-.14,0).applyQuaternion(targetQ).multiplyScalar(weaponScale);
        targetPos.set(side*r*.48,h*.68,-r*.02).sub(gripOffset);
        enemy.weaponRoot.position.lerp(targetPos,mix);enemy.weaponRoot.quaternion.slerp(targetQ,mix);
      }
      if(enemy.torsoRoot){enemy.torsoRoot.rotation.x-=.36*mix;enemy.torsoRoot.rotation.z-=side*.20*mix;}if(enemy.headRoot)enemy.headRoot.rotation.x-=.20*mix;
    }
  }

  function update(dt){
    for(let index=effects.length-1;index>=0;index--){
      const effect=effects[index];effect.age+=dt;
      if(effect.age>=effect.life){effect.mesh.parent?.remove(effect.mesh);effects.splice(index,1);continue;}
      effect.vy-=12*dt;effect.mesh.position.x+=effect.vx*dt;effect.mesh.position.y+=effect.vy*dt;effect.mesh.position.z+=effect.vz*dt;
      effect.mesh.rotation.x+=effect.spin*dt;effect.mesh.rotation.z-=effect.spin*.7*dt;effect.mesh.material.opacity=Math.max(.05,1-effect.age/effect.life);
    }
    sparkMaterial.opacity=.95;
  }

  function clear(){for(const effect of effects)effect.mesh.parent?.remove(effect.mesh);effects.length=0;}
  return{applyPose,clear,hide,spawnSparks,update,updateBar};
}
