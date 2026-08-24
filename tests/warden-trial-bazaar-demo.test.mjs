import assert from 'node:assert/strict';
import { STANCE_CARDS } from '../src/stance-cards.js';
import {
  WARDEN_TRIAL_BAZAAR_DEMO_ROSTER,
  WARDEN_TRIAL_BAZAAR_DEMO_TRANSLATION,
  createWardenTrialBazaarDemoRuntime,
  wardenTrialBazaarDemoCards,
  wardenTrialBazaarDemoEntry,
} from '../src/warden-trial-bazaar-demo.js';
import {
  resolveWardenTrialCardPlay,
  wardenTrialUpArcanaIdForCard,
  wardenTrialUpTacticIdForCard,
} from '../src/warden-trial-card-policy.js';

assert.equal(WARDEN_TRIAL_BAZAAR_DEMO_ROSTER.length,13,'the vertical slice stays intentionally compact');
assert.equal(WARDEN_TRIAL_BAZAAR_DEMO_ROSTER.filter(entry=>entry.family==='arcana').length,7);
assert.equal(WARDEN_TRIAL_BAZAAR_DEMO_ROSTER.filter(entry=>entry.family==='tactic').length,6);
assert.equal(new Set(WARDEN_TRIAL_BAZAAR_DEMO_ROSTER.map(entry=>entry.id)).size,13);
assert.equal(WARDEN_TRIAL_BAZAAR_DEMO_TRANSLATION.damagePerTwenty,12);
assert.equal(WARDEN_TRIAL_BAZAAR_DEMO_TRANSLATION.burnPerFour,6);
assert.equal(WARDEN_TRIAL_BAZAAR_DEMO_TRANSLATION.poisonPerFour,6);
const coveredFeatures=new Set(WARDEN_TRIAL_BAZAAR_DEMO_ROSTER.flatMap(entry=>entry.features));
for(const feature of ['damage','burn','poison','ammo','multicast','haste','charge','slow','freeze','shield','heal','persistent','percent-health']){
  assert.ok(coveredFeatures.has(feature),`${feature} has a representative demo card`);
}

const cards=wardenTrialBazaarDemoCards(STANCE_CARDS);
assert.equal(cards.length,13);
assert.ok(cards.every(card=>card.__wardenTrialCard&&card.__wardenTrialDemo&&card.__wardenTrialBazaar));
const astrolabeCard=cards.find(card=>card.__wardenTrialTacticId==='ASTROLABE');
assert.ok(astrolabeCard);
assert.equal(astrolabeCard.id,'S26');
assert.equal(wardenTrialUpArcanaIdForCard(astrolabeCard,'longsword'),null);
assert.equal(wardenTrialUpTacticIdForCard(astrolabeCard),'ASTROLABE');
assert.deepEqual(resolveWardenTrialCardPlay({
  direction:'up',started:true,card:astrolabeCard,weaponId:'longsword',deckCards:[astrolabeCard],stamina:42,
}),{accepted:true,reason:'tactic-fired',started:true,stamina:42,refill:false,tacticId:'ASTROLABE'});
assert.equal(resolveWardenTrialCardPlay({
  direction:'down',started:true,card:astrolabeCard,weaponId:'longsword',deckCards:[astrolabeCard],stamina:0,
}).stamina,200,'the same demo card remains a valid downward stance');

const target={id:'demo-target',x:2,z:0,hp:200,maxHp:200};
const damages=[],statuses=[],events=[];
let playerHp=50;
let shieldInterceptor=null;
const enemySystem={
  enemies:[target],
  hostileEnemies:[target],
  getNearestHostile:()=>target,
  damageEnemy(enemy,amount,knock,options={}){
    const applied=Math.max(0,Number(amount)||0);
    enemy.hp=Math.max(0,enemy.hp-applied);
    damages.push({amount:applied,options});
    return enemy.hp<=0;
  },
  applyStatus(enemy,kind,duration,options={}){statuses.push({enemy,kind,duration,options});return true;},
  healPlayer(amount){const before=playerHp;playerHp=Math.min(100,playerHp+Math.max(0,Number(amount)||0));return playerHp-before;},
  registerPlayerDamageInterceptor(id,interceptor){assert.equal(id,'warden-bazaar-demo-shield');shieldInterceptor=interceptor;return()=>{shieldInterceptor=null;};},
};
const runtime=createWardenTrialBazaarDemoRuntime({enemySystem,getPlayer:()=>({x:0,z:0}),emit:event=>events.push(event)});
const resetTarget=()=>{target.hp=200;damages.length=0;statuses.length=0;};

