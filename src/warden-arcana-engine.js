const normalizeArcanaId=value=>String(value?.arcanaId||value?.id||value||'')
  .trim().toUpperCase().replace(/^WOL-/,'');

export const WARDEN_BURN_CARD_KIND='burn';
export const WARDEN_JET_CARD_KIND='jet';
export const WARDEN_LINK_DURATION_SECONDS=5;
export const WARDEN_FRAGILE_MULTIPLIER=1.5;
export const WARDEN_BLOOD_SLASH_GRANT=3;

const FLOW_ON_CAST=Object.freeze({
  'RIP-TIDE':2,
  'AQUA-ARC':2,
  'AQUA-BREAKER':2,
  'AQUA-VORTEX':1,
});

const BURN_ON_CAST=Object.freeze({
  'FLAME-CROSS':'draw-bottom',
  'FLAME-FUSION':'draw-bottom',
  'EXPLOSIVE-CHARGE':'draw-bottom',
  'HOMING-FLARES':'draw-top',
  'BOUNCING-BLAZE':'discard',
  'SEARING-CROWN':'discard',
  'IGNITION-DRIVE':'discard',
  'ENGULFING-FISSURE':'discard',
});

const BURN_CONSUMERS=new Set([
  'SEARING-RUSH','FLARE-RUSH','IGNITION-RUSH','BLAZING-LARIAT',
]);

const BLOOD_SLASH_DOWN=new Set([
  'VOLT-DISC','BALL-LIGHTNING','STAR-BOLT','BOLT-RAIL',
]);

const BING_BONG_DOWN=new Set(['KNOCKOUT-BOULDER','TOXIC-BOLAS']);

const FRAGILE_ON_HIT=new Set([
  'STONE-SHOT','ROCK-SOLID-TOMAHAWK','TECTONIC-DRILL','EARTH-KNUCKLES','BLADED-VINE',
]);

const LINK_ON_HIT=new Set([
  'CHAOS-CRUSHER','THUNDER-LINE','CIRCUIT-LINE','SPARK-CONTACT','SHOCK-NOVA',
]);

const HASTE_ON_DISTINCT_HIT=new Set([
  'CYCLONE-BOOMERANG','STORM-DRAFT','AIR-BURST','GUST-BURST','RAZOR-BURST',
  'HEROIC-LEAP','WIND-SLASH','ICE-DAGGER','AIR-SPINNER','WHIRLING-TORNADO',
]);

const JET_ON_ODD_DISTINCT_HIT=new Set(['SHEARING-CHAIN','FROST-FEINT','FROST-WING']);

export const WARDEN_ARCANA_DAMAGE_MULTIPLIERS=Object.freeze({
  'FLAME-CROSS':3,
  'FLAME-FUSION':3,
  'EXPLOSIVE-CHARGE':3,
  'HOMING-FLARES':3,
  'BOUNCING-BLAZE':1.5,
  'SEARING-CROWN':1.5,
  'IGNITION-DRIVE':1.5,
  'ENGULFING-FISSURE':1.5,
  'AQUA-BEAM':3,
  'DRAGON-BLAST':3,
  'WHIRLING-TORNADO':2,
  'PERFORATING-JET':.5,
});

// A few older source ports identify their damage semantically instead of
// carrying arcanaId. Keep that translation here so every downstream engine
// consumes one normalized damage contract.
const DAMAGE_OPTION_ARCANA_HINTS=Object.freeze([
  ['flameStrike','FLAME-STRIKE'],['flameCrossFinisher','FLAME-CROSS'],
  ['bouncingBlaze','BOUNCING-BLAZE'],['flameFusion','FLAME-FUSION'],
  ['dragonArc','DRAGON-ARC'],['homingFlares','HOMING-FLARES'],
  ['flameBreath','FLAME-BREATH'],['searingCrown','SEARING-CROWN'],
  ['ignitionDrive','IGNITION-DRIVE'],['engulfingFissure','ENGULFING-FISSURE'],
  ['dragonBlast','DRAGON-BLAST'],['shearingChain','SHEARING-CHAIN'],
  ['tectonicDrill','TECTONIC-DRILL'],['rockSolidTomahawk','ROCK-SOLID-TOMAHAWK'],
  ['aquaBeam','AQUA-BEAM'],['aquaVortex','AQUA-VORTEX'],['aquaBreaker','AQUA-BREAKER'],
  ['earthKnuckles','EARTH-KNUCKLES'],['bladedVine','BLADED-VINE'],
  ['stoneShot','STONE-SHOT'],['sparkContact','SPARK-CONTACT'],
  ['sparkContactArc','SPARK-CONTACT'],['boltRail','BOLT-RAIL'],
  ['boltRailFinisher','BOLT-RAIL'],['voltDisc','VOLT-DISC'],
  ['voltDiscBurst','VOLT-DISC'],['airSpinnerRing','AIR-SPINNER'],
  ['airSpinnerDisc','AIR-SPINNER'],['cycloneBoomerang','CYCLONE-BOOMERANG'],
  ['perforatingJet','PERFORATING-JET'],
  ['windSlash','WIND-SLASH'],['iceDagger','ICE-DAGGER'],
  ['chaosCrusher','CHAOS-CRUSHER'],['whirlingTornadoTick','WHIRLING-TORNADO'],
  ['whirlingTornadoFinisher','WHIRLING-TORNADO'],['waterPrisonImpact','WATER-PRISON'],
  ['waterPrisonTick','WATER-PRISON'],['shockNova','SHOCK-NOVA'],
  ['starBolt','STAR-BOLT'],
]);

