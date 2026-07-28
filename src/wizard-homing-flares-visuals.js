const FIRE_WHITE=0xffffff;
const FIRE_HOT=0xffffc7;
const FIRE_GOLD=0xffc74d;
const FIRE_ORANGE=0xff742c;
const FIRE_DEEP=0xb52c16;
const FIRE_SOOT=0x4a2115;

export const HOMING_FLARES_VISUAL_CONTRACT=Object.freeze({
  sourceSilhouette:'large-teardrop-flame',
  orbitDirection:'clockwise',
  flameLayers:3,
  taperedTails:3,
  smokePuffs:2,
  impactClass:'chunky-white-orange',
});

function material(THREE,color,opacity=1,{additive=true,wireframe=false}={}){
  return new THREE.MeshBasicMaterial({color,transparent:true,opacity,wireframe,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,depthWrite:false,side:THREE.DoubleSide});
}
function tag(object,role,value=true){object.userData.visualRole=role;object.userData[role]=value;return object;}
function remember(object){object.userData.baseOpacity=object.material?.opacity??1;object.userData.baseScale={x:object.scale.x,y:object.scale.y,z:object.scale.z};object.userData.basePosition={x:object.position.x,y:object.position.y,z:object.position.z};return object;}

export function makeHomingFlareVisual({THREE,scene,size=1,slot=0,stableId='',renderMode='style'}={}){
  const group=new THREE.Group();
  group.name=`Wizard Arcana Homing Flares source-locked flare ${slot+1}`;
  group.userData={...group.userData,arcanaId:'HOMING-FLARES',stableId,renderMode,visualKind:'stored-flare'};
  const markers={...HOMING_FLARES_VISUAL_CONTRACT,renderMode,solidBodies:0,hotCores:0,tails:0,smoke:0,embers:0};
  if(renderMode==='proxy'){
    const contract=tag(new THREE.Mesh(new THREE.SphereGeometry(.31*size,10,7),material(THREE,FIRE_GOLD,.74,{wireframe:true})),'homingFlareContract');contract.scale.set(.88,.72,1.38);group.add(remember(contract));
  }else{
    // Stored flares are one of the source card's dominant silhouettes, not
    // bead-sized orbit markers.  This scale is visual-only; the owned flare's
    // orbit, interception point, acquisition, and collision carrier are kept
    // in the runtime contract.
    const visualSize=size*2.05;
    const aura=tag(new THREE.Mesh(new THREE.SphereGeometry(.34*visualSize,12,8),material(THREE,FIRE_GOLD,.40)),'homingFlareAura');aura.scale.set(1.02,.76,1.36);aura.position.z=.015*visualSize;group.add(remember(aura));
    const body=tag(new THREE.Mesh(new THREE.DodecahedronGeometry(.31*visualSize,1),material(THREE,FIRE_DEEP,.98,{additive:false})),'homingFlareBody');body.scale.set(.94,.76,1.38);body.position.z=.02*visualSize;group.add(remember(body));markers.solidBodies++;
    const shell=tag(new THREE.Mesh(new THREE.DodecahedronGeometry(.265*visualSize,0),material(THREE,FIRE_ORANGE,.94)),'homingFlareShell');shell.scale.set(.92,.68,1.34);shell.position.set(0,.035*visualSize,.07*visualSize);group.add(remember(shell));
    const core=tag(new THREE.Mesh(new THREE.DodecahedronGeometry(.12*visualSize,0),material(THREE,FIRE_HOT,.99)),'homingFlareCore');core.scale.set(.86,.66,1.45);core.position.set(0,.055*visualSize,.19*visualSize);group.add(remember(core));markers.hotCores++;
    for(let index=0;index<3;index++){
      const side=index===0?0:(index===1?-1:1),length=(.66-index*.085)*visualSize,tail=tag(new THREE.Mesh(new THREE.ConeGeometry((.17-index*.018)*visualSize,length,7),material(THREE,index===0?FIRE_GOLD:FIRE_ORANGE,.90-index*.08)),'homingFlareTail',index);tail.rotation.x=-Math.PI/2;tail.rotation.z=side*.22;tail.position.set(side*.12*visualSize,(index%2)*.035*visualSize,-(.33+index*.11)*visualSize);tail.userData.phase=slot*1.7+index*2.2;group.add(remember(tail));markers.tails++;
    }
    if(renderMode==='style'){
      for(let index=0;index<2;index++){const puff=tag(new THREE.Mesh(new THREE.SphereGeometry((.11+index*.04)*visualSize,9,6),material(THREE,index?FIRE_SOOT:FIRE_DEEP,.42-index*.07,{additive:false})),'homingFlareSmoke',index);puff.position.set((index?1:-1)*.11*visualSize,.02*visualSize,-(.78+index*.22)*visualSize);puff.scale.set(1.35,.64,1.58);puff.userData.phase=slot*2.1+index*2.7;group.add(remember(puff));markers.smoke++;}
      for(let index=0;index<2;index++){const ember=tag(new THREE.Mesh(new THREE.SphereGeometry(.04*visualSize,7,5),material(THREE,index?FIRE_HOT:FIRE_GOLD,.82)),'homingFlareEmber',index);ember.position.set((index?1:-1)*.21*visualSize,.10*visualSize,-(.52+index*.24)*visualSize);ember.userData.phase=slot*1.3+index*2.9;group.add(remember(ember));markers.embers++;}
    }
  }
  group.userData.visualMarkers=markers;group.renderOrder=8;scene.add(group);return{mesh:group,markers};
}

