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
assert.match(ARENA_SHELL_HTML,/swipe upward or downward/,'the card exposes its vertical interaction to assistive technology');

function createFakeElement(){
  const listeners=new Map();
  const classes=new Set();
  return{
    style:{},
    hidden:false,
    textContent:'',
    offsetWidth:90,
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
const visualCard=createFakeElement();
const upLabel={textContent:'↑ UP · INERT'};
const downLabel={textContent:'↓ DOWN · STAMINA'};
visualCard.querySelector=selector=>selector==='.trialCardUp'?upLabel:selector==='.trialCardDown'?downLabel:null;
const status=createFakeElement();
status.textContent='SWIPE DOWN TO START · LONG BLADE FORM';
const nodes={trialCard:visualCard,trialCardStatus:status};
surface.getElementById=id=>nodes[id]||null;
const surfaceDirections=[];
const surfaceGesture=installWardenTrialSwipeSurface({
  target:surface,
  startGuard:event=>event.clientY>=100,
  commitDuration:5,
  onDirection:(direction,detail)=>surfaceDirections.push({direction,...detail}),
});
surface.dispatch('pointerdown',{...event,pointerId:4,clientY:50,target:surface});
surface.dispatch('pointermove',{...event,pointerId:4,clientY:0,target:surface});
surface.dispatch('pointerup',{...event,pointerId:4,clientY:0,target:surface});
assert.deepEqual(surfaceDirections,[],'the reserved top area must not register card swipes');
surface.dispatch('pointerdown',{...event,pointerId:5,clientY:200,target:surface});
surface.dispatch('pointermove',{...event,pointerId:5,clientY:130,target:surface});
surface.dispatch('pointerup',{...event,pointerId:5,clientY:120,target:surface});
assert.equal(visualCard.style.transform,'translateY(-96px) scale(.96)','a committed up swipe should visibly move the card upward');
assert.equal(visualCard.style.opacity,'0','a committed swipe should fade the card away');
assert.equal(status.textContent,'','registration helper text should be suppressed while the card resolves');
assert.equal(surfaceDirections.length,0,'the card action should resolve after the exit animation');
await new Promise(resolve=>setTimeout(resolve,10));
assert.deepEqual(surfaceDirections,[{direction:'up',deltaY:-80}]);
assert.equal(visualCard.style.transform,'');
assert.equal(visualCard.style.opacity,'');
assert.equal(status.hidden,false,'the initial start instruction should remain available after an inert up swipe');
assert.equal(status.textContent,'SWIPE DOWN TO START · LONG BLADE FORM');
assert.equal(upLabel.textContent,'↑ INERT','the card should not repeat the UP label');
assert.equal(downLabel.textContent,'↓ STAMINA','the card should not repeat the DOWN label');

surface.dispatch('pointerdown',{...event,pointerId:6,clientY:200,target:surface});
surface.dispatch('pointermove',{...event,pointerId:6,clientY:270,target:surface});
surface.dispatch('pointerup',{...event,pointerId:6,clientY:280,target:surface});
assert.equal(visualCard.style.transform,'translateY(96px) scale(.96)','a committed down swipe should visibly move the card downward');
await new Promise(resolve=>setTimeout(resolve,10));
assert.equal(surfaceDirections.at(-1).direction,'down');
assert.equal(status.hidden,true,'normal registered/trial-started helper copy should disappear after the first down play');
assert.equal(status.textContent,'');
assert.equal(surface.style.transform,undefined,'the full-screen registration surface must not move with the card');
surfaceGesture.destroy();

console.log('Warden Trial blank card gesture: ok');
