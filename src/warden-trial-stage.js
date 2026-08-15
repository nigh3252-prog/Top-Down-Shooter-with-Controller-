const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function normalizeWardenTrialScreenMargins(margins={}){
  const read=(key,fallback)=>clamp(Number.isFinite(Number(margins[key]))?Number(margins[key]):fallback,0,.4);
  return Object.freeze({
    left:read('left',.08),
    right:read('right',.08),
    top:read('top',.22),
    bottom:read('bottom',.1),
  });
}

export function createWardenTrialStageBoundary({
  projectWorldToNdc,
  groundPointFromNdc,
  margins,
}={}){
  if(typeof projectWorldToNdc!=='function'||typeof groundPointFromNdc!=='function'){
    throw new TypeError('Warden Trial stage boundary requires projection and ground-ray adapters.');
  }
  const safe=normalizeWardenTrialScreenMargins(margins);
  const baseBounds=Object.freeze({
    minX:-1+safe.left*2,
    maxX:1-safe.right*2,
    minY:-1+safe.bottom*2,
    maxY:1-safe.top*2,
  });
  const projectedRadius=(point,radius)=>{
    const r=Math.max(0,Number(radius)||0);
    if(r<=0)return{x:0,y:0};
    const center=projectWorldToNdc(point);
    const samples=[
      projectWorldToNdc({x:point.x+r,z:point.z}),
      projectWorldToNdc({x:point.x-r,z:point.z}),
      projectWorldToNdc({x:point.x,z:point.z+r}),
      projectWorldToNdc({x:point.x,z:point.z-r}),
    ];
    return samples.reduce((padding,sample)=>({
      x:Math.max(padding.x,Math.abs((Number(sample?.x)||0)-(Number(center?.x)||0))),
      y:Math.max(padding.y,Math.abs((Number(sample?.y)||0)-(Number(center?.y)||0))),
    }),{x:0,y:0});
  };
  const clampPoint=(point,radius=0)=>{
    const requested={x:Number(point?.x)||0,z:Number(point?.z)||0};
    const ndc=projectWorldToNdc(requested);
    if(!Number.isFinite(Number(ndc?.x))||!Number.isFinite(Number(ndc?.y)))return requested;
    const padding=projectedRadius(requested,radius);
    const minX=Math.min(baseBounds.maxX,baseBounds.minX+padding.x);
    const maxX=Math.max(minX,baseBounds.maxX-padding.x);
    const minY=Math.min(baseBounds.maxY,baseBounds.minY+padding.y);
    const maxY=Math.max(minY,baseBounds.maxY-padding.y);
    const clampedNdc={x:clamp(Number(ndc.x),minX,maxX),y:clamp(Number(ndc.y),minY,maxY)};
    if(Math.abs(clampedNdc.x-ndc.x)<1e-7&&Math.abs(clampedNdc.y-ndc.y)<1e-7)return requested;
    const grounded=groundPointFromNdc(clampedNdc);
    return Number.isFinite(Number(grounded?.x))&&Number.isFinite(Number(grounded?.z))
      ?{x:Number(grounded.x),z:Number(grounded.z)}
      :requested;
  };
  const contains=(point,radius=0)=>{
    const clamped=clampPoint(point,radius);
    return Math.hypot(clamped.x-(Number(point?.x)||0),clamped.z-(Number(point?.z)||0))<1e-6;
  };
  const resolveMovement=(position,delta,radius=0)=>{
    const previous={x:Number(position?.x)||0,z:Number(position?.z)||0};
    const requested={
      x:previous.x+(Number(delta?.x)||0),
      z:previous.z+(Number(delta?.z)||0),
    };
    const current=clampPoint(requested,radius);
    const collided=Math.hypot(current.x-requested.x,current.z-requested.z)>1e-6;
    return{...current,collided,previous,requested,current};
  };
  return Object.freeze({margins:safe,bounds:baseBounds,clampPoint,contains,resolveMovement});
}
