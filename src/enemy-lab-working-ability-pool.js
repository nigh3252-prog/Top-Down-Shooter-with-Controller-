import {
  ARENA_ABILITY_CATALOG,
  ARENA_ABILITY_FAMILIES,
  normalizeArenaAbilityIds,
} from './arena-ability-catalog.js';

export const ENEMY_LAB_WORKING_ABILITY_POOL_KEY='enemyLab.workingAbilityPool.v1';

export function normalizeWorkingAbilityPoolIds(ids,catalog=ARENA_ABILITY_CATALOG){
  return normalizeArenaAbilityIds(ids,catalog);
}

export function toggleWorkingAbilityPoolId(ids,id,catalog=ARENA_ABILITY_CATALOG){
  const valid=new Set((catalog||[]).map(entry=>String(entry?.id)));
  const key=String(id||'');
  const selected=new Set(normalizeWorkingAbilityPoolIds(ids,catalog));
  if(!valid.has(key))return[...selected];
  if(selected.has(key))selected.delete(key);else selected.add(key);
  return (catalog||[]).filter(entry=>selected.has(String(entry?.id))).map(entry=>String(entry.id));
}

export function readWorkingAbilityPool(storage=globalThis.localStorage,catalog=ARENA_ABILITY_CATALOG){
  try{
    const parsed=JSON.parse(storage?.getItem?.(ENEMY_LAB_WORKING_ABILITY_POOL_KEY)||'[]');
    return normalizeWorkingAbilityPoolIds(parsed,catalog);
  }catch{return[];}
}

export function writeWorkingAbilityPool(storage=globalThis.localStorage,ids=[],catalog=ARENA_ABILITY_CATALOG){
  const normalized=normalizeWorkingAbilityPoolIds(ids,catalog);
  try{storage?.setItem?.(ENEMY_LAB_WORKING_ABILITY_POOL_KEY,JSON.stringify(normalized));}catch{}
  return normalized;
}

function makeChoice(document,{label,sub='',meta='',active=false,className='',onClick}){
  const button=document.createElement('button');
  button.className=`choice${active?' on':''}${className?` ${className}`:''}`;
  const title=document.createElement('b');title.textContent=label;button.appendChild(title);
  if(sub){const detail=document.createElement('span');detail.textContent=sub;button.appendChild(detail);}
  if(meta){const footer=document.createElement('em');footer.textContent=meta;button.appendChild(footer);}
  button.addEventListener('click',onClick);
  return button;
}

function makeStatus(document,title,body){
  const card=document.createElement('div');card.className='statusCard';card.dataset.workingAbilityPoolStatus='1';
  const heading=document.createElement('b');heading.textContent=title;
  const detail=document.createElement('span');detail.textContent=body;
  card.append(heading,detail);return card;
}

