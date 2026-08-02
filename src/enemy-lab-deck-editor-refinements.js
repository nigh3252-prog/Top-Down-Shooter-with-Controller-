import {
  ARCANA_SIZE_MAX,
  ARCANA_SIZE_MIN,
  ARCANA_SIZE_STEP,
  readArcanaTweaks,
  writeArcanaTweaks,
} from './wizard-arcana-settings.js';
import { getArenaRuntime } from './arena-runtime-context.js';

function isNonStance(card){return card?.type==='ability'||card?.type==='modifier';}
function isWizardArcana(card){return card?.sourceGame==='Wizard of Legend'&&typeof card?.arcanaId==='string';}
function cleanCardName(card){return String(card?.name||card?.id||'CARD').replace(/^S\d+\s*/, '');}

export function claimArcanaTileDecoration(tile,card){
  if(!tile?.dataset||!isWizardArcana(card))return false;
  const key=String(card.id||card.arcanaId||'wizard-arcana');
  if(tile.dataset.wizardArcanaDecorated===key)return false;
  tile.dataset.wizardArcanaDecorated=key;
  return true;
}

export function wizardArcanaCards(catalog=[]){
  return catalog.filter(isWizardArcana);
}

export function installEnemyLabDeckEditorRefinements(){
  if(typeof window==='undefined'||window.__enemyLabDeckEditorRefinementsInstalled)return;
  window.__enemyLabDeckEditorRefinementsInstalled=true;
  const parentWindow=window,parentDocument=document;

  const state={arcanaFamily:false,tweaksOpen:false,suppressCoreFamily:false};
  const styleId='enemyLabDeckEditorRefinementStyles';
  if(!parentDocument.getElementById(styleId)){
    const style=parentDocument.createElement('style');
    style.id=styleId;
    style.textContent=`
      .deckEditorCardsPane,.deckEditorControlsPane{scrollbar-gutter:stable}
      #labDock.deckEditorMode .deckEditorControlsPane{padding-right:12px}
      .deckCardTile.wizardArcanaCard{border-color:color-mix(in srgb,var(--arcana-color,#e8a04c) 68%,#31504d);background:color-mix(in srgb,var(--arcana-color,#e8a04c) 8%,rgba(16,38,40,.58))}
      .deckCardTile.wizardArcanaCard .deckCardFamily{color:var(--arcana-color,#e8a04c)}
      .deckCardTile.wizardArcanaCard .deckCardDetailRow b{color:var(--arcana-color,#e8a04c)}
      .deckFamilyBtn.arcanaFamilyBtn{border-color:rgba(255,139,61,.72);color:#ffad69}
      .deckFamilyBtn.arcanaFamilyBtn.on{border-color:#ffd09a;color:#ffd09a;background:rgba(255,117,47,.14)}
      #labCategories .arcanaTweaksCategory{border-color:#a85b35;color:#ffc27e;background:rgba(121,54,25,.22)}
      #labCategories .arcanaTweaksCategory.on{border-color:#ffd09a;color:#fff0d8;background:rgba(180,79,31,.36)}
      .arcanaTweaksRoot{display:grid;grid-template-columns:minmax(280px,1fr) minmax(176px,220px);width:100%;height:100%;min-width:0;min-height:0;overflow:hidden;background:rgba(0,0,0,.05)}
      .arcanaTweaksMain,.arcanaTweaksSide{min-width:0;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;scrollbar-gutter:stable;padding:10px}
      .arcanaTweaksSide{border-left:1px solid rgba(49,80,77,.72);background:rgba(4,14,16,.72)}
      .arcanaTweaksStack{display:flex;flex-direction:column;gap:10px}
      .arcanaTweaksCard{display:flex;flex-direction:column;gap:10px;padding:12px;border:1px solid rgba(122,74,44,.88);border-radius:9px;background:rgba(31,20,15,.82)}
      .arcanaTweaksCard h3{margin:0;color:#ffc27e;font-size:11px;letter-spacing:.12em}
      .arcanaTweaksCard p{margin:0;color:var(--muted);font-size:8.5px;line-height:1.5}
      .arcanaSizeReadout{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
      .arcanaSizeReadout b{color:var(--text);font-size:10px;letter-spacing:.08em}
      .arcanaSizeReadout output{color:#ffb15e;font-size:23px;font-weight:900;line-height:1}
      .arcanaSizeSlider{width:100%;height:38px;accent-color:#ff8b3d;touch-action:pan-x}
      .arcanaPresetRow{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
      .arcanaPresetBtn{min-height:36px;border:1px solid #6e432c;border-radius:7px;background:rgba(67,34,20,.75);color:#ffc27e;font-size:9px;touch-action:manipulation}
      .arcanaPresetBtn.on{border-color:#ffd09a;color:#fff1dc;background:rgba(174,72,26,.42)}
      .arcanaSizeTrack{height:18px;border:1px solid rgba(89,120,114,.72);border-radius:10px;background:rgba(4,13,15,.8);overflow:hidden}
      .arcanaSizeFill{height:100%;width:20%;border-radius:9px;background:linear-gradient(90deg,#ff6a2c,#ffd36d);transition:width .08s linear}
      .arcanaTweaksValueList{display:flex;flex-direction:column;gap:6px}
      .arcanaTweaksValueRow{display:flex;justify-content:space-between;gap:10px;color:var(--muted);font-size:8px;line-height:1.35}
      .arcanaTweaksValueRow strong{color:var(--text)}
      @media (orientation:landscape){
        #labDock.deckEditorMode{width:min(72vw,940px)!important}
        #labDock.deckEditorMode .deckEditorRoot,#labDock.arcanaTweaksMode .arcanaTweaksRoot{grid-template-columns:minmax(300px,1fr) minmax(196px,244px);column-gap:2px}
      }
      @media (orientation:portrait){
        .arcanaTweaksRoot{grid-template-columns:minmax(160px,1fr) minmax(126px,40%)}
        .arcanaTweaksMain,.arcanaTweaksSide{padding:7px}
        .arcanaPresetRow{grid-template-columns:repeat(2,1fr)}
      }
    `;
    parentDocument.head.appendChild(style);
  }

  const setMessage=text=>{
    const message=parentDocument.getElementById('message');
    if(message)message.textContent=text;
  };
  const queue=callback=>typeof queueMicrotask==='function'?queueMicrotask(callback):setTimeout(callback,0);

  const decorateArcanaTile=(tile,card)=>{
    if(!claimArcanaTileDecoration(tile,card))return;
    tile.classList.add('wizardArcanaCard');
    tile.style.setProperty('--arcana-color',card.uiColor||'#e8a04c');
    const family=tile.querySelector('.deckCardFamily');if(family&&family.textContent!=='WIZARD ARCANA')family.textContent='WIZARD ARCANA';
    const description=tile.querySelector('.deckCardDescription'),descriptionText=card.description||'';
    if(description&&description.textContent!==descriptionText)description.textContent=descriptionText;
    const summary=tile.querySelector('.deckCardDetailSummary'),summaryText=card.details?.summary||descriptionText;
    if(summary&&summary.textContent!==summaryText)summary.textContent=summaryText;
    const rows=tile.querySelector('.deckCardDetailRows');
    if(rows&&Array.isArray(card.details?.rows)){
      const fragment=parentDocument.createDocumentFragment();
      for(const [label,value] of card.details.rows){
        const row=parentDocument.createElement('div');row.className='deckCardDetailRow';
        const heading=parentDocument.createElement('b');heading.textContent=label;
        const text=parentDocument.createElement('span');text.textContent=value;
        row.append(heading,text);fragment.appendChild(row);
      }
      rows.replaceChildren(fragment);
    }
  };

  function ensureArcanaFamilyButton(root,editor){
    const familyBar=root?.querySelector('.deckFamilyBar');
    if(!familyBar)return null;
    let button=familyBar.querySelector('[data-wizard-arcana-family]');
    if(!button){
      button=parentDocument.createElement('button');
      button.type='button';button.className='deckFamilyBtn arcanaFamilyBtn';button.dataset.wizardArcanaFamily='1';button.textContent='WIZARD ARCANA';
      button.addEventListener('click',event=>{
        event.preventDefault();event.stopPropagation();
        state.arcanaFamily=true;
        const all=[...familyBar.querySelectorAll('.deckFamilyBtn')].find(item=>item.textContent.trim()==='ALL');
        if(editor.family!=='ALL'&&all){
          state.suppressCoreFamily=true;
          all.click();
          queue(()=>{state.suppressCoreFamily=false;queueDecoration();});
        }else queueDecoration();
      });
      const stance=[...familyBar.querySelectorAll('.deckFamilyBtn')].find(item=>item.textContent.trim()==='STANCES');
      if(stance?.nextSibling)familyBar.insertBefore(button,stance.nextSibling);else familyBar.appendChild(button);
    }
    return button;
  }

  function addCurrentDeckArcanaCount(root,editor){
    if(root?.dataset.view!=='deck')return;
    const countList=root.querySelector('.deckCountList');
    if(!countList||countList.querySelector('.wizardArcanaCountRow'))return;
    const cardsById=new Map(editor.catalog.map(card=>[card.id,card]));
    const count=editor.cardIds.reduce((total,id)=>total+(isWizardArcana(cardsById.get(id))?1:0),0);
    const row=parentDocument.createElement('div');row.className='deckCountRow wizardArcanaCountRow';
    const label=parentDocument.createElement('span');label.textContent='WIZARD ARCANA';
    const value=parentDocument.createElement('strong');value.textContent=String(count);
    row.append(label,value);countList.appendChild(row);
  }

  function applyArcanaFamilyFilter(root,editor){
    if(root?.dataset.view!=='browse')return;
    const button=ensureArcanaFamilyButton(root,editor);
    const catalog=editor.catalog,byId=new Map(catalog.map(card=>[card.id,card]));
    const arcana=wizardArcanaCards(catalog),selected=new Set(editor.cardIds);
    const active=state.arcanaFamily&&editor.family==='ALL';
    if(button)button.classList.toggle('on',active);
    if(active){
      for(const coreButton of root.querySelectorAll('.deckFamilyBtn:not([data-wizard-arcana-family])'))coreButton.classList.remove('on');
    }
    for(const tile of root.querySelectorAll('.deckCardTile')){
      const card=byId.get(tile.dataset.cardId);
      tile.style.display=!active||isWizardArcana(card)?'':'none';
    }
    const summary=root.querySelector('.deckEditorSummary strong');
    if(active&&summary)summary.textContent=`${arcana.length} SHOWN`;
    const batch=root.querySelector('.deckBatchBtn');
    if(batch){
      if(active){
        const missing=arcana.filter(card=>!selected.has(card.id));
        batch.dataset.arcanaBatch='1';batch.textContent=missing.length?`ADD SHOWN · ${missing.length}`:'ALL SHOWN ADDED';batch.disabled=!missing.length;
      }else delete batch.dataset.arcanaBatch;
    }
  }

  function decorateEditor(values){
    if(state.tweaksOpen)return;
    const editor=window.__enemyLabDeckEditor;
    const root=values.querySelector('.deckEditorRoot');
    if(!editor||!root)return;

    const catalog=editor.catalog;
    const byId=new Map(catalog.map(card=>[card.id,card]));
    const selectedIds=editor.cardIds;
    const selected=new Set(selectedIds);
    const stanceCount=selectedIds.reduce((count,id)=>count+(!isNonStance(byId.get(id))?1:0),0);
    const browse=root.dataset.view==='browse';

    for(const tile of root.querySelectorAll('.deckCardTile')){
      const id=tile.dataset.cardId,card=byId.get(id);
      if(!id||!card)continue;
      decorateArcanaTile(tile,card);
      if(!browse)continue;
      const button=tile.querySelector('.deckCardAction');
      if(!button)continue;

      if(!selected.has(id)){
        delete button.dataset.browseDeckAction;
        button.classList.remove('remove');
        continue;
      }

      const required=!isNonStance(card)&&stanceCount<=1;
      const label=required?'REQUIRED':'REMOVE';
      if(button.textContent!==label)button.textContent=label;
      button.disabled=required;
      button.classList.add('remove');
      button.dataset.browseDeckAction=required?'required':'remove';
      button.setAttribute('aria-label',required
        ?`${cleanCardName(card)} is the required final stance`
        :`Remove ${cleanCardName(card)} from the deck`);
    }
    applyArcanaFamilyFilter(root,editor);
    addCurrentDeckArcanaCount(root,editor);
  }

  function makeTweaksCard(title){
    const card=parentDocument.createElement('section');card.className='arcanaTweaksCard';
    const heading=parentDocument.createElement('h3');heading.textContent=title;card.appendChild(heading);return card;
  }

  function renderArcanaTweaks({mount=true}={}){
    const sectionRegistry=getArenaRuntime()?.sectionRegistry||null;
    const dock=parentDocument.getElementById('labDock');
    const values=sectionRegistry?null:parentDocument.getElementById('labValues');
    const categories=sectionRegistry?null:parentDocument.getElementById('labCategories');
    if(!dock||(!sectionRegistry&&(!values||!categories)))return null;
    const editor=window.__enemyLabDeckEditor;
    if(editor?.activeView&&!sectionRegistry){
      state.tweaksOpen=false;
      const baseCategory=categories.querySelector('.choice:not([data-deck-editor-category]):not([data-arcana-tweaks-category])');
      baseCategory?.click();
    }
    state.tweaksOpen=true;state.arcanaFamily=false;
    if(!sectionRegistry){
      dock.classList.add('deckEditorMode','arcanaTweaksMode');values.classList.add('deckEditorActive');
      for(const choice of categories.querySelectorAll('.choice'))choice.classList.toggle('on',choice.hasAttribute('data-arcana-tweaks-category'));
    }
    const hint=parentDocument.getElementById('categoryHint');if(hint)hint.textContent='Scale Wizard Arcana visuals and collision footprints for testing.';

    const root=parentDocument.createElement('div');root.className='arcanaTweaksRoot';
    const main=parentDocument.createElement('div');main.className='arcanaTweaksMain';
    const mainStack=parentDocument.createElement('div');mainStack.className='arcanaTweaksStack';
    const sizeCard=makeTweaksCard('ARCANA SIZE');
    const current=readArcanaTweaks();
    const readout=parentDocument.createElement('div');readout.className='arcanaSizeReadout';
    const label=parentDocument.createElement('b');label.textContent='VISUAL + HITBOX SCALE';
    const output=parentDocument.createElement('output');
    const slider=parentDocument.createElement('input');slider.className='arcanaSizeSlider';slider.type='range';slider.min=String(ARCANA_SIZE_MIN);slider.max=String(ARCANA_SIZE_MAX);slider.step=String(ARCANA_SIZE_STEP);slider.value=String(current.sizeMultiplier);slider.setAttribute('aria-label','Wizard Arcana size multiplier');
    const track=parentDocument.createElement('div');track.className='arcanaSizeTrack';const fill=parentDocument.createElement('div');fill.className='arcanaSizeFill';track.appendChild(fill);
    const presetRow=parentDocument.createElement('div');presetRow.className='arcanaPresetRow';
    const presets=[1,2,3,5],presetButtons=[];
    const sync=value=>{
      const settings=writeArcanaTweaks({sizeMultiplier:value});
      slider.value=String(settings.sizeMultiplier);output.value=`${settings.sizeMultiplier.toFixed(2)}×`;output.textContent=output.value;
      fill.style.width=`${settings.sizeMultiplier/ARCANA_SIZE_MAX*100}%`;
      for(const button of presetButtons)button.classList.toggle('on',Number(button.dataset.size)===settings.sizeMultiplier);
      return settings;
    };
    for(const value of presets){
      const button=parentDocument.createElement('button');button.type='button';button.className='arcanaPresetBtn';button.dataset.size=String(value);button.textContent=`${value}×`;
      button.addEventListener('click',()=>{const settings=sync(value);setMessage(`Arcana size set to ${settings.sizeMultiplier.toFixed(2)}×.`);});
      presetButtons.push(button);presetRow.appendChild(button);
    }
    slider.addEventListener('input',()=>sync(Number(slider.value)));
    slider.addEventListener('change',()=>setMessage(`Arcana size set to ${Number(slider.value).toFixed(2)}×.`));
    readout.append(label,output);sizeCard.append(readout,slider,track,presetRow);
    const note=parentDocument.createElement('p');note.textContent='Scales the visible spell and its collision footprint from 1× to 5×. Damage, speed, travel range, cadence, and cooldown behavior stay unchanged. New casts use the selected size.';sizeCard.appendChild(note);
    mainStack.appendChild(sizeCard);main.appendChild(mainStack);

    const side=parentDocument.createElement('aside');side.className='arcanaTweaksSide';
    const sideStack=parentDocument.createElement('div');sideStack.className='arcanaTweaksStack';
    const summary=makeTweaksCard('WHAT CHANGES');
    const rows=parentDocument.createElement('div');rows.className='arcanaTweaksValueList';
    for(const [name,value] of [['PROJECTILES','Ball, flare, dragon, and bubble diameter'],['ZONES','Tornado pull/damage radius'],['WAVES','Flame Cross ribbon width'],['UNCHANGED','Damage, speed, range, and timing']]){
      const row=parentDocument.createElement('div');row.className='arcanaTweaksValueRow';const key=parentDocument.createElement('span');key.textContent=name;const text=parentDocument.createElement('strong');text.textContent=value;row.append(key,text);rows.appendChild(row);
    }
    summary.appendChild(rows);
    const use=makeTweaksCard('TESTING USE');const useText=parentDocument.createElement('p');useText.textContent='Use oversized effects to inspect targeting, overlap, crowd control, and mobile readability. Return to 1× when comparing source-like proportions.';use.appendChild(useText);
    sideStack.append(summary,use);side.appendChild(sideStack);
    root.append(main,side);
    sync(current.sizeMultiplier);
    if(sectionRegistry||!mount)return root;
    values.replaceChildren(root);values.scrollTop=0;values.scrollLeft=0;
    return root;
  }

  function closeTweaks(){
    if(!state.tweaksOpen)return;
    state.tweaksOpen=false;
    const dock=parentDocument.getElementById('labDock'),values=parentDocument.getElementById('labValues'),button=parentDocument.querySelector('[data-arcana-tweaks-category]');
    dock?.classList.remove('arcanaTweaksMode','deckEditorMode');values?.classList.remove('arcanaTweaksActive','deckEditorActive');button?.classList.remove('on');
  }

  function ensureTweaksCategory(categories){
    let button=categories.querySelector('[data-arcana-tweaks-category]');
    if(!button){
      button=parentDocument.createElement('button');button.type='button';button.className='choice deckEditorCategory arcanaTweaksCategory';button.dataset.arcanaTweaksCategory='1';
      const bold=parentDocument.createElement('b');bold.textContent='ARCANA TWEAKS';button.appendChild(bold);categories.appendChild(button);
    }else if(categories.lastElementChild!==button)categories.appendChild(button);
    button.classList.toggle('on',state.tweaksOpen);
    return button;
  }

  let decorationQueued=false;
  const queueDecoration=()=>{
    if(decorationQueued)return;
    decorationQueued=true;
    queue(()=>{decorationQueued=false;const values=parentDocument.getElementById('labValues');if(values)decorateEditor(values);});
  };

  const finishInstall=(attempt=0)=>{
    const values=parentDocument.getElementById('labValues'),categories=parentDocument.getElementById('labCategories');
    const sectionRegistry=getArenaRuntime()?.sectionRegistry||null;
    if(!values||!categories||!window.__enemyLabDeckEditor){if(attempt<240)setTimeout(()=>finishInstall(attempt+1),40);return;}
    if(sectionRegistry){
      sectionRegistry.registerView({id:'arcana-tweaks',sectionId:'visuals',label:'ARCANA SCALE',description:'Tune Wizard Arcana visual and collision footprints.',order:20,render:()=>renderArcanaTweaks({mount:false})});
      sectionRegistry.subscribe(event=>{if(event.sectionId==='loadout'&&(event.type==='invalidate'||event.type==='select'))queueDecoration();});
      queueDecoration();
    }else{
      ensureTweaksCategory(categories);
    }

    parentDocument.addEventListener('click',event=>{
      const tweaks=event.target.closest?.('[data-arcana-tweaks-category]');
      if(tweaks){event.preventDefault();event.stopImmediatePropagation();renderArcanaTweaks();return;}
      const category=event.target.closest?.('#labCategories .choice');
      if(category&&state.tweaksOpen)closeTweaks();

      const familyButton=event.target.closest?.('.deckFamilyBtn:not([data-wizard-arcana-family])');
      if(familyButton&&!state.suppressCoreFamily){state.arcanaFamily=false;queueDecoration();}

      const batch=event.target.closest?.('.deckBatchBtn[data-arcana-batch="1"]');
      if(batch&&state.arcanaFamily){
        event.preventDefault();event.stopImmediatePropagation();
        const editor=window.__enemyLabDeckEditor,selected=new Set(editor.cardIds);
        for(const card of wizardArcanaCards(editor.catalog)){if(!selected.has(card.id)){editor.add(card.id);selected.add(card.id);}}
        queueDecoration();return;
      }

      const remove=event.target.closest?.('.deckEditorRoot[data-view="browse"] .deckCardAction[data-browse-deck-action="remove"]');
      if(!remove)return;
      event.preventDefault();event.stopImmediatePropagation();
      const id=remove.closest('.deckCardTile')?.dataset.cardId,editor=window.__enemyLabDeckEditor;
      if(!id||!editor)return;
      if(!editor.remove(id))setMessage('The deck needs at least one stance card.');
    },true);

    window.__enemyLabArcanaControls={
      get arcanaFamily(){return state.arcanaFamily;},
      get tweaksOpen(){return state.tweaksOpen;},
      showTweaks:renderArcanaTweaks,
      setSize:sizeMultiplier=>writeArcanaTweaks({sizeMultiplier}),
    };
    queueDecoration();
  };

  finishInstall();
}