export function wardenArcanaIdFromDamageOptions(options={}){
  const explicit=normalizeArcanaId(options.arcanaId||options.sourceArcana||options.arcana||'');
  if(explicit)return explicit;
  for(const[key,id]of DAMAGE_OPTION_ARCANA_HINTS)if(Object.hasOwn(options,key))return id;
  return'';
}

export function isWardenGeneratedCard(card,kind=null){
  const value=String(card?.__wardenGeneratedKind||'').toLowerCase();
  return kind?value===String(kind).toLowerCase():value===WARDEN_BURN_CARD_KIND||value===WARDEN_JET_CARD_KIND;
}

function generatedCard(kind,serial){
  const burn=kind===WARDEN_BURN_CARD_KIND,index=String(serial).padStart(4,'0');
  return Object.freeze({
    id:`WTR-${burn?'BURN':'JET'}-${index}`,
    name:burn?'Burn':'Jet',
    icon:burn?'BURN':'JET',
    type:'modifier',
    description:burn
      ?'Up: wait 2 seconds. Down: destroy this card and take 10 damage.'
      :'Up: fire the next Jet beat. Down: return this card to the draw pile.',
    __wardenGeneratedKind:kind,
    __wardenTrialElement:burn?'Fire':'Air',
    ...(burn?{}:{__wardenTrialArcanaId:'PERFORATING-JET'}),
  });
}

