export const ENEMY_LAB_MAX_DIRECT_COUNT=100;

export const ENEMY_LAB_DIRECT_COUNT_PRESETS=Object.freeze([2,5,10,25,50,100]);

export function clampEnemyLabDirectCount(value,{minimum=1,maximum=ENEMY_LAB_MAX_DIRECT_COUNT}={}){
  const min=Math.max(1,Math.round(Number(minimum)||1));
  const max=Math.max(min,Math.min(ENEMY_LAB_MAX_DIRECT_COUNT,Math.round(Number(maximum)||ENEMY_LAB_MAX_DIRECT_COUNT)));
  return Math.min(max,Math.max(min,Math.round(Number(value)||min)));
}
