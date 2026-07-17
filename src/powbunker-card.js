// Shared metadata for the first deck-driven Pilebunker ability prototype.
export const POW_BUNKER_CARD = Object.freeze({
  id: 'A01-PILEBUNKER',
  type: 'ability',
  name: 'PILEBUNKER',
  icon: 'PB',
  description: 'Drive the pilebunker forward and detonate its impact field.',
  playEvent: 'powbunker:play',
  canPlayGlobal: '__POWBUNKER_CAN_PLAY__',
  // The current arena card renderer expects three move keys. These only provide
  // preview glyphs; playing this card starts the dedicated ability controller.
  chain: Object.freeze(['vertical16', 'horizontal5', 'stab6']),
});
