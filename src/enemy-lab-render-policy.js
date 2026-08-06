const STRUCTURAL_RUNTIME_EVENTS=new Set([
  'register',
  'remove',
  'profile-adapter-register',
  'profile-adapter-remove',
]);

const CONTROL_RUNTIME_EVENTS=new Set(['change','invoke']);

export function classifyEnemyLabRuntimeEvent(event={}){
  const type=String(event?.type||'');
  if(STRUCTURAL_RUNTIME_EVENTS.has(type))return'structural';
  if(CONTROL_RUNTIME_EVENTS.has(type))return'control';
  return'telemetry';
}

export function routeEnemyLabRuntimeEvent(event,{
  onStructural=()=>{},
  onControl=()=>{},
  onTelemetry=()=>{},
}={}){
  const kind=classifyEnemyLabRuntimeEvent(event);
  if(kind==='structural')onStructural(event);
  else if(kind==='control')onControl(event);
  else onTelemetry(event);
  return kind;
}

function mountedControlNodes(root,controlId){
  if(!root?.querySelectorAll)return[];
  return[...root.querySelectorAll('[data-arena-control-id]')]
    .filter(node=>node.dataset?.arenaControlId===String(controlId));
}

function sameSelectOptions(select,options=[]){
  const current=[...(select?.options||[])];
  return current.length===options.length&&current.every((option,index)=>{
    const next=options[index];
    return String(option.value)===String(next?.value??'')&&option.textContent===String(next?.label??next?.value??'');
  });
}

function replaceSelectOptions(select,options=[]){
  const document=select?.ownerDocument;
  if(!document?.createElement||!select?.replaceChildren)return false;
  const nodes=options.map(option=>{
    const item=document.createElement('option');
    item.value=String(option?.value??'');
    item.textContent=String(option?.label??option?.value??'');
    return item;
  });
  select.replaceChildren(...nodes);
  return true;
}

export function syncEnemyLabMountedControl(node,control,{activeElement=null}={}){
  if(!node||!control||node.dataset?.arenaControlId!==String(control.id))return false;
  const field=node.matches?.('input,select,textarea')?node:node.querySelector?.('input,select,textarea');
  const focused=!!field&&(field===activeElement||node.contains?.(activeElement));
  node.dataset.arenaControlKind=String(control.kind||'');
  node.disabled=!!control.disabled;
  if(field)field.disabled=!!control.disabled;

  if(control.kind==='range'&&field){
    field.min=String(control.min);
    field.max=String(control.max);
    field.step=String(control.step);
    if(!focused)field.value=String(control.value);
    const output=node.querySelector?.('output');
    if(output){output.value=String(control.value);output.textContent=String(control.value);}
    return true;
  }

  if(control.kind==='select'&&field){
    if(!focused&&!sameSelectOptions(field,control.options))replaceSelectOptions(field,control.options);
    if(!focused)field.value=String(control.value??'');
    return true;
  }

  if(control.kind==='text'&&field){
    if(!focused)field.value=String(control.value??'');
    return true;
  }

  const active=control.kind==='check'?!!control.checked:!!control.active;
  node.classList?.toggle?.('on',active);
  const meta=node.querySelector?.('em');
  if(meta&&control.kind==='check')meta.textContent=active?'ON':'OFF';
  return true;
}

export function syncEnemyLabMountedControls(root,controlGroups=[],{
  activeElement=root?.ownerDocument?.activeElement||null,
}={}){
  let count=0;
  for(const group of controlGroups||[]){
    for(const control of group?.controls||[]){
      for(const node of mountedControlNodes(root,control.id)){
        if(syncEnemyLabMountedControl(node,control,{activeElement}))count++;
      }
    }
  }
  return count;
}
