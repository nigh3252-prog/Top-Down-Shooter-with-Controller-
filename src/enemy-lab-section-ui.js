import {
  ALL_ENEMIES_BUDGET_ID,
  WORKING_ROSTER_HADES_ID,
} from './encounter-pools.js';
import { createEnemyLabSectionScrollMemory } from './enemy-lab-inspector-shell.js';

const LAB_DIRECT_ENCOUNTER_MODE='lab-direct';
const PLANNED_MODE_IDS=new Set([ALL_ENEMIES_BUDGET_ID,WORKING_ROSTER_HADES_ID,'flare-level-1','hades-tartarus']);

function panel(document,title,description,content){
  const root=document.createElement('section');root.className='labSectionPanel';
  const heading=document.createElement('div');heading.className='labSectionPanelHead';
  const titleNode=document.createElement('b');titleNode.textContent=title;
  const detail=document.createElement('span');detail.textContent=description;
  heading.append(titleNode,detail);root.append(heading,content);return root;
}

function buttonChoice(choice,{label,sub='',active=false,disabled=false,className='',onClick}={}){
  const button=choice({label,sub,active,className,onClick});button.disabled=!!disabled;return button;
}

export function installEnemyLabSectionUI({
  document=globalThis.document,
  runtime,
  sectionRegistry,
  state,
  catalog,
  familyOrder,
  categoriesEl,
  values,
  categoryHint,
  choice,
  list,
  status,
  save,
  renderCapture,
  renderSpawn,
  renderRoom,
  renderType,
  renderEnemy,
  renderControlGroup,
  startTest,
  clearTest,
  setMessage,
  renderWorkspace=()=>null,
  selectWorkspace=()=>{},
}={}){
  if(!document||!runtime||!sectionRegistry)return null;

  const snapshot=()=>runtime.snapshot?.()||runtime.getLabSnapshot?.()||{controlGroups:[]};
  // These are the original live nodes. Keeping their references lets the
  // renderer park and reparent them without losing existing listeners or IDs.
  const workflowBar=document.getElementById('labWorkflowBar');
  const profileBar=document.getElementById('labProfileBar');
  const controlParkingHost=document.getElementById('labControlStaging');
  const group=(data,id)=>data.controlGroups?.find(item=>item.id===id)||null;
  const renderGroup=(data,id)=>{
    const item=group(data,id);
    return item?renderControlGroup(item):status(`${id.toUpperCase()} UNAVAILABLE`,'This Lab control group is not available yet.');
  };
  const groupsForSection=(data,sectionId)=>((data.controlGroups||[]).map(item=>({
    ...item,
    controls:(item.controls||[]).filter(control=>String(control.placement?.section||'').toLowerCase()===sectionId&&control.placement?.workspace!=='setup'),
  })).filter(item=>item.controls.length));
  const renderSectionGroups=(data,sectionId)=>list(...groupsForSection(data,sectionId).map(item=>renderControlGroup(item)));
  const sectionScrollMemory=createEnemyLabSectionScrollMemory({sectionIds:sectionRegistry.sectionIds});
  const viewContentCache=new Map();
  let renderedSectionId='';
  const rememberRenderedSection=()=>{
    if(renderedSectionId)sectionScrollMemory.remember(renderedSectionId,values?.scrollTop||0);
  };
  const selectSection=id=>{
    const definition=sectionRegistry.getDefinition(id);
    if(!definition)return{ok:false,reason:`Unknown Enemy Lab section: ${id}`};
    if(definition.id!=='profiles'&&state.workspaceMode&&state.workspaceMode!=='test')selectWorkspace?.('test');
    rememberRenderedSection();
    if(state.category!==definition.id){state.category=definition.id;save();}
    return sectionRegistry.select(definition.id);
  };

  function encounterModes(){
    const data=snapshot(),simulation=group(data,'simulation');
    const options=[{id:LAB_DIRECT_ENCOUNTER_MODE,label:'DIRECT LAB COMPOSITION',sub:'Focal enemy · solo, pack, or paired wave'}];
    for(const control of simulation?.controls||[]){
      if(control.id!=='simulation.spawn-kind')continue;
      for(const option of control.options||[]){
        if(PLANNED_MODE_IDS.has(option.value))options.push({id:option.value,label:option.label,sub:'Planner-backed encounter mode'});
      }
    }
    return options;
  }

  function chooseEncounterMode(id){
    const result=runtime.selectEncounterMode?.(id)||{ok:false,reason:'Encounter mode API unavailable.'};
    if(result.ok){state.encounterMode=id;save();setMessage?.('');sectionRegistry.invalidate('encounter');return result;}
    if(result.mode)state.encounterMode=result.mode;
    save();
    setMessage?.(result.warning||result.reason||'Encounter mode is unavailable.');
    sectionRegistry.invalidate('encounter');
    return result;
  }

  function renderEncounterModePanel(){
    const data=snapshot(),roster=runtime.enemySystem?.getWorkingRosterEncounterStatus?.()||{ids:[]};
    if(state.encounterMode===WORKING_ROSTER_HADES_ID&&!roster.ids?.length){
      const fallback=runtime.selectEncounterMode?.(WORKING_ROSTER_HADES_ID);
      state.encounterMode=fallback?.mode||ALL_ENEMIES_BUDGET_ID;save();
      setMessage?.(fallback?.warning||'Working roster was cleared; falling back to All · Budgeted Encounter.');
    }
    const root=document.createElement('div');root.className='encounterModePanel';
    const heading=document.createElement('div');heading.className='row';
    const title=document.createElement('b');title.textContent='ENCOUNTER SOURCE';heading.appendChild(title);root.appendChild(heading);
    for(const option of encounterModes()){
      const rosterUnavailable=option.id===WORKING_ROSTER_HADES_ID&&!roster.ids?.length;
      const sub=rosterUnavailable?'Unavailable · configure the working roster first':option.sub;
      const button=buttonChoice(choice,{label:option.label,sub,active:state.encounterMode===option.id,disabled:rosterUnavailable,onClick:()=>chooseEncounterMode(option.id)});
      button.dataset.encounterMode=option.id;root.appendChild(button);
    }
    if(!roster.ids?.length){
      root.appendChild(buttonChoice(choice,{label:'CONFIGURE ROSTER',sub:'Select at least one enemy to enable roster planning.',className:'primary',onClick:()=>selectSection('enemies')}));
    }else if(data.encounterModeWarning){
      root.appendChild(status('ENCOUNTER WARNING',data.encounterModeWarning));
    }
    return root;
  }

  function renderDirectEncounter(){
    const enemy=catalog.find(item=>item.id===state.enemyId)||catalog[0];
    const root=document.createElement('div');root.className='valueList';
    root.appendChild(status('FOCAL ENEMY',`${enemy?.family||'UNKNOWN'} · ${enemy?.label||'Unknown enemy'} · ${enemy?.role||'No role data'}`));
    root.appendChild(buttonChoice(choice,{label:'EDIT ENEMIES / ROSTER',sub:'Choose the focal enemy or maintain the saved planner roster.',onClick:()=>selectSection('enemies')}));
    root.append(renderSpawn());
    return root;
  }

  function renderRunActions(){
    const root=document.createElement('div');root.className='valueList';
    const planned=state.encounterMode!==LAB_DIRECT_ENCOUNTER_MODE;
    const enemy=catalog.find(item=>item.id===state.enemyId)||catalog[0];
    const configured=planned
      ?`Planner · ${encounterModes().find(option=>option.id===state.encounterMode)?.label||state.encounterMode}`
      :`${enemy?.label||'Focal enemy'} · ${state.mode.toUpperCase()}`;
    root.appendChild(status('CONFIGURED ENCOUNTER',configured));
    const spawn=buttonChoice(choice,{label:'SPAWN TEST',sub:planned?'Start the selected planner-backed mode':'Start the direct focal composition',className:'primary',onClick:()=>startTest?.()});
    root.appendChild(spawn);
    root.appendChild(buttonChoice(choice,{label:'CLEAR',sub:'Remove active enemies and queued spawns',className:'danger',onClick:()=>{clearTest?.();sectionRegistry.invalidate('encounter');}}));
    root.appendChild(buttonChoice(choice,{label:'REPEAT',sub:'Run the current configuration again',onClick:()=>startTest?.()}));
    root.appendChild(buttonChoice(choice,{label:'RESET FIGHT',sub:'Respawn the player and clear the current encounter',onClick:()=>runtime.resetFight?.()}));
    return root;
  }

  function renderEncounter(){
    const root=document.createElement('div');root.className='labSectionContent';
    root.append(panel(document,'ENCOUNTER SOURCE','Direct focal testing is separate from planner-backed modes.',renderEncounterModePanel()));
    root.append(panel(document,'DIRECT LAB COMPOSITION','Use this for one focal enemy, matching packs, or a manually paired wave.',renderDirectEncounter()));
    root.append(panel(document,'CHAMBER','The Lab uses a single visible test chamber.',renderRoom(snapshot())));
    root.append(panel(document,'RUN','Start, clear, repeat, or reset the configured encounter.',renderRunActions()));
    return root;
  }

  function renderEnemies(){
    const root=document.createElement('div');root.className='labSectionContent';
    root.append(panel(document,'FOCAL ENEMY','The direct Lab composition uses this selected enemy.',list(...renderType().childNodes, ...renderEnemy().childNodes)));
    const tuning=renderSectionGroups(snapshot(),'enemies');if(tuning.childNodes.length)root.append(panel(document,'CONTEXTUAL TUNING','Enemy-specific settings appear beside the roster they affect.',tuning));
    return root;
  }

  const coreViews=[
    {id:'core-encounter',sectionId:'encounter',label:'ENCOUNTER',order:0,render:renderEncounter},
    {id:'core-enemies',sectionId:'enemies',label:'FOCAL ENEMY',order:0,render:renderEnemies},
    {id:'core-loadout',sectionId:'loadout',label:'ACTIVE LOADOUT',order:0,render:()=>panel(document,'ACTIVE LOADOUT','Weapon, stance, input, deck, and ability tuning share one player workspace.',renderSectionGroups(snapshot(),'loadout'))},
    {id:'core-combat',sectionId:'combat',label:'COMBAT BEHAVIOR',order:0,render:()=>panel(document,'COMBAT BEHAVIOR','Director and global encounter tuning share one behavior workspace.',renderSectionGroups(snapshot(),'combat'))},
    {id:'core-visuals',sectionId:'visuals',label:'VISUAL STYLE',order:0,render:()=>panel(document,'VISUAL STYLE','Theme and maze settings are saved as presentation settings.',renderSectionGroups(snapshot(),'visuals'))},
    {id:'core-capture',sectionId:'capture',label:'ARCANA CAPTURE',order:0,render:renderCapture},
    {id:'core-diagnostics',sectionId:'diagnostics',label:'RUNTIME DIAGNOSTICS',order:0,render:()=>panel(document,'RUNTIME DIAGNOSTICS','Feel, hit response, and stance diagnostics remain grouped together.',renderSectionGroups(snapshot(),'diagnostics'))},
    {id:'core-profiles',sectionId:'profiles',label:'PROFILE MANAGEMENT',order:0,render:()=>{
      const root=document.createElement('div');root.className='labProfileSection';
      for(const slot of sectionRegistry.getSlots('profiles'))root.append(slot.render({document,runtime,sectionRegistry,state}));
      return root;
    }},
  ];
  for(const view of coreViews)sectionRegistry.registerView(view);

  function appendProfilesChrome(root,{includeProfileBar=false}={}){
    if(workflowBar&&!workflowBar.hidden)root.append(workflowBar);
    if(includeProfileBar&&profileBar&&!profileBar.hidden)root.append(profileBar);
  }

  function parkProfilesChrome(){
    if(!controlParkingHost)return;
    if(workflowBar)controlParkingHost.append(workflowBar);
    if(profileBar)controlParkingHost.append(profileBar);
  }

  function appendRegisteredView(root,view,context){
    const next=view.render(context);
    if(next)viewContentCache.set(view.id,next);
    const content=next||viewContentCache.get(view.id);
    if(content)root.append(content);
  }

  function renderCategories(data=snapshot()){
    const oldTop=categoriesEl.scrollTop;
    const sections=sectionRegistry.sections({controlGroups:data.controlGroups||[]});
    if(!sections.some(section=>section.id===state.category))state.category='encounter';
    categoriesEl.hidden=false;
    categoriesEl.replaceChildren(...sections.map(section=>{
      const button=choice({label:section.label,sub:'',active:state.category===section.id,className:section.className,onClick:()=>selectSection(section.id)});
      button.dataset.enemyLabSection=section.id;
      button.setAttribute('aria-current',state.category===section.id?'page':'false');
      button.setAttribute('aria-controls','labValues');
      return button;
    }));
    requestAnimationFrame(()=>{categoriesEl.scrollTop=oldTop;});
  }

  function renderValues({preserveScroll=false}={}){
    if(preserveScroll)rememberRenderedSection();
    const previousSectionId=renderedSectionId;
    parkProfilesChrome();
    const data=snapshot(),definition=sectionRegistry.getDefinition(state.category);
    if(!definition){state.category='encounter';save();return renderValues({preserveScroll});}
    categoryHint.textContent=definition.description;
    const root=document.createElement('div');root.className='labSectionRoot';root.dataset.sectionId=definition.id;
    if(definition.id==='profiles'){
      appendProfilesChrome(root,{includeProfileBar:state.workspaceMode==='test'});
      if(state.workspaceMode&&state.workspaceMode!=='test'){
        root.append(renderWorkspace(state.workspaceMode)||status('WORKSPACE LOADING','The setup workflow is initializing.'));
      }else{
        for(const view of sectionRegistry.getViews(definition.id)){
          appendRegisteredView(root,view,{document,runtime,sectionRegistry,state,data,catalog,familyOrder});
        }
      }
    }else{
      for(const view of sectionRegistry.getViews(definition.id)){
        appendRegisteredView(root,view,{document,runtime,sectionRegistry,state,data,catalog,familyOrder});
      }
    }
    if(!root.childNodes.length)root.append(status('SECTION LOADING','This section is waiting for its controls to register.'));
    const targetScrollTop=previousSectionId===definition.id&&!preserveScroll?0:sectionScrollMemory.restore(definition.id);
    values.replaceChildren(root);
    renderedSectionId=definition.id;
    sectionScrollMemory.activate(definition.id);
    values.scrollTop=targetScrollTop;
    requestAnimationFrame(()=>{
      if(renderedSectionId===definition.id)values.scrollTop=targetScrollTop;
    });
  }

  function renderAll({preserveCategoryScroll=false,preserveValueScroll=false}={}){
    const categoryTop=categoriesEl.scrollTop;
    renderCategories(snapshot());renderValues({preserveScroll:preserveValueScroll});
    if(preserveCategoryScroll)requestAnimationFrame(()=>{categoriesEl.scrollTop=categoryTop;});
  }

  if(sectionRegistry.activeSection!==state.category)sectionRegistry.select(state.category);
  const unsubscribe=sectionRegistry.subscribe(event=>{
    if(event.type==='remove'&&event.viewId)viewContentCache.delete(event.viewId);
    if(event.type==='select'&&event.sectionId!==state.category){
      rememberRenderedSection();
      state.category=event.sectionId;
      save();
      if(event.sectionId!=='profiles'&&state.workspaceMode&&state.workspaceMode!=='test')selectWorkspace?.('test');
    }
    if(['register','remove','slot-register','slot-remove','select','invalidate'].includes(event.type)){
      renderAll({preserveCategoryScroll:true,preserveValueScroll:true});
    }
  });
  renderAll();
  return{renderCategories,renderValues,renderAll,get activeSection(){return sectionScrollMemory.activeSection;},getSectionScrollPositions:()=>sectionScrollMemory.snapshot(),destroy:unsubscribe};
}
