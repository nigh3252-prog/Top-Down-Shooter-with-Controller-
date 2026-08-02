import { listCards } from './card-registry.js';

// Compatibility views for run-draft and profile callers. The card registry owns
// the definitions; these arrays intentionally contain no alternate copies.
export const NON_STANCE_CARDS = listCards({family:'non-stance'});
export const EXTRA_STANCE_CARDS = listCards({family:'special-stance'});
export const ABILITY_CARDS = NON_STANCE_CARDS;
