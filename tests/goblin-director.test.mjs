import assert from 'node:assert/strict';
import { createCombatDirector } from '../src/combat-director.js';

const makeGoblin = (id,x) => ({
  id,kind:'grunt',role:'goblin',x,z:6,hp:10,state:'idle',stunned:0,cooldown:0,
  token:null,gesture:null,approachPermit:false,approachPermitTime:0,
  approachCooldown:0,approachCount:0
});

const enemies=[makeGoblin(1,-2),makeGoblin(2,0),makeGoblin(3,2)];
const director=createCombatDirector({mode:'oneAttacker',pressureBudget:2.25});
const context={enemies,player:{x:0,z:0},pressureBudget:2.25,aggression:1};

director.update(.1,context);
assert.equal(enemies.filter(enemy=>enemy.approachPermit).length,1,'one-attacker mode grants one approach permit');

const first=enemies.find(enemy=>enemy.approachPermit);
director.releaseApproach(first,1);
director.update(.1,context);
assert.equal(enemies.filter(enemy=>enemy.approachPermit).length,1,'released approach permit rotates to another goblin');
assert.equal(first.approachPermit,false,'released goblin observes its approach cooldown');

const waiting=enemies.find(enemy=>!enemy.approachPermit && enemy!==first);
assert.equal(director.requestRally(waiting),true,'a waiting goblin can claim the rally gesture');
waiting.gesture='rally';
assert.equal(director.requestRally(first),false,'only one rally gesture may be active');
director.endRally(waiting); waiting.gesture=null;

director.setMode('chaos');
for(const enemy of enemies){ enemy.approachCooldown=0; enemy.cooldown=0; }
director.update(.1,context);
assert.equal(enemies.filter(enemy=>enemy.approachPermit).length,2,'chaos scales approach permits with the pressure budget');

console.log('Goblin director behavior passed.');
