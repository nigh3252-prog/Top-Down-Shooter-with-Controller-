// Pilebunker card animation controller.
//
// This preserves the approved falcon-pilebunker-punch-lab-v2 choreography as a
// self-contained hidden puppet. The puppet body, shoulders, upper arms and
// counterbalance arm are transform-only; only the attacking mechanical forearm,
// carriage, piston and fist render. The internal side intentionally remains the
// lab's `R` side because that orientation visibly reads as the approved
// left-handed punch in the reference demo.
import { buildPowBunkerMesh } from './powbunker-mesh.js';
import { createPowBunkerEffects } from './powbunker-effects.js';

const SMASH64 = Object.freeze({
  timeScale:.92, braceTime:.45, ratchetTime:1.22, coilTime:1.05,
  holdTime:.72, strikeTime:.92, impactHold:1.15, pistonHold:.90,
  retractTime:.82, recoverTime:.95, arcRadius:1.34, fistHeight:1.28,
  pullback:1.06, crouch:1.12, twist:1.08, launch:1.02, follow:1.18,
  pileDelay:.78, pileSnap:1.10, impact:1.35,
});

export function createPowBunkerAbility({ THREE, scene } = {}) {
  if (!THREE || !scene) throw new Error('[pilebunker] THREE and scene are required.');

  const V3=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
  const UP=V3(0,1,0);
  const clamp=THREE.MathUtils.clamp;
  const lerp=THREE.MathUtils.lerp;
  const easeInQuart=t=>t*t*t*t;
  const easeOutCubic=t=>1-Math.pow(1-t,3);
  const easeInOutCubic=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const smoothstep=t=>t*t*(3-2*t);

  const tuning={
    size:.16,
    armHeight:-.65,
    puppetScale:4,
    elbowLift:.55,
    throwExt:2.33,
    rear:-.85,
    weaponMode:'stance',
  };
  const STORAGE={
    size:'arena.pilebunker.size',
    armHeight:'arena.pilebunker.armHeight',
    weaponMode:'arena.pilebunker.weaponMode',
    oldSize:'arena.powBunker.size',
    oldHeight:'arena.powBunker.armHeight',
  };
  try{
    const savedSize=Number(localStorage.getItem(STORAGE.size)??localStorage.getItem(STORAGE.oldSize));
    const savedHeight=Number(localStorage.getItem(STORAGE.armHeight)??localStorage.getItem(STORAGE.oldHeight));
    const savedMode=localStorage.getItem(STORAGE.weaponMode);
    if(Number.isFinite(savedSize))tuning.size=clamp(savedSize,.14,.40);
    if(Number.isFinite(savedHeight))tuning.armHeight=clamp(savedHeight,-3,3);
    if(['stance','right','hidden'].includes(savedMode))tuning.weaponMode=savedMode;
  }catch(_){}

  /* ---------- hidden puppet hierarchy ---------- */
  const char=new THREE.Group();
  char.name='Pilebunker hidden puppet';
  char.visible=false;
  const hips=new THREE.Group();hips.position.y=.95;char.add(hips);
  const chest=new THREE.Group();chest.position.y=.34;hips.add(chest);
  const shAnchor={L:new THREE.Group(),R:new THREE.Group()};
  shAnchor.L.position.set(-.27,.20,.02);
  shAnchor.R.position.set(.27,.20,.02);
  chest.add(shAnchor.L,shAnchor.R);
  const REST_SHOULDER_R=V3(.27,1.49,.02);

  /* ---------- visible mechanical forearm ---------- */
  const pb=buildPowBunkerMesh(THREE,1); // exact PB.R orientation from approved demo
  char.add(pb.root);
  function applyRear(){
    pb.backRam.position.set(-.52-tuning.rear*.72,.04,0);
    pb.backHead.position.set(pb.backRam.position.x-.94,.04,0);
  }
  applyRear();

  /* ---------- exact lab pose data ---------- */
  const GUARD={
    L:{w:V3(-.16,1.36,.32),pole:V3(-.58,.90,.05)},
    R:{w:V3(.16,1.32,.26),pole:V3(.58,.88,.02)},
  };
  const FALCON={
    weight:1.35,
    brace:V3(.08,1.35,.36),bracePalm:V3(-.05,1.34,.43),
    high:V3(.38,1.62,.02),coil:V3(.43,1.21,-.10),
    offReach:V3(-.14,1.19,.57),impact:V3(0,1.22,.88),
    follow:V3(-.07,1.18,.98),recoverMid:V3(.28,1.23,.38),
    bracePole:V3(.62,1.02,.04),highPole:V3(.72,1.20,-.02),
    coilPole:V3(.70,.92,-.05),impactPole:V3(.66,.92,.02),
    braceDir:V3(.08,.14,.99).normalize(),highDir:V3(.24,.82,.52).normalize(),
    coilDir:V3(-.06,.10,.99).normalize(),
    coilHip:.66,coilChest:1.02,punchHip:-.46,punchChest:-.78,
  };
  const L1=.30,L2=.28,PB_MAX_RETRACT=.95;
  const wristT={L:V3(),R:V3()},poleT={L:V3(),R:V3()};
  const ik={L:{elbow:V3(),wrist:V3()},R:{elbow:V3(),wrist:V3()}};
  const _st=V3(),_pp=V3(),_perp=V3(),_e=V3(),_tc=V3();
  function solveArm(S,T,pole,out){
    _st.copy(T).sub(S);let d=_st.length();const reach=L1+L2-1e-4;if(d>reach)d=reach;
    if(d<1e-5){out.elbow.copy(S);out.wrist.copy(S);return;}
    _st.normalize();_tc.copy(S).addScaledVector(_st,d);
    const a=(L1*L1-L2*L2+d*d)/(2*d),h=Math.sqrt(Math.max(0,L1*L1-a*a));
    _pp.copy(pole).sub(S);_perp.copy(_pp).addScaledVector(_st,-_pp.dot(_st));
    if(_perp.lengthSq()<1e-8)_perp.set(0,-1,0);_perp.normalize();
    _e.copy(S).addScaledVector(_st,a).addScaledVector(_perp,h);
    out.elbow.copy(_e);out.wrist.copy(_tc);
  }
  const _railD0=V3(),_railD1=V3();
  function sampleQuadRail(p0,p1,p2,t,outPos,outTan){
    const u=1-t;
    outPos.copy(p0).multiplyScalar(u*u).addScaledVector(p1,2*u*t).addScaledVector(p2,t*t);
    _railD0.copy(p1).sub(p0).multiplyScalar(2*u);_railD1.copy(p2).sub(p1).multiplyScalar(2*t);
    outTan.copy(_railD0).add(_railD1);if(outTan.lengthSq()<1e-8)outTan.copy(p2).sub(p0);
    return outTan.normalize();
  }
  const _dirA=V3(),_dirB=V3(),_dirAxis=V3(),_dirQ=new THREE.Quaternion();
  function slerpRailDir(a,b,t,planeNormal,out){
    _dirA.copy(a).normalize();_dirB.copy(b).normalize();const dot=clamp(_dirA.dot(_dirB),-1,1);
    if(dot>.9995)return out.lerpVectors(_dirA,_dirB,t).normalize();
    if(dot<-.9995){
      _dirAxis.copy(planeNormal);
      if(_dirAxis.lengthSq()<1e-8||Math.abs(_dirAxis.dot(_dirA))>.98){_dirAxis.crossVectors(_dirA,UP);if(_dirAxis.lengthSq()<1e-8)_dirAxis.set(0,0,1);}
      _dirAxis.normalize();_dirQ.setFromAxisAngle(_dirAxis,Math.PI*t);return out.copy(_dirA).applyQuaternion(_dirQ).normalize();
    }
    _dirAxis.crossVectors(_dirA,_dirB).normalize();_dirQ.setFromAxisAngle(_dirAxis,Math.acos(dot)*t);
    return out.copy(_dirA).applyQuaternion(_dirQ).normalize();
  }

  const state={active:false,t:0,total:1,phase:'READY',hipT:0,chestT:0,lunge:0,crouch:0,hitDone:false,whooshDone:false,hissDone:false};
  const mech={pist:0,gearA:0,recoil:0,cock:0,charge:0,lastStep:-1,slammed:false,upDir:V3(0,1,0),poseDir:V3(1,0,0),railDir:V3(1,0,0),railEndDir:V3(1,0,0),railUp:V3(0,1,0),railZax:V3(0,0,1),windStart:V3(),windDirStart:V3(1,0,0),guardDir:V3(1,0,0)};
  const poses={brace:V3(),high:V3(),coil:V3(),impact:V3(),follow:V3()};
  const events={slam:false,hit:false,finished:false};
  const fistWorld=V3(),prevFistWorld=V3(),forwardWorld=V3(0,0,1);
  const _sPos=V3(),_tmp=V3(),_wp=V3(),_curvePole=V3(),_curveOff=V3(),_curveDir=V3();
  const _fwd=V3(),_zax=V3(),_yax=V3(),_bm=new THREE.Matrix4();
  const _anchor=V3(),_axisA=V3(),_axisB=V3();
  let timeNow=0;

  function shoulderLocal(side,out){char.updateMatrixWorld(true);shAnchor[side].getWorldPosition(out);return char.worldToLocal(out);}
  function initialiseGuard(){
    wristT.L.copy(GUARD.L.w);wristT.R.copy(GUARD.R.w);poleT.L.copy(GUARD.L.pole);poleT.R.copy(GUARD.R.pole);
    shoulderLocal('R',_sPos);solveArm(_sPos,wristT.R,poleT.R,ik.R);mech.poseDir.copy(ik.R.wrist).sub(ik.R.elbow).normalize();
    mountMechanism(false,0);
  }

  /* ---------- restored lab effects ---------- */
  const effects=createPowBunkerEffects({THREE,scene});
  const effectScale=()=>Math.max(.75,tuning.puppetScale*tuning.size/.24);
  function slamFx(){
    mech.recoil=.32*SMASH64.follow;
    pb.root.updateWorldMatrix(true,true);
    pb.fist.getWorldPosition(_wp);
    pb.root.localToWorld(_axisA.set(0,0,0));pb.root.localToWorld(_axisB.set(1,0,0));
    forwardWorld.copy(_axisB).sub(_axisA).normalize();
    effects.slam({point:_wp,stacks:pb.stacks,forward:forwardWorld,weight:FALCON.weight*SMASH64.impact,effectScale:effectScale()});
  }
  function impactFeedback(hit,landed){
    if(!hit)return;
    effects.contact({point:hit.point,forward:hit.forward,weight:FALCON.weight*SMASH64.impact,hit:!!landed,effectScale:effectScale()});
  }

  function start(){
    if(state.active)return false;
    effects.ensureAudio();
    state.active=true;state.t=0;state.hitDone=false;state.whooshDone=false;state.hissDone=false;state.phase='PALM BRACE';
    state.hipT=state.chestT=state.lunge=state.crouch=0;
    events.slam=events.hit=events.finished=false;
    mech.lastStep=-1;mech.slammed=false;mech.pist=0;mech.gearA=0;mech.recoil=0;mech.cock=0;mech.charge=0;
    char.visible=true;
    initialiseGuard();
    mech.windStart.copy(wristT.R);mech.windDirStart.copy(mech.poseDir).normalize();
    poses.brace.copy(FALCON.brace);
    poses.high.copy(FALCON.high);poses.high.y=FALCON.brace.y+(FALCON.high.y-FALCON.brace.y)*SMASH64.fistHeight;
    poses.coil.copy(FALCON.coil);poses.coil.x=FALCON.brace.x+(FALCON.coil.x-FALCON.brace.x)*SMASH64.pullback;poses.coil.z=FALCON.brace.z+(FALCON.coil.z-FALCON.brace.z)*SMASH64.pullback;
    poses.impact.copy(FALCON.impact);poses.impact.z=poses.coil.z+(FALCON.impact.z-FALCON.coil.z)*SMASH64.launch;
    poses.follow.copy(poses.impact).lerp(FALCON.follow,SMASH64.follow);
    const arcDelta=SMASH64.arcRadius-1;poses.high.x+=arcDelta*.16;poses.high.z-=arcDelta*.035;poses.coil.x+=arcDelta*.10;poses.coil.z-=arcDelta*.055;
    mech.windCurve=new THREE.CatmullRomCurve3([mech.windStart.clone(),poses.brace.clone(),poses.high.clone(),poses.coil.clone()],false,'centripetal',.5);
    mech.poleCurve=new THREE.CatmullRomCurve3([GUARD.R.pole.clone(),FALCON.bracePole.clone(),FALCON.highPole.clone(),FALCON.coilPole.clone()],false,'centripetal',.5);
    mech.offCurve=new THREE.CatmullRomCurve3([GUARD.L.w.clone(),FALCON.bracePalm.clone(),FALCON.bracePalm.clone().lerp(FALCON.offReach,.46),FALCON.offReach.clone()],false,'centripetal',.5);
    mech.dirCurve=new THREE.CatmullRomCurve3([mech.windDirStart.clone(),FALCON.braceDir.clone(),FALCON.highDir.clone(),FALCON.coilDir.clone()],false,'centripetal',.5);
    mech.railDir.copy(poses.impact).sub(poses.coil).normalize();
    mech.railEndDir.copy(poses.follow).sub(poses.impact).normalize();if(mech.railEndDir.lengthSq()<1e-8)mech.railEndDir.copy(mech.railDir);
    shoulderLocal('R',_sPos);mech.guardDir.copy(GUARD.R.w).sub(_sPos).normalize();
    _perp.copy(poses.coil).sub(_sPos);_perp.addScaledVector(mech.railDir,-_perp.dot(mech.railDir));
    if(_perp.lengthSq()<1e-6)_perp.set(0,1,0);
    mech.railUp.copy(_perp.normalize());mech.railZax.crossVectors(mech.railDir,mech.railUp).normalize();mech.railUp.crossVectors(mech.railZax,mech.railDir).normalize();
    prevFistWorld.copy(fistWorld);
    return true;
  }

  function mountMechanism(attacking,dt){
    shoulderLocal('R',_sPos);solveArm(_sPos,wristT.R,poleT.R,ik.R);
    if(attacking){
      _fwd.copy(mech.poseDir).normalize();_zax.copy(mech.railZax);_yax.crossVectors(_zax,_fwd).normalize();_zax.crossVectors(_fwd,_yax).normalize();mech.upDir.copy(_yax);
    }else{
      _fwd.copy(ik.R.wrist).sub(ik.R.elbow).normalize();mech.poseDir.copy(_fwd);_yax.set(0,1,0);_zax.crossVectors(_fwd,_yax);if(_zax.lengthSq()<1e-8)_zax.set(1,0,0);_zax.normalize();_yax.crossVectors(_zax,_fwd).normalize();
    }
    _bm.makeBasis(_fwd,_yax,_zax);pb.root.quaternion.setFromRotationMatrix(_bm);if(mech.cock)pb.root.rotateZ(mech.cock);
    const sc=tuning.size;pb.root.scale.setScalar(sc);
    _wp.copy(ik.R.elbow).addScaledVector(_yax,tuning.elbowLift*sc);if(_wp.x<.205)_wp.x=.205;
    _tmp.copy(pb.elbowSocket.position).multiplyScalar(sc).applyQuaternion(pb.root.quaternion);pb.root.position.copy(_wp).sub(_tmp);
    mech.recoil+=(0-mech.recoil)*Math.min(1,dt*7);
    pb.carriage.position.x=mech.pist;pb.gear.rotation.z=mech.gearA;pb.idler.rotation.z=-mech.gearA*(.55/.3);pb.fore.position.x=-mech.recoil;
    pb.glowMat.emissiveIntensity=mech.charge*(.8+Math.sin(timeNow*20)*.2)*2.4;
    const ext=Math.max(0,mech.pist)/tuning.throwExt;pb.fist.scale.set(1-ext*.06,1+ext*.04,1+ext*.04);
    prevFistWorld.copy(fistWorld);char.updateMatrixWorld(true);pb.fist.getWorldPosition(fistWorld);if(prevFistWorld.lengthSq()===0)prevFistWorld.copy(fistWorld);
    pb.root.localToWorld(_axisA.set(0,0,0));pb.root.localToWorld(_axisB.set(1,0,0));forwardWorld.copy(_axisB).sub(_axisA).normalize();
  }

  function update(dt,{anchor,time=0,rawDt=dt}={}){
    timeNow=time;effects.update(Math.max(0,rawDt));
    if(anchor)_anchor.copy(anchor);
    char.scale.setScalar(tuning.puppetScale);
    char.position.set(
      _anchor.x-REST_SHOULDER_R.x*tuning.puppetScale,
      _anchor.y+tuning.armHeight-REST_SHOULDER_R.y*tuning.puppetScale,
      _anchor.z-REST_SHOULDER_R.z*tuning.puppetScale+state.lunge*tuning.puppetScale
    );
    if(!state.active)return;
    state.t+=dt;
    const s=SMASH64,timeScale=s.timeScale;
    const dBrace=.15*s.braceTime*timeScale,dRatchet=.55*s.ratchetTime*timeScale,dCoil=.35*s.coilTime*timeScale,dWind=dBrace+dRatchet+dCoil;
    const dHold=.18*s.holdTime*timeScale,dStrike=.105*s.strikeTime*timeScale,dImpact=.12*s.impactHold*timeScale,dPiston=.28*s.pistonHold*timeScale,dRetract=.22*s.retractTime*timeScale,dRecover=.75*s.recoverTime*timeScale;
    const B1=dWind,B2=B1+dHold,B3=B2+dStrike,B4=B3+dImpact,B5=B4+dPiston,B6=B5+dRetract,B7=B6+dRecover;state.total=B7;
    const t=state.t,W=wristT.R,WL=wristT.L;
    let hipTw=0,chestTw=0,lungeTarget=0,shLead=0,shAcross=0,crouch=0;
    const windCharge=clamp(t/Math.max(dWind,.0001),0,1),steps=4,stepF=Math.min(steps-1e-4,windCharge*steps),step=Math.floor(stepF),pull=easeOutCubic(Math.min(1,(stepF-step)/.58));
    mech.pist=-((step+pull)/steps)*PB_MAX_RETRACT;mech.gearA=-(step+pull)*(Math.PI/4);mech.charge=windCharge;mech.cock=.052*windCharge;
    if(step!==mech.lastStep){mech.lastStep=step;effects.click();if(step===steps-1)mech.recoil=Math.max(mech.recoil,.055);}

    if(t<B1){
      const raw=clamp(t/Math.max(dWind,.0001),0,1),p=easeInOutCubic(raw);
      mech.windCurve.getPointAt(p,W);mech.poleCurve.getPointAt(p,_curvePole);poleT.R.copy(_curvePole);mech.offCurve.getPointAt(p,_curveOff);WL.copy(_curveOff);mech.dirCurve.getPointAt(p,_curveDir);
      if(_curveDir.lengthSq()<1e-8)_curveDir.copy(FALCON.coilDir);mech.poseDir.copy(_curveDir.normalize());
      const bodyP=smoothstep(p);hipTw=lerp(0,FALCON.coilHip*s.twist,bodyP);chestTw=lerp(0,FALCON.coilChest*s.twist,bodyP);crouch=.16*s.crouch*Math.pow(bodyP,1.28);
      const braceFrac=dBrace/Math.max(dWind,.0001),ratchetFrac=(dBrace+dRatchet)/Math.max(dWind,.0001);
      state.phase=raw<braceFrac?'PALM BRACE':raw<ratchetFrac?'OVERHEAD RATCHET':'DEEP COIL';
    }else if(t<B2){
      const p=(t-B1)/Math.max(dHold,.0001);W.copy(poses.coil);W.x+=Math.sin(t*63)*.003*(1-p);W.y+=Math.sin(t*79)*.002*(1-p);WL.copy(FALCON.offReach);poleT.R.copy(FALCON.coilPole);mech.poseDir.copy(FALCON.coilDir);
      mech.pist=-PB_MAX_RETRACT+Math.sin(t*92)*.010;mech.cock=.052;hipTw=FALCON.coilHip*s.twist;chestTw=FALCON.coilChest*s.twist;crouch=.16*s.crouch;state.phase='FINAL HOLD';
    }else if(t<B3){
      const p=(t-B2)/Math.max(dStrike,.0001),move=easeInQuart(p);
      W.lerpVectors(poses.coil,poses.impact,move);poleT.R.lerpVectors(FALCON.coilPole,FALCON.impactPole,easeInOutCubic(p));slerpRailDir(FALCON.coilDir,mech.railDir,easeInOutCubic(clamp(p/.42,0,1)),mech.railZax,mech.poseDir);
      const hp=easeOutCubic(clamp(p*1.28,0,1)),cp=easeInOutCubic(clamp((p-.06)/.94,0,1));
      hipTw=lerp(FALCON.coilHip*s.twist,FALCON.punchHip*s.twist,hp);chestTw=lerp(FALCON.coilChest*s.twist,FALCON.punchChest*s.twist,cp);lungeTarget=.34*s.launch*move;shLead=.16*move;shAcross=.070*move;crouch=lerp(.16*s.crouch,.095*s.crouch,easeOutCubic(p));
      WL.lerpVectors(FALCON.offReach,V3(-.08,1.39,.31),easeOutCubic(clamp(p*1.4,0,1)));
      if(!state.whooshDone&&p>.18){effects.whoosh(FALCON.weight*s.impact);state.whooshDone=true;}
      const slamAt=clamp(s.pileDelay,.45,.94),slamSpan=.16/s.pileSnap;
      if(p<slamAt){mech.pist=-PB_MAX_RETRACT+Math.sin(t*105)*.009;mech.cock=.052;}
      else{
        const k=easeOutCubic(clamp((p-slamAt)/Math.max(slamSpan,.03),0,1));
        mech.pist=-PB_MAX_RETRACT+(tuning.throwExt+PB_MAX_RETRACT)*k;mech.cock=.052*(1-k);mech.gearA=-steps*(Math.PI/4)-k*Math.PI*.65;
        if(k>=1&&!mech.slammed){mech.slammed=true;slamFx();events.slam=true;}
      }
      if(!state.hitDone&&p>=.82){state.hitDone=true;events.hit=true;}
      state.phase='BODY LAUNCH';
    }else if(t<B4){
      const p=(t-B3)/Math.max(dImpact,.0001);W.lerpVectors(poses.impact,poses.follow,easeOutCubic(clamp(p*1.7,0,1)));WL.set(-.08,1.39,.31);poleT.R.copy(FALCON.impactPole);slerpRailDir(mech.railDir,mech.railEndDir,smoothstep(p),mech.railZax,mech.poseDir);
      hipTw=FALCON.punchHip*s.twist;chestTw=FALCON.punchChest*s.twist;lungeTarget=.34*s.launch;shLead=.16;shAcross=.070;crouch=.095*s.crouch;mech.pist=tuning.throwExt;mech.charge=1-p*.12;state.phase='IMPACT HOLD';
    }else if(t<B5){
      W.copy(poses.follow);WL.set(-.08,1.39,.31);poleT.R.copy(FALCON.impactPole);mech.poseDir.copy(mech.railEndDir);hipTw=FALCON.punchHip*s.twist;chestTw=FALCON.punchChest*s.twist;lungeTarget=.34*s.launch;shLead=.16;shAcross=.070;crouch=.095*s.crouch;mech.pist=tuning.throwExt;mech.cock=0;mech.charge=.82;state.phase='PISTON LOCKED OUT';
    }else if(t<B6){
      const raw=(t-B5)/Math.max(dRetract,.0001),p=easeInOutCubic(raw);
      if(!state.hissDone){state.hissDone=true;effects.hiss(clamp(dRetract*.90,.12,.34));}
      W.copy(poses.follow);WL.set(-.08,1.39,.31);poleT.R.copy(FALCON.impactPole);mech.poseDir.copy(mech.railEndDir);
      const settle=smoothstep(raw)*.10;hipTw=lerp(FALCON.punchHip*s.twist,FALCON.punchHip*s.twist*.90,settle);chestTw=lerp(FALCON.punchChest*s.twist,FALCON.punchChest*s.twist*.90,settle);lungeTarget=.34*s.launch;shLead=.16;shAcross=.070;crouch=.095*s.crouch;
      mech.pist=lerp(tuning.throwExt,0,p);mech.gearA=lerp(-steps*(Math.PI/4)-Math.PI*.65,0,p);mech.cock=0;mech.charge=lerp(.82,.35,p);state.phase='PNEUMATIC RETRACT';
    }else if(t<B7){
      const raw=(t-B6)/Math.max(dRecover,.0001),p=easeInOutCubic(raw);
      sampleQuadRail(poses.follow,FALCON.recoverMid,GUARD.R.w,p,W,_tmp);WL.lerpVectors(V3(-.08,1.39,.31),GUARD.L.w,p);poleT.R.lerpVectors(FALCON.impactPole,GUARD.R.pole,p);slerpRailDir(mech.railEndDir,mech.guardDir,p,mech.railZax,mech.poseDir);
      hipTw=lerp(FALCON.punchHip*s.twist*.90,0,p);chestTw=lerp(FALCON.punchChest*s.twist*.90,0,p);lungeTarget=.34*s.launch*(1-p);shLead=.16*(1-p);shAcross=.070*(1-p);crouch=.095*s.crouch*(1-p);
      mech.pist=0;mech.gearA=0;mech.cock=0;mech.charge=lerp(.35,0,p);state.phase='HEAVY RECOVERY';
    }else{
      state.active=false;state.phase='READY';state.hipT=state.chestT=state.lunge=state.crouch=0;char.visible=false;events.finished=true;return;
    }

    state.lunge=lerp(state.lunge,lungeTarget,1-Math.pow(.0001,dt));
    state.hipT=lerp(state.hipT,hipTw,1-Math.pow(.000001,dt));
    state.chestT=lerp(state.chestT,chestTw,1-Math.pow(.000001,dt));
    state.crouch=crouch;
    hips.rotation.y=state.hipT;chest.rotation.y=state.chestT-state.hipT;hips.position.y=.95-crouch;
    shAnchor.R.position.z=.02+shLead;shAnchor.R.position.x=.27-shAcross;shAnchor.L.position.set(-.27,.20,.02);
    mountMechanism(true,dt);
    if(t>=B2&&t<B4)effects.trailPoint(fistWorld,effectScale());
  }

  function consumeEvents(){
    const out={slam:events.slam,hit:events.hit?{point:fistWorld.clone(),prev:prevFistWorld.clone(),forward:forwardWorld.clone()}:null,finished:events.finished};
    events.slam=events.hit=events.finished=false;
    return out;
  }
  function attach(parent){if(!parent)return;if(char.parent!==parent){char.parent?.remove(char);parent.add(char);}initialiseGuard();}
  function applyHostPose(activeModel,W){
    if(!state.active||!activeModel)return;
    activeModel.position.y-=state.crouch*tuning.puppetScale;
    activeModel.position.z+=state.lunge*tuning.puppetScale;
    activeModel.rotation.y+=state.hipT;
    if(W?.bodyGroup)W.bodyGroup.rotation.y+=state.chestT-state.hipT;
    if(W?.head)W.head.rotation.y+=-state.chestT*.62;
    if(W?.hat)W.hat.rotation.y+=-state.chestT*.10;
  }
  function setSize(v){tuning.size=clamp(Number(v)||.16,.14,.40);try{localStorage.setItem(STORAGE.size,String(tuning.size));}catch(_){}return tuning.size;}
  function setArmHeight(v){tuning.armHeight=clamp(Number(v)||0,-3,3);try{localStorage.setItem(STORAGE.armHeight,String(tuning.armHeight));}catch(_){}return tuning.armHeight;}
  function setWeaponMode(v){const mode=['stance','right','hidden'].includes(v)?v:'stance';tuning.weaponMode=mode;try{localStorage.setItem(STORAGE.weaponMode,mode);}catch(_){}return mode;}
  function dispose(){
    char.parent?.remove(char);char.traverse(o=>{if(o.isMesh)o.geometry?.dispose?.();});
    for(const material of new Set([...Object.values(pb.materials),pb.glowMat]))material?.dispose?.();
    effects.dispose();
  }

  return{
    attach,start,update,consumeEvents,impactFeedback,applyHostPose,dispose,setSize,setArmHeight,setWeaponMode,tuning,
    fistWorld,prevFistWorld,forwardWorld,
    get active(){return state.active;},
    get phase(){return state.phase;},
    get progress(){return clamp(state.t/Math.max(state.total,.001),0,1);},
  };
}

