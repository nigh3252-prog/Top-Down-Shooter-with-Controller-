import { StoneSettings } from './settings.js';

export const CATCH_RING_SIZE_SETTING='arena.stance2.catchRingSizeMultiplier';

export function clampCatchRingSize(value){
  return Math.max(1,Math.min(5,Math.round(Number(value)||1)));
}

function findCatchRing(PC){
  const root=PC?.combatLayer?.parent?.parent?.parent||PC?.combatLayer?.parent?.parent||null;
  return root?.getObjectByName?.('Stance Catch Ring')||null;
}

function installControl(document,{initialValue,onChange}={}){
  if(!document)return{destroy(){},setValue(){}};
  const body=document.getElementById('body-stance2Gate4');
  if(!body)return{destroy(){},setValue(){}};
  document.getElementById('stanceCatchRingSizeRow')?.remove();
  document.getElementById('stanceCatchRingSizeNote')?.remove();

  const row=document.createElement('div');
  row.className='srow';
  row.id='stanceCatchRingSizeRow';
  const label=document.createElement('div');
  label.className='slabel';
  const value=document.createElement('span');
  value.className='sval';
  label.textContent='CATCH RING SIZE ';
  label.appendChild(value);
  const input=document.createElement('input');
  input.type='range';
  input.min='1';
  input.max='5';
  input.step='1';
  input.setAttribute('aria-label','Catch Ring size multiplier');
  row.append(label,input);

  const note=document.createElement('div');
  note.className='stance2ControlNote';
  note.id='stanceCatchRingSizeNote';
  note.textContent='Scales the player-attached Catch Ring and opening flash from ×1 to ×5.';
  body.append(row,note);

  const syncValue=raw=>{
    const multiplier=clampCatchRingSize(raw);
    input.value=String(multiplier);
    value.textContent=`×${multiplier}`;
    return multiplier;
  };
  syncValue(initialValue);
  input.addEventListener('input',()=>onChange(syncValue(input.value)));
  return{
    setValue:syncValue,
    destroy(){row.remove();note.remove();},
  };
}

export function installStanceGate4RingSize({windowRef=globalThis.window,pollMs=150}={}){
  if(!windowRef)return{installed:false,reason:'missing-window'};
  if(windowRef.__stance2Gate4RingSize?.installed)return windowRef.__stance2Gate4RingSize;
  const PC=windowRef.__arena?.PC;
  if(!PC)return{installed:false,reason:'missing-arena'};

  let multiplier=clampCatchRingSize(StoneSettings.get(CATCH_RING_SIZE_SETTING,1));
  let destroyed=false;
  let timer=0;
  let ring=null;

  function apply(){
    if(destroyed)return false;
    ring=findCatchRing(PC)||ring;
    if(!ring)return false;
    ring.scale.setScalar(multiplier);
    return true;
  }
  function setMultiplier(value){
    multiplier=clampCatchRingSize(value);
    StoneSettings.set(CATCH_RING_SIZE_SETTING,multiplier);
    control.setValue(multiplier);
    apply();
    return multiplier;
  }

  const control=installControl(windowRef.document,{initialValue:multiplier,onChange:setMultiplier});
  apply();
  timer=windowRef.setInterval?.(apply,pollMs)||0;

  const api={
    installed:true,
    get multiplier(){return multiplier;},
    setMultiplier,
    apply,
    destroy(){
      destroyed=true;
      if(timer)windowRef.clearInterval?.(timer);
      if(ring)ring.scale.setScalar(1);
      control.destroy();
      if(windowRef.__stance2Gate4RingSize===api)delete windowRef.__stance2Gate4RingSize;
    },
  };
  windowRef.__stance2Gate4RingSize=api;
  return api;
}
