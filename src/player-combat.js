// Flattened local player-combat implementation.
// The core interpreter, Pilebunker/vertical-aim integration, and live arena
// runtimes are intentionally kept in this public module.

// Stone Wanderer player combat core — pose model, attack interpreter, weapon
// rig lifecycle, two-bone arm IK, swept hit-zone geometry, trail/sparks, and
// the per-frame combat update. Extracted verbatim from weapon-lab.html; the
// page-specific side effects (aim resolution, audio, lab trial bookkeeping,
// DOM status lines, dummy-vs-enemy hit routing) are now injected hooks.
//
// Usage:
//   const PC = installPlayerCombat({
//     THREE, scene,
//     get WEAPONS(){...}, get WEAPON_ORDER(){...},   // page-owned cloned defs
//     materials,   // stone-wanderer materials (arm coat + weapon metals)
//     facet,
//     get activeModel(){...}, get actorVisual(){...}, get W(){...}, get yawQ(){...},
//     hooks: {
//       resolveAttackFacing(),      // -> {angle} | null; sample aim at attack start
//       commitFacing(angle),        // page applies the committed facing
//       onAttackStart(info),        // {key, group, label, weapon, labEvent}
//       onAttackReset(),            // clear page-side per-swing hit caches
//       onAttackComplete(),         // a swing finished (before chaining)
//       onAttackChainIdle(),        // combat returned to idle, combo window opens
//       detectHits(dt, tipScene, baseScene, tipSpeed),  // page-owned hit routing
//       onWeaponSelected(),         // after selectCombatWeapon switches defs
//       onWeaponUISync(),           // page refreshes weapon-related UI
//       flashCombatButton(group),   // optional UI flash
//       onVariantAdvance(),         // optional variant readout refresh
//       timeScaleModifier(att, t, phaseIndex),  // optional extra time scale (x1)
//     }
//   });
//
// Every getter on the api bag is read lazily at call time, so the page can
// install this module before most of its own state exists.

import { ATTACK_GROUPS } from './attacks.js';
import { buildStoneWeaponMesh, normalizeStoneWeaponId } from './weapons.js';
import { createAttackInterpreter } from './attack-interpreter.js';
import { shouldStartBufferedFollowup } from './combat-links.js';
import { RAPIER_TIP_TUNING } from './weapon-balance.js';

