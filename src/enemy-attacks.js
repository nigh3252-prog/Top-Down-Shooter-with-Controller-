export const ENEMY_ATTACKS = {
  chaserLight: { id:'chaserLight', name:'Quick Slash', kind:'melee', range:1.75, tokenCost:.75, windup:.42, active:.16, recovery:.42, cooldown:1.05, damage:7, arc:.82, knock:.25 },
  bruteHeavy: { id:'bruteHeavy', name:'Brute Overhead', kind:'melee', range:2.25, tokenCost:1.75, windup:.95, active:.22, recovery:.78, cooldown:1.9, damage:18, arc:.7, knock:.85, wantsSolo:true }
};

export const ENEMY_ATTACK_BY_KIND = {
  chaser: ENEMY_ATTACKS.chaserLight,
  brute: ENEMY_ATTACKS.bruteHeavy
};
