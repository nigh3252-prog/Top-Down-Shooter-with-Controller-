const freezeOption=option=>Object.freeze({...option});

// The selector is intentionally a temperament scale rather than ten separate
// AI implementations. Every level still uses the same threat snapshots and
// the same real stance defense runtime; the scale only changes how early the
// Warden commits to defense, how much stamina it protects, and how readily it
// abandons an attack.
export const WARDEN_TEMPERAMENTS=Object.freeze([
  freezeOption({
    level:1,id:'berserker',label:'BERSERKER',
    description:'Defends only against nearly certain hits; spends stamina aggressively.',
    dodgeCooldown:.95,defenseCooldown:.48,defenseTelegraphAt:.70,parryLead:.10,parryMinLead:.035,shieldLead:.20,dodgeLead:.22,
    emergencyDefenseAt:.10,attackCommitLead:.10,defenseReserve:4,attackStaminaFloor:2,
    heavyEvery:3,decisionInterval:.12,centerBias:.55,
  }),
  freezeOption({
    level:2,id:'reckless',label:'RECKLESS',
    description:'Very short reaction windows with only a small defensive reserve.',
    dodgeCooldown:.90,defenseCooldown:.44,defenseTelegraphAt:.55,parryLead:.12,parryMinLead:.035,shieldLead:.26,dodgeLead:.28,
    emergencyDefenseAt:.14,attackCommitLead:.16,defenseReserve:6,attackStaminaFloor:4,
    heavyEvery:4,decisionInterval:.14,centerBias:.65,
  }),
  freezeOption({
    level:3,id:'aggressive',label:'AGGRESSIVE',
    description:'Attacks whenever movement and defense remain reasonably safe.',
    dodgeCooldown:.85,defenseCooldown:.40,defenseTelegraphAt:.42,parryLead:.14,parryMinLead:.035,shieldLead:.32,dodgeLead:.34,
    emergencyDefenseAt:.18,attackCommitLead:.22,defenseReserve:8,attackStaminaFloor:5,
    heavyEvery:4,decisionInterval:.14,centerBias:.75,
  }),
  freezeOption({
    level:4,id:'pressing',label:'PRESSING',
    description:'Keeps offensive pressure and breaks out when a crowd closes in.',
    dodgeCooldown:.80,defenseCooldown:.36,defenseTelegraphAt:.34,parryLead:.16,parryMinLead:.035,shieldLead:.38,dodgeLead:.38,
    emergencyDefenseAt:.20,attackCommitLead:.27,defenseReserve:9,attackStaminaFloor:6,
    heavyEvery:5,decisionInterval:.15,centerBias:.82,
  }),
  freezeOption({
    level:5,id:'balanced-aggressive',label:'BALANCED-AGGRESSIVE',
    description:'Slightly favors offense while preserving a credible defense answer.',
    dodgeCooldown:.76,defenseCooldown:.33,defenseTelegraphAt:.28,parryLead:.17,parryMinLead:.035,shieldLead:.42,dodgeLead:.42,
    emergencyDefenseAt:.22,attackCommitLead:.32,defenseReserve:10,attackStaminaFloor:7,
    heavyEvery:5,decisionInterval:.16,centerBias:.90,
  }),
  freezeOption({
    level:6,id:'balanced',label:'BALANCED',
    description:'Even offense and defense with the standard Warden Trial timing.',
    dodgeCooldown:.75,defenseCooldown:.30,defenseTelegraphAt:.22,parryLead:.18,parryMinLead:.035,shieldLead:.46,dodgeLead:.46,
    emergencyDefenseAt:.25,attackCommitLead:.36,defenseReserve:12,attackStaminaFloor:8,
    heavyEvery:6,decisionInterval:.16,centerBias:1,
  }),
  freezeOption({
    level:7,id:'cautious',label:'CAUTIOUS',
    description:'Defends earlier and gives up more attacks before they become unsafe.',
    dodgeCooldown:.68,defenseCooldown:.27,defenseTelegraphAt:.17,parryLead:.19,parryMinLead:.035,shieldLead:.50,dodgeLead:.50,
    emergencyDefenseAt:.28,attackCommitLead:.42,defenseReserve:14,attackStaminaFloor:9,
    heavyEvery:7,decisionInterval:.17,centerBias:1.10,
  }),
  freezeOption({
    level:8,id:'guarded',label:'GUARDED',
    description:'Maintains a strong stamina reserve and answers threats frequently.',
    dodgeCooldown:.62,defenseCooldown:.24,defenseTelegraphAt:.12,parryLead:.20,parryMinLead:.035,shieldLead:.55,dodgeLead:.55,
    emergencyDefenseAt:.32,attackCommitLead:.48,defenseReserve:16,attackStaminaFloor:10,
    heavyEvery:8,decisionInterval:.18,centerBias:1.25,
  }),
  freezeOption({
    level:9,id:'survivor',label:'SURVIVOR',
    description:'Prioritizes escape and safe spacing over damage output.',
    dodgeCooldown:.56,defenseCooldown:.20,defenseTelegraphAt:.08,parryLead:.21,parryMinLead:.035,shieldLead:.60,dodgeLead:.62,
    emergencyDefenseAt:.38,attackCommitLead:.56,defenseReserve:20,attackStaminaFloor:12,
    heavyEvery:10,decisionInterval:.19,centerBias:1.45,
  }),
  freezeOption({
    level:10,id:'fortress',label:'FORTRESS',
    description:'Uses the earliest defensive timing and the largest protected reserve.',
    dodgeCooldown:.50,defenseCooldown:.16,defenseTelegraphAt:.04,parryLead:.22,parryMinLead:.035,shieldLead:.68,dodgeLead:.68,
    emergencyDefenseAt:.45,attackCommitLead:.64,defenseReserve:24,attackStaminaFloor:14,
    heavyEvery:12,decisionInterval:.20,centerBias:1.65,
  }),
]);

export const DEFAULT_WARDEN_TEMPERAMENT_ID='balanced';

const temperamentById=new Map(WARDEN_TEMPERAMENTS.map(option=>[option.id,option]));
const temperamentByLevel=new Map(WARDEN_TEMPERAMENTS.map(option=>[option.level,option]));

export function normalizeWardenTemperament(value){
  if(value&&typeof value==='object'){
    const byId=temperamentById.get(String(value.id||'').trim().toLowerCase());
    if(byId)return byId;
    const byLevel=temperamentByLevel.get(Number(value.level));
    if(byLevel)return byLevel;
  }
  const token=String(value??'').trim().toLowerCase();
  return temperamentById.get(token)||temperamentByLevel.get(Number(token))||temperamentById.get(DEFAULT_WARDEN_TEMPERAMENT_ID);
}

export function wardenTemperamentForLevel(level){
  return temperamentByLevel.get(Number(level))||normalizeWardenTemperament(level);
}
