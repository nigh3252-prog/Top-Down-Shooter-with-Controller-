import { createMagicFluidField } from './magic-fluid-sim.js';
import { RED_DASH_MAGIC, createRedDashBurst } from './magic-brush-presets.js';

function redPalette(dye,heat){
  const body=Math.min(1,Math.pow(Math.max(0,dye)*1.25,.72));
  const hot=Math.min(1,Math.pow(Math.min(Math.max(0,dye),Math.max(0,heat))*1.45,.78));
  if(body<.025)return[0,0,0,0];
  let r,g,b;
  if(hot>.72){const t=(hot-.72)/.28;r=1;g=.58+.38*t;b=.12+.78*t;}
  else if(hot>.38){const t=(hot-.38)/.34;r=1;g=.12+.46*t;b=.045+.075*t;}
  else{const t=hot/.38;r=.24+.76*t;g=.015+.105*t;b=.035+.01*t;}
  const alpha=Math.min(1,body*.82+hot*.28);
  const brightness=.42+body*.78+hot*.42;
  return[Math.min(1,r*brightness),Math.min(1,g*brightness),Math.min(1,b*brightness),alpha];
}

export function installMagicFluidRuntime({THREE,scene,getMazeSegments=()=>[],getWorldKey=()=>null,poolSize=2,preset=RED_DASH_MAGIC}={}){
  if(!THREE||!scene)throw new Error('[magic-fluid-runtime] THREE and scene are required.');
  if(typeof document==='undefined')throw new Error('[magic-fluid-runtime] document is required for the fluid texture.');
  const patches=[];
  let serial=0,lastWorldKey=getWorldKey?.()||null;

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
    mesh.name='Magic fluid middle slice';scene.add(mesh);
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

  function emitDashBurst(payload){return emitBurst(createRedDashBurst(payload));}

  function renderPatch(patch){
    const{field,image,context,texture,mesh}=patch,pixels=image.data;
    for(let i=0,p=0;i<field.dye.length;i++,p+=4){
      if(field.solid[i]){pixels[p]=pixels[p+1]=pixels[p+2]=pixels[p+3]=0;continue;}
      const[r,g,b,a]=redPalette(field.dye[i],field.heat[i]);
      pixels[p]=Math.round(r*255);pixels[p+1]=Math.round(g*255);pixels[p+2]=Math.round(b*255);pixels[p+3]=Math.round(a*255);
    }
    context.putImageData(image,0,0);texture.needsUpdate=true;mesh.visible=field.state.active;
  }

  function clear(){
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
    for(const patch of patches){scene.remove(patch.mesh);patch.mesh.geometry?.dispose?.();patch.material?.dispose?.();patch.texture?.dispose?.();}
  }

  return{patches,emitBurst,emitDashBurst,update,clear,dispose,preset};
}
