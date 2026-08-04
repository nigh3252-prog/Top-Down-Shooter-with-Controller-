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
  'src/arena-enemies-core.js',
  "import { createPlayerDamageInterceptorStack } from './player-damage-interceptors.js';",
  "import { createPlayerDamageInterceptorStack } from './player-damage-interceptors.js';\nimport { createPlayerDamageRoute } from './player-damage-route.js';",
  'player damage route import',
);
replaceOnce(
  'src/arena-enemies-core.js',
  `  const playerDamageInterceptors=createPlayerDamageInterceptorStack({
    apply(interceptor){for(const system of systems)system.setPlayerDamageInterceptor?.(interceptor);},
  });`,
  `  const playerDamageRoute=createPlayerDamageRoute({
    apply(route){for(const system of systems)system.setPlayerDamageInterceptor?.(route);},
  });
  const playerDamageInterceptors=createPlayerDamageInterceptorStack({
    apply(interceptor){playerDamageRoute.setExternalInterceptor(interceptor);},
  });`,
  'built-in player damage route',
);
replaceOnce(
  'src/arena-enemies-core.js',
  `  function setPlayerDamageInterceptor(interceptor){playerDamageInterceptors.setLegacy(interceptor);}
  function registerPlayerDamageInterceptor(id,interceptor,priority=0){return playerDamageInterceptors.register(id,interceptor,priority);}`,
  `  function setPlayerDefenseResolver(resolver){return playerDamageRoute.setDefenseResolver(resolver);}
  function setPlayerDamageInterceptor(interceptor){playerDamageInterceptors.setLegacy(interceptor);}
  function registerPlayerDamageInterceptor(id,interceptor,priority=0){return playerDamageInterceptors.register(id,interceptor,priority);}`,
  'defense resolver API',
);
replaceOnce(
  'src/arena-enemies-core.js',
  'update,damageEnemy,moveEnemy,moveEnemyResolved,damagePlayer,setPlayerDamageInterceptor,registerPlayerDamageInterceptor,unregisterPlayerDamageInterceptor,applyStatus',
  'update,damageEnemy,moveEnemy,moveEnemyResolved,damagePlayer,setPlayerDefenseResolver,setPlayerDamageInterceptor,registerPlayerDamageInterceptor,unregisterPlayerDamageInterceptor,applyStatus',
  'defense resolver export',
);

replaceOnce(
  'src/weapon-balance.js',
  `    const gate5=await import('./stance-gate5-defense.js');
    gate5.installStanceGate5Runtime({windowRef:window});
`,
  '',
  'delayed Gate 5 boot',
);

