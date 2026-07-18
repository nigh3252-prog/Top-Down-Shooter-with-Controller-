import { createMagicFluidField } from './magic-fluid-sim.js';
import { ORANGE_DASH_MAGIC, createOrangeDashJet, emberPaletteRGBA } from './magic-brush-presets.js';

const clamp01=value=>Math.max(0,Math.min(1,value));
const smoothstep01=value=>{const u=clamp01(value);return u*u*(3-2*u);};

function hash01(index){
  const value=Math.sin((index+1)*12.9898)*43758.5453;
  return value-Math.floor(value);
}

export function installMagicFluidRuntime({THREE,scene,camera,getMazeSegments=()=>[],getWorldKey=()=>null,poolSize=2,preset=ORANGE_DASH_MAGIC}={}){
  if(!THREE||!scene)throw new Error('[magic-fluid-runtime] THREE and scene are required.');
  const patches=[];
  const renderCamera=camera||null;
  const dummy=new THREE.Object3D();
  const color=new THREE.Color();
  let serial=0,lastWorldKey=getWorldKey?.()||null,dashJet=null;

  function createPatch(){
    const field=createMagicFluidField(preset);
    const visualColumns=Math.max(4,Math.round(preset.visualColumns||22));
    const visualRows=Math.max(4,Math.round(preset.visualRows||22));
    const visualLayers=Math.max(1,Math.round(preset.visualLayers||4));
    const maxInstances=visualColumns*visualRows*visualLayers;
    const material=new THREE.MeshBasicMaterial({
      color:0xffffff,
      transparent:true,
      opacity:.88,
      blending:THREE.AdditiveBlending,
      depthWrite:false,
      depthTest:true,
      vertexColors:true,
      side:THREE.DoubleSide,
      fog:false,
    });
    const mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),material,maxInstances);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled=false;
    mesh.renderOrder=2;
    mesh.visible=false;
    mesh.name='Magic fluid stacked orange voxels';
    scene.add(mesh);

    const seeds=new Float32Array(maxInstances);
    const jitterX=new Float32Array(maxInstances);
    const jitterZ=new Float32Array(maxInstances);
    for(let i=0;i<maxInstances;i++){
      seeds[i]=hash01(i*3);
      jitterX[i]=hash01(i*3+1)-.5;
      jitterZ[i]=hash01(i*3+2)-.5;
    }

    return{
      field,mesh,material,visualColumns,visualRows,visualLayers,maxInstances,
      seeds,jitterX,jitterZ,lastUsed:0,
    };
  }

  for(let i=0;i<Math.max(1,poolSize);i++)patches.push(createPatch());

  function contains(patch,x,z,margin=Math.max(2.5,(preset.jetRadius||1.55)+1)){
    return Math.abs(x-patch.field.state.centerX)<=patch.field.width*.5-margin
      &&Math.abs(z-patch.field.state.centerZ)<=patch.field.depth*.5-margin;
  }

  function activatePatch(origin){
    let patch=patches.find(candidate=>candidate.field.state.active&&contains(candidate,origin.x,origin.z));
    if(!patch)patch=patches.find(candidate=>!candidate.field.state.active)
      ||patches.reduce((oldest,candidate)=>candidate.lastUsed<oldest.lastUsed?candidate:oldest,patches[0]);
    if(!patch.field.state.active||!contains(patch,origin.x,origin.z,.5)){
      patch.field.setCenter(origin.x,origin.z);
      patch.field.rebuildSolids(getMazeSegments?.()||[]);
      patch.mesh.position.x=origin.x;
      patch.mesh.position.z=origin.z;
    }
    patch.lastUsed=++serial;
    patch.mesh.visible=true;
    return patch;
  }

  function emitBurst(burst){
    const origin=burst?.origin||{x:0,z:0};
    const patch=activatePatch(origin);
    patch.field.injectBurst(burst);
    patch.mesh.visible=true;
    return patch;
  }

  function emitDashJet(payload){return emitBurst(createOrangeDashJet(payload));}

  function beginDashJet(payload={}){
    const position={x:Number(payload.position?.x)||0,z:Number(payload.position?.z)||0};
    const dashDirection={x:Number(payload.dashDirection?.x)||0,z:Number(payload.dashDirection?.z)||-1};
    dashJet={position,dashDirection,carry:0};
    emitDashJet({position,dashDirection});
  }

  function updateDashJet(payload={}){
    const to={x:Number(payload.position?.x)||0,z:Number(payload.position?.z)||0};
    const dashDirection={x:Number(payload.dashDirection?.x)||0,z:Number(payload.dashDirection?.z)||-1};
    if(!dashJet){beginDashJet({position:to,dashDirection});return;}
    const from=dashJet.position;
    const dx=to.x-from.x,dz=to.z-from.z,distance=Math.hypot(dx,dz);
    const spacing=Math.max(.08,Number(preset.jetSpacing)||.28);
    if(distance>1e-6){
      let advanced=0,remaining=distance;
      while(dashJet.carry+remaining>=spacing){
        const needed=spacing-dashJet.carry;
        advanced+=needed;
        const t=Math.min(1,advanced/distance);
        emitDashJet({
          position:{x:from.x+dx*t,z:from.z+dz*t},
          dashDirection,
        });
        remaining=Math.max(0,distance-advanced);
        dashJet.carry=0;
      }
      dashJet.carry+=remaining;
    }
    dashJet.position=to;
    dashJet.dashDirection=dashDirection;
  }

  function endDashJet(payload={}){
    if(!dashJet)return;
    const position={
      x:Number.isFinite(payload.position?.x)?payload.position.x:dashJet.position.x,
      z:Number.isFinite(payload.position?.z)?payload.position.z:dashJet.position.z,
    };
    if(dashJet.carry>Math.max(.08,(Number(preset.jetSpacing)||.28)*.35)){
      emitDashJet({position,dashDirection:dashJet.dashDirection,intensity:.72});
    }
    dashJet=null;
  }

  function hideInstance(mesh,index){
    dummy.position.set(0,-999,0);
    dummy.scale.set(.001,.001,.001);
    dummy.rotation.set(0,0,0);
    dummy.updateMatrix();
    mesh.setMatrixAt(index,dummy.matrix);
    mesh.setColorAt(index,color.setRGB(0,0,0));
  }

  function renderPatch(patch,time){
    const{
      field,mesh,visualColumns,visualRows,visualLayers,seeds,jitterX,jitterZ,
    }=patch;
    if(!field.state.active){mesh.visible=false;return;}

    const cellWidth=field.width/Math.max(1,visualColumns-1);
    const cellDepth=field.depth/Math.max(1,visualRows-1);
    const baseSize=Math.min(cellWidth,cellDepth)*(Number(preset.voxelSize)||1.12);
    const middleLayer=Math.max(0,Math.min(visualLayers-1,Math.round((visualLayers-1)*.55)));
    const layerHeight=Number(preset.layerHeight)||.28;
    const baseHeight=Number(preset.baseHeight)||.34;
    const breakup=Number(preset.layerBreakup)||.28;
    let instance=0;

    for(let row=0;row<visualRows;row++){
      const rowT=row/Math.max(1,visualRows-1);
      const localZ=(rowT-.5)*field.depth;
      for(let col=0;col<visualColumns;col++){
        const colT=col/Math.max(1,visualColumns-1);
        const localX=(colT-.5)*field.width;
        const worldX=field.state.centerX+localX;
        const worldZ=field.state.centerZ+localZ;
        const d=field.sampleWorld(field.dye,worldX,worldZ);
        const h=field.sampleWorld(field.heat,worldX,worldZ);
        const velocityX=field.sampleWorld(field.u,worldX,worldZ);
        const velocityZ=field.sampleWorld(field.v,worldX,worldZ);
        const curl=field.sampleWorld(field.curlField,worldX,worldZ);
        const blocked=field.sampleWorld(field.solid,worldX,worldZ)>.35;
        const rgba=emberPaletteRGBA(d,h);
        const speed=Math.hypot(velocityX,velocityZ);
        const edgeDistance=Math.min(colT,1-colT,rowT,1-rowT)*2;
        const edgeFade=smoothstep01(edgeDistance*6);

        for(let layer=0;layer<visualLayers;layer++,instance++){
          const distFromMiddle=Math.abs(layer-middleLayer);
          const layerFocus=Math.exp(-Math.pow(distFromMiddle/.95,2));
          const seed=seeds[instance];
          const noise=(seed-.5)*.075+.032*Math.sin(time*1.25+seed*18+layer*1.7);
          const threshold=.028+breakup*.065+distFromMiddle*.105+noise;
          const visible=!blocked&&rgba[3]*edgeFade>threshold;
          if(!visible){hideInstance(mesh,instance);continue;}

          const drift=layer*(.045+layerHeight*.10);
          const swirlPush=Math.sin(time*1.7+seed*12)*curl*.008*(.45+layer);
          const y=baseHeight+layer*layerHeight+rgba[3]*(.10+.15*layerFocus);
          const size=baseSize*(.66+rgba[3]*1.02+layerFocus*.24)*(1-distFromMiddle*.055);
          const pulse=1+.045*Math.sin(time*4.4+seed*100);

          dummy.position.set(
            localX+velocityX*drift+jitterX[instance]*baseSize*.22+swirlPush,
            y,
            localZ+velocityZ*drift+jitterZ[instance]*baseSize*.22-swirlPush,
          );
          if(renderCamera?.quaternion)dummy.quaternion.copy(renderCamera.quaternion);
          else dummy.rotation.set(-Math.PI*.5,0,0);
          dummy.scale.set(size*pulse,size*pulse,1);
          dummy.updateMatrix();
          mesh.setMatrixAt(instance,dummy.matrix);

          const brightness=(.70+rgba[3]*.86+speed*.025)*(.62+layerFocus*.58)*edgeFade;
          color.setRGB(rgba[0]*brightness,rgba[1]*brightness,rgba[2]*brightness);
          mesh.setColorAt(instance,color);
        }
      }
    }

    mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    mesh.visible=true;
  }

  function clear(){
    dashJet=null;
    for(const patch of patches){patch.field.clear();patch.mesh.visible=false;}
  }

  function update(dt,now){
    const worldKey=getWorldKey?.()||null;
    if(lastWorldKey&&worldKey&&worldKey!==lastWorldKey)clear();
    lastWorldKey=worldKey;
    const time=(Number.isFinite(now)?now:(globalThis.performance?.now?.()||0))*.001;
    for(const patch of patches){
      if(!patch.field.state.active){patch.mesh.visible=false;continue;}
      patch.field.update(dt);
      renderPatch(patch,time);
    }
  }

  function dispose(){
    dashJet=null;
    for(const patch of patches){
      scene.remove(patch.mesh);
      patch.mesh.geometry?.dispose?.();
      patch.material?.dispose?.();
    }
  }

  return{
    patches,emitBurst,emitDashJet,beginDashJet,updateDashJet,endDashJet,
    update,clear,dispose,preset,
  };
}
