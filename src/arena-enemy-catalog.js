import { ALL_ENEMIES_BUDGET_OPTION, WORKING_ROSTER_HADES_OPTION } from './encounter-pools.js';
import { FLARE_LEVEL_1_POOL_ID } from './flare-enemies.js';
import { HADES_TARTARUS_POOL_ID } from './hades-enemies.js';
import {
  ARENA_ENEMY_FAMILIES,
  ARENA_ENEMY_REGISTRY,
  listArenaEnemies,
  requireArenaEnemy,
} from './arena-enemy-content-registry.js';

export { ARENA_ENEMY_FAMILIES } from './arena-enemy-content-registry.js';

function catalogEntry(record) {
  return Object.freeze({
    id: record.id,
    spawnKind: record.spawnKind,
    label: record.label,
    family: record.family,
    system: record.system,
    runtimeAdapter: record.runtimeAdapter,
    role: record.role,
    tags: record.tags,
    avoidTags: record.avoidTags,
    encounterCost: record.encounter.encounterCost,
    activeWeight: record.encounter.activeWeight,
    maxCount: record.encounter.maxCount,
    needsPartner: record.encounter.needsPartner,
    introductionDepth: record.encounter.introductionDepth,
    arenaStatus: record.arenaStatus,
    stats: record.stats,
    combatStats: record.combatStats,
    attackIds: record.attackIds,
    attacks: record.attacks,
    presentation: record.presentation,
  });
}

export const ARENA_ENEMY_CATALOG = Object.freeze(
  ARENA_ENEMY_REGISTRY.map(catalogEntry),
);

const catalogById = new Map(
  ARENA_ENEMY_CATALOG.flatMap(enemy => [[enemy.id, enemy], [enemy.spawnKind, enemy]]),
);

export function getArenaEnemyCatalogEntry(value) {
  return catalogById.get(String(value ?? '')) || null;
}

function encounterGroup({ id, spawnKind, label = null }) {
  const record = requireArenaEnemy(spawnKind);
  const encounter = record.encounter;
  const group = {
    id,
    label: label || record.label,
    system: record.system,
    spawnKind: record.spawnKind,
    introductionDepth: encounter.introductionDepth,
    encounterCost: encounter.encounterCost,
    activeWeight: encounter.activeWeight,
    maxCount: encounter.maxCount,
    tags: Object.freeze([...encounter.tags]),
  };
  if (encounter.needsPartner) group.needsPartner = true;
  if (encounter.avoidTags.length) group.avoidTags = Object.freeze([...encounter.avoidTags]);
  return Object.freeze(group);
}

const goblinWarband = Object.freeze({
  id: 'goblinWarband',
  label: 'Goblin Warband',
  system: 'original',
  spawnKind: 'goblins',
  introductionDepth: 1,
  encounterCost: 5,
  activeWeight: 1,
  maxCount: 10,
  tags: Object.freeze(['frontline', 'mobile']),
});

export const COMBINED_ENCOUNTER_GROUPS = Object.freeze([
  goblinWarband,

  encounterGroup({ id: 'fusionSpider', spawnKind: 'spid' }),
  encounterGroup({ id: 'fusionSunSerpent', spawnKind: 'sun' }),
  encounterGroup({ id: 'fusionLion', spawnKind: 'lion' }),
  encounterGroup({ id: 'fusionToothy', spawnKind: 'tooth' }),
  encounterGroup({ id: 'fusionGrabber', spawnKind: 'grab' }),
  encounterGroup({ id: 'fusionAntelope', spawnKind: 'ant' }),
  encounterGroup({ id: 'fusionCroc', spawnKind: 'croc' }),
  encounterGroup({ id: 'fusionPhoenix', spawnKind: 'phx' }),
  encounterGroup({ id: 'fusionStilt', spawnKind: 'stilt' }),
  encounterGroup({ id: 'fusionMother', spawnKind: 'mother' }),

  encounterGroup({ id: 'flareScamp', spawnKind: 'flareGoblinScamp' }),
  encounterGroup({ id: 'flareSkeleton', spawnKind: 'flareCrackedSkeleton' }),
  encounterGroup({ id: 'flareCursedZombie', spawnKind: 'flareCursedZombie' }),
  encounterGroup({ id: 'flareRunner', spawnKind: 'flareGoblinRunner' }),
  encounterGroup({ id: 'flareRottingZombie', spawnKind: 'flareRottingZombie' }),

  encounterGroup({ id: 'hadesNumbskull', spawnKind: 'hadesNumbskull' }),
  encounterGroup({ id: 'hadesWitch', spawnKind: 'hadesWretchedWitch' }),
  encounterGroup({ id: 'hadesThug', spawnKind: 'hadesWretchedThug' }),
  encounterGroup({ id: 'hadesPest', spawnKind: 'hadesWretchedPest' }),
  encounterGroup({ id: 'hadesLout', spawnKind: 'hadesWretchedLout' }),
  encounterGroup({ id: 'hadesBrimstone', spawnKind: 'hadesBrimstone' }),
  encounterGroup({ id: 'hadesSkullomat', spawnKind: 'hadesSkullomat' }),
  encounterGroup({ id: 'hadesWringer', spawnKind: 'hadesWringer' }),
]);

const option = (id, label) => Object.freeze({ id, label });

// Compatibility options for the Combat Arena selector. Family modules still
// export their historical option arrays, but live selectors can use this one
// registry-derived view instead.
export const ARENA_ENEMY_OPTIONS = Object.freeze([
  option(ALL_ENEMIES_BUDGET_OPTION.id, ALL_ENEMIES_BUDGET_OPTION.label),
  option(WORKING_ROSTER_HADES_OPTION.id, WORKING_ROSTER_HADES_OPTION.label),
  ...listArenaEnemies({ family: 'FUSION' }).map(enemy => option(enemy.id, enemy.label)),
  option(FLARE_LEVEL_1_POOL_ID, 'FLARE · Level 1 Mix'),
  ...listArenaEnemies({ family: 'FLARE' }).map(enemy => option(enemy.id, `FLARE · ${enemy.label}`)),
  option(HADES_TARTARUS_POOL_ID, 'HADES · Tartarus Mix'),
  ...listArenaEnemies({ family: 'HADES' }).map(enemy => option(enemy.id, `HADES · ${enemy.label}`)),
]);
