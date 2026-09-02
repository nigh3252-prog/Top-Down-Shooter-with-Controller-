export const ENEMY_LAB_LOADOUT_MODES=Object.freeze({
  CARDS:'cards',
  DIRECT:'direct',
});

export const ENEMY_LAB_DIRECT_ARCANA_BUTTONS=Object.freeze([
  Object.freeze({id:'l1',label:'L1',keyboard:'Q'}),
  Object.freeze({id:'r1',label:'R1',keyboard:'E'}),
  Object.freeze({id:'circle',label:'CIRCLE',keyboard:'R'}),
  Object.freeze({id:'dpadUp',label:'D-PAD UP',keyboard:'X'}),
  Object.freeze({id:'dpadDown',label:'D-PAD DOWN',keyboard:'T'}),
]);

export const EMPTY_ENEMY_LAB_DIRECT_ARCANA_BINDINGS=Object.freeze(
  Object.fromEntries(ENEMY_LAB_DIRECT_ARCANA_BUTTONS.map(button=>[button.id,''])),
);

export function normalizeEnemyLabLoadoutMode(value){
  return String(value||'').trim().toLowerCase()===ENEMY_LAB_LOADOUT_MODES.DIRECT
    ? ENEMY_LAB_LOADOUT_MODES.DIRECT
    : ENEMY_LAB_LOADOUT_MODES.CARDS;
}

export function normalizeEnemyLabDirectArcanaBindings(value={},allowedArcanaIds=[]){
  const allowed=new Set(Array.from(allowedArcanaIds,id=>String(id||'').trim().toUpperCase()).filter(Boolean));
  return Object.fromEntries(ENEMY_LAB_DIRECT_ARCANA_BUTTONS.map(button=>{
    const arcanaId=String(value?.[button.id]||'').trim().toUpperCase().replace(/^WOL-/,'');
    return[button.id,allowed.has(arcanaId)?arcanaId:''];
  }));
}

export function enemyLabDirectArcanaButtonsForInput(input={},phase='pressed'){
  const edge=input?.[phase]||{};
  return ENEMY_LAB_DIRECT_ARCANA_BUTTONS.filter(button=>edge[button.id]===true);
}
