function isNonStance(card){return card?.type==='ability'||card?.type==='modifier';}
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
      .deckEditorControlsPane{padding-right:12px}
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

  const decorateBrowseButtons=values=>{
    const editor=window.__enemyLabDeckEditor;
    const root=values.querySelector('.deckEditorRoot[data-view="browse"]');
    if(!editor||!root)return;

    const catalog=editor.catalog;
    const byId=new Map(catalog.map(card=>[card.id,card]));
    const selectedIds=editor.cardIds;
    const selected=new Set(selectedIds);
    const stanceCount=selectedIds.reduce((count,id)=>count+(!isNonStance(byId.get(id))?1:0),0);

    for(const tile of root.querySelectorAll('.deckCardTile')){
      const id=tile.dataset.cardId;
      const button=tile.querySelector('.deckCardAction');
      if(!id||!button)continue;

      if(!selected.has(id)){
        delete button.dataset.browseDeckAction;
        button.classList.remove('remove');
        continue;
      }

      const card=byId.get(id);
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
      queueMicrotask(()=>{decorationQueued=false;decorateBrowseButtons(values);});
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
