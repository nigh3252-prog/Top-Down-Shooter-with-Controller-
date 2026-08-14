export const WARDEN_TRIAL_DEFAULTS = Object.freeze({
  approachRange:6.95,
  retreatRange:6.15,
  attackRange:6.95,
  decisionInterval:.16,
  heavyEvery:5,
  heavyHold:.34,
  dodgeCooldown:2.1,
  defenseTelegraphAt:.38,
  emergencyDefenseAt:.78,
  defenseBuffer:1.1,
  emptyWaveDelay:1.8,
  staminaRestDelay:.72,
  lowStamina:12,
});

const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const living=enemies=>(enemies||[]).filter(enemy=>enemy&&finite(enemy.hp)>0);

const WEAPON_RANGE_BONUS=Object.freeze({
  dagger:-.30,
  rapier:.25,
  katana:.05,
  whip:.45,
  mace:-.20,
  spear:.45,
  axe:.10,
  hammer:.20,
});

export function getWardenTrialCombatBand({weapon={},target={}}={}){
  const kind=String(weapon?.kind||'').toLowerCase();
  const length=clamp(finite(weapon?.tune?.length,finite(weapon?.baseLength,1)),.45,2.45);
  const targetRadius=clamp(finite(target?.radius,.9),.5,2.4);
  // The player weapon is authored at the shared four-times combat scale. This
  // converts its tuned length into a center-to-center target distance, then
  // adds a small kind-specific reach adjustment for thrusts, lashes, and short
  // blunt weapons. The band is deliberately outside the body-contact range so
  // the attack's root-motion lunge does not leave the Warden point blank.
  const contactRange=4.65 + length*1.35 + (WEAPON_RANGE_BONUS[kind]||0) + (targetRadius-.9)*.45;
  const preferred=contactRange+.45;
  const inner=preferred-.45;
  const outer=preferred+.35;
  return Object.freeze({
    contactRange,
    preferred,
    inner,
    outer,
    attackMin:inner,
    attackMax:outer,
    approachRange:outer,
    retreatRange:inner,
    attackRange:outer,
    targetRadius,
  });
}

export function nearestWardenTrialTarget(player,enemies){
  let target=null,distance=Infinity;
  for(const enemy of living(enemies)){
    const dx=finite(enemy.x)-finite(player?.x),dz=finite(enemy.z)-finite(player?.z);
    const next=Math.hypot(dx,dz);
    if(next<distance){target=enemy;distance=next;}
  }
  return target?{target,distance}:null;
}

export function nearestWardenTrialThreat(player,enemies,{defenseTelegraphAt=.38,defenseBuffer=1.1,playerRadius=1.05}={}){
  let threat=null,bestScore=-Infinity;
  for(const enemy of living(enemies)){
    if(enemy.state!=='windup')continue;
    const windup=Math.max(.001,finite(enemy.windup,1));
    const progress=clamp(finite(enemy.stateTime)/windup,0,1);
    if(progress<defenseTelegraphAt)continue;
    const dx=finite(enemy.x)-finite(player?.x),dz=finite(enemy.z)-finite(player?.z);
    const distance=Math.hypot(dx,dz);
    const attackRange=finite(enemy.attack?.range,finite(enemy.attackRange,3.5));
    const contact=attackRange+finite(enemy.radius,.9)+playerRadius+defenseBuffer;
    if(distance>contact)continue;
    const proximity=1-clamp(distance/Math.max(.001,contact),0,1);
    const score=progress*.72+proximity*.28;
    if(score<=bestScore)continue;
    bestScore=score;threat={enemy,distance,progress,contact,score};
  }
  return threat;
}

function tacticalDodgeVector(player,threat){
  const dx=finite(threat?.enemy?.x)-finite(player?.x),dz=finite(threat?.enemy?.z)-finite(player?.z);
  const length=Math.hypot(dx,dz)||1;
  const toward={x:dx/length,z:dz/length};
  const sideSign=String(threat?.enemy?.id||'').length%2===0?1:-1;
  const side={x:-toward.z*sideSign,z:toward.x*sideSign};
  const x=-toward.x*.45+side.x*.89,z=-toward.z*.45+side.z*.89;
  const magnitude=Math.hypot(x,z)||1;
  return{x:x/magnitude,z:z/magnitude};
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
    const derivedBand=getWardenTrialCombatBand({weapon:context.weapon,target});
    const band=context.weapon?derivedBand:{
      ...derivedBand,
      inner:finite(config.retreatRange,derivedBand.inner),
      outer:finite(config.approachRange,derivedBand.outer),
      attackMin:finite(config.retreatRange,derivedBand.attackMin),
      attackMax:finite(config.attackRange,derivedBand.attackMax),
    };
    let move={x:0,z:0};
    if(distance>band.outer)move={x:dx/length,z:dz/length};
    else if(distance<band.inner)move={x:-dx/length,z:-dz/length};

    const threat=nearestWardenTrialThreat(context.player,context.enemies,config);
    const danger=threat&&(!context.attackActive||threat.progress>=config.emergencyDefenseAt);
    if(danger&&state.dodgeT<=0){
      state.dodgeT=config.dodgeCooldown;
      return{move:{x:0,z:0},action:'dodge',dodgeMove:tacticalDodgeVector(context.player,threat),target:threat.enemy,threat};
    }

    if(finite(context.stamina,100)<config.lowStamina&&!context.attackActive){
      state.restT+=elapsed;
      if(state.restT>=config.staminaRestDelay){state.restT=0;return{move:{x:0,z:0},action:'refill',target};}
      return{move:{x:0,z:0},resting:true,target};
    }
    state.restT=0;

    if(distance>=band.attackMin&&distance<=band.attackMax&&state.decisionT<=0){
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
