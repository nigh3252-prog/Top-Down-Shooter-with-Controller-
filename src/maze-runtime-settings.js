export const MAZE_CELL_SIZE_OPTIONS = Object.freeze([
  Object.freeze({ id:'compact', label:'Compact · 12', value:12 }),
  Object.freeze({ id:'small', label:'Small · 16', value:16 }),
  Object.freeze({ id:'current', label:'Current · 20', value:20 }),
  Object.freeze({ id:'large', label:'Large · 24', value:24 }),
]);

export const MAZE_ROOM_SIZE_OPTIONS = Object.freeze([
  Object.freeze({ id:'current', label:'Current · 4–7', min:4, max:7 }),
  Object.freeze({ id:'medium', label:'Medium · 7–10', min:7, max:10 }),
  Object.freeze({ id:'large', label:'Large · 10–14', min:10, max:14 }),
  Object.freeze({ id:'dense', label:'Dense · 14–18', min:14, max:18 }),
]);

const CELL_SIZE_KEY = 'arena.mazeCellSize';
const LAB_CELL_SIZE_KEY = 'enemyLab.mazeCellSize';
const ROOM_SIZE_KEY = 'arena.mazeRoomCells';
const DEFAULT_CELL_SIZE_ID = 'compact';
const DEFAULT_LAB_CELL_SIZE_ID = 'large';
const DEFAULT_ROOM_SIZE_ID = 'medium';

function storageGet(key){
  try { return globalThis.localStorage?.getItem(key) ?? null; }
  catch { return null; }
}

function storageSet(key, value){
  try { globalThis.localStorage?.setItem(key, value); }
  catch { /* Settings remain session-local when storage is unavailable. */ }
}

function optionById(options, id, fallbackId){
  return options.find(option => option.id === id)
    || options.find(option => option.id === fallbackId)
    || options[0];
}

function isCombatArenaRuntime(runtimeConfig){
  return runtimeConfig?.mode === 'arena';
}
function isEnemyLabRuntime(runtimeConfig){
  return runtimeConfig?.mode === 'enemy-lab';
}

function requestedCellSizeId(runtimeConfig){
  const normalized = String(runtimeConfig?.cellSize || '').trim().toLowerCase();
  return MAZE_CELL_SIZE_OPTIONS.some(option => option.id === normalized) ? normalized : null;
}

function cellSizeStorageKey(runtimeConfig){
  return isEnemyLabRuntime(runtimeConfig) ? LAB_CELL_SIZE_KEY : CELL_SIZE_KEY;
}

function defaultCellSizeId(runtimeConfig){
  return isEnemyLabRuntime(runtimeConfig) ? DEFAULT_LAB_CELL_SIZE_ID : DEFAULT_CELL_SIZE_ID;
}

function selectedCellSize(runtimeConfig){
  const explicit = requestedCellSizeId(runtimeConfig);
  return optionById(
    MAZE_CELL_SIZE_OPTIONS,
    explicit || storageGet(cellSizeStorageKey(runtimeConfig)),
    defaultCellSizeId(runtimeConfig),
  );
}

export function getMazeRuntimeSettings({ runtimeConfig = null } = {}){
  return {
    cellSize:selectedCellSize(runtimeConfig),
    roomSize:optionById(MAZE_ROOM_SIZE_OPTIONS, storageGet(ROOM_SIZE_KEY), DEFAULT_ROOM_SIZE_ID),
  };
}

export function configuredHexSize(requestedHexSize, { runtimeConfig = null } = {}){
  const requested = Number(requestedHexSize);
  if(!Number.isFinite(requested)) return requestedHexSize;
  // The gameplay maze uses large world-unit cells. Lab/debug renderers use tiny
  // values such as 1 or 2.6 and must not inherit the gameplay override.
  if(requested < 10) return requested;
  const stored = storageGet(cellSizeStorageKey(runtimeConfig));
  if(stored === null && !requestedCellSizeId(runtimeConfig) && !isCombatArenaRuntime(runtimeConfig)) return requested;
  return selectedCellSize(runtimeConfig).value;
}

