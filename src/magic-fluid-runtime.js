import {PROTOTYPE_MAGIC_LAYOUT,PROTOTYPE_MAGIC_SETTINGS,buildDashJetSamples} from './magic-fluid-prototype-config.js';
import {createPrototypeFluidSimulation} from './magic-fluid-sim.js';
import {createPrototypeFluidRenderer} from './magic-fluid-prototype-render.js';

function resolveRenderCamera(THREE,camera){
  if(camera?.quaternion)return camera;
  // combat-arena currently passes THREE + scene into installPlayerCombat, but not
  // its lexical camera variable. Use the arena's real relative camera pose as a
  // billboard-only proxy so the direct port remains visible instead of aborting
  // the entire game at startup. This object does not render or control gameplay.
  const proxy=new THREE.Object3D();
  proxy.position.set(0,20,17.6);
  proxy.lookAt(0,1.8,-1.4);
  console.warn('[magic-fluid-runtime] Camera was not provided; using the combat-arena camera-angle proxy.');
  return proxy;
}

// Integration shell around the direct prototype port. The dash supplies a virtual
// drag brush; the solver and renderer remain the submitted prototype versions.
export function installMagicFluidRuntime({THREE,scene,camera,getMazeSegments=()=>[],getWorldKey=()=>null}={}){
  if(!THREE||!scene)throw new Error('[magic-fluid-runtime] THREE and scene are required.');
  const renderCamera=resolveRenderCamera(THREE,camera);
  const settings=()=>PROTOTYPE_MAGIC_SETTINGS;
  const sim=createPrototypeFluidSimulation({settings,layout:PROTOTYPE_MAGIC_LAYOUT,getMazeSegments});
  const renderer=createPrototypeFluidRenderer({THREE,scene,camera:renderCamera,settings,layout:PROTOTYPE_MAGIC_LAYOUT,sim});
  let active=false,dashJet=null,lastWorldKey=getWorldKey?.()||null;

  const localPoint=point=>({x:(Number(point?.x)||0)-sim.centerX,z:(Number(point?.z)||0)-sim.centerZ});

  function dashFits(position,direction){
    const start=localPoint(position);
    const end={x:start.x+(Number(direction?.x)||0)*8.4,z:start.z+(Number(direction?.z)||0)*8.4};
    const margin=1.2;
    return Math.abs(start.x)<sim.PATCH_W*.5-margin&&Math.abs(start.z)<sim.PATCH_D*.5-margin
      &&Math.abs(end.x)<sim.PATCH_W*.5-margin&&Math.abs(end.z)<sim.PATCH_D*.5-margin;
  }

  function positionPatch(position,direction){
    const centerX=(Number(position?.x)||0)+(Number(direction?.x)||0)*4.2;
    const centerZ=(Number(position?.z)||0)+(Number(direction?.z)||0)*4.2;
    sim.setCenter(centerX,centerZ);renderer.setCenter(centerX,centerZ);
  }

  function beginDashJet(payload={}){
    const position={x:Number(payload.position?.x)||0,z:Number(payload.position?.z)||0};
    const dashDirection={x:Number(payload.dashDirection?.x)||0,z:Number(payload.dashDirection?.z)||-1};
    if(!active||!dashFits(position,dashDirection))positionPatch(position,dashDirection);
    dashJet={position,dashDirection};
    const local=localPoint(position);sim.injectWorld(local.x,local.z,0,0,1);
    active=true;renderer.setVisible(true);
  }

  function updateDashJet(payload={}){
    const to={x:Number(payload.position?.x)||0,z:Number(payload.position?.z)||0};
    const dashDirection={x:Number(payload.dashDirection?.x)||0,z:Number(payload.dashDirection?.z)||-1};
    if(!dashJet){beginDashJet({position:to,dashDirection});return;}
    for(const sample of buildDashJetSamples(dashJet.position,to)){
      const local=localPoint(sample);sim.injectWorld(local.x,local.z,sample.dx,sample.dz,1);
    }
    dashJet.position=to;dashJet.dashDirection=dashDirection;
  }

  function endDashJet(){dashJet=null;}
  function clear(){dashJet=null;active=false;sim.clearSim();renderer.setVisible(false);}

  function update(_dt,now){
    const worldKey=getWorldKey?.()||null;
    if(lastWorldKey&&worldKey&&worldKey!==lastWorldKey)clear();
    lastWorldKey=worldKey;
    if(!active)return;
    // The submitted prototype advances once per rendered frame rather than using dt.
    sim.updateSim();
    renderer.update((Number.isFinite(now)?now:(globalThis.performance?.now?.()||0))*.001);
  }

  function dispose(){renderer.dispose();}
  return{
    beginDashJet,updateDashJet,endDashJet,update,clear,dispose,
    settings:PROTOTYPE_MAGIC_SETTINGS,layout:PROTOTYPE_MAGIC_LAYOUT,
    debug:{sim,renderer,renderCamera,get active(){return active;}},
  };
}

export {PROTOTYPE_MAGIC_LAYOUT,PROTOTYPE_MAGIC_SETTINGS,buildDashJetSamples,resolveRenderCamera};
