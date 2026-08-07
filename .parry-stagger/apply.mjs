import { readFileSync, writeFileSync } from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const write=(path,content)=>writeFileSync(path,content);
function replaceOnce(path,before,after,label){
  const source=read(path);
  if(source.includes(after))return false;
  const count=source.split(before).length-1;
  if(count!==1)throw new Error(`${path}: expected one ${label}, found ${count}`);
  write(path,source.replace(before,after));
  return true;
}

replaceOnce(
  'src/stance-defense-profiles.js',
  `    successFlash:.34,\n    summary:'Tap defense for a short sword-parry window. A miss creates brief recovery.',`,
  `    successFlash:.34,\n    parryStaggerDuration:1.25,\n    summary:'Tap defense for a short sword-parry window. A success deflects the hit and heavily staggers the attacker.',`,
  'Long Blade stagger tuning',
);

replaceOnce(
  'src/arena-enemies-base.js',
  `        factionService.damageTarget(p,e.attack.damage,e.facing,{sourceEnemyId:e.wizardStableId,sourceFaction:e.wizardFaction,attack:e.attack.name},\n          (damage,dir)=>hitPlayer(damage,e.kind,e.attack.name,dir));\n      }else hitPlayer(e.attack.damage, e.kind, e.attack.name, e.facing);`,
  `        factionService.damageTarget(p,e.attack.damage,e.facing,{sourceEnemyId:e.wizardStableId,sourceFaction:e.wizardFaction,attack:e.attack.name},\n          (damage,dir)=>hitPlayer(damage,e.kind,e.attack.name,dir,{sourceEnemy:e,sourceEnemyId:e.wizardStableId}));\n      }else hitPlayer(e.attack.damage, e.kind, e.attack.name, e.facing,{sourceEnemy:e,sourceEnemyId:e.wizardStableId});`,
  'melee attacker metadata',
);
replaceOnce(
  'src/arena-enemies-base.js',
  `  function hitPlayer(dmg, kind, name, dir = null, {ignoreInvulnerability=false} = {}){`,
  `  function hitPlayer(dmg, kind, name, dir = null, {ignoreInvulnerability=false,sourceEnemy=null,sourceEnemyId=null} = {}){`,
  'hitPlayer source signature',
);
replaceOnce(
  'src/arena-enemies-base.js',
  `      const intercepted=playerDamageInterceptor({damage:requested,kind,name,dir:dir?{x:dir.x,z:dir.z}:null,playerHp:tuning.playerHp});`,
  `      const intercepted=playerDamageInterceptor({\n        damage:requested,kind,name,dir:dir?{x:dir.x,z:dir.z}:null,playerHp:tuning.playerHp,\n        sourceEnemy,sourceEnemyId:String(sourceEnemyId||sourceEnemy?.wizardStableId||'')||null,\n      });`,
  'damage interceptor attacker metadata',
);
replaceOnce(
  'src/arena-enemies-base.js',
  `          (damage,dir)=>hitPlayer(damage,'rock','Rock Throw',dir));pr.life=0;`,
  `          (damage,dir)=>hitPlayer(damage,'rock','Rock Throw',dir,{sourceEnemyId:pr.sourceEnemyId}));pr.life=0;`,
  'projectile faction source metadata',
);
replaceOnce(
  'src/arena-enemies-base.js',
  `        hitPlayer(pr.damage, 'rock', 'Rock Throw', norm(pr.vx, pr.vz)); pr.life = 0;`,
  `        hitPlayer(pr.damage, 'rock', 'Rock Throw', norm(pr.vx, pr.vz),{sourceEnemyId:pr.sourceEnemyId}); pr.life = 0;`,
  'projectile source metadata',
);

