// Fully local retained/original enemy roster.
// The previous wrapper imported a pinned jsDelivr snapshot, which made the real
// attack loop difficult to reason about and patch safely. This entrypoint uses the
// checked-in base implementation, preserves Pilebunker rigid bodies, and installs
// the explicit attack coordinator after the router's pressure-lab adapters finish.

import {
  ARENA_ENEMY_ARCHETYPES,
  createArenaEnemySystem as createBaseArenaEnemySystem,
} from './arena-enemies-base.js';
import { installRigidGoblinBodies } from './rigid-goblin-bodies.js';
import { installOriginalEnemyCombatRefactor } from './original-enemy-combat-refactor.js';
import { scheduleAggressionPresetControls } from './aggression-preset-controls.js';

export { ARENA_ENEMY_ARCHETYPES };

export function createArenaEnemySystem(options={}){
  const system=createBaseArenaEnemySystem(options);
  installRigidGoblinBodies(system,options);

  const installCombatBrain=()=>installOriginalEnemyCombatRefactor(system,options);
  system.installOriginalCombatRefactor=installCombatBrain;
  // createArenaEnemySystem is called while arena-enemies.js is still building and
  // will synchronously install the general pressure lab afterward. A microtask runs
  // before the first animation frame, making this coordinator the final authority.
  if(typeof queueMicrotask==='function') queueMicrotask(installCombatBrain);
  else Promise.resolve().then(installCombatBrain);

  // The Combat Arena builds its base SIM sliders later in the same module turn.
  // Install the preset UI after those and the pressure-lab sliders both exist.
  scheduleAggressionPresetControls();
  return system;
}
