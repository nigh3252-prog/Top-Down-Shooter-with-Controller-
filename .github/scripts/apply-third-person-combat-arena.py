from pathlib import Path

path = Path("combat-arena.html")
text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one anchor, found {count}")
    text = text.replace(old, new, 1)


def replace_between(start_marker: str, end_marker: str, replacement: str, label: str) -> None:
    global text
    start = text.find(start_marker)
    if start < 0:
        raise RuntimeError(f"{label}: start marker not found")
    end = text.find(end_marker, start)
    if end < 0:
        raise RuntimeError(f"{label}: end marker not found")
    text = text[:start] + replacement + text[end:]


replace_once(
    "  #heavyBtn .btnArrow{color:#cdb6ff}\n",
    """  #heavyBtn .btnArrow{color:#cdb6ff}
  #lockBtn{border-color:#3e6478;color:#a8dcff}
  #lockBtn.locked{border-color:#e8a04c;color:#fff0c8;background:rgba(110,58,36,.82)}
  #lockBtn .btnArrow{font-size:20px;color:inherit}
  #lockReticle{position:fixed;left:50%;top:50%;width:34px;height:34px;z-index:12;display:none;
    pointer-events:none;transform:translate(-50%,-50%);border:2px solid rgba(255,232,174,.95);
    border-radius:50%;box-sizing:border-box;filter:drop-shadow(0 2px 3px rgba(0,0,0,.9))}
  #lockReticle::before,#lockReticle::after{content:\"\";position:absolute;background:rgba(255,232,174,.95)}
  #lockReticle::before{left:50%;top:-7px;width:2px;height:46px;transform:translateX(-50%)}
  #lockReticle::after{top:50%;left:-7px;height:2px;width:46px;transform:translateY(-50%)}
""",
    "third-person UI styles",
)

replace_once(
    '<div id="vig"></div>\n',
    '<div id="vig"></div>\n<div id="lockReticle" aria-hidden="true"></div>\n',
    "lock reticle markup",
)

replace_once(
    '<div class="btnrow">\n  <button class="pbtn" id="atkBtn" aria-label="Light attack">',
    '''<div class="btnrow">
  <button class="pbtn" id="lockBtn" aria-label="Lock target or recenter camera">
    <span class="btnGlyph">R3</span><span class="btnArrow">◎</span>
  </button>
  <button class="pbtn" id="atkBtn" aria-label="Light attack">''',
    "lock button markup",
)

replace_once(
    '<div id="hint">stick/WASD move · LIGHT [J/Square/RT] · HEAVY hold [L/Triangle] · DODGE [K/Cross/LT] · LB/RB or Q/E play card · Circle/R shuffle · X weapon · M menu</div>',
    '<div id="hint">left stick/WASD move · right stick/right-side drag camera · R3/F lock or reset · LIGHT [J/Square/RT] · HEAVY [L/Triangle] · DODGE [K/Cross/LT] · LB/RB cards</div>',
    "control hint",
)

replace_once(
    '<div class="sgHint">Clear the sealed room, reopen its doors, and explore the braided dungeon.</div>',
    '<div class="sgHint">Third-person combat test: left stick moves, right stick controls the camera, and R3 locks a target or recenters behind you.</div>',
    "start gate hint",
)

replace_once(
    "const AUTO_FACE_RANGE = 14;\n",
    """const SOFT_AIM_RANGE = 14;
const LOCK_RANGE = 28;
const THIRD_PERSON_CAMERA = {
  fov:58, distance:7.2, shoulder:.58, pivotHeight:1.82,
  minPitch:.06, maxPitch:.58, startPitch:.28,
  yawSpeed:2.45, pitchSpeed:1.65, touchYaw:.0062, touchPitch:.0052,
  collisionPadding:.055, softAimDegrees:38,
};
""",
    "third-person constants",
)

replace_once(
    "const CAM_HEIGHT = 20, CAM_BACK = 17.6;\n",
    "",
    "remove overhead camera constants",
)

replace_once(
    "const camera = new THREE.PerspectiveCamera(40, innerWidth/innerHeight, .5, 220);",
    "const camera = new THREE.PerspectiveCamera(THIRD_PERSON_CAMERA.fov, innerWidth/innerHeight, .12, 220);",
    "camera lens",
)

