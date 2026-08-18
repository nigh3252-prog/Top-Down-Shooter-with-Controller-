import { getStanceClass, getStanceClassPresentation } from './stance-compatibility.js';
import { stanceDefenseLetter } from './stance-defense-profiles.js';

const DEFENSE_LABEL_BY_LETTER = Object.freeze({
  B: 'Block',
  D: 'Dodge',
  P: 'Parry',
});

// One shared presentation contract keeps the normal hand, run rewards, and
// Warden Trial from drifting into different stance / defense abbreviations.
export function getStanceCardBadge(card) {
  if (!card) return null;
  const stance = getStanceClassPresentation(getStanceClass(card));
  const defenseLetter = stanceDefenseLetter(card);
  const defenseLabel = DEFENSE_LABEL_BY_LETTER[defenseLetter] || '';
  if (!stance?.short || !defenseLabel) return null;
  return Object.freeze({
    text: `${stance.short} / ${defenseLetter}`,
    title: `${stance.label} / ${defenseLabel}`,
    stanceLabel: stance.label,
    stanceLetter: stance.short,
    defenseLabel,
    defenseLetter,
  });
}
