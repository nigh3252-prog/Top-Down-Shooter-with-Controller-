import assert from 'node:assert/strict';
import { FUSION_MOVEMENT_PROFILES, installFusionMovementBehaviors } from '../src/fusion-movement-behaviors.js';

assert.deepEqual(Object.keys(FUSION_MOVEMENT_PROFILES),['lion','spid','sun','grab','tooth','mother','stilt','ant','phx','croc']);

const activeEnemies=[];
let updates=0;
const system={
  get enemies(){return activeEnemies;},
  update(){updates++;},
  isRigidBodyActive(){return false;},
};

installFusionMovementBehaviors(system);
assert.equal(system.fusionMovementBehaviorsInstalled,true);
assert.equal(system.fusionMovementProfiles.grab.family,'coward');

const grab={id:1,kind:'grab',fusion:true,hp:10,x:2,z:0,speed:4,role:'disruptor',preferredRange:2,orbitDir:1};
activeEnemies.push(grab);
system.update(.016,{x:0,z:0});
assert.equal(grab.movementFamily,'coward');
assert.equal(grab.movementPattern,'Mulligan retreat');
assert.equal(grab.role,'skirmisher');
assert.equal(grab.preferredRange,8.2);
assert.ok(grab.speed>4);

const ant={id:2,kind:'ant',fusion:true,hp:10,x:4,z:0,speed:5,role:'charger',preferredRange:4,orbitDir:-1};
activeEnemies.push(ant);
system.update(.016,{x:0,z:0});
assert.equal(ant.movementFamily,'pursuer');
assert.equal(ant.movementPattern,'Squirt charge');
assert.equal(ant.speed,5);
assert.equal(ant.role,'charger');
assert.equal(ant.preferredRange,4);

const goblin={id:3,kind:'grunt',fusion:false,hp:10,x:0,z:0,speed:3,role:'goblin',preferredRange:2,orbitDir:1};
activeEnemies.push(goblin);
system.update(.016,{x:0,z:0});
assert.equal(goblin.movementFamily,undefined);
assert.equal(goblin.speed,3);

const stilt={id:4,kind:'stilt',fusion:true,hp:10,x:3,z:0,speed:3,role:'reach sentinel',preferredRange:3,orbitDir:1};
activeEnemies.push(stilt);
system.update(.016,{x:0,z:0});
assert.equal(stilt.movementFamily,'anchor');
assert.equal(stilt.movementPattern,'Horf plant-and-strike');
assert.ok(stilt.speed<=3);

assert.equal(updates,4);
console.log('fusion movement behavior tests passed');
