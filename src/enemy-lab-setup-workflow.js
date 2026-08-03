import {
  createArenaSetupCandidate,
  diffArenaSetup,
  lockArenaStandardSetup,
  readArenaStandardHistory,
  readArenaStandardSetup,
} from './arena-standard-setup.js';

const MODES=new Set(['test','setup','standard','history']);
const text=value=>String(value??'');
const printable=value=>{
  if(Array.isArray(value))return value.join(', ')||'None';
  if(value&&typeof value==='object')return JSON.stringify(value);
  return text(value);
};
const GROUP_LABELS=Object.freeze({scenario:'Encounter',content:'Roster & card pool',combat:'Combat behavior',ability:'Ability tuning',presentation:'Visuals & maze',player:'Player preferences',other:'Other'});
const groupForPath=path=>GROUP_LABELS[String(path||'').split('.')[0]]?String(path).split('.')[0]:'other';

function statusCard(document,title,detail,{error=false}={}){
  const root=document.createElement('div');root.className='statusCard';if(error)root.classList.add('setupError');
  const heading=document.createElement('b');heading.textContent=title;
  const body=document.createElement('span');body.textContent=detail;root.append(heading,body);return root;
}

function action(document,label,detail,onClick,{primary=false,danger=false,disabled=false}={}){
  const button=document.createElement('button');button.type='button';button.className=`choice${primary?' primary':''}${danger?' danger':''}`;button.disabled=disabled;
  const heading=document.createElement('b');heading.textContent=label;const body=document.createElement('span');body.textContent=detail;button.append(heading,body);button.addEventListener('click',onClick);return button;
}

function settingCard(document,{label,path,value,target='arena'}){
  const root=document.createElement('div');root.className='setupSettingCard';
  const heading=document.createElement('b');heading.textContent=label||path;
  const badge=document.createElement('em');badge.textContent=target==='lab-only'?'LAB-ONLY':'TRANSFERS TO ARENA';
  const body=document.createElement('span');body.textContent=printable(value);root.append(heading,badge,body);return root;
}

function setupControl(document,runtime,control,onChanged){
  const root=document.createElement('div');root.className='controlCard setupControl';
  const label=document.createElement('label');label.textContent=control.label;root.append(label);
  if(control.kind==='select'){
    const select=document.createElement('select');select.setAttribute('aria-label',control.placement?.fullAccessibleLabel||control.label);
    for(const option of control.options||[]){const item=document.createElement('option');item.value=option.value;item.textContent=option.label;item.selected=option.selected;select.append(item);}
    select.addEventListener('change',()=>{runtime.setControl(control.id,select.value);onChanged();});root.append(select);
  }else if(control.kind==='range'){
    const input=document.createElement('input');input.type='range';input.min=control.min;input.max=control.max;input.step=control.step;input.value=control.value;input.setAttribute('aria-label',control.placement?.fullAccessibleLabel||control.label);
    input.addEventListener('input',()=>{runtime.setControl(control.id,Number(input.value));onChanged();});root.append(input);
  }
  return root;
}

function reviewPanel(document,{title,detail,items=[],excluded=false}){
  const panel=document.createElement('section');panel.className='labSectionPanel setupReviewPanel';
  panel.append(statusCard(document,title,detail));
  const counts=new Map();
  for(const item of items)counts.set(groupForPath(item.path),(counts.get(groupForPath(item.path))||0)+1);
  for(const [group,count] of counts)panel.append(settingCard(document,{label:GROUP_LABELS[group],path:group,value:`${count} setting${count===1?'':'s'}`,target:excluded?'lab-only':'arena'}));
  if(items.length){
    const details=document.createElement('details');details.className='setupExactDetails';
    const summary=document.createElement('summary');summary.textContent=excluded?'VIEW EXCLUDED TEST VALUES':'VIEW EXACT VALUES';details.append(summary);
    for(const item of items)details.append(settingCard(document,{label:item.path,path:item.path,value:item.value??item.candidate,target:excluded?'lab-only':'arena'}));
    panel.append(details);
  }
  return panel;
}

