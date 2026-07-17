export const AGGRESSION_PRESETS = Object.freeze({
  1:Object.freeze({
    label:'Baseline',
    description:'Original combat-arena pacing: measured approach, full recovery, and modest group pressure.',
    waveSize:6,
    pressureBudget:2.25,
    aggression:1,
    idleRange:3,
    windup:1,
    cooldown:1,
    recovery:1,
    pursuit:1,
  }),
  2:Object.freeze({
    label:'Pressing',
    description:'A little more crowd pressure with shorter pauses between attacks.',
    waveSize:7,
    pressureBudget:2.5,
    aggression:1.25,
    idleRange:2.75,
    windup:.95,
    cooldown:.8,
    recovery:.85,
    pursuit:1.1,
  }),
  3:Object.freeze({
    label:'Aggressive',
    description:'Sustained pressure: more attackers close in and re-engage quickly.',
    waveSize:8,
    pressureBudget:3,
    aggression:1.6,
    idleRange:2.25,
    windup:.85,
    cooldown:.55,
    recovery:.6,
    pursuit:1.35,
  }),
  4:Object.freeze({
    label:'Relentless',
    description:'Very short gaps, tight spacing, and strong pursuit pressure.',
    waveSize:10,
    pressureBudget:3.5,
    aggression:2.2,
    idleRange:1.5,
    windup:.7,
    cooldown:.2,
    recovery:.3,
    pursuit:1.75,
  }),
  5:Object.freeze({
    label:'Frenzy',
    description:'Maximum aggression settings: minimum windup, cooldown, recovery, and spacing with maximum group pressure.',
    waveSize:12,
    pressureBudget:4,
    aggression:3,
    idleRange:1,
    windup:.5,
    cooldown:0,
    recovery:.05,
    pursuit:2.5,
  }),
});

export const AGGRESSION_DETAIL_CONTROLS = Object.freeze([
  Object.freeze({ label:'WAVE SIZE', key:'waveSize' }),
  Object.freeze({ label:'PRESSURE BUDGET', key:'pressureBudget' }),
  Object.freeze({ label:'AGGRESSION', key:'aggression' }),
  Object.freeze({ label:'IDLE RANGE', key:'idleRange' }),
  Object.freeze({ label:'ENEMY WINDUP', key:'windup' }),
  Object.freeze({ label:'AVALANCHE COOLDOWN', key:'cooldown' }),
  Object.freeze({ label:'AVALANCHE RECOVERY', key:'recovery' }),
  Object.freeze({ label:'AVALANCHE PURSUIT', key:'pursuit' }),
]);

const STORAGE_KEY='arena.aggressionPresetLevel';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function normalizeAggressionLevel(value){
  return clamp(Math.round(Number(value)||1),1,5);
}

export function aggressionPresetForLevel(value){
  return AGGRESSION_PRESETS[normalizeAggressionLevel(value)];
}

function sliderForLabel(container,label){
  return [...container.querySelectorAll('input[type="range"][aria-label]')]
    .find(input=>input.getAttribute('aria-label')===label)||null;
}

function setSliderValue(input,value){
  if(!input) return;
  const min=Number(input.min);
  const max=Number(input.max);
  const next=clamp(Number(value),Number.isFinite(min)?min:-Infinity,Number.isFinite(max)?max:Infinity);
  input.value=String(next);
  input.dispatchEvent(new Event('input',{bubbles:true}));
}

function readStoredLevel(){
  try{return normalizeAggressionLevel(globalThis.localStorage?.getItem(STORAGE_KEY)||1);}catch{return 1;}
}

function saveStoredLevel(level){
  try{globalThis.localStorage?.setItem(STORAGE_KEY,String(level));}catch{}
}

function installStyles(){
  if(document.getElementById('aggressionPresetStyles')) return;
  const style=document.createElement('style');
  style.id='aggressionPresetStyles';
  style.textContent=`
    #aggressionPresetBlock{margin:2px 0 18px}
    #aggressionPresetBlock .aggressionTitle{color:#4a6f6a;font-size:9px;letter-spacing:.2em;margin:10px 0 7px}
    #aggressionPresetBlock .aggressionScale{display:grid;grid-template-columns:repeat(5,1fr);color:#4a6f6a;font-size:8px;text-align:center;margin:-3px 7% 7px}
    #aggressionPresetBlock .aggressionNote{color:#7fb8b0;font-size:9px;line-height:1.45;min-height:27px;margin:0 4px 9px}
    #aggressionPresetBlock .aggressionNote.custom{color:#e8a04c}
    #aggressionDetails{border-top:1px solid #24403e;border-bottom:1px solid #24403e;padding:2px 0 0}
    #aggressionDetails summary{cursor:pointer;color:#7fb8b0;font-size:9px;letter-spacing:.12em;padding:8px 0;list-style:none}
    #aggressionDetails summary::-webkit-details-marker{display:none}
    #aggressionDetails summary::before{content:'▸ ';color:#e8a04c}
    #aggressionDetails[open] summary::before{content:'▾ '}
    #aggressionDetailRows{padding-top:8px}
    #aggressionDetailRows .aggressionSubhead{color:#4a6f6a;font-size:8px;letter-spacing:.16em;margin:3px 0 12px}
  `;
  document.head.appendChild(style);
}

