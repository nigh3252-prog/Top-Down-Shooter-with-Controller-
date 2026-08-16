export const WARDEN_TRIAL_DEFAULTS = Object.freeze({
  approachRange:6.95,
  retreatRange:6.15,
  attackRange:6.95,
  decisionInterval:.16,
  heavyEvery:5,
  heavyHold:.34,
  // The shared dodge runtime has its own shorter mechanical cooldown. This
  // extra AI cooldown prevents the spectator loop from spending every defense
  // on a chain of harmless tells.
  dodgeCooldown:.75,
  defenseCooldown:.30,
  defenseTelegraphAt:.18,
  defenseBuffer:1.1,
  parryLead:.16,
  parryMinLead:.035,
  shieldLead:.42,
  shieldReleaseLead:.12,
  dodgeLead:.42,
  emergencyDefenseAt:.22,
  attackCommitLead:.34,
  defenseReserve:12,
  attackStaminaFloor:8,
  // The shared dodge curve travels DODGE_SPEED * DODGE_TIME * .75, about
  // 3.5 world units. Planning against that reachable endpoint keeps the
  // safety test honest instead of assuming a longer teleport.
  dodgeDistance:3.5,
  emptyWaveDelay:1.8,
  staminaRestDelay:.72,
  lowStamina:12,
});

const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const living=enemies=>(enemies||[]).filter(enemy=>enemy&&finite(enemy.hp)>0);
const norm2=(x,z)=>{
  const length=Math.hypot(finite(x),finite(z))||1;
  return{x:finite(x)/length,z:finite(z)/length};
};
const dot2=(a,b)=>finite(a?.x)*finite(b?.x)+finite(a?.z)*finite(b?.z);

export function blendWardenTrialCenterMovement(move={}, {
  direction={x:0,z:0},
  pressure=0,
  bias=1,
  maxWeight=.9,
}={}){
  const baseX=finite(move?.x),baseZ=finite(move?.z);
  const directionLength=Math.hypot(finite(direction?.x),finite(direction?.z));
  const centerX=directionLength>1e-6?finite(direction?.x)/directionLength:0;
  const centerZ=directionLength>1e-6?finite(direction?.z)/directionLength:0;
  const weight=clamp(
    finite(pressure)*Math.max(0,finite(bias,1)),
    0,
    clamp(finite(maxWeight,.9),0,1),
  );
  const x=baseX*(1-weight)+centerX*weight;
  const z=baseZ*(1-weight)+centerZ*weight;
  const length=Math.hypot(x,z);
  return length>1?{x:x/length,z:z/length}:{x,z};
}

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

function enemyFacing(enemy,player){
  const facing=enemy?.facing;
  if(Math.hypot(finite(facing?.x),finite(facing?.z))>1e-5)return norm2(facing.x,facing.z);
  if(Number.isFinite(Number(enemy?.facingAngle))){
    return{x:Math.sin(Number(enemy.facingAngle)),z:Math.cos(Number(enemy.facingAngle))};
  }
  return norm2(finite(player?.x)-finite(enemy?.x),finite(player?.z)-finite(enemy?.z));
}

function attackAimedAtPlayer(enemy,player,attack){
  if(String(attack?.kind||'melee')==='ranged'||finite(attack?.arc,0)<=0)return true;
  const towardPlayer=norm2(finite(player?.x)-finite(enemy?.x),finite(player?.z)-finite(enemy?.z));
  const facing=enemyFacing(enemy,player);
  const halfArc=clamp(finite(attack?.arc,Math.PI),.05,Math.PI)*.5;
  // The small tolerance represents attack alignment and keeps the AI from
  // treating a visibly aimed tell as harmless because of a few degrees.
  return dot2(facing,towardPlayer)>=Math.cos(halfArc+.16);
}

