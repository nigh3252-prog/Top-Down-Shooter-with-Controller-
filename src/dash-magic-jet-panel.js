// Hidden tuning panel for the magic-jet dash effect. The element stays
// display:none inside combat-arena; the Enemy Lab control bridge discovers any
// [id*="Panel"] element with inputs and surfaces it as a "DASH JET" category
// in the Lab dock, rendering these sliders there. Slider moves flow through
// runtime.applySetting, which updates the live settings and persists the
// overrides to localStorage.
export function installDashJetPanel({ runtime, document: doc = globalThis.document } = {}){
  if(!runtime || !doc?.createElement || !doc.body) return null;
  if(doc.getElementById('dashJetPanel')) return null;

  // Prototype sliders keep the ranges from threejs_midair_lifted_ground_slice_v1.html;
  // the rest are the integration knobs this port added.
  const SLIDERS = [
    { key:'zoneScale', label:'Zone Size', min:.1, max:1, step:.05, note:'Scales the fixed-world effect zone from 10% up to its full span (rebuilds the field)' },
    { key:'grainScale', label:'Grain Size', min:.5, max:2, step:.05, note:'World size of the sim cells and voxel blocks, same in every scene (rebuilds the field)' },
    { key:'push', label:'Push', min:.3, max:4, step:.05 },
    { key:'ink', label:'Material', min:.1, max:3.5, step:.05 },
    { key:'heat', label:'Heat', min:.1, max:4, step:.05 },
    { key:'curl', label:'Curl', min:0, max:4, step:.05 },
    { key:'momentum', label:'Momentum', min:.9, max:.995, step:.001 },
    { key:'fadeDash', label:'Material Life', min:.955, max:.999, step:.001 },
    { key:'radius', label:'Brush', min:5, max:90, step:1 },
    { key:'layers', label:'3D Layers', min:1, max:6, step:1 },
    { key:'height', label:'Layer Height', min:.05, max:1.9, step:.05 },
    { key:'voxelSize', label:'Voxel Size', min:.25, max:1.8, step:.05 },
    { key:'breakup', label:'Breakup', min:0, max:.95, step:.01 },
    { key:'glow', label:'Voxel Glow', min:.2, max:4, step:.05 },
    { key:'accent', label:'Accent Streaks', min:0, max:3, step:.05 },
    { key:'baseLift', label:'Base Lift', min:0, max:2.5, step:.05 },
    { key:'layerSpread', label:'Layer Spread', min:.5, max:4, step:.1 },
    { key:'voxelGain', label:'Voxel Gain', min:.02, max:1, step:.02 },
    { key:'airSheetScale', label:'Air Sheets', min:0, max:1, step:.02 },
    { key:'groundStain', label:'Ground Stain', min:0, max:1, step:.05 },
  ];

  const panel = doc.createElement('div');
  panel.id = 'dashJetPanel';
  panel.setAttribute('aria-label', 'DASH JET');
  panel.style.display = 'none';

  const inputs = new Map();
  const currentValue = key => {
    if(key === 'zoneScale') return runtime.zoneScale;
    if(key === 'grainScale') return runtime.grainScale;
    return runtime.settings[key];
  };

  {
    const row = doc.createElement('div');
    const label = doc.createElement('label');
    label.setAttribute('for', 'dashJet-palette');
    label.textContent = 'Palette';
    const select = doc.createElement('select');
    select.id = 'dashJet-palette';
    for(const palette of ['blue', 'ember', 'arcane']){
      const option = doc.createElement('option');
      option.value = palette;
      option.textContent = palette[0].toUpperCase() + palette.slice(1);
      select.appendChild(option);
    }
    select.value = String(currentValue('palette'));
    select.title = 'Color ramp for the dye, voxels, and accent streaks';
    select.addEventListener('change', () => runtime.applySetting('palette', select.value));
    inputs.set('palette', select);
    row.append(label, select);
    panel.appendChild(row);
  }

  for(const def of SLIDERS){
    const row = doc.createElement('div');
    const id = `dashJet-${def.key}`;
    const label = doc.createElement('label');
    label.setAttribute('for', id);
    label.textContent = def.label;
    const input = doc.createElement('input');
    input.type = 'range';
    input.id = id;
    input.min = String(def.min);
    input.max = String(def.max);
    input.step = String(def.step);
    input.value = String(currentValue(def.key));
    if(def.note) input.title = def.note;
    input.addEventListener('input', () => runtime.applySetting(def.key, Number(input.value)));
    inputs.set(def.key, input);
    row.append(label, input);
    panel.appendChild(row);
  }

  const syncInputs = () => {
    for(const [key, input] of inputs) input.value = String(currentValue(key));
  };

  const reset = doc.createElement('button');
  reset.id = 'dashJet-reset';
  reset.type = 'button';
  reset.textContent = 'RESET DASH JET DEFAULTS';
  reset.title = 'Restore the tuned defaults and clear the saved overrides';
  reset.addEventListener('click', () => { runtime.resetSettings(); syncInputs(); });
  panel.appendChild(reset);

  doc.body.appendChild(panel);
  return { panel, syncInputs, dispose(){ panel.remove(); } };
}
