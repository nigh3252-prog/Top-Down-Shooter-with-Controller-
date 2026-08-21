import assert from 'node:assert/strict';
import { ARENA_SHELL_HTML } from '../src/arena-shell.js';
import {
  installWardenTrialCardGesture,
  isWardenTrialCardGestureEnabled,
  resolveWardenTrialCardDirection,
} from '../src/warden-trial-card-ui.js';

assert.equal(resolveWardenTrialCardDirection(-70),'up');
assert.equal(resolveWardenTrialCardDirection(70),'down');
assert.equal(resolveWardenTrialCardDirection(20),null);
assert.equal(isWardenTrialCardGestureEnabled({}),true);
assert.equal(isWardenTrialCardGestureEnabled({paused:true}),false);
assert.equal(isWardenTrialCardGestureEnabled({coolingDown:true}),false);
assert.equal((ARENA_SHELL_HTML.match(/class="trialHandCard"/g)||[]).length,3);
assert.match(ARENA_SHELL_HTML,/Three-card hand/);
assert.match(ARENA_SHELL_HTML,/DRAW 3 · START/);
assert.equal((ARENA_SHELL_HTML.match(/aria-keyshortcuts="[123]"/g)||[]).length,3);
assert.match(ARENA_SHELL_HTML,/id="trialDiscardDraw"[^>]*aria-keyshortcuts="R"/);
assert.match(ARENA_SHELL_HTML,/id="trialCardGlobalCooldown" aria-live="off"/,'the tenth-second cooldown display does not spam screen readers');

function createFakeElement(){
  const listeners=new Map();
  const classes=new Set();
  return {
    style:{},
    classList:{add:value=>classes.add(value),remove:value=>classes.delete(value),contains:value=>classes.has(value)},
    addEventListener(type,listener){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(listener);},
    removeEventListener(type,listener){listeners.get(type)?.delete(listener);},
    setPointerCapture(){},releasePointerCapture(){},
    dispatch(type,event={}){for(const listener of listeners.get(type)||[])listener({preventDefault(){},stopPropagation(){},...event});},
  };
}

const element=createFakeElement();
const directions=[];
const gesture=installWardenTrialCardGesture({element,threshold:40,onDirection:(direction,detail)=>directions.push({direction,...detail})});
element.dispatch('pointerdown',{pointerId:1,clientY:100});
element.dispatch('pointermove',{pointerId:1,clientY:30});
assert.equal(element.style.transform,'translateY(-70px)');
element.dispatch('pointerup',{pointerId:1,clientY:30});
assert.deepEqual(directions,[{direction:'up',deltaY:-70}]);
assert.equal(element.style.transform,'','a completed gesture snaps the card visual back before runtime resolution');

element.dispatch('pointerdown',{pointerId:2,clientY:100});
element.dispatch('pointerup',{pointerId:2,clientY:165});
assert.deepEqual(directions.at(-1),{direction:'down',deltaY:65});
gesture.destroy();

console.log('Warden Trial per-card gestures: ok');
