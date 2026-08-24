import { arcanaDownStanceId } from './arcana-stance-pairings.js';
import {
  wardenTrialBazaarItemForArcana,
  wardenTrialBazaarTacticById,
} from './warden-trial-bazaar-catalog.js';

// This is a deliberately small vertical slice, not the final 113-card
// translation table. It proves each runtime seam before the same rules are
// expanded across the full source catalog.
const DEMO_SPECS = Object.freeze([
  Object.freeze({ sourceId:'FLAME-STRIKE', features:['damage','burn'] }),
  Object.freeze({ sourceId:'PERFORATING-JET', features:['poison','ammo','slow'] }),
  Object.freeze({ sourceId:'ICE-DAGGER', features:['damage','freeze','self-scaling'] }),
  Object.freeze({ sourceId:'FLAME-CROSS', features:['damage','multicast'] }),
  Object.freeze({ sourceId:'BOLT-RAIL', features:['damage','ammo','self-scaling'] }),
  Object.freeze({ sourceId:'HEROIC-LEAP', features:['percent-health'] }),
  Object.freeze({ sourceId:'RAPID-FIRE-AGENT', features:['friend','multicast-target'] }),
  Object.freeze({ sourceId:'ASTROLABE', family:'tactic', stanceId:'S26', features:['haste'] }),
  Object.freeze({ sourceId:'PORT', family:'tactic', stanceId:'S26', features:['ammo','charge'] }),
  Object.freeze({ sourceId:'BARREL', family:'tactic', stanceId:'S26', features:['shield'] }),
  Object.freeze({ sourceId:'CORAL', family:'tactic', stanceId:'S26', features:['heal'] }),
  Object.freeze({ sourceId:'CARD-TABLE', family:'tactic', stanceId:'S26', features:['multicast','persistent'] }),
  Object.freeze({ sourceId:'HONING-STEEL', family:'tactic', stanceId:'S26', features:['damage','persistent'] }),
]);

const itemForSpec = spec => spec.family === 'tactic'
  ? wardenTrialBazaarTacticById(spec.sourceId)
  : wardenTrialBazaarItemForArcana(spec.sourceId);

export const WARDEN_TRIAL_BAZAAR_DEMO_TRANSLATION = Object.freeze({
  // One normalized Bazaar damage unit (20 printed Damage) is 12 Saturn HP.
  damagePerTwenty:12,
  // One normalized status unit (4 printed Burn or Poison) is 6 Saturn HP,
  // delivered over three readable ticks instead of one invisible burst.
  burnPerFour:6,
  poisonPerFour:6,
  dotTicks:3,
  dotIntervalSeconds:.65,
});

export const WARDEN_TRIAL_BAZAAR_DEMO_ROSTER = Object.freeze(DEMO_SPECS.map((spec,index) => {
  const item=itemForSpec(spec);
  if(!item)throw new Error(`[warden-bazaar-demo] Missing source item: ${spec.sourceId}`);
  return Object.freeze({
    id:item.id,
    index:index+1,
    family:item.family,
    arcanaId:item.arcanaId||null,
    tacticId:item.tacticId||null,
    stanceId:spec.stanceId||arcanaDownStanceId(item.arcanaId),
    name:item.name,
    features:Object.freeze(spec.features.slice()),
    item,
  });
}));

const demoById = new Map(WARDEN_TRIAL_BAZAAR_DEMO_ROSTER.flatMap(entry => [
  [entry.id,entry],
  [entry.arcanaId,entry],
  [entry.tacticId,entry],
].filter(([key])=>key)));

const normalizedId = value => String(value||'').trim().toUpperCase();
const finite = value => Number.isFinite(Number(value))?Number(value):0;
const positive = value => Math.max(0,finite(value));
const round = value => Math.round(finite(value)*100)/100;

export function wardenTrialBazaarDemoEntry(value){
  const key=value&&typeof value==='object'
    ?value.__wardenTrialDemoId||value.__wardenTrialBazaarItemId||value.id||value.arcanaId||value.tacticId
    :value;
  return demoById.get(normalizedId(key))||null;
}

export function createWardenTrialBazaarDemoCard(value,stanceCards=[]){
  const entry=wardenTrialBazaarDemoEntry(value);
  if(!entry)return null;
  const stance=(Array.isArray(stanceCards)?stanceCards:[]).find(card=>normalizedId(card?.id)===entry.stanceId);
  if(!stance)return null;
  const item=entry.item;
  return Object.freeze({
    ...stance,
    __wardenTrialCard:true,
    __wardenTrialDemo:true,
    __wardenTrialDemoId:entry.id,
    __wardenTrialPairId:`DEMO:${entry.id}`,
    __wardenTrialWeaponId:null,
    __wardenTrialStanceId:entry.stanceId,
    __wardenTrialUpKind:entry.family,
    __wardenTrialArcanaId:entry.arcanaId,
    __wardenTrialTacticId:entry.tacticId,
    __wardenTrialElement:null,
    __wardenTrialBazaarItemId:item.id,
    __wardenTrialBazaar:item,
  });
}

