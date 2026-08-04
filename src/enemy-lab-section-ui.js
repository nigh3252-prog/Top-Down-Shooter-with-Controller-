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
  subcategoriesEl,
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
  onDetailScrollRestored=()=>{},
}={}){
  if(!document||!runtime||!sectionRegistry)return null;

  const snapshot=()=>runtime.snapshot?.()||runtime.getLabSnapshot?.()||{controlGroups:[]};
  // These are the original live nodes. Keeping their references lets the
  // renderer park and reparent them without losing existing listeners or IDs.
  const workflowBar=document.getElementById('labWorkflowBar');
  const profileBar=document.getElementById('labProfileBar');
  const controlParkingHost=document.getElementById('labControlStaging');
  const dock=document.getElementById('labDock');
  const group=(data,id)=>data.controlGroups?.find(item=>item.id===id)||null;
  const renderGroup=(data,id)=>{
    const item=group(data,id);
    return item?renderControlGroup(item):status(`${id.toUpperCase()} UNAVAILABLE`,'This Lab control group is not available yet.');
  };
  const groupsForSection=(data,sectionId,subsection='')=>((data.controlGroups||[]).map(item=>({
    ...item,
    controls:(item.controls||[]).filter(control=>String(control.placement?.section||'').toLowerCase()===sectionId&&control.placement?.workspace!=='setup'),
  })).map(item=>({...item,controls:item.controls.filter(control=>!subsection||String(control.placement?.subsection||item.placement?.subsection||'').trim()===subsection)})).filter(item=>item.controls.length));
  const renderSectionGroups=(data,sectionId,subsection='')=>list(...groupsForSection(data,sectionId,subsection).map(item=>renderControlGroup(item)));
  const detailScrollMemory=createEnemyLabSectionScrollMemory();
  const sectionRailScrollMemory=createEnemyLabSectionScrollMemory({sectionIds:sectionRegistry.sectionIds});
  let mainRailScrollTop=0;
  let restoringMainRail=false,restoringSecondaryRail=false;
  const viewContentCache=new Map();
  let renderedSectionId='';
  let renderedViewId='';
  const rememberRenderedSection=()=>{
    if(renderedViewId)detailScrollMemory.remember(renderedViewId,values?.scrollTop||0);
    if(renderedSectionId)sectionRailScrollMemory.remember(renderedSectionId,subcategoriesEl?.scrollTop||0);
  };
  const syncCompoundEditorShell=()=>{
    // Registry-backed editors use #labValues and its visible gutter. The
    // paired-pane mode remains available only to the legacy non-registry path.
    dock?.classList.remove('deckEditorMode','deckEditorLegacyMode','arcanaTweaksMode');
    values?.classList.remove('deckEditorActive','arcanaTweaksActive');
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

  const renderEncounterSource=()=>panel(document,'ENCOUNTER SOURCE','Direct focal testing is separate from planner-backed modes.',renderEncounterModePanel());
  const renderEncounterDirect=()=>panel(document,'DIRECT LAB COMPOSITION','Use this for one focal enemy, matching packs, or a manually paired wave.',renderDirectEncounter());
  const renderEncounterChamber=()=>panel(document,'CHAMBER','The Lab uses a single visible test chamber.',renderRoom(snapshot()));
  const renderEncounterRun=()=>panel(document,'RUN','Start, clear, repeat, or reset the configured encounter.',renderRunActions());

  const renderFocalEnemy=()=>panel(document,'FOCAL ENEMY','The direct Lab composition uses this selected enemy.',list(...renderType().childNodes,...renderEnemy().childNodes));
  const renderEnemyContext=()=>{
    const tuning=renderSectionGroups(snapshot(),'enemies');
    return panel(document,'CONTEXT TUNING','Enemy-specific settings appear only when their runtime family is available.',
      tuning.childNodes.length?tuning:status('NO CONTEXT TUNING','Select or load an enemy family with registered tuning controls.'));
  };

  const coreViews=[
    {id:'core-encounter',sectionId:'encounter',label:'SOURCE',description:'Choose direct or planner-backed encounter setup.',order:0,render:renderEncounterSource},
    {id:'encounter-direct',sectionId:'encounter',label:'DIRECT TEST',description:'Configure solo, pack, or paired-wave testing.',order:10,render:renderEncounterDirect},
    {id:'encounter-chamber',sectionId:'encounter',label:'CHAMBER',description:'Inspect the active Lab chamber fixture.',order:20,render:renderEncounterChamber},
    {id:'encounter-run',sectionId:'encounter',label:'RUN',description:'Spawn, clear, repeat, or reset the test.',order:30,render:renderEncounterRun},
    {id:'core-enemies',sectionId:'enemies',label:'FOCAL ENEMY',description:'Choose the enemy used by direct tests.',order:0,render:renderFocalEnemy},
    {id:'enemy-context-tuning',sectionId:'enemies',label:'CONTEXT TUNING',description:'Tune controls registered by the selected enemy systems.',order:30,render:renderEnemyContext},
    {id:'core-loadout',sectionId:'loadout',label:'WEAPON & STANCE',description:'Choose the active weapon, stance, and combat input.',order:0,render:()=>panel(document,'WEAPON & STANCE','Player controls used by the current Lab test.',renderSectionGroups(snapshot(),'loadout','Player'))},
    {id:'core-combat',sectionId:'combat',label:'DIRECTOR',description:'Choose the active encounter-director profile.',order:0,render:()=>panel(document,'DIRECTOR','Director behavior for the current Lab test.',renderSectionGroups(snapshot(),'combat','Director'))},
    {id:'core-visuals',sectionId:'visuals',label:'VISUAL STYLE',description:'Choose Neutral, Original, or Akai.',order:0,render:()=>panel(document,'VISUAL STYLE','Theme selection reloads the Lab with the same saved workspace.',renderSectionGroups(snapshot(),'visuals','Theme'))},
    {id:'core-capture',sectionId:'capture',label:'ARCANA CAPTURE',order:0,render:renderCapture},
    {id:'core-diagnostics',sectionId:'diagnostics',label:'FEEL',description:'Tune and test the active hit-feel tier.',order:0,render:()=>panel(document,'FEEL','Tune the active hit-feel tier without rebuilding this view.',renderSectionGroups(snapshot(),'diagnostics','Feel'))},
    {id:'core-profiles',sectionId:'profiles',label:'PROFILE MANAGEMENT',order:0,render:()=>{
      const root=document.createElement('div');root.className='labProfileSection';
      for(const slot of sectionRegistry.getSlots('profiles'))root.append(slot.render({document,runtime,sectionRegistry,state}));
      return root;
    }},
  ];
  for(const view of coreViews)sectionRegistry.registerView(view);

  const workflowSections=new Set(['loadout','combat','visuals','diagnostics']);
  const primarySubsectionBySection=new Map([
    ['loadout','Player'],
    ['combat','Director'],
    ['visuals','Theme'],
    ['diagnostics','Feel'],
  ]);
  const registerWorkflowViews=data=>{
    let registered=0;
    for(const sectionId of workflowSections){
      const subsections=[];
      for(const item of data.controlGroups||[]){
        for(const control of item.controls||[]){
          if(String(control.placement?.section||'').toLowerCase()!==sectionId||control.placement?.workspace==='setup')continue;
          const label=String(control.placement?.subsection||item.placement?.subsection||'').trim();
          if(label&&label!==primarySubsectionBySection.get(sectionId)&&!subsections.includes(label))subsections.push(label);
        }
      }
      subsections.forEach((label,index)=>{
        const id=`workflow-${sectionId}-${label.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}`;
        if(sectionRegistry.getViews(sectionId).some(view=>view.id===id))return;
        sectionRegistry.registerView({id,sectionId,label,description:`${label} controls for ${sectionId}.`,order:index+10,render:()=>panel(document,label,`Tune the ${label.toLowerCase()} settings registered for this section.`,renderSectionGroups(snapshot(),sectionId,label))});
        registered++;
      });
    }
    return registered;
  };
  registerWorkflowViews(snapshot());

  const initialViews={
    encounter:'core-encounter',
    enemies:sectionRegistry.getViews('enemies').some(view=>view.id==='working-roster')?'working-roster':'core-enemies',
    loadout:'core-loadout',
    combat:'core-combat',
    visuals:'core-visuals',
    capture:'core-capture',
    diagnostics:'core-diagnostics',
    profiles:'core-profiles',
  };
  for(const [sectionId,viewId] of Object.entries(initialViews)){
    if(sectionRegistry.getViews(sectionId).some(view=>view.id===viewId))sectionRegistry.selectView(sectionId,viewId);
  }

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
    mainRailScrollTop=categoriesEl.scrollTop;
    const targetScrollTop=mainRailScrollTop;
    const sections=sectionRegistry.sections({controlGroups:data.controlGroups||[]});
    if(!sections.some(section=>section.id===state.category))state.category='encounter';
    categoriesEl.hidden=false;
    restoringMainRail=true;
    categoriesEl.replaceChildren(...sections.map(section=>{
      const button=choice({label:section.label,sub:'',active:state.category===section.id,className:section.className,onClick:()=>selectSection(section.id)});
      button.dataset.enemyLabSection=section.id;
      button.setAttribute('aria-current',state.category===section.id?'page':'false');
      button.setAttribute('aria-controls','labValues');
      return button;
    }));
    categoriesEl.scrollTop=targetScrollTop;
    requestAnimationFrame(()=>{categoriesEl.scrollTop=targetScrollTop;restoringMainRail=false;});
  }

  function renderSubcategories(){
    if(!subcategoriesEl)return;
    const definition=sectionRegistry.getDefinition(state.category);
    const views=definition?sectionRegistry.getViews(definition.id):[];
    const active=sectionRegistry.getActiveView(definition?.id)?.id;
    const targetScrollTop=definition?sectionRailScrollMemory.restore(definition.id):0;
    restoringSecondaryRail=true;
    subcategoriesEl.replaceChildren(...views.map(view=>{
      const button=choice({label:view.label,sub:view.description,active:view.id===active,className:'labSubcategory',onClick:()=>selectView(view.id)});
      button.dataset.enemyLabView=view.id;
      button.setAttribute('aria-current',view.id===active?'page':'false');
      button.setAttribute('aria-controls','labValues');
      return button;
    }));
    subcategoriesEl.scrollTop=targetScrollTop;
    requestAnimationFrame(()=>{
      subcategoriesEl.scrollTop=targetScrollTop;
      requestAnimationFrame(()=>{subcategoriesEl.scrollTop=targetScrollTop;restoringSecondaryRail=false;});
    });
  }

  function selectView(viewId){
    const view=sectionRegistry.getViews(state.category).find(item=>item.id===viewId);
    if(!view)return{ok:false,reason:`Unknown Enemy Lab view: ${viewId}`};
    rememberRenderedSection();
    return sectionRegistry.selectView(state.category,view.id);
  }

  function renderValues({preserveScroll=false,memoryAlreadySaved=false}={}){
    if(preserveScroll&&!memoryAlreadySaved)rememberRenderedSection();
    const previousViewId=renderedViewId;
    parkProfilesChrome();
    const data=snapshot(),definition=sectionRegistry.getDefinition(state.category);
    if(!definition){state.category='encounter';save();return renderValues({preserveScroll,memoryAlreadySaved});}
    categoryHint.textContent=definition.description;
    const activeView=sectionRegistry.getActiveView(definition.id);
    const root=document.createElement('div');root.className='labSectionRoot';root.dataset.sectionId=definition.id;
    if(definition.id==='profiles'){
      appendProfilesChrome(root,{includeProfileBar:state.workspaceMode==='test'});
      if(state.workspaceMode&&state.workspaceMode!=='test'){
        root.append(renderWorkspace(state.workspaceMode)||status('WORKSPACE LOADING','The setup workflow is initializing.'));
      }else{
        if(activeView)appendRegisteredView(root,activeView,{document,runtime,sectionRegistry,state,data,catalog,familyOrder});
      }
    }else{
      if(activeView)appendRegisteredView(root,activeView,{document,runtime,sectionRegistry,state,data,catalog,familyOrder});
    }
    if(!root.childNodes.length)root.append(status('SECTION LOADING','This section is waiting for its controls to register.'));
    syncCompoundEditorShell();
    const targetScrollTop=previousViewId===activeView?.id&&!preserveScroll?0:detailScrollMemory.restore(activeView?.id);
    values.replaceChildren(root);
    renderedSectionId=definition.id;
    renderedViewId=activeView?.id||'';
    detailScrollMemory.activate(activeView?.id);
    sectionRailScrollMemory.activate(definition.id);
    values.scrollTop=targetScrollTop;
    onDetailScrollRestored();
    requestAnimationFrame(()=>{
      if(renderedSectionId===definition.id){values.scrollTop=targetScrollTop;onDetailScrollRestored();}
    });
  }

  function renderAll({preserveCategoryScroll=false,preserveValueScroll=false}={}){
    if(preserveValueScroll)rememberRenderedSection();
    const categoryTop=categoriesEl.scrollTop;
    renderCategories(snapshot());renderSubcategories();renderValues({preserveScroll:preserveValueScroll,memoryAlreadySaved:preserveValueScroll});
    if(preserveCategoryScroll)requestAnimationFrame(()=>{categoriesEl.scrollTop=categoryTop;});
  }

  if(sectionRegistry.activeSection!==state.category)sectionRegistry.select(state.category);
  const onMainRailScroll=()=>{if(!restoringMainRail)mainRailScrollTop=categoriesEl.scrollTop;};
  const onSecondaryRailScroll=()=>{
    if(restoringSecondaryRail)return;
    const definition=sectionRegistry.getDefinition(state.category);
    if(definition)sectionRailScrollMemory.remember(definition.id,subcategoriesEl?.scrollTop||0);
  };
  const syncRuntimeStructure=event=>{
    const data=snapshot();
    const registered=registerWorkflowViews(data);
    if(registered)return{registered,rendered:false};
    const control=(data.controlGroups||[]).flatMap(item=>item.controls||[]).find(item=>item.id===event?.controlId);
    const sectionId=String(control?.placement?.section||'').toLowerCase();
    if(sectionId&&sectionId===state.category){renderValues({preserveScroll:true});return{registered:0,rendered:true};}
    return{registered:0,rendered:false};
  };
  categoriesEl.addEventListener?.('scroll',onMainRailScroll,{passive:true});
  subcategoriesEl?.addEventListener?.('scroll',onSecondaryRailScroll,{passive:true});
  const unsubscribe=sectionRegistry.subscribe(event=>{
    if(event.type==='remove'&&event.viewId)viewContentCache.delete(event.viewId);
    if(event.type==='select'||event.type==='view-select'){
      rememberRenderedSection();
      const sectionChanged=event.sectionId!==state.category;
      if(sectionChanged){
        state.category=event.sectionId;
        save();
        if(event.sectionId!=='profiles'&&state.workspaceMode&&state.workspaceMode!=='test')selectWorkspace?.('test');
        renderCategories(snapshot());
      }else if(event.type==='select')renderCategories(snapshot());
      renderSubcategories();
      renderValues({preserveScroll:true,memoryAlreadySaved:true});
      return;
    }
    if(event.type==='register'||event.type==='remove'){
      if(event.sectionId!==state.category)return;
      rememberRenderedSection();
      renderSubcategories();
      renderValues({preserveScroll:true,memoryAlreadySaved:true});
      return;
    }
    if(event.type==='slot-register'||event.type==='slot-remove'){
      if(event.sectionId===state.category)renderValues({preserveScroll:true});
      return;
    }
    if(event.type==='invalidate'){
      if(event.sectionId&&event.sectionId!==state.category)return;
      const activeViewId=sectionRegistry.getActiveView(state.category)?.id||null;
      if(event.viewId&&event.viewId!==activeViewId)return;
      renderValues({preserveScroll:true});
    }
  });
  renderAll();
  return{renderCategories,renderSubcategories,renderValues,renderAll,syncRuntimeStructure,rememberActiveScroll:rememberRenderedSection,get activeSection(){return sectionRailScrollMemory.activeSection;},get activeView(){return renderedViewId;},getSectionScrollPositions:()=>detailScrollMemory.snapshot(),getViewScrollPositions:()=>detailScrollMemory.snapshot(),getSectionRailScrollPositions:()=>sectionRailScrollMemory.snapshot(),destroy(){unsubscribe();categoriesEl.removeEventListener?.('scroll',onMainRailScroll,{passive:true});subcategoriesEl?.removeEventListener?.('scroll',onSecondaryRailScroll,{passive:true});}};
}
