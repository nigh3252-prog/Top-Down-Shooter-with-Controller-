let activeRuntime=null;
let activeConfig=null;
let activeCapture=null;
let activeCaptureOptions=null;
const listeners=new Set();

const emit=event=>{for(const listener of [...listeners])listener(event);};

export function provideArenaRuntime(runtime){
  activeRuntime=runtime||null;
  activeConfig=runtime?.config||activeConfig;
  emit({type:'runtime',runtime:activeRuntime});
  return activeRuntime;
}

export function clearArenaRuntime(runtime=null){
  if(runtime&&runtime!==activeRuntime)return false;
  activeRuntime=null;activeCapture=null;activeCaptureOptions=null;emit({type:'runtime',runtime:null});return true;
}

export function provideArenaRuntimeConfig(config){activeConfig=config||null;return activeConfig;}
export function getArenaRuntime(){return activeRuntime;}
export function getArenaRuntimeConfig(){return activeRuntime?.config||activeConfig;}
export function provideArenaCaptureController(controller){activeCapture=controller||null;emit({type:'capture',capture:activeCapture});return activeCapture;}
export function getArenaCaptureController(){return activeCapture||activeRuntime?.capture||null;}
export function getArenaCaptureSnapshot(){return getArenaCaptureController()?.snapshot?.()||null;}
export function provideArenaCaptureOptions(options){activeCaptureOptions=options?Object.freeze({...options}):null;return activeCaptureOptions;}
export function getArenaCaptureOptions(){return activeCaptureOptions||getArenaCaptureSnapshot()||null;}
export function subscribeArenaRuntime(listener){if(typeof listener!=='function')return()=>{};listeners.add(listener);return()=>listeners.delete(listener);}
