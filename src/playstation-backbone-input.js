export const PLAYSTATION_BACKBONE_BUTTONS=Object.freeze({
  cross:0,
  circle:1,
  square:2,
  triangle:3,
  l1:4,
  r1:5,
  l2:6,
  r2:7,
  create:8,
  options:9,
  dpadUp:12,
  dpadDown:13,
  dpadLeft:14,
  dpadRight:15,
});

const BUTTON_NAMES=Object.freeze(Object.keys(PLAYSTATION_BACKBONE_BUTTONS));

export function readPlayStationBackboneInput(gamepad,previous={}){
  const isDown=name=>{
    const index=PLAYSTATION_BACKBONE_BUTTONS[name];
    const button=gamepad?.buttons?.[index];
    return !!button&&(button.pressed===true||Number(button.value)>.5);
  };
  const current=Object.fromEntries(BUTTON_NAMES.map(name=>[name,isDown(name)]));
  const pressed={};
  const released={};
  for(const name of BUTTON_NAMES){
    const was=previous?.[name]===true;
    pressed[name]=current[name]&&!was;
    released[name]=!current[name]&&was;
  }
  const rawDown=[];
  for(let index=0;index<(gamepad?.buttons?.length||0);index++){
    const button=gamepad.buttons[index];
    if(button?.pressed===true||Number(button?.value)>.5)rawDown.push(index);
  }
  const previousRaw=new Set(Array.isArray(previous?.__rawDown)?previous.__rawDown:[]);
  const currentRaw=new Set(rawDown);
  const rawPressed=rawDown.filter(index=>!previousRaw.has(index));
  const rawReleased=[...previousRaw].filter(index=>!currentRaw.has(index));
  return Object.freeze({
    current:Object.freeze(current),
    pressed:Object.freeze(pressed),
    released:Object.freeze(released),
    rawDown:Object.freeze(rawDown),
    rawPressed:Object.freeze(rawPressed),
    rawReleased:Object.freeze(rawReleased),
    id:String(gamepad?.id||''),
    mapping:String(gamepad?.mapping||''),
  });
}

export function resolvePlayStationBackboneActions(input={}){
  const defensePressed=input?.pressed?.cross===true||input?.pressed?.l2===true;
  const defenseSource=input?.pressed?.cross===true?'gamepad-cross':input?.pressed?.l2===true?'gamepad-l2':null;
  const defenseReleased=input?.current?.cross!==true&&input?.current?.l2!==true
    &&(input?.released?.cross===true||input?.released?.l2===true);
  const lightCandidate=input?.pressed?.square===true||input?.pressed?.r2===true;
  return Object.freeze({
    defensePressed,
    defenseSource,
    defenseReleased,
    lightPressed:lightCandidate&&!defensePressed,
    aliasConflict:defensePressed&&lightCandidate,
  });
}
