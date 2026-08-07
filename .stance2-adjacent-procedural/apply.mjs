import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const write=(path,content)=>{mkdirSync(path.split('/').slice(0,-1).join('/')||'.',{recursive:true});writeFileSync(path,content);};
function replaceOnce(path,before,after,label){
  const source=read(path);
  if(source.includes(after))return;
  const count=source.split(before).length-1;
  if(count!==1)throw new Error(`${path}: expected one ${label}, found ${count}`);
  write(path,source.replace(before,after));
}

const adapterModule=`// Procedural Stance 2.0 retargeting for adjacent stance/weapon weights.\n// The stance keeps its authored attack key and choreography; these transforms\n// compress or brace the sampled pose so the approved 3x3 pilot cells define HOW\n// that attack is expressed rather than WHICH attack is substituted.\n\nconst freezeDeep=value=>{\n  if(value&&typeof value==='object'){for(const child of Object.values(value))freezeDeep(child);Object.freeze(value);}\n  return value;\n};\n\nexport const STANCE_ADJACENT_ATTACK_ADAPTERS=freezeDeep({\n  'Light:Medium':{\n    id:'light-medium-choked',sourceCell:'S24:longsword',label:'CHOKED / HALF-SWORD',\n    pose:{holdLateral:.78,holdForward:.72,holdVertical:.92,holdYOffset:-.03,tipLateral:.82,tipForward:.84,tipVertical:1,lunge:.58,roll:.90,twist:.82,pitch:.90,lean:.75,hipTwist:.78,hip:.80,lower:.85,head:.90},\n    family:{\n      vertical:{holdForward:.68,lunge:.52},\n      horizontal:{holdLateral:.70,tipLateral:.74,lunge:.52},\n      stab:{holdForward:.62,tipForward:1.05,lunge:.48,twist:.72},\n    },\n  },\n  'Medium:Light':{\n    id:'medium-light-close',sourceCell:'S26:dagger',label:'CLOSE TWO-HAND / PLANTED KNIFE',\n    pose:{holdLateral:.88,holdForward:.84,holdVertical:.96,holdYOffset:-.01,tipLateral:.92,tipForward:.92,tipVertical:1,lunge:.72,roll:.94,twist:.90,pitch:.94,lean:.88,hipTwist:.88,hip:.90,lower:.94,head:.95},\n    family:{\n      vertical:{lunge:.66},\n      horizontal:{holdLateral:.82,tipLateral:.84,lunge:.64},\n      stab:{tipForward:1.03,lunge:.76},\n    },\n  },\n  'Medium:Heavy':{\n    id:'medium-heavy-half-sword',sourceCell:'S26:greatsword',label:'CHOKED GREATBLADE',\n    pose:{holdLateral:.70,holdForward:.64,holdVertical:.90,holdYOffset:-.04,tipLateral:.76,tipForward:.80,tipVertical:.98,lunge:.42,roll:.86,twist:.82,pitch:.88,lean:.82,hipTwist:.80,hip:.78,lower:.88,head:.90},\n    family:{\n      vertical:{holdForward:.60,lunge:.36},\n      horizontal:{holdLateral:.64,tipLateral:.68,lunge:.34},\n      stab:{holdForward:.58,tipForward:1.02,lunge:.44},\n    },\n  },\n  'Heavy:Medium':{\n    id:'heavy-medium-braced',sourceCell:'S01:longsword',label:'BRACED MEDIUM WEAPON',\n    pose:{holdLateral:.84,holdForward:.76,holdVertical:.96,holdYOffset:-.02,tipLateral:.88,tipForward:.88,tipVertical:1,lunge:.30,roll:.94,twist:.86,pitch:.96,lean:1.05,hipTwist:.92,hip:.88,lower:1.08,head:.96},\n    family:{\n      vertical:{holdForward:.70,lunge:.22,lean:1.08,lower:1.12},\n      horizontal:{holdLateral:.78,tipLateral:.82,lunge:.28},\n      stab:{tipForward:.98,lunge:.36},\n    },\n  },\n});\n\nconst cacheByPC=new WeakMap();\nconst number=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;\nconst pairKey=(stanceClass,weaponClass)=>String(stanceClass||'')+':'+String(weaponClass||'');\n\nexport function getStanceAttackAdapter(stanceClass,weaponClass){\n  return STANCE_ADJACENT_ATTACK_ADAPTERS[pairKey(stanceClass,weaponClass)]||null;\n}\n\nfunction mergedPoseSettings(adapter,group){\n  return {...adapter.pose,...(adapter.family?.[group]||{})};\n}\n\nexport function adaptStanceAttackPose(PC,pose,adapterOrKey,group='vertical'){\n  const adapter=typeof adapterOrKey==='string'?STANCE_ADJACENT_ATTACK_ADAPTERS[adapterOrKey]:adapterOrKey;\n  if(!adapter||!PC?.P||!pose||pose===PC.IDLE)return pose;\n  const hold=pose.hold,tip=pose.tip,hip=pose.hip,head=pose.head;\n  if(!hold||!tip||!Number.isFinite(Number(hold.x))||!Number.isFinite(Number(tip.x)))return pose;\n  const s=mergedPoseSettings(adapter,group);\n  const holdLateral=number(s.holdLateral,1),holdForward=number(s.holdForward,1),holdVertical=number(s.holdVertical,1);\n  const tipLateral=number(s.tipLateral,1),tipForward=number(s.tipForward,1),tipVertical=number(s.tipVertical,1);\n  const holdYOffset=number(s.holdYOffset,0);\n  return PC.P({\n    hold:[number(hold.x,0)*holdLateral,1+(number(hold.y,1)-1)*holdVertical+holdYOffset,number(hold.z,0)*holdForward],\n    tip:[number(tip.x,0)*tipLateral,number(tip.y,1)*tipVertical,number(tip.z,0)*tipForward],\n    roll:number(pose.roll,0)*number(s.roll,1),\n    twist:number(pose.twist,0)*number(s.twist,1),\n    pitch:number(pose.pitch,0)*number(s.pitch,1),\n    lean:number(pose.lean,0)*number(s.lean,1),\n    hipTwist:number(pose.hipTwist,0)*number(s.hipTwist,1),\n    hip:[number(hip?.x,0)*number(s.hip,1),0,number(hip?.z,0)*number(s.hip,1)],\n    lower:number(pose.lower,0)*number(s.lower,1),\n    lunge:number(pose.lunge,0)*number(s.lunge,1),\n    head:[number(head?.x,0)*number(s.head,1),number(head?.y,0)*number(s.head,1)],\n  });\n}\n\nexport function getAdaptedStanceAttack(PC,attackKey,stanceClass,weaponClass){\n  const adapter=getStanceAttackAdapter(stanceClass,weaponClass);\n  const source=PC?.ATTACKS?.[attackKey];\n  if(!adapter||!source||!Array.isArray(source.phases))return source||null;\n  let cache=cacheByPC.get(PC);\n  if(!cache){cache=new Map();cacheByPC.set(PC,cache);}\n  const key=adapter.id+':'+String(attackKey||'');\n  const existing=cache.get(key);\n  if(existing?.source===source)return existing.attack;\n  const phases=source.phases.map(phase=>({\n    ...phase,\n    pose:adaptStanceAttackPose(PC,phase.pose,adapter,source.group),\n  }));\n  const attack={\n    ...source,\n    phases,\n    meta:{...(source.meta||{}),stance2Adapted:true,stance2AdapterId:adapter.id,stance2SourceAttackKey:attackKey,stance2SourceCell:adapter.sourceCell},\n  };\n  cache.set(key,{source,attack});\n  return attack;\n}\n\nexport function withAdaptedStanceAttack(PC,attackKey,stanceClass,weaponClass,callback){\n  const source=PC?.ATTACKS?.[attackKey];\n  const adapted=getAdaptedStanceAttack(PC,attackKey,stanceClass,weaponClass);\n  if(!source||!adapted||adapted===source)return callback?.(source);\n  PC.ATTACKS[attackKey]=adapted;\n  try{return callback?.(adapted);}\n  finally{PC.ATTACKS[attackKey]=source;}\n}\n`;
write('src/stance-attack-adapters.js',adapterModule);

