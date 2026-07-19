const STORAGE_KEY = 'dashSwirl.controls.v2';
const LEGACY_STORAGE_KEY = 'dashSwirl.controls.v1';

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

function volumeSettings(value){
  const volume = clamp01(value);
  return {
    volume,
    layers:Math.max(1, Math.min(6, Math.round(1 + volume * 5))),
    layerSeparation:0.08 + volume * 0.38,
    cubeHeight:0.45 + volume * 0.75,
    outerFade:0.62 - volume * 0.38,
    layerDrift:0.02 + volume * 0.12,
    sheetStrength:Math.max(0.02, 0.28 - volume * 0.30),
  };
}

const DEFAULT_VOLUME = 0.72;
const DEFAULT_SETTINGS = Object.freeze({
  push:1.9,
  ink:1.45,
  heat:1.85,
  curl:2.45,
  momentum:0.984,
  fade:0.989,
  radius:42,
  layers:5,
  height:0.95,
  voxelSize:0.82,
  breakup:0.38,
  ground:0.00,
  glow:2.25,
  accent:1.8,
  quality:0,
  middleHeight:0.95,
  ...volumeSettings(DEFAULT_VOLUME),
});

const PRESETS = Object.freeze({
  duel:{
    push:1.95,ink:1.45,heat:1.85,curl:2.45,momentum:0.984,fade:0.989,
    radius:42,height:0.95,voxelSize:0.82,breakup:0.38,
    ground:0.00,glow:2.25,accent:1.8,middleHeight:0.95,
    volume:0.72,layers:5,layerSeparation:0.35,cubeHeight:0.98,
    outerFade:0.35,layerDrift:0.10,sheetStrength:0.06,
  },
  cloud:{
    push:1.55,ink:1.75,heat:1.35,curl:2.05,momentum:0.986,fade:0.992,
    radius:52,height:1.22,voxelSize:0.98,breakup:0.26,
    ground:0.00,glow:1.95,accent:1.1,middleHeight:1.05,
    volume:0.94,layers:6,layerSeparation:0.40,cubeHeight:1.15,
    outerFade:0.25,layerDrift:0.17,sheetStrength:0.02,
  },
  trail:{
    push:2.35,ink:1.10,heat:2.35,curl:2.75,momentum:0.982,fade:0.984,
    radius:28,height:0.72,voxelSize:0.68,breakup:0.48,
    ground:0.00,glow:2.55,accent:2.55,middleHeight:0.86,
    volume:0.48,layers:3,layerSeparation:0.24,cubeHeight:0.72,
    outerFade:0.46,layerDrift:0.06,sheetStrength:0.10,
  },
});

function readSaved(){
  try{
    const current = globalThis.localStorage?.getItem(STORAGE_KEY);
    if(current) return {...JSON.parse(current),storageVersion:2};
    const legacy = globalThis.localStorage?.getItem(LEGACY_STORAGE_KEY);
    if(legacy) return {...JSON.parse(legacy),storageVersion:1};
  }catch{
    // Invalid saved tuning should never prevent the effect from loading.
  }
  return {};
}

const saved = readSaved();
const migratedSettings = {...DEFAULT_SETTINGS,...(saved.settings || {})};
if(saved.storageVersion !== 2){
  Object.assign(migratedSettings, volumeSettings(DEFAULT_VOLUME), {
    middleHeight:DEFAULT_SETTINGS.middleHeight,
  });
}

