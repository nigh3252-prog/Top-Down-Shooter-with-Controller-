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

function makeSpiralRibbonGeometry(THREE,{radius,start=0,turns=.82,height=.92,segments=34}={}){
  if(!THREE.BufferGeometry||!THREE.Float32BufferAttribute)return null;
  const positions=[],indices=[];
  for(let index=0;index<=segments;index++){
    const t=index/segments,angle=start+turns*Math.PI*2*t,center=radius*(.18+.76*t),taper=Math.pow(Math.sin(Math.PI*t),.58),halfWidth=radius*(.022+.125*taper),y=height+Math.sin(t*Math.PI*2+start)*.075;
    for(const offset of[-halfWidth,halfWidth]){const sampleRadius=center+offset;positions.push(Math.cos(angle)*sampleRadius,y,Math.sin(angle)*sampleRadius);}
    if(index<segments){const base=index*2;indices.push(base,base+1,base+2,base+1,base+3,base+2);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);return geometry;
}

export function makeWhirlingTornadoVisual({THREE,scene,size=1,radius=2.75,stableId='',renderMode='style'}={}){
  const group=new THREE.Group();group.name='Wizard Arcana Whirling Tornado source-locked vortex';group.userData={...group.userData,arcanaId:'WHIRLING-TORNADO',stableId,renderMode,visualKind:'vortex'};
  const visualRadius=radius*size*(renderMode==='proxy'?1:1.4);
  const markers={...WHIRLING_TORNADO_VISUAL_CONTRACT,renderMode,contractRadius:radius,visibleRadius:radius,renderRadius:visualRadius/size,lanes:0,brushRibbons:0,brushHoops:0,cores:0,wisps:0};
  const footprint=tag(new THREE.Mesh(new THREE.RingGeometry(visualRadius*.79,visualRadius,64),material(THREE,AIR_PALE,renderMode==='proxy'?.72:.58,{wireframe:renderMode==='proxy'})),'whirlingTornadoFootprint');footprint.rotation.x=-Math.PI/2;footprint.position.y=.16*size;group.add(remember(footprint));
  if(renderMode!=='proxy'){
    // The source vortex is a broad, nearly opaque mass.  Keep the sheets above
    // the arena plane so perspective/depth sorting cannot collapse them into a
    // few thin rings around the caster's feet.
    const body=tag(new THREE.Mesh(new THREE.SphereGeometry(visualRadius,32,18),material(THREE,AIR_DEEP,.68,{additive:false})),'whirlingTornadoBody');body.position.y=.96*size;body.scale.set(1,.24,1);group.add(remember(body));
    const inner=tag(new THREE.Mesh(new THREE.CircleGeometry(visualRadius*.94,56),material(THREE,AIR,.38)),'whirlingTornadoInner');inner.rotation.x=-Math.PI/2;inner.position.y=.70*size;group.add(remember(inner));
    const ribbonCount=renderMode==='style'?4:3;
    for(let index=0;index<ribbonCount;index++){const geometry=makeSpiralRibbonGeometry(THREE,{radius:visualRadius,start:index*Math.PI*2/ribbonCount+.24,turns:.76+(index%2)*.09,height:(.78+index*.11)*size});if(!geometry)continue;const colors=[AIR_DEEP,AIR,AIR_PALE,AIR_WHITE],ribbon=tag(new THREE.Mesh(geometry,material(THREE,colors[index%colors.length],.68+index*.065,{additive:index===ribbonCount-1})),'whirlingTornadoBrushRibbon',index);ribbon.userData.spin=(index%2?1:-1)*(.92+index*.16);group.add(remember(ribbon));markers.brushRibbons++;}
    for(let index=0;index<4;index++){const hoopRadius=visualRadius*(.96-index*.13),tube=visualRadius*(.070+(index%2)*.018),hoop=tag(new THREE.Mesh(new THREE.TorusGeometry(hoopRadius,tube,9,64,4.72+index*.27),material(THREE,index===0?AIR_DEEP:index===3?AIR_WHITE:index%2?AIR_PALE:AIR,.68+index*.065,{additive:index>=2})),'whirlingTornadoBrushHoop',index);hoop.rotation.x=-Math.PI/2+(index-1.5)*.10;hoop.rotation.z=index*1.37;hoop.position.y=(.72+index*.20)*size;hoop.userData.spin=(index%2?1:-1)*(1.18+index*.24);group.add(remember(hoop));markers.brushHoops++;}
    for(let index=0;index<7;index++){
      const outer=(.52+index*.08)*visualRadius,thickness=(.14+(index%3)*.025)*visualRadius,start=index*.79,length=2.28+(index%3)*.31,lane=tag(new THREE.Mesh(new THREE.RingGeometry(Math.max(.08,outer-thickness),outer,64,1,start,length),material(THREE,index%3===0?AIR_WHITE:index%2?AIR_PALE:AIR,.88-index*.028,{additive:index%3===0})),'whirlingTornadoLane',index);lane.rotation.x=-Math.PI/2;lane.rotation.z=index*.67;lane.position.y=(.76+(index%3)*.23)*size;lane.userData.spin=(index%2?1:-1)*(1.45+index*.21);group.add(remember(lane));markers.lanes++;
    }
    for(let index=0;index<6;index++){const angle=index*Math.PI/3,core=tag(new THREE.Mesh(new THREE.DodecahedronGeometry((.21+(index%2)*.055)*size,0),material(THREE,AIR_WHITE,.98)),'whirlingTornadoCore',index);core.userData.angle=angle;core.userData.radius=(.43+(index%3)*.22)*visualRadius;core.userData.speed=(index%2?1:-1)*(3.0+index*.19);core.position.set(Math.cos(angle)*core.userData.radius,(.84+(index%2)*.28)*size,Math.sin(angle)*core.userData.radius);core.scale.set(2.35,.55,.94);group.add(remember(core));markers.cores++;}
    if(renderMode==='style')for(let index=0;index<14;index++){const angle=index*Math.PI*2/14,wisp=tag(new THREE.Mesh(new THREE.DodecahedronGeometry((.14+(index%3)*.028)*size,0),material(THREE,index%4?AIR:AIR_PALE,.78,{additive:index%4===0})),'whirlingTornadoWisp',index);wisp.userData.angle=angle;wisp.userData.radius=(.34+(index%5)*.15)*visualRadius;wisp.userData.speed=(index%2?1:-1)*(3.8+(index%4)*.38);wisp.position.set(Math.cos(angle)*wisp.userData.radius,(.76+(index%4)*.22)*size,Math.sin(angle)*wisp.userData.radius);wisp.scale.set(4.4,.54,1.0);wisp.rotation.y=-angle;group.add(remember(wisp));markers.wisps++;}
  }
  group.userData.visualMarkers=markers;group.renderOrder=7;scene.add(group);return{mesh:group,markers};
}

export function animateWhirlingTornadoVisual({mesh,age=0,dt=0,now=0,size=1}={}){
  mesh?.children?.forEach((child,index)=>{const role=child.userData?.visualRole;
    if(role==='whirlingTornadoLane'){child.rotation.z+=dt*child.userData.spin;child.material.opacity=(child.userData.baseOpacity??.7)*(.82+.18*Math.sin(now*13+index));}
    else if(role==='whirlingTornadoBrushRibbon'){child.rotation.y+=dt*child.userData.spin;child.material.opacity=(child.userData.baseOpacity??.72)*(.86+.14*Math.sin(now*11+index));}
    else if(role==='whirlingTornadoBrushHoop'){child.rotation.z+=dt*child.userData.spin;child.material.opacity=(child.userData.baseOpacity??.72)*(.80+.20*Math.sin(now*12+index*.9));}
    else if(role==='whirlingTornadoCore'||role==='whirlingTornadoWisp'){const angle=child.userData.angle+age*child.userData.speed,radius=child.userData.radius;child.position.x=Math.cos(angle)*radius;child.position.z=Math.sin(angle)*radius;child.rotation.y=-angle;const base=child.userData.baseScale,pulse=.88+.17*Math.sin(now*15+index);child.scale.set(base.x*pulse,base.y,base.z/pulse);}
    else if(role==='whirlingTornadoBody'){const base=child.userData.baseScale,pulse=1+.035*Math.sin(now*10);child.scale.set(base.x*pulse,base.y*(2-pulse),base.z*pulse);}
  });
}

export function makeWhirlingTornadoTransientVisual({THREE,scene,position,size=1,radius=1,kind='tick',stableId='',renderMode='style'}={}){
  const group=new THREE.Group();group.name=`Wizard Arcana Whirling Tornado ${kind}`;group.position.set(position.x,position.y??.12*size,position.z);group.userData={...group.userData,arcanaId:'WHIRLING-TORNADO',stableId,renderMode,visualKind:kind};
  const finisher=kind==='finisher',scale=finisher?radius:Math.min(radius,.72*size),ring=tag(new THREE.Mesh(new THREE.RingGeometry((finisher ? .24 : .30)*scale,(finisher ? 1 : .72)*scale,56),material(THREE,finisher?AIR_WHITE:AIR_PALE,finisher ? .96 : .88)),'whirlingTornadoBurstRing');ring.rotation.x=-Math.PI/2;ring.position.y=(finisher ? .22 : .08)*size;group.add(remember(ring));
  const core=tag(new THREE.Mesh(finisher?new THREE.SphereGeometry(.58*scale,22,12):new THREE.DodecahedronGeometry(.25*scale,0),material(THREE,AIR_WHITE,finisher ? .82 : .96)),'whirlingTornadoBurstCore');core.position.y=(finisher ? .42 : .12)*size;if(finisher)core.scale.set(1,.24,1);group.add(remember(core));
  if(renderMode==='style')for(let index=0;index<(finisher?16:6);index++){const angle=index*Math.PI/(finisher?8:3),ray=tag(new THREE.Mesh(new THREE.DodecahedronGeometry((finisher ? .10 : .07)*scale,0),material(THREE,index%2?AIR_WHITE:AIR,finisher ? .94 : .82)),'whirlingTornadoBurstRay',index);ray.userData.angle=angle;ray.userData.baseRadius=(finisher ? .72 : .50)*scale;ray.position.set(Math.cos(angle)*ray.userData.baseRadius,(index%2)*.10*size,Math.sin(angle)*ray.userData.baseRadius);ray.scale.set(finisher?3.8:2.2,.48,finisher ? .82 : .58);ray.rotation.y=-angle;group.add(remember(ray));}
  group.renderOrder=11;scene.add(group);return group;
}

export function animateWhirlingTornadoTransient({mesh,progress=0}={}){const k=Math.max(0,Math.min(1,progress)),finisher=mesh?.userData?.visualKind==='finisher';mesh?.children?.forEach(child=>{if(child.material)child.material.opacity=(child.userData?.baseOpacity??1)*Math.pow(1-k,finisher ? .62 : .42);if(child.userData?.visualRole==='whirlingTornadoBurstRay'){const angle=child.userData.angle,radius=child.userData.baseRadius*(1+k*(finisher ? .48 : 1.5));child.position.x=Math.cos(angle)*radius;child.position.z=Math.sin(angle)*radius;}});mesh?.scale?.setScalar?.(finisher ? .84+k*.34 : .76+k*1.35);}