replaceOnce(
  'src/stance-gate2-runtime.js',
  `import { STONE_WEAPONS } from './weapons.js';`,
  `import { STONE_WEAPONS } from './weapons.js';\nimport { getStanceAttackAdapter, withAdaptedStanceAttack } from './stance-attack-adapters.js';`,
  'attack adapter import',
);
replaceOnce(
  'src/stance-gate2-runtime.js',
  `  const originalChain=BASELINE_CHAIN_BY_ID.get(stanceId)||Object.freeze([...(stance?.chain||[])]);\n  return Object.freeze({`,
  `  const originalChain=BASELINE_CHAIN_BY_ID.get(stanceId)||Object.freeze([...(stance?.chain||[])]);\n  const effectiveChain=profile?.failed&&profile?.moveKeys?profile.moveKeys:originalChain;\n  return Object.freeze({`,
  'effective chain declaration',
);
replaceOnce(
  'src/stance-gate2-runtime.js',
  `    effectiveChain:Object.freeze([...(profile?.moveKeys||originalChain)]),`,
  `    effectiveChain:Object.freeze([...effectiveChain]),`,
  'effective chain preservation',
);
replaceOnce(
  'src/stance-gate2-runtime.js',
  `    if(resolved.active&&resolved.profile?.moveKeys&&stance){\n      stance.chain=[...resolved.profile.moveKeys];`,
  `    if(resolved.active&&resolved.profile?.failed&&resolved.profile?.moveKeys&&stance){\n      stance.chain=[...resolved.profile.moveKeys];`,
  'only failures replace stance chain',
);
replaceOnce(
  'src/stance-gate2-runtime.js',
  `      failed:!!resolved.profile?.failed,\n      effectiveChain:Object.freeze([...resolved.effectiveChain]),`,
  `      failed:!!resolved.profile?.failed,\n      attackAdapterId:getStanceAttackAdapter(resolved.compatibility.stanceClass,resolved.compatibility.weaponClass)?.id||null,\n      effectiveChain:Object.freeze([...resolved.effectiveChain]),`,
  'snapshot adapter id',
);
replaceOnce(
  'src/stance-gate2-runtime.js',
  `  PC.startCombatAttack=function(key,group,...rest){\n    const resolved=apply();\n    const slot=Number(handle.arena.chain?.activeSlot);\n    const replacement=resolved.active&&resolved.profile?.moveKeys&&slot>=0?resolved.profile.moveKeys[slot]:null;\n    const resolvedKey=replacement&&PC.ATTACKS[replacement]?replacement:key;\n    const resolvedGroup=PC.ATTACKS[resolvedKey]?.group||group;\n    const result=original.startCombatAttack.call(this,resolvedKey,resolvedGroup,...rest);\n    if(resolved.profile?.failed&&handle.arena.charge){\n      handle.arena.charge.active=false;\n      handle.arena.charge.queued=false;\n      handle.arena.charge.forceTier=null;\n      PC.combatState.chargePull=0;\n    }\n    return result;\n  };`,
  `  PC.startCombatAttack=function(key,group,...rest){\n    const resolved=apply();\n    const slot=Number(handle.arena.chain?.activeSlot);\n    const replacement=resolved.active&&resolved.profile?.failed&&resolved.profile?.moveKeys&&slot>=0?resolved.profile.moveKeys[slot]:null;\n    const resolvedKey=replacement&&PC.ATTACKS[replacement]?replacement:key;\n    const invoke=()=>{\n      const resolvedGroup=PC.ATTACKS[resolvedKey]?.group||group;\n      return original.startCombatAttack.call(this,resolvedKey,resolvedGroup,...rest);\n    };\n    const adapted=resolved.active&&!resolved.profile?.failed&&resolved.compatibility.tier==='adapted'&&resolvedKey===key;\n    const result=adapted\n      ?withAdaptedStanceAttack(PC,key,resolved.compatibility.stanceClass,resolved.compatibility.weaponClass,invoke)\n      :invoke();\n    if(resolved.profile?.failed&&handle.arena.charge){\n      handle.arena.charge.active=false;\n      handle.arena.charge.queued=false;\n      handle.arena.charge.forceTier=null;\n      PC.combatState.chargePull=0;\n    }\n    return result;\n  };`,
  'procedural adapted attack startup',
);

