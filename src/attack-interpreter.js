// Shared attack-choreography interpreter — the pure pose model and sampler that
// turns src/attacks.js phase definitions into per-frame poses. Extracted verbatim
// from src/player-combat.js so the player (player-combat.js) and the arena goblins
// (arena-enemies.js) animate from the SAME choreography and the SAME code path.
//
// This module is deliberately free of any actor/rig coupling: it only needs THREE
// (for the Vector3/Vector2 pose fields and MathUtils lerp/clamp) and the attack
// data. Consumers own the mapping from a sampled pose onto their own rig.
//
// Usage:
//   const AI = createAttackInterpreter(THREE);
//   const pose = AI.sampleAttack(AI.ATTACKS.vertical5, t, AI.work);
//
// Every returned pose reuses the caller-supplied scratch pose (`out`) so sampling
// allocates nothing per frame.

import { ATTACK_DEFINITIONS } from './attacks.js';

export function createAttackInterpreter(THREE) {
  const clamp = THREE.MathUtils.clamp;
  const lerp  = THREE.MathUtils.lerp;

  /* easing ----------------------------------------------------------------- */
  const Ease = {
    linear:t=>t,
    inQuad:t=>t*t,
    outQuad:t=>t*(2-t),
    inCubic:t=>t*t*t,
    outCubic:t=>1-Math.pow(1-t,3),
    inOutCubic:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,
    inQuint:t=>t*t*t*t*t,
    outBack:t=>{const c=1.0;return 1+ (c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);},
  };
  function smoothstep(edge0,edge1,x){
    const t=clamp((x-edge0)/Math.max(1e-5,edge1-edge0),0,1);
    return t*t*(3-2*t);
  }

  /* ---- pose model -------------------------------------------------------- */
  // A pose: where the hands hold the sword, which way the blade points, body coil.
  function P(o){
    return {
      hold:new THREE.Vector3(o.hold[0],o.hold[1],o.hold[2]),
      tip:new THREE.Vector3(o.tip[0],o.tip[1],o.tip[2]).normalize(),
      roll:o.roll||0,
      twist:o.twist||0, pitch:o.pitch||0, lean:o.lean||0,   // torso X/Y/Z
      hipTwist:o.hipTwist||0,
      hip:new THREE.Vector3((o.hip&&o.hip[0])||0,0,(o.hip&&o.hip[2])||0),
      lower:o.lower||0, lunge:o.lunge||0,
      head:new THREE.Vector2((o.head&&o.head[0])||0,(o.head&&o.head[1])||0),
    };
  }
  function poseLerp(a,b,e,out){
    out.hold.lerpVectors(a.hold,b.hold,e);
    out.tip.lerpVectors(a.tip,b.tip,e).normalize();
    out.roll=lerp(a.roll,b.roll,e);
    out.twist=lerp(a.twist,b.twist,e); out.pitch=lerp(a.pitch,b.pitch,e); out.lean=lerp(a.lean,b.lean,e);
    out.hipTwist=lerp(a.hipTwist,b.hipTwist,e);
    out.hip.lerpVectors(a.hip,b.hip,e);
    out.lower=lerp(a.lower,b.lower,e); out.lunge=lerp(a.lunge,b.lunge,e);
    out.head.lerpVectors(a.head,b.head,e);
    return out;
  }
  const work = P({hold:[0,1,0],tip:[0,1,0]});   // scratch pose reused every frame

  const IDLE = P({ hold:[0.16,1.00,0.36], tip:[0.05,0.80,0.55], roll:0.20,
    twist:-0.16, pitch:0.02, lean:0.03, hipTwist:-0.08, hip:[0,0,0.02], lower:0.04, head:[-0.06,0.05] });

  /* ---- attacks: ordered key poses, each phase blends from the previous --- */
  function buildAttack(phases){
    let t=0, contactAt=0;
    phases.forEach(p=>{ p.t0=t; t+=p.dur; p.t1=t; if(p.contact) contactAt=p.t1; });
    return { phases, total:t, contactAt, comboAt:phases[phases.length-1].t0 };
  }
  function A(group,label,phases){
    const att=buildAttack(phases);
    att.group=group;
    att.label=label;
    return att;
  }
  function materializeAttackPose(pose){
    return pose === 'IDLE' ? IDLE : P(pose);
  }
  function materializeAttackPhase(phase){
    const ease = Ease[phase.ease] || Ease.linear;
    const out = { dur:phase.dur, ease, pose:materializeAttackPose(phase.pose) };
    if(phase.contact) out.contact = true;
    return out;
  }
  function buildAttackLibrary(definitions){
    const attacks = {};
    Object.entries(definitions).forEach(([key,def])=>{
      const att = A(def.group, def.label, def.phases.map(materializeAttackPhase));
      att.approved = def.approved !== false;
      att.definitionKey = key;
      if(def.tags) att.tags = [...def.tags];
      if(def.meta) att.meta = {...def.meta};
      attacks[key] = att;
    });
    return attacks;
  }
  const ATTACKS = buildAttackLibrary(ATTACK_DEFINITIONS);

  function sampleAttack(att,t,out){
    t=clamp(t,0,att.total);
    let ph=att.phases[0], i=0;
    for(;i<att.phases.length;i++){ if(t<=att.phases[i].t1){ ph=att.phases[i]; break; } }
    if(i>=att.phases.length) ph=att.phases[att.phases.length-1];
    const from = (i===0)?IDLE:att.phases[i-1].pose;
    const local = ph.dur>0 ? clamp((t-ph.t0)/ph.dur,0,1) : 1;
    return poseLerp(from, ph.pose, ph.ease(local), out);
  }

  return {
    Ease, smoothstep, P, poseLerp, work, IDLE,
    buildAttack, buildAttackLibrary, sampleAttack, ATTACKS,
  };
}
