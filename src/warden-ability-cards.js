import { POW_BUNKER_CARD } from './powbunker-card.js';

const previewChain = Object.freeze(['vertical5', 'horizontal5', 'stab2']);

function ability(id, name, short, cost, cooldown, description) {
  return Object.freeze({
    id,
    type: 'ability',
    name,
    short,
    cost,
    cooldown,
    description,
    chain: previewChain,
  });
}

export const WARDEN_ABILITY_CARDS = Object.freeze([
  ability('A10-COMBAT-ROLL', 'COMBAT ROLL', 'ROLL', 20, 2, 'Dodge in the movement direction and briefly become invulnerable.'),
  ability('A11-CHALLENGE', 'CHALLENGE', 'TAUNT', 20, 4, 'Taunt the nearest enemy and gain Guard.'),
  ability('A12-SHIELD-BASH', 'SHIELD BASH', 'BASH', 35, 8, 'Lunge into the nearest enemy. Impact detonator.'),
  ability('A13-POMMEL-STRIKE', 'POMMEL STRIKE', 'STUN', 35, 20, 'Strike and formally stun the nearest enemy, priming it for a combo.'),
  ability('A14-MIGHTY-BLOW', 'MIGHTY BLOW', 'SMASH', 50, 16, 'Deliver a heavy knockdown strike. Impact detonator.'),
  ability('A15-WRATH-OF-HEAVEN', 'WRATH OF HEAVEN', 'WRATH', 65, 24, 'Stun and prime every nearby enemy.'),
  ability('A16-SPELL-PURGE', 'SPELL PURGE', 'PURGE', 35, 24, 'Dispel the area and detonate formally primed enemies.'),
  Object.freeze({
    ...POW_BUNKER_CARD,
    short: 'PILE',
    cost: 55,
    cooldown: 14,
    description: 'Existing Pilebunker ability, now using the shared Ability Stamina and cooldown-slot rules.',
  }),
]);
