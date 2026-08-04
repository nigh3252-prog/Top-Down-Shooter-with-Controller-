import assert from 'node:assert/strict';
import { createStanceGate5Runtime } from '../src/stance-gate5-defense.js';
function makeHarness({stance={id:'S24'},stamina=100,forward={x:0,z:1}}={}){
  let defenseResolver=hit=>hit;
  const enemySystem={setPlayerDefenseResolver(resolver){defenseResolver=typeof resolver==='function'?resolver:(hit=>hit);return true;},hit(hit){return defenseResolver(hit);}};
  const combatState={weapon:'longsword',attack:null,attackKey:'',readyLock:0};
  const PC={combatState,combatLayer:null,startCombatAttack(key,group){combatState.attack={key,group};combatState.attackKey=key;return true;}};
  const arena={stance,deadT:-1,dodge:{t:-1,cool:0},stamina:{v:stamina,pending:0},chain:{activeSlot:-1},charge:{active:false,queued:false,buttonHeld:false,hold:0,tier:1/3,forceTier:null},swing:{}};
  const deck={pool:[{id:'S01'},{id:'S24'},{id:'S26'}]};
  const windowRef={location:{search:''},__stance2Gate4Runtime:null};
  const runtime=createStanceGate5Runtime({arenaHandle:{PC,arena,deck,enemySystem,getPlayerForward:()=>forward,roomTransition:null},windowRef,documentRef:null});
  return{runtime,PC,arena,enemySystem,combatState};
}
{
  const h=makeHarness({stance:{id:'S24'}});
  assert.equal(h.runtime.defenseDown('cross').delegated,true);
  assert.equal(h.runtime.consumesDefenseInput(),false);
  h.runtime.destroy();
}
{
  const h=makeHarness({stance:{id:'S26'}});
  assert.equal(h.runtime.defenseDown('cross').accepted,true);
  const result=h.enemySystem.hit({damage:18,dir:{x:0,z:-1}});
  assert.equal(result.damage,0);
  assert.equal(result.outcome,'deflected');
  h.runtime.destroy();
}
{
  const h=makeHarness({stance:{id:'enemy-lab-selection',name:'Hammerfall'},stamina:100});
  assert.equal(h.runtime.defenseDown('cross').guardRaised,true);
  let result=h.enemySystem.hit({damage:10,dir:{x:0,z:-1}});
  assert.equal(result.damage,0);
  assert.equal(h.arena.stamina.v,85);
  result=h.enemySystem.hit({damage:10,dir:{x:0,z:1}});
  assert.equal(result.damage,10);
  assert.equal(h.runtime.defenseDown('l2').guardRaised,false);
  h.runtime.destroy();
}
{
  const h=makeHarness({stance:{id:'S01'},stamina:0});
  h.runtime.defenseDown('cross');
  let result=h.enemySystem.hit({damage:10,dir:{x:0,z:-1}});
  assert.equal(result.damage,10);
  assert.equal(h.runtime.snapshot().guardRaised,true);
  h.arena.stamina.v=20;h.runtime.update(.01);
  result=h.enemySystem.hit({damage:10,dir:{x:0,z:-1}});
  assert.equal(result.damage,0);
  assert.equal(h.arena.stamina.v,5);
  h.runtime.destroy();
}
console.log('stance gate 5 authoritative defense tests passed');
