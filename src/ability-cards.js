import { POW_BUNKER_CARD } from './powbunker-card.js';
import { BLOOD_SLASH_CARD, BING_BONG_CARD } from './combat-modifier-cards.js';

function withRunText(card, extra) {
  return Object.freeze({ ...card, ...extra });
}

export const NON_STANCE_CARDS = Object.freeze([
  withRunText(POW_BUNKER_CARD, {
    icon:'PB',
    description:'Drive the pilebunker forward and detonate its impact field.',
    playEvent:'powbunker:play',
  }),
  withRunText(BLOOD_SLASH_CARD, {
    icon:'BS',
    description:'Gain three Blood Slash charges. Horizontal attacks spend them to widen the strike and store movement bleed.',
    playEvent:'bloodslash:play',
  }),
]);

export const EXTRA_STANCE_CARDS = Object.freeze([BING_BONG_CARD]);
export const ABILITY_CARDS = NON_STANCE_CARDS;
