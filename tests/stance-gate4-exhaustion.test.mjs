import assert from 'node:assert/strict';
import { createStanceGate4Runtime } from '../src/stance-gate4-exhaustion.js';

function makeHarness(){
  const stamina={v:10,pending:0,recoverDelayT:0};
  const combatState={weapon:'longsword',attack:null,attackKey:'vertical5',pending:null,pendingGroup:null,readyLock:0};
  const arena={
    stamina,stance:{id:'S26'},deadT:-1,
    chain:{stage:'idle',inputLockT:0,lightLockT:0,comboDeadline:0,finisherDeadline:0,activeSlot:0,pendingSlot:-1,pendingStage:null,pendingExpiresAt:0,pendingInput:null},
    dodge:{t:-1},
  };
  const actorPos={x:0,y:0};
  const move={x:0,z:0};
  const PC={
    combatState,
    startCombatAttack(){combatState.attack={key:'vertical5'};stamina.v=0;},
    updateCombat(){},
  };
  const deck={
    play(){const card={id:'S24',type:'stance'};stamina.v=100;stamina.pending=0;return card;},
  };
  let clearedRecovery=0;
  const windowRef={__stance2Gate3Runtime:{clearMovementRecovery(){clearedRecovery++;}}};
  const handle={PC,arena,deck,actorPos,arenaMoveInput:()=>({...move})};
  const runtime=createStanceGate4Runtime({arenaHandle:handle,windowRef,documentRef:null,basePlayerSpeed:8.5});
  return{runtime,PC,arena,deck,stamina,combatState,actorPos,move,get clearedRecovery(){return clearedRecovery;}};
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
  const h=makeHarness();
  h.PC.startCombatAttack('vertical5','vertical');
  h.stamina.pending=6;
  h.PC.updateCombat(.01);
  assert.equal(h.runtime.snapshot().phase,'idle','a whiff refund should cancel the catch');
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