replaceOnce(
  'tests/stance-gate2-runtime.test.mjs',
  `assert.deepEqual(resolveGate2PilotProfile({stance:stanceById('S24'),weapon:STONE_WEAPONS.longsword,weaponId:'longsword'}).effectiveChain,['vertical10','stab3','horizontal3']);`,
  `assert.deepEqual(resolveGate2PilotProfile({stance:stanceById('S24'),weapon:STONE_WEAPONS.longsword,weaponId:'longsword'}).effectiveChain,stanceById('S24').chain);`,
  'pilot adapted chain preservation',
);
replaceOnce(
  'tests/stance-gate2-runtime.test.mjs',
  `assert.deepEqual(arena.stance.chain,['vertical10','stab3','horizontal3']);`,
  `assert.deepEqual(arena.stance.chain,originalRatStep,'adjacent weight should preserve Rat Step authored attacks');`,
  'runtime adapted chain preservation',
);

replaceOnce(
  'tests/stance-class-template-rollout.test.mjs',
  `import { GATE3_FULL_CLASS_PAYOFFS, resolveGate3FullPayoff } from '../src/stance-gate3-payoffs.js';`,
  `import { GATE3_FULL_CLASS_PAYOFFS, resolveGate3FullPayoff } from '../src/stance-gate3-payoffs.js';\nimport { getAdaptedStanceAttack, getStanceAttackAdapter } from '../src/stance-attack-adapters.js';`,
  'adapter test import',
);
replaceOnce(
  'tests/stance-class-template-rollout.test.mjs',
  `    if(stanceClass===weaponClass){\n      assert.deepEqual(gate2.effectiveChain,stance.chain,\`${'${stance.id}/${weaponId}'} full expression should keep the stance-authored chain\`);\n      assert.equal(resolveGate3FullPayoff({stance,weapon,weaponId}).active,true);\n    }\n    if(stanceClass==='Light'&&weaponClass==='Heavy')assert.ok(gate2.effectiveChain.every(key=>key===GATE2_FAILURE_ATTACKS.tooHeavy));\n    if(stanceClass==='Heavy'&&weaponClass==='Light')assert.ok(gate2.effectiveChain.every(key=>key===GATE2_FAILURE_ATTACKS.tooLight));`,
  `    if(gate2.compatibility.tier!=='unusable'){\n      assert.deepEqual(gate2.effectiveChain,stance.chain,\`${'${stance.id}/${weaponId}'} full/adapted expression should keep the stance-authored chain\`);\n    }\n    if(stanceClass===weaponClass)assert.equal(resolveGate3FullPayoff({stance,weapon,weaponId}).active,true);\n    if(stanceClass==='Light'&&weaponClass==='Heavy')assert.ok(gate2.effectiveChain.every(key=>key===GATE2_FAILURE_ATTACKS.tooHeavy));\n    if(stanceClass==='Heavy'&&weaponClass==='Light')assert.ok(gate2.effectiveChain.every(key=>key===GATE2_FAILURE_ATTACKS.tooLight));`,
  'all usable pairs preserve chain',
);
replaceOnce(
  'tests/stance-class-template-rollout.test.mjs',
  `assert.deepEqual(lightMedium.effectiveChain,['vertical10','stab3','horizontal3']);`,
  `assert.deepEqual(lightMedium.effectiveChain,STANCE_CARDS.find(s=>s.id==='S23').chain);\nassert.equal(getStanceAttackAdapter('Light','Medium').sourceCell,'S24:longsword');`,
  'light medium preserves stance attacks',
);
replaceOnce(
  'tests/stance-class-template-rollout.test.mjs',
  `assert.deepEqual(mediumHeavy.effectiveChain,['vertical10','stab5','horizontal6']);`,
  `assert.deepEqual(mediumHeavy.effectiveChain,STANCE_CARDS.find(s=>s.id==='S03').chain);`,
  'medium heavy preserves stance attacks',
);