replace_once(
    "const Y_AXIS = new THREE.Vector3(0,1,0);\n",
    """const Y_AXIS = new THREE.Vector3(0,1,0);
const cameraRig = {
  yaw:Math.PI, pitch:THIRD_PERSON_CAMERA.startPitch,
  currentPosition:new THREE.Vector3(startPoint.x, THIRD_PERSON_CAMERA.pivotHeight + 2.2, startPoint.z + THIRD_PERSON_CAMERA.distance),
  lockTarget:null, lockOccludedT:0, switchReady:true,
};
const padLook = { x:0, y:0 };
const scratchCamera = {
  pivot:new THREE.Vector3(), desired:new THREE.Vector3(), corrected:new THREE.Vector3(), lookAt:new THREE.Vector3(),
  project:new THREE.Vector3(),
};

function cameraForwardFlat(){ return { x:Math.sin(cameraRig.yaw), z:Math.cos(cameraRig.yaw) }; }
function cameraRightFlat(){ return { x:Math.cos(cameraRig.yaw), z:-Math.sin(cameraRig.yaw) }; }
function enemyTargetHeight(enemy){
  const scale = enemySystem?.heightScale || 1;
  return (enemy?.targetYOffset || 0) + Math.max(.75, (enemy?.height || (enemy?.radius || 1) * 2) * scale * .58);
}
function enemyStillActive(enemy){ return !!enemy && enemySystem?.enemies?.includes(enemy); }
function clearLockTarget(){
  cameraRig.lockTarget = null;
  cameraRig.lockOccludedT = 0;
  document.getElementById('lockBtn')?.classList.remove('locked');
  const reticle = document.getElementById('lockReticle');
  if(reticle) reticle.style.display = 'none';
}
function resetThirdPersonCamera(forward = null){
  const dir = forward && Math.hypot(forward.x || 0, forward.z || 0) > .01
    ? norm2(forward.x, forward.z)
    : { x:Math.sin(actorFacing), z:Math.cos(actorFacing) };
  cameraRig.yaw = Math.atan2(dir.x, dir.z);
  cameraRig.pitch = THIRD_PERSON_CAMERA.startPitch;
  const f = cameraForwardFlat();
  cameraRig.currentPosition.set(
    actorPos.x - f.x * THIRD_PERSON_CAMERA.distance,
    THIRD_PERSON_CAMERA.pivotHeight + Math.sin(cameraRig.pitch) * THIRD_PERSON_CAMERA.distance,
    actorPos.y - f.z * THIRD_PERSON_CAMERA.distance,
  );
}
""",
    "camera rig state",
)

replace_once(
    "    resolveAttackFacing(){ return resolveDesiredFacing(); },",
    "    resolveAttackFacing(){ return resolveDesiredFacing({ forAttack:true }); },",
    "attack facing hook",
)

replace_once(
    "    camFollow.set(actorPos.x, 0, actorPos.y);",
    "    clearLockTarget();\n    resetThirdPersonCamera(payload.direction);",
    "room transition camera reset",
)

replace_once(
    "  arena.dodge.t = -1;\n  transitionTitle.textContent",
    "  arena.dodge.t = -1;\n  clearLockTarget();\n  transitionTitle.textContent",
    "transition lock clear",
)

