import assert from 'node:assert/strict';
import {LUGARU_COUNTER_RELEASE_WINDOW,LUGARU_POSE_LOCK_STUN_MAX,installLugaruDuelistCounterRelease,shouldReleaseLugaruPoseLock} from '../src/lugaru-duelist-counter-release.js';

const enemy={_lugaruDuelist:true,duelistCounterReleaseT:LUGARU_COUNTER_RELEASE_WINDOW,stunned:.055};
assert.equal(shouldReleaseLugaruPoseLock(enemy),true);
assert.equal(shouldReleaseLugaruPoseLock({...enemy,stunned:LUGARU_POSE_LOCK_STUN_MAX+.01}),false);
assert.equal(shouldReleaseLugaruPoseLock({...enemy,_lugaruDuelist:false}),false);
assert.equal(shouldReleaseLugaruPoseLock({...enemy,duelistCounterReleaseT:0}),false);

let observedStun=null;
const system={enemies:[enemy],update(){observedStun=enemy.stunned;}};
installLugaruDuelistCounterRelease(system);
system.update(.016,{x:0,z:0});
assert.equal(observedStun,0);
assert.ok(enemy.duelistCounterReleaseT<LUGARU_COUNTER_RELEASE_WINDOW);

const realStun={_lugaruDuelist:true,duelistCounterReleaseT:LUGARU_COUNTER_RELEASE_WINDOW,stunned:.4};
const realSystem={enemies:[realStun],update(){}};
installLugaruDuelistCounterRelease(realSystem);
realSystem.update(.016,{});
assert.equal(realStun.stunned,.4);
console.log('Lugaru counter-release tests passed.');
