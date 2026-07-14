// Cyclone Strike + Shield Bash: One on One gameplay layer for Pilebunker.
// The animation controller remains presentation-only; this module owns gathering,
// target lock, guaranteed front-arc impact, stun, and secondary detonation.

import { damageRegisteredArenaEnemy } from './arena-enemy-registry.js';

const EFFECT_SCHEMA = 2;
const STORAGE_PREFIX = 'arena.pilebunker.effect.';

const PRESETS = Object.freeze({
  heroic: Object.freeze({
    label:'HEROIC (RECOMMENDED)',
    description:'A strong all-purpose Pilebunker: kills light primary targets, visibly stuns survivors, and clears the front of the player.',
    values:Object.freeze({
      pullRadius:8.5,
      pullStrength:15.5,
      compressionDistance:2.2,
      frontReach:8.5,
      primaryDamage:145,
      primaryStun:2.4,
      primaryHitRadius:4.0,
      secondaryDamage:48,
      secondaryRadius:6.5,
      secondaryKnock:14,
      secondaryStun:.28,
      eliteControl:.65,
    }),
  }),
  duelist: Object.freeze({
    label:'ONE ON ONE / DUELIST',
    description:'Smaller crowd effect, but a devastating primary hit and long stun for the chosen victim.',
    values:Object.freeze({
      pullRadius:7,
      pullStrength:13,
      compressionDistance:2.0,
      frontReach:7,
      primaryDamage:190,
      primaryStun:3.25,
      primaryHitRadius:4.2,
      secondaryDamage:28,
      secondaryRadius:4.8,
      secondaryKnock:10,
      secondaryStun:.15,
      eliteControl:.55,
    }),
  }),
  crowd: Object.freeze({
    label:'CROWD BREAKER',
    description:'Wide, aggressive suction and a much stronger secondary detonation for clearing packed encounters.',
    values:Object.freeze({
      pullRadius:10,
      pullStrength:19,
      compressionDistance:2.4,
      frontReach:10,
      primaryDamage:125,
      primaryStun:2.0,
      primaryHitRadius:4.2,
      secondaryDamage:65,
      secondaryRadius:8,
      secondaryKnock:18,
      secondaryStun:.40,
      eliteControl:.68,
    }),
  }),
  original: Object.freeze({
    label:'ORIGINAL PROTOTYPE',
    description:'The initial conservative tuning retained for comparison.',
    values:Object.freeze({
      pullRadius:7.5,
      pullStrength:13,
      compressionDistance:2.4,
      frontReach:7.5,
      primaryDamage:60,
      primaryStun:1.2,
      primaryHitRadius:3.2,
      secondaryDamage:18,
      secondaryRadius:5.5,
      secondaryKnock:11,
      secondaryStun:.08,
      eliteControl:.55,
    }),
  }),
});