const proceduralTest=`\nconst makePose=o=>({\n  hold:{x:o.hold[0],y:o.hold[1],z:o.hold[2]},\n  tip:{x:o.tip[0],y:o.tip[1],z:o.tip[2]},\n  roll:o.roll||0,twist:o.twist||0,pitch:o.pitch||0,lean:o.lean||0,hipTwist:o.hipTwist||0,\n  hip:{x:o.hip?.[0]||0,z:o.hip?.[2]||0},lower:o.lower||0,lunge:o.lunge||0,head:{x:o.head?.[0]||0,y:o.head?.[1]||0},\n});\nconst syntheticPC={\n  IDLE:{id:'idle'},\n  P:makePose,\n  ATTACKS:{\n    stab3:{group:'stab',label:'Synthetic Thrust',phases:[{dur:.2,t0:0,t1:.2,contact:true,ease:t=>t,pose:makePose({hold:[.8,1.35,.9],tip:[.5,.2,1],twist:.7,lean:.4,hipTwist:.5,hip:[.3,0,.4],lower:.3,lunge:.8,head:[.2,.1]})}],total:.2,contactAt:.2,comboAt:0},\n  },\n};\nconst syntheticOriginal=syntheticPC.ATTACKS.stab3;\nconst syntheticAdapted=getAdaptedStanceAttack(syntheticPC,'stab3','Light','Medium');\nassert.notEqual(syntheticAdapted,syntheticOriginal);\nassert.equal(syntheticAdapted.meta.stance2SourceAttackKey,'stab3');\nassert.equal(syntheticAdapted.meta.stance2SourceCell,'S24:longsword');\nassert.ok(Math.abs(syntheticAdapted.phases[0].pose.hold.x)<Math.abs(syntheticOriginal.phases[0].pose.hold.x),'choked adapter should pull the attack path inward');\nassert.ok(syntheticAdapted.phases[0].pose.lunge<syntheticOriginal.phases[0].pose.lunge,'choked adapter should reduce lunge without replacing the attack');\nassert.equal(getAdaptedStanceAttack(syntheticPC,'stab3','Light','Light'),syntheticOriginal,'same-class attack should not be retargeted');\n`;
replaceOnce(
  'tests/stance-class-template-rollout.test.mjs',
  `console.log(\`Stance 2 class-template rollout tests passed across \${checked} stance/weapon pairs.\`);`,
  `${proceduralTest}\nconsole.log(\`Stance 2 class-template rollout tests passed across \${checked} stance/weapon pairs with adjacent procedural retargeting.\`);`,
  'procedural adapter test block',
);

replaceOnce(
  'docs/design/STANCE_2_CLASS_TEMPLATE.md',
  `The nine pilot cells remain the source data. Same-class cells keep each stance's authored three-move chain. Adapted cells use the approved alternate chain, grip, pacing, reach, damage, stagger, and movement profile from their source pilot cell. Light + Heavy and Heavy + Light use the approved failed-use attacks. Matched Light, Medium, and Heavy pairs also inherit the corresponding Gate 3 payoff.`,
  `The nine pilot cells remain the source data, but they define expression rather than replacing stance identity. Same-class and adjacent-weight cells keep each stance's authored three-move chain. Adjacent cells procedurally retarget those same attacks using the source pilot cell's grip concept, pacing, reach, damage, stagger, cleave, movement/recovery behavior, and a cached pose adapter that compresses or braces hold position, tip trajectory, lunge, and body commitment by attack family. Light + Heavy and Heavy + Light alone replace the stance chain with the approved failed-use attacks. Matched Light, Medium, and Heavy pairs also inherit the corresponding Gate 3 payoff.`,
  'class template design correction',
);

console.log('Stance 2 adjacent procedural retarget patch applied');
