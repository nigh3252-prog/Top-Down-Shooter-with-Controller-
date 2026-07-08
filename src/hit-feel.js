const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const STAGE_LABEL = { 1:'STAGGER', 2:'REEL', 3:'LAUNCH' };

export function hitStageFromImpact({ damage=0, stagger=1, killed=false, tier=0, attackGroup='', comboIndex=0, targetKind='' } = {}){
  if(killed) return 3;
  let score = damage/28 + stagger*.34 + tier*.9 + Math.min(comboIndex, 3)*.22;
  if(/heavy|vertical|haymaker|overhead|smash|charged/i.test(attackGroup)) score += .55;
  if(/brute|captain|elite/i.test(targetKind)) score -= .35;
  if(/dummy|chaser|dagger|goblin/i.test(targetKind)) score += .12;
  return score > 1.85 ? 3 : (score > 1.05 ? 2 : 1);
}

export function buildHitReaction({ stage=1, killed=false, dir={x:0,z:1}, weight=1, targetKind='' } = {}){
  const s = killed ? 3 : clamp(stage|0, 1, 3);
  const heavy = /brute|captain|elite/i.test(targetKind) ? 1.35 : 1;
  const light = /dummy|chaser|dagger|goblin/i.test(targetKind) ? .85 : 1;
  const resist = Math.max(.45, (weight || 1) * heavy * light);
  const mag = [0, 2.0, 3.6, 6.2][s] / resist;
  const d = normalize2(dir);
  return {
    stage:s, hitStage:s, killed, hitDir:d,
    hitT:0, hitMax:[0,.22,.38,.72][s], stunned:[0,.18,.34,.68][s] + (killed?.15:0),
    lean:[0,.22,.42,.74][s] / resist, squash:[0,.08,.15,.24][s], lift:[0,.04,.13,.55][s] / resist,
    airVy:s>=3 ? (3.2/resist + (killed?1.6:0)) : 0,
    spin:s>=2 ? (Math.random()<.5?-1:1) * [0,.7,1.7,4.6][s] / resist : 0,
    spinVel:s>=3 ? (Math.random()<.5?-1:1) * (5.5/resist) : 0,
    launchedT:s>=3 ? .65 : 0,
    knock:{ x:d.x*mag, z:d.z*mag }
  };
}

