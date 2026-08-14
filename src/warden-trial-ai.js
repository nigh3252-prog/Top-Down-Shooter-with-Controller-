export const WARDEN_TRIAL_DEFAULTS = Object.freeze({
  approachRange:4.8,
  retreatRange:2.15,
  attackRange:5.55,
  decisionInterval:.16,
  heavyEvery:5,
  heavyHold:.34,
  dodgeCooldown:2.1,
  emptyWaveDelay:1.8,
  staminaRestDelay:.72,
  lowStamina:12,
});

const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const living=enemies=>(enemies||[]).filter(enemy=>enemy&&finite(enemy.hp)>0);

export function nearestWardenTrialTarget(player,enemies){
  let target=null,distance=Infinity;
  for(const enemy of living(enemies)){
    const dx=finite(enemy.x)-finite(player?.x),dz=finite(enemy.z)-finite(player?.z);
    const next=Math.hypot(dx,dz);
    if(next<distance){target=enemy;distance=next;}
  }
  return target?{target,distance}:null;
}

export function createWardenTrialBrain(options={}){
  const config={...WARDEN_TRIAL_DEFAULTS,...options};
  const state={decisionT:0,dodgeT:0,emptyT:0,restT:0,attackCount:0,heavyHeldT:0};

  function reset(){
    state.decisionT=state.dodgeT=state.emptyT=state.restT=state.heavyHeldT=0;
    state.attackCount=0;
  }

  function update(dt,context={}){
    const elapsed=Math.max(0,finite(dt));
    state.decisionT=Math.max(0,state.decisionT-elapsed);
    state.dodgeT=Math.max(0,state.dodgeT-elapsed);
    if(state.heavyHeldT>0){
      state.heavyHeldT=Math.max(0,state.heavyHeldT-elapsed);
      if(state.heavyHeldT===0)return{move:{x:0,z:0},action:'heavy-up'};
      return{move:{x:0,z:0},holdingHeavy:true};
    }

    const found=nearestWardenTrialTarget(context.player,context.enemies);
    if(!found){
      state.emptyT+=elapsed;
      if(state.emptyT>=config.emptyWaveDelay){state.emptyT=0;return{move:{x:0,z:0},spawnWave:true};}
      return{move:{x:0,z:0}};
    }
    state.emptyT=0;

    const {target,distance}=found;
    const dx=finite(target.x)-finite(context.player?.x),dz=finite(target.z)-finite(context.player?.z);
    const length=Math.hypot(dx,dz)||1;
    let move={x:0,z:0};
    if(distance>config.approachRange)move={x:dx/length,z:dz/length};
    else if(distance<config.retreatRange)move={x:-dx/length,z:-dz/length};

    const danger=target.state==='windup'&&finite(target.windup,1)>0&&finite(target.stateTime)/finite(target.windup,1)>.52;
    if(danger&&state.dodgeT<=0&&!context.attackActive){
      state.dodgeT=config.dodgeCooldown;
      return{move:{x:0,z:0},action:'dodge',target};
    }

    if(finite(context.stamina,100)<config.lowStamina&&!context.attackActive){
      state.restT+=elapsed;
      if(state.restT>=config.staminaRestDelay){state.restT=0;return{move:{x:0,z:0},action:'refill',target};}
      return{move:{x:0,z:0},resting:true,target};
    }
    state.restT=0;

    if(distance<=config.attackRange&&state.decisionT<=0){
      state.decisionT=config.decisionInterval;
      state.attackCount++;
      if(!context.attackActive&&state.attackCount%config.heavyEvery===0){
        state.heavyHeldT=config.heavyHold;
        return{move:{x:0,z:0},action:'heavy-down',target};
      }
      return{move,action:'light',target};
    }
    return{move,target};
  }

  return{update,reset,snapshot:()=>Object.freeze({...state})};
}
