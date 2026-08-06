import assert from 'node:assert/strict';
import { createStanceGate4Runtime } from '../src/stance-gate4-exhaustion.js';
import { staminaCostForWeapon } from '../src/weapon-balance.js';

function makeHarness({staminaStart=10,requestedCost=10}={}){
  const stamina={v:staminaStart,pending:0,recoverDelayT:0};
  const weapon={id:'longsword',staminaClass:'Medium'};
  const combatState={weapon:'longsword',attack:null,attackKey:'vertical5',pending:null,pendingGroup:null,readyLock:0};
  const arena={
    stamina,stance:{id:'S26'},deadT:-1,
    swing:{staminaSpent:0,overdrawAmount:0},
    charge:{active:false,tier:1/3},
    chain:{stage:'idle',inputLockT:0,lightLockT:0,comboDeadline:0,finisherDeadline:0,activeSlot:0,pendingSlot:-1,pendingStage:null,pendingExpiresAt:0,pendingInput:null},
    dodge:{t:-1},
  };
  const actorPos={x:0,y:0};
  const move={x:0,z:0};
  const PC={
    combatState,
    currentWeapon:()=>weapon,
    startCombatAttack(){
      combatState.attack={key:'vertical5'};
      const quoted=staminaCostForWeapon(requestedCost,weapon);
      const spent=Math.min(stamina.v,quoted);
      stamina.v=Math.max(0,stamina.v-spent);
      arena.swing.staminaSpent=spent;
    },
    updateCombat(){},
  };
  const deck={
    play(){const card={id:'S24',type:'stance'};stamina.v=100;stamina.pending=0;return card;},
  };
  let clearedRecovery=0;
  const gate3Runtime={clearMovementRecovery(){clearedRecovery++;}};
  const windowRef={};
  const handle={PC,arena,deck,actorPos,arenaMoveInput:()=>({...move})};
  const runtime=createStanceGate4Runtime({arenaHandle:handle,gate3Runtime,windowRef,documentRef:null,basePlayerSpeed:8.5});
  return{runtime,PC,arena,deck,stamina,combatState,actorPos,move,weapon,get clearedRecovery(){return clearedRecovery;}};
}

{
  const h=makeHarness();
  h.PC.startCombatAttack('vertical5','vertical');
  assert.equal(h.runtime.snapshot().phase,'open');
  h.deck.play(0);
  assert.equal(h.runtime.snapshot().phase,'success');
  assert.ok(h.clearedRecovery>=1,'a clean catch should clear Gate 3 movement recovery');
  assert.equal(h.stamina.v,100);
  h.PC.updateCombat(.42);
  assert.equal(h.runtime.snapshot().phase,'idle');
  h.runtime.destroy();
}

{
  const h=makeHarness({staminaStart:20,requestedCost:50});
  const quoted=staminaCostForWeapon(50,h.weapon);
  assert.equal(quoted,20,'the shared quote should let a positive final reserve fund the stance attack');
  h.PC.startCombatAttack('vertical5','vertical');
  assert.equal(h.stamina.v,0);
  assert.equal(h.arena.swing.staminaSpent,20,'only real stamina is spent and therefore refundable');
  assert.equal(h.runtime.snapshot().phase,'open');
  assert.equal(h.runtime.snapshot().trigger.overdraw,true);
  assert.equal(h.runtime.snapshot().trigger.requestedCost,50);
  assert.equal(h.runtime.snapshot().trigger.actualSpent,20);
  assert.equal(h.runtime.snapshot().trigger.overdrawAmount,30);
  h.runtime.destroy();
}

{
  const h=makeHarness({staminaStart:20,requestedCost:50});
  h.PC.startCombatAttack('vertical5','vertical');
  h.stamina.pending=20;
  h.PC.updateCombat(.01);
  assert.equal(h.runtime.snapshot().phase,'idle','a whiff refund should cancel the Overdraw catch');
  assert.equal(h.arena.swing.staminaSpent,20,'the virtual Overdraw amount must never enter the refund bank');
  h.runtime.destroy();
}

{
  const h=makeHarness();
  assert.equal(h.runtime.setWindowMultiplier(10),10);
  assert.equal(h.runtime.snapshot().windowMultiplier,10);
  assert.ok(Math.abs(h.runtime.snapshot().windowDuration-7.2)<1e-9);
  h.PC.startCombatAttack('vertical5','vertical');
  h.PC.updateCombat(1);
  assert.equal(h.runtime.snapshot().phase,'open','the ×10 window should still be open after one second');
  assert.ok(Math.abs(h.runtime.snapshot().remaining-6.2)<1e-9);
  h.runtime.destroy();
}

{
  const h=makeHarness();
  h.PC.startCombatAttack('vertical5','vertical');
  h.PC.updateCombat(.73);
  assert.equal(h.runtime.snapshot().phase,'missed');
  h.combatState.attack=null;
  h.PC.updateCombat(0);
  assert.equal(h.runtime.snapshot().phase,'failed');
  assert.equal(h.arena.chain.stage,'locked');
  assert.ok(h.arena.chain.inputLockT>=2.99);

  h.move.x=1;h.actorPos.x=1;
  h.PC.updateCombat(.1);
  assert.ok(h.actorPos.x<.5,'the initial stumble should sharply reduce movement');

  h.arena.dodge.t=0;
  const beforeDodgeMove=h.actorPos.x;
  h.actorPos.x+=1;
  h.PC.updateCombat(.1);
  assert.ok(h.actorPos.x>beforeDodgeMove+.9,'dodge movement should not be reduced by the stumble curve');
  h.arena.dodge.t=-1;

  h.arena.chain.stage='idle';h.arena.chain.inputLockT=0;
  h.PC.updateCombat(.01);
  assert.equal(h.arena.chain.stage,'locked','Gate 4 should restore its attack lock after dodge resets the chain');

  h.deck.play(0);
  assert.equal(h.runtime.snapshot().phase,'failed','a late stance card refills stamina but does not erase the miss penalty');
  h.PC.updateCombat(3.1);
  assert.equal(h.runtime.snapshot().phase,'idle');
  assert.equal(h.arena.chain.inputLockT,0);
  assert.equal(h.combatState.readyLock,0);
  h.runtime.destroy();
}

console.log('stance gate 4 exhaustion runtime tests passed');