replaceOnce(
  'combat-arena.html',
  "import { isHammerfallDefenseStance } from './src/stance-defense-profiles.js';",
  "import { createStanceGate5Runtime } from './src/stance-gate5-defense.js';\nimport { readPlayStationBackboneInput } from './src/playstation-backbone-input.js';",
  'defense imports',
);
replaceOnce(
  'combat-arena.html',
  `});

function beginRoomTransition(doorTarget, toRoomId){`,
  `});

const defenseController=createStanceGate5Runtime({
  arenaHandle:{
    PC,arena,deck,enemySystem,actorPos,
    get roomTransition(){return roomTransition;},
    getPlayerForward(){return{x:Math.sin(actorFacing),z:Math.cos(actorFacing)};},
  },
  windowRef:window,documentRef:document,
});
window.__arenaDefenseController=defenseController;

function beginRoomTransition(doorTarget, toRoomId){`,
  'synchronous defense controller creation',
);
replaceOnce(
  'combat-arena.html',
  `  arena.stance = pool[arena.stanceIndex];
  PC.setReadyPose(guardPoseFor(arena.stance));`,
  `  arena.stance = pool[arena.stanceIndex];
  defenseController?.syncStance?.();
  PC.setReadyPose(guardPoseFor(arena.stance));`,
  'stance defense sync',
);
replaceOnce(
  'combat-arena.html',
  `function triggerDodge(){
  // Hammerfall consumes the shared defense button. Gate 5's shield runtime
  // handles the same press and toggles the kite shield; the legacy dodge path
  // must not also fire.
  if(isHammerfallDefenseStance(arena.stance))return;
  const d = arena.dodge;`,
  `function triggerDodge(){
  if(defenseController?.consumesDefenseInput?.())return false;
  const d = arena.dodge;`,
  'authoritative dodge guard',
);
replaceOnce(
  'combat-arena.html',
  `function defenseDown(source='input'){
  const result = window.__stance2Gate5Runtime?.defenseDown?.(source);
  if(result?.handled) return result;
  triggerDodge();
  return { handled:true, delegated:true, source };
}
function defenseUp(source='input'){
  const result = window.__stance2Gate5Runtime?.defenseUp?.(source);
  return result || { handled:false, delegated:true, source };
}`,
  `function defenseDown(source='input'){
  const result=defenseController.defenseDown(source);
  if(result?.handled)return result;
  triggerDodge();
  return{handled:true,delegated:true,source};
}
function defenseUp(source='input'){
  return defenseController.defenseUp(source);
}`,
  'direct defense seam',
);
replaceOnce(
  'combat-arena.html',
  `  updateCharge(dt);
  PC.updateCombat(dt, simulationNow, sway, rawDt);
}`,
  `  updateCharge(dt);
  PC.updateCombat(dt, simulationNow, sway, rawDt);
  defenseController.update(dt);
}`,
  'defense frame update',
);
replaceOnce(
  'combat-arena.html',
  `  // PlayStation Backbone standard mapping: Cross/X is bottom (0), Square is left (2).
  const light = bd(2)||bd(7);
  const heavy = bd(3);
  const shuffle = bd(1);
  const dge = bd(0)||bd(6);
  const lb = bd(4), rb = bd(5);
  const strt = bd(9), sel = bd(8);
  const weaponPrev = bd(12), weaponNext = bd(13);
  if(light && !padPrev.light) lightDown();
  if(heavy && !padPrev.heavy) heavyDown();
  if(!heavy && padPrev.heavy) heavyUp();
  if(dge && !padPrev.dge) defenseDown('gamepad');
  if(!dge && padPrev.dge) defenseUp('gamepad');
  if(shuffle && !padPrev.shuffle) startDeckShuffle();
  if(lb && !padPrev.lb) playCard(0);
  if(rb && !padPrev.rb) playCard(1);
  if(!lb && padPrev.lb) PC.releaseArcanaInput?.({slot:0,source:'gamepad'});
  if(!rb && padPrev.rb) PC.releaseArcanaInput?.({slot:1,source:'gamepad'});
  if(weaponPrev && !padPrev.weaponPrev) cycleWeapon(-1);
  if(weaponNext && !padPrev.weaponNext) cycleWeapon(1);
  if(strt && !padPrev.strt) toggleMenu();
  if(sel && !padPrev.sel) toggleMenu();
  padPrev.light=light; padPrev.heavy=heavy; padPrev.shuffle=shuffle; padPrev.dge=dge; padPrev.lb=lb; padPrev.rb=rb;
  padPrev.strt=strt; padPrev.sel=sel; padPrev.weaponPrev=weaponPrev; padPrev.weaponNext=weaponNext;`,
  `  const pad=readPlayStationBackboneInput(gp,padPrev);
  defenseController.recordGamepad(pad);
  if(pad.pressed.square||pad.pressed.r2)lightDown();
  if(pad.pressed.triangle)heavyDown();
  if(pad.released.triangle)heavyUp();
  if(pad.pressed.cross||pad.pressed.l2)defenseDown(pad.pressed.cross?'gamepad-cross':'gamepad-l2');
  if(!pad.current.cross&&!pad.current.l2&&(pad.released.cross||pad.released.l2))defenseUp('gamepad');
  if(pad.pressed.circle)startDeckShuffle();
  if(pad.pressed.l1)playCard(0);
  if(pad.pressed.r1)playCard(1);
  if(pad.released.l1)PC.releaseArcanaInput?.({slot:0,source:'gamepad'});
  if(pad.released.r1)PC.releaseArcanaInput?.({slot:1,source:'gamepad'});
  if(pad.pressed.dpadUp)cycleWeapon(-1);
  if(pad.pressed.dpadDown)cycleWeapon(1);
  if(pad.pressed.options||pad.pressed.create)toggleMenu();
  Object.assign(padPrev,pad.current);`,
  'single PlayStation gamepad mapping',
);
replaceOnce(
  'combat-arena.html',
  `window.__arena = { enemySystem, PC, combatState, FEEL, arena, actorPos, deck, dungeon, encounterState,
  get mazeWorld(){ return captureMazeWorld(); }, get activeRoomId(){ return activeRoomId; }, get roomTransition(){ return roomTransition; },`,
  `window.__arena = { enemySystem, PC, combatState, FEEL, arena, actorPos, deck, dungeon, encounterState, defenseController,
  get playerFacing(){return actorFacing;}, getPlayerForward(){return{x:Math.sin(actorFacing),z:Math.cos(actorFacing)};},
  get mazeWorld(){ return captureMazeWorld(); }, get activeRoomId(){ return activeRoomId; }, get roomTransition(){ return roomTransition; },`,
  'arena defense handle',
);