facing_block = r'''/* ---------- facing + third-person targeting ---------- */
function nearestEnemy(maxDist=Infinity){
  let best=null, bd=maxDist;
  for(const e of enemySystem.enemies){
    const d = Math.hypot(e.x-actorPos.x, e.z-actorPos.y);
    if(d<bd && !mazeNavigation.raycastWalls({ x:actorPos.x, z:actorPos.y }, { x:e.x, z:e.z })){
      bd=d; best=e;
    }
  }
  return best;
}
function visibleTarget(enemy, maxDist=LOCK_RANGE){
  if(!enemyStillActive(enemy)) return false;
  const d = Math.hypot(enemy.x-actorPos.x, enemy.z-actorPos.y);
  return d <= maxDist && !mazeNavigation.raycastWalls({ x:actorPos.x, z:actorPos.y }, { x:enemy.x, z:enemy.z });
}
function bestLockTarget(){
  const f = cameraForwardFlat();
  let best=null, bestScore=Infinity;
  for(const enemy of enemySystem.enemies){
    const dx=enemy.x-actorPos.x, dz=enemy.z-actorPos.y, d=Math.hypot(dx,dz);
    if(d <= .01 || d > LOCK_RANGE || mazeNavigation.raycastWalls({ x:actorPos.x, z:actorPos.y }, { x:enemy.x, z:enemy.z })) continue;
    const dot=(dx*f.x+dz*f.z)/d;
    if(dot < .12) continue;
    const score=(1-dot)*11 + d/LOCK_RANGE;
    if(score<bestScore){ best=enemy; bestScore=score; }
  }
  return best;
}
function toggleLock(){
  if(cameraRig.lockTarget){
    clearLockTarget();
    announce('TARGET RELEASED', .65);
    return;
  }
  const target=bestLockTarget();
  if(target){
    cameraRig.lockTarget=target;
    cameraRig.lockOccludedT=0;
    document.getElementById('lockBtn')?.classList.add('locked');
    announce('TARGET LOCK', .65);
  } else {
    resetThirdPersonCamera();
    announce('CAMERA RESET', .65);
  }
}
function switchLockTarget(direction){
  const current=cameraRig.lockTarget;
  if(!enemyStillActive(current)) return toggleLock();
  const currentAngle=Math.atan2(current.x-actorPos.x,current.z-actorPos.y);
  let best=null, bestDelta=Infinity;
  for(const enemy of enemySystem.enemies){
    if(enemy===current || !visibleTarget(enemy)) continue;
    const angle=Math.atan2(enemy.x-actorPos.x,enemy.z-actorPos.y);
    const delta=wrapPi(angle-currentAngle);
    if(Math.sign(delta)!==Math.sign(direction) || Math.abs(delta)<.035) continue;
    const score=Math.abs(delta)+Math.hypot(enemy.x-actorPos.x,enemy.z-actorPos.y)*.006;
    if(score<bestDelta){ best=enemy; bestDelta=score; }
  }
  if(best){ cameraRig.lockTarget=best; cameraRig.lockOccludedT=0; }
}
function softAimTarget(){
  if(visibleTarget(cameraRig.lockTarget)) return cameraRig.lockTarget;
  const f=cameraForwardFlat();
  const minDot=Math.cos(THIRD_PERSON_CAMERA.softAimDegrees*Math.PI/180);
  let best=null,bestScore=Infinity;
  for(const enemy of enemySystem.enemies){
    const dx=enemy.x-actorPos.x,dz=enemy.z-actorPos.y,d=Math.hypot(dx,dz);
    if(d<=.01 || d>SOFT_AIM_RANGE || mazeNavigation.raycastWalls({x:actorPos.x,z:actorPos.y},{x:enemy.x,z:enemy.z})) continue;
    const dot=(dx*f.x+dz*f.z)/d;
    if(dot<minDot) continue;
    const score=(1-dot)*9+d/SOFT_AIM_RANGE*.35;
    if(score<bestScore){best=enemy;bestScore=score;}
  }
  return best;
}
function resolveDesiredFacing({ forAttack=false }={}){
  const locked=cameraRig.lockTarget;
  if(visibleTarget(locked)) return { angle:Math.atan2(locked.x-actorPos.x,locked.z-actorPos.y), source:'lock' };
  if(forAttack){
    const target=softAimTarget();
    if(target) return { angle:Math.atan2(target.x-actorPos.x,target.z-actorPos.y), source:'soft' };
    return { angle:cameraRig.yaw, source:'camera' };
  }
  if(Math.hypot(input.mx,input.mz)>.15) return { angle:Math.atan2(input.mx,input.mz), source:'move' };
  return { angle:actorFacing, source:'idle' };
}
'''
replace_between(
    "/* ---------- facing ---------- */",
    "function attackCommitWeight(){",
    facing_block + "function attackCommitWeight(){",
    "facing and targeting section",
)

replace_once(
    """  else {
    const threat = nearestEnemy();
    dir = threat ? norm2(actorPos.x-threat.x, actorPos.y-threat.z)
                 : norm2(Math.sin(actorFacing+Math.PI), Math.cos(actorFacing+Math.PI));
  }
""",
    """  else {
    const target = visibleTarget(cameraRig.lockTarget) ? cameraRig.lockTarget : null;
    dir = target ? norm2(actorPos.x-target.x, actorPos.y-target.z)
                 : norm2(-Math.sin(actorFacing), -Math.cos(actorFacing));
  }
""",
    "neutral dodge direction",
)

replace_once(
    "  actorPos.set(startPoint.x, startPoint.z); actorFacing = 0;",
    "  actorPos.set(startPoint.x, startPoint.z); actorFacing = Math.PI; actorYawCurrent = actorFacing;\n  clearLockTarget(); resetThirdPersonCamera({ x:0, z:-1 });",
    "respawn camera reset",
)

