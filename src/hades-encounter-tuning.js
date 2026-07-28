import { HADES_ENEMY_ARCHETYPES, HADES_TARTARUS_POOL_ID } from './hades-enemies.js';

export const HADES_SPAWN_MULTIPLIERS = Object.freeze([1,2,5,10]);
export const HADES_DIFFICULTY_RAMP_PRESETS = Object.freeze({
  slow:Object.freeze({ id:'slow', label:'Slow · Current', depthScale:1 }),
  medium:Object.freeze({ id:'medium', label:'Medium', depthScale:2 }),
  high:Object.freeze({ id:'high', label:'High', depthScale:4 }),
});

const STORAGE_KEYS = Object.freeze({
  spawnMultiplier:'arena.hadesSpawnMultiplier',
  difficultyRamp:'arena.hadesDifficultyRamp',
});
const BASE_MAX_ACTIVE = new Map(Object.entries(HADES_ENEMY_ARCHETYPES).map(([id,def])=>[id,Math.max(1,Math.round(def.maxActive||1))]));

function readStored(key,fallback){
  if(typeof localStorage==='undefined')return fallback;
  try{
    const value=localStorage.getItem(key);
    return value===null?fallback:value;
  }catch{return fallback;}
}
function writeStored(key,value){
  if(typeof localStorage==='undefined')return;
  try{localStorage.setItem(key,String(value));}catch{}
}

export function normalizeHadesSpawnMultiplier(value){
  const numeric=Number(value);
  return HADES_SPAWN_MULTIPLIERS.includes(numeric)?numeric:1;
}
export function normalizeHadesDifficultyRamp(value){
  const id=String(value||'slow').toLowerCase();
  return HADES_DIFFICULTY_RAMP_PRESETS[id]?id:'slow';
}

let desiredSpawnMultiplier=normalizeHadesSpawnMultiplier(readStored(STORAGE_KEYS.spawnMultiplier,1));
let desiredDifficultyRamp=normalizeHadesDifficultyRamp(readStored(STORAGE_KEYS.difficultyRamp,'slow'));
let nativeModeActive=false;

export function getHadesProgressionDepth(depth,rampId=desiredDifficultyRamp){
  const safeDepth=Math.max(1,Math.round(Number(depth))||1);
  const ramp=HADES_DIFFICULTY_RAMP_PRESETS[normalizeHadesDifficultyRamp(rampId)];
  return Math.max(1,Math.round(1+(safeDepth-1)*ramp.depthScale));
}

function applyMaxActiveMultiplier(multiplier){
  const safe=normalizeHadesSpawnMultiplier(multiplier);
  for(const [id,base] of BASE_MAX_ACTIVE){
    HADES_ENEMY_ARCHETYPES[id].maxActive=Math.max(1,Math.round(base*safe));
  }
}

export function getHadesEncounterSpawnMultiplier(){return desiredSpawnMultiplier;}
export function getHadesEncounterDifficultyRamp(){return desiredDifficultyRamp;}
export function setHadesEncounterSpawnMultiplier(value,{persist=true}={}){
  desiredSpawnMultiplier=normalizeHadesSpawnMultiplier(value);
  if(persist)writeStored(STORAGE_KEYS.spawnMultiplier,desiredSpawnMultiplier);
  if(nativeModeActive)applyMaxActiveMultiplier(desiredSpawnMultiplier);
  syncControlAvailability();
  return desiredSpawnMultiplier;
}
export function setHadesEncounterDifficultyRamp(value,{persist=true}={}){
  desiredDifficultyRamp=normalizeHadesDifficultyRamp(value);
  if(persist)writeStored(STORAGE_KEYS.difficultyRamp,desiredDifficultyRamp);
  syncControlAvailability();
  return desiredDifficultyRamp;
}
export function setHadesNativeModeActive(value){
  nativeModeActive=!!value;
  applyMaxActiveMultiplier(nativeModeActive?desiredSpawnMultiplier:1);
  syncControlAvailability();
  return nativeModeActive;
}
export function isHadesNativeModeActive(){return nativeModeActive;}

