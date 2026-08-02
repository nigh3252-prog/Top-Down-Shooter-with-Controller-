const CONTROL_KINDS=new Set(['button','check','range','select','text']);

const resolve=value=>typeof value==='function'?value():value;
const freezeOptions=options=>Object.freeze((options||[]).map(option=>Object.freeze({
  value:String(option.value),label:String(option.label??option.value),selected:!!option.selected,
})));

function snapshotControl(control){
  const descriptor=control.descriptor,value=resolve(descriptor.get??descriptor.value);
  const snapshot={id:control.id,kind:control.kind,label:String(descriptor.label||control.id),note:String(descriptor.note||''),disabled:!!resolve(descriptor.disabled)};
  if(control.kind==='button')snapshot.active=!!resolve(descriptor.active);
  if(control.kind==='check')snapshot.checked=!!resolve(descriptor.checked);
  if(control.kind==='range')Object.assign(snapshot,{value:Number(value),min:Number(descriptor.min??0),max:Number(descriptor.max??100),step:Number(descriptor.step??1)});
  if(control.kind==='select'){
    snapshot.value=String(value??'');
    snapshot.options=freezeOptions(resolve(descriptor.options)).map(option=>Object.freeze({...option,selected:option.value===snapshot.value}));
  }
  if(control.kind==='text')snapshot.value=String(value??'');
  return Object.freeze(snapshot);
}

export function createArenaControlRegistry(){
  const groups=new Map(),controls=new Map(),listeners=new Set();
  const emit=event=>{for(const listener of [...listeners])listener(event);};
  const ensureGroup=group=>{
    const id=String(group.id);
    if(!groups.has(id))groups.set(id,{id,label:String(group.label||id),source:String(group.source||'arena-runtime'),controlIds:[]});
    return groups.get(id);
  };
  const getControlGroups=()=>Object.freeze([...groups.values()].map(group=>Object.freeze({
    id:group.id,label:group.label,source:group.source,
    controls:Object.freeze(group.controlIds.map(id=>snapshotControl(controls.get(id)))),
  })));
  function register(group,descriptor){
    const record=ensureGroup(group),id=String(descriptor.id||'');
    if(!id)throw new Error('Arena controls require a stable id');
    if(controls.has(id))throw new Error(`Arena control id already registered: ${id}`);
    const kind=String(descriptor.kind||'button');
    if(!CONTROL_KINDS.has(kind))throw new Error(`Unsupported arena control kind: ${kind}`);
    controls.set(id,{id,kind,groupId:record.id,descriptor:{...descriptor,id,kind}});record.controlIds.push(id);
    emit({type:'register',controlId:id,groupId:record.id,groups:getControlGroups()});return id;
  }
  function setControl(id,value){
    const control=controls.get(String(id));if(!control||resolve(control.descriptor.disabled)||typeof control.descriptor.set!=='function')return false;
    const result=control.descriptor.set(value);if(result===false)return false;
    emit({type:'change',controlId:control.id,groupId:control.groupId,value,snapshot:snapshotControl(control)});return result??true;
  }
  function invokeControl(id,...args){
    const control=controls.get(String(id));if(!control||resolve(control.descriptor.disabled)||typeof control.descriptor.invoke!=='function')return false;
    const result=control.descriptor.invoke(...args);emit({type:'invoke',controlId:control.id,groupId:control.groupId,args,snapshot:snapshotControl(control)});return result??true;
  }
  return Object.freeze({
    register,setControl,invokeControl,getControlGroups,
    getControl:id=>controls.has(String(id))?snapshotControl(controls.get(String(id))):null,
    subscribe(listener){if(typeof listener!=='function')return()=>{};listeners.add(listener);return()=>listeners.delete(listener);},
  });
}
