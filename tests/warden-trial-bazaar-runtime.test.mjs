import assert from 'node:assert/strict';
import {
  WARDEN_TRIAL_BAZAAR_ITEMS,
  wardenTrialBazaarItemForArcana,
  wardenTrialBazaarTacticById,
} from '../src/warden-trial-bazaar-catalog.js';
import {
  WARDEN_TRIAL_BAZAAR_IMPLEMENTED_ITEM_IDS,
  WARDEN_TRIAL_BAZAAR_SUPPORTED_TACTIC_TRIGGERS,
  createWardenTrialBazaarRuntime,
  wardenTrialBazaarBehaviorProfile,
} from '../src/warden-trial-bazaar-runtime.js';

const cardFor=item=>({
  id:`CARD-${item.id}`,
  __wardenTrialCard:true,
  __wardenTrialPairId:item.arcanaId||`TACTIC:${item.tacticId}`,
  __wardenTrialArcanaId:item.arcanaId||null,
  __wardenTrialTacticId:item.tacticId||null,
  __wardenTrialBazaarItemId:item.id,
  __wardenTrialBazaar:item,
});

function createFakeEnemySystem({enemyHp=300,playerHp=100}={}){
  const enemy={id:'enemy-1',x:2,z:0,hp:enemyHp,maxHp:enemyHp};
  const statuses=[];
  let currentPlayerHp=playerHp;
  let playerDamageInterceptor=null;
  const system={
    enemies:[enemy],
    hostileEnemies:[enemy],
    get playerHp(){return currentPlayerHp;},
    getNearestHostile(){return enemy.hp>0?enemy:null;},
    damageEnemy(target,amount){target.hp=Math.max(0,target.hp-Math.max(0,Number(amount)||0));return target.hp>0;},
    applyStatus(target,kind,duration,options={}){statuses.push({target,kind,duration,options});return true;},
    healPlayer(amount){const healed=Math.min(Math.max(0,Number(amount)||0),100-currentPlayerHp);currentPlayerHp+=healed;return healed;},
    registerPlayerDamageInterceptor(_id,interceptor){playerDamageInterceptor=interceptor;return()=>{playerDamageInterceptor=null;};},
  };
  return{
    system,enemy,statuses,
    get playerHp(){return currentPlayerHp;},
    hitPlayer(hit){return playerDamageInterceptor?.(hit)||hit;},
    hasInterceptor(){return typeof playerDamageInterceptor==='function';},
  };
}

function createHarness(items,{enemyHp=300,playerHp=100,currentIndex=0,grantCard=()=>null}={}){
  const board=items.map(cardFor);
  let current=board[currentIndex]||null;
  const fake=createFakeEnemySystem({enemyHp,playerHp});
  const timerCalls=[];
  const runtime=createWardenTrialBazaarRuntime({
    enemySystem:fake.system,
    getPlayer:()=>({x:0,z:0}),
    getBoardCards:()=>board,
    getCurrentCard:()=>current,
    applyCurrentTimerEffect:(effect,seconds)=>{timerCalls.push({effect,seconds});return{instanceId:'current-card',effectApplied:true};},
    grantCard,
  });
  runtime.syncBoard(board);
  return{runtime,board,fake,timerCalls,setCurrent(value){current=value;}};
}

