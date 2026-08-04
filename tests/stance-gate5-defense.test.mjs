import assert from 'node:assert/strict';
import { createPlayerDamageInterceptorStack } from '../src/player-damage-interceptors.js';
import { createStanceGate5Runtime } from '../src/stance-gate5-defense.js';
function makeHarness({stanceId='S24',staminaValue=100}={}){
  const passThrough=hit=>({damage:hit.damage});
  let damageInterceptor=passThrough;
  const interceptorStack=createPlayerDamageInterceptorStack({apply:next=>{damageInterceptor=next||passThrough;}});
  const enemySystem={
    enemies:[],
    damageEnemy(){return false;},
    setPlayerDamageInterceptor:interceptorStack.setLegacy,
    registerPlayerDamageInterceptor:interceptorStack.register,
    unregisterPlayerDamageInterceptor:interceptorStack.unregister,
    hit(hit){return damageInterceptor(hit);},
  };
  const originalDamageEnemy=enemySystem.damageEnemy;
  const combatState={weapon:'longsword',attack:null,attackKey:'',readyLock:0};
  const PC={
    combatState,
    combatLayer:null,
    startCombatAttack(key,group){combatState.attack={key,group};combatState.attackKey=key;return true;},
    updateCombat(){},
  };
  const arena={
    stance:{id:stanceId},deadT:-1,
    dodge:{t:-1,cool:0},
    stamina:{v:staminaValue,pending:0,recoverDelayT:0},
    chain:{activeSlot:-1,inputLockT:0},
    charge:{active:false,queued:false,buttonHeld:false,hold:0,tier:1/3,forceTier:null},
    swing:{staminaSpent:0},
  };
  const actorPos={x:0,y:0};
  const deck={get pool(){return[{id:'S01'},{id:'S24'},{id:'S26'}];}};
  const catchEvents=[];
  let catchPhase='idle';
  const gate4={engine:{snapshot:()=>({phase:catchPhase}),trigger:event=>{catchEvents.push(event);catchPhase='open';return{type:'opened'};}}};
  let listenerCount=0;
  let animationFrameCount=0;
  const windowRef={
    __stance2Gate4Runtime:gate4,
    document:null,
    navigator:{getGamepads:()=>[]},
    requestAnimationFrame(){animationFrameCount++;return 1;},cancelAnimationFrame(){},
    addEventListener(){listenerCount++;},removeEventListener(){},
  };
  const handle={PC,arena,deck,enemySystem,actorPos,arenaMoveInput:()=>({x:0,z:0}),roomTransition:null};
  const runtime=createStanceGate5Runtime({arenaHandle:handle,windowRef,documentRef:null});
  return{
    runtime,PC,arena,enemySystem,combatState,catchEvents,actorPos,
    originalDamageEnemy,
    get listenerCount(){return listenerCount;},
    get animationFrameCount(){return animationFrameCount;},
  };
}
{
  const h=makeHarness({stanceId:'S24'});
  h.PC.updateCombat(.01);
  assert.equal(h.runtime.snapshot().kind,'existing-dodge');
  assert.equal(h.arena.dodge.cool,0,'Rat Step must not replace or lock the existing dodge');
  assert.equal(h.runtime.defenseDown('test').delegated,true);
  assert.equal(h.listenerCount,0,'Gate 5 must not add a second keyboard listener');
  assert.equal(h.animationFrameCount,0,'Gate 5 must not add a second gamepad polling loop');
  assert.equal(h.enemySystem.damageEnemy,h.originalDamageEnemy,'Gate 5 must not replace or proxy the enemy-system identity');
  h.runtime.destroy();
}
{
  const h=makeHarness({stanceId:'S26'});
  let arcanaCalls=0;
  h.enemySystem.setPlayerDamageInterceptor(hit=>{arcanaCalls++;return{damage:hit.damage};});
  h.PC.updateCombat(.01);
  assert.equal(h.arena.dodge.cool,0,'Long Blade input routing must not mutate the built-in dodge');
  assert.equal(h.runtime.defenseDown('test').accepted,true);
  assert.ok(h.runtime.snapshot().parryRemaining>0);
  const result=h.enemySystem.hit({damage:18,kind:'grunt',name:'Slash',dir:{x:0,z:-1}});
  assert.equal(result.damage,0);
  assert.equal(arcanaCalls,0,'a successful stance defense should stop before the Arcana layer');
  assert.equal(h.runtime.snapshot().lastOutcome,'parried');
  h.runtime.destroy();
}
{
  const h=makeHarness({stanceId:'S26'});
  h.runtime.defenseDown('test');
  h.PC.updateCombat(.23);
  assert.equal(h.runtime.snapshot().lastOutcome,'parry-missed');
  assert.ok(h.runtime.snapshot().parryRecoveryRemaining>0);
  h.runtime.destroy();
}
{
  const h=makeHarness({stanceId:'S01'});
  h.PC.updateCombat(.01);
  assert.equal(h.runtime.snapshot().shieldOwned,true);
  assert.equal(h.runtime.defenseDown('test').guardRaised,true);
  assert.equal(h.runtime.defenseDown('test').guardRaised,false,'the second defense tap should lower the shield');
  assert.equal(h.runtime.defenseDown('test').guardRaised,true);
  const blocked=h.enemySystem.hit({damage:10,kind:'grunt',name:'Slash',dir:{x:0,z:-1}});
  assert.equal(blocked.damage,0);
  assert.equal(h.arena.stamina.v,85);
  assert.ok(h.runtime.snapshot().guardCounterRemaining>.79);
  h.arena.chain.activeSlot=2;
  h.PC.startCombatAttack('vertical9','vertical');
  assert.equal(h.arena.charge.forceTier,1,'guard counter should automatically become a fully charged heavy');
  assert.equal(h.arena.charge.tier,1);
  assert.equal(h.runtime.snapshot().lastOutcome,'guard-counter');
  h.runtime.destroy();
}
{
  const h=makeHarness({stanceId:'S01',staminaValue:5});
  h.runtime.defenseDown('test');
  const blocked=h.enemySystem.hit({damage:10,kind:'grunt',name:'Slash',dir:{x:0,z:-1}});
  assert.equal(blocked.damage,0);
  assert.equal(h.arena.stamina.v,0);
  assert.equal(h.catchEvents.length,1);
  assert.equal(h.catchEvents[0].source,'stance-defense');
  assert.equal(h.catchEvents[0].overdraw,true);
  assert.equal(h.catchEvents[0].actualSpent,5);
  h.runtime.destroy();
}
{
  const h=makeHarness({stanceId:'S01'});
  h.runtime.defenseDown('test');
  const rear=h.enemySystem.hit({damage:12,kind:'dagger',name:'Backstab',dir:{x:0,z:1}});
  assert.equal(rear.damage,12,'rear attacks must bypass the kite shield');
  assert.equal(h.arena.stamina.v,100);
  h.runtime.destroy();
}