export function createPilebunkerCombatEffect({
  THREE,
  scene,
  getEnemies = () => [],
  getPlayer = () => ({ x:0, z:0, forwardX:0, forwardZ:1 }),
  hitEnemy = null,
} = {}) {
  if (!THREE || !scene) throw new Error('[pilebunker-effect] THREE and scene are required.');

  const clamp = THREE.MathUtils.clamp;
  const lerp = THREE.MathUtils.lerp;
  const smooth = t => { t = clamp(t, 0, 1); return t*t*(3-2*t); };
  const tuning = { ...PRESETS.heroic.values };
  let activePreset = 'heroic';

  function saveTuning() {
    try {
      localStorage.setItem(STORAGE_PREFIX + 'schema', String(EFFECT_SCHEMA));
      localStorage.setItem(STORAGE_PREFIX + 'preset', activePreset);
      for (const [key, value] of Object.entries(tuning)) {
        localStorage.setItem(STORAGE_PREFIX + key, String(value));
      }
    } catch (_) {}
  }

  function loadTuning() {
    try {
      const schema = Number(localStorage.getItem(STORAGE_PREFIX + 'schema'));
      if (schema !== EFFECT_SCHEMA) {
        activePreset = 'heroic';
        Object.assign(tuning, PRESETS.heroic.values);
        saveTuning();
        return;
      }
      const savedPreset = localStorage.getItem(STORAGE_PREFIX + 'preset');
      activePreset = PRESETS[savedPreset] ? savedPreset : 'custom';
      for (const key of Object.keys(tuning)) {
        const saved = Number(localStorage.getItem(STORAGE_PREFIX + key));
        if (Number.isFinite(saved)) tuning[key] = saved;
      }
    } catch (_) {}
  }
  loadTuning();

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

  function frontMetrics(enemy, player) {
    const dx = enemy.x - player.x;
    const dz = enemy.z - player.z;
    return {
      dx,
      dz,
      distance:Math.hypot(dx, dz),
      along:dx * player.forwardX + dz * player.forwardZ,
      lateral:Math.abs(dx * player.forwardZ - dz * player.forwardX),
    };
  }

  // The small negative allowance catches an enemy whose collision center has
  // slipped just behind the player while its body is visibly touching the punch.
  function isFrontAffected(enemy, player) {
    const m = frontMetrics(enemy, player);
    const closeAllowance = Math.max(.55, (enemy.radius || 1) * .72);
    return m.distance <= tuning.frontReach && m.along >= -closeAllowance;
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
    const m = frontMetrics(enemy, player);
    const desiredAlong = tuning.compressionDistance;
    // Centre-line alignment matters most. Point-blank targets get a modest bonus
    // so the move does not visually punch through someone touching the player.
    const pointBlankBonus = m.distance < 2.1 ? 1.3 : 0;
    return m.lateral * .92
      + Math.abs(m.along - desiredAlong) * .54
      + m.distance * .045
      - pointBlankBonus;
  }

  function lockPrimary() {
    if (state.locked && state.primary?.hp > 0 && state.primary.root?.parent) return state.primary;
    const player = currentPlayer();
    const candidates = liveEnemies().filter(enemy => isFrontAffected(enemy, player));
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

  function dealEnemyHit(enemy, options) {
    try {
      return damageRegisteredArenaEnemy(enemy, options);
    } catch (error) {
      if (typeof hitEnemy === 'function') return !!hitEnemy(enemy, options);
      throw error;
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
    const player = updateCompression();
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
    const primaryAtCompression = primary
      ? Math.hypot(primary.x - state.compression.x, primary.z - state.compression.z)
      : Infinity;
    const primaryStillValid = primary?.hp > 0
      && primary.root?.parent
      && (primaryAtCompression <= tuning.primaryHitRadius || isFrontAffected(primary, player));

    if (primaryStillValid) {
      const control = controlMultiplier(primary);
      primaryHit = dealEnemyHit(primary, {
        damage:tuning.primaryDamage,
        stun:tuning.primaryStun * control,
        knock:1.15 * control,
        motion:{ x:forward2.x, z:forward2.z },
        point:new THREE.Vector3(primary.x, Math.max(.8, (primary.height || 2) * .48), primary.z),
        role:'primary',
        power:2.8,
        pop:1.35,
      });
    }

    const centerX = state.compression.x;
    const centerZ = state.compression.z;
    for (const enemy of [...liveEnemies()]) {
      if (enemy === primary || enemy.hp <= 0) continue;

      const frontCaught = isFrontAffected(enemy, player);
      let dx = enemy.x - centerX;
      let dz = enemy.z - centerZ;
      let blastDistance = Math.hypot(dx, dz);
      const inBlast = blastDistance <= tuning.secondaryRadius;
      if (!frontCaught && !inBlast) continue;

      let nx;
      let nz;
      let falloff;
      if (frontCaught) {
        // Guaranteed front coverage: even an enemy visually tucked behind the
        // fist model is struck and sent in the player's forward direction.
        nx = player.forwardX;
        nz = player.forwardZ;
        const playerDistance = frontMetrics(enemy, player).distance;
        falloff = lerp(1, .82, clamp(playerDistance / tuning.frontReach, 0, 1));
      } else {
        if (blastDistance < .001) {
          const angle = (enemy.id || 1) * 2.399963;
          dx = Math.cos(angle);
          dz = Math.sin(angle);
          blastDistance = 1;
        }
        nx = dx / blastDistance;
        nz = dz / blastDistance;
        falloff = lerp(1, .72, clamp(blastDistance / tuning.secondaryRadius, 0, 1));
      }

      const control = controlMultiplier(enemy);
      const landed = dealEnemyHit(enemy, {
        damage:Math.max(1, Math.round(tuning.secondaryDamage * falloff)),
        stun:tuning.secondaryStun * control,
        knock:tuning.secondaryKnock * falloff * control,
        motion:{ x:nx, z:nz },
        point:new THREE.Vector3(enemy.x, Math.max(.7, (enemy.height || 2) * .45), enemy.z),
        role:'secondary',
        power:1.55,
        pop:1.2,
      });
      if (landed) secondaryHits++;
    }

    spawnBlastWave(state.compression, Math.max(tuning.secondaryRadius, tuning.frontReach * .72));
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

  const panelState = {
    inputs:new Map(),
    presetSelect:null,
    description:null,
  };

  function syncPanel() {
    for (const [key, entry] of panelState.inputs) {
      entry.input.value = tuning[key];
      entry.value.textContent = Number(tuning[key]).toFixed(entry.digits);
    }
    if (panelState.presetSelect) panelState.presetSelect.value = PRESETS[activePreset] ? activePreset : 'custom';
    if (panelState.description) {
      panelState.description.textContent = PRESETS[activePreset]?.description
        || 'Custom advanced tuning. Choose a preset to restore a designed package.';
    }
  }

  function applyPreset(id, { persist=true } = {}) {
    const preset = PRESETS[id];
    if (!preset) return false;
    Object.assign(tuning, preset.values);
    activePreset = id;
    if (persist) saveTuning();
    syncPanel();
    return true;
  }

  function setTuning(key, value) {
    if (!(key in tuning)) return;
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    tuning[key] = number;
    activePreset = 'custom';
    saveTuning();
    syncPanel();
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

    const presetRow = document.createElement('div');
    presetRow.className = 'srow';
    const presetLabel = document.createElement('div');
    presetLabel.className = 'slabel';
    presetLabel.textContent = 'EFFECT PRESET';
    const presetSelect = document.createElement('select');
    presetSelect.setAttribute('aria-label', 'Pilebunker effect preset');
    presetSelect.style.cssText = 'width:100%;padding:8px;border:1px solid rgba(232,160,76,.45);border-radius:6px;background:#102426;color:#f0d7b1;font:inherit;';
    for (const [id, preset] of Object.entries(PRESETS)) {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = preset.label;
      presetSelect.appendChild(option);
    }
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'CUSTOM';
    presetSelect.appendChild(customOption);
    presetSelect.addEventListener('change', () => {
      if (presetSelect.value !== 'custom') applyPreset(presetSelect.value);
    });
    presetRow.append(presetLabel, presetSelect);
    wrap.appendChild(presetRow);
    panelState.presetSelect = presetSelect;

    const description = document.createElement('div');
    description.className = 'ptitle';
    description.style.cssText = 'line-height:1.4;opacity:.82;margin:5px 0 9px;';
    wrap.appendChild(description);
    panelState.description = description;

    const details = document.createElement('details');
    details.id = 'pilebunkerAdvancedTuning';
    details.style.cssText = 'border-top:1px solid rgba(232,160,76,.20);padding-top:7px;';
    const summary = document.createElement('summary');
    summary.className = 'ptitle';
    summary.style.cssText = 'cursor:pointer;user-select:none;padding:7px 0;';
    summary.textContent = 'ADVANCED EFFECT TUNING';
    details.appendChild(summary);

    const defs = [
      ['pullRadius','PULL RADIUS',3,14,.1,1],
      ['pullStrength','PULL STRENGTH',3,26,.25,2],
      ['compressionDistance','COMPRESSION POINT',.5,5,.05,2],
      ['frontReach','GUARANTEED FRONT REACH',3,14,.1,1],
      ['primaryDamage','PRIMARY DAMAGE',20,260,5,0],
      ['primaryStun','PRIMARY STUN',.1,5,.05,2],
      ['primaryHitRadius','PRIMARY CATCH RADIUS',1.5,7,.1,1],
      ['secondaryDamage','SECONDARY DAMAGE',1,120,2,0],
      ['secondaryRadius','BLAST RADIUS',2,12,.1,1],
      ['secondaryKnock','SECONDARY KNOCKBACK',2,26,.25,2],
      ['secondaryStun','SECONDARY STUN',0,1.5,.05,2],
      ['eliteControl','ELITE CONTROL MULTIPLIER',.2,1,.05,2],
    ];

    for (const [key,label,min,max,step,digits] of defs) {
      const row = document.createElement('div');
      row.className = 'srow';
      const lab = document.createElement('div');
      lab.className = 'slabel';
      const value = document.createElement('span');
      value.className = 'sval';
      lab.textContent = label + ' ';
      lab.appendChild(value);
      const input = document.createElement('input');
      input.type = 'range';
      input.min = min;
      input.max = max;
      input.step = step;
      input.setAttribute('aria-label', label);
      input.addEventListener('input', () => setTuning(key, input.value));
      panelState.inputs.set(key, { input, value, digits });
      row.append(lab, input);
      details.appendChild(row);
    }

    wrap.appendChild(details);
    body.appendChild(wrap);
    syncPanel();
  }

  function dispose() {
    finish();
    scene.remove(pullRing, targetRing);
    pullRing.geometry.dispose();
    pullMaterial.dispose();
    targetRing.geometry.dispose();
    targetMaterial.dispose();
    for (const streak of streaks) {
      scene.remove(streak.mesh);
      streak.mesh.material.dispose();
    }
    streakGeometry.dispose();
    streakMaterial.dispose();
    for (const wave of blastWaves) {
      scene.remove(wave.mesh);
      wave.mesh.geometry.dispose();
      wave.mesh.material.dispose();
    }
    blastWaves.length = 0;
  }

  return {
    start,
    update,
    impact,
    finish,
    installPanel,
    dispose,
    setTuning,
    applyPreset,
    tuning,
    state,
    presets:PRESETS,
    get activePreset(){ return activePreset; },
    get primary(){ return state.primary; },
  };
}
