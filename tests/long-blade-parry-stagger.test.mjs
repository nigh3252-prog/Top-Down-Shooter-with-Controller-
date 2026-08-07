import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStanceGate5Runtime } from '../src/stance-gate5-defense.js';

const attacker={id:7,wizardStableId:'original:0007',hp:45,knockX:0,knockZ:0,flash:0,squash:0,squashT:0,squashMax:0};
let defenseResolver=hit=>hit;
const stuns=[];
const enemySystem={
  enemies:[attacker],
  setPlayerDefenseResolver(resolver){defenseResolver=typeof resolver==='function'?resolver:(hit=>hit);return true;},
  stunEnemy(enemy,duration,options){stuns.push({enemy,duration,options});enemy.stunned=Math.max(enemy.stunned||0,duration);return true;},
  hit(hit){return defenseResolver(hit);},
};
const combatState={weapon:'longsword',attack:null,attackKey:'',readyLock:0};
const PC={combatState,combatLayer:null,startCombatAttack(){return true;}};
const arena={stance:{id:'S26',name:'S26 Long Blade Form'},deadT:-1,dodge:{t:-1,cool:0},stamina:{v:100,pending:0},chain:{activeSlot:-1},charge:{active:false,queued:false,buttonHeld:false,hold:0,tier:1/3,forceTier:null},swing:{}};
const runtime=createStanceGate5Runtime({arenaHandle:{PC,arena,deck:{pool:[]},enemySystem,getPlayerForward:()=>({x:0,z:1}),roomTransition:null},windowRef:{location:{search:''},__stance2Gate4Runtime:null},documentRef:null});

assert.equal(runtime.defenseDown('gamepad-cross').accepted,true);
const result=enemySystem.hit({damage:18,kind:'grunt',name:'Slash',dir:{x:0,z:1},sourceEnemy:attacker,sourceEnemyId:attacker.wizardStableId});
assert.equal(result.damage,0);
assert.equal(result.outcome,'deflected');
assert.equal(result.staggered,true);
assert.equal(result.staggerDuration,1.25);
assert.equal(stuns.length,1);
assert.equal(stuns[0].enemy,attacker);
assert.equal(stuns[0].duration,1.25);
assert.equal(stuns[0].options.kind,'parryStagger');
assert.ok(attacker.stunned>=1.25);
assert.ok(Math.abs(attacker.knockZ)>=3,'parry stagger should visibly knock the attacker backward');
assert.equal(runtime.snapshot().lastOutcome,'parried-stagger');
runtime.destroy();

const base=readFileSync(new URL('../src/arena-enemies-base.js',import.meta.url),'utf8');
const visuals=readFileSync(new URL('../src/stance-gate5-visuals.js',import.meta.url),'utf8');
assert.match(base,/sourceEnemy:e,sourceEnemyId:e\.wizardStableId/,'melee hits must identify the attacker for parry stagger');
assert.match(base,/sourceEnemyId:pr\.sourceEnemyId/,'projectiles must retain their owner id');
assert.match(visuals,/Long Blade Parry Success Ring/);
assert.match(visuals,/Long Blade Parry Success Star/);
assert.match(visuals,/10\.5\*strength/,'successful parry should use the stronger flash');
console.log('Long Blade parry stagger and success flair tests passed');