function buildAggressionControls(container){
  const controls=new Map();
  for(const item of AGGRESSION_DETAIL_CONTROLS){
    const input=sliderForLabel(container,item.label);
    if(input) controls.set(item.key,input);
  }
  return controls;
}

export function installAggressionPresetControls(){
  if(typeof document==='undefined') return false;
  const container=document.getElementById('dirSliders');
  if(!container||document.getElementById('aggressionPresetBlock')) return false;

  const controls=buildAggressionControls(container);
  if(controls.size!==AGGRESSION_DETAIL_CONTROLS.length) return false;
  installStyles();

  const block=document.createElement('section');
  block.id='aggressionPresetBlock';

  const title=document.createElement('div');
  title.className='aggressionTitle';
  title.textContent='ENEMY AGGRESSION';

  const label=document.createElement('div');
  label.className='slabel';
  label.textContent='AGGRESSION PRESET ';
  const value=document.createElement('span');
  value.className='sval';
  label.appendChild(value);

  const presetSlider=document.createElement('input');
  presetSlider.id='aggressionPresetSlider';
  presetSlider.type='range';
  presetSlider.min='1';
  presetSlider.max='5';
  presetSlider.step='1';
  presetSlider.setAttribute('aria-label','Aggression Preset');

  const scale=document.createElement('div');
  scale.className='aggressionScale';
  scale.innerHTML='<span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>';

  const note=document.createElement('div');
  note.className='aggressionNote';

  const details=document.createElement('details');
  details.id='aggressionDetails';
  const summary=document.createElement('summary');
  summary.textContent='AGGRESSION DETAILS';
  const detailRows=document.createElement('div');
  detailRows.id='aggressionDetailRows';
  details.append(summary,detailRows);

  block.append(title,label,presetSlider,scale,note,details);
  container.insertBefore(block,container.firstChild);

  const pressureHeader=document.getElementById('pressureLabHeader');
  pressureHeader?.remove();
  for(const item of AGGRESSION_DETAIL_CONTROLS){
    const input=controls.get(item.key);
    const row=input?.closest('.srow');
    if(row) detailRows.appendChild(row);
    if(item.key==='idleRange'){
      const subhead=document.createElement('div');
      subhead.className='aggressionSubhead';
      subhead.textContent='ATTACK TIMING / PURSUIT';
      detailRows.appendChild(subhead);
    }
  }

  let applyingPreset=false;
  let activeLevel=readStoredLevel();

  const syncDisplay=(custom=false)=>{
    const preset=aggressionPresetForLevel(activeLevel);
    value.textContent=custom?'CUSTOM':`${activeLevel} / 5 · ${preset.label}`;
    note.textContent=custom
      ? `Custom detail override based on Level ${activeLevel}. Reset Fight applies any Wave Size change.`
      : `${preset.description} Reset Fight applies the selected Wave Size.`;
    note.classList.toggle('custom',custom);
  };

  const applyLevel=level=>{
    activeLevel=normalizeAggressionLevel(level);
    const preset=aggressionPresetForLevel(activeLevel);
    applyingPreset=true;
    for(const item of AGGRESSION_DETAIL_CONTROLS){
      setSliderValue(controls.get(item.key),preset[item.key]);
    }
    applyingPreset=false;
    presetSlider.value=String(activeLevel);
    saveStoredLevel(activeLevel);
    syncDisplay(false);
    globalThis.dispatchEvent?.(new CustomEvent('stone:aggression-preset-change',{detail:{level:activeLevel,preset}}));
  };

  presetSlider.addEventListener('input',()=>applyLevel(presetSlider.value));
  for(const input of controls.values()){
    input.addEventListener('input',()=>{
      if(!applyingPreset) syncDisplay(true);
    });
  }

  applyLevel(activeLevel);
  return true;
}

export function scheduleAggressionPresetControls(){
  if(typeof document==='undefined') return;
  let attempts=0;
  const tryInstall=()=>{
    attempts+=1;
    if(installAggressionPresetControls()||attempts>=120) return;
    if(typeof globalThis.requestAnimationFrame==='function') globalThis.requestAnimationFrame(tryInstall);
    else globalThis.setTimeout?.(tryInstall,0);
  };
  if(typeof queueMicrotask==='function') queueMicrotask(tryInstall);
  else Promise.resolve().then(tryInstall);
}
