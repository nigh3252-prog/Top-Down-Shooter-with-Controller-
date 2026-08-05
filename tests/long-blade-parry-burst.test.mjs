import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStanceGate5Runtime } from '../src/stance-gate5-defense.js';

function makeHarness(){
  let defenseResolver=hit=>hit;
  const enemySystem={
    setPlayerDefenseResolver(resolver){defenseResolver=typeof resolver==='function'?resolver:(hit=>hit);return true;},
    hit(hit){return defenseResolver(hit);},
  };
  const combatState={weapon:'longsword',attack:null,attackKey:'',readyLock:0};
  const PC={combatState,combatLayer:null,startCombatAttack(){return true;}};
  const arena={
    stance:{id:'S26',name:'S26 Long Blade Form'},deadT:-1,dodge:{t:-1,cool:0},
    stamina:{v:100,pending:0},chain:{activeSlot:-1},
    charge:{active:false,queued:false,buttonHeld:false,hold:0,tier:1/3,forceTier:null},swing:{},
  };
  const windowRef={location:{search:''},__stance2Gate4Runtime:null};
  const runtime=createStanceGate5Runtime({
    arenaHandle:{PC,arena,deck:{pool:[]},enemySystem,getPlayerForward:()=>({x:0,z:1}),roomTransition:null},
    windowRef,documentRef:null,
  });
  return{runtime,enemySystem};
}

{
  const {runtime,enemySystem}=makeHarness();
  const opened=runtime.defenseDown('gamepad-cross');
  assert.equal(opened.handled,true);
  assert.equal(opened.accepted,true);
  assert.equal(opened.kind,'parry');
  assert.ok(runtime.snapshot().parryRemaining>0,'Long Blade should open a live parry window');

  const result=enemySystem.hit({damage:18,dir:{x:0,z:-1}});
  assert.equal(result.damage,0);
  assert.equal(result.outcome,'deflected');
  assert.equal(runtime.snapshot().lastOutcome,'parried');
  assert.ok(runtime.snapshot().parrySuccessRemaining>0,'successful parry should expose a confirmation state');
  runtime.destroy();
}

const defense=readFileSync(new URL('../src/stance-gate5-defense.js',import.meta.url),'utf8');
const visuals=readFileSync(new URL('../src/stance-gate5-visuals.js',import.meta.url),'utf8');
assert.match(defense,/visuals\.pulse\('parry-open'\)/,'opening the timing window should fire the small burst');
assert.match(defense,/visuals\.pulse\('parry-success'\)/,'negating a hit should fire the stronger confirmation burst');
assert.match(visuals,/Long Blade Parry Burst/);
assert.match(visuals,/new THREE\.SphereGeometry\(\.46,14,9\)/);
assert.match(visuals,/parrySuccess\?0xfff0aa:0xbcecff/);
assert.match(visuals,/visual\.burstSuccess=parrySuccess/);

console.log('Long Blade parry action and simple burst tests passed');
