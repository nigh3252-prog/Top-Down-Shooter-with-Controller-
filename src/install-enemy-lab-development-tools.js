import { ARENA_ENEMY_CATALOG, ARENA_ENEMY_FAMILIES } from './arena-enemy-catalog.js';
import { installEnemyLabCombatProfiles } from './enemy-lab-combat-profiles.js';
import { installEnemyLabStanceCompatibility } from './enemy-lab-stance-compatibility.js';
import { installEnemyLabWorkingAbilityPool } from './enemy-lab-working-ability-pool.js';
import { installEnemyLabWorkingRoster } from './enemy-lab-working-roster.js';

export function installEnemyLabDevelopmentTools({runtime=null,document=globalThis.document,window=globalThis}={}) {
  const workingRoster=installEnemyLabWorkingRoster({catalog:ARENA_ENEMY_CATALOG,families:ARENA_ENEMY_FAMILIES,runtime,document});
  const workingAbilityPool=installEnemyLabWorkingAbilityPool({hostWindow:window});
  const combatProfiles=installEnemyLabCombatProfiles({hostWindow:window});
  const stanceCompatibility=installEnemyLabStanceCompatibility({runtime,document});
  return Object.freeze({workingRoster,workingAbilityPool,combatProfiles,stanceCompatibility});
}
