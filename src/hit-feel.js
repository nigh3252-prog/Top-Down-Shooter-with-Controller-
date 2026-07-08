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

export function clamp(value, min, max){ return Math.max(min, Math.min(max, value)); }

export function hitStageFromImpact({ damage = 0, stagger = 1, killed = false, tier = 0, attackGroup = '' } = {}){
  if(killed || tier >= .82 || damage >= 38 || stagger >= 3.2 || attackGroup === 'vertical') return 3;
  if(tier >= .42 || damage >= 19 || stagger >= 1.8 || attackGroup === 'horizontal') return 2;
  return 1;
}

export function buildHitReaction({ stage = 1, killed = false, dir = { x:0, z:1 }, weight = 1 } = {}){
  const s = killed ? 3 : clamp(Math.round(stage || 1), 1, 3);
  const w = Math.max(.35, weight || 1);
  return {
    hitStage:s,
    hitT:s === 1 ? .34 : (s === 2 ? .50 : .92),
    hitMax:s === 1 ? .34 : (s === 2 ? .50 : .92),
    stunned:s === 1 ? .26 : (s === 2 ? .46 : .78),
    lean:s === 1 ? .28 : (s === 2 ? .50 : .82),
    squash:s === 1 ? .16 : (s === 2 ? .26 : .42),
    lift:s === 3 ? .36 / w : (s === 2 ? .10 / w : .04 / w),
    spinVel:(s === 3 ? 10.5 : (s === 2 ? 4.3 : 1.8)) * (Math.random() < .5 ? -1 : 1),
    hitDir:{ x:dir?.x || 0, z:dir?.z || 1 }
  };
}