assert.equal(WARDEN_TRIAL_BAZAAR_IMPLEMENTED_ITEM_IDS.length,113);
assert.deepEqual(WARDEN_TRIAL_BAZAAR_IMPLEMENTED_ITEM_IDS,WARDEN_TRIAL_BAZAAR_ITEMS.map(item=>item.id));
assert.equal(new Set(WARDEN_TRIAL_BAZAAR_IMPLEMENTED_ITEM_IDS).size,113);
const supportedTriggers=new Set(WARDEN_TRIAL_BAZAAR_SUPPORTED_TACTIC_TRIGGERS);
for(const item of WARDEN_TRIAL_BAZAAR_ITEMS){
  const profile=wardenTrialBazaarBehaviorProfile(item);
  assert.equal(profile.itemId,item.id);
  assert.equal(profile.ruleCount,item.rules.length);
  assert.ok(profile.summary.length>0,`${item.name} exposes its behavior in ordinary card UI`);
  if(item.family==='tactic'){
    assert.equal(profile.supportedRuleCount,item.rules.length,`${item.name} has no unhandled Tactic trigger`);
    assert.ok(item.rules.every(rule=>supportedTriggers.has(rule.trigger)),`${item.name} uses a supported lifecycle trigger`);
  }

  const originalDamage=createFakeEnemySystem().system.damageEnemy;
  const harness=createHarness([item]);
  harness.runtime.startFight({wave:1});
  assert.equal(harness.runtime.canPlay(harness.board[0]).accepted,true,`${item.name} can enter the ordinary Up play path`);
  const result=harness.runtime.play(harness.board[0]);
  assert.equal(result.accepted,true,`${item.name} resolves without a selector-only implementation`);
  harness.runtime.update(2);
  harness.runtime.destroy();
  assert.equal(harness.runtime.snapshot().enabled,false);
  void originalDamage;
}

{
  const item=wardenTrialBazaarItemForArcana('FLAME-STRIKE');
  const {runtime,board,fake}=createHarness([item]);
  runtime.startFight({wave:1});
  const result=runtime.play(board[0]);
  assert.equal(result.damage,12,'20 Bazaar Damage translates to 12 Saturn enemy HP');
  assert.equal(result.burn,9,'6 Bazaar Burn translates to 9 Saturn HP over time');
  assert.equal(fake.enemy.hp,288);
  runtime.update(2);
  assert.equal(fake.enemy.hp,279,'Burn resolves through three deterministic damage ticks');
  runtime.destroy();
}

{
  const item=wardenTrialBazaarItemForArcana('AQUA-ARC');
  const {runtime,board,fake}=createHarness([item]);
  runtime.startFight({wave:1});
  const result=runtime.play(board[0]);
  assert.equal(result.multicast,2);
  assert.equal(result.damage,24,'Double Barrel repeats its translated 20 Damage twice');
  assert.equal(fake.enemy.hp,276);
  runtime.destroy();
}

{
  const item=wardenTrialBazaarItemForArcana('AIR-BURST');
  const {runtime,board}=createHarness([item]);
  runtime.startFight({wave:1});
  const result=runtime.play(board[0]);
  assert.equal(result.focusProcs,1,'Shoe Blade converts its first-use 100% Crit into one deterministic Focus proc');
  assert.equal(result.damage,30,'the Focus proc adds one extra translated activation');
  runtime.destroy();
}

{
  const item=wardenTrialBazaarItemForArcana('VOLT-DISC');
  const {runtime,board}=createHarness([item],{enemyHp:1000});
  runtime.startFight({wave:1});
  for(let use=0;use<6;use++)assert.equal(runtime.play(board[0]).accepted,true);
  assert.deepEqual(runtime.snapshot().ammo[0],{itemId:item.id,current:0,max:6});
  assert.equal(runtime.canPlay(board[0]).reason,'out-of-ammo');
  runtime.startFight({wave:2});
  assert.equal(runtime.snapshot().ammo[0].current,6,'Ammo refills at the next fight boundary');
  runtime.destroy();
}

{
  const astrolabe=wardenTrialBazaarTacticById('ASTROLABE');
  const katana=wardenTrialBazaarItemForArcana('WIND-SLASH');
  const {runtime,board}=createHarness([astrolabe,katana]);
  runtime.startFight({wave:1});
  runtime.play(board[0]);
  assert.deepEqual(runtime.preparationFor(board[1]).effects,[],
    'a catalog neighbor is not treated as an adjacent card before it is drawn');
  runtime.onCardDrawn(board[1]);
  assert.deepEqual(runtime.prepareRecovery(board[1]).effects,[{effect:'haste',seconds:1}],
    'the actual next randomly drawn card receives temporal Haste preparation');
  runtime.destroy();
}

