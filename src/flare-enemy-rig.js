// Lightweight procedural stand-ins for the FLARE level-one roster. These are
// intentionally original low-poly models: the behavior and relative combat
// parameters are research reproductions, while no FLARE art assets are copied.

export function installFlareEnemyRig(THREE){
  const clamp = THREE.MathUtils.clamp;
  const mats = new Set();
  const geos = new Set();

  function material(color, extra = {}){
    const m = new THREE.MeshStandardMaterial({ color, roughness:.82, flatShading:true, ...extra });
    mats.add(m); return m;
  }
  function mesh(geometry, mat){ geos.add(geometry); const m = new THREE.Mesh(geometry, mat); m.castShadow = true; return m; }
  function ball(r, mat, w=8, h=6){ return mesh(new THREE.SphereGeometry(r,w,h),mat); }
  function box(x,y,z,mat){ return mesh(new THREE.BoxGeometry(x,y,z),mat); }
  function cyl(r1,r2,h,mat,n=7){ return mesh(new THREE.CylinderGeometry(r1,r2,h,n),mat); }
  function cone(r,h,mat,n=6){ return mesh(new THREE.ConeGeometry(r,h,n),mat); }
  function limb(length, radius, mat){ const pivot = new THREE.Group(); const part=cyl(radius*.82,radius,length,mat,6); part.position.y=-length*.5; pivot.add(part); return { pivot, part }; }
  function addEyes(head, scale=.11){
    const eyeMat=material(0xe8e2cf,{emissive:0x17120f,emissiveIntensity:.15});
    for(const x of [-.16,.16]){ const e=ball(scale,eyeMat,6,4); e.position.set(x,.08,.42); head.add(e); }
  }
  function weapon(kind, iron, wood){
    const root=new THREE.Group();
    if(kind === 'claws') return root;
    const grip=cyl(.055,.07,.65,wood,6); grip.position.y=.18; root.add(grip);
    if(kind === 'cleaver'){
      const blade=box(.42,.72,.10,iron); blade.position.set(.12,.78,0); blade.rotation.z=-.16; root.add(blade);
    } else {
      const blade=box(kind==='shortsword'?.12:.10,1.05,.08,iron); blade.position.y=1.02; root.add(blade);
      const guard=box(.48,.09,.10,iron); guard.position.y=.48; root.add(guard);
    }
    return root;
  }

  function buildGoblin(kind, def){
    const group=new THREE.Group();
    const skin=material(def.color), cloth=material(def.clothColor), accent=material(def.accentColor);
    const iron=material(0x8b8275,{metalness:.25}), wood=material(0x5c3d26);
    const pelvis=new THREE.Group(); pelvis.position.y=1.65; group.add(pelvis);
    const torso=box(1.05,1.28,.72,cloth); torso.position.y=.58; pelvis.add(torso);
    const belly=ball(.58,skin); belly.scale.set(1,.85,.78); belly.position.set(0,.45,.30); pelvis.add(belly);
    const headRoot=new THREE.Group(); headRoot.position.set(0,1.48,.08); pelvis.add(headRoot);
    const head=ball(.55,skin,8,6); head.scale.set(1.05,.9,.92); headRoot.add(head); addEyes(headRoot,.105);
    for(const s of [-1,1]){ const ear=cone(.22,.72,skin,5); ear.rotation.z=s*Math.PI/2; ear.position.set(s*.64,.08,0); headRoot.add(ear); }
    const cap=cone(.5,.58,accent,7); cap.position.y=.48; cap.rotation.z=.12; headRoot.add(cap);
    const arms=[], legs=[];
    for(const s of [-1,1]){
      const arm=limb(.92,.13,skin); arm.pivot.position.set(s*.62,1.0,.02); arm.pivot.rotation.z=s*.18; pelvis.add(arm.pivot); arms.push(arm.pivot);
      const leg=limb(1.18,.16,skin); leg.pivot.position.set(s*.34,-.02,0); pelvis.add(leg.pivot); legs.push(leg.pivot);
      const foot=box(.34,.18,.52,cloth); foot.position.set(0,-1.16,.17); leg.pivot.add(foot);
    }
    const weaponRoot=weapon(def.weapon,iron,wood); weaponRoot.position.set(.02,-.82,0); arms[1].add(weaponRoot);
    if(kind === 'flareGoblinRunner'){
      const scarf=box(.86,.16,.18,accent); scarf.position.set(0,1.22,-.38); pelvis.add(scarf);
      const tail=box(.18,.82,.15,accent); tail.position.set(-.28,.88,-.48); tail.rotation.z=.25; pelvis.add(tail);
    }
    return { group,pelvis,torso,headRoot,arms,legs,weaponRoot,kind,def,materials:[skin,cloth,accent,iron,wood] };
  }

  function buildSkeleton(kind, def){
    const group=new THREE.Group();
    const bone=material(def.color), cloth=material(def.clothColor), iron=material(0x777a78,{metalness:.28}), wood=material(0x4b3525);
    const pelvis=new THREE.Group(); pelvis.position.y=1.75; group.add(pelvis);
    const hip=box(.68,.25,.35,bone); pelvis.add(hip);
    const spine=cyl(.10,.12,1.25,bone,6); spine.position.y=.72; pelvis.add(spine);
    const torso=new THREE.Group(); torso.position.y=.55; pelvis.add(torso);
    for(let i=0;i<4;i++){
      const rib=mesh(new THREE.TorusGeometry(.42-i*.035,.055,5,10,Math.PI*1.28),bone);
      rib.rotation.x=Math.PI/2; rib.rotation.z=Math.PI*.36; rib.position.set(0,.22+i*.22,.02); torso.add(rib);
    }
    const shoulder=box(1.12,.12,.22,bone); shoulder.position.y=1.12; torso.add(shoulder);
    const headRoot=new THREE.Group(); headRoot.position.set(0,1.65,.02); pelvis.add(headRoot);
    const skull=ball(.43,bone,8,6); skull.scale.set(.9,1.05,.86); headRoot.add(skull);
    const eyeMat=material(0x20191a,{emissive:0x401010,emissiveIntensity:.4});
    for(const x of [-.14,.14]){ const eye=ball(.105,eyeMat,6,4); eye.position.set(x,.07,.36); headRoot.add(eye); }
    const arms=[],legs=[];
    for(const s of [-1,1]){
      const arm=limb(1.05,.09,bone); arm.pivot.position.set(s*.55,1.08,0); arm.pivot.rotation.z=s*.12; torso.add(arm.pivot); arms.push(arm.pivot);
      const leg=limb(1.34,.105,bone); leg.pivot.position.set(s*.25,-.04,0); pelvis.add(leg.pivot); legs.push(leg.pivot);
    }
    const weaponRoot=weapon(def.weapon,iron,wood); weaponRoot.position.set(0,-.94,0); arms[1].add(weaponRoot);
    const rag=box(.78,.48,.44,cloth); rag.position.set(0,-.18,0); pelvis.add(rag);
    return { group,pelvis,torso,headRoot,arms,legs,weaponRoot,kind,def,materials:[bone,cloth,iron,wood,eyeMat] };
  }

  function buildZombie(kind, def){
    const group=new THREE.Group();
    const skin=material(def.color), cloth=material(def.clothColor), accent=material(def.accentColor,{emissive:def.cursed?def.accentColor:0x000000,emissiveIntensity:def.cursed?.35:0});
    const pelvis=new THREE.Group(); pelvis.position.y=1.55; group.add(pelvis);
    const torso=box(1.12,1.5,.72,cloth); torso.position.set(0,.65,.12); torso.rotation.x=-.13; pelvis.add(torso);
    const headRoot=new THREE.Group(); headRoot.position.set(.08,1.63,.28); headRoot.rotation.z=.12; pelvis.add(headRoot);
    const head=ball(.49,skin,8,6); head.scale.set(.9,1.03,.88); headRoot.add(head); addEyes(headRoot,.09);
    const jaw=box(.48,.20,.38,skin); jaw.position.set(0,-.34,.12); jaw.rotation.x=.18; headRoot.add(jaw);
    const arms=[],legs=[];
    for(const s of [-1,1]){
      const arm=limb(1.16,.145,skin); arm.pivot.position.set(s*.63,1.15,.22); arm.pivot.rotation.set(-1.0,s*.12,s*.14); pelvis.add(arm.pivot); arms.push(arm.pivot);
      const hand=ball(.18,skin,6,4); hand.position.y=-1.13; arm.pivot.add(hand);
      const leg=limb(1.27,.18,skin); leg.pivot.position.set(s*.32,-.02,0); pelvis.add(leg.pivot); legs.push(leg.pivot);
      const foot=box(.38,.20,.55,cloth); foot.position.set(0,-1.23,.16); leg.pivot.add(foot);
    }
    if(def.cursed){
      const rune=mesh(new THREE.TorusGeometry(.42,.045,5,18),accent); rune.rotation.x=Math.PI/2; rune.position.set(0,.65,.52); pelvis.add(rune);
    } else {
      const rotPatch=ball(.30,accent,7,5); rotPatch.scale.set(1.4,.35,1); rotPatch.position.set(-.35,.88,.48); pelvis.add(rotPatch);
    }
    return { group,pelvis,torso,headRoot,arms,legs,weaponRoot:null,kind,def,materials:[skin,cloth,accent] };
  }

  function create(kind, def){
    if(kind === 'flareCrackedSkeleton') return buildSkeleton(kind,def);
    if(kind === 'flareCursedZombie' || kind === 'flareRottingZombie') return buildZombie(kind,def);
    return buildGoblin(kind,def);
  }

  function update(v,e,dt,time,scale){
    const moving=clamp((e.visualGroundSpeed||0)/Math.max(.1,e.maxGroundSpeed||1),0,1);
    const gait=time*(2.8 + (e.visualGroundSpeed||0)*1.7) + e.id*.71;
    const zombie=v.kind === 'flareCursedZombie' || v.kind === 'flareRottingZombie';
    const runner=v.kind === 'flareGoblinRunner';
    v.pelvis.position.y=(zombie?1.55:1.7) + Math.abs(Math.sin(gait))*moving*(runner?.11:.06);
    v.pelvis.rotation.set(zombie?-.13:0,0,Math.sin(gait*.5)*moving*(zombie?.08:.035));
    v.legs.forEach((leg,i)=>{ leg.rotation.x=Math.sin(gait+i*Math.PI)*moving*(runner?.75:.48); });
    if(e.state === 'idle'){
      if(zombie){ v.arms[0].rotation.x=-1.05+Math.sin(time*1.3)*.08; v.arms[1].rotation.x=-.9+Math.sin(time*1.1+.7)*.08; }
      else { v.arms[0].rotation.x=-.15; v.arms[1].rotation.x=-.35; }
      v.torso.rotation.set(zombie?-.08:0,0,0);
    } else {
      const duration=Math.max(.001,e.state==='windup'?e.windup:e.state==='active'?e.active:e.recovery);
      const u=clamp(e.stateTime/duration,0,1);
      if(e.state === 'windup'){
        v.torso.rotation.y=-.55*u;
        v.arms[1].rotation.x=-.35-1.45*u;
        v.arms[0].rotation.x=(zombie?-1.0:-.15)-.4*u;
        v.pelvis.rotation.x=(zombie?-.13:0)-.18*u;
      } else if(e.state === 'active'){
        v.torso.rotation.y=.72*(1-u*.25);
        v.arms[1].rotation.x=1.0-u*.25;
        v.arms[0].rotation.x=zombie?.25:.5;
        v.pelvis.rotation.x=.18;
      } else {
        v.torso.rotation.y=.55*(1-u);
        v.arms[1].rotation.x=.75*(1-u)-.35*u;
        v.arms[0].rotation.x=(zombie?.15:.35)*(1-u)+(zombie?-1.0:-.15)*u;
        v.pelvis.rotation.x=.15*(1-u)+(zombie?-.13:0)*u;
      }
    }
    if(v.weaponRoot) v.weaponRoot.rotation.z = runner ? -.18 : 0;
    v.headRoot.rotation.y=Math.sin(time*1.5+e.id)*.05;
    v.group.scale.setScalar(scale);
  }

  function dispose(v){
    v?.group?.traverse?.(obj=>{ obj.geometry?.dispose?.(); if(Array.isArray(obj.material)) obj.material.forEach(m=>m.dispose?.()); else obj.material?.dispose?.(); });
  }
  function disposeShared(){ mats.forEach(m=>m.dispose()); geos.forEach(g=>g.dispose()); mats.clear(); geos.clear(); }
  return { create, update, dispose, disposeShared };
}
