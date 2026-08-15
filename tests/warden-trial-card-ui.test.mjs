import assert from 'node:assert/strict';
import { ARENA_SHELL_HTML } from '../src/arena-shell.js';
import { installWardenTrialCardGesture, installWardenTrialSwipeSurface, resolveWardenTrialCardDirection } from '../src/warden-trial-card-ui.js';

assert.equal(resolveWardenTrialCardDirection(-55),'up');
assert.equal(resolveWardenTrialCardDirection(55),'down');
assert.equal(resolveWardenTrialCardDirection(-54),null);
assert.equal(resolveWardenTrialCardDirection(54),null);
assert.equal(resolveWardenTrialCardDirection(0),null);

assert.match(ARENA_SHELL_HTML,/id="trialCardTray"/,'the shell reserves a trial-only card tray');
assert.match(ARENA_SHELL_HTML,/id="trialCard"/,'the shell includes one blank trial card');
assert.match(ARENA_SHELL_HTML,/drag upward or downward/,'the card exposes its vertical interaction to assistive technology');

function createFakeElement(){
  const listeners=new Map();
  const classes=new Set();
  return{
    style:{},
    classList:{add:value=>classes.add(value),remove:value=>classes.delete(value),has:value=>classes.has(value)},
    setPointerCapture(pointerId){this.captured=pointerId;},
    releasePointerCapture(pointerId){if(this.captured===pointerId)this.captured=null;},
    addEventListener(type,listener){listeners.set(type,listener);},
    removeEventListener(type,listener){if(listeners.get(type)===listener)listeners.delete(type);},
    dispatch(type,event){listeners.get(type)?.(event);},
  };
}

const card=createFakeElement();
const directions=[];
const gesture=installWardenTrialCardGesture({element:card,onDirection:(direction,detail)=>directions.push({direction,...detail})});
const event={pointerId:1,clientY:100,preventDefault(){},stopPropagation(){}};
card.dispatch('pointerdown',event);
card.dispatch('pointermove',{...event,clientY:30});
assert.equal(card.style.transform,'translateY(-70px)');
card.dispatch('pointerup',{...event,clientY:20});
assert.deepEqual(directions,[{direction:'up',deltaY:-80}]);
assert.equal(card.style.transform,'');
assert.equal(card.style.opacity,'');
assert.equal(gesture.getSnapshot().active,false);

card.dispatch('pointerdown',{...event,pointerId:2,clientY:10});
card.dispatch('pointermove',{...event,pointerId:2,clientY:90});
card.dispatch('pointerup',{...event,pointerId:2,clientY:90});
assert.equal(directions.at(-1).direction,'down');
assert.equal(directions.at(-1).deltaY,80);

const cancelledCard=createFakeElement();
const cancelled=[];
const cancelledGesture=installWardenTrialCardGesture({element:cancelledCard,onDirection:direction=>cancelled.push(direction)});
cancelledCard.dispatch('pointerdown',{...event,pointerId:3});
cancelledCard.dispatch('pointermove',{...event,pointerId:3,clientY:0});
cancelledCard.dispatch('pointercancel',{...event,pointerId:3,clientY:0});
assert.deepEqual(cancelled,[],'a cancelled drag must not register a card direction');
cancelledGesture.destroy();
gesture.destroy();

const surface=createFakeElement();
const surfaceDirections=[];
const surfaceGesture=installWardenTrialSwipeSurface({
  target:surface,
  startGuard:event=>event.clientY>=100,
  onDirection:(direction,detail)=>surfaceDirections.push({direction,...detail}),
});
surface.dispatch('pointerdown',{...event,pointerId:4,clientY:50,target:surface});
surface.dispatch('pointermove',{...event,pointerId:4,clientY:0,target:surface});
surface.dispatch('pointerup',{...event,pointerId:4,clientY:0,target:surface});
assert.deepEqual(surfaceDirections,[],'the reserved top area must not register card swipes');
surface.dispatch('pointerdown',{...event,pointerId:5,clientY:200,target:surface});
surface.dispatch('pointermove',{...event,pointerId:5,clientY:130,target:surface});
surface.dispatch('pointerup',{...event,pointerId:5,clientY:120,target:surface});
assert.deepEqual(surfaceDirections,[{direction:'up',deltaY:-80}]);
assert.equal(surface.style.transform,undefined,'the full-screen registration surface must not move the card');
surfaceGesture.destroy();

console.log('Warden Trial blank card gesture: ok');
