function isNonStance(card){return card?.type==='ability'||card?.type==='modifier';}
function isWizardArcana(card){return card?.sourceGame==='Wizard of Legend'&&typeof card?.arcanaId==='string';}
function cleanCardName(card){return String(card?.name||card?.id||'CARD').replace(/^S\d+\s*/, '');}

export function installEnemyLabDeckEditorRefinements(){
  if(typeof window==='undefined'||window.__enemyLabDeckEditorRefinementsInstalled)return;
  window.__enemyLabDeckEditorRefinementsInstalled=true;

  let parentWindow,parentDocument;
  try{parentWindow=window.parent;parentDocument=parentWindow.document;}catch{return;}
  if(!parentDocument||parentWindow===window)return;

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
      @media (orientation:landscape){
        #labDock.deckEditorMode{width:min(72vw,940px)!important}
        #labDock.deckEditorMode .deckEditorRoot{grid-template-columns:minmax(300px,1fr) minmax(196px,244px);column-gap:2px}
      }
    `;
    parentDocument.head.appendChild(style);
  }

  const setMessage=text=>{
    const message=parentDocument.getElementById('message');
    if(message)message.textContent=text;
  };

  const decorateArcanaTile=(tile,card)=>{
    if(!isWizardArcana(card))return;
    tile.classList.add('wizardArcanaCard');
    tile.style.setProperty('--arcana-color',card.uiColor||'#e8a04c');
    const family=tile.querySelector('.deckCardFamily');if(family)family.textContent='WIZARD ARCANA';
    const description=tile.querySelector('.deckCardDescription');if(description)description.textContent=card.description||'';
    const summary=tile.querySelector('.deckCardDetailSummary');if(summary)summary.textContent=card.details?.summary||card.description||'';
    const rows=tile.querySelector('.deckCardDetailRows');
    if(rows&&Array.isArray(card.details?.rows)){
      rows.replaceChildren();
      for(const [label,value] of card.details.rows){
        const row=parentDocument.createElement('div');row.className='deckCardDetailRow';
        const heading=parentDocument.createElement('b');heading.textContent=label;
        const text=parentDocument.createElement('span');text.textContent=value;
        row.append(heading,text);rows.appendChild(row);
      }
    }
  };

  const decorateEditor=values=>{
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
  };

  const finishInstall=(attempt=0)=>{
    const values=parentDocument.getElementById('labValues');
    if(!values){if(attempt<200)setTimeout(()=>finishInstall(attempt+1),40);return;}

    let decorationQueued=false;
    const queueDecoration=()=>{
      if(decorationQueued)return;
      decorationQueued=true;
      queueMicrotask(()=>{decorationQueued=false;decorateEditor(values);});
    };

    new MutationObserver(queueDecoration).observe(values,{childList:true,subtree:true});
    parentDocument.addEventListener('click',event=>{
      const button=event.target.closest?.('.deckEditorRoot[data-view="browse"] .deckCardAction[data-browse-deck-action="remove"]');
      if(!button)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const id=button.closest('.deckCardTile')?.dataset.cardId;
      const editor=window.__enemyLabDeckEditor;
      if(!id||!editor)return;
      if(!editor.remove(id))setMessage('The deck needs at least one stance card.');
    },true);

    queueDecoration();
  };

  finishInstall();
}
