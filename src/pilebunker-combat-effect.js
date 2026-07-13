// Cyclone Strike + Shield Bash: One on One gameplay layer for Pilebunker.
// The animation controller remains presentation-only; this module owns gathering,
// primary-target lock, primary stun, and the secondary radial detonation.

export function createPilebunkerCombatEffect({
  THREE,
  scene,
  getEnemies = () => [],
  getPlayer = () => ({ x:0, z:0, forwardX:0, forwardZ:1 }),
  hitEnemy = () => false,
} = {}) {
  if (!THREE || !scene) throw new Error('[pilebunker-effect] THREE and scene are required.');

  const clamp = THREE.MathUtils.clamp;
  const lerp = THREE.MathUtils.lerp;
  const smooth = t => { t = clamp(t, 0, 1); return t*t*(3-2*t); };
  const tuning = {
    pullRadius: 7.5,
    pullStrength: 13,
    compressionDistance: 2.4,
    primaryDamage: 60,
    primaryStun: 1.2,
    primaryHitRadius: 3.2,
    secondaryDamage: 18,
    secondaryRadius: 5.5,
    secondaryKnock: 11,
    eliteControl: .55,
  };
  const STORAGE_PREFIX = 'arena.pilebunker.effect.';
  for (const key of Object.keys(tuning)) {
    try {
      const saved = Number(localStorage.getItem(STORAGE_PREFIX + key));
      if (Number.isFinite(saved)) tuning[key] = saved;
    } catch (_) {}
  }

  const state = {
    active:false,
    phase:'READY',
    progress:0,
    primary:null,
    locked:false,
    pullWeight:0,
    impactPoint:new THREE.Vector3(),
    compression:new THREE.Vector3(),
    forward:new THREE.Vector3(0,0,1),
  };

  const pullMaterial = new THREE.MeshBasicMaterial({
    color:0x7fd0c8, transparent:true, opacity:0,
    blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide,
  });
  const pullRing = new THREE.Mesh(new THREE.RingGeometry(.92, 1, 48), pullMaterial);
  pullRing.rotation.x = -Math.PI/2;
  pullRing.position.y = .08;
  pullRing.visible = false;
  pullRing.renderOrder = 4;
  scene.add(pullRing);

  const targetMaterial = new THREE.MeshBasicMaterial({
    color:0xffb066, transparent:true, opacity:.92,
    blending:THREE.AdditiveBlending, depthWrite:false,
  });
  const targetRing = new THREE.Mesh(new THREE.TorusGeometry(1, .055, 8, 40), targetMaterial);
  targetRing.rotation.x = Math.PI/2;
  targetRing.visible = false;
  targetRing.renderOrder = 8;
  scene.add(targetRing);

  const streakMaterial = new THREE.MeshBasicMaterial({
    color:0x9fe8dc, transparent:true, opacity:0,
    blending:THREE.AdditiveBlending, depthWrite:false,
  });
  const streakGeometry = new THREE.BoxGeometry(.08, .035, .72);
  const streaks = Array.from({ length:12 }, (_, i) => {
    const mesh = new THREE.Mesh(streakGeometry, streakMaterial.clone());
    mesh.visible = false;
    mesh.renderOrder = 5;
    scene.add(mesh);
    return { mesh, phase:i/12, lane:(i%3-1)*.32 };
  });

  const blastWaves = [];
  function spawnBlastWave(point, radius) {
    const material = new THREE.MeshBasicMaterial({
      color:0xffb066, transparent:true, opacity:.9,
      blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 56), material);
    mesh.rotation.x = -Math.PI/2;
    mesh.position.set(point.x, .10, point.z);
    mesh.scale.setScalar(.22);
    mesh.renderOrder = 7;
    scene.add(mesh);
    blastWaves.push({ mesh, age:0, life:.42, radius });
  }

  function liveEnemies() {
    return getEnemies().filter(enemy => enemy && enemy.hp > 0 && enemy.root?.parent);
  }
  function controlMultiplier(enemy) {
    return enemy?.isElite ? tuning.eliteControl : 1;
  }
  function currentPlayer() {
    const p = getPlayer() || {};
    const fx = Number(p.forwardX) || 0;
    const fz = Number(p.forwardZ) || 1;
    const length = Math.hypot(fx, fz) || 1;
    return {
      x:Number(p.x) || 0,
      z:Number(p.z) || 0,
      forwardX:fx/length,
      forwardZ:fz/length,
    };
  }
  function updateCompression() {
    const p = currentPlayer();
    state.forward.set(p.forwardX, 0, p.forwardZ);
    state.compression.set(
      p.x + p.forwardX * tuning.compressionDistance,
      .08,
      p.z + p.forwardZ * tuning.compressionDistance
    );
    return p;
  }
  function pullWeightForPhase(phase, progress) {
    if (phase === 'OVERHEAD RATCHET') return .28 + smooth(progress) * .16;
    if (phase === 'DEEP COIL') return .62 + smooth(progress) * .18;
    if (phase === 'FINAL HOLD') return 1;
    return 0;
  }
  function interruptForControl(enemy) {
    enemy.vx *= .12;
    enemy.vz *= .12;
    enemy.stunned = Math.max(enemy.stunned || 0, .09);
    if (enemy.state === 'windup' || enemy.state === 'active' || enemy.state === 'recovery') {
      enemy.state = 'idle';
      enemy.stateTime = 0;
      enemy.hitDone = false;
    }
  }
  function applyPull(enemy, dt, weight) {
    const dx = state.compression.x - enemy.x;
    const dz = state.compression.z - enemy.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= .001 || distance > tuning.pullRadius) return;

    const comfort = .62 + (enemy.radius || 1) * .78;
    if (distance <= comfort) {
      enemy.knockX *= Math.pow(.08, dt);
      enemy.knockZ *= Math.pow(.08, dt);
      interruptForControl(enemy);
      return;
    }

    const resistance = controlMultiplier(enemy);
    const speed = Math.min(tuning.pullStrength, (distance - comfort) * 4.2)
      * weight * resistance;
    const blend = 1 - Math.exp(-dt * 13);
    const nx = dx / distance;
    const nz = dz / distance;
    enemy.knockX = lerp(enemy.knockX || 0, nx * speed, blend);
    enemy.knockZ = lerp(enemy.knockZ || 0, nz * speed, blend);
    interruptForControl(enemy);
  }

  function primaryScore(enemy, player) {
    const px = enemy.x - player.x;
    const pz = enemy.z - player.z;
    const distanceFromPlayer = Math.hypot(px, pz) || 1;
    const front = (px * player.forwardX + pz * player.forwardZ) / distanceFromPlayer;
    const lateral = Math.abs(px * player.forwardZ - pz * player.forwardX);
    const cx = enemy.x - state.compression.x;
    const cz = enemy.z - state.compression.z;
    const compressionDistance = Math.hypot(cx, cz);
    return compressionDistance * 1.35 + lateral * .24 + distanceFromPlayer * .035 - front * 1.15;
  }
  function lockPrimary() {
    if (state.locked && state.primary?.hp > 0 && state.primary.root?.parent) return state.primary;
    const player = currentPlayer();
    const candidates = liveEnemies().filter(enemy => {
      const dx = enemy.x - state.compression.x;
      const dz = enemy.z - state.compression.z;
      const distance = Math.hypot(dx, dz);
      const fromPlayerX = enemy.x - player.x;
      const fromPlayerZ = enemy.z - player.z;
      const front = fromPlayerX * player.forwardX + fromPlayerZ * player.forwardZ;
      return distance <= tuning.pullRadius && front > -.75;
    });
    candidates.sort((a, b) => primaryScore(a, player) - primaryScore(b, player));
    state.primary = candidates[0] || null;
    state.locked = !!state.primary;
    return state.primary;
  }

  function updateTargetRing(rawDt) {
    const enemy = state.primary;
    const valid = state.active && state.locked && enemy?.hp > 0 && enemy.root?.parent;
    targetRing.visible = !!valid;
    if (!valid) return;
    const heightScale = Math.max(.8, enemy.root.scale?.y || 1);
    const radius = Math.max(1.0, (enemy.radius || 1) * 1.45 * heightScale);
    targetRing.position.set(enemy.x, .11 + (enemy.yOff || 0), enemy.z);
    targetRing.scale.setScalar(radius);
    targetRing.rotation.z += rawDt * 2.8;
    targetMaterial.opacity = .68 + Math.sin(performance.now() * .011) * .18;
  }
  function updatePullVisuals(rawDt) {
    const weight = state.pullWeight;
    pullRing.visible = state.active && weight > .01;
    if (pullRing.visible) {
      pullRing.position.x = state.compression.x;
      pullRing.position.z = state.compression.z;
      const pulse = 1 + Math.sin(performance.now() * .008) * .035;
      pullRing.scale.setScalar(tuning.pullRadius * pulse);
      pullMaterial.opacity = .08 + weight * .18;
      pullRing.rotation.z -= rawDt * (.25 + weight * .8);
    }

    for (let i=0; i<streaks.length; i++) {
      const streak = streaks[i];
      const mesh = streak.mesh;
      mesh.visible = state.active && weight > .08;
      if (!mesh.visible) continue;
      streak.phase = (streak.phase + rawDt * (.42 + weight * .95)) % 1;
      const radius = tuning.pullRadius * (1 - streak.phase * .88);
      const angle = i / streaks.length * Math.PI * 2 + streak.phase * 1.7;
      const tangentX = -Math.sin(angle);
      const tangentZ = Math.cos(angle);
      mesh.position.set(
        state.compression.x + Math.cos(angle) * radius + tangentX * streak.lane,
        .11,
        state.compression.z + Math.sin(angle) * radius + tangentZ * streak.lane
      );
      mesh.rotation.y = -angle + Math.PI/2;
      mesh.scale.set(1, 1, .65 + weight * 1.45);
      mesh.material.opacity = (.08 + weight * .34) * Math.sin(Math.PI * streak.phase);
    }
  }
  function updateBlastWaves(rawDt) {
    for (let i=blastWaves.length-1; i>=0; i--) {
      const wave = blastWaves[i];
      wave.age += rawDt;
      const p = wave.age / wave.life;
      if (p >= 1) {
        scene.remove(wave.mesh);
        wave.mesh.geometry.dispose();
        wave.mesh.material.dispose();
        blastWaves.splice(i, 1);
        continue;
      }
      wave.mesh.scale.setScalar(lerp(.22, wave.radius, smooth(p)));
      wave.mesh.material.opacity = (1-p) * .9;
    }
  }

  function start() {
    state.active = true;
    state.phase = 'PALM BRACE';
    state.progress = 0;
    state.primary = null;
    state.locked = false;
    state.pullWeight = 0;
    updateCompression();
  }

  function update({ phase='READY', progress=0, dt=0, rawDt=dt } = {}) {
    updateBlastWaves(Math.max(0, rawDt));
    if (!state.active) return;
    state.phase = phase;
    state.progress = progress;
    updateCompression();
    state.pullWeight = pullWeightForPhase(phase, progress);

    if (state.pullWeight > 0) {
      for (const enemy of liveEnemies()) applyPull(enemy, Math.max(0, dt), state.pullWeight);
    }
    if (phase === 'FINAL HOLD') lockPrimary();
    if (state.primary && (state.primary.hp <= 0 || !state.primary.root?.parent)) {
      state.primary = null;
      state.locked = false;
    }
    updatePullVisuals(Math.max(0, rawDt));
    updateTargetRing(Math.max(0, rawDt));
  }

  function impact({ point, forward } = {}) {
    if (!state.active) return { landed:false, primaryHit:false, secondaryHits:0 };
    updateCompression();
    const primary = lockPrimary();
    const impactPoint = point?.isVector3
      ? point.clone()
      : new THREE.Vector3(state.compression.x, .8, state.compression.z);
    state.impactPoint.copy(impactPoint);
    const forward2 = forward?.isVector3 ? forward.clone() : state.forward.clone();
    forward2.y = 0;
    if (forward2.lengthSq() < 1e-6) forward2.copy(state.forward);
    forward2.normalize();

    let primaryHit = false;
    let secondaryHits = 0;
    const primaryStillValid = primary?.hp > 0 && primary.root?.parent
      && Math.hypot(primary.x - state.compression.x, primary.z - state.compression.z) <= tuning.primaryHitRadius;

    if (primaryStillValid) {
      const control = controlMultiplier(primary);
      primaryHit = !!hitEnemy(primary, {
        damage:tuning.primaryDamage,
        stun:tuning.primaryStun * control,
        knock:.72 * control,
        motion:{ x:forward2.x, z:forward2.z },
        point:new THREE.Vector3(primary.x, Math.max(.8, (primary.height || 2) * .48), primary.z),
        role:'primary',
      });
    }

    const centerX = state.compression.x;
    const centerZ = state.compression.z;
    for (const enemy of [...liveEnemies()]) {
      if (enemy === primary || enemy.hp <= 0) continue;
      let dx = enemy.x - centerX;
      let dz = enemy.z - centerZ;
      let distance = Math.hypot(dx, dz);
      if (distance > tuning.secondaryRadius) continue;
      if (distance < .001) {
        const angle = (enemy.id || 1) * 2.399963;
        dx = Math.cos(angle);
        dz = Math.sin(angle);
        distance = 1;
      }
      const control = controlMultiplier(enemy);
      const falloff = lerp(1, .72, clamp(distance / tuning.secondaryRadius, 0, 1));
      const nx = dx / distance;
      const nz = dz / distance;
      const landed = hitEnemy(enemy, {
        damage:Math.max(1, Math.round(tuning.secondaryDamage * falloff)),
        stun:.08 * control,
        knock:tuning.secondaryKnock * falloff * control,
        motion:{ x:nx, z:nz },
        point:new THREE.Vector3(enemy.x, Math.max(.7, (enemy.height || 2) * .45), enemy.z),
        role:'secondary',
      });
      if (landed) secondaryHits++;
    }

    spawnBlastWave(state.compression, tuning.secondaryRadius);
    state.pullWeight = 0;
    pullRing.visible = false;
    for (const streak of streaks) streak.mesh.visible = false;
    targetRing.visible = false;
    return { landed:primaryHit || secondaryHits > 0, primaryHit, secondaryHits, primary };
  }

  function finish() {
    state.active = false;
    state.phase = 'READY';
    state.pullWeight = 0;
    state.primary = null;
    state.locked = false;
    pullRing.visible = false;
    targetRing.visible = false;
    for (const streak of streaks) streak.mesh.visible = false;
  }

  function setTuning(key, value) {
    if (!(key in tuning)) return;
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    tuning[key] = number;
    try { localStorage.setItem(STORAGE_PREFIX + key, String(number)); } catch (_) {}
  }

  function installPanel() {
    if (typeof document === 'undefined') return;
    const body = document.getElementById('body-powbunker');
    if (!body || document.getElementById('pilebunkerEffectControls')) return;
    const wrap = document.createElement('div');
    wrap.id = 'pilebunkerEffectControls';
    const heading = document.createElement('div');
    heading.className = 'ptitle';
    heading.textContent = 'CYCLONE + ONE ON ONE EFFECT';
    wrap.appendChild(heading);
    const defs = [
      ['pullRadius','PULL RADIUS',3,12,.1,1],
      ['pullStrength','PULL STRENGTH',3,24,.25,2],
      ['compressionDistance','COMPRESSION POINT',.5,5,.05,2],
      ['primaryStun','PRIMARY STUN',.1,3,.05,2],
      ['secondaryRadius','BLAST RADIUS',2,10,.1,1],
      ['secondaryKnock','SECONDARY KNOCKBACK',2,22,.25,2],
    ];
    for (const [key,label,min,max,step,digits] of defs) {
      const row = document.createElement('div'); row.className = 'srow';
      const lab = document.createElement('div'); lab.className = 'slabel';
      const val = document.createElement('span'); val.className = 'sval';
      const input = document.createElement('input');
      input.type = 'range'; input.min = min; input.max = max; input.step = step; input.value = tuning[key];
      input.setAttribute('aria-label', label);
      const sync = () => { val.textContent = Number(tuning[key]).toFixed(digits); };
      lab.textContent = label + ' '; lab.appendChild(val);
      input.addEventListener('input', () => { setTuning(key, input.value); sync(); });
      sync(); row.append(lab, input); wrap.appendChild(row);
    }
    body.appendChild(wrap);
  }

  function dispose() {
    finish();
    scene.remove(pullRing, targetRing);
    pullRing.geometry.dispose(); pullMaterial.dispose();
    targetRing.geometry.dispose(); targetMaterial.dispose();
    for (const streak of streaks) {
      scene.remove(streak.mesh);
      streak.mesh.material.dispose();
    }
    streakGeometry.dispose(); streakMaterial.dispose();
    for (const wave of blastWaves) {
      scene.remove(wave.mesh);
      wave.mesh.geometry.dispose();
      wave.mesh.material.dispose();
    }
    blastWaves.length = 0;
  }

  return {
    start, update, impact, finish, installPanel, dispose, setTuning, tuning, state,
    get primary(){ return state.primary; },
  };
}
