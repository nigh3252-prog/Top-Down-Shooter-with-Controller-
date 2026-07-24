import { STANCE_CARDS } from './stance-cards.js';
import { POW_BUNKER_CARD } from './powbunker-card.js';
import { BLOOD_SLASH_CARD, BING_BONG_CARD } from './combat-modifier-cards.js';

const ENEMY_LAB_DECK_KEY='enemyLab.deck.v1';
const ENEMY_LAB_DECK_UI_KEY='enemyLab.deck.ui.v1';
function isNonStance(card){return card?.type==='ability'||card?.type==='modifier';}
function uniqueCards(cards){
  const seen=new Set();
  return cards.filter(card=>card?.id&&!seen.has(card.id)&&seen.add(card.id));
}
function fullEnemyLabCatalog(){return uniqueCards([...STANCE_CARDS,BING_BONG_CARD,POW_BUNKER_CARD,BLOOD_SLASH_CARD]);}
function cardFamily(card){
  if(card?.id===BING_BONG_CARD.id)return'BING BONG';
  if(card?.id===POW_BUNKER_CARD.id)return'POWBUNKER';
  if(card?.id===BLOOD_SLASH_CARD.id)return'BLOOD SLASH';
  return'STANCES';
}
function cleanCardName(card){return String(card?.name||card?.id||'CARD').replace(/^S\d+\s*/, '');}
function cardDescription(card){
  const family=cardFamily(card);
  if(family==='BING BONG')return'Concussion stance · vertical, vertical, horizontal · stun-focused.';
  if(family==='POWBUNKER')return'Single-use Pilebunker ability card.';
  if(family==='BLOOD SLASH')return'Temporary horizontal-attack modifier card.';
  const tags=(card?.styleTags||[]).slice(0,4).join(' · ');
  const weapons=(card?.preferredWeapons||[]).slice(0,3).join(', ');
  return`${tags||'stance'}${weapons?` · ${weapons}`:''}`;
}
function readJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'')??fallback;}catch{return fallback;}}
function sameIds(a,b){return a.length===b.length&&a.every((id,index)=>id===b[index]);}

