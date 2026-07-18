from pathlib import Path

path = Path('combat-arena.html')
text = path.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one anchor, found {count}')
    text = text.replace(old, new, 1)


def replace_between(start_marker: str, end_marker: str, replacement: str, label: str) -> None:
    global text
    start = text.find(start_marker)
    if start < 0:
        raise RuntimeError(f'{label}: start marker not found')
    end = text.find(end_marker, start)
    if end < 0:
        raise RuntimeError(f'{label}: end marker not found')
    text = text[:start] + replacement + text[end:]


replace_once(
"""const THIRD_PERSON_CAMERA = {
  fov:54, distance:12, lockDistance:13, shoulder:.32, pivotHeight:2.35,
  minPitch:11*Math.PI/180, maxPitch:40*Math.PI/180, startPitch:25*Math.PI/180,
  yawSpeed:2.45, pitchSpeed:1.65, touchYaw:.0062, touchPitch:.0052,
  lookAhead:7, lookHeight:2.05, lockRise:.35,
  collisionPadding:.045, wallHeight:3.2, softAimDegrees:38,
};
""",
"""const THIRD_PERSON_CAMERA = {
  fov:54, distance:14.8, lockDistance:16.2, shoulder:.22, pivotHeight:2.75,
  minPitch:12*Math.PI/180, maxPitch:43*Math.PI/180, startPitch:28*Math.PI/180,
  yawSpeed:2.45, pitchSpeed:1.65, touchYaw:.0062, touchPitch:.0052,
  lookAhead:10.5, lookHeight:3.15, lockRise:.55,
  landscapeDistance:1.2, landscapeLookAhead:1.3, landscapeLookLift:.75,
  collisionPadding:.045, wallHeight:3.2, softAimDegrees:38,
};
const THIRD_PERSON_LOCOMOTION = {
  combatMemory:1.25, retreatHold:.42,
  forwardArc:55*Math.PI/180, backwardArc:125*Math.PI/180,
  inputSmoothing:13, freeTurnRate:6.5, preserveTurnRate:9.5, combatTurnRate:12.5,
  cameraRecenterRate:1.45, cameraManualDelay:1.1,
  backpedalSpeed:.72, strafeSpeed:.86,
};
""",
'camera and locomotion constants')

replace_once(
"""const cameraRig = {
  yaw:Math.PI, pitch:THIRD_PERSON_CAMERA.startPitch,
  currentPosition:new THREE.Vector3(startPoint.x, THIRD_PERSON_CAMERA.pivotHeight + 2.2, startPoint.z + THIRD_PERSON_CAMERA.distance),
  lockTarget:null, lockOccludedT:0, switchReady:true,
};
""",
"""const cameraRig = {
  yaw:Math.PI, pitch:THIRD_PERSON_CAMERA.startPitch,
  currentPosition:new THREE.Vector3(startPoint.x, THIRD_PERSON_CAMERA.pivotHeight + 2.2, startPoint.z + THIRD_PERSON_CAMERA.distance),
  lockTarget:null, lockOccludedT:0, switchReady:true, manualT:0,
};
""",
'camera rig manual timer')

replace_once(
"""  cameraRig.yaw = Math.atan2(dir.x, dir.z);
  cameraRig.pitch = THIRD_PERSON_CAMERA.startPitch;
  const f = cameraForwardFlat();
  cameraRig.currentPosition.set(
    actorPos.x - f.x * THIRD_PERSON_CAMERA.distance,
    THIRD_PERSON_CAMERA.pivotHeight + Math.sin(cameraRig.pitch) * THIRD_PERSON_CAMERA.distance,
    actorPos.y - f.z * THIRD_PERSON_CAMERA.distance,
  );
""",
"""  cameraRig.yaw = Math.atan2(dir.x, dir.z);
  cameraRig.pitch = THIRD_PERSON_CAMERA.startPitch;
  cameraRig.manualT = 0;
  const f = cameraForwardFlat();
  const landscapeMix = clamp((camera.aspect - 1.25) / .75, 0, 1);
  const distance = THIRD_PERSON_CAMERA.distance + landscapeMix * THIRD_PERSON_CAMERA.landscapeDistance;
  cameraRig.currentPosition.set(
    actorPos.x - f.x * distance,
    THIRD_PERSON_CAMERA.pivotHeight + Math.sin(cameraRig.pitch) * distance,
    actorPos.y - f.z * distance,
  );
""",
'camera reset framing')