export function installPowBunkerTuningPanel(ability){
  if(!ability||typeof document==='undefined'||document.getElementById('body-powbunker'))return;
  const loadout=document.getElementById('body-loadout');if(!loadout)return;
  const header=document.createElement('button');header.className='ptitle sect';header.dataset.sect='powbunker';header.dataset.label='PILEBUNKER';
  const body=document.createElement('div');body.className='sbody';body.id='body-powbunker';
  const note=document.createElement('div');note.className='ptitle';note.style.lineHeight='1.45';note.textContent='SMASH 64 · SIZE 0.16 DEFAULT · APPROVED LEFT-HAND VISUAL · FOREARM ONLY';body.appendChild(note);
  const defs=[
    {label:'PILEBUNKER SIZE',min:.14,max:.40,step:.005,get:()=>ability.tuning.size,set:v=>ability.setSize(v),digits:3},
    {label:'THEORETICAL ARM HEIGHT',min:-3,max:3,step:.05,get:()=>ability.tuning.armHeight,set:v=>ability.setArmHeight(v),digits:2},
  ];
  for(const d of defs){
    const row=document.createElement('div');row.className='srow';
    const lab=document.createElement('div');lab.className='slabel';const val=document.createElement('span');val.className='sval';
    const sync=()=>{val.textContent=Number(d.get()).toFixed(d.digits);};
    lab.textContent=d.label+' ';lab.appendChild(val);
    const input=document.createElement('input');input.type='range';input.min=d.min;input.max=d.max;input.step=d.step;input.value=d.get();input.setAttribute('aria-label',d.label);
    input.addEventListener('input',()=>{d.set(parseFloat(input.value));sync();});sync();row.append(lab,input);body.appendChild(row);
  }
  const modeRow=document.createElement('div');modeRow.className='srow';
  const modeLabel=document.createElement('div');modeLabel.className='slabel';modeLabel.textContent='WEAPON DURING PILEBUNKER';
  const select=document.createElement('select');select.setAttribute('aria-label','Weapon during Pilebunker');
  select.style.cssText='width:100%;padding:8px;border:1px solid rgba(232,160,76,.45);border-radius:6px;background:#102426;color:#f0d7b1;font:inherit;';
  for(const [value,label] of [['stance','STANCE POSITION'],['right','RIGHT-SIDE CARRY'],['hidden','HIDDEN']]){const option=document.createElement('option');option.value=value;option.textContent=label;select.appendChild(option);}
  select.value=ability.tuning.weaponMode;select.addEventListener('change',()=>ability.setWeaponMode(select.value));
  modeRow.append(modeLabel,select);body.appendChild(modeRow);
  loadout.insertAdjacentElement('afterend',body);body.insertAdjacentElement('beforebegin',header);
}
