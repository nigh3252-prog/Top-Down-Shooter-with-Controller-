// FLARE: Empyrean Campaign — level-one research roster.
//
// Source values are transcribed from flareteam/flare-game's five explicit
// level-one enemy files. `source` retains the original game values; the top
// level fields are normalized for this arena while preserving relative HP,
// movement speed, melee reach, cooldown, poise, and damage relationships.

export const FLARE_LEVEL_1_POOL_ID = 'flare-level-1';

const common = ({
  label, hp, speed, meleeRange, turnDelayMs, cooldownMs,
  damageMin, damageMax, accuracy, avoidance, poise,
  color, clothColor, accentColor, role = 'frontliner',
  weapon = 'sword', attacks = ['basic'], rarity = 'common',
  statusImmunities = [], ...extra
}) => ({
  label,
  hp,
  radius: .84,
  height: 3.9,
  speed,
  meleeRange,
  threatRange: 8,
  turnDelay: turnDelayMs / 1000,
  cooldown: cooldownMs / 1000,
  damageMin,
  damageMax,
  accuracy,
  avoidance,
  poise,
  score: 12,
  color,
  clothColor,
  accentColor,
  role,
  weapon,
  attacks,
  rarity,
  statusImmunities,
  source: {
    level: 1,
    hp,
    speed,
    meleeRange,
    threatRange: 8,
    turnDelayMs,
    cooldownMs,
    damageMin,
    damageMax,
    accuracy,
    avoidance,
    poise,
    rarity,
  },
  ...extra,
});

export const FLARE_ATTACKS = {
  flareRunnerSlash: {
    kind: 'melee', name: 'Runner Slash', tokenCost: .75,
    windup: .34, active: .13, recovery: .34,
    cooldown: 1.4, damageMin: 5, damageMax: 10,
    range: 1.1875 * 3.15, arc: .9, knock: 1.0,
    movement: 'step', lungeSpeed: 5.4,
  },
  flareBloodStrike: {
    kind: 'melee', name: 'Blood Strike', tokenCost: 1.25,
    windup: .48, active: .34, recovery: .46,
    cooldown: 1.4, damageMin: 6, damageMax: 11,
    range: 1.1875 * 3.35, arc: .64, knock: 2.2,
    movement: 'charge', lungeSpeed: 9.2, wantsSolo: true,
    bleed: { damage: 1, ticks: 5, interval: 1 },
  },
  flareScampSlash: {
    kind: 'melee', name: 'Scamp Slash', tokenCost: 1,
    windup: .48, active: .14, recovery: .43,
    cooldown: 1.6, damageMin: 10, damageMax: 15,
    range: 1.125 * 3.15, arc: 1.08, knock: 1.25,
    movement: 'step', lungeSpeed: 4.6,
  },
  flareSkeletonCut: {
    kind: 'melee', name: 'Cracked Cut', tokenCost: 1,
    windup: .45, active: .14, recovery: .42,
    cooldown: 1.6, damageMin: 10, damageMax: 20,
    range: 1.125 * 3.15, arc: .94, knock: 1.35,
    movement: 'step', lungeSpeed: 4.8,
  },
  flareZombieClaw: {
    kind: 'melee', name: 'Zombie Claw', tokenCost: 1.2,
    windup: .62, active: .18, recovery: .55,
    cooldown: 1.8, damageMin: 15, damageMax: 20,
    range: 1.125 * 3.08, arc: 1.12, knock: 1.5,
    movement: 'lurch', lungeSpeed: 3.8,
  },
};

export const FLARE_ENEMY_ARCHETYPES = {
  flareGoblinRunner: common({
    label: 'Goblin Runner', hp: 60, speed: 4.5, meleeRange: 1.1875,
    turnDelayMs: 200, cooldownMs: 1400, damageMin: 5, damageMax: 10,
    accuracy: 90, avoidance: 10, poise: 15, rarity: 'uncommon',
    color: 0x6f9f4e, clothColor: 0x8d3b2f, accentColor: 0xe7c15c,
    role: 'charger', weapon: 'shortsword',
    attacks: ['flareRunnerSlash', 'flareBloodStrike'], score: 16,
    categories: ['goblin_charger', 'goblin', 'dungeon', 'grassland'],
  }),
  flareGoblinScamp: common({
    label: 'Goblin Scamp', hp: 50, speed: 2.5, meleeRange: 1.125,
    turnDelayMs: 400, cooldownMs: 1600, damageMin: 10, damageMax: 15,
    accuracy: 85, avoidance: 10, poise: 10,
    color: 0x79a85b, clothColor: 0x6d5132, accentColor: 0xc5b46d,
    role: 'frontliner', weapon: 'cleaver', attacks: ['flareScampSlash'],
    categories: ['goblin', 'dungeon', 'grassland'],
  }),
  flareCrackedSkeleton: common({
    label: 'Cracked Skeleton', hp: 60, speed: 3.5, meleeRange: 1.125,
    turnDelayMs: 400, cooldownMs: 1600, damageMin: 10, damageMax: 20,
    accuracy: 90, avoidance: 10, poise: 15,
    color: 0xd8cfb2, clothColor: 0x5c554d, accentColor: 0x97a6ad,
    role: 'duelist', weapon: 'rustySword', attacks: ['flareSkeletonCut'],
    statusImmunities: ['bleeding'], score: 15,
    categories: ['skeleton', 'undead', 'dungeon'],
  }),
  flareCursedZombie: common({
    label: 'Cursed Zombie', hp: 30, speed: 3, meleeRange: 1.125,
    turnDelayMs: 400, cooldownMs: 1800, damageMin: 15, damageMax: 20,
    accuracy: 80, avoidance: 10, poise: 20,
    color: 0x7b8568, clothColor: 0x4b405d, accentColor: 0xaa72d4,
    role: 'shambler', weapon: 'claws', attacks: ['flareZombieClaw'],
    score: 10, cursed: true, categories: ['zombie_raised'],
  }),
  flareRottingZombie: common({
    label: 'Rotting Zombie', hp: 60, speed: 3, meleeRange: 1.125,
    turnDelayMs: 400, cooldownMs: 1800, damageMin: 15, damageMax: 20,
    accuracy: 80, avoidance: 10, poise: 20,
    color: 0x78805d, clothColor: 0x65513c, accentColor: 0x9d6a42,
    role: 'shambler', weapon: 'claws', attacks: ['flareZombieClaw'],
    score: 14, rotting: true,
    categories: ['zombie', 'undead', 'dungeon', 'grassland'],
  }),
};

export const FLARE_LEVEL_1_IDS = Object.keys(FLARE_ENEMY_ARCHETYPES);

export const FLARE_ENEMY_OPTIONS = [
  { id: FLARE_LEVEL_1_POOL_ID, label: 'FLARE · Level 1 Mix' },
  { id: 'flareGoblinRunner', label: 'FLARE · Goblin Runner' },
  { id: 'flareGoblinScamp', label: 'FLARE · Goblin Scamp' },
  { id: 'flareCrackedSkeleton', label: 'FLARE · Cracked Skeleton' },
  { id: 'flareCursedZombie', label: 'FLARE · Cursed Zombie' },
  { id: 'flareRottingZombie', label: 'FLARE · Rotting Zombie' },
];

export function isFlareEnemy(kind){ return !!FLARE_ENEMY_ARCHETYPES[kind]; }
export function isFlareSpawnKind(kind){ return kind === FLARE_LEVEL_1_POOL_ID || isFlareEnemy(kind); }
