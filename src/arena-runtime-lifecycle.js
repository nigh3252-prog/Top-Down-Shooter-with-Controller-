// Small, DOM-free lifecycle state machine used to verify runtime ownership
// semantics independently from WebGL and browser scheduling.
export function createArenaRuntimeLifecycle({
  requestAnimationFrame = callback => setTimeout(() => callback(Date.now()), 16),
  cancelAnimationFrame = id => clearTimeout(id),
  onFrame = () => {},
} = {}){
  let running = false;
  let destroyed = false;
  let frameId = null;

  const frame = time => {
    if(!running || destroyed) return;
    frameId = requestAnimationFrame(frame);
    onFrame(time);
  };

  return {
    get running(){ return running; },
    get destroyed(){ return destroyed; },
    get frameId(){ return frameId; },
    start(){
      if(destroyed) return false;
      if(running) return true;
      running = true;
      frameId = requestAnimationFrame(frame);
      return true;
    },
    stop(){
      if(!running) return false;
      running = false;
      if(frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
      return true;
    },
    destroy(){
      if(destroyed) return false;
      if(running){
        running = false;
        if(frameId !== null) cancelAnimationFrame(frameId);
        frameId = null;
      }
      destroyed = true;
      return true;
    },
  };
}
