import assert from 'node:assert/strict';
import {
  LUGARU_COUNTER_RELEASE_WINDOW,
  LUGARU_POSE_LOCK_STUN_MAX,
  installLugaruDuelistCounterRelease,
  shouldReleaseLugaruPoseLock,
} from '../src/lugaru-duelist-counter-release.js';

const enemy={_lugaruDuelist:true,stunned:.055,duelistLastBlock:null};
let stunSeenByBaseUpdate=null;
const system={
  enemies:[enemy],
  damageEnemy(target){target.duelistLastBlock={blocked:true,perfect:false};return false;},
  update(){stunSeenByBaseUpdate=enemy.stunned;},
  reset(){},
  startRoomEncounter(){},
  clearRoomRuntime(){},
};
installLugaruDuelistCounterRelease(system);

assert.equal(shouldReleaseLugaruPoseLock(enemy),false,'no counter window means ordinary stun remains untouched');
system.damageEnemy(enemy,10,{x:0,z:0});
assert.equal(enemy._lugaruCounterReleaseT,LUGARU_COUNTER_RELEASE_WINDOW,'a successful block opens the counter-release window');
assert.equal(shouldReleaseLugaruPoseLock(enemy),true,'the guard pose micro-stun should be releasable');
system.update(.016,{x:0,z:0});
assert.equal(stunSeenByBaseUpdate,0,'the duelist counter reaches its own update without the pose-lock stun');
assert.ok(enemy._lugaruCounterReleaseT<LUGARU_COUNTER_RELEASE_WINDOW);

enemy.stunned=LUGARU_POSE_LOCK_STUN_MAX+.05;
enemy._lugaruCounterReleaseT=.2;
system.update(.016,{x:0,z:0});
assert.equal(stunSeenByBaseUpdate,LUGARU_POSE_LOCK_STUN_MAX+.05,'real hit stun must not be erased');

enemy._lugaruCounterReleaseT=.2;
system.reset();
assert.equal(enemy._lugaruCounterReleaseT,0,'reset clears pending counter-release windows');

console.log('Lugaru duelist counter-release tests passed.');
