import { WORKING_ROSTER_HADES_ID } from './encounter-pools.js';

export const ENEMY_LAB_WORKING_ROSTER_STORAGE_KEY='enemyLab.workingRoster.v1';

export function normalizeWorkingRosterIds(ids,catalog=[]){
  const requested=new Set(Array.isArray(ids)?ids.map(id=>String(id)):[]);
  return (catalog||[]).filter(enemy=>requested.has(String(enemy?.id))).map(enemy=>String(enemy.id));
}

export function toggleWorkingRosterId(ids,id,catalog=[]){
  const validIds=new Set((catalog||[]).map(enemy=>String(enemy?.id)));
  const key=String(id||'');
  const selected=new Set(normalizeWorkingRosterIds(ids,catalog));
  if(!validIds.has(key))return [...selected];
  if(selected.has(key))selected.delete(key);else selected.add(key);
  return (catalog||[]).filter(enemy=>selected.has(String(enemy?.id))).map(enemy=>String(enemy.id));
}

export function readWorkingRoster(storage,catalog=[]){
  try{
    const parsed=JSON.parse(storage?.getItem?.(ENEMY_LAB_WORKING_ROSTER_STORAGE_KEY)||'[]');
    return normalizeWorkingRosterIds(parsed,catalog);
  }catch{return [];}
}

export function writeWorkingRoster(storage,ids,catalog=[]){
  const normalized=normalizeWorkingRosterIds(ids,catalog);
  try{storage?.setItem?.(ENEMY_LAB_WORKING_ROSTER_STORAGE_KEY,JSON.stringify(normalized));}catch{}
  return normalized;
}

const statusLabel=status=>({
  'lab-only':'LAB ONLY',
  candidate:'CANDIDATE',
  'arena-ready':'ARENA READY',
}[status]||'CANDIDATE');

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
  const card=document.createElement('div');card.className='statusCard';card.dataset.workingRosterStatus='1';
  const heading=document.createElement('b');heading.textContent=title;
  const detail=document.createElement('span');detail.textContent=body;
  card.append(heading,detail);return card;
}