let controlsInstalled=false;
function resetFightAndKeepMenuOpen(){
  if(typeof document==='undefined')return;
  const panel=document.getElementById('panel');
  const resetButton=document.getElementById('resetBtn');
  if(!resetButton)return;
  const wasOpen=!!panel&&!panel.classList.contains('hidden');
  resetButton.click();
  if(wasOpen&&panel?.classList.contains('hidden')){
    setTimeout(()=>document.getElementById('menuBtn')?.click(),0);
  }
}
function makeSelectRow(id,label,options,value){
  const row=document.createElement('div');
  row.className='selectRow';
  const lab=document.createElement('label');
  lab.htmlFor=id;
  lab.textContent=label;
  const select=document.createElement('select');
  select.id=id;
  for(const optionDef of options){
    const option=document.createElement('option');
    option.value=String(optionDef.value);
    option.textContent=optionDef.label;
    select.appendChild(option);
  }
  select.value=String(value);
  row.append(lab,select);
  return {row,select};
}
function syncDirectorControls(){
  if(typeof document==='undefined')return;
  const enabled=!nativeModeActive;
  const modeGrid=document.getElementById('modeGrid');
  if(modeGrid){
    let status=document.getElementById('combatDirectorStatus');
    if(!status){
      status=document.createElement('div');
      status.id='combatDirectorStatus';
      status.style.cssText='margin:0 0 8px;padding:7px 8px;border:1px solid #24403e;border-radius:5px;color:#7fb8b0;font-size:9px;line-height:1.4;letter-spacing:.05em';
      modeGrid.parentElement?.insertBefore(status,modeGrid);
    }
    status.textContent=enabled?'COMBAT DIRECTOR: ON':'COMBAT DIRECTOR: OFF — TARTARUS NATIVE BEHAVIOR';
    status.style.color=enabled?'#7fb8b0':'#e8a04c';
    status.style.borderColor=enabled?'#24403e':'#6e3a24';
    modeGrid.style.opacity=enabled?'1':'.38';
    modeGrid.querySelectorAll('button').forEach(button=>{button.disabled=!enabled;});
  }
  for(const row of document.querySelectorAll('#dirSliders .srow')){
    const label=row.querySelector('.slabel')?.textContent?.trim()||'';
    if(!label.startsWith('PRESSURE BUDGET'))continue;
    row.style.opacity=enabled?'1':'.38';
    const input=row.querySelector('input');
    if(input)input.disabled=!enabled;
  }
}
function syncControlAvailability(){
  if(typeof document==='undefined')return;
  const wrapper=document.getElementById('hadesEncounterTuning');
  if(wrapper){
    wrapper.style.opacity=nativeModeActive?'1':'.42';
    wrapper.querySelectorAll('select').forEach(select=>{select.disabled=!nativeModeActive;});
    const note=document.getElementById('hadesTuningNote');
    if(note)note.textContent=nativeModeActive?'TARTARUS MIX · CHANGES RESET THE FIGHT':'TARTARUS MIX ONLY';
    const countSelect=document.getElementById('hadesSpawnMultiplierSelect');
    const rampSelect=document.getElementById('hadesDifficultyRampSelect');
    if(countSelect)countSelect.value=String(desiredSpawnMultiplier);
    if(rampSelect)rampSelect.value=desiredDifficultyRamp;
  }
  syncDirectorControls();
}
function syncNativeModeFromEnemySelection(){
  const spawnSelect=document.getElementById('spawnSelect');
  setHadesNativeModeActive(spawnSelect?.value===HADES_TARTARUS_POOL_ID);
}

export function installHadesEncounterTuningControls(){
  if(controlsInstalled||typeof document==='undefined')return false;
  const simBody=document.getElementById('body-sim');
  const spawnSelect=document.getElementById('spawnSelect');
  const sliderBox=document.getElementById('dirSliders');
  if(!simBody||!spawnSelect||!sliderBox)return false;
  controlsInstalled=true;

  const wrapper=document.createElement('div');
  wrapper.id='hadesEncounterTuning';
  wrapper.setAttribute('aria-label','Tartarus encounter tuning');
  const note=document.createElement('div');
  note.id='hadesTuningNote';
  note.className='ptitle';
  note.style.cssText='margin:2px 0 8px;line-height:1.4';

  const count=makeSelectRow('hadesSpawnMultiplierSelect','TARTARUS ENEMY COUNT',[
    {value:1,label:'Low · 1× (Default)'},
    {value:2,label:'2× Enemies'},
    {value:5,label:'5× Enemies'},
    {value:10,label:'10× Enemies'},
  ],desiredSpawnMultiplier);
  const ramp=makeSelectRow('hadesDifficultyRampSelect','TARTARUS DIFFICULTY RAMP',[
    {value:'slow',label:'Slow · Current'},
    {value:'medium',label:'Medium'},
    {value:'high',label:'High'},
  ],desiredDifficultyRamp);

  count.select.addEventListener('change',()=>{
    setHadesEncounterSpawnMultiplier(count.select.value);
    resetFightAndKeepMenuOpen();
  });
  ramp.select.addEventListener('change',()=>{
    setHadesEncounterDifficultyRamp(ramp.select.value);
    resetFightAndKeepMenuOpen();
  });
  spawnSelect.addEventListener('change',()=>setTimeout(syncNativeModeFromEnemySelection,0));

  wrapper.append(note,count.row,ramp.row);
  simBody.insertBefore(wrapper,sliderBox);
  syncNativeModeFromEnemySelection();
  return true;
}

if(typeof document!=='undefined'){
  if(typeof queueMicrotask==='function')queueMicrotask(installHadesEncounterTuningControls);
  else setTimeout(installHadesEncounterTuningControls,0);
}
