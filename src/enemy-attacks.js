export const ENEMY_ATTACKS = {
  chaserLight: { id:'chaserLight', name:'Quick Slash', kind:'melee', range:1.75, tokenCost:.75, windup:.42, active:.16, recovery:.42, cooldown:1.05, damage:7, arc:.82, knock:.25 },
  maceGoblinLight: { id:'maceGoblinLight', name:'Goblin Mace Light', kind:'melee', range:1.85, tokenCost:.85, windup:.34, active:.15, recovery:.36, cooldown:.95, damage:8, arc:.78, knock:.32, wantsSolo:false },
  spearGoblinPoke: { id:'spearGoblinPoke', name:'Goblin Spear Poke', kind:'melee', range:2.75, tokenCost:1.15, windup:.54, active:.20, recovery:.50, cooldown:1.25, damage:10, arc:.48, knock:.42, wantsSolo:false },
  bruteHeavy: { id:'bruteHeavy', name:'Brute Overhead', kind:'melee', range:2.25, tokenCost:1.75, windup:.95, active:.22, recovery:.78, cooldown:1.9, damage:18, arc:.7, knock:.85, wantsSolo:true }
};

export const ENEMY_ATTACK_BY_KIND = {
  chaser: ENEMY_ATTACKS.chaserLight,
  brute: ENEMY_ATTACKS.bruteHeavy,
  maceGoblin: ENEMY_ATTACKS.maceGoblinLight,
  spearGoblin: ENEMY_ATTACKS.spearGoblinPoke
};
