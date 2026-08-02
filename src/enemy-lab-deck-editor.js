import { getCard, listCards } from './card-registry.js';

const POW_BUNKER_CARD = getCard('A01-PILEBUNKER');
const BLOOD_SLASH_CARD = getCard('M01-BLOOD-SLASH');
const BING_BONG_CARD = getCard('S31-BING-BONG');

const ENEMY_LAB_DECK_KEY='enemyLab.deck.v1';
const ENEMY_LAB_DECK_UI_KEY='enemyLab.deck.ui.v1';

function isNonStance(card){return card?.type==='ability'||card?.type==='modifier';}
function uniqueCards(cards){
  const seen=new Set();
  return cards.filter(card=>card?.id&&!seen.has(card.id)&&seen.add(card.id));
}
function fullEnemyLabCatalog(){
  return uniqueCards([
    ...listCards({family:'stance'}),
    ...listCards({family:'arcana'}),
    ...listCards({family:'special-stance'}),
    ...listCards({family:'non-stance'}),
  ]);
}
function cardFamily(card){
  if(card?.id===BING_BONG_CARD.id)return'BING BONG';
  if(card?.id===POW_BUNKER_CARD.id)return'POWBUNKER';
  if(card?.id===BLOOD_SLASH_CARD.id)return'BLOOD SLASH';
  return'STANCES';
}
function cleanCardName(card){return String(card?.name||card?.id||'CARD').replace(/^S\d+\s*/, '');}
function humanizeToken(value=''){
  return String(value)
    .replace(/([a-z])([A-Z])/g,'$1 $2')
    .replace(/[-_]+/g,' ')
    .replace(/\b\w/g,letter=>letter.toUpperCase());
}
function attackLabel(key=''){
  const value=String(key);
  if(value.startsWith('horizontal'))return'Horizontal slice';
  if(value.startsWith('vertical'))return'Vertical chop';
  if(value.startsWith('stab'))return'Forward thrust';
  return humanizeToken(value)||'Attack';
}
function cardDescription(card){
  const family=cardFamily(card);
  if(family==='BING BONG')return'Concussion stance · vertical, vertical, horizontal · stun-focused.';
  if(family==='POWBUNKER')return'Single-use Pilebunker ability card.';
  if(family==='BLOOD SLASH')return'Three-charge attack modifier · horizontal attacks gain reach and bleed.';
  const tags=(card?.styleTags||[]).slice(0,4).join(' · ');
  const weapons=(card?.preferredWeapons||[]).slice(0,3).map(humanizeToken).join(', ');
  return`${tags||'stance'}${weapons?` · ${weapons}`:''}`;
}
function cardDetails(card){
  const family=cardFamily(card);
  if(family==='BING BONG')return{
    summary:'A blunt concussion stance. Its two vertical lights apply direct pressure, while the horizontal heavy can project a stun wave from a strong blunt impact.',
    rows:[
      ['LIGHTS','Vertical chop → Vertical chop'],
      ['HEAVY','Horizontal slice'],
      ['EFFECT','Blunt contact creates a concussion wave and a 3 second stun.'],
      ['WEAPONS','Available to every weapon; stronger blunt contact creates a larger wave.'],
    ],
  };
  if(family==='POWBUNKER')return{
    summary:'A single-use ability card that fires the dedicated Pilebunker strike without replacing the stance you already have equipped.',
    rows:[
      ['PLAY','Activate the Pilebunker piston strike.'],
      ['DECK','The card is consumed and replaced only after a successful activation.'],
      ['STANCE','Your current stance remains active.'],
      ['ROLE','A committed burst attack for testing impact, guard breaks, and knockback.'],
    ],
  };
  if(family==='BLOOD SLASH')return{
    summary:'Arms three attack charges. Every non-ability attack spends one charge, but horizontal attacks receive the full Blood Slash enlargement and apply movement-linked bleed.',
    rows:[
      ['CHARGES','3 attacks'],
      ['HORIZONTAL','Greatly enlarges the horizontal hit zone and applies bleed.'],
      ['OTHER ATTACKS','Spend a charge without receiving the enlarged horizontal slash.'],
      ['BLEED','Stored damage is released as the affected enemy moves.'],
    ],
  };
  const chain=Array.isArray(card?.chain)?card.chain:[];
  const lights=chain.slice(0,2).map(attackLabel);
  const heavy=attackLabel(chain[2]);
  const tags=(card?.styleTags||[]).map(humanizeToken);
  const weapons=(card?.preferredWeapons||[]).map(humanizeToken);
  const identity=tags.slice(0,3).join(', ').toLowerCase()||'mixed combat';
  return{
    summary:`A ${identity} stance. Its light sequence is ${lights.join(' into ').toLowerCase()}, followed by a ${heavy.toLowerCase()} heavy finisher.`,
    rows:[
      ['LIGHTS',lights.join(' → ')||'No authored light chain'],
      ['HEAVY',heavy],
      ['GUARD',humanizeToken(card?.guardId||'Standard guard')],
      ['WEAPONS',weapons.join(' · ')||'Any weapon'],
      ['STYLE',tags.join(' · ')||'Mixed'],
    ],
  };
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
  const baseScrollPositions=new Map();
  const editorScrollPositions=new Map();
  const expandedByContext=new Map();

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
  function editorContextKey(view=activeView,currentFamily=family){return view==='browse'?`browse:${currentFamily}`:'deck';}
  function editorRoot(values){return values.querySelector('.deckEditorRoot');}
  function saveBaseScroll(values,categories){
    baseScrollPositions.set(currentBaseKey(categories),{top:values.scrollTop,left:values.scrollLeft});
  }
  function restoreBaseScroll(values,key){
    const position=baseScrollPositions.get(key)||{top:0,left:0};
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      values.scrollTop=position.top;
      values.scrollLeft=position.left;
      values.dispatchEvent(new Event('scroll'));
    }));
  }
  function saveEditorScroll(values,key=editorContextKey()){
    const root=editorRoot(values);
    if(!root)return;
    const cards=root.querySelector('.deckEditorCardsPane');
    const controls=root.querySelector('.deckEditorControlsPane');
    editorScrollPositions.set(key,{cards:cards?.scrollTop||0,controls:controls?.scrollTop||0});
  }
  function restoreEditorScroll(values,key=editorContextKey()){
    const position=editorScrollPositions.get(key)||{cards:0,controls:0};
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const root=editorRoot(values);
      const cards=root?.querySelector('.deckEditorCardsPane');
      const controls=root?.querySelector('.deckEditorControlsPane');
      if(cards)cards.scrollTop=position.cards;
      if(controls)controls.scrollTop=position.controls;
    }));
  }
  function saveActiveScroll(values,categories){
    if(activeView)saveEditorScroll(values);
    else saveBaseScroll(values,categories);
  }

  function installStyles(){
    if(parentDocument.getElementById('enemyLabDeckEditorStyles'))return;
    const style=parentDocument.createElement('style');
    style.id='enemyLabDeckEditorStyles';
    style.textContent=`
      #labCategories .deckEditorCategory b{white-space:normal;line-height:1.12}
      #labValues.deckEditorActive{padding:0!important;overflow:hidden!important;touch-action:none!important}
      #labDock.deckEditorMode #valueScrollGutter{display:none}
      .deckEditorRoot{display:grid;grid-template-columns:minmax(280px,1fr) minmax(176px,220px);width:100%;height:100%;min-width:0;min-height:0;overflow:hidden;background:rgba(0,0,0,.05)}
      .deckEditorCardsPane,.deckEditorControlsPane{min-width:0;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;scrollbar-width:thin;scrollbar-color:#8a5630 rgba(0,0,0,.16)}
      .deckEditorCardsPane::-webkit-scrollbar,.deckEditorControlsPane::-webkit-scrollbar{width:9px}
      .deckEditorCardsPane::-webkit-scrollbar-track,.deckEditorControlsPane::-webkit-scrollbar-track{background:rgba(0,0,0,.16)}
      .deckEditorCardsPane::-webkit-scrollbar-thumb,.deckEditorControlsPane::-webkit-scrollbar-thumb{background:#8a5630;border:2px solid #0a1a1c;border-radius:8px}
      .deckEditorCardsPane{padding:8px}
      .deckEditorControlsPane{padding:8px;border-left:1px solid rgba(49,80,77,.72);background:rgba(4,14,16,.72)}
      .deckEditorControlStack{display:flex;flex-direction:column;gap:8px;min-height:100%}
      .deckEditorControlCard{display:flex;flex-direction:column;gap:7px;padding:9px;border:1px solid rgba(49,80,77,.82);border-radius:8px;background:rgba(12,31,33,.86)}
      .deckEditorControlTitle{color:var(--teal);font-size:8px;letter-spacing:.13em}
      .deckEditorSummary{display:flex;flex-direction:column;gap:3px;color:var(--muted);font-size:8.5px;letter-spacing:.05em}
      .deckEditorSummary strong{color:var(--gold);font-size:12px}
      .deckFamilyBar{display:grid;grid-template-columns:1fr;gap:6px}
      .deckFamilyBtn,.deckBatchBtn,.deckCardAction{min-height:36px;border:1px solid var(--line);border-radius:7px;background:rgba(16,38,40,.95);color:var(--text);font-size:8.5px;letter-spacing:.06em;padding:0 9px;touch-action:manipulation}
      .deckFamilyBtn{text-align:left}
      .deckFamilyBtn.on{border-color:var(--gold);color:var(--gold);background:rgba(232,160,76,.12)}
      .deckBatchBtn{width:100%;color:var(--gold);border-color:#8a5630}
      .deckBatchBtn:disabled,.deckCardAction:disabled{opacity:.45}
      .deckControlNote{color:var(--muted);font-size:7.8px;line-height:1.45}
      .deckCountList{display:flex;flex-direction:column;gap:5px}
      .deckCountRow{display:flex;justify-content:space-between;gap:8px;color:var(--muted);font-size:8px}
      .deckCountRow strong{color:var(--text)}
      .deckCardList{display:flex;flex-direction:column;gap:7px;padding-bottom:4px}
      .deckCardTile{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:8px;min-height:70px;padding:8px;border:1px solid rgba(49,80,77,.72);border-radius:8px;background:rgba(16,38,40,.58)}
      .deckCardTile.inDeck{border-color:rgba(232,160,76,.72);background:rgba(232,160,76,.08)}
      .deckCardTile.expanded{border-color:var(--teal);background:rgba(42,91,85,.17)}
      .deckCardInfoButton{display:block;min-width:0;width:100%;padding:2px 1px;text-align:left;border:0;background:transparent;color:inherit;touch-action:manipulation}
      .deckCardInfoButton:active{transform:none;background:transparent}
      .deckCardTopLine{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
      .deckCardName{display:block;color:var(--text);font-size:10.5px;line-height:1.2}
      .deckCardDisclosure{flex:0 0 auto;color:var(--muted);font-size:12px;line-height:1;transition:transform .15s}
      .deckCardTile.expanded .deckCardDisclosure{transform:rotate(180deg);color:var(--gold)}
      .deckCardFamily{display:block;margin-top:3px;color:var(--gold);font-size:7.5px;letter-spacing:.1em}
      .deckCardDescription{display:block;margin-top:4px;color:var(--muted);font-size:8px;line-height:1.35}
      .deckCardAction{align-self:center;min-width:68px;color:var(--gold)}
      .deckCardAction.remove{color:#ffad91;border-color:#75402e}
      .deckCardDetails{grid-column:1/-1;display:none;margin-top:1px;padding:9px;border-top:1px solid rgba(49,80,77,.62);color:var(--muted)}
      .deckCardTile.expanded .deckCardDetails{display:block}
      .deckCardDetailSummary{margin:0 0 9px;color:var(--text);font-size:8.5px;line-height:1.5}
      .deckCardDetailRows{display:flex;flex-direction:column;gap:6px}
      .deckCardDetailRow{display:grid;grid-template-columns:64px minmax(0,1fr);gap:8px;font-size:7.8px;line-height:1.4}
      .deckCardDetailRow b{color:var(--gold);font-size:7.5px;letter-spacing:.08em}
      .deckEmpty{padding:18px 10px;text-align:center;color:var(--muted);font-size:9px}
      @media (orientation:landscape){
        #labDock.deckEditorMode{width:min(68vw,860px);grid-template-columns:minmax(0,1fr) 0 100px}
        #labDock.deckEditorMode #dockHead,#labDock.deckEditorMode #message{grid-column:1/4}
      }
      @media (orientation:portrait){
        #labDock.deckEditorMode{height:min(88dvh,900px);grid-template-rows:auto 1fr 0 58px auto}
        .deckEditorRoot{grid-template-columns:minmax(160px,1fr) minmax(126px,40%)}
        .deckEditorCardsPane,.deckEditorControlsPane{padding:6px}
        .deckCardTile{padding:7px;gap:6px}
        .deckCardAction{min-width:58px;padding:0 6px}
        .deckCardDetailRow{grid-template-columns:54px minmax(0,1fr)}
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
  function setTileExpanded(tile,button,open){
    tile.classList.toggle('expanded',open);
    button.setAttribute('aria-expanded',String(open));
  }
  function makeDetails(card){
    const model=cardDetails(card);
    const details=parentDocument.createElement('div');
    details.className='deckCardDetails';
    const summary=parentDocument.createElement('p');
    summary.className='deckCardDetailSummary';
    summary.textContent=model.summary;
    const rows=parentDocument.createElement('div');
    rows.className='deckCardDetailRows';
    for(const [label,value] of model.rows){
      const row=parentDocument.createElement('div');
      row.className='deckCardDetailRow';
      const heading=parentDocument.createElement('b');heading.textContent=label;
      const text=parentDocument.createElement('span');text.textContent=value;
      row.append(heading,text);rows.appendChild(row);
    }
    details.append(summary,rows);
    return details;
  }
  function makeCardTile(card,mode,values,categories){
    const inDeck=selectedIds.includes(card.id);
    const tile=parentDocument.createElement('article');
    tile.className=`deckCardTile${inDeck?' inDeck':''}`;
    tile.dataset.cardId=card.id;
    const info=parentDocument.createElement('button');
    info.type='button';
    info.className='deckCardInfoButton';
    info.setAttribute('aria-label',`Show details for ${cleanCardName(card)}`);
    const top=parentDocument.createElement('span');top.className='deckCardTopLine';
    const name=parentDocument.createElement('b');name.className='deckCardName';name.textContent=cleanCardName(card);
    const disclosure=parentDocument.createElement('span');disclosure.className='deckCardDisclosure';disclosure.textContent='⌄';
    top.append(name,disclosure);
    const cardFamilyLabel=parentDocument.createElement('span');cardFamilyLabel.className='deckCardFamily';cardFamilyLabel.textContent=cardFamily(card);
    const description=parentDocument.createElement('span');description.className='deckCardDescription';description.textContent=cardDescription(card);
    info.append(top,cardFamilyLabel,description);
    const details=makeDetails(card);
    const context=editorContextKey();
    const startsExpanded=expandedByContext.get(context)===card.id;
    setTileExpanded(tile,info,startsExpanded);
    info.addEventListener('click',()=>{
      const list=tile.parentElement;
      const wasOpen=tile.classList.contains('expanded');
      const other=list?.querySelector('.deckCardTile.expanded');
      if(other&&other!==tile){
        const otherButton=other.querySelector('.deckCardInfoButton');
        if(otherButton)setTileExpanded(other,otherButton,false);
      }
      const nextOpen=!wasOpen;
      setTileExpanded(tile,info,nextOpen);
      expandedByContext.set(editorContextKey(),nextOpen?card.id:null);
    });
    if(mode==='browse'){
      const add=makeButton('deckCardAction',inDeck?'IN DECK':'ADD',()=>{
        if(inDeck)return;
        saveEditorScroll(values);
        selectedIds.push(card.id);
        applySelected();
        renderEditor(values,categories);
      });
      add.disabled=inDeck;
      tile.append(info,add,details);
    }else{
      const remainingStances=selectedCards().filter(item=>!isNonStance(item)).length;
      const lastStance=!isNonStance(card)&&remainingStances<=1;
      const remove=makeButton('deckCardAction remove','REMOVE',()=>{
        if(lastStance){setMessage('The deck needs at least one stance card.');return;}
        saveEditorScroll(values);
        selectedIds=selectedIds.filter(id=>id!==card.id);
        if(expandedByContext.get(editorContextKey())===card.id)expandedByContext.set(editorContextKey(),null);
        applySelected();
        renderEditor(values,categories);
      });
      remove.disabled=lastStance;
      tile.append(info,remove,details);
    }
    return tile;
  }

  function controlCard(title){
    const card=parentDocument.createElement('section');card.className='deckEditorControlCard';
    const heading=parentDocument.createElement('b');heading.className='deckEditorControlTitle';heading.textContent=title;
    card.appendChild(heading);return card;
  }
  function renderBrowse(root,values,categories){
    const shown=family==='ALL'?catalog:catalog.filter(card=>cardFamily(card)===family);
    const missing=shown.filter(card=>!selectedIds.includes(card.id));
    const cardsPane=parentDocument.createElement('div');cardsPane.className='deckEditorCardsPane';
    const list=parentDocument.createElement('div');list.className='deckCardList';
    for(const card of shown)list.appendChild(makeCardTile(card,'browse',values,categories));
    cardsPane.appendChild(list);

    const controls=parentDocument.createElement('aside');controls.className='deckEditorControlsPane';
    const stack=parentDocument.createElement('div');stack.className='deckEditorControlStack';
    const summaryCard=controlCard('BROWSE SUMMARY');
    const summary=parentDocument.createElement('div');summary.className='deckEditorSummary';
    summary.innerHTML=`<strong>${shown.length} SHOWN</strong><span>${selectedIds.length} cards currently in the deck</span>`;
    summaryCard.appendChild(summary);
    const familyCard=controlCard('CARD FAMILIES');
    const familyBar=parentDocument.createElement('div');familyBar.className='deckFamilyBar';
    for(const item of families){
      const button=makeButton(`deckFamilyBtn${item===family?' on':''}`,item,()=>{
        const previousKey=editorContextKey();
        saveEditorScroll(values,previousKey);
        family=item;persistUi();
        renderEditor(values,categories);
      });
      familyBar.appendChild(button);
    }
    familyCard.appendChild(familyBar);
    const actionsCard=controlCard('FAMILY ACTIONS');
    const addShown=makeButton('deckBatchBtn',missing.length?`ADD SHOWN · ${missing.length}`:'ALL SHOWN ADDED',()=>{
      if(!missing.length)return;
      saveEditorScroll(values);
      selectedIds=uniqueCards([...selectedCards(),...missing]).map(card=>card.id);
      applySelected();
      renderEditor(values,categories);
    });
    addShown.disabled=!missing.length;
    const note=parentDocument.createElement('span');note.className='deckControlNote';note.textContent='This control column and the card list scroll independently.';
    actionsCard.append(addShown,note);
    stack.append(summaryCard,familyCard,actionsCard);controls.appendChild(stack);
    root.append(cardsPane,controls);
  }
  function renderCurrentDeck(root,values,categories){
    const cards=selectedCards();
    const stanceCount=cards.filter(card=>!isNonStance(card)).length;
    const cardsPane=parentDocument.createElement('div');cardsPane.className='deckEditorCardsPane';
    const list=parentDocument.createElement('div');list.className='deckCardList';
    if(!cards.length){const empty=parentDocument.createElement('div');empty.className='deckEmpty';empty.textContent='No cards selected.';list.appendChild(empty);}
    else for(const card of cards)list.appendChild(makeCardTile(card,'deck',values,categories));
    cardsPane.appendChild(list);

    const controls=parentDocument.createElement('aside');controls.className='deckEditorControlsPane';
    const stack=parentDocument.createElement('div');stack.className='deckEditorControlStack';
    const summaryCard=controlCard('CURRENT DECK');
    const summary=parentDocument.createElement('div');summary.className='deckEditorSummary';
    summary.innerHTML=`<strong>${cards.length} CARDS</strong><span>${stanceCount} stances · ${cards.length-stanceCount} other cards</span>`;
    summaryCard.appendChild(summary);
    const countsCard=controlCard('FAMILY COUNTS');
    const countList=parentDocument.createElement('div');countList.className='deckCountList';
    for(const item of families.filter(item=>item!=='ALL')){
      const count=cards.filter(card=>cardFamily(card)===item).length;
      const row=parentDocument.createElement('div');row.className='deckCountRow';
      const label=parentDocument.createElement('span');label.textContent=item;
      const value=parentDocument.createElement('strong');value.textContent=String(count);
      row.append(label,value);countList.appendChild(row);
    }
    countsCard.appendChild(countList);
    const noteCard=controlCard('EDITING');
    const note=parentDocument.createElement('span');note.className='deckControlNote';note.textContent='Remove cards from the list on the left. The final stance stays protected so the combat deck always remains playable.';
    noteCard.appendChild(note);
    stack.append(summaryCard,countsCard,noteCard);controls.appendChild(stack);
    root.append(cardsPane,controls);
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
  function setEditorMode(dock,values,enabled){
    dock.classList.toggle('deckEditorMode',enabled);
    values.classList.toggle('deckEditorActive',enabled);
  }
  function renderEditor(values,categories){
    if(!activeView||rendering)return;
    rendering=true;
    const dock=parentDocument.getElementById('labDock');
    setEditorMode(dock,values,true);
    const root=parentDocument.createElement('div');
    root.className='deckEditorRoot';root.dataset.view=activeView;
    if(activeView==='browse')renderBrowse(root,values,categories);else renderCurrentDeck(root,values,categories);
    values.replaceChildren(root);
    values.scrollTop=0;values.scrollLeft=0;
    const hint=parentDocument.getElementById('categoryHint');
    if(hint)hint.textContent=activeView==='browse'?'Browse cards while the family controls remain in their own column.':'Review the complete live deck and remove cards.';
    syncCategoryButtons(categories);
    rendering=false;
    restoreEditorScroll(values);
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
      if(!initialized||activeView)return;
      saveBaseScroll(values,categories);
    },{passive:true});
    categories.addEventListener('click',event=>{
      const editorButton=event.target.closest?.('[data-deck-editor-category]');
      saveActiveScroll(values,categories);
      if(editorButton){
        event.preventDefault();event.stopPropagation();
        activeView=editorButton.dataset.deckEditorCategory;
        renderEditor(values,categories);
        return;
      }
      if(activeView){
        activeView=null;
        setEditorMode(dock,values,false);
      }
      pendingBaseRestore=true;
    },true);

    new MutationObserver(()=>{
      syncCategoryButtons(categories);
      if(activeView&&!values.querySelector(`.deckEditorRoot[data-view="${activeView}"]`))renderEditor(values,categories);
    }).observe(categories,{childList:true,subtree:true});
    new MutationObserver(()=>{
      if(activeView){
        if(!values.querySelector(`.deckEditorRoot[data-view="${activeView}"]`))renderEditor(values,categories);
      }else if(pendingBaseRestore){
        pendingBaseRestore=false;
        restoreBaseScroll(values,currentBaseKey(categories));
      }
    }).observe(values,{childList:true});

    window.__enemyLabDeckEditor={
      get catalog(){return catalog.slice();},
      get cardIds(){return selectedIds.slice();},
      get activeView(){return activeView;},
      get family(){return family;},
      add(id){if(!byId.has(id)||selectedIds.includes(id))return false;if(activeView)saveEditorScroll(values);selectedIds.push(id);applySelected();if(activeView)renderEditor(values,categories);return true;},
      remove(id){const card=byId.get(id);if(!card||!selectedIds.includes(id))return false;if(!isNonStance(card)&&selectedCards().filter(item=>!isNonStance(item)).length<=1)return false;if(activeView)saveEditorScroll(values);selectedIds=selectedIds.filter(cardId=>cardId!==id);applySelected();if(activeView)renderEditor(values,categories);return true;},
      show(view='browse'){if(activeView)saveEditorScroll(values);activeView=view==='deck'?'deck':'browse';renderEditor(values,categories);},
    };
  }
  finishInstall();
}
