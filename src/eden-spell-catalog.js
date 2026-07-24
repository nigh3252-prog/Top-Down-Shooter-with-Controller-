// Eden-inspired spell definitions shared by Enemy Lab and arena adapters.
const freeze = value => Object.freeze(value);

function spell(id, name, brand, mana, description, effects, targeting, extra = {}) {
  return freeze({
    id,
    type:'spell',
    name,
    brand,
    mana,
    description,
    effects:freeze(effects.map(effect => freeze({ ...effect }))),
    targeting:freeze({ ...targeting }),
    ...extra,
  });
}

const INSTANT = freeze({ kind:'instant' });
const DIRECTIONAL = freeze({ kind:'directional', channel:.18, range:14, moveScale:0, assistStrength:.35, maxCorrectionDegrees:12 });
const GROUND = freeze({ kind:'ground', channel:.22, range:13, moveScale:0 });

export const EDEN_SPELLS = freeze([
  spell('ANIMA-FROSTBOLT', 'Frostbolt', 'Anima', 1, 'Hold to aim, then fire a 40-damage projectile and apply 1 Frost.', [
    { type:'projectile', damage:40, speed:20, radius:.28, color:0x9cecff, onHit:[{ type:'status', status:'frost', stacks:1 }] },
  ], DIRECTIONAL),
  spell('ANIMA-COLD-SNAP', 'Cold Snap', 'Anima', 1, 'Instantly apply 1 Frost to every enemy.', [
    { type:'allEnemies', effects:[{ type:'status', status:'frost', stacks:1 }] },
  ], INSTANT),
  spell('ANIMA-THUNDER', 'Thunder', 'Anima', 1, 'Hold to place a ground marker, then strike it for 100 damage.', [
    { type:'latticeStrike', forward:4, lateral:0, damage:100, radius:1.2, color:0xfff19b, useTargetPoint:true },
  ], { ...GROUND, preview:'single', defaultDistance:7.2 }),
  spell('ANIMA-FIREWALL', 'Firewall', 'Anima', 2, 'Hold to place a perpendicular line of persistent Flames.', [
    { type:'groundPattern', pattern:'column', forward:4, halfWidth:2, ground:'flame', duration:6 },
  ], { ...GROUND, preview:'column', defaultDistance:7.2 }),
  spell('ANIMA-RING-OF-FIRE', 'Ring of Fire', 'Anima', 3, 'Hold to place a ring of persistent Flames.', [
    { type:'groundPattern', pattern:'ring', forward:4, ground:'flame', duration:6 },
  ], { ...GROUND, preview:'ring', defaultDistance:7.2 }),
  spell('ANIMA-MELTDOWN', 'Meltdown', 'Anima', 1, 'Instantly hit every Frosted enemy for 60 and create a Flame beneath it.', [
    { type:'forEachEnemy', condition:{ status:'frost', minimumStacks:1 }, effects:[{ type:'damage', amount:60 }, { type:'groundAtTarget', ground:'flame', duration:6 }] },
  ], INSTANT),
  spell('CONVERGENCE-FOCUS', 'Focus', 'Convergence', 1, 'Instantly gain 2 Spell Power for the encounter.', [
    { type:'modifyResource', resource:'spellPower', amount:2 },
  ], INSTANT),
  spell('CONVERGENCE-MANA-FUSION', 'Mana Fusion', 'Convergence', 2, 'Instantly restore 5 mana after paying the spell cost.', [
    { type:'modifyResource', resource:'mana', amount:5 },
  ], INSTANT),
  spell('CONVERGENCE-TRI-FORCE', 'Tri Force', 'Convergence', 0, 'Instantly gain 1 Trinity. Completing Trinity grants 3 Spell Power.', [
    { type:'gainTrinity', amount:1, onComplete:[{ type:'modifyResource', resource:'spellPower', amount:3 }] },
  ], INSTANT),
  spell('CONVERGENCE-LIMIT-BREAK', 'Limit Break', 'Convergence', 'max', 'Hold to aim a planted 40-shot barrage. Spell Power applies to every hit.', [
    { type:'rapidProjectiles', count:40, interval:.025, damage:10, speed:24, radius:.17, color:0xe8c9ff },
    { type:'temporaryResourcePenalty', resource:'maxMana', amount:1, duration:20 },
  ], { ...DIRECTIONAL, channel:.35, range:17, assistStrength:.28, maxCorrectionDegrees:10 }),
]);

export const EDEN_SPELL_BY_ID = freeze(Object.fromEntries(EDEN_SPELLS.map(card => [card.id, card])));
// Compatibility aliases for the original standalone prototype names.
export const EDEN_LAB_SPELLS = EDEN_SPELLS;
export const EDEN_LAB_SPELL_BY_ID = EDEN_SPELL_BY_ID;

export function spellManaCost(card, state) {
  if (!card) return Infinity;
  if (card.mana === 'max') return Math.max(0, Number(state?.maxMana) || 0);
  return Math.max(0, Number(card.mana) || 0);
}
