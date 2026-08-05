import { readFileSync, writeFileSync } from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const write=(path,content)=>writeFileSync(path,content);
function replaceOnce(path,before,after,label){
  const source=read(path);
  if(source.includes(after))return;
  const count=source.split(before).length-1;
  if(count!==1)throw new Error(`${path}: expected one ${label}, found ${count}`);
  write(path,source.replace(before,after));
}

write('src/playstation-backbone-input.js',`export const PLAYSTATION_BACKBONE_BUTTONS=Object.freeze({
  cross:0,
  circle:1,
  square:2,
  triangle:3,
  l1:4,
  r1:5,
  l2:6,
  r2:7,
  create:8,
  options:9,
  dpadUp:12,
  dpadDown:13,
  dpadLeft:14,
  dpadRight:15,
});

const BUTTON_NAMES=Object.freeze(Object.keys(PLAYSTATION_BACKBONE_BUTTONS));

export function readPlayStationBackboneInput(gamepad,previous={}){
  const isDown=name=>{
    const index=PLAYSTATION_BACKBONE_BUTTONS[name];
    const button=gamepad?.buttons?.[index];
    return !!button&&(button.pressed===true||Number(button.value)>.5);
  };
  const current=Object.fromEntries(BUTTON_NAMES.map(name=>[name,isDown(name)]));
  const pressed={};
  const released={};
  for(const name of BUTTON_NAMES){
    const was=previous?.[name]===true;
    pressed[name]=current[name]&&!was;
    released[name]=!current[name]&&was;
  }
  const rawDown=[];
  for(let index=0;index<(gamepad?.buttons?.length||0);index++){
    const button=gamepad.buttons[index];
    if(button?.pressed===true||Number(button?.value)>.5)rawDown.push(index);
  }
  const previousRaw=new Set(Array.isArray(previous?.__rawDown)?previous.__rawDown:[]);
  const currentRaw=new Set(rawDown);
  const rawPressed=rawDown.filter(index=>!previousRaw.has(index));
  const rawReleased=[...previousRaw].filter(index=>!currentRaw.has(index));
  return Object.freeze({
    current:Object.freeze(current),
    pressed:Object.freeze(pressed),
    released:Object.freeze(released),
    rawDown:Object.freeze(rawDown),
    rawPressed:Object.freeze(rawPressed),
    rawReleased:Object.freeze(rawReleased),
    id:String(gamepad?.id||''),
    mapping:String(gamepad?.mapping||''),
  });
}

export function resolvePlayStationBackboneActions(input={}){
  const defensePressed=input?.pressed?.cross===true||input?.pressed?.l2===true;
  const defenseSource=input?.pressed?.cross===true?'gamepad-cross':input?.pressed?.l2===true?'gamepad-l2':null;
  const defenseReleased=input?.current?.cross!==true&&input?.current?.l2!==true
    &&(input?.released?.cross===true||input?.released?.l2===true);
  const lightCandidate=input?.pressed?.square===true||input?.pressed?.r2===true;
  return Object.freeze({
    defensePressed,
    defenseSource,
    defenseReleased,
    lightPressed:lightCandidate&&!defensePressed,
    aliasConflict:defensePressed&&lightCandidate,
  });
}
`);

replaceOnce(
  'combat-arena.html',
  "import { readPlayStationBackboneInput } from './src/playstation-backbone-input.js';",
  "import { readPlayStationBackboneInput, resolvePlayStationBackboneActions } from './src/playstation-backbone-input.js';",
  'Backbone action resolver import',
);
replaceOnce(
  'combat-arena.html',
  `  const pad=readPlayStationBackboneInput(gp,padPrev);
  defenseController.recordGamepad(pad);
  if(pad.pressed.square||pad.pressed.r2)lightDown();
  if(pad.pressed.triangle)heavyDown();
  if(pad.released.triangle)heavyUp();
  if(pad.pressed.cross||pad.pressed.l2)defenseDown(pad.pressed.cross?'gamepad-cross':'gamepad-l2');
  if(!pad.current.cross&&!pad.current.l2&&(pad.released.cross||pad.released.l2))defenseUp('gamepad');`,
  `  const pad=readPlayStationBackboneInput(gp,padPrev);
  const padActions=resolvePlayStationBackboneActions(pad);
  defenseController.recordGamepad(pad,padActions);
  // Defense wins a same-frame Android/Backbone alias conflict. This prevents a
  // Cross press that is also reported as Square from starting an attack first
  // and making Hammerfall reject the shield toggle as busy.
  if(padActions.defensePressed)defenseDown(padActions.defenseSource);
  if(padActions.lightPressed)lightDown();
  if(pad.pressed.triangle)heavyDown();
  if(pad.released.triangle)heavyUp();
  if(padActions.defenseReleased)defenseUp('gamepad');`,
  'defense-first Backbone routing',
);
replaceOnce(
  'combat-arena.html',
  '  Object.assign(padPrev,pad.current);',
  '  Object.assign(padPrev,pad.current,{__rawDown:[...pad.rawDown]});',
  'raw Backbone history',
);

replaceOnce(
  'enemy-lab.html',
  `  const outer=new URLSearchParams(location.search),inner=new URLSearchParams({seed:'enemy-lab-001',layout:'arena',enemyLab:'1'});
  if(outer.get('capture')==='1'){`,
  `  const outer=new URLSearchParams(location.search),inner=new URLSearchParams({seed:'enemy-lab-001',layout:'arena',enemyLab:'1'});
  // Diagnostics belong to the embedded Combat Arena, so forward them from the
  // phone-friendly Enemy Lab URL instead of silently dropping them.
  if(outer.has('defenseDebug'))inner.set('defenseDebug',outer.get('defenseDebug'));
  if(outer.get('capture')==='1'){`,
  'Enemy Lab defense-debug forwarding',
);

