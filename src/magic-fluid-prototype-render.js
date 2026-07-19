// Renderer copied from threejs_midair_lifted_ground_slice_v1.html: hidden ground
// texture, three lifted texture planes, middle-weighted voxel layers, and the
// prototype accent-stroke mesh. The game integration remaps the vertical stack
// around the Warden model center and spreads the layers farther apart.
export function createPrototypeFluidRenderer({THREE,scene,camera,settings,layout,sim}={}){
  const PATCH_W=layout.patchWidth,PATCH_D=layout.patchDepth;
  const MAX_LAYERS=layout.maxLayers,VIS_COLS=layout.visualColumns,VIS_ROWS=layout.visualRows;
  const MAX_INSTANCES=VIS_COLS*VIS_ROWS*MAX_LAYERS,MAX_STROKES=layout.maxStrokes;
  const simW=sim.simW,simH=sim.simH,N=sim.N;
  const {u,v,dye,heat,curlField,solid,strokes}=sim;
  const idx=sim.idx,sample=sim.sample;
  let renderMode='quads',palette='ember';

  const mapHeight=originalY=>{
    const s=settings();
    const center=Number.isFinite(Number(s.stackCenter))?Number(s.stackCenter):.95;
    const scale=Number.isFinite(Number(s.verticalScale))?Number(s.verticalScale):1;
    return(originalY-center)*scale;
  };

  const dyeCanvas=document.createElement('canvas');
  const dyeCtx=dyeCanvas.getContext('2d',{alpha:true});
  dyeCanvas.width=simW;dyeCanvas.height=simH;
  const imageData=dyeCtx.createImageData(simW,simH),pix=imageData.data;
  const dyeTexture=new THREE.CanvasTexture(dyeCanvas);
  dyeTexture.colorSpace=THREE.SRGBColorSpace;
  dyeTexture.minFilter=THREE.NearestFilter;dyeTexture.magFilter=THREE.NearestFilter;
  dyeTexture.generateMipmaps=false;dyeTexture.wrapS=THREE.ClampToEdgeWrapping;dyeTexture.wrapT=THREE.ClampToEdgeWrapping;

  const color=new THREE.Color(),color2=new THREE.Color(),dummy=new THREE.Object3D();
  const seeds=new Float32Array(MAX_INSTANCES),jitterX=new Float32Array(MAX_INSTANCES),jitterZ=new Float32Array(MAX_INSTANCES);
  for(let i=0;i<MAX_INSTANCES;i++){seeds[i]=Math.random();jitterX[i]=Math.random()-.5;jitterZ[i]=Math.random()-.5;}
  const strokeSeeds=new Float32Array(MAX_STROKES);
  for(let i=0;i<MAX_STROKES;i++)strokeSeeds[i]=Math.random();

  const group=new THREE.Group();group.name='Prototype magic fluid direct port';group.visible=false;scene.add(group);

  function texturePlane(width,depth,originalY,opacity){
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),new THREE.MeshBasicMaterial({
      map:dyeTexture,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,
    }));
    mesh.rotation.x=-Math.PI/2;mesh.position.y=mapHeight(originalY);group.add(mesh);return mesh;
  }
  const fluidPlane=texturePlane(PATCH_W,PATCH_D,.025,1);
  const fluidGlowPlane=texturePlane(PATCH_W*1.02,PATCH_D*1.02,.035,.45);
  const airPlane=texturePlane(PATCH_W,PATCH_D,.92,1);
  const airGlowPlane=texturePlane(PATCH_W*1.03,PATCH_D*1.03,1.02,.55);
  const airHaloPlane=texturePlane(PATCH_W*1.08,PATCH_D*1.08,1.10,.24);

  const quadMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.78,blending:THREE.AdditiveBlending,depthWrite:false,vertexColors:true,side:THREE.DoubleSide});
  const cubeMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false,vertexColors:true});
  const strokeMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false,vertexColors:true,side:THREE.DoubleSide});
  const quadMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),quadMaterial,MAX_INSTANCES);
  const cubeMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),cubeMaterial,MAX_INSTANCES);
  const strokeMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),strokeMaterial,MAX_STROKES);
  quadMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);cubeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);strokeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  quadMesh.frustumCulled=false;cubeMesh.frustumCulled=false;strokeMesh.frustumCulled=false;
  group.add(quadMesh,cubeMesh,strokeMesh);

  function mix3(a,b,t,out){out.copy(a).lerp(b,t);}

  function paletteColor(body,hot,layerT,out){
    const cool=Math.max(0,body-hot*.55),core=Math.min(1,hot*1.25),haze=Math.min(1,cool*(.65+layerT*.35));
    if(palette==='blue'){
      const c0=new THREE.Color(1,.99,1),c1=new THREE.Color(.48,.98,1),c2=new THREE.Color(.12,.66,1),c3=new THREE.Color(.38,.20,.78);
      if(core>.68)mix3(c1,c0,(core-.68)/.32,out);else if(core>.30)mix3(c2,c1,(core-.30)/.38,out);else mix3(c3,c2,Math.min(1,core/.30),out);
      color2.setRGB(.10,.06,.22);out.lerp(color2,Math.min(.55,haze*.55+layerT*.14));out.multiplyScalar(.26+body*.95+core*.65);return;
    }
    if(palette==='ember'){
      const c0=new THREE.Color(1,.98,.92),c1=new THREE.Color(1,.86,.22),c2=new THREE.Color(1,.48,.08),c3=new THREE.Color(.96,.20,.66),c4=new THREE.Color(.26,.06,.26);
      if(core>.70)mix3(c1,c0,(core-.70)/.30,out);else if(core>.44)mix3(c2,c1,(core-.44)/.26,out);else if(core>.22)mix3(c3,c2,(core-.22)/.22,out);else mix3(c4,c3,Math.min(1,core/.22),out);
      color2.setRGB(.19,.05,.14);out.lerp(color2,Math.min(.44,haze*.42+layerT*.12));out.multiplyScalar(.26+body*1.02+core*.62);return;
    }
    const c0=new THREE.Color(1,.99,.98),c1=new THREE.Color(.40,1,.96),c2=new THREE.Color(.16,.70,1),c3=new THREE.Color(.98,.24,.80),c4=new THREE.Color(1,.68,.18),c5=new THREE.Color(.26,.08,.33);
    if(core>.78)mix3(c1,c0,(core-.78)/.22,out);else if(core>.50)mix3(c2,c1,(core-.50)/.28,out);else if(core>.24)mix3(c3,c2,(core-.24)/.26,out);else mix3(c5,c3,Math.min(1,core/.24),out);
    const emberT=Math.min(1,cool*.95*(1-layerT*.25));out.lerp(c4,emberT*.22);out.lerp(c5,Math.min(.40,haze*.38+layerT*.10));out.multiplyScalar(.25+body+core*.68);
  }

  function hotAccentColor(hot,out){
    if(palette==='blue'){out.setRGB(.62,1,1);out.lerp(new THREE.Color(1,1,1),Math.min(1,hot*.55));return;}
    if(palette==='ember'){out.setRGB(1,.74,.14);out.lerp(new THREE.Color(1,.95,.90),Math.min(1,hot*.68));return;}
    out.setRGB(.62,1,.96);out.lerp(new THREE.Color(1,.80,.24),.20);out.lerp(new THREE.Color(1,1,1),Math.min(1,hot*.65));
  }

  function renderGroundTexture(){
    const s=settings();
    for(let i=0,p=0;i<N;i++,p+=4){
      if(solid[i]){pix[p]=0;pix[p+1]=0;pix[p+2]=0;pix[p+3]=0;continue;}
      const d=Math.max(0,dye[i]),h=Math.max(0,heat[i]);
      const body=Math.min(1,Math.pow(d*1.25,.75)),hot=Math.min(1,Math.pow(Math.min(d,h)*1.45,.78));
      if(body<.035){pix[p]=0;pix[p+1]=0;pix[p+2]=0;pix[p+3]=0;continue;}
      paletteColor(body,hot,0,color);
      const a=Math.min(1,body*.78+hot*.35);
      pix[p]=Math.floor(Math.min(255,color.r*255));pix[p+1]=Math.floor(Math.min(255,color.g*255));pix[p+2]=Math.floor(Math.min(255,color.b*255));pix[p+3]=Math.floor(Math.min(255,a*255));
    }
    dyeCtx.putImageData(imageData,0,0);dyeTexture.needsUpdate=true;
    fluidPlane.material.opacity=s.ground<=.001?0:Math.min(1.6,.92*s.ground);
    fluidGlowPlane.material.opacity=s.ground<=.001?0:Math.min(1.2,.42*s.ground);
    airPlane.material.opacity=Math.min(1.45,.78+s.glow*.18);
    airGlowPlane.material.opacity=Math.min(1.10,.26+s.glow*.16);
    airHaloPlane.material.opacity=Math.min(.75,.10+s.glow*.08);
  }

  function sampleRenderedGroundColor(gx,gy,out){
    const x=Math.max(0,Math.min(simW-1,Math.floor(gx))),y=Math.max(0,Math.min(simH-1,Math.floor(gy))),p=(x+y*simW)*4;
    out.setRGB(pix[p]/255,pix[p+1]/255,pix[p+2]/255);return pix[p+3]/255;
  }

  function updateVoxelInstances(time){
    const s=settings(),mesh=renderMode==='cubes'?cubeMesh:quadMesh,other=renderMode==='cubes'?quadMesh:cubeMesh;
    mesh.visible=true;other.visible=false;
    const activeLayers=s.layers,voxelBaseW=PATCH_W/VIS_COLS,voxelBaseD=PATCH_D/VIS_ROWS;
    const baseSize=Math.min(voxelBaseW,voxelBaseD)*s.voxelSize;
    const midLayer=Math.max(0,Math.min(activeLayers-1,Math.round((activeLayers-1)*.55)));
    let instance=0;
    for(let row=0;row<VIS_ROWS;row++)for(let col=0;col<VIS_COLS;col++){
      const gx=(col+.5)/VIS_COLS*(simW-2)+1,gy=(row+.5)/VIS_ROWS*(simH-2)+1;
      const iApprox=idx(Math.max(1,Math.min(simW-2,Math.floor(gx))),Math.max(1,Math.min(simH-2,Math.floor(gy))));
      const isSolid=solid[iApprox],d=sample(dye,gx,gy),speed=Math.hypot(sample(u,gx,gy),sample(v,gx,gy));
      const swirl=sample(curlField,gx,gy),body=Math.min(1,Math.pow(d*1.30,.75));
      const groundAlpha=sampleRenderedGroundColor(gx,gy,color);
      const worldX=(col/(VIS_COLS-1)-.5)*PATCH_W,worldZ=(row/(VIS_ROWS-1)-.5)*PATCH_D;
      for(let layer=0;layer<MAX_LAYERS;layer++){
        const layerT=layer/Math.max(1,MAX_LAYERS-1),seed=seeds[instance],distFromMid=Math.abs(layer-midLayer);
        const layerFocus=Math.exp(-Math.pow(distFromMid/.95,2));
        const breakupNoise=seed*.06+.05*Math.sin(time*1.1+seed*18+layer*1.6);
        const threshold=.05+s.breakup*.08+distFromMid*.14+breakupNoise;
        const visible=!isSolid&&layer<activeLayers&&groundAlpha>threshold;
        if(!visible){dummy.position.set(0,-999,0);dummy.scale.set(.001,.001,.001);dummy.rotation.set(0,0,0);dummy.updateMatrix();mesh.setMatrixAt(instance,dummy.matrix);mesh.setColorAt(instance,color.setRGB(0,0,0));instance++;continue;}
        const drift=layer*(.06+s.height*.10);
        const dx=sample(u,gx,gy)*drift+jitterX[instance]*baseSize*(.18+distFromMid*.06);
        const dz=sample(v,gx,gy)*drift+jitterZ[instance]*baseSize*(.18+distFromMid*.06);
        const swirlPush=Math.sin(time*1.7+seed*12)*swirl*.008*(.4+layer);
        const originalY=.28+layer*(.14+s.height*.17)+groundAlpha*(.12+.16*layerFocus);
        const y=mapHeight(originalY);
        const size=baseSize*(.68+groundAlpha*.92+layerFocus*.24)*(1-distFromMid*.06);
        const pulse=1+.06*Math.sin(time*4.6+seed*100);
        dummy.position.set(worldX+dx+swirlPush,y,worldZ+dz-swirlPush);
        if(renderMode==='quads'){dummy.quaternion.copy(camera.quaternion);dummy.scale.set(size*pulse,size*pulse,1);}else{dummy.rotation.set(0,seed*Math.PI*2,0);dummy.scale.set(size*pulse,size*(.45+groundAlpha*.95+layerFocus*.22),size*pulse);}
        dummy.updateMatrix();mesh.setMatrixAt(instance,dummy.matrix);
        sampleRenderedGroundColor(gx,gy,color);color.multiplyScalar((.72+groundAlpha*.82+speed*.03)*(.66+layerFocus*.58));mesh.setColorAt(instance,color);instance++;
      }
    }
    mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  }

  function updateStrokeInstances(){
    const s=settings();
    for(let i=0;i<MAX_STROKES;i++){
      const st=strokes[i];
      if(!st||st.life<=0||s.accent<=.03){dummy.position.set(0,-999,0);dummy.scale.set(.001,.001,.001);dummy.rotation.set(0,0,0);dummy.updateMatrix();strokeMesh.setMatrixAt(i,dummy.matrix);strokeMesh.setColorAt(i,color.setRGB(0,0,0));continue;}
      const mx=(st.x0+st.x1)*.5,mz=(st.z0+st.z1)*.5,dx=st.x1-st.x0,dz=st.z1-st.z0,len=Math.max(.01,Math.hypot(dx,dz)),ang=Math.atan2(dz,dx);
      dummy.position.set(mx,mapHeight(.94+st.heat*.10),mz);dummy.rotation.set(-Math.PI*.5,0,-ang);dummy.scale.set(len*2,st.width*s.accent*(.65+st.life*.55),1);dummy.updateMatrix();strokeMesh.setMatrixAt(i,dummy.matrix);
      hotAccentColor(st.heat,color);color.multiplyScalar(.75+st.life*.45);strokeMesh.setColorAt(i,color);
    }
    strokeMesh.instanceMatrix.needsUpdate=true;if(strokeMesh.instanceColor)strokeMesh.instanceColor.needsUpdate=true;
  }

  function setCenter(x,z,y=0){
    const bias=Number(settings().torsoBias)||0;
    group.position.set(Number(x)||0,(Number(y)||0)+bias,Number(z)||0);
  }
  function setVisible(value){group.visible=!!value;}
  function update(time){renderGroundTexture();updateVoxelInstances(time);updateStrokeInstances();}
  function dispose(){
    scene.remove(group);
    for(const object of[fluidPlane,fluidGlowPlane,airPlane,airGlowPlane,airHaloPlane,quadMesh,cubeMesh,strokeMesh]){object.geometry?.dispose?.();object.material?.dispose?.();}
    dyeTexture.dispose?.();
  }
  return{group,setCenter,setVisible,update,dispose,mapHeight};
}