export function installEnemyLabSetupWorkflow({
  document=globalThis.document,hostWindow=globalThis,storage=globalThis.localStorage,runtime,profileController,state,saveWorkspace,onRender=()=>{},setMessage=()=>{},
}={}){
  if(!document||!runtime||!profileController||!state)return{installed:false,reason:'missing-context'};
  const bar=document.getElementById('labWorkflowBar'),playButton=document.getElementById('workflowPlayArena'),workflowStatus=document.getElementById('workflowStatus');
  if(!bar||!playButton)return{installed:false,reason:'missing-workflow-bar'};
  let pendingLock=false;
  state.workspaceMode=MODES.has(state.workspaceMode)?state.workspaceMode:'test';

  const selectedProfile=()=>profileController.getProfiles?.().find(profile=>profile.id===profileController.selectedId)||null;
  const currentCandidate=()=>{
    const controlSnapshot=runtime.snapshotProfileSettings?.({includeGlobal:true})||{controls:[]};
    return createArenaSetupCandidate({
      workspace:profileController.snapshot(),controls:controlSnapshot.controls,
      name:selectedProfile()?.name||'Current Arena Setup',sourceProfileId:selectedProfile()?.id||'',
    });
  };
  const standard=()=>readArenaStandardSetup(storage);
  const updateChrome=()=>{
    document.body.dataset.labWorkspace=state.workspaceMode;
    for(const button of bar.querySelectorAll('[data-workspace-mode]'))button.classList.toggle('on',button.dataset.workspaceMode===state.workspaceMode);
    const locked=standard();playButton.disabled=!locked;playButton.textContent=locked?`PLAY ARENA · STANDARD v${locked.standardVersion}`:'LOCK A STANDARD TO PLAY';
    if(workflowStatus)workflowStatus.textContent=state.workspaceMode==='test'?'Temporary Lab values':state.workspaceMode==='setup'?'Review what transfers':state.workspaceMode==='standard'?(locked?`Standard v${locked.standardVersion}`:'No Standard locked'):`${readArenaStandardHistory(storage).length} archived`;
  };
  const select=mode=>{
    const next=MODES.has(String(mode))?String(mode):'test';state.workspaceMode=next;pendingLock=false;saveWorkspace?.();updateChrome();onRender();return next;
  };
  const play=()=>{
    const locked=standard();if(!locked){setMessage('Lock an Arena Standard before launching Combat Arena.');return false;}
    hostWindow.location.assign(new URL('./combat-arena.html',document.location.href));return true;
  };
  const lock=()=>{
    const candidate=currentCandidate();
    if(!candidate.ok){setMessage(candidate.errors.join(' · '));pendingLock=false;onRender();return null;}
    if(!pendingLock){pendingLock=true;setMessage('Review complete. Press CONFIRM LOCK to replace the Arena Standard and archive the previous one.');onRender();return null;}
    try{const locked=lockArenaStandardSetup(storage,candidate);pendingLock=false;setMessage(`Standard v${locked.standardVersion} locked. Combat Arena will use only this setup.`);select('standard');return locked;}
    catch(error){pendingLock=false;setMessage(error.message);onRender();return null;}
  };

  function renderSetup(){
    const root=document.createElement('div');root.className='labSectionContent setupWorkspace';
    const candidate=currentCandidate(),locked=standard(),changes=diffArenaSetup(candidate,locked);
    root.append(statusCard(document,candidate.ok?'READY TO LOCK':'SETUP BLOCKED',candidate.ok?`${changes.length} change${changes.length===1?'':'s'} from ${locked?`Standard v${locked.standardVersion}`:'the defaults'} · ${candidate.excluded.length} Lab-only/action value${candidate.excluded.length===1?'':'s'} excluded.`:candidate.errors.join(' · '),{error:!candidate.ok}));
    const setupOnly=(runtime.snapshot?.().controlGroups||[]).flatMap(group=>(group.controls||[]).filter(control=>control.placement?.workspace==='setup'));
    if(setupOnly.length){const panel=document.createElement('section');panel.className='labSectionPanel';panel.append(statusCard(document,'ARENA WORLD','These values configure Combat Arena. They do not resize the fixed Enemy Lab chamber.'));for(const control of setupOnly)panel.append(setupControl(document,runtime,control,()=>onRender()));root.append(panel);}
    root.append(reviewPanel(document,{title:'CANDIDATE CHANGES',detail:changes.length?'These transferable groups differ from the Locked Standard. Expand only if you want the exact values.':'The transferable setup matches the Locked Standard.',items:changes}));
    root.append(reviewPanel(document,{title:'NOT SENT TO COMBAT ARENA',detail:'The fixed Lab chamber, direct test composition, Lab loadout/deck, capture fixtures, actions, and live simulation state stay in Enemy Lab.',items:candidate.excluded,excluded:true}));
    root.append(action(document,pendingLock?'CONFIRM LOCK':'LOCK AS ARENA STANDARD',pendingLock?'Archives the current Standard and activates this reviewed setup.':'Review and lock only the transferable values.',()=>lock(),{primary:true,disabled:!candidate.ok}));
    root.append(action(document,'BACK TO TEST','Continue experimenting without changing the Locked Standard.',()=>select('test')));return root;
  }

  function renderStandard(){
    const root=document.createElement('div');root.className='labSectionContent standardWorkspace';
    const locked=standard();
    if(!locked){root.append(statusCard(document,'NO ARENA STANDARD','Use Test to experiment, then open Setup and lock the first standard.',{error:true}));root.append(action(document,'REVIEW SETUP','Choose the first production configuration.',()=>select('setup'),{primary:true}));return root;}
    root.append(statusCard(document,`ARENA STANDARD v${locked.standardVersion}`,`${locked.name} · locked ${new Date(locked.lockedAt).toLocaleString()} · Combat Arena ignores unpromoted Test changes.`));
    const settings=Object.entries(locked.profile.workspace.settings||{}).sort(([a],[b])=>a.localeCompare(b)).map(([path,value])=>({path,value}));
    root.append(reviewPanel(document,{title:'LOCKED CONTENT',detail:'This is the production setup. Exact tuning remains available below without turning this into another editor.',items:settings}));
    root.append(action(document,'PLAY IN COMBAT ARENA','Launch the immutable Locked Standard.',play,{primary:true}));
    root.append(action(document,'REOPEN TEST','Experiment from the current Lab workspace; the Standard stays unchanged.',()=>select('test')));return root;
  }

  function renderHistory(){
    const root=document.createElement('div');root.className='labSectionContent historyWorkspace';
    const history=readArenaStandardHistory(storage);
    root.append(statusCard(document,'STANDARD HISTORY',history.length?`${history.length} previous Standard${history.length===1?'':'s'} archived. Restoring sends a copy to Test; it never silently replaces the active Standard.`:'No previous Standard has been archived yet.'));
    for(const entry of history){const card=document.createElement('section');card.className='labSectionPanel';card.append(statusCard(document,`STANDARD v${entry.standardVersion}`,`${entry.name} · ${new Date(entry.lockedAt).toLocaleString()}`));card.append(action(document,'RESTORE COPY TO TEST','Load this archived configuration into Enemy Lab for review.',()=>profileController.load(entry.profile)));root.append(card);}
    return root;
  }

  const render=mode=>mode==='setup'?renderSetup():mode==='standard'?renderStandard():mode==='history'?renderHistory():null;
  for(const button of bar.querySelectorAll('[data-workspace-mode]'))button.addEventListener('click',()=>select(button.dataset.workspaceMode));
  playButton.addEventListener('click',play);updateChrome();
  const api={installed:true,select,render,play,lock,get mode(){return state.workspaceMode;},get candidate(){return currentCandidate();},get standard(){return standard();}};
  return api;
}