replace_once(
"""  combatInputMode:getCombatInputMode(StoneSettings.get('arena.combatInputMode', DEFAULT_COMBAT_INPUT_MODE)).id,
  stamina:{ v:STAMINA.start, pending:0, recoverDelayT:0 },
""",
"""  combatInputMode:getCombatInputMode(StoneSettings.get('arena.combatInputMode', DEFAULT_COMBAT_INPUT_MODE)).id,
  stamina:{ v:STAMINA.start, pending:0, recoverDelayT:0 },
  locomotion:{ combatT:0, retreatT:0, mode:'free', moveX:0, moveZ:0,
    softTarget:null, combatReady:false, preserveFacing:false },
""",
'locomotion state')

replace_once(
"""    onAttackStart(info){
      const queuedInput = arena.chain.pendingInput;
""",
"""    onAttackStart(info){
      markCombatReady();
      const queuedInput = arena.chain.pendingInput;
""",
'attack combat memory')

replace_once(
"""    document.getElementById('lockBtn')?.classList.add('locked');
    announce('TARGET LOCK', .65);
""",
"""    document.getElementById('lockBtn')?.classList.add('locked');
    markCombatReady(2);
    announce('TARGET LOCK', .65);
""",
'lock combat memory')

locomotion_functions = r'''function markCombatReady(seconds=THIRD_PERSON_LOCOMOTION.combatMemory){
  arena.locomotion.combatT=Math.max(arena.locomotion.combatT,seconds);
}
function updateLocomotionState(dt){
  const l=arena.locomotion;
  l.combatT=Math.max(0,l.combatT-dt);
  const inputMix=1-Math.exp(-dt*THIRD_PERSON_LOCOMOTION.inputSmoothing);
  l.moveX=lerp(l.moveX,input.mx,inputMix);
  l.moveZ=lerp(l.moveZ,input.mz,inputMix);
  if(Math.hypot(input.mx,input.mz)<.03){
    l.moveX=lerp(l.moveX,0,inputMix);
    l.moveZ=lerp(l.moveZ,0,inputMix);
  }
  const moveMag=Math.hypot(l.moveX,l.moveZ);
  const locked=visibleTarget(cameraRig.lockTarget);
  const soft=softAimTarget();
  l.softTarget=soft;
  l.combatReady=locked || l.combatT>0 || !!combatState.attack || arena.charge.active || !!soft;
  if(moveMag<.12){
    l.retreatT=0;
    l.preserveFacing=l.combatReady;
    l.mode=locked?'locked':l.combatReady?'combat':'idle';
    return;
  }
  const moveAngle=Math.atan2(l.moveX,l.moveZ);
  const relative=Math.abs(wrapPi(moveAngle-actorFacing));
  if(relative>THIRD_PERSON_LOCOMOTION.backwardArc) l.retreatT+=dt;
  else l.retreatT=0;
  if(l.combatReady){
    l.preserveFacing=true;
    l.mode=locked?'locked':relative>THIRD_PERSON_LOCOMOTION.backwardArc?'retreat':relative>THIRD_PERSON_LOCOMOTION.forwardArc?'strafe':'advance';
  } else if(relative>THIRD_PERSON_LOCOMOTION.backwardArc && l.retreatT<THIRD_PERSON_LOCOMOTION.retreatHold){
    l.preserveFacing=true;
    l.mode='retreat';
  } else if(relative>THIRD_PERSON_LOCOMOTION.forwardArc && relative<=THIRD_PERSON_LOCOMOTION.backwardArc){
    l.preserveFacing=true;
    l.mode='strafe';
  } else {
    l.preserveFacing=false;
    l.mode='run';
  }
}
function locomotionSpeedScale(){
  const l=arena.locomotion;
  const mag=Math.hypot(l.moveX,l.moveZ);
  if(mag<.08 || !l.preserveFacing) return 1;
  const fx=Math.sin(actorFacing),fz=Math.cos(actorFacing);
  const dot=(l.moveX*fx+l.moveZ*fz)/mag;
  if(dot<-.2) return THIRD_PERSON_LOCOMOTION.backpedalSpeed;
  if(Math.abs(dot)<.62) return THIRD_PERSON_LOCOMOTION.strafeSpeed;
  return 1;
}
'''

replace_between(
"function resolveDesiredFacing({ forAttack=false }={}){",
"function attackCommitWeight(){",
locomotion_functions + r'''function resolveDesiredFacing({ forAttack=false }={}){
  const locked=cameraRig.lockTarget;
  if(visibleTarget(locked)) return { angle:Math.atan2(locked.x-actorPos.x,locked.z-actorPos.y), source:'lock' };
  if(forAttack){
    const target=softAimTarget();
    if(target) return { angle:Math.atan2(target.x-actorPos.x,target.z-actorPos.y), source:'soft' };
    return { angle:cameraRig.yaw, source:'camera' };
  }
  const l=arena.locomotion;
  if(l.combatReady){
    const target=visibleTarget(l.softTarget,SOFT_AIM_RANGE) ? l.softTarget : null;
    if(target) return { angle:Math.atan2(target.x-actorPos.x,target.z-actorPos.y), source:'combat-target' };
    return { angle:cameraRig.yaw, source:'combat-camera' };
  }
  if(Math.hypot(l.moveX,l.moveZ)>.15){
    if(l.preserveFacing) return { angle:actorFacing, source:l.mode };
    return { angle:Math.atan2(l.moveX,l.moveZ), source:'run' };
  }
  return { angle:actorFacing, source:'idle' };
}
function attackCommitWeight(){''',
'facing and locomotion logic')

