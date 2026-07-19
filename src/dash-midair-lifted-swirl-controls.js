const STORAGE_KEY = 'dashSwirl.controls.v1';

const DEFAULT_SETTINGS = Object.freeze({
  push:1.9,
  ink:1.45,
  heat:1.85,
  curl:2.45,
  momentum:0.984,
  fade:0.989,
  radius:42,
  layers:4,
  height:0.95,
  voxelSize:0.82,
  breakup:0.38,
  ground:0.00,
  glow:2.25,
  accent:1.8,
  quality:0,
  layerSeparation:1.0,
  middleHeight:0.95,
});

const PRESETS = Object.freeze({
  duel:{
    push:1.95,ink:1.45,heat:1.85,curl:2.45,momentum:0.984,fade:0.989,
    radius:42,layers:4,height:0.95,voxelSize:0.82,breakup:0.38,
    ground:0.00,glow:2.25,accent:1.8,
  },
  cloud:{
    push:1.55,ink:1.75,heat:1.35,curl:2.05,momentum:0.986,fade:0.992,
    radius:52,layers:5,height:1.22,voxelSize:0.98,breakup:0.26,
    ground:0.00,glow:1.95,accent:1.1,
  },
  trail:{
    push:2.35,ink:1.10,heat:2.35,curl:2.75,momentum:0.982,fade:0.984,
    radius:28,layers:4,height:0.72,voxelSize:0.68,breakup:0.48,
    ground:0.00,glow:2.55,accent:2.55,
  },
});

function readSaved(){
  try{
    return JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || '{}');
  }catch{
    return {};
  }
}

const saved = readSaved();
const controlState = globalThis.__dashSwirlControlState || {
  settings:{...DEFAULT_SETTINGS,...(saved.settings || {})},
  renderMode:saved.renderMode === 'cubes' ? 'cubes' : 'quads',
  palette:['arcane','blue','ember'].includes(saved.palette) ? saved.palette : 'blue',
  cameraMode:saved.cameraMode === 'top' ? 'top' : 'follow',
  preset:['duel','cloud','trail'].includes(saved.preset) ? saved.preset : 'custom',
};
globalThis.__dashSwirlControlState = controlState;

globalThis.__dashSwirlCaptureSettings = defaults => {
  const live = Object.assign(defaults, controlState.settings || {});
  controlState.settings = live;
  return live;
};

function persist(){
  try{
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify({
      settings:controlState.settings,
      renderMode:controlState.renderMode,
      palette:controlState.palette,
      cameraMode:controlState.cameraMode,
      preset:controlState.preset,
    }));
  }catch{
    // Storage is optional; live controls still work.
  }
}

function requiredReplace(source, needle, replacement, label){
  if(!source.includes(needle)){
    throw new Error(`[dash-swirl-controls] Could not find ${label} in the approved prototype port.`);
  }
  return source.replace(needle, replacement);
}

function transformPrototypeSource(source){
  let out = source;
  out = requiredReplace(out,
    'const renderMode = "quads";',
    'let renderMode = globalThis.__dashSwirlControlState?.renderMode || "quads";',
    'render mode declaration');
  out = requiredReplace(out,
    'const palette = "blue";',
    'let palette = globalThis.__dashSwirlControlState?.palette || "blue";',
    'palette declaration');
  out = requiredReplace(out,
    'const frozenSettings = Object.freeze({',
    'const frozenSettings = globalThis.__dashSwirlCaptureSettings({',
    'settings declaration');
  out = requiredReplace(out,
    '  function settings() {\n    return frozenSettings;\n  }',
    `  function settings() {\n    return frozenSettings;\n  }\n\n  function mappedLayerY(originalY) {\n    const s = settings();\n    const separation = Number.isFinite(Number(s.layerSeparation)) ? Number(s.layerSeparation) : 1;\n    const middle = Number.isFinite(Number(s.middleHeight)) ? Number(s.middleHeight) : 0.95;\n    return middle + (originalY - 0.95) * separation;\n  }`,
    'settings accessor');

  for(const [originalY, marker] of [
    ['0.025','fluidPlane'],
    ['0.035','fluidGlowPlane'],
    ['0.92','airPlane'],
    ['1.02','airGlowPlane'],
    ['1.10','airHaloPlane'],
  ]){
    out = requiredReplace(out,
      `  ${marker}.position.y = ${originalY};`,
      `  ${marker}.position.y = mappedLayerY(${originalY});`,
      `${marker} height`);
  }

  out = requiredReplace(out,
    '          const y = 0.28 + layer * (0.14 + s.height * 0.17) + groundAlpha * (0.12 + 0.16 * layerFocus);',
    '          const y = mappedLayerY(0.28 + layer * (0.14 + s.height * 0.17) + groundAlpha * (0.12 + 0.16 * layerFocus));',
    'voxel layer height');
  out = requiredReplace(out,
    '      dummy.position.set(mx, 0.94 + st.heat * 0.10, mz);',
    '      dummy.position.set(mx, mappedLayerY(0.94 + st.heat * 0.10), mz);',
    'accent streak height');
  out = requiredReplace(out,
    '            dummy.quaternion.copy(camera.quaternion);',
    `            if(globalThis.__dashSwirlControlState?.cameraMode === 'top') {\n              dummy.rotation.set(-Math.PI * 0.5, 0, 0);\n            } else {\n              dummy.quaternion.copy(camera.quaternion);\n            }`,
    'quad camera facing');
  out = requiredReplace(out,
    '  function update(dt){\n    if(!group.visible) return;',
    `  function update(dt){\n    renderMode = globalThis.__dashSwirlControlState?.renderMode || renderMode;\n    palette = globalThis.__dashSwirlControlState?.palette || palette;\n    fluidPlane.position.y = mappedLayerY(0.025);\n    fluidGlowPlane.position.y = mappedLayerY(0.035);\n    airPlane.position.y = mappedLayerY(0.92);\n    airGlowPlane.position.y = mappedLayerY(1.02);\n    airHaloPlane.position.y = mappedLayerY(1.10);\n    if(!group.visible) return;`,
    'runtime update');
  return out;
}

