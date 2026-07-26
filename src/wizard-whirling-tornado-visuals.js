const AIR_DEEP=0x5a9fa8;
const AIR=0x9deaf0;
const AIR_PALE=0xd9fbff;
const AIR_WHITE=0xffffff;

export const WHIRLING_TORNADO_VISUAL_CONTRACT=Object.freeze({
  sourceSilhouette:'broad-opaque-circular-brushstroke-vortex',
  crescentLanes:7,
  whiteCores:6,
  footprintCoverage:1,
  finisherClass:'white-blue-space-making-blast',
});

function material(THREE,color,opacity=1,{additive=true,wireframe=false}={}){return new THREE.MeshBasicMaterial({color,transparent:true,opacity,wireframe,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,depthWrite:false,side:THREE.DoubleSide});}
function tag(object,role,value=true){object.userData.visualRole=role;object.userData[role]=value;return object;}
function remember(object){object.userData.baseOpacity=object.material?.opacity??1;object.userData.baseScale={x:object.scale.x,y:object.scale.y,z:object.scale.z};object.userData.basePosition={x:object.position.x,y:object.position.y,z:object.position.z};return object;}

export function makeWhirlingTornadoVisual({THREE,scene,size=1,radius=2.75,stableId='',renderMode='style'}={}){
  const group=new THREE.Group();group.name='Wizard Arcana Whirling Tornado source-locked vortex';group.userData={...group.userData,arcanaId:'WHIRLING-TORNADO',stableId,renderMode,visualKind:'vortex'};
  const markers={...WHIRLING_TORNADO_VISUAL_CONTRACT,renderMode,contractRadius:radius,visibleRadius:radius,lanes:0,cores:0,wisps:0};
  const footprint=tag(new THREE.Mesh(new THREE.RingGeometry(radius*.88*size,radius*size,56),material(THREE,AIR_PALE,renderMode==='proxy'?.72:.22,{wireframe:renderMode==='proxy'})),'whirlingTornadoFootprint');footprint.rotation.x=-Math.PI/2;footprint.position.y=.045*size;group.add(remember(footprint));
  if(renderMode!=='proxy'){
    const body=tag(new THREE.Mesh(new THREE.SphereGeometry(radius*size,28,16),material(THREE,AIR_DEEP,.38,{additive:false})),'whirlingTornadoBody');body.position.y=.36*size;body.scale.set(1,.27,1);group.add(remember(body));
    const inner=tag(new THREE.Mesh(new THREE.CircleGeometry(radius*.86*size,48),material(THREE,AIR,.26)),'whirlingTornadoInner');inner.rotation.x=-Math.PI/2;inner.position.y=.10*size;group.add(remember(inner));
    for(let index=0;index<7;index++){
      const outer=(.46+index*.075)*radius*size,thickness=(.055+(index%3)*.014)*radius*size,start=index*.83,length=1.62+(index%2)*.38,lane=tag(new THREE.Mesh(new THREE.RingGeometry(Math.max(.08,outer-thickness),outer,48,1,start,length),material(THREE,index%3===0?AIR_WHITE:index%2?AIR_PALE:AIR,.74-index*.035)),'whirlingTornadoLane',index);lane.rotation.x=-Math.PI/2;lane.rotation.z=index*.72;lane.position.y=(.13+(index%3)*.13)*size;lane.userData.spin=(index%2?1:-1)*(1.25+index*.19);group.add(remember(lane));markers.lanes++;
    }
    for(let index=0;index<6;index++){const angle=index*Math.PI/3,core=tag(new THREE.Mesh(new THREE.DodecahedronGeometry((.15+(index%2)*.04)*size,0),material(THREE,AIR_WHITE,.94)),'whirlingTornadoCore',index);core.userData.angle=angle;core.userData.radius=(.42+(index%3)*.20)*radius*size;core.userData.speed=(index%2?1:-1)*(2.8+index*.17);core.position.set(Math.cos(angle)*core.userData.radius,(.28+(index%2)*.18)*size,Math.sin(angle)*core.userData.radius);core.scale.set(1.65,.46,.72);group.add(remember(core));markers.cores++;}
    if(renderMode==='style')for(let index=0;index<14;index++){const angle=index*Math.PI*2/14,wisp=tag(new THREE.Mesh(new THREE.DodecahedronGeometry((.075+(index%3)*.018)*size,0),material(THREE,index%4?AIR:AIR_PALE,.58)),'whirlingTornadoWisp',index);wisp.userData.angle=angle;wisp.userData.radius=(.32+(index%5)*.12)*radius*size;wisp.userData.speed=(index%2?1:-1)*(3.6+(index%4)*.32);wisp.position.set(Math.cos(angle)*wisp.userData.radius,(.18+(index%4)*.16)*size,Math.sin(angle)*wisp.userData.radius);wisp.scale.set(2.4,.42,.62);wisp.rotation.y=-angle;group.add(remember(wisp));markers.wisps++;}
  }
  group.userData.visualMarkers=markers;group.renderOrder=7;scene.add(group);return{mesh:group,markers};
}