export function installHitFeel({ THREE, scene, camera, overlayParent = document.body, onCameraKick = null, effects = null } = {}){
  const ownedEffects = effects || [];
  let overlay = null;
  let shake = 0;
  let zoomKick = 0;
  let juice = 0;

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
    const el = ensureOverlay(); if(!el || !camera) return;
    const ndc = v3(point).project(camera);
    el.style.setProperty('--ix', ((ndc.x * .5 + .5) * 100) + '%');
    el.style.setProperty('--iy', ((-ndc.y * .5 + .5) * 100) + '%');
    el.style.transition = 'none'; el.style.opacity = '.95';
    void el.offsetWidth;
    el.style.transition = 'opacity 360ms steps(6,end)'; el.style.opacity = '0';
  }

  function makeDamageSprite(text, color, scale = 1){
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
    const ctx = cv.getContext('2d'); ctx.clearRect(0,0,256,128);
    ctx.font = '900 34px system-ui,Segoe UI,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,.78)'; ctx.fillStyle = '#'+color.toString(16).padStart(6,'0');
    String(text).split('\n').slice(0,2).forEach((line,i)=>{ const y = 48 + i*34; ctx.strokeText(line,128,y); ctx.fillText(line,128,y); });
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map:tex, transparent:true, depthWrite:false });
    const sp = new THREE.Sprite(mat); sp.scale.set(1.25*scale, .62*scale, 1); return sp;
  }

  function add(mesh, life, kind, extra = {}){ scene.add(mesh); ownedEffects.push({ mesh, age:0, life, kind, ...extra }); return mesh; }

  function shockwave(point, color, stage){
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(.22, .018, 6, 48), new THREE.MeshBasicMaterial({ color, transparent:true, opacity:.95, blending:THREE.AdditiveBlending, depthWrite:false }));
    mesh.position.copy(v3(point)); if(camera) mesh.lookAt(camera.position);
    add(mesh, stage >= 3 ? .44 : .30, 'shockwave', { maxScale:stage >= 3 ? 4.2 : 2.2 + stage*.6 });
  }

  function slashBurst(point, dir, color, stage){
    const d = dir3(dir); const base = Math.atan2(d.x, d.z);
    const count = stage >= 3 ? 9 : 4 + stage * 2;
    for(let i=0;i<count;i++){
      const geo = new THREE.PlaneGeometry((stage>=3?.95:.62) * (1+Math.random()*.65), .045 + Math.random()*.055);
      const mat = new THREE.MeshBasicMaterial({ color, transparent:true, opacity:.86, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide });
      const m = new THREE.Mesh(geo, mat); m.position.copy(v3(point)).add(new THREE.Vector3((Math.random()-.5)*.32, (Math.random()-.5)*.18, (Math.random()-.5)*.32));
      m.rotation.set((Math.random()-.5)*1.1, base + Math.PI/2 + (Math.random()-.5)*.75, (Math.random()-.5)*1.1);
      add(m, stage >= 3 ? .28 : .18, 'slash', { vel:d.clone().multiplyScalar(.8 + Math.random()*1.6), spin:(Math.random()-.5)*7 });
    }
  }

  function particleBurst(point, dir, color, stage, type){
    const d = dir3(dir); const count = stage >= 3 ? 54 : 18 + stage*12;
    for(let i=0;i<count;i++){
      const spark = type === 'blunt' || type === 'hybrid';
      const geo = spark ? new THREE.BoxGeometry(.035,.035,.16) : new THREE.SphereGeometry(.035, 6, 4);
      const mat = new THREE.MeshBasicMaterial({ color:spark?0xffd36a:color, transparent:true, opacity:.95, blending:THREE.AdditiveBlending, depthWrite:false });
      const m = new THREE.Mesh(geo, mat); m.position.copy(v3(point));
      const spray = d.clone().multiplyScalar(.7 + Math.random()*(stage>=3?3.8:2.2)).add(new THREE.Vector3((Math.random()-.5)*2.4, Math.random()*1.6 + .25, (Math.random()-.5)*2.4));
      add(m, .35 + Math.random()*.45, 'particle', { vel:spray, gravity:spark?2.8:4.8, spin:new THREE.Vector3(Math.random()*7,Math.random()*7,Math.random()*7) });
    }
  }

  function floater(point, dir, text, color, stage){
    const sp = makeDamageSprite(text, color, stage >= 3 ? 1.8 : 1.15 + stage*.18);
    sp.position.copy(v3(point)).add(new THREE.Vector3(0, .45 + stage*.12, 0));
    add(sp, stage >= 3 ? 1.25 : .92, 'label', { vel:dir3(dir).multiplyScalar(.24).add(new THREE.Vector3((Math.random()-.5)*.2, .85 + stage*.25, (Math.random()-.5)*.2)) });
  }

  function trigger({ point, dir, type = 'slice', damage = 0, label = '', stage = 1, killed = false, whiff = false, targetKind = '' } = {}){
    const p = v3(point); const d = dir3(dir); const s = killed ? 3 : clamp(Math.round(stage || 1), 1, 3); const color = colorFor(type, s);
    if(whiff){ slashBurst(p, d, color, 1); floater(p, d, 'WHIFF', 0xcfefff, 1); shake += .08; return { stage:1 }; }
    overlayImpact(p);
    shockwave(p, color, s); slashBurst(p, d, color, s); particleBurst(p, d, color, s, type);
    const hitLabel = killed ? 'SHATTER!' : (s === 1 ? 'STAGGER!' : (s === 2 ? 'REEL!' : 'LAUNCH!'));
    floater(p, d, `${damage ? damage + ' ' : ''}${hitLabel}${label ? '\n' + label : ''}`, s >= 3 ? 0xffffff : 0xfff3a0, s);
    shake += s === 1 ? .58 : (s === 2 ? .92 : 1.45); zoomKick += s === 3 ? .95 : .30 + s*.12; juice = Math.min(1, juice + .26 + s*.22);
    onCameraKick?.({ x:-d.x*.30*s + (Math.random()-.5)*.35, y:-.7*s, z:-d.z*.30*s, shake, zoomKick, stage:s, targetKind });
    return { stage:s, shake, zoomKick };
  }

  function update(dt){
    shake = Math.max(0, shake - dt*4.5); zoomKick = Math.max(0, zoomKick - dt*5.2); juice = Math.max(0, juice - dt*2.8);
    for(let i=ownedEffects.length-1;i>=0;i--){
      const fx = ownedEffects[i]; fx.age += dt; const k = clamp(fx.age / fx.life, 0, 1);
      if(fx.vel) fx.mesh.position.addScaledVector(fx.vel, dt);
      if(fx.gravity) fx.vel.y -= fx.gravity * dt;
      if(fx.spin?.isVector3){ fx.mesh.rotation.x += fx.spin.x*dt; fx.mesh.rotation.y += fx.spin.y*dt; fx.mesh.rotation.z += fx.spin.z*dt; }
      if(fx.kind === 'shockwave'){ fx.mesh.scale.setScalar(1 + k * fx.maxScale); fx.mesh.material.opacity = 1 - k; if(camera) fx.mesh.lookAt(camera.position); }
      else if(fx.kind === 'slash'){ fx.mesh.position.addScaledVector(fx.vel, dt); fx.mesh.rotation.z += fx.spin*dt; fx.mesh.material.opacity = 1 - k; }
      else if(fx.kind === 'label'){ fx.mesh.material.opacity = 1 - k*k; if(camera) fx.mesh.lookAt(camera.position); }
      else { fx.mesh.material.opacity = 1 - k; }
      if(fx.age >= fx.life){ fx.mesh.parent?.remove(fx.mesh); fx.mesh.material?.map?.dispose?.(); fx.mesh.material?.dispose?.(); fx.mesh.geometry?.dispose?.(); ownedEffects.splice(i,1); }
    }
  }

  return { trigger, update, buildReaction:buildHitReaction, hitStageFromImpact };
}