export function configuredRoomSize(defaultMin, defaultMax, presetId = null, { runtimeConfig = null } = {}){
  if(presetId){
    const preset = optionById(MAZE_ROOM_SIZE_OPTIONS, presetId, DEFAULT_ROOM_SIZE_ID);
    return { min:preset.min, max:preset.max, id:preset.id };
  }
  const stored = storageGet(ROOM_SIZE_KEY);
  if(stored === null && !isCombatArenaRuntime(runtimeConfig)){
    return { min:Number(defaultMin), max:Number(defaultMax), id:'custom' };
  }
  const preset = optionById(MAZE_ROOM_SIZE_OPTIONS, stored, DEFAULT_ROOM_SIZE_ID);
  return { min:preset.min, max:preset.max, id:preset.id };
}

function makeSelectRow({ id, label, options, value, document:doc = globalThis.document }){
  const row = doc.createElement('div');
  row.className = 'selectRow mazeSettingRow';
  const title = doc.createElement('label');
  title.htmlFor = id;
  title.textContent = label;
  const select = doc.createElement('select');
  select.id = id;
  for(const option of options){
    const element = doc.createElement('option');
    element.value = option.id;
    element.textContent = option.label;
    select.appendChild(element);
  }
  select.value = value;
  row.append(title, select);
  return { row, select };
}

export function installMazeRuntimeControls({ document:doc = globalThis.document, runtimeConfig = null } = {}){
  if(!doc || doc.getElementById('mazeCellSizeSelect')) return false;
  const simBody = doc.getElementById('body-sim');
  const sliderRoot = doc.getElementById('dirSliders');
  if(!simBody || !sliderRoot) return false;

  const style = doc.createElement('style');
  style.id = 'mazePhonePanelStyle';
  style.textContent = `
    #panel{padding-right:36px!important;scrollbar-width:auto!important}
    #panel::-webkit-scrollbar{width:34px!important}
    #panel::-webkit-scrollbar-track{border-left:2px solid #2c4a47!important}
    #panel::-webkit-scrollbar-thumb{border:7px solid #122426!important;min-height:72px!important;border-radius:16px!important}
    #panel input[type=range]{width:68%!important;margin:8px 0 0 6%!important}
    #panel .srow{padding-right:4px}
    .mazeSettingsGroup{margin:0 0 18px;padding:10px 10px 2px;border:1px solid #24403e;border-radius:7px;background:rgba(18,36,38,.34)}
    .mazeSettingsGroup .ptitle{margin:0 0 9px;color:#e8a04c}
    .mazeSettingRow{margin-bottom:12px}
    .mazeReloadNote{margin:-3px 0 10px;color:#4a6f6a;font-size:8.5px;line-height:1.45;letter-spacing:.04em}
  `;
  doc.head.appendChild(style);

  const settings = getMazeRuntimeSettings({ runtimeConfig });
  const group = doc.createElement('div');
  group.className = 'mazeSettingsGroup';
  const heading = doc.createElement('div');
  heading.className = 'ptitle';
  heading.textContent = 'MAZE GEOMETRY';

  const cell = makeSelectRow({
    id:'mazeCellSizeSelect',
    label:'CELL SIZE',
    options:MAZE_CELL_SIZE_OPTIONS,
    value:settings.cellSize.id,
    document:doc,
  });
  const room = makeSelectRow({
    id:'mazeRoomSizeSelect',
    label:'CELLS PER ROOM',
    options:MAZE_ROOM_SIZE_OPTIONS,
    value:settings.roomSize.id,
    document:doc,
  });
  const note = doc.createElement('div');
  note.className = 'mazeReloadNote';
  note.textContent = isEnemyLabRuntime(runtimeConfig)
    ? 'Enemy Lab uses its own cell-size setting and defaults to Large 24.'
    : 'Changing either option rebuilds the entire maze. Compact 12 + Medium 7–10 is now the default.';
  group.append(heading, cell.row, room.row, note);
  simBody.insertBefore(group, sliderRoot);

  const reloadWith = (key, value) => {
    storageSet(key, value);
    doc.defaultView?.location?.reload?.();
  };
  cell.select.addEventListener('change', ()=>reloadWith(cellSizeStorageKey(runtimeConfig), cell.select.value));
  room.select.addEventListener('change', ()=>reloadWith(ROOM_SIZE_KEY, room.select.value));
  return true;
}
