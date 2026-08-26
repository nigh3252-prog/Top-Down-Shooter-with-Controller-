import {
  WARDEN_TRIAL_BAZAAR_ITEMS,
  wardenTrialBazaarItemById,
  wardenTrialBazaarItemForArcana,
  wardenTrialBazaarPendingCooldownSeconds,
  wardenTrialBazaarTacticById,
} from './warden-trial-bazaar-catalog.js';

export const WARDEN_TRIAL_BAZAAR_TRANSLATION = Object.freeze({
  damagePerTwenty:12,
  burnPerFour:6,
  poisonPerFour:6,
  dotTicks:3,
  dotIntervalSeconds:.65,
  baseValue:10,
  waveGold:5,
  acquiredCardGold:2,
});

export const WARDEN_TRIAL_BAZAAR_IMPLEMENTED_ITEM_IDS = Object.freeze(
  WARDEN_TRIAL_BAZAAR_ITEMS.map(item=>item.id),
);

export const WARDEN_TRIAL_BAZAAR_SUPPORTED_TACTIC_TRIGGERS = Object.freeze([
  'at_end_of_each_fight','at_start_of_each_day','at_start_of_each_fight',
  'first_2_enemy_item_uses_each_fight','for_each_adjacent_aquatic_item',
  'for_each_adjacent_friend_or_ray','for_each_friend_you_have','on_use',
  'the_first_time_you_would_be_defeated_each_fight','when_an_enemy_uses_an_item',
  'when_any_adjacent_item_is_used','when_any_aquatic_item_is_used',
  'when_any_item_or_skill_on_board_or_in_stash_applies_slow',
  'when_the_item_to_the_right_crits','when_you_buy_an_aquatic_item',
  'when_you_buy_another_aquatic_item','when_you_buy_this','when_you_sell_an_item',
  'when_you_use_another_aquatic_item','when_you_use_another_non_weapon_item',
  'when_you_win_a_fight','while_on_board','while_you_have_a_vehicle_or_large_item',
  'while_you_have_another_vehicle_or_large_item','while_you_have_at_least_7_unique_types',
  'while_you_have_exactly_one_weapon','while_you_have_only_one_weapon',
]);

const supportedTacticTriggers=new Set(WARDEN_TRIAL_BAZAAR_SUPPORTED_TACTIC_TRIGGERS);
const finite=value=>Number.isFinite(Number(value))?Number(value):0;
const positive=value=>Math.max(0,finite(value));
const round=value=>Math.round(finite(value)*100)/100;
const normalizedId=value=>String(value||'').trim().toUpperCase();
const tagsFor=item=>new Set(Array.isArray(item?.tags)?item.tags:[]);
const ruleText=rule=>typeof rule==='string'?rule:String(rule?.effect||'');
const rulesFor=item=>(Array.isArray(item?.rules)?item.rules:[]).map(ruleText).filter(Boolean);
const mapValue=(map,key)=>finite(map.get(key));
const addMap=(map,key,amount)=>{const next=mapValue(map,key)+finite(amount);map.set(key,next);return next;};
const clearMaps=object=>Object.values(object).forEach(value=>value instanceof Map?value.clear():value instanceof Set?value.clear():undefined);

function entryForCard(card){
  const item=card?.__wardenTrialBazaar
    ||wardenTrialBazaarItemById(card?.__wardenTrialBazaarItemId)
    ||wardenTrialBazaarItemForArcana(card?.__wardenTrialArcanaId)
    ||wardenTrialBazaarTacticById(card?.__wardenTrialTacticId);
  return item||null;
}

function mechanicLabels(item){
  const text=rulesFor(item).join(' ').toLowerCase(),labels=[];
  for(const [pattern,label] of [
    [/damage|health/,'Damage'],[/burn/,'Burn'],[/poison/,'Poison'],[/ammo|reload/,'Ammo'],
    [/multicast/,'Multicast'],[/haste/,'Haste'],[/charge/,'Charge'],[/slow/,'Slow'],
    [/freeze/,'Freeze'],[/shield|damage reduction/,'Defense'],[/heal|lifesteal|regen/,'Recovery'],
    [/crit/,'Focus'],[/flying/,'Momentum'],[/value|gold|buy|sell|day/,'Progression'],
  ])if(pattern.test(text)||item?.tags?.some(tag=>pattern.test(String(tag).toLowerCase())))labels.push(label);
  return [...new Set(labels)];
}

export function wardenTrialBazaarBehaviorProfile(value){
  const item=typeof value==='string'
    ?wardenTrialBazaarItemById(value)||wardenTrialBazaarItemForArcana(value)||wardenTrialBazaarTacticById(value)
    :entryForCard(value)||value;
  if(!item)return null;
  const tacticRules=item.family==='tactic'?item.rules||[]:[];
  return Object.freeze({
    itemId:item.id,
    family:item.family,
    mechanics:Object.freeze(mechanicLabels(item)),
    ruleCount:(item.rules||[]).length,
    supportedRuleCount:item.family==='tactic'
      ?tacticRules.filter(rule=>supportedTacticTriggers.has(rule.trigger)).length
      :(item.rules||[]).length,
    summary:rulesFor(item).join(' · '),
  });
}

const normalizedDamage=raw=>round(positive(raw)/20*WARDEN_TRIAL_BAZAAR_TRANSLATION.damagePerTwenty);
const normalizedDot=(raw,kind)=>round(positive(raw)/4*(kind==='burn'
  ?WARDEN_TRIAL_BAZAAR_TRANSLATION.burnPerFour
  :WARDEN_TRIAL_BAZAAR_TRANSLATION.poisonPerFour));
const alive=target=>!!target&&positive(target.hp)>0;

function newFightState(){
  return{
    shield:0,regen:0,regenTick:1,lifePreserverUsed:false,enemyUses:0,
    disabled:new Set(),flying:new Set(),used:new Map(),focusMeter:new Map(),
    damage:new Map(),burn:new Map(),poison:new Map(),shieldBonus:new Map(),heal:new Map(),
    multicast:new Map(),focus:new Map(),cooldownPercent:new Map(),cooldownFlat:new Map(),
    tags:new Map(),quest:new Map(),dots:[],lastEndedWave:null,
  };
}