let installApprovedRuntime;
if(globalThis.document?.createElement && typeof globalThis.fetch === 'function' && globalThis.Blob && globalThis.URL?.createObjectURL){
  const sourceUrl = new URL('./dash-midair-lifted-swirl.js', import.meta.url);
  const response = await fetch(sourceUrl);
  if(!response.ok) throw new Error(`[dash-swirl-controls] Failed to load approved prototype port: HTTP ${response.status}.`);
  const transformed = transformPrototypeSource(await response.text());
  const blobUrl = URL.createObjectURL(new Blob([`${transformed}\n//# sourceURL=dash-midair-lifted-swirl-tunable.js`], {type:'text/javascript'}));
  try{
    ({installMidairLiftedDashSwirl:installApprovedRuntime} = await import(blobUrl));
  }finally{
    URL.revokeObjectURL(blobUrl);
  }
}else{
  ({installMidairLiftedDashSwirl:installApprovedRuntime} = await import('./dash-midair-lifted-swirl.js'));
}

const RANGE_CONTROLS = [
  ['push','Push',0.3,4.0,0.05],
  ['ink','Material',0.1,3.5,0.05],
  ['heat','Heat',0.1,4.0,0.05],
  ['curl','Curl',0,4.0,0.05],
  ['momentum','Momentum',0.900,0.995,0.001],
  ['fade','Material Life',0.955,0.999,0.001],
  ['radius','Brush',10,90,1],
  ['layers','3D Layers',1,6,1],
  ['height','Layer Height',0.05,1.9,0.05],
  ['layerSeparation','Layer Separation',0.25,4.0,0.05],
  ['middleHeight','Middle Layer Y',0.10,3.0,0.05],
  ['voxelSize','Voxel Size',0.25,1.8,0.05],
  ['breakup','Breakup',0.0,0.95,0.01],
  ['ground','Ground Glow',0.0,2.4,0.05],
  ['glow','Voxel Glow',0.2,4.0,0.05],
  ['accent','Accent Streaks',0.0,3.0,0.05],
];

let activeRuntime = null;
let panel = null;

function makeLabel(text, control){
  const label = document.createElement('label');
  label.className = 'slabel';
  label.htmlFor = control.id;
  label.textContent = text;
  return label;
}

function makeSelect(id, labelText, options, value, onChange){
  const row = document.createElement('div');
  row.className = 'selectRow';
  const select = document.createElement('select');
  select.id = id;
  for(const [optionValue, optionLabel] of options){
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = optionLabel;
    option.selected = optionValue === value;
    select.appendChild(option);
  }
  select.addEventListener('change', () => onChange(select.value));
  row.append(makeLabel(labelText, select), select);
  return row;
}

