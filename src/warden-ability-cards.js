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
    chain:previewChain,
    effect:Object.freeze(effect),
  });
}

export const WARDEN_ABILITY_CARDS = Object.freeze([
  ability('A10-COMBAT-ROLL', 'COMBAT ROLL', 'ROLL', 20, 2,
    'Slide through danger with brief invulnerability.',
    { motion:'roll', travel:5.5, range:5.5, expectedTargets:0 }),
  ability('A11-CHALLENGE', 'CHALLENGE', 'TAUNT', 20, 4,
    'Challenge one enemy in the broad area ahead and gain Guard.',
    { motion:'brace', range:14, angle:2.35, expectedTargets:1 }),
  ability('A12-SHIELD-BASH', 'SHIELD BASH', 'BASH', 35, 8,
    'Surge into a broad forward group. The primary hit is an Impact detonator.',
    { motion:'bash', range:9, width:3.4, travel:3.8, expectedTargets:2 }),
  ability('A13-POMMEL-STRIKE', 'POMMEL STRIKE', 'STUN', 35, 20,
    'Snap forward and stun one enemy in front, priming it for a combo.',
    { motion:'jab', range:8, angle:1.45, travel:2.2, expectedTargets:1 }),
  ability('A14-MIGHTY-BLOW', 'MIGHTY BLOW', 'SMASH', 50, 16,
    'Leap into a heavy chop and smash a wide landing area. Impact detonator.',
    { motion:'slam', range:10, travel:3.2, radius:5.2, expectedTargets:4 }),
  ability('A15-WRATH-OF-HEAVEN', 'WRATH OF HEAVEN', 'WRATH', 65, 24,
    'Plant and erupt a large stunning circle around Warden.',
    { motion:'cast', radius:11.5, expectedTargets:8 }),
  ability('A16-SPELL-PURGE', 'SPELL PURGE', 'PURGE', 35, 24,
    'Send a large cleansing ring outward and detonate primed enemies.',
    { motion:'purge', radius:11.5, expectedTargets:8 }),
  Object.freeze({
    ...POW_BUNKER_CARD,
    short:'PILE',
    cost:55,
    cooldown:14,
    description:'Existing Pilebunker ability using the shared D-Stamina and cooldown-slot rules.',
    effect:Object.freeze({ motion:'pilebunker', range:14, expectedTargets:5 }),
  }),
]);
