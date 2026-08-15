const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function resolveWardenTrialCardDirection(deltaY, threshold = 55){
  const delta = Number(deltaY) || 0;
  const numericThreshold = Number(threshold);
  const limit = Number.isFinite(numericThreshold) ? Math.max(0, numericThreshold) : 55;
  if(delta >= limit) return 'down';
  if(delta <= -limit) return 'up';
  return null;
}

export function installWardenTrialCardGesture({
  element,
  onDirection = () => {},
  enabled = () => true,
  threshold = 55,
  maxOffset = 125,
} = {}){
  if(!element?.addEventListener){
    return {
      reset(){},
      destroy(){},
      getSnapshot(){ return { active:false, deltaY:0 }; },
    };
  }

  let pointerId = null;
  let startY = 0;
  let deltaY = 0;
  let destroyed = false;

  const clearVisualState = () => {
    element.classList?.remove('dragging');
    if(element.style){
      element.style.transform = '';
      element.style.opacity = '';
    }
  };

  const reset = () => {
    if(pointerId !== null){
      try{ element.releasePointerCapture?.(pointerId); }catch(_){ /* pointer already released */ }
    }
    pointerId = null;
    startY = 0;
    deltaY = 0;
    clearVisualState();
  };

  const onDown = event => {
    if(destroyed || pointerId !== null || !enabled(event)) return;
    event.preventDefault?.();
    event.stopPropagation?.();
    pointerId = event.pointerId;
    startY = Number(event.clientY) || 0;
    deltaY = 0;
    element.classList?.add('dragging');
    element.setPointerCapture?.(pointerId);
  };

  const onMove = event => {
    if(event.pointerId !== pointerId) return;
    event.preventDefault?.();
    deltaY = (Number(event.clientY) || 0) - startY;
    const numericOffset = Number(maxOffset);
    const offset = Number.isFinite(numericOffset) ? Math.abs(numericOffset) : 125;
    const shownDelta = clamp(deltaY, -offset, offset);
    if(element.style){
      element.style.transform = `translateY(${shownDelta}px)`;
      element.style.opacity = String(Math.max(.45, 1 - Math.abs(deltaY) / 220));
    }
  };

  const finish = (event, cancelled = false) => {
    if(event.pointerId !== pointerId) return;
    if(!cancelled&&Number.isFinite(Number(event.clientY)))deltaY=Number(event.clientY)-startY;
    const finalDelta = deltaY;
    try{ element.releasePointerCapture?.(pointerId); }catch(_){ /* pointer already released */ }
    pointerId = null;
    startY = 0;
    deltaY = 0;
    clearVisualState();
    if(!cancelled){
      const direction = resolveWardenTrialCardDirection(finalDelta, threshold);
      if(direction) onDirection(direction, { deltaY:finalDelta });
    }
  };

  const onUp = event => finish(event, false);
  const onCancel = event => finish(event, true);
  const windowRef = globalThis.window || globalThis;
  const onBlur = () => reset();
  element.addEventListener('pointerdown', onDown);
  element.addEventListener('pointermove', onMove);
  element.addEventListener('pointerup', onUp);
  element.addEventListener('pointercancel', onCancel);
  element.addEventListener('lostpointercapture', onCancel);
  windowRef.addEventListener?.('blur', onBlur);

  return {
    reset,
    destroy(){
      if(destroyed) return;
      destroyed = true;
      reset();
      element.removeEventListener?.('pointerdown', onDown);
      element.removeEventListener?.('pointermove', onMove);
      element.removeEventListener?.('pointerup', onUp);
      element.removeEventListener?.('pointercancel', onCancel);
      element.removeEventListener?.('lostpointercapture', onCancel);
      windowRef.removeEventListener?.('blur', onBlur);
    },
    getSnapshot(){ return { active:pointerId !== null, deltaY }; },
  };
}
