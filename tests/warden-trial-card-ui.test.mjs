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
for(const blocker of ['paused','rewardPending','menuOpen','dead','transitioning']){
  assert.equal(isWardenTrialCardGestureEnabled({[blocker]:true}),false,`${blocker} blocks the full-screen card gesture`);
}
const arenaRuntimeSource=await readFile(new URL('../src/arena-runtime.js',import.meta.url),'utf8');
const arenaShellCss=await readFile(new URL('../src/arena-shell.css',import.meta.url),'utf8');
const launcherSource=await readFile(new URL('../index.html',import.meta.url),'utf8');
assert.match(arenaRuntimeSource,/enabled:\(\)=>isWardenTrialCardGestureEnabled\(\{/,'the runtime uses the pre-start-safe card input gate');
assert.doesNotMatch(arenaRuntimeSource,/coolingDown:isWardenTrialCardCoolingDown\(\)/,'recovering cards can receive rejected-direction feedback without disabling the gesture surface');
assert.match(arenaRuntimeSource,/if\(!canPlayWardenTrialCard\('up'\)\)/,'an upward play checks that the held card is ready');
assert.match(arenaRuntimeSource,/if\(!canPlayWardenTrialCard\('down'\)\)/,'a downward play checks that the same held card is ready');
assert.match(arenaRuntimeSource,/wardenTrialCardCooldown\.deal\(card,\{durationSeconds:preparation\?\.durationSeconds\}\)/,
  'a randomly drawn card is dealt ready while retaining its prepared recovery duration');
assert.match(arenaRuntimeSource,/beginWardenTrialCardRecovery\(card,'up'\)/,
  'an accepted Up play starts recovery on the card that just fired');
assert.match(arenaRuntimeSource,/beginWardenTrialCardRecovery\(card,'down'\)/,
  'an accepted Down play starts the short recovery on that same card');
assert.match(arenaRuntimeSource,/deck\.discard\(slot\)/,
  'only recovery completion discards the held card and draws its replacement');
assert.match(arenaRuntimeSource,/canResolveDirection:direction=>canPlayWardenTrialCard\(direction\)/,
  'recovering directions are rejected before the current card can resolve again');
assert.match(arenaRuntimeSource,/exitOnResolve:false/,
  'accepted directions leave the played card visible in its slot during recovery');
assert.match(arenaRuntimeSource,/bazaarItem:card\.__wardenTrialBazaar\|\|null/,
  'the Up dispatcher receives the immutable Bazaar output and behavior record for later translation passes');
assert.doesNotMatch(arenaRuntimeSource,/enabled:\(\)=>!isPaused\(\)/,'the runtime must not treat the opening card wait as an input pause');
assert.match(arenaRuntimeSource,/handSize:wardenTrialMode\?1:2/,'Warden Trial uses one authoritative current card without changing the normal two-card hand');
assert.doesNotMatch(arenaRuntimeSource,/handSize:wardenTrialMode\?3/,'the Bazaar runtime does not introduce a three-card hand');
assert.match(arenaRuntimeSource,/createWardenTrialBazaarRuntime\(\{/,
  'the full Bazaar behavior engine is part of ordinary Warden Trial');
assert.match(arenaRuntimeSource,/getBoardCards:\(\)=>deck\.pool/,
  'the owned run deck remains the Bazaar ownership set for passive effects');

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
assert.match(ARENA_SHELL_HTML,/id="trialCardRule"/,'the ordinary current card shows its Bazaar behavior');
assert.match(ARENA_SHELL_HTML,/class="trialCardHalf trialCardDown"/,'the lower card face names its stance action');
assert.match(ARENA_SHELL_HTML,/class="trialCardName trialStanceName"/,'the card has a dedicated stance name');
assert.match(ARENA_SHELL_HTML,/class="trialStanceBadge trialCardStanceBadge"/,'the current card exposes its stance / defense badge');
assert.match(ARENA_SHELL_HTML,/id="trialCardCooldown"/,'the current card exposes a visible cooldown layer');
assert.match(ARENA_SHELL_HTML,/↑ ARCANA · RECOVERY/,'the upward card face describes post-play recovery');
assert.match(ARENA_SHELL_HTML,/↓ STANCE · 1s RECOVERY/,'the downward face shows its short post-play recovery');
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
assert.match(ARENA_SHELL_HTML,/id="trialAbilityCooldownToggle"/,'the Warden Trial menu exposes the upward ability cooldown toggle');
assert.match(ARENA_SHELL_HTML,/id="trialAbilityCooldownState">ON/,'upward ability cooldowns remain enabled by default');
assert.doesNotMatch(ARENA_SHELL_HTML,/trialBazaarDemo|BAZAAR BEHAVIOR DEMO|CURRENT TEST CARD/,
  'there is no selector-only demo surface alongside the real deck flow');
assert.match(arenaRuntimeSource,/StoneSettings\.set\('wardenTrial\.abilityCooldowns'/,'the ability cooldown choice persists through the existing settings service');
assert.doesNotMatch(arenaRuntimeSource,/if\(!wardenTrialAbilityCooldowns[^\n]*wardenTrialCardCooldown\.reset\(\)/,
  'turning future Up recovery off does not erase a recovery already in progress');
assert.match(arenaRuntimeSource,/wardenTrialCardCooldown\.canPlay\(direction\)/,
  'a played card cannot be bypassed in either direction while it remains held');
assert.match(arenaRuntimeSource,/will be ready when randomly drawn/,
  'upcoming previews never run hidden pre-play timers');
assert.match(arenaRuntimeSource,/staminaCostForGroup\(group\)[^{]*\{[^}]*return staminaCostForWeapon/s,'attacks retain their ordinary stamina policy');
assert.doesNotMatch(arenaRuntimeSource,/resolveStaminaCost:resolveActionStaminaCost/,'defensive stamina costs are not controlled by the ability toggle');
assert.match(arenaShellCss,/warden-trial[^}]*trialAbilityCooldownSection[^}]*display:block/,'the toggle is visible only on the Warden Trial menu');
assert.doesNotMatch(arenaShellCss,/data-arena-bazaar-demo|trialBazaarDemo/,'the stylesheet has no hidden selector-demo state');
assert.match(launcherSource,/combat-arena\.html\?variant=warden-trial"><strong>Warden Trial/,
  'the launcher opens the ordinary Warden Trial URL');
assert.doesNotMatch(launcherSource,/bazaarDemo=/,'the launcher cannot opt into a separate test deck');
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

const pendingSurface=createFakeElement();
const pendingCard=createFakeElement();
const pendingDirections=[];
const pendingGesture=installWardenTrialSwipeSurface({
  target:pendingSurface,
  visualElement:pendingCard,
  canResolveDirection:()=>false,
  transitionDuration:5,
  onDirection:(direction,detail)=>pendingDirections.push({direction,...detail}),
});
pendingSurface.dispatch('pointerdown',{...event,pointerId:6,clientY:200,target:pendingSurface});
pendingSurface.dispatch('pointermove',{...event,pointerId:6,clientY:130,target:pendingSurface});
pendingSurface.dispatch('pointerup',{...event,pointerId:6,clientY:120,target:pendingSurface});
assert.deepEqual(pendingDirections,[{direction:'up',deltaY:-80}],
  'a rejected pending gesture still reaches runtime feedback');
assert.equal(pendingCard.style.transform,'','a pending card snaps back instead of animating out');
assert.equal(pendingGesture.getSnapshot().animating,false);
pendingGesture.destroy();

const heldSurface=createFakeElement();
const heldCard=createFakeElement();
const heldDirections=[];
const heldGesture=installWardenTrialSwipeSurface({
  target:heldSurface,
  visualElement:heldCard,
  exitOnResolve:false,
  transitionDuration:5,
  onDirection:(direction,detail)=>heldDirections.push({direction,...detail}),
});
heldSurface.dispatch('pointerdown',{...event,pointerId:61,clientY:200,target:heldSurface});
heldSurface.dispatch('pointermove',{...event,pointerId:61,clientY:130,target:heldSurface});
heldSurface.dispatch('pointerup',{...event,pointerId:61,clientY:120,target:heldSurface});
assert.deepEqual(heldDirections,[{direction:'up',deltaY:-80}],
  'the held-card mode resolves immediately without waiting for an exit animation');
assert.equal(heldCard.style.transform,'','the played card returns to center and remains visible for recovery');
assert.equal(heldCard.style.opacity,'');
assert.equal(heldGesture.getSnapshot().animating,false);
heldGesture.destroy();

const animatedSurface=createFakeElement();
const animatedCard=createFakeElement();
const animatedDirections=[];
const animatedGesture=installWardenTrialSwipeSurface({
  target:animatedSurface,
  visualElement:animatedCard,
  transitionDuration:5,
  onDirection:(direction,detail)=>animatedDirections.push({direction,...detail}),
});
animatedSurface.dispatch('pointerdown',{...event,pointerId:7,clientY:200,target:animatedSurface});
animatedSurface.dispatch('pointermove',{...event,pointerId:7,clientY:160,target:animatedSurface});
assert.equal(animatedCard.style.transform,'translateY(-40px)','the card follows the swipe before release');
animatedSurface.dispatch('pointerup',{...event,pointerId:7,clientY:120,target:animatedSurface});
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
touchSurface.dispatch('touchstart',{...touchEvent,touches:[{identifier:8,clientY:120}]});
touchSurface.dispatch('touchmove',{...touchEvent,touches:[{identifier:8,clientY:190}]});
assert.equal(touchCard.style.transform,'translateY(52px)','legacy Android touch movement drags the visible card downward');
touchSurface.dispatch('touchend',{...touchEvent,changedTouches:[{identifier:8,clientY:200}]});
assert.deepEqual(touchDirections,[{direction:'down',deltaY:80}]);

touchSurface.dispatch('touchstart',{...touchEvent,touches:[{identifier:9,clientY:200}]});
touchSurface.dispatch('touchmove',{...touchEvent,touches:[{identifier:9,clientY:130}]});
touchGesture.reset();
touchSurface.dispatch('touchmove',{...touchEvent,touches:[{identifier:9,clientY:80}]});
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
