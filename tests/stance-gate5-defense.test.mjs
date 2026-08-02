import assert from 'node:assert/strict';
import { createStanceGate5Runtime } from '../src/stance-gate5-defense.js';

function makeHarness({stanceId='S24',staminaValue=100}={}){
  let damageInterceptor=hit=>({damage:hit.damage});
  const enemySystem={
    enemies:[],
    damageEnemy(){return false;},
    setPlayerDamageInterceptor(next){damageInterceptor=typeof next==='function'?next:(hit=>({damage:hit.damage}));},
    hit(hit){return damageInterceptor(hit);},
  };
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
  const listeners=new Map();
  const windowRef={
    __stance2Gate4Runtime:gate4,
    document:null,
    navigator:{getGamepads:()=>[]},
    requestAnimationFrame:()=>0,cancelAnimationFrame(){},
    addEventListener(type,fn){listeners.set(`${type}:${listeners.size}`,fn);},
    removeEventListener(){},
  };
  const handle={PC,arena,deck,enemySystem,actorPos,arenaMoveInput:()=>({x:0,z:0}),roomTransition:null};
  const runtime=createStanceGate5Runtime({arenaHandle:handle,windowRef,documentRef:null});
  return{runtime,PC,arena,enemySystem,combatState,catchEvents,actorPos};
}

{
  const h=makeHarness({stanceId:'S24'});
  h.PC.updateCombat(.01);
  assert.equal(h.runtime.snapshot().kind,'existing-dodge');
  assert.notEqual(h.arena.dodge.cool,Infinity,'Rat Step must not replace or lock the existing dodge');
  assert.equal(h.runtime.defenseDown('test').delegated,true);
  h.runtime.destroy();
}

{
  const h=makeHarness({stanceId:'S26'});
  h.PC.updateCombat(.01);
  assert.equal(h.arena.dodge.cool,Infinity,'Long Blade replaces the dodge input with parry');
  assert.equal(h.runtime.defenseDown('test').accepted,true);
  assert.ok(h.runtime.snapshot().parryRemaining>0);
  const result=h.enemySystem.hit({damage:18,kind:'grunt',name:'Slash',dir:{x:0,z:-1}});
  assert.equal(result.damage,0);
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

console.log('stance gate 5 defense runtime tests passed');