export function installEnemyLabWorkingAbilityPool({
  catalog=ARENA_ABILITY_CATALOG,
  families=ARENA_ABILITY_FAMILIES,
  storage=globalThis.localStorage,
  hostWindow=globalThis,
  sectionRegistry=null,
}={}){
  const targetWindow=hostWindow||globalThis;
  let document;
  try{document=targetWindow?.document;}catch{return{installed:false,reason:'cross-origin'};}
  if(!document||!Array.isArray(catalog)||!catalog.length)return{installed:false,reason:'missing-enemy-lab'};
  const page=new URL(document.location?.href||'http://localhost/enemy-lab.html');
  if(page.searchParams.get('capture')==='1')return{installed:false,reason:'capture-mode'};
  const useRegistry=!!sectionRegistry;
  const categories=useRegistry?null:document.getElementById('labCategories');
  const values=useRegistry?null:document.getElementById('labValues');
  const hint=useRegistry?null:document.getElementById('categoryHint');
  if(!useRegistry&&(!categories||!values))return{installed:false,reason:'missing-controls'};
  if(document.documentElement.dataset.enemyLabWorkingAbilityPool==='1')return targetWindow.__enemyLabWorkingAbilityPool||{installed:true};
  document.documentElement.dataset.enemyLabWorkingAbilityPool='1';

  const style=document.createElement('style');
  style.textContent=`
    #labCategories .choice.abilityPoolCategory{border-color:#8772b9;color:#ded2ff;background:rgba(80,57,126,.24)}
    #labCategories .choice.abilityPoolCategory.on{border-color:#ded2ff;color:#fff;background:rgba(111,80,171,.40);box-shadow:inset 0 0 0 1px rgba(222,210,255,.24)}
    [data-working-ability-pool-root] .choice.on{border-color:#bca6f5;background:rgba(101,75,155,.20);box-shadow:inset 0 0 0 1px rgba(188,166,245,.24)}
  `;
  document.head.appendChild(style);

  let selectedIds=readWorkingAbilityPool(storage,catalog);
  let poolOpen=false;
  let familyFilter='ALL';
  let renderQueued=false;
  const familyOrder=['ALL',...(families||[])];
  const selectedSet=()=>new Set(selectedIds);
  const persist=ids=>{selectedIds=writeWorkingAbilityPool(storage,ids,catalog);syncCategoryLabel();return selectedIds;};

  function categoryButton(){return categories.querySelector('[data-working-ability-pool-category="1"]');}
  function syncCategoryLabel(){
    if(useRegistry)return;
    const button=categoryButton();if(!button)return;
    const title=button.querySelector('b');if(title)title.textContent=selectedIds.length?`ABILITY POOL · ${selectedIds.length}`:'ABILITY POOL';
  }
  function refreshPool(){if(useRegistry){sectionRegistry.invalidate('profiles');return;}renderPool();}
  function queueRender(){
    if(useRegistry)return;
    if(renderQueued)return;
    renderQueued=true;
    requestAnimationFrame(()=>{renderQueued=false;if(poolOpen)renderPool();});
  }
  function activatePool(){
    poolOpen=true;
    if(useRegistry){sectionRegistry.select('profiles');sectionRegistry.invalidate('profiles');return;}
    for(const button of categories.querySelectorAll('.choice'))button.classList.toggle('on',button.dataset.workingAbilityPoolCategory==='1');
    renderPool();
  }
  function ensureCategory(){
    if(categoryButton()){syncCategoryLabel();return;}
    const button=makeChoice(document,{
      label:selectedIds.length?`ABILITY POOL · ${selectedIds.length}`:'ABILITY POOL',
      className:'abilityPoolCategory',
      onClick:event=>{event.preventDefault();event.stopPropagation();activatePool();},
    });
    button.dataset.workingAbilityPoolCategory='1';
    categories.appendChild(button);
    if(poolOpen)button.classList.add('on');
  }
  function renderPool(){
    if(!poolOpen)return;
    const oldTop=values.scrollTop,oldLeft=values.scrollLeft;
    if(hint)hint.textContent='Choose which cards may appear in future Combat Arena run setup and room rewards. Current Deck remains a separate immediate test deck.';
    const root=document.createElement('div');root.className='valueList';root.dataset.workingAbilityPoolRoot='1';
    root.appendChild(makeStatus(document,'WORKING ABILITY POOL',`${selectedIds.length} of ${catalog.length} cards selected. This controls future availability; it does not replace the Current Deck yet.`));

    const filterCard=document.createElement('div');filterCard.className='controlCard';
    const filterLabel=document.createElement('label');filterLabel.textContent='SHOW FAMILY';filterLabel.style.cssText='font-size:8.5px;color:var(--muted);letter-spacing:.07em';
    const select=document.createElement('select');
    for(const family of familyOrder){
      const option=document.createElement('option');option.value=family;option.textContent=family;option.selected=family===familyFilter;select.appendChild(option);
    }
    select.addEventListener('change',()=>{familyFilter=select.value;refreshPool();});
    const actions=document.createElement('div');actions.className='row';
    const shown=()=>catalog.filter(entry=>familyFilter==='ALL'||entry.family===familyFilter).map(entry=>entry.id);
    const actionDefs=[
      ['ADD SHOWN',()=>persist([...new Set([...selectedIds,...shown()])])],
      ['REMOVE SHOWN',()=>{const remove=new Set(shown());persist(selectedIds.filter(id=>!remove.has(id)));}],
      ['CLEAR',()=>persist([])],
    ];
    for(const [label,handler] of actionDefs){
      const button=document.createElement('button');button.className='miniBtn';button.textContent=label;
      button.addEventListener('click',()=>{handler();refreshPool();});actions.appendChild(button);
    }
    filterCard.append(filterLabel,select,actions);root.appendChild(filterCard);

    const selected=selectedSet();
    for(const entry of catalog.filter(item=>familyFilter==='ALL'||item.family===familyFilter)){
      const active=selected.has(entry.id);
      const tags=(entry.tags||[]).filter(tag=>tag!==entry.type).slice(0,3).join(' · ');
      const button=makeChoice(document,{
        label:entry.name,
        sub:`${entry.family} · ${entry.type.toUpperCase()}`,
        meta:active?'IN WORKING ABILITY POOL':`${entry.source}${tags?` · ${tags}`:''}`,
        active,
        onClick:()=>{persist(toggleWorkingAbilityPoolId(selectedIds,entry.id,catalog));refreshPool();},
      });
      button.dataset.abilityId=entry.id;
      button.dataset.abilityPoolSelected=active?'1':'0';
      root.appendChild(button);
    }
    if(useRegistry)return root;
    values.replaceChildren(root);
    requestAnimationFrame(()=>{values.scrollTop=oldTop;values.scrollLeft=oldLeft;});
  }

  if(useRegistry){
    poolOpen=true;
    sectionRegistry.registerView({id:'working-ability-pool',sectionId:'profiles',label:'WORKING ABILITY POOL',description:'Saved ability IDs used by future profile/run setup.',order:20,render:()=>renderPool({mount:false})});
  }else{
    categories.addEventListener('click',event=>{
      const button=event.target.closest?.('.choice');
      if(!button||button.dataset.workingAbilityPoolCategory==='1')return;
      poolOpen=false;
    },true);
    ensureCategory();
  }

  const api={
    installed:true,
    catalog,
    getIds:()=>[...selectedIds],
    snapshot:()=>({ids:[...selectedIds],count:selectedIds.length,entries:catalog.filter(entry=>selectedSet().has(entry.id))}),
    setIds:ids=>{persist(ids);if(poolOpen)refreshPool();return[...selectedIds];},
    clear:()=>{persist([]);if(poolOpen)refreshPool();return[];},
    open:activatePool,
  };
  targetWindow.__enemyLabWorkingAbilityPool=api;
  globalThis.__enemyLabWorkingAbilityPool=api;
  return api;
}