const controlState = globalThis.__dashSwirlControlState || {
  settings:migratedSettings,
  renderMode:saved.storageVersion === 2 && saved.renderMode === 'quads' ? 'quads' : 'cubes',
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
      storageVersion:2,
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

function replaceBetween(source, startMarker, endMarker, replacement, label){
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if(start < 0 || end < 0){
    throw new Error(`[dash-swirl-controls] Could not find ${label} in the approved prototype port.`);
  }
  return source.slice(0, start) + replacement + source.slice(end);
}

const PALETTE_COLOR_FUNCTION = `  function paletteColor(body, hot, layerT, out) {
    const cool = Math.max(0, body - hot * 0.55);
    const core = Math.min(1, hot * 1.25);
    const haze = Math.min(1, cool * (0.65 + layerT * 0.35));

    if (palette === "blue") {
      const c0 = new THREE.Color(1.00, 0.99, 1.00);
      const c1 = new THREE.Color(0.48, 0.98, 1.00);
      const c2 = new THREE.Color(0.12, 0.66, 1.00);
      const c3 = new THREE.Color(0.38, 0.20, 0.78);
      if (core > 0.68) mix3(c1, c0, (core - 0.68) / 0.32, out);
      else if (core > 0.30) mix3(c2, c1, (core - 0.30) / 0.38, out);
      else mix3(c3, c2, Math.min(1, core / 0.30), out);
      color2.setRGB(0.10, 0.06, 0.22);
      out.lerp(color2, Math.min(0.55, haze * 0.55 + layerT * 0.14));
      out.multiplyScalar(0.26 + body * 0.95 + core * 0.65);
      return;
    }

    if (palette === "ember") {
      const c0 = new THREE.Color(1.00, 0.98, 0.92);
      const c1 = new THREE.Color(1.00, 0.86, 0.22);
      const c2 = new THREE.Color(1.00, 0.48, 0.08);
      const c3 = new THREE.Color(0.96, 0.20, 0.66);
      const c4 = new THREE.Color(0.26, 0.06, 0.26);
      if (core > 0.70) mix3(c1, c0, (core - 0.70) / 0.30, out);
      else if (core > 0.44) mix3(c2, c1, (core - 0.44) / 0.26, out);
      else if (core > 0.22) mix3(c3, c2, (core - 0.22) / 0.22, out);
      else mix3(c4, c3, Math.min(1, core / 0.22), out);
      color2.setRGB(0.19, 0.05, 0.14);
      out.lerp(color2, Math.min(0.44, haze * 0.42 + layerT * 0.12));
      out.multiplyScalar(0.26 + body * 1.02 + core * 0.62);
      return;
    }

    const c0 = new THREE.Color(1.00, 0.99, 0.98);
    const c1 = new THREE.Color(0.40, 1.00, 0.96);
    const c2 = new THREE.Color(0.16, 0.70, 1.00);
    const c3 = new THREE.Color(0.98, 0.24, 0.80);
    const c4 = new THREE.Color(1.00, 0.68, 0.18);
    const c5 = new THREE.Color(0.26, 0.08, 0.33);
    if (core > 0.78) mix3(c1, c0, (core - 0.78) / 0.22, out);
    else if (core > 0.50) mix3(c2, c1, (core - 0.50) / 0.28, out);
    else if (core > 0.24) mix3(c3, c2, (core - 0.24) / 0.26, out);
    else mix3(c5, c3, Math.min(1, core / 0.24), out);
    const emberT = Math.min(1, cool * 0.95 * (1 - layerT * 0.25));
    out.lerp(c4, emberT * 0.22);
    out.lerp(c5, Math.min(0.40, haze * 0.38 + layerT * 0.10));
    out.multiplyScalar(0.25 + body + core * 0.68);
  }`;

const HOT_ACCENT_FUNCTION = `  function hotAccentColor(hot, out) {
    if (palette === "blue") {
      out.setRGB(0.62, 1.00, 1.00);
      out.lerp(new THREE.Color(1, 1, 1), Math.min(1, hot * 0.55));
      return;
    }
    if (palette === "ember") {
      out.setRGB(1.00, 0.74, 0.14);
      out.lerp(new THREE.Color(1.0, 0.95, 0.90), Math.min(1, hot * 0.68));
      return;
    }
    out.setRGB(0.62, 1.00, 0.96);
    out.lerp(new THREE.Color(1.00, 0.80, 0.24), 0.20);
    out.lerp(new THREE.Color(1.00, 1.00, 1.00), Math.min(1, hot * 0.65));
  }`;

const VOLUME_UPDATE_FUNCTION = `  function hideInstance(mesh, instance) {
    dummy.position.set(0, -999, 0);
    dummy.scale.set(0.001, 0.001, 0.001);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(instance, dummy.matrix);
    mesh.setColorAt(instance, color.setRGB(0, 0, 0));
  }

  function updateVoxelInstances(time) {
    const s = settings();
    const useCubes = renderMode === "cubes";
    const activeLayers = Math.max(1, Math.min(MAX_LAYERS, Math.round(s.layers)));
    const centerLayer = (activeLayers - 1) * 0.5;
    const maxLayerDistance = Math.max(0.5, centerLayer);
    const voxelBaseW = PATCH_W / VIS_COLS;
    const voxelBaseD = PATCH_D / VIS_ROWS;
    const baseSize = Math.min(voxelBaseW, voxelBaseD) * s.voxelSize;
    const separation = Math.max(0.01, Number(s.layerSeparation) || 0.32);
    const middleY = Number.isFinite(Number(s.middleHeight)) ? Number(s.middleHeight) : 0.95;
    const outerFade = Math.max(0.02, Math.min(1, Number(s.outerFade) || 0.35));
    const layerDrift = Math.max(0, Number(s.layerDrift) || 0);
    const cubeHeight = Math.max(0.1, Number(s.cubeHeight) || 0.9);

    quadMesh.visible = !useCubes;
    quadMesh.count = CUBES_PER_LAYER;
    for (let layer = 0; layer < MAX_LAYERS; layer++) {
      const layerMesh = cubeLayerMeshes[layer];
      layerMesh.visible = useCubes && layer < activeLayers;
      layerMesh.count = CUBES_PER_LAYER;
      if (layer < activeLayers) {
        const distance = Math.abs(layer - centerLayer) / maxLayerDistance;
        const alpha = 1 - (1 - outerFade) * Math.pow(distance, 1.35);
        layerMesh.material.opacity = 0.84 * alpha;
      }
    }

    for (let row = 0; row < VIS_ROWS; row++) {
      for (let col = 0; col < VIS_COLS; col++) {
        const cellIndex = col + row * VIS_COLS;
        const gx = (col + 0.5) / VIS_COLS * (simW - 2) + 1;
        const gy = (row + 0.5) / VIS_ROWS * (simH - 2) + 1;
        const iApprox = idx(
          Math.max(1, Math.min(simW - 2, Math.floor(gx))),
          Math.max(1, Math.min(simH - 2, Math.floor(gy)))
        );
        const isSolid = solid[iApprox];
        const d = sample(dye, gx, gy);
        const speed = Math.hypot(sample(u, gx, gy), sample(v, gx, gy));
        const swirl = sample(curlField, gx, gy);
        const groundAlpha = sampleRenderedGroundColor(gx, gy, color);
        const worldX = (col / (VIS_COLS - 1) - 0.5) * PATCH_W;
        const worldZ = (row / (VIS_ROWS - 1) - 0.5) * PATCH_D;
        const cellSeed = seeds[cellIndex * MAX_LAYERS];
        const breakupNoise = cellSeed * 0.055 + 0.04 * Math.sin(time * 1.1 + cellSeed * 18);
        const threshold = 0.045 + s.breakup * 0.075 + breakupNoise;
        const visible = !isSolid && groundAlpha > threshold;
        const size = baseSize * (0.72 + groundAlpha * 0.94);
        const pulse = 1 + 0.045 * Math.sin(time * 4.6 + cellSeed * 100);

        if (!useCubes) {
          if (!visible) {
            hideInstance(quadMesh, cellIndex);
            continue;
          }
          dummy.position.set(worldX, middleY + groundAlpha * 0.04, worldZ);
          if(globalThis.__dashSwirlControlState?.cameraMode === 'top') {
            dummy.rotation.set(-Math.PI * 0.5, 0, 0);
          } else {
            dummy.quaternion.copy(camera.quaternion);
          }
          dummy.scale.set(size * pulse, size * pulse, 1);
          dummy.updateMatrix();
          quadMesh.setMatrixAt(cellIndex, dummy.matrix);
          sampleRenderedGroundColor(gx, gy, color);
          color.multiplyScalar(0.82 + groundAlpha * 0.92 + speed * 0.03);
          quadMesh.setColorAt(cellIndex, color);
          continue;
        }

        for (let layer = 0; layer < activeLayers; layer++) {
          const layerMesh = cubeLayerMeshes[layer];
          if (!visible) {
            hideInstance(layerMesh, cellIndex);
            continue;
          }
          const layerOffset = layer - centerLayer;
          const distance = Math.abs(layerOffset) / maxLayerDistance;
          const layerFocus = 1 - distance;
          const seed = seeds[cellIndex * MAX_LAYERS + layer];
          const driftScale = layerOffset * layerDrift;
          const dx = sample(u, gx, gy) * driftScale
            + jitterX[cellIndex * MAX_LAYERS + layer] * baseSize * layerDrift * 0.55;
          const dz = sample(v, gx, gy) * driftScale
            + jitterZ[cellIndex * MAX_LAYERS + layer] * baseSize * layerDrift * 0.55;
          const swirlPush = Math.sin(time * 1.7 + seed * 12) * swirl * 0.006 * driftScale;
          const y = middleY + layerOffset * separation + groundAlpha * 0.05;
          dummy.position.set(worldX + dx + swirlPush, y, worldZ + dz - swirlPush);
          dummy.rotation.set(0, cellSeed * Math.PI * 2 + layerOffset * 0.045, 0);
          dummy.scale.set(
            size * pulse,
            size * cubeHeight * (0.72 + groundAlpha * 0.46 + s.height * 0.16),
            size * pulse
          );
          dummy.updateMatrix();
          layerMesh.setMatrixAt(cellIndex, dummy.matrix);
          sampleRenderedGroundColor(gx, gy, color);
          color.multiplyScalar((0.78 + groundAlpha * 0.84 + speed * 0.03) * (0.90 + layerFocus * 0.18));
          layerMesh.setColorAt(cellIndex, color);
        }
      }
    }

    if (useCubes) {
      for (let layer = 0; layer < activeLayers; layer++) {
        const layerMesh = cubeLayerMeshes[layer];
        layerMesh.instanceMatrix.needsUpdate = true;
        if (layerMesh.instanceColor) layerMesh.instanceColor.needsUpdate = true;
      }
    } else {
      quadMesh.instanceMatrix.needsUpdate = true;
      if (quadMesh.instanceColor) quadMesh.instanceColor.needsUpdate = true;
    }
  }`;

function transformPrototypeSource(source){
  let out = source;
  out = requiredReplace(out,
    'const renderMode = "quads";',
    'let renderMode = globalThis.__dashSwirlControlState?.renderMode || "cubes";',
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
    `  function settings() {\n    return frozenSettings;\n  }\n\n  function middleLayerY() {\n    const value = Number(settings().middleHeight);\n    return Number.isFinite(value) ? value : 0.95;\n  }\n\n  function mappedPlaneY(originalY) {\n    const scale = Math.max(0.25, (Number(settings().layerSeparation) || 0.32) / 0.32);\n    return middleLayerY() + (originalY - 0.95) * scale;\n  }`,
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
      `  ${marker}.position.y = mappedPlaneY(${originalY});`,
      `${marker} height`);
  }

  const originalMeshBlock = `  const quadMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), quadMaterial, MAX_INSTANCES);
  const cubeMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), cubeMaterial, MAX_INSTANCES);
  const strokeMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), strokeMaterial, MAX_STROKES);

  quadMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  cubeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  strokeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  quadMesh.frustumCulled = false;
  cubeMesh.frustumCulled = false;
  strokeMesh.frustumCulled = false;

  group.add(quadMesh);
  group.add(cubeMesh);
  group.add(strokeMesh);`;
  const volumeMeshBlock = `  const CUBES_PER_LAYER = VIS_COLS * VIS_ROWS;
  const quadMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), quadMaterial, MAX_INSTANCES);
  const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const cubeLayerMeshes = Array.from({length:MAX_LAYERS}, (_, layer) => {
    const material = layer === 0 ? cubeMaterial : cubeMaterial.clone();
    const mesh = new THREE.InstancedMesh(cubeGeometry, material, CUBES_PER_LAYER);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    return mesh;
  });
  const cubeMesh = cubeLayerMeshes[0];
  const strokeMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), strokeMaterial, MAX_STROKES);

  quadMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  strokeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  quadMesh.frustumCulled = false;
  strokeMesh.frustumCulled = false;

  group.add(quadMesh);
  group.add(...cubeLayerMeshes);
  group.add(strokeMesh);`;
  out = requiredReplace(out, originalMeshBlock, volumeMeshBlock, 'voxel mesh allocation');

  out = replaceBetween(out,
    '  function paletteColor(body, hot, layerT, out) {',
    '\n\n  function hotAccentColor(hot, out) {',
    PALETTE_COLOR_FUNCTION,
    'palette color function');
  out = replaceBetween(out,
    '  function hotAccentColor(hot, out) {',
    '\n\n  function renderGroundTexture() {',
    HOT_ACCENT_FUNCTION,
    'accent palette function');

  out = requiredReplace(out,
    '    airHaloPlane.material.opacity = Math.min(0.75, 0.10 + s.glow * 0.08);\n  }',
    `    airHaloPlane.material.opacity = Math.min(0.75, 0.10 + s.glow * 0.08);\n\n    const sheetStrength = renderMode === 'cubes'\n      ? Math.max(0, Math.min(1, Number(s.sheetStrength) || 0))\n      : 1;\n    fluidPlane.material.opacity *= sheetStrength;\n    fluidGlowPlane.material.opacity *= sheetStrength;\n    airPlane.material.opacity *= sheetStrength;\n    airGlowPlane.material.opacity *= sheetStrength;\n    airHaloPlane.material.opacity *= sheetStrength;\n  }`,
    'flat sheet strength');

  out = replaceBetween(out,
    '  function updateVoxelInstances(time) {',
    '\n\n  function updateStrokeInstances() {',
    VOLUME_UPDATE_FUNCTION,
    'voxel update function');

  out = requiredReplace(out,
    '      dummy.position.set(mx, 0.94 + st.heat * 0.10, mz);',
    '      dummy.position.set(mx, middleLayerY() + st.heat * 0.10, mz);',
    'accent streak height');
  out = requiredReplace(out,
    '  function update(dt){\n    if(!group.visible) return;',
    `  function update(dt){\n    renderMode = globalThis.__dashSwirlControlState?.renderMode || renderMode;\n    palette = globalThis.__dashSwirlControlState?.palette || palette;\n    fluidPlane.position.y = mappedPlaneY(0.025);\n    fluidGlowPlane.position.y = mappedPlaneY(0.035);\n    airPlane.position.y = mappedPlaneY(0.92);\n    airGlowPlane.position.y = mappedPlaneY(1.02);\n    airHaloPlane.position.y = mappedPlaneY(1.10);\n    if(!group.visible) return;`,
    'runtime update');
  out = requiredReplace(out,
    '    for(const mesh of [fluidPlane, fluidGlowPlane, airPlane, airGlowPlane, airHaloPlane, quadMesh, cubeMesh, strokeMesh]){',
    '    for(const mesh of [fluidPlane, fluidGlowPlane, airPlane, airGlowPlane, airHaloPlane, quadMesh, ...cubeLayerMeshes, strokeMesh]){',
    'volume mesh disposal');
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
  ['volume','Broad Volume',0.0,1.0,0.01],
  ['push','Push',0.3,4.0,0.05],
  ['ink','Material',0.1,3.5,0.05],
  ['heat','Heat',0.1,4.0,0.05],
  ['curl','Curl',0,4.0,0.05],
  ['momentum','Momentum',0.900,0.995,0.001],
  ['fade','Material Life',0.955,0.999,0.001],
  ['radius','Brush',10,90,1],
  ['layers','Voxel Layers',1,6,1],
  ['height','Layer Height Energy',0.05,1.9,0.05],
  ['layerSeparation','Layer Separation',0.05,0.9,0.01],
  ['middleHeight','Middle Layer Y',0.10,3.0,0.05],
  ['cubeHeight','Cube Height',0.2,2.0,0.05],
  ['outerFade','Outer Layer Fade',0.02,1.0,0.01],
  ['layerDrift','Layer Drift',0.0,0.5,0.01],
  ['sheetStrength','Flat Sheet Strength',0.0,1.0,0.01],
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

function applyVolume(value){
  Object.assign(controlState.settings, volumeSettings(value));
  controlState.preset = 'custom';
  persist();
  syncPanel();
}

function applyPreset(id){
  const preset = PRESETS[id];
  if(!preset) return;
  Object.assign(controlState.settings, preset);
  controlState.renderMode = 'cubes';
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
    ['cubes','Voxel Stack'],
    ['quads','Flat Quads · comparison'],
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
      if(key === 'volume'){
        applyVolume(input.value);
        return;
      }
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
  reset.textContent = 'Reset Volumetric Defaults';
  reset.addEventListener('click',()=>{
    Object.assign(controlState.settings,DEFAULT_SETTINGS);
    controlState.renderMode = 'cubes';
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
    applyVolume,
    setSetting(key,value){
      if(!(key in controlState.settings)) return false;
      if(key === 'volume'){
        applyVolume(value);
        return true;
      }
      controlState.settings[key] = Number(value);
      controlState.preset = 'custom';
      persist();
      syncPanel();
      return true;
    },
  };
}
