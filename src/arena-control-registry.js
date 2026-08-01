// Explicit control descriptors shared by the arena page and Enemy Lab.
// Descriptors contain stable ids plus lazy values; no DOM discovery is needed.

const CONTROL_KINDS=new Set(['button','check','range','select','text']);

function cloneOption(option){
  return { value:String(option.value), label:String(option.label ?? option.value), selected:!!option.selected };
}

function snapshotControl(control){
  const descriptor=control.descriptor;
  const value=typeof descriptor.get==='function' ? descriptor.get() : descriptor.value;
  const snapshot={
    id:control.id,
    kind:control.kind,
    label:descriptor.label || control.id,
    note:descriptor.note || '',
    disabled:!!(typeof descriptor.disabled==='function' ? descriptor.disabled() : descriptor.disabled),
  };
  if(control.kind==='button')snapshot.active=!!(typeof descriptor.active==='function' ? descriptor.active() : descriptor.active);
  if(control.kind==='check')snapshot.checked=!!(typeof descriptor.checked==='function' ? descriptor.checked() : descriptor.checked);
  if(control.kind==='range'){
    snapshot.value=Number(value);
    snapshot.min=Number(descriptor.min ?? 0);
    snapshot.max=Number(descriptor.max ?? 100);
    snapshot.step=Number(descriptor.step ?? 1);
  }
  if(control.kind==='select'){
    snapshot.value=String(value ?? '');
    snapshot.options=(descriptor.options || []).map(cloneOption);
    for(const option of snapshot.options)option.selected=option.value===snapshot.value;
  }
  if(control.kind==='text')snapshot.value=String(value ?? '');
  return Object.freeze(snapshot);
}

function normalizeGroup(group){
  return {
    id:String(group.id),
    label:String(group.label || group.id),
    source:String(group.source || 'arena-runtime'),
  };
}

export function createArenaControlRegistry(){
  const groups=new Map();
  const controls=new Map();
  const listeners=new Set();
  let sequence=0;

  function ensureGroup(group){
    const normalized=normalizeGroup(group);
    if(!groups.has(normalized.id))groups.set(normalized.id,{...normalized,controlIds:[]});
    return groups.get(normalized.id);
  }

  function register(group, descriptor){
    const groupRecord=ensureGroup(group);
    const id=String(descriptor.id || `${groupRecord.id}.${++sequence}`);
    if(controls.has(id))throw new Error(`Arena control id already registered: ${id}`);
    const kind=String(descriptor.kind || 'button');
    if(!CONTROL_KINDS.has(kind))throw new Error(`Unsupported arena control kind: ${kind}`);
    const control={ id, kind, groupId:groupRecord.id, descriptor:{...descriptor,id,kind} };
    controls.set(id,control);
    groupRecord.controlIds.push(id);
    emit({
      type:'register',
      controlId:id,
      groupId:groupRecord.id,
      snapshot:snapshotControl(control),
      groups:getControlGroups(),
    });
    return id;
  }

  function remove(id){
    const control=controls.get(String(id));
    if(!control)return false;
    controls.delete(control.id);
    const group=groups.get(control.groupId);
    if(group)group.controlIds=group.controlIds.filter(item=>item!==control.id);
    emit({
      type:'remove',
      controlId:control.id,
      groupId:control.groupId,
      groups:getControlGroups(),
    });
    return true;
  }

  function emit(event){
    for(const listener of [...listeners])listener(event);
  }

  function setControl(id,value,meta={}){
    const control=controls.get(String(id));
    if(!control)return false;
    const disabled=typeof control.descriptor.disabled==='function'
      ? control.descriptor.disabled()
      : control.descriptor.disabled;
    if(disabled || typeof control.descriptor.set!=='function')return false;
    const result=control.descriptor.set(value);
    if(result===false)return false;
    emit({type:'change',controlId:control.id,groupId:control.groupId,value,result,meta,snapshot:snapshotControl(control)});
    return result === undefined ? true : result;
  }

  function invokeControl(id,...args){
    const control=controls.get(String(id));
    if(!control || typeof control.descriptor.invoke!=='function')return false;
    const disabled=typeof control.descriptor.disabled==='function'
      ? control.descriptor.disabled()
      : control.descriptor.disabled;
    if(disabled)return false;
    const result=control.descriptor.invoke(...args);
    emit({type:'invoke',controlId:control.id,groupId:control.groupId,args,result,snapshot:snapshotControl(control)});
    return result === undefined ? true : result;
  }

  function getControlGroups(){
    return [...groups.values()].map(group=>Object.freeze({
      id:group.id,
      label:group.label,
      source:group.source,
      controls:Object.freeze(group.controlIds.map(id=>snapshotControl(controls.get(id)))),
    }));
  }

  return {
    register,
    remove,
    setControl,
    invokeControl,
    getControl(id){
      const control=controls.get(String(id));
      return control ? snapshotControl(control) : null;
    },
    getControlGroups,
    subscribe(listener){
      if(typeof listener!=='function')return()=>{};
      listeners.add(listener);
      return()=>listeners.delete(listener);
    },
    clear(){
      controls.clear();
      groups.clear();
      emit({type:'clear',groups:[]});
    },
  };
}
