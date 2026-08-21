const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function resolveWardenTrialCardDirection(deltaY, threshold = 55){
  const delta = Number(deltaY) || 0;
  const numericThreshold = Number(threshold);
  const limit = Number.isFinite(numericThreshold) ? Math.max(0, numericThreshold) : 55;
  if(delta >= limit) return 'down';
  if(delta <= -limit) return 'up';
  return null;
}

// Waiting for the opening downward card is an input-ready state, not a pause.
// Only states that put another interaction in charge should block the surface.
export function isWardenTrialCardGestureEnabled({
  paused = false,
  rewardPending = false,
  menuOpen = false,
  dead = false,
  transitioning = false,
  coolingDown = false,
} = {}){
  return !paused && !rewardPending && !menuOpen && !dead && !transitioning && !coolingDown;
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

export function installWardenTrialSwipeSurface({
  target = globalThis.document,
  visualElement = null,
  onDirection = () => {},
  enabled = () => true,
  startGuard = () => true,
  threshold = 55,
  maxDrag = 52,
  exitDistance = 136,
  transitionDuration = 170,
} = {}){
  if(!target?.addEventListener){
    return {
      reset(){},
      destroy(){},
      getSnapshot(){ return { active:false, deltaY:0 }; },
    };
  }

  let pointerId = null;
  let touchId = null;
  let startY = 0;
  let deltaY = 0;
  let captureTarget = null;
  let destroyed = false;
  let animating = false;
  let animationTimer = 0;

  const numericMaxDrag = Number(maxDrag);
  const dragLimit = Number.isFinite(numericMaxDrag) ? Math.max(0, numericMaxDrag) : 52;
  const numericExitDistance = Number(exitDistance);
  const swipeExit = Number.isFinite(numericExitDistance) ? Math.max(0, numericExitDistance) : 136;
  const numericDuration = Number(transitionDuration);
  const swipeDuration = Number.isFinite(numericDuration) ? Math.max(0, numericDuration) : 170;

  const clearVisualState = () => {
    visualElement?.classList?.remove?.('dragging');
    if(visualElement?.style){
      visualElement.style.transition='';
      visualElement.style.transform='';
      visualElement.style.opacity='';
    }
  };

  const clearAnimation = () => {
    if(animationTimer){
      clearTimeout(animationTimer);
      animationTimer=0;
    }
    animating=false;
    clearVisualState();
  };

  const reset = () => {
    if(pointerId !== null){
      try{ captureTarget?.releasePointerCapture?.(pointerId); }catch(_){ /* pointer already released */ }
    }
    pointerId = null;
    touchId = null;
    startY = 0;
    deltaY = 0;
    captureTarget = null;
    clearAnimation();
  };

  const onDown = event => {
    if(destroyed || animating || pointerId !== null || !enabled(event) || !startGuard(event)) return;
    event.preventDefault?.();
    event.stopPropagation?.();
    pointerId = event.pointerId;
    startY = Number(event.clientY) || 0;
    deltaY = 0;
    captureTarget = event.target?.setPointerCapture ? event.target : null;
    try{ captureTarget?.setPointerCapture?.(pointerId); }catch(_){ /* target cannot capture this pointer */ }
    visualElement?.classList?.add?.('dragging');
    if(visualElement?.style)visualElement.style.transition='none';
  };

  const onMove = event => {
    if(event.pointerId !== pointerId) return;
    event.preventDefault?.();
    deltaY = (Number(event.clientY) || 0) - startY;
    if(visualElement?.style){
      const shownDelta=clamp(deltaY,-dragLimit,dragLimit);
      visualElement.style.transform=`translateY(${shownDelta}px)`;
      visualElement.style.opacity=String(Math.max(.45,1-Math.abs(deltaY)/220));
    }
  };

  const finish = (event, cancelled = false) => {
    if(event.pointerId !== pointerId) return;
    if(!cancelled&&Number.isFinite(Number(event.clientY)))deltaY=Number(event.clientY)-startY;
    const finalDelta = deltaY;
    try{ captureTarget?.releasePointerCapture?.(pointerId); }catch(_){ /* pointer already released */ }
    pointerId = null;
    startY = 0;
    deltaY = 0;
    captureTarget = null;
    if(cancelled){clearVisualState();return;}
    const direction = resolveWardenTrialCardDirection(finalDelta, threshold);
    if(!direction){clearVisualState();return;}
    animating=true;
    if(visualElement?.style){
      const sign=direction==='up'?-1:1;
      visualElement.style.transition=`transform ${swipeDuration}ms cubic-bezier(.2,.8,.2,1),opacity ${swipeDuration}ms ease-out`;
      visualElement.style.transform=`translateY(${sign*swipeExit}px) scale(.9)`;
      visualElement.style.opacity='0';
    }
    const complete=()=>{
      animationTimer=0;
      if(destroyed){animating=false;clearVisualState();return;}
      animating=false;
      clearVisualState();
      onDirection(direction, { deltaY:finalDelta });
    };
    if(swipeDuration>0)animationTimer=setTimeout(complete,swipeDuration);
    else complete();
  };

  const onUp = event => finish(event, false);
  const onCancel = event => finish(event, true);
  const onTouchStart = event => {
    const touch=event.changedTouches?.[0]||event.touches?.[0];
    const guardEvent=touch?{...event,clientY:touch.clientY,target:event.target}:event;
    if(!touch||destroyed||animating||pointerId!==null||!enabled(guardEvent)||!startGuard(guardEvent))return;
    event.preventDefault?.();
    event.stopPropagation?.();
    touchId=touch.identifier;
    pointerId=`touch:${touch.identifier}`;
    startY=Number(touch.clientY)||0;
    deltaY=0;
    visualElement?.classList?.add?.('dragging');
    if(visualElement?.style)visualElement.style.transition='none';
  };
  const onTouchMove = event => { const t=[...(event.touches||[])].find(x=>x.identifier===touchId);if(!t)return;event.preventDefault?.();deltaY=(Number(t.clientY)||0)-startY;if(visualElement?.style){const d=clamp(deltaY,-dragLimit,dragLimit);visualElement.style.transform=`translateY(${d}px)`;} };
  const onTouchEnd = event => { const t=[...(event.changedTouches||[])].find(x=>x.identifier===touchId);if(!t)return;const id=touchId;touchId=null;finish({pointerId:`touch:${id}`,clientY:t.clientY},false); };
  const onTouchCancel = () => { if(touchId!==null)reset(); };
  const windowRef = globalThis.window || globalThis;
  const onBlur = () => reset();
  const listenerOptions = { capture:true, passive:false };
  target.addEventListener('pointerdown', onDown, listenerOptions);
  target.addEventListener('pointermove', onMove, listenerOptions);
  target.addEventListener('pointerup', onUp, listenerOptions);
  target.addEventListener('pointercancel', onCancel, listenerOptions);
  target.addEventListener('lostpointercapture', onCancel, listenerOptions);
  target.addEventListener('touchstart', onTouchStart, listenerOptions);
  target.addEventListener('touchmove', onTouchMove, listenerOptions);
  target.addEventListener('touchend', onTouchEnd, listenerOptions);
  target.addEventListener('touchcancel', onTouchCancel, listenerOptions);
  windowRef.addEventListener?.('blur', onBlur);

  return {
    reset,
    destroy(){
      if(destroyed) return;
      destroyed = true;
      reset();
      target.removeEventListener?.('pointerdown', onDown, listenerOptions);
      target.removeEventListener?.('pointermove', onMove, listenerOptions);
      target.removeEventListener?.('pointerup', onUp, listenerOptions);
      target.removeEventListener?.('pointercancel', onCancel, listenerOptions);
      target.removeEventListener?.('lostpointercapture', onCancel, listenerOptions);
      target.removeEventListener?.('touchstart', onTouchStart, listenerOptions);
      target.removeEventListener?.('touchmove', onTouchMove, listenerOptions);
      target.removeEventListener?.('touchend', onTouchEnd, listenerOptions);
      target.removeEventListener?.('touchcancel', onTouchCancel, listenerOptions);
      windowRef.removeEventListener?.('blur', onBlur);
    },
    getSnapshot(){ return { active:pointerId !== null, animating, deltaY }; },
  };
}