write('tests/playstation-backbone-input.test.mjs',`import assert from 'node:assert/strict';
import { readPlayStationBackboneInput } from '../src/playstation-backbone-input.js';
const gamepad=(down=[])=>({id:'Backbone One PlayStation',mapping:'standard',buttons:Array.from({length:16},(_,index)=>({pressed:down.includes(index)}))});
{
  const input=readPlayStationBackboneInput(gamepad([0]),{});
  assert.equal(input.current.cross,true);
  assert.equal(input.current.square,false);
  assert.equal(input.pressed.cross,true);
}
{
  const input=readPlayStationBackboneInput(gamepad([2,7]),{});
  assert.equal(input.current.square,true);
  assert.equal(input.current.r2,true);
  assert.equal(input.current.cross,false);
}
{
  const input=readPlayStationBackboneInput(gamepad([6]),{cross:true,l2:false});
  assert.equal(input.pressed.l2,true);
  assert.equal(input.released.cross,true);
}
console.log('PlayStation Backbone input mapping tests passed');
`);
write('tests/player-damage-route.test.mjs',`import assert from 'node:assert/strict';
import { createPlayerDamageRoute } from '../src/player-damage-route.js';
let installed=null;
const route=createPlayerDamageRoute({apply(next){installed=next;}});
let externalCalls=0;
route.setExternalInterceptor(hit=>{externalCalls++;return{...hit,damage:hit.damage-2,outcome:'external'};});
route.setDefenseResolver(hit=>({...hit,damage:0,outcome:'blocked'}));
let result=installed({damage:10,dir:{x:0,z:-1}});
assert.equal(result.damage,0);
assert.equal(result.outcome,'blocked');
assert.equal(externalCalls,0);
route.setDefenseResolver(hit=>hit);
result=installed({damage:10});
assert.equal(result.damage,8);
assert.equal(externalCalls,1);
route.setDefenseResolver(null);
result=installed({damage:5});
assert.equal(result.damage,3);
console.log('player damage route tests passed');
`);
write('tests/stance-gate5-defense.test.mjs',`import assert from 'node:assert/strict';
import { createStanceGate5Runtime } from '../src/stance-gate5-defense.js';
function makeHarness({stance={id:'S24'},stamina=100,forward={x:0,z:1}}={}){
  let defenseResolver=hit=>hit;
  const enemySystem={setPlayerDefenseResolver(resolver){defenseResolver=typeof resolver==='function'?resolver:(hit=>hit);return true;},hit(hit){return defenseResolver(hit);}};
  const combatState={weapon:'longsword',attack:null,attackKey:'',readyLock:0};
  const PC={combatState,combatLayer:null,startCombatAttack(key,group){combatState.attack={key,group};combatState.attackKey=key;return true;}};
  const arena={stance,deadT:-1,dodge:{t:-1,cool:0},stamina:{v:stamina,pending:0},chain:{activeSlot:-1},charge:{active:false,queued:false,buttonHeld:false,hold:0,tier:1/3,forceTier:null},swing:{}};
  const deck={pool:[{id:'S01'},{id:'S24'},{id:'S26'}]};
  const windowRef={location:{search:''},__stance2Gate4Runtime:null};
  const runtime=createStanceGate5Runtime({arenaHandle:{PC,arena,deck,enemySystem,getPlayerForward:()=>forward,roomTransition:null},windowRef,documentRef:null});
  return{runtime,PC,arena,enemySystem,combatState};
}
{
  const h=makeHarness({stance:{id:'S24'}});
  assert.equal(h.runtime.defenseDown('cross').delegated,true);
  assert.equal(h.runtime.consumesDefenseInput(),false);
  h.runtime.destroy();
}
{
  const h=makeHarness({stance:{id:'S26'}});
  assert.equal(h.runtime.defenseDown('cross').accepted,true);
  const result=h.enemySystem.hit({damage:18,dir:{x:0,z:-1}});
  assert.equal(result.damage,0);
  assert.equal(result.outcome,'deflected');
  h.runtime.destroy();
}
{
  const h=makeHarness({stance:{id:'enemy-lab-selection',name:'Hammerfall'},stamina:100});
  assert.equal(h.runtime.defenseDown('cross').guardRaised,true);
  let result=h.enemySystem.hit({damage:10,dir:{x:0,z:-1}});
  assert.equal(result.damage,0);
  assert.equal(h.arena.stamina.v,85);
  result=h.enemySystem.hit({damage:10,dir:{x:0,z:1}});
  assert.equal(result.damage,10);
  assert.equal(h.runtime.defenseDown('l2').guardRaised,false);
  h.runtime.destroy();
}
{
  const h=makeHarness({stance:{id:'S01'},stamina:0});
  h.runtime.defenseDown('cross');
  let result=h.enemySystem.hit({damage:10,dir:{x:0,z:-1}});
  assert.equal(result.damage,10);
  assert.equal(h.runtime.snapshot().guardRaised,true);
  h.arena.stamina.v=20;h.runtime.update(.01);
  result=h.enemySystem.hit({damage:10,dir:{x:0,z:-1}});
  assert.equal(result.damage,0);
  assert.equal(h.arena.stamina.v,5);
  h.runtime.destroy();
}
console.log('stance gate 5 authoritative defense tests passed');
`);
write('tests/stance-gate5-input-seam.test.mjs',`import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const arena=readFileSync(new URL('../combat-arena.html',import.meta.url),'utf8');
const weaponBalance=readFileSync(new URL('../src/weapon-balance.js',import.meta.url),'utf8');
assert.match(arena,/createStanceGate5Runtime/);
assert.match(arena,/readPlayStationBackboneInput/);
assert.match(arena,/const defenseController=createStanceGate5Runtime/);
assert.match(arena,/pad\.pressed\.cross\|\|pad\.pressed\.l2/);
assert.match(arena,/pad\.pressed\.square\|\|pad\.pressed\.r2/);
assert.match(arena,/getPlayerForward\(\)\{return\{x:Math\.sin\(actorFacing\),z:Math\.cos\(actorFacing\)\};\}/);
assert.doesNotMatch(arena,/__stance2Gate5Runtime/);
assert.doesNotMatch(weaponBalance,/stance-gate5-defense/);
console.log('stance gate 5 synchronous input seam tests passed');
`);
write('tests/hammerfall-defense-button.test.mjs',`import assert from 'node:assert/strict';
import { readPlayStationBackboneInput } from '../src/playstation-backbone-input.js';
const buttons=Array.from({length:16},()=>({pressed:false}));buttons[0]={pressed:true};
const cross=readPlayStationBackboneInput({buttons,mapping:'standard'},{});
assert.equal(cross.pressed.cross,true);
assert.equal(cross.pressed.square,false);
buttons[0]={pressed:false};buttons[2]={pressed:true};
const square=readPlayStationBackboneInput({buttons,mapping:'standard'},cross.current);
assert.equal(square.pressed.square,true);
assert.equal(square.current.cross,false);
console.log('Hammerfall defense-button regression test passed');
`);
write('tests/hammerfall-shield-presentation.test.mjs',`import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const visuals=readFileSync(new URL('../src/stance-gate5-visuals.js',import.meta.url),'utf8');
assert.match(visuals,/shield\.scale\.setScalar\(1\.8\)/);
assert.match(visuals,/const shieldStance=lastState\.kind==='shield'/);
assert.match(visuals,/return activeModel\?\.parent\|\|activeModel/);
assert.match(visuals,/guard:\{position:new THREE\.Vector3\(-\.42,1\.48,1\.30\)/);
console.log('Hammerfall shield presentation tests passed');
`);

const pkg=JSON.parse(read('package.json'));
for(const command of ['node tests/playstation-backbone-input.test.mjs','node tests/player-damage-route.test.mjs']){
  if(!pkg.scripts['test:combat'].includes(command))pkg.scripts['test:combat']+=` && ${command}`;
}
write('package.json',JSON.stringify(pkg,null,2)+'\n');
console.log('Authoritative defense rewrite applied');
