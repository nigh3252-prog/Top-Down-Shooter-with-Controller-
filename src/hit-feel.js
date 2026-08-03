// Hit-feel juice system — ported from fencer_hit_feel_lab_v3.html into a shared
// module so the real game (combat-arena.html, weapon-lab.html) gets the full
// impact stack: global hitstop + slow-mo aftertaste, camera jitter/directional
// kick/zoom punch, screen-space impact flash, blood + spark spray, shockwaves,
// slash bursts, ground splat/smear permanence, and floating text — every channel
// scaled by hit power and by a persisted tuning panel (defaults tuned BIG; pull
// individual sliders back in-game with the hidden panel: backtick or ?tune=1).
//
// Usage:
//   const HitFeel = installHitFeel({ THREE, scene, camera, settings, audio });
//   frame loop:   const dt = HitFeel.update(rawDt);   // dt freezes during hitstop
//   camera:       pos += jitter (HitFeel.jitter) + HitFeel.camKick; zoom -= HitFeel.zoomKick
//   on hit:       HitFeel.impact({ point, dir, damage, kill, color });
//   on hurt:      HitFeel.playerHurt({ dir, damage });

const DEFAULTS = {
  master:   1.0,   // global intensity, 0..2 (0 ≈ the old game)
  hitstop:  0.11,  // seconds of near-freeze per hit, scaled by power
  slowmo:   1,     // slow-mo aftertaste after big hits (checkbox)
  shake:    1.0,   // random camera jitter
  kick:     1.0,   // directional camera kick away from impact
  zoom:     1.0,   // camera zoom punch toward the action
  knock:    2.2,   // knockback multiplier fed back to the game
  pop:      1.0,   // enemy vertical pop / squash scale
  particles: 90,   // blood + spark count per hit
  gore:     1,     // persistent ground splats + smears (checkbox)
  flash:    1.0,   // screen-space impact flash opacity
  floaters: 1,     // floating text (checkbox)
  sound:    1.0,   // layered impact SFX gain (0 = off)
};

// Slider/checkbox metadata, grouped into collapsible sections so the panel can
// be shrunk on a phone. Master intensity always renders outside any section.
const SLIDER_DEFS = {
  hitstop:   ['Hitstop',        0, .3,  .005],
  shake:     ['Screen Shake',   0, 2,   .01],
  kick:      ['Camera Kick',    0, 2,   .01],
  zoom:      ['Zoom Punch',     0, 2,   .01],
  knock:     ['Knockback',      0, 4,   .05],
  pop:       ['Pop + Squash',   0, 2,   .01],
  particles: ['Particles',      0, 150, 1],
  flash:     ['Impact Flash',   0, 2,   .01],
  sound:     ['Impact Sound',   0, 2,   .01],
};
const CHECK_DEFS = {
  slowmo:   'Slow-mo aftertaste',
  gore:     'Blood permanence',
  floaters: 'Floating text',
};
const SECTIONS = [
  { id: 'time',   label: 'TIME & HITSTOP', sliders: ['hitstop'],            checks: ['slowmo'] },
  { id: 'camera', label: 'CAMERA',         sliders: ['shake', 'kick', 'zoom'] },
  { id: 'body',   label: 'ENEMY BODY',     sliders: ['knock', 'pop'] },
  { id: 'vfx',    label: 'VFX & GORE',     sliders: ['particles', 'flash'], checks: ['gore', 'floaters'] },
  { id: 'audio',  label: 'AUDIO',          sliders: ['sound'] },
];

