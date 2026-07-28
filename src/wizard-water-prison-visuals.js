const WATER_DEEP=0x287eb9;
const WATER=0x66c8f4;
const WATER_PALE=0xcdf5ff;
const WATER_WHITE=0xffffff;

export const WATER_PRISON_VISUAL_CONTRACT=Object.freeze({
  carrierSilhouette:'compact-bubbly-projectile',
  attachedSilhouette:'large-milky-spherical-globe',
  rotatingRims:3,
  shellPatches:6,
  internalFragments:7,
  transformation:'carrier-to-attached-globe',
});

function material(THREE,color,opacity=1,{additive=true,wireframe=false}={}){return new THREE.MeshBasicMaterial({color,transparent:true,opacity,wireframe,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,depthWrite:false,side:THREE.DoubleSide});}
function tag(object,role,value=true){object.userData.visualRole=role;object.userData[role]=value;return object;}
function remember(object){object.userData.baseOpacity=object.material?.opacity??1;object.userData.baseScale={x:object.scale.x,y:object.scale.y,z:object.scale.z};object.userData.basePosition={x:object.position.x,y:object.position.y,z:object.position.z};return object;}

export function makeWaterPrisonProjectileVisual({THREE,scene,size=1,stableId='',renderMode='style'}={}){
  const group=new THREE.Group();group.name='Wizard Arcana Water Prison compact source-locked carrier';group.userData={...group.userData,arcanaId:'WATER-PRISON',stableId,renderMode,visualKind:'carrier'};
  const markers={...WATER_PRISON_VISUAL_CONTRACT,renderMode,phase:'carrier',carrierRadius:.34,attachedRadius:1.35,droplets:0};
  const body=tag(new THREE.Mesh(new THREE.DodecahedronGeometry(.27*size,1),material(THREE,WATER,.54,{additive:false,wireframe:renderMode==='proxy'})),'waterPrisonCarrierBody');body.scale.set(.92,.78,1.20);group.add(remember(body));
  if(renderMode!=='proxy'){
    const core=tag(new THREE.Mesh(new THREE.DodecahedronGeometry(.12*size,0),material(THREE,WATER_PALE,.92)),'waterPrisonCarrierCore');core.position.set(0,.025*size,.08*size);core.scale.set(.82,.72,1.28);group.add(remember(core));
    for(let index=0;index<(renderMode==='style'?6:3);index++){const angle=index*Math.PI*2/(renderMode==='style'?6:3),drop=tag(new THREE.Mesh(new THREE.SphereGeometry((.055+(index%2)*.018)*size,8,5),material(THREE,index%3?WATER:WATER_PALE,.72)),'waterPrisonCarrierDroplet',index);drop.position.set(Math.cos(angle)*(.24+.025*(index%2))*size,Math.sin(angle)*.17*size,-(.18+.07*index)*size);drop.userData.phase=index*1.37;group.add(remember(drop));markers.droplets++;}
  }
  group.userData.visualMarkers=markers;group.renderOrder=8;scene.add(group);return{mesh:group,markers};
}

