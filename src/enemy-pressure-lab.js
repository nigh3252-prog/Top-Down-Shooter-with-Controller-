// Enemy pressure test layer.
//
// This module deliberately sits above each roster's authored AI. It adds a
// diagnostic "Avalanche" director mode without flattening the individual enemy
// implementations, applies instance-level timing scales, and separates physical
// knockback from attack-canceling stagger.

import { DIRECTOR_MODES } from './combat-director.js';
import { getLastCombatHitContext } from './combat-balance.js';

export const AVALANCHE_MODE_ID = 'avalanche';

if (!DIRECTOR_MODES.some(mode => mode.id === AVALANCHE_MODE_ID)) {
  DIRECTOR_MODES.push({ id:AVALANCHE_MODE_ID, label:'Avalanche' });
}

const STORAGE_PREFIX = 'arena.pressureLab.';
const DEFAULTS = Object.freeze({
  windupScale:1,
  cooldownScale:.2,
  recoveryScale:.55,
  pursuitScale:1.4,
});

const WEAPON_STAGGER_WEIGHT = Object.freeze({
  rapier:.12,
  dagger:.32,
  whip:.42,
  katana:.56,
  spear:.58,
  longsword:.68,
  mace:.82,
  claymore:.88,
  battleaxe:.96,
  greatsword:1,
  warhammer:1.08,
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback=0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const nowMs = () => typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
const liveEnemy = enemy => !!enemy && finite(enemy.hp, 0) > 0 && enemy.state !== 'dead';

function loadNumber(key, fallback) {
  try {
    const value = Number(globalThis.localStorage?.getItem(STORAGE_PREFIX + key));
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function saveNumber(key, value) {
  try {
    globalThis.localStorage?.setItem(STORAGE_PREFIX + key, String(value));
  } catch {
    // Storage is optional in tests and privacy-restricted browsers.
  }
}

export function createPressureLabSettings(overrides={}) {
  return {
    windupScale:clamp(finite(overrides.windupScale, loadNumber('windupScale', DEFAULTS.windupScale)), .5, 3),
    cooldownScale:clamp(finite(overrides.cooldownScale, loadNumber('cooldownScale', DEFAULTS.cooldownScale)), .05, 1.5),
    recoveryScale:clamp(finite(overrides.recoveryScale, loadNumber('recoveryScale', DEFAULTS.recoveryScale)), .1, 2),
    pursuitScale:clamp(finite(overrides.pursuitScale, loadNumber('pursuitScale', DEFAULTS.pursuitScale)), .5, 2.5),
  };
}

let staggerSerial = 0;

function deterministicRoll(enemy, context, damage) {
  staggerSerial += 1;
  const seed = finite(enemy?.id, 1) * 12.9898
    + finite(damage, 0) * 78.233
    + staggerSerial * 37.719
    + String(context?.attackKey || '').length * 17.11;
  const raw = Math.sin(seed) * 43758.5453;
  return raw - Math.floor(raw);
}

export function shouldStaggerHit(enemy, amount, opts={}, context=getLastCombatHitContext?.()) {
  if (opts.forceStagger === true || opts.stagger === true) return true;
  if (opts.stagger === false) return false;

  const recent = context && nowMs() - finite(context.at, -Infinity) <= 250 ? context : null;
  const maxHp = Math.max(1, finite(enemy?.maxHp, finite(enemy?.hp, 1)));
  const damageRatio = clamp(finite(amount, 0) / maxHp, 0, 2);
  const attackGroup = opts.attackGroup || recent?.attackGroup || null;
  const weaponId = opts.weaponId || recent?.weaponId || null;
  const weight = WEAPON_STAGGER_WEIGHT[weaponId] ?? .5;

  // Non-chop attacks normally move the enemy without deleting its attack.
  // Exceptionally large hits still stagger so giant impacts retain authority.
  if (attackGroup !== 'vertical') {
    return damageRatio >= clamp(.56 - weight * .12, .40, .55);
  }

  // Medium and heavy weapons become reliable once the chop does real damage.
  if (weight >= .62 && damageRatio >= .075) return true;
  if (weight >= .88 && damageRatio >= .045) return true;

  // Light-weapon chops can stagger, but not every time.
  const chance = clamp(.10 + weight * .62 + damageRatio * .9, .12, .72);
  return deterministicRoll(enemy, recent, amount) < chance;
}

export function classifyEnemyPressure(enemies=[], player={x:0,z:0}) {
  const counts = {
    live:0,
    approaching:0,
    inRange:0,
    windup:0,
    active:0,
    recovery:0,
    cooldown:0,
    blocked:0,
    stunned:0,
  };

  for (const enemy of enemies) {
    if (!liveEnemy(enemy)) continue;
    counts.live += 1;
    const state = enemy.state || 'idle';
    if (finite(enemy.stunned, 0) > 0) {
      counts.stunned += 1;
      continue;
    }
    if (state === 'windup') { counts.windup += 1; continue; }
    if (state === 'active') { counts.active += 1; continue; }
    if (state === 'recovery') { counts.recovery += 1; continue; }

    if (finite(enemy.cooldown, 0) > 0) {
      counts.cooldown += 1;
      continue;
    }

    const dx = finite(player?.x, 0) - finite(enemy.x, 0);
    const dz = finite(player?.z, 0) - finite(enemy.z, 0);
    const distance = Math.hypot(dx, dz);
    const range = Math.max(
      finite(enemy.realAtk?.range, 0),
      finite(enemy.attack?.range, 0),
      finite(enemy.holdDist, 0),
      finite(enemy.stop, 0),
      2.5
    );
    if (distance <= range + .75) counts.inRange += 1;
    else {
      counts.approaching += 1;
      if (Math.hypot(finite(enemy.vx, 0), finite(enemy.vz, 0)) < .08) counts.blocked += 1;
    }
  }
  return counts;
}

function captureCombatState(enemy) {
  return {
    state:enemy.state,
    stateTime:enemy.stateTime,
    attack:enemy.attack,
    windup:enemy.windup,
    active:enemy.active,
    recovery:enemy.recovery,
    hitDone:enemy.hitDone,
    token:enemy.token,
    cooldown:enemy.cooldown,
    stunned:enemy.stunned,
    directEngaged:enemy.directEngaged,
    approachPermit:enemy.approachPermit,
  };
}

function restoreCombatState(enemy, snapshot) {
  enemy.state = snapshot.state;
  enemy.stateTime = snapshot.stateTime;
  enemy.attack = snapshot.attack;
  enemy.windup = snapshot.windup;
  enemy.active = snapshot.active;
  enemy.recovery = snapshot.recovery;
  enemy.hitDone = snapshot.hitDone;
  enemy.token = snapshot.token;
  enemy.cooldown = snapshot.cooldown;
  enemy.stunned = snapshot.stunned;
  enemy.directEngaged = snapshot.directEngaged;
  enemy.approachPermit = snapshot.approachPermit;
}

function installDodgeTouchButton() {
  if (typeof document === 'undefined' || document.getElementById('dodgeBtn')) return;
  const row = document.querySelector('.btnrow');
  if (!row) return;

  const style = document.createElement('style');
  style.id = 'pressureLabTouchStyle';
  style.textContent = `
    #dodgeBtn{border-color:#3f778f;color:#a8e5ff}
    #dodgeBtn .btnArrow{color:#a8e5ff;font-size:20px}
    #avalancheDiag{position:fixed;top:52px;right:max(8px,env(safe-area-inset-right));z-index:28;
      width:min(46vw,220px);font-family:ui-monospace,Menlo,Consolas,monospace;font-size:9px;
      color:#9fd2c9;background:rgba(10,20,22,.88);border:1px solid #6e3a24;border-radius:7px;
      padding:6px 8px;box-sizing:border-box;pointer-events:auto}
    #avalancheDiag[hidden]{display:none}
    #avalancheDiag button{width:100%;border:0;background:transparent;color:#e8a04c;
      font:inherit;text-align:left;padding:0 0 4px}
    #avalancheDiag pre{margin:0;white-space:pre-wrap;line-height:1.45}
    #avalancheDiag.collapsed pre{display:none}
  `;
  document.head.appendChild(style);

  const button = document.createElement('button');
  button.className = 'pbtn';
  button.id = 'dodgeBtn';
  button.setAttribute('aria-label', 'Dodge');
  button.innerHTML = '<span class="btnGlyph">✕</span><span class="btnArrow">↝</span>';
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    button.classList.add('held');
    globalThis.dispatchEvent?.(new CustomEvent('stone:dodge-request', { detail:{ source:'touch' } }));
    globalThis.dispatchEvent?.(new KeyboardEvent('keydown', { key:'k', bubbles:true }));
  });
  for (const eventName of ['pointerup','pointercancel','pointerleave']) {
    button.addEventListener(eventName, () => button.classList.remove('held'));
  }
  row.insertBefore(button, row.firstChild);
}

function addSlider(container, label, config, settings, onChange) {
  const row = document.createElement('div');
  row.className = 'srow pressureLabRow';
  const lab = document.createElement('div');
  lab.className = 'slabel';
  const value = document.createElement('span');
  value.className = 'sval';
  const syncValue = () => { value.textContent = `${Number(settings[config.key]).toFixed(config.decimals)}×`; };
  lab.textContent = label + ' ';
  lab.appendChild(value);
  const input = document.createElement('input');
  input.type = 'range';
  input.min = config.min;
  input.max = config.max;
  input.step = config.step;
  input.value = settings[config.key];
  input.setAttribute('aria-label', label);
  input.addEventListener('input', () => {
    settings[config.key] = clamp(Number(input.value), config.min, config.max);
    saveNumber(config.key, settings[config.key]);
    syncValue();
    onChange?.();
  });
  syncValue();
  row.append(lab, input);
  container.appendChild(row);
}

function installControls(api, labState) {
  if (typeof document === 'undefined') return;
  installDodgeTouchButton();

  const container = document.getElementById('dirSliders');
  if (container && !document.getElementById('pressureLabHeader')) {
    const header = document.createElement('div');
    header.className = 'ptitle';
    header.id = 'pressureLabHeader';
    header.textContent = 'AVALANCHE / REACTION TEST';
    container.appendChild(header);
    addSlider(container, 'ENEMY WINDUP', {key:'windupScale',min:.5,max:3,step:.05,decimals:2}, labState.settings);
    addSlider(container, 'AVALANCHE COOLDOWN', {key:'cooldownScale',min:.05,max:1.5,step:.05,decimals:2}, labState.settings);
    addSlider(container, 'AVALANCHE RECOVERY', {key:'recoveryScale',min:.1,max:2,step:.05,decimals:2}, labState.settings);
    addSlider(container, 'AVALANCHE PURSUIT', {key:'pursuitScale',min:.5,max:2.5,step:.05,decimals:2}, labState.settings);
  }

  if (!document.getElementById('avalancheDiag')) {
    const box = document.createElement('aside');
    box.id = 'avalancheDiag';
    box.hidden = true;
    const button = document.createElement('button');
    button.type = 'button';
    const pre = document.createElement('pre');
    box.append(button, pre);
    let collapsed = false;
    try { collapsed = localStorage.getItem(STORAGE_PREFIX + 'diagCollapsed') === '1'; } catch {}
    const syncCollapsed = () => {
      box.classList.toggle('collapsed', collapsed);
      button.textContent = `${collapsed ? '▸' : '▾'} AVALANCHE DIAGNOSTICS`;
    };
    button.addEventListener('click', () => {
      collapsed = !collapsed;
      try { localStorage.setItem(STORAGE_PREFIX + 'diagCollapsed', collapsed ? '1' : '0'); } catch {}
      syncCollapsed();
    });
    syncCollapsed();
    document.body.appendChild(box);
    labState.diagnosticElement = { box, pre };
  }

  labState.api = api;
}

function applyAttackTimings(enemy, attack, settings, avalanche) {
  if (!enemy || !attack) return;
  const baseWindup = Math.max(.01, finite(enemy.windup, finite(attack.windup, .1)));
  enemy.windup = Math.max(.05, baseWindup * settings.windupScale);
  enemy._pressureLabWindupAppliedAt = nowMs();
  if (avalanche) {
    const baseRecovery = Math.max(.01, finite(enemy.recovery, finite(attack.recovery, .1)));
    enemy.recovery = Math.max(.04, baseRecovery * settings.recoveryScale);
  }
}

function patchDirector(system, key, labState) {
  const director = system?.director;
  if (!director || director._pressureLabPatched) return;
  director._pressureLabPatched = true;

  const base = {
    setMode:director.setMode.bind(director),
    getMode:director.getMode.bind(director),
    update:director.update.bind(director),
    canGrant:director.canGrant.bind(director),
    grant:director.grant.bind(director),
    hasApproachPermit:director.hasApproachPermit.bind(director),
    requestRally:director.requestRally?.bind(director),
    getDebugState:director.getDebugState.bind(director),
  };
  let avalanche = false;
  let lastContext = { enemies:system.enemies, player:{x:0,z:0} };

  director.setMode = mode => {
    avalanche = mode === AVALANCHE_MODE_ID;
    if (avalanche) {
      for (const enemy of system.enemies || []) director.releaseAllForEnemy?.(enemy);
      return base.setMode('chaos');
    }
    return base.setMode(mode);
  };
  director.getMode = () => avalanche ? AVALANCHE_MODE_ID : base.getMode();

  director.update = (dt, context={}) => {
    lastContext = context;
    base.update(dt, context);
    if (!avalanche) return;
    for (const enemy of context.enemies || system.enemies || []) {
      if (!liveEnemy(enemy)) continue;
      enemy.approachPermit = true;
      enemy.approachPermitTime = 0;
      enemy.approachCooldown = 0;
      enemy.directEngaged = true;
      enemy.directEngageReadyAt = 0;
      enemy.directEngageCooldownCap = 0;
      enemy.attackAlign = Math.PI;
      if (enemy.gesture === 'rally') {
        enemy.gesture = null;
        enemy.gestureTime = 0;
      }
      if (finite(enemy.cooldown, 0) > 0) {
        const baseCooldown = Math.max(.04, finite(enemy.attack?.cooldown, enemy.cooldown));
        enemy.cooldown = Math.min(enemy.cooldown, baseCooldown * labState.settings.cooldownScale);
      }
      if (Number.isFinite(enemy.speed)) enemy.speed *= labState.settings.pursuitScale;
    }
  };

  director.canGrant = (enemy, attack, context={}) => {
    if (avalanche) return liveEnemy(enemy) && !!attack && finite(enemy.stunned, 0) <= 0;
    return base.canGrant(enemy, attack, context);
  };

  director.grant = (enemy, attack) => {
    applyAttackTimings(enemy, attack, labState.settings, avalanche);
    labState.attackStarts.push({ at:nowMs(), key, kind:attack?.kind || 'unknown' });
    return base.grant(enemy, attack);
  };

  director.hasApproachPermit = enemy => avalanche ? liveEnemy(enemy) : base.hasApproachPermit(enemy);
  if (base.requestRally) director.requestRally = enemy => avalanche ? false : base.requestRally(enemy);

  director.getDebugState = () => {
    const debug = base.getDebugState();
    const counts = classifyEnemyPressure(lastContext.enemies || system.enemies, lastContext.player);
    return {
      ...debug,
      mode:director.getMode(),
      pressureLab:counts,
      windupScale:labState.settings.windupScale,
      avalancheCooldownScale:labState.settings.cooldownScale,
      avalancheRecoveryScale:labState.settings.recoveryScale,
      avalanchePursuitScale:labState.settings.pursuitScale,
    };
  };

  // Some roster wrappers expose a convenience setter. Route it through the
  // patched director so Avalanche is accepted even if the original mode list
  // predates this module.
  if (system.setDirectorMode) system.setDirectorMode = mode => director.setMode(mode);
}

function patchDamage(system, labState) {
  if (!system?.damageEnemy || system._pressureLabDamagePatched) return;
  system._pressureLabDamagePatched = true;
  const baseDamage = system.damageEnemy.bind(system);

  system.damageEnemy = (enemy, amount, knock={x:0,z:0}, opts={}) => {
    if (!enemy || enemy.hp <= 0) return false;
    const context = getLastCombatHitContext?.();
    const stagger = shouldStaggerHit(enemy, amount, opts, context);
    enemy.lastStaggerReason = stagger
      ? `${opts.attackGroup || context?.attackGroup || 'impact'}:${opts.weaponId || context?.weaponId || 'unknown'}`
      : '';

    if (stagger) return baseDamage(enemy, amount, knock, opts);

    const snapshot = captureCombatState(enemy);
    const release = system.director?.releaseAllForEnemy;
    if (release) system.director.releaseAllForEnemy = () => {};

    let killed = false;
    try {
      killed = baseDamage(enemy, amount, knock, opts);
    } finally {
      if (release) system.director.releaseAllForEnemy = release;
    }

    if (!killed && enemy.hp > 0) {
      restoreCombatState(enemy, snapshot);
      enemy._pressureLabSuppressLegacyStun = snapshot.stunned;
    }
    return killed;
  };
}

function patchSystem(system, key, labState) {
  if (!system || system._pressureLabPatched) return;
  system._pressureLabPatched = true;
  patchDirector(system, key, labState);
  patchDamage(system, labState);

  const baseUpdate = system.update.bind(system);
  system.update = (dt, player) => {
    const snapshots = new Map();
    for (const enemy of system.enemies || []) {
      if (Object.prototype.hasOwnProperty.call(enemy, '_pressureLabSuppressLegacyStun')) {
        enemy.stunned = enemy._pressureLabSuppressLegacyStun;
        delete enemy._pressureLabSuppressLegacyStun;
      }
      snapshots.set(enemy, { state:enemy.state, cooldown:enemy.cooldown });
    }

    baseUpdate(dt, player);

    const avalanche = system.director?.getMode?.() === AVALANCHE_MODE_ID;
    for (const enemy of system.enemies || []) {
      const previous = snapshots.get(enemy);
      if (!previous || !liveEnemy(enemy)) continue;
      if (previous.state !== 'windup' && enemy.state === 'windup'
          && nowMs() - finite(enemy._pressureLabWindupAppliedAt, -Infinity) > 50) {
        applyAttackTimings(enemy, enemy.attack, labState.settings, avalanche);
      }
      if (avalanche && previous.state === 'recovery' && enemy.state === 'idle' && enemy.cooldown > 0) {
        enemy.cooldown = Math.max(.02, enemy.cooldown * labState.settings.cooldownScale);
      }
    }

    const cutoff = nowMs() - 10000;
    labState.attackStarts = labState.attackStarts.filter(item => item.at >= cutoff);
    labState.renderT += finite(dt, 0);
    if (labState.renderT >= .2) {
      labState.renderT = 0;
      renderDiagnostics(labState);
    }
  };
}

function renderDiagnostics(labState) {
  const diagnostic = labState.diagnosticElement;
  const api = labState.api;
  if (!diagnostic || !api) return;
  const avalanche = api.director?.getMode?.() === AVALANCHE_MODE_ID;
  diagnostic.box.hidden = !avalanche;
  if (!avalanche) return;

  const systems = labState.getVisibleSystems();
  const enemies = systems.flatMap(system => system.enemies || []);
  const player = labState.lastPlayer || {x:0,z:0};
  const counts = classifyEnemyPressure(enemies, player);
  const starts = labState.attackStarts.length;
  diagnostic.pre.textContent = [
    `live ${counts.live}  attacks/10s ${starts}`,
    `approach ${counts.approaching}  in range ${counts.inRange}`,
    `windup ${counts.windup}  active ${counts.active}`,
    `recovery ${counts.recovery}  cooldown ${counts.cooldown}`,
    `stunned ${counts.stunned}  blocked ${counts.blocked}`,
    `windup ${labState.settings.windupScale.toFixed(2)}×`,
    `cool ${labState.settings.cooldownScale.toFixed(2)}×  recovery ${labState.settings.recoveryScale.toFixed(2)}×`,
  ].join('\n');
}

export function installEnemyPressureLab({ api, systemsByKey, getVisibleSystems }) {
  const labState = {
    api:null,
    settings:createPressureLabSettings(),
    attackStarts:[],
    renderT:0,
    diagnosticElement:null,
    getVisibleSystems:typeof getVisibleSystems === 'function'
      ? getVisibleSystems
      : () => Object.values(systemsByKey || {}),
  };

  for (const [key, system] of Object.entries(systemsByKey || {})) patchSystem(system, key, labState);

  const baseApiUpdate = api.update.bind(api);
  api.update = (dt, player) => {
    labState.lastPlayer = player || labState.lastPlayer;
    return baseApiUpdate(dt, player);
  };

  api.setEnemyWindupScale = value => {
    labState.settings.windupScale = clamp(finite(value, 1), .5, 3);
    saveNumber('windupScale', labState.settings.windupScale);
    return labState.settings.windupScale;
  };
  api.setAvalancheCooldownScale = value => {
    labState.settings.cooldownScale = clamp(finite(value, .2), .05, 1.5);
    saveNumber('cooldownScale', labState.settings.cooldownScale);
    return labState.settings.cooldownScale;
  };
  api.setAvalancheRecoveryScale = value => {
    labState.settings.recoveryScale = clamp(finite(value, .55), .1, 2);
    saveNumber('recoveryScale', labState.settings.recoveryScale);
    return labState.settings.recoveryScale;
  };
  api.setAvalanchePursuitScale = value => {
    labState.settings.pursuitScale = clamp(finite(value, 1.4), .5, 2.5);
    saveNumber('pursuitScale', labState.settings.pursuitScale);
    return labState.settings.pursuitScale;
  };
  Object.defineProperties(api, {
    enemyWindupScale:{ enumerable:true, get:() => labState.settings.windupScale },
    avalancheCooldownScale:{ enumerable:true, get:() => labState.settings.cooldownScale },
    avalancheRecoveryScale:{ enumerable:true, get:() => labState.settings.recoveryScale },
    avalanchePursuitScale:{ enumerable:true, get:() => labState.settings.pursuitScale },
  });
  api.getEnemyPressureDiagnostics = () => {
    const systems = labState.getVisibleSystems();
    return {
      mode:api.director?.getMode?.(),
      counts:classifyEnemyPressure(
        systems.flatMap(system => system.enemies || []),
        labState.lastPlayer || {x:0,z:0}
      ),
      attacksStarted10s:labState.attackStarts.length,
      settings:{...labState.settings},
    };
  };

  installControls(api, labState);
  return api;
}
