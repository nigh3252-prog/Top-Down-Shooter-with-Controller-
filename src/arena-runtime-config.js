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
  theme:'arena.theme',
});

const text=value=>String(value??'').trim();
const flag=value=>['1','true','yes','on'].includes(text(value).toLowerCase());
const readParams=search=>search instanceof URLSearchParams?new URLSearchParams(search):new URLSearchParams(text(search).replace(/^\?/,''));

export function normalizeArenaRuntimeMode(value){
  const requested=text(value).toLowerCase();
  if(['enemy-lab','lab'].includes(requested))return ARENA_RUNTIME_MODES.ENEMY_LAB;
  return ARENA_RUNTIME_MODES.ARENA;
}

export function resolveArenaRuntimeConfig({
  search='', pathname='', mode, variant, seed, layout, cellSize, tune, enemyLab,
  storageKeys=ARENA_STORAGE_KEYS,
}={}){
  const params=readParams(search);
  const explicitMode=text(mode||params.get('mode'));
  const requestedLayout=text(layout||params.get('layout')).toLowerCase();
  const page=text(pathname).split('/').filter(Boolean).at(-1)?.toLowerCase()||'';
  const legacyLab=flag(enemyLab??params.get('enemyLab'))||page==='enemy-lab.html';
  const resolvedMode=explicitMode?normalizeArenaRuntimeMode(explicitMode):(legacyLab?ARENA_RUNTIME_MODES.ENEMY_LAB:ARENA_RUNTIME_MODES.ARENA);
  const requestedVariant=text(variant||params.get('variant')).toLowerCase();
  const wardenTrial=['warden-trial','trial','auto-battler','autobattler'].includes(requestedVariant);
  return Object.freeze({
    mode:resolvedMode,
    variant:wardenTrial?'warden-trial':requestedVariant||null,
    enemyLab:resolvedMode===ARENA_RUNTIME_MODES.ENEMY_LAB,
    wardenTrial,
    layout:wardenTrial?'arena':requestedLayout||(resolvedMode===ARENA_RUNTIME_MODES.ENEMY_LAB?'arena':'maze'),
    seed:text(seed||params.get('seed'))||(wardenTrial?'warden-trial-001':resolvedMode===ARENA_RUNTIME_MODES.ENEMY_LAB?'enemy-lab-001':'arena-001'),
    cellSize:text(cellSize||params.get('cellSize')).toLowerCase()||null,
    tune:flag(tune??params.get('tune')),
    capture:flag(params.get('capture')),
    query:Object.freeze(Object.fromEntries(params)),
    storageKeys:Object.freeze({...ARENA_STORAGE_KEYS,...storageKeys}),
  });
}

export function runtimeConfigFromLocation(locationLike={},overrides={}){
  return resolveArenaRuntimeConfig({search:locationLike.search||'',pathname:locationLike.pathname||'',...overrides});
}
