import * as THREE from 'three';

const RESOURCE = Object.freeze({ max:100, regenPerSecond:18, regenDelay:.8 });
const GUARD_MAX = 100;
const STATUS_COLOR = Object.freeze({ stun:0xd9b8ff, combo:0xffd06a, taunt:0xff8b6a });

const state = {
  stamina: RESOURCE.max,
  regenDelay: 0,
  guard: 0,
  hookedSystem: null,
  effects: [],
  styleInstalled: false,
  hudInstalled: false,
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const arenaApi = () => window.__arena || null;

function installStyle() {
  if (state.styleInstalled || typeof document === 'undefined') return;
  state.styleInstalled = true;
  const style = document.createElement('style');
  style.id = 'wardenAbilityCardStyle';
  style.textContent = `
    #guardWrap,#abilityStaminaWrap{position:relative;width:150px;height:6px;margin-top:3px;background:#122224;border:1px solid #2c4a47;border-radius:3px;overflow:hidden}
    #guardFill,#abilityStaminaFill{height:100%;width:0;transition:width .10s}
    #guardFill{background:linear-gradient(90deg,#a6d9ff,#4e8ec8)}
    #abilityStaminaFill{background:linear-gradient(90deg,#e2b6ff,#8457c9)}
    #abilityStaminaWrap.exhaust{border-color:#ff9070;box-shadow:0 0 8px rgba(255,144,112,.65)}
    .scard[data-card-type="ability"]{border-color:#6e4c8e;color:#eadcff}
    .scard[data-card-type="ability"] .cicon{display:grid;place-items:center;color:#eadcff;border-color:rgba(195,151,235,.62);background:radial-gradient(circle,rgba(151,92,199,.30),rgba(18,36,38,.42));font-size:10px;font-weight:900;letter-spacing:.04em;line-height:1.05;text-align:center;padding:1px}
    .scard[data-card-type="ability"] .crows{font-size:8px;color:#d7b6ff;gap:1px}
    .scard[data-card-type="ability"] .crow{justify-content:space-between}
    .scard[data-card-type="ability"] .crow b{color:#8f78aa;font-size:7px}
    .scard.cooling{filter:saturate(.45);cursor:wait}
    .scard .abilityCooldownShade{position:absolute;left:0;right:0;bottom:0;height:0;background:rgba(5,8,14,.78);pointer-events:none;z-index:3;transition:height .08s linear}
    .scard .abilityCooldownText{position:absolute;inset:0;display:none;align-items:center;justify-content:center;z-index:4;color:#fff;font-size:17px;font-weight:900;text-shadow:0 2px 5px #000;pointer-events:none}
    .scard.cooling .abilityCooldownText{display:flex}
  `;
  document.head.appendChild(style);
}

function installHud() {
  if (state.hudInstalled || typeof document === 'undefined') return;
  const hp = document.getElementById('hpWrap');
  const stamina = document.getElementById('stWrap');
  if (!hp || !stamina) return;
  state.hudInstalled = true;
  installStyle();
  const guardWrap = document.createElement('div');
  guardWrap.id = 'guardWrap';
  guardWrap.title = 'Guard';
  guardWrap.innerHTML = '<div id="guardFill"></div>';
  hp.insertAdjacentElement('afterend', guardWrap);
  const abilityWrap = document.createElement('div');
  abilityWrap.id = 'abilityStaminaWrap';
  abilityWrap.title = 'Ability Stamina';
  abilityWrap.innerHTML = '<div id="abilityStaminaFill"></div>';
  stamina.insertAdjacentElement('afterend', abilityWrap);
}

function flashAbilityStamina() {
  if (typeof document === 'undefined') return;
  installHud();
  const wrap = document.getElementById('abilityStaminaWrap');
  if (!wrap) return;
  wrap.classList.add('exhaust');
  clearTimeout(flashAbilityStamina.timer);
  flashAbilityStamina.timer = setTimeout(() => wrap.classList.remove('exhaust'), 360);
}

function announce(text, seconds = .9) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('msg');
  if (!el) return;
  el.textContent = text;
  el.style.opacity = 1;
  clearTimeout(announce.timer);
  announce.timer = setTimeout(() => { el.style.opacity = 0; }, seconds * 1000);
}

function getWorldRoot(api) {
  return api?.enemySystem?.group?.parent || api?.enemySystem?.group || null;
}

function spawnRing(api, x, z, color, radius = 3.2, life = .45) {
  const parent = getWorldRoot(api);
  if (!parent?.add) return;
  const material = new THREE.MeshBasicMaterial({ color, transparent:true, opacity:.88, blending:THREE.AdditiveBlending, depthWrite:false });
  const mesh = new THREE.Mesh(new THREE.RingGeometry(.76, .90, 48), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, .12, z);
  mesh.scale.setScalar(.25);
  parent.add(mesh);
  state.effects.push({ mesh, age:0, life, radius });
}