replaceOnce(
  'src/stance-gate5-defense.js',
  `  function authoritativeForward(){\n    const value=handle.getPlayerForward?.()||handle.playerForward?.();\n    const x=Number(value?.x??value?.forwardX),z=Number(value?.z??value?.forwardZ),length=Math.hypot(x,z);\n    return length>EPSILON?{x:x/length,z:z/length}:{x:0,z:1};\n  }\n  function resetTransient(reason='stance-change'){`,
  `  function authoritativeForward(){\n    const value=handle.getPlayerForward?.()||handle.playerForward?.();\n    const x=Number(value?.x??value?.forwardX),z=Number(value?.z??value?.forwardZ),length=Math.hypot(x,z);\n    return length>EPSILON?{x:x/length,z:z/length}:{x:0,z:1};\n  }\n  function resolveParryAttacker(hit={}){\n    if(hit?.sourceEnemy&&Number(hit.sourceEnemy.hp)>0)return hit.sourceEnemy;\n    const sourceId=String(hit?.sourceEnemyId||'');\n    if(!sourceId)return null;\n    return (enemySystem.enemies||[]).find(enemy=>\n      Number(enemy?.hp)>0&&(String(enemy?.wizardStableId||'')===sourceId||String(enemy?.id||'')===sourceId)\n    )||null;\n  }\n  function addParryImpactReaction(enemy,dir){\n    if(!enemy)return;\n    const dx=Number(dir?.x)||0,dz=Number(dir?.z)||0,length=Math.hypot(dx,dz)||1;\n    enemy.knockX=(Number(enemy.knockX)||0)-dx/length*3.4;\n    enemy.knockZ=(Number(enemy.knockZ)||0)-dz/length*3.4;\n    if('flash' in enemy)enemy.flash=Math.max(Number(enemy.flash)||0,.34);\n    if('squash' in enemy)enemy.squash=Math.max(Number(enemy.squash)||0,.72);\n    if('squashT' in enemy)enemy.squashT=Math.max(Number(enemy.squashT)||0,.28);\n    if('squashMax' in enemy)enemy.squashMax=Math.max(Number(enemy.squashMax)||0,.28);\n  }\n  function resetTransient(reason='stance-change'){`,
  'parry attacker resolver',
);
replaceOnce(
  'src/stance-gate5-defense.js',
  `    if(profile?.kind==='parry'&&state.parryRemaining>0){\n      state.parryRemaining=0;state.parryRecoveryRemaining=.14;state.parrySuccessRemaining=profile.successFlash;\n      state.lastOutcome='parried';visuals.pulse('parry-success');publish();return{...hit,damage:0,outcome:'deflected'};\n    }`,
  `    if(profile?.kind==='parry'&&state.parryRemaining>0){\n      state.parryRemaining=0;state.parryRecoveryRemaining=.14;state.parrySuccessRemaining=profile.successFlash;\n      const attacker=resolveParryAttacker(hit);\n      const staggerDuration=Math.max(0,Number(profile.parryStaggerDuration)||0);\n      const staggered=!!attacker&&staggerDuration>0&&enemySystem.stunEnemy?.(attacker,staggerDuration,{kind:'parryStagger'})!==false;\n      if(staggered)addParryImpactReaction(attacker,hit.dir);\n      state.lastOutcome=staggered?'parried-stagger':'parried';\n      visuals.pulse('parry-success');publish();\n      return{...hit,damage:0,outcome:'deflected',staggered,staggerDuration:staggered?staggerDuration:0};\n    }`,
  'parry stagger resolution',
);

