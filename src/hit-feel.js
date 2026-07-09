// Shared over-the-top combat hit feedback inspired by fencer_hit_feel_lab_v3.
// Hosts provide THREE/scene/camera and call update(dt). trigger(...) adds all
// transient world/screen effects; enemy systems can use buildHitReaction(...).

export const HIT_TYPE_COLOR = Object.freeze({
  slice: 0x9bd7f0,
  pierce: 0xf4e0a2,
  blunt: 0xffb066,
  hybrid: 0xd7b6ff,
  weak: 0x9aabc4,
  kill: 0xffffff
});

const BLOOD_COLOR = 0xb7191f;
const DUST_COLOR = 0xc89a64;
const WOOD_COLOR = 0x8b5a2b;

export function clamp(value, min, max){ return Math.max(min, Math.min(max, value)); }

export function hitStageFromImpact({ damage = 0, stagger = 1, killed = false, tier = 0, attackGroup = '' } = {}){
  if(killed || tier >= .82 || damage >= 38 || stagger >= 3.2 || attackGroup === 'vertical') return 3;
  if(tier >= .42 || damage >= 19 || stagger >= 1.8 || attackGroup === 'horizontal') return 2;
  return 1;
}

export function buildHitReaction({ stage = 1, killed = false, dir = { x:0, z:1 }, weight = 1 } = {}){
  const s = killed ? 3 : clamp(Math.round(stage || 1), 1, 3);
  const w = Math.max(.35, weight || 1);
  const knockMul = (s === 1 ? 1.55 : (s === 2 ? 2.45 : 4.35)) / w;
  return {
    hitStage:s,
    hitT:s === 1 ? .38 : (s === 2 ? .58 : 1.05),
    hitMax:s === 1 ? .38 : (s === 2 ? .58 : 1.05),
    stunned:s === 1 ? .34 : (s === 2 ? .62 : 1.05),
    lean:s === 1 ? .34 : (s === 2 ? .62 : 1.05),
    squash:s === 1 ? .22 : (s === 2 ? .32 : .50),
    lift:s === 3 ? .62 / w : (s === 2 ? .18 / w : .06 / w),
    airVy:s === 3 ? 4.4 / w : (s === 2 ? 1.15 / w : .35 / w),
    launchedT:s === 3 ? 1.1 : 0,
    knockMul,
    spinVel:(s === 3 ? 13.5 : (s === 2 ? 5.4 : 2.4)) * (Math.random() < .5 ? -1 : 1),
    hitDir:{ x:dir?.x || 0, z:dir?.z || 1 }
  };
}

