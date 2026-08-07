import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const write=(path,content)=>writeFileSync(path,content);
function replaceOnce(path,before,after,label){
  const source=read(path);
  if(source.includes(after))return;
  const count=source.split(before).length-1;
  if(count!==1)throw new Error(`${path}: expected one ${label}, found ${count}`);
  write(path,source.replace(before,after));
}

replaceOnce(
  'src/stance-defense-profiles.js',
  `    parryWindow:.22,\n    missRecovery:.32,\n    successFlash:.34,\n    parryStaggerDuration:1.25,\n    summary:'Tap defense for a short sword-parry window. A success deflects the hit and heavily staggers the attacker.',`,
  `    parryWindow:.22,\n    missRecovery:.32,\n    missStaminaCost:12,\n    successFlash:.34,\n    parryStaggerDuration:1.25,\n    summary:'Tap defense for a short sword-parry window. Success is free and heavily staggers the attacker; a whiff costs 12 stamina.',`,
  'Long Blade parry miss cost profile',
);

replaceOnce(
  'src/stance-gate5-defense.js',
  `    guardCounterRemaining:0,parryRemaining:0,parryRecoveryRemaining:0,parrySuccessRemaining:0,\n    lastOutcome:'ready',lastBlockCost:0,lastDodgeCost:0,lastOverdrawAmount:0,lastInput:'',lastHitDirection:'',`,
  `    guardCounterRemaining:0,parryRemaining:0,parryRecoveryRemaining:0,parrySuccessRemaining:0,\n    lastOutcome:'ready',lastBlockCost:0,lastDodgeCost:0,lastParryMissCost:0,lastOverdrawAmount:0,lastInput:'',lastHitDirection:'',`,
  'parry miss cost state',
);
replaceOnce(
  'src/stance-gate5-defense.js',
  `    state.parryRemaining=0;state.parryRecoveryRemaining=0;state.parrySuccessRemaining=0;\n    state.lastDodgeCost=0;state.lastOutcome=reason;`,
  `    state.parryRemaining=0;state.parryRecoveryRemaining=0;state.parrySuccessRemaining=0;\n    state.lastDodgeCost=0;state.lastParryMissCost=0;state.lastOutcome=reason;`,
  'reset parry miss cost',
);
replaceOnce(
  'src/stance-gate5-defense.js',
  `    if(profile.kind==='parry'){\n      if(state.parryRemaining>0||state.parryRecoveryRemaining>0)return{handled:true,accepted:false,reason:'parry-recovery',source};\n      state.parryRemaining=profile.parryWindow;state.parrySuccessRemaining=0;state.lastOutcome='parry-open';\n      visuals.pulse('parry-open');publish();return{handled:true,accepted:true,kind:'parry',source};\n    }`,
  `    if(profile.kind==='parry'){\n      if(state.parryRemaining>0||state.parryRecoveryRemaining>0)return{handled:true,accepted:false,reason:'parry-recovery',source};\n      const missCost=Math.max(0,Number(profile.missStaminaCost)||0);\n      if(missCost>EPSILON&&(Number(arena.stamina.v)||0)<=EPSILON)return{handled:true,accepted:false,reason:'empty-reserve',source};\n      state.parryRemaining=profile.parryWindow;state.parrySuccessRemaining=0;state.lastParryMissCost=0;state.lastOutcome='parry-open';\n      visuals.pulse('parry-open');publish();return{handled:true,accepted:true,kind:'parry',source};\n    }`,
  'positive reserve parry gate',
);
replaceOnce(
  'src/stance-gate5-defense.js',
  `      if(state.parryRemaining<=0&&state.lastOutcome==='parry-open'){\n        state.parryRecoveryRemaining=profile?.missRecovery||0;state.lastOutcome='parry-missed';\n      }`,
  `      if(state.parryRemaining<=0&&state.lastOutcome==='parry-open'){\n        state.parryRecoveryRemaining=profile?.missRecovery||0;\n        const missCost=Math.max(0,Number(profile?.missStaminaCost)||0);\n        if(missCost>EPSILON){\n          const {decision}=spendStanceDefense(missCost,'long-blade-parry-whiff');\n          state.lastParryMissCost=decision.actualSpent;state.lastOverdrawAmount=decision.overdrawAmount;\n          state.lastOutcome=decision.allowed?(decision.overdraw?'parry-whiff-overdraw':'parry-whiff-cost'):'parry-whiff-empty';\n        }else state.lastOutcome='parry-missed';\n      }`,
  'whiff spend on parry expiry',
);

