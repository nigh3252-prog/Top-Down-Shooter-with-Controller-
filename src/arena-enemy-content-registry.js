import {
  ARENA_ENEMY_ARCHETYPES as ORIGINAL_ENEMY_ARCHETYPES,
  ARENA_ENEMY_ATTACKS as ORIGINAL_ENEMY_ATTACKS,
} from './arena-enemies-base.js';
import { FUSION_ARCHETYPES, FUSION_ATTACKS } from './fusion-enemies.js';
import { FLARE_ENEMY_ARCHETYPES, FLARE_ATTACKS } from './flare-enemies.js';
import { HADES_ENEMY_ARCHETYPES, HADES_ATTACKS } from './hades-enemies.js';
import { LUGARU_DUELIST_ARCHETYPE, LUGARU_DUELIST_ID } from './lugaru-duelist.js';

export const ARENA_ENEMY_FAMILIES = Object.freeze(['GOBLINS', 'FUSION', 'FLARE', 'HADES']);
export const ARENA_ENEMY_STATUSES = Object.freeze(['candidate', 'arena', 'lab', 'disabled']);

const STATUS_ALIASES = Object.freeze({
  'lab-only': 'lab',
  'arena-ready': 'arena',
});

const unique = values => [...new Set((values || []).filter(Boolean))];
const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, clone(child)]));
  }
  return value;
}