function installCorePlayerCombat(api) {
  const { THREE, scene, materials, facet } = api;
  const hooks = api.hooks || {};
  const { matCoat, matIron, matBronze, matLeather, matSilver, matGlow } = materials;

  const THREE_UP = new THREE.Vector3(0,1,0);
  const clamp = THREE.MathUtils.clamp;

  /* ---- tuning ------------------------------------------------------------ */
  const RIG = {
    hipY:0.88, hipHalf:0.12, thigh:0.50, shin:0.46,
    spine:0.30, chestY:0.30, shoulderY:0.46, shoulderHalf:0.215,
    upperArm:0.30, foreArm:0.31, neckY:0.60,
    // stance (character faces +Z; +X is the character's right)
    footL:new THREE.Vector3(-0.17,0,0.16),   // left foot forward
    footR:new THREE.Vector3( 0.17,0,-0.18),  // right foot back
    // sword geometry along its local +Y
    bladeBase:0.06, bladeTip:1.14, gripCenter:-0.14,
    handR:new THREE.Vector3(0.0,-0.05,0.02), handL:new THREE.Vector3(0.0,-0.24,-0.02),
  };
  const LUNGE = { drop:0.16, fwd:0.34, foot:0.44 };
  const BASE_RIG = { bladeBase:RIG.bladeBase, bladeTip:RIG.bladeTip, gripCenter:RIG.gripCenter };
  const BASE_BLADE_LEN = BASE_RIG.bladeTip - BASE_RIG.bladeBase;
  const TUNE_DEFAULTS = {
    length:1.00, weight:0.35, pullback:1.00, swingWidth:1.00,
    windup:1.00, follow:1.00, recovery:1.00,
    impact:1.00, trailBoost:1.00
  };

  /* ---- pose model + attack sampler (shared with the arena goblins) -------- */
  // The pure pose core (easing, pose model, attack library, sampler) lives in
  // src/attack-interpreter.js so the player and the arena grunt animate from the
  // exact same choreography and code. Everything weapon-specific stays here.
  const interpreter = createAttackInterpreter(THREE);
  const { Ease, smoothstep, P, poseLerp, poseCopy, work, IDLE, setIdlePose, sampleAttack, ATTACKS } = interpreter;

  const DEFAULT_COMBAT_SCALE = 4.00;
  const combatState = {
    weapon:'longsword', attack:null, attackKey:null, attackGroup:'vertical', t:0, fired:false,
    pending:null, pendingGroup:null, last:'vertical', variantIndex:{vertical:0,horizontal:0,stab:0},
    tune:Object.assign({},TUNE_DEFAULTS), puppetScale:DEFAULT_COMBAT_SCALE, shoulderDrop:3.05, floorBlend:1.0, weaponHitboxScale:1, hideArms:false, loop:false, showDriver:false,
    commitYaw:0, lastAttackLabel:'none',
    hitStop:0, wobble:{v:0,vel:0}, trailFlash:0, breath:1, chargePull:0, readyLock:0
  };
  const lastRenderedPose=P({hold:[0,1,0],tip:[0,1,0]});
  const linkFromPose=P({hold:[0,1,0],tip:[0,1,0]});
  const linkWorkPose=P({hold:[0,1,0],tip:[0,1,0]});
  const readyFromPose=P({hold:[0,1,0],tip:[0,1,0]});
  let haveRenderedPose=false, linkBlendElapsed=-1, readyBlendElapsed=-1;
  const READY_BLEND_DURATION=.16;
  const LINK_BLEND_DURATION=.085;
  const COMBAT_ORIGIN = new THREE.Vector3(0,-0.30,0.42);
  const weaponBaseLocal = new THREE.Vector3(0,RIG.bladeBase,0);
  const weaponTipLocal = new THREE.Vector3(0,RIG.bladeTip,0);
  const swQ = new THREE.Quaternion();
  const qr = new THREE.Quaternion();
  const gripOff = new THREE.Vector3();
  const tmpV = new THREE.Vector3();
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const combatPlaneQ = new THREE.Quaternion();
  const combatPlaneQBlend = new THREE.Quaternion();
  const combatParentQ = new THREE.Quaternion();
  const combatDesiredQ = new THREE.Quaternion();
  const combatIdentityQ = new THREE.Quaternion();
  let combatLayer = null, weaponRoot = null, driverDebug = null, rightArmA = null, rightArmB = null, leftArmA = null, leftArmB = null, rightHandProxy = null, leftHandProxy = null;
  let weaponParts = {}, activeWeaponKind = 'blade', haveCombatTip = false;
  const prevCombatTip = new THREE.Vector3();

  const combatTrail = (()=>{
    const N=24, pos=new Float32Array(N*2*3), col=new Float32Array(N*2*3), idx=[];
    for(let i=0;i<N-1;i++){const a=i*2;idx.push(a,a+1,a+2, a+1,a+3,a+2);}
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setAttribute('color',new THREE.BufferAttribute(col,3)); g.setIndex(idx);
    const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,fog:false,side:THREE.DoubleSide}));
    mesh.frustumCulled=false;
    mesh.renderOrder=0;
    scene.add(mesh);
    return {N,pos,col,mesh,tipH:[],baseH:[],intensity:0,flash:0};
  })();
  const combatTrailColor = new THREE.Color(0xbfe6ff);
  const combatSparks = (()=>{
    const N=20, pos=new Float32Array(N*3);
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const mat=new THREE.PointsMaterial({color:0xffb066,size:0.075,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true});
    const pts=new THREE.Points(g,mat); scene.add(pts);
    return {N,pos,pts,mat,vel:[],age:1,life:.36};
  })();

  /* ---- swept weapon hit-zone geometry ------------------------------------ */
  function pointSegmentDistance(p,a,b){const ab=tmpA.subVectors(b,a); const len2=ab.lengthSq(); if(len2<1e-8) return p.distanceTo(a); const t=clamp(tmpB.subVectors(p,a).dot(ab)/len2,0,1); return p.distanceTo(tmpV.copy(a).addScaledVector(ab,t));}
  function createZonePoint(frac,x=0,z=0){const bladeLen=Math.max(.08,RIG.bladeTip-RIG.bladeBase); return new THREE.Vector3(x,RIG.bladeBase+bladeLen*frac,z);}
  function getWeaponHitboxScale(){ return clamp(Number(combatState.weaponHitboxScale) || 1, 1, 5); }
  function getWeaponHitZones(){
    const def=currentWeapon(), kind=def.kind, grp=combatState.attackGroup||'vertical'; const zones=[];
    const add=(id,label,type,from,to,r,damage,stagger=1,x=0,z=0,prefer='any')=>zones.push({id,label,type,from:createZonePoint(from,x,z),to:createZonePoint(to,x,z),radius:r,damage,stagger,prefer});
    if(kind==='rapier'){
      const tip = RAPIER_TIP_TUNING;
      add('rapierTip','Rapier tip','pierce',tip.from,tip.to,tip.radius,grp==='stab'?tip.damage:14,tip.stagger,0,0,'stab');
      add('rapierSide','Rapier side','weak',.20,.82,.07,grp==='stab'?6:5,.25,0,0,'swing');
      add('rapierGuard','Rapier guard','blunt',-.05,.04,.12,4,.20,0,0,'any');
    } else if(kind==='katana'){
      add('katanaKissaki','Katana kissaki','pierce',.88,1.06,.14,grp==='stab'?20:11,.76,0,0,'stab');
      add('katanaHa','Katana cutting edge','slice',.20,.94,.15,grp==='horizontal'?28:(grp==='vertical'?25:13),1.04,0,0,'swing');
      add('katanaTsuba','Tsuba / pommel','blunt',-.08,.06,.13,5,.26,0,0,'any');
    } else if(kind==='spear'){
      add('spearTip','Spear head','pierce',.84,1.08,.20,grp==='stab'?34:24,1.18,0,0,'any');
      add('spearShaft','Spear shaft','blunt',.12,.78,.11,8,.42,0,0,'any');
    } else if(kind==='hammer'){
      add('hammerHead','Hammer head','blunt',.84,1.02,.31,38,1.55,0,0,'any');
      add('hammerPick','Hammer pick','pierce',.90,1.03,.18,22,.95,.28,0,'swing');
      add('hammerShaft','Hammer shaft','blunt',.12,.76,.11,8,.38,0,0,'any');
    } else if(kind==='mace'){
      add('maceHead','Spiked mace head','hybrid',.78,1.04,.29,31,1.25,0,0,'any');
      add('maceHandle','Mace handle','blunt',.08,.70,.10,7,.35,0,0,'any');
    } else if(kind==='axe'){
      add('axeBit','Axe blade','slice',.76,1.00,.25,34,1.25,.20,0,'swing');
      add('axeSpike','Axe top spike','pierce',.93,1.08,.16,22,.85,0,0,'stab');
      add('axeShaft','Axe shaft','blunt',.10,.72,.10,7,.34,0,0,'any');
    } else {
      const heavy=(def.weightClass||'').includes('Heavy');
      add('bladeTip','Weapon tip','pierce',.86,1.08,.16,grp==='stab'?30:16,.92,0,0,'stab');
      add('bladeEdge','Cutting edge','slice',.18,.88,heavy?.17:.14,heavy?31:23,heavy?1.18:.85,0,0,'swing');
      add('guard','Guard / pommel','blunt',-.08,.05,.14,6,.28,0,0,'any');
    }
    zones.sort((a,b)=>{const score=z=>z.prefer===grp?3:(z.prefer==='swing'&&(grp==='vertical'||grp==='horizontal')?2:(z.prefer==='any'?1:0)); return score(b)-score(a) || b.damage-a.damage;});
    const hitboxScale = getWeaponHitboxScale();
    if(hitboxScale !== 1) zones.forEach(zone => { zone.radius *= hitboxScale; zone.hitboxScale = hitboxScale; });
    return zones;
  }
  function getZoneWorld(zone, prevMap){
    const a=weaponRoot.localToWorld(zone.from.clone()); const b=weaponRoot.localToWorld(zone.to.clone());
    const prev=prevMap.get(zone.id); prevMap.set(zone.id,{a:a.clone(),b:b.clone(),mid:a.clone().lerp(b,.5)});
    return {zone,a,b,prev,mid:a.clone().lerp(b,.5)};
  }

  /* ---- coordinate + tuning helpers --------------------------------------- */
  function setArrV(arr,i,v){arr[i*3]=v.x;arr[i*3+1]=v.y;arr[i*3+2]=v.z;}
  function setArrC(arr,i,f){arr[i*3]=combatTrailColor.r*f;arr[i*3+1]=combatTrailColor.g*f;arr[i*3+2]=combatTrailColor.b*f;}
  function swordQuat(tip,roll,out){out.setFromUnitVectors(THREE_UP,tip); qr.setFromAxisAngle(tip,roll); out.premultiply(qr); return out;}
  function getCombatScale(){ return clamp(Number(combatState.puppetScale || DEFAULT_COMBAT_SCALE), .5, 5.0); }
  function getCombatShoulderDrop(){ return clamp(Number(combatState.shoulderDrop ?? 0), 0, 4.0); }
  function getCombatFloorBlend(){ return clamp(Number(combatState.floorBlend ?? 0), 0, 1.0); }
  function combatToWarden(v,out=tmpV){const s=getCombatScale(), drop=getCombatShoulderDrop(); return out.set(COMBAT_ORIGIN.x+v.x*s, COMBAT_ORIGIN.y+v.y*s-drop, COMBAT_ORIGIN.z+v.z*s);}
  function getCombatPlaneCorrection(out=combatPlaneQ){
    const blend=getCombatFloorBlend();
    if(blend<=0.001) return out.identity();
    // Parent is actorVisual's presentation lean/facing plus the Warden body response.
    // Desired is facing yaw only; the floor tilt is already supplied by presentationRoot.
    combatParentQ.copy(api.actorVisual.quaternion).multiply(api.activeModel ? api.activeModel.quaternion : combatIdentityQ);
    combatDesiredQ.copy(api.yawQ);
    out.copy(combatParentQ).invert().multiply(combatDesiredQ);
    if(blend<0.999){ combatPlaneQBlend.copy(combatIdentityQ).slerp(out,blend); out.copy(combatPlaneQBlend); }
    return out;
  }
  function planePointAroundShoulders(v,anchor,q,out=v){ return out.copy(v).sub(anchor).applyQuaternion(q).add(anchor); }
  function currentWeapon(){const WEAPONS=api.WEAPONS; return WEAPONS[combatState.weapon] || WEAPONS.longsword;}
  function tuneNum(k){return Number(combatState.tune[k] ?? TUNE_DEFAULTS[k]);}

  /* ---- weapon lifecycle --------------------------------------------------- */
  function selectCombatWeapon(id){
    const WEAPONS=api.WEAPONS;
    id=normalizeStoneWeaponId(id);
    if(!WEAPONS[id]) return;
    combatState.weapon=id;
    combatState.tune=Object.assign({},TUNE_DEFAULTS,WEAPONS[id].tune||{});
    applyCombatWeaponTuning();
    hooks.onWeaponSelected?.();
    hooks.onWeaponUISync?.();
  }
  function applyCombatWeaponTuning(){
    const length=clamp(tuneNum('length'),0.45,2.45);
    RIG.bladeBase=BASE_RIG.bladeBase;
    RIG.bladeTip=BASE_RIG.bladeBase + BASE_BLADE_LEN*length;
    RIG.gripCenter=BASE_RIG.gripCenter;
    rebuildCombatWeaponMesh();
  }
  function attackGroupFor(name){if(ATTACK_GROUPS[name]) return name; return ATTACKS[name] ? (ATTACKS[name].group || name) : name;}
  function chooseAttack(name){
    const group=attackGroupFor(name), list=ATTACK_GROUPS[group];
    if(list){const idx=combatState.variantIndex[group]||0; const key=list[idx%list.length]; combatState.variantIndex[group]=(idx+1)%list.length; hooks.onVariantAdvance?.(); return {key,group};}
    if(ATTACKS[name]) return {key:name,group:ATTACKS[name].group||name};
    return null;
  }
  function startCombatAttack(key,group,labEvent=null){
    const att=ATTACKS[key]; if(!att) return;
    const linking=!!combatState.attack && haveRenderedPose;
    if(linking) poseCopy(lastRenderedPose,linkFromPose);
    linkBlendElapsed=linking ? 0 : -1;
    readyBlendElapsed=-1;
    const aim=hooks.resolveAttackFacing?.();
    if(aim){
      combatState.commitYaw=aim.angle;
      hooks.commitFacing?.(aim.angle);
    }
    combatState.attack=att; combatState.attackKey=key; combatState.attackGroup=group||att.group||key; combatState.last=combatState.attackGroup;
    combatState.lastAttackLabel=att.label;
    hooks.onAttackStart?.({ key, group: combatState.attackGroup, label: att.label, weapon: currentWeapon().label, labEvent });
    combatState.activeLabEvent=labEvent;
    combatState.t=0; combatState.fired=false; combatState.hitIds=new Set(); resetCombatTrail(combatState._lastTipScene || null);
    hooks.onAttackReset?.();
  }
  function triggerCombatAttack(name){
    const picked=chooseAttack(name); if(!picked) return;
    hooks.flashCombatButton?.(picked.group);
    if(!combatState.attack) startCombatAttack(picked.key,picked.group);
    else { combatState.pending=picked.key; combatState.pendingGroup=picked.group; }
  }

  function setReadyPose(pose){
    if(!pose) return IDLE;
    if(!combatState.attack && haveRenderedPose){ poseCopy(lastRenderedPose,readyFromPose); readyBlendElapsed=0; }
    setIdlePose(pose);
    return IDLE;
  }
  function getAttackPhaseIndex(att,t){if(!att) return -1; for(let i=0;i<att.phases.length;i++){if(t<=att.phases[i].t1) return i;} return att.phases.length-1;}
  function currentAttackTimeScale(att,t){
    const tune=combatState.tune, weightDelta=tune.weight-TUNE_DEFAULTS.weight, lengthDelta=tune.length-1;
    let scale=1 + lengthDelta*.36 + weightDelta*.78;
    const phase=getAttackPhaseIndex(att,t);
    if(phase===0) scale*=tune.windup; else if(phase>=att.phases.length-1) scale*=tune.recovery; else if(t>=att.contactAt) scale*=tune.follow;
    const mod=hooks.timeScaleModifier?.(att,t,phase);
    if(mod) scale*=mod;
    return clamp(scale,.32,3.1);
  }
  function shapePoseForWeapon(p){
    if(!combatState.attack) return p;
    const state=combatState, tune=state.tune;
    const frac=clamp(state.t/state.attack.total,0,1), contactT=state.attack.contactAt||.001;
    const pre=1-smoothstep(state.attack.contactAt,state.attack.contactAt+.08,state.t);
    const windupBack=1-smoothstep(contactT*.10,contactT*.96,state.t);
    const post=smoothstep(state.attack.contactAt,state.attack.total,state.t);
    const lengthDelta=tune.length-1, weightDelta=tune.weight-TUNE_DEFAULTS.weight, widthDelta=tune.swingWidth-1, chargePull=clamp(state.chargePull||0,0,1), pullTune=(tune.pullback ?? TUNE_DEFAULTS.pullback)*(1+chargePull*.85);
    const grp=(state.attack&&state.attack.group)||state.attackGroup||state.last, def=currentWeapon(), isWhip=def.kind==='whip';
    const pathScale=clamp(1+widthDelta*.58+lengthDelta*.18,.42,2.05), reachScale=clamp(1+widthDelta*.34+lengthDelta*.16,.48,1.85);
    const commit=clamp(1+widthDelta*.36+Math.max(-.35,weightDelta)*.46+Math.max(-.45,lengthDelta)*.18,.58,1.85);
    const followPush=post*((tune.follow-1)*.34+Math.max(0,weightDelta)*.34+Math.max(0,lengthDelta)*.16);
    p.hold.x=IDLE.hold.x+(p.hold.x-IDLE.hold.x)*(pathScale+followPush);
    p.hold.z=IDLE.hold.z+(p.hold.z-IDLE.hold.z)*(reachScale+followPush*.8);
    p.hold.y=IDLE.hold.y+(p.hold.y-IDLE.hold.y)*(1+Math.max(-.35,weightDelta)*.14);
    const sag=Math.max(-.25,weightDelta)*.075+Math.max(0,lengthDelta)*.035; p.hold.y-=Math.max(0,sag)*(.35+.65*Math.sin(Math.PI*frac));
    const weaponAnticipation=pullTune*windupBack*clamp(Math.max(0,lengthDelta)*.28+Math.max(0,weightDelta)*.18+Math.max(0,widthDelta)*.08,0,.55);
    const chargeAnticipation=windupBack*(chargePull*.18+chargePull*chargePull*.42);
    const anticipation=weaponAnticipation+chargeAnticipation;
    if(anticipation>0){const sideSign=grp==='horizontal'?Math.sign(p.hold.x||1):1; p.hold.z-=anticipation; p.hold.x+=sideSign*anticipation*.32; p.hold.y+=anticipation*(grp==='vertical'?.42:.22); p.twist+=sideSign*anticipation*.44; p.hipTwist+=sideSign*anticipation*.28; p.lean+=sideSign*anticipation*.18; p.pitch-=anticipation*(grp==='vertical'?.18:.08); p.roll+=sideSign*anticipation*.16; p.tip.z-=anticipation*.72; p.tip.y+=anticipation*(grp==='vertical'?.18:.06);}
    p.hold.z-=pre*Math.max(0,weightDelta)*.06;
    if(grp==='stab') p.hold.z+=Math.max(0,lengthDelta)*.16*smoothstep(.05,state.attack.contactAt,state.t);
    if(isWhip){const crack=smoothstep(contactT*.42,contactT,state.t)*(1-smoothstep(contactT+.09,contactT+.34,state.t)); const draw=windupBack*.18*(.7+tune.pullback*.35); p.hold.z-=draw; p.hold.y+=windupBack*.10; const forward=new THREE.Vector3((grp==='horizontal'?Math.sign(p.hold.x||1)*.10:0),.02,1).normalize(); p.tip.lerp(forward,.72*crack).normalize(); p.hold.z+=crack*.30; p.twist*=.72; p.hipTwist*=.70; p.lunge*=.78+crack*.28;}
    p.tip.x*=clamp(1+widthDelta*.44+followPush*.25,.5,2); p.tip.z*=clamp(1+widthDelta*.30+lengthDelta*.10+followPush*.20,.5,2); p.tip.y*=clamp(1-Math.max(0,widthDelta)*.08,.72,1.12); p.tip.normalize();
    p.twist*=commit; p.hipTwist*=commit; p.lean*=commit; p.pitch*=clamp(commit,.7,1.6); p.lunge*=clamp(1+Math.max(0,lengthDelta)*.18+Math.max(0,widthDelta)*.12,.75,1.35); p.lower*=clamp(1+Math.max(0,weightDelta)*.28,.8,1.45); p.roll+=post*Math.sign(p.roll||p.hold.x||1)*followPush*.20;
    return p;
  }
  function clearWeaponRoot(){ if(!weaponRoot) return; while(weaponRoot.children.length){ const c=weaponRoot.children.pop(); c.geometry&&c.geometry.dispose&&c.geometry.dispose(); } weaponParts={}; }
  function meshLocalBox(w,h,d,mat,jit=0,pos=[0,0,0]){const g=new THREE.BoxGeometry(w,h,d,1,1,1); if(jit) facet(g,jit); const m=new THREE.Mesh(g,mat); m.position.set(pos[0],pos[1],pos[2]); m.castShadow=m.receiveShadow=true; return m;}
  function meshLocalIco(r,mat,pos=[0,0,0]){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(r,0),mat); m.position.set(pos[0],pos[1],pos[2]); m.castShadow=m.receiveShadow=true; return m;}
  function addGrip(r=.022,len=.40){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,8),matLeather); m.position.y=-.14; m.castShadow=m.receiveShadow=true; weaponRoot.add(m); const pom=meshLocalIco(.045,matIron,[0,-.37,0]); weaponRoot.add(pom);}
  function addGuard(w=.34){weaponRoot.add(meshLocalBox(w,.045,.07,matBronze,.005,[0,RIG.bladeBase,0]));}
  function rebuildCombatWeaponMeshImpl(){
    if(!weaponRoot) return;
    clearWeaponRoot();
    const def=currentWeapon();
    activeWeaponKind=def.kind||'blade';
    const bladeLen=Math.max(.08,RIG.bladeTip-RIG.bladeBase), base=RIG.bladeBase;
    buildStoneWeaponMesh({
      THREE,
      weaponDef:def,
      weaponRoot,
      RIG,
      bladeLen,
      base,
      materials:{matSilver,matBronze,matGlow,matLeather,matIron},
      helpers:{addGrip,addGuard,meshLocalBox,meshLocalIco},
      weaponParts
    });
    updateWeaponDynamicVisual(0,0);
  }
  // Kept reassignable: LabAPI exposes a get/set pair so modules may wrap it.
  let rebuildCombatWeaponMesh = rebuildCombatWeaponMeshImpl;
  function updateWeaponDynamicVisual(time=0,dt=0){
    weaponBaseLocal.set(0,RIG.bladeBase,0); weaponTipLocal.set(0,RIG.bladeTip,0);
    const def=currentWeapon(), visualVariant=def.visualVariants?.[def.visualVariant];
    weaponParts.visualUpdate?.({
      THREE,
      weaponDef:def,
      visualVariant,
      weaponParts,
      combatState,
      RIG,
      weaponBaseLocal,
      weaponTipLocal,
      time,
      dt,
      helpers:{smoothstep,work}
    });
  }

  /* ---- rig attach + arm IK ------------------------------------------------ */
  function placeSegment(mesh,a,b,r=.055){
    const dir=tmpA.subVectors(b,a), len=dir.length(); if(len<1e-5) return; dir.normalize(); mesh.position.copy(a).addScaledVector(dir,len*.5); mesh.quaternion.setFromUnitVectors(THREE_UP,dir); mesh.scale.set(r,len,r);
  }
  function makeArmSegment(mat){const m=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,6),mat); m.castShadow=m.receiveShadow=true; return m;}
  function attachCombatToActiveModel(){
    const activeModel=api.activeModel;
    if(!activeModel) return;
    if(combatLayer) activeModel.remove(combatLayer);
    combatLayer=new THREE.Group(); activeModel.add(combatLayer);
    weaponRoot=new THREE.Group(); combatLayer.add(weaponRoot);
    rightArmA=makeArmSegment(matCoat); rightArmB=makeArmSegment(matCoat); leftArmA=makeArmSegment(matCoat); leftArmB=makeArmSegment(matCoat);
    rightHandProxy=meshLocalBox(.16,.14,.16,matIron,.008,[0,0,0]); leftHandProxy=meshLocalBox(.16,.14,.16,matIron,.008,[0,0,0]);
    combatLayer.add(rightArmA,rightArmB,leftArmA,leftArmB,rightHandProxy,leftHandProxy);
    driverDebug=new THREE.Group(); driverDebug.visible=false; combatLayer.add(driverDebug);
    for(let i=0;i<10;i++){driverDebug.add(new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),new THREE.MeshBasicMaterial({color:i<2?0xffd27a:0x8dd2ff,transparent:true,opacity:.8})));}
    const W = api.W;
    if(W){ if(W.sword) W.sword.visible=false; if(W.hook) W.hook.visible=false; }
    applyCombatWeaponTuning(); hooks.onWeaponUISync?.(); updateCombatArmVisibility();
  }
  function updateCombatArmVisibility(){
    const visible=!combatState.hideArms;
    [rightArmA,rightArmB,leftArmA,leftArmB,rightHandProxy,leftHandProxy].forEach(part=>{ if(part) part.visible=visible; });
  }

  /* ---- trail / sparks ------------------------------------------------------ */
  function resetCombatTrail(at=null){
    combatTrail.tipH.length=0; combatTrail.baseH.length=0; combatTrail.intensity=0; combatTrail.flash=0; haveCombatTip=false;
    if(at){ for(let i=0;i<combatTrail.N;i++){ setArrV(combatTrail.pos,i*2,at); setArrV(combatTrail.pos,i*2+1,at); setArrC(combatTrail.col,i*2,0); setArrC(combatTrail.col,i*2+1,0); } combatTrail.mesh.geometry.attributes.position.needsUpdate=true; combatTrail.mesh.geometry.attributes.color.needsUpdate=true; }
    combatTrail.mesh.visible=true;
  }
  function updateCombatTrail(tip,base,speed,dt){
    combatTrail.mesh.visible=true;
    const tr=combatTrail; tr.tipH.unshift(tip.clone()); tr.baseH.unshift(base.clone()); if(tr.tipH.length>tr.N){tr.tipH.pop(); tr.baseH.pop();} while(tr.tipH.length<tr.N){tr.tipH.push(tip.clone()); tr.baseH.push(base.clone());}
    const target=clamp((speed-2.0)/7.0,0,1)*combatState.tune.trailBoost; tr.intensity+=(target-tr.intensity)*Math.min(1,dt*18); tr.flash=Math.max(0,tr.flash-dt*3.2); const I=clamp(tr.intensity+tr.flash,0,1.75); const mid=new THREE.Vector3();
    for(let i=0;i<tr.N;i++){const age=i/(tr.N-1), a=tr.tipH[i], b=tr.baseH[i]; mid.addVectors(a,b).multiplyScalar(.5); const taper=age*.62; const A=a.clone().lerp(mid,taper), B=b.clone().lerp(mid,taper); setArrV(tr.pos,i*2,A); setArrV(tr.pos,i*2+1,B); const f=Math.pow(1-age,1.5)*I; setArrC(tr.col,i*2,f); setArrC(tr.col,i*2+1,f);} tr.mesh.geometry.attributes.position.needsUpdate=true; tr.mesh.geometry.attributes.color.needsUpdate=true;
  }
  function burstCombat(at){
    combatSparks.age=0; combatSparks.vel=[];
    for(let i=0;i<combatSparks.N;i++){const d=new THREE.Vector3(Math.random()*2-1,Math.random()*2-1,Math.random()*2-1).normalize().multiplyScalar(1.8+Math.random()*3.0); combatSparks.vel.push(d); setArrV(combatSparks.pos,i,at);} combatSparks.pts.geometry.attributes.position.needsUpdate=true;
  }
  function updateCombatSparks(dt){
    const sp=combatSparks; if(sp.age>=sp.life){sp.mat.opacity=0; return;} sp.age+=dt; const k=sp.age; for(let i=0;i<sp.N;i++){const v=sp.vel[i]; sp.pos[i*3]+=v.x*dt; sp.pos[i*3+1]+=v.y*dt-2.4*k*dt; sp.pos[i*3+2]+=v.z*dt;} sp.pts.geometry.attributes.position.needsUpdate=true; sp.mat.opacity=Math.max(0,1-sp.age/sp.life);
  }

  function shapeReadyLockPose(p){
    const k=clamp(combatState.readyLock||0,0,1);
    if(k<=0) return p;
    p.hold.x += .06*k;
    p.hold.y -= .24*k;
    p.hold.z -= .18*k;
    p.tip.lerp(tmpV.set(.16,.20,.98).normalize(), .72*k).normalize();
    p.roll += .42*k;
    p.pitch += .05*k;
    p.lean += .08*k;
    p.lower += .05*k;
    return p;
  }

  /* ---- per-frame pose + update --------------------------------------------- */
  function applyCombatPoseToWarden(p,dt,now,sway){
    const activeModel=api.activeModel;
    if(!combatLayer || !weaponRoot || !activeModel) return;
    const w=combatState.wobble; w.vel+=(-90*w.v-13*w.vel)*dt; w.v+=w.vel*dt;
    activeModel.position.set(p.hip.x*.16,3.05-p.lower*.18,p.lunge*.42 + p.hip.z*.10);
    activeModel.rotation.set(p.pitch*.05,p.hipTwist*.10,sway+p.lean*.12+w.v*.09);
    const W = api.W;
    if(W){
      W.bodyGroup.rotation.set(p.pitch*.28,p.twist*.38,p.lean*.34+w.v*.18);
      W.head.rotation.set(p.head.y*.28,p.head.x*.36,0);
      W.hat.rotation.set(p.pitch*.06,p.twist*.10,p.lean*.08);
    }
    const shoulderDrop=getCombatShoulderDrop();
    const shR=new THREE.Vector3(.72,1.20-shoulderDrop,.36), shL=new THREE.Vector3(-.72,1.20-shoulderDrop,.36);
    const shoulderMid=shR.clone().lerp(shL,.5);
    const planeQ=getCombatPlaneCorrection(combatPlaneQ);
    const weaponQ=new THREE.Quaternion();
    swordQuat(p.tip,p.roll+w.v*.35,swQ); weaponQ.copy(planeQ).multiply(swQ);
    gripOff.set(0,RIG.gripCenter,0).applyQuaternion(weaponQ).multiplyScalar(getCombatScale());
    const holdRaw=combatToWarden(p.hold,new THREE.Vector3());
    const holdW=planePointAroundShoulders(holdRaw,shoulderMid,planeQ,new THREE.Vector3());
    weaponRoot.position.copy(holdW).sub(gripOff); weaponRoot.quaternion.copy(weaponQ); weaponRoot.scale.setScalar(getCombatScale());
    updateWeaponDynamicVisual(now,dt); weaponRoot.updateWorldMatrix(true,false);
    const rightLocal=RIG.handR.clone().applyQuaternion(weaponQ).multiplyScalar(getCombatScale()).add(weaponRoot.position);
    const leftLocal=RIG.handL.clone().applyQuaternion(weaponQ).multiplyScalar(getCombatScale()).add(weaponRoot.position);
    const eR=shR.clone().lerp(rightLocal,.55).add(new THREE.Vector3(.18,-.18,.05));
    const eL=shL.clone().lerp(leftLocal,.55).add(new THREE.Vector3(-.18,-.18,.05));
    placeSegment(rightArmA,shR,eR,.070); placeSegment(rightArmB,eR,rightLocal,.060); placeSegment(leftArmA,shL,eL,.070); placeSegment(leftArmB,eL,leftLocal,.060);
    rightHandProxy.position.copy(rightLocal); rightHandProxy.quaternion.copy(weaponQ); leftHandProxy.position.copy(leftLocal); leftHandProxy.quaternion.copy(weaponQ); updateCombatArmVisibility();
    weaponBaseLocal.set(0,RIG.bladeBase,0); const tipScene=weaponRoot.localToWorld(weaponTipLocal.clone()); const baseScene=weaponRoot.localToWorld(weaponBaseLocal.clone());
    let tipSpeed=0; if(haveCombatTip && dt>0) tipSpeed=prevCombatTip.distanceTo(tipScene)/dt; prevCombatTip.copy(tipScene); haveCombatTip=true; updateCombatTrail(tipScene,baseScene,tipSpeed,dt); hooks.detectHits?.(dt, tipScene, baseScene, tipSpeed);
    if(driverDebug){
      driverDebug.visible=combatState.showDriver;
      const rawTip=combatToWarden(new THREE.Vector3(0,RIG.bladeTip,0),new THREE.Vector3());
      const rawBase=combatToWarden(new THREE.Vector3(0,RIG.bladeBase,0),new THREE.Vector3());
      const points=[holdW,rightLocal,leftLocal,shR,shL,planePointAroundShoulders(rawTip,shoulderMid,planeQ,new THREE.Vector3()),planePointAroundShoulders(rawBase,shoulderMid,planeQ,new THREE.Vector3()),shoulderMid];
      driverDebug.children.forEach((s,i)=>{if(points[i]) s.position.copy(points[i]);});
    }
    combatState._lastTipScene = tipScene;
  }
  function completeCombatAttack(){
    hooks.onAttackComplete?.();
    if(combatState.pending){
      const key=combatState.pending, group=combatState.pendingGroup, event=combatState.pendingLabEvent||null;
      combatState.pending=null; combatState.pendingGroup=null; combatState.pendingLabEvent=null;
      startCombatAttack(key,group,event);
    } else {
      combatState.attack=null; combatState.t=0; linkBlendElapsed=-1;
      hooks.onAttackChainIdle?.();
      if(combatState.loop) setTimeout(()=>triggerCombatAttack(combatState.last),80);
    }
  }
  function updateCombat(dt,now,sway,rawDt=dt){
    // hitStop drains on rawDt: under a global hitstop (hit-feel.js) dt is already
    // near-frozen, and draining by it would stretch this micro-stop ~28x.
    let adt=dt; if(combatState.hitStop>0){combatState.hitStop-=rawDt; adt*=.06;}
    const activeAttack=combatState.attack;
    if(activeAttack){
      const timeScale=currentAttackTimeScale(activeAttack,combatState.t); combatState.t += adt / timeScale;
      if(!combatState.fired && combatState.t>=activeAttack.contactAt){combatState.fired=true; const impactScale=combatState.impactScale ?? 1; combatState.hitStop=.04*combatState.tune.impact*impactScale; combatTrail.flash=.9*combatState.tune.impact*impactScale; combatState.wobble.vel+=(Math.random()<.5?-1:1)*5.8*combatState.tune.impact*impactScale; if(combatState._lastTipScene) burstCombat(combatState._lastTipScene);}
    }
    let p = activeAttack ? shapePoseForWeapon(sampleAttack(activeAttack,combatState.t,work)) : shapeReadyLockPose(poseLerp(IDLE,IDLE,0,work));
    if(activeAttack && linkBlendElapsed>=0){
      // Keep the first frame of the incoming attack exactly on the captured
      // outgoing pose, then blend through the new windup on following frames.
      const e=smoothstep(0,LINK_BLEND_DURATION,linkBlendElapsed);
      p=poseLerp(linkFromPose,p,e,linkWorkPose);
      if(e>=.999) linkBlendElapsed=-1;
      else linkBlendElapsed+=dt;
    } else if(!activeAttack && readyBlendElapsed>=0){
      readyBlendElapsed+=dt;
      const e=smoothstep(0,READY_BLEND_DURATION,readyBlendElapsed);
      p=poseLerp(readyFromPose,p,e,linkWorkPose);
      if(e>=.999) readyBlendElapsed=-1;
    }
    applyCombatPoseToWarden(p,dt,now,sway);
    poseCopy(p,lastRenderedPose); haveRenderedPose=true;
    // A buffered follow-up takes over at the authored recovery boundary. With
    // no buffered input, the complete recovery still plays into the guard.
    if(activeAttack && combatState.attack===activeAttack){
      if(shouldStartBufferedFollowup(activeAttack,combatState.t,combatState.pending)) completeCombatAttack();
      else if(combatState.t>=activeAttack.total) completeCombatAttack();
    }
    updateCombatSparks(dt);
  }
  function combatMovePenalty(){ if(!combatState.attack) return 1; return clamp(1 - combatState.tune.weight*.38, .52, .95); }

  return {
    // state + constants
    combatState, RIG, LUNGE, BASE_RIG, BASE_BLADE_LEN, TUNE_DEFAULTS,
    ATTACKS, IDLE, work, Ease, smoothstep, P, poseLerp, sampleAttack,
    // live internals
    get weaponRoot(){ return weaponRoot; },
    get combatLayer(){ return combatLayer; },
    get driverDebug(){ return driverDebug; },
    get activeWeaponKind(){ return activeWeaponKind; }, set activeWeaponKind(v){ activeWeaponKind = v; },
    get rebuildCombatWeaponMesh(){ return rebuildCombatWeaponMesh; }, set rebuildCombatWeaponMesh(fn){ rebuildCombatWeaponMesh = fn; },
    // helpers
    currentWeapon, tuneNum, getCombatScale, getCombatShoulderDrop, getCombatFloorBlend,
    combatToWarden, getWeaponHitboxScale, getWeaponHitZones, getZoneWorld, pointSegmentDistance,
    // lifecycle + machine
    selectCombatWeapon, applyCombatWeaponTuning, attackGroupFor, chooseAttack, setReadyPose,
    startCombatAttack, triggerCombatAttack, getAttackPhaseIndex, currentAttackTimeScale,
    clearWeaponRoot, updateWeaponDynamicVisual, attachCombatToActiveModel, updateCombatArmVisibility,
    resetCombatTrail, updateCombat, combatMovePenalty
  };
}

