// Pure runtime configuration resolution. Pages pass their URL facts in so
// runtime mode never has to inspect a parent window or a live DOM.

export const ARENA_RUNTIME_MODES = Object.freeze({
  ARENA:'arena',
  ENEMY_LAB:'enemy-lab',
});

export const ARENA_STORAGE_KEYS = Object.freeze({
  cellSize:'arena.mazeCellSize',
  labCellSize:'enemyLab.mazeCellSize',
  roomSize:'arena.mazeRoomCells',
  settings:'stoneWandererSettings.v1',
  enemyLabSettings:'enemyLab.settings.v3',
});

function text(value){
  return String(value ?? '').trim();
}

function normalizeMode(value){
  const normalized=text(value).toLowerCase();
  return normalized === ARENA_RUNTIME_MODES.ENEMY_LAB || normalized === 'lab'
    ? ARENA_RUNTIME_MODES.ENEMY_LAB
    : ARENA_RUNTIME_MODES.ARENA;
}

function flag(value){
  return ['1','true','yes','on'].includes(text(value).toLowerCase());
}

function pathnameName(pathname){
  const parts=text(pathname).split('/').filter(Boolean);
  return (parts.at(-1) || '').toLowerCase();
}

function readParams(search){
  if(search instanceof URLSearchParams)return new URLSearchParams(search);
  return new URLSearchParams(text(search).replace(/^\?/,'') || '');
}

/**
 * Resolve explicit mode first while retaining the old query/path contracts.
 * No ambient browser objects are read here; this function is intentionally
 * usable from Node tests and from either live page.
 */
export function resolveArenaRuntimeConfig({
  search='',
  pathname='',
  mode,
  seed,
  layout,
  cellSize,
  tune,
  enemyLab,
  defaults = {},
} = {}){
  const params=readParams(search);
  const requestedMode=text(mode || params.get('mode'));
  const hasExplicitMode=!!requestedMode;
  const requestedLayout=text(layout || params.get('layout')).toLowerCase();
  const legacyLab=flag(enemyLab ?? params.get('enemyLab'))
    || pathnameName(pathname) === 'enemy-lab.html'
    || requestedLayout === 'arena' && flag(enemyLab ?? params.get('enemyLab'));
  const resolvedMode=hasExplicitMode
    ? normalizeMode(requestedMode)
    : legacyLab ? ARENA_RUNTIME_MODES.ENEMY_LAB : ARENA_RUNTIME_MODES.ARENA;
  const resolvedLayout=requestedLayout
    || (resolvedMode === ARENA_RUNTIME_MODES.ENEMY_LAB ? 'arena' : 'maze');
  const resolvedSeed=text(seed || params.get('seed'))
    || (resolvedMode === ARENA_RUNTIME_MODES.ENEMY_LAB ? 'enemy-lab-001' : 'arena-001');
  const resolvedCellSize=text(cellSize || params.get('cellSize')).toLowerCase() || null;
  const resolvedTune=flag(tune ?? params.get('tune'));

  return Object.freeze({
    mode:resolvedMode,
    layout:resolvedLayout,
    seed:resolvedSeed,
    cellSize:resolvedCellSize,
    tune:resolvedTune,
    enemyLab:resolvedMode === ARENA_RUNTIME_MODES.ENEMY_LAB,
    query:Object.freeze({
      seed:params.get('seed'),
      layout:params.get('layout'),
      cellSize:params.get('cellSize'),
      tune:params.get('tune'),
      enemyLab:params.get('enemyLab'),
      mode:params.get('mode'),
    }),
    storageKeys:Object.freeze({
      ...ARENA_STORAGE_KEYS,
      ...(defaults.storageKeys || {}),
    }),
  });
}

export function runtimeConfigFromLocation(locationLike={}, overrides={}){
  return resolveArenaRuntimeConfig({
    search:locationLike.search || '',
    pathname:locationLike.pathname || '',
    ...overrides,
  });
}
