// Compact deck metadata for temporary combat modifiers. Rules live in
// combat-card-effects.js; cards only need enough identity for the two-slot HUD.
export const BLOOD_SLASH_CARD = Object.freeze({
  id:'M01-BLOOD-SLASH',
  type:'modifier',
  effectId:'bloodSlash',
  name:'BLOOD SLASH',
  // Preview-only horizontal glyphs. Playing the card preserves the active stance.
  chain:Object.freeze(['horizontal6','horizontal4','horizontal5']),
});

export const BING_BONG_CARD = Object.freeze({
  id:'S31-BING-BONG',
  type:'stance',
  effectId:'bingBong',
  name:'S31 BING BONG',
  // Copies Anvil Step's vertical, vertical, horizontal attack pattern without
  // replacing or modifying the original Anvil Step stance card.
  chain:Object.freeze(['vertical8','vertical10','horizontal5']),
  guardId:'vomTagLeft',
  preferredWeapons:Object.freeze(['longsword','dagger','rapier','katana','mace','spear','battleaxe','warhammer','claymore','greatsword']),
  styleTags:Object.freeze(['concussion','vertical','horizontal','stun']),
});