export function wardenTrialBazaarDemoCards(stanceCards=[]){
  return WARDEN_TRIAL_BAZAAR_DEMO_ROSTER
    .map(entry=>createWardenTrialBazaarDemoCard(entry,stanceCards))
    .filter(Boolean);
}

function normalizedDamage(raw){
  return round(positive(raw)/20*WARDEN_TRIAL_BAZAAR_DEMO_TRANSLATION.damagePerTwenty);
}

function normalizedDot(raw,kind){
  const perFour=kind==='burn'
    ?WARDEN_TRIAL_BAZAAR_DEMO_TRANSLATION.burnPerFour
    :WARDEN_TRIAL_BAZAAR_DEMO_TRANSLATION.poisonPerFour;
  return round(positive(raw)/4*perFour);
}

function aliveTarget(target){return !!target&&positive(target.hp)>0;}

export function createWardenTrialBazaarDemoRuntime({
  enemySystem=null,
  getPlayer=()=>({x:0,z:0}),
  emit=()=>{},
  onChange=()=>{},
}={}){
  let enabled=true;
  let shield=0;
  let weaponDamageBonus=0;
  let friendMulticastBonus=0;
  let lastAction='SELECT A DEMO CARD';
  let selectedItemId=WARDEN_TRIAL_BAZAAR_DEMO_ROSTER[0]?.id||null;
  let actionSerial=0;
  let suppressedNativeHits=0;
  const itemDamageBonuses=new Map();
  const maxAmmo=new Map();
  const ammo=new Map();
  const dots=[];

  for(const entry of WARDEN_TRIAL_BAZAAR_DEMO_ROSTER){
    const maximum=positive(entry.item.output?.ammo);
    if(maximum>0){maxAmmo.set(entry.id,maximum);ammo.set(entry.id,maximum);}
  }

  const notify=event=>{
    const payload=Object.freeze({type:'warden-bazaar-demo',...event});
    try{emit(payload);}catch{}
    try{onChange(snapshot(),payload);}catch{}
    return payload;
  };

  const targetForAction=()=>{
    const player=getPlayer?.()||{x:0,z:0};
    const direct=enemySystem?.getNearestHostile?.({x:finite(player.x),z:finite(player.z)});
    if(aliveTarget(direct))return direct;
    return (enemySystem?.hostileEnemies||enemySystem?.enemies||[])
      .filter(aliveTarget)
      .sort((a,b)=>Math.hypot(finite(a.x)-finite(player.x),finite(a.z)-finite(player.z))
        -Math.hypot(finite(b.x)-finite(player.x),finite(b.z)-finite(player.z)))[0]||null;
  };

  const damageTarget=(target,amount,options={})=>{
    const value=positive(amount);
    if(!aliveTarget(target)||value<=0||typeof enemySystem?.damageEnemy!=='function')return 0;
    enemySystem.damageEnemy(target,value,{x:0,z:0},{
      source:'wardenBazaarDemo',
      power:.28,
      pop:.05,
      ...options,
    });
    return value;
  };

  const scheduleDot=(target,kind,total,itemId,multicast)=>{
    const value=positive(total)*Math.max(1,Math.trunc(positive(multicast)||1));
    if(!aliveTarget(target)||value<=0)return null;
    const ticks=WARDEN_TRIAL_BAZAAR_DEMO_TRANSLATION.dotTicks;
    const dot={
      id:`${itemId}:${kind}:${++actionSerial}`,
      target,
      kind,
      itemId,
      ticksRemaining:ticks,
      tickDamage:round(value/ticks),
      untilNext:WARDEN_TRIAL_BAZAAR_DEMO_TRANSLATION.dotIntervalSeconds,
    };
    dots.push(dot);
    return dot;
  };

  const ammoState=entry=>{
    const maximum=maxAmmo.get(entry.id)||0;
    return Object.freeze({current:ammo.get(entry.id)||0,max:maximum});
  };

  function canPlay(card){
    if(!enabled)return Object.freeze({accepted:false,reason:'demo-disabled'});
    const entry=wardenTrialBazaarDemoEntry(card?.__wardenTrialDemoId||card?.__wardenTrialBazaarItemId||card);
    if(!entry)return Object.freeze({accepted:false,reason:'not-demo-card'});
    const maximum=maxAmmo.get(entry.id)||0,current=ammo.get(entry.id)||0;
    if(maximum>0&&current<=0)return Object.freeze({accepted:false,reason:'out-of-ammo',entry,ammo:ammoState(entry)});
    return Object.freeze({accepted:true,reason:'ready',entry,ammo:ammoState(entry)});
  }

  function resolveArcana(entry){
    const item=entry.item,target=targetForAction();
    const baseMulticast=Math.max(1,Math.trunc(positive(item.output?.multicast)||1));
    const friendBonus=item.tags?.includes('Friend')?friendMulticastBonus:0;
    const multicast=baseMulticast+friendBonus;
    const rawDamage=positive(item.output?.damage)
      +(item.tags?.includes('Weapon')?weaponDamageBonus:0)
      +(itemDamageBonuses.get(entry.id)||0);
    const direct=normalizedDamage(rawDamage)*multicast;
    const percent=positive(item.output?.healthDamagePercent);
    const percentDamage=aliveTarget(target)&&percent>0?round(positive(target.maxHp||target.hp)*percent/100)*multicast:0;
    const totalDirect=round(direct+percentDamage);
    const burn=normalizedDot(item.output?.burn,'burn');
    const poison=normalizedDot(item.output?.poison,'poison');

    if(totalDirect>0)damageTarget(target,totalDirect,{bazaarItemId:entry.id,multicast});
    if(burn>0)scheduleDot(target,'burn',burn,entry.id,multicast);
    if(poison>0)scheduleDot(target,'poison',poison,entry.id,multicast);
    if(entry.arcanaId==='PERFORATING-JET'&&aliveTarget(target))enemySystem?.applyStatus?.(target,'slow',1,{multiplier:.5,source:'wardenBazaarDemo'});
    if(entry.arcanaId==='ICE-DAGGER'&&aliveTarget(target))enemySystem?.applyStatus?.(target,'freeze',1,{source:'wardenBazaarDemo'});

    if(entry.arcanaId==='BOLT-RAIL')itemDamageBonuses.set(entry.id,(itemDamageBonuses.get(entry.id)||0)+10);
    if(entry.arcanaId==='ICE-DAGGER')itemDamageBonuses.set(entry.id,(itemDamageBonuses.get(entry.id)||0)+15);

    const pieces=[];
    if(totalDirect>0)pieces.push(`${round(totalDirect)} DAMAGE`);
    if(burn>0)pieces.push(`${round(burn*multicast)} BURN`);
    if(poison>0)pieces.push(`${round(poison*multicast)} POISON`);
    if(multicast>1)pieces.push(`${multicast}× MULTICAST`);
    if(!target)pieces.push('NO TARGET');
    lastAction=`${item.name.toUpperCase()} · ${pieces.join(' · ')||'TRIGGERED'}`;
    return Object.freeze({
      accepted:true,
      reason:target?'arcana-resolved':'no-target',
      entry,
      target:target||null,
      damage:totalDirect,
      burn:round(burn*multicast),
      poison:round(poison*multicast),
      multicast,
      timerEffects:Object.freeze([]),
      lastAction,
    });
  }

  function reloadAmmo(amount){
    const restored=[];
    for(const [itemId,maximum] of maxAmmo){
      const before=ammo.get(itemId)||0,after=Math.min(maximum,before+positive(amount));
      ammo.set(itemId,after);
      if(after>before)restored.push(Object.freeze({itemId,amount:after-before,current:after,max:maximum}));
    }
    return Object.freeze(restored);
  }

  function resolveTactic(entry){
    const timerEffects=[];
    let detail='TRIGGERED';
    if(entry.tacticId==='ASTROLABE'){
      timerEffects.push(Object.freeze({effect:'haste',seconds:1}));
      detail='NEXT CURRENT CARD HASTED 1s';
    }else if(entry.tacticId==='PORT'){
      const restored=reloadAmmo(2);
      timerEffects.push(Object.freeze({effect:'charge',seconds:1}));
      detail=`RELOAD ${restored.reduce((sum,row)=>sum+row.amount,0)} AMMO · CHARGE 1s`;
    }else if(entry.tacticId==='BARREL'){
      shield+=30;
      detail='SHIELD 30';
    }else if(entry.tacticId==='CORAL'){
      const healed=positive(enemySystem?.healPlayer?.(20));
      detail=`HEAL ${round(healed)}`;
    }else if(entry.tacticId==='CARD-TABLE'){
      friendMulticastBonus+=1;
      detail=`FRIENDS +${friendMulticastBonus} MULTICAST`;
    }else if(entry.tacticId==='HONING-STEEL'){
      weaponDamageBonus+=5;
      detail=`DEMO WEAPONS +${weaponDamageBonus} DAMAGE`;
    }
    lastAction=`${entry.name.toUpperCase()} · ${detail}`;
    return Object.freeze({accepted:true,reason:'tactic-resolved',entry,timerEffects:Object.freeze(timerEffects),lastAction});
  }

  function play(card){
    const readiness=canPlay(card);
    if(!readiness.accepted)return readiness;
    const entry=readiness.entry,maximum=maxAmmo.get(entry.id)||0;
    if(maximum>0)ammo.set(entry.id,Math.max(0,(ammo.get(entry.id)||0)-1));
    selectedItemId=entry.id;
    const result=entry.family==='tactic'?resolveTactic(entry):resolveArcana(entry);
    notify({phase:'played',itemId:entry.id,result});
    return result;
  }

  function applyTimerEffect(effect,seconds){
    const kind=String(effect||'').trim().toLowerCase();
    lastAction=`TIMER TEST · ${kind.toUpperCase()} ${round(positive(seconds))}s`;
    notify({phase:'timer-effect',effect:kind,seconds:positive(seconds)});
    return snapshot();
  }

  function update(deltaSeconds=0){
    const elapsed=positive(deltaSeconds);
    if(!enabled||elapsed<=0||!dots.length)return snapshot();
    let changed=false;
    for(let index=dots.length-1;index>=0;index--){
      const dot=dots[index];
      if(!aliveTarget(dot.target)){dots.splice(index,1);changed=true;continue;}
      dot.untilNext-=elapsed;
      while(dot.ticksRemaining>0&&dot.untilNext<=1e-9&&aliveTarget(dot.target)){
        damageTarget(dot.target,dot.tickDamage,{bazaarItemId:dot.itemId,status:dot.kind,hitReaction:false});
        dot.ticksRemaining-=1;
        dot.untilNext+=WARDEN_TRIAL_BAZAAR_DEMO_TRANSLATION.dotIntervalSeconds;
        changed=true;
      }
      if(dot.ticksRemaining<=0||!aliveTarget(dot.target))dots.splice(index,1);
    }
    if(changed)notify({phase:'dot-tick',activeDots:dots.length});
    return snapshot();
  }

  function reset(){
    shield=0;weaponDamageBonus=0;friendMulticastBonus=0;lastAction='DEMO RESET';actionSerial=0;dots.length=0;
    itemDamageBonuses.clear();
    for(const [itemId,maximum] of maxAmmo)ammo.set(itemId,maximum);
    notify({phase:'reset'});
    return snapshot();
  }

  function select(value){
    const entry=wardenTrialBazaarDemoEntry(value);
    if(!entry)return null;
    selectedItemId=entry.id;
    lastAction=`SELECTED · ${entry.name.toUpperCase()}`;
    notify({phase:'selected',itemId:entry.id});
    return entry;
  }

  function snapshot(){
    return Object.freeze({
      enabled,
      selectedItemId,
      shield:round(shield),
      weaponDamageBonus:round(weaponDamageBonus),
      friendMulticastBonus:round(friendMulticastBonus),
      activeDots:dots.length,
      suppressedNativeHits,
      lastAction,
      ammo:Object.freeze([...maxAmmo].map(([itemId,maximum])=>Object.freeze({
        itemId,
        current:round(ammo.get(itemId)||0),
        max:round(maximum),
      }))),
      itemDamageBonuses:Object.freeze(Object.fromEntries([...itemDamageBonuses].map(([key,value])=>[key,round(value)]))),
    });
  }

  // Keep the existing Arcana motion and visuals, but make the demo's source
  // payload authoritative. The ordinary Arcana damage is swallowed only while
  // this opt-in runtime is enabled; demo damage uses a distinct source tag.
  let releaseShield=()=>{};
  if(typeof enemySystem?.registerPlayerDamageInterceptor==='function'){
    const release=enemySystem.registerPlayerDamageInterceptor('warden-bazaar-demo-shield',hit=>{
      const incoming=positive(hit?.damage),absorbed=Math.min(shield,incoming);
      if(absorbed<=0)return incoming;
      shield=Math.max(0,shield-absorbed);
      lastAction=`SHIELD ABSORBED ${round(absorbed)} · ${round(shield)} LEFT`;
      notify({phase:'shield-hit',absorbed,remaining:shield});
      return{damage:incoming-absorbed};
    },100);
    if(typeof release==='function')releaseShield=release;
  }

  const originalDamage=typeof enemySystem?.damageEnemy==='function'?enemySystem.damageEnemy.bind(enemySystem):null;
  if(originalDamage){
    enemySystem.damageEnemy=function wardenBazaarDemoDamageGate(target,amount,knock,options={}){
      if(enabled&&options?.source==='wizardArcana'){
        suppressedNativeHits+=1;
        return aliveTarget(target);
      }
      return originalDamage(target,amount,knock,options);
    };
  }

  return Object.freeze({
    canPlay,
    play,
    update,
    reset,
    select,
    applyTimerEffect,
    snapshot,
    setEnabled(value){enabled=value!==false;notify({phase:'enabled',enabled});return enabled;},
    destroy(){enabled=false;dots.length=0;releaseShield();return true;},
  });
}
