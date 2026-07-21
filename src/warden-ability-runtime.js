import * as THREE from 'three';
import { createWardenAbilityPrimitives } from './warden-ability-primitives.js';
import { createExtraWardenAbilities } from './warden-extra-abilities.js';

const SETTINGS_KEY = 'wardenAbilitySettings.v2';
const DEFAULT_SETTINGS = Object.freeze({ staminaMax:100, regenPerSecond:5, regenDelay:.8, cooldownMode:'oneSecond' });
const GUARD_MAX = 100;
const STATUS_COLOR = Object.freeze({ stun:0xd9b8ff, combo:0xffd06a, taunt:0xff8b6a });
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const arenaApi = () => typeof window !== 'undefined' ? window.__arena || null : null;
const primitives = createWardenAbilityPrimitives({ THREE });
let extraRuntime = null;

function loadSettings() {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return {
      staminaMax:clamp(Number(parsed.staminaMax) || DEFAULT_SETTINGS.staminaMax, 40, 250),
      regenPerSecond:clamp(Number(parsed.regenPerSecond) || DEFAULT_SETTINGS.regenPerSecond, .5, 30),
      regenDelay:clamp(Number(parsed.regenDelay) || DEFAULT_SETTINGS.regenDelay, 0, 3),
      cooldownMode:parsed.cooldownMode === 'card' ? 'card' : 'oneSecond',
    };
  } catch (_) { return { ...DEFAULT_SETTINGS }; }
}

const state = {
  settings:loadSettings(),
  stamina:DEFAULT_SETTINGS.staminaMax,
  regenDelay:0,
  guard:0,
  hookedSystem:null,
  styleInstalled:false,
  hudInstalled:false,
  panelInstalled:false,
};
state.stamina = state.settings.staminaMax;

