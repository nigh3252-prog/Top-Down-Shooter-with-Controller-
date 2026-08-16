import assert from 'node:assert/strict';
import { ARENA_SHELL_HTML } from '../src/arena-shell.js';
import { STONE_WEAPON_ORDER } from '../src/weapons.js';
import { installWardenTrialCardGesture, installWardenTrialSwipeSurface, resolveWardenTrialCardDirection } from '../src/warden-trial-card-ui.js';

assert.equal(resolveWardenTrialCardDirection(-55),'up');
assert.equal(resolveWardenTrialCardDirection(55),'down');
assert.equal(resolveWardenTrialCardDirection(-54),null);
assert.equal(resolveWardenTrialCardDirection(54),null);
assert.equal(resolveWardenTrialCardDirection(0),null);

assert.match(ARENA_SHELL_HTML,/id="trialCardTray"/,'the shell reserves a trial-only card tray');
assert.match(ARENA_SHELL_HTML,/id="trialCard"/,'the shell includes one trial card');
assert.match(ARENA_SHELL_HTML,/swipe up or down/,'the card exposes its vertical interaction to assistive technology');
assert.match(ARENA_SHELL_HTML,/class="trialCardHalf trialCardUp"/,'the upper card face names its Arcana action');
assert.match(ARENA_SHELL_HTML,/class="trialCardName trialArcanaName"/,'the card has a dedicated Arcana name');
assert.match(ARENA_SHELL_HTML,/class="trialCardHalf trialCardDown"/,'the lower card face names its stance action');
assert.match(ARENA_SHELL_HTML,/class="trialCardName trialStanceName"/,'the card has a dedicated stance name');
assert.match(ARENA_SHELL_HTML,/id="trialWeaponTitle"/,'the Warden Trial menu exposes a weapon selector');
for(const weaponId of STONE_WEAPON_ORDER){
  assert.match(ARENA_SHELL_HTML,new RegExp(`data-trial-weapon="${weaponId}"`),`${weaponId} is available in the trial weapon selector`);
}

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
    dispatch(type,event){event.currentTarget=this;listeners.get(type)?.(event);},
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
  transitionDuration:0,
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

const nestedCardTarget=createFakeElement();
const nestedCardDirections=[];
const nestedCardGesture=installWardenTrialSwipeSurface({
  target:nestedCardTarget,
  visualElement:nestedCardTarget,
  transitionDuration:0,
  onDirection:(direction,detail)=>nestedCardDirections.push({direction,...detail}),
});
const nestedLabel={};
nestedCardTarget.dispatch('pointerdown',{...event,pointerId:7,clientY:200,target:nestedLabel});
assert.equal(nestedCardTarget.captured,7,'the card owns pointer capture even when the swipe starts on a nested label');
nestedCardTarget.dispatch('pointermove',{...event,pointerId:7,clientY:270,target:nestedLabel});
nestedCardTarget.dispatch('pointerup',{...event,pointerId:7,clientY:280,target:nestedLabel});
assert.deepEqual(nestedCardDirections,[{direction:'down',deltaY:80}]);
nestedCardGesture.destroy();

const animatedSurface=createFakeElement();
const animatedCard=createFakeElement();
const animatedDirections=[];
const animatedGesture=installWardenTrialSwipeSurface({
  target:animatedSurface,
  visualElement:animatedCard,
  transitionDuration:5,
  onDirection:(direction,detail)=>animatedDirections.push({direction,...detail}),
});
animatedSurface.dispatch('pointerdown',{...event,pointerId:6,clientY:200,target:animatedSurface});
animatedSurface.dispatch('pointermove',{...event,pointerId:6,clientY:160,target:animatedSurface});
assert.equal(animatedCard.style.transform,'translateY(-40px)','the card follows the swipe before release');
animatedSurface.dispatch('pointerup',{...event,pointerId:6,clientY:120,target:animatedSurface});
assert.equal(animatedCard.style.transform,'translateY(-136px) scale(.9)','a completed upward swipe sends the card out');
assert.equal(animatedCard.style.opacity,'0','a completed swipe fades the card out');
await new Promise(resolve=>setTimeout(resolve,12));
assert.deepEqual(animatedDirections,[{direction:'up',deltaY:-80}]);
assert.equal(animatedCard.style.transform,'','the next card can reuse the centered slot');
assert.equal(animatedCard.style.opacity,'','the card visual state resets after the swipe');
animatedGesture.destroy();

console.log('Warden Trial blank card gesture: ok');
