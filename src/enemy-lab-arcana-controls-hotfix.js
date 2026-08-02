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

export function installEnemyLabArcanaControlsHotfix({windowRef=globalThis,document=globalThis.document}={}){
  if(!document||windowRef.__enemyLabArcanaControlsHotfixInstalled)return;
  windowRef.__enemyLabArcanaControlsHotfixInstalled=true;

  const parentDocument=document;

  const state={arcanaFilter:false,queued:false};
  const queue=callback=>typeof queueMicrotask==='function'?queueMicrotask(callback):setTimeout(callback,0);
  const setMessage=text=>{const message=parentDocument.getElementById('message');if(message)setTextIfChanged(message,text);};

  if(!parentDocument.getElementById('enemyLabArcanaFilterHotfixStyles')){
    const style=parentDocument.createElement('style');
    style.id='enemyLabArcanaFilterHotfixStyles';
    style.textContent=`
      .deckEditorRoot.wizardArcanaOnly .deckCardTile:not(.wizardArcanaCard){display:none!important}
      .deckEditorRoot.wizardArcanaOnly .deckFamilyBtn[data-wizard-arcana-family]{border-color:#ffd09a;color:#ffd09a;background:rgba(255,117,47,.14)}
      .deckEditorRoot.wizardArcanaOnly .deckFamilyBtn:not([data-wizard-arcana-family]){border-color:var(--line);color:var(--text);background:rgba(16,38,40,.95)}
    `;
    parentDocument.head.appendChild(style);
  }

  function editor(){return windowRef.__enemyLabDeckEditor||null;}
  function browseRoot(){return parentDocument.querySelector('.deckEditorRoot[data-view="browse"]');}
  function arcanaButton(root){
    let button=root?.querySelector('[data-wizard-arcana-family]');
    if(button)return button;
    button=[...(root?.querySelectorAll('.deckFamilyBtn')||[])].find(item=>item.textContent.trim()==='WIZARD ARCANA')||null;
    if(button)button.dataset.wizardArcanaFamily='1';
    return button;
  }

  function markArcanaTiles(root,deckEditor){
    const byId=new Map(deckEditor.catalog.map(card=>[card.id,card]));
    for(const tile of root.querySelectorAll('.deckCardTile')){
      tile.classList.toggle('wizardArcanaCard',isWizardArcana(byId.get(tile.dataset.cardId)));
    }
  }

  function applyFilter(){
    const root=browseRoot(),deckEditor=editor();
    if(!root||!deckEditor)return;
    const button=arcanaButton(root);
    markArcanaTiles(root,deckEditor);
    root.classList.toggle('wizardArcanaOnly',state.arcanaFilter);
    button?.classList.toggle('on',state.arcanaFilter);

    if(!state.arcanaFilter)return;
    const arcana=deckEditor.catalog.filter(isWizardArcana),selected=new Set(deckEditor.cardIds);
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
    const arcana=event.target.closest?.('.deckFamilyBtn[data-wizard-arcana-family]');
    if(arcana){
      event.preventDefault();event.stopImmediatePropagation();
      state.arcanaFilter=true;applyFilter();return;
    }

    const coreFamily=event.target.closest?.('.deckFamilyBtn:not([data-wizard-arcana-family])');
    if(coreFamily){state.arcanaFilter=false;browseRoot()?.classList.remove('wizardArcanaOnly');}

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
  windowRef.__enemyLabArcanaHotfix={
    get filtering(){return state.arcanaFilter;},
    setDamage:damageMultiplier=>writeArcanaTweaks({damageMultiplier}),
  };
  queueApply();
}
