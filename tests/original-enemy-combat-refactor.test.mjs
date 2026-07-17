import assert from 'node:assert/strict';
import {
  ORIGINAL_BLOCKERS,
  classifyOriginalEnemyBlocker,
  installOriginalEnemyCombatRefactor,
  nextAuthoredAttack,
} from '../src/original-enemy-combat-refactor.js';

const wrapPi=a=>Math.atan2(Math.sin(a),Math.cos(a));

function makeEnemy(id,x,z){
  const attack={kind:'melee',name:'Slash',range:4,windup:.2,active:.1,recovery:.15,cooldown:1,damage:10};
  return {
    id,kind:'grunt',role:'goblin',hp:100,maxHp:100,x,z,vx:0,vz:0,speed:3,
    state:'idle',stateTime:0,cooldown:0,stunned:0,attack:null,
    windup:0,active:0,recovery:0,hitDone:false,token:null,
    realAttacks:[attack],combatAttackIndex:0,realAtk:attack,holdDist:4,stop:4,
    facingAngle:Math.atan2(-x,-z),facing:{x:0,z:1},attackAlign:.48,
    approachPermit:false,directEngaged:false,gesture:null,
  };
}

function makeHarness(count=4){
  let mode='pressureBudget';
  const director={
    settings:{pressureBudget:3,cycleOnWaveClear:false},
    setMode(next){mode=next;},getMode(){return mode;},update(){},
    canGrant(){return false;},grant(){return null;},release(){},releaseAllForEnemy(){},releaseAll(){},reset(){},
    onWaveClear(){return mode;},getDebugState(){return {mode,slots:[]};},
    hasApproachPermit(){return false;},requestRally(){return true;},endRally(){},markNearEligible(){},assignBattleCircleSlots(){},
  };
  const enemies=Array.from({length:count},(_,i)=>{
    const angle=i/count*Math.PI*2;
    const e=makeEnemy(i+1,Math.cos(angle)*3.4,Math.sin(angle)*3.4);
    e.facingAngle=Math.atan2(-e.x,-e.z);
    e.facing={x:Math.sin(e.facingAngle),z:Math.cos(e.facingAngle)};
    return e;
  });
  const system={enemies,director};

  system.update=(dt,player)=>{
    director.update(dt,{enemies,player});
    for(const enemy of enemies){
      enemy.stateTime+=dt;
      enemy.cooldown=Math.max(0,enemy.cooldown-dt);
      if(enemy.stunned>0){enemy.stunned=Math.max(0,enemy.stunned-dt);continue;}
      if(enemy.state==='windup'){
        if(enemy.stateTime>=enemy.windup){enemy.state='active';enemy.stateTime=0;}
        continue;
      }
      if(enemy.state==='active'){
        if(enemy.stateTime>=enemy.active){enemy.state='recovery';enemy.stateTime=0;}
        continue;
      }
      if(enemy.state==='recovery'){
        if(enemy.stateTime>=enemy.recovery){
          enemy.state='idle';enemy.stateTime=0;enemy.cooldown=enemy.attack.cooldown;
          director.release(enemy);enemy.attack=null;
        }
        continue;
      }
      const attack=nextAuthoredAttack(enemy);
      const dx=player.x-enemy.x,dz=player.z-enemy.z;
      const distance=Math.hypot(dx,dz);
      const alignment=Math.abs(wrapPi(Math.atan2(dx,dz)-enemy.facingAngle));
      if(attack&&enemy.cooldown<=0&&distance<=attack.range+.95&&alignment<=enemy.attackAlign&&director.canGrant(enemy,attack)){
        enemy.attack=attack;enemy.state='windup';enemy.stateTime=0;
        enemy.windup=attack.windup;enemy.active=attack.active;enemy.recovery=attack.recovery;
        director.grant(enemy,attack);
      }
    }
  };
  installOriginalEnemyCombatRefactor(system);
  return {system,director,enemies,player:{x:0,z:0}};
}

{
  const {system,enemies,player}=makeHarness(6);
  system.setDirectorMode('avalanche');
  system.update(.016,player);
  assert.equal(enemies.filter(e=>e.state==='windup').length,6,'Relentless mode lets every in-range enemy begin immediately');
  assert.ok(enemies.every(e=>e.attackStarts===1),'Every enemy records its own attack start');

  for(let i=0;i<40;i++) system.update(.05,player);
  assert.ok(enemies.every(e=>e.attackStarts>=2),'Every reachable enemy attacks repeatedly, not just once');
  assert.ok(enemies.every(e=>e.cooldown===0),'Relentless mode has no hidden post-attack cooldown');

  const diagnostics=system.getAttackCoordinatorDiagnostics(player);
  assert.equal(diagnostics.mode,'avalanche');
  assert.equal(diagnostics.perEnemy.length,6);
  assert.ok(diagnostics.perEnemy.every(item=>item.attacks>=2));
}

{
  const {system,enemies,player}=makeHarness(4);
  system.setDirectorMode('oneAttacker');
  system.update(.016,player);
  assert.equal(enemies.filter(e=>e.state==='windup').length,1,'One Attacker remains a coordinator policy');
  assert.equal(enemies.filter(e=>e.attackBlocker===ORIGINAL_BLOCKERS.COORDINATOR_DENIED).length,3);
}

{
  const enemy=makeEnemy(99,12,0);
  enemy.vx=enemy.vz=0;
  enemy._attackBrainBlockedTime=.8;
  assert.equal(classifyOriginalEnemyBlocker(enemy,{x:0,z:0}),ORIGINAL_BLOCKERS.PHYSICALLY_BLOCKED);
  enemy._attackBrainBlockedTime=0;
  assert.equal(classifyOriginalEnemyBlocker(enemy,{x:0,z:0}),ORIGINAL_BLOCKERS.APPROACHING);
  enemy.x=3.5;
  enemy.facingAngle=Math.PI;
  assert.equal(classifyOriginalEnemyBlocker(enemy,{x:0,z:0}),ORIGINAL_BLOCKERS.READY);
}

console.log('original enemy combat refactor tests passed');