export function installHitFeel({ THREE, scene, camera, settings = null, audio = null } = {}) {
  /* ---------- tuning (persisted per-key) ---------- */
  const tuning = { ...DEFAULTS };
  for (const k of Object.keys(DEFAULTS)) {
    const v = settings?.get?.('hitfeel.' + k, DEFAULTS[k]);
    tuning[k] = Number(v);
    if (!Number.isFinite(tuning[k])) tuning[k] = DEFAULTS[k];
  }
  function setTune(k, v) {
    tuning[k] = Number(v);
    settings?.set?.('hitfeel.' + k, tuning[k]);
  }

  /* ---------- time + camera state ---------- */
  let hitstop = 0, slowMo = 0;
  let shakeAmt = 0, zoomKick = 0;
  const camKick = new THREE.Vector3();

  /* ---------- effect pools ---------- */
  const particles = [], rings = [], slashes = [], floaters = [], splats = [], smears = [];
  const SPLAT_CAP = 200, SMEAR_CAP = 60, PARTICLE_CAP = 260, FLOATER_CAP = 4;
  // shared unit geometries — meshes scale themselves, never dispose these
  const boxGeom = new THREE.BoxGeometry(.08, .08, .08);
  const chunkGeom = new THREE.DodecahedronGeometry(.06, 0);
  const circleGeom = new THREE.CircleGeometry(1, 9);
  const ringGeom = new THREE.RingGeometry(.72, .82, 56);
  const smearGeom = new THREE.PlaneGeometry(1, 1);
  const BLOOD = 0x86b053, BLOOD_DARK = 0x4d6e2e;   // goblin green

  const randomRange = (a, b) => a + Math.random() * (b - a);
  const planarAngle = d => Math.atan2(d.x, d.z);

  /* ---------- screen-space impact flash overlay ---------- */
  let overlay = null;
  function ensureOverlay() {
    if (overlay || typeof document === 'undefined') return;
    overlay = document.createElement('div');
    overlay.id = 'hitFeelOverlay';
    document.body.appendChild(overlay);
  }
  function overlayImpact(world, strength = 1) {
    ensureOverlay();
    if (!overlay || strength <= 0) return;
    const ndc = world.clone().project(camera);
    overlay.style.setProperty('--ix', (ndc.x * .5 + .5) * 100 + '%');
    overlay.style.setProperty('--iy', (-ndc.y * .5 + .5) * 100 + '%');
    overlay.style.setProperty('--iop', Math.min(1, .95 * strength));
    overlay.classList.remove('flash');
    void overlay.offsetWidth;
    overlay.classList.add('flash');
  }

  /* ---------- particle library (lab port) ---------- */
  function shockwave(pos, color, maxR = 3, life = .34) {
    const mesh = new THREE.Mesh(ringGeom,
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .85, depthWrite: false, side: THREE.DoubleSide }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, .04, pos.z);
    scene.add(mesh);
    rings.push({ mesh, t: 0, life, maxR });
  }
  function slashBurst(pos, dir, color, length = 2.3, width = .18) {
    const mesh = new THREE.Mesh(boxGeom,
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .88, depthWrite: false }));
    mesh.scale.set(width / .08, .055 / .08, length / .08);
    mesh.position.copy(pos).addScaledVector(dir, .9);
    mesh.position.y = Math.max(.7, pos.y);
    mesh.rotation.y = planarAngle(dir) + randomRange(-.22, .22);
    mesh.rotation.z = randomRange(-.36, .36);
    scene.add(mesh);
    slashes.push({ mesh, life: .14, maxLife: .14 });
  }
  function spawnParticle(pos, vel, life, color, scale = 1, cube = true) {
    if (particles.length >= PARTICLE_CAP) {
      const old = particles.shift();
      scene.remove(old.mesh); old.mesh.material.dispose();
    }
    const mesh = new THREE.Mesh(cube ? boxGeom : chunkGeom,
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 }));
    mesh.position.copy(pos);
    mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    mesh.scale.setScalar(scale);
    scene.add(mesh);
    particles.push({ mesh, vel: vel.clone(), life, maxLife: life, color, baseScale: scale, spin: randomRange(-12, 12) });
  }
  function bloodSplat(pos, dir, color, amount = 8, big = false) {
    if (tuning.gore <= 0) return;
    const count = Math.min(55, Math.max(0, Math.round(amount)));
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    for (let i = 0; i < count; i++) {
      const r = randomRange(.06, big ? .27 : .16);
      const mesh = new THREE.Mesh(circleGeom,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: randomRange(.45, .84), depthWrite: false }));
      mesh.rotation.x = -Math.PI / 2;
      const p = pos.clone()
        .addScaledVector(dir, randomRange(-.12, big ? 1.45 : .75))
        .addScaledVector(side, randomRange(big ? -1.1 : -.55, big ? 1.1 : .55));
      mesh.position.set(p.x, .018 + splats.length * .00002, p.z);
      mesh.scale.set(r * randomRange(.7, big ? 2.8 : 1.7), r * randomRange(.35, big ? 1.35 : .9), 1);
      mesh.rotation.z = randomRange(0, Math.PI * 2);
      scene.add(mesh);
      splats.push(mesh);
      if (splats.length > SPLAT_CAP) {
        const old = splats.shift();
        scene.remove(old); old.material.dispose();
      }
    }
  }
  function bloodSmear(start, dir, color, power = 1) {
    if (tuning.gore <= 0) return;
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    for (let i = 0; i < 6 + power * 3; i++) {
      const mesh = new THREE.Mesh(smearGeom,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: randomRange(.22, .42), depthWrite: false, side: THREE.DoubleSide }));
      mesh.scale.set(randomRange(.20, .52) * power, randomRange(.75, 1.75) * power, 1);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = -planarAngle(dir) + randomRange(-.22, .22);
      const p = start.clone().addScaledVector(dir, randomRange(.2, 2.2 * power)).addScaledVector(side, randomRange(-.35, .35));
      mesh.position.set(p.x, .019 + smears.length * .000025, p.z);
      scene.add(mesh);
      smears.push(mesh);
      if (smears.length > SMEAR_CAP) {
        const old = smears.shift();
        scene.remove(old); old.material.dispose();
      }
    }
  }
  function sprayBlood(pos, dir, color, count, power = 1) {
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    for (let i = 0; i < count; i++) {
      const v = dir.clone().multiplyScalar(randomRange(1.2, 7.8) * power)
        .addScaledVector(side, randomRange(-2.8, 2.8) * power)
        .add(new THREE.Vector3(0, randomRange(1.2, 5.2) * power, 0));
      spawnParticle(pos, v, randomRange(.18, .62), Math.random() > .22 ? color : BLOOD_DARK, randomRange(.75, 2.2) * power, Math.random() > .35);
    }
  }
  function makeTextSprite(text, color = '#fff5cf', size = 72) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 192;
    const ctx = canvas.getContext('2d');
    ctx.font = '900 ' + size + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 13;
    ctx.strokeStyle = 'rgba(20,16,24,.95)';
    ctx.strokeText(text, 256, 96);
    ctx.fillStyle = color;
    ctx.fillText(text, 256, 96);
    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sprite.scale.set(2.85, 1.05, 1);
    return sprite;
  }
  function floater(text, pos, dir, scale = 1, color = '#fff5cf') {
    if (tuning.floaters <= 0) return;
    if (floaters.length >= FLOATER_CAP) {
      const old = floaters.shift();
      scene.remove(old.mesh); old.mesh.material.map?.dispose(); old.mesh.material.dispose();
    }
    const mesh = makeTextSprite(text, color, Math.round(72 * Math.min(1.6, scale)));
    mesh.position.copy(pos).addScaledVector(dir, .72);
    mesh.position.y = Math.max(1.58, pos.y) + scale * .24;
    mesh.scale.multiplyScalar(Math.min(1.8, .8 + scale * .5));
    scene.add(mesh);
    floaters.push({ mesh, vel: new THREE.Vector3(dir.x * .7, 1.05 + scale * .22, dir.z * .7), life: .66 + scale * .12, maxLife: .66 + scale * .12 });
  }

  /* ---------- effect updates (run on rawDt so they animate through hitstop) --- */
  function updateEffects(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.vel.y -= 9.8 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.mesh.position.y < .035) {
        p.mesh.position.y = .035;
        if (p.life > .12 && p.color !== 0xffffff) bloodSplat(p.mesh.position.clone(), p.vel.clone().setY(0).normalize(), p.color, 1, false);
        p.life = Math.min(p.life, .08);
      }
      p.mesh.rotation.x += p.spin * dt;
      p.mesh.rotation.z += p.spin * .75 * dt;
      const k = Math.max(0, p.life / p.maxLife);
      p.mesh.material.opacity = k;
      p.mesh.scale.setScalar(p.baseScale * Math.max(.10, .55 + k * .75));
      if (p.life <= 0) {
        scene.remove(p.mesh); p.mesh.material.dispose(); particles.splice(i, 1);
      }
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]; r.t += dt;
      const k = r.t / r.life;
      r.mesh.scale.setScalar(THREE.MathUtils.lerp(.25, r.maxR, Math.min(1, k)));
      r.mesh.material.opacity = Math.max(0, .82 * (1 - k));
      if (k >= 1) { scene.remove(r.mesh); r.mesh.material.dispose(); rings.splice(i, 1); }
    }
    for (let i = slashes.length - 1; i >= 0; i--) {
      const s = slashes[i]; s.life -= dt;
      const k = Math.max(0, s.life / s.maxLife);
      s.mesh.material.opacity = k;
      s.mesh.scale.z *= 1 + (1 - k) * .06;
      if (s.life <= 0) { scene.remove(s.mesh); s.mesh.material.dispose(); slashes.splice(i, 1); }
    }
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i]; f.life -= dt;
      f.mesh.position.addScaledVector(f.vel, dt);
      f.vel.multiplyScalar(Math.pow(.38, dt));
      const k = Math.max(0, f.life / f.maxLife);
      f.mesh.material.opacity = Math.min(1, k * 1.5);
      f.mesh.scale.multiplyScalar(1 + dt * .36);
      if (f.life <= 0) {
        scene.remove(f.mesh);
        f.mesh.material.map?.dispose();
        f.mesh.material.dispose();
        floaters.splice(i, 1);
      }
    }
  }

  /* ---------- the per-hit stack ---------- */
  // power ~1 for an average hit, ~2 for a charged haymaker, +kill bonus.
  function powerOf(damage, kill) {
    return THREE.MathUtils.clamp(damage / 28, .4, 2) + (kill ? .9 : 0);
  }

  function impact({ point, dir, damage = 10, kill = false, color = 0xf4e0a2 } = {}) {
    const m = tuning.master;
    if (m <= 0) return;
    const power = powerOf(damage, kill) * m;
    const flat = dir.clone(); flat.y = 0;
    if (flat.lengthSq() < 1e-6) flat.set(0, 0, 1); else flat.normalize();

    // time: freeze scaled by power, kills linger + slow-mo aftertaste
    hitstop = Math.max(hitstop, tuning.hitstop * (kill ? 1.85 : .6 + power * .4) * m);
    if (tuning.slowmo > 0 && (kill || power > 1.4)) slowMo = .10 + power * .05;

    // camera: jitter + directional kick away from the hit + zoom punch
    shakeAmt += tuning.shake * (.35 + power * .5) * m;
    camKick.addScaledVector(flat, -.30 * power * tuning.kick * m);
    zoomKick += (kill ? .95 : .25 + power * .3) * tuning.zoom * m;

    // screen flash at the hit point
    overlayImpact(point, tuning.flash * (kill ? 1 : .35 + power * .3) * m);

    // sound: layered thud/crack/noise (+sub-boom on kills)
    if (tuning.sound > 0) audio?.onImpactFeel?.({ damage, kill, power, gain: tuning.sound * m });

    // VFX at the point of impact
    shockwave(point, kill ? 0xffffff : color, kill ? 4.2 : 1.8 + power, kill ? .44 : .30);
    slashBurst(point, flat, kill ? 0xffffff : color, kill ? 3.4 : 1.6 + power * .8, kill ? .28 : .18);
    const bloodPos = point.clone(); bloodPos.y = Math.max(.72, bloodPos.y);
    sprayBlood(bloodPos, flat, BLOOD, Math.floor(tuning.particles * (kill ? 1.1 : .30 + power * .25) * m), kill ? 1.55 : .6 + power * .35);
    bloodSplat(point.clone().addScaledVector(flat, .20).setY(0), flat, BLOOD_DARK, kill ? 26 : 4 + power * 7, kill);
    if (kill) bloodSmear(point.clone().setY(0), flat, BLOOD_DARK, 1.35);
    else if (power > 1.3) bloodSmear(point.clone().setY(0), flat, BLOOD_DARK, .75);
    if (kill) floater(pickKillWord(), point, flat, 1.25, '#ffffff');
    return power;
  }
  const KILL_WORDS = ['SLAIN!', 'DOWN!', 'SPLAT!', 'CRUNCH!'];
  function pickKillWord() { return KILL_WORDS[Math.floor(Math.random() * KILL_WORDS.length)]; }

  function playerHurt({ dir = null, damage = 10 } = {}) {
    const m = tuning.master;
    if (m <= 0) return;
    const power = THREE.MathUtils.clamp(damage / 18, .5, 1.6) * m;
    hitstop = Math.max(hitstop, tuning.hitstop * .6 * m);
    shakeAmt += tuning.shake * .8 * power;
    zoomKick += .35 * tuning.zoom * power;
    if (dir && (dir.x || dir.z)) {
      const l = Math.hypot(dir.x, dir.z) || 1;
      camKick.x += dir.x / l * .45 * power * tuning.kick;
      camKick.z += dir.z / l * .45 * power * tuning.kick;
    }
  }

  function whiff(point, dir) {
    const m = tuning.master;
    if (m <= 0 || !point) return;
    hitstop = Math.max(hitstop, tuning.hitstop * .12 * m);
    shakeAmt += tuning.shake * .06 * m;
    const flat = dir ? dir.clone().setY(0) : new THREE.Vector3(0, 0, 1);
    if (flat.lengthSq() < 1e-6) flat.set(0, 0, 1); else flat.normalize();
    slashBurst(point, flat, 0xcfefff, 1.6, .10);
  }

  /* ---------- frame update: returns the (possibly frozen) game dt ---------- */
  function update(rawDt) {
    let dt = rawDt;
    if (hitstop > 0) { hitstop -= rawDt; dt = rawDt * .035; }
    else if (slowMo > 0) { slowMo -= rawDt; dt = rawDt * .45; }
    updateEffects(rawDt);
    shakeAmt *= Math.pow(.018, rawDt);
    if (shakeAmt < .001) shakeAmt = 0;
    zoomKick *= Math.pow(.05, rawDt);
    camKick.multiplyScalar(Math.pow(.06, rawDt));
    return dt;
  }

  /* ---------- hidden tuning panel ---------- */
  let panel = null;
  function buildTuningPanel() {
    if (panel || typeof document === 'undefined') return panel;
    panel = document.createElement('div');
    panel.id = 'hitFeelPanel';
    panel.style.cssText = 'position:fixed;top:52px;right:8px;z-index:40;width:min(78vw,280px);' +
      'max-height:calc(100vh - 66px);overflow-y:auto;padding:12px 18px 16px;box-sizing:border-box;' +
      'background:linear-gradient(180deg,rgba(10,20,22,.95),rgba(10,20,22,.88));border:1px solid #6e3a24;' +
      'border-radius:8px;font-family:ui-monospace,Menlo,Consolas,monospace;color:#9fd2c9;' +
      '-webkit-overflow-scrolling:touch;touch-action:pan-y;display:none';
    const title = document.createElement('div');
    title.textContent = 'HIT FEEL';
    title.style.cssText = 'color:#e8a04c;font-size:11px;letter-spacing:.2em;margin-bottom:6px';
    panel.appendChild(title);
    // pure dead-space strip: nothing here to drag, just room to grab-scroll
    const scrollHint = document.createElement('div');
    scrollHint.textContent = '⋮ drag here to scroll ⋮';
    scrollHint.style.cssText = 'text-align:center;font-size:8.5px;letter-spacing:.14em;color:#33524e;padding:4px 0 14px';
    panel.appendChild(scrollHint);

    const rows = {};
    // Sliders render inside an 84%-wide inner wrapper, leaving an 8% dead-space
    // gutter on each side of every row — a thumb-free strip to grab when
    // scrolling the panel with a thumb on a phone.
    function appendSlider(container, key, label, min, max, step, emphasize) {
      const row = document.createElement('div');
      row.style.cssText = 'margin-bottom:20px';
      const lab = document.createElement('div');
      lab.style.cssText = 'font-size:9.5px;letter-spacing:.06em;display:flex;justify-content:space-between;margin-bottom:4px' +
        (emphasize ? ';color:#e8a04c;font-weight:bold' : '');
      const name = document.createElement('span'); name.textContent = label;
      const val = document.createElement('span'); val.style.color = '#e8a04c';
      lab.append(name, val);
      const wrap = document.createElement('div');
      wrap.style.cssText = 'padding:6px 8%';
      const input = document.createElement('input');
      input.type = 'range'; input.min = min; input.max = max; input.step = step;
      input.value = tuning[key];
      input.style.cssText = 'width:100%;display:block;accent-color:#e8a04c';
      const sync = () => { val.textContent = Number(input.value).toFixed(step >= 1 ? 0 : 2); };
      input.addEventListener('input', () => { setTune(key, input.value); sync(); });
      sync();
      wrap.appendChild(input);
      row.append(lab, wrap);
      container.appendChild(row);
      rows[key] = { input, sync };
    }
    function appendCheck(container, key, label) {
      const row = document.createElement('label');
      row.style.cssText = 'display:flex;gap:9px;align-items:center;font-size:9.5px;letter-spacing:.06em;' +
        'margin-bottom:16px;cursor:pointer;padding:4px 0';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = tuning[key] > 0;
      input.style.cssText = 'accent-color:#e8a04c;width:19px;height:19px';
      input.addEventListener('input', () => setTune(key, input.checked ? 1 : 0));
      row.append(input, document.createTextNode(label));
      container.appendChild(row);
      rows[key] = { input, sync: () => { input.checked = tuning[key] > 0; } };
    }

    appendSlider(panel, 'master', 'MASTER INTENSITY', 0, 2, .01, true);

    for (const section of SECTIONS) {
      const header = document.createElement('button');
      header.type = 'button';
      header.style.cssText = 'display:block;width:100%;text-align:left;font-family:inherit;font-size:10px;' +
        'letter-spacing:.14em;color:#7fb8b0;background:rgba(30,52,52,.4);border:1px solid #24403e;' +
        'border-radius:5px;padding:9px 10px;margin:6px 0 12px;cursor:pointer';
      const body = document.createElement('div');
      body.style.cssText = 'padding:2px 0 0';
      const collapseKey = 'hitfeel.section.' + section.id;
      let collapsed = !!settings?.get?.(collapseKey, false);
      const applyCollapsed = () => {
        body.style.display = collapsed ? 'none' : 'block';
        header.textContent = (collapsed ? '▸ ' : '▾ ') + section.label;
      };
      applyCollapsed();
      header.addEventListener('click', () => {
        collapsed = !collapsed;
        settings?.set?.(collapseKey, collapsed);
        applyCollapsed();
      });
      panel.append(header, body);
      for (const key of section.sliders || []) {
        const [label, min, max, step] = SLIDER_DEFS[key];
        appendSlider(body, key, label, min, max, step, false);
      }
      for (const key of section.checks || []) appendCheck(body, key, CHECK_DEFS[key]);
    }

    const btnCss = 'width:100%;font-family:inherit;font-size:10px;letter-spacing:.12em;color:#e8a04c;' +
      'background:rgba(110,58,36,.16);border:1px solid #6e3a24;border-radius:5px;padding:9px 0;margin-top:6px';
    const testBtn = document.createElement('button');
    testBtn.textContent = 'TEST IMPACT';
    testBtn.style.cssText = btnCss;
    testBtn.addEventListener('click', () => {
      const p = new THREE.Vector3(camera.position.x, .9, camera.position.z);
      const f = new THREE.Vector3(); camera.getWorldDirection(f);
      p.addScaledVector(f, 22); p.y = .9;
      impact({ point: p, dir: new THREE.Vector3(f.x, 0, f.z), damage: 30, kill: Math.random() < .3 });
    });
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'RESET BIG DEFAULTS';
    resetBtn.style.cssText = btnCss;
    resetBtn.addEventListener('click', () => {
      for (const k of Object.keys(DEFAULTS)) setTune(k, DEFAULTS[k]);
      for (const key of ['master', ...Object.keys(SLIDER_DEFS)]) { rows[key].input.value = tuning[key]; rows[key].sync(); }
      for (const key of Object.keys(CHECK_DEFS)) rows[key].sync();
    });
    panel.append(testBtn, resetBtn);
    document.body.appendChild(panel);

    const toggle = () => { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; };
    window.addEventListener('keydown', e => { if (e.code === 'Backquote') toggle(); });
    if (new URLSearchParams(location.search).get('tune')) panel.style.display = 'block';
    api.togglePanel = toggle;
    return panel;
  }

  const api = {
    tuning,
    impact, playerHurt, whiff, update,
    shockwave, slashBurst, sprayBlood, bloodSplat, bloodSmear, floater, overlayImpact,
    buildTuningPanel,
    togglePanel: () => buildTuningPanel(),
    controlDescriptors: () => Object.freeze([
      Object.freeze({id:'hitfeel.master',kind:'range',label:'Master Intensity',min:0,max:2,step:.01,get:()=>tuning.master,set:value=>(setTune('master',value),true)}),
      ...Object.entries(SLIDER_DEFS).map(([key,[label,min,max,step]])=>Object.freeze({id:`hitfeel.${key}`,kind:'range',label,min,max,step,get:()=>tuning[key],set:value=>(setTune(key,value),true)})),
      ...Object.entries(CHECK_DEFS).map(([key,label])=>Object.freeze({id:`hitfeel.${key}`,kind:'check',label,checked:()=>!!tuning[key],set:value=>(setTune(key,value?1:0),true)})),
    ]),
    get jitter() { return shakeAmt * .23; },
    get camKick() { return camKick; },
    get zoomKick() { return zoomKick; },
    get hitstopActive() { return hitstop > 0; },
    // introspection for tests
    get counts() { return { particles: particles.length, splats: splats.length, smears: smears.length, rings: rings.length, floaters: floaters.length }; },
  };
  return api;
}
