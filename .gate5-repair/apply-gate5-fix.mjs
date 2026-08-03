#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const bundleDir=dirname(fileURLToPath(import.meta.url));
const repoArg=process.argv.find(arg=>arg.startsWith('--repo='));
const repo=resolve(repoArg?repoArg.slice('--repo='.length):process.cwd());
const skipTests=process.argv.includes('--no-test');

function pathInRepo(relative){return join(repo,relative);}
function read(relative){return readFileSync(pathInRepo(relative),'utf8');}
function write(relative,content){writeFileSync(pathInRepo(relative),content);}
function replacement(relative){return readFileSync(join(bundleDir,'replacements',relative),'utf8');}

function replaceOnce(relative,before,after,label){
  const current=read(relative);
  if(current.includes(after))return false;
  const first=current.indexOf(before);
  if(first<0)throw new Error(`${relative}: could not find ${label}`);
  if(current.indexOf(before,first+before.length)>=0)throw new Error(`${relative}: ${label} was not unique`);
  write(relative,current.slice(0,first)+after+current.slice(first+before.length));
  return true;
}

function installReplacement(relative,{guard=null,newFile=false}={}){
  const target=pathInRepo(relative);
  const next=replacement(relative);
  if(existsSync(target)){
    const current=readFileSync(target,'utf8');
    if(current===next)return false;
    if(newFile)throw new Error(`${relative}: file already exists with different content`);
    if(guard&&!guard.test(current))throw new Error(`${relative}: branch no longer matches the expected Gate 5 pilot`);
  }else if(!newFile){
    throw new Error(`${relative}: expected file is missing`);
  }
  writeFileSync(target,next);
  return true;
}

const expectedHead='33b54772764c1670e2728e6ebda0592ab51221e0';
const head=spawnSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'});
if(head.status!==0)throw new Error(`Not a Git checkout: ${repo}`);
if(head.stdout.trim()!==expectedHead){
  console.warn(`[gate5-fix] expected ${expectedHead}, found ${head.stdout.trim()}; guarded replacements will decide whether the patch is still compatible.`);
}

installReplacement('src/player-damage-interceptors.js',{newFile:true});
installReplacement('src/stance-defense-damage-pipeline.js',{guard:/setArenaEnemySource/});
installReplacement('src/stance-gate5-defense.js',{guard:/const DODGE_LOCK=Number\.POSITIVE_INFINITY/});
installReplacement('tests/player-damage-interceptors.test.mjs',{newFile:true});
installReplacement('tests/stance-gate5-defense.test.mjs',{guard:/Long Blade replaces the dodge input with parry/});
installReplacement('tests/stance-gate5-input-seam.test.mjs',{newFile:true});

replaceOnce(
  'src/arena-enemies-core.js',
  "import { ARENA_FACTIONS, createArenaFactionService } from './arena-faction-service.js';\nexport { ARENA_ENEMY_ARCHETYPES };",
  "import { ARENA_FACTIONS, createArenaFactionService } from './arena-faction-service.js';\nimport { createPlayerDamageInterceptorStack } from './player-damage-interceptors.js';\nexport { ARENA_ENEMY_ARCHETYPES };",
  'player-damage interceptor import',
);
replaceOnce(
  'src/arena-enemies-core.js',
  "  const systemsByKey={original,flare,hades};\n  const systems=Object.values(systemsByKey);\n  for(const [key,system] of Object.entries(systemsByKey))factionService.registerEnemySystem(key,system);",
  "  const systemsByKey={original,flare,hades};\n  const systems=Object.values(systemsByKey);\n  const playerDamageInterceptors=createPlayerDamageInterceptorStack({\n    apply(interceptor){for(const system of systems)system.setPlayerDamageInterceptor?.(interceptor);},\n  });\n  for(const [key,system] of Object.entries(systemsByKey))factionService.registerEnemySystem(key,system);",
  'stable player-damage stack initialization',
);
replaceOnce(
  'src/arena-enemies-core.js',
  "  function setPlayerDamageInterceptor(interceptor){for(const system of systems)system.setPlayerDamageInterceptor?.(interceptor);}",
  "  function setPlayerDamageInterceptor(interceptor){playerDamageInterceptors.setLegacy(interceptor);}\n  function registerPlayerDamageInterceptor(id,interceptor,priority=0){return playerDamageInterceptors.register(id,interceptor,priority);}\n  function unregisterPlayerDamageInterceptor(id){return playerDamageInterceptors.unregister(id);}",
  'composable player-damage API implementation',
);
replaceOnce(
  'src/arena-enemies-core.js',
  "    update,damageEnemy,moveEnemy,moveEnemyResolved,damagePlayer,setPlayerDamageInterceptor,applyStatus,stunEnemy,registerWizardDecoy,unregisterWizardDecoy,consumeWizardDecoyAttacks,",
  "    update,damageEnemy,moveEnemy,moveEnemyResolved,damagePlayer,setPlayerDamageInterceptor,registerPlayerDamageInterceptor,unregisterPlayerDamageInterceptor,applyStatus,stunEnemy,registerWizardDecoy,unregisterWizardDecoy,consumeWizardDecoyAttacks,",
  'composable player-damage API export',
);

