function shieldPose(THREE,name){
  const poses={
    back:{position:new THREE.Vector3(0,1.52,-.52),rotation:new THREE.Euler(0,Math.PI,.04)},
    side:{position:new THREE.Vector3(-.90,1.42,.12),rotation:new THREE.Euler(0,Math.PI/2,.08)},
    guard:{position:new THREE.Vector3(-.42,1.48,1.30),rotation:new THREE.Euler(0,0,-.06)},
  };
  return poses[name]||poses.back;
}

export function installStanceGate5Visuals({PC,windowRef=globalThis.window,documentRef=globalThis.document}={}){
  if(!PC||!windowRef||!documentRef)return{update(){},pulse(){},destroy(){}};
  let visual=null,lastState=null,pendingPulse=null,destroyed=false;

  (async()=>{
    try{
      const THREE=await import('three');
      if(destroyed)return;
      const root=new THREE.Group();root.name='Arena Defense Visuals';
      const shield=new THREE.Group();shield.name='Hammerfall Kite Shield';
      const shape=new THREE.Shape();
      shape.moveTo(0,1.2);shape.lineTo(.78,.72);shape.lineTo(.68,-.38);shape.lineTo(0,-1.12);shape.lineTo(-.68,-.38);shape.lineTo(-.78,.72);shape.closePath();
      const boardGeometry=new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelSize:.055,bevelThickness:.04,bevelSegments:1});
      boardGeometry.center();
      const boardMaterial=new THREE.MeshStandardMaterial({color:0x5f6d72,roughness:.72,metalness:.18,flatShading:true,emissive:0x000000});
      const board=new THREE.Mesh(boardGeometry,boardMaterial);board.castShadow=true;board.receiveShadow=true;
      const rimGeometry=new THREE.EdgesGeometry(boardGeometry);
      const rimMaterial=new THREE.LineBasicMaterial({color:0xc9b58a,transparent:true,opacity:.9});
      const rim=new THREE.LineSegments(rimGeometry,rimMaterial);
      const boss=new THREE.Mesh(new THREE.SphereGeometry(.19,12,8),new THREE.MeshStandardMaterial({color:0xb79a62,roughness:.42,metalness:.58,flatShading:true}));
      boss.scale.z=.36;boss.position.z=.12;
      shield.add(board,rim,boss);shield.scale.setScalar(1.8);shield.visible=false;root.add(shield);

      // Long Blade deliberately uses a tiny reusable effect rather than authored
      // sword posing: a low ring shows the live timing window and a wireframe
      // sphere gives the button press / successful deflect a quick readable pop.
      const parryMaterial=new THREE.MeshBasicMaterial({color:0xbcecff,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
      const parry=new THREE.Mesh(new THREE.RingGeometry(.85,1.12,48),parryMaterial);parry.rotation.x=-Math.PI/2;parry.position.y=.14;parry.visible=false;root.add(parry);
      const burstGeometry=new THREE.SphereGeometry(.46,14,9);
      const burstMaterial=new THREE.MeshBasicMaterial({color:0xbcecff,transparent:true,opacity:0,wireframe:true,depthWrite:false,blending:THREE.AdditiveBlending});
      const burst=new THREE.Mesh(burstGeometry,burstMaterial);burst.name='Long Blade Parry Burst';burst.position.set(0,1.25,.24);burst.visible=false;root.add(burst);
      const flashLight=new THREE.PointLight(0xbcecff,0,7,2);flashLight.position.set(0,1.9,.4);root.add(flashLight);
      visual={
        THREE,root,shield,board,boardGeometry,boardMaterial,rimGeometry,rimMaterial,boss,
        parry,parryMaterial,burst,burstGeometry,burstMaterial,flashLight,
        pulseT:0,pulseDuration:.24,burstT:0,burstDuration:.18,burstSuccess:false,
      };
      if(pendingPulse){pulse(pendingPulse);pendingPulse=null;}
      update(lastState,0);
    }catch(error){console.warn('[arena-defense] visuals did not install',error);}
  })();

  function actorRoot(){
    const activeModel=PC.combatLayer?.parent||null;
    return activeModel?.parent||activeModel;
  }
  function ensureParent(){
    const parent=actorRoot();
    if(visual&&parent&&visual.root.parent!==parent){visual.root.parent?.remove(visual.root);parent.add(visual.root);}
    return parent;
  }
  function pulse(kind='parry-open'){
    if(!visual){pendingPulse=kind;return;}
    const parrySuccess=kind==='parry-success';
    const parryPulse=parrySuccess||kind==='parry-open'||kind==='parry';
    visual.pulseT=visual.pulseDuration;
    const color=kind==='block'?0xffd789:kind==='guard-break'?0xff746b:parrySuccess?0xfff0aa:0xbcecff;
    visual.parryMaterial.color.setHex(color);visual.flashLight.color.setHex(color);
    if(parryPulse){
      visual.burstSuccess=parrySuccess;
      visual.burstDuration=parrySuccess?.24:.16;
      visual.burstT=visual.burstDuration;
      visual.burstMaterial.color.setHex(color);
      visual.burst.scale.setScalar(parrySuccess?.48:.30);
      visual.burst.visible=true;
    }
    if(kind==='block')visual.boardMaterial.emissive.setHex(0x7b5420);
    else if(kind==='guard-break')visual.boardMaterial.emissive.setHex(0x7d1814);
  }
  function update(state,dt=0){
    lastState=state||lastState;if(!visual||!lastState)return;ensureParent();
    const frameDt=Math.max(0,Number(dt)||0);
    const shieldOwned=lastState.shieldOwned===true;
    const shieldStance=lastState.kind==='shield';
    const attacking=lastState.attacking===true;
    const poseName=!shieldStance?'back':lastState.guardRaised&&!attacking?'guard':'side';
    const pose=shieldPose(visual.THREE,poseName);
    visual.shield.visible=shieldOwned;
    visual.shield.position.lerp(pose.position,Math.min(1,.18+frameDt*9));
    const targetQ=new visual.THREE.Quaternion().setFromEuler(pose.rotation);
    visual.shield.quaternion.slerp(targetQ,Math.min(1,.2+frameDt*10));

    const parryActive=lastState.kind==='parry'&&(lastState.parryRemaining>0||lastState.parrySuccessRemaining>0);
    visual.parry.visible=parryActive||visual.pulseT>0;
    if(parryActive){
      const active=lastState.parryRemaining>0;
      visual.parryMaterial.opacity=active?.62:.82;
      visual.parry.scale.setScalar(active?1:1.18);
    }
    if(visual.pulseT>0){
      visual.pulseT=Math.max(0,visual.pulseT-frameDt);
      const strength=visual.pulseT/visual.pulseDuration;
      visual.parry.visible=true;visual.parryMaterial.opacity=Math.max(visual.parryMaterial.opacity,strength*.95);
      visual.parry.scale.setScalar(1+(1-strength)*.72);
      visual.flashLight.intensity=4.8*strength;
      visual.boardMaterial.emissiveIntensity=strength*.85;
    }else{
      visual.flashLight.intensity=0;visual.boardMaterial.emissiveIntensity=0;
      if(!parryActive)visual.parry.visible=false;
    }

    if(visual.burstT>0){
      visual.burstT=Math.max(0,visual.burstT-frameDt);
      const strength=visual.burstT/Math.max(.001,visual.burstDuration);
      const expansion=1-strength;
      const start=visual.burstSuccess?.48:.30;
      const distance=visual.burstSuccess?2.05:1.35;
      visual.burst.visible=true;
      visual.burst.scale.setScalar(start+distance*expansion);
      visual.burstMaterial.opacity=(visual.burstSuccess?.95:.72)*strength*strength;
      visual.burst.rotation.y+=frameDt*(visual.burstSuccess?8:5);
    }else{
      visual.burst.visible=false;visual.burstMaterial.opacity=0;
    }
  }
  function destroy(){
    destroyed=true;if(!visual)return;visual.root.parent?.remove(visual.root);
    visual.boardGeometry.dispose();visual.rimGeometry.dispose();visual.parry.geometry.dispose();visual.burstGeometry.dispose();visual.boss.geometry.dispose();
    visual.boardMaterial.dispose();visual.rimMaterial.dispose();visual.parryMaterial.dispose();visual.burstMaterial.dispose();visual.boss.material.dispose();visual=null;
  }
  return{update,pulse,destroy};
}
