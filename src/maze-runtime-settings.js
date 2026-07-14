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
const ROOM_SIZE_KEY = 'arena.mazeRoomCells';

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

export function getMazeRuntimeSettings(){
  return {
    cellSize:optionById(MAZE_CELL_SIZE_OPTIONS, storageGet(CELL_SIZE_KEY), 'current'),
    roomSize:optionById(MAZE_ROOM_SIZE_OPTIONS, storageGet(ROOM_SIZE_KEY), 'current'),
  };
}

export function configuredHexSize(requestedHexSize){
  const requested = Number(requestedHexSize);
  if(!Number.isFinite(requested)) return requestedHexSize;
  // The gameplay maze uses 20-unit cells. Lab/debug renderers use tiny values
  // such as 1 or 2.6 and must not inherit the gameplay override.
  return requested >= 10 ? getMazeRuntimeSettings().cellSize.value : requested;
}

export function configuredRoomSize(defaultMin, defaultMax, presetId = null){
  const preset = presetId
    ? optionById(MAZE_ROOM_SIZE_OPTIONS, presetId, 'current')
    : getMazeRuntimeSettings().roomSize;
  if(!presetId && storageGet(ROOM_SIZE_KEY) === null){
    return { min:Number(defaultMin), max:Number(defaultMax), id:'custom' };
  }
  return { min:preset.min, max:preset.max, id:preset.id };
}

function makeSelectRow({ id, label, options, value }){
  const row = document.createElement('div');
  row.className = 'selectRow mazeSettingRow';
  const title = document.createElement('label');
  title.htmlFor = id;
  title.textContent = label;
  const select = document.createElement('select');
  select.id = id;
  for(const option of options){
    const element = document.createElement('option');
    element.value = option.id;
    element.textContent = option.label;
    select.appendChild(element);
  }
  select.value = value;
  row.append(title, select);
  return { row, select };
}

export function installMazeRuntimeControls(){
  if(typeof document === 'undefined' || document.getElementById('mazeCellSizeSelect')) return false;
  const simBody = document.getElementById('body-sim');
  const sliderRoot = document.getElementById('dirSliders');
  if(!simBody || !sliderRoot) return false;

  const style = document.createElement('style');
  style.id = 'mazePhonePanelStyle';
  style.textContent = `
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
  document.head.appendChild(style);

  const settings = getMazeRuntimeSettings();
  const group = document.createElement('div');
  group.className = 'mazeSettingsGroup';
  const heading = document.createElement('div');
  heading.className = 'ptitle';
  heading.textContent = 'MAZE GEOMETRY';

  const cell = makeSelectRow({
    id:'mazeCellSizeSelect',
    label:'CELL SIZE',
    options:MAZE_CELL_SIZE_OPTIONS,
    value:settings.cellSize.id,
  });
  const room = makeSelectRow({
    id:'mazeRoomSizeSelect',
    label:'CELLS PER ROOM',
    options:MAZE_ROOM_SIZE_OPTIONS,
    value:settings.roomSize.id,
  });
  const note = document.createElement('div');
  note.className = 'mazeReloadNote';
  note.textContent = 'Changing either option rebuilds the entire maze. Pair smaller cells with more cells per room to keep a similar physical arena size.';
  group.append(heading, cell.row, room.row, note);
  simBody.insertBefore(group, sliderRoot);

  const reloadWith = (key, value) => {
    storageSet(key, value);
    globalThis.location?.reload?.();
  };
  cell.select.addEventListener('change', ()=>reloadWith(CELL_SIZE_KEY, cell.select.value));
  room.select.addEventListener('change', ()=>reloadWith(ROOM_SIZE_KEY, room.select.value));
  return true;
}

if(typeof document !== 'undefined'){
  queueMicrotask(()=>installMazeRuntimeControls());
}
