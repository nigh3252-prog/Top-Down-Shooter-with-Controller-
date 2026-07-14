// Hades (2020) Tartarus research roster.
//
// The source block records documented Hades values and behavior. Arena-facing
// health/speed values are normalized to this prototype's scale so the pool is
// playable beside the existing original and FLARE sets.

export const HADES_TARTARUS_POOL_ID = 'hades-tartarus';

const enemy = ({
  label, hp, sourceHealth, sourceArmor, sourceDamage, combatStyle,
  radius, height, speed, preferredRange, role, color, secondaryColor,
  accentColor, attackId = null, thrower = false, flying = false,
  score = 16, ...extra
}) => ({
  label, hp, radius, height, speed, preferredRange, role,
  color, secondaryColor, accentColor, attackId, thrower, flying, score,
  source: {
    region: 'Tartarus', health: sourceHealth, armor: sourceArmor,
    baseDamage: sourceDamage, combatStyle,
  },
  ...extra,
});

export const HADES_ATTACKS = {
  hadesThugSwing: {
    kind:'melee', name:'Club Sweep', tokenCost:1.15,
    range:4.35, windup:.72, active:.20, recovery:.62, cooldown:1.75,
    damage:10, arc:1.55, knock:2.0, movement:'step', lungeSpeed:3.2,
  },
  hadesWitchOrb: {
    kind:'ranged', name:'Witch Orb', tokenCost:.65,
    range:13.5, windup:.62, active:.08, recovery:.48, cooldown:1.55,
    damage:5, arc:0, projectile:true,
  },
  hadesLoutCharge: {
    kind:'melee', name:'Lout Charge', tokenCost:1.55,
    range:8.2, windup:.72, active:.62, recovery:.82, cooldown:2.0,
    damage:8, arc:.62, knock:3.1, movement:'charge', lungeSpeed:13.2,
    wantsSolo:true, uninterruptible:true,
  },
  hadesPestMine: {
    kind:'ranged', name:'Proximity Mine', tokenCost:.55,
    range:12.0, windup:.50, active:.08, recovery:.42, cooldown:1.45,
    damage:5, arc:0, mine:true,
  },
  hadesNumbskullLunge: {
    kind:'melee', name:'Biting Lunge', tokenCost:.55,
    range:4.7, windup:.30, active:.34, recovery:.40, cooldown:1.05,
    damage:3, arc:.68, knock:.8, movement:'charge', lungeSpeed:10.5,
  },
  hadesWringerGrab: {
    kind:'melee', name:'Chain Grab', tokenCost:1.0,
    range:4.0, windup:.52, active:.28, recovery:.62, cooldown:1.65,
    damage:5, arc:.72, knock:.25, movement:'grab', lungeSpeed:7.4,
    restrain:1.0,
  },
  hadesBrimstoneBeam: {
    kind:'ranged', name:'Pain Beam', tokenCost:1.15,
    range:13.2, windup:.82, active:1.15, recovery:.72, cooldown:2.25,
    damage:1, tickDamage:1, arc:0, beam:true, beamTicks:17,
  },
};