export function createWardenArcanaEngine({
  deck=null,
  addBloodSlashCharges=()=>0,
  enterBingBong=()=>false,
  damagePlayer=()=>false,
  onChange=()=>{},
}={}){
  let hasteByCard=new WeakMap();
  let aquaBeamUses=new WeakMap();
  const state={
    flow:0,selfBurns:0,jetStep:0,generatedSerial:0,castSerial:0,
    latestCastByArcana:new Map(),links:new Map(),fragile:new Map(),
  };

  const notify=reason=>onChange?.(snapshot(),reason);
  const cardKind=card=>String(card?.__wardenGeneratedKind||'').toLowerCase();
  const burnCount=()=>Array.isArray(deck?.pool)
    ?deck.pool.filter(card=>isWardenGeneratedCard(card,WARDEN_BURN_CARD_KIND)).length
    :0;
  const addGenerated=(kind,destination='discard')=>{
    const card=generatedCard(kind,++state.generatedSerial);
    if(typeof deck?.addCard==='function')deck.addCard(card,{destination});
    notify(`${kind}-added`);return card;
  };
  const consumeBurn=()=>{
    const removed=typeof deck?.removeFirst==='function'
      ?deck.removeFirst(card=>isWardenGeneratedCard(card,WARDEN_BURN_CARD_KIND))
      :null;
    if(removed)notify('burn-consumed');
    return removed||null;
  };

  function grantHaste(sourceCard,seconds=1){
    const amount=Math.max(0,Number(seconds)||0);if(!amount)return 0;
    let changed=0;
    for(const card of deck?.pool||[]){
      if(!card||card===sourceCard)continue;
      hasteByCard.set(card,(hasteByCard.get(card)||0)+amount);changed++;
    }
    if(changed)notify('haste-granted');
    return changed;
  }

  function processDistinctHit(record,enemy,ordinal){
    const id=record.arcanaId;
    if(id==='WAVE-FRONT')state.flow++;
    if(HASTE_ON_DISTINCT_HIT.has(id))grantHaste(record.card,1);
    if(JET_ON_ODD_DISTINCT_HIT.has(id)&&ordinal%2===1)addGenerated(WARDEN_JET_CARD_KIND,'discard');
    if(id==='SHOCK-LINE')addBloodSlashCharges(1);
    notify('distinct-hit');
  }

  function beginCast({card,arcanaId}={}){
    const generatedJet=isWardenGeneratedCard(card,WARDEN_JET_CARD_KIND);
    const jetBeat=generatedJet?(state.jetStep%3)+1:0;
    const dispatchArcanaId=generatedJet&&jetBeat===3?'BLURRING-FALCONRY':normalizeArcanaId(arcanaId);
    if(!dispatchArcanaId)return null;
    const preFlow=state.flow,serial=++state.castSerial;
    const record={serial,arcanaId:dispatchArcanaId,card,seen:new Set(),processed:new Set(),committed:false};
    state.latestCastByArcana.set(dispatchArcanaId,record);
    const context={
      wardenArcanaEngine:true,wardenCastSerial:serial,flowAtCast:preFlow,
      generatedJet,jetBeat:generatedJet&&jetBeat<3?jetBeat:0,
      bubbleCount:dispatchArcanaId==='BUBBLE-BARRAGE'?4+3*preFlow:0,
      sizeMultiplier:dispatchArcanaId==='AQUA-VORTEX'&&preFlow>0?2:1,
    };
    return{pending:true,card,arcanaId:dispatchArcanaId,preFlow,generatedJet,jetBeat,record,context};
  }

  function decorateArcanaCard(card,transaction){
    if(!card||!transaction)return card;
    return Object.freeze({
      ...card,
      __wardenEngineCastSerial:transaction.record.serial,
      __wardenEngineBubbleCount:transaction.context.bubbleCount||undefined,
      __wardenEngineSizeMultiplier:transaction.context.sizeMultiplier||1,
      __wardenEngineJetBeat:transaction.context.jetBeat||0,
      __wardenEngineGeneratedJet:transaction.generatedJet===true,
    });
  }

  function abortCast(transaction){
    if(!transaction?.pending)return false;
    transaction.pending=false;
    if(state.latestCastByArcana.get(transaction.arcanaId)===transaction.record){
      state.latestCastByArcana.delete(transaction.arcanaId);
    }
    return true;
  }

  function commitCast(transaction){
    if(!transaction?.pending)return null;
    transaction.pending=false;
    const{id,preFlow}= {id:transaction.arcanaId,preFlow:transaction.preFlow};
    if(id==='BUBBLE-BARRAGE')state.flow=0;
    else if(preFlow>0)state.flow=Math.max(0,state.flow-1);
    state.flow+=FLOW_ON_CAST[id]||0;

    if(BURN_CONSUMERS.has(id))consumeBurn();
    if(BURN_ON_CAST[id])addGenerated(WARDEN_BURN_CARD_KIND,BURN_ON_CAST[id]);

    let destination='discard';
    if(transaction.generatedJet){state.jetStep=(state.jetStep+1)%3;destination='exhaust';}
    else if(id==='WAVE-FRONT'&&preFlow>0)destination='draw-bottom';
    else if(id==='AQUA-BEAM'){
      const current=aquaBeamUses.get(transaction.card)||0;
      const used=preFlow>0?current:current+1;
      aquaBeamUses.set(transaction.card,used);
      destination=used>=2?'exhaust':'keep';
    }

    transaction.record.committed=true;
    let ordinal=0;
    for(const enemy of transaction.record.seen){
      ordinal++;
      if(!transaction.record.processed.has(enemy)){
        transaction.record.processed.add(enemy);processDistinctHit(transaction.record,enemy,ordinal);
      }
    }
    notify('cast-committed');
    return Object.freeze({
      arcanaId:id,destination,preFlow,flow:state.flow,jetBeat:transaction.jetBeat,
      bubbleCount:transaction.context.bubbleCount||0,sizeMultiplier:transaction.context.sizeMultiplier||1,
      aquaBeamUses:aquaBeamUses.get(transaction.card)||0,
    });
  }

  function recordArcanaHit(arcanaId,enemy,options={}){
    const id=normalizeArcanaId(arcanaId);if(!id||!enemy)return false;
    if(LINK_ON_HIT.has(id)){
      state.links.set(enemy,WARDEN_LINK_DURATION_SECONDS);
      enemy.wardenLinkRemaining=WARDEN_LINK_DURATION_SECONDS;
    }
    const rockFinisher=id==='ROCK-N-ROLL'&&options.finalHit===true;
    if(FRAGILE_ON_HIT.has(id)||rockFinisher){
      const next=(state.fragile.get(enemy)||0)+1;state.fragile.set(enemy,next);enemy.wardenFragileStacks=next;
    }
    const record=state.latestCastByArcana.get(id);
    if(record&&!record.seen.has(enemy)){
      record.seen.add(enemy);
      if(record.committed){
        record.processed.add(enemy);processDistinctHit(record,enemy,record.seen.size);
      }
    }
    notify('arcana-hit');return true;
  }

  function prepareDamage(enemy,amount,options={}){
    const arcanaId=wardenArcanaIdFromDamageOptions(options);
    let value=Math.max(0,Number(amount)||0);
    const multiplier=WARDEN_ARCANA_DAMAGE_MULTIPLIERS[arcanaId]||1;
    value*=multiplier;
    if(arcanaId==='FLAME-STRIKE'||arcanaId==='FLAME-BREATH')value*=1+.2*burnCount();
    if(arcanaId==='DRAGON-ARC'||arcanaId==='RAPID-FIRE-AGENT')value+=20*state.selfBurns;
    const fragileAvailable=!options.arcanaEngineLink&&value>0?(state.fragile.get(enemy)||0):0;
    if(fragileAvailable>0){
      value*=WARDEN_FRAGILE_MULTIPLIER;
      const next=fragileAvailable-1;
      if(next>0)state.fragile.set(enemy,next);else state.fragile.delete(enemy);
      if(enemy)enemy.wardenFragileStacks=next;
    }
    return{enemy,arcanaId,amount:value,fragileConsumed:fragileAvailable>0};
  }

  function finishDamage(prepared,{landed=false,options={}}={}){
    if(!prepared)return false;
    if(!landed&&prepared.fragileConsumed){
      const next=(state.fragile.get(prepared.enemy)||0)+1;state.fragile.set(prepared.enemy,next);
      if(prepared.enemy)prepared.enemy.wardenFragileStacks=next;
    }
    if(landed&&prepared.arcanaId&&!options.arcanaEngineLink)recordArcanaHit(prepared.arcanaId,prepared.enemy,options);
    return landed;
  }

  function linkedTargets(exclude=null){
    const result=[];
    for(const[enemy,remaining]of state.links){
      if(!enemy||Number(enemy.hp)<=0||remaining<=0){state.links.delete(enemy);continue;}
      if(enemy!==exclude)result.push(enemy);
    }
    return result;
  }

  function planDown(card){
    const kind=cardKind(card),arcanaId=normalizeArcanaId(card?.__wardenTrialArcanaId||'');
    if(kind===WARDEN_BURN_CARD_KIND)return Object.freeze({kind:'self-burn',destination:'exhaust',applyStance:false,cooldown:0});
    if(kind===WARDEN_JET_CARD_KIND)return Object.freeze({kind:'jet-return',destination:'draw-bottom',applyStance:false,cooldown:0});
    if(BLOOD_SLASH_DOWN.has(arcanaId))return Object.freeze({kind:'blood-slash',destination:'discard',applyStance:false,cooldown:1});
    if(BING_BONG_DOWN.has(arcanaId))return Object.freeze({kind:'bing-bong',destination:'discard',applyStance:false,cooldown:1});
    return null;
  }

  function commitDown(plan){
    if(!plan)return false;
    if(plan.kind==='self-burn'){
      state.selfBurns++;
      damagePlayer(10,{kind:'burn-card',name:'Burn',ignoreInvulnerability:true,targetableIndependent:true});
    }else if(plan.kind==='blood-slash')addBloodSlashCharges(WARDEN_BLOOD_SLASH_GRANT);
    else if(plan.kind==='bing-bong')enterBingBong();
    notify(`down-${plan.kind}`);return true;
  }

  function cooldownSeconds(card,direction,{abilityCooldowns=true}={}){
    const kind=cardKind(card),arcanaId=normalizeArcanaId(card?.__wardenTrialArcanaId||'');
    if(direction==='down')return kind===WARDEN_BURN_CARD_KIND||kind===WARDEN_JET_CARD_KIND?0:1;
    if(direction!=='up')return 0;
    if(kind===WARDEN_BURN_CARD_KIND)return 2;
    if(kind===WARDEN_JET_CARD_KIND)return 0;
    if(abilityCooldowns===false)return 0;
    return arcanaId==='DRAGON-BLAST'?9:3;
  }

  function cooldownElapsed(card,deltaSeconds){
    const elapsed=Math.max(0,Number(deltaSeconds)||0),stored=hasteByCard.get(card)||0;
    if(!elapsed||!stored)return elapsed;
    const boosted=Math.min(elapsed,stored),next=Math.max(0,stored-boosted);
    if(next>0)hasteByCard.set(card,next);else hasteByCard.delete(card);
    return elapsed+boosted;
  }

  function update(deltaSeconds=0){
    const elapsed=Math.max(0,Number(deltaSeconds)||0);if(!elapsed)return snapshot();
    for(const[enemy,remaining]of[...state.links]){
      const next=remaining-elapsed;
      if(!enemy||Number(enemy.hp)<=0||next<=0){state.links.delete(enemy);if(enemy)enemy.wardenLinkRemaining=0;}
      else{state.links.set(enemy,next);enemy.wardenLinkRemaining=next;}
    }
    return snapshot();
  }

  function reset(){
    for(const enemy of state.links.keys())if(enemy)enemy.wardenLinkRemaining=0;
    for(const enemy of state.fragile.keys())if(enemy)enemy.wardenFragileStacks=0;
    state.flow=0;state.selfBurns=0;state.jetStep=0;state.generatedSerial=0;state.castSerial=0;
    state.latestCastByArcana.clear();state.links.clear();state.fragile.clear();
    hasteByCard=new WeakMap();aquaBeamUses=new WeakMap();notify('reset');return snapshot();
  }

  function snapshot(){
    const hand=deck?.hand||[],current=hand.find(Boolean)||null;
    return Object.freeze({
      flow:state.flow,selfBurns:state.selfBurns,burns:burnCount(),jetStep:(state.jetStep%3)+1,
      linked:state.links.size,fragile:[...state.fragile.values()].reduce((sum,value)=>sum+value,0),
      currentHaste:Number((hasteByCard.get(current)||0).toFixed(3)),
      currentAquaBeamUses:aquaBeamUses.get(current)||0,
    });
  }

  return Object.freeze({
    state,beginCast,decorateArcanaCard,abortCast,commitCast,recordArcanaHit,
    prepareDamage,finishDamage,linkedTargets,planDown,commitDown,cooldownSeconds,cooldownElapsed,
    addGenerated,consumeBurn,grantHaste,hasteForCard:card=>hasteByCard.get(card)||0,
    aquaBeamUsesForCard:card=>aquaBeamUses.get(card)||0,update,reset,snapshot,
  });
}

