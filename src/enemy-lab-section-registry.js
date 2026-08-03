export const ENEMY_LAB_SECTION_ORDER=Object.freeze([
  'encounter',
  'enemies',
  'loadout',
  'combat',
  'visuals',
  'capture',
  'diagnostics',
  'profiles',
]);

export const ENEMY_LAB_SECTION_DEFINITIONS=Object.freeze([
  {id:'encounter',label:'ENCOUNTER',description:'Choose a direct Lab composition, chamber, and run action.',className:'encounterSection'},
  {id:'enemies',label:'ENEMIES / ROSTER',description:'Choose the focal enemy and maintain the working roster.',className:'enemiesSection'},
  {id:'loadout',label:'PLAYER LOADOUT',description:'Tune the active weapon, stance, and combat deck.',className:'loadoutSection'},
  {id:'combat',label:'COMBAT BEHAVIOR',description:'Tune director, combo timing, and enemy behavior.',className:'combatSection'},
  {id:'visuals',label:'VISUALS',description:'Tune theme and visual scale without changing Arena presentation.',className:'visualsSection'},
  {id:'capture',label:'CAPTURE',description:'Run deterministic Arcana capture fixtures and checkpoints.',className:'captureSection'},
  {id:'diagnostics',label:'DIAGNOSTICS',description:'Inspect feel, hit response, stance compatibility, and runtime state.',className:'diagnosticsSection'},
  {id:'profiles',label:'PROFILES',description:'Save and activate repeatable Lab environments.',className:'profilesSection'},
]);

export const ENEMY_LAB_CONTROL_GROUPS=Object.freeze({
  encounter:Object.freeze(['actions']),
  enemies:Object.freeze(['antelope']),
  loadout:Object.freeze(['loadout','combat','dash-jet','pilebunker']),
  combat:Object.freeze(['director','combat','simulation']),
  visuals:Object.freeze(['visuals','maze']),
  capture:Object.freeze([]),
  diagnostics:Object.freeze(['feel','hitfeel']),
  profiles:Object.freeze([]),
});

const SECTION_IDS=new Set(ENEMY_LAB_SECTION_ORDER);

function asId(value){return String(value||'').trim().toLowerCase();}

export function createEnemyLabSectionRegistry(){
  const views=new Map();
  const slots=new Map();
  const listeners=new Set();
  let activeSection='encounter';

  const emit=event=>{for(const listener of [...listeners])listener(event);};
  const getDefinition=id=>ENEMY_LAB_SECTION_DEFINITIONS.find(section=>section.id===id)||null;
  const getViews=sectionId=>[...views.values()]
    .filter(view=>view.sectionId===sectionId)
    .sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));

  function registerView({id,sectionId,label='',description='',order=100,render=null,slot=null}={}){
    const viewId=asId(id),parentId=asId(sectionId);
    if(!viewId||!SECTION_IDS.has(parentId))throw new Error(`Invalid Enemy Lab section view: ${id}`);
    if(typeof render!=='function')throw new Error(`Enemy Lab section view ${viewId} needs a render function.`);
    if(views.has(viewId))throw new Error(`Duplicate Enemy Lab section view: ${viewId}`);
    const view=Object.freeze({id:viewId,sectionId:parentId,label:String(label||viewId).trim(),description:String(description||''),order:Number(order)||100,render,slot:slot?String(slot):null});
    views.set(viewId,view);
    emit({type:'register',sectionId:parentId,view});
    return()=>{if(!views.delete(viewId))return false;emit({type:'remove',sectionId:parentId,viewId});return true;};
  }

  function registerSlot({id,sectionId='profiles',slot='profile-bar',render=null,order=0}={}){
    const slotId=asId(id),parentId=asId(sectionId);
    if(!slotId||!SECTION_IDS.has(parentId))throw new Error(`Invalid Enemy Lab section slot: ${id}`);
    if(typeof render!=='function')throw new Error(`Enemy Lab section slot ${slotId} needs a render function.`);
    if(slots.has(slotId))throw new Error(`Duplicate Enemy Lab section slot: ${slotId}`);
    const definition=Object.freeze({id:slotId,sectionId:parentId,slot:String(slot),render,order:Number(order)||0});
    slots.set(slotId,definition);
    emit({type:'slot-register',sectionId:parentId,slot:definition});
    return()=>{if(!slots.delete(slotId))return false;emit({type:'slot-remove',sectionId:parentId,slotId});return true;};
  }

  function select(sectionId){
    const id=asId(sectionId);
    if(!SECTION_IDS.has(id))return{ok:false,reason:`Unknown Enemy Lab section: ${sectionId}`};
    activeSection=id;
    emit({type:'select',sectionId:id});
    return{ok:true,sectionId:id};
  }

  function invalidate(sectionId=null){
    const id=sectionId?asId(sectionId):activeSection;
    if(id&&!SECTION_IDS.has(id))return false;
    emit({type:'invalidate',sectionId:id||null});
    return true;
  }

  function sections({controlGroups=[]}={}){
    const groups=new Map((controlGroups||[]).map(group=>[String(group.id),group]));
    return ENEMY_LAB_SECTION_DEFINITIONS.map(definition=>Object.freeze({
      ...definition,
      controlGroups:Object.freeze((ENEMY_LAB_CONTROL_GROUPS[definition.id]||[]).map(id=>groups.get(id)).filter(Boolean)),
      views:Object.freeze(getViews(definition.id).map(view=>Object.freeze({id:view.id,label:view.label,description:view.description,slot:view.slot}))),
      slots:Object.freeze([...slots.values()].filter(slot=>slot.sectionId===definition.id).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id)).map(slot=>Object.freeze({id:slot.id,slot:slot.slot}))),
    }));
  }

  return Object.freeze({
    get activeSection(){return activeSection;},
    get sectionIds(){return ENEMY_LAB_SECTION_ORDER.slice();},
    getDefinition,
    getViews,
    getSlots:sectionId=>[...slots.values()].filter(slot=>slot.sectionId===asId(sectionId)).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id)),
    sections,
    registerView,
    registerSlot,
    select,
    invalidate,
    dispatch:event=>{emit(event);return event;},
    subscribe(listener){if(typeof listener!=='function')return()=>{};listeners.add(listener);return()=>listeners.delete(listener);},
  });
}
