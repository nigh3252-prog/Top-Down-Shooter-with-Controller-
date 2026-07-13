// Mechanical forearm mesh copied from falcon-pilebunker-punch-lab-v2.
export function buildPowBunkerMesh(THREE, mirrorZ=1) {
  function Mst(c,o={}){ return new THREE.MeshStandardMaterial(Object.assign({color:c,flatShading:true,roughness:.72,metalness:.18},o)); }
  const materials = {
    black:Mst(0x23262c), gun:Mst(0x3a3f47),
    cream:Mst(0xd8cfb8,{roughness:.82,metalness:.05}),
    red:Mst(0xa8262a,{roughness:.6}),
    brass:Mst(0xb08d3e,{roughness:.35,metalness:.75}),
    chrome:Mst(0x9aa2ad,{roughness:.25,metalness:.9}),
    dark:Mst(0x15171c,{roughness:.9}),
  };
  function octShape(w,h,c){
    c=Math.min(c,w/2-.001,h/2-.001);
    const s=new THREE.Shape(),x=w/2,y=h/2;
    s.moveTo(-x+c,-y);s.lineTo(x-c,-y);s.lineTo(x,-y+c);s.lineTo(x,y-c);
    s.lineTo(x-c,y);s.lineTo(-x+c,y);s.lineTo(-x,y-c);s.lineTo(-x,-y+c);s.closePath();
    return s;
  }
  function slab(w,h,d,c,m){
    const bev=Math.min(c*.7,d*.35);
    const g=new THREE.ExtrudeGeometry(octShape(w,h,c),{depth:d-bev*2,bevelEnabled:true,bevelThickness:bev,bevelSize:bev,bevelSegments:1});
    g.translate(0,0,-(d-bev*2)/2);g.computeVertexNormals();
    const mesh=new THREE.Mesh(g,m);mesh.castShadow=mesh.receiveShadow=true;return mesh;
  }
  function box(w,h,d,m){const x=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);x.castShadow=x.receiveShadow=true;return x;}
  function cyl(r1,r2,h,seg,m){const x=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,seg),m);x.castShadow=x.receiveShadow=true;return x;}

  const mz=mirrorZ;
  const root=new THREE.Group();
  const fore=new THREE.Group();root.add(fore);
  const glowMat=new THREE.MeshStandardMaterial({color:0x0a0a0a,emissive:0xff4a20,emissiveIntensity:0,flatShading:true});
  const housingLen=3.3;
  const shell=slab(1.7,1.7,housingLen,.4,materials.black);shell.rotation.y=Math.PI/2;shell.position.set(.72+housingLen/2,0,0);fore.add(shell);
  const panel=(w,h,d,m)=>{const p=slab(w,h,d,.12,m);p.rotation.y=Math.PI/2;return p;};
  const topPlate=panel(1.3,.22,2.3,materials.cream);topPlate.position.set(2,.92,0);fore.add(topPlate);
  const topPlate2=panel(.9,.18,1.1,materials.cream);topPlate2.position.set(1.47,1.08,0);fore.add(topPlate2);
  const sideL=panel(.22,1.1,2,materials.cream);sideL.position.set(2.08,.05,.92*mz);fore.add(sideL);
  const sideR=sideL.clone();sideR.position.z=-.92*mz;fore.add(sideR);
  [[2.62,.05,1],[2.62,.05,-1],[1.52,.05,1],[1.52,.05,-1]].forEach(p=>{const st=box(.06,.9,.06,materials.red);st.position.set(p[0],p[1],p[2]*mz);st.rotation.x=.35*mz;fore.add(st);});
  const collar=slab(1.35,1.35,.55,.3,materials.gun);collar.rotation.y=Math.PI/2;collar.position.set(.72+housingLen+.15,0,0);fore.add(collar);
  const collarRing=cyl(.62,.7,.22,8,materials.dark);collarRing.rotation.z=Math.PI/2;collarRing.position.set(.72+housingLen+.45,0,0);fore.add(collarRing);
  const breech=slab(1.28,1.28,.7,.3,materials.gun);breech.rotation.y=Math.PI/2;breech.position.set(.42,0,0);fore.add(breech);
  const rearSeal=cyl(.62,.68,.22,8,materials.red);rearSeal.rotation.z=Math.PI/2;rearSeal.position.set(.04,.04,0);fore.add(rearSeal);
  const rearSocket=cyl(.52,.58,.62,8,materials.gun);rearSocket.rotation.z=Math.PI/2;rearSocket.position.set(.24,.04,0);fore.add(rearSocket);
  const stacks=[];
  for(let s=-1;s<=1;s+=2){const st=cyl(.16,.2,.72,6,materials.dark);st.position.set(.55,.86,.45*s);st.rotation.x=.35*s;fore.add(st);stacks.push(st);}
  const gear=new THREE.Group();gear.position.set(1.66,.1,1.17*mz);gear.scale.setScalar(.83);fore.add(gear);
  const gearDisc=cyl(.55,.55,.16,10,materials.brass);gearDisc.rotation.x=Math.PI/2;gear.add(gearDisc);
  for(let i=0;i<8;i++){const t=box(.16,.22,.14,materials.brass),a=i/8*Math.PI*2;t.position.set(Math.cos(a)*.6,Math.sin(a)*.6,0);t.rotation.z=a;gear.add(t);}
  const gearHub=cyl(.16,.16,.24,6,materials.dark);gearHub.rotation.x=Math.PI/2;gear.add(gearHub);
  const idler=new THREE.Group();idler.position.set(2.29,.62,1.17*mz);idler.scale.setScalar(.83);fore.add(idler);
  const idisc=cyl(.3,.3,.14,8,materials.chrome);idisc.rotation.x=Math.PI/2;idler.add(idisc);
  for(let i=0;i<6;i++){const t=box(.1,.14,.12,materials.chrome),a=i/6*Math.PI*2;t.position.set(Math.cos(a)*.33,Math.sin(a)*.33,0);t.rotation.z=a;idler.add(t);}
  for(let i=0;i<3;i++){const v=box(.5,.1,.05,glowMat);v.position.set(1.18+i*.55,-.75,.88);fore.add(v);const v2=v.clone();v2.position.z=-.88;fore.add(v2);}
  const carriage=new THREE.Group();fore.add(carriage);
  const backRam=cyl(.4,.4,1.85,8,materials.cream);backRam.rotation.z=Math.PI/2;carriage.add(backRam);
  const backHead=cyl(.52,.56,.28,8,materials.gun);backHead.rotation.z=Math.PI/2;carriage.add(backHead);
  for(let s=-1;s<=1;s+=2){const rod=cyl(.08,.08,2.75,6,materials.brass);rod.rotation.z=Math.PI/2;rod.position.set(1.98,.45,.56*s);carriage.add(rod);}
  const ram=cyl(.34,.34,2.9,8,materials.chrome);ram.rotation.z=Math.PI/2;ram.position.set(2.4,-.05,0);carriage.add(ram);
  const ramCollar=cyl(.42,.42,.3,8,materials.brass);ramCollar.rotation.z=Math.PI/2;ramCollar.position.set(3.32,-.05,0);carriage.add(ramCollar);
  const fist=new THREE.Group();fist.position.set(4.38,-.05,0);carriage.add(fist);
  const fistCore=slab(1.15,1.35,1.5,.3,materials.black);fistCore.rotation.y=Math.PI/2;fist.add(fistCore);
  const fistFace=slab(.95,1.15,.35,.24,materials.gun);fistFace.rotation.y=Math.PI/2;fistFace.position.x=.7;fist.add(fistFace);
  for(let iy=0;iy<2;iy++)for(let iz=0;iz<2;iz++){const k=slab(.34,.34,.35,.1,materials.cream);k.rotation.y=Math.PI/2;k.position.set(.95,iy?.3:-.3,iz?.32:-.32);fist.add(k);}
  const thumb=slab(.5,.3,.5,.1,materials.gun);thumb.rotation.y=Math.PI/2;thumb.position.set(.25,-.75,.35*mz);thumb.rotation.z=.3;fist.add(thumb);
  const wristSocket=slab(.92,1.08,1.22,.2,materials.black);wristSocket.rotation.y=Math.PI/2;wristSocket.position.x=-.86;fist.add(wristSocket);
  const wristGuard=cyl(.43,.47,.22,8,materials.red);wristGuard.rotation.z=Math.PI/2;wristGuard.position.set(-1.2,0,0);fist.add(wristGuard);
  const elbowSocket=new THREE.Object3D();elbowSocket.position.set(3.10,.10,0);root.add(elbowSocket);
  return {root,fore,carriage,fist,elbowSocket,gear,idler,backRam,backHead,stacks,glowMat,materials};
}