replace_once(
"""  d.t = 0; d.dirX = dir.x; d.dirZ = dir.z; d.cool = DODGE_COOL;
  arena.invulnT = Math.max(arena.invulnT, DODGE_IFRAMES);
""",
"""  if(cameraRig.lockTarget || softAimTarget()) markCombatReady(.9);
  d.t = 0; d.dirX = dir.x; d.dirZ = dir.z; d.cool = DODGE_COOL;
  arena.invulnT = Math.max(arena.invulnT, DODGE_IFRAMES);
""",
'dodge combat memory')

replace_once(
"""  actorPos.set(startPoint.x, startPoint.z); actorFacing = Math.PI; actorYawCurrent = actorFacing;
  clearLockTarget(); resetThirdPersonCamera({ x:0, z:-1 });
""",
"""  actorPos.set(startPoint.x, startPoint.z); actorFacing = Math.PI; actorYawCurrent = actorFacing;
  Object.assign(arena.locomotion,{ combatT:0,retreatT:0,mode:'free',moveX:0,moveZ:0,softTarget:null,combatReady:false,preserveFacing:false });
  clearLockTarget(); resetThirdPersonCamera({ x:0, z:-1 });
""",
'respawn locomotion reset')

replace_once(
"""  if(hp < arena.prevHp && arena.deadT < 0){
    wipeRecoverableStamina();
""",
"""  if(hp < arena.prevHp && arena.deadT < 0){
    markCombatReady();
    wipeRecoverableStamina();
""",
'damage combat memory')

replace_once(
"""    if(!cameraRig.lockTarget) cameraRig.yaw=wrapPi(cameraRig.yaw-dx*THIRD_PERSON_CAMERA.touchYaw);
    cameraRig.pitch=clamp(cameraRig.pitch-dy*THIRD_PERSON_CAMERA.touchPitch,THIRD_PERSON_CAMERA.minPitch,THIRD_PERSON_CAMERA.maxPitch);
""",
"""    cameraRig.manualT=THIRD_PERSON_LOCOMOTION.cameraManualDelay;
    if(!cameraRig.lockTarget) cameraRig.yaw=wrapPi(cameraRig.yaw-dx*THIRD_PERSON_CAMERA.touchYaw);
    cameraRig.pitch=clamp(cameraRig.pitch-dy*THIRD_PERSON_CAMERA.touchPitch,THIRD_PERSON_CAMERA.minPitch,THIRD_PERSON_CAMERA.maxPitch);
""",
'touch camera override')

replace_once(
"""  if(cameraRig.lockTarget){
    const desiredYaw=Math.atan2(cameraRig.lockTarget.x-actorPos.x,cameraRig.lockTarget.z-actorPos.y);
    cameraRig.yaw=lerpAngle(cameraRig.yaw,desiredYaw,1-Math.exp(-rawDt*9));
  } else {
    cameraRig.yaw=wrapPi(cameraRig.yaw-padLook.x*THIRD_PERSON_CAMERA.yawSpeed*rawDt);
  }
""",
"""  cameraRig.manualT=Math.max(0,cameraRig.manualT-rawDt);
  if(cameraRig.lockTarget){
    const desiredYaw=Math.atan2(cameraRig.lockTarget.x-actorPos.x,cameraRig.lockTarget.z-actorPos.y);
    cameraRig.yaw=lerpAngle(cameraRig.yaw,desiredYaw,1-Math.exp(-rawDt*9));
  } else {
    if(Math.abs(padLook.x)>.08 || Math.abs(padLook.y)>.08) cameraRig.manualT=THIRD_PERSON_LOCOMOTION.cameraManualDelay;
    cameraRig.yaw=wrapPi(cameraRig.yaw-padLook.x*THIRD_PERSON_CAMERA.yawSpeed*rawDt);
    const l=arena.locomotion;
    if(cameraRig.manualT<=0 && l.mode==='run' && !l.combatReady && Math.hypot(l.moveX,l.moveZ)>.2){
      cameraRig.yaw=lerpAngle(cameraRig.yaw,actorFacing,1-Math.exp(-rawDt*THIRD_PERSON_LOCOMOTION.cameraRecenterRate));
    }
  }
""",
'camera recenter policy')