export function getWardenTrialThreatSnapshot(player,enemy,{
  defenseBuffer=1.1,
  playerRadius=1.05,
}={}){
  if(!enemy||finite(enemy.hp)<=0||enemy.state!=='windup')return null;
  const attack=enemy.attack||{};
  const windup=Math.max(.001,finite(enemy.windup,finite(attack.windup,1)));
  const stateTime=clamp(finite(enemy.stateTime),0,windup);
  const progress=clamp(stateTime/windup,0,1);
  const impactIn=Math.max(.001,windup-stateTime);
  const dx=finite(enemy.x)-finite(player?.x),dz=finite(enemy.z)-finite(player?.z);
  const distance=Math.hypot(dx,dz);
  const attackRange=finite(attack.range,finite(enemy.attackRange,3.5));
  const enemyRadius=finite(enemy.radius,.9);
  const contact=attackRange+enemyRadius+playerRadius+defenseBuffer;
  const aimed=attackAimedAtPlayer(enemy,player,attack);
  const hitLikely=distance<=contact&&aimed;
  const damage=Math.max(0,finite(attack.damage,finite(enemy.damage,0)));
  const attackKind=String(attack.kind||'melee');
  const urgency=clamp(1-impactIn/Math.max(.001,windup),0,1);
  const proximity=1-clamp(distance/Math.max(.001,contact),0,1);
  const severity=clamp(damage/30,0,1);
  return Object.freeze({
    enemy,
    attack,
    distance,
    progress,
    impactIn,
    attackRange,
    contact,
    aimed,
    hitLikely,
    damage,
    severity,
    urgency,
    proximity,
    attackKind,
    ranged:attackKind==='ranged'||attack.projectile===true,
    parryable:attackKind!=='ranged'&&attack.projectile!==true&&attack.unblockable!==true,
    direction:norm2(-dx,-dz),
  });
}

export function wardenTrialThreats(player,enemies,options={}){
  const telegraphAt=clamp(finite(options?.defenseTelegraphAt,.18),0,1);
  return living(enemies)
    .map(enemy=>getWardenTrialThreatSnapshot(player,enemy,options))
    .filter(threat=>threat&&threat.progress>=telegraphAt)
    .sort((left,right)=>{
      const leftScore=(left.hitLikely?1.4:.2)+left.urgency*1.15+left.proximity*.25+left.severity*.35;
      const rightScore=(right.hitLikely?1.4:.2)+right.urgency*1.15+right.proximity*.25+right.severity*.35;
      return rightScore-leftScore;
    });
}

export function nearestWardenTrialThreat(player,enemies,options={}){
  return wardenTrialThreats(player,enemies,options)[0]||null;
}

function candidateDodgeDirections(threat){
  const away=norm2(threat?.direction?.x,threat?.direction?.z);
  const left={x:-away.z,z:away.x};
  const right={x:away.z,z:-away.x};
  const mix=(a,b,weight)=>norm2(a.x*(1-weight)+b.x*weight,a.z*(1-weight)+b.z*weight);
  return[
    away,
    left,
    right,
    mix(away,left,.42),
    mix(away,right,.42),
    mix(away,left,.72),
    mix(away,right,.72),
    norm2(-away.x,-away.z),
  ];
}

function endpointThreatPenalty(endpoint,threats,{playerRadius=1.05}={}){
  let score=0;
  for(const threat of threats){
    const enemy=threat.enemy;
    const dx=finite(endpoint.x)-finite(enemy?.x),dz=finite(endpoint.z)-finite(enemy?.z);
    const distance=Math.hypot(dx,dz);
    const dangerRadius=finite(threat.attackRange,3.5)+finite(enemy?.radius,.9)+playerRadius+.25;
    if(distance<dangerRadius){
      const closeness=1-clamp(distance/Math.max(.001,dangerRadius),0,1);
      score-=18+closeness*24+threat.damage*.35;
    }
    if(threat.attackKind!=='ranged'&&threat.aimed){
      const toEndpoint=norm2(dx,dz);
      const facing=enemyFacing(enemy,endpoint);
      const arc=clamp(finite(threat.attack?.arc,Math.PI),.05,Math.PI)*.5;
      if(dot2(facing,toEndpoint)>=Math.cos(arc+.12))score-=4+threat.damage*.12;
    }
  }
  return score;
}

export function chooseWardenTrialDodgeEndpoint({
  player={x:0,z:0},
  threat=null,
  enemies=[],
  stage=null,
  centerField=null,
  target=null,
  preferredRange=6.5,
  playerRadius=1.05,
  dodgeDistance=4.6,
}={}){
  const allThreats=wardenTrialThreats(player,enemies,{defenseTelegraphAt:0,defenseBuffer:1.1,playerRadius});
  const primary=threat||allThreats[0]||null;
  const candidates=candidateDodgeDirections(primary);
  let best=null;
  for(const direction of candidates){
    const requested={x:finite(player.x)+direction.x*dodgeDistance,z:finite(player.z)+direction.z*dodgeDistance};
    const resolved=typeof stage?.resolveMovement==='function'
      ?stage.resolveMovement(player,{x:direction.x*dodgeDistance,z:direction.z*dodgeDistance},playerRadius)
      :requested;
    const endpoint={x:finite(resolved?.x,requested.x),z:finite(resolved?.z,requested.z)};
    const travelled=Math.hypot(endpoint.x-finite(player.x),endpoint.z-finite(player.z));
    let score=travelled*1.4;
    if(resolved?.collided===true||travelled<dodgeDistance*.72)score-=10;
    score+=endpointThreatPenalty(endpoint,allThreats,{playerRadius});
    const edgeSample=centerField?.sample?.(endpoint,playerRadius);
    if(edgeSample)score-=finite(edgeSample.pressure)*4.5;
    if(target){
      const targetDistance=Math.hypot(endpoint.x-finite(target.x),endpoint.z-finite(target.z));
      score-=Math.abs(targetDistance-finite(preferredRange,6.5))*.22;
    }
    if(!best||score>best.score)best={direction,endpoint,score,travelled};
  }
  return Object.freeze(best||{
    direction:{x:0,z:1},
    endpoint:{x:finite(player.x),z:finite(player.z)+dodgeDistance},
    score:0,
    travelled:dodgeDistance,
  });
}