function updateEffects(dt) {
  for (let i = state.effects.length - 1; i >= 0; i--) {
    const effect = state.effects[i];
    effect.age += dt;
    const u = clamp(effect.age / effect.life, 0, 1);
    effect.mesh.scale.setScalar(.25 + effect.radius * (1 - Math.pow(1 - u, 3)));
    effect.mesh.material.opacity = .88 * (1 - u);
    if (u >= 1) {
      effect.mesh.parent?.remove(effect.mesh);
      effect.mesh.geometry?.dispose?.();
      effect.mesh.material?.dispose?.();
      state.effects.splice(i, 1);
    }
  }
}

function currentPlayer(api) {
  return { x:api.actorPos?.x || 0, z:api.actorPos?.y || 0 };
}

function livingEnemies(api) {
  return (api?.enemySystem?.enemies || []).filter(enemy => enemy && enemy.hp > 0);
}

function nearestEnemy(api, range = Infinity) {
  const player = currentPlayer(api);
  let best = null;
  let bestDistance = range;
  for (const enemy of livingEnemies(api)) {
    const distance = Math.hypot(enemy.x - player.x, enemy.z - player.z);
    if (distance < bestDistance) { best = enemy; bestDistance = distance; }
  }
  return best;
}

function enemiesInRadius(api, radius) {
  const player = currentPlayer(api);
  return livingEnemies(api).filter(enemy => Math.hypot(enemy.x - player.x, enemy.z - player.z) <= radius);
}

function hitEnemy(api, enemy, amount, knock = 0, power = null) {
  if (!enemy || enemy.hp <= 0) return false;
  const player = currentPlayer(api);
  const dx = enemy.x - player.x;
  const dz = enemy.z - player.z;
  const length = Math.hypot(dx, dz) || 1;
  const killed = api.enemySystem.damageEnemy(
    enemy,
    amount,
    { x:dx / length * knock, z:dz / length * knock },
    power == null ? {} : { power }
  );
  spawnRing(api, enemy.x, enemy.z, killed ? 0xff7b56 : 0xffc36a, 1.05, .25);
  return killed;
}

function statusBag(enemy) {
  enemy.__wardenStatuses ||= {};
  return enemy.__wardenStatuses;
}

function primeStun(api, enemy, seconds) {
  if (!enemy || enemy.hp <= 0) return;
  const statuses = statusBag(enemy);
  statuses.stunPrimer = Math.max(statuses.stunPrimer || 0, seconds);
  enemy.stunned = Math.max(enemy.stunned || 0, seconds);
  spawnRing(api, enemy.x, enemy.z, STATUS_COLOR.stun, 1.4, .55);
}

function consumePrimer(enemy) {
  const statuses = enemy?.__wardenStatuses;
  if (!statuses || !(statuses.stunPrimer > 0)) return false;
  statuses.stunPrimer = 0;
  return true;
}

function impactDetonate(api, enemy, baseDamage, knock) {
  const combo = consumePrimer(enemy);
  const killed = hitEnemy(api, enemy, baseDamage + (combo ? 42 : 0), knock, combo ? 1.65 : 1.1);
  if (combo && !killed) enemy.stunned = Math.max(enemy.stunned || 0, .65);
  if (combo) {
    spawnRing(api, enemy.x, enemy.z, STATUS_COLOR.combo, 2.3, .42);
    announce('IMPACT COMBO', .7);
  }
  return killed;
}

function updateEnemyStatuses(dt, api) {
  for (const enemy of livingEnemies(api)) {
    const statuses = enemy.__wardenStatuses;
    if (!statuses) continue;
    if (statuses.stunPrimer > 0) statuses.stunPrimer = Math.max(0, statuses.stunPrimer - dt);
    if (statuses.taunt > 0) {
      statuses.taunt = Math.max(0, statuses.taunt - dt);
      enemy.cooldown = Math.min(enemy.cooldown || 0, .25);
    }
  }
}

function gainGuard(amount) {
  state.guard = clamp(state.guard + Math.max(0, amount), 0, GUARD_MAX);
}

function absorbGuardDamage(amount) {
  if (state.guard <= 0) return;
  state.guard = Math.max(0, state.guard - Math.max(1, amount));
  announce(state.guard > 0 ? `GUARD ${Math.ceil(state.guard)}` : 'GUARD BROKEN', .55);
}