replace_once(
    "  if(e.key==='k') triggerDodge();\n",
    "  if(e.key==='k') triggerDodge();\n  if(e.key.toLowerCase()==='f') toggleLock();\n  if(e.key.toLowerCase()==='c') { clearLockTarget(); resetThirdPersonCamera(); announce('CAMERA RESET', .65); }\n",
    "keyboard camera controls",
)

touch_block = r'''/* touch controls: left-side movement + right-side camera drag */
const joy = { id:null, sx:0, sy:0, x:0, z:0 };
const lookTouch = { id:null, x:0, y:0 };
const joyBase=document.getElementById('joyBase'), joyKnob=document.getElementById('joyKnob');
addEventListener('pointerdown', e=>{
  if(e.target.closest('button')||e.target.closest('#panel')) return;
  if(e.clientX <= innerWidth*.55 && joy.id===null){
    joy.id=e.pointerId; joy.sx=e.clientX; joy.sy=e.clientY;
    joyBase.style.display='block';
    joyBase.style.left=(e.clientX-52)+'px'; joyBase.style.top=(e.clientY-52)+'px';
    joyKnob.style.display='block';
    joyKnob.style.left=(e.clientX-23)+'px'; joyKnob.style.top=(e.clientY-23)+'px';
  } else if(lookTouch.id===null){
    lookTouch.id=e.pointerId; lookTouch.x=e.clientX; lookTouch.y=e.clientY;
  }
});
addEventListener('pointermove', e=>{
  if(e.pointerId===joy.id){
    let dx=e.clientX-joy.sx, dy=e.clientY-joy.sy;
    const l=Math.hypot(dx,dy), max=52;
    if(l>max){ dx*=max/l; dy*=max/l; }
    joy.x=dx/max; joy.z=dy/max;
    joyKnob.style.left=(joy.sx+dx-23)+'px'; joyKnob.style.top=(joy.sy+dy-23)+'px';
  } else if(e.pointerId===lookTouch.id){
    const dx=e.clientX-lookTouch.x, dy=e.clientY-lookTouch.y;
    lookTouch.x=e.clientX; lookTouch.y=e.clientY;
    if(!cameraRig.lockTarget) cameraRig.yaw=wrapPi(cameraRig.yaw-dx*THIRD_PERSON_CAMERA.touchYaw);
    cameraRig.pitch=clamp(cameraRig.pitch-dy*THIRD_PERSON_CAMERA.touchPitch,THIRD_PERSON_CAMERA.minPitch,THIRD_PERSON_CAMERA.maxPitch);
  }
});
function endPointer(e){
  if(e.pointerId===joy.id){
    joy.id=null; joy.x=0; joy.z=0;
    joyBase.style.display='none'; joyKnob.style.display='none';
  }
  if(e.pointerId===lookTouch.id) lookTouch.id=null;
}
addEventListener('pointerup', endPointer);
addEventListener('pointercancel', endPointer);
'''
replace_between(
    "/* touch joystick: left half of screen */",
    "/* touch buttons */",
    touch_block + "/* touch buttons */",
    "touch movement and camera",
)

replace_once(
    "const atkBtn=document.getElementById('atkBtn'), heavyBtn=document.getElementById('heavyBtn');",
    "const atkBtn=document.getElementById('atkBtn'), heavyBtn=document.getElementById('heavyBtn'), lockBtn=document.getElementById('lockBtn');\nlockBtn.addEventListener('pointerdown', e=>{ e.preventDefault(); toggleLock(); });",
    "touch lock button",
)

