// Compatibility adapter retained for the branch-local player-combat wrapper.
// Movement Bleed, its visuals, and its update loop now belong to the centralized
// combat effect runtime in combat-card-effects.js.
export{
  MOVEMENT_BLEED,
  createBleedPool,
  stackBleed,
  releaseBleedByMovement,
  advanceBleed,
}from'./combat-card-effects.js';

export function installBloodSlashStatusV2({cardEffects}={}){
  return{
    state:cardEffects?.state||{},
    entries:cardEffects?.state?.bleeds||new Map(),
    reset(){},
    update(){},
  };
}
