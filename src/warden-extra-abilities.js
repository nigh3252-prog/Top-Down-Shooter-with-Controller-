const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const EPSILON = 1e-6;

export function createExtraWardenAbilities({
  primitives,
  livingEnemies,
  hitEnemy,
  statusBag,
  primeStun,
  impactDetonate,
  gainGuard,
  announce,
} = {}) {
  if (!primitives || !livingEnemies || !hitEnemy) throw new Error('[warden-extra-abilities] missing runtime helpers.');

  const state = {
    buffs:Object.create(null),
    zones:[],
    duelTarget:null,
    duelTime:0,
    duelStacks:0,
    lastPlayerDamageAge:999,
    counter:null,
  };

  const buff = name => Math.max(0, state.buffs[name] || 0);
  const has = name => buff(name) > 0;
  function setBuff(name, seconds) { state.buffs[name] = Math.max(buff(name), Math.max(0, seconds || 0)); }

  function playerHp(api) { return Number(api?.enemySystem?.playerHp) || 0; }
  function maxPlayerHp(api) { return Number(api?.enemySystem?.playerMaxHp) || 100; }
  function setPlayerHp(api, value) {
    if (!api?.enemySystem) return;
    api.enemySystem.playerHp = clamp(value, 0, maxPlayerHp(api));
  }
  function heal(api, amount) {
    const before = playerHp(api);
    setPlayerHp(api, before + Math.max(0, amount));
    return Math.max(0, playerHp(api) - before);
  }
  function spendHealth(api, amount) {
    const before = playerHp(api);
    if (before <= 1) return 0;
    const spent = Math.min(Math.max(0, amount), before - 1);
    setPlayerHp(api, before - spent);
    return spent;
  }
  function missingHealthFraction(api) {
    const max = Math.max(1, maxPlayerHp(api));
    return clamp(1 - playerHp(api) / max, 0, 1);
  }

  function directionToPoint(from, to) {
    const dx = to.x - from.x, dz = to.z - from.z;
    const length = Math.hypot(dx, dz) || 1;
    return { x:dx / length, z:dz / length };
  }

  function taunt(enemy, seconds = 8) {
    if (!enemy || enemy.hp <= 0) return;
    const statuses = statusBag(enemy);
    statuses.taunt = Math.max(statuses.taunt || 0, seconds);
    enemy.cooldown = Math.min(enemy.cooldown || 0, .2);
  }

  function fear(enemy, origin, seconds = 2.4, knock = 10) {
    if (!enemy || enemy.hp <= 0) return;
    const statuses = statusBag(enemy);
    statuses.fear = Math.max(statuses.fear || 0, seconds);
    enemy.stunned = Math.max(enemy.stunned || 0, Math.min(.7, seconds));
    const direction = directionToPoint(origin, enemy);
    enemy.knockX = (enemy.knockX || 0) + direction.x * knock;
    enemy.knockZ = (enemy.knockZ || 0) + direction.z * knock;
  }

  function playShieldWall(api, card) {
    setBuff('shieldWall', card.effect?.duration || 4.5);
    gainGuard(24);
    primitives.present('brace', .55);
    const origin = primitives.currentPlayer(api), direction = primitives.forward(api);
    primitives.wedge(api, { origin, direction, range:5.5, angle:1.75, color:0x8fd8ff, life:.58, opacity:.25 });
    announce('SHIELD WALL · +24 GUARD', .8);
    return true;
  }

  function playLivid(api, card) {
    const radius = card.effect?.radius || 10;
    const count = Math.min(5, primitives.targetsInRadius(api, primitives.currentPlayer(api), radius).length);
    state.buffs.lividPower = count;
    setBuff('livid', card.effect?.duration || 9);
    gainGuard(18 * count);
    primitives.present('brace', .55);
    primitives.ring(api, { origin:primitives.currentPlayer(api), radius, color:0xff8866, life:.72 });
    announce(`LIVID ×${count || 1}`, .8);
    return true;
  }

  function playPaybackStrike(api, card) {
    const origin = primitives.currentPlayer(api), direction = primitives.forward(api);
    const empowered = state.lastPlayerDamageAge <= 3;
    const targets = primitives.targetsInFront(api, { range:card.effect?.range || 7.5, angle:card.effect?.angle || 2.1, width:3.2, maxTargets:4 });
    primitives.present('bash', .35);
    primitives.slash(api, { origin, direction, radius:7.2, angle:2.2, color:empowered ? 0xff8a62 : 0xffc58a, life:.30 });
    primitives.schedule(.12, () => {
      for (const enemy of targets) {
        hitEnemy(api, enemy, empowered ? 68 : 36, empowered ? 9 : 5, empowered ? 1.4 : .85, origin);
        if (empowered && enemy.hp > 0) primeStun(api, enemy, 2);
      }
      announce(empowered ? 'SWEET REVENGE' : 'PAYBACK STRIKE', .75);
    });
    return true;
  }

  function playGrapplingChain(api, card) {
    const target = primitives.nearestInFront(api, { range:card.effect?.range || 15, angle:1.35 });
    if (!target) { announce('NO TARGET IN FRONT', .65); return false; }
    const origin = primitives.currentPlayer(api);
    const direction = primitives.directionTo(api, target);
    primitives.present('jab', .42);
    primitives.tether(api, target, { color:0xc6cbd4, life:.48, opacity:.95 });
    primitives.schedule(.14, () => {
      hitEnemy(api, target, 18, 0, .65, origin);
      const destination = { x:origin.x + direction.x * 2.1, z:origin.z + direction.z * 2.1 };
      target.x = destination.x; target.z = destination.z;
      if (target.root?.position) { target.root.position.x = target.x; target.root.position.z = target.z; }
      target.stunned = Math.max(target.stunned || 0, 1.2);
      primitives.burst(api, { origin:destination, radius:2, color:0xc6cbd4, life:.24 });
      announce('GRAPPLED', .65);
    });
    return true;
  }

  function playToTheDeath(api, card) {
    const target = primitives.nearestInFront(api, { range:card.effect?.range || 15, angle:1.5 });
    if (!target) { announce('NO TARGET IN FRONT', .65); return false; }
    state.duelTarget = target;
    state.duelTime = card.effect?.duration || 10;
    state.duelStacks = 0;
    taunt(target, state.duelTime);
    primitives.present('challenge', .48);
    primitives.marker(api, target, { radius:2.7, color:0xff5757, life:1.0 });
    primitives.tether(api, target, { color:0xff5757, life:1.0, opacity:.85 });
    announce('TO THE DEATH', .85);
    return true;
  }

  function playEarthshakingStrike(api, card) {
    const origin = primitives.currentPlayer(api), direction = primitives.forward(api);
    const range = card.effect?.range || 14, width = card.effect?.width || 3.2;
    primitives.present('slam', .55);
    primitives.wedge(api, { origin, direction, range, angle:.48, color:0xe3a36c, life:.58, opacity:.42 });
    primitives.startMotion(api, { type:'slam', presentation:'slam', direction, distance:1.6, duration:.28 });
    primitives.schedule(.18, () => {
      for (const enemy of primitives.targetsInFront(api, { range, width, angle:.7, maxTargets:12 })) {
        hitEnemy(api, enemy, 48, 8, 1.05, origin);
      }
      state.zones.push({ type:'fissure', time:card.effect?.duration || 6, tick:0, start:origin, end:{ x:origin.x + direction.x * range, z:origin.z + direction.z * range }, width:2.2 });
      announce('EARTHSHAKING STRIKE', .75);
    });
    return true;
  }

  function playBlockAndSlash(api, card) {
    state.counter = { type:'blockSlash', time:card.effect?.duration || 5, used:false };
    primitives.present('brace', .5);
    primitives.wedge(api, { origin:primitives.currentPlayer(api), direction:primitives.forward(api), range:4.5, angle:1.8, color:0xbddcff, life:.5, opacity:.22 });
    announce('BLOCK READY', .7);
    return true;
  }

  function playWarHorn(api, card) {
    const origin = primitives.currentPlayer(api), radius = card.effect?.radius || 11;
    primitives.present('challenge', .52);
    primitives.ring(api, { origin, radius, color:0xffd36a, life:.72 });
    primitives.schedule(.14, () => {
      const targets = primitives.targetsInRadius(api, origin, radius);
      for (const enemy of targets) fear(enemy, origin, 2.8, 12);
      announce(`${targets.length} PANICKED`, .75);
    });
    return true;
  }

  function playWarCry(api, card) {
    const origin = primitives.currentPlayer(api), radius = card.effect?.radius || 11;
    primitives.present('challenge', .55);
    primitives.ring(api, { origin, radius, color:0xff8b6a, life:.72 });
    const targets = primitives.targetsInRadius(api, origin, radius);
    for (const enemy of targets) taunt(enemy, 8);
    gainGuard(Math.min(100, 12 + targets.length * 12));
    announce(`WAR CRY · ${targets.length} TAUNTED`, .8);
    return true;
  }

  function playWalkingFortress(api, card) {
    setBuff('walkingFortress', card.effect?.duration || 4);
    primitives.present('brace', .6);
    primitives.disc(api, { origin:primitives.currentPlayer(api), radius:5.5, color:0xd9f1ff, life:.72, opacity:.22 });
    primitives.ring(api, { origin:primitives.currentPlayer(api), radius:5.5, color:0xd9f1ff, life:.72 });
    announce('WALKING FORTRESS', .85);
    return true;
  }

  function playLungeAndSlash(api, card) {
    const origin = primitives.currentPlayer(api), direction = primitives.forward(api);
    const range = card.effect?.range || 13, width = card.effect?.width || 2.8;
    const targets = primitives.targetsInFront(api, { range, width, angle:.7, maxTargets:10 });
    primitives.startMotion(api, { type:'lunge', presentation:'jab', direction, distance:card.effect?.travel || 8, duration:.34 });
    primitives.trail(api, { origin, direction, distance:card.effect?.travel || 8, color:0xbde8ff });
    primitives.slash(api, { origin, direction, radius:range, angle:.7, color:0xbde8ff, life:.38 });
    primitives.schedule(.16, () => targets.forEach((enemy, index) => {
      if (index === 0) impactDetonate(api, enemy, 50, 9, origin);
      else hitEnemy(api, enemy, 30, 7, .9, origin);
    }));
    return true;
  }

  function playCounterstrike(api, card) {
    gainGuard(100);
    setBuff('counterstrike', card.effect?.duration || 7);
    const origin = primitives.currentPlayer(api), radius = card.effect?.radius || 11;
    for (const enemy of primitives.targetsInRadius(api, origin, radius)) taunt(enemy, 8);
    primitives.present('brace', .62);
    primitives.ring(api, { origin, radius, color:0x8fd8ff, life:.82 });
    announce('COUNTERSTRIKE · FULL GUARD', .9);
    return true;
  }

  function playChargingBull(api, card) {
    const origin = primitives.currentPlayer(api), direction = primitives.forward(api);
    const range = card.effect?.range || 14, width = card.effect?.width || 3.8;
    const targets = primitives.targetsInFront(api, { range, width, angle:.75, maxTargets:12 });
    primitives.startMotion(api, { type:'charge', presentation:'bash', direction, distance:card.effect?.travel || 9, duration:.42 });
    primitives.wedge(api, { origin, direction, range, angle:.78, color:0xff9b68, life:.48, opacity:.38 });
    gainGuard(Math.min(60, targets.length * 10));
    primitives.schedule(.12, () => targets.forEach(enemy => {
      hitEnemy(api, enemy, 44, 13, 1.1, origin);
      if (enemy.hp > 0) enemy.stunned = Math.max(enemy.stunned || 0, 1.1);
    }));
    return true;
  }

  function playWhirlwind(api, card) {
    const pulses = Math.max(2, card.effect?.pulses || 4), radius = card.effect?.radius || 7.5;
    primitives.present('purge', .85);
    for (let pulse = 0; pulse < pulses; pulse++) {
      primitives.schedule(pulse * .16, () => {
        const origin = primitives.currentPlayer(api);
        primitives.slash(api, { origin, direction:primitives.forward(api), radius, angle:Math.PI * 2, color:0xffcf8c, life:.26 });
        for (const enemy of primitives.targetsInRadius(api, origin, radius)) hitEnemy(api, enemy, 18, 3.5, .65, origin);
      });
    }
    return true;
  }

  function playDevour(api, card) {
    const target = primitives.nearestInFront(api, { range:card.effect?.range || 7, angle:card.effect?.angle || 1.4 });
    if (!target) { announce('NO TARGET IN FRONT', .65); return false; }
    const origin = primitives.currentPlayer(api), direction = primitives.directionTo(api, target);
    const missing = missingHealthFraction(api);
    primitives.startMotion(api, { type:'lunge', presentation:'jab', direction, distance:2.2, duration:.2 });
    primitives.slash(api, { origin, direction, radius:6, angle:1.2, color:0xe85b64, life:.3 });
    primitives.schedule(.12, () => {
      const damage = Math.round(42 + missing * 55);
      hitEnemy(api, target, damage, 4, 1.0, origin);
      const restored = heal(api, 10 + missing * 34);
      announce(`DEVOUR · +${Math.round(restored)} HP`, .75);
    });
    return true;
  }

  function playRingOfPain(api, card) {
    setBuff('ringOfPain', card.effect?.duration || 8);
    state.zones.push({ type:'ringPain', time:card.effect?.duration || 8, tick:0, radius:card.effect?.radius || 8.5 });
    primitives.present('cast', .52);
    primitives.ring(api, { origin:primitives.currentPlayer(api), radius:card.effect?.radius || 8.5, color:0xd64b63, life:.82 });
    announce('RING OF PAIN', .75);
    return true;
  }

  function playDragonRage(api, card) {
    const origin = primitives.currentPlayer(api), direction = primitives.forward(api);
    const missing = missingHealthFraction(api);
    spendHealth(api, 6);
    const targets = primitives.targetsInFront(api, { range:card.effect?.range || 7.5, angle:card.effect?.angle || 1.8, width:3, maxTargets:4 });
    primitives.present('bash', .34);
    primitives.slash(api, { origin, direction, radius:7.2, angle:1.85, color:0xff4868, life:.30 });
    primitives.schedule(.11, () => targets.forEach(enemy => hitEnemy(api, enemy, Math.round(38 + missing * 65), 6, 1.0, origin)));
    announce('DRAGON-RAGE', .65);
    return true;
  }

  function playRampage(api, card) {
    setBuff('rampage', card.effect?.duration || 10);
    primitives.present('challenge', .58);
    primitives.ring(api, { origin:primitives.currentPlayer(api), radius:7, color:0xff4f64, life:.8 });
    announce('RAMPAGE', .8);
    return true;
  }

  function playBlessedBlades(api, card) {
    setBuff('blessedBlades', card.effect?.duration || 12);
    primitives.present('cast', .5);
    primitives.slash(api, { origin:primitives.currentPlayer(api), direction:primitives.forward(api), radius:7.5, angle:2.4, color:0xffed9e, life:.48 });
    announce('BLESSED BLADES', .75);
    return true;
  }

  function playHornOfValor(api, card) {
    setBuff('hornValor', card.effect?.duration || 10);
    primitives.present('challenge', .55);
    primitives.ring(api, { origin:primitives.currentPlayer(api), radius:10, color:0x8fe5c4, life:.75 });
    announce('HORN OF VALOR', .75);
    return true;
  }

  function playLineInTheSand(api, card) {
    const origin = primitives.currentPlayer(api), direction = primitives.forward(api), distance = card.effect?.range || 8;
    const center = { x:origin.x + direction.x * distance, z:origin.z + direction.z * distance };
    const width = card.effect?.width || 7;
    state.zones.push({ type:'line', time:card.effect?.duration || 10, center, direction, width, depth:1.3 });
    primitives.present('slam', .52);
    primitives.wedge(api, { origin, direction, range:distance + 1, angle:.22, color:0x8fd8ff, life:.72, opacity:.5 });
    primitives.disc(api, { origin:center, radius:width, color:0x8fd8ff, life:.58, opacity:.08 });
    announce('LINE IN THE SAND', .8);
    return true;
  }

  function playBodyguard(api, card) {
    setBuff('bodyguard', card.effect?.duration || 12);
    gainGuard(45);
    primitives.present('brace', .55);
    primitives.disc(api, { origin:primitives.currentPlayer(api), radius:5.5, color:0x86c9ff, life:.68, opacity:.2 });
    announce('BODYGUARD · +45 GUARD', .8);
    return true;
  }

  function pointSegmentDistance(point, start, end) {
    const dx = end.x - start.x, dz = end.z - start.z;
    const lengthSq = dx * dx + dz * dz || 1;
    const t = clamp(((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSq, 0, 1);
    return Math.hypot(point.x - (start.x + dx * t), point.z - (start.z + dz * t));
  }

  function updateZones(dt, api) {
    for (let index = state.zones.length - 1; index >= 0; index--) {
      const zone = state.zones[index];
      zone.time -= dt;
      zone.tick -= dt;
      if (zone.tick <= 0) {
        if (zone.type === 'ringPain') {
          zone.tick = .75;
          const origin = primitives.currentPlayer(api);
          const damage = Math.round(12 + missingHealthFraction(api) * 20);
          for (const enemy of primitives.targetsInRadius(api, origin, zone.radius)) hitEnemy(api, enemy, damage, 1.8, .55, origin);
          primitives.ring(api, { origin, radius:zone.radius, color:0xd64b63, life:.42, opacity:.5 });
        } else if (zone.type === 'fissure') {
          zone.tick = 1;
          for (const enemy of livingEnemies(api)) {
            if (pointSegmentDistance(enemy, zone.start, zone.end) <= zone.width + (enemy.radius || 0)) hitEnemy(api, enemy, 16, 1.5, .5, zone.start);
          }
          primitives.wedge(api, { origin:zone.start, direction:directionToPoint(zone.start, zone.end), range:Math.hypot(zone.end.x-zone.start.x, zone.end.z-zone.start.z), angle:.24, color:0xd87b48, life:.45, opacity:.24 });
        } else if (zone.type === 'line') {
          zone.tick = .18;
          const side = { x:zone.direction.z, z:-zone.direction.x };
          for (const enemy of livingEnemies(api)) {
            const dx = enemy.x - zone.center.x, dz = enemy.z - zone.center.z;
            const along = dx * zone.direction.x + dz * zone.direction.z;
            const lateral = Math.abs(dx * side.x + dz * side.z);
            if (Math.abs(along) <= zone.depth + (enemy.radius || 0) && lateral <= zone.width + (enemy.radius || 0)) {
              const sign = along >= 0 ? 1 : -1;
              enemy.knockX = (enemy.knockX || 0) + zone.direction.x * sign * 7;
              enemy.knockZ = (enemy.knockZ || 0) + zone.direction.z * sign * 7;
              enemy.stunned = Math.max(enemy.stunned || 0, .18);
            }
          }
        }
      }
      if (zone.time <= 0) state.zones.splice(index, 1);
    }
  }

  function update(dt, api) {
    state.lastPlayerDamageAge += dt;
    for (const key of Object.keys(state.buffs)) {
      if (key === 'lividPower') continue;
      state.buffs[key] = Math.max(0, state.buffs[key] - dt);
    }
    if (!has('livid')) state.buffs.lividPower = 0;
    if (state.counter) {
      state.counter.time -= dt;
      if (state.counter.time <= 0 || state.counter.used) state.counter = null;
    }
    if (state.duelTime > 0) {
      state.duelTime = Math.max(0, state.duelTime - dt);
      if (state.duelTime <= 0 || !state.duelTarget || state.duelTarget.hp <= 0) {
        state.duelTarget = null; state.duelStacks = 0;
      }
    }
    if (api) updateZones(dt, api);
  }

  function reset() {
    state.buffs = Object.create(null);
    state.zones.length = 0;
    state.duelTarget = null;
    state.duelTime = 0;
    state.duelStacks = 0;
    state.lastPlayerDamageAge = 999;
    state.counter = null;
  }

  function damageMultiplier(enemy) {
    let multiplier = 1;
    if (has('rampage')) multiplier *= 1.2;
    if (has('blessedBlades')) multiplier *= 1.15;
    if (has('hornValor')) multiplier *= 1.15;
    if (has('livid')) multiplier *= 1 + .1 * Math.min(5, state.buffs.lividPower || 0);
    if (state.duelTime > 0 && enemy === state.duelTarget) multiplier *= 1 + Math.min(.75, state.duelStacks * .075);
    if (has('ringOfPain')) multiplier *= 1.08;
    return multiplier;
  }

  function onDamageDealt(api, enemy, amount) {
    if (has('rampage') && amount > 0) heal(api, amount * .2);
    if (state.duelTime > 0 && enemy === state.duelTarget) state.duelStacks = Math.min(10, state.duelStacks + 1);
  }

  function notePlayerDamage() { state.lastPlayerDamageAge = 0; }

  function hasDefense() {
    return has('walkingFortress') || has('shieldWall') || has('hornValor') || has('bodyguard') || has('livid') || has('counterstrike') || !!state.counter;
  }

  function interceptIncoming(api, attacker, damage) {
    let remaining = Math.max(0, damage);
    if (has('walkingFortress')) remaining = 0;
    else {
      if (state.counter?.type === 'blockSlash' && !state.counter.used) {
        state.counter.used = true;
        remaining = 0;
        const origin = primitives.currentPlayer(api);
        primitives.slash(api, { origin, direction:attacker ? primitives.directionTo(api, attacker) : primitives.forward(api), radius:7, angle:2.1, color:0xbde8ff, life:.3 });
        if (attacker?.hp > 0) hitEnemy(api, attacker, 66, 10, 1.2, origin);
        announce('BLOCK AND SLASH', .7);
      } else {
        if (has('shieldWall')) remaining *= .35;
        if (has('hornValor')) remaining *= .85;
        if (has('bodyguard')) remaining *= .5;
        if (has('livid')) remaining *= 1 - .1 * Math.min(5, state.buffs.lividPower || 0);
        if (has('counterstrike')) {
          remaining *= .75;
          if (attacker?.hp > 0) {
            const origin = primitives.currentPlayer(api);
            hitEnemy(api, attacker, 34, 7, .8, origin);
            primitives.slash(api, { origin, direction:primitives.directionTo(api, attacker), radius:5.5, angle:1.4, color:0x9edcff, life:.24 });
          }
        }
      }
    }
    return Math.max(0, remaining);
  }

  return {
    players:Object.freeze({
      'A17-SHIELD-WALL':playShieldWall,
      'A18-LIVID':playLivid,
      'A19-PAYBACK-STRIKE':playPaybackStrike,
      'A20-GRAPPLING-CHAIN':playGrapplingChain,
      'A21-TO-THE-DEATH':playToTheDeath,
      'A22-EARTHSHAKING-STRIKE':playEarthshakingStrike,
      'A23-BLOCK-AND-SLASH':playBlockAndSlash,
      'A24-WAR-HORN':playWarHorn,
      'A25-WAR-CRY':playWarCry,
      'A26-WALKING-FORTRESS':playWalkingFortress,
      'A27-LUNGE-AND-SLASH':playLungeAndSlash,
      'A28-COUNTERSTRIKE':playCounterstrike,
      'A29-CHARGING-BULL':playChargingBull,
      'A30-WHIRLWIND':playWhirlwind,
      'A31-DEVOUR':playDevour,
      'A32-RING-OF-PAIN':playRingOfPain,
      'A33-DRAGON-RAGE':playDragonRage,
      'A34-RAMPAGE':playRampage,
      'A35-BLESSED-BLADES':playBlessedBlades,
      'A36-HORN-OF-VALOR':playHornOfValor,
      'A37-LINE-IN-THE-SAND':playLineInTheSand,
      'A38-BODYGUARD':playBodyguard,
    }),
    update,
    reset,
    damageMultiplier,
    onDamageDealt,
    notePlayerDamage,
    hasDefense,
    interceptIncoming,
  };
}