{
  const h=makeHarness({stanceId:'S01',staminaValue:0});
  h.runtime.defenseDown('test');
  const broken=h.enemySystem.hit({damage:10,kind:'grunt',name:'Slash',dir:{x:0,z:-1}});
  assert.equal(broken.damage,10,'an empty guard should let the breaking hit through');
  assert.equal(h.runtime.snapshot().guardRaised,true,'guard break must not silently disarm a visibly raised shield');
  assert.equal(h.runtime.snapshot().guardBroken,true);
  h.arena.stamina.v=20;
  h.PC.updateCombat(.01);
  assert.equal(h.runtime.snapshot().guardBroken,false,'restored stamina should re-arm the raised shield');
  const recovered=h.enemySystem.hit({damage:10,kind:'grunt',name:'Slash',dir:{x:0,z:-1}});
  assert.equal(recovered.damage,0,'the raised shield should resume blocking after stamina returns');
  assert.equal(h.arena.stamina.v,5);
  h.runtime.destroy();
}
{
  const h=makeHarness({stanceId:'S01'});
  h.arena.dodge.t=.01;
  h.PC.updateCombat(.01);
  assert.equal(h.arena.dodge.t,-1,'Hammerfall must cancel stray legacy dodge state before movement');
  h.runtime.destroy();
}

console.log('stance gate 5 defense runtime tests passed');
