// Pure-strain enemy definitions for the first combat-area pass.
// These definitions intentionally share the arena's standard goblin-sized
// gameplay envelope. Visual scale, collision, and target height can diverge
// later when large variants are introduced.

const STANDARD_RADIUS = .94;
const STANDARD_HEIGHT = 4.15;

const standard = ({ color, bellyColor, armorColor, weapon, ...extra }) => ({
  hp: 56,
  radius: STANDARD_RADIUS,
  height: STANDARD_HEIGHT,
  speed: 3.5,
  score: 20,
  color,
  bellyColor,
  armorColor,
  weapon: weapon || 'longsword',
  poseScale: 1,
  fusion: true,
  visualScale: 1,
  targetScale: 1,
  ...extra
});

export const FUSION_ATTACKS = {
  lionPounce: { kind:'melee', name:'Pounce', range:3.45, tokenCost:1.25, windup:.72, active:.22, recovery:.78, cooldown:1.65, damage:14, arc:.82, knock:2.5, movement:'pounce' },
  spidLegStab: { kind:'melee', name:'Leg Stab', range:2.7, tokenCost:.85, windup:.42, active:.16, recovery:.52, cooldown:1.15, damage:8, arc:.72, knock:.35, movement:'stab' },
  sunDart: { kind:'melee', name:'Dart Lunge', range:3.6, tokenCost:1.05, windup:.58, active:.18, recovery:.68, cooldown:1.45, damage:10, arc:.68, knock:1.2, movement:'dart', meleeWindow:{ id:'rear-up', states:['windup','recovery'], targetHeight:'standard' } },
  grabSnatch: { kind:'melee', name:'Snatch', range:2.35, tokenCost:1.1, windup:.7, active:.2, recovery:.72, cooldown:1.55, damage:12, arc:.62, knock:.7, movement:'snatch' },
  toothyChomp: { kind:'melee', name:'Chomp', range:2.25, tokenCost:1.0, windup:.62, active:.2, recovery:.65, cooldown:1.5, damage:13, arc:.8, knock:.65, movement:'chomp' },
  motherHarvest: { kind:'melee', name:'Harvest', range:3.2, tokenCost:1.65, windup:.9, active:.24, recovery:.9, cooldown:1.95, damage:18, arc:1.0, knock:1.1, wantsSolo:true, movement:'harvest' },
  stiltStomp: { kind:'melee', name:'Stomp', range:3.0, tokenCost:1.55, windup:1.0, active:.22, recovery:1.0, cooldown:2.0, damage:17, arc:.95, knock:1.35, wantsSolo:true, movement:'stomp', meleeWindow:{ id:'crouch', states:['recovery'], targetHeight:'standard' } },
  antCharge: { kind:'melee', name:'Charge', range:4.0, tokenCost:1.5, windup:.58, active:.5, recovery:.88, cooldown:1.9, damage:16, arc:.5, knock:2.8, movement:'charge', wantsSolo:true },
  phoenixDive: { kind:'melee', name:'Talon Dive', range:4.1, tokenCost:1.55, windup:.72, active:.34, recovery:.82, cooldown:1.95, damage:16, arc:.72, knock:2.4, movement:'dive', meleeWindow:{ id:'landed', states:['recovery'], targetHeight:'standard' }, airborne:true },
  crocSnap: { kind:'melee', name:'Snap Bite', range:2.3, tokenCost:1.0, windup:.62, active:.18, recovery:.86, cooldown:1.65, damage:15, arc:.72, knock:1.0, movement:'snap', meleeWindow:{ id:'rear-up', states:['windup','recovery'], targetHeight:'standard' } }
};

export const FUSION_ARCHETYPES = {
  lion: standard({ role:'mobile bruiser', preferredRange:2.7, color:0xc99d52, bellyColor:0xe6c36c, armorColor:0x4a3020, weapon:'greatsword', attack:'lionPounce', speed:4.0, hp:62, score:22, pairingTags:['mobile','committed'] }),
  spid: standard({ role:'flanker', preferredRange:2.4, color:0x453a54, bellyColor:0xd8c2a0, armorColor:0x2e2838, weapon:'dagger', attack:'spidLegStab', speed:4.55, hp:46, score:20, poseScale:.9, pairingTags:['mobile','close'] }),
  sun: standard({ role:'skirmisher', preferredRange:3.4, color:0x352c48, bellyColor:0xffc93c, armorColor:0x2a2436, weapon:'spear', attack:'sunDart', speed:3.8, hp:48, score:24, pairingTags:['mobile','soft-counter'] }),
  grab: standard({ role:'disruptor', preferredRange:2.0, color:0x5c4a72, bellyColor:0xd8c2a0, armorColor:0x3a3048, weapon:'mace', attack:'grabSnatch', speed:3.7, hp:58, score:25, pairingTags:['close','control'] }),
  tooth: standard({ role:'frontliner', preferredRange:1.9, color:0x8a3a2e, bellyColor:0xd8c2a0, armorColor:0x5a4a58, weapon:'mace', attack:'toothyChomp', speed:2.9, hp:82, score:28, poseScale:1.05, pairingTags:['anchor','close'] }),
  mother: standard({ role:'area controller', preferredRange:3.0, color:0x6a705c, bellyColor:0x8a8a72, armorColor:0x3a4034, weapon:'warhammer', attack:'motherHarvest', speed:2.25, hp:96, score:34, poseScale:1.08, pairingTags:['anchor','control'] }),
  stilt: standard({ role:'reach sentinel', preferredRange:3.2, color:0x4a5568, bellyColor:0x5a687e, armorColor:0x2a3038, weapon:'spear', attack:'stiltStomp', speed:2.75, hp:76, score:32, poseScale:1.08, pairingTags:['anchor','soft-counter'] }),
  ant: standard({ role:'charger', preferredRange:4.0, color:0xb8a284, bellyColor:0xe8dcc4, armorColor:0x6e5a44, weapon:'longsword', attack:'antCharge', speed:4.8, hp:54, score:30, pairingTags:['committed','mobile'] }),
  phx: standard({ role:'aerial harasser', preferredRange:3.5, color:0xd8b04a, bellyColor:0xf2d98a, armorColor:0xb85c2e, weapon:'spear', attack:'phoenixDive', speed:3.4, hp:58, score:36, poseScale:1.02, pairingTags:['aerial','soft-counter'] }),
  croc: standard({ role:'low ambusher', preferredRange:2.0, color:0x9e2b2b, bellyColor:0xe8d8a8, armorColor:0x6e1e1e, weapon:'mace', attack:'crocSnap', speed:3.15, hp:72, score:30, poseScale:1.02, pairingTags:['low','soft-counter'] })
};

export const FUSION_ENEMY_IDS = Object.keys(FUSION_ARCHETYPES);

export const FUSION_ENEMY_OPTIONS = [
  { id:'lion', label:'Lion' },
  { id:'spid', label:'Spider' },
  { id:'sun', label:'Sun Serpent' },
  { id:'grab', label:'Grabber' },
  { id:'tooth', label:'Toothy' },
  { id:'mother', label:'Mother Courage' },
  { id:'stilt', label:'Stilt' },
  { id:'ant', label:'Antelope' },
  { id:'phx', label:'Phoenix' },
  { id:'croc', label:'Croc' }
];

export function isFusionEnemy(kind){ return !!FUSION_ARCHETYPES[kind]; }
