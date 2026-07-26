import assert from 'node:assert/strict';
import {applyArenaEnemyDamageState,resolveArenaEnemyMove} from '../src/arena-enemies-base.js';
import {routeArenaEnemyMove} from '../src/arena-enemies-core.js';

function enemy(overrides={}){
  return{
    hp:100,flash:.03,stunned:.02,state:'windup',stateTime:.31,
    knockX:0,knockZ:0,squash:.04,squashT:.05,squashMax:.06,
    spinVel:.07,vyOff:.08,...overrides,
  };
}

// With no options, damage retains the long-standing flinch, stun, and attack
// cancellation behavior.
const ordinary=enemy();let ended=0,released=0;
const ordinaryResult=applyArenaEnemyDamageState(ordinary,28,{x:2,z:-1},{},{
  endRally(){ended++;},releaseAttack(){released++;},random:()=>.25,
});
assert.equal(ordinary.hp,72);
assert.equal(ordinaryResult.hitStun,true);assert.equal(ordinaryResult.cancelAttack,true);assert.equal(ordinaryResult.damageFlash,true);
assert.ok(ordinary.flash>.03);assert.ok(ordinary.stunned>.02);assert.equal(ordinary.state,'idle');assert.equal(ordinary.stateTime,0);
assert.ok(ordinary.squash>.04);assert.notEqual(ordinary.spinVel,.07);assert.deepEqual({ended,released},{ended:1,released:1});
assert.deepEqual({knockX:ordinary.knockX,knockZ:ordinary.knockZ},{knockX:1.3,knockZ:-.65});

// A DOT/control hit can reduce HP without changing any living combat or visual
// reaction state. Knock remains independently available to effects that request it.
const quiet=enemy({state:'active'});const quietBefore={...quiet};ended=0;released=0;
const quietResult=applyArenaEnemyDamageState(quiet,5,{x:0,z:0},{hitReaction:false},{
  endRally(){ended++;},releaseAttack(){released++;},random:()=>{throw new Error('quiet damage must not sample visual-reaction randomness');},
});
assert.equal(quiet.hp,95);
assert.equal(quietResult.hitStun,false);assert.equal(quietResult.cancelAttack,false);assert.equal(quietResult.damageFlash,false);
for(const key of['flash','stunned','state','stateTime','squash','squashT','squashMax','spinVel','vyOff'])assert.equal(quiet[key],quietBefore[key],`${key} must survive non-reactive damage`);
assert.deepEqual({ended,released},{ended:0,released:0});

// Absolute Arcana carry destinations are resolved through the same wall-aware
// navigation primitive as autonomous enemies, with actor radius preserved.
let navigationCall=null;
const navigation={resolveMovement(start,delta,radius){navigationCall={start,delta,radius};return{x:2.25,z:1.5};}};
const moved=resolveArenaEnemyMove({x:1,z:1},{x:5,z:4},{navigation,radius:.8,arenaRadius:18});
assert.deepEqual(navigationCall,{start:{x:1,z:1},delta:{x:4,z:3},radius:.8});
assert.deepEqual(moved.current,{x:2.25,z:1.5});assert.equal(moved.blocked,true);
assert.deepEqual(moved.actualDelta,{x:1.25,z:.5});

// Combined routing must invoke only the child system that owns the target.
const firstEnemy=enemy(),secondEnemy=enemy();const calls=[];
const first={enemies:[firstEnemy],moveEnemyResolved(){calls.push('first');return{owner:'first'};}};
const second={enemies:[secondEnemy],moveEnemyResolved(target,position,options){calls.push({target,position,options});return{owner:'second'};}};
assert.deepEqual(routeArenaEnemyMove([first,second],secondEnemy,{x:7,z:-2},{resetVelocity:true}),{owner:'second'});
assert.equal(calls.length,1);assert.deepEqual(calls[0],{target:secondEnemy,position:{x:7,z:-2},options:{resetVelocity:true}});
assert.equal(routeArenaEnemyMove([first,second],enemy(),{x:0,z:0}),false);
const thirdEnemy=enemy(),third={enemies:[thirdEnemy]};
assert.deepEqual(routeArenaEnemyMove([first,third],thirdEnemy,{x:3,z:4},{},(owner,target,position)=>({owner,target,position})),{owner:third,target:thirdEnemy,position:{x:3,z:4}},'owners without a native mover use the collision-aware core fallback');

console.log('Arena enemy damage and movement control: ok');