export function installEnemyLabWorkingRoster({catalog=[],families=[],storage=globalThis.localStorage,document=globalThis.document}={}){
  if(!document||!Array.isArray(catalog)||!catalog.length)return{installed:false,reason:'missing-enemy-lab'};
  const page=new URL(document.location?.href||globalThis.location?.href||'http://localhost/enemy-lab.html');
  if(page.searchParams.get('capture')==='1')return{installed:false,reason:'capture-mode'};
  const categories=document.getElementById('labCategories'),values=document.getElementById('labValues'),hint=document.getElementById('categoryHint');
  if(!categories||!values)return{installed:false,reason:'missing-controls'};
  if(document.documentElement.dataset.enemyLabWorkingRoster==='1')return globalThis.__enemyLabWorkingRoster||{installed:true};
  document.documentElement.dataset.enemyLabWorkingRoster='1';

  const style=document.createElement('style');
  style.textContent=`
    #labCategories .choice.rosterCategory{border-color:#b47b45;color:#ffd09a;background:rgba(130,77,34,.25)}
    #labCategories .choice.rosterCategory.on{border-color:#ffd09a;color:#fff1dc;background:rgba(190,108,47,.42);box-shadow:inset 0 0 0 1px rgba(255,208,154,.28)}
    [data-working-roster-root] .choice.on{border-color:#85d7c8;background:rgba(69,139,126,.2);box-shadow:inset 0 0 0 1px rgba(133,215,200,.24)}
  `;
  document.head.appendChild(style);

  let rosterIds=readWorkingRoster(storage,catalog),rosterOpen=false,familyFilter='ALL',renderQueued=false;
  const familyOrder=['ALL',...(families||[])];
  const rosterSet=()=>new Set(rosterIds);
  const persist=ids=>{rosterIds=writeWorkingRoster(storage,ids,catalog);syncCategoryLabel();return rosterIds;};

  function categoryButton(){return categories.querySelector('[data-working-roster-category="1"]');}
  function syncCategoryLabel(){
    const button=categoryButton();if(!button)return;
    const title=button.querySelector('b');if(title)title.textContent=rosterIds.length?`ROSTER · ${rosterIds.length}`:'ROSTER';
  }
  function queueRender(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;if(rosterOpen)renderRoster();});}
  function activateRoster(){
    rosterOpen=true;
    for(const button of categories.querySelectorAll('.choice'))button.classList.toggle('on',button.dataset.workingRosterCategory==='1');
    renderRoster();
  }
  function ensureCategory(){
    if(categoryButton()){syncCategoryLabel();return;}
    const button=makeChoice(document,{label:rosterIds.length?`ROSTER · ${rosterIds.length}`:'ROSTER',className:'rosterCategory',onClick:event=>{event.preventDefault();event.stopPropagation();activateRoster();}});
    button.dataset.workingRosterCategory='1';categories.appendChild(button);
    if(rosterOpen)button.classList.add('on');
  }
  function startHadesStyleEncounter(){
    if(!rosterIds.length)return{ok:false,error:'Select at least one enemy first.'};
    const frame=document.getElementById('arenaFrame'),frameWindow=frame?.contentWindow,frameDocument=frame?.contentDocument;
    const select=frameDocument?.getElementById('spawnSelect');
    if(select?.querySelector(`option[value="${WORKING_ROSTER_HADES_ID}"]`)){
      select.value=WORKING_ROSTER_HADES_ID;
      select.dispatchEvent(new frameWindow.Event('change',{bubbles:true}));
    }else{
      const system=frameWindow?.__enemyLabEnemySystem;
      if(!system?.setSpawnKind)return{ok:false,error:'Combat Arena is still loading.'};
      system.setSpawnKind(WORKING_ROSTER_HADES_ID);
      frameWindow?.__enemyLabControlBridge?.resetFight?.();
    }
    document.getElementById('closeBtn')?.click();
    return{ok:true,ids:[...rosterIds]};
  }
  function renderRoster(){
    if(!rosterOpen)return;
    const oldTop=values.scrollTop,oldLeft=values.scrollLeft;
    if(hint)hint.textContent='Build a saved draft roster, then launch it through the Hades-style encounter composer.';
    const root=document.createElement('div');root.className='valueList';root.dataset.workingRosterRoot='1';
    root.appendChild(makeStatus(document,'WORKING ARENA ROSTER',`${rosterIds.length} of ${catalog.length} enemies selected. This is a local draft workspace, not a finished-content approval list.`));

    const startButton=makeChoice(document,{
      label:'START HADES-STYLE',
      sub:rosterIds.length?`Restart Combat Arena using only these ${rosterIds.length} selected enemies`:'Select at least one enemy first',
      meta:'USES THE REAL COMBAT ARENA',
      className:'primary',
      onClick:()=>startHadesStyleEncounter(),
    });
    startButton.disabled=!rosterIds.length;
    startButton.dataset.workingRosterStart='1';
    root.appendChild(startButton);

    const filterCard=document.createElement('div');filterCard.className='controlCard';
    const filterLabel=document.createElement('label');filterLabel.textContent='SHOW FAMILY';filterLabel.style.cssText='font-size:8.5px;color:var(--muted);letter-spacing:.07em';
    const select=document.createElement('select');
    for(const family of familyOrder){const option=document.createElement('option');option.value=family;option.textContent=family;option.selected=family===familyFilter;select.appendChild(option);}
    select.addEventListener('change',()=>{familyFilter=select.value;renderRoster();});
    const actions=document.createElement('div');actions.className='row';
    const shown=()=>catalog.filter(enemy=>familyFilter==='ALL'||enemy.family===familyFilter).map(enemy=>enemy.id);
    for(const [label,handler] of [['ADD SHOWN',()=>persist([...new Set([...rosterIds,...shown()])])],['REMOVE SHOWN',()=>{const remove=new Set(shown());persist(rosterIds.filter(id=>!remove.has(id)));}],['CLEAR',()=>persist([])]]){
      const button=document.createElement('button');button.className='miniBtn';button.textContent=label;button.addEventListener('click',()=>{handler();renderRoster();});actions.appendChild(button);
    }
    filterCard.append(filterLabel,select,actions);root.appendChild(filterCard);

    const selected=rosterSet();
    for(const enemy of catalog.filter(enemy=>familyFilter==='ALL'||enemy.family===familyFilter)){
      const active=selected.has(enemy.id),readiness=statusLabel(enemy.arenaStatus);
      const tags=(enemy.tags||[]).slice(0,3).join(' · ');
      const button=makeChoice(document,{
        label:enemy.label,
        sub:`${enemy.role} · ${readiness}`,
        meta:active?'IN WORKING ROSTER':`${enemy.family}${tags?` · ${tags}`:''}`,
        active,
        onClick:()=>{persist(toggleWorkingRosterId(rosterIds,enemy.id,catalog));renderRoster();},
      });
      button.dataset.enemyId=enemy.id;button.dataset.rosterSelected=active?'1':'0';root.appendChild(button);
    }
    values.replaceChildren(root);
    requestAnimationFrame(()=>{values.scrollTop=oldTop;values.scrollLeft=oldLeft;});
  }

  categories.addEventListener('click',event=>{
    const button=event.target.closest?.('.choice');if(!button||button.dataset.workingRosterCategory==='1')return;
    rosterOpen=false;
  },true);
  new MutationObserver(()=>{ensureCategory();if(rosterOpen)queueRender();}).observe(categories,{childList:true});
  new MutationObserver(()=>{if(rosterOpen&&!values.querySelector('[data-working-roster-root="1"]'))queueRender();}).observe(values,{childList:true});
  ensureCategory();

  const api={
    installed:true,
    catalog,
    getIds:()=>[...rosterIds],
    snapshot:()=>({ids:[...rosterIds],count:rosterIds.length,enemies:catalog.filter(enemy=>rosterSet().has(enemy.id))}),
    setIds:ids=>{persist(ids);if(rosterOpen)renderRoster();return[...rosterIds];},
    clear:()=>{persist([]);if(rosterOpen)renderRoster();return[];},
    open:activateRoster,
    start:startHadesStyleEncounter,
  };
  globalThis.__enemyLabWorkingRoster=api;
  return api;
}
