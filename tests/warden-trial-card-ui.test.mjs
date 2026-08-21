import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ARENA_SHELL_HTML } from '../src/arena-shell.js';
import { STANCE_CARDS } from '../src/stance-cards.js';
import { getStanceCardBadge } from '../src/stance-card-presentation.js';
import { STONE_WEAPON_ORDER } from '../src/weapons.js';
import {
  installWardenTrialCardGesture,
  installWardenTrialSwipeSurface,
  isWardenTrialCardGestureEnabled,
  resolveWardenTrialCardDirection,
} from '../src/warden-trial-card-ui.js';

assert.equal(resolveWardenTrialCardDirection(-55),'up');
assert.equal(resolveWardenTrialCardDirection(55),'down');
assert.equal(resolveWardenTrialCardDirection(-54),null);
assert.equal(resolveWardenTrialCardDirection(54),null);
assert.equal(resolveWardenTrialCardDirection(0),null);
assert.equal(isWardenTrialCardGestureEnabled(),true,'the opening downward swipe remains enabled before the trial starts');
for(const blocker of ['paused','rewardPending','menuOpen','dead','transitioning','coolingDown']){
  assert.equal(isWardenTrialCardGestureEnabled({[blocker]:true}),false,`${blocker} blocks the full-screen card gesture`);
}
const arenaRuntimeSource=await readFile(new URL('../src/arena-runtime.js',import.meta.url),'utf8');
const arenaShellCss=await readFile(new URL('../src/arena-shell.css',import.meta.url),'utf8');
assert.match(arenaRuntimeSource,/enabled:\(\)=>isWardenTrialCardGestureEnabled\(\{/,'the runtime uses the pre-start-safe card input gate');
assert.match(arenaRuntimeSource,/coolingDown:isWardenTrialCardCoolingDown\(\)/,'the active cooldown blocks a second full-screen swipe');
assert.match(arenaRuntimeSource,/beginWardenTrialCardCooldown\('up'\)/,'an accepted upward play starts the three-second card lock');
assert.match(arenaRuntimeSource,/beginWardenTrialCardCooldown\('down'\)/,'an accepted downward play starts the one-second card lock');
assert.doesNotMatch(arenaRuntimeSource,/enabled:\(\)=>!isPaused\(\)/,'the runtime must not treat the opening card wait as an input pause');
assert.match(arenaRuntimeSource,/handSize:wardenTrialMode\?1:2/,'Warden Trial uses one authoritative current card without changing the normal two-card hand');

const stanceById=new Map(STANCE_CARDS.map(card=>[card.id,card]));
for(const [stanceId,text,title] of [
  ['S14','S / B','Speed / Block'],
  ['S19','S / P','Speed / Parry'],
  ['S07','P / P','Power / Parry'],
  ['S15','B / D','Balanced / Dodge'],
  ['S26','B / P','Balanced / Parry'],
]){
  const badge=getStanceCardBadge(stanceById.get(stanceId));
  assert.equal(badge?.text,text,`${stanceId} uses the shared stance / defense abbreviation`);
  assert.equal(badge?.title,title,`${stanceId} exposes the full stance / defense meaning`);
}

assert.match(ARENA_SHELL_HTML,/id="trialCardTray"/,'the shell reserves a trial-only card tray');
assert.match(ARENA_SHELL_HTML,/id="trialCard"/,'the shell includes one trial card');
assert.match(ARENA_SHELL_HTML,/swipe up or down/,'the card exposes its vertical interaction to assistive technology');
assert.match(ARENA_SHELL_HTML,/class="trialCardHalf trialCardUp"/,'the upper card face names its Arcana action');
assert.match(ARENA_SHELL_HTML,/class="trialCardName trialArcanaName"/,'the card has a dedicated Arcana name');
assert.match(ARENA_SHELL_HTML,/class="trialCardHalf trialCardDown"/,'the lower card face names its stance action');
assert.match(ARENA_SHELL_HTML,/class="trialCardName trialStanceName"/,'the card has a dedicated stance name');
assert.match(ARENA_SHELL_HTML,/class="trialStanceBadge trialCardStanceBadge"/,'the current card exposes its stance / defense badge');
assert.match(ARENA_SHELL_HTML,/id="trialCardCooldown"/,'the current card exposes a visible cooldown layer');
assert.match(ARENA_SHELL_HTML,/↑ ARCANA · 3s/,'the upward card face states its cooldown');
assert.match(ARENA_SHELL_HTML,/↓ 1s/,'the downward card face states its cooldown without crowding the stance badge');
assert.match(ARENA_SHELL_HTML,/id="trialDiscardCount"/,'the tray exposes a discard count at the left edge');
assert.match(ARENA_SHELL_HTML,/id="trialCurrentStanceName"/,'the tray exposes the actual current stance beside the active card');
assert.equal([...ARENA_SHELL_HTML.matchAll(/data-trial-upcoming-slot=/g)].length,2,'the tray reserves two ordered upcoming-card previews');
assert.match(ARENA_SHELL_HTML,/id="trialDrawCount"/,'the tray exposes a draw count at the right edge');
assert.match(arenaRuntimeSource,/deck\.upcoming\.slice\(0,trialUpcomingCardEls\.length\)/,'preview cards come from the real ordered draw pile');
assert.match(arenaRuntimeSource,/className='wardenRewardClassBadge'/,'reward choices receive the same stance / defense badge');
assert.match(arenaShellCss,/data-trial-upcoming-slot="0"[^}]*opacity:\.58/,'the first upcoming card is visibly secondary');
assert.match(arenaShellCss,/data-trial-upcoming-slot="1"[^}]*opacity:\.32/,'the second upcoming card fades farther into the queue');
assert.match(arenaShellCss,/\.trialCard\.cooling/,'the active card has a distinct cooling state');
assert.match(ARENA_SHELL_HTML,/id="trialWeaponTitle"/,'the Warden Trial menu exposes a weapon selector');
assert.match(ARENA_SHELL_HTML,/id="trialAbilityEnergyToggle"/,'the Warden Trial menu exposes the ability energy toggle');
assert.match(ARENA_SHELL_HTML,/id="trialAbilityEnergyState">ON/,'energy usage starts with the current stamina economy enabled');
assert.match(arenaRuntimeSource,/StoneSettings\.set\('wardenTrial\.abilityEnergyUsage'/,'the energy choice persists through the existing settings service');
assert.match(arenaRuntimeSource,/return resolveActionStaminaCost\(staminaCostForWeapon/,'light, heavy, and charged attacks use the toggle policy');
assert.match(arenaRuntimeSource,/resolveStaminaCost:resolveActionStaminaCost/,'defensive actions share the same Warden-only energy policy');
assert.match(arenaShellCss,/warden-trial[^}]*trialAbilityEnergySection[^}]*display:block/,'the toggle is visible only on the Warden Trial menu');
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