export function installEnemyLabDeckEditor(deck){
  let parentWindow,parentDocument;
  try{parentWindow=window.parent;parentDocument=parentWindow.document;}catch{return;}
  if(!parentDocument||parentWindow===window)return;

  const catalog=fullEnemyLabCatalog();
  const byId=new Map(catalog.map(card=>[card.id,card]));
  const families=['ALL','STANCES','BING BONG','POWBUNKER','BLOOD SLASH'];
  const storedUi=readJson(ENEMY_LAB_DECK_UI_KEY,{});
  let family=families.includes(storedUi?.family)?storedUi.family:'ALL';
  let activeView=null;
  let selectedIds=[];
  let nativeDefaultIds=[];
  let initialized=false;
  let rendering=false;
  let pendingBaseRestore=false;
  const scrollPositions=new Map();

  function persistUi(){localStorage.setItem(ENEMY_LAB_DECK_UI_KEY,JSON.stringify({family}));}
  function persistDeck(){localStorage.setItem(ENEMY_LAB_DECK_KEY,JSON.stringify({version:1,cardIds:selectedIds}));}
  function selectedCards(){return selectedIds.map(id=>byId.get(id)).filter(Boolean);}
  function hasStance(cards=selectedCards()){return cards.some(card=>!isNonStance(card));}
  function normalizeStoredDeck(value){
    const raw=Array.isArray(value)?value:(Array.isArray(value?.cardIds)?value.cardIds:[]);
    const seen=new Set();
    return raw.filter(id=>byId.has(id)&&!seen.has(id)&&seen.add(id));
  }
  function setMessage(text=''){
    const message=parentDocument.getElementById('message');
    if(message)message.textContent=text;
  }
  function arenaRuntime(){return window.__arena||null;}
  function applySelected({announce=true,shuffle=true}={}){
    const cards=selectedCards();
    if(!cards.length||!hasStance(cards)){
      if(announce)setMessage('The deck needs at least one stance card.');
      return false;
    }
    const currentStanceId=arenaRuntime()?.arena?.stance?.id;
    const openingStanceId=selectedIds.includes(currentStanceId)&&!isNonStance(byId.get(currentStanceId))
      ?currentStanceId
      :cards.find(card=>!isNonStance(card))?.id;
    deck.beginRun(cards,{openingStanceId});
    persistDeck();
    if(shuffle){
      let refreshAttempts=0;
      const refresh=()=>{
        const runtime=arenaRuntime();
        if(typeof runtime?.startDeckShuffle==='function')runtime.startDeckShuffle();
        else if(refreshAttempts++<100)setTimeout(refresh,40);
      };
      refresh();
    }
    if(announce)setMessage(`${cards.length} cards saved · combat deck reshuffled.`);
    return true;
  }

  function currentBaseKey(categories){
    const active=[...categories.querySelectorAll('.choice.on:not([data-deck-editor-category])')][0];
    return`base:${(active?.textContent||'TEST').trim()}`;
  }
  function editorScrollKey(){return activeView==='browse'?`editor:browse:${family}`:'editor:deck';}
  function saveScroll(values,categories){
    const key=activeView?editorScrollKey():currentBaseKey(categories);
    scrollPositions.set(key,{top:values.scrollTop,left:values.scrollLeft});
  }
  function restoreScroll(values,key){
    const position=scrollPositions.get(key)||{top:0,left:0};
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      values.scrollTop=position.top;
      values.scrollLeft=position.left;
      values.dispatchEvent(new Event('scroll'));
    }));
  }

  function installStyles(){
    if(parentDocument.getElementById('enemyLabDeckEditorStyles'))return;
    const style=parentDocument.createElement('style');
    style.id='enemyLabDeckEditorStyles';
    style.textContent=`
      #labCategories .deckEditorCategory b{white-space:normal;line-height:1.12}
      #labValues.deckEditorActive{padding:8px;overflow-y:auto;overflow-x:hidden;touch-action:pan-y}
      .deckEditorRoot{display:flex;flex-direction:column;gap:8px;width:100%;min-width:0;min-height:100%}
      .deckEditorToolbar{position:sticky;top:-8px;z-index:4;display:flex;flex-direction:column;gap:7px;padding:8px;border:1px solid rgba(49,80,77,.85);border-radius:8px;background:rgba(7,19,21,.985);box-shadow:0 5px 15px rgba(0,0,0,.28)}
      .deckEditorSummary{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--muted);font-size:8.5px;letter-spacing:.06em}
      .deckEditorSummary strong{color:var(--gold);font-size:10.5px}
      .deckFamilyBar{display:flex;flex-wrap:wrap;gap:5px}
      .deckFamilyBtn,.deckBatchBtn,.deckCardAction{min-height:34px;border:1px solid var(--line);border-radius:7px;background:rgba(16,38,40,.95);color:var(--text);font-size:8.5px;letter-spacing:.06em;padding:0 9px;touch-action:manipulation}
      .deckFamilyBtn.on{border-color:var(--gold);color:var(--gold);background:rgba(232,160,76,.12)}
      .deckBatchBtn{color:var(--gold);border-color:#8a5630;align-self:flex-start}
      .deckBatchBtn:disabled,.deckCardAction:disabled{opacity:.45}
      .deckCardList{display:flex;flex-direction:column;gap:7px;padding-bottom:4px}
      .deckCardTile{display:flex;align-items:center;gap:9px;min-height:68px;padding:9px;border:1px solid rgba(49,80,77,.72);border-radius:8px;background:rgba(16,38,40,.58)}
      .deckCardTile.inDeck{border-color:rgba(232,160,76,.72);background:rgba(232,160,76,.08)}
      .deckCardInfo{flex:1;min-width:0}
      .deckCardName{display:block;color:var(--text);font-size:10.5px;line-height:1.2}
      .deckCardFamily{display:block;margin-top:3px;color:var(--gold);font-size:7.5px;letter-spacing:.1em}
      .deckCardDescription{display:block;margin-top:4px;color:var(--muted);font-size:8px;line-height:1.35}
      .deckCardAction{flex:0 0 auto;min-width:68px;color:var(--gold)}
      .deckCardAction.remove{color:#ffad91;border-color:#75402e}
      .deckEmpty{padding:18px 10px;text-align:center;color:var(--muted);font-size:9px}
      @media (orientation:portrait){
        #labValues.deckEditorActive{overflow-y:auto!important;overflow-x:hidden!important;touch-action:pan-y!important}
        #labValues.deckEditorActive + #valueScrollGutter{visibility:hidden}
        .deckEditorRoot{width:100%;min-width:100%;height:auto}
        .deckEditorToolbar{top:-8px}
        .deckCardTile{min-width:0;width:100%}
      }
    `;
    parentDocument.head.appendChild(style);
  }

  function makeButton(className,label,onClick){
    const button=parentDocument.createElement('button');
    button.className=className;
    button.type='button';
    button.textContent=label;
    button.addEventListener('click',onClick);
    return button;
  }
  function makeCardTile(card,mode,values,categories){
    const inDeck=selectedIds.includes(card.id);
    const tile=parentDocument.createElement('div');
    tile.className=`deckCardTile${inDeck?' inDeck':''}`;
    const info=parentDocument.createElement('div');
    info.className='deckCardInfo';
    const name=parentDocument.createElement('b');name.className='deckCardName';name.textContent=cleanCardName(card);
    const cardFamilyLabel=parentDocument.createElement('span');cardFamilyLabel.className='deckCardFamily';cardFamilyLabel.textContent=cardFamily(card);
    const description=parentDocument.createElement('span');description.className='deckCardDescription';description.textContent=cardDescription(card);
    info.append(name,cardFamilyLabel,description);
    if(mode==='browse'){
      const add=makeButton('deckCardAction',inDeck?'IN DECK':'ADD',()=>{
        if(inDeck)return;
        saveScroll(values,categories);
        selectedIds.push(card.id);
        applySelected();
        renderEditor(values,categories,{preserveScroll:true});
      });
      add.disabled=inDeck;
      tile.append(info,add);
    }else{
      const remainingStances=selectedCards().filter(item=>!isNonStance(item)).length;
      const lastStance=!isNonStance(card)&&remainingStances<=1;
      const remove=makeButton('deckCardAction remove','REMOVE',()=>{
        if(lastStance){setMessage('The deck needs at least one stance card.');return;}
        saveScroll(values,categories);
        selectedIds=selectedIds.filter(id=>id!==card.id);
        applySelected();
        renderEditor(values,categories,{preserveScroll:true});
      });
      remove.disabled=lastStance;
      tile.append(info,remove);
    }
    return tile;
  }

  function renderBrowse(root,values,categories){
    const shown=family==='ALL'?catalog:catalog.filter(card=>cardFamily(card)===family);
    const missing=shown.filter(card=>!selectedIds.includes(card.id));
    const toolbar=parentDocument.createElement('div');toolbar.className='deckEditorToolbar';
    const summary=parentDocument.createElement('div');summary.className='deckEditorSummary';
    summary.innerHTML=`<strong>${shown.length} SHOWN</strong><span>${selectedIds.length} IN DECK</span>`;
    const familyBar=parentDocument.createElement('div');familyBar.className='deckFamilyBar';
    for(const item of families){
      const button=makeButton(`deckFamilyBtn${item===family?' on':''}`,item,()=>{
        saveScroll(values,categories);
        family=item;persistUi();
        renderEditor(values,categories,{preserveScroll:true});
      });
      familyBar.appendChild(button);
    }
    const addShown=makeButton('deckBatchBtn',missing.length?`ADD SHOWN · ${missing.length}`:'ALL SHOWN ADDED',()=>{
      if(!missing.length)return;
      saveScroll(values,categories);
      selectedIds=uniqueCards([...selectedCards(),...missing]).map(card=>card.id);
      applySelected();
      renderEditor(values,categories,{preserveScroll:true});
    });
    addShown.disabled=!missing.length;
    toolbar.append(summary,familyBar,addShown);
    const list=parentDocument.createElement('div');list.className='deckCardList';
    for(const card of shown)list.appendChild(makeCardTile(card,'browse',values,categories));
    root.append(toolbar,list);
  }
  function renderCurrentDeck(root,values,categories){
    const cards=selectedCards();
    const stanceCount=cards.filter(card=>!isNonStance(card)).length;
    const toolbar=parentDocument.createElement('div');toolbar.className='deckEditorToolbar';
    const summary=parentDocument.createElement('div');summary.className='deckEditorSummary';
    summary.innerHTML=`<strong>${cards.length} CARDS</strong><span>${stanceCount} STANCES · ${cards.length-stanceCount} OTHER</span>`;
    toolbar.appendChild(summary);
    const list=parentDocument.createElement('div');list.className='deckCardList';
    if(!cards.length){const empty=parentDocument.createElement('div');empty.className='deckEmpty';empty.textContent='No cards selected.';list.appendChild(empty);}
    else for(const card of cards)list.appendChild(makeCardTile(card,'deck',values,categories));
    root.append(toolbar,list);
  }
  function syncCategoryButtons(categories){
    for(const [view,label] of [['browse','BROWSE CARDS'],['deck','CURRENT DECK']]){
      let button=categories.querySelector(`[data-deck-editor-category="${view}"]`);
      if(!button){
        button=parentDocument.createElement('button');
        button.className='choice deckEditorCategory';
        button.dataset.deckEditorCategory=view;
        const bold=parentDocument.createElement('b');bold.textContent=label;
        button.appendChild(bold);
        categories.appendChild(button);
      }
      button.classList.toggle('on',activeView===view);
    }
    if(activeView){
      for(const button of categories.querySelectorAll('.choice:not([data-deck-editor-category])'))button.classList.remove('on');
    }
  }
  function renderEditor(values,categories,{preserveScroll=false}={}){
    if(!activeView||rendering)return;
    if(preserveScroll)saveScroll(values,categories);
    rendering=true;
    values.classList.add('deckEditorActive');
    const root=parentDocument.createElement('div');
    root.className='deckEditorRoot';root.dataset.view=activeView;
    if(activeView==='browse')renderBrowse(root,values,categories);else renderCurrentDeck(root,values,categories);
    values.replaceChildren(root);
    const hint=parentDocument.getElementById('categoryHint');
    if(hint)hint.textContent=activeView==='browse'?'Filter card families and add cards to the live deck.':'Review the complete live deck and remove cards.';
    syncCategoryButtons(categories);
    rendering=false;
    restoreScroll(values,editorScrollKey());
  }

  function finishInstall(){
    const dock=parentDocument.getElementById('labDock');
    const values=parentDocument.getElementById('labValues');
    const categories=parentDocument.getElementById('labCategories');
    if(!dock||!values||!categories||!deck.pool.length){setTimeout(finishInstall,50);return;}
    if(dock.dataset.deckEditorInstalled==='1')return;
    dock.dataset.deckEditorInstalled='1';
    installStyles();
    nativeDefaultIds=deck.pool.map(card=>card.id).filter(id=>byId.has(id));
    const stored=normalizeStoredDeck(readJson(ENEMY_LAB_DECK_KEY,{}));
    selectedIds=stored.length&&hasStance(stored.map(id=>byId.get(id)))?stored:nativeDefaultIds.slice();
    if(!sameIds(selectedIds,deck.pool.map(card=>card.id))){applySelected({announce:false,shuffle:true});}
    else persistDeck();
    initialized=true;

    syncCategoryButtons(categories);
    values.addEventListener('scroll',()=>{
      if(!initialized)return;
      const key=activeView?editorScrollKey():currentBaseKey(categories);
      scrollPositions.set(key,{top:values.scrollTop,left:values.scrollLeft});
    },{passive:true});
    categories.addEventListener('click',event=>{
      const editorButton=event.target.closest?.('[data-deck-editor-category]');
      saveScroll(values,categories);
      if(editorButton){
        event.preventDefault();event.stopPropagation();
        activeView=editorButton.dataset.deckEditorCategory;
        renderEditor(values,categories);
        return;
      }
      if(activeView){activeView=null;values.classList.remove('deckEditorActive');}
      pendingBaseRestore=true;
    },true);

    new MutationObserver(()=>{
      syncCategoryButtons(categories);
      if(activeView){
        if(!values.querySelector(`.deckEditorRoot[data-view="${activeView}"]`))renderEditor(values,categories);
      }else if(pendingBaseRestore){
        pendingBaseRestore=false;
        restoreScroll(values,currentBaseKey(categories));
      }
    }).observe(categories,{childList:true,subtree:true});
    new MutationObserver(()=>{
      if(activeView&&!values.querySelector(`.deckEditorRoot[data-view="${activeView}"]`))renderEditor(values,categories);
    }).observe(values,{childList:true});

    window.__enemyLabDeckEditor={
      get catalog(){return catalog.slice();},
      get cardIds(){return selectedIds.slice();},
      get activeView(){return activeView;},
      get family(){return family;},
      add(id){if(!byId.has(id)||selectedIds.includes(id))return false;selectedIds.push(id);applySelected();if(activeView)renderEditor(values,categories,{preserveScroll:true});return true;},
      remove(id){const card=byId.get(id);if(!card||!selectedIds.includes(id))return false;if(!isNonStance(card)&&selectedCards().filter(item=>!isNonStance(item)).length<=1)return false;selectedIds=selectedIds.filter(cardId=>cardId!==id);applySelected();if(activeView)renderEditor(values,categories,{preserveScroll:true});return true;},
      show(view='browse'){activeView=view==='deck'?'deck':'browse';renderEditor(values,categories);},
    };
  }
  finishInstall();
}
