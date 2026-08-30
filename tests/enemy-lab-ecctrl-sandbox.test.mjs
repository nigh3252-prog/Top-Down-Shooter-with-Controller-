import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GAMEPAD_DEADZONE,
  RUN_ANIMATION_THRESHOLD,
  applyRadialDeadzone,
  readEcctrlGamepad,
} from '../tools/ecctrl-lab-source/src/ecctrl-input.js';
import {
  ECCTRL_ATTACK_SEQUENCE,
  attackSpecAt,
  chooseCombatFacing,
  wardenPoseDelta,
} from '../tools/ecctrl-lab-source/src/ecctrl-warden-pose.js';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const read=path=>readFileSync(join(root,path),'utf8');
const lab=read('enemy-lab.html');
const sandbox=read('tools/ecctrl-lab-source/src/ecctrl-lab.jsx');
const combatAdapter=read('tools/ecctrl-lab-source/src/ecctrl-warden-combat.jsx');
const entry=read('tools/ecctrl-lab-source/src/entry.jsx');
const playerCombatCore=read('src/player-combat-core.js');
const bundlePath=join(root,'tools/ecctrl-lab/assets/ecctrl-lab.js');
const modelPath=join(root,'media/ecctrl/AnimationLibrary.glb');

assert.match(lab,/id="ecctrlBtn"[^>]*aria-pressed="false"/,'Enemy Lab exposes an explicit controller switch');
assert.match(lab,/id="ecctrlLabSurface"[^>]*hidden/,'the sandbox starts out of the normal Lab surface');
assert.match(lab,/#ecctrlLabBoot\[hidden\]\{display:none\}/,'the loading veil stays hidden after the sandbox mounts');
assert.match(lab,/runtime\.stop\(\)[\s\S]*setEcctrlLabActive\(true\)/,'Ecctrl takes authority only after the Saturn loop stops');
assert.match(lab,/setEcctrlLabActive\?\.\(false\)[\s\S]*runtime\.start\(\)/,'switching back suspends Ecctrl and resumes Saturn');
assert.match(lab,/import\('\.\/tools\/ecctrl-lab\/assets\/ecctrl-lab\.js'\)/,'the heavy controller bundle is lazy loaded');
assert.doesNotMatch(lab,/<iframe|contentWindow|contentDocument/,'the experiment remains a same-document surface');

assert.match(entry,/export function mountEcctrlLab/);
assert.match(entry,/export function setEcctrlLabActive/);
assert.match(sandbox,/from '\.\.\/vendor\/ecctrl\/index\.ts'/,'the sandbox uses the vendored Ecctrl public entry');
assert.match(sandbox,/<Physics paused gravity=\{\[0, 0, 0\]\} timeStep="vary">/,'Rapier follows the Ecctrl example manual-step setup');
assert.match(sandbox,/<TimeControl paused=\{!active\}/);
assert.match(sandbox,/className="ecctrl-attack-button"/,'the phone sandbox exposes an attack control');
assert.match(sandbox,/const CAMERA_OFFSET = new THREE\.Vector3\(0, 20, 17\.6\)/,'the experiment keeps the fixed Warden-style camera offset');
for(const tuning of ['maxWalkVel={1.1}','maxRunVel={5.5}','jumpVel={6}','springK={6400}','dampingC={860}'])assert.ok(sandbox.includes(tuning),`${tuning} remains at the source playtest value`);

assert.match(combatAdapter,/installPlayerCombat/,'the Ecctrl overlay reuses the shared Warden combat driver');
assert.match(combatAdapter,/cloneWeaponDefinitions/,'weapon selection flows through the shared weapon definitions');
assert.match(combatAdapter,/ECCTRL_WEAPON_IDS = Object\.freeze\(\[\.\.\.STONE_WEAPON_ORDER\]\)/,'every shared weapon uses the same adapter');
assert.doesNotMatch(combatAdapter,/installStoneWanderer|makeStoneWanderer/,'the visible Warden puppet is not mounted in the Ecctrl scene');
assert.doesNotMatch(combatAdapter,/case ['"](?:longsword|claymore|greatsword)['"]/,'the adapter has no weapon-specific pose branches');
assert.match(playerCombatCore,/onPoseSample\?\.\(\{pose:p,idle:IDLE/,'the shared combat core exposes one generic external-skeleton pose seam');
assert.match(sandbox,/nodes\.Mannequin_1\.skeleton\.update\(\);[\s\S]*nodes\.Mannequin_2\.skeleton\.update\(\);/,'the additive pose is uploaded after the locomotion mixer and before rendering');

assert.deepEqual(ECCTRL_ATTACK_SEQUENCE.map(attack=>attack.group),['vertical','horizontal','stab']);
assert.equal(attackSpecAt(4).group,'horizontal','the three-family attack sampler wraps without weapon-specific logic');
assert.deepEqual(chooseCombatFacing({aim:{x:0,z:-2},move:{x:1,z:0},forward:{x:0,z:1}}),{x:0,z:-1},'right-stick aim wins attack facing');
assert.deepEqual(chooseCombatFacing({aim:{x:0,z:0},move:{x:3,z:4},forward:{x:0,z:1}}),{x:.6,z:.8},'movement supplies attack facing when there is no aim stick');
const poseDelta=wardenPoseDelta({twist:.5,pitch:.25,lean:-.1,hipTwist:.2,lower:.3,lunge:.4,hip:{x:.2,z:.3},head:{x:.1,y:-.2}},{twist:.1,pitch:.05,lean:0,hipTwist:.05,lower:.1,lunge:0,hip:{x:.05,z:.1},head:{x:0,y:-.05}});
assert.ok(Math.abs(poseDelta.twist-.4)<1e-9&&Math.abs(poseDelta.lunge-.4)<1e-9&&Math.abs(poseDelta.headY+.15)<1e-9,'Warden poses become additive Ecctrl bone offsets');

assert.ok(existsSync(bundlePath)&&statSync(bundlePath).size>1_000_000,'the static Ecctrl/Rapier bundle is checked in');
assert.ok(existsSync(modelPath)&&statSync(modelPath).size>6_000_000,'the mannequin animation library is checked in');
assert.ok(existsSync(join(root,'tools/ecctrl-lab/LICENSE.ecctrl.txt')),'the Ecctrl license ships beside the bundle');
assert.ok(existsSync(join(root,'tools/ecctrl-lab/NOTICE.ecctrl.txt')),'the animation notice ships beside the bundle');

const glb=readFileSync(modelPath);
assert.equal(glb.toString('ascii',0,4),'glTF');
assert.equal(glb.readUInt32LE(4),2,'the mannequin is a GLB 2.0 asset');
const jsonLength=glb.readUInt32LE(12);
assert.equal(glb.readUInt32LE(16),0x4e4f534a,'the first GLB chunk is JSON');
const model=JSON.parse(glb.subarray(20,20+jsonLength).toString().replace(/\0+$/,''));
assert.equal(model.skins?.length,1,'the mannequin remains one intact skinned puppet');
for(const clip of ['Idle_Loop','Walk_Loop','Jog_Fwd_Loop','Jump_Start','Jump_Loop','Jump_Land']){
  assert.ok(model.animations.some(animation=>animation.name===clip),`${clip} is present in the animation library`);
}

assert.equal(GAMEPAD_DEADZONE,0.14);
assert.equal(RUN_ANIMATION_THRESHOLD,0.72);
assert.deepEqual(applyRadialDeadzone(0.1,0),{x:0,y:0},'small stick drift is removed');
assert.ok(Math.abs(applyRadialDeadzone(0.55,0).x-((0.55-0.14)/(1-0.14)))<1e-9,'stick travel is rescaled continuously after the deadzone');

const buttons=Array.from({length:16},()=>({pressed:false,value:0}));
buttons[0]={pressed:true,value:1};
const analog=readEcctrlGamepad({axes:[0.8,-0.6],buttons});
assert.equal(analog.jump,true,'Cross is jump in the sandbox');
assert.ok(analog.stick.x>0&&analog.stick.y>0,'raw gamepad Y is inverted to Ecctrl camera-forward coordinates');
assert.equal(analog.run,true,'large analog travel selects the run animation');

buttons[2]={pressed:true,value:1};
const attacking=readEcctrlGamepad({axes:[0,0,.6,-.8],buttons});
assert.equal(attacking.attack,true,'Square triggers the generic weapon attack');
assert.ok(attacking.aimStick.x>0&&attacking.aimStick.y>0,'the right stick supplies committed attack facing');

buttons[12]={pressed:true,value:1};
buttons[14]={pressed:true,value:1};
const dpad=readEcctrlGamepad({axes:[0,0],buttons});
assert.ok(Math.abs(dpad.stick.x+Math.SQRT1_2)<1e-9&&Math.abs(dpad.stick.y-Math.SQRT1_2)<1e-9,'D-pad movement is normalized diagonally');

console.log('Enemy Lab Ecctrl locomotion sandbox contract: ok');
