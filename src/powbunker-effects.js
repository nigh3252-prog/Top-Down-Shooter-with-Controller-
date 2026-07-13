// Audio and visual impact effects copied from the approved pilebunker lab.
export function createPowBunkerEffects({ THREE, scene } = {}) {
  const V3=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
  let ac=null,master=null,noiseBuf=null;
  function ensureAudio(){
    if(ac)return;
    const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;
    ac=new AudioContext();master=ac.createGain();master.gain.value=.72;
    const comp=ac.createDynamicsCompressor();master.connect(comp);comp.connect(ac.destination);
    noiseBuf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  }
  function click(){if(!ac)return;const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.type='square';o.frequency.setValueAtTime(1900,t);o.frequency.exponentialRampToValueAtTime(600,t+.03);g.gain.setValueAtTime(.1,t);g.gain.exponentialRampToValueAtTime(.0001,t+.05);o.connect(g);g.connect(master);o.start(t);o.stop(t+.06);}
  function hiss(dur){if(!ac)return;const t=ac.currentTime,n=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();n.buffer=noiseBuf;f.type='bandpass';f.frequency.value=2400;f.Q.value=.8;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.07,t+.05);g.gain.exponentialRampToValueAtTime(.0001,t+dur);n.connect(f);f.connect(g);g.connect(master);n.start(t);n.stop(t+dur+.02);}
  function whoosh(w){if(!ac)return;const t=ac.currentTime,n=ac.createBufferSource(),bp=ac.createBiquadFilter(),g=ac.createGain();n.buffer=noiseBuf;bp.type='bandpass';bp.Q.value=1.4;bp.frequency.setValueAtTime(240+320*w,t);bp.frequency.exponentialRampToValueAtTime(850+1100*w,t+.085);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.14+.30*w,t+.03);g.gain.exponentialRampToValueAtTime(.0001,t+.16);n.connect(bp);bp.connect(g);g.connect(master);n.start(t);n.stop(t+.2);}
  function slamSound(w){if(!ac)return;const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(34,t+.28);g.gain.setValueAtTime(.45*w+.1,t);g.gain.exponentialRampToValueAtTime(.0001,t+.4);o.connect(g);g.connect(master);o.start(t);o.stop(t+.45);const n=ac.createBufferSource(),f=ac.createBiquadFilter(),ng=ac.createGain();n.buffer=noiseBuf;f.type='lowpass';f.frequency.setValueAtTime(5000,t);f.frequency.exponentialRampToValueAtTime(300,t+.25);ng.gain.setValueAtTime(.3*w,t);ng.gain.exponentialRampToValueAtTime(.0001,t+.32);n.connect(f);f.connect(ng);ng.connect(master);n.start(t);n.stop(t+.34);}

  const particles=[],waves=[],trail=[];
  const steamGeo=new THREE.DodecahedronGeometry(.045);
  const slamLight=new THREE.PointLight(0xffb070,0,8);scene.add(slamLight);
  function steam(worldPos,dir){for(let i=0;i<4;i++){const m=new THREE.Mesh(steamGeo,new THREE.MeshBasicMaterial({color:0xaab2c0,transparent:true,opacity:.5,depthWrite:false}));m.position.copy(worldPos);scene.add(m);particles.push({m,vel:dir.clone().multiplyScalar(.6+Math.random()*.6).add(V3((Math.random()-.5)*.3,Math.random()*.45,(Math.random()-.5)*.3)),life:.6+Math.random()*.35,t:0});}}
  function pressureWave(worldPos){const m=new THREE.Mesh(new THREE.RingGeometry(.10,.15,32),new THREE.MeshBasicMaterial({color:0xffb04a,transparent:true,opacity:.8,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));m.position.copy(worldPos);m.rotation.x=-Math.PI/2;scene.add(m);waves.push({m,t:0,life:.38});}

  const TRAIL_MAX=28,trailGeo=new THREE.BufferGeometry(),tPos=new Float32Array(TRAIL_MAX*2*3),tCol=new Float32Array(TRAIL_MAX*2*3),indices=[];
  for(let i=0;i<TRAIL_MAX-1;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}trailGeo.setAttribute('position',new THREE.BufferAttribute(tPos,3));trailGeo.setAttribute('color',new THREE.BufferAttribute(tCol,3));trailGeo.setIndex(indices);
  const trailMesh=new THREE.Mesh(trailGeo,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));trailMesh.frustumCulled=false;scene.add(trailMesh);
  const amber=new THREE.Color(0xffb04a),seg=V3(),side=V3(),cameraForward=V3(0,0,-1);
  function trailPoint(point){trail.push({p:point.clone(),life:1});if(trail.length>TRAIL_MAX)trail.shift();}

  function slam({ point, stacks=[], weight=1.8, follow=1.18 }={}){
    ensureAudio();slamSound(weight);hiss(.5);slamLight.position.copy(point);slamLight.intensity=7;pressureWave(point);
    const wp=V3();for(const stack of stacks){stack.getWorldPosition(wp);wp.y+=.08;steam(wp,V3(0,1,.25*Math.sign(stack.position.z)));}
  }
  function update(dt){
    slamLight.intensity+=(0-slamLight.intensity)*Math.min(1,dt*8);
    for(let i=particles.length-1;i>=0;i--){const f=particles[i];f.t+=dt;const k=f.t/f.life;if(k>=1){scene.remove(f.m);f.m.material.dispose();particles.splice(i,1);continue;}f.m.position.addScaledVector(f.vel,dt);f.vel.multiplyScalar(Math.max(0,1-2.2*dt));f.m.scale.setScalar(1+k*3);f.m.material.opacity=.5*(1-k);}
    for(let i=waves.length-1;i>=0;i--){const w=waves[i];w.t+=dt;const p=w.t/w.life;if(p>=1){scene.remove(w.m);w.m.geometry.dispose();w.m.material.dispose();waves.splice(i,1);continue;}w.m.scale.setScalar(1+p*9);w.m.material.opacity=(1-p)*.8;}
    for(let i=trail.length-1;i>=0;i--){trail[i].life-=dt*6.5;if(trail[i].life<=0)trail.splice(i,1);}const n=Math.min(trail.length,TRAIL_MAX);if(n<2){trailGeo.setDrawRange(0,0);return;}
    for(let i=0;i<n;i++){const pt=trail[i],next=trail[Math.min(i+1,n-1)].p,prev=trail[Math.max(i-1,0)].p;seg.copy(next).sub(prev);side.crossVectors(seg,cameraForward);if(side.lengthSq()<1e-8)side.set(0,1,0);side.normalize().multiplyScalar(.028*pt.life+.006);const o=i*6;tPos[o]=pt.p.x-side.x;tPos[o+1]=pt.p.y-side.y;tPos[o+2]=pt.p.z-side.z;tPos[o+3]=pt.p.x+side.x;tPos[o+4]=pt.p.y+side.y;tPos[o+5]=pt.p.z+side.z;const c=pt.life*pt.life;tCol[o]=tCol[o+3]=amber.r*c;tCol[o+1]=tCol[o+4]=amber.g*c;tCol[o+2]=tCol[o+5]=amber.b*c;}
    trailGeo.attributes.position.needsUpdate=true;trailGeo.attributes.color.needsUpdate=true;trailGeo.setDrawRange(0,(n-1)*6);
  }
  function dispose(){scene.remove(slamLight,trailMesh);trailGeo.dispose();trailMesh.material.dispose();steamGeo.dispose();}
  return { ensureAudio,click,hiss,whoosh,slam,trailPoint,update,dispose };
}