replaceOnce(
  'src/stance-gate5-visuals.js',
  `      const burst=new THREE.Mesh(burstGeometry,burstMaterial);burst.name='Long Blade Parry Burst';burst.position.set(0,1.25,.24);burst.visible=false;root.add(burst);\n      const flashLight=new THREE.PointLight(0xbcecff,0,7,2);flashLight.position.set(0,1.9,.4);root.add(flashLight);`,
  `      const burst=new THREE.Mesh(burstGeometry,burstMaterial);burst.name='Long Blade Parry Burst';burst.position.set(0,1.25,.24);burst.visible=false;root.add(burst);\n      const successRingGeometry=new THREE.RingGeometry(.58,.76,52);\n      const successRingMaterial=new THREE.MeshBasicMaterial({color:0xfff0aa,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});\n      const successRing=new THREE.Mesh(successRingGeometry,successRingMaterial);successRing.name='Long Blade Parry Success Ring';successRing.rotation.x=-Math.PI/2;successRing.position.y=.38;successRing.visible=false;root.add(successRing);\n      const starPoints=[];\n      for(let i=0;i<8;i++){const a=i*Math.PI/4,c=Math.cos(a),s=Math.sin(a);starPoints.push(new THREE.Vector3(c*.34,0,s*.34),new THREE.Vector3(c*1.22,0,s*1.22));}\n      const successStarGeometry=new THREE.BufferGeometry().setFromPoints(starPoints);\n      const successStarMaterial=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});\n      const successStar=new THREE.LineSegments(successStarGeometry,successStarMaterial);successStar.name='Long Blade Parry Success Star';successStar.position.y=.62;successStar.visible=false;root.add(successStar);\n      const flashLight=new THREE.PointLight(0xbcecff,0,7,2);flashLight.position.set(0,1.9,.4);root.add(flashLight);`,
  'parry success flair geometry',
);
replaceOnce(
  'src/stance-gate5-visuals.js',
  `        parry,parryMaterial,burst,burstGeometry,burstMaterial,flashLight,\n        pulseT:0,pulseDuration:.24,burstT:0,burstDuration:.18,burstSuccess:false,`,
  `        parry,parryMaterial,burst,burstGeometry,burstMaterial,\n        successRing,successRingGeometry,successRingMaterial,successStar,successStarGeometry,successStarMaterial,flashLight,\n        pulseT:0,pulseDuration:.24,burstT:0,burstDuration:.18,burstSuccess:false,`,
  'parry success flair state',
);
replaceOnce(
  'src/stance-gate5-visuals.js',
  `      visual.burst.scale.setScalar(parrySuccess?.48:.30);\n      visual.burst.visible=true;\n    }`,
  `      visual.burst.scale.setScalar(parrySuccess?.48:.30);\n      visual.burst.visible=true;\n      if(parrySuccess){\n        visual.successRing.scale.setScalar(.62);visual.successRingMaterial.opacity=1;visual.successRing.visible=true;\n        visual.successStar.scale.setScalar(.72);visual.successStarMaterial.opacity=1;visual.successStar.visible=true;\n      }\n    }`,
  'parry success flair pulse',
);
replaceOnce(
  'src/stance-gate5-visuals.js',
  `      visual.burst.rotation.y+=frameDt*(visual.burstSuccess?8:5);\n    }else{\n      visual.burst.visible=false;visual.burstMaterial.opacity=0;\n    }`,
  `      visual.burst.rotation.y+=frameDt*(visual.burstSuccess?8:5);\n      if(visual.burstSuccess){\n        visual.successRing.visible=true;\n        visual.successRing.scale.setScalar(.62+3.25*expansion);\n        visual.successRingMaterial.opacity=.96*Math.pow(strength,1.35);\n        visual.successStar.visible=true;\n        visual.successStar.scale.setScalar(.72+1.95*expansion);\n        visual.successStar.rotation.y+=frameDt*10;\n        visual.successStarMaterial.opacity=.92*strength*strength;\n        visual.flashLight.intensity=Math.max(visual.flashLight.intensity,10.5*strength);\n      }\n    }else{\n      visual.burst.visible=false;visual.burstMaterial.opacity=0;\n      visual.successRing.visible=false;visual.successRingMaterial.opacity=0;\n      visual.successStar.visible=false;visual.successStarMaterial.opacity=0;\n    }`,
  'parry success flair animation',
);
replaceOnce(
  'src/stance-gate5-visuals.js',
  `    visual.boardGeometry.dispose();visual.rimGeometry.dispose();visual.parry.geometry.dispose();visual.burstGeometry.dispose();visual.boss.geometry.dispose();\n    visual.boardMaterial.dispose();visual.rimMaterial.dispose();visual.parryMaterial.dispose();visual.burstMaterial.dispose();visual.boss.material.dispose();visual=null;`,
  `    visual.boardGeometry.dispose();visual.rimGeometry.dispose();visual.parry.geometry.dispose();visual.burstGeometry.dispose();visual.successRingGeometry.dispose();visual.successStarGeometry.dispose();visual.boss.geometry.dispose();\n    visual.boardMaterial.dispose();visual.rimMaterial.dispose();visual.parryMaterial.dispose();visual.burstMaterial.dispose();visual.successRingMaterial.dispose();visual.successStarMaterial.dispose();visual.boss.material.dispose();visual=null;`,
  'parry success flair disposal',
);