function ensureEnemySystemHook(api) {
  const system = api?.enemySystem;
  if (!system || state.hookedSystem === system) return;
  state.hookedSystem = system;
  const baseUpdate = system.update.bind(system);
  system.update = function guardedUpdate(dt, player) {
    const guardActive = state.guard > 0 && !player?.invulnerable;
    const before = guardActive
      ? new Map(system.enemies.map(enemy => [enemy, !!enemy.hitDone]))
      : null;
    const guardProbe = { attempts:0 };
    const guardedPlayer = guardActive
      ? { ...player, get invulnerable(){ guardProbe.attempts++; return true; } }
      : player;
    const out = baseUpdate(dt, guardedPlayer);
    if (guardActive && guardProbe.attempts > 0) {
      let damage = 8; // fallback for a projectile collision, whose projectile is private to the enemy system
      for (const enemy of system.enemies) {
        if (before.get(enemy) === false && enemy.hitDone) {
          damage = enemy.attack?.damage || 10;
          break;
        }
      }
      absorbGuardDamage(damage);
    }
    return out;
  };
}

function suppressAttackStaminaFlash() {
  if (typeof document === 'undefined') return;
  const clear = () => document.getElementById('stWrap')?.classList.remove('exhaust');
  if (typeof queueMicrotask === 'function') queueMicrotask(clear);
  else setTimeout(clear, 0);
}

function preserveAttackStamina(api) {
  const resource = api?.arena?.stamina;
  if (!resource) return;
  const snapshot = {
    v: resource.v,
    pending: resource.pending,
    recoverDelayT: resource.recoverDelayT,
  };
  const restore = () => {
    const current = api?.arena?.stamina;
    if (!current) return;
    if (Number.isFinite(snapshot.v)) current.v = snapshot.v;
    if (Number.isFinite(snapshot.pending)) current.pending = snapshot.pending;
    if (Number.isFinite(snapshot.recoverDelayT)) current.recoverDelayT = snapshot.recoverDelayT;
  };
  if (typeof queueMicrotask === 'function') queueMicrotask(restore);
  else setTimeout(restore, 0);
}

function spendAbilityStamina(cost) {
  if (state.stamina + 1e-6 < cost) {
    flashAbilityStamina();
    announce('NOT ENOUGH ABILITY STAMINA', .75);
    return false;
  }
  state.stamina = Math.max(0, state.stamina - cost);
  state.regenDelay = RESOURCE.regenDelay;
  return true;
}

function requireTarget(api, range) {
  const target = nearestEnemy(api, range);
  if (!target) announce('NO TARGET', .6);
  return target;
}

function playCombatRoll(api) {
  if (typeof api.triggerDodge !== 'function') return false;
  api.triggerDodge();
  return api.arena?.dodge?.t >= 0;
}

function playChallenge(api) {
  const enemy = requireTarget(api, 14);
  if (!enemy) return false;
  const statuses = statusBag(enemy);
  statuses.taunt = Math.max(statuses.taunt || 0, 8);
  enemy.cooldown = 0;
  gainGuard(30);
  spawnRing(api, enemy.x, enemy.z, STATUS_COLOR.taunt, 1.9, .6);
  announce('CHALLENGE · +30 GUARD', .85);
  return true;
}

function playShieldBash(api) {
  const enemy = requireTarget(api, 5.4);
  if (!enemy) return false;
  const player = currentPlayer(api);
  const dx = enemy.x - player.x;
  const dz = enemy.z - player.z;
  const distance = Math.hypot(dx, dz) || 1;
  api.actorPos.x += dx / distance * Math.min(1.05, Math.max(0, distance - 1.8));
  api.actorPos.y += dz / distance * Math.min(1.05, Math.max(0, distance - 1.8));
  impactDetonate(api, enemy, 48, 7.5);
  return true;
}

function playPommelStrike(api) {
  const enemy = requireTarget(api, 4.8);
  if (!enemy) return false;
  hitEnemy(api, enemy, 20, 1.2, .75);
  if (enemy.hp > 0) primeStun(api, enemy, 3);
  announce('STUN PRIMER', .7);
  return true;
}

function playMightyBlow(api) {
  const enemy = requireTarget(api, 5.2);
  if (!enemy) return false;
  const killed = impactDetonate(api, enemy, 72, 13);
  if (!killed) enemy.stunned = Math.max(enemy.stunned || 0, 1.2);
  return true;
}

function playWrathOfHeaven(api) {
  const targets = enemiesInRadius(api, 6.2);
  if (!targets.length) { announce('NO TARGETS IN RANGE', .6); return false; }
  const player = currentPlayer(api);
  spawnRing(api, player.x, player.z, 0xf7e59a, 5.4, .7);
  for (const enemy of targets) {
    hitEnemy(api, enemy, 28, 1, .8);
    if (enemy.hp > 0) primeStun(api, enemy, 3.2);
  }
  announce(`${targets.length} STUN PRIMER${targets.length === 1 ? '' : 'S'}`, .8);
  return true;
}

