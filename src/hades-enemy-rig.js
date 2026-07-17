// Original low-poly stand-ins for the Hades Tartarus research pool.
// No Supergiant art assets are copied; silhouettes only communicate behavior.

export function installHadesEnemyRig(THREE){
  const clamp=THREE.MathUtils.clamp;
  const mats=new Set(), geos=new Set();
  function mat(color,extra={}){const m=new THREE.MeshStandardMaterial({color,roughness:.78,flatShading:true,...extra});mats.add(m);return m;}
  function basic(color,extra={}){const m=new THREE.MeshBasicMaterial({color,transparent:true,depthWrite:false,...extra});mats.add(m);return m;}
  function mesh(g,m){geos.add(g);const x=new THREE.Mesh(g,m);x.castShadow=true;return x;}
  const ball=(r,m,w=8,h=6)=>mesh(new THREE.SphereGeometry(r,w,h),m);
  const box=(x,y,z,m)=>mesh(new THREE.BoxGeometry(x,y,z),m);
  const cyl=(r1,r2,h,m,n=7)=>mesh(new THREE.CylinderGeometry(r1,r2,h,n),m);
  const cone=(r,h,m,n=7)=>mesh(new THREE.ConeGeometry(r,h,n),m);
  const torus=(r,t,m,n=16)=>mesh(new THREE.TorusGeometry(r,t,5,n),m);
  function limb(length,radius,m){const p=new THREE.Group();const s=cyl(radius*.8,radius,length,m,6);s.position.y=-length*.5;p.add(s);return p;}
  function eye(m,r=.095){const e=ball(r,m,6,4);e.scale.z=.55;return e;}
  function shadeBody(def,{large=false,club=false,robe=false}={}){
    const group=new THREE.Group(), body=new THREE.Group();body.position.y=large?2.0:1.75;group.add(body);
    const skin=mat(def.color), dark=mat(def.secondaryColor), accent=mat(def.accentColor), iron=mat(0x81737a,{metalness:.25});
    const torso=ball(large?1.15:.78,dark,8,6);torso.scale.set(large?1.12:.9,large?1.2:1.25,.75);torso.position.y=.5;body.add(torso);
    if(robe){const skirt=cone(.92,1.75,dark,8);skirt.position.y=-.35;skirt.rotation.x=Math.PI;body.add(skirt);}
    const headRoot=new THREE.Group();headRoot.position.set(0,large?1.75:1.45,.12);body.add(headRoot);
    const head=ball(large?.62:.48,skin,8,6);head.scale.set(.88,1.04,.78);headRoot.add(head);
    const eyeMat=mat(0xf1dfc0,{emissive:def.accentColor,emissiveIntensity:.35});
    for(const x of [-.14,.14]){const e=eye(eyeMat,large?.11:.085);e.position.set(x,.06,.39);headRoot.add(e);}
    const arms=[];
    for(const s of [-1,1]){const a=limb(large?1.2:1.0,large?.18:.13,skin);a.position.set(s*(large?.92:.64),large?1.08:.96,.04);a.rotation.z=s*.18;body.add(a);arms.push(a);}
    let weaponRoot=null;
    if(club){weaponRoot=new THREE.Group();const shaft=cyl(.11,.15,1.25,iron,7);shaft.position.y=.15;weaponRoot.add(shaft);const headClub=box(.48,.75,.52,accent);headClub.position.y=.95;weaponRoot.add(headClub);weaponRoot.position.set(0,-1.0,0);arms[1].add(weaponRoot);}
    const legs=[];
    if(!robe)for(const s of [-1,1]){const l=limb(large?1.35:1.12,large?.19:.15,skin);l.position.set(s*(large?.42:.3),-.05,0);body.add(l);legs.push(l);}
    return {group,body,torso,headRoot,arms,legs,weaponRoot,accent,eyeMat};
  }
  function buildThug(def){return {...shadeBody(def,{large:true,club:true}),kind:'thug'};}
  function buildWitch(def){
    const v=shadeBody(def,{robe:true});v.kind='witch';
    const halo=torus(.58,.055,v.accent,22);halo.rotation.x=Math.PI/2;halo.position.y=1.75;v.body.add(halo);
    const orb=ball(.24,mat(def.accentColor,{emissive:def.accentColor,emissiveIntensity:.8}),8,6);orb.position.set(.78,.3,.45);v.body.add(orb);v.orb=orb;return v;
  }
  function buildLout(def){
    const group=new THREE.Group(),body=new THREE.Group();body.position.y=1.78;group.add(body);
    const flesh=mat(def.color),dark=mat(def.secondaryColor),accent=mat(def.accentColor);
    const bulk=ball(1.35,flesh,9,7);bulk.scale.set(1.18,1.08,.9);bulk.position.y=.45;body.add(bulk);
    const belly=ball(.84,dark,8,6);belly.scale.z=.55;belly.position.set(0,.25,.72);body.add(belly);
    const headRoot=new THREE.Group();headRoot.position.set(0,1.55,.55);headRoot.rotation.x=-.35;body.add(headRoot);
    const head=ball(.62,flesh,8,6);head.scale.set(1.05,.85,.9);headRoot.add(head);
    const hornMat=mat(0xb9a88b);for(const s of [-1,1]){const h=cone(.18,.65,hornMat,6);h.rotation.z=s*.75;h.position.set(s*.48,.25,0);headRoot.add(h);}
    const arms=[],legs=[];for(const s of [-1,1]){const a=limb(1.15,.24,flesh);a.position.set(s*1.05,.9,.05);a.rotation.z=s*.25;body.add(a);arms.push(a);const l=limb(1.25,.26,flesh);l.position.set(s*.48,-.05,0);body.add(l);legs.push(l);}
    const stripe=box(1.35,.18,.2,accent);stripe.position.set(0,.85,.96);body.add(stripe);
    return {group,body,torso:bulk,headRoot,arms,legs,weaponRoot:null,kind:'lout'};
  }
  function buildPest(def){
    const group=new THREE.Group(),body=new THREE.Group();body.position.y=1.0;group.add(body);
    const urn=mat(def.color),dark=mat(def.secondaryColor),glow=mat(def.accentColor,{emissive:def.accentColor,emissiveIntensity:.55});
    const pot=cyl(.68,.48,1.25,urn,8);body.add(pot);const lip=torus(.52,.12,dark,16);lip.rotation.x=Math.PI/2;lip.position.y=.62;body.add(lip);
    const spirit=ball(.34,glow,8,6);spirit.position.y=.72;body.add(spirit);const eyes=[];const black=mat(0x21161a);for(const x of [-.11,.11]){const e=eye(black,.07);e.position.set(x,.76,.31);body.add(e);eyes.push(e);}
    const arms=[];for(const s of [-1,1]){const a=limb(.62,.09,glow);a.position.set(s*.55,.25,0);a.rotation.z=s*.9;body.add(a);arms.push(a);}
    return {group,body,torso:pot,headRoot:spirit,arms,legs:[],weaponRoot:null,kind:'pest'};
  }
  function skullModel(def,scale=1){
    const root=new THREE.Group(),bone=mat(def.color),dark=mat(def.secondaryColor),accent=mat(def.accentColor,{emissive:def.accentColor,emissiveIntensity:.45});
    const skull=ball(.56*scale,bone,8,6);skull.scale.set(1,.86,.8);root.add(skull);const jaw=box(.68*scale,.24*scale,.44*scale,bone);jaw.position.set(0,-.4*scale,.1*scale);root.add(jaw);
    for(const x of [-.19,.19]){const socket=ball(.13*scale,dark,6,4);socket.position.set(x,.05*scale,.43*scale);root.add(socket);const pupil=ball(.065*scale,accent,6,4);pupil.position.set(x,.05*scale,.53*scale);root.add(pupil);}
    for(const s of [-1,1]){const horn=cone(.13*scale,.55*scale,dark,6);horn.rotation.z=s*.75;horn.position.set(s*.43*scale,.34*scale,0);root.add(horn);}
    return root;
  }
  function buildNumbskull(def){const group=new THREE.Group(),body=new THREE.Group();body.position.y=1.65;group.add(body);const skull=skullModel(def,.85);body.add(skull);return{group,body,torso:skull,headRoot:skull,arms:[],legs:[],weaponRoot:null,kind:'numbskull'};}
  function buildSkullomat(def){
    const group=new THREE.Group(),body=new THREE.Group();body.position.y=.58;group.add(body);const dark=mat(def.secondaryColor),glow=mat(def.accentColor,{emissive:def.accentColor,emissiveIntensity:.65});
    const base=cyl(1.42,1.65,.55,dark,8);body.add(base);const skulls=[];const rows=[[0,0,0],[-.55,.55,.35],[.55,.55,.35],[-.32,1.08,.15],[.32,1.08,.15],[0,1.62,.0]];
    rows.forEach((p,i)=>{const s=skullModel(def,.55-i*.018);s.position.set(p[0],p[1]+.35,p[2]);body.add(s);skulls.push(s);});
    const portal=torus(.72,.095,glow,24);portal.rotation.x=Math.PI/2;portal.position.set(0,.28,.9);body.add(portal);
    return{group,body,torso:base,headRoot:body,arms:[],legs:[],weaponRoot:null,portal,skulls,kind:'skullomat'};
  }
  function buildWringer(def){
    const group=new THREE.Group(),body=new THREE.Group();body.position.y=1.75;group.add(body);const flesh=mat(def.color),dark=mat(def.secondaryColor),accent=mat(def.accentColor,{emissive:def.accentColor,emissiveIntensity:.3}),iron=mat(0x7d7072,{metalness:.3});
    const palm=box(.9,1.0,.34,flesh);palm.rotation.z=.08;body.add(palm);const fingers=[];for(let i=0;i<4;i++){const f=limb(.78,.105,flesh);f.position.set(-.36+i*.24,.55,.04);f.rotation.x=-.12;body.add(f);fingers.push(f);}const thumb=limb(.72,.13,flesh);thumb.position.set(.52,.05,.02);thumb.rotation.z=-1.0;body.add(thumb);fingers.push(thumb);
    const cuff=cyl(.44,.5,.34,iron,8);cuff.position.y=-.7;body.add(cuff);const chain=[];let parent=body;for(let i=0;i<4;i++){const link=torus(.18,.045,iron,10);link.rotation.y=i%2?Math.PI/2:0;link.position.y=-.95-i*.31;parent.add(link);chain.push(link);}
    const eyeMat=mat(def.accentColor,{emissive:def.accentColor,emissiveIntensity:.7});const gem=ball(.16,eyeMat,7,5);gem.position.set(0,.08,.26);body.add(gem);
    return{group,body,torso:palm,headRoot:body,arms:fingers,legs:[],weaponRoot:null,chain,accent,kind:'wringer'};
  }
  function buildBrimstone(def){
    const group=new THREE.Group(),body=new THREE.Group();body.position.y=1.55;group.add(body);const crystal=mat(def.color,{metalness:.12}),dark=mat(def.secondaryColor),glow=mat(def.accentColor,{emissive:def.accentColor,emissiveIntensity:.9});
    const core=ball(.5,glow,8,6);body.add(core);const shards=[];for(let i=0;i<7;i++){const s=cone(.22,.95,crystal,6);const a=i/7*Math.PI*2;s.position.set(Math.cos(a)*.44,Math.sin(a*2)*.18,Math.sin(a)*.44);s.rotation.z=a;s.rotation.x=.45;body.add(s);shards.push(s);}const ring=torus(.82,.055,dark,22);ring.rotation.x=Math.PI/2;body.add(ring);
    return{group,body,torso:core,headRoot:body,arms:[],legs:[],weaponRoot:null,core,shards,ring,kind:'brimstone'};
  }
  function create(kind,def){
    if(kind==='hadesWretchedThug')return buildThug(def);
    if(kind==='hadesWretchedWitch')return buildWitch(def);
    if(kind==='hadesWretchedLout')return buildLout(def);
    if(kind==='hadesWretchedPest')return buildPest(def);
    if(kind==='hadesNumbskull')return buildNumbskull(def);
    if(kind==='hadesSkullomat')return buildSkullomat(def);
    if(kind==='hadesWringer')return buildWringer(def);
    return buildBrimstone(def);
  }
  function update(v,e,dt,time,scale){
    const moving=clamp((e.visualGroundSpeed||0)/Math.max(.1,e.maxGroundSpeed||1),0,1),phase=time*(2.4+(e.visualGroundSpeed||0)*1.35)+e.id*.8;
    const floaty=['witch','numbskull','wringer','brimstone'].includes(v.kind);
    v.body.position.y=(floaty?1.72:(v.kind==='pest'?1.0:v.kind==='skullomat'?.58:v.kind==='lout'?1.78:2.0))+Math.sin(phase*.65)*(floaty?.12:.025);
    if(v.legs?.length)v.legs.forEach((l,i)=>l.rotation.x=Math.sin(phase+i*Math.PI)*moving*(v.kind==='lout'?.38:.58));
    if(e.state==='windup'){
      const u=clamp(e.stateTime/Math.max(.001,e.windup),0,1);v.body.rotation.y=-.5*u;v.body.rotation.x=v.kind==='lout'?.22*u:-.1*u;if(v.weaponRoot)v.weaponRoot.rotation.x=-1.35*u;
    }else if(e.state==='active'){
      const u=clamp(e.stateTime/Math.max(.001,e.active),0,1);v.body.rotation.y=.62*(1-u*.2);v.body.rotation.x=v.kind==='lout'?-.32:.12;if(v.weaponRoot)v.weaponRoot.rotation.x=.95;
      if(v.kind==='wringer')v.arms.forEach((a,i)=>a.rotation.x=-.9+Math.sin(u*Math.PI)*1.4);
    }else if(e.state==='recovery'){
      const u=clamp(e.stateTime/Math.max(.001,e.recovery),0,1);v.body.rotation.y=.55*(1-u);v.body.rotation.x=.12*(1-u);if(v.weaponRoot)v.weaponRoot.rotation.x=.8*(1-u);
    }else{v.body.rotation.x=v.kind==='lout'?.08:0;v.body.rotation.y=Math.sin(time*.8+e.id)*.035;if(v.weaponRoot)v.weaponRoot.rotation.x=-.25;}
    if(v.kind==='witch'&&v.orb){v.orb.position.y=.3+Math.sin(time*4)*.08;v.orb.scale.setScalar(.9+Math.sin(time*5)*.08);}
    if(v.kind==='skullomat'){v.portal.rotation.z+=dt*1.6;v.portal.scale.setScalar(.9+Math.sin(time*3)*.08);v.skulls.forEach((s,i)=>s.rotation.y=Math.sin(time*1.1+i)*.04);}
    if(v.kind==='brimstone'){v.ring.rotation.z+=dt*.8;v.core.scale.setScalar(1+(e.state==='windup'?clamp(e.stateTime/e.windup,0,1)*.45:Math.sin(time*4)*.05));v.shards.forEach((s,i)=>s.rotation.y+=dt*(i%2?1:-1)*.25);}
    if(v.kind==='numbskull')v.body.rotation.z=Math.sin(phase)*moving*.16;
    v.group.scale.setScalar(scale);
  }
  function dispose(v){v?.group?.traverse?.(o=>{o.geometry?.dispose?.();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose?.());else o.material?.dispose?.();});}
  function disposeShared(){mats.forEach(m=>m.dispose());geos.forEach(g=>g.dispose());mats.clear();geos.clear();}
  return{create,update,dispose,disposeShared,basic,mesh,mat};
}