const touchSurface=createFakeElement();
const touchCard=createFakeElement();
const touchDirections=[];
const touchGesture=installWardenTrialSwipeSurface({
  target:touchSurface,
  visualElement:touchCard,
  transitionDuration:0,
  onDirection:(direction,detail)=>touchDirections.push({direction,...detail}),
});
const touchEvent={target:touchSurface,preventDefault(){},stopPropagation(){}};
touchSurface.dispatch('touchstart',{...touchEvent,touches:[{identifier:7,clientY:120}]});
touchSurface.dispatch('touchmove',{...touchEvent,touches:[{identifier:7,clientY:190}]});
assert.equal(touchCard.style.transform,'translateY(52px)','legacy Android touch movement drags the visible card downward');
touchSurface.dispatch('touchend',{...touchEvent,changedTouches:[{identifier:7,clientY:200}]});
assert.deepEqual(touchDirections,[{direction:'down',deltaY:80}]);

touchSurface.dispatch('touchstart',{...touchEvent,touches:[{identifier:8,clientY:200}]});
touchSurface.dispatch('touchmove',{...touchEvent,touches:[{identifier:8,clientY:130}]});
touchGesture.reset();
touchSurface.dispatch('touchmove',{...touchEvent,touches:[{identifier:8,clientY:80}]});
assert.equal(touchCard.style.transform,'','reset discards the active fallback touch instead of leaving a stuck card transform');
touchGesture.destroy();

const multiTouchSurface=createFakeElement();
const multiTouchCard=createFakeElement();
const multiTouchDirections=[];
const multiTouchGesture=installWardenTrialSwipeSurface({
  target:multiTouchSurface,
  visualElement:multiTouchCard,
  startGuard:event=>event.clientY>=100,
  transitionDuration:0,
  onDirection:(direction,detail)=>multiTouchDirections.push({direction,...detail}),
});
multiTouchSurface.dispatch('touchstart',{
  ...touchEvent,
  target:multiTouchSurface,
  touches:[{identifier:9,clientY:40}],
  changedTouches:[{identifier:9,clientY:40}],
});
multiTouchSurface.dispatch('touchstart',{
  ...touchEvent,
  target:multiTouchSurface,
  touches:[{identifier:9,clientY:40},{identifier:10,clientY:180}],
  changedTouches:[{identifier:10,clientY:180}],
});
multiTouchSurface.dispatch('touchmove',{
  ...touchEvent,
  target:multiTouchSurface,
  touches:[{identifier:9,clientY:40},{identifier:10,clientY:250}],
});
assert.equal(multiTouchCard.style.transform,'translateY(52px)','the newly changed touch can begin a valid drag after another finger was rejected');
multiTouchSurface.dispatch('touchend',{
  ...touchEvent,
  target:multiTouchSurface,
  changedTouches:[{identifier:10,clientY:260}],
});
assert.deepEqual(multiTouchDirections,[{direction:'down',deltaY:80}]);
multiTouchGesture.destroy();

console.log('Warden Trial blank card gesture: ok');