write('tests/long-blade-parry-stagger.test.mjs',`import assert from 'node:assert/strict';\nimport { readFileSync } from 'node:fs';\nimport { createStanceGate5Runtime } from '../src/stance-gate5-defense.js';\n\nconst attacker={id:7,wizardStableId:'original:0007',hp:45,knockX:0,knockZ:0,flash:0,squash:0,squashT:0,squashMax:0};\nlet defenseResolver=hit=>hit;\nconst stuns=[];\nconst enemySystem={\n  enemies:[attacker],\n  setPlayerDefenseResolver(resolver){defenseResolver=typeof resolver==='function'?resolver:(hit=>hit);return true;},\n  stunEnemy(enemy,duration,options){stuns.push({enemy,duration,options});enemy.stunned=Math.max(enemy.stunned||0,duration);return true;},\n  hit(hit){return defenseResolver(hit);},\n};\nconst combatState={weapon:'longsword',attack:null,attackKey:'',readyLock:0};\nconst PC={combatState,combatLayer:null,startCombatAttack(){return true;}};\nconst arena={stance:{id:'S26',name:'S26 Long Blade Form'},deadT:-1,dodge:{t:-1,cool:0},stamina:{v:100,pending:0},chain:{activeSlot:-1},charge:{active:false,queued:false,buttonHeld:false,hold:0,tier:1/3,forceTier:null},swing:{}};\nconst runtime=createStanceGate5Runtime({arenaHandle:{PC,arena,deck:{pool:[]},enemySystem,getPlayerForward:()=>({x:0,z:1}),roomTransition:null},windowRef:{location:{search:''},__stance2Gate4Runtime:null},documentRef:null});\n\nassert.equal(runtime.defenseDown('gamepad-cross').accepted,true);\nconst result=enemySystem.hit({damage:18,kind:'grunt',name:'Slash',dir:{x:0,z:1},sourceEnemy:attacker,sourceEnemyId:attacker.wizardStableId});\nassert.equal(result.damage,0);\nassert.equal(result.outcome,'deflected');\nassert.equal(result.staggered,true);\nassert.equal(result.staggerDuration,1.25);\nassert.equal(stuns.length,1);\nassert.equal(stuns[0].enemy,attacker);\nassert.equal(stuns[0].duration,1.25);\nassert.equal(stuns[0].options.kind,'parryStagger');\nassert.ok(attacker.stunned>=1.25);\nassert.ok(Math.abs(attacker.knockZ)>=3,'parry stagger should visibly knock the attacker backward');\nassert.equal(runtime.snapshot().lastOutcome,'parried-stagger');\nruntime.destroy();\n\nconst base=readFileSync(new URL('../src/arena-enemies-base.js',import.meta.url),'utf8');\nconst visuals=readFileSync(new URL('../src/stance-gate5-visuals.js',import.meta.url),'utf8');\nassert.match(base,/sourceEnemy:e,sourceEnemyId:e\\.wizardStableId/,'melee hits must identify the attacker for parry stagger');\nassert.match(base,/sourceEnemyId:pr\\.sourceEnemyId/,'projectiles must retain their owner id');\nassert.match(visuals,/Long Blade Parry Success Ring/);\nassert.match(visuals,/Long Blade Parry Success Star/);\nassert.match(visuals,/10\\.5\\*strength/,'successful parry should use the stronger flash');\nconsole.log('Long Blade parry stagger and success flair tests passed');\n`);

const pkg=JSON.parse(read('package.json'));
const command='node tests/long-blade-parry-stagger.test.mjs';
if(!pkg.scripts['test:combat'].includes(command))pkg.scripts['test:combat']+=` && ${command}`;
write('package.json',JSON.stringify(pkg,null,2)+'\n');

const pilotPath='docs/design/STANCE_2_GATE_5_PILOT.md';
let pilot=read(pilotPath);
if(!pilot.includes('1.25 second stagger')){
  pilot=pilot.replace(
    '- A hit during that window is negated.\n',
    '- A hit during that window is negated.\n- A successful parry inflicts a significant 1.25 second stagger on the attacking enemy, cancelling its attack and creating a real punish window.\n- The success cue adds a brighter white-gold expanding ring and eight-spoke burst on top of the existing confirmation pop.\n',
  );
  write(pilotPath,pilot);
}

console.log('Parry stagger and success flair patch applied');