function defenseKind(context){
  const raw=String(context?.defense?.kind||context?.defenseKind||'existing-dodge');
  if(raw==='dodge')return'existing-dodge';
  if(raw==='parry'||raw==='shield'||raw==='existing-dodge')return raw;
  return'existing-dodge';
}

function attackIsActive(context){
  return context?.attack?.active===true||context?.attackActive===true;
}

function attackRemaining(context){
  const attack=context?.attack;
  if(!attack?.active)return 0;
  if(Number.isFinite(Number(attack.remaining)))return Math.max(0,Number(attack.remaining));
  if(Number.isFinite(Number(attack.total))&&Number.isFinite(Number(attack.t)))return Math.max(0,Number(attack.total)-Number(attack.t));
  return .4;
}

function defenseBusy(context,kind,state){
  const defense=context?.defense||{};
  if(state.defenseCooldownT>0||state.defenseRejectT>0)return true;
  if(kind==='parry')return finite(defense.parryRemaining)>0||finite(defense.parryRecoveryRemaining)>0;
  if(kind==='shield')return defense.guardBroken===true;
  return finite(defense.dodgeRemaining)>0;
}

export function createWardenTrialBrain(options={}){
  const config={...WARDEN_TRIAL_DEFAULTS,...options};
  const state={
    decisionT:0,
    dodgeT:0,
    defenseCooldownT:0,
    defenseRejectT:0,
    emptyT:0,
    attackCount:0,
    heavyHeldT:0,
    lastDefense:null,
  };

  function reset(){
    state.decisionT=state.dodgeT=state.defenseCooldownT=state.defenseRejectT=state.emptyT=state.heavyHeldT=0;
    state.attackCount=0;
    state.lastDefense=null;
  }

  function acknowledgeDefense(action,result={}){
    const accepted=result?.accepted===true||result?.dodged===true||result?.guardRaised===true;
    state.lastDefense={action:String(action||''),accepted,reason:String(result?.reason||result?.lastOutcome||'')};
    state.defenseRejectT=accepted?0:.12;
    if(accepted){
      if(action==='dodge')state.dodgeT=config.dodgeCooldown;
      if(action==='parry')state.defenseCooldownT=config.defenseCooldown;
    }
    return accepted;
  }

  function update(dt,context={}){
    const elapsed=Math.max(0,finite(dt));
    state.decisionT=Math.max(0,state.decisionT-elapsed);
    state.dodgeT=Math.max(0,state.dodgeT-elapsed);
    state.defenseCooldownT=Math.max(0,state.defenseCooldownT-elapsed);
    state.defenseRejectT=Math.max(0,state.defenseRejectT-elapsed);

    const found=nearestWardenTrialTarget(context.player,context.enemies);
    if(!found){
      if(defenseKind(context)==='shield'&&context.defense?.guardRaised===true){
        return{move:{x:0,z:0},action:'guard-off'};
      }
      if(state.heavyHeldT>0){
        state.heavyHeldT=0;
        return{move:{x:0,z:0},action:'heavy-up'};
      }
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

    const threats=wardenTrialThreats(context.player,context.enemies,config);
    const threat=threats[0]||null;
    const kind=defenseKind(context);
    const defense=context.defense||{};
    const activeAttack=attackIsActive(context);
    const dodgeReady=kind==='existing-dodge'&&state.dodgeT<=0&&!defenseBusy(context,kind,state);
    const parryReady=kind==='parry'&&!defenseBusy(context,kind,state);
    const shieldReady=kind==='shield'&&!defenseBusy(context,kind,state);
    const safeEndpoint=threat?chooseWardenTrialDodgeEndpoint({
      player:context.player,
      threat,
      enemies:context.enemies,
      stage:context.stage,
      centerField:context.centerField,
      target,
      preferredRange:band.preferred,
      playerRadius:finite(context.playerRadius,1.05),
      dodgeDistance:finite(config.dodgeDistance,4.6),
    }):null;

    // A parry is deliberately scheduled late. The attack's visible windup is
    // the only source of timing knowledge; there is no future-hit oracle.
    if(!activeAttack&&threat?.hitLikely&&parryReady&&threat.parryable&&
      threat.impactIn<=config.parryLead&&threat.impactIn>=config.parryMinLead){
      return{move:{x:0,z:0},action:'parry',target,threat,defenseTarget:threat.enemy};
    }

    // Guard is an explicit held state. It is useful against a frontal threat
    // or a short cluster, but the brain releases it as soon as no telegraph is
    // still threatening so it cannot accidentally remain toggled forever.
    if(kind==='shield'&&defense.guardRaised===true){
      const stillThreatening=threats.some(item=>item.hitLikely&&item.impactIn<=config.shieldLead);
      if(!stillThreatening)return{move:{x:0,z:0},action:'guard-off',target,defenseTarget:threat?.enemy||target};
      return{move:{x:0,z:0},action:'guard-hold',target,defenseTarget:threat?.enemy||target};
    }
    if(!activeAttack&&threat?.hitLikely&&shieldReady&&kind==='shield'&&!defense.guardRaised&&
      !defense.guardBroken&&threat.impactIn<=config.shieldLead){
      return{move:{x:0,z:0},action:'guard-on',target,threat,defenseTarget:threat.enemy};
    }

    // Dodge is reserved for the stance that actually owns Rat Step. It can
    // interrupt a committed attack only for a genuinely late threat.
    const dodgeThreat=threat?.hitLikely&&dodgeReady&&(
      threat.impactIn<=config.dodgeLead||
      (activeAttack&&threat.impactIn<=config.emergencyDefenseAt)
    );
    if(dodgeThreat){
      return{
        move:{x:0,z:0},
        action:'dodge',
        dodgeMove:safeEndpoint?.direction||{x:0,z:1},
        dodgeEndpoint:safeEndpoint?.endpoint||null,
        target,
        threat,
        defenseTarget:threat.enemy,
        emergency:activeAttack,
      };
    }

    // When the active stance cannot answer yet, ordinary movement is still a
    // valid defense. Refuse a new attack if the Warden would be committed when
    // the incoming hit lands, and preserve enough stamina for the active
    // defense. This is the part that makes its attacks look intentional.
    const pendingImpact=threat?.hitLikely&&threat.impactIn<=config.attackCommitLead;
    const spacingNeeded=pendingImpact||(
      activeAttack&&threat?.hitLikely&&threat.impactIn<=Math.max(config.attackCommitLead,attackRemaining(context))
    );
    if(spacingNeeded&&safeEndpoint){
      const releaseHeavy=state.heavyHeldT>0;
      if(releaseHeavy)state.heavyHeldT=0;
      return{move:safeEndpoint.direction,action:'space',releaseHeavy,target,threat,defenseTarget:threat.enemy};
    }

    if(state.heavyHeldT>0){
      state.heavyHeldT=Math.max(0,state.heavyHeldT-elapsed);
      if(state.heavyHeldT===0)return{move:{x:0,z:0},action:'heavy-up'};
      return{move:{x:0,z:0},holdingHeavy:true,target};
    }

    if(finite(context.stamina,100)<config.lowStamina&&!activeAttack){
      return{move:{x:0,z:0},resting:true,target};
    }
    const defenseReserve=(kind==='parry'||kind==='existing-dodge')?config.defenseReserve:kind==='shield'?8:0;
    if(!activeAttack&&finite(context.stamina,100)<defenseReserve+config.attackStaminaFloor){
      return{move:{x:0,z:0},resting:true,target};
    }

    if(distance>=band.attackMin&&distance<=band.attackMax&&state.decisionT<=0){
      state.decisionT=config.decisionInterval;
      state.attackCount++;
      if(!activeAttack&&state.attackCount%config.heavyEvery===0){
        state.heavyHeldT=config.heavyHold;
        return{move:{x:0,z:0},action:'heavy-down',target};
      }
      return{move,action:'light',target};
    }
    return{move,target};
  }

  return{update,reset,acknowledgeDefense,snapshot:()=>Object.freeze({...state})};
}
