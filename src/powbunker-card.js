// Shared metadata for the first deck-driven POW Bunker ability prototype.
export const POW_BUNKER_CARD = Object.freeze({
  id: 'A01-POW-BUNKER',
  type: 'ability',
  name: 'POW BUNKER',
  // The current arena card renderer expects three move keys. These only provide
  // preview glyphs; playing this card starts the dedicated ability controller.
  chain: Object.freeze(['vertical16', 'horizontal5', 'stab6']),
});