{
  const diveWeights=wardenTrialBazaarTacticById('DIVE-WEIGHTS');
  const katana=wardenTrialBazaarItemForArcana('WIND-SLASH');
  const {runtime,board}=createHarness([diveWeights,katana]);
  runtime.startFight({wave:1});
  const result=runtime.play(board[0]);
  assert.equal(result.multicast,5,'Dive Weights has base use plus Multicast equal to its 4 current Ammo');
  runtime.onCardDrawn(board[1]);
  assert.deepEqual(runtime.prepareRecovery(board[1]).effects,[{effect:'haste',seconds:5}]);
  runtime.destroy();
}

{
  const shotGlasses=wardenTrialBazaarTacticById('SHOT-GLASSES');
  const katana=wardenTrialBazaarItemForArcana('WIND-SLASH');
  const crowsNest=wardenTrialBazaarTacticById('CROWS-NEST');
  const {runtime,board}=createHarness([shotGlasses,katana,crowsNest]);
  runtime.startFight({wave:1});
  runtime.play(board[0]);
  runtime.onCardDrawn(board[1]);
  const effects=runtime.prepareRecovery(board[1]).effects;
  assert.deepEqual(effects,[{effect:'haste',seconds:1},{effect:'slow',seconds:.5}],
    'Crow\'s Nest halves Slow duration on the only Weapon without changing Haste');
  runtime.destroy();
}

{
  const rowboat=wardenTrialBazaarTacticById('ROWBOAT');
  const katana=wardenTrialBazaarItemForArcana('WIND-SLASH');
  const cauterizingBlade=wardenTrialBazaarItemForArcana('FLAME-STRIKE');
  const {runtime,board}=createHarness([rowboat,katana,cauterizingBlade]);
  runtime.startFight({wave:1});
  runtime.play(board[0]);
  assert.deepEqual(runtime.preparationFor(board[1]).effects,[],
    'Rowboat does not assign Charge by stable catalog position');
  runtime.onCardDrawn(board[2]);
  assert.deepEqual(runtime.preparationFor(board[2]).effects,[{effect:'charge',seconds:2}],
    'Rowboat assigns Charge to whichever card the shuffled deck actually draws next');
  runtime.destroy();
}

{
  const divingHelmet=wardenTrialBazaarTacticById('DIVING-HELMET');
  const fishingRod=wardenTrialBazaarTacticById('FISHING-ROD');
  const katana=wardenTrialBazaarItemForArcana('WIND-SLASH');
  const {runtime,board}=createHarness([divingHelmet,fishingRod,katana]);
  runtime.startFight({wave:1});
  runtime.play(board[0]);
  runtime.play(board[1]);
  runtime.onCardDrawn(board[2]);
  assert.deepEqual(runtime.preparationFor(board[2]).effects,[{effect:'haste',seconds:2}],
    'draw-time temporal tags are established before matching next-card packets resolve');
  runtime.destroy();
}

{
  const port=wardenTrialBazaarTacticById('PORT');
  const katana=wardenTrialBazaarItemForArcana('WIND-SLASH');
  const astrolabe=wardenTrialBazaarTacticById('ASTROLABE');
  const {runtime,board}=createHarness([port,katana,astrolabe]);
  runtime.startFight({wave:1});
  runtime.play(board[0]);
  runtime.play(board[0]);
  let preparation=runtime.preparationFor(board[1]);
  assert.deepEqual(preparation.effects,[{effect:'charge',seconds:2}]);
  assert.equal(preparation.saturated,true,'stored Charge stops at the card\'s full next recovery');
  runtime.play(board[0]);
  assert.deepEqual(runtime.preparationFor(board[1]).effects,[{effect:'charge',seconds:2}],
    'additional Charge cannot overfill a zero-recovery preparation');
  runtime.play(board[2]);
  runtime.onCardDrawn(board[1]);
  preparation=runtime.preparationFor(board[1]);
  assert.deepEqual(preparation.effects,[{effect:'charge',seconds:2}],
    'positive Haste preparation is also rejected after the next recovery is fully Charged');
  assert.deepEqual(runtime.prepareRecovery(board[1]).effects,[{effect:'charge',seconds:2}],
    'the capped preparation remains stored until that card is played Up');
  assert.deepEqual(runtime.preparationFor(board[1]).effects,[],
    'consuming the prepared Up recovery reopens the card for future preparation');
  runtime.destroy();
}