export function installHitFeel({ THREE, scene, camera, overlayParent = document.body, onCameraKick = null, onAudioCue = null, effects = null, effectLevels = null } = {}){
  const ownedEffects = effects || [];
  const LEVEL_SCALE = Object.freeze({ off:0, low:.35, medium:.68, high:1 });
  const BLOOD_LEVEL_SCALE = Object.freeze({ off:0, low:.25, medium:.5, high:.5 });
  const BLOOD_SIZE_SCALE = Object.freeze({ off:0, low:6, medium:24, high:100 });
  const GROUND_LEVEL_SCALE = Object.freeze({ off:0, low:.55, medium:1.15, high:2.1 });
  const effectMix = {
    overlay:'high', shockwave:'high', slash:'high', particles:'high',
    bloodSpray:'high', groundBlood:'high', labels:'high', camera:'high', timeScale:'high',
    ...(effectLevels || {})
  };
  function setEffectLevel(name, level){ if(Object.prototype.hasOwnProperty.call(LEVEL_SCALE, level)) effectMix[name] = level; }
  function setEffectLevels(levels = {}){ Object.entries(levels).forEach(([name, level])=>setEffectLevel(name, level)); }
  function getEffectLevels(){ return { ...effectMix }; }
  function effectLevel(name){ return effectMix[name] || 'high'; }
  function effectScale(name){
    const table = name === 'bloodSpray' ? BLOOD_LEVEL_SCALE : (name === 'groundBlood' ? GROUND_LEVEL_SCALE : LEVEL_SCALE);
    return table[effectLevel(name)] ?? 1;
  }
  const splats = [];
  const smears = [];
  let overlay = null;
  let shake = 0;
  let zoomKick = 0;
  let juice = 0;
  let hitstop = 0;
  let slowMo = 0;
  let lastImpactPoint = null;
  const camKick = new THREE.Vector3();

  function rand(a,b){ return a + Math.random() * (b-a); }
  function planarAngle(dir){ return Math.atan2(dir.x, dir.z); }
  function isDummy(kind){ return kind === 'dummy' || kind === 'edgeDummy'; }
  function ensureOverlay(){
    if(overlay || !overlayParent) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'shared-hit-feel-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:8;opacity:0;mix-blend-mode:screen;background:radial-gradient(circle at var(--ix,50%) var(--iy,50%), rgba(255,255,255,.92) 0%, rgba(255,213,29,.40) 7%, rgba(255,118,24,.22) 18%, transparent 44%),radial-gradient(circle at center, transparent 46%, rgba(255,213,29,.08) 72%, rgba(255,118,24,.25) 100%);transition:opacity 360ms steps(6,end)';
    overlayParent.appendChild(overlay);
    return overlay;
  }

  function colorFor(type, stage){ return stage >= 3 ? 0xffffff : (HIT_TYPE_COLOR[type] || 0xffffff); }
  function v3(point){ return point?.isVector3 ? point.clone() : new THREE.Vector3(point?.x || 0, point?.y || 0, point?.z || 0); }
  function dir3(dir){ const d = dir?.isVector3 ? dir.clone() : new THREE.Vector3(dir?.x || 0, dir?.y || 0, dir?.z || 1); if(d.lengthSq()<1e-6) d.set(0,0,1); return d.normalize(); }

  function overlayImpact(point){
    const scale = effectScale('overlay'); if(scale <= 0) return;
    const el = ensureOverlay(); if(!el || !camera) return;
    const ndc = v3(point).project(camera);
    el.style.setProperty('--ix', ((ndc.x * .5 + .5) * 100) + '%');
    el.style.setProperty('--iy', ((-ndc.y * .5 + .5) * 100) + '%');
    el.style.transition = 'none'; el.style.opacity = String(.95 * scale);
    void el.offsetWidth;
    el.style.transition = 'opacity 360ms steps(6,end)'; el.style.opacity = '0';
  }

  function makeDamageSprite(text, color, scale = 1){
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 192;
    const ctx = cv.getContext('2d'); ctx.clearRect(0,0,512,192);
    ctx.font = '900 '+Math.round(58*scale)+'px system-ui,Segoe UI,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(20,16,24,.92)'; ctx.fillStyle = '#'+color.toString(16).padStart(6,'0');
    String(text).split('\n').slice(0,2).forEach((line,i)=>{ const y = 82 + i*52; ctx.strokeText(line,256,y); ctx.fillText(line,256,y); });
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map:tex, transparent:true, depthWrite:false });
    const sp = new THREE.Sprite(mat); sp.scale.set(2.15*scale, .80*scale, 1); return sp;
  }

  function add(mesh, life, kind, extra = {}){ scene.add(mesh); ownedEffects.push({ mesh, age:0, life, kind, ...extra }); return mesh; }
  function disposeMesh(mesh){ mesh.parent?.remove(mesh); mesh.material?.map?.dispose?.(); mesh.material?.dispose?.(); mesh.geometry?.dispose?.(); }

  function shockwave(point, color, stage){
    const scale = effectScale('shockwave'); if(scale <= 0) return;
    const p = v3(point);
    const ground = new THREE.Mesh(new THREE.RingGeometry(.72, .82, 56), new THREE.MeshBasicMaterial({ color, transparent:true, opacity:.85, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending }));
    ground.rotation.x = -Math.PI/2; ground.position.set(p.x, .035, p.z);
    add(ground, stage >= 3 ? .44 : .30, 'groundWave', { maxScale:(stage >= 3 ? 4.2 : 2.2 + stage*.6) * scale });
    const air = new THREE.Mesh(new THREE.TorusGeometry(.22, .018, 6, 48), new THREE.MeshBasicMaterial({ color, transparent:true, opacity:.95, blending:THREE.AdditiveBlending, depthWrite:false }));
    air.position.copy(p); if(camera) air.lookAt(camera.position);
    add(air, stage >= 3 ? .38 : .26, 'shockwave', { maxScale:(stage >= 3 ? 3.2 : 1.7 + stage*.45) * scale });
  }

  function slashBurst(point, dir, color, stage){
    const scale = effectScale('slash'); if(scale <= 0) return;
    const p = v3(point), d = dir3(dir); const base = planarAngle(d);
    const count = Math.max(1, Math.round((stage >= 3 ? 10 : 4 + stage * 2) * scale));
    for(let i=0;i<count;i++){
      const geo = new THREE.BoxGeometry(.07 + Math.random()*.08, .055, (stage >= 3 ? 3.4 : 2.1 + stage*.35) * (0.55 + Math.random()*.85));
      const mat = new THREE.MeshBasicMaterial({ color, transparent:true, opacity:.88, blending:THREE.AdditiveBlending, depthWrite:false });
      const m = new THREE.Mesh(geo, mat); m.position.copy(p).add(d.clone().multiplyScalar(.6 + Math.random()*.8)); m.position.y += rand(.15,.75);
      m.rotation.set(rand(-.25,.25), base + rand(-.35,.35), rand(-.55,.55));
      add(m, stage >= 3 ? .28 : .18, 'slash', { vel:d.clone().multiplyScalar(.4 + Math.random()*1.2), spin:(Math.random()-.5)*8 });
    }
  }

  function bloodSpray(point, dir, stage, bloodColor){
    const scale = effectScale('bloodSpray'); if(scale <= 0) return;
    const sizeScale = BLOOD_SIZE_SCALE[effectLevel('bloodSpray')] || 1;
    const p = v3(point).add(new THREE.Vector3(0, .62, 0)), d = dir3(dir), side = new THREE.Vector3(-d.z, 0, d.x);
    const count = Math.max(1, Math.round((stage >= 3 ? 120 : (stage === 2 ? 62 : 28)) * scale));
    const dropScale = sizeScale;
    for(let i=0;i<count;i++){
      const streak = Math.random() > .42;
      const geo = streak ? new THREE.BoxGeometry(rand(.035,.08)*dropScale, rand(.035,.08)*dropScale, rand(.20,.56)*dropScale) : new THREE.DodecahedronGeometry(rand(.035,.075)*dropScale, 0);
      const mat = new THREE.MeshBasicMaterial({ color:Math.random() > .18 ? bloodColor : 0xff4a22, transparent:true, opacity:rand(.78,1), depthWrite:false });
      const m = new THREE.Mesh(geo, mat); m.position.copy(p).add(side.clone().multiplyScalar(rand(-.14,.14)));
      m.rotation.set(rand(-1.2,1.2), planarAngle(d) + rand(-.7,.7), rand(-1.2,1.2));
      const vel = d.clone().multiplyScalar(rand(2.4, stage >= 3 ? 9.6 : 6.4) * (.70 + Math.sqrt(sizeScale)*.045))
        .add(side.clone().multiplyScalar(rand(-3.8,3.8) * (.68 + Math.sqrt(sizeScale)*.035)))
        .add(new THREE.Vector3(0, rand(1.8, stage >= 3 ? 6.6 : 4.8) * (.68 + Math.sqrt(sizeScale)*.035), 0));
      add(m, rand(.26,.82), 'bloodDrop', { vel, gravity:6.6, spin:new THREE.Vector3(rand(-12,12),rand(-12,12),rand(-12,12)), bloodColor });
    }
    const puffCount = Math.max(1, Math.round((stage >= 3 ? 11 : stage === 2 ? 7 : 4) * scale));
    for(let i=0;i<puffCount;i++){
      const radius = rand(.16,.34) * (stage >= 3 ? 1.22 : 1) * sizeScale;
      const mat = new THREE.MeshBasicMaterial({ color:Math.random()>.38 ? bloodColor : 0xff7556, transparent:true, opacity:rand(.28,.48), depthWrite:false, blending:THREE.AdditiveBlending });
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 1), mat);
      m.position.copy(p).add(d.clone().multiplyScalar(rand(.12,.72))).add(side.clone().multiplyScalar(rand(-.45,.45))).add(new THREE.Vector3(0, rand(-.08,.34), 0));
      const vel = d.clone().multiplyScalar(rand(.95, 3.9) * (.85 + scale*.35)).add(side.clone().multiplyScalar(rand(-1.9,1.9))).add(new THREE.Vector3(0, rand(.45,2.5), 0));
      add(m, rand(.20,.48), 'bloodPuff', { vel, gravity:1.8, spin:new THREE.Vector3(rand(-2.2,2.2),rand(-2.2,2.2),rand(-2.2,2.2)) });
    }
  }

  function particleBurst(point, dir, color, stage, type, targetKind){
    const scale = effectScale('particles'); if(scale <= 0) return;
    const p = v3(point), d = dir3(dir); const dummy = isDummy(targetKind); const count = Math.max(1, Math.round((stage >= 3 ? 86 : 24 + stage*18) * scale));
    const side = new THREE.Vector3(-d.z, 0, d.x);
    for(let i=0;i<count;i++){
      const spark = type === 'blunt' || type === 'hybrid';
      const chip = dummy && Math.random() > .28;
      const geo = chip ? new THREE.BoxGeometry(rand(.04,.10),rand(.025,.07),rand(.10,.24)) : (spark ? new THREE.BoxGeometry(.035,.035,.18) : new THREE.SphereGeometry(.035, 6, 4));
      const mat = new THREE.MeshBasicMaterial({ color:dummy ? (chip ? WOOD_COLOR : DUST_COLOR) : (spark ? 0xffd36a : color), transparent:true, opacity:.95, blending:dummy ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite:false });
      const m = new THREE.Mesh(geo, mat); m.position.copy(p);
      const spray = d.clone().multiplyScalar(rand(1.2, stage >= 3 ? 7.8 : 4.5)).add(side.clone().multiplyScalar(rand(-2.8, 2.8))).add(new THREE.Vector3(0, rand(1.2, stage >= 3 ? 5.2 : 3.6), 0));
      add(m, rand(.18,.68), 'particle', { vel:spray, gravity:dummy ? 5.8 : (spark ? 2.8 : 4.8), spin:new THREE.Vector3(rand(-10,10),rand(-10,10),rand(-10,10)) });
    }
  }

  function groundSplat(pos, dir, color, amount = 8, big = false, targetKind = ''){
    const scale = effectScale('groundBlood'); if(scale <= 0) return;
    amount *= scale;
    if(isDummy(targetKind)) return dummyDebris(pos, dir, amount, big);
    const p0 = v3(pos), d = dir3(dir), side = new THREE.Vector3(-d.z,0,d.x);
    const count = Math.min(110, Math.max(0, amount));
    for(let i=0;i<count;i++){
      const r = rand(.08, big ? .45 : .24);
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(r, 9), new THREE.MeshBasicMaterial({ color, transparent:true, opacity:rand(.45,.84), depthWrite:false, side:THREE.DoubleSide }));
      mesh.rotation.x = -Math.PI/2;
      const p = p0.clone().add(d.clone().multiplyScalar(rand(-.16, big ? 2.4 : 1.05))).add(side.clone().multiplyScalar(rand(big ? -1.5 : -.75, big ? 1.5 : .75)));
      mesh.position.set(p.x, .018 + splats.length * .00002, p.z);
      mesh.scale.set(rand(.9, big ? 4.2 : 2.2), rand(.45, big ? 1.75 : 1.1), 1);
      mesh.rotation.z = rand(0, Math.PI*2); scene.add(mesh); splats.push(mesh);
      if(splats.length > 320) disposeMesh(splats.shift());
    }
  }

  function bloodSmear(start, dir, color, power = 1, targetKind = ''){
    const scale = effectScale('groundBlood'); if(scale <= 0 || isDummy(targetKind)) return;
    power *= Math.max(.45, scale);
    const s = v3(start), d = dir3(dir), side = new THREE.Vector3(-d.z,0,d.x);
    for(let i=0;i<8 + power*5;i++){
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(rand(.24,.70)*power, rand(.95,2.35)*power), new THREE.MeshBasicMaterial({ color, transparent:true, opacity:rand(.22,.42), depthWrite:false, side:THREE.DoubleSide }));
      mesh.rotation.x = -Math.PI/2; mesh.rotation.z = -planarAngle(d) + rand(-.22,.22);
      const p = s.clone().add(d.clone().multiplyScalar(rand(.2,2.2*power))).add(side.clone().multiplyScalar(rand(-.35,.35)));
      mesh.position.set(p.x, .019 + smears.length*.000025, p.z); scene.add(mesh); smears.push(mesh);
      if(smears.length > 90) disposeMesh(smears.shift());
    }
  }

  function dummyDebris(pos, dir, amount = 8, big = false){
    const p0 = v3(pos), d = dir3(dir), side = new THREE.Vector3(-d.z,0,d.x);
    const count = Math.min(50, Math.max(4, Math.round(amount*.8)));
    for(let i=0;i<count;i++){
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(rand(.025,.08), .012, rand(.05,.16)), new THREE.MeshBasicMaterial({ color:Math.random()>.25?WOOD_COLOR:DUST_COLOR, transparent:true, opacity:rand(.38,.75), depthWrite:false }));
      mesh.rotation.x = -Math.PI/2; mesh.rotation.z = planarAngle(d)+rand(-.7,.7);
      const p = p0.clone().add(d.clone().multiplyScalar(rand(.15, big ? 1.6 : .75))).add(side.clone().multiplyScalar(rand(-.7,.7)));
      mesh.position.set(p.x, .022 + splats.length*.00002, p.z); mesh.scale.setScalar(big ? rand(1.2,2.4) : rand(.7,1.4)); scene.add(mesh); splats.push(mesh);
      if(splats.length > 320) disposeMesh(splats.shift());
    }
  }

  function floater(point, dir, text, color, stage){
    const scale = effectScale('labels'); if(scale <= 0) return;
    const sp = makeDamageSprite(text, color, (stage >= 3 ? 1.25 : .86 + stage*.10) * (.75 + scale*.25));
    sp.position.copy(v3(point)).add(dir3(dir).multiplyScalar(.72)); sp.position.y += 1.05 + stage*.18;
    add(sp, stage >= 3 ? 1.25 : .92, 'label', { vel:dir3(dir).multiplyScalar(.7).add(new THREE.Vector3(0, 1.05 + stage*.22, 0)) });
  }

  function applyTimeScalePulse(stage, killed = false, multiCount = 1){
    const scale = effectScale('timeScale'); if(scale <= 0) return;
    const m = Math.max(1, multiCount || 1);
    const s = killed ? 3 : clamp(Math.round(stage || 1), 1, 3);
    const multiBoost = m > 1 ? Math.min(.09, .025 * (m - 1)) : 0;
    hitstop = Math.min(.38, Math.max(hitstop, ((s === 3 ? .23 : (s === 2 ? .17 : .12)) + multiBoost) * scale));
    slowMo = Math.max(slowMo, ((s === 3 ? .26 : (s === 2 ? .18 : .08)) + (m > 1 ? .05 : 0)) * scale);
  }

  function trigger({ point, dir, type = 'slice', damage = 0, label = '', stage = 1, killed = false, whiff = false, targetKind = '', bloodColor = BLOOD_COLOR, timeScale = true } = {}){
    const p = v3(point); const d = dir3(dir); const s = killed ? 3 : clamp(Math.round(stage || 1), 1, 3); const color = colorFor(type, s);
    lastImpactPoint = p.clone();
    if(whiff){ if(timeScale && effectScale('timeScale') > 0) hitstop = Math.max(hitstop, .018 * effectScale('timeScale')); slashBurst(p, d, color, 1); floater(p, d, 'WHIFF', 0xcfefff, 1); shake += .08; onAudioCue?.({ kind:'whiff', stage:1, type, targetKind }); return { stage:1 }; }
    if(timeScale) applyTimeScalePulse(s, killed, 1);
    overlayImpact(p);
    shockwave(p, color, s); slashBurst(p, d, color, s); particleBurst(p, d, color, s, type, targetKind);
    if(!isDummy(targetKind)) bloodSpray(p, d, s, bloodColor);
    groundSplat(p.clone().add(d.clone().multiplyScalar(.20)), d, bloodColor, s === 3 ? 68 : 14 + s*14, s === 3 || killed, targetKind);
    if(s >= 2) bloodSmear(p, d, bloodColor, s === 3 ? 1.95 : 1.05, targetKind);
    const hitLabel = killed ? 'SHATTER!' : (s === 1 ? 'STAGGER!' : (s === 2 ? 'REEL!' : 'LAUNCH!'));
    floater(p, d, `${damage ? damage + ' ' : ''}${hitLabel}${label ? '\n' + label : ''}`, s >= 3 ? 0xffffff : 0xfff3a0, s);
    const camScale = effectScale('camera');
    shake += (s === 1 ? .58 : (s === 2 ? .92 : 1.45)) * camScale; zoomKick += (s === 3 ? .95 : .30 + s*.12) * camScale; juice = Math.min(1, juice + (.26 + s*.22) * Math.max(camScale, effectScale('overlay')));
    if(camScale > 0){
      camKick.add(d.clone().multiplyScalar(-.30*s*camScale));
      onCameraKick?.({ x:(-d.x*.60*s + (Math.random()-.5)*.35)*camScale, y:-.7*s*camScale, z:-d.z*.60*s*camScale, shake, zoomKick, stage:s, point:p.clone(), targetKind });
    }
    onAudioCue?.({ kind:killed?'kill':'hit', stage:s, type, damage, targetKind });
    return { stage:s, shake, zoomKick, hitstop, slowMo };
  }

  function triggerSecondary({ point, dir, label = 'WALL SPLAT!', targetKind = '', bloodColor = BLOOD_COLOR } = {}){
    hitstop = 0; slowMo = 0;
    const p = v3(point), d = dir3(dir);
    const camScale = effectScale('camera');
    const wallImpact = /wall/i.test(label);
    if(wallImpact){ shake += .75 * camScale; zoomKick += .32 * camScale; if(camScale > 0) camKick.add(d.clone().multiplyScalar(.55 * camScale)); }
    shockwave(p, BLOOD_COLOR, 3); if(!isDummy(targetKind)) bloodSpray(p, d, 3, bloodColor); groundSplat(p, d, bloodColor, 58, true, targetKind); bloodSmear(p, d, bloodColor, 1.7, targetKind); floater(p, d, label, 0xffffff, 3);
    if(wallImpact && camScale > 0) onCameraKick?.({ x:d.x*.55*camScale, y:-.55*camScale, z:d.z*.55*camScale, shake, zoomKick, stage:3, point:p.clone(), targetKind });
    onAudioCue?.({ kind:'wallSplat', stage:3, targetKind });
  }

  function update(dt){
    hitstop = Math.max(0, hitstop - dt); slowMo = Math.max(0, slowMo - dt);
    shake = Math.max(0, shake - dt*4.5); zoomKick = Math.max(0, zoomKick - dt*5.2); juice = Math.max(0, juice - dt*2.8); camKick.multiplyScalar(Math.pow(.06, dt));
    for(let i=ownedEffects.length-1;i>=0;i--){
      const fx = ownedEffects[i]; fx.age += dt; const k = clamp(fx.age / fx.life, 0, 1);
      if(fx.vel) fx.mesh.position.addScaledVector(fx.vel, dt);
      if(fx.gravity) fx.vel.y -= fx.gravity * dt;
      if(fx.spin?.isVector3){ fx.mesh.rotation.x += fx.spin.x*dt; fx.mesh.rotation.y += fx.spin.y*dt; fx.mesh.rotation.z += fx.spin.z*dt; }
      if(fx.kind === 'bloodDrop' && !fx.splatted && fx.mesh.position.y <= .045){ fx.splatted = true; groundSplat(fx.mesh.position, fx.vel.clone().setY(0), fx.bloodColor || BLOOD_COLOR, 1, false, ''); }
      if(fx.kind === 'shockwave'){ fx.mesh.scale.setScalar(1 + k * fx.maxScale); fx.mesh.material.opacity = 1 - k; if(camera) fx.mesh.lookAt(camera.position); }
      else if(fx.kind === 'groundWave'){ fx.mesh.scale.setScalar(1 + k * fx.maxScale); fx.mesh.material.opacity = .85 * (1 - k); }
      else if(fx.kind === 'slash'){ fx.mesh.position.addScaledVector(fx.vel, dt); fx.mesh.rotation.z += fx.spin*dt; fx.mesh.material.opacity = 1 - k; }
      else if(fx.kind === 'label'){ fx.mesh.material.opacity = 1 - k*k; if(camera) fx.mesh.lookAt(camera.position); }
      else { fx.mesh.material.opacity = 1 - k; }
      if(fx.age >= fx.life){ disposeMesh(fx.mesh); ownedEffects.splice(i,1); }
    }
  }

  function scaleDt(rawDt){ return hitstop > 0 ? rawDt * .035 : (slowMo > 0 ? rawDt * .45 : rawDt); }
  function getState(){ return { hitstop, slowMo, shake, zoomKick, juice, camKick:camKick.clone(), lastImpactPoint:lastImpactPoint?.clone?.() || null }; }

  return { trigger, triggerSecondary, triggerTimeScale:applyTimeScalePulse, update, scaleDt, getState, getJuice:()=>juice, setEffectLevel, setEffectLevels, getEffectLevels, buildReaction:buildHitReaction, hitStageFromImpact };
}