export function animateHomingFlareVisual({mesh,age=0,now=0,flight=false,size=1}={}){
  mesh?.children?.forEach((child,index)=>{
    const role=child.userData?.visualRole,base=child.userData?.baseScale||{x:1,y:1,z:1},position=child.userData?.basePosition||{x:0,y:0,z:0},phase=(child.userData?.phase||index)+now*17+age*5;
    if(role==='homingFlareAura'){const pulse=1+.09*Math.sin(phase*.73);child.scale.set(base.x*pulse,base.y/pulse,base.z*(1+.12*Math.sin(phase+.7)));child.material.opacity=(child.userData.baseOpacity??.4)*(.78+.22*Math.sin(phase*.41));}
    else if(role==='homingFlareBody'){const pulse=1+.035*Math.sin(phase*.57);child.scale.set(base.x*pulse,base.y/pulse,base.z*(2-pulse));}
    else if(role==='homingFlareCore'){const pulse=.92+.13*Math.sin(phase);child.scale.set(base.x*pulse,base.y*pulse,base.z*(1.04+.08*Math.sin(phase+.8)));}
    else if(role==='homingFlareShell'){const pulse=1+.06*Math.sin(phase*.83);child.scale.set(base.x*pulse,base.y/pulse,base.z*(2-pulse));}
    else if(role==='homingFlareTail'){const flicker=1+.12*Math.sin(phase);child.scale.set(base.x*flicker,base.y,base.z*(1+(flight?.18:.08)*Math.sin(phase+1.2)));child.rotation.z+=(Math.sin(phase*.7)*.012);}
    else if(role==='homingFlareSmoke'){child.position.set(position.x+Math.sin(phase*.24)*.07*size,position.y+Math.abs(Math.sin(phase*.19))*.08*size,position.z-(flight?.12:0)*Math.abs(Math.cos(phase*.21))*size);child.material.opacity=(child.userData.baseOpacity??.3)*(.72+.28*Math.sin(phase*.17));}
    else if(role==='homingFlareEmber'){child.position.set(position.x+Math.sin(phase*.43)*.08*size,position.y+Math.abs(Math.cos(phase*.31))*.11*size,position.z-Math.abs(Math.sin(phase*.29))*.10*size);}
  });
}

export function makeHomingFlareImpactVisual({THREE,scene,position,size=1,kind='enemy',stableId='',renderMode='style'}={}){
  const group=new THREE.Group();group.name=`Wizard Arcana Homing Flares ${kind} impact`;group.position.set(position.x,position.y??.64*size,position.z);group.userData={...group.userData,arcanaId:'HOMING-FLARES',stableId,renderMode,visualKind:`impact-${kind}`};
  const core=tag(new THREE.Mesh(new THREE.DodecahedronGeometry(.23*size,0),material(THREE,FIRE_WHITE,.98)),'homingFlareImpactCore');group.add(remember(core));
  const shell=tag(new THREE.Mesh(new THREE.DodecahedronGeometry(.40*size,0),material(THREE,kind==='intercept'?FIRE_GOLD:FIRE_ORANGE,.72)),'homingFlareImpactShell');shell.scale.set(1.08,.72,1.08);group.add(remember(shell));
  const ring=tag(new THREE.Mesh(new THREE.TorusGeometry(.38*size,.055*size,7,26),material(THREE,FIRE_HOT,.88)),'homingFlareImpactRing');ring.rotation.x=Math.PI/2;group.add(remember(ring));
  if(renderMode==='style')for(let index=0;index<8;index++){const angle=index*Math.PI/4,spark=tag(new THREE.Mesh(new THREE.DodecahedronGeometry(.065*size,0),material(THREE,index%2?FIRE_WHITE:FIRE_GOLD,.88)),'homingFlareImpactSpark',index);spark.position.set(Math.cos(angle)*.45*size,(index%2?-.06:.08)*size,Math.sin(angle)*.45*size);spark.scale.set(.70,.55,1.55);spark.rotation.y=angle;spark.userData.angle=angle;group.add(remember(spark));}
  group.renderOrder=11;scene.add(group);return group;
}

export function animateHomingFlareImpact({mesh,progress=0,size=1}={}){
  const k=Math.max(0,Math.min(1,progress));mesh?.children?.forEach(child=>{const base=child.userData?.baseOpacity??1;if(child.material)child.material.opacity=base*Math.pow(1-k,.42);if(child.userData?.visualRole==='homingFlareImpactSpark'){const radius=.45*size*(1+k*1.2),angle=child.userData.angle;child.position.x=Math.cos(angle)*radius;child.position.z=Math.sin(angle)*radius;}});mesh?.scale?.setScalar?.(.82+k*1.25);
}
