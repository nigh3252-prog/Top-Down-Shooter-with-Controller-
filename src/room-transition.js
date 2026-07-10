const clamp01 = value => Math.max(0, Math.min(1, value));

export function createRoomTransitionController({ duration = .95, swapAt = .48, onSwap, onComplete } = {}){
  let active = false;
  let elapsed = 0;
  let swapped = false;
  let payload = null;

  function start(nextPayload){
    if(active || !nextPayload) return false;
    active = true;
    elapsed = 0;
    swapped = false;
    payload = nextPayload;
    return true;
  }

  function update(dt){
    if(!active) return { active:false, progress:0, veil:0, cameraPush:0, payload:null };
    elapsed += Math.max(0, dt);
    const progress = clamp01(elapsed / duration);
    if(!swapped && progress >= swapAt){
      swapped = true;
      onSwap?.(payload);
    }
    const veil = Math.pow(Math.sin(progress * Math.PI), .7);
    const cameraPush = Math.sin(progress * Math.PI);
    if(progress >= 1){
      const completed = payload;
      active = false;
      payload = null;
      onComplete?.(completed);
      return { active:false, progress:1, veil:0, cameraPush:0, payload:completed, completed:true };
    }
    return { active:true, progress, veil, cameraPush, payload, swapped };
  }

  function reset(){ active = false; elapsed = 0; swapped = false; payload = null; }

  return {
    start, update, reset,
    get active(){ return active; },
    get progress(){ return active ? clamp01(elapsed / duration) : 0; },
    get payload(){ return payload; },
  };
}