// Local integration wrapper for the maze-combat Pilebunker card.
// The combat core above is the validated Hammerist War Hammer implementation;
// this layer adds the ability without rewriting or destabilising the sword puppet.

import { getWeaponDamageMultiplier } from './combat-balance.js';
import { createPowBunkerAbility, installPowBunkerTuningPanel } from './powbunker-ability.js';
import { installArenaEnemyRegistryProbe, getArenaEnemies, getArenaEnemySystem } from './arena-enemy-registry.js';
import { isVerticalAimGroup, selectVerticalAimTarget, correctionForSegmentY, verticalAimPhaseWeight } from './vertical-melee-aim.js';
import { createPilebunkerCombatEffect } from './pilebunker-combat-effect.js';

const PILEBUNKER_GAME_DEFAULTS_SCHEMA=1;
const PILEBUNKER_GAME_DEFAULTS_STORAGE='arena.pilebunker.gameDefaultsSchema';
const PILEBUNKER_SECTION_STORAGE='stoneWandererSettings.v1.arena.section.powbunker';
const PILEBUNKER_EFFECT_MAX=Object.freeze({
  pullRadius:14,
  pullStrength:26,
  compressionDistance:5,
  frontReach:14,
  primaryDamage:260,
  primaryStun:5,
  primaryHitRadius:7,
  secondaryDamage:120,
  secondaryRadius:12,
  secondaryKnock:26,
  secondaryStun:1.5,
  eliteControl:1,
  aimMoveMultiplier:.60,
});