function saveSettings() {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); } catch (_) {}
}

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
    .scard[data-card-type="stance"]{border-color:#2c4a47;color:#9fd2c9}
    .scard.cooling{filter:saturate(.45);cursor:wait}
    .scard .abilityCooldownShade{position:absolute;left:0;right:0;bottom:0;height:0;background:rgba(5,8,14,.78);pointer-events:none;z-index:3;transition:height .08s linear}
    .scard .abilityCooldownText{position:absolute;inset:0;display:none;align-items:center;justify-content:center;z-index:4;color:#fff;font-size:17px;font-weight:900;text-shadow:0 2px 5px #000;pointer-events:none}
    .scard.cooling .abilityCooldownText{display:flex}
    #wardenAbilitySettings{margin:12px 0 2px;padding-top:9px;border-top:1px solid rgba(44,74,71,.55)}
    #wardenAbilitySettings .abilityNote{color:#4a6f6a;font-size:8px;line-height:1.4;margin:-10px 0 12px}
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
  guardWrap.id = 'guardWrap'; guardWrap.title = 'Guard'; guardWrap.innerHTML = '<div id="guardFill"></div>';
  hp.insertAdjacentElement('afterend', guardWrap);
  const abilityWrap = document.createElement('div');
  abilityWrap.id = 'abilityStaminaWrap'; abilityWrap.title = 'D-Stamina'; abilityWrap.innerHTML = '<div id="abilityStaminaFill"></div>';
  stamina.insertAdjacentElement('afterend', abilityWrap);
}

function sliderRow(id, label, min, max, step, value) {
  return `<div class="srow"><div class="slabel"><span>${label}</span><span class="sval" id="${id}Value"></span></div><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></div>`;
}

function installSettingsPanel() {
  if (state.panelInstalled || typeof document === 'undefined') return;
  const host = document.getElementById('body-loadout');
  if (!host) return;
  state.panelInstalled = true;
  installStyle();
  const section = document.createElement('div');
  section.id = 'wardenAbilitySettings';
  section.innerHTML = `
    <div class="ptitle">WARDEN ABILITIES · 29 CARDS</div>
    <div class="selectRow"><label for="wardenCooldownMode">ABILITY COOLDOWNS</label><select id="wardenCooldownMode"><option value="oneSecond">FORCE ALL TO 1 SECOND</option><option value="card">USE EACH CARD VALUE</option></select></div>
    ${sliderRow('wardenStaminaMax', 'D-STAMINA MAX', 40, 200, 5, state.settings.staminaMax)}
    ${sliderRow('wardenStaminaRegen', 'D-STAMINA REGEN / SEC', .5, 20, .5, state.settings.regenPerSecond)}
    <div class="abilityNote">The one-second mode makes D-Stamina recovery the main limiter. Manual shuffle discards cooling abilities and may redraw them.</div>`;
  host.appendChild(section);
  const cooldown = section.querySelector('#wardenCooldownMode');
  const max = section.querySelector('#wardenStaminaMax');
  const regen = section.querySelector('#wardenStaminaRegen');
  cooldown.value = state.settings.cooldownMode;
  function sync() {
    state.settings.cooldownMode = cooldown.value === 'card' ? 'card' : 'oneSecond';
    state.settings.staminaMax = clamp(Number(max.value) || 100, 40, 200);
    state.settings.regenPerSecond = clamp(Number(regen.value) || 5, .5, 20);
    state.stamina = Math.min(state.stamina, state.settings.staminaMax);
    section.querySelector('#wardenStaminaMaxValue').textContent = String(Math.round(state.settings.staminaMax));
    section.querySelector('#wardenStaminaRegenValue').textContent = state.settings.regenPerSecond.toFixed(1);
    saveSettings(); renderWardenAbilityHud();
  }
  cooldown.addEventListener('change', sync); max.addEventListener('input', sync); regen.addEventListener('input', sync); sync();
}

function flashAbilityStamina() {
  if (typeof document === 'undefined') return;
  installHud();
  const wrap = document.getElementById('abilityStaminaWrap');
  if (!wrap) return;
  wrap.classList.add('exhaust'); clearTimeout(flashAbilityStamina.timer);
  flashAbilityStamina.timer = setTimeout(() => wrap.classList.remove('exhaust'), 360);
}

function announce(text, seconds = .9) {
  if (typeof document === 'undefined') return;
  const element = document.getElementById('msg');
  if (!element) return;
  element.textContent = text; element.style.opacity = 1; clearTimeout(announce.timer);
  announce.timer = setTimeout(() => { element.style.opacity = 0; }, seconds * 1000);
}

function livingEnemies(api) { return (api?.enemySystem?.enemies || []).filter(enemy => enemy && enemy.hp > 0); }

function hitEnemy(api, enemy, amount, knock = 0, power = null, origin = null) {
  if (!enemy || enemy.hp <= 0) return false;
  const player = origin || primitives.currentPlayer(api);
  const dx = enemy.x - player.x, dz = enemy.z - player.z, length = Math.hypot(dx, dz) || 1;
  const killed = api.enemySystem.damageEnemy(enemy, amount, { x:dx / length * knock, z:dz / length * knock }, power == null ? {} : { power });
  primitives.burst(api, { origin:{ x:enemy.x, z:enemy.z }, radius:killed ? 2.2 : 1.25, color:killed ? 0xff7b56 : 0xffc36a, life:.24 });
  return killed;
}

function statusBag(enemy) { enemy.__wardenStatuses ||= {}; return enemy.__wardenStatuses; }
function primeStun(api, enemy, seconds) {
  if (!enemy || enemy.hp <= 0) return;
  const statuses = statusBag(enemy);
  statuses.stunPrimer = Math.max(statuses.stunPrimer || 0, seconds);
  enemy.stunned = Math.max(enemy.stunned || 0, seconds);
  primitives.marker(api, enemy, { radius:1.45, color:STATUS_COLOR.stun, life:.55 });
}
function consumePrimer(enemy) {
  const statuses = enemy?.__wardenStatuses;
  if (!statuses || !(statuses.stunPrimer > 0)) return false;
  statuses.stunPrimer = 0; return true;
}
function impactDetonate(api, enemy, baseDamage, knock, origin = null) {
  const combo = consumePrimer(enemy);
  const killed = hitEnemy(api, enemy, baseDamage + (combo ? 42 : 0), knock, combo ? 1.65 : 1.1, origin);
  if (combo && !killed) enemy.stunned = Math.max(enemy.stunned || 0, .65);
  if (combo) { primitives.ring(api, { origin:{ x:enemy.x, z:enemy.z }, radius:3.2, color:STATUS_COLOR.combo, life:.42 }); announce('IMPACT COMBO', .7); }
  return killed;
}

function updateEnemyStatuses(dt, api) {
  for (const enemy of livingEnemies(api)) {
    const statuses = enemy.__wardenStatuses;
    if (!statuses) continue;
    if (statuses.stunPrimer > 0) statuses.stunPrimer = Math.max(0, statuses.stunPrimer - dt);
    if (statuses.taunt > 0) { statuses.taunt = Math.max(0, statuses.taunt - dt); enemy.cooldown = Math.min(enemy.cooldown || 0, .25); }
    if (statuses.fear > 0) { statuses.fear = Math.max(0, statuses.fear - dt); enemy.cooldown = Math.max(enemy.cooldown || 0, .45); }
  }
}

function gainGuard(amount) { state.guard = clamp(state.guard + Math.max(0, amount), 0, GUARD_MAX); }
function absorbGuardDamage(amount) {
  const incoming = Math.max(0, amount);
  const absorbed = Math.min(state.guard, incoming);
  state.guard = Math.max(0, state.guard - absorbed);
  if (absorbed > 0) announce(state.guard > 0 ? `GUARD ${Math.ceil(state.guard)}` : 'GUARD BROKEN', .55);
  return incoming - absorbed;
}

function ensureEnemySystemHook(api) {
  const system = api?.enemySystem;
  if (!system || state.hookedSystem === system) return;
  state.hookedSystem = system;
  const baseUpdate = system.update.bind(system);
  const baseDamageEnemy = system.damageEnemy.bind(system);

  system.damageEnemy = function wardenBuffedDamage(enemy, amount, knock, options) {
    const multiplier = extraRuntime?.damageMultiplier(enemy) || 1;
    const scaled = Math.max(0, Number(amount) || 0) * multiplier;
    const before = Math.max(0, Number(enemy?.hp) || 0);
    const killed = baseDamageEnemy(enemy, scaled, knock, options);
    const dealt = Math.min(before, scaled);
    if (dealt > 0) extraRuntime?.onDamageDealt(api, enemy, dealt);
    return killed;
  };

  system.update = function guardedUpdate(dt, player) {
    const protectedNow = state.guard > 0 || !!extraRuntime?.hasDefense();
    const hpBefore = Number(system.playerHp) || 0;
    if (!protectedNow || player?.invulnerable) {
      const out = baseUpdate(dt, player);
      if ((Number(system.playerHp) || 0) < hpBefore) extraRuntime?.notePlayerDamage();
      return out;
    }

    const hitBefore = new Map(system.enemies.map(enemy => [enemy, !!enemy.hitDone]));
    const probe = { attempts:0 };
    const guardedPlayer = { ...player, get invulnerable(){ probe.attempts++; return true; } };
    const out = baseUpdate(dt, guardedPlayer);
    if (probe.attempts <= 0) return out;

    let attacker = null, damage = 8;
    for (const enemy of system.enemies) {
      if (hitBefore.get(enemy) === false && enemy.hitDone) { attacker = enemy; damage = enemy.attack?.damage || 10; break; }
    }
    let remaining = extraRuntime?.interceptIncoming(api, attacker, damage) ?? damage;
    remaining = absorbGuardDamage(remaining);
    if (remaining > 0) {
      system.playerHp = Math.max(0, hpBefore - remaining);
      extraRuntime?.notePlayerDamage();
    }
    return out;
  };
}

function suppressAttackStaminaFlash() {
  if (typeof document === 'undefined') return;
  const clear = () => document.getElementById('stWrap')?.classList.remove('exhaust');
  if (typeof queueMicrotask === 'function') queueMicrotask(clear); else setTimeout(clear, 0);
}
function preserveAttackStamina(api) {
  const resource = api?.arena?.stamina;
  if (!resource) return;
  const snapshot = { v:resource.v, pending:resource.pending, recoverDelayT:resource.recoverDelayT };
  const restore = () => {
    const current = api?.arena?.stamina;
    if (!current) return;
    if (Number.isFinite(snapshot.v)) current.v = snapshot.v;
    if (Number.isFinite(snapshot.pending)) current.pending = snapshot.pending;
    if (Number.isFinite(snapshot.recoverDelayT)) current.recoverDelayT = snapshot.recoverDelayT;
  };
  if (typeof queueMicrotask === 'function') queueMicrotask(restore); else setTimeout(restore, 0);
}
function spendAbilityStamina(cost) {
  if (state.stamina + 1e-6 < cost) { flashAbilityStamina(); announce('NOT ENOUGH D-STAMINA', .75); return false; }
  state.stamina = Math.max(0, state.stamina - cost); state.regenDelay = state.settings.regenDelay; return true;
}
function requireFrontTarget(api, options) {
  const target = primitives.nearestInFront(api, options);
  if (!target) announce('NO TARGET IN FRONT', .65);
  return target;
}

function playCombatRoll(api, card) {
  if (typeof api.triggerDodge !== 'function') return false;
  const origin = primitives.currentPlayer(api), direction = primitives.forward(api);
  api.triggerDodge();
  if ((api.arena?.dodge?.t ?? -1) < 0) return false;
  primitives.present('roll', .34, { direction }); primitives.trail(api, { origin, direction, distance:card.effect?.travel || 5.5, color:0xaed9ff }); return true;
}
function playChallenge(api, card) {
  const target = requireFrontTarget(api, { range:card.effect?.range || 14, angle:card.effect?.angle || 2.35 });
  if (!target) return false;
  const statuses = statusBag(target); statuses.taunt = Math.max(statuses.taunt || 0, 8); target.cooldown = 0; gainGuard(30);
  primitives.present('challenge', .48); primitives.marker(api, target, { radius:2.2, color:STATUS_COLOR.taunt, life:.72 }); primitives.tether(api, target, { color:STATUS_COLOR.taunt, life:.58 });
  announce('CHALLENGE · +30 GUARD', .85); return true;
}
function playShieldBash(api, card) {
  const targets = primitives.targetsInFront(api, { range:card.effect?.range || 9, width:card.effect?.width || 3.4, angle:1.7, maxTargets:3 });
  const primary = targets[0]; if (!primary) { announce('NO TARGET IN FRONT', .65); return false; }
  const origin = primitives.currentPlayer(api), direction = primitives.directionTo(api, primary);
  const distance = Math.hypot(primary.x-origin.x, primary.z-origin.z);
  primitives.startMotion(api, { type:'bash', presentation:'bash', direction, distance:Math.min(card.effect?.travel || 3.8, Math.max(0, distance-1.55)), duration:.22 });
  primitives.wedge(api, { origin, direction, range:card.effect?.range || 9, angle:1.35, color:0x8fd8ff, life:.32, opacity:.42 });
  primitives.schedule(.12, () => { impactDetonate(api, primary, 52, 8.5, origin); for (const enemy of targets.slice(1)) if (enemy.hp > 0) hitEnemy(api, enemy, 24, 5, .8, origin); });
  return true;
}
function playPommelStrike(api, card) {
  const target = requireFrontTarget(api, { range:card.effect?.range || 8, angle:card.effect?.angle || 1.45 }); if (!target) return false;
  const origin = primitives.currentPlayer(api), direction = primitives.directionTo(api, target), distance = Math.hypot(target.x-origin.x,target.z-origin.z);
  primitives.startMotion(api, { type:'jab', presentation:'jab', direction, distance:Math.min(card.effect?.travel || 2.2, Math.max(0,distance-1.4)), duration:.16 });
  primitives.slash(api, { origin, direction, radius:4.2, angle:.72, color:0xd7b6ff, life:.24 });
  primitives.schedule(.09, () => { hitEnemy(api, target, 22, 1.4, .75, origin); if (target.hp > 0) primeStun(api, target, 3); announce('STUN PRIMER', .7); }); return true;
}
function playMightyBlow(api, card) {
  const target = primitives.nearestInFront(api, { range:card.effect?.range || 10, angle:1.7 });
  const origin = primitives.currentPlayer(api), facing = target ? primitives.directionTo(api,target) : primitives.forward(api);
  const intended = target ? {x:target.x,z:target.z} : primitives.pointAhead(api,6.2);
  const impact = { x:origin.x+facing.x*Math.min(6.2,Math.hypot(intended.x-origin.x,intended.z-origin.z)), z:origin.z+facing.z*Math.min(6.2,Math.hypot(intended.x-origin.x,intended.z-origin.z)) };
  primitives.startMotion(api, { type:'slam', presentation:'slam', direction:facing, distance:card.effect?.travel || 3.2, duration:.28 });
  primitives.slash(api, { origin, direction:facing, radius:7.2, angle:1.05, color:0xffcf7b, life:.32 }); primitives.disc(api, { origin:impact, radius:card.effect?.radius || 5.2, color:0xffb45f, life:.48, opacity:.30 });
  primitives.schedule(.19, () => {
    const targets = primitives.targetsInRadius(api, impact, card.effect?.radius || 5.2).sort((a,b)=>Math.hypot(a.x-impact.x,a.z-impact.z)-Math.hypot(b.x-impact.x,b.z-impact.z));
    targets.forEach((enemy,index)=>{ const killed=index===0?impactDetonate(api,enemy,74,13,impact):hitEnemy(api,enemy,42,9,1.05,impact); if(!killed&&enemy.hp>0)enemy.stunned=Math.max(enemy.stunned||0,1.2); });
    primitives.burst(api, { origin:impact, radius:4.4, color:0xffc36a, life:.30 });
  }); return true;
}
function playWrathOfHeaven(api, card) {
  const player=primitives.currentPlayer(api), radius=card.effect?.radius||11.5;
  primitives.present('cast',.62); primitives.disc(api,{origin:player,radius,color:0xf7e59a,life:.62,opacity:.24}); primitives.ring(api,{origin:player,radius,color:0xf7e59a,life:.76});
  primitives.schedule(.18,()=>{ const targets=primitives.targetsInRadius(api,player,radius); for(const enemy of targets){hitEnemy(api,enemy,30,1.4,.8,player);if(enemy.hp>0)primeStun(api,enemy,3.2);} announce(`${targets.length} STUN PRIMER${targets.length===1?'':'S'}`,.8); }); return true;
}
function playSpellPurge(api, card) {
  const player=primitives.currentPlayer(api), radius=card.effect?.radius||11.5;
  primitives.present('purge',.55); primitives.ring(api,{origin:player,radius,color:0x9ee8ff,life:.72}); primitives.disc(api,{origin:player,radius,color:0x72cfff,life:.55,opacity:.18});
  primitives.schedule(.16,()=>{ const targets=primitives.targetsInRadius(api,player,radius);let combos=0;for(const enemy of [...targets]){const combo=consumePrimer(enemy);if(combo)combos++;hitEnemy(api,enemy,combo?84:20,combo?8:2.5,combo?1.8:.65,player);if(combo&&enemy.hp>0)enemy.stunned=Math.max(enemy.stunned||0,.8);}announce(combos?`${combos} ELDRITCH COMBO${combos===1?'':'S'}`:'SPELL PURGE',.85); }); return true;
}
function playPilebunker() {
  if (typeof window.__POWBUNKER_CAN_PLAY__ !== 'function' || !window.__POWBUNKER_CAN_PLAY__()) return false;
  window.dispatchEvent(new CustomEvent('powbunker:play')); return true;
}

extraRuntime = createExtraWardenAbilities({ primitives, livingEnemies, hitEnemy, statusBag, primeStun, impactDetonate, gainGuard, announce });
const PLAYERS = Object.freeze({
  'A10-COMBAT-ROLL':playCombatRoll,
  'A11-CHALLENGE':playChallenge,
  'A12-SHIELD-BASH':playShieldBash,
  'A13-POMMEL-STRIKE':playPommelStrike,
  'A14-MIGHTY-BLOW':playMightyBlow,
  'A15-WRATH-OF-HEAVEN':playWrathOfHeaven,
  'A16-SPELL-PURGE':playSpellPurge,
  'A01-PILEBUNKER':playPilebunker,
  ...extraRuntime.players,
});

export function effectiveWardenAbilityCooldown(card) {
  if (!card || card.type !== 'ability') return 0;
  return state.settings.cooldownMode === 'oneSecond' ? 1 : Math.max(.05, Number(card.cooldown) || 1);
}
export function canPlayWardenAbility(card) {
  const api=arenaApi(); if(!card||card.type!=='ability'||!api)return false;
  if(api.arena?.deadT>=0||api.roomTransition?.active)return false;
  if(card.id==='A01-PILEBUNKER')return state.stamina>=card.cost&&typeof window.__POWBUNKER_CAN_PLAY__==='function'&&window.__POWBUNKER_CAN_PLAY__();
  return state.stamina>=card.cost&&!api.combatState?.attack&&(api.arena?.dodge?.t??-1)<0;
}
export function playWardenAbility(card) {
  const api=arenaApi(), player=PLAYERS[card?.id];
  if(!api||!player||!card||card.type!=='ability'){suppressAttackStaminaFlash();return false;}
  if(state.stamina+1e-6<(card.cost||0)){flashAbilityStamina();announce('NOT ENOUGH D-STAMINA',.75);suppressAttackStaminaFlash();return false;}
  if(!canPlayWardenAbility(card)){suppressAttackStaminaFlash();return false;}
  const preserveAttackResource=!!api.arena?.stamina;
  if(!player(api,card)){suppressAttackStaminaFlash();return false;}
  if(!spendAbilityStamina(card.cost||0)){suppressAttackStaminaFlash();return false;}
  if(preserveAttackResource)preserveAttackStamina(api); return true;
}
export function resetWardenAbilityRuntime() {
  state.stamina=state.settings.staminaMax;state.regenDelay=0;state.guard=0;primitives.clear();extraRuntime.reset();renderWardenAbilityHud();
}
export function updateWardenAbilityRuntime(dt) {
  installHud();installSettingsPanel();const api=arenaApi();
  if(api){ensureEnemySystemHook(api);updateEnemyStatuses(dt,api);extraRuntime.update(dt,api);}
  if(state.regenDelay>0)state.regenDelay=Math.max(0,state.regenDelay-dt);else state.stamina=Math.min(state.settings.staminaMax,state.stamina+state.settings.regenPerSecond*dt);
  primitives.update(dt,api);renderWardenAbilityHud();
}
export function renderWardenAbilityHud() {
  if(typeof document==='undefined')return;installHud();const staminaFill=document.getElementById('abilityStaminaFill'),guardFill=document.getElementById('guardFill');
  if(staminaFill)staminaFill.style.width=`${clamp(state.stamina/state.settings.staminaMax,0,1)*100}%`;
  if(guardFill)guardFill.style.width=`${clamp(state.guard/GUARD_MAX,0,1)*100}%`;
}
export function getWardenAbilityRuntimeState() {
  return { stamina:state.stamina,staminaMax:state.settings.staminaMax,staminaRegen:state.settings.regenPerSecond,cooldownMode:state.settings.cooldownMode,guard:state.guard,guardMax:GUARD_MAX };
}