gamepad_block = r'''/* gamepad */
const padPrev = {};
const padMove = { x:0, z:0 };
function pollPad(){
  const gp = navigator.getGamepads?.()[0];
  if(!gp) return;
  const bd = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
  const dz = v => Math.abs(v)>.16?v:0;
  let mx = dz(gp.axes[0]||0), mz = dz(gp.axes[1]||0);
  padLook.x = dz(gp.axes[2]||0); padLook.y = dz(gp.axes[3]||0);
  // D-pad left/right remain movement; up/down are reserved for weapon testing.
  if(bd(14))mx-=1; if(bd(15))mx+=1;
  const l=Math.hypot(mx,mz);
  if(l>1){mx/=l;mz/=l;}
  padMove.x=mx; padMove.z=mz;
  const light = bd(2)||bd(7);
  const heavy = bd(3);
  const shuffle = bd(1);
  const dge = bd(0)||bd(6);
  const lb = bd(4), rb = bd(5);
  const strt = bd(9), sel = bd(8), r3 = bd(11);
  const weaponPrev = bd(12), weaponNext = bd(13);
  if(light && !padPrev.light) lightDown();
  if(heavy && !padPrev.heavy) heavyDown();
  if(!heavy && padPrev.heavy) heavyUp();
  if(dge && !padPrev.dge) triggerDodge();
  if(shuffle && !padPrev.shuffle) startDeckShuffle();
  if(lb && !padPrev.lb) playCard(0);
  if(rb && !padPrev.rb) playCard(1);
  if(r3 && !padPrev.r3) toggleLock();
  if(weaponPrev && !padPrev.weaponPrev) cycleWeapon(-1);
  if(weaponNext && !padPrev.weaponNext) cycleWeapon(1);
  if(strt && !padPrev.strt) toggleMenu();
  if(sel && !padPrev.sel) toggleMenu();
  if(cameraRig.lockTarget){
    if(Math.abs(padLook.x)<.42) cameraRig.switchReady=true;
    else if(cameraRig.switchReady && Math.abs(padLook.x)>.78){
      switchLockTarget(Math.sign(padLook.x));
      cameraRig.switchReady=false;
    }
  }
  padPrev.light=light; padPrev.heavy=heavy; padPrev.shuffle=shuffle; padPrev.dge=dge; padPrev.lb=lb; padPrev.rb=rb; padPrev.r3=r3;
  padPrev.strt=strt; padPrev.sel=sel; padPrev.weaponPrev=weaponPrev; padPrev.weaponNext=weaponNext;
}
function gatherInput(){
  const k = keyMove();
  const pm = Math.hypot(padMove.x,padMove.z);
  const jm = Math.hypot(joy.x,joy.z);
  const raw = pm>.08 ? padMove : jm>.08 ? joy : k;
  const f=cameraForwardFlat(), r=cameraRightFlat();
  const forwardAmount=-raw.z;
  input.mx=r.x*raw.x+f.x*forwardAmount;
  input.mz=r.z*raw.x+f.z*forwardAmount;
  const len=Math.hypot(input.mx,input.mz);
  if(len>1){input.mx/=len;input.mz/=len;}
}

'''
replace_between(
    "/* gamepad */",
    "/* ---------- UI ---------- */",
    gamepad_block + "/* ---------- UI ---------- */",
    "gamepad and camera-relative movement",
)

