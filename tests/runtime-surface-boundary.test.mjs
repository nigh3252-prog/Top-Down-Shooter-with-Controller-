import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=path=>readFileSync(join(root,path),'utf8');
const arena=read('combat-arena.html'),lab=read('enemy-lab.html'),runtime=read('src/arena-runtime.js'),renderer=read('src/hex-maze-renderer.js'),shell=read('src/arena-shell.js'),antelope=read('src/arena-enemies-antelope.js'),shellCss=read('src/arena-shell.css');
const playerCombat=read('src/player-combat.js'),pilebunker=read('src/player-combat-pilebunker.js');
const rootPages=readdirSync(root,{withFileTypes:true}).filter(entry=>entry.isFile()&&extname(entry.name)==='.html').map(entry=>entry.name).sort();
assert.deepEqual(rootPages,['combat-arena.html','enemy-lab.html','index.html']);

for(const [name,page] of [['Combat Arena',arena],['Enemy Lab',lab]]){
  assert.match(page,/createArenaRuntime\(\{\s*config/ ,`${name} creates the shared runtime`);
  assert.doesNotMatch(page,/<iframe|contentWindow|contentDocument|window\.parent|frameElement/,`${name} has no cross-document runtime`);
  const boot=page.indexOf('dataset.arenaTheme'),shell=page.indexOf('arena-shell.css');
  assert.ok(boot>=0&&shell>boot,`${name} resolves theme before stylesheet paint`);
  for(const id of ['neutral','original','akai'])assert.match(page,new RegExp(`arena-theme-${id}\\.css`));
}

const activeSource=[arena,lab,...readdirSync(join(root,'src')).filter(name=>name.endsWith('.js')).map(name=>read(`src/${name}`))].join('\n');
assert.doesNotMatch(activeSource,/contentWindow|contentDocument|window\.parent|globalThis\.parent|frameElement/);
assert.doesNotMatch(`${arena}\n${runtime}`,/window\.__arena\b|__enemyLabControlBridge|window\.__hitFeel|__dashMagicJet|history\.replaceState/);
assert.match(lab,/runtime\.subscribe\(/);
assert.match(lab,/runtime\.getSnapshot\(\)/);
assert.doesNotMatch(lab,/requestAnimationFrame\(poll\)/);
assert.doesNotMatch(renderer,/installAkaiInterfaceStyle\(\)|installAkaiCompactInterface\(\)/);
assert.match(renderer,/applyArenaThemeWorldStyle/);
assert.match(shell,/VISUAL STYLE/);
for(const id of ['neutral','original','akai'])assert.match(shell,new RegExp(`data-arena-theme-option="${id}"`));
assert.match(shell,/id="resumeBtn"/);
assert.match(shell,/id="resetBtn"[^>]*hidden/);
assert.doesNotMatch(shell,/id="(?:weaponBtn|stanceBtn|modeGrid|dirSliders|feelSliders|testBtn)"/);
assert.doesNotMatch(shell,/ENCOUNTER DIRECTOR|COMBO TIMING|<[^>]+>SIM<|<[^>]+>FEEL</);
assert.match(runtime,/selectArenaTheme\(id,\{storage,location\}\)/);
assert.match(runtime,/createArenaEnemySystem\(\{\s*THREE, worldRoot, controlRegistry/);
assert.match(runtime,/\{id:'visuals',label:'VISUALS',source/);
assert.match(runtime,/id:`visuals\.\$\{option\.id\}`/);
assert.match(runtime,/invoke:\(\)=>selectArenaThemeFromMenu\(option\.id\)/);
for(const id of ['neutral','original','akai'])assert.match(runtime,new RegExp(`\\{id:'${id}',label:'${id.toUpperCase()}'\\}`));
assert.match(runtime,/loadout\.weapon/);
assert.match(runtime,/loadout\.stance/);
assert.match(runtime,/if\(e\.key==='x'\) cycleWeapon\(\)/);
assert.match(runtime,/weaponPrev.*cycleWeapon\(-1\)/);
assert.match(runtime,/installRoadieRun\(\)/);
assert.match(lab,/menuButton\.style\.display='none'/);
assert.match(lab,/data\.controlGroups\|\|\[\]/);
assert.doesNotMatch(lab,/function renderTools\(\)[\s\S]*?FULLSCREEN/);
assert.doesNotMatch(shellCss,/data-arena-mode="enemy-lab" #topBar/);
assert.match(shellCss,/data-arena-mode="enemy-lab"\]\s*#menuBtn/);
assert.match(antelope,/controlRegistry\?\.register\?\./);
assert.match(antelope,/id:'antelope\.charge-speed'/);
assert.match(antelope,/min:CHARGE_SPEED_MIN[\s\S]*max:CHARGE_SPEED_MAX[\s\S]*step:CHARGE_SPEED_STEP/);
assert.doesNotMatch(antelope,/document\.|getElementById|createElement|installAntelopeTuningControl|antelopeTuningHeader/);
assert.match(lab,/control\.kind==='range'/);
assert.match(shellCss,/data-arena-theme="akai"[\s\S]*#akaiRoomPlaque/);
assert.doesNotMatch(runtime,/buildTuningPanel\(|installDashJetPanel\(|installMazeRuntimeControls\(|\.installPanel\(\)/);
for(const source of [playerCombat,pilebunker]){
  assert.match(source,/getArenaRuntimeConfig\(\)\?\.mode/);
  assert.match(source,/runtimeMode==='enemy-lab'/);
}

console.log('Same-document Arena/Lab boundary, static theme boot, and supported root surfaces: ok');