function playSpellPurge(api) {
  const targets = enemiesInRadius(api, 6.2);
  if (!targets.length) { announce('NO TARGETS IN RANGE', .6); return false; }
  const player = currentPlayer(api);
  spawnRing(api, player.x, player.z, 0x9ee8ff, 5.7, .65);
  let combos = 0;
  for (const enemy of [...targets]) {
    const combo = consumePrimer(enemy);
    if (combo) combos++;
    hitEnemy(api, enemy, combo ? 82 : 18, combo ? 7 : 2, combo ? 1.8 : .65);
    if (combo && enemy.hp > 0) enemy.stunned = Math.max(enemy.stunned || 0, .8);
  }
  announce(combos ? `${combos} ELDRITCH COMBO${combos === 1 ? '' : 'S'}` : 'SPELL PURGE', .85);
  return true;
}

function playPilebunker() {
  if (typeof window.__POWBUNKER_CAN_PLAY__ !== 'function' || !window.__POWBUNKER_CAN_PLAY__()) return false;
  window.dispatchEvent(new CustomEvent('powbunker:play'));
  return true;
}

const PLAYERS = Object.freeze({
  'A10-COMBAT-ROLL': playCombatRoll,
  'A11-CHALLENGE': playChallenge,
  'A12-SHIELD-BASH': playShieldBash,
  'A13-POMMEL-STRIKE': playPommelStrike,
  'A14-MIGHTY-BLOW': playMightyBlow,
  'A15-WRATH-OF-HEAVEN': playWrathOfHeaven,
  'A16-SPELL-PURGE': playSpellPurge,
  'A01-PILEBUNKER': playPilebunker,
});

export function canPlayWardenAbility(card) {
  const api = arenaApi();
  if (!card || card.type !== 'ability' || !api) return false;
  if (api.arena?.deadT >= 0 || api.roomTransition?.active) return false;
  if (card.id === 'A01-PILEBUNKER') return state.stamina >= card.cost && typeof window.__POWBUNKER_CAN_PLAY__ === 'function' && window.__POWBUNKER_CAN_PLAY__();
  return state.stamina >= card.cost && !api.combatState?.attack && (api.arena?.dodge?.t ?? -1) < 0;
}

export function playWardenAbility(card) {
  const api = arenaApi();
  const player = PLAYERS[card?.id];
  if (!api || !player || !card || card.type !== 'ability') {
    suppressAttackStaminaFlash();
    return false;
  }
  if (state.stamina + 1e-6 < (card.cost || 0)) {
    flashAbilityStamina();
    announce('NOT ENOUGH ABILITY STAMINA', .75);
    suppressAttackStaminaFlash();
    return false;
  }
  if (!canPlayWardenAbility(card)) {
    suppressAttackStaminaFlash();
    return false;
  }
  const preserveAttackResource = !!api.arena?.stamina;
  if (!player(api)) {
    suppressAttackStaminaFlash();
    return false;
  }
  if (!spendAbilityStamina(card.cost || 0)) {
    suppressAttackStaminaFlash();
    return false;
  }
  if (preserveAttackResource) preserveAttackStamina(api);
  return true;
}

export function resetWardenAbilityRuntime() {
  state.stamina = RESOURCE.max;
  state.regenDelay = 0;
  state.guard = 0;
  for (const effect of state.effects) {
    effect.mesh.parent?.remove(effect.mesh);
    effect.mesh.geometry?.dispose?.();
    effect.mesh.material?.dispose?.();
  }
  state.effects.length = 0;
  renderWardenAbilityHud();
}

export function updateWardenAbilityRuntime(dt) {
  installHud();
  const api = arenaApi();
  if (api) {
    ensureEnemySystemHook(api);
    updateEnemyStatuses(dt, api);
  }
  if (state.regenDelay > 0) state.regenDelay = Math.max(0, state.regenDelay - dt);
  else state.stamina = Math.min(RESOURCE.max, state.stamina + RESOURCE.regenPerSecond * dt);
  updateEffects(dt);
  renderWardenAbilityHud();
}

export function renderWardenAbilityHud() {
  if (typeof document === 'undefined') return;
  installHud();
  const staminaFill = document.getElementById('abilityStaminaFill');
  const guardFill = document.getElementById('guardFill');
  if (staminaFill) staminaFill.style.width = `${clamp(state.stamina / RESOURCE.max, 0, 1) * 100}%`;
  if (guardFill) guardFill.style.width = `${clamp(state.guard / GUARD_MAX, 0, 1) * 100}%`;
}

export function getWardenAbilityRuntimeState() {
  return { stamina:state.stamina, staminaMax:RESOURCE.max, guard:state.guard, guardMax:GUARD_MAX };
}