{
  const barrel=wardenTrialBazaarTacticById('BARREL');
  const {runtime,board,fake}=createHarness([barrel]);
  assert.equal(fake.hasInterceptor(),true);
  runtime.startFight({wave:1});
  runtime.play(board[0]);
  assert.equal(runtime.snapshot().shield,30);
  assert.deepEqual(fake.hitPlayer({damage:20,playerHp:100}),{damage:0});
  assert.equal(runtime.snapshot().shield,10);
  runtime.destroy();
  assert.equal(fake.hasInterceptor(),false);
}

{
  const coral=wardenTrialBazaarTacticById('CORAL');
  const pufferfish=wardenTrialBazaarItemForArcana('AQUA-VORTEX');
  const harness=createHarness([coral],{playerHp:50});
  harness.runtime.startFight({wave:1});
  harness.board.push(cardFor(pufferfish));
  harness.runtime.onCardAcquired(harness.board[1]);
  harness.runtime.play(harness.board[0]);
  assert.equal(harness.fake.playerHp,75,'buying an Aquatic item permanently adds 5 to Coral\'s 20 Heal');
  harness.runtime.destroy();
}

{
  const langxian=wardenTrialBazaarItemForArcana('EARTHEN-AEGIS');
  const {runtime,board}=createHarness([langxian],{enemyHp:1000});
  runtime.startFight({wave:1});
  assert.equal(runtime.play(board[0]).damage,24);
  runtime.endFight({won:true,wave:1});
  runtime.startFight({wave:2});
  assert.equal(runtime.play(board[0]).damage,48,'Langxian preserves its +40 Damage win gain across fights');
  runtime.destroy();
}

{
  const tropicalIsland=wardenTrialBazaarTacticById('TROPICAL-ISLAND');
  const {runtime,fake}=createHarness([tropicalIsland],{playerHp:50});
  runtime.startFight({wave:1});
  runtime.endFight({won:false,wave:1});
  assert.equal(runtime.snapshot().provisions,2,'Tropical Island creates both provisions at every fight end');
  runtime.startFight({wave:2});
  assert.equal(fake.playerHp,70,'Coconut and Citrus become two 10-HP provisions at the next fight start');
  runtime.destroy();
}

{
  const cannonball=wardenTrialBazaarTacticById('CANNONBALL');
  const revolver=wardenTrialBazaarItemForArcana('VOLT-DISC');
  const {runtime}=createHarness([cannonball,revolver]);
  runtime.startFight({wave:1});
  assert.deepEqual(runtime.snapshot().ammo.find(row=>row.itemId===revolver.id),{itemId:revolver.id,current:7,max:7});
  runtime.destroy();
}

{
  const katana=wardenTrialBazaarItemForArcana('WIND-SLASH');
  const {runtime,fake}=createHarness([katana]);
  const originalDamage=fake.system.damageEnemy;
  // The runtime is already installed, so recover the wrapped method's result
  // and verify native Arcana damage cannot duplicate the translated payload.
  assert.equal(fake.system.damageEnemy(fake.enemy,50,{x:0,z:0},{source:'wizardArcana'}),false);
  assert.equal(fake.enemy.hp,300);
  assert.equal(runtime.snapshot().suppressedNativeHits,1);
  runtime.destroy();
  assert.notEqual(originalDamage,fake.system.damageEnemy,'the captured value is the installed gate before teardown');
  fake.system.damageEnemy(fake.enemy,10);
  assert.equal(fake.enemy.hp,290,'teardown restores the original enemy damage method');
}

console.log('Warden Trial full Bazaar runtime: ok');