export function installWardenArcanaDamageRuntime({engine,getEnemySystem}={}){
  const state={system:null,base:null,wrapper:null};
  function patch(){
    let system=null;try{system=getEnemySystem?.();}catch{return false;}
    if(!system||typeof system.damageEnemy!=='function')return false;
    if(system===state.system)return true;
    const base=system.damageEnemy.bind(system);
    const wrapper=function wardenArcanaEngineDamage(enemy,amount,knock,options={}){
      const prepared=engine?.prepareDamage?.(enemy,amount,options)||{arcanaId:'',amount};
      const normalized=prepared.arcanaId&&!options.arcanaId?{...options,arcanaId:prepared.arcanaId}:options;
      const before=Number(enemy?.hp),result=base(enemy,prepared.amount,knock,normalized);
      const after=Number(enemy?.hp),landed=Number.isFinite(before)&&Number.isFinite(after)&&after<before;
      engine?.finishDamage?.(prepared,{landed,options:normalized});
      if(landed&&!normalized.arcanaEngineLink){
        const shared=Math.max(0,before-after);
        for(const target of engine?.linkedTargets?.(enemy)||[]){
          base(target,shared,{x:0,z:0},{source:'wardenLink',arcanaEngineLink:true,sourceTarget:enemy});
        }
      }
      return result;
    };
    wrapper.__wardenArcanaEngineDamageRuntime=true;
    state.system=system;state.base=system.damageEnemy;state.wrapper=wrapper;system.damageEnemy=wrapper;
    return true;
  }
  return Object.freeze({state,update:patch,dispose(){
    if(state.system?.damageEnemy===state.wrapper&&state.base)state.system.damageEnemy=state.base;
    state.system=null;state.base=null;state.wrapper=null;
  }});
}