resetTarget();
let result=runtime.play('FLAME-STRIKE');
assert.equal(result.damage,12,'20 Bazaar Damage becomes 12 Saturn HP in the demo transform');
assert.equal(result.burn,9,'6 Bazaar Burn preserves its relative 4-to-6 normalized output');
assert.equal(target.hp,188,'the direct payload lands immediately');
runtime.update(.65);runtime.update(.65);runtime.update(.65);
assert.equal(target.hp,179,'Burn resolves as three legible damage-over-time ticks');
assert.equal(damages.filter(hit=>hit.options.status==='burn').length,3);

resetTarget();
result=runtime.play('FLAME-CROSS');
assert.equal(result.multicast,2);
assert.equal(result.damage,12,'10 Damage multicast twice deals two normalized 6-damage activations');
assert.equal(target.hp,188);

resetTarget();
result=runtime.play('HEROIC-LEAP');
assert.equal(result.damage,40,'Anchor uses the target\'s real 200 max HP for its printed 20% hit');
assert.equal(target.hp,160);

resetTarget();
result=runtime.play('PERFORATING-JET');
assert.equal(result.poison,4.5);
assert.equal(runtime.snapshot().ammo.find(row=>row.itemId===wardenTrialBazaarDemoEntry('PERFORATING-JET').id).current,2);
assert.equal(statuses.at(-1).kind,'slow');
assert.equal(statuses.at(-1).duration,1);
runtime.update(1.95);
assert.equal(target.hp,195.5,'Poison deals its full normalized damage even when one update spans all ticks');

resetTarget();
result=runtime.play('ICE-DAGGER');
assert.equal(result.damage,15);
assert.equal(statuses.at(-1).kind,'freeze');
assert.equal(statuses.at(-1).duration,1);
assert.equal(runtime.snapshot().itemDamageBonuses[wardenTrialBazaarDemoEntry('ICE-DAGGER').id],15);
resetTarget();
assert.equal(runtime.play('ICE-DAGGER').damage,24,'Ice Pick keeps its printed +15 Damage after causing Freeze');

resetTarget();
result=runtime.play('BOLT-RAIL');
assert.equal(result.damage,6);
assert.equal(runtime.canPlay('BOLT-RAIL').reason,'out-of-ammo');
const port=runtime.play('PORT');
assert.deepEqual(port.timerEffects,[{effect:'charge',seconds:1}]);
assert.equal(runtime.canPlay('BOLT-RAIL').accepted,true,'Port reloads the depleted Rifle');
resetTarget();
assert.equal(runtime.play('BOLT-RAIL').damage,12,'Rifle retains its printed +10 self-Damage after reloading');

assert.deepEqual(runtime.play('ASTROLABE').timerEffects,[{effect:'haste',seconds:1}]);

runtime.play('BARREL');
assert.equal(runtime.snapshot().shield,30);
assert.deepEqual(shieldInterceptor({damage:12}),{damage:0});
assert.equal(runtime.snapshot().shield,18);
assert.deepEqual(shieldInterceptor({damage:25}),{damage:7});
assert.equal(runtime.snapshot().shield,0);

playerHp=50;
assert.equal(runtime.play('CORAL').lastAction,'CORAL · HEAL 20');
assert.equal(playerHp,70);

runtime.play('CARD-TABLE');
resetTarget();
result=runtime.play('RAPID-FIRE-AGENT');
assert.equal(result.multicast,2,'Card Table gives the Friend representative +1 Multicast for the fight');
assert.equal(result.damage,24);

runtime.play('HONING-STEEL');
resetTarget();
result=runtime.play('FLAME-STRIKE');
assert.equal(result.damage,15,'Honing Steel adds 5 printed Damage before normalization to demo Weapon cards');
assert.equal(runtime.snapshot().weaponDamageBonus,5);

resetTarget();
const hpBeforeNative=target.hp;
assert.equal(enemySystem.damageEnemy(target,99,{x:0,z:0},{source:'wizardArcana'}),true);
assert.equal(target.hp,hpBeforeNative,'native Arcana damage is swallowed while its visuals remain active');
enemySystem.damageEnemy(target,7,{x:0,z:0},{source:'wardenBazaarDemo'});
assert.equal(target.hp,hpBeforeNative-7,'the translated demo payload is not swallowed');
assert.equal(runtime.snapshot().suppressedNativeHits,1);

runtime.applyTimerEffect('freeze',2);
assert.equal(runtime.snapshot().lastAction,'TIMER TEST · FREEZE 2s');
runtime.reset();
assert.equal(runtime.snapshot().shield,0);
assert.equal(runtime.snapshot().weaponDamageBonus,0);
assert.equal(runtime.snapshot().friendMulticastBonus,0);
assert.ok(runtime.snapshot().ammo.every(row=>row.current===row.max));
assert.ok(events.some(event=>event.phase==='played'));

console.log('Warden Trial Bazaar behavior demo: ok');
