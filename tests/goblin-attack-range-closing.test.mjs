import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  GOBLIN_ATTACK_TRIGGER_PADDING,
  GOBLIN_PERMITTED_MOVE_DEADBAND,
  attackReadyHoldDistance,
  installGoblinAttackRangeClosing,
  nextAuthoredMeleeAttack,
} from '../src/goblin-attack-range-closing.js';

const shortAttack={kind:'melee',name:'Short Slash',attackKey:'horizontal6',range:3.25};
const longAttack={kind:'melee',name:'Long Chop',attackKey:'vertical5',range:5.2};
const enemy={id:1,hp:50,role:'goblin',fusion:false,thrower:false,state:'idle',stunned:0,
  useRealCombat:true,realAttacks:[shortAttack,longAttack],combatAttackIndex:0,
  holdDist:longAttack.range*.94,stop:longAttack.range*.94,approachPermit:true};

assert.equal(nextAuthoredMeleeAttack(enemy),shortAttack);
const readyHold=attackReadyHoldDistance(shortAttack.range);
assert.ok(Math.abs((readyHold+GOBLIN_PERMITTED_MOVE_DEADBAND)-(shortAttack.range+GOBLIN_ATTACK_TRIGGER_PADDING-.04))<1e-9);
assert.ok(readyHold<enemy.holdDist);

let observedHold=null;
const system={enemies:[enemy],director:{hasApproachPermit:target=>target===enemy},update(){observedHold=enemy.holdDist;}};
installGoblinAttackRangeClosing(system);
system.update(.016,{x:0,z:0});
assert.equal(observedHold,readyHold);
assert.equal(enemy.holdDist,longAttack.range*.94);
assert.equal(enemy.stop,longAttack.range*.94);

const denied={...enemy,id:2,approachPermit:false,holdDist:4.5,stop:4.5};
let deniedObserved=null;
const deniedSystem={enemies:[denied],director:{hasApproachPermit:()=>false},update(){deniedObserved=denied.holdDist;}};
installGoblinAttackRangeClosing(deniedSystem);
deniedSystem.update(.016,{x:0,z:0});
assert.equal(deniedObserved,4.5);

const lugaru={...enemy,id:4,role:'duelist',_lugaruDuelist:true,approachPermit:false,holdDist:4.5,stop:4.5};
let lugaruObserved=null;
const lugaruSystem={enemies:[lugaru],director:{hasApproachPermit:()=>true},update(){lugaruObserved=lugaru.holdDist;}};
installGoblinAttackRangeClosing(lugaruSystem,{includeDuelists:true});
lugaruSystem.update(.016,{x:0,z:0});
assert.equal(lugaruObserved,readyHold);

const orderedLugaru={...lugaru,id:5,holdDist:4.5,stop:4.5};
let orderedObserved=null;
const orderedSystem={enemies:[orderedLugaru],director:{hasApproachPermit:()=>true},update(){orderedObserved=orderedLugaru.holdDist;}};
installGoblinAttackRangeClosing(orderedSystem,{includeDuelists:true});
const rangeClosingUpdate=orderedSystem.update.bind(orderedSystem);
orderedSystem.update=function simulatedLugaruOuterUpdate(dt,player){orderedLugaru.holdDist=5.35;orderedLugaru.stop=5.35;return rangeClosingUpdate(dt,player);};
orderedSystem.update(.016,{x:0,z:0});
assert.equal(orderedObserved,readyHold);

const wrapper=fs.readFileSync(new URL('../src/arena-enemies-guard.js',import.meta.url),'utf8');
const closingIndex=wrapper.indexOf('const closing=installGoblinAttackRangeClosing');
const duelistIndex=wrapper.indexOf('const duelist=installLugaruDuelist(closing');
assert.ok(closingIndex>=0&&duelistIndex>closingIndex);

console.log('Goblin and Lugaru attack-range closing tests passed.');