export const HADES_ENEMY_ARCHETYPES = {
  hadesWretchedThug: enemy({
    label:'Wretched Thug', hp:70, sourceHealth:160, sourceArmor:480,
    sourceDamage:10, combatStyle:'Mid-range melee', radius:1.12, height:4.45,
    speed:2.35, preferredRange:4.0, role:'bruiser', attackId:'hadesThugSwing',
    color:0x6d5c63, secondaryColor:0x3a3038, accentColor:0xd64545, score:20,
  }),
  hadesWretchedWitch: enemy({
    label:'Wretched Witch', hp:38, sourceHealth:80, sourceArmor:120,
    sourceDamage:5, combatStyle:'Projectiles', radius:.80, height:3.65,
    speed:2.75, preferredRange:9.0, role:'ranged', attackId:'hadesWitchOrb',
    thrower:true, flying:true, color:0x75618f, secondaryColor:0x322544,
    accentColor:0xc467ff, score:18,
  }),
  hadesWretchedLout: enemy({
    label:'Wretched Lout', hp:88, sourceHealth:210, sourceArmor:310,
    sourceDamage:8, combatStyle:'Charge', radius:1.45, height:4.75,
    speed:2.15, preferredRange:6.4, role:'charger', attackId:'hadesLoutCharge',
    color:0x735b55, secondaryColor:0x3d2e2b, accentColor:0xe45e46,
    score:24, uninterruptibleCharge:true,
  }),
  hadesWretchedPest: enemy({
    label:'Wretched Pest', hp:28, sourceHealth:40, sourceArmor:60,
    sourceDamage:5, combatStyle:'Traps', radius:.68, height:2.55,
    speed:3.0, preferredRange:8.0, role:'trapper', attackId:'hadesPestMine',
    thrower:true, color:0x8c765f, secondaryColor:0x44352c,
    accentColor:0xf0a84d, score:14,
  }),
  hadesNumbskull: enemy({
    label:'Numbskull', hp:24, sourceHealth:30, sourceArmor:50,
    sourceDamage:3, combatStyle:'Charge', radius:.63, height:2.1,
    speed:4.2, preferredRange:3.9, role:'charger', attackId:'hadesNumbskullLunge',
    flying:true, color:0xd5c7a3, secondaryColor:0x4a3b39,
    accentColor:0xe55645, score:10,
  }),
  hadesSkullomat: enemy({
    label:'Skullomat', hp:72, sourceHealth:120, sourceArmor:500,
    sourceDamage:0, combatStyle:'Summon Numbskulls', radius:1.38, height:3.65,
    speed:0, preferredRange:10, role:'spawner', attackId:null,
    color:0xc4b993, secondaryColor:0x342d32, accentColor:0xe55349,
    score:28, summonId:'hadesNumbskull', summonInterval:3.15, summonCap:3,
  }),
  hadesWringer: enemy({
    label:'Wringer', hp:58, sourceHealth:140, sourceArmor:230,
    sourceDamage:5, combatStyle:'Close-range melee', radius:.88, height:3.0,
    speed:2.7, preferredRange:3.4, role:'grabber', attackId:'hadesWringerGrab',
    flying:true, color:0xa49a8b, secondaryColor:0x3c3435,
    accentColor:0xd5544d, score:20,
  }),
  hadesBrimstone: enemy({
    label:'Brimstone', hp:34, sourceHealth:60, sourceArmor:90,
    sourceDamage:'1 per tick; 17 total', combatStyle:'Beam', radius:.72,
    height:2.85, speed:1.75, preferredRange:9.5, role:'beam',
    attackId:'hadesBrimstoneBeam', thrower:true, flying:true,
    color:0x8b4558, secondaryColor:0x342332, accentColor:0xff6955,
    score:18,
  }),
};

export const HADES_TARTARUS_IDS = Object.keys(HADES_ENEMY_ARCHETYPES);

export const HADES_ENEMY_OPTIONS = [
  { id:HADES_TARTARUS_POOL_ID, label:'HADES · Tartarus Mix' },
  { id:'hadesWretchedThug', label:'HADES · Wretched Thug' },
  { id:'hadesWretchedWitch', label:'HADES · Wretched Witch' },
  { id:'hadesWretchedLout', label:'HADES · Wretched Lout' },
  { id:'hadesWretchedPest', label:'HADES · Wretched Pest' },
  { id:'hadesNumbskull', label:'HADES · Numbskull' },
  { id:'hadesSkullomat', label:'HADES · Skullomat' },
  { id:'hadesWringer', label:'HADES · Wringer' },
  { id:'hadesBrimstone', label:'HADES · Brimstone' },
];

export function isHadesEnemy(kind){ return !!HADES_ENEMY_ARCHETYPES[kind]; }
export function isHadesSpawnKind(kind){ return kind===HADES_TARTARUS_POOL_ID || isHadesEnemy(kind); }
