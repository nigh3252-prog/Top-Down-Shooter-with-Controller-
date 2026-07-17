// Local combat coordinator for the retained/original enemy roster.
//
// Movement and attack execution stay inside arena-enemies-base.js. This module
// replaces the old token/approach/rally director stack with one explicit policy:
// may this enemy begin a windup right now? It also records one truthful blocker
// reason for every enemy that is not attacking.

export const ORIGINAL_BLOCKERS = Object.freeze({
  READY:'READY',
  APPROACHING:'APPROACHING',
  TURNING:'TURNING',
  OUT_OF_RANGE:'OUT_OF_RANGE',
  PHYSICALLY_BLOCKED:'PHYSICALLY_BLOCKED',
  STUNNED:'STUNNED',
  WINDUP:'WINDUP',
  ACTIVE:'ACTIVE',
  RECOVERING:'RECOVERING',
  COOLDOWN:'COOLDOWN',
  COORDINATOR_DENIED:'COORDINATOR_DENIED',
  NO_VALID_ATTACK:'NO_VALID_ATTACK',
  DEAD:'DEAD',
});

const RELENTLESS_MODES = new Set(['avalanche','chaos']);
const SINGLE_MODES = new Set(['oneAttacker','dodgeTraining']);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const live=e=>!!e&&finite(e.hp,0)>0&&e.state!=='dead';
const wrapPi=a=>Math.atan2(Math.sin(a),Math.cos(a));

export function nextAuthoredAttack(enemy){
  if(!enemy) return null;
  if(Array.isArray(enemy.realAttacks)&&enemy.realAttacks.length){
    return enemy.realAttacks[(enemy.combatAttackIndex||0)%enemy.realAttacks.length]||null;
  }
  return enemy.realAtk||enemy.attack||null;
}

export function attackDistance(enemy,player={x:0,z:0}){
  return Math.hypot(finite(player.x)-finite(enemy?.x),finite(player.z)-finite(enemy?.z));
}

export function attackAlignment(enemy,player={x:0,z:0}){
  if(!enemy) return Infinity;
  const desired=Math.atan2(finite(player.x)-finite(enemy.x),finite(player.z)-finite(enemy.z));
  return Math.abs(wrapPi(desired-finite(enemy.facingAngle,desired)));
}

export function classifyOriginalEnemyBlocker(enemy,player={x:0,z:0},{coordinator=null}={}){
  if(!live(enemy)) return ORIGINAL_BLOCKERS.DEAD;
  if(finite(enemy.stunned)>0) return ORIGINAL_BLOCKERS.STUNNED;
  if(enemy.state==='windup') return ORIGINAL_BLOCKERS.WINDUP;
  if(enemy.state==='active') return ORIGINAL_BLOCKERS.ACTIVE;
  if(enemy.state==='recovery') return ORIGINAL_BLOCKERS.RECOVERING;
  if(finite(enemy.cooldown)>0) return ORIGINAL_BLOCKERS.COOLDOWN;

  const attack=nextAuthoredAttack(enemy);
  if(!attack) return ORIGINAL_BLOCKERS.NO_VALID_ATTACK;
  const distance=attackDistance(enemy,player);
  const range=Math.max(.1,finite(attack.range,finite(enemy.holdDist,2.5)));
  if(distance>range+(attack.kind==='ranged'?3.8:.95)){
    return finite(enemy._attackBrainBlockedTime)>0.55
      ? ORIGINAL_BLOCKERS.PHYSICALLY_BLOCKED
      : ORIGINAL_BLOCKERS.APPROACHING;
  }
  if(distance>range+.95) return ORIGINAL_BLOCKERS.OUT_OF_RANGE;
  if(attackAlignment(enemy,player)>Math.PI*.72) return ORIGINAL_BLOCKERS.TURNING;
  if(coordinator&&!coordinator.wouldAllow(enemy,attack)) return ORIGINAL_BLOCKERS.COORDINATOR_DENIED;
  return ORIGINAL_BLOCKERS.READY;
}