camera_block = r'''/* ---------- third-person camera ---------- */
function validateCameraLock(rawDt){
  const target=cameraRig.lockTarget;
  if(!enemyStillActive(target) || Math.hypot(target.x-actorPos.x,target.z-actorPos.y)>LOCK_RANGE){
    if(target) announce('TARGET LOST', .55);
    clearLockTarget();
    return;
  }
  const blocked=!!mazeNavigation.raycastWalls({x:actorPos.x,z:actorPos.y},{x:target.x,z:target.z});
  cameraRig.lockOccludedT=blocked ? cameraRig.lockOccludedT+rawDt : 0;
  if(cameraRig.lockOccludedT>.65){ announce('TARGET LOST', .55); clearLockTarget(); }
}
function cameraCollisionT(start,end,right){
  let safeT=1;
  for(const offset of [-.30,0,.30]){
    const a={x:start.x+right.x*offset,z:start.z+right.z*offset};
    const b={x:end.x+right.x*offset,z:end.z+right.z*offset};
    const hit=raycastWalls(a,b,mazeWorld.getCollisionSegments());
    if(hit) safeT=Math.min(safeT,Math.max(.035,hit.t-THIRD_PERSON_CAMERA.collisionPadding));
  }
  return safeT;
}
function updateLockReticle(){
  const reticle=document.getElementById('lockReticle');
  const target=cameraRig.lockTarget;
  if(!reticle || !enemyStillActive(target)){ if(reticle) reticle.style.display='none'; return; }
  camera.updateMatrixWorld(true);
  scratchCamera.project.set(target.x,enemyTargetHeight(target),target.z).project(camera);
  const p=scratchCamera.project;
  if(p.z<-1||p.z>1||Math.abs(p.x)>1.08||Math.abs(p.y)>1.08){ reticle.style.display='none'; return; }
  reticle.style.display='block';
  reticle.style.left=((p.x*.5+.5)*innerWidth)+'px';
  reticle.style.top=((-p.y*.5+.5)*innerHeight)+'px';
}
function updateCamera(rawDt){
  validateCameraLock(rawDt);
  if(cameraRig.lockTarget){
    const desiredYaw=Math.atan2(cameraRig.lockTarget.x-actorPos.x,cameraRig.lockTarget.z-actorPos.y);
    cameraRig.yaw=lerpAngle(cameraRig.yaw,desiredYaw,1-Math.exp(-rawDt*9));
  } else {
    cameraRig.yaw=wrapPi(cameraRig.yaw-padLook.x*THIRD_PERSON_CAMERA.yawSpeed*rawDt);
  }
  cameraRig.pitch=clamp(cameraRig.pitch-padLook.y*THIRD_PERSON_CAMERA.pitchSpeed*rawDt,THIRD_PERSON_CAMERA.minPitch,THIRD_PERSON_CAMERA.maxPitch);

  shakeVel.addScaledVector(shake,-140*rawDt).addScaledVector(shakeVel,-12*rawDt);
  shake.addScaledVector(shakeVel,rawDt);
  const j=HitFeel.jitter*.24,kick=HitFeel.camKick,zk=HitFeel.zoomKick;
  const f=cameraForwardFlat(),r=cameraRightFlat();
  const pivot=scratchCamera.pivot.set(actorPos.x,THIRD_PERSON_CAMERA.pivotHeight,actorPos.y);
  const horizontal=Math.cos(cameraRig.pitch)*(THIRD_PERSON_CAMERA.distance-zk*.45-transitionView.cameraPush*.45);
  const shoulder=cameraRig.lockTarget ? THIRD_PERSON_CAMERA.shoulder*.52 : THIRD_PERSON_CAMERA.shoulder;
  scratchCamera.desired.set(
    pivot.x-f.x*horizontal+r.x*shoulder,
    pivot.y+Math.sin(cameraRig.pitch)*THIRD_PERSON_CAMERA.distance,
    pivot.z-f.z*horizontal+r.z*shoulder,
  );
  const safeT=cameraCollisionT(pivot,scratchCamera.desired,r);
  scratchCamera.corrected.copy(pivot).lerp(scratchCamera.desired,safeT);
  const currentDistance=cameraRig.currentPosition.distanceTo(pivot);
  const desiredDistance=scratchCamera.corrected.distanceTo(pivot);
  const followRate=desiredDistance<currentDistance ? 32 : 13;
  cameraRig.currentPosition.lerp(scratchCamera.corrected,1-Math.exp(-rawDt*followRate));

  camera.position.copy(cameraRig.currentPosition);
  camera.position.x+=shake.x*.22+(Math.random()*2-1)*j+kick.x*.22;
  camera.position.y+=shake.y*.16+(Math.random()*2-1)*j*.35+kick.y*.18;
  camera.position.z+=shake.z*.22+(Math.random()*2-1)*j+kick.z*.22;
  if(cameraRig.lockTarget){
    const target=cameraRig.lockTarget;
    scratchCamera.lookAt.set(
      lerp(actorPos.x,target.x,.28),
      lerp(THIRD_PERSON_CAMERA.pivotHeight,enemyTargetHeight(target),.22),
      lerp(actorPos.y,target.z,.28),
    );
  } else {
    scratchCamera.lookAt.set(pivot.x+f.x*2.5,pivot.y-.08,pivot.z+f.z*2.5);
  }
  camera.lookAt(scratchCamera.lookAt);

  keyTarget.position.set(actorPos.x,0,actorPos.y);
  key.position.set(actorPos.x-14,26,actorPos.y+12);
  rim.position.set(actorPos.x+16,9,actorPos.y-14);
  updateLockReticle();
}

'''
replace_between(
    "/* ---------- camera ---------- */",
    "/* ---------- main update ---------- */",
    camera_block + "/* ---------- main update ---------- */",
    "third-person camera update",
)

replace_once(
    "    const desired = resolveDesiredFacing();",
    "    const desired = resolveDesiredFacing({ forAttack:false });",
    "player facing update",
)

replace_once(
    "  lightDown, heavyDown, attackDown, attackUp, triggerDodge, cycleWeapon, cycleStance, beginTestSwing, setCombatInputMode,\n  playCard, startDeckShuffle };",
    "  lightDown, heavyDown, attackDown, attackUp, triggerDodge, cycleWeapon, cycleStance, beginTestSwing, setCombatInputMode,\n  toggleLock, switchLockTarget, resetThirdPersonCamera, playCard, startDeckShuffle };",
    "debug handle",
)

path.write_text(text, encoding="utf-8")
print("Applied complete third-person camera and control conversion to combat-arena.html")
