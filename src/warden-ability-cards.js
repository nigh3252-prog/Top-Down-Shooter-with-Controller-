import { POW_BUNKER_CARD } from './powbunker-card.js';

const previewChain = Object.freeze(['vertical5', 'horizontal5', 'stab2']);

function ability(id, name, short, cost, cooldown, description, effect = {}) {
  return Object.freeze({
    id,
    type:'ability',
    name,
    short,
    cost,
    cooldown,
    description,
    effect:Object.freeze({ ...effect }),
    chain:previewChain,
  });
}

export const WARDEN_ABILITY_CARDS = Object.freeze([
  // Initial validation batch.
  ability('A10-COMBAT-ROLL', 'COMBAT ROLL', 'ROLL', 20, 2, 'Dodge in the movement direction and briefly become invulnerable.', { travel:5.5 }),
  ability('A11-CHALLENGE', 'CHALLENGE', 'TAUNT', 20, 4, 'Taunt an enemy in the broad area ahead and gain Guard.', { range:14, angle:2.35 }),
  ability('A12-SHIELD-BASH', 'SHIELD BASH', 'BASH', 35, 8, 'Surge forward through a broad bash area. Impact detonator.', { range:9, width:3.4, travel:3.8 }),
  ability('A13-POMMEL-STRIKE', 'POMMEL STRIKE', 'STUN', 35, 20, 'Step in with a compact strike that formally stuns and primes one enemy.', { range:8, angle:1.45, travel:2.2 }),
  ability('A14-MIGHTY-BLOW', 'MIGHTY BLOW', 'SMASH', 50, 16, 'Leap into a heavy ground impact. Impact detonator.', { range:10, radius:5.2, travel:3.2 }),
  ability('A15-WRATH-OF-HEAVEN', 'WRATH OF HEAVEN', 'WRATH', 65, 24, 'Stun and prime every enemy in a large circle around Warden.', { radius:11.5 }),
  ability('A16-SPELL-PURGE', 'SPELL PURGE', 'PURGE', 35, 24, 'Purge a large circle and detonate formally primed enemies.', { radius:11.5 }),

  // Remaining unique warrior actives.
  ability('A17-SHIELD-WALL', 'SHIELD WALL', 'WALL', 10, 8, 'Brace behind a temporary frontal defense that reduces incoming damage and builds Guard.', { duration:4.5 }),
  ability('A18-LIVID', 'LIVID', 'LIVID', 35, 32, 'Gain Guard, damage, and damage reduction for every nearby enemy.', { radius:10, duration:9 }),
  ability('A19-PAYBACK-STRIKE', 'PAYBACK STRIKE', 'PAYBK', 35, 8, 'Retaliatory sweep that becomes stronger and stuns after Warden has been hit.', { range:7.5, angle:2.1 }),
  ability('A20-GRAPPLING-CHAIN', 'GRAPPLING CHAIN', 'CHAIN', 20, 12, 'Hook one enemy in front and drag it into close range.', { range:15 }),
  ability('A21-TO-THE-DEATH', 'TO THE DEATH', 'DUEL', 35, 32, 'Mark one enemy for a duel; repeated hits against it escalate damage.', { range:15, duration:10 }),
  ability('A22-EARTHSHAKING-STRIKE', 'EARTHSHAKING STRIKE', 'QUAKE', 50, 20, 'Send a long ground shockwave forward and leave a damaging fissure.', { range:14, width:3.2, duration:6 }),
  ability('A23-BLOCK-AND-SLASH', 'BLOCK AND SLASH', 'CNTR', 10, 8, 'Prepare a counter that blocks the next hit and answers with a sweeping slash.', { duration:5 }),
  ability('A24-WAR-HORN', 'WAR HORN', 'FEAR', 35, 24, 'Blast nearby enemies backward in fear and tear down their Guard-like protection.', { radius:11 }),
  ability('A25-WAR-CRY', 'WAR CRY', 'CRY', 20, 24, 'Taunt every nearby enemy and gain Guard for each one affected.', { radius:11 }),
  ability('A26-WALKING-FORTRESS', 'WALKING FORTRESS', 'FORT', 60, 32, 'Become invulnerable for a short duration.', { duration:4 }),
  ability('A27-LUNGE-AND-SLASH', 'LUNGE AND SLASH', 'LUNGE', 35, 8, 'Dash through a long lane and slash every enemy crossed. Impact detonator.', { range:13, width:2.8, travel:8 }),
  ability('A28-COUNTERSTRIKE', 'COUNTERSTRIKE', 'RIPOST', 65, 32, 'Fill Guard, taunt the room, and automatically counter incoming melee attacks.', { radius:11, duration:7 }),
  ability('A29-CHARGING-BULL', 'CHARGING BULL', 'BULL', 35, 8, 'Charge through a broad lane, damaging and knocking down enemies.', { range:14, width:3.8, travel:9 }),
  ability('A30-WHIRLWIND', 'WHIRLWIND', 'SPIN', 35, 12, 'Spin through repeated circular slashes around Warden.', { radius:7.5, pulses:4 }),
  ability('A31-DEVOUR', 'DEVOUR', 'DEVOUR', 35, 8, 'Rip into enemies ahead and restore more health when Warden is badly hurt.', { range:7, angle:1.4 }),
  ability('A32-RING-OF-PAIN', 'RING OF PAIN', 'PAIN', 25, 20, 'Create a moving pain zone around Warden that damages nearby enemies.', { radius:8.5, duration:8 }),
  ability('A33-DRAGON-RAGE', 'DRAGON-RAGE', 'CLAW', 10, 2, 'Spend health on a violent spectral claw sweep that grows stronger while hurt.', { range:7.5, angle:1.8 }),
  ability('A34-RAMPAGE', 'RAMPAGE', 'RAMP', 65, 30, 'Enter a damage-and-life-steal frenzy for an extended duration.', { duration:10 }),
  ability('A35-BLESSED-BLADES', 'BLESSED BLADES', 'BLESS', 10, 24, 'Empower Warden’s attacks with a sustained damage bonus.', { duration:12 }),
  ability('A36-HORN-OF-VALOR', 'HORN OF VALOR', 'VALOR', 35, 18, 'Gain a sustained damage and armor bonus.', { duration:10 }),
  ability('A37-LINE-IN-THE-SAND', 'LINE IN THE SAND', 'LINE', 35, 20, 'Create a temporary boundary ahead that repeatedly drives enemies back.', { range:8, width:7, duration:10 }),
  ability('A38-BODYGUARD', 'BODYGUARD', 'GUARD', 35, 24, 'Assume a protective stance; in solo testing it grants Guard and damage reduction.', { duration:12 }),

  Object.freeze({
    ...POW_BUNKER_CARD,
    short:'PILE',
    cost:55,
    cooldown:14,
    effect:Object.freeze({}),
    description:'Existing Pilebunker ability using shared D-Stamina and cooldown-slot rules.',
  }),
]);
