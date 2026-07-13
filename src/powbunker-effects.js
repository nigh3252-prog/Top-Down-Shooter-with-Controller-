// Pilebunker presentation effects, restored from the approved Falcon Punch lab
// and rescaled/reoriented for the maze-combat camera.
export function createPowBunkerEffects({ THREE, scene } = {}) {
  if (!THREE || !scene) throw new Error('[pilebunker-effects] THREE and scene are required.');

  const V3 = (x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
  const UP = V3(0,1,0);
  const RING_NORMAL = V3(0,0,1);
  const tmpQ = new THREE.Quaternion();
  const tmpDir = V3();
  const tmpPos = V3();

  let ac=null, master=null, noiseBuf=null;
  function ensureAudio(){
    if(ac) return;
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext) return;
    ac=new AudioContext();
    master=ac.createGain(); master.gain.value=.8;
    const comp=ac.createDynamicsCompressor();
    master.connect(comp); comp.connect(ac.destination);
    noiseBuf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);
    const d=noiseBuf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  }
  function noiseBurst({type='bandpass',frequency=1000,q=1,gain=.1,duration=.08,delay=0}={}){
    if(!ac||!noiseBuf)return;
    const t=ac.currentTime+delay,n=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
    n.buffer=noiseBuf;f.type=type;f.frequency.value=frequency;f.Q.value=q;
    g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    n.connect(f);f.connect(g);g.connect(master);n.start(t);n.stop(t+duration+.02);
  }
  function click(){
    if(!ac)return;
    const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();
    o.type='square';o.frequency.setValueAtTime(1900,t);o.frequency.exponentialRampToValueAtTime(600,t+.03);
    g.gain.setValueAtTime(.10,t);g.gain.exponentialRampToValueAtTime(.0001,t+.05);
    o.connect(g);g.connect(master);o.start(t);o.stop(t+.06);
    noiseBurst({type:'highpass',frequency:3000,gain:.08,duration:.04});
  }
  function hiss(dur){
    if(!ac)return;
    const t=ac.currentTime,n=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
    n.buffer=noiseBuf;f.type='bandpass';f.frequency.value=2400;f.Q.value=.8;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.07,t+.05);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    n.connect(f);f.connect(g);g.connect(master);n.start(t);n.stop(t+dur+.02);
  }
  function whoosh(w){
    if(!ac)return;
    const t=ac.currentTime,n=ac.createBufferSource(),bp=ac.createBiquadFilter(),g=ac.createGain();
    n.buffer=noiseBuf;n.playbackRate.value=.9+Math.random()*.2;
    bp.type='bandpass';bp.Q.value=1.4;bp.frequency.setValueAtTime(240+320*w,t);bp.frequency.exponentialRampToValueAtTime(850+1100*w,t+.085);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.14+.30*w,t+.03);g.gain.exponentialRampToValueAtTime(.0001,t+.16);
    n.connect(bp);bp.connect(g);g.connect(master);n.start(t);n.stop(t+.2);
  }
  function slamSound(w){
    if(!ac)return;
    const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();
    o.type='sine';o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(34,t+.28);
    g.gain.setValueAtTime(.45*w+.1,t);g.gain.exponentialRampToValueAtTime(.0001,t+.4);
    o.connect(g);g.connect(master);o.start(t);o.stop(t+.45);
    const n=ac.createBufferSource(),f=ac.createBiquadFilter(),ng=ac.createGain();
    n.buffer=noiseBuf;f.type='lowpass';f.frequency.setValueAtTime(5000,t);f.frequency.exponentialRampToValueAtTime(300,t+.25);
    ng.gain.setValueAtTime(.3*w,t);ng.gain.exponentialRampToValueAtTime(.0001,t+.32);
    n.connect(f);f.connect(ng);ng.connect(master);n.start(t);n.stop(t+.34);
    const o2=ac.createOscillator(),g2=ac.createGain();
    o2.type='triangle';o2.frequency.setValueAtTime(870,t+.01);
    g2.gain.setValueAtTime(.06*w,t+.01);g2.gain.exponentialRampToValueAtTime(.0001,t+.5);
    o2.connect(g2);g2.connect(master);o2.start(t+.01);o2.stop(t+.55);
  }
  function impactSound(w){
    if(!ac)return;
    const t=ac.currentTime,o=ac.createOscillator(),og=ac.createGain();
    o.type='sine';o.frequency.setValueAtTime(110+40*w+Math.random()*12,t);o.frequency.exponentialRampToValueAtTime(36,t+.13);
    og.gain.setValueAtTime(.7*w+.2,t);og.gain.exponentialRampToValueAtTime(.0001,t+.16);
    o.connect(og);og.connect(master);o.start(t);o.stop(t+.18);
    noiseBurst({frequency:650+Math.random()*500,q:8,gain:.5*w,duration:.05});
    noiseBurst({frequency:165+Math.random()*40,q:12,gain:.4*w,duration:.13,delay:.005});
  }

  const steamParticles=[],waves=[],impactBursts=[],sparks=[],trail=[];
  const steamGeo=new THREE.DodecahedronGeometry(.045);
  const sparkGeo=new THREE.BoxGeometry(.035,.035,.035);
  const sparkMat=new THREE.MeshBasicMaterial({color:0xffc46a});
  const sparkPool=[];
  for(let i=0;i<48;i++){
    const m=new THREE.Mesh(sparkGeo,sparkMat);m.visible=false;m.renderOrder=8;scene.add(m);sparkPool.push(m);
  }
  const slamLight=new THREE.PointLight(0xffb070,0,12);scene.add(slamLight);

  function steam(worldPos,dir,effectScale=1){
    const puffScale=Math.max(.7,effectScale);
    for(let i=0;i<5;i++){
      const material=new THREE.MeshBasicMaterial({color:0xaab2c0,transparent:true,opacity:.62,depthWrite:false});
      const m=new THREE.Mesh(steamGeo,material);m.position.copy(worldPos);m.scale.setScalar(puffScale);m.renderOrder=7;scene.add(m);
      const vel=dir.clone().normalize().multiplyScalar((.75+Math.random()*.85)*puffScale)
        .add(V3((Math.random()-.5)*.36,Math.random()*.50,(Math.random()-.5)*.36).multiplyScalar(puffScale));
      steamParticles.push({m,vel,life:.68+Math.random()*.42,t:0,base:puffScale});
    }
  }
  function orientRing(mesh,forward){
    tmpDir.copy(forward||V3(0,0,1));
    if(tmpDir.lengthSq()<1e-8)tmpDir.set(0,0,1);
    tmpDir.normalize();
    mesh.quaternion.setFromUnitVectors(RING_NORMAL,tmpDir);
  }
  function pressureWave(worldPos,forward,effectScale=1){
    const mat=new THREE.MeshBasicMaterial({color:0xffb04a,transparent:true,opacity:.88,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false});
    const mesh=new THREE.Mesh(new THREE.RingGeometry(.10,.15,32),mat);
    mesh.position.copy(worldPos);orientRing(mesh,forward);mesh.scale.setScalar(effectScale);mesh.renderOrder=6;scene.add(mesh);
    waves.push({mesh,t:0,life:.40,base:effectScale,forward:(forward||V3(0,0,1)).clone().normalize()});
  }
  function impactFlash(point,forward,effectScale=1){
    const ring=new THREE.Mesh(new THREE.RingGeometry(.12,.25,32),new THREE.MeshBasicMaterial({color:0xffc46a,transparent:true,opacity:1,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));
    ring.position.copy(point);orientRing(ring,forward);ring.scale.setScalar(effectScale*1.15);ring.renderOrder=10;scene.add(ring);
    const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.12,1),new THREE.MeshBasicMaterial({color:0xffe1a0,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false}));
    core.position.copy(point);core.scale.setScalar(effectScale*1.35);core.renderOrder=11;scene.add(core);
    impactBursts.push({ring,core,t:0,life:.30,base:effectScale});
  }
  function sparkBurst(point,forward,weight,effectScale=1){
    const count=Math.min(sparkPool.length,8+Math.floor(10*weight));
    const f=(forward||V3(0,0,1)).clone().normalize();
    for(let i=0;i<count;i++){
      const m=sparkPool.find(s=>!s.visible);if(!m)break;
      m.visible=true;m.position.copy(point);m.scale.setScalar((.7+Math.random()*1.0)*effectScale);
      const vel=f.clone().multiplyScalar(.5+Math.random()*2.2)
        .add(V3((Math.random()-.5)*2.8,Math.random()*2.8+.7,(Math.random()-.5)*2.8)).multiplyScalar(effectScale);
      sparks.push({m,v:vel,life:.32+Math.random()*.28,maxLife:.60});
    }
  }

  const TRAIL_MAX=28,trailGeo=new THREE.BufferGeometry(),tPos=new Float32Array(TRAIL_MAX*2*3),tCol=new Float32Array(TRAIL_MAX*2*3),indices=[];
  for(let i=0;i<TRAIL_MAX-1;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  trailGeo.setAttribute('position',new THREE.BufferAttribute(tPos,3).setUsage(THREE.DynamicDrawUsage));
  trailGeo.setAttribute('color',new THREE.BufferAttribute(tCol,3).setUsage(THREE.DynamicDrawUsage));
  trailGeo.setIndex(indices);
  const trailMesh=new THREE.Mesh(trailGeo,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  trailMesh.frustumCulled=false;trailMesh.renderOrder=5;scene.add(trailMesh);
  const amber=new THREE.Color(0xffb04a),seg=V3(),side=V3();
  function trailPoint(point,effectScale=1){trail.push({p:point.clone(),life:1,scale:effectScale});if(trail.length>TRAIL_MAX)trail.shift();}

  function slam({point,stacks=[],forward=V3(0,0,1),weight=1.8,effectScale=1}={}){
    ensureAudio();slamSound(weight);hiss(.5);
    slamLight.position.copy(point);slamLight.intensity=7.5;slamLight.distance=Math.max(8,11*effectScale);
    pressureWave(point,forward,effectScale);
    for(const stack of stacks){
      stack.getWorldPosition(tmpPos);stack.getWorldQuaternion(tmpQ);
      tmpDir.set(0,1,0).applyQuaternion(tmpQ).normalize();
      if(tmpDir.y<-.15)tmpDir.negate();
      tmpDir.addScaledVector(UP,.55).normalize();
      tmpPos.addScaledVector(tmpDir,.10*effectScale);
      steam(tmpPos,tmpDir,effectScale);
    }
  }
  function contact({point,forward=V3(0,0,1),weight=1.8,hit=false,effectScale=1}={}){
    if(!hit)return;
    ensureAudio();impactSound(weight);impactFlash(point,forward,effectScale);sparkBurst(point,forward,weight,effectScale);
  }

  function update(rawDt){
    const dt=Math.max(0,Math.min(.08,rawDt||0));
    slamLight.intensity+=(0-slamLight.intensity)*Math.min(1,dt*10);
    for(let i=steamParticles.length-1;i>=0;i--){
      const f=steamParticles[i];f.t+=dt;const k=f.t/f.life;
      if(k>=1){scene.remove(f.m);f.m.material.dispose();steamParticles.splice(i,1);continue;}
      f.m.position.addScaledVector(f.vel,dt);f.vel.multiplyScalar(Math.max(0,1-2.0*dt));f.m.scale.setScalar(f.base*(1+k*3.2));f.m.material.opacity=.62*(1-k);
    }
    for(let i=waves.length-1;i>=0;i--){
      const w=waves[i];w.t+=dt;const p=w.t/w.life;
      if(p>=1){scene.remove(w.mesh);w.mesh.geometry.dispose();w.mesh.material.dispose();waves.splice(i,1);continue;}
      w.mesh.scale.setScalar(w.base*(1+p*8));w.mesh.material.opacity=(1-p)*.88;w.mesh.position.addScaledVector(w.forward,dt*.55*w.base);
    }
    for(let i=impactBursts.length-1;i>=0;i--){
      const b=impactBursts[i];b.t+=dt;const p=b.t/b.life;
      if(p>=1){scene.remove(b.ring,b.core);b.ring.geometry.dispose();b.ring.material.dispose();b.core.geometry.dispose();b.core.material.dispose();impactBursts.splice(i,1);continue;}
      b.ring.scale.setScalar(b.base*(1.15+p*7.5));b.ring.material.opacity=(1-p)*(1-p);
      b.core.scale.setScalar(b.base*(1.35+p*4));b.core.material.opacity=(1-p)*.95;
    }
    for(let i=sparks.length-1;i>=0;i--){
      const s=sparks[i];s.life-=dt;
      if(s.life<=0){s.m.visible=false;sparks.splice(i,1);continue;}
      s.v.y-=9*dt;s.m.position.addScaledVector(s.v,dt);s.m.scale.multiplyScalar(Math.pow(.025,dt));
    }
    for(let i=trail.length-1;i>=0;i--){trail[i].life-=dt*6.5;if(trail[i].life<=0)trail.splice(i,1);}
    const n=Math.min(trail.length,TRAIL_MAX);
    if(n<2){trailGeo.setDrawRange(0,0);return;}
    for(let i=0;i<n;i++){
      const pt=trail[i],next=trail[Math.min(i+1,n-1)].p,prev=trail[Math.max(i-1,0)].p;
      seg.copy(next).sub(prev);side.crossVectors(seg,UP);if(side.lengthSq()<1e-8)side.set(1,0,0);
      side.normalize().multiplyScalar((.028*pt.life+.006)*Math.max(1,pt.scale));
      const o=i*6;tPos[o]=pt.p.x-side.x;tPos[o+1]=pt.p.y-side.y;tPos[o+2]=pt.p.z-side.z;tPos[o+3]=pt.p.x+side.x;tPos[o+4]=pt.p.y+side.y;tPos[o+5]=pt.p.z+side.z;
      const c=pt.life*pt.life;tCol[o]=tCol[o+3]=amber.r*c;tCol[o+1]=tCol[o+4]=amber.g*c;tCol[o+2]=tCol[o+5]=amber.b*c;
    }
    trailGeo.attributes.position.needsUpdate=true;trailGeo.attributes.color.needsUpdate=true;trailGeo.setDrawRange(0,(n-1)*6);
  }

  function dispose(){
    for(const f of steamParticles){scene.remove(f.m);f.m.material.dispose();}
    for(const w of waves){scene.remove(w.mesh);w.mesh.geometry.dispose();w.mesh.material.dispose();}
    for(const b of impactBursts){scene.remove(b.ring,b.core);b.ring.geometry.dispose();b.ring.material.dispose();b.core.geometry.dispose();b.core.material.dispose();}
    for(const m of sparkPool)scene.remove(m);
    scene.remove(slamLight,trailMesh);trailGeo.dispose();trailMesh.material.dispose();steamGeo.dispose();sparkGeo.dispose();sparkMat.dispose();
  }
  return {ensureAudio,click,hiss,whoosh,slam,contact,trailPoint,update,dispose};
}
