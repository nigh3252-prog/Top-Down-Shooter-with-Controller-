import {
  ARCANA_DAMAGE_MAX,
  ARCANA_DAMAGE_MIN,
  ARCANA_DAMAGE_STEP,
  readArcanaTweaks,
  writeArcanaTweaks,
} from './wizard-arcana-settings.js';

function isWizardArcana(card){
  return card?.sourceGame==='Wizard of Legend'&&typeof card?.arcanaId==='string';
}

export function setTextIfChanged(node,text){
  if(!node||node.textContent===text)return false;
  node.textContent=text;
  return true;
}

export function installEnemyLabArcanaControlsHotfix(){
  if(typeof window==='undefined'||window.__enemyLabArcanaControlsHotfixInstalled)return;
  window.__enemyLabArcanaControlsHotfixInstalled=true;

  let parentDocument;
  try{parentDocument=window.parent?.document;}catch{return;}
  if(!parentDocument||window.parent===window)return;

  const state={arcanaFilter:false,queued:false};
  const queue=callback=>typeof queueMicrotask==='function'?queueMicrotask(callback):setTimeout(callback,0);
  const setMessage=text=>{const message=parentDocument.getElementById('message');if(message)setTextIfChanged(message,text);};

  function editor(){return window.__enemyLabDeckEditor||null;}
  function browseRoot(){return parentDocument.querySelector('.deckEditorRoot[data-view="browse"]');}

  function replaceArcanaButton(root){
    const current=root?.querySelector('[data-wizard-arcana-family]');
    if(!current)return null;
    if(current.dataset.arcanaFilterHotfixed==='1')return current;
    const button=current.cloneNode(true);
    button.dataset.arcanaFilterHotfixed='1';
    current.replaceWith(button);
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      state.arcanaFilter=true;
      applyFilter();
    });
    return button;
  }

  function applyFilter(){
    const root=browseRoot(),deckEditor=editor();
    if(!root||!deckEditor)return;
    const button=replaceArcanaButton(root);
    const byId=new Map(deckEditor.catalog.map(card=>[card.id,card]));
    const arcana=deckEditor.catalog.filter(isWizardArcana);
    const selected=new Set(deckEditor.cardIds);

    if(!state.arcanaFilter){
      button?.classList.remove('on');
      return;
    }

    for(const coreButton of root.querySelectorAll('.deckFamilyBtn:not([data-wizard-arcana-family])'))coreButton.classList.remove('on');
    button?.classList.add('on');
    for(const tile of root.querySelectorAll('.deckCardTile')){
      tile.style.display=isWizardArcana(byId.get(tile.dataset.cardId))?'':'none';
    }

    const summary=root.querySelector('.deckEditorSummary strong');
    setTextIfChanged(summary,`${arcana.length} SHOWN`);

    const batch=root.querySelector('.deckBatchBtn');
    if(batch){
      const missing=arcana.filter(card=>!selected.has(card.id));
      batch.dataset.safeArcanaBatch='1';
      setTextIfChanged(batch,missing.length?`ADD SHOWN · ${missing.length}`:'ALL SHOWN ADDED');
      batch.disabled=!missing.length;
    }
  }

  function queueApply(){
    if(state.queued)return;
    state.queued=true;
    queue(()=>{state.queued=false;applyFilter();ensureDamageControls();});
  }

  function makePresetButton(value,sync){
    const button=parentDocument.createElement('button');
    button.type='button';button.className='arcanaPresetBtn';button.dataset.damage=String(value);button.textContent=`${value}×`;
    button.addEventListener('click',()=>{const settings=sync(value);setMessage(`Arcana damage set to ${settings.damageMultiplier.toFixed(2)}×.`);});
    return button;
  }

  function ensureDamageSummary(){
    const rows=parentDocument.querySelector('.arcanaTweaksSide .arcanaTweaksValueList');
    if(!rows)return;
    for(const row of rows.querySelectorAll('.arcanaTweaksValueRow')){
      const label=row.querySelector('span'),value=row.querySelector('strong');
      if(label?.textContent==='UNCHANGED')setTextIfChanged(value,'Speed, range, cadence, and control strength');
    }
    if(rows.querySelector('.arcanaDamageSummaryRow'))return;
    const row=parentDocument.createElement('div');row.className='arcanaTweaksValueRow arcanaDamageSummaryRow';
    const label=parentDocument.createElement('span');label.textContent='DAMAGE';
    const value=parentDocument.createElement('strong');value.textContent='All Wizard Arcana direct and tick damage';
    row.append(label,value);rows.appendChild(row);
  }

  function ensureDamageControls(){
    const stack=parentDocument.querySelector('.arcanaTweaksMain .arcanaTweaksStack');
    if(!stack)return;
    ensureDamageSummary();
    if(stack.querySelector('[data-arcana-damage-card]'))return;

    const current=readArcanaTweaks();
    const card=parentDocument.createElement('section');card.className='arcanaTweaksCard';card.dataset.arcanaDamageCard='1';
    const heading=parentDocument.createElement('h3');heading.textContent='ARCANA DAMAGE';
    const readout=parentDocument.createElement('div');readout.className='arcanaSizeReadout';
    const label=parentDocument.createElement('b');label.textContent='DAMAGE MULTIPLIER';
    const output=parentDocument.createElement('output');
    const slider=parentDocument.createElement('input');slider.className='arcanaSizeSlider';slider.type='range';
    slider.min=String(ARCANA_DAMAGE_MIN);slider.max=String(ARCANA_DAMAGE_MAX);slider.step=String(ARCANA_DAMAGE_STEP);slider.setAttribute('aria-label','Wizard Arcana damage multiplier');
    const track=parentDocument.createElement('div');track.className='arcanaSizeTrack';
    const fill=parentDocument.createElement('div');fill.className='arcanaSizeFill';track.appendChild(fill);
    const presetRow=parentDocument.createElement('div');presetRow.className='arcanaPresetRow';
    const presetButtons=[];

    const sync=value=>{
      const settings=writeArcanaTweaks({damageMultiplier:value});
      slider.value=String(settings.damageMultiplier);
      const text=`${settings.damageMultiplier.toFixed(2)}×`;
      output.value=text;setTextIfChanged(output,text);
      fill.style.width=`${settings.damageMultiplier/ARCANA_DAMAGE_MAX*100}%`;
      for(const button of presetButtons)button.classList.toggle('on',Number(button.dataset.damage)===settings.damageMultiplier);
      return settings;
    };

    for(const value of[1,2,3,5]){const button=makePresetButton(value,sync);presetButtons.push(button);presetRow.appendChild(button);}
    slider.addEventListener('input',()=>sync(Number(slider.value)));
    slider.addEventListener('change',()=>setMessage(`Arcana damage set to ${Number(slider.value).toFixed(2)}×.`));
    readout.append(label,output);
    const note=parentDocument.createElement('p');note.textContent='Multiplies damage dealt by Wizard Arcana from 1× to 5×. Size, speed, range, cadence, knockback, capture duration, and pull strength stay unchanged.';
    card.append(heading,readout,slider,track,presetRow,note);
    stack.appendChild(card);
    sync(current.damageMultiplier);
  }

  parentDocument.addEventListener('click',event=>{
    const coreFamily=event.target.closest?.('.deckFamilyBtn:not([data-wizard-arcana-family])');
    if(coreFamily)state.arcanaFilter=false;

    const batch=event.target.closest?.('.deckBatchBtn[data-safe-arcana-batch="1"]');
    if(batch&&state.arcanaFilter){
      event.preventDefault();event.stopImmediatePropagation();
      const deckEditor=editor(),selected=new Set(deckEditor?.cardIds||[]);
      for(const card of deckEditor?.catalog||[]){if(isWizardArcana(card)&&!selected.has(card.id)){deckEditor.add(card.id);selected.add(card.id);}}
      queueApply();
    }
  },true);

  const values=parentDocument.getElementById('labValues');
  if(values)new MutationObserver(queueApply).observe(values,{childList:true,subtree:true});
  window.__enemyLabArcanaHotfix={
    get filtering(){return state.arcanaFilter;},
    setDamage:damageMultiplier=>writeArcanaTweaks({damageMultiplier}),
  };
  queueApply();
}