replaceOnce(
  'src/stance-gate5-defense.js',
  "    `PAD ${snapshot.lastInput||'-'} · HIT ${snapshot.lastHitDirection||'-'}`,\n    `STAMINA ${snapshot.stamina.toFixed(1)}`,",
  "    `PAD ${snapshot.lastInput||'-'} · HIT ${snapshot.lastHitDirection||'-'}`,\n    `RAW DOWN ${snapshot.rawButtons||'-'} · EDGE ${snapshot.rawPressed||'-'}`,\n    `MAP ${snapshot.gamepadMapping||'-'} · ${snapshot.gamepadId||'-'}`,\n    `STAMINA ${snapshot.stamina.toFixed(1)}`,",
  'raw gamepad debug lines',
);
replaceOnce(
  'src/stance-gate5-defense.js',
  "    lastOutcome:'ready',lastBlockCost:0,lastOverdrawAmount:0,lastInput:'',lastHitDirection:'',",
  "    lastOutcome:'ready',lastBlockCost:0,lastOverdrawAmount:0,lastInput:'',lastHitDirection:'',\n    rawButtons:'',rawPressed:'',gamepadId:'',gamepadMapping:'',aliasConflict:false,",
  'raw gamepad debug state',
);
replaceOnce(
  'src/stance-gate5-defense.js',
  `    recordGamepad(input){
      const names=['cross','square','l2','r2'].filter(name=>input?.current?.[name]);
      if(names.length)state.lastInput=\`pad:\${names.join('+')}\`;
      publish();
    },`,
  `    recordGamepad(input,actions={}){
      const down=['cross','square','l2','r2'].filter(name=>input?.current?.[name]);
      const edges=['cross','square','l2','r2'].filter(name=>input?.pressed?.[name]);
      state.rawButtons=(input?.rawDown||[]).join(',');
      state.rawPressed=(input?.rawPressed||[]).join(',');
      state.gamepadId=String(input?.id||'');
      state.gamepadMapping=String(input?.mapping||'');
      state.aliasConflict=actions?.aliasConflict===true;
      if(edges.length||input?.rawPressed?.length){
        state.lastInput=\`edge:\${edges.join('+')||'-'} raw:\${state.rawPressed||'-'}\${state.aliasConflict?' ALIAS':''}\`;
      }else if(down.length)state.lastInput=\`held:\${down.join('+')}\`;
      publish();
    },`,
  'raw gamepad recorder',
);

write('tests/playstation-backbone-input.test.mjs',`import assert from 'node:assert/strict';
import { readPlayStationBackboneInput, resolvePlayStationBackboneActions } from '../src/playstation-backbone-input.js';
const gamepad=(down=[],values={})=>({
  id:'Backbone One PlayStation',mapping:'standard',
  buttons:Array.from({length:16},(_,index)=>({pressed:down.includes(index),value:values[index]??(down.includes(index)?1:0)})),
});
{
  const input=readPlayStationBackboneInput(gamepad([0]),{});
  assert.equal(input.current.cross,true);
  assert.equal(input.current.square,false);
  assert.deepEqual(input.rawDown,[0]);
  assert.deepEqual(input.rawPressed,[0]);
  const actions=resolvePlayStationBackboneActions(input);
  assert.equal(actions.defensePressed,true);
  assert.equal(actions.lightPressed,false);
}
{
  // Some Android controller paths can report a face-button alias on the same
  // frame. Defense must win so Hammerfall is not rejected as attack-busy.
  const input=readPlayStationBackboneInput(gamepad([0,2]),{});
  const actions=resolvePlayStationBackboneActions(input);
  assert.equal(actions.aliasConflict,true);
  assert.equal(actions.defensePressed,true);
  assert.equal(actions.lightPressed,false);
}
{
  const input=readPlayStationBackboneInput(gamepad([2,7]),{});
  const actions=resolvePlayStationBackboneActions(input);
  assert.equal(actions.defensePressed,false);
  assert.equal(actions.lightPressed,true);
}
{
  const input=readPlayStationBackboneInput(gamepad([],{0:.9}),{});
  assert.equal(input.current.cross,true,'analog value should count when pressed is false');
}
console.log('PlayStation Backbone input mapping tests passed');
`);
write('tests/enemy-lab-defense-debug.test.mjs',`import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const lab=readFileSync(new URL('../enemy-lab.html',import.meta.url),'utf8');
assert.match(lab,/outer\.has\('defenseDebug'\)/);
assert.match(lab,/inner\.set\('defenseDebug',outer\.get\('defenseDebug'\)\)/);
console.log('Enemy Lab defense-debug forwarding test passed');
`);

const seamPath='tests/stance-gate5-input-seam.test.mjs';
let seam=read(seamPath);
if(!seam.includes('resolvePlayStationBackboneActions')){
  seam=seam.replace(
    "assert.match(arena,/readPlayStationBackboneInput/);",
    "assert.match(arena,/readPlayStationBackboneInput/);\nassert.match(arena,/resolvePlayStationBackboneActions/);\nassert.match(arena,/if\\(padActions\\.defensePressed\\)defenseDown/);\nassert.match(arena,/if\\(padActions\\.lightPressed\\)lightDown/);",
  );
  write(seamPath,seam);
}
const pkg=JSON.parse(read('package.json'));
const command='node tests/enemy-lab-defense-debug.test.mjs';
if(!pkg.scripts['test:combat'].includes(command))pkg.scripts['test:combat']+=` && ${command}`;
write('package.json',JSON.stringify(pkg,null,2)+'\n');
console.log('Backbone Cross priority and diagnostics applied');