export function animateWhirlingTornadoVisual({mesh,age=0,dt=0,now=0,size=1}={}){
  mesh?.children?.forEach((child,index)=>{const role=child.userData?.visualRole;
    if(role==='whirlingTornadoLane'){child.rotation.z+=dt*child.userData.spin;child.material.opacity=(child.userData.baseOpacity??.7)*(.82+.18*Math.sin(now*13+index));}
    else if(role==='whirlingTornadoCore'||role==='whirlingTornadoWisp'){const angle=child.userData.angle+age*child.userData.speed,radius=child.userData.radius;child.position.x=Math.cos(angle)*radius;child.position.z=Math.sin(angle)*radius;child.rotation.y=-angle;const base=child.userData.baseScale,pulse=.88+.17*Math.sin(now*15+index);child.scale.set(base.x*pulse,base.y,base.z/pulse);}
    else if(role==='whirlingTornadoBody'){const base=child.userData.baseScale,pulse=1+.035*Math.sin(now*10);child.scale.set(base.x*pulse,base.y*(2-pulse),base.z*pulse);}
  });
}

export function makeWhirlingTornadoTransientVisual({THREE,scene,position,size=1,radius=1,kind='tick',stableId='',renderMode='style'}={}){
  const group=new THREE.Group();group.name=`Wizard Arcana Whirling Tornado ${kind}`;group.position.set(position.x,position.y??.12*size,position.z);group.userData={...group.userData,arcanaId:'WHIRLING-TORNADO',stableId,renderMode,visualKind:kind};
  const scale=kind==='finisher'?radius:Math.min(radius,.72*size),ring=tag(new THREE.Mesh(new THREE.RingGeometry(.30*scale,.72*scale,38),material(THREE,kind==='finisher'?AIR_WHITE:AIR_PALE,.88)),'whirlingTornadoBurstRing');ring.rotation.x=-Math.PI/2;group.add(remember(ring));
  const core=tag(new THREE.Mesh(new THREE.DodecahedronGeometry(.25*scale,0),material(THREE,AIR_WHITE,.96)),'whirlingTornadoBurstCore');core.position.y=.12*size;group.add(remember(core));
  if(renderMode==='style')for(let index=0;index<(kind==='finisher'?12:6);index++){const angle=index*Math.PI/(kind==='finisher'?6:3),ray=tag(new THREE.Mesh(new THREE.DodecahedronGeometry(.07*scale,0),material(THREE,index%2?AIR_WHITE:AIR,.82)),'whirlingTornadoBurstRay',index);ray.userData.angle=angle;ray.userData.baseRadius=.50*scale;ray.position.set(Math.cos(angle)*ray.userData.baseRadius,(index%2)*.08*size,Math.sin(angle)*ray.userData.baseRadius);ray.scale.set(2.2,.42,.58);ray.rotation.y=-angle;group.add(remember(ray));}
  group.renderOrder=11;scene.add(group);return group;
}

export function animateWhirlingTornadoTransient({mesh,progress=0}={}){const k=Math.max(0,Math.min(1,progress));mesh?.children?.forEach(child=>{if(child.material)child.material.opacity=(child.userData?.baseOpacity??1)*Math.pow(1-k,.42);if(child.userData?.visualRole==='whirlingTornadoBurstRay'){const angle=child.userData.angle,radius=child.userData.baseRadius*(1+k*1.5);child.position.x=Math.cos(angle)*radius;child.position.z=Math.sin(angle)*radius;}});mesh?.scale?.setScalar?.(.76+k*1.35);}
