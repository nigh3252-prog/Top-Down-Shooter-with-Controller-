import { createMagicFluidField } from './magic-fluid-sim.js';
import { ORANGE_DASH_MAGIC, createOrangeDashJet, emberPaletteRGBA } from './magic-brush-presets.js';

export function installMagicFluidRuntime({THREE,scene,getMazeSegments=()=>[],getWorldKey=()=>null,poolSize=2,preset=ORANGE_DASH_MAGIC}={}){
  if(!THREE||!scene)throw new Error('[magic-fluid-runtime] THREE and scene are required.');
  if(typeof document==='undefined')throw new Error('[magic-fluid-runtime] document is required for the fluid texture.');
  const patches=[];
  let serial=0,lastWorldKey=getWorldKey?.()||null,dashJet=null;

  function createPatch(){
    const field=createMagicFluidField(preset);
    const canvas=document.createElement('canvas');canvas.width=field.columns;canvas.height=field.rows;
    const context=canvas.getContext('2d',{alpha:true});
    const image=context.createImageData(field.columns,field.rows);
    const texture=new THREE.CanvasTexture(canvas);
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;
    texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
    const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(field.width,field.depth),material);
    mesh.rotation.x=-Math.PI/2;mesh.position.y=preset.renderHeight;mesh.visible=false;mesh.frustumCulled=false;mesh.renderOrder=2;
    mesh.name='Magic fluid orange middle slice';scene.add(mesh);
    return{field,canvas,context,image,texture,material,mesh,lastUsed:0};
  }

  for(let i=0;i<Math.max(1,poolSize);i++)patches.push(createPatch());

  function contains(patch,x,z,margin=1.5){
    return Math.abs(x-patch.field.state.centerX)<=patch.field.width*.5-margin&&Math.abs(z-patch.field.state.centerZ)<=patch.field.depth*.5-margin;
  }

  function activatePatch(origin){
    let patch=patches.find(candidate=>candidate.field.state.active&&contains(candidate,origin.x,origin.z));
    if(!patch)patch=patches.find(candidate=>!candidate.field.state.active)||patches.reduce((oldest,candidate)=>candidate.lastUsed<oldest.lastUsed?candidate:oldest,patches[0]);
    if(!patch.field.state.active||!contains(patch,origin.x,origin.z,.5)){
      patch.field.setCenter(origin.x,origin.z);
      patch.field.rebuildSolids(getMazeSegments?.()||[]);
      patch.mesh.position.x=origin.x;patch.mesh.position.z=origin.z;
    }
    patch.lastUsed=++serial;patch.mesh.visible=true;
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
    const spacing=Math.max(.08,Number(preset.jetSpacing)||.42);
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
    const position={x:Number(payload.position?.x)||dashJet.position.x,z:Number(payload.position?.z)||dashJet.position.z};
    if(dashJet.carry>Math.max(.08,(Number(preset.jetSpacing)||.42)*.35))emitDashJet({position,dashDirection:dashJet.dashDirection,intensity:.72});
    dashJet=null;
  }

  function renderPatch(patch){
    const{field,image,context,texture,mesh}=patch,pixels=image.data;
    for(let i=0,p=0;i<field.dye.length;i++,p+=4){
      if(field.solid[i]){pixels[p]=pixels[p+1]=pixels[p+2]=pixels[p+3]=0;continue;}
      const[r,g,b,a]=emberPaletteRGBA(field.dye[i],field.heat[i]);
      pixels[p]=Math.round(r*255);pixels[p+1]=Math.round(g*255);pixels[p+2]=Math.round(b*255);pixels[p+3]=Math.round(a*255);
    }
    context.putImageData(image,0,0);texture.needsUpdate=true;mesh.visible=field.state.active;
  }

  function clear(){
    dashJet=null;
    for(const patch of patches){patch.field.clear();patch.mesh.visible=false;}
  }

  function update(dt){
    const worldKey=getWorldKey?.()||null;
    if(lastWorldKey&&worldKey&&worldKey!==lastWorldKey)clear();
    lastWorldKey=worldKey;
    for(const patch of patches){
      if(!patch.field.state.active){patch.mesh.visible=false;continue;}
      patch.field.update(dt);renderPatch(patch);
    }
  }

  function dispose(){
    dashJet=null;
    for(const patch of patches){scene.remove(patch.mesh);patch.mesh.geometry?.dispose?.();patch.material?.dispose?.();patch.texture?.dispose?.();}
  }

  return{patches,emitBurst,emitDashJet,beginDashJet,updateDashJet,endDashJet,update,clear,dispose,preset};
}