function syncPanel(){
  if(!panel) return;
  for(const [key] of RANGE_CONTROLS){
    const input = panel.querySelector(`#dashSwirl-${key}`);
    if(input) input.value = String(controlState.settings[key]);
  }
  const preset = panel.querySelector('#dashSwirl-preset');
  const renderMode = panel.querySelector('#dashSwirl-renderMode');
  const palette = panel.querySelector('#dashSwirl-palette');
  const cameraMode = panel.querySelector('#dashSwirl-cameraMode');
  if(preset) preset.value = controlState.preset;
  if(renderMode) renderMode.value = controlState.renderMode;
  if(palette) palette.value = controlState.palette;
  if(cameraMode) cameraMode.value = controlState.cameraMode;
}

function applyPreset(id){
  const preset = PRESETS[id];
  if(!preset) return;
  Object.assign(controlState.settings, preset);
  controlState.preset = id;
  persist();
  syncPanel();
}

function installControlPanel(){
  if(!globalThis.document?.body) return null;
  const existing = document.getElementById('dashSwirlPanel');
  if(existing){panel = existing; return panel;}

  panel = document.createElement('div');
  panel.id = 'dashSwirlPanel';
  panel.setAttribute('aria-label','DASH SWIRL');
  panel.style.display = 'none';

  panel.appendChild(makeSelect('dashSwirl-preset','Broad Preset',[
    ['custom','Custom / individual settings'],
    ['duel','Duel'],
    ['cloud','Cloud'],
    ['trail','Trail'],
  ],controlState.preset,value=>{
    if(value === 'custom'){
      controlState.preset = 'custom';
      persist();
    }else applyPreset(value);
  }));

  panel.appendChild(makeSelect('dashSwirl-renderMode','Render Mode',[
    ['quads','Flat Quads'],
    ['cubes','Cubes'],
  ],controlState.renderMode,value=>{
    controlState.renderMode = value;
    controlState.preset = 'custom';
    persist();
  }));

  panel.appendChild(makeSelect('dashSwirl-cameraMode','Quad Facing',[
    ['follow','Follow Game Camera'],
    ['top','Top-Down Facing'],
  ],controlState.cameraMode,value=>{
    controlState.cameraMode = value;
    controlState.preset = 'custom';
    persist();
  }));

  panel.appendChild(makeSelect('dashSwirl-palette','Palette',[
    ['arcane','Arcane'],
    ['blue','Blue'],
    ['ember','Ember'],
  ],controlState.palette,value=>{
    controlState.palette = value;
    controlState.preset = 'custom';
    persist();
  }));

  for(const [key,labelText,min,max,step] of RANGE_CONTROLS){
    const row = document.createElement('div');
    row.className = 'srow';
    const input = document.createElement('input');
    input.type = 'range';
    input.id = `dashSwirl-${key}`;
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(controlState.settings[key]);
    input.setAttribute('aria-label',labelText);
    input.addEventListener('input',()=>{
      controlState.settings[key] = Number(input.value);
      controlState.preset = 'custom';
      persist();
    });
    row.append(makeLabel(labelText,input),input);
    panel.appendChild(row);
  }

  panel.appendChild(makeSelect('dashSwirl-quality','Quality',[
    ['0','Low'],['1','Medium'],['2','High'],
  ],String(controlState.settings.quality),value=>{
    controlState.settings.quality = Number(value);
    controlState.preset = 'custom';
    persist();
    globalThis.location?.reload?.();
  }));

  const clear = document.createElement('button');
  clear.id = 'dashSwirl-clear';
  clear.textContent = 'Clear Swirl';
  clear.title = 'Hide the current dash swirl. The next dash begins with a clean simulation.';
  clear.addEventListener('click',()=>{
    if(activeRuntime?.group) activeRuntime.group.visible = false;
  });
  panel.appendChild(clear);

  const reset = document.createElement('button');
  reset.id = 'dashSwirl-reset';
  reset.textContent = 'Reset Prototype Defaults';
  reset.addEventListener('click',()=>{
    Object.assign(controlState.settings,DEFAULT_SETTINGS);
    controlState.renderMode = 'quads';
    controlState.palette = 'blue';
    controlState.cameraMode = 'follow';
    controlState.preset = 'custom';
    persist();
    syncPanel();
  });
  panel.appendChild(reset);

  document.body.appendChild(panel);
  return panel;
}

export function installMidairLiftedDashSwirl(api){
  installControlPanel();
  activeRuntime = installApprovedRuntime(api);
  return {
    ...activeRuntime,
    settings:controlState.settings,
    controlState,
    applyPreset,
    setSetting(key,value){
      if(!(key in controlState.settings)) return false;
      controlState.settings[key] = Number(value);
      controlState.preset = 'custom';
      persist();
      syncPanel();
      return true;
    },
  };
}
