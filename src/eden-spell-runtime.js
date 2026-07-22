const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createEdenSpellState(overrides = {}) {
  return {
    mana:3,
    maxMana:3,
    manaRegen:1,
    spellPower:0,
    trinity:0,
    penalties:[],
    ...overrides,
  };
}

export function addFrost(enemy, stacks, damageEnemy = null) {
  if (!enemy || enemy.hp <= 0) return { added:0, bursts:0 };
  enemy.statuses ||= {};
  const added = Math.max(0, Math.floor(Number(stacks) || 0));
  enemy.statuses.frost = Math.max(0, Math.floor(enemy.statuses.frost || 0)) + added;
  let bursts = 0;
  while (enemy.statuses.frost >= 3 && enemy.hp > 0) {
    enemy.statuses.frost -= 3;
    bursts++;
    if (typeof damageEnemy === 'function') damageEnemy(enemy, 150, { status:'frostBurst', ignoreSpellPower:true });
    else enemy.hp = Math.max(0, enemy.hp - 150);
  }
  return { added, bursts };
}

export function createEdenSpellRuntime({
  state = createEdenSpellState(),
  getEnemies = () => [],
  dealDamage = (enemy, amount) => { if(enemy) enemy.hp = Math.max(0, (Number(enemy.hp) || 0) - amount); },
  spawnProjectile = () => {},
  spawnStrike = () => {},
  spawnGround = () => {},
  announce = () => {},
  schedule = (delay, action) => setTimeout(action, delay * 1000),
} = {}) {
  const defaults = { mana:state.mana, maxMana:state.maxMana, manaRegen:state.manaRegen, spellPower:state.spellPower, trinity:state.trinity };

  function costFor(card) {
    return card?.mana === 'max' ? Math.max(0, state.maxMana) : Math.max(0, Number(card?.mana) || 0);
  }

  function damageEnemy(enemy, baseDamage, options = {}) {
    if (!enemy || enemy.hp <= 0) return 0;
    const spellPower = options.ignoreSpellPower ? 0 : Math.max(0, Number(state.spellPower) || 0);
    const dealt = Math.max(0, Number(baseDamage) || 0) + spellPower;
    dealDamage(enemy, dealt, options);
    options.onDamage?.(enemy, dealt);
    return dealt;
  }

  function modifyResource(resource, amount) {
    const delta = Number(amount) || 0;
    if (resource === 'mana') state.mana = clamp(state.mana + delta, 0, state.maxMana);
    else if (resource === 'maxMana') {
      state.maxMana = Math.max(0, state.maxMana + delta);
      state.mana = Math.min(state.mana, state.maxMana);
    } else if (resource === 'spellPower') state.spellPower = Math.max(0, state.spellPower + delta);
  }

  function conditionMatches(enemy, condition = {}) {
    if (!condition.status) return true;
    const value = Number(enemy?.statuses?.[condition.status]) || 0;
    return value >= Math.max(1, Number(condition.minimumStacks) || 1);
  }

  function status(enemy, effect) {
    if (!enemy || enemy.hp <= 0) return;
    if (effect.status === 'frost') addFrost(enemy, effect.stacks, damageEnemy);
    else {
      enemy.statuses ||= {};
      enemy.statuses[effect.status] = Math.max(Number(enemy.statuses[effect.status]) || 0, Number(effect.duration ?? effect.stacks) || 0);
    }
  }

  function applyEffects(effects, context) {
    for (const effect of effects || []) {
      switch (effect.type) {
        case 'projectile':
          spawnProjectile({
            ...effect,
            origin:{ ...context.origin },
            direction:{ ...context.forward },
            onHit:enemy => {
              damageEnemy(enemy, effect.damage);
              applyEffects(effect.onHit, { ...context, target:enemy, targetPoint:{ x:enemy.x, z:enemy.z } });
            },
          });
          break;
        case 'rapidProjectiles':
          for (let index = 0; index < effect.count; index++) {
            schedule(index * effect.interval, () => spawnProjectile({
              ...effect,
              origin:{ ...context.origin },
              direction:{ ...context.forward },
              onHit:enemy => damageEnemy(enemy, effect.damage),
            }));
          }
          break;
        case 'allEnemies':
          for (const enemy of getEnemies().filter(item => item?.hp > 0)) {
            applyEffects(effect.effects, { ...context, target:enemy, targetPoint:{ x:enemy.x, z:enemy.z } });
          }
          break;
        case 'forEachEnemy':
          for (const enemy of getEnemies().filter(item => item?.hp > 0 && conditionMatches(item, effect.condition))) {
            applyEffects(effect.effects, { ...context, target:enemy, targetPoint:{ x:enemy.x, z:enemy.z } });
          }
          break;
        case 'status':
          status(context.target, effect);
          break;
        case 'damage':
          damageEnemy(context.target, effect.amount);
          break;
        case 'latticeStrike': {
          const point = effect.useTargetPoint && context.targetPoint
            ? { ...context.targetPoint }
            : context.toWorld(effect.forward || 0, effect.lateral || 0);
          spawnStrike({ ...effect, point, damageEnemy });
          break;
        }
        case 'groundPattern':
          spawnGround({ ...effect, frame:context, damageEnemy });
          break;
        case 'groundAtTarget':
          if (context.targetPoint) spawnGround({ ...effect, pattern:'single', point:{ ...context.targetPoint }, frame:context, damageEnemy });
          break;
        case 'modifyResource':
          modifyResource(effect.resource, effect.amount);
          break;
        case 'gainTrinity': {
          state.trinity += Math.max(0, Number(effect.amount) || 0);
          if (state.trinity >= 3) {
            state.trinity -= 3;
            applyEffects(effect.onComplete, context);
            announce('TRINITY COMPLETE');
          }
          break;
        }
        case 'temporaryResourcePenalty': {
          modifyResource(effect.resource, -Math.abs(effect.amount));
          state.penalties.push({ resource:effect.resource, amount:Math.abs(effect.amount), remaining:Math.max(0, effect.duration || 0) });
          break;
        }
      }
    }
  }

  function cast(card, frame, { unlimitedMana = false } = {}) {
    const cost = costFor(card);
    if (!card || (!unlimitedMana && state.mana + 1e-6 < cost)) {
      announce('NOT ENOUGH MANA');
      return false;
    }
    if (!unlimitedMana) state.mana = Math.max(0, state.mana - cost);
    applyEffects(card.effects, frame);
    return true;
  }

  function update(dt, { unlimitedMana = false } = {}) {
    const step = Math.max(0, Number(dt) || 0);
    state.mana = unlimitedMana ? state.maxMana : clamp(state.mana + Math.max(0, state.manaRegen) * step, 0, state.maxMana);
    for (let index = state.penalties.length - 1; index >= 0; index--) {
      const penalty = state.penalties[index];
      penalty.remaining -= step;
      if (penalty.remaining > 0) continue;
      modifyResource(penalty.resource, penalty.amount);
      state.penalties.splice(index, 1);
    }
  }

  function reset() {
    state.mana = defaults.maxMana;
    state.maxMana = defaults.maxMana;
    state.manaRegen = defaults.manaRegen;
    state.spellPower = 0;
    state.trinity = 0;
    state.penalties.length = 0;
  }

  return { state, cast, update, reset, damageEnemy, applyEffects, costFor };
}
