// Renderer copied from threejs_midair_lifted_ground_slice_v1.html, "Duel"
// preset only: blue palette, billboarded quad voxels, lifted air slices, no
// ground floor planes. Everything lives in one Group positioned at the patch
// center; all internal math stays in the prototype's patch-local coordinates
// so the port is line-for-line. The prototype's world scale matches the game,
// so no dimension is rescaled.
//
// Integration-only differences from the prototype:
// - materials are toneMapped:false + fog:false (combat-arena runs ACES tone
//   mapping and fog, which would gray out the additive ramp);
// - air-slice opacities multiply by settings().airSheetScale so the sheets can
//   be dialed down if they flatten the look under the perspective camera;
// - the render camera is captured from onBeforeRender because the arena does
//   not expose its camera to combat modules.
export function createDashJetRenderer({THREE,scene,settings,layout,sim}={}){
  if(!THREE||!scene)throw new Error('[dash-magic-jet-render] THREE and scene are required.');
  const PATCH_W=layout.patchWidth;
  const PATCH_D=layout.patchDepth;
  const MAX_LAYERS=layout.maxLayers;
  const VIS_COLS=layout.visualColumns;
  const VIS_ROWS=layout.visualRows;
  const MAX_INSTANCES=VIS_COLS*VIS_ROWS*MAX_LAYERS;
  const MAX_STROKES=layout.maxStrokes;
  const simW=sim.simW,simH=sim.simH,N=sim.N;

  const group=new THREE.Group();
  group.visible=false;
  scene.add(group);

  const color=new THREE.Color();
  const color2=new THREE.Color();
  const dummy=new THREE.Object3D();

  const seeds=new Float32Array(MAX_INSTANCES);
  const jitterX=new Float32Array(MAX_INSTANCES);
  const jitterZ=new Float32Array(MAX_INSTANCES);
  for(let i=0;i<MAX_INSTANCES;i++){
    seeds[i]=Math.random();
    jitterX[i]=Math.random()-.5;
    jitterZ[i]=Math.random()-.5;
  }

  // --- Dye canvas texture (prototype makeDyeTexture) ---
  const dyeCanvas=document.createElement('canvas');
  const dyeCtx=dyeCanvas.getContext('2d',{alpha:true});
  dyeCanvas.width=simW;
  dyeCanvas.height=simH;
  const imageData=dyeCtx.createImageData(simW,simH);
  const pix=imageData.data;
  const dyeTexture=new THREE.CanvasTexture(dyeCanvas);
  dyeTexture.colorSpace=THREE.SRGBColorSpace;
  dyeTexture.minFilter=THREE.NearestFilter;
  dyeTexture.magFilter=THREE.NearestFilter;
  dyeTexture.generateMipmaps=false;
  dyeTexture.wrapS=THREE.ClampToEdgeWrapping;
  dyeTexture.wrapT=THREE.ClampToEdgeWrapping;

  // Dark understain: the prototype's additive ramp was tuned against a
  // near-black background. The arena's ground is bright, so a translucent dark
  // plane under the trail locally recreates that darkness and lets the blue
  // glow read instead of clipping to white.
  const stainCanvas=document.createElement('canvas');
  const stainCtx=stainCanvas.getContext('2d',{alpha:true});
  stainCanvas.width=simW;
  stainCanvas.height=simH;
  const stainImage=stainCtx.createImageData(simW,simH);
  const stainPix=stainImage.data;
  const stainTexture=new THREE.CanvasTexture(stainCanvas);
  stainTexture.colorSpace=THREE.SRGBColorSpace;
  stainTexture.minFilter=THREE.LinearFilter;
  stainTexture.magFilter=THREE.LinearFilter;
  stainTexture.generateMipmaps=false;
  stainTexture.wrapS=THREE.ClampToEdgeWrapping;
  stainTexture.wrapT=THREE.ClampToEdgeWrapping;
  const stainPlane=new THREE.Mesh(
    new THREE.PlaneGeometry(PATCH_W,PATCH_D),
    new THREE.MeshBasicMaterial({
      map:stainTexture,
      transparent:true,
      opacity:1,
      depthWrite:false,
      side:THREE.DoubleSide,
      toneMapped:false,
      fog:false,
    })
  );
  stainPlane.rotation.x=-Math.PI/2;
  stainPlane.position.y=.06;
  stainPlane.renderOrder=1;
  group.add(stainPlane);

  function airSheet(width,depth,y){
    const mesh=new THREE.Mesh(
      new THREE.PlaneGeometry(width,depth),
      new THREE.MeshBasicMaterial({
        map:dyeTexture,
        transparent:true,
        opacity:1,
        blending:THREE.AdditiveBlending,
        depthWrite:false,
        side:THREE.DoubleSide,
        toneMapped:false,
        fog:false,
      })
    );
    mesh.rotation.x=-Math.PI/2;
    mesh.position.y=y;
    mesh.renderOrder=2;
    group.add(mesh);
    return mesh;
  }
  const airPlane=airSheet(PATCH_W,PATCH_D,.92);
  const airGlowPlane=airSheet(PATCH_W*1.03,PATCH_D*1.03,1.02);
  const airHaloPlane=airSheet(PATCH_W*1.08,PATCH_D*1.08,1.10);

  // The prototype sets vertexColors:true here, but on three r165 that makes the
  // shader read a color attribute PlaneGeometry does not have, which multiplies
  // every instance to black (invisible under additive blending). Per-instance
  // color via setColorAt only needs instanceColor, so vertexColors stays off.
  const quadMaterial=new THREE.MeshBasicMaterial({
    color:0xffffff,
    transparent:true,
    opacity:.78,
    blending:THREE.AdditiveBlending,
    depthWrite:false,
    side:THREE.DoubleSide,
    toneMapped:false,
    fog:false,
  });
  const strokeMaterial=new THREE.MeshBasicMaterial({
    color:0xffffff,
    transparent:true,
    opacity:.95,
    blending:THREE.AdditiveBlending,
    depthWrite:false,
    side:THREE.DoubleSide,
    toneMapped:false,
    fog:false,
  });

  const quadMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),quadMaterial,MAX_INSTANCES);
  const strokeMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),strokeMaterial,MAX_STROKES);
  quadMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  strokeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  quadMesh.frustumCulled=false;
  strokeMesh.frustumCulled=false;
  quadMesh.renderOrder=3;
  strokeMesh.renderOrder=3;
  group.add(quadMesh);
  group.add(strokeMesh);

  // The arena never hands its camera to combat modules, so capture whichever
  // camera actually renders the quads. Until the first render, a proxy posed
  // at the combat-arena follow-camera angle keeps billboards sane.
  let activeCamera=new THREE.Object3D();
  activeCamera.position.set(0,20,17.6);
  activeCamera.lookAt(0,1.8,-1.4);
  quadMesh.onBeforeRender=(_renderer,_scene,camera)=>{
    if(camera?.quaternion)activeCamera=camera;
  };

  // --- Palettes (prototype paletteColor/hotAccentColor, all three branches) ---
  const blue0=new THREE.Color(1.00,.99,1.00);
  const blue1=new THREE.Color(.48,.98,1.00);
  const blue2=new THREE.Color(.12,.66,1.00);
  const blue3=new THREE.Color(.38,.20,.78);
  const ember0=new THREE.Color(1.00,.98,.92);
  const ember1=new THREE.Color(1.00,.86,.22);
  const ember2=new THREE.Color(1.00,.48,.08);
  const ember3=new THREE.Color(.96,.20,.66);
  const ember4=new THREE.Color(.26,.06,.26);
  const arcane0=new THREE.Color(1.00,.99,.98);
  const arcane1=new THREE.Color(.40,1.00,.96);
  const arcane2=new THREE.Color(.16,.70,1.00);
  const arcane3=new THREE.Color(.98,.24,.80);
  const arcane4=new THREE.Color(1.00,.68,.18);
  const arcane5=new THREE.Color(.26,.08,.33);
  const warmWhite=new THREE.Color(1.00,.95,.90);
  const gold=new THREE.Color(1.00,.80,.24);
  const white=new THREE.Color(1,1,1);
  // Understain tints per palette: a dark version of each ramp's haze color.
  const STAIN_RGB={blue:[10,6,24],ember:[26,8,16],arcane:[24,8,30]};

  function mix3(a,b,t,out){out.copy(a).lerp(b,t);}

  function paletteColor(palette,body,hot,layerT,out){
    const cool=Math.max(0,body-hot*.55);
    const core=Math.min(1,hot*1.25);
    const haze=Math.min(1,cool*(.65+layerT*.35));

    if(palette==='ember'){
      if(core>.70)mix3(ember1,ember0,(core-.70)/.30,out);
      else if(core>.44)mix3(ember2,ember1,(core-.44)/.26,out);
      else if(core>.22)mix3(ember3,ember2,(core-.22)/.22,out);
      else mix3(ember4,ember3,Math.min(1,core/.22),out);
      color2.setRGB(.19,.05,.14);
      out.lerp(color2,Math.min(.44,haze*.42+layerT*.12));
      out.multiplyScalar(.26+body*1.02+core*.62);
      return;
    }

    if(palette==='arcane'){
      if(core>.78)mix3(arcane1,arcane0,(core-.78)/.22,out);
      else if(core>.50)mix3(arcane2,arcane1,(core-.50)/.28,out);
      else if(core>.24)mix3(arcane3,arcane2,(core-.24)/.26,out);
      else mix3(arcane5,arcane3,Math.min(1,core/.24),out);
      const emberT=Math.min(1,cool*.95*(1-layerT*.25));
      out.lerp(arcane4,emberT*.22);
      out.lerp(arcane5,Math.min(.40,haze*.38+layerT*.10));
      out.multiplyScalar(.25+body*1.00+core*.68);
      return;
    }

    if(core>.68)mix3(blue1,blue0,(core-.68)/.32,out);
    else if(core>.30)mix3(blue2,blue1,(core-.30)/.38,out);
    else mix3(blue3,blue2,Math.min(1,core/.30),out);
    color2.setRGB(.10,.06,.22);
    out.lerp(color2,Math.min(.55,haze*.55+layerT*.14));
    out.multiplyScalar(.26+body*.95+core*.65);
  }

  function hotAccentColor(palette,hot,out){
    if(palette==='ember'){
      out.setRGB(1.00,.74,.14);
      out.lerp(warmWhite,Math.min(1,hot*.68));
      return;
    }
    if(palette==='arcane'){
      out.setRGB(.62,1.00,.96);
      out.lerp(gold,.20);
      out.lerp(white,Math.min(1,hot*.65));
      return;
    }
    out.setRGB(.62,1.00,1.00);
    out.lerp(white,Math.min(1,hot*.55));
  }

  // --- Ground texture (prototype renderGroundTexture, ground planes omitted) ---
  function renderGroundTexture(){
    const s=settings();
    const palette=s.palette||'blue';
    const stain=Math.max(0,Number(s.groundStain??0));
    const stainRGB=STAIN_RGB[palette]||STAIN_RGB.blue;
    const solid=sim.solid,dye=sim.dye,heat=sim.heat;
    for(let i=0,p=0;i<N;i++,p+=4){
      if(solid[i]){
        pix[p+0]=0;pix[p+1]=0;pix[p+2]=0;pix[p+3]=0;
        stainPix[p+3]=0;
        continue;
      }
      const d=Math.max(0,dye[i]);
      const h=Math.max(0,heat[i]);
      const body=Math.min(1,Math.pow(d*1.25,.75));
      const hot=Math.min(1,Math.pow(Math.min(d,h)*1.45,.78));
      // The stain footprint is wider than the glow (lower threshold, softer
      // curve) so the additive layers always sit on darkened ground.
      const stainBody=Math.min(1,Math.pow(d*1.6,.55));
      stainPix[p+0]=stainRGB[0];stainPix[p+1]=stainRGB[1];stainPix[p+2]=stainRGB[2];
      stainPix[p+3]=Math.floor(Math.min(255,stainBody*stain*255));
      if(body<.035){
        pix[p+0]=0;pix[p+1]=0;pix[p+2]=0;pix[p+3]=0;
        continue;
      }
      paletteColor(palette,body,hot,0,color);
      const a=Math.min(1,body*.78+hot*.35);
      pix[p+0]=Math.floor(Math.min(255,color.r*255));
      pix[p+1]=Math.floor(Math.min(255,color.g*255));
      pix[p+2]=Math.floor(Math.min(255,color.b*255));
      pix[p+3]=Math.floor(Math.min(255,a*255));
    }
    dyeCtx.putImageData(imageData,0,0);
    dyeTexture.needsUpdate=true;
    stainCtx.putImageData(stainImage,0,0);
    stainTexture.needsUpdate=true;
    stainPlane.visible=stain>.01;

    const sheet=Math.max(0,Number(s.airSheetScale??1));
    airPlane.material.opacity=Math.min(1.45,.78+s.glow*.18)*sheet;
    airGlowPlane.material.opacity=Math.min(1.10,.26+s.glow*.16)*sheet;
    airHaloPlane.material.opacity=Math.min(.75,.10+s.glow*.08)*sheet;

    // Ride the slices at the upper-middle of the lifted voxel stack (the
    // prototype's fixed 0.92..1.10 band assumed the stack started at ground).
    const layerStep=(.14+s.height*.17)*(s.layerSpread??1);
    const sliceBase=(s.baseLift??.28)+layerStep*2;
    airPlane.position.y=sliceBase;
    airGlowPlane.position.y=sliceBase+.10;
    airHaloPlane.position.y=sliceBase+.18;
  }

  function sampleRenderedGroundColor(gx,gy,out){
    const x=Math.max(0,Math.min(simW-1,Math.floor(gx)));
    const y=Math.max(0,Math.min(simH-1,Math.floor(gy)));
    const p=(x+y*simW)*4;
    out.setRGB(pix[p+0]/255,pix[p+1]/255,pix[p+2]/255);
    return pix[p+3]/255;
  }

  // --- Layered voxel cloud (prototype updateVoxelInstances, quads mode) ---
  function updateVoxelInstances(time){
    const s=settings();
    const solid=sim.solid,dye=sim.dye,u=sim.u,v=sim.v,curlField=sim.curlField;
    const activeLayers=s.layers;
    const voxelBaseW=PATCH_W/VIS_COLS;
    const voxelBaseD=PATCH_D/VIS_ROWS;
    const baseSize=Math.min(voxelBaseW,voxelBaseD)*s.voxelSize;
    const midLayer=Math.max(0,Math.min(activeLayers-1,Math.round((activeLayers-1)*.55)));

    let instance=0;
    for(let row=0;row<VIS_ROWS;row++){
      for(let col=0;col<VIS_COLS;col++){
        const gx=(col+.5)/VIS_COLS*(simW-2)+1;
        const gy=(row+.5)/VIS_ROWS*(simH-2)+1;
        const iApprox=sim.idx(
          Math.max(1,Math.min(simW-2,Math.floor(gx))),
          Math.max(1,Math.min(simH-2,Math.floor(gy)))
        );
        const isSolid=solid[iApprox];

        const speed=Math.hypot(sim.sample(u,gx,gy),sim.sample(v,gx,gy));
        const swirl=sim.sample(curlField,gx,gy);
        const groundAlpha=sampleRenderedGroundColor(gx,gy,color);

        const worldX=(col/(VIS_COLS-1)-.5)*PATCH_W;
        const worldZ=(row/(VIS_ROWS-1)-.5)*PATCH_D;

        for(let layer=0;layer<MAX_LAYERS;layer++){
          const seed=seeds[instance];
          const distFromMid=Math.abs(layer-midLayer);
          const layerFocus=Math.exp(-Math.pow(distFromMid/.95,2));
          const breakupNoise=seed*.06+.05*Math.sin(time*1.1+seed*18+layer*1.6);
          const threshold=.05+s.breakup*.08+distFromMid*.14+breakupNoise;
          const visible=!isSolid&&layer<activeLayers&&groundAlpha>threshold;

          if(!visible){
            dummy.position.set(0,-999,0);
            dummy.scale.set(.001,.001,.001);
            dummy.rotation.set(0,0,0);
            dummy.updateMatrix();
            quadMesh.setMatrixAt(instance,dummy.matrix);
            quadMesh.setColorAt(instance,color.setRGB(0,0,0));
            instance++;
            continue;
          }

          const drift=layer*(.06+s.height*.10);
          const dx=sim.sample(u,gx,gy)*drift+jitterX[instance]*baseSize*(.18+distFromMid*.06);
          const dz=sim.sample(v,gx,gy)*drift+jitterZ[instance]*baseSize*(.18+distFromMid*.06);
          const swirlPush=Math.sin(time*1.7+seed*12.0)*swirl*.008*(.4+layer);

          const y=(s.baseLift??.28)+layer*(.14+s.height*.17)*(s.layerSpread??1)+groundAlpha*(.12+.16*layerFocus);
          const size=baseSize*(.68+groundAlpha*.92+layerFocus*.24)*(1.0-distFromMid*.06);
          const pulse=1+.06*Math.sin(time*4.6+seed*100);

          dummy.position.set(worldX+dx+swirlPush,y,worldZ+dz-swirlPush);
          dummy.quaternion.copy(activeCamera.quaternion);
          dummy.scale.set(size*pulse,size*pulse,1);
          dummy.updateMatrix();
          quadMesh.setMatrixAt(instance,dummy.matrix);

          // Re-sample the exact rendered ground color so the voxels inherit the
          // same hot blue/teal core and edge falloff that the dye texture has.
          sampleRenderedGroundColor(gx,gy,color);
          color.multiplyScalar((.72+groundAlpha*.82+speed*.03)*(.66+layerFocus*.58)*(s.voxelGain??1));
          quadMesh.setColorAt(instance,color);

          instance++;
        }
      }
    }
    quadMesh.instanceMatrix.needsUpdate=true;
    if(quadMesh.instanceColor)quadMesh.instanceColor.needsUpdate=true;
  }

  // --- Accent streaks (prototype updateStrokeInstances) ---
  function updateStrokeInstances(){
    const s=settings();
    const palette=s.palette||'blue';
    const strokes=sim.strokes;
    for(let i=0;i<MAX_STROKES;i++){
      const st=strokes[i];
      if(!st||st.life<=0||s.accent<=.03){
        dummy.position.set(0,-999,0);
        dummy.scale.set(.001,.001,.001);
        dummy.rotation.set(0,0,0);
        dummy.updateMatrix();
        strokeMesh.setMatrixAt(i,dummy.matrix);
        strokeMesh.setColorAt(i,color.setRGB(0,0,0));
        continue;
      }
      const mx=(st.x0+st.x1)*.5;
      const mz=(st.z0+st.z1)*.5;
      const dx=st.x1-st.x0;
      const dz=st.z1-st.z0;
      const len=Math.max(.01,Math.hypot(dx,dz));
      const ang=Math.atan2(dz,dx);
      dummy.position.set(mx,(s.baseLift??.84)+.10+st.heat*.10,mz);
      dummy.rotation.set(-Math.PI*.5,0,-ang);
      dummy.scale.set(len*2.0,st.width*s.accent*(.65+st.life*.55),1);
      dummy.updateMatrix();
      strokeMesh.setMatrixAt(i,dummy.matrix);
      hotAccentColor(palette,st.heat,color);
      color.multiplyScalar((.75+st.life*.45)*(s.voxelGain??1));
      strokeMesh.setColorAt(i,color);
    }
    strokeMesh.instanceMatrix.needsUpdate=true;
    if(strokeMesh.instanceColor)strokeMesh.instanceColor.needsUpdate=true;
  }

  function setCenter(x,z){
    group.position.set(Number(x)||0,0,Number(z)||0);
  }
  function setVisible(visible){
    group.visible=!!visible;
  }
  function update(time){
    renderGroundTexture();
    updateVoxelInstances(time);
    updateStrokeInstances();
  }
  function dispose(){
    scene.remove(group);
    group.traverse(node=>{
      if(node.geometry)node.geometry.dispose();
      if(node.material)node.material.dispose();
    });
    dyeTexture.dispose();
    stainTexture.dispose();
  }

  return{
    group,quadMesh,strokeMesh,dyeTexture,
    airPlane,airGlowPlane,airHaloPlane,
    setCenter,setVisible,update,dispose,
    get camera(){return activeCamera;},
  };
}