replace_once(
"""  const f=cameraForwardFlat(),r=cameraRightFlat();
  const pivot=scratchCamera.pivot.set(actorPos.x,THIRD_PERSON_CAMERA.pivotHeight,actorPos.y);
  const cameraDistance=cameraRig.lockTarget ? THIRD_PERSON_CAMERA.lockDistance : THIRD_PERSON_CAMERA.distance;
""",
"""  const f=cameraForwardFlat(),r=cameraRightFlat();
  const landscapeMix=clamp((camera.aspect-1.25)/.75,0,1);
  const pivot=scratchCamera.pivot.set(actorPos.x,THIRD_PERSON_CAMERA.pivotHeight,actorPos.y);
  const cameraDistance=(cameraRig.lockTarget ? THIRD_PERSON_CAMERA.lockDistance : THIRD_PERSON_CAMERA.distance)
    + landscapeMix*THIRD_PERSON_CAMERA.landscapeDistance;
  const lookAhead=THIRD_PERSON_CAMERA.lookAhead+landscapeMix*THIRD_PERSON_CAMERA.landscapeLookAhead;
  const lookHeight=THIRD_PERSON_CAMERA.lookHeight+landscapeMix*THIRD_PERSON_CAMERA.landscapeLookLift;
""",
'landscape camera composition')

replace_once(
"""      lerp(actorPos.x,target.x,.46),
      lerp(THIRD_PERSON_CAMERA.lookHeight,enemyTargetHeight(target),.28),
      lerp(actorPos.y,target.z,.46),
""",
"""      lerp(actorPos.x,target.x,.50),
      lerp(lookHeight,enemyTargetHeight(target),.30),
      lerp(actorPos.y,target.z,.50),
""",
'lock look target')

replace_once(
"""      actorPos.x+f.x*THIRD_PERSON_CAMERA.lookAhead,
      THIRD_PERSON_CAMERA.lookHeight,
      actorPos.y+f.z*THIRD_PERSON_CAMERA.lookAhead,
""",
"""      actorPos.x+f.x*lookAhead,
      lookHeight,
      actorPos.y+f.z*lookAhead,
""",
'free look target')

replace_once(
"""  updateChainTimers(dt);
  updateStamina(dt);

  let spd = PLAYER_SPEED;
""",
"""  updateChainTimers(dt);
  updateStamina(dt);
  updateLocomotionState(dt);

  let spd = PLAYER_SPEED * locomotionSpeedScale();
""",
'locomotion state update')

replace_once(
"""  const isMoving = Math.hypot(input.mx, input.mz) > .01;
""",
"""  const move=arena.locomotion;
  const isMoving = Math.hypot(move.moveX, move.moveZ) > .01;
""",
'smoothed movement state')

replace_once(
"""  } else if(isMoving){
    actorPos.x += input.mx*spd*dt; actorPos.y += input.mz*spd*dt;
    walkPhase += dt*8;
  }
""",
"""  } else if(isMoving){
    actorPos.x += move.moveX*spd*dt; actorPos.y += move.moveZ*spd*dt;
    walkPhase += dt*8;
  }
""",
'smoothed movement application')

replace_once(
"""  let goal;
  if(d.t >= 0) goal = Math.atan2(d.dirX, d.dirZ);
  else {
    const desired = resolveDesiredFacing({ forAttack:false });
    goal = combatState.attack
      ? lerpAngle(desired.angle, combatState.commitYaw ?? desired.angle, attackCommitWeight())
      : desired.angle;
  }
  actorFacing = wrapPi(actorFacing + wrapPi(goal - actorFacing)*Math.min(1, dt*12));
  const turnMix = 1 - Math.pow(0.0001, dt);
""",
"""  let goal;
  if(d.t >= 0 && !arena.locomotion.combatReady) goal = Math.atan2(d.dirX, d.dirZ);
  else {
    const desired = resolveDesiredFacing({ forAttack:false });
    goal = combatState.attack
      ? lerpAngle(desired.angle, combatState.commitYaw ?? desired.angle, attackCommitWeight())
      : desired.angle;
  }
  const turnRate=combatState.attack || arena.locomotion.combatReady
    ? THIRD_PERSON_LOCOMOTION.combatTurnRate
    : arena.locomotion.preserveFacing
      ? THIRD_PERSON_LOCOMOTION.preserveTurnRate
      : THIRD_PERSON_LOCOMOTION.freeTurnRate;
  actorFacing = wrapPi(actorFacing + wrapPi(goal - actorFacing)*(1-Math.exp(-dt*turnRate)));
  const turnMix = 1-Math.exp(-dt*(arena.locomotion.combatReady?18:12));
""",
'facing turn behavior')

path.write_text(text, encoding='utf-8')
print('Applied researched third-person locomotion and landscape camera pass')
# Triggered after the workflow file was present so GitHub Actions sees the push.
