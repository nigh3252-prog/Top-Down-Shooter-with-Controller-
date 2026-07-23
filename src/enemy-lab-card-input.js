function buttonCopy(button,hidden){return hidden?{pressed:false,touched:false,value:0}:{pressed:!!button?.pressed,touched:!!button?.touched,value:Number(button?.value)||0};}
export function maskCardControllerGamepad(pad,mode='regular'){
  if(!pad)return pad;const hidden=new Set([1,4,5,11]);if(mode==='test'){hidden.add(14);hidden.add(15);}
  return{id:pad.id,index:pad.index,connected:pad.connected!==false,mapping:pad.mapping,timestamp:pad.timestamp,axes:Array.from(pad.axes||[]),buttons:Array.from(pad.buttons||[],(button,index)=>buttonCopy(button,hidden.has(index))),vibrationActuator:pad.vibrationActuator,hapticActuators:pad.hapticActuators};
}
export const maskTryoutGamepad=(pad,enabled=true)=>enabled?maskCardControllerGamepad(pad,'test'):pad;
