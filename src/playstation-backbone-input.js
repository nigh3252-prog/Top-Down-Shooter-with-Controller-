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
    return !!gamepad?.buttons?.[index]?.pressed;
  };
  const current=Object.fromEntries(BUTTON_NAMES.map(name=>[name,isDown(name)]));
  const pressed={};
  const released={};
  for(const name of BUTTON_NAMES){
    const was=previous?.[name]===true;
    pressed[name]=current[name]&&!was;
    released[name]=!current[name]&&was;
  }
  return Object.freeze({
    current:Object.freeze(current),
    pressed:Object.freeze(pressed),
    released:Object.freeze(released),
    id:String(gamepad?.id||''),
    mapping:String(gamepad?.mapping||''),
  });
}