function needsPilebunkerGameDefaults(){
  try{return Number(localStorage.getItem(PILEBUNKER_GAME_DEFAULTS_STORAGE))!==PILEBUNKER_GAME_DEFAULTS_SCHEMA;}
  catch(_){return true;}
}
function markPilebunkerGameDefaultsApplied(){
  try{localStorage.setItem(PILEBUNKER_GAME_DEFAULTS_STORAGE,String(PILEBUNKER_GAME_DEFAULTS_SCHEMA));}catch(_){}
}
function closePilebunkerSectionForNextPanelInit(){
  // The arena's accordion reads this after installPlayerCombat returns. Writing
  // it on every page load means the Pilebunker field always starts closed, but
  // the player can still open and use it normally during the current session.
  try{localStorage.setItem(PILEBUNKER_SECTION_STORAGE,'true');}catch(_){}
}

function installPilebunkerPlayerCombat(api){
  const PC=installCorePlayerCombat(api);
  const arenaPage=/(?:^|\/)combat-arena\.html$/i.test(location.pathname)||/HEX MAZE COMBAT/i.test(document.title);
  if(!arenaPage)return PC;

  const {THREE}=api;
  const UP=new THREE.Vector3(0,1,0),shoulder=new THREE.Vector3(),localPoint=new THREE.Vector3(),worldTip=new THREE.Vector3(),worldBase=new THREE.Vector3();
  const playerWorld=new THREE.Vector3(),playerForward=new THREE.Vector3(0,0,1),identityQ=new THREE.Quaternion();
  const applyGameDefaults=needsPilebunkerGameDefaults();
  const ability=createPowBunkerAbility({THREE,scene:api.scene});
  if(applyGameDefaults){ability.setSize(.300);ability.setArmHeight(3);ability.setWeaponMode('right');}
  installPowBunkerTuningPanel(ability);
  const tuningNote=document.querySelector('#body-powbunker > .ptitle');
  if(tuningNote)tuningNote.textContent='SMASH 64 · SIZE 0.300 · ARM HEIGHT 3.00 · RIGHT-HAND CARRY · APPROVED LEFT-HAND PILEBUNKER VISUAL';
  closePilebunkerSectionForNextPanelInit();
  installArenaEnemyRegistryProbe();

  const original={attach:PC.attachCombatToActiveModel,update:PC.updateCombat,start:PC.startCombatAttack,trigger:PC.triggerCombatAttack,zones:PC.getWeaponHitZones,movePenalty:PC.combatMovePenalty};
  let abilityHitSpec=null;
  const abilityBlocker={__powBunker:true,total:999,contactAt:1,comboAt:999,phases:[{t0:0,t1:999}],group:'ability',label:'PILEBUNKER'};

  function getPlayerTransform(){
    const root=api.actorVisual?.parent;
    if(root?.getWorldPosition)root.getWorldPosition(playerWorld);else playerWorld.set(0,0,0);
    playerForward.set(0,0,1).applyQuaternion(api.yawQ||identityQ);playerForward.y=0;if(playerForward.lengthSq()<1e-6)playerForward.set(0,0,1);playerForward.normalize();
    return{x:playerWorld.x,z:playerWorld.z,forwardX:playerForward.x,forwardZ:playerForward.z};
  }

  /* restrained vertical aim assist for horizontal slices and thrusts */
  const verticalAim={attackKey:null,group:null,lastT:0,target:null,targetY:0,current:0,desired:0};
  const aimA=new THREE.Vector3(),aimB=new THREE.Vector3(),aimShR=new THREE.Vector3(),aimShL=new THREE.Vector3(),aimER=new THREE.Vector3(),aimEL=new THREE.Vector3(),aimDir=new THREE.Vector3(),aimRightElbowOffset=new THREE.Vector3(.18,-.18,.05),aimLeftElbowOffset=new THREE.Vector3(-.18,-.18,.05);
  function resetVerticalAim(){verticalAim.attackKey=null;verticalAim.group=null;verticalAim.lastT=0;verticalAim.target=null;verticalAim.targetY=0;verticalAim.current=0;verticalAim.desired=0;}
  function arenaEnemyHeightScale(){try{return Math.max(.01,Number(getArenaEnemySystem().heightScale)||1);}catch(_){return 1;}}
  function acquireVerticalAimTarget(){
    const state=PC.combatState,group=state.attackGroup;
    verticalAim.attackKey=state.attackKey;verticalAim.group=group;verticalAim.lastT=state.t||0;verticalAim.target=null;verticalAim.targetY=0;verticalAim.current=0;verticalAim.desired=0;
    if(!state.attack||!isVerticalAimGroup(group)||ability.active)return;
    const player=getPlayerTransform();
    const picked=selectVerticalAimTarget({enemies:getArenaEnemies(),playerX:player.x,playerZ:player.z,committedYaw:state.commitYaw,heightScale:arenaEnemyHeightScale()});
    if(picked){verticalAim.target=picked.enemy;verticalAim.targetY=picked.targetY;}
  }
  function syncVerticalAimTarget(){
    const state=PC.combatState;
    if(!state.attack||!isVerticalAimGroup(state.attackGroup)||ability.active){if(verticalAim.attackKey!==null)resetVerticalAim();return;}
    const restarted=state.attackKey!==verticalAim.attackKey||state.attackGroup!==verticalAim.group||(state.t||0)+1e-4<verticalAim.lastT;
    if(restarted)acquireVerticalAimTarget();else verticalAim.lastT=state.t||0;
  }
  function verticalAimOffset(){
    const state=PC.combatState;
    if(!verticalAim.target||!state.attack||!isVerticalAimGroup(state.attackGroup))return 0;
    return verticalAim.current*verticalAimPhaseWeight({t:state.t,contactAt:state.attack.contactAt,total:state.attack.total});
  }
  function updateVerticalAimDesired(rawDt){
    const root=PC.weaponRoot,state=PC.combatState;
    if(!verticalAim.target||!root||!state.attack||!isVerticalAimGroup(state.attackGroup)){verticalAim.desired=0;verticalAim.current+=(0-verticalAim.current)*Math.min(1,Math.max(0,rawDt)*14);return;}
    if(verticalAim.target.hp<=0){verticalAim.target=null;verticalAim.desired=0;verticalAim.current=0;return;}
    root.updateWorldMatrix(true,false);
    const zones=original.zones();const zone=zones&&zones[0];
    if(!zone)return;
    aimA.copy(zone.from);aimB.copy(zone.to);root.localToWorld(aimA);root.localToWorld(aimB);
    const cap=state.attackGroup==='stab'?.65:.75;
    verticalAim.desired=correctionForSegmentY(verticalAim.targetY,aimA.y,aimB.y,cap);
    verticalAim.current+=(verticalAim.desired-verticalAim.current)*Math.min(1,Math.max(0,rawDt)*12);
  }
  function placeAimSegment(mesh,a,b,r){
    if(!mesh)return;aimDir.subVectors(b,a);const len=aimDir.length();if(len<1e-5)return;aimDir.normalize();mesh.position.copy(a).addScaledVector(aimDir,len*.5);mesh.quaternion.setFromUnitVectors(UP,aimDir);mesh.scale.set(r,len,r);
  }
  function applyVerticalAimVisual(offset){
    if(Math.abs(offset)<1e-4)return;
    const layer=PC.combatLayer,root=PC.weaponRoot;if(!layer||!root)return;
    const i=layer.children.indexOf(root);if(i<0)return;const rightArmA=layer.children[i+1],rightArmB=layer.children[i+2],leftArmA=layer.children[i+3],leftArmB=layer.children[i+4],rightHand=layer.children[i+5],leftHand=layer.children[i+6];
    root.position.y+=offset;
    if(!rightHand||!leftHand){root.updateWorldMatrix(true,false);return;}
    rightHand.position.y+=offset;leftHand.position.y+=offset;
    const drop=PC.getCombatShoulderDrop();aimShR.set(.72,1.20-drop,.36);aimShL.set(-.72,1.20-drop,.36);
    aimER.copy(aimShR).lerp(rightHand.position,.55).add(aimRightElbowOffset);
    aimEL.copy(aimShL).lerp(leftHand.position,.55).add(aimLeftElbowOffset);
    placeAimSegment(rightArmA,aimShR,aimER,.070);placeAimSegment(rightArmB,aimER,rightHand.position,.060);placeAimSegment(leftArmA,aimShL,aimEL,.070);placeAimSegment(leftArmB,aimEL,leftHand.position,.060);
    root.updateWorldMatrix(true,false);
  }

  const combatEffect=createPilebunkerCombatEffect({THREE,scene:api.scene,getEnemies:getArenaEnemies,getPlayer:getPlayerTransform,hitEnemy:hitArenaEnemy});
  if(applyGameDefaults){for(const [key,value] of Object.entries(PILEBUNKER_EFFECT_MAX))combatEffect.setTuning(key,value);markPilebunkerGameDefaultsApplied();}
  combatEffect.installPanel();

  /* guided Pilebunker aim: movement-stick direction, retained when centred */
  const guidedAim={active:false,yaw:0,lastRoot:new THREE.Vector3(),currentRoot:new THREE.Vector3(),keys:new Set()};
  const wrapPi=a=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;};
  addEventListener('keydown',event=>guidedAim.keys.add(event.key.toLowerCase()));
  addEventListener('keyup',event=>guidedAim.keys.delete(event.key.toLowerCase()));
  function beginGuidedAim(){
    playerForward.set(0,0,1).applyQuaternion(api.yawQ||identityQ);playerForward.y=0;if(playerForward.lengthSq()<1e-6)playerForward.set(0,0,1);playerForward.normalize();
    guidedAim.yaw=Math.atan2(playerForward.x,playerForward.z);guidedAim.active=true;
    const root=api.actorVisual?.parent;if(root?.getWorldPosition)root.getWorldPosition(guidedAim.lastRoot);else guidedAim.lastRoot.set(0,0,0);
  }
  function readAimInput(){
    let x=0,z=0;
    const gp=navigator.getGamepads?.()[0];
    if(gp){const dz=v=>Math.abs(v)>.16?v:0;x=dz(gp.axes[0]||0);z=dz(gp.axes[1]||0);}
    if(Math.hypot(x,z)<.16){
      if(guidedAim.keys.has('a')||guidedAim.keys.has('arrowleft'))x-=1;
      if(guidedAim.keys.has('d')||guidedAim.keys.has('arrowright'))x+=1;
      if(guidedAim.keys.has('w')||guidedAim.keys.has('arrowup'))z-=1;
      if(guidedAim.keys.has('s')||guidedAim.keys.has('arrowdown'))z+=1;
    }
    const root=api.actorVisual?.parent;
    if(root?.getWorldPosition){
      root.getWorldPosition(guidedAim.currentRoot);
      const dx=guidedAim.currentRoot.x-guidedAim.lastRoot.x,dz=guidedAim.currentRoot.z-guidedAim.lastRoot.z;
      guidedAim.lastRoot.copy(guidedAim.currentRoot);
      if(Math.hypot(x,z)<.16&&Math.hypot(dx,dz)>.0025){x=dx;z=dz;}
    }
    const length=Math.hypot(x,z);return length>.12?{x:x/length,z:z/length}:null;
  }
  function updateGuidedAim(rawDt){
    if(!ability.active||combatEffect.aimMode!=='guided'){guidedAim.active=false;return;}
    if(!guidedAim.active)beginGuidedAim();
    const input=readAimInput();
    if(input){
      const target=Math.atan2(input.x,input.z),turn=Math.min(1,Math.max(0,rawDt)*11);
      guidedAim.yaw=wrapPi(guidedAim.yaw+wrapPi(target-guidedAim.yaw)*turn);
    }
    api.yawQ?.setFromAxisAngle(UP,guidedAim.yaw);
    if(api.actorVisual&&api.yawQ)api.actorVisual.quaternion.copy(api.yawQ);
  }
  function endGuidedAim(){guidedAim.active=false;}

  /* optional weapon presentation while the card resolves */
  const carryHold=new THREE.Vector3(),carryTip=new THREE.Vector3(),carrySwordQ=new THREE.Quaternion(),carryRollQ=new THREE.Quaternion(),carryPlaneQ=new THREE.Quaternion(),carryPlaneBlendQ=new THREE.Quaternion(),carryParentQ=new THREE.Quaternion(),carryDesiredQ=new THREE.Quaternion(),carryIdentityQ=new THREE.Quaternion(),carryTargetQ=new THREE.Quaternion(),carryGripOff=new THREE.Vector3(),carryHoldRaw=new THREE.Vector3(),carryHoldW=new THREE.Vector3(),carryShoulderMid=new THREE.Vector3(),carryTargetPos=new THREE.Vector3();
  const smooth01=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
  function presentationBlend(){const p=ability.progress;return smooth01(p/.10)*(1-smooth01((p-.80)/.20));}
  function applyAbilityWeaponPresentation(){
    const root=PC.weaponRoot;if(!root)return;
    if(!ability.active){root.visible=true;return;}
    const mode=ability.tuning.weaponMode;if(mode==='hidden'){root.visible=false;return;}root.visible=true;if(mode!=='left'&&mode!=='right')return;
    const side=mode==='left'?-1:1;carryHold.set(.48*side,.72,-.10);carryTip.set(.18*side,-.28,-.94).normalize();const carryRoll=1.08*side;
    const activeModel=api.activeModel;carryParentQ.copy(api.actorVisual?.quaternion||carryIdentityQ).multiply(activeModel?.quaternion||carryIdentityQ);carryDesiredQ.copy(api.yawQ||carryIdentityQ);carryPlaneQ.copy(carryParentQ).invert().multiply(carryDesiredQ);
    const floorBlend=PC.getCombatFloorBlend();if(floorBlend<.999){carryPlaneBlendQ.copy(carryIdentityQ).slerp(carryPlaneQ,floorBlend);carryPlaneQ.copy(carryPlaneBlendQ);}
    carrySwordQ.setFromUnitVectors(UP,carryTip);carryRollQ.setFromAxisAngle(carryTip,carryRoll);carrySwordQ.premultiply(carryRollQ);carryTargetQ.copy(carryPlaneQ).multiply(carrySwordQ);
    const drop=PC.getCombatShoulderDrop();carryShoulderMid.set(0,1.20-drop,.36);PC.combatToWarden(carryHold,carryHoldRaw);carryHoldW.copy(carryHoldRaw).sub(carryShoulderMid).applyQuaternion(carryPlaneQ).add(carryShoulderMid);carryGripOff.set(0,PC.RIG.gripCenter,0).applyQuaternion(carryTargetQ).multiplyScalar(PC.getCombatScale());carryTargetPos.copy(carryHoldW).sub(carryGripOff);
    const k=presentationBlend();root.position.lerp(carryTargetPos,k);root.quaternion.slerp(carryTargetQ,k);root.updateWorldMatrix(true,false);
  }

  function canPlay(){return!!api.activeModel&&!ability.active&&!PC.combatState.attack;}
  window.__POWBUNKER_CAN_PLAY__=canPlay;window.__POWBUNKER=ability;window.__PILEBUNKER_EFFECT__=combatEffect;
  function ensureAttached(){const parent=api.actorVisual;if(parent)ability.attach(parent);}
  PC.attachCombatToActiveModel=function(){const out=original.attach();ensureAttached();return out;};
  PC.startCombatAttack=function(...args){if(ability.active)return false;return original.start(...args);};
  PC.triggerCombatAttack=function(...args){if(ability.active)return false;return original.trigger(...args);};
  PC.combatMovePenalty=function(){if(ability.active)return combatEffect.aimMode==='guided'?THREE.MathUtils.clamp(combatEffect.tuning.aimMoveMultiplier,.05,.8):.34;return original.movePenalty();};

  PC.getWeaponHitZones=function(){
    if(!abilityHitSpec)return original.zones();
    const weaponDef=PC.currentWeapon(),common={weaponId:PC.combatState.weapon,weaponDef,attackKey:'vertical',attackGroup:'vertical',hitType:'blunt'};
    const zoneId=abilityHitSpec.role==='primary'?'pilebunkerPrimary':'pilebunkerSecondary',mult=getWeaponDamageMultiplier({...common,zoneId}),damage=abilityHitSpec.damage/Math.max(.001,mult*1.18);
    return[{id:zoneId,label:abilityHitSpec.role==='primary'?'Pilebunker One on One':'Pilebunker detonation',type:'blunt',from:new THREE.Vector3(0,-1.25,0),to:new THREE.Vector3(0,1.25,0),radius:abilityHitSpec.radius,damage,stagger:0,prefer:'any'}];
  };

  function hitArenaEnemy(enemy,options={}){
    const weaponRoot=PC.weaponRoot,parent=weaponRoot?.parent,enemies=getArenaEnemies();if(!enemy||enemy.hp<=0||!weaponRoot||!parent||!api.hooks?.detectHits)return false;
    const point=options.point?.isVector3?options.point:new THREE.Vector3(enemy.x,Math.max(.8,(enemy.height||2)*.48),enemy.z),motion=options.motion||{x:0,z:1},length=Math.hypot(motion.x||0,motion.z||0)||1,mx=(motion.x||0)/length,mz=(motion.z||0)/length,previousStun=enemy.stunned||0;
    const old={position:weaponRoot.position.clone(),quaternion:weaponRoot.quaternion.clone(),scale:weaponRoot.scale.clone(),visible:weaponRoot.visible,attack:PC.combatState.attack,attackKey:PC.combatState.attackKey,attackGroup:PC.combatState.attackGroup,weapon:PC.combatState.weapon,hitIds:PC.combatState.hitIds,singleTargetEnemy:PC.combatState.singleTargetEnemy,fired:PC.combatState.fired};
    let landed=false;
    try{
      parent.updateMatrixWorld(true);localPoint.copy(point);parent.worldToLocal(localPoint);weaponRoot.visible=false;weaponRoot.position.copy(localPoint);weaponRoot.quaternion.identity();weaponRoot.scale.setScalar(1);weaponRoot.updateMatrixWorld(true);
      abilityHitSpec={damage:Number(options.damage)||1,role:options.role||'secondary',radius:Math.max(2.4,(enemy.radius||1)*2.25)};PC.combatState.weapon='dagger';PC.combatState.attack={total:.01,contactAt:0,comboAt:0,phases:[{t0:0,t1:.01}]};PC.combatState.attackKey='vertical';PC.combatState.attackGroup='vertical';PC.combatState.hitIds=new Set(enemies.filter(candidate=>candidate!==enemy));PC.combatState.singleTargetEnemy=enemy;PC.combatState.fired=true;
      worldTip.copy(point).add(new THREE.Vector3(mx,0,mz));worldBase.copy(point).add(new THREE.Vector3(-mx,0,-mz));api.hooks.detectHits(.016,worldTip,worldBase,42);landed=PC.combatState.hitIds.has(enemy);
      if(landed&&enemy.hp>0){enemy.stunned=Math.max(previousStun,Number(options.stun)||0);const knock=Number(options.knock)||0;enemy.knockX=(enemy.knockX||0)+mx*knock;enemy.knockZ=(enemy.knockZ||0)+mz*knock;}
    }finally{
      abilityHitSpec=null;PC.combatState.attack=old.attack;PC.combatState.attackKey=old.attackKey;PC.combatState.attackGroup=old.attackGroup;PC.combatState.weapon=old.weapon;PC.combatState.hitIds=old.hitIds;PC.combatState.singleTargetEnemy=old.singleTargetEnemy;PC.combatState.fired=old.fired;weaponRoot.position.copy(old.position);weaponRoot.quaternion.copy(old.quaternion);weaponRoot.scale.copy(old.scale);weaponRoot.visible=old.visible;weaponRoot.updateMatrixWorld(true);
    }
    return landed;
  }

  function playFromCard(){
    if(!canPlay())return false;ensureAttached();if(PC.weaponRoot)PC.weaponRoot.visible=true;PC.combatState.pending=null;PC.combatState.pendingGroup=null;PC.combatState.readyLock=0;
    const started=ability.start();
    if(started){combatEffect.start();if(combatEffect.aimMode==='guided')beginGuidedAim();PC.combatState.attack=abilityBlocker;PC.combatState.attackKey='powBunker';PC.combatState.attackGroup='ability';PC.combatState.t=0;PC.combatState.fired=true;PC.combatState.hitIds=new Set();window.dispatchEvent(new CustomEvent('powbunker:started'));}
    return started;
  }
  window.addEventListener('powbunker:play',playFromCard);

  PC.updateCombat=function(dt,now,sway,rawDt=dt){
    const state=PC.combatState,wasAbilityActive=ability.active,layer=PC.combatLayer;
    if(wasAbilityActive){state.attack=null;state.pending=null;state.pendingGroup=null;state.pendingLabEvent=null;}
    syncVerticalAimTarget();
    const frameAimOffset=wasAbilityActive?0:verticalAimOffset();
    if(layer)layer.position.y=frameAimOffset;
    const out=original.update(dt,now,sway,rawDt);
    if(layer){layer.position.y=0;layer.updateWorldMatrix(true,true);}
    if(wasAbilityActive){state.attack=abilityBlocker;state.attackKey='powBunker';state.attackGroup='ability';state.t=0;state.fired=true;state.hitIds||=new Set();}
    else{syncVerticalAimTarget();updateVerticalAimDesired(rawDt);if(state.attack)applyVerticalAimVisual(frameAimOffset);}
    ensureAttached();if(ability.active)updateGuidedAim(rawDt);
    const model=api.activeModel,actorVisual=api.actorVisual;
    if(model&&actorVisual){shoulder.set(.72,1.20-PC.getCombatShoulderDrop(),.36);model.updateMatrixWorld(true);model.localToWorld(shoulder);actorVisual.updateMatrixWorld(true);actorVisual.worldToLocal(shoulder);ability.update(dt,{anchor:shoulder,time:now,rawDt});applyAbilityWeaponPresentation();ability.applyHostPose(model,api.W);}
    else{ability.update(dt,{time:now,rawDt});applyAbilityWeaponPresentation();}
    if(ability.active)combatEffect.update({phase:ability.phase,progress:ability.progress,dt,rawDt});
    const ev=ability.consumeEvents();
    if(ev.slam){state.hitStop=Math.max(state.hitStop,.07*1.35);state.wobble.vel+=(Math.random()<.5?-1:1)*7.4;}
    if(ev.hit){const result=combatEffect.impact(ev.hit),landed=!!result.landed;ability.impactFeedback(ev.hit,landed);if(landed){state.hitStop=Math.max(state.hitStop,.115);state.wobble.vel+=(Math.random()<.5?-1:1)*10.5;}}
    if(ev.finished){combatEffect.finish();endGuidedAim();if(PC.weaponRoot)PC.weaponRoot.visible=true;state.attack=null;state.attackKey=null;state.attackGroup='vertical';state.t=0;state.fired=false;state.pending=null;state.pendingGroup=null;state.pendingLabEvent=null;window.dispatchEvent(new CustomEvent('powbunker:finished'));}
    return out;
  };

  Object.defineProperty(PC,'powBunkerAbility',{value:ability,enumerable:true});
  Object.defineProperty(PC,'pilebunkerCombatEffect',{value:combatEffect,enumerable:true});
  return PC;
}