export function makeWaterPrisonAttachedVisual({THREE,scene,size=1,stableId='',renderMode='style',stackIndex=0}={}){
  const group=new THREE.Group();group.name='Wizard Arcana Water Prison large source-locked attached globe';group.userData={...group.userData,arcanaId:'WATER-PRISON',stableId,renderMode,visualKind:'attached-globe'};
  // 1.35 remains the measured/gameplay contract.  The translucent source
  // shell needs a little more visual shoulder to read around a full enemy rig.
  // This larger render radius never participates in contact or locking.
  const contractRadius=1.35,visibleRadius=1.68,radius=visibleRadius*size,markers={...WATER_PRISON_VISUAL_CONTRACT,renderMode,phase:'attached',carrierRadius:.34,attachedRadius:contractRadius,visibleRadius,stackIndex,rims:0,patches:0,fragments:0,droplets:0,stackBands:0};
  group.userData.stackIndex=stackIndex;
  const shell=tag(new THREE.Mesh(new THREE.SphereGeometry(radius,32,20),material(THREE,WATER,.62,{additive:false,wireframe:renderMode==='proxy'})),'waterPrisonAttachedShell');shell.scale.set(1,.96,1);group.add(remember(shell));
  if(renderMode!=='proxy'){
    const outer=tag(new THREE.Mesh(new THREE.SphereGeometry(radius*1.055,28,18),material(THREE,WATER_PALE,.25)),'waterPrisonOuterGlow');outer.scale.set(1,.96,1);group.add(remember(outer));
    const inner=tag(new THREE.Mesh(new THREE.SphereGeometry(radius*.80,22,16),material(THREE,WATER_DEEP,.34,{additive:false})),'waterPrisonAttachedInner');inner.position.y=-.04*size;group.add(remember(inner));
    for(let index=0;index<3;index++){const rim=tag(new THREE.Mesh(new THREE.TorusGeometry(radius*(.76+index*.09),.065*size,9,48),material(THREE,index===1?WATER_WHITE:WATER_PALE,.86-index*.08)),'waterPrisonAttachedRim',index);rim.rotation.x=(index===0?Math.PI/2:.55+index*.44);rim.rotation.z=index*.78+stackIndex*.37;rim.userData.spin=(index%2?1:-1)*(1.1+index*.28);group.add(remember(rim));markers.rims++;}
    // Exact-position stacks deliberately do not offset collision or the
    // captive target.  Instead each instance owns a wider, differently tilted
    // counter-rotating orbit band and phase-shifted beads.  Two prisons are
    // therefore unmistakable even while sharing the same anchor.
    const stackDirection=stackIndex%2===0?1:-1,stackRadius=radius*(1.08+Math.min(3,stackIndex)*.30);
    for(let index=0;index<2;index++){const secondaryBand=stackIndex%2&&index===0,band=tag(new THREE.Mesh(new THREE.TorusGeometry(stackRadius*(1+index*.055),(.075+index*.020)*size,9,56),material(THREE,secondaryBand?WATER_DEEP:index?WATER_WHITE:WATER_PALE,.96-index*.10,{additive:!secondaryBand})),'waterPrisonStackOrbit',index);band.rotation.x=.72+stackIndex*.31+index*.47;band.rotation.z=stackIndex*1.13+index*Math.PI/2;band.userData.spin=stackDirection*(1.45+index*.42);band.userData.stackIndex=stackIndex;group.add(remember(band));markers.stackBands++;}
    for(let index=0;index<3;index++){const angle=stackIndex*.93+index*Math.PI*2/3,satellite=tag(new THREE.Mesh(new THREE.SphereGeometry((.105+stackIndex*.018)*size,9,6),material(THREE,index===0?WATER_WHITE:WATER_PALE,.92)),'waterPrisonStackSatellite',index);satellite.userData.angle=angle;satellite.userData.radius=stackRadius*1.04;satellite.userData.speed=stackDirection*(1.05+index*.14);satellite.position.set(Math.cos(angle)*satellite.userData.radius,(index-1)*.28*size,Math.sin(angle)*satellite.userData.radius);group.add(remember(satellite));markers.stackBands++;}
    for(let index=0;index<6;index++){const angle=index*Math.PI/3+stackIndex*.73,patch=tag(new THREE.Mesh(new THREE.DodecahedronGeometry((.19+(index%2)*.045)*size,0),material(THREE,index%3?WATER_PALE:WATER_WHITE,.76)),'waterPrisonShellPatch',index);patch.userData.angle=angle;patch.userData.radius=radius*(.75+(index%2)*.10);patch.userData.speed=stackDirection*(index%2?1:-1)*(.55+index*.08);patch.position.set(Math.cos(angle)*patch.userData.radius,(.34*Math.sin(angle*1.7))*size,Math.sin(angle)*patch.userData.radius);patch.scale.set(2.0,.52,.82);group.add(remember(patch));markers.patches++;}
    for(let index=0;index<7;index++){const angle=index*Math.PI*2/7+stackIndex*.91,fragment=tag(new THREE.Mesh(new THREE.DodecahedronGeometry((.14+(index%3)*.03)*size,0),material(THREE,index%2?WATER:WATER_PALE,.80)),'waterPrisonInternalFragment',index);fragment.userData.angle=angle;fragment.userData.radius=radius*(.18+(index%3)*.12);fragment.userData.speed=stackDirection*(index%2?1:-1)*(1.15+index*.09);fragment.position.set(Math.cos(angle)*fragment.userData.radius,(.26*Math.sin(angle*1.4))*size,Math.sin(angle)*fragment.userData.radius);group.add(remember(fragment));markers.fragments++;}
    if(renderMode==='style')for(let index=0;index<12;index++){const angle=index*Math.PI/6+stackIndex*.57,droplet=tag(new THREE.Mesh(new THREE.SphereGeometry((.075+(index%3)*.02)*size,8,5),material(THREE,index%3?WATER:WATER_WHITE,.82)),'waterPrisonAttachedDroplet',index);droplet.userData.angle=angle;droplet.userData.radius=radius*(.91+(index%2)*.10+Math.min(2,stackIndex)*.055);droplet.userData.speed=stackDirection*(index%2?1:-1)*(1.4+(index%4)*.12);droplet.position.set(Math.cos(angle)*droplet.userData.radius,(.42*Math.sin(angle*1.8))*size,Math.sin(angle)*droplet.userData.radius);group.add(remember(droplet));markers.droplets++;}
  }
  group.userData.visualMarkers=markers;group.renderOrder=8;scene.add(group);return{mesh:group,markers};
}