replaceOnce(
  'combat-arena.html',
  "  CombatAudio.playTest('swingLight');\n}\n/* ---------- hits: swept weapon zones vs enemies ---------- */",
  "  CombatAudio.playTest('swingLight');\n}\nfunction defenseDown(source='input'){\n  const result = window.__stance2Gate5Runtime?.defenseDown?.(source);\n  if(result?.handled) return result;\n  triggerDodge();\n  return { handled:true, delegated:true, source };\n}\nfunction defenseUp(source='input'){\n  const result = window.__stance2Gate5Runtime?.defenseUp?.(source);\n  return result || { handled:false, delegated:true, source };\n}\n/* ---------- hits: swept weapon zones vs enemies ---------- */",
  'shared defense seam',
);
replaceOnce(
  'combat-arena.html',
  "  if(e.key==='k') triggerDodge();",
  "  if(e.key==='k') defenseDown('keyboard');",
  'keyboard defense-down routing',
);
replaceOnce(
  'combat-arena.html',
  "  if(e.key==='l') heavyUp();\n  if(e.key.toLowerCase()==='q') PC.releaseArcanaInput?.({slot:0,source:'keyboard'});",
  "  if(e.key==='l') heavyUp();\n  if(e.key==='k') defenseUp('keyboard');\n  if(e.key.toLowerCase()==='q') PC.releaseArcanaInput?.({slot:0,source:'keyboard'});",
  'keyboard defense-up routing',
);
replaceOnce(
  'combat-arena.html',
  "  if(dge && !padPrev.dge) triggerDodge();\n  if(shuffle && !padPrev.shuffle) startDeckShuffle();",
  "  if(dge && !padPrev.dge) defenseDown('gamepad');\n  if(!dge && padPrev.dge) defenseUp('gamepad');\n  if(shuffle && !padPrev.shuffle) startDeckShuffle();",
  'gamepad defense routing',
);
replaceOnce(
  'combat-arena.html',
  "  lightDown, heavyDown, attackDown, attackUp, triggerDodge, cycleWeapon, cycleStance, beginTestSwing, setCombatInputMode,",
  "  lightDown, heavyDown, attackDown, attackUp, defenseDown, defenseUp, triggerDodge, cycleWeapon, cycleStance, beginTestSwing, setCombatInputMode,",
  'defense seam console handle',
);

replaceOnce(
  'docs/design/STANCE_2_GATE_5_PILOT.md',
  "## Damage pipeline\n\nGate 5 publishes a proxy through the branch-local enemy registry. The proxy composes stance defense before the existing Arcana damage interceptor instead of replacing it.",
  "## Input routing\n\nCombat Arena owns the defense button edge. K and Cross / LT call one `defenseDown()` seam. Long Blade and Hammerfall consume that input; Rat Step and non-pilot stances fall through to the unchanged `triggerDodge()` implementation. Gate 5 does not add keyboard listeners, start a second gamepad loop, or manipulate the built-in dodge cooldown.\n\n## Damage pipeline\n\nThe existing arena enemy-system object keeps a stable identity. It exposes a prioritized registered-interceptor API for stance defense while preserving `setPlayerDamageInterceptor()` as the legacy Arcana slot. No proxy is published through the enemy registry, and `damageEnemy()` is never repatched by Gate 5.",
  'Gate 5 architecture documentation',
);

replaceOnce(
  'package.json',
  'node tests/stance-defense-profiles.test.mjs && node tests/stance-gate5-defense.test.mjs',
  'node tests/stance-defense-profiles.test.mjs && node tests/player-damage-interceptors.test.mjs && node tests/stance-gate5-defense.test.mjs && node tests/stance-gate5-input-seam.test.mjs',
  'Gate 5 regression test command',
);

const diffCheck=spawnSync('git',['diff','--check'],{cwd:repo,stdio:'inherit'});
if(diffCheck.status!==0)process.exit(diffCheck.status??1);

if(!skipTests){
  for(const test of [
    'tests/stance-defense-profiles.test.mjs',
    'tests/player-damage-interceptors.test.mjs',
    'tests/stance-gate5-defense.test.mjs',
    'tests/stance-gate5-input-seam.test.mjs',
  ]){
    const result=spawnSync(process.execPath,[test],{cwd:repo,stdio:'inherit'});
    if(result.status!==0)process.exit(result.status??1);
  }
}

console.log('[gate5-fix] applied cleanly. Review with: git diff --stat && git diff');
