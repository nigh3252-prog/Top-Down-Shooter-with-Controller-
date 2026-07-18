import { BLOOD_SLASH_CARD, BING_BONG_CARD } from './combat-modifier-cards.js';
import { WARDEN_ABILITY_CARDS } from './warden-ability-cards.js';

function withRunText(card, extra = {}) {
  return Object.freeze({ ...card, ...extra });
}

export const NON_STANCE_CARDS = Object.freeze([
  ...WARDEN_ABILITY_CARDS.map(card => withRunText(card, {
    icon:card.short || card.icon || 'AB',
    description:card.description || 'Warden ability card.',
  })),
  withRunText(BLOOD_SLASH_CARD, {
    icon:'BS',
    description:'Gain three Blood Slash charges. Horizontal attacks spend them to widen the strike and store movement bleed.',
    playEvent:'bloodslash:play',
  }),
]);

export const EXTRA_STANCE_CARDS = Object.freeze([BING_BONG_CARD]);
export const ABILITY_CARDS = NON_STANCE_CARDS;