export function animateWaterPrisonVisual({mesh,phase='carrier',age=0,dt=0,now=0,size=1}={}){
  mesh?.children?.forEach((child,index)=>{const role=child.userData?.visualRole,base=child.userData?.baseScale||{x:1,y:1,z:1};
    if(role==='waterPrisonCarrierBody'||role==='waterPrisonCarrierCore'){const pulse=1+.08*Math.sin(now*15+index);child.scale.set(base.x*pulse,base.y/pulse,base.z*(2-pulse));}
    else if(role==='waterPrisonCarrierDroplet'){const position=child.userData.basePosition,phaseOffset=child.userData.phase+age*9;child.position.set(position.x+Math.sin(phaseOffset)*.04*size,position.y+Math.cos(phaseOffset*.8)*.04*size,position.z-Math.abs(Math.sin(phaseOffset*.6))*.09*size);}
    else if(role==='waterPrisonAttachedRim')child.rotation.z+=dt*child.userData.spin;
    else if(role==='waterPrisonStackOrbit'){child.rotation.z+=dt*child.userData.spin;child.rotation.y+=dt*child.userData.spin*.32;}
    else if(['waterPrisonShellPatch','waterPrisonInternalFragment','waterPrisonAttachedDroplet','waterPrisonStackSatellite'].includes(role)){const angle=child.userData.angle+age*child.userData.speed,radius=child.userData.radius;child.position.x=Math.cos(angle)*radius;child.position.z=Math.sin(angle)*radius;child.position.y=(role==='waterPrisonInternalFragment'?.28:role==='waterPrisonStackSatellite'?.52:.36)*Math.sin(angle*(role==='waterPrisonInternalFragment'?1.7:1.3))*size;child.rotation.y=-angle;}
    else if(role==='waterPrisonAttachedShell'||role==='waterPrisonOuterGlow'){const pulse=1+(role==='waterPrisonOuterGlow' ? .045 : .025)*Math.sin(now*(role==='waterPrisonOuterGlow'?7.4:6)+index);child.scale.set(base.x*pulse,base.y*(2-pulse),base.z*pulse);if(role==='waterPrisonOuterGlow')child.material.opacity=(child.userData.baseOpacity??.25)*(.76+.24*Math.sin(now*4.2+index));}
  });
}

export function makeWaterPrisonTransientVisual({THREE,scene,position,size=1,kind='attach',stableId='',renderMode='style'}={}){
  const group=new THREE.Group();group.name=`Wizard Arcana Water Prison ${kind} transition`;group.position.set(position.x,position.y??.32*size,position.z);group.userData={...group.userData,arcanaId:'WATER-PRISON',stableId,renderMode,visualKind:kind};
  const ring=tag(new THREE.Mesh(new THREE.RingGeometry(.28*size,.72*size,40),material(THREE,WATER_PALE,.84)),'waterPrisonTransitionRing');ring.rotation.x=-Math.PI/2;group.add(remember(ring));
  const core=tag(new THREE.Mesh(new THREE.DodecahedronGeometry(.24*size,0),material(THREE,WATER_WHITE,.88)),'waterPrisonTransitionCore');group.add(remember(core));
  if(renderMode==='style')for(let index=0;index<8;index++){const angle=index*Math.PI/4,drop=tag(new THREE.Mesh(new THREE.SphereGeometry(.065*size,8,5),material(THREE,index%2?WATER:WATER_PALE,.76)),'waterPrisonTransitionDroplet',index);drop.userData.angle=angle;drop.position.set(Math.cos(angle)*.46*size,(index%3)*.04*size,Math.sin(angle)*.46*size);group.add(remember(drop));}
  group.renderOrder=11;scene.add(group);return group;
}

export function animateWaterPrisonTransient({mesh,progress=0,size=1}={}){const k=Math.max(0,Math.min(1,progress));mesh?.children?.forEach(child=>{if(child.material)child.material.opacity=(child.userData?.baseOpacity??1)*Math.pow(1-k,.45);if(child.userData?.visualRole==='waterPrisonTransitionDroplet'){const angle=child.userData.angle,radius=(.46+k*.62)*size;child.position.x=Math.cos(angle)*radius;child.position.z=Math.sin(angle)*radius;}});mesh?.scale?.setScalar?.(.80+k*1.15);}