// Local arena integration layer: the combat core and Pilebunker wrapper above are
// kept in this module so every relative import resolves to the working tree.

import { installBasicDashRuntime } from './basic-dash.js';
import { installDashMagicJet } from './dash-magic-jet.js';
import { installDashJetPanel } from './dash-magic-jet-panel.js';
import { installCombatCardEffects } from './combat-card-effects.js';
import { installWizardArcanaRuntime } from './wizard-arcana-runtime.js';
import { installWizardFlameStrikeRuntime } from './wizard-flame-strike-runtime.js';
import { installWizardWindSlashRuntime } from './wizard-wind-slash-runtime.js';
import { installWizardAirBasicsRuntime } from './wizard-air-basics-runtime.js';
import { installWizardNextSourceRuntime } from './wizard-next-source-runtime.js';
import { installWizardArcanaDamageScaler } from './wizard-arcana-damage-scaler.js';
import { installEnemyLabArcanaControlsHotfix } from './enemy-lab-arcana-controls-hotfix.js';

export function installPlayerCombat(api){
  const PC=installPilebunkerPlayerCombat(api);
  const arenaPage=/(?:^|\/)combat-arena\.html$/i.test(location.pathname)||/HEX MAZE COMBAT/i.test(document.title);
  if(!arenaPage)return PC;

  const {THREE}=api;
  const playerWorld=new THREE.Vector3();
  const playerForward=new THREE.Vector3(0,0,1);
  const identityQ=new THREE.Quaternion();
  const basicDashRuntime=installBasicDashRuntime(api);
  const dashMagicJet=installDashMagicJet({
    THREE,scene:api.scene,
    getDashState:()=>basicDashRuntime.state,
    getMazeSegments:()=>window.__arena?.mazeWorld?.getCollisionSegments?.()||[],
    getRoomKey:()=>window.__arena?.activeRoomId??null,
    getInterrupted:()=>{
      const handle=window.__arena;
      return !!handle&&(handle.arena?.deadT>=0||!!handle.roomTransition?.active);
    },
  });
  installDashJetPanel({runtime:dashMagicJet});
  installEnemyLabArcanaControlsHotfix();

  function getPlayerTransform(){
    const root=api.actorVisual?.parent;
    if(root?.getWorldPosition)root.getWorldPosition(playerWorld);else playerWorld.set(0,0,0);
    playerForward.set(0,0,1).applyQuaternion(api.yawQ||identityQ);
    playerForward.y=0;
    if(playerForward.lengthSq()<1e-6)playerForward.set(0,0,1);
    playerForward.normalize();
    return{x:playerWorld.x,z:playerWorld.z,forwardX:playerForward.x,forwardZ:playerForward.z};
  }
  function advanceArenaPlayer(dx,dz){
    const moveX=Number(dx)||0,moveZ=Number(dz)||0;
    const position=window.__arena?.actorPos;
    if(!position)return false;
    if(Number.isFinite(position.x))position.x+=moveX;
    if(Number.isFinite(position.y))position.y+=moveZ;
    else if(Number.isFinite(position.z))position.z+=moveZ;
    const root=api.actorVisual?.parent;
    if(root?.position){root.position.x+=moveX;root.position.z+=moveZ;}
    return true;
  }

  const combatEffectRuntime=installCombatCardEffects({
    THREE,scene:api.scene,PC,hooks:api.hooks,
    getPlayer:getPlayerTransform,
    getEnemySystem:getArenaEnemySystem,
    getStance:()=>window.__arena?.arena?.stance||null,
    getMazeSegments:()=>window.__arena?.mazeWorld?.getCollisionSegments?.()||[],
  });
  const wizardArcanaDamageScaler=installWizardArcanaDamageScaler({getEnemySystem:getArenaEnemySystem});
  const wizardArcanaRuntime=installWizardArcanaRuntime({
    THREE,scene:api.scene,
    getPlayer:getPlayerTransform,
    getEnemySystem:getArenaEnemySystem,
    getMazeSegments:()=>window.__arena?.mazeWorld?.getCollisionSegments?.()||[],
  });
  const wizardFlameStrikeRuntime=installWizardFlameStrikeRuntime({
    THREE,scene:api.scene,
    getPlayer:getPlayerTransform,
    getEnemySystem:getArenaEnemySystem,
  });
  const wizardWindSlashRuntime=installWizardWindSlashRuntime({
    THREE,scene:api.scene,
    getPlayer:getPlayerTransform,
    getEnemySystem:getArenaEnemySystem,
  });
  const wizardAirBasicsRuntime=installWizardAirBasicsRuntime({
    THREE,scene:api.scene,
    getPlayer:getPlayerTransform,
    getEnemySystem:getArenaEnemySystem,
    getMazeSegments:()=>window.__arena?.mazeWorld?.getCollisionSegments?.()||[],
  });
  const wizardNextSourceRuntime=installWizardNextSourceRuntime({
    THREE,scene:api.scene,
    getPlayer:getPlayerTransform,
    getEnemySystem:getArenaEnemySystem,
    getMazeSegments:()=>window.__arena?.mazeWorld?.getCollisionSegments?.()||[],
    advancePlayer:advanceArenaPlayer,
  });

  // The local registry is shared by the arena renderer, Pilebunker, card
  // effects, and Wizard runtimes, so all consumers observe the same enemies.
  const updateMainCombat=PC.updateCombat;
  PC.updateCombat=function(dt,now,sway,rawDt=dt){
    basicDashRuntime.update(dt);
    dashMagicJet.update(dt,now,rawDt);
    const out=updateMainCombat(dt,now,sway,rawDt);
    combatEffectRuntime.update(dt,now);
    wizardArcanaDamageScaler.update();
    wizardArcanaRuntime.update(dt,now);
    wizardFlameStrikeRuntime.update(dt,now);
    wizardWindSlashRuntime.update(dt,now);
    wizardAirBasicsRuntime.update(dt,now);
    wizardNextSourceRuntime.update(dt,now);
    return out;
  };

  Object.defineProperty(PC,'basicDashRuntime',{value:basicDashRuntime,enumerable:true});
  Object.defineProperty(PC,'dashMagicJet',{value:dashMagicJet,enumerable:true});
  Object.defineProperty(PC,'combatEffectRuntime',{value:combatEffectRuntime,enumerable:true});
  Object.defineProperty(PC,'wizardArcanaDamageScaler',{value:wizardArcanaDamageScaler,enumerable:true});
  Object.defineProperty(PC,'wizardArcanaRuntime',{value:wizardArcanaRuntime,enumerable:true});
  Object.defineProperty(PC,'wizardFlameStrikeRuntime',{value:wizardFlameStrikeRuntime,enumerable:true});
  Object.defineProperty(PC,'wizardWindSlashRuntime',{value:wizardWindSlashRuntime,enumerable:true});
  Object.defineProperty(PC,'wizardAirBasicsRuntime',{value:wizardAirBasicsRuntime,enumerable:true});
  Object.defineProperty(PC,'wizardNextSourceRuntime',{value:wizardNextSourceRuntime,enumerable:true});
  // Compatibility aliases retained for existing branch debug callers.
  Object.defineProperty(PC,'combatCardEffects',{value:combatEffectRuntime,enumerable:true});
  Object.defineProperty(PC,'combatSwingInstances',{value:{state:combatEffectRuntime.state,update(){},isCurrentBoosted:combatEffectRuntime.isBloodSlashEmpowered},enumerable:true});
  Object.defineProperty(PC,'bloodSlashStatus',{value:{state:combatEffectRuntime.state,entries:combatEffectRuntime.state.bleeds,update(){},reset(){}},enumerable:true});
  return PC;
}