const staggerTest=`import assert from 'node:assert/strict';\nimport { readFileSync } from 'node:fs';\nimport { createStanceGate5Runtime } from '../src/stance-gate5-defense.js';\n\nfunction makeHarness({stamina=100}={}){\n  const attacker={id:7,wizardStableId:'original:0007',hp:45,knockX:0,knockZ:0,flash:0,squash:0,squashT:0,squashMax:0};\n  let defenseResolver=hit=>hit,phase='idle';\n  const stuns=[],catchEvents=[];\n  const enemySystem={\n    enemies:[attacker],\n    setPlayerDefenseResolver(resolver){defenseResolver=typeof resolver==='function'?resolver:(hit=>hit);return true;},\n    stunEnemy(enemy,duration,options){stuns.push({enemy,duration,options});enemy.stunned=Math.max(enemy.stunned||0,duration);return true;},\n    hit(hit){return defenseResolver(hit);},\n  };\n  const combatState={weapon:'longsword',attack:null,attackKey:'',readyLock:0};\n  const PC={combatState,combatLayer:null,startCombatAttack(){return true;}};\n  const arena={stance:{id:'S26',name:'S26 Long Blade Form'},deadT:-1,dodge:{t:-1,cool:0},stamina:{v:stamina,pending:0},chain:{activeSlot:-1},charge:{active:false,queued:false,buttonHeld:false,hold:0,tier:1/3,forceTier:null},swing:{}};\n  const engine={snapshot(){return{phase};},trigger(event){catchEvents.push(event);phase='catch';return event;}};\n  const runtime=createStanceGate5Runtime({arenaHandle:{PC,arena,deck:{pool:[]},enemySystem,getPlayerForward:()=>({x:0,z:1}),roomTransition:null},windowRef:{location:{search:''},__stance2Gate4Runtime:{engine}},documentRef:null});\n  return{runtime,enemySystem,attacker,stuns,catchEvents,arena};\n}\n\n{\n  const h=makeHarness({stamina:100});\n  assert.equal(h.runtime.defenseDown('gamepad-cross').accepted,true);\n  const result=h.enemySystem.hit({damage:18,kind:'grunt',name:'Slash',dir:{x:0,z:1},sourceEnemy:h.attacker,sourceEnemyId:h.attacker.wizardStableId});\n  assert.equal(result.damage,0);\n  assert.equal(result.outcome,'deflected');\n  assert.equal(result.staggered,true);\n  assert.equal(result.staggerDuration,1.25);\n  assert.equal(h.stuns.length,1);\n  assert.equal(h.stuns[0].enemy,h.attacker);\n  assert.equal(h.stuns[0].duration,1.25);\n  assert.equal(h.stuns[0].options.kind,'parryStagger');\n  assert.ok(h.attacker.stunned>=1.25);\n  assert.ok(Math.abs(h.attacker.knockZ)>=3,'parry stagger should visibly knock the attacker backward');\n  assert.equal(h.runtime.snapshot().lastOutcome,'parried-stagger');\n  assert.equal(h.arena.stamina.v,100,'successful parry must remain free');\n  assert.equal(h.catchEvents.length,0);\n  h.runtime.destroy();\n}\n\n{\n  const h=makeHarness({stamina:100});\n  assert.equal(h.runtime.defenseDown('gamepad-cross').accepted,true);\n  h.runtime.update(.23);\n  assert.equal(h.arena.stamina.v,88,'whiffed parry should spend 12 stamina');\n  assert.equal(h.runtime.snapshot().lastParryMissCost,12);\n  assert.equal(h.runtime.snapshot().lastOutcome,'parry-whiff-cost');\n  assert.ok(h.runtime.snapshot().parryRecoveryRemaining>0);\n  assert.equal(h.catchEvents.length,0);\n  h.runtime.destroy();\n}\n\n{\n  const h=makeHarness({stamina:5});\n  assert.equal(h.runtime.defenseDown('gamepad-cross').accepted,true);\n  h.runtime.update(.23);\n  assert.equal(h.arena.stamina.v,0);\n  assert.equal(h.runtime.snapshot().lastParryMissCost,5);\n  assert.equal(h.runtime.snapshot().lastOutcome,'parry-whiff-overdraw');\n  assert.equal(h.catchEvents.length,1);\n  assert.equal(h.catchEvents[0].source,'stance-defense');\n  assert.equal(h.catchEvents[0].attackKey,'long-blade-parry-whiff');\n  assert.equal(h.catchEvents[0].requestedCost,12);\n  assert.equal(h.catchEvents[0].actualSpent,5);\n  assert.equal(h.catchEvents[0].overdrawAmount,7);\n  h.runtime.destroy();\n}\n\n{\n  const h=makeHarness({stamina:0});\n  const attempt=h.runtime.defenseDown('gamepad-cross');\n  assert.equal(attempt.accepted,false);\n  assert.equal(attempt.reason,'empty-reserve');\n  assert.equal(h.arena.stamina.v,0);\n  h.runtime.destroy();\n}\n\nconst base=readFileSync(new URL('../src/arena-enemies-base.js',import.meta.url),'utf8');\nconst visuals=readFileSync(new URL('../src/stance-gate5-visuals.js',import.meta.url),'utf8');\nassert.match(base,/sourceEnemy:e,sourceEnemyId:e\\.wizardStableId/,'melee hits must identify the attacker for parry stagger');\nassert.match(base,/sourceEnemyId:pr\\.sourceEnemyId/,'projectiles must retain their owner id');\nassert.match(visuals,/Long Blade Parry Success Ring/);\nassert.match(visuals,/Long Blade Parry Success Star/);\nassert.match(visuals,/10\\.5\\*strength/,'successful parry should use the stronger flash');\nconsole.log('Long Blade parry stagger, success flair, and whiff stamina tests passed');\n`;
write('tests/long-blade-parry-stagger.test.mjs',staggerTest);

replaceOnce(
  'docs/design/STANCE_2_GATE_5_PILOT.md',
  `- Tap defense to open a 0.22 second parry window.\n- A hit during that window is negated.\n- Missing the window creates 0.32 seconds of parry recovery.\n- The parry replaces the dodge input only while Long Blade Form is active.`,
  `- Tap defense to open a 0.22 second parry window.\n- A hit during that window is negated, costs no stamina, and heavily staggers the attacker.\n- Missing the window costs 12 stamina and creates 0.32 seconds of parry recovery.\n- A positive reserve below 12 may Overdraw on the miss and open Stance Catch; starting from zero cannot begin the parry.\n- The parry replaces the dodge input only while Long Blade Form is active.`,
  'pilot parry stamina documentation',
);

execFileSync('git',['add','src/stance-defense-profiles.js','src/stance-gate5-defense.js','tests/long-blade-parry-stagger.test.mjs','docs/design/STANCE_2_GATE_5_PILOT.md'],{stdio:'inherit'});
console.log('Long Blade parry whiff stamina patch applied');