export function installHitFeel({ THREE, scene, camera, overlayParent=document.body, onCameraKick, onAudioCue } = {}){
  const effects=[]; let stopT=0, slowT=0, slowScale=1, flash=0;
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:12;opacity:0;background:radial-gradient(circle at 50% 50%,rgba(255,246,210,.34),rgba(164,22,16,.20) 18%,transparent 42%);mix-blend-mode:screen;transition:opacity 60ms';
  overlayParent.appendChild(overlay);
  const colors={slice:0x9bd7f0,pierce:0xf4e0a2,blunt:0xffb066,hybrid:0xd7b6ff,weak:0x9aabc4,dummy:0xd7aa63,blood:0x9b1d2d};
  function makeSprite(text,color=0xffffff){ const cv=document.createElement('canvas'); cv.width=384; cv.height=192; const c=cv.getContext('2d'); c.font='900 42px system-ui,Segoe UI,sans-serif'; c.textAlign='center'; c.textBaseline='middle'; c.lineWidth=8; c.strokeStyle='rgba(0,0,0,.78)'; c.fillStyle='#'+color.toString(16).padStart(6,'0'); text.split('\n').forEach((line,i)=>{ const y=78+i*46; c.strokeText(line,192,y); c.fillText(line,192,y); }); const tex=new THREE.CanvasTexture(cv); tex.colorSpace=THREE.SRGBColorSpace; const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false})); sp.scale.set(2.5,1.25,1); return sp; }
  function add(mesh, life, kind, vel){ scene.add(mesh); effects.push({mesh,life,age:0,kind,vel}); }
  function trigger({ point, dir, type='slice', damage=0, stage=1, killed=false, targetKind='enemy', label='', whiff=false } = {}){
    const p = point?.clone?.() || new THREE.Vector3(); const d = normalize2(dir); const s = killed ? 3 : clamp(stage|0,1,3); const dummy=/dummy/i.test(targetKind); const color = whiff ? 0x9aabc4 : (dummy ? colors.dummy : (colors[type]||0xffffff));
    if(whiff){ const sp=makeSprite(label||'WHIFF',0x9aabc4); sp.position.copy(p).add(new THREE.Vector3(0,1.2,0)); add(sp,.45,'label',new THREE.Vector3(d.x*.5,.5,d.z*.5)); onAudioCue?.({ whiff:true, stage:0, type, targetKind }); return; }
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.22+.12*s,.012+.01*s,6,36),new THREE.MeshBasicMaterial({color,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false})); ring.position.copy(p); ring.lookAt(camera.position); add(ring,.22+.08*s,'ring');
    const ground=new THREE.Mesh(new THREE.RingGeometry(.18,.22,42),new THREE.MeshBasicMaterial({color:dummy?0xb88a4a:0x7d1c20,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false})); ground.position.set(p.x,.025,p.z); ground.rotation.x=-Math.PI/2; add(ground,.7+.25*s,'ground');
    for(let i=0;i<5+s*4;i++){ const chip=new THREE.Mesh(new THREE.IcosahedronGeometry(dummy?.035:.025,0),new THREE.MeshBasicMaterial({color:dummy?0xc69a55:0xb71e32})); chip.position.copy(p); add(chip,.35+Math.random()*.35,'chip',new THREE.Vector3(d.x*(.6+Math.random()*s)+(Math.random()-.5)*1.3,Math.random()*1.8+.4,d.z*(.6+Math.random()*s)+(Math.random()-.5)*1.3)); }
    const streak=new THREE.Mesh(new THREE.BoxGeometry(.035,.035,.9+.35*s),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false})); streak.position.copy(p); streak.rotation.y=Math.atan2(d.x,d.z); add(streak,.18,'streak');
    const txt=`${killed?'KO':(label||STAGE_LABEL[s])}\n${damage}`; const sp=makeSprite(txt,killed?0xfff0a0:color); sp.position.copy(p).add(new THREE.Vector3(0,.65+.16*s,0)); add(sp,.75+.12*s,'label',new THREE.Vector3(d.x*.4,1.1+.25*s,d.z*.4));
    triggerTimeScale(s,killed,1); flash=Math.max(flash,.35+.15*s); onCameraKick?.({ dir:d, stage:s, killed, point:p }); onAudioCue?.({ stage:s, damage, killed, type, targetKind, whiff:false });
  }
  function triggerTimeScale(stage=1,killed=false,hitCount=1){ stopT=Math.max(stopT,[0,.035,.055,.085][stage]*(killed?1.25:1)); if(stage>=3||killed){ slowT=Math.max(slowT,.18+.05*hitCount); slowScale=.38; } }
  function scaleDt(rawDt){ if(stopT>0) return rawDt*.04; if(slowT>0) return rawDt*slowScale; return rawDt; }
  function update(rawDt){ stopT=Math.max(0,stopT-rawDt); slowT=Math.max(0,slowT-rawDt); flash=Math.max(0,flash-rawDt*2.8); overlay.style.opacity=String(flash); for(let i=effects.length-1;i>=0;i--){ const fx=effects[i]; fx.age+=rawDt; if(fx.vel) fx.mesh.position.addScaledVector(fx.vel,rawDt); const k=fx.age/fx.life; if(fx.kind==='ring'||fx.kind==='ground') fx.mesh.scale.setScalar(1+k*(fx.kind==='ground'?3.8:2.4)); if(fx.mesh.material) fx.mesh.material.opacity=(1-k); if(fx.age>=fx.life){ scene.remove(fx.mesh); fx.mesh.material?.map?.dispose?.(); fx.mesh.material?.dispose?.(); fx.mesh.geometry?.dispose?.(); effects.splice(i,1); } } }
  function dispose(){ overlay.remove(); effects.splice(0).forEach(f=>scene.remove(f.mesh)); }
  return { trigger, triggerSecondary:trigger, triggerTimeScale, scaleDt, update, dispose };
}
function normalize2(v={}){ const x=v.x||0, z=v.z||v.y||0; const l=Math.hypot(x,z)||1; return { x:x/l, z:z/l }; }
