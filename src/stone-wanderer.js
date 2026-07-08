// Stone Wanderer character rig — materials, procedural stone textures, and the
// makeStoneWanderer() builder, extracted verbatim from weapon-lab.html.
//
// Usage: const StoneWanderer = installStoneWanderer({ THREE });
// The returned bag exposes the shared materials (the weapon/arm builders in the
// pages still use several of them), the texture/facet helpers, and the rig
// build/tune entry points. `getW()` returns the live rig handle bag (sword,
// hook, bodyGroup, head, hat, …) for the model built by the most recent
// makeStoneWanderer() call — matching the old page-global `W`.

export function installStoneWanderer(api) {
  const { THREE } = api;

  const COAT_Z = 0.7;
  /* ---------- helpers ---------- */
  function facet(geo, amt){
    const p=geo.attributes.position, map=new Map();
    for(let i=0;i<p.count;i++){
      const k=p.getX(i).toFixed(3)+','+p.getY(i).toFixed(3)+','+p.getZ(i).toFixed(3);
      let o=map.get(k);
      if(!o){o=[(Math.random()-0.5)*amt,(Math.random()-0.5)*amt,(Math.random()-0.5)*amt]; map.set(k,o);}
      p.setXYZ(i, p.getX(i)+o[0], p.getY(i)+o[1], p.getZ(i)+o[2]);
    }
    p.needsUpdate=true; geo.computeVertexNormals(); return geo;
  }
  function stoneTex(base){
    const s=256, cv=document.createElement('canvas'); cv.width=cv.height=s;
    const x=cv.getContext('2d'); x.fillStyle=base; x.fillRect(0,0,s,s);
    for(let i=0;i<2400;i++){
      const r=Math.random()*2.2+0.4, d=(Math.random()-0.5)*38;
      x.fillStyle=`rgba(${d<0?20:150},${d<0?16:130},${d<0?12:110},${Math.random()*0.15})`;
      x.beginPath(); x.arc(Math.random()*s,Math.random()*s,r,0,7); x.fill();
    }
    for(let i=0;i<60;i++){
      x.fillStyle=`rgba(0,0,0,${Math.random()*0.09})`;
      x.beginPath(); const cx=Math.random()*s, cy=Math.random()*s; x.moveTo(cx,cy);
      for(let k=0;k<3;k++) x.lineTo(cx+(Math.random()-0.5)*60, cy+(Math.random()-0.5)*60); x.fill();
    }
    const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(2,2); return t;
  }
  function stoneMat(color, rough=0.92, metal=0.05){
    return new THREE.MeshStandardMaterial({color, roughness:rough, metalness:metal, flatShading:true,
      map:stoneTex('#'+color.toString(16).padStart(6,'0'))});
  }
  function add(parent, geo, mat, x=0,y=0,z=0, jitter=0){
    if(jitter>0) facet(geo, jitter);
    const m=new THREE.Mesh(geo,mat); m.position.set(x,y,z);
    m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
  }
  function meshTex(){
    const s=128, cv=document.createElement('canvas'); cv.width=cv.height=s; const x=cv.getContext('2d');
    x.clearRect(0,0,s,s); x.fillStyle='rgba(18,16,14,0.92)';
    for(let i=2;i<s;i+=6)for(let j=2;j<s;j+=6) x.fillRect(i,j,3,3);
    return new THREE.CanvasTexture(cv);
  }

  /* ---------- materials ---------- */
  const matCoat    = stoneMat(0x231f1b, 0.95, 0.04);
  const matHat     = stoneMat(0x282320, 0.93, 0.06);
  const matInk     = stoneMat(0x1b1916, 0.95, 0.03);
  const matBone    = new THREE.MeshStandardMaterial({color:0xc0b497, roughness:0.62, metalness:0.05, flatShading:true});
  const matPale    = stoneMat(0xb3a88f, 0.7, 0.05);
  const matCream   = stoneMat(0xd5cbb4, 0.78, 0.03);
  const matRed     = stoneMat(0x8c3a2c, 0.8, 0.05);
  const matHole    = new THREE.MeshStandardMaterial({color:0x141210, roughness:0.6, metalness:0.1});
  const matIron    = stoneMat(0x2c2722, 0.5, 0.4);
  const matBronze  = new THREE.MeshStandardMaterial({color:0x9a6f30, roughness:0.34, metalness:0.9});
  const matLeather = stoneMat(0x1d1813, 0.9, 0.05);
  const matPlate   = new THREE.MeshStandardMaterial({color:0x6b665d, roughness:0.55, metalness:0.35, flatShading:true});
  const matLens    = new THREE.MeshStandardMaterial({color:0x2a3a44, roughness:0.16, metalness:0.75});
  const matGlow    = new THREE.MeshStandardMaterial({color:0xffb061, emissive:0xff7a26, emissiveIntensity:1.5, roughness:0.4});
  const matOni     = new THREE.MeshStandardMaterial({color:0x5a2620, roughness:0.55, metalness:0.1, flatShading:true});
  const matObs     = new THREE.MeshStandardMaterial({color:0x17171c, roughness:0.2, metalness:0.5, flatShading:true});
  const matSilver  = new THREE.MeshStandardMaterial({color:0xc2c0b6, roughness:0.35, metalness:0.55, flatShading:true});
  const matCloth   = stoneMat(0x544b42, 0.96, 0.02);

  const LOCKED_STONE_WANDERER = Object.freeze({
    headStyle: 4,              // Great Helm
    gradientStart: 0.58,
    faceHeight: 1.42,
    crownHeight: 0.65,
    shoulderBodyWidth: 1.25
  });
  const maskGradient = { start:LOCKED_STONE_WANDERER.gradientStart };
  const maskGradientCanvas = document.createElement('canvas');
  maskGradientCanvas.width = maskGradientCanvas.height = 256;
  const maskGradientTexture = new THREE.CanvasTexture(maskGradientCanvas);
  maskGradientTexture.wrapS = maskGradientTexture.wrapT = THREE.ClampToEdgeWrapping;
  const matMaskGradient = new THREE.MeshStandardMaterial({
    color:0xffffff, roughness:0.78, metalness:0.03, flatShading:true, map:maskGradientTexture
  });
  function refreshMaskGradient(start=maskGradient.start){
    maskGradient.start = Math.max(0, Math.min(0.85, start));
    const s=256, x=maskGradientCanvas.getContext('2d');
    const g=x.createLinearGradient(0,0,0,s);
    const darkEnd = maskGradient.start;
    const mid = Math.min(0.98, darkEnd + 0.30);
    g.addColorStop(0, '#0f0d0b');
    g.addColorStop(darkEnd, '#17130f');
    g.addColorStop(mid, '#5b5146');
    g.addColorStop(1, '#c9baa1');
    x.fillStyle=g; x.fillRect(0,0,s,s);
    for(let i=0;i<1500;i++){
      const y=Math.random()*s;
      const r=Math.random()*2.0+0.35;
      const a=Math.random()*0.10;
      const dark = y < s*(darkEnd+0.1);
      x.fillStyle = dark ? `rgba(0,0,0,${a})` : `rgba(150,130,110,${a*0.55})`;
      x.beginPath(); x.arc(Math.random()*s,y,r,0,7); x.fill();
    }
    for(let i=0;i<40;i++){
      x.strokeStyle=`rgba(0,0,0,${Math.random()*0.08})`; x.lineWidth=Math.random()*2+0.5;
      x.beginPath(); const sx=Math.random()*s, sy=Math.random()*s; x.moveTo(sx,sy);
      x.lineTo(sx+(Math.random()-0.5)*70, sy+(Math.random()-0.5)*70); x.stroke();
    }
    maskGradientTexture.needsUpdate = true;
  }
  refreshMaskGradient();

  let W = null;

  /* ====================================================================
     CHARACTER 0 — THE STONE WANDERER
     ==================================================================== */
  const profile = [
    [0.05,-3.05],[1.72,-3.0],[1.64,-2.6],[1.52,-1.6],[1.4,-0.5],
    [1.26,0.6],[1.12,1.6],[1.02,1.95],[0.7,2.15],[0.4,2.3]
  ].map(p=>new THREE.Vector2(p[0],p[1]));
  function frontR(y){
    for(let i=0;i<profile.length-1;i++){
      const a=profile[i], b=profile[i+1];
      if((y>=a.y&&y<=b.y)||(y<=a.y&&y>=b.y)){ const t=(y-a.y)/(b.y-a.y); return a.x+(b.x-a.x)*t; }
    } return 1.0;
  }
  const frontZ = y => frontR(y)*COAT_Z;

  function makeStoneWanderer(){
    W = null;
    const c = new THREE.Group();
    const bodyGroup = new THREE.Group(); c.add(bodyGroup);
    const coat = add(bodyGroup, new THREE.LatheGeometry(profile, 8), matCoat, 0,0,0, 0.04);
    coat.scale.z = COAT_Z; coat.rotation.y = Math.PI;
    add(bodyGroup, new THREE.BoxGeometry(2.0,0.42,0.74), matCoat, 0,1.92,0, 0.03);
    [[-1],[1]].forEach(([s])=>add(bodyGroup, new THREE.BoxGeometry(0.34,0.3,0.64), matCoat, s*0.95,1.78,0, 0.02).rotation.z=s*0.08);
    add(bodyGroup, new THREE.BoxGeometry(0.42,0.55,0.4), matCoat, 0,2.06,0.0, 0.02);
    [[-1],[1]].forEach(([side])=>{const m=add(bodyGroup, new THREE.BoxGeometry(0.4,0.7,0.26), matCoat, side*0.4,2.16,0.0, 0.03); m.rotation.z=side*0.34; m.rotation.x=-0.14;});
    add(bodyGroup, new THREE.BoxGeometry(0.9,0.6,0.24), matCoat, 0,2.22,-0.3, 0.03).rotation.x=0.3;
    add(bodyGroup, new THREE.BoxGeometry(0.3,0.5,0.22), matCoat, -0.28,1.96,0.34, 0.025).rotation.z=0.2;
    add(bodyGroup, new THREE.BoxGeometry(0.3,0.5,0.22), matCoat,  0.28,1.96,0.34, 0.025).rotation.z=-0.2;

    const head = new THREE.Group(); head.position.set(0,2.42,0.12); c.add(head);
    const headInner = new THREE.Group(); head.add(headInner);
    function aH(geo,mat,x,y,z,jit){ return add(headInner,geo,mat,x,y,z,jit||0); }
    function antler(s){ const bone=(x,y,z,len,rz,rx)=>{const cc=aH(new THREE.CylinderGeometry(0.018,0.028,len,5),matBone,x,y,z); cc.rotation.z=rz; cc.rotation.x=rx||0;};
      bone(s*0.14,0.34,0,0.46,s*-0.5,0); bone(s*0.3,0.5,0,0.34,s*-0.8,0); bone(s*0.24,0.46,0.06,0.22,s*-0.2,-0.7); bone(s*0.38,0.62,0,0.2,s*-1.1,0); }
    function buildHead(i){
      while(headInner.children.length) headInner.remove(headInner.children[0]);
      if(i===0){ const m=aH(new THREE.IcosahedronGeometry(0.36,1),matMaskGradient,0,0,0,0.03); m.scale.set(0.9,1.06,0.82);
        [-0.13,0.13].forEach(x=>{const e=aH(new THREE.IcosahedronGeometry(0.075,0),matHole,x,0.09,0.24); e.scale.set(1.5,1.15,0.7);});
        aH(new THREE.ConeGeometry(0.05,0.12,3),matHole,0,-0.03,0.255).rotation.x=Math.PI;
        aH(new THREE.BoxGeometry(0.22,0.055,0.04),matHole,0,-0.18,0.245);
        [-0.075,-0.0375,0,0.0375,0.075].forEach(x=>aH(new THREE.BoxGeometry(0.016,0.055,0.03),matMaskGradient,x,-0.18,0.262)); }
      else if(i===1){ aH(new THREE.BoxGeometry(0.42,0.6,0.4),matIron,0,0,0,0.02);
        aH(new THREE.BoxGeometry(0.38,0.52,0.08),matMaskGradient,0,0,0.2,0.015);
        [-0.09,0.09].forEach(x=>aH(new THREE.BoxGeometry(0.13,0.045,0.04),matHole,x,0.08,0.245));
        for(let r=0;r<3;r++)for(let cc=0;cc<3;cc++){const d=aH(new THREE.CylinderGeometry(0.012,0.012,0.04,6),matHole,-0.07+cc*0.07,-0.06-r*0.06,0.245); d.rotation.x=Math.PI/2;} }
      else if(i===2){ const m=aH(new THREE.IcosahedronGeometry(0.36,1),matMaskGradient,0,0,0,0.02); m.scale.set(0.92,1.0,0.86);
        const p=new THREE.Mesh(new THREE.PlaneGeometry(0.42,0.52), new THREE.MeshStandardMaterial({map:meshTex(),transparent:true,alphaTest:0.3,roughness:0.7,metalness:0.3,color:0x4a463f}));
        p.position.set(0,0.02,0.29); p.castShadow=true; headInner.add(p);
        aH(new THREE.BoxGeometry(0.36,0.12,0.14),matIron,0,-0.26,0.16,0.01); }
      else if(i===3){ const m=aH(new THREE.IcosahedronGeometry(0.34,1),matMaskGradient,0,0,0,0.02); m.scale.set(0.86,1.0,0.86);
        aH(new THREE.ConeGeometry(0.13,0.55,6),matMaskGradient,0,-0.04,0.3).rotation.x=Math.PI/2;
        [-0.13,0.13].forEach(x=>{const e=aH(new THREE.CylinderGeometry(0.06,0.06,0.04,14),matLens,x,0.12,0.2); e.rotation.x=Math.PI/2;}); }
      else if(i===4){ aH(new THREE.CylinderGeometry(0.3,0.33,0.64,8),matMaskGradient,0,0,0,0.02);
        aH(new THREE.CylinderGeometry(0.31,0.3,0.1,8),matIron,0,0.34,0,0.01);
        aH(new THREE.BoxGeometry(0.4,0.05,0.05),matHole,0,0.09,0.3);
        [-0.12,-0.06,0,0.06,0.12].forEach(x=>aH(new THREE.BoxGeometry(0.025,0.16,0.04),matHole,x,-0.12,0.3));
        aH(new THREE.BoxGeometry(0.05,0.5,0.05),matPlate,0,-0.02,0.32); }
      else if(i===5){ const m=aH(new THREE.IcosahedronGeometry(0.36,1),matMaskGradient,0,0,0,0.02); m.scale.set(0.92,1.0,0.86);
        aH(new THREE.CylinderGeometry(0.15,0.15,0.06,18),matLens,0,0.04,0.25).rotation.x=Math.PI/2;
        aH(new THREE.CylinderGeometry(0.07,0.07,0.07,16),matGlow,0,0.04,0.26).rotation.x=Math.PI/2; }
      else if(i===6){ const m=aH(new THREE.IcosahedronGeometry(0.36,1),matMaskGradient,0,0,0,0.03); m.scale.set(0.92,1.04,0.84);
        [-1,1].forEach(s=>{const h=aH(new THREE.ConeGeometry(0.05,0.34,5),matBone,s*0.2,0.32,-0.02); h.rotation.z=s*0.5; h.rotation.x=-0.3;});
        [-0.12,0.12].forEach(x=>{const e=aH(new THREE.IcosahedronGeometry(0.06,0),matGlow,x,0.08,0.24); e.scale.set(1.6,0.8,0.7); e.rotation.z=(x<0?1:-1)*0.3;});
        aH(new THREE.BoxGeometry(0.24,0.08,0.05),matHole,0,-0.16,0.24);
        [-0.07,0.07].forEach(x=>aH(new THREE.ConeGeometry(0.03,0.1,4),matBone,x,-0.2,0.25).rotation.x=Math.PI); }
      else if(i===7){ aH(new THREE.IcosahedronGeometry(0.37,0),matMaskGradient,0,0,0).scale.set(0.82,1.12,0.7); }
      else if(i===8){ aH(new THREE.IcosahedronGeometry(0.32,1),matMaskGradient,0,0.02,0,0.03).scale.set(0.8,1.0,0.85);
        aH(new THREE.BoxGeometry(0.22,0.26,0.3),matMaskGradient,0,-0.16,0.12,0.02);
        [-0.1,0.1].forEach(x=>{const e=aH(new THREE.IcosahedronGeometry(0.06,0),matHole,x,0.08,0.2); e.scale.set(1.3,1.1,0.7);});
        aH(new THREE.BoxGeometry(0.05,0.06,0.06),matHole,0,-0.24,0.26); antler(-1); antler(1); }
      else if(i===9){ aH(new THREE.OctahedronGeometry(0.36,0),matMaskGradient,0,0,0,0.02).scale.set(0.85,1.12,0.85);
        aH(new THREE.TorusGeometry(0.06,0.02,6,10),matIron,0,0.42,0).rotation.x=Math.PI/2;
        [-0.1,0.1].forEach(x=>{const e=aH(new THREE.BoxGeometry(0.09,0.05,0.04),matGlow,x,0.06,0.26); e.rotation.z=(x<0?1:-1)*0.25;});
        aH(new THREE.BoxGeometry(0.04,0.09,0.04),matGlow,0,-0.04,0.27);
        [-0.09,-0.03,0.03,0.09].forEach((x,k)=>aH(new THREE.BoxGeometry(0.03,0.05+(k%2?0.04:0),0.04),matGlow,x,-0.16,0.26)); }
      else if(i===10){ const m=aH(new THREE.IcosahedronGeometry(0.35,1),matMaskGradient,0,0,0,0.015); m.scale.set(0.95,1.02,0.82);
        const facePlate=aH(new THREE.BoxGeometry(0.42,0.48,0.07),matMaskGradient,0,0.04,0.19,0.01);
        facePlate.rotation.x=-0.03;
        [[0,0.2,0.22,0.09],[ -0.14,0.11,0.23,0.045],[0.14,0.11,0.23,0.045],[-0.18,-0.04,0.23,0.04],[0.18,-0.04,0.23,0.04],[0,-0.16,0.23,0.05],[0,-0.3,0.23,0.045]].forEach(p=>{
          const h=aH(new THREE.CylinderGeometry(p[3],p[3],0.05,12),matHole,p[0],p[1],p[2]); h.rotation.x=Math.PI/2;});
        aH(new THREE.BoxGeometry(0.48,0.08,0.06),matLeather,0,-0.42,0.08,0.01);
        [[-0.33,0.03,0.12],[0.33,0.03,0.12]].forEach(p=>{const st=aH(new THREE.BoxGeometry(0.08,0.62,0.08),matLeather,p[0],p[1],p[2],0.01); st.rotation.z=(p[0]<0?1:-1)*0.08;}); }
      else if(i===11){ const m=aH(new THREE.IcosahedronGeometry(0.35,1),matMaskGradient,0,0,0,0.03); m.scale.set(0.98,1.06,0.84);
        const plate=aH(new THREE.BoxGeometry(0.44,0.52,0.08),matMaskGradient,0,0.03,0.2,0.02); plate.rotation.z=-0.06;
        [[0,0.21,0.23,0.1],[-0.14,0.11,0.23,0.05],[0.14,0.09,0.23,0.05],[-0.19,-0.05,0.23,0.045],[0.18,-0.07,0.23,0.045],[0,-0.18,0.23,0.05]].forEach(p=>{
          const h=aH(new THREE.CylinderGeometry(p[3],p[3],0.05,12),matHole,p[0],p[1],p[2]); h.rotation.x=Math.PI/2;});
        const crack=aH(new THREE.BoxGeometry(0.03,0.28,0.02),matHole,0.04,0.02,0.245,0); crack.rotation.z=0.45;
        aH(new THREE.BoxGeometry(0.48,0.08,0.06),matLeather,0,-0.42,0.08,0.01);
        [[-0.33,0.03,0.12],[0.33,0.03,0.12]].forEach(p=>{const st=aH(new THREE.BoxGeometry(0.08,0.62,0.08),matLeather,p[0],p[1],p[2],0.01); st.rotation.z=(p[0]<0?1:-1)*0.08;}); }
      else if(i===12){ const hood=aH(new THREE.ConeGeometry(0.42,0.92,7),matCloth,0,0.08,0,0.02); hood.scale.set(1.0,1.0,0.9);
        const face=aH(new THREE.IcosahedronGeometry(0.26,1),matMaskGradient,0,-0.03,0.04,0.015); face.scale.set(0.7,1.0,0.65);
        [-0.08,0.08].forEach(x=>aH(new THREE.IcosahedronGeometry(0.05,0),matGlow,x,0.04,0.2).scale.set(1.4,0.8,0.6));
        aH(new THREE.BoxGeometry(0.06,0.16,0.03),matGlow,0,-0.08,0.2); }
      else if(i===13){ const m=aH(new THREE.IcosahedronGeometry(0.3,1),matMaskGradient,0,-0.02,0,0.02); m.scale.set(0.84,1.04,0.76);
        [[-0.12,0.22],[0.12,0.22]].forEach(p=>{const c=aH(new THREE.CylinderGeometry(0.08,0.1,0.3,8),matIron,p[0],p[1],0.03,0.02); c.rotation.z=(p[0]<0?0.22:-0.22);});
        [[-0.12,0.33,0.16],[0.12,0.33,0.16]].forEach(p=>aH(new THREE.CylinderGeometry(0.04,0.06,0.12,8),matGlow,p[0],p[1],p[2]).rotation.x=Math.PI/2);
        [-0.09,0.09].forEach(x=>aH(new THREE.BoxGeometry(0.07,0.04,0.03),matHole,x,0.02,0.21));
        aH(new THREE.BoxGeometry(0.04,0.14,0.03),matHole,0,-0.12,0.22); }
      else if(i===14){ const m=aH(new THREE.BoxGeometry(0.42,0.6,0.36),matMaskGradient,0,0,0,0.03); m.rotation.y=0.06;
        const visor=aH(new THREE.BoxGeometry(0.3,0.1,0.06),matHole,0,0.12,0.2,0.0); visor.rotation.z=-0.03;
        [[-0.2,0.18,0.18],[0.2,0.18,0.18]].forEach(p=>{const ring=aH(new THREE.TorusGeometry(0.06,0.02,5,8),matIron,p[0],p[1],p[2],0); ring.rotation.y=Math.PI/2;});
        for(let k=0;k<3;k++){ const ch=aH(new THREE.BoxGeometry(0.02,0.18,0.02),matIron,-0.11+k*0.11,-0.03+k*0.02,0.22,0); ch.rotation.z=0.16; }
        aH(new THREE.BoxGeometry(0.1,0.18,0.04),matHole,0,-0.15,0.22); }
      else if(i===15){ const face=aH(new THREE.IcosahedronGeometry(0.26,1),matMaskGradient,0,0.0,0.03,0.015); face.scale.set(0.75,0.95,0.7);
        const halo=aH(new THREE.TorusGeometry(0.34,0.09,7,14),matBronze,0,0.04,-0.04,0.01); halo.rotation.x=Math.PI/2; halo.scale.set(1.1,1.1,0.45);
        const sun=aH(new THREE.CylinderGeometry(0.12,0.12,0.04,12),matBronze,0,0.03,0.21,0.01); sun.rotation.x=Math.PI/2;
        for(let k=0;k<12;k++){ const a=k/12*Math.PI*2; const ray=aH(new THREE.BoxGeometry(0.03,0.14,0.03),matBronze,Math.cos(a)*0.21,0.03+Math.sin(a)*0.21,0.16,0.0); ray.rotation.z=a; }
        [-0.08,0.08].forEach(x=>aH(new THREE.IcosahedronGeometry(0.04,0),matHole,x,0.03,0.19).scale.set(1.2,0.8,0.7)); }
      else if(i===16){ const urn=aH(new THREE.CylinderGeometry(0.28,0.36,0.72,10),matMaskGradient,0,0,0,0.03);
        const lid=aH(new THREE.CylinderGeometry(0.2,0.24,0.1,10),matMaskGradient,0,0.35,0,0.02);
        aH(new THREE.SphereGeometry(0.045,8,8),matBronze,0,0.44,0);
        [[-0.29,0.1,0.02],[0.29,0.1,0.02]].forEach(p=>{const h=aH(new THREE.TorusGeometry(0.08,0.018,5,8),matBronze,p[0],p[1],p[2],0); h.rotation.y=Math.PI/2;});
        [-0.08,0.08].forEach(x=>aH(new THREE.BoxGeometry(0.05,0.06,0.03),matHole,x,0.08,0.29));
        aH(new THREE.BoxGeometry(0.03,0.12,0.03),matHole,0,-0.08,0.3);
        aH(new THREE.BoxGeometry(0.12,0.04,0.03),matHole,0,-0.2,0.3); }
      else if(i===17){ const left=aH(new THREE.BoxGeometry(0.18,0.58,0.12),matMaskGradient,-0.1,0,0.16,0.02); left.rotation.z=-0.18;
        const right=aH(new THREE.BoxGeometry(0.18,0.58,0.12),matMaskGradient,0.1,0,0.16,0.02); right.rotation.z=0.18;
        aH(new THREE.BoxGeometry(0.06,0.54,0.05),matLeather,0,0,0.12,0.01);
        aH(new THREE.IcosahedronGeometry(0.045,0),matHole,-0.12,0.08,0.24).scale.set(1.2,0.8,0.7);
        aH(new THREE.IcosahedronGeometry(0.045,0),matGlow,0.12,0.08,0.24).scale.set(1.2,0.8,0.7);
        aH(new THREE.BoxGeometry(0.12,0.04,0.03),matHole,-0.08,-0.14,0.24);
        aH(new THREE.BoxGeometry(0.12,0.04,0.03),matHole,0.08,-0.14,0.24); }
      else if(i===18){ aH(new THREE.CylinderGeometry(0.22,0.24,0.68,8),matMaskGradient,0,0,0,0.02);
        aH(new THREE.TorusGeometry(0.24,0.03,6,8),matIron,0,0.28,0,0.0).rotation.x=Math.PI/2;
        aH(new THREE.TorusGeometry(0.24,0.03,6,8),matIron,0,-0.28,0,0.0).rotation.x=Math.PI/2;
        [-0.16,-0.08,0,0.08,0.16].forEach(x=>aH(new THREE.BoxGeometry(0.025,0.62,0.025),matIron,x,0,0.18,0.0));
        aH(new THREE.IcosahedronGeometry(0.08,0),matGlow,0,0.02,0.05).scale.set(1.0,0.85,0.8); }
      else if(i===19){ const helm=aH(new THREE.CylinderGeometry(0.26,0.3,0.62,8),matMaskGradient,0,0,0,0.02);
        const snout=aH(new THREE.BoxGeometry(0.18,0.16,0.24),matMaskGradient,0,-0.02,0.25,0.01);
        [[-0.22,0.23],[0.22,0.23]].forEach(p=>{const horn=aH(new THREE.TorusGeometry(0.18,0.03,6,10),matBone,p[0],p[1],0.01,0.01); horn.rotation.z=(p[0]<0?0.9:-0.9); horn.rotation.y=Math.PI/2;});
        [-0.08,0.08].forEach(x=>aH(new THREE.BoxGeometry(0.06,0.04,0.03),matHole,x,0.07,0.22));
        aH(new THREE.BoxGeometry(0.04,0.14,0.03),matHole,0,-0.08,0.25); }
    }

    const hat = new THREE.Group(); hat.position.set(0,2.66,0); c.add(hat);
    add(hat, new THREE.CylinderGeometry(0.52,1.8,0.26,16,1), matHat, 0,0,0, 0.02);
    add(hat, new THREE.CylinderGeometry(0.32,0.4,0.14,14), matHat, 0,0.17,0, 0.02);
    const CROWN_BASE = 0.24, CROWN_H = 1.1;
    const crownMesh = add(hat, new THREE.CylinderGeometry(0.2,0.34,CROWN_H,12,1), matHat, 0,0.79,0, 0.02);
    const crownTop  = add(hat, new THREE.CylinderGeometry(0.2,0.22,0.06,12), matHat, 0,1.36,0, 0.015);

    function glyphAlpha(draw){ const s=256, cv=document.createElement('canvas'); cv.width=cv.height=s;
      const x=cv.getContext('2d'); x.fillStyle='#000'; x.fillRect(0,0,s,s); x.fillStyle='#fff'; draw(x,s); return new THREE.CanvasTexture(cv); }
    const gL = glyphAlpha((x,s)=>{ const bw=26;
      x.fillRect(s*0.28,s*0.18,bw,s*0.62); x.fillRect(s*0.72-bw,s*0.18,bw,s*0.62);
      x.fillRect(s*0.28,s*0.18,s*0.44,bw); x.fillRect(s*0.5-13,s*0.3,26,s*0.28);
      x.beginPath(); x.moveTo(s*0.5-46,s*0.58); x.lineTo(s*0.5+46,s*0.58); x.lineTo(s*0.5,s*0.78); x.closePath(); x.fill(); });
    const gR = glyphAlpha((x,s)=>{ x.fillRect(s*0.24,s*0.2,s*0.52,24); for(let i=0;i<3;i++) x.fillRect(s*0.3+i*s*0.16,s*0.24,24,s*0.5); });
    function makeDecal(tex){ const mat=matBronze.clone(); mat.alphaMap=tex; mat.transparent=true; mat.alphaTest=0.5; mat.depthWrite=false;
      const m=new THREE.Mesh(new THREE.PlaneGeometry(0.46,0.78), mat); m.position.set(0,1.05,frontZ(1.05)+0.02); c.add(m); return m; }
    const decalL=makeDecal(gL), decalR=makeDecal(gR); decalL.rotation.y=0.3; decalR.rotation.y=-0.3;

    [1.0,0.4,-0.3,-1.0].forEach(y=>{ const r=frontZ(y);
      add(c, new THREE.BoxGeometry(0.42,0.07,0.1), matIron, 0,y,r+0.02, 0.008);
      add(c, new THREE.BoxGeometry(0.08,0.13,0.12), matIron, 0,y,r+0.04, 0.008); });

    const strapHolder = new THREE.Group(); c.add(strapHolder);
    function buildStrap(SW){
      while(strapHolder.children.length) strapHolder.remove(strapHolder.children[0]);
      const A=new THREE.Vector3(-0.55*SW,1.78,frontZ(1.78)+0.06), B=new THREE.Vector3(0.8*SW,-0.55,frontZ(-0.55)+0.06);
      const dir=new THREE.Vector3().subVectors(B,A), len=dir.length();
      const strap=new THREE.Mesh(new THREE.BoxGeometry(0.2,len,0.1),matLeather); strap.castShadow=strap.receiveShadow=true;
      strap.position.copy(A).addScaledVector(dir,0.5); strap.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());
      strapHolder.add(strap);
      const buckle=new THREE.Group(); const t=0.07,w=0.32,h=0.4;
      [[0,h/2,w,t],[0,-h/2,w,t],[-w/2,0,t,h],[w/2,0,t,h]].forEach(b=>{const bar=new THREE.Mesh(new THREE.BoxGeometry(b[2],b[3],0.13),matIron); bar.castShadow=true; bar.position.set(b[0],b[1],0); buckle.add(bar);});
      buckle.position.copy(A).addScaledVector(dir,0.46); buckle.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());
      strapHolder.add(buckle);
    }
    const sword=new THREE.Group(); sword.position.set(0.92,-0.5,frontZ(-0.5)+0.14); sword.rotation.z=-0.16; sword.rotation.x=-0.12;
    add(sword,new THREE.BoxGeometry(0.26,2.6,0.16),matLeather,0,0,0,0.02);
    add(sword,new THREE.BoxGeometry(0.3,0.18,0.2),matIron,0,-1.25,0,0.01);
    add(sword,new THREE.BoxGeometry(0.42,0.16,0.3),matIron,0,1.35,0,0.01);
    add(sword,new THREE.BoxGeometry(0.2,0.5,0.2),matIron,0,1.66,0,0.01);
    add(sword,new THREE.BoxGeometry(0.26,0.12,0.26),matIron,0,1.94,0,0.01);
    c.add(sword);
    const hook=add(c,new THREE.TorusGeometry(0.1,0.035,6,10),matIron,0.78,-0.62,frontZ(-0.62)+0.1); hook.rotation.x=Math.PI/2;

    W = { root:c, decalL, decalR, sword, hook, bodyGroup, head, headInner, hat, crownMesh, crownTop, CROWN_BASE, CROWN_H, buildHead, buildStrap };
    buildHead(LOCKED_STONE_WANDERER.headStyle);
    applyFaceHeight(LOCKED_STONE_WANDERER.faceHeight);
    applyCrown(LOCKED_STONE_WANDERER.crownHeight);
    applyWidth(LOCKED_STONE_WANDERER.shoulderBodyWidth);
    c.position.y = 3.05;
    return c;
  }
  function applyCrown(f){ if(!W) return; W.crownMesh.scale.y=f; W.crownMesh.position.y=W.CROWN_BASE+(W.CROWN_H*f)/2; W.crownTop.position.y=W.CROWN_BASE+W.CROWN_H*f+0.03; }
  function applyWidth(SW){ if(!W) return; W.bodyGroup.scale.x=SW; W.decalL.position.x=-0.46*SW; W.decalR.position.x=0.46*SW; W.sword.position.x=0.92*SW; W.hook.position.x=0.78*SW; W.buildStrap(SW); }
  function applyFaceHeight(f){ if(!W || !W.headInner) return; W.headInner.scale.y=f; }

  return {
    materials: {
      matCoat, matHat, matInk, matBone, matPale, matCream, matRed, matHole,
      matIron, matBronze, matLeather, matPlate, matLens, matGlow, matOni,
      matObs, matSilver, matCloth, matMaskGradient
    },
    facet, stoneTex, stoneMat, meshTex,
    LOCKED_STONE_WANDERER, COAT_Z, profile, frontZ, refreshMaskGradient,
    makeStoneWanderer,
    getW: () => W,
    applyCrown, applyWidth, applyFaceHeight
  };
}