export function createWardenTrialBazaarRuntime({
  enemySystem=null,
  getPlayer=()=>({x:0,z:0}),
  getBoardCards=()=>[],
  getCurrentCard=()=>null,
  getWave=()=>1,
  applyCurrentTimerEffect=()=>null,
  grantCard=()=>null,
  emit=()=>{},
  onChange=()=>{},
}={}){
  let enabled=true;
  let boardCards=[];
  let board=[];
  let fight=newFightState();
  let fightNumber=0;
  let wins=0;
  let acquiredCards=0;
  let lastAction='BAZAAR DECK READY';
  let suppressedNativeHits=0;
  let actionSerial=0;
  let reactiveDepth=0;
  let provisions=0;
  const ammo=new Map(),maxAmmo=new Map(),pendingTimers=new Map(),reactiveLinks=new Map();
  const nextCardPackets=[];
  const permanent={damage:new Map(),shield:new Map(),heal:new Map(),maxAmmo:new Map(),value:new Map()};

  const snapshot=()=>Object.freeze({
    enabled,fightNumber,wins,boardCount:board.length,shield:round(fight.shield),regen:round(fight.regen),
    provisions,activeDots:fight.dots.length,suppressedNativeHits,lastAction,
    disabledItems:Object.freeze([...fight.disabled]),flyingItems:Object.freeze([...fight.flying]),
    ammo:Object.freeze([...maxAmmo].map(([itemId,maximum])=>Object.freeze({
      itemId,current:round(ammo.get(itemId)||0),max:round(maximum),
    }))),
    preparations:Object.freeze([...pendingTimers].map(([preparedItemId,effects])=>Object.freeze({
      itemId:preparedItemId,...Object.fromEntries(Object.entries(effects).map(([effect,seconds])=>[effect,round(seconds)])),
    }))),
    nextCardPreparationCount:nextCardPackets.length,
  });

  const notify=event=>{
    const payload=Object.freeze({type:'warden-bazaar',...event});
    try{emit(payload);}catch{}
    try{onChange(snapshot(),payload);}catch{}
    return payload;
  };

  const rebuildBoard=cards=>{
    boardCards=(Array.isArray(cards)?cards:[]).filter(Boolean).slice();
    board=boardCards.map((card,index)=>({card,item:entryForCard(card),index})).filter(entry=>entry.item);
    return board;
  };
  const boardNow=()=>rebuildBoard(getBoardCards?.()||boardCards);
  const byItemId=value=>boardNow().find(entry=>entry.item.id===normalizedId(value))||null;
  const cardEntry=value=>{
    if(value?.item?.id)return byItemId(value.item.id)||value;
    const directItem=value?.id&&value?.family?wardenTrialBazaarItemById(value.id):null;
    const item=entryForCard(value)||directItem||wardenTrialBazaarItemById(value)||wardenTrialBazaarItemForArcana(value)||wardenTrialBazaarTacticById(value);
    return item?byItemId(item.id)||{card:value?.__wardenTrialBazaar?value:null,item,index:-1}:null;
  };
  const owns=value=>!!byItemId(value);
  const effectiveTags=entry=>{
    const tags=tagsFor(entry?.item);
    for(const tag of fight.tags.get(entry?.item?.id)||[])tags.add(tag);
    return tags;
  };
  const hasTag=(entry,tag)=>effectiveTags(entry).has(tag);
  const entriesWithTag=tag=>boardNow().filter(entry=>hasTag(entry,tag));
  const otherEntries=entry=>boardNow().filter(candidate=>candidate.item.id!==entry?.item?.id);

  function queueNextCardPacket(kind,amount,{count=1,tags=[],matchAll=false,sourceItemId=null}={}){
    const remaining=Math.max(1,Math.trunc(positive(count)||1));
    const value=finite(amount);
    if(kind!=='observer'&&kind!=='tag'&&Math.abs(value)<=1e-9)return false;
    nextCardPackets.push({kind,value,remaining,tags:[...new Set(tags)].filter(Boolean),matchAll:matchAll===true,sourceItemId});
    return true;
  }
  const queueNextTimer=(effect,seconds,options={})=>positive(seconds)>0&&queueNextCardPacket(`timer:${String(effect||'').toLowerCase()}`,positive(seconds),options);
  const queueNextObserver=(entry,options={})=>entry?queueNextCardPacket('observer',0,{...options,sourceItemId:entry.item.id}):false;
  const nextPacketMatches=(packet,entry)=>!packet.tags.length
    ||(packet.matchAll?packet.tags.every(tag=>hasTag(entry,tag)):packet.tags.some(tag=>hasTag(entry,tag)));

  function applyNextCardPacket(packet,entry){
    if(packet.kind.startsWith('timer:'))queueTimer(entry,packet.kind.slice(6),packet.value);
    else if(packet.kind==='damage')addMap(fight.damage,entry.item.id,packet.value);
    else if(packet.kind==='shield')addMap(fight.shieldBonus,entry.item.id,packet.value);
    else if(packet.kind==='focus')addMap(fight.focus,entry.item.id,packet.value);
    else if(packet.kind==='cooldown-percent')addMap(fight.cooldownPercent,entry.item.id,packet.value);
    else if(packet.kind==='cooldown-flat')addMap(fight.cooldownFlat,entry.item.id,packet.value);
    else if(packet.kind==='multicast')addMap(fight.multicast,entry.item.id,packet.value);
    else if(packet.kind==='flying')markFlying(entry);
    else if(packet.kind==='tag'){
      const tags=fight.tags.get(entry.item.id)||new Set();tags.add(String(packet.sourceItemId||'Aquatic'));fight.tags.set(entry.item.id,tags);
    }else if(packet.kind==='observer'){
      const links=reactiveLinks.get(entry.item.id)||[];links.push(packet.sourceItemId);reactiveLinks.set(entry.item.id,links);
    }
  }

  function onCardDrawn(value){
    const entry=cardEntry(value);if(!entry)return null;
    const consumed=[];
    const applyPass=predicate=>{
      for(const packet of nextCardPackets){
        if(consumed.includes(packet)||!predicate(packet)||!nextPacketMatches(packet,entry))continue;
        applyNextCardPacket(packet,entry);consumed.push(packet);
      }
    };
    // Tags establish the temporal equivalent of placement before tag filters
    // are evaluated. Static cooldown modifiers also land before Charge is
    // capped against the prepared recovery duration.
    applyPass(packet=>packet.kind==='tag');
    applyPass(packet=>!packet.kind.startsWith('timer:'));
    applyPass(packet=>packet.kind.startsWith('timer:'));
    for(let index=nextCardPackets.length-1;index>=0;index--){
      const packet=nextCardPackets[index];if(!consumed.includes(packet))continue;
      packet.remaining--;
      if(packet.remaining<=0)nextCardPackets.splice(index,1);
    }
    return preparationFor(entry);
  }

  const maximumAmmoFor=entry=>{
    const base=positive(entry?.item?.output?.ammo);
    if(base<=0)return 0;
    return base+mapValue(permanent.maxAmmo,entry.item.id)+(owns('BAZAAR-TACTIC-CANNONBALL')?1:0);
  };
  function refreshAmmo({refill=false}={}){
    for(const entry of boardNow()){
      const maximum=maximumAmmoFor(entry);
      if(maximum<=0){maxAmmo.delete(entry.item.id);ammo.delete(entry.item.id);continue;}
      const prior=ammo.has(entry.item.id)?ammo.get(entry.item.id):maximum;
      maxAmmo.set(entry.item.id,maximum);
      ammo.set(entry.item.id,refill?maximum:Math.min(maximum,positive(prior)));
    }
  }
  const ammoState=entry=>Object.freeze({current:positive(ammo.get(entry.item.id)),max:positive(maxAmmo.get(entry.item.id))});
  const reloadItem=(entry,amount)=>{
    const maximum=positive(maxAmmo.get(entry.item.id)),before=positive(ammo.get(entry.item.id));
    if(maximum<=0)return 0;
    const after=Math.min(maximum,before+positive(amount));ammo.set(entry.item.id,after);return after-before;
  };
  const reloadAll=amount=>boardNow().reduce((sum,entry)=>sum+reloadItem(entry,amount),0);

  const nearestTargets=count=>{
    const player=getPlayer?.()||{x:0,z:0};
    const enemies=(enemySystem?.hostileEnemies||enemySystem?.enemies||[]).filter(alive).slice();
    enemies.sort((a,b)=>Math.hypot(finite(a.x)-finite(player.x),finite(a.z)-finite(player.z))
      -Math.hypot(finite(b.x)-finite(player.x),finite(b.z)-finite(player.z)));
    const direct=enemySystem?.getNearestHostile?.({x:finite(player.x),z:finite(player.z)});
    if(alive(direct)&&!enemies.includes(direct))enemies.unshift(direct);
    return enemies.slice(0,Math.max(1,Math.trunc(positive(count)||1)));
  };
  const damageTarget=(target,amount,options={})=>{
    const value=positive(amount),before=positive(target?.hp);
    if(!alive(target)||value<=0||typeof enemySystem?.damageEnemy!=='function')return 0;
    enemySystem.damageEnemy(target,value,{x:0,z:0},{source:'wardenBazaar',power:.28,pop:.05,...options});
    return Math.min(before,value);
  };
  const healPlayer=amount=>positive(enemySystem?.healPlayer?.(positive(amount)));
  const addShield=amount=>{fight.shield+=positive(amount);return fight.shield;};

  function scheduleDot(target,kind,total,itemId){
    const value=positive(total);
    if(!alive(target)||value<=0)return null;
    const ticks=WARDEN_TRIAL_BAZAAR_TRANSLATION.dotTicks;
    const dot={id:`${itemId}:${kind}:${++actionSerial}`,target,kind,itemId,ticksRemaining:ticks,
      tickDamage:round(value/ticks),untilNext:WARDEN_TRIAL_BAZAAR_TRANSLATION.dotIntervalSeconds};
    fight.dots.push(dot);return dot;
  }

  const valueFor=entry=>WARDEN_TRIAL_BAZAAR_TRANSLATION.baseValue+mapValue(permanent.value,entry.item.id);
  const runGold=()=>wins*WARDEN_TRIAL_BAZAAR_TRANSLATION.waveGold+acquiredCards*WARDEN_TRIAL_BAZAAR_TRANSLATION.acquiredCardGold;
  const onlyWeapon=entry=>entriesWithTag('Weapon').length===1&&entriesWithTag('Weapon')[0]?.item.id===entry.item.id;

  function auraDamage(entry){
    let bonus=0;
    const lockbox=byItemId('BAZAAR-TACTIC-LOCKBOX');if(lockbox)bonus+=valueFor(lockbox);
    if(owns('BAZAAR-HANDAXE')&&hasTag(entry,'Weapon'))bonus+=5;
    return bonus;
  }
  const damageRaw=entry=>positive(entry.item.output?.damage)+mapValue(permanent.damage,entry.item.id)
    +mapValue(fight.damage,entry.item.id)+auraDamage(entry);
  const burnRaw=entry=>positive(entry.item.output?.burn)+mapValue(fight.burn,entry.item.id);
  const poisonRaw=entry=>positive(entry.item.output?.poison)+mapValue(fight.poison,entry.item.id);
  const shieldBonus=entry=>mapValue(permanent.shield,entry.item.id)+mapValue(fight.shieldBonus,entry.item.id);
  const healBonus=entry=>mapValue(permanent.heal,entry.item.id)+mapValue(fight.heal,entry.item.id);

  function focusChance(entry){
    let chance=mapValue(fight.focus,entry.item.id);
    if(entry.item.arcanaId==='EXPLOSIVE-CHARGE')chance+=25;
    if(owns('BAZAAR-TACTIC-KORXENA-CREST'))chance+=15;
    if(hasTag(entry,'Weapon')&&owns('BAZAAR-TACTIC-CROWS-NEST'))chance+=40;
    const petRock=byItemId('BAZAAR-PET-ROCK');if(petRock&&entriesWithTag('Friend').length===1)chance+=10;
    return Math.max(0,chance);
  }

  function baseMulticast(entry,ammoBefore){
    const output=entry.item.output?.multicast;
    if(Number.isFinite(Number(output)))return Math.max(1,Math.trunc(Number(output)));
    if(output?.formula==='current_ammo')return Math.max(1,Math.trunc(positive(ammoBefore)));
    let total=Math.max(1,Math.trunc(positive(output?.base)||1));
    if(output?.per_other_aquatic)total+=otherEntries(entry).filter(value=>hasTag(value,'Aquatic')).length*positive(output.per_other_aquatic);
    if(output?.per_matching_item){
      const matching=[...(output.matching_types||[]),...(output.matching_tags||[])];
      total+=otherEntries(entry).filter(value=>matching.some(tag=>hasTag(value,tag))).length*positive(output.per_matching_item);
    }
    return Math.max(1,Math.trunc(total));
  }
  function multicastFor(entry,ammoBefore){
    let total=baseMulticast(entry,ammoBefore)+mapValue(fight.multicast,entry.item.id);
    if(entry.item.tacticId==='DIVE-WEIGHTS')total+=positive(ammoBefore);
    if(entry.item.tacticId==='SEADOGS-SALOON')total+=entriesWithTag('Friend').length;
    if(hasTag(entry,'Aquatic')&&owns('BAZAAR-TACTIC-SHIPWRECK'))total+=1;
    return Math.max(1,Math.trunc(total));
  }

  function cooldownDuration(entry){
    let duration=wardenTrialBazaarPendingCooldownSeconds(entry.item);
    let percent=mapValue(fight.cooldownPercent,entry.item.id),flat=mapValue(fight.cooldownFlat,entry.item.id);
    const suppressor=byItemId('BAZAAR-TACTIC-SUPPRESSOR');
    if(suppressor&&onlyWeapon(entry))percent-=.05;
    if(fight.flying.has(entry.item.id)&&owns('BAZAAR-TACTIC-STEALTH-GLIDER'))flat-=1;
    if(entry.item.tacticId==='CAPTAINS-WHEEL'&&boardNow().some(value=>value.item.id!==entry.item.id&&(hasTag(value,'Vehicle')||value.item.size==='Large')))flat-=2.5;
    if(entry.item.tacticId==='ROWBOAT'&&new Set(boardNow().flatMap(value=>[...effectiveTags(value)])).size>=7)flat-=5;
    if(entry.item.tacticId==='SUBMERSIBLE'&&boardNow().some(value=>value.item.id!==entry.item.id&&(hasTag(value,'Vehicle')||value.item.size==='Large')))flat-=2;
    return round(Math.max(.5,duration*(1+percent)+flat));
  }

  function queueTimer(entry,effect,seconds){
    if(!entry||positive(seconds)<=0)return false;
    const kind=String(effect||'').toLowerCase();let amount=positive(seconds);
    if(kind==='slow'&&onlyWeapon(entry)&&owns('BAZAAR-TACTIC-CROWS-NEST'))amount*=.5;
    if((kind==='slow'||kind==='freeze')&&entry.item.arcanaId==='AQUA-BREAKER'&&onlyWeapon(entry))amount*=.5;
    const current=cardEntry(getCurrentCard?.());
    if(current?.item.id===entry.item.id){
      const applied=applyCurrentTimerEffect(kind,amount,{source:'bazaar'});
      if(applied?.effectApplied){if(kind==='haste')recordHaste(entry);return true;}
      if(applied?.complete)return false;
    }
    const queued=pendingTimers.get(entry.item.id)||{charge:0,haste:0,slow:0,freeze:0};
    const duration=cooldownDuration(entry);
    if((kind==='charge'||kind==='haste')&&queued.charge>=duration-1e-9)return false;
    if(kind==='charge')amount=Math.min(amount,Math.max(0,duration-queued.charge));
    if(!Object.hasOwn(queued,kind)||amount<=0)return false;
    queued[kind]+=amount;
    pendingTimers.set(entry.item.id,queued);
    if(kind==='haste')recordHaste(entry);
    return true;
  }
  function preparationFor(value){
    const entry=cardEntry(value);if(!entry)return null;
    const durationSeconds=cooldownDuration(entry),queued=pendingTimers.get(entry.item.id)||{charge:0,haste:0,slow:0,freeze:0};
    return Object.freeze({
      itemId:entry.item.id,
      durationSeconds,
      saturated:queued.charge>=durationSeconds-1e-9,
      effects:Object.freeze(Object.entries(queued).filter(([,seconds])=>seconds>0)
        .map(([effect,seconds])=>Object.freeze({effect,seconds:round(seconds)}))),
    });
  }
  function takePendingEffects(value){
    const entry=cardEntry(value);if(!entry)return Object.freeze([]);
    const queued=pendingTimers.get(entry.item.id);if(!queued)return Object.freeze([]);
    pendingTimers.delete(entry.item.id);
    return Object.freeze(Object.entries(queued).filter(([,seconds])=>seconds>0)
      .map(([effect,seconds])=>Object.freeze({effect,seconds:round(seconds)})));
  }
  function preparePending(value){
    const entry=cardEntry(value);if(!entry)return null;
    return Object.freeze({itemId:entry.item.id,durationSeconds:cooldownDuration(entry),effects:takePendingEffects(entry)});
  }
  const prepareRecovery=preparePending;

  function canPlay(value){
    if(!enabled)return Object.freeze({accepted:false,reason:'runtime-disabled'});
    const entry=cardEntry(value);if(!entry)return Object.freeze({accepted:false,reason:'not-bazaar-card'});
    if(fight.disabled.has(entry.item.id))return Object.freeze({accepted:false,reason:'destroyed-for-fight',entry});
    const maximum=positive(maxAmmo.get(entry.item.id));
    if(maximum>0&&positive(ammo.get(entry.item.id))<=0)return Object.freeze({accepted:false,reason:'out-of-ammo',entry,ammo:ammoState(entry)});
    return Object.freeze({accepted:true,reason:'ready',entry,ammo:ammoState(entry)});
  }

  function consumeAmmo(entry){
    const maximum=positive(maxAmmo.get(entry.item.id)),before=positive(ammo.get(entry.item.id));
    if(maximum<=0)return before;
    ammo.set(entry.item.id,entry.item.arcanaId==='STAR-BOLT'?0:Math.max(0,before-1));
    return before;
  }

  function addDamageToWeapons(amount){for(const entry of entriesWithTag('Weapon'))addMap(fight.damage,entry.item.id,amount);}
  function addBurnToTagged(amount){for(const entry of boardNow().filter(value=>hasTag(value,'Burn')))addMap(fight.burn,entry.item.id,amount);}
  function addPoisonToTagged(amount){for(const entry of boardNow().filter(value=>hasTag(value,'Poison')))addMap(fight.poison,entry.item.id,amount);}
  function markFlying(entry){if(!entry)return;fight.flying.add(entry.item.id);}

  function recordHaste(target){
    addMap(fight.quest,'haste-events',1);
    const caut=byItemId('BAZAAR-CAUTERIZING-BLADE');
    if(caut&&mapValue(fight.quest,'cauterizing-complete')<1&&Math.max(mapValue(fight.quest,'haste-events'),mapValue(fight.quest,'slow-events'))>=10){
      fight.quest.set('cauterizing-complete',1);addMap(fight.damage,caut.item.id,10);addMap(fight.burn,caut.item.id,3);
    }
    const scimitar=byItemId('BAZAAR-SCIMITAR-OF-THE-DEEP');if(scimitar?.item.id===target.item.id)addPoisonToTagged(3);
    const sharkray=byItemId('BAZAAR-SHARKRAY');if(sharkray&&hasTag(target,'Friend')){addDamageToWeapons(5);for(const entry of boardNow().filter(value=>hasTag(value,'Friend')&&hasTag(value,'Poison')))addMap(fight.poison,entry.item.id,1);}
    const trebuchet=byItemId('BAZAAR-TREBUCHET');if(trebuchet)queueTimer(trebuchet,'charge',2);
    const catfish=byItemId('BAZAAR-CATFISH');if(catfish?.item.id===target.item.id)addMap(fight.poison,catfish.item.id,3);
    const salt=byItemId('BAZAAR-OLD-SALTCLAW');if(salt)addMap(fight.damage,salt.item.id,5);
    const puffer=byItemId('BAZAAR-PUFFERFISH');if(puffer?.item.id===target.item.id)queueTimer(puffer,'charge',2);
  }

  function recordSlow(source){
    addMap(fight.quest,'slow-events',1);
    const caut=byItemId('BAZAAR-CAUTERIZING-BLADE');
    if(caut&&mapValue(fight.quest,'cauterizing-complete')<1&&Math.max(mapValue(fight.quest,'haste-events'),mapValue(fight.quest,'slow-events'))>=10){
      fight.quest.set('cauterizing-complete',1);addMap(fight.damage,caut.item.id,10);addMap(fight.burn,caut.item.id,3);
    }
    const mantis=byItemId('BAZAAR-MANTIS-SHRIMP');if(mantis){addMap(fight.damage,mantis.item.id,10);addMap(fight.burn,mantis.item.id,2);}
    const jitte=byItemId('BAZAAR-JITTE');if(jitte)addMap(fight.damage,jitte.item.id,10);
    const kusar=byItemId('BAZAAR-KUSARIGAMA');if(kusar){addMap(fight.damage,kusar.item.id,4);queueNextCardPacket('damage',4,{tags:['Weapon']});}
    const salt=byItemId('BAZAAR-OLD-SALTCLAW');if(salt)addMap(fight.damage,salt.item.id,5);
    if(owns('BAZAAR-TACTIC-TROPICAL-ISLAND'))fight.regen+=5;
    const lighthouse=byItemId('BAZAAR-LIGHTHOUSE');if(lighthouse)dealPrintedDot(lighthouse,'burn',8);
    notify({phase:'slow',sourceItemId:source?.item?.id||null});
  }

  function recordBurn(source){
    const primordial=byItemId('BAZAAR-SLUMBERING-PRIMORDIAL');if(primordial){queueTimer(primordial,'charge',2);addMap(fight.damage,primordial.item.id,15);}
    const bonfire=byItemId('BAZAAR-BONFIRE');if(bonfire)queueNextTimer('haste',1);
    const keg=byItemId('BAZAAR-POWDER-KEG');if(keg)queueTimer(keg,'charge',2);
    const blunderbuss=byItemId('BAZAAR-BLUNDERBUSS');if(blunderbuss?.item.id!==source?.item?.id)autoActivate(blunderbuss,'burn-trigger');
    const zoarcid=byItemId('BAZAAR-ZOARCID');if(zoarcid)queueTimer(zoarcid,'charge',1);
  }
  function recordPoison(){const primordial=byItemId('BAZAAR-SLUMBERING-PRIMORDIAL');if(primordial){queueTimer(primordial,'charge',2);addMap(fight.damage,primordial.item.id,15);}}
  function recordFreeze(source){
    const primordial=byItemId('BAZAAR-SLUMBERING-PRIMORDIAL');if(primordial){queueTimer(primordial,'charge',2);addMap(fight.damage,primordial.item.id,15);}
    if(source?.item.arcanaId==='ICE-DAGGER')addMap(fight.damage,source.item.id,15);
  }

  function dealPrintedDot(entry,kind,raw,multicast=1){
    const target=nearestTargets(1)[0],total=normalizedDot(raw,kind)*Math.max(1,multicast);
    if(target)scheduleDot(target,kind,total,entry.item.id);
    if(kind==='burn')recordBurn(entry);else recordPoison(entry);
    return total;
  }
  function applySlow(entry,count,duration){
    let applied=0;for(const target of nearestTargets(count))if(enemySystem?.applyStatus?.(target,'slow',duration,{multiplier:.5,source:'wardenBazaar'})){applied++;}
    if(applied>0)recordSlow(entry);return applied;
  }
  function applyFreeze(entry,count,duration){
    let applied=0;for(const target of nearestTargets(count))if(enemySystem?.applyStatus?.(target,'freeze',duration,{source:'wardenBazaar'})){applied++;}
    if(applied>0)recordFreeze(entry);return applied;
  }

  function onFocusProc(source){
    const sai=byItemId('BAZAAR-CYBER-SAI');if(sai)addDamageToWeapons(10);
    const scimitar=byItemId('BAZAAR-SCIMITAR-OF-THE-DEEP');if(scimitar)dealPrintedDot(scimitar,'poison',Math.round(damageRaw(scimitar)*.25));
    const knives=byItemId('BAZAAR-THROWING-KNIVES');if(knives?.item.id!==source.item.id)autoActivate(knives,'focus-trigger');
    if(owns('BAZAAR-ONI-MASK'))addBurnToTagged(4);
    const kusar=byItemId('BAZAAR-KUSARIGAMA');if(kusar){addMap(fight.damage,kusar.item.id,4);queueNextCardPacket('damage',4,{tags:['Weapon']});}
    if(activeTemporalObservers.has('BAZAAR-TACTIC-INTEGRATED-HUD')){
      const hud=byItemId('BAZAAR-TACTIC-INTEGRATED-HUD');if(hud)applySlow(hud,1,1);
    }
    notify({phase:'focus',itemId:source.item.id});
  }
  function focusProcCount(entry,activationCount=1){
    let chance=focusChance(entry);
    if(entry.item.arcanaId==='AIR-BURST'&&mapValue(fight.used,entry.item.id)===0)chance+=100;
    const meter=mapValue(fight.focusMeter,entry.item.id)+chance*Math.max(1,positive(activationCount)),procs=Math.floor(meter/100);
    fight.focusMeter.set(entry.item.id,meter-procs*100);
    for(let index=0;index<procs;index++)onFocusProc(entry);
    return procs;
  }

  const hasOnUse=(item,pattern)=>rulesFor(item).some(rule=>/^On use/i.test(rule)&&pattern.test(rule));
  function resolveArcana(entry,{forced=false,trigger='play',ammoBefore=0}={}){
    const item=entry.item;
    let rawDamage=damageRaw(entry);
    if(item.arcanaId==='RAZOR-BURST')rawDamage+=focusChance(entry);
    if(item.arcanaId==='AQUA-BEAM'&&onlyWeapon(entry))rawDamage*=5;
    const multicast=multicastFor(entry,ammoBefore),focusProcs=focusProcCount(entry,multicast);
    const activations=multicast+focusProcs*(entry.item.arcanaId==='SHEARING-CHAIN'?2:1);
    const dealDamage=forced||hasOnUse(item,/deal/i),dealBurn=forced||hasOnUse(item,/Burn/i),dealPoison=forced||hasOnUse(item,/Poison/i);
    const target=nearestTargets(1)[0];
    let damage=0,burn=0,poison=0;
    if(target&&dealDamage){
      const flat=normalizedDamage(rawDamage),percent=positive(item.output?.healthDamagePercent)>0
        ?round(positive(target.maxHp||target.hp)*positive(item.output.healthDamagePercent)/100):0;
      damage=damageTarget(target,(flat+percent)*activations,{bazaarItemId:item.id,multicast:activations,trigger});
    }
    if(dealBurn&&burnRaw(entry)>0)burn=dealPrintedDot(entry,'burn',burnRaw(entry),activations);
    if(dealPoison&&poisonRaw(entry)>0)poison=dealPrintedDot(entry,'poison',poisonRaw(entry),activations);
    if(item.arcanaId==='PERFORATING-JET')applySlow(entry,1,1);
    if(item.arcanaId==='ICE-DAGGER')applyFreeze(entry,1,1);
    if(item.arcanaId==='TOXIC-TRAP')applyFreeze(entry,1,1);
    if(item.arcanaId==='SNARE-TRACK')applySlow(entry,2,1);
    if(item.arcanaId==='SHOCK-LINE')applySlow(entry,1,1);
    if(item.arcanaId==='WARD-OF-FLAMES')applySlow(entry,1,2);
    if(item.arcanaId==='TOXIC-BOLAS')applySlow(entry,1,2);
    if(item.arcanaId==='SHOCK-NOVA')applySlow(entry,1,1);
    if(item.arcanaId==='AQUA-BREAKER')addShield(rawDamage+shieldBonus(entry));
    if(item.arcanaId==='RAZOR-BURST'||item.arcanaId==='FROST-FEINT'||(hasTag(entry,'Weapon')&&onlyWeapon(entry)&&owns('BAZAAR-TACTIC-CROWS-NEST')))healPlayer(damage);
    return{damage:round(damage),burn:round(burn),poison:round(poison),multicast,focusProcs};
  }

  function resolveArcanaSpecial(entry){
    const id=entry.item.arcanaId;
    if(id==='BOLT-RAIL')addMap(fight.damage,entry.item.id,10);
    if(id==='IGNITION-RUSH')queueNextTimer('haste',1);
    if(id==='WAVE-FRONT'||id==='CYCLONE-BOOMERANG')for(const target of otherEntries(entry))queueTimer(target,'haste',1);
    if(id==='MENTIS-IMPERIUM')queueNextCardPacket('flying',1);
    if(id==='BLURRING-FALCONRY'){markFlying(entry);queueNextCardPacket('flying',1);}
    if(id==='BALL-LIGHTNING')queueNextTimer('haste',2,{count:2});
    if(id==='IGNITION-DRIVE')fight.disabled.add(entry.item.id);
    if(id==='ROCK-N-ROLL')addDamageToWeapons(10);
  }

  function resolveTactic(entry,{ammoBefore=0}={}){
    const id=entry.item.tacticId,activations=multicastFor(entry,ammoBefore);let detail='AURA ACTIVE';
    if(id==='AMBERGRIS'){const amount=(valueFor(entry)+healBonus(entry))*activations;detail=`HEAL ${healPlayer(amount)}`;}
    else if(id==='ASTROLABE'){queueNextTimer('haste',activations,{count:2});detail=`NEXT 2 CARDS HASTED · ${activations}s`;}
    else if(id==='BARREL'){detail=`SHIELD ${round(addShield((30+shieldBonus(entry))*activations))}`;}
    else if(id==='BEACH-BALL'){queueNextTimer('haste',2*activations,{count:2,tags:['Aquatic','Toy']});detail=`NEXT 2 AQUATIC / TOY CARDS HASTED · ${2*activations}s`;}
    else if(id==='CAPTAINS-QUARTERS'){for(const target of otherEntries(entry).filter(value=>hasTag(value,'Tool')||hasTag(value,'Vehicle')))queueTimer(target,'haste',activations);const loaded=reloadAll(activations);for(const target of entriesWithTag('Weapon'))addMap(fight.damage,target.item.id,20*activations);detail=`TOOLS + VEHICLES HASTED · RELOAD ${loaded} · WEAPONS +${20*activations}`;}
    else if(id==='CAPTAINS-WHEEL'){queueNextTimer('haste',activations,{count:2});detail=`NEXT 2 CARDS HASTED · ${activations}s`;}
    else if(id==='CARD-TABLE'){queueNextCardPacket('multicast',activations,{tags:['Friend']});detail=`NEXT FRIEND +${activations} MULTICAST`;}
    else if(id==='CHUM'){for(const target of boardNow().filter(value=>hasTag(value,'Aquatic')||hasTag(value,'Food')))addMap(fight.focus,target.item.id,3*activations);detail=`AQUATIC + FOOD +${3*activations} FOCUS`;}
    else if(id==='CLAMERA'){applySlow(entry,activations,2);detail=`SLOW ${activations} ENEMY ITEM${activations===1?'':'S'} · 2s`;}
    else if(id==='CORAL'){detail=`HEAL ${healPlayer((20+healBonus(entry))*activations)}`;}
    else if(id==='CORAL-ARMOR'){detail=`SHIELD ${round(addShield((50+shieldBonus(entry))*activations))}`;}
    else if(id==='COVE'){detail=`SHIELD ${round(addShield((valueFor(entry)+shieldBonus(entry))*activations))}`;}
    else if(id==='DAM'){for(const target of boardNow())if(target.item.id===entry.item.id||target.item.size!=='Large')fight.disabled.add(target.item.id);detail='SMALL + MEDIUM ITEMS DESTROYED FOR FIGHT';}
    else if(id==='DIVE-WEIGHTS'){queueNextTimer('haste',activations);detail=`NEXT CARD HASTED · ${activations}s`;}
    else if(id==='DIVING-HELMET'){queueNextCardPacket('tag',0,{sourceItemId:'Aquatic'});detail='NEXT CARD IS AQUATIC THIS FIGHT';}
    else if(id==='DOCK-LINES'){applySlow(entry,2*activations,3);detail=`SLOW ${2*activations} ENEMY ITEMS · 3s`;}
    else if(id==='FIGUREHEAD'){queueNextCardPacket('damage',25*activations);queueNextCardPacket('cooldown-percent',-.10*activations,{tags:['Aquatic']});detail='NEXT CARD +25 DAMAGE · NEXT AQUATIC COOLDOWN -10%';}
    else if(id==='FISHING-NET'){applySlow(entry,activations,2);detail=`SLOW ${activations} ENEMY ITEM${activations===1?'':'S'} · 2s`;}
    else if(id==='FISHING-ROD'){queueNextTimer('haste',2*activations,{tags:['Aquatic']});detail=`NEXT AQUATIC CARD HASTED · ${2*activations}s`;}
    else if(id==='ILLUSORAY'){applySlow(entry,activations,1);detail=`SLOW ${activations} ENEMY ITEM${activations===1?'':'S'} · 1s`;}
    else if(id==='INTEGRATED-HUD'){queueNextCardPacket('focus',20*activations);queueNextObserver(entry);detail='NEXT CARD +20 FOCUS';}
    else if(id==='LIFE-PRESERVER'){detail=`SHIELD ${round(addShield((10+shieldBonus(entry))*activations))}`;}
    else if(id==='NESTING-DOLL'){detail=`SHIELD ${round(addShield((ammoBefore*10+shieldBonus(entry))*activations))}`;}
    else if(id==='PEARL'){detail=`SHIELD ${round(addShield((10+shieldBonus(entry))*activations))}`;}
    else if(id==='PORT'){const loaded=reloadAll(2*activations);for(const target of boardNow())queueTimer(target,'charge',activations);detail=`RELOAD ${loaded} · CHARGE ALL ${activations}s`;}
    else if(id==='ROWBOAT'){queueNextTimer('charge',2*activations);detail=`NEXT CARD CHARGED · ${2*activations}s`;}
    else if(id==='SEADOGS-SALOON'){queueNextTimer('haste',2*activations);applySlow(entry,activations,2);detail=`NEXT CARD HASTED + ENEMY SLOWED · ${activations}×`;}
    else if(id==='SEASHADOW'){for(const target of otherEntries(entry))addMap(fight.cooldownPercent,target.item.id,-.08*activations);addMap(fight.cooldownFlat,entry.item.id,4*activations);detail=`OTHER COOLDOWNS -${8*activations}% · SELF +${4*activations}s`;}
    else if(id==='SHOT-GLASSES'){queueNextTimer('haste',activations,{count:4});queueNextTimer('slow',activations,{count:4});detail=`NEXT 4 CARDS HASTED + SLOWED · ${activations}s`;}
    else if(id==='STEALTH-GLIDER'){queueNextCardPacket('flying',1,{count:activations});detail=`NEXT ${activations} CARD${activations===1?'':'S'} GAIN MOMENTUM`;}
    else if(id==='SUBMERSIBLE'){
      queueNextCardPacket('damage',10*activations,{count:2,tags:['Aquatic','Weapon'],matchAll:true});
      queueNextCardPacket('shield',10*activations,{count:2,tags:['Aquatic','Shield'],matchAll:true});
      detail=`NEXT 2 AQUATIC WEAPONS +${10*activations} · NEXT 2 AQUATIC SHIELDS +${10*activations}`;
    }else if(id==='HONING-STEEL'){queueNextCardPacket('damage',5*activations,{count:2,tags:['Weapon']});detail=`NEXT 2 WEAPONS +${5*activations} DAMAGE`;}
    else if(id==='STAR-CHART'){queueNextCardPacket('focus',10*activations);queueNextCardPacket('cooldown-percent',-.05*activations);detail='NEXT CARD +10 FOCUS · COOLDOWN -5%';}
    else if(id==='SUPPRESSOR'){queueNextCardPacket('damage',25*activations,{tags:['Weapon']});detail='NEXT WEAPON +25 DAMAGE';}
    else if(id==='ORANGE-JULIAN'){const amount=Math.floor(runGold()/2)*activations;for(const target of boardNow())addMap(fight.damage,target.item.id,amount);detail=`ALL ITEMS +${amount} DAMAGE`;}
    const rawDamage=damageRaw(entry),focusProcs=rawDamage>0?focusProcCount(entry,activations):0,target=nearestTargets(1)[0];
    const damageActivations=activations+focusProcs;
    const damage=target&&rawDamage>0?damageTarget(target,normalizedDamage(rawDamage)*damageActivations,{bazaarItemId:entry.item.id,multicast:activations,focusProcs,trigger:'tactic'}):0;
    if(damage>0)detail+=` · ${round(damage)} DAMAGE`;
    return{detail,multicast:activations,focusProcs,damage:round(damage)};
  }

  function autoActivate(entry,trigger){
    if(reactiveDepth>=8||!entry||fight.disabled.has(entry.item.id))return null;
    const readiness=canPlay(entry.card||entry.item);if(!readiness.accepted)return null;
    reactiveDepth++;try{return activate(entry,{automatic:true,trigger});}finally{reactiveDepth--;}
  }

  const temporalObserverIds=new Set([
    'BAZAAR-BLADED-HOVERBOARD','BAZAAR-JETBIKE','BAZAAR-SWITCHBLADE','BAZAAR-INCENDIARY-ROUNDS',
    'BAZAAR-ANCHOR','BAZAAR-JELLYFISH','BAZAAR-TACTIC-BARREL','BAZAAR-TACTIC-DIVE-WEIGHTS','BAZAAR-TACTIC-ILLUSORAY',
  ]);
  let activeTemporalObservers=new Set();

  function takeTemporalObservers(source){
    const ids=reactiveLinks.get(source.item.id)||[];reactiveLinks.delete(source.item.id);
    const observers=ids.map(byItemId).filter(Boolean);
    activeTemporalObservers=new Set(observers.map(value=>value.item.id));
    for(const observer of observers){
      const id=observer.item.arcanaId||observer.item.tacticId;
      if(id==='SEARING-RUSH'){resolveArcana(observer,{forced:true,trigger:'next-card-use'});markFlying(source);}
      if(id==='FLARE-RUSH'){markFlying(observer);markFlying(source);}
      if(id==='BLADED-VINE'&&hasTag(source,'Weapon'))addMap(fight.damage,source.item.id,4);
      if(id==='FLAME-FUSION')dealPrintedDot(observer,'burn',2);
      if(id==='HEROIC-LEAP')queueTimer(observer,'haste',2);
      if(id==='WATER-PRISON'&&hasTag(source,'Aquatic'))queueTimer(observer,'haste',1);
      if(id==='BARREL')addMap(fight.shieldBonus,observer.item.id,15);
      if(id==='DIVE-WEIGHTS'&&hasTag(source,'Aquatic'))addMap(fight.cooldownFlat,observer.item.id,-1);
      if(id==='ILLUSORAY'&&(hasTag(source,'Friend')||hasTag(source,'Ray')))addMap(fight.multicast,observer.item.id,1);
    }
    return observers;
  }
  function armTemporalObserver(source){if(temporalObserverIds.has(source.item.id))queueNextObserver(source);}

  function onItemUsed(source,{temporal=false}={}){
    if(reactiveDepth>=8)return;
    const sourceTags=effectiveTags(source),sourceFlying=fight.flying.has(source.item.id);
    for(const observer of boardNow()){
      const id=observer.item.arcanaId||observer.item.tacticId,same=observer.item.id===source.item.id;
      if(id==='AIR-SPINNER'&&sourceTags.has('Ammo')){const target=nearestTargets(1)[0];if(target)damageTarget(target,normalizedDamage(15),{bazaarItemId:observer.item.id,trigger:'ammo-use'});}
      if(id==='FLARE-RUSH'&&!same&&sourceFlying)queueTimer(observer,'charge',1);
      if(id==='CIRCUIT-LINE'&&!same&&(sourceTags.has('Weapon')||sourceTags.has('Burn')))queueTimer(observer,'charge',2);
      if(id==='WAVE-FRONT'&&!same&&sourceTags.has('Friend'))queueTimer(observer,'charge',2);
      if(id==='HOMING-FLARES'&&!same&&sourceTags.has('Ammo'))autoActivate(observer,'ammo-trigger');
      if(id==='DRAGON-ARC'&&!same&&sourceTags.has('Ammo'))addMap(fight.multicast,observer.item.id,1);
      if(id==='RAPID-FIRE-AGENT'&&!same&&sourceTags.has('Weapon'))addMap(fight.focus,observer.item.id,5);
      if(id==='WHIRLING-TORNADO'&&!same&&(sourceTags.has('Friend')||sourceTags.has('Food')))queueTimer(observer,'charge',1);
      if(id==='MENTIS-IMPERIUM'&&sourceFlying)addMap(fight.focus,observer.item.id,20);
      if(id==='BLURRING-FALCONRY'&&sourceFlying)queueTimer(observer,'haste',1);
      if(id==='TERRA-RING'&&!same&&sourceTags.has('Weapon'))queueTimer(observer,'charge',2);
      if(id==='TECTONIC-DRILL'&&!same&&(sourceTags.has('Aquatic')||sourceTags.has('Ammo')))addMap(fight.damage,observer.item.id,source.item.size==='Large'?80:40);
      if(id==='BUBBLE-BARRAGE'&&!same&&sourceTags.has('Ammo'))reloadItem(observer,1);
      if(id==='ASTROLABE'&&!same&&!sourceTags.has('Weapon'))queueTimer(observer,'charge',1);
      if(id==='DIVING-HELMET'&&sourceTags.has('Aquatic'))addShield(50+shieldBonus(observer));
      if(id==='DAM'&&!same&&sourceTags.has('Aquatic'))queueTimer(observer,'charge',1);
      if(id==='PEARL'&&!same&&sourceTags.has('Aquatic'))queueTimer(observer,'charge',1);
    }
    if(temporal)armTemporalObserver(source);
    notify({phase:'item-used',itemId:source.item.id});
  }

  function activate(entry,{automatic=false,trigger='play'}={}){
    const readiness=canPlay(entry.card||entry.item);if(!readiness.accepted)return readiness;
    const ammoBefore=consumeAmmo(entry);
    let payload;
    try{
      if(!automatic)takeTemporalObservers(entry);else activeTemporalObservers=new Set();
      payload=entry.item.family==='arcana'
        ?resolveArcana(entry,{forced:automatic,trigger,ammoBefore})
        :resolveTactic(entry,{ammoBefore});
      if(entry.item.family==='arcana')resolveArcanaSpecial(entry);
      addMap(fight.used,entry.item.id,1);
      onItemUsed(entry,{temporal:!automatic});
    }finally{activeTemporalObservers=new Set();}
    lastAction=`${entry.item.name.toUpperCase()} · ${payload.detail||[
      payload.damage?`${payload.damage} DAMAGE`:'',payload.burn?`${payload.burn} BURN`:'',payload.poison?`${payload.poison} POISON`:'',payload.multicast>1?`${payload.multicast}× MULTICAST`:'',
    ].filter(Boolean).join(' · ')||'TRIGGERED'}`;
    const result=Object.freeze({accepted:true,reason:automatic?'reactive-use':'resolved',entry,...payload,lastAction});
    notify({phase:automatic?'reactive-play':'played',itemId:entry.item.id,result});return result;
  }

  function play(value){const entry=cardEntry(value);return entry?activate(entry):Object.freeze({accepted:false,reason:'not-bazaar-card'});}

  function requestCard(criteria,source){
    const granted=grantCard?.(criteria,{sourceItemId:source?.item?.id||null});
    if(granted)onCardAcquired(granted,{generated:true});
    return granted;
  }
  function onCardAcquired(card,{generated=false}={}){
    const acquired=cardEntry(card);if(!acquired)return null;
    acquiredCards++;
    syncBoard(getBoardCards?.());
    if(hasTag(acquired,'Aquatic')){
      const amber=byItemId('BAZAAR-TACTIC-AMBERGRIS');if(amber&&amber.item.id!==acquired.item.id)addMap(permanent.value,amber.item.id,1);
      const coral=byItemId('BAZAAR-TACTIC-CORAL');if(coral)addMap(permanent.heal,coral.item.id,5);
      const armor=byItemId('BAZAAR-TACTIC-CORAL-ARMOR');if(armor&&armor.item.id!==acquired.item.id)addMap(permanent.shield,armor.item.id,10);
    }
    if(acquired.item.tacticId==='CHUM')requestCard({preferredItemId:'BAZAAR-PIRANHA'},acquired);
    notify({phase:'card-acquired',itemId:acquired.item.id,generated});return acquired;
  }
  function onRewardSkipped(){const cove=byItemId('BAZAAR-TACTIC-COVE');if(cove)addMap(permanent.value,cove.item.id,1);notify({phase:'reward-skipped'});}

  function startFight({wave=getWave?.()||1}={}){
    fight=newFightState();fightNumber++;
    syncBoard(getBoardCards?.());refreshAmmo({refill:true});
    if(provisions>0){healPlayer(provisions*10);provisions=0;}
    const holsters=byItemId('BAZAAR-TACTIC-HOLSTERS');if(holsters)for(const target of boardNow().filter(value=>value.item.size==='Small'))queueTimer(target,'haste',2);
    for(const entry of boardNow()){
      if(entry.item.arcanaId==='SPIKE-TRACK')requestCard({size:'Small'},entry);
      if(entry.item.tacticId==='FISHING-NET')requestCard({size:'Small',tags:['Aquatic','Loot'],matchAnyTag:true},entry);
      if(entry.item.tacticId==='FISHING-ROD')requestCard({size:'Small',tags:['Aquatic']},entry);
      if(entry.item.tacticId==='PORT')requestCard({size:'Small',tags:['Ammo']},entry);
      if(entry.item.tacticId==='NESTING-DOLL')addMap(permanent.maxAmmo,entry.item.id,1);
    }
    syncBoard(getBoardCards?.());refreshAmmo({refill:true});
    lastAction=`WAVE ${wave} · FIGHT START`;notify({phase:'fight-start',wave});return snapshot();
  }
  function endFight({won=true,wave=getWave?.()||1}={}){
    if(fight.lastEndedWave===wave)return snapshot();fight.lastEndedWave=wave;
    if(won){wins++;
      const lockbox=byItemId('BAZAAR-TACTIC-LOCKBOX');if(lockbox)addMap(permanent.value,lockbox.item.id,3);
      const langxian=byItemId('BAZAAR-LANGXIAN');if(langxian)addMap(permanent.damage,langxian.item.id,40);
    }
    if(owns('BAZAAR-TACTIC-TROPICAL-ISLAND'))provisions+=2;
    notify({phase:'fight-end',won,wave});return snapshot();
  }

  function handleEnemyUse(hit={}){
    fight.enemyUses++;
    const iceberg=byItemId('BAZAAR-TACTIC-ICEBERG');if(iceberg){const target=hit.sourceEnemy||nearestTargets(1)[0];if(target&&enemySystem?.applyStatus?.(target,'freeze',1,{source:'wardenBazaar'}))recordFreeze(iceberg);}
    const clamera=byItemId('BAZAAR-TACTIC-CLAMERA');if(clamera&&fight.enemyUses<=2)autoActivate(clamera,'enemy-use');
    const bilge=byItemId('BAZAAR-BILGE-WORM');if(bilge)autoActivate(bilge,'enemy-use');
    const eels=byItemId('BAZAAR-ELECTRIC-EELS');if(eels)queueTimer(eels,'charge',2);
  }

  function update(deltaSeconds=0){
    const elapsed=positive(deltaSeconds);if(!enabled||elapsed<=0)return snapshot();
    let changed=false;
    for(let index=fight.dots.length-1;index>=0;index--){
      const dot=fight.dots[index];if(!alive(dot.target)){fight.dots.splice(index,1);changed=true;continue;}
      dot.untilNext-=elapsed;
      while(dot.ticksRemaining>0&&dot.untilNext<=1e-9&&alive(dot.target)){
        damageTarget(dot.target,dot.tickDamage,{bazaarItemId:dot.itemId,status:dot.kind,hitReaction:false});
        dot.ticksRemaining--;dot.untilNext+=WARDEN_TRIAL_BAZAAR_TRANSLATION.dotIntervalSeconds;changed=true;
      }
      if(dot.ticksRemaining<=0||!alive(dot.target))fight.dots.splice(index,1);
    }
    if(fight.regen>0){fight.regenTick-=elapsed;while(fight.regenTick<=0){healPlayer(fight.regen);fight.regenTick+=1;changed=true;}}
    if(changed)notify({phase:'runtime-tick'});return snapshot();
  }

  function syncBoard(cards=getBoardCards?.()||[]){rebuildBoard(cards);refreshAmmo();return Object.freeze(board.map(entry=>entry.item.id));}
  function resetRun(){
    fight=newFightState();fightNumber=0;wins=0;acquiredCards=0;provisions=0;lastAction='BAZAAR RUN RESET';actionSerial=0;reactiveDepth=0;
    ammo.clear();maxAmmo.clear();pendingTimers.clear();reactiveLinks.clear();nextCardPackets.length=0;clearMaps(permanent);syncBoard(getBoardCards?.());notify({phase:'run-reset'});return snapshot();
  }
  function describeCard(value){
    const entry=cardEntry(value);if(!entry)return null;
    const ammoRow=maxAmmo.has(entry.item.id)?ammoState(entry):null;
    return Object.freeze({itemId:entry.item.id,name:entry.item.name,family:entry.item.family,
      summary:wardenTrialBazaarBehaviorProfile(entry.item)?.summary||'',cooldownSeconds:cooldownDuration(entry),
      preparation:preparationFor(entry),
      ammo:ammoRow,disabled:fight.disabled.has(entry.item.id),damageBonus:round(mapValue(fight.damage,entry.item.id)+mapValue(permanent.damage,entry.item.id)),
      multicastBonus:round(mapValue(fight.multicast,entry.item.id)),flying:fight.flying.has(entry.item.id)});
  }

  let releaseInterceptor=()=>{};
  if(typeof enemySystem?.registerPlayerDamageInterceptor==='function'){
    const release=enemySystem.registerPlayerDamageInterceptor('warden-bazaar-engine',hit=>{
      handleEnemyUse(hit);
      let incoming=positive(hit?.damage);
      if(owns('BAZAAR-TACTIC-STEALTH-GLIDER'))incoming*=.75;
      const absorbed=Math.min(fight.shield,incoming);fight.shield=Math.max(0,fight.shield-absorbed);incoming-=absorbed;
      if(incoming>=positive(hit?.playerHp)&&owns('BAZAAR-TACTIC-LIFE-PRESERVER')&&!fight.lifePreserverUsed){
        fight.lifePreserverUsed=true;healPlayer(200);incoming=0;lastAction='LIFE PRESERVER · DEFEAT PREVENTED';
      }else if(absorbed>0)lastAction=`SHIELD ABSORBED ${round(absorbed)} · ${round(fight.shield)} LEFT`;
      notify({phase:'player-hit',incoming,absorbed});return{damage:incoming};
    },100);
    if(typeof release==='function')releaseInterceptor=release;
  }

  const originalDamageMethod=typeof enemySystem?.damageEnemy==='function'?enemySystem.damageEnemy:null;
  const originalDamage=originalDamageMethod?.bind(enemySystem)||null;
  let damageGate=null;
  if(originalDamage){
    damageGate=function wardenBazaarDamageGate(target,amount,knock,options={}){
      if(enabled&&options?.source==='wizardArcana'){suppressedNativeHits++;return false;}
      return originalDamage(target,amount,knock,options);
    };
    enemySystem.damageEnemy=damageGate;
  }

  return Object.freeze({
    canPlay,play,update,syncBoard,onCardDrawn,preparePending,prepareRecovery,preparationFor,takePendingEffects,startFight,endFight,
    onCardAcquired,onRewardSkipped,describeCard,snapshot,resetRun,
    setEnabled(value){enabled=value!==false;notify({phase:'enabled',enabled});return enabled;},
    destroy(){enabled=false;fight.dots.length=0;releaseInterceptor();if(enemySystem?.damageEnemy===damageGate&&originalDamageMethod)enemySystem.damageEnemy=originalDamageMethod;return true;},
  });
}
