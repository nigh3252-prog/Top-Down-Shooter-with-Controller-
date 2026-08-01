import assert from 'node:assert/strict';
import { createCombatDirector } from '../src/combat-director.js';

const makeGoblin = (id,x) => ({
  id,kind:'grunt',role:'goblin',attackId:'slash',x,z:6,hp:10,state:'idle',stunned:0,cooldown:0,
  token:null,gesture:null,approachPermit:false,approachPermitTime:0,
  approachCooldown:0,approachCount:0
});

const enemies=[makeGoblin(1,-2),makeGoblin(2,0),makeGoblin(3,2)];
const director=createCombatDirector({mode:'oneAttacker',pressureBudget:2.25});
const context={enemies,player:{x:0,z:0},pressureBudget:2.25,aggression:1};

director.update(.1,context);
assert.equal(enemies.filter(enemy=>enemy.approachPermit).length,2,'one-attacker mode stages two approachers for readable handoffs');

const meleeAttack={kind:'melee',tokenCost:1,damage:7,cooldown:1,windup:.4,active:.2,recovery:.5};
const firstCandidate=enemies.find(enemy=>enemy.approachPermit);
assert.equal(director.canGrant(firstCandidate,meleeAttack,context),true,'the first staged goblin can claim the melee lane');
director.grant(firstCandidate,meleeAttack);
const secondCandidate=enemies.find(enemy=>enemy.approachPermit&&enemy!==firstCandidate);
assert.equal(director.canGrant(secondCandidate,meleeAttack,context),false,'one-attacker mode still limits active melee commitments to one');
director.release(firstCandidate);
director.update(.1,context);
assert.equal(enemies.filter(enemy=>enemy.approachPermit).length,2,'released approach permit rotates to another goblin');
assert.equal(firstCandidate.approachPermit,false,'released goblin observes its approach cooldown');

const waiting=firstCandidate;
assert.equal(director.requestRally(waiting),true,'a waiting goblin can claim the rally gesture');
waiting.gesture='rally';
secondCandidate.approachPermit=false;
assert.equal(director.requestRally(secondCandidate),false,'only one rally gesture may be active');
director.endRally(waiting); waiting.gesture=null;

director.setMode('chaos');
for(const enemy of enemies){ enemy.approachCooldown=0; enemy.cooldown=0; }
director.update(.1,context);
assert.equal(enemies.filter(enemy=>enemy.approachPermit).length,3,'chaos scales approach permits with the pressure budget');

console.log('Goblin director behavior passed.');
