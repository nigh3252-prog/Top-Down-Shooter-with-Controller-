import assert from 'node:assert/strict';
import {
  GOBLIN_ATTACK_TRIGGER_PADDING,
  GOBLIN_PERMITTED_MOVE_DEADBAND,
  attackReadyHoldDistance,
  installGoblinAttackRangeClosing,
  nextAuthoredMeleeAttack,
} from '../src/goblin-attack-range-closing.js';

const shortAttack={kind:'melee',name:'Short Slash',attackKey:'horizontal6',range:3.25};
const longAttack={kind:'melee',name:'Long Chop',attackKey:'vertical5',range:5.2};
const enemy={
  id:1,hp:50,role:'goblin',fusion:false,thrower:false,state:'idle',stunned:0,
  useRealCombat:true,realAttacks:[shortAttack,longAttack],combatAttackIndex:0,
  holdDist:longAttack.range*.94,stop:longAttack.range*.94,approachPermit:true,
};

assert.equal(nextAuthoredMeleeAttack(enemy),shortAttack,'the current move, not the longest move, must drive closing distance');
const readyHold=attackReadyHoldDistance(shortAttack.range);
assert.ok(Math.abs((readyHold+GOBLIN_PERMITTED_MOVE_DEADBAND)-(shortAttack.range+GOBLIN_ATTACK_TRIGGER_PADDING-.04))<1e-9,
  'movement stop boundary should meet the current attack trigger boundary');
assert.ok(readyHold<enemy.holdDist,'a shorter next attack must pull the permitted goblin closer');

let observedHold=null;
const system={
  enemies:[enemy],
  director:{hasApproachPermit:target=>target===enemy},
  update(){observedHold=enemy.holdDist;},
};
installGoblinAttackRangeClosing(system);
system.update(.016,{x:0,z:0});
assert.equal(observedHold,readyHold,'the base movement update should see the attack-ready hold distance');
assert.equal(enemy.holdDist,longAttack.range*.94,'the authored hold distance must be restored after the frame');
assert.equal(enemy.stop,longAttack.range*.94,'the authored stop distance must be restored after the frame');
assert.equal(enemy.attackReadyAttack,'horizontal6');

const denied={...enemy,id:2,approachPermit:false,holdDist:4.5,stop:4.5};
let deniedObserved=null;
const deniedSystem={
  enemies:[denied],director:{hasApproachPermit:()=>false},
  update(){deniedObserved=denied.holdDist;},
};
installGoblinAttackRangeClosing(deniedSystem);
deniedSystem.update(.016,{x:0,z:0});
assert.equal(deniedObserved,4.5,'goblins without director permission should retain their waiting distance');

const unmarkedDuelist={...enemy,id:3,role:'duelist',approachPermit:false,holdDist:4.5,stop:4.5};
let unmarkedObserved=null;
const unmarkedSystem={
  enemies:[unmarkedDuelist],director:{hasApproachPermit:()=>true},
  update(){unmarkedObserved=unmarkedDuelist.holdDist;},
};
installGoblinAttackRangeClosing(unmarkedSystem,{includeDuelists:true});
unmarkedSystem.update(.016,{x:0,z:0});
assert.equal(unmarkedObserved,4.5,'unmarked special enemies should not inherit the Lugaru spacing rule');

const lugaru={...enemy,id:4,role:'duelist',_lugaruDuelist:true,approachPermit:false,holdDist:4.5,stop:4.5};
let lugaruObserved=null;
const lugaruSystem={
  enemies:[lugaru],director:{hasApproachPermit:()=>true},
  update(){lugaruObserved=lugaru.holdDist;},
};
installGoblinAttackRangeClosing(lugaruSystem,{includeDuelists:true});
lugaruSystem.update(.016,{x:0,z:0});
assert.equal(lugaruObserved,readyHold,'the explicit Lugaru enemy should close using the same next-attack handshake as PR #90 goblins');

console.log('Goblin and Lugaru attack-range closing tests passed.');