export function createOriginalCombatCoordinator(system,{mode='pressureBudget'}={}){
  const legacy=system.director;
  const settings=legacy?.settings||{pressureBudget:3,cycleOnWaveClear:false};
  let currentMode=mode;
  let time=0;
  let nextTokenId=1;
  let lastStartTime=-99;
  const tokens=[];
  const slots=Array.from({length:12},(_,index)=>({
    angle:-Math.PI+index*(Math.PI*2/12),
    radius:4.5,
    enemyId:null,
  }));

  function policy(){
    if(RELENTLESS_MODES.has(currentMode)) return {name:'relentless',cap:Infinity,minGap:0};
    if(SINGLE_MODES.has(currentMode)) return {name:'single',cap:1,minGap:currentMode==='dodgeTraining'?.48:.12};
    const budget=Math.max(1,Math.round(finite(settings.pressureBudget,3)));
    return {name:'coordinated',cap:clamp(budget,1,4),minGap:.12};
  }
  function clean(){
    for(let i=tokens.length-1;i>=0;i--){
      const token=tokens[i];
      if(!live(token.enemy)||token.enemy.token!==token||token.enemy.state==='idle'){
        if(token.enemy?.token===token) token.enemy.token=null;
        tokens.splice(i,1);
      }
    }
  }
  function activeCount(){
    clean();
    return tokens.filter(token=>live(token.enemy)&&token.enemy.state!=='recovery').length;
  }
  function wouldAllow(enemy,attack){
    if(!live(enemy)||!attack||finite(enemy.stunned)>0) return false;
    const p=policy();
    if(p.cap===Infinity) return true;
    if(enemy.token) return true;
    return activeCount()<p.cap&&time-lastStartTime>=p.minGap;
  }
  function setMode(next){
    currentMode=String(next||'pressureBudget');
    reset();
    return currentMode;
  }
  function getMode(){return currentMode;}
  function update(dt,{enemies=system.enemies,player={x:0,z:0}}={}){
    time+=Math.max(0,finite(dt));
    clean();
    const living=enemies.filter(live).sort((a,b)=>a.id-b.id);
    for(let i=0;i<slots.length;i++) slots[i].enemyId=null;
    living.forEach((enemy,index)=>{
      const slot=slots[index%slots.length];
      slot.enemyId=enemy.id;
      const attack=nextAuthoredAttack(enemy);
      slot.radius=Math.max(2.2,finite(attack?.range,finite(enemy.holdDist,3))*.86);
      enemy.slotIndex=index%slots.length;
      enemy.approachPermit=true;
      enemy.approachPermitTime=0;
      enemy.approachCooldown=0;
      enemy.directEngaged=true;
      enemy.directEngageReadyAt=0;
      enemy.directEngageCooldownCap=0;
      enemy.gesture=null;
      enemy.gestureTime=0;
      // Base AI compares angular error in radians against attackAlign.
      enemy.attackAlign=Math.PI;
      enemy.facingBias=0;
      if(RELENTLESS_MODES.has(currentMode)) enemy.cooldown=0;
      if(attack){
        enemy.realAtk=attack;
        const desired=attack.kind==='ranged'
          ? Math.max(2.5,finite(attack.range)*.72)
          : Math.max(1.2,finite(attack.range)*.82);
        enemy.holdDist=desired;
        enemy.stop=desired;
      }
      enemy.attackBlocker=classifyOriginalEnemyBlocker(enemy,player,{coordinator:api});
    });
  }
  function canGrant(enemy,attack){
    const allowed=wouldAllow(enemy,attack);
    if(!allowed&&enemy) enemy.attackBlocker=ORIGINAL_BLOCKERS.COORDINATOR_DENIED;
    return allowed;
  }
  function grant(enemy,attack){
    if(!enemy||!attack) return null;
    release(enemy);
    const token={id:nextTokenId++,enemy,attack,kind:attack.kind||'melee',cost:1,startedAt:time};
    tokens.push(token);
    enemy.token=token;
    enemy.attackBlocker=ORIGINAL_BLOCKERS.WINDUP;
    enemy.attackStarts=(enemy.attackStarts||0)+1;
    enemy.lastAttackStartedAt=time;
    lastStartTime=time;
    return token;
  }
  function release(enemy){
    if(!enemy) return;
    for(let i=tokens.length-1;i>=0;i--){
      if(tokens[i].enemy===enemy) tokens.splice(i,1);
    }
    enemy.token=null;
    enemy.approachPermit=true;
    enemy.directEngaged=true;
  }
  function releaseAll(){
    for(const token of tokens) if(token.enemy?.token===token) token.enemy.token=null;
    tokens.length=0;
  }
  function reset(){
    releaseAll();
    time=0;
    lastStartTime=-99;
  }
  function onWaveClear(){
    reset();
    if(settings.cycleOnWaveClear){
      const modes=['attackChain','dodgeTraining','chaos','oneAttacker','battleCircle','pressureBudget','nearFar','wavePacing','eliteSpotlight','avalanche'];
      const index=Math.max(0,modes.indexOf(currentMode));
      currentMode=modes[(index+1)%modes.length];
    }
    return currentMode;
  }
  function getDebugState(){
    clean();
    return {
      mode:currentMode,
      coordinator:policy().name,
      activeTokens:[...tokens],
      approachers:system.enemies.filter(live),
      slots,
      time,
    };
  }
  function getDiagnostics(player={x:0,z:0}){
    const perEnemy=system.enemies.filter(live).map(enemy=>({
      id:enemy.id,
      kind:enemy.kind,
      state:enemy.state,
      blocker:enemy.attackBlocker||classifyOriginalEnemyBlocker(enemy,player,{coordinator:api}),
      attacks:enemy.attackStarts||0,
      distance:Number(attackDistance(enemy,player).toFixed(2)),
      range:Number(finite(nextAuthoredAttack(enemy)?.range,0).toFixed(2)),
    }));
    const blockers={};
    for(const item of perEnemy) blockers[item.blocker]=(blockers[item.blocker]||0)+1;
    return {mode:currentMode,policy:policy().name,active:activeCount(),blockers,perEnemy};
  }

  const api={
    settings,setMode,getMode,update,canGrant,wouldAllow,grant,release,
    releaseAllForEnemy:release,releaseAll,reset,onWaveClear,getDebugState,getDiagnostics,
    hasApproachPermit:enemy=>live(enemy),
    requestRally:()=>false,
    endRally:()=>{},
    markNearEligible:enemies=>{for(const enemy of enemies||[]) enemy.nearEligible=true;},
    assignBattleCircleSlots:enemies=>{
      (enemies||[]).filter(live).sort((a,b)=>a.id-b.id).forEach((enemy,index)=>{enemy.slotIndex=index%slots.length;});
      return slots;
    },
  };
  return api;
}

