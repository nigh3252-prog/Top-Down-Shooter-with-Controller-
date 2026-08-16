const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const trialCardFromTarget = target => target?.getElementById?.('trialCard') || target?.querySelector?.('#trialCard') || null;
const trialStatusFromTarget = target => target?.getElementById?.('trialCardStatus') || target?.querySelector?.('#trialCardStatus') || null;

function simplifyDirectionLabel(element, direction){
  if(!element) return;
  const text = String(element.textContent || '');
  element.textContent = direction === 'up'
    ? text.replace(/^\s*↑\s*UP\s*·\s*/i, '↑ ')
    : text.replace(/^\s*↓\s*DOWN\s*·\s*/i, '↓ ');
}

export function simplifyWardenTrialCardLabels(card){
  if(!card?.querySelector) return;
  simplifyDirectionLabel(card.querySelector('.trialCardUp'), 'up');
  simplifyDirectionLabel(card.querySelector('.trialCardDown'), 'down');
}

function clearCommitVisual(card){
  if(!card?.style) return;
  card.classList?.remove('committing');
  const priorTransition = card.style.transition;
  card.style.transition = 'none';
  card.style.transform = '';
  card.style.opacity = '';
  // Force the replacement/current card to appear at rest rather than flying back in.
  void card.offsetWidth;
  card.style.transition = priorTransition || '';
}

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

export function installWardenTrialSwipeSurface({
  target = globalThis.document,
  onDirection = () => {},
  enabled = () => true,
  startGuard = () => true,
  threshold = 55,
  commitDistance = 96,
  commitDuration = 160,
} = {}){
  if(!target?.addEventListener){
    return {
      reset(){},
      destroy(){},
      getSnapshot(){ return { active:false, deltaY:0, committing:false }; },
    };
  }

  let pointerId = null;
  let startY = 0;
  let deltaY = 0;
  let captureTarget = null;
  let destroyed = false;
  let committing = false;
  let commitTimer = null;

  const syncCardPresentation = () => simplifyWardenTrialCardLabels(trialCardFromTarget(target));
  const schedulePresentationSync = () => {
    if(typeof queueMicrotask === 'function') queueMicrotask(syncCardPresentation);
    else setTimeout(syncCardPresentation, 0);
  };

  const reset = () => {
    if(pointerId !== null){
      try{ captureTarget?.releasePointerCapture?.(pointerId); }catch(_){ /* pointer already released */ }
    }
    if(commitTimer !== null){
      clearTimeout(commitTimer);
      commitTimer = null;
    }
    pointerId = null;
    startY = 0;
    deltaY = 0;
    captureTarget = null;
    committing = false;
    clearCommitVisual(trialCardFromTarget(target));
    const status = trialStatusFromTarget(target);
    if(status) status.hidden = false;
    schedulePresentationSync();
  };

  const onDown = event => {
    if(destroyed || committing || pointerId !== null || !enabled(event) || !startGuard(event)) return;
    event.preventDefault?.();
    event.stopPropagation?.();
    pointerId = event.pointerId;
    startY = Number(event.clientY) || 0;
    deltaY = 0;
    captureTarget = event.target?.setPointerCapture ? event.target : null;
    try{ captureTarget?.setPointerCapture?.(pointerId); }catch(_){ /* target cannot capture this pointer */ }
  };

  const onMove = event => {
    if(event.pointerId !== pointerId) return;
    event.preventDefault?.();
    deltaY = (Number(event.clientY) || 0) - startY;
  };

  const commitDirection = (direction, detail) => {
    const card = trialCardFromTarget(target);
    const status = trialStatusFromTarget(target);
    const startupPrompt = status && /^\s*SWIPE DOWN TO START/i.test(String(status.textContent || ''))
      ? String(status.textContent || '')
      : '';
    const numericDistance = Number(commitDistance);
    const distance = Number.isFinite(numericDistance) ? Math.max(0, Math.abs(numericDistance)) : 96;
    const numericDuration = Number(commitDuration);
    const duration = Number.isFinite(numericDuration) ? Math.max(0, numericDuration) : 160;

    committing = true;
    syncCardPresentation();
    if(status) status.textContent = '';
    if(card?.style){
      card.classList?.add('committing');
      card.style.transform = `translateY(${direction === 'up' ? -distance : distance}px) scale(.96)`;
      card.style.opacity = '0';
    }

    const resolveCommit = () => {
      commitTimer = null;
      if(destroyed) return;
      onDirection(direction, detail);
      // onDirection can redraw the card immediately. Keep it hidden until that redraw
      // is complete, then reveal the replacement/current card at its resting position.
      syncCardPresentation();
      if(status){
        if(direction === 'up' && startupPrompt){
          status.hidden = false;
          status.textContent = startupPrompt;
        }else{
          status.textContent = '';
          status.hidden = true;
        }
      }
      clearCommitVisual(card);
      committing = false;
    };

    if(duration <= 0) resolveCommit();
    else commitTimer = setTimeout(resolveCommit, duration);
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
    if(!cancelled){
      const direction = resolveWardenTrialCardDirection(finalDelta, threshold);
      if(direction) commitDirection(direction, { deltaY:finalDelta });
    }
  };

  const onUp = event => finish(event, false);
  const onCancel = event => finish(event, true);
  const windowRef = globalThis.window || globalThis;
  const onBlur = () => reset();
  const listenerOptions = { capture:true };
  target.addEventListener('pointerdown', onDown, listenerOptions);
  target.addEventListener('pointermove', onMove, listenerOptions);
  target.addEventListener('pointerup', onUp, listenerOptions);
  target.addEventListener('pointercancel', onCancel, listenerOptions);
  target.addEventListener('lostpointercapture', onCancel, listenerOptions);
  windowRef.addEventListener?.('blur', onBlur);
  schedulePresentationSync();

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
      windowRef.removeEventListener?.('blur', onBlur);
    },
    getSnapshot(){ return { active:pointerId !== null, deltaY, committing }; },
  };
}
