// Procedural Stance 2.0 retargeting for adjacent stance/weapon weights.
// The stance keeps its authored attack key and choreography; these transforms
// compress or brace the sampled pose so the approved 3x3 pilot cells define HOW
// that attack is expressed rather than WHICH attack is substituted.

const freezeDeep=value=>{
  if(value&&typeof value==='object'){for(const child of Object.values(value))freezeDeep(child);Object.freeze(value);}
  return value;
};

export const STANCE_ADJACENT_ATTACK_ADAPTERS=freezeDeep({
  'Light:Medium':{
    id:'light-medium-choked',sourceCell:'S24:longsword',label:'CHOKED / HALF-SWORD',
    pose:{holdLateral:.78,holdForward:.72,holdVertical:.92,holdYOffset:-.03,tipLateral:.82,tipForward:.84,tipVertical:1,lunge:.58,roll:.90,twist:.82,pitch:.90,lean:.75,hipTwist:.78,hip:.80,lower:.85,head:.90},
    family:{
      vertical:{holdForward:.68,lunge:.52},
      horizontal:{holdLateral:.70,tipLateral:.74,lunge:.52},
      stab:{holdForward:.62,tipForward:1.05,lunge:.48,twist:.72},
    },
  },
  'Medium:Light':{
    id:'medium-light-close',sourceCell:'S26:dagger',label:'CLOSE TWO-HAND / PLANTED KNIFE',
    pose:{holdLateral:.88,holdForward:.84,holdVertical:.96,holdYOffset:-.01,tipLateral:.92,tipForward:.92,tipVertical:1,lunge:.72,roll:.94,twist:.90,pitch:.94,lean:.88,hipTwist:.88,hip:.90,lower:.94,head:.95},
    family:{
      vertical:{lunge:.66},
      horizontal:{holdLateral:.82,tipLateral:.84,lunge:.64},
      stab:{tipForward:1.03,lunge:.76},
    },
  },
  'Medium:Heavy':{
    id:'medium-heavy-half-sword',sourceCell:'S26:greatsword',label:'CHOKED GREATBLADE',
    pose:{holdLateral:.70,holdForward:.64,holdVertical:.90,holdYOffset:-.04,tipLateral:.76,tipForward:.80,tipVertical:.98,lunge:.42,roll:.86,twist:.82,pitch:.88,lean:.82,hipTwist:.80,hip:.78,lower:.88,head:.90},
    family:{
      vertical:{holdForward:.60,lunge:.36},
      horizontal:{holdLateral:.64,tipLateral:.68,lunge:.34},
      stab:{holdForward:.58,tipForward:1.02,lunge:.44},
    },
  },
  'Heavy:Medium':{
    id:'heavy-medium-braced',sourceCell:'S01:longsword',label:'BRACED MEDIUM WEAPON',
    pose:{holdLateral:.84,holdForward:.76,holdVertical:.96,holdYOffset:-.02,tipLateral:.88,tipForward:.88,tipVertical:1,lunge:.30,roll:.94,twist:.86,pitch:.96,lean:1.05,hipTwist:.92,hip:.88,lower:1.08,head:.96},
    family:{
      vertical:{holdForward:.70,lunge:.22,lean:1.08,lower:1.12},
      horizontal:{holdLateral:.78,tipLateral:.82,lunge:.28},
      stab:{tipForward:.98,lunge:.36},
    },
  },
});

const cacheByPC=new WeakMap();
const number=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const pairKey=(stanceClass,weaponClass)=>String(stanceClass||'')+':'+String(weaponClass||'');

export function getStanceAttackAdapter(stanceClass,weaponClass){
  return STANCE_ADJACENT_ATTACK_ADAPTERS[pairKey(stanceClass,weaponClass)]||null;
}

function mergedPoseSettings(adapter,group){
  return {...adapter.pose,...(adapter.family?.[group]||{})};
}

export function adaptStanceAttackPose(PC,pose,adapterOrKey,group='vertical'){
  const adapter=typeof adapterOrKey==='string'?STANCE_ADJACENT_ATTACK_ADAPTERS[adapterOrKey]:adapterOrKey;
  if(!adapter||!PC?.P||!pose||pose===PC.IDLE)return pose;
  const hold=pose.hold,tip=pose.tip,hip=pose.hip,head=pose.head;
  if(!hold||!tip||!Number.isFinite(Number(hold.x))||!Number.isFinite(Number(tip.x)))return pose;
  const s=mergedPoseSettings(adapter,group);
  const holdLateral=number(s.holdLateral,1),holdForward=number(s.holdForward,1),holdVertical=number(s.holdVertical,1);
  const tipLateral=number(s.tipLateral,1),tipForward=number(s.tipForward,1),tipVertical=number(s.tipVertical,1);
  const holdYOffset=number(s.holdYOffset,0);
  return PC.P({
    hold:[number(hold.x,0)*holdLateral,1+(number(hold.y,1)-1)*holdVertical+holdYOffset,number(hold.z,0)*holdForward],
    tip:[number(tip.x,0)*tipLateral,number(tip.y,1)*tipVertical,number(tip.z,0)*tipForward],
    roll:number(pose.roll,0)*number(s.roll,1),
    twist:number(pose.twist,0)*number(s.twist,1),
    pitch:number(pose.pitch,0)*number(s.pitch,1),
    lean:number(pose.lean,0)*number(s.lean,1),
    hipTwist:number(pose.hipTwist,0)*number(s.hipTwist,1),
    hip:[number(hip?.x,0)*number(s.hip,1),0,number(hip?.z,0)*number(s.hip,1)],
    lower:number(pose.lower,0)*number(s.lower,1),
    lunge:number(pose.lunge,0)*number(s.lunge,1),
    head:[number(head?.x,0)*number(s.head,1),number(head?.y,0)*number(s.head,1)],
  });
}

export function getAdaptedStanceAttack(PC,attackKey,stanceClass,weaponClass){
  const adapter=getStanceAttackAdapter(stanceClass,weaponClass);
  const source=PC?.ATTACKS?.[attackKey];
  if(!adapter||!source||!Array.isArray(source.phases))return source||null;
  let cache=cacheByPC.get(PC);
  if(!cache){cache=new Map();cacheByPC.set(PC,cache);}
  const key=adapter.id+':'+String(attackKey||'');
  const existing=cache.get(key);
  if(existing?.source===source)return existing.attack;
  const phases=source.phases.map(phase=>({
    ...phase,
    pose:adaptStanceAttackPose(PC,phase.pose,adapter,source.group),
  }));
  const attack={
    ...source,
    phases,
    meta:{...(source.meta||{}),stance2Adapted:true,stance2AdapterId:adapter.id,stance2SourceAttackKey:attackKey,stance2SourceCell:adapter.sourceCell},
  };
  cache.set(key,{source,attack});
  return attack;
}

export function withAdaptedStanceAttack(PC,attackKey,stanceClass,weaponClass,callback){
  const source=PC?.ATTACKS?.[attackKey];
  const adapted=getAdaptedStanceAttack(PC,attackKey,stanceClass,weaponClass);
  if(!source||!adapted||adapted===source)return callback?.(source);
  PC.ATTACKS[attackKey]=adapted;
  try{return callback?.(adapted);}
  finally{PC.ATTACKS[attackKey]=source;}
}