function deepFreeze(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

export function normalizeArenaEnemyStatus(value, fallback = 'candidate') {
  const requested = String(value ?? '').trim().toLowerCase();
  if (ARENA_ENEMY_STATUSES.includes(requested)) return requested;
  if (STATUS_ALIASES[requested]) return STATUS_ALIASES[requested];
  return ARENA_ENEMY_STATUSES.includes(fallback) ? fallback : 'candidate';
}

export const normalizeArenaStatus = normalizeArenaEnemyStatus;

const ORIGINAL_METADATA = Object.freeze({
  trialDot: { label:'Trial Dot', role:'trial pursuer', tags:['trial','swarm','pursuer'], encounterCost:2, maxCount:12, introductionDepth:1, arenaStatus:'lab' },
  accordion2d: { label:'Accordion Duelist (2D hybrid)', role:'flanking duelist', tags:['trial','2d','hybrid','mobile'], encounterCost:5, maxCount:12, introductionDepth:1, arenaStatus:'lab' },
  grunt: { label: 'Goblin Grunt', role: 'frontliner', tags: ['frontline'], encounterCost: 5, maxCount: 4, introductionDepth: 1 },
  dagger: { label: 'Goblin Dagger', role: 'flanker', tags: ['mobile', 'close'], encounterCost: 5, maxCount: 4, introductionDepth: 2 },
  mace: { label: 'Goblin Mace', role: 'anchor', tags: ['frontline', 'anchor'], encounterCost: 10, maxCount: 4, introductionDepth: 3 },
  rock: { label: 'Goblin Rock Thrower', role: 'ranged support', tags: ['ranged', 'support'], encounterCost: 6, maxCount: 4, introductionDepth: 2 },
  captain: { label: 'Goblin Captain', role: 'elite anchor', tags: ['frontline', 'anchor', 'elite'], encounterCost: 15, maxCount: 4, introductionDepth: 6 },
  [LUGARU_DUELIST_ID]: {
    label: 'Lugaru Duelist',
    role: LUGARU_DUELIST_ARCHETYPE.role,
    tags: LUGARU_DUELIST_ARCHETYPE.pairingTags,
    encounterCost: LUGARU_DUELIST_ARCHETYPE.encounterCost,
    maxCount: LUGARU_DUELIST_ARCHETYPE.maxActive,
    introductionDepth: 5,
  },
});

const FUSION_LABELS = Object.freeze({
  lion: 'Lion', spid: 'Spider', sun: 'Sun Serpent', grab: 'Grabber', tooth: 'Toothy',
  mother: 'Mother Courage', stilt: 'Stilt', ant: 'Antelope', phx: 'Phoenix', croc: 'Croc',
});

// These are the existing encounter-planner values. They live with the enemy
// records so the catalog and all roster planners cannot drift apart again.
const FUSION_ENCOUNTERS = Object.freeze({
  lion: { introductionDepth: 2, encounterCost: 9, activeWeight: 1.3, maxCount: 6, tags: ['frontline', 'committed'] },
  spid: { introductionDepth: 1, encounterCost: 5, activeWeight: .8, maxCount: 8, tags: ['mobile', 'close'] },
  sun: { introductionDepth: 1, encounterCost: 6, activeWeight: .8, maxCount: 8, tags: ['mobile', 'skirmisher'] },
  grab: { introductionDepth: 3, encounterCost: 9, activeWeight: 1.2, maxCount: 5, tags: ['frontline', 'hard-control'] },
  tooth: { introductionDepth: 2, encounterCost: 10, activeWeight: 1.4, maxCount: 5, tags: ['frontline', 'anchor'] },
  mother: { introductionDepth: 6, encounterCost: 15, activeWeight: 1.9, maxCount: 3, tags: ['anchor', 'hard-control'] },
  stilt: { introductionDepth: 5, encounterCost: 13, activeWeight: 1.7, maxCount: 4, tags: ['anchor', 'ranged-pressure'] },
  ant: { introductionDepth: 3, encounterCost: 10, activeWeight: 1.4, maxCount: 5, tags: ['mobile', 'committed'] },
  phx: { introductionDepth: 4, encounterCost: 11, activeWeight: 1.3, maxCount: 5, tags: ['aerial', 'mobile'] },
  croc: { introductionDepth: 4, encounterCost: 10, activeWeight: 1.2, maxCount: 5, tags: ['ambusher', 'frontline'] },
});

const FLARE_ENCOUNTERS = Object.freeze({
  flareGoblinScamp: { introductionDepth: 1, encounterCost: 6, activeWeight: 1, maxCount: 8, tags: ['frontline'] },
  flareCrackedSkeleton: { introductionDepth: 2, encounterCost: 7, activeWeight: 1, maxCount: 7, tags: ['frontline', 'duelist'] },
  flareCursedZombie: { introductionDepth: 2, encounterCost: 6, activeWeight: 1, maxCount: 8, tags: ['frontline', 'swarm'] },
  flareGoblinRunner: { introductionDepth: 3, encounterCost: 8, activeWeight: 1.2, maxCount: 6, tags: ['mobile', 'committed'] },
  flareRottingZombie: { introductionDepth: 4, encounterCost: 9, activeWeight: 1.2, maxCount: 6, tags: ['frontline', 'anchor'] },
});

const HADES_ENCOUNTERS = Object.freeze({
  hadesNumbskull: { introductionDepth: 1, encounterCost: 3, activeWeight: .5, maxCount: 14, tags: ['swarm', 'pursuer'] },
  hadesWretchedWitch: { introductionDepth: 1, encounterCost: 5, activeWeight: 1, maxCount: 8, tags: ['ranged', 'support'] },
  hadesWretchedThug: { introductionDepth: 2, encounterCost: 10, activeWeight: 1.3, maxCount: 5, tags: ['frontline', 'anchor'] },
  hadesWretchedPest: { introductionDepth: 3, encounterCost: 8, activeWeight: 1, maxCount: 5, needsPartner: true, tags: ['area-denial', 'support'], avoidTags: ['hard-control'] },
  hadesWretchedLout: { introductionDepth: 4, encounterCost: 15, activeWeight: 1.8, maxCount: 3, tags: ['frontline', 'anchor'] },
  hadesBrimstone: { introductionDepth: 4, encounterCost: 8, activeWeight: 1, maxCount: 5, tags: ['ranged', 'area-denial'] },
  hadesSkullomat: { introductionDepth: 5, encounterCost: 18, activeWeight: 2, maxCount: 1, tags: ['anchor', 'summoner'] },
  hadesWringer: { introductionDepth: 6, encounterCost: 11, activeWeight: 1.2, maxCount: 3, tags: ['hard-control', 'frontline'], avoidTags: ['area-denial'] },
});

function presentationFor(source, label, family, system) {
  const keys = [
    'color', 'secondaryColor', 'bellyColor', 'armorColor', 'accentColor', 'weapon',
    'poseScale', 'visualScale', 'targetScale', 'collisionScale', 'separationScale',
    'attackOriginForward', 'headCollisionRadius', 'isElite', 'thrower', 'flying',
    'rarity', 'cursed', 'rotting', 'statusImmunities', 'fusion',
  ];
  const presentation = { label, family, system };
  for (const key of keys) if (source[key] !== undefined) presentation[key] = clone(source[key]);
  return deepFreeze(presentation);
}

function attackRecords(attackLibrary, attackIds) {
  const ids = unique(attackIds);
  return deepFreeze(ids.map(id => {
    const definition = attackLibrary?.[id];
    return definition ? { id, ...clone(definition) } : null;
  }).filter(Boolean));
}

function enemyRecord({
  id,
  label,
  family,
  system,
  source,
  role,
  tags,
  encounter,
  arenaStatus,
  attackLibrary,
  attackIds,
}) {
  const stats = deepFreeze(clone(source || {}));
  const encounterTags = unique(encounter?.tags ?? tags);
  const avoidTags = unique(encounter?.avoidTags ?? source?.avoidPairTags);
  const normalizedEncounter = deepFreeze({
    encounterCost: finite(encounter?.encounterCost, 8),
    activeWeight: finite(encounter?.activeWeight, 1),
    maxCount: Math.max(1, Math.round(finite(encounter?.maxCount ?? source?.maxActive, 8))),
    introductionDepth: Math.max(1, Math.round(finite(encounter?.introductionDepth, 1))),
    needsPartner: !!(encounter?.needsPartner ?? source?.needsPartner),
    tags: deepFreeze(encounterTags),
    avoidTags: deepFreeze(avoidTags),
  });
  const sourceTags = unique(tags ?? source?.pairingTags ?? source?.categories);
  const attackIdList = unique(attackIds);
  const record = {
    id: String(id),
    spawnKind: String(id),
    label: String(label || source?.label || id),
    family,
    system,
    runtimeAdapter: system,
    role: String(role || source?.role || 'enemy'),
    arenaStatus: normalizeArenaEnemyStatus(arenaStatus),
    tags: deepFreeze(sourceTags),
    avoidTags: deepFreeze(unique(source?.avoidPairTags)),
    stats,
    combatStats: stats,
    attackIds: deepFreeze(attackIdList),
    attacks: attackRecords(attackLibrary, attackIdList),
    presentation: presentationFor(source || {}, String(label || source?.label || id), family, system),
    encounter: normalizedEncounter,
    encounterCost: normalizedEncounter.encounterCost,
    activeWeight: normalizedEncounter.activeWeight,
    maxCount: normalizedEncounter.maxCount,
    needsPartner: normalizedEncounter.needsPartner,
    introductionDepth: normalizedEncounter.introductionDepth,
    encounterTags: normalizedEncounter.tags,
  };
  return deepFreeze(record);
}

const originalRecords = Object.entries(ORIGINAL_METADATA).map(([id, metadata]) => {
  const source = id === LUGARU_DUELIST_ID ? LUGARU_DUELIST_ARCHETYPE : ORIGINAL_ENEMY_ARCHETYPES[id];
  return enemyRecord({
    id,
    label: metadata.label,
    family: 'GOBLINS',
    system: 'original',
    source,
    role: metadata.role,
    tags: metadata.tags,
    encounter: metadata,
    arenaStatus: metadata.arenaStatus,
    attackLibrary: ORIGINAL_ENEMY_ATTACKS,
    attackIds: source?.attack ? [source.attack] : [],
  });
});

const fusionRecords = Object.entries(FUSION_ARCHETYPES).map(([id, source]) => {
  const encounter = FUSION_ENCOUNTERS[id];
  return enemyRecord({
    id,
    label: FUSION_LABELS[id] || id,
    family: 'FUSION',
    system: 'original',
    source,
    role: source.role,
    tags: source.pairingTags,
    encounter,
    arenaStatus: id === 'lion' ? 'lab-only' : undefined,
    attackLibrary: FUSION_ATTACKS,
    attackIds: source.attack ? [source.attack] : [],
  });
});

const flareRecords = Object.entries(FLARE_ENEMY_ARCHETYPES).map(([id, source]) => {
  const encounter = FLARE_ENCOUNTERS[id];
  return enemyRecord({
    id,
    label: source.label || id,
    family: 'FLARE',
    system: 'flare',
    source,
    role: source.role,
    tags: source.categories,
    encounter,
    attackLibrary: FLARE_ATTACKS,
    attackIds: source.attacks,
  });
});

const hadesRecords = Object.entries(HADES_ENEMY_ARCHETYPES).map(([id, source]) => {
  const encounter = HADES_ENCOUNTERS[id];
  return enemyRecord({
    id,
    label: source.label || id,
    family: 'HADES',
    system: 'hades',
    source,
    role: source.role,
    tags: source.pairingTags,
    encounter,
    attackLibrary: HADES_ATTACKS,
    attackIds: source.attackId ? [source.attackId] : [],
  });
});

const allRecords = [...originalRecords, ...fusionRecords, ...flareRecords, ...hadesRecords];
const ids = allRecords.map(record => record.id);
const spawnKinds = allRecords.map(record => record.spawnKind);
if (new Set(ids).size !== ids.length || new Set(spawnKinds).size !== spawnKinds.length) {
  throw new Error('[arena-enemy-registry] Enemy ids and spawn kinds must be unique.');
}

export const ARENA_ENEMY_REGISTRY = deepFreeze(allRecords);
export const ARENA_ENEMY_IDS = Object.freeze(ARENA_ENEMY_REGISTRY.map(record => record.id));

const byId = new Map(ARENA_ENEMY_REGISTRY.map(record => [record.id, record]));
const bySpawnKind = new Map(ARENA_ENEMY_REGISTRY.map(record => [record.spawnKind, record]));

export function getArenaEnemy(value) {
  const key = String(value ?? '');
  return byId.get(key) || bySpawnKind.get(key) || null;
}

export function getArenaEnemyBySpawnKind(value) {
  return bySpawnKind.get(String(value ?? '')) || null;
}

export function requireArenaEnemy(value) {
  const record = getArenaEnemy(value);
  if (!record) throw new Error(`[arena-enemy-registry] Unknown enemy: ${String(value ?? '')}`);
  return record;
}

export function listArenaEnemies({ family = null, system = null, runtimeAdapter = null, arenaStatus = null } = {}) {
  if (!family && !system && !runtimeAdapter && !arenaStatus) return ARENA_ENEMY_REGISTRY;
  return Object.freeze(ARENA_ENEMY_REGISTRY.filter(record =>
    (!family || record.family === family) &&
    (!system || record.system === system) &&
    (!runtimeAdapter || record.runtimeAdapter === runtimeAdapter) &&
    (!arenaStatus || record.arenaStatus === normalizeArenaEnemyStatus(arenaStatus))
  ));
}

// Short aliases keep the registry convenient for small consumers while the
// arena-prefixed names make the public compatibility surface explicit.
export const getEnemy = getArenaEnemy;
export const requireEnemy = requireArenaEnemy;
export const listEnemies = listArenaEnemies;
