import './run-draft-compact-styles.js';
import './reward-totem-gate.js';
import { POW_BUNKER_CARD } from './powbunker-card.js';

// The single-character prototype uses one unrestricted non-stance card pool.
// Add new ability/modifier cards here as their branches land; run setup and
// room rewards automatically draw from the complete list.
export const NON_STANCE_CARDS = Object.freeze([
  POW_BUNKER_CARD,
]);

// Compatibility alias for code that still calls these ability cards.
export const ABILITY_CARDS = NON_STANCE_CARDS;