function renderOriginalBlockerDiagnostics(system,player,coordinator){
  if(typeof document==='undefined') return;
  const box=document.getElementById('avalancheDiag');
  const pre=box?.querySelector('pre');
  if(!pre||box.hidden) return;
  const diagnostics=coordinator.getDiagnostics(player);
  const marker='--- ORIGINAL ATTACK BRAIN ---';
  const base=String(pre.textContent||'').split(marker)[0].trimEnd();
  const blockers=Object.entries(diagnostics.blockers)
    .sort((a,b)=>b[1]-a[1])
    .map(([name,count])=>`${name.toLowerCase()} ${count}`)
    .join('  ');
  const enemies=diagnostics.perEnemy.slice(0,10)
    .map(item=>`#${item.id} ${item.kind} ${item.blocker} attacks:${item.attacks}`);
  pre.textContent=[base,marker,blockers||'no live original enemies',...enemies].filter(Boolean).join('\n');
}

export function installOriginalEnemyCombatRefactor(system,{navigation=null}={}){
  if(!system||system._originalCombatRefactorInstalled) return system?.attackCoordinator||null;
  system._originalCombatRefactorInstalled=true;
  const baseUpdate=system.update.bind(system);
  const director=system.director;
  const coordinator=createOriginalCombatCoordinator(system,{mode:director?.getMode?.()||'pressureBudget'});
  // arena-enemies-base.js closes over the original director object. Replace its
  // behavior in place so the base state machine calls this coordinator directly.
  for(const method of ['setMode','getMode','update','canGrant','grant','release','releaseAllForEnemy','releaseAll','reset','onWaveClear','getDebugState','hasApproachPermit','requestRally','endRally','markNearEligible','assignBattleCircleSlots']){
    director[method]=coordinator[method];
  }
  director.settings=coordinator.settings;
  system.attackCoordinator=coordinator;
  system.setDirectorMode=mode=>coordinator.setMode(mode);

  system.update=function updateWithOriginalCombatBrain(dt,player={x:0,z:0}){
    const starts=new Map(system.enemies.map(enemy=>[enemy,{x:enemy.x,z:enemy.z,state:enemy.state}]));
    coordinator.update(dt,{enemies:system.enemies,player});
    baseUpdate(dt,player);
    for(const enemy of system.enemies){
      if(!live(enemy)) continue;
      const before=starts.get(enemy);
      const moved=before?Math.hypot(enemy.x-before.x,enemy.z-before.z):0;
      const attack=nextAuthoredAttack(enemy);
      const distance=attackDistance(enemy,player);
      const far=attack&&distance>finite(attack.range,0)+(attack.kind==='ranged'?3.8:.95);
      if(enemy.state==='idle'&&far&&moved<.012) enemy._attackBrainBlockedTime=finite(enemy._attackBrainBlockedTime)+finite(dt);
      else enemy._attackBrainBlockedTime=0;

      if(RELENTLESS_MODES.has(coordinator.getMode())){
        enemy.cooldown=0;
        // The next authored attack owns spacing. This removes the old max-range
        // deadlock where a short attack was selected while the enemy waited at the
        // longest attack's hold distance.
        if(enemy.state==='idle'&&attack){
          const desired=attack.kind==='ranged'
            ? Math.max(2.5,finite(attack.range)*.72)
            : Math.max(1.2,finite(attack.range)*.82);
          enemy.holdDist=desired;
          enemy.stop=desired;
        }
      }
      enemy.attackBlocker=classifyOriginalEnemyBlocker(enemy,player,{coordinator});
    }
    renderOriginalBlockerDiagnostics(system,player,coordinator);
  };

  system.getAttackCoordinatorDiagnostics=(player={x:0,z:0})=>coordinator.getDiagnostics(player);
  return coordinator;
}
