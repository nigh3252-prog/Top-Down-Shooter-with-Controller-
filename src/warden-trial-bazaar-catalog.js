// Generated from the pinned Bazaar source snapshot documented in
// docs/design/saturns_gravity_bazaar_arcana_mapping.md. Raw source values stay
// immutable here; mutable cooldown progress belongs to dealt card instances.
export const WARDEN_TRIAL_BAZAAR_FALLBACK_PENDING_SECONDS = 5;

const deepFreeze = value => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

const ARCANA_ITEMS = [
  {
    "id": "BAZAAR-CAUTERIZING-BLADE",
    "family": "arcana",
    "mappingIndex": 1,
    "arcanaId": "FLAME-STRIKE",
    "name": "Cauterizing Blade",
    "sourceCardId": "h99hpfsphyklf4wyjv9nkwhb8x",
    "sourceUrl": "https://bazaardb.gg/card/h99hpfsphyklf4wyjv9nkwhb8x/Cauterizing-Blade",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.2",
    "startingTier": "Silver",
    "size": "Medium",
    "tags": [
      "Weapon",
      "Tech",
      "Damage",
      "Burn"
    ],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "damage": 20,
      "burn": 6,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 20 Damage",
      "Burn 6",
      "When you Slow, this gains +10 Damage and +3 Burn; Quest: Slow 10 times",
      "When you Haste, this gains +10 Damage and +3 Burn; Quest: Haste 10 times"
    ],
    "rules": [
      "On use, deal 20 Damage.",
      "On use, Burn the opponent for 6.",
      "Quest: apply Slow 10 times OR Haste 10 times; the completed quest grants +10 Damage and +3 Burn for the fight."
    ]
  },
  {
    "id": "BAZAAR-BUTTERFLY-SWORDS",
    "family": "arcana",
    "mappingIndex": 2,
    "arcanaId": "FLAME-CROSS",
    "name": "Butterfly Swords",
    "sourceCardId": "tvbb60wvfm5dwdql4jd552724f",
    "sourceUrl": "https://bazaardb.gg/card/tvbb60wvfm5dwdql4jd552724f/Butterfly-Swords",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Silver",
    "size": "Small",
    "tags": [
      "Weapon",
      "Damage"
    ],
    "cooldownSeconds": 6,
    "pendingCooldownSeconds": 6,
    "output": {
      "damage": 10,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 2
    },
    "printedOutput": [
      "Deal 10 Damage"
    ],
    "rules": [
      "On use, deal 10 Damage."
    ]
  },
  {
    "id": "BAZAAR-POP-SNAPPERS",
    "family": "arcana",
    "mappingIndex": 3,
    "arcanaId": "BOUNCING-BLAZE",
    "name": "Pop Snappers",
    "sourceCardId": "33zl8gh869n0xcyk79dw6vdflj",
    "sourceUrl": "https://bazaardb.gg/card/33zl8gh869n0xcyk79dw6vdflj/Pop-Snappers",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Small",
    "tags": [
      "Toy",
      "Burn",
      "Ammo"
    ],
    "cooldownSeconds": 3,
    "pendingCooldownSeconds": 3,
    "output": {
      "damage": null,
      "burn": 4,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": 4,
      "multicast": 1
    },
    "printedOutput": [
      "Burn 4"
    ],
    "rules": [
      "On use, Burn the opponent for 4."
    ]
  },
  {
    "id": "BAZAAR-KATANA",
    "family": "arcana",
    "mappingIndex": 4,
    "arcanaId": "WIND-SLASH",
    "name": "Katana",
    "sourceCardId": "f9xmx2hzf0xkldvltxlyv8gfh6",
    "sourceUrl": "https://bazaardb.gg/card/f9xmx2hzf0xkldvltxlyv8gfh6/Katana",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Medium",
    "tags": [
      "Weapon",
      "Damage"
    ],
    "cooldownSeconds": 2,
    "pendingCooldownSeconds": 2,
    "output": {
      "damage": 15,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 15 Damage"
    ],
    "rules": [
      "On use, deal 15 Damage."
    ]
  },
  {
    "id": "BAZAAR-PISTOL-SWORD",
    "family": "arcana",
    "mappingIndex": 5,
    "arcanaId": "AIR-SPINNER",
    "name": "Pistol Sword",
    "sourceCardId": "5zy2xjisr37k3ml2uj3ar8qjf",
    "sourceUrl": "https://bazaardb.gg/card/5zy2xjisr37k3ml2uj3ar8qjf/Pistol-Sword",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Gold",
    "size": "Medium",
    "tags": [
      "Weapon",
      "Damage",
      "Ammo"
    ],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "damage": 15,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": 3,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 15 Damage",
      "When you use an Ammo item, deal 15 Damage"
    ],
    "rules": [
      "On use, deal 15 Damage.",
      "When you use an Ammo item, deal 15 Damage."
    ]
  },
  {
    "id": "BAZAAR-DART-LAUNCHER",
    "family": "arcana",
    "mappingIndex": 6,
    "arcanaId": "PERFORATING-JET",
    "name": "Dart Launcher",
    "sourceCardId": "1334tn1pt2zwtyqym58bsf42h5d",
    "sourceUrl": "https://bazaardb.gg/card/1334tn1pt2zwtyqym58bsf42h5d/Dart-Launcher",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Silver",
    "size": "Small",
    "tags": [
      "Tech",
      "Slow",
      "Poison",
      "PoisonReference"
    ],
    "cooldownSeconds": 4,
    "pendingCooldownSeconds": 4,
    "output": {
      "damage": null,
      "burn": null,
      "poison": 3,
      "healthDamagePercent": null,
      "ammo": 3,
      "multicast": 1
    },
    "printedOutput": [
      "Slow 1 item for 1 second",
      "Poison 3"
    ],
    "rules": [
      "On use, Slow 1 opposing item for 1 second.",
      "On use, Poison the opponent for 3."
    ]
  },
  {
    "id": "BAZAAR-MANTIS-SHRIMP",
    "family": "arcana",
    "mappingIndex": 7,
    "arcanaId": "EARTH-KNUCKLES",
    "name": "Mantis Shrimp",
    "sourceCardId": "13ds9gmttl0h0vqdzmyt0t30x4n",
    "sourceUrl": "https://bazaardb.gg/card/13ds9gmttl0h0vqdzmyt0t30x4n/Mantis-Shrimp",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Small",
    "tags": [
      "Aquatic",
      "Weapon",
      "Friend",
      "Damage",
      "Burn",
      "SlowReference",
      "Ammo"
    ],
    "cooldownSeconds": 9,
    "pendingCooldownSeconds": 9,
    "output": {
      "damage": 20,
      "burn": 2,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": 2,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 20 Damage",
      "Burn 2",
      "When you Slow, this gains +10 Damage and +2 Burn"
    ],
    "rules": [
      "On use, deal 20 Damage and Burn 2.",
      "When you Slow, this gains +10 Damage and +2 Burn for the fight."
    ]
  },
  {
    "id": "BAZAAR-SWITCHBLADE",
    "family": "arcana",
    "mappingIndex": 8,
    "arcanaId": "BLADED-VINE",
    "name": "Switchblade",
    "sourceCardId": "13mjkvbjx93w54gq9bm3753gbgk",
    "sourceUrl": "https://bazaardb.gg/card/13mjkvbjx93w54gq9bm3753gbgk/Switchblade",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Small",
    "tags": [
      "Weapon",
      "Damage"
    ],
    "cooldownSeconds": 4,
    "pendingCooldownSeconds": 4,
    "output": {
      "damage": 4,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 4 Damage",
      "When you use an adjacent Weapon, it gains +4 Damage"
    ],
    "rules": [
      "On use, deal 4 Damage.",
      "When an adjacent Weapon is used, that Weapon gains +4 Damage for the fight."
    ]
  },
  {
    "id": "BAZAAR-PET-ROCK",
    "family": "arcana",
    "mappingIndex": 9,
    "arcanaId": "STONE-SHOT",
    "name": "Pet Rock",
    "sourceCardId": "1nk97x8vj0p59000n2j72kgsth",
    "sourceUrl": "https://bazaardb.gg/card/1nk97x8vj0p59000n2j72kgsth/Pet-Rock",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Small",
    "tags": [
      "Weapon",
      "Friend",
      "Toy",
      "Damage",
      "Crit"
    ],
    "cooldownSeconds": 6,
    "pendingCooldownSeconds": 6,
    "output": {
      "damage": 10,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 10 Damage",
      "If this is your only Friend, your items have +10% Crit Chance"
    ],
    "rules": [
      "On use, deal 10 Damage.",
      "If this is your only Friend, your items have +10% Crit Chance."
    ]
  },
  {
    "id": "BAZAAR-CYBER-SAI",
    "family": "arcana",
    "mappingIndex": 10,
    "arcanaId": "SPARK-CONTACT",
    "name": "Cyber-Sai",
    "sourceCardId": "8x4my442h0tv2zhtlj3tvjbp7l",
    "sourceUrl": "https://bazaardb.gg/card/8x4my442h0tv2zhtlj3tvjbp7l/Cyber-Sai",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Silver",
    "size": "Medium",
    "tags": [
      "Weapon",
      "Tech",
      "Damage",
      "CritReference"
    ],
    "cooldownSeconds": 3,
    "pendingCooldownSeconds": 3,
    "output": {
      "damage": 10,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 10 Damage",
      "When you Crit, your Weapons gain +10 Damage"
    ],
    "rules": [
      "On use, deal 10 Damage.",
      "When an item on your board Crits, your board Weapons gain +10 Damage for the fight."
    ]
  },
  {
    "id": "BAZAAR-RIFLE",
    "family": "arcana",
    "mappingIndex": 11,
    "arcanaId": "BOLT-RAIL",
    "name": "Rifle",
    "sourceCardId": "4n7b5szh36wgklvjq8k07c2fvc",
    "sourceUrl": "https://bazaardb.gg/card/4n7b5szh36wgklvjq8k07c2fvc/Rifle",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Medium",
    "tags": [
      "Weapon",
      "Damage",
      "Ammo"
    ],
    "cooldownSeconds": 2,
    "pendingCooldownSeconds": 2,
    "output": {
      "damage": 10,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": 1,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 10 Damage",
      "This gains +10 Damage"
    ],
    "rules": [
      "On use, deal 10 Damage.",
      "On use, this gains +10 Damage for the fight."
    ]
  },
  {
    "id": "BAZAAR-REVOLVER",
    "family": "arcana",
    "mappingIndex": 12,
    "arcanaId": "VOLT-DISC",
    "name": "Revolver",
    "sourceCardId": "s1ctwpplcwmdypdmqfsvclz0xp",
    "sourceUrl": "https://bazaardb.gg/card/s1ctwpplcwmdypdmqfsvclz0xp/Revolver",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Small",
    "tags": [
      "Weapon",
      "Damage",
      "Ammo"
    ],
    "cooldownSeconds": 3,
    "pendingCooldownSeconds": 3,
    "output": {
      "damage": 8,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": 6,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 8 Damage"
    ],
    "rules": [
      "On use, deal 8 Damage."
    ]
  },
  {
    "id": "BAZAAR-ICE-PICK",
    "family": "arcana",
    "mappingIndex": 13,
    "arcanaId": "ICE-DAGGER",
    "name": "Ice Pick",
    "sourceCardId": "wdjp7q7gyhv1lsmzskhygpbbmz",
    "sourceUrl": "https://bazaardb.gg/card/wdjp7q7gyhv1lsmzskhygpbbmz/Ice-Pick",
    "sourceKind": "bazaar_db",
    "sourcePatch": "16.2",
    "startingTier": "Silver",
    "size": "Small",
    "tags": [
      "Weapon",
      "Tool",
      "Damage",
      "Freeze"
    ],
    "cooldownSeconds": 4,
    "pendingCooldownSeconds": 4,
    "output": {
      "damage": 25,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 25 Damage",
      "Freeze an item for 1 second",
      "When you Freeze, this gains +15 Damage"
    ],
    "rules": [
      "On use, deal 25 Damage.",
      "On use, Freeze 1 opposing item for 1 second.",
      "When you Freeze, this gains +15 Damage for the fight."
    ]
  },
  {
    "id": "BAZAAR-SCIMITAR-OF-THE-DEEP",
    "family": "arcana",
    "mappingIndex": 14,
    "arcanaId": "RIP-TIDE",
    "name": "Scimitar of the Deep",
    "sourceCardId": "5szlp8k6d461vn0sqr32e4jqt",
    "sourceUrl": "https://bazaardb.gg/card/5szlp8k6d461vn0sqr32e4jqt/Scimitar-of-the-Deep",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Silver",
    "size": "Medium",
    "tags": [
      "Weapon",
      "Relic",
      "Aquatic",
      "Damage",
      "DamageReference",
      "Poison",
      "PoisonReference",
      "Crit",
      "CritReference",
      "HasteReference"
    ],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "damage": 30,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 30 Damage",
      "When you Crit, Poison equal to 25% of this item's Damage",
      "When you Haste this, your items gain +3 Poison"
    ],
    "rules": [
      "On use, deal 30 Damage.",
      "When any board item Crits, Poison the opponent for 25% of this item's Damage.",
      "When this is Hasted, board Poison items gain +3 Poison for the fight."
    ]
  },
  {
    "id": "BAZAAR-DOUBLE-BARREL",
    "family": "arcana",
    "mappingIndex": 15,
    "arcanaId": "AQUA-ARC",
    "name": "Double Barrel",
    "sourceCardId": "3l7g4kiy6iv8007avjo2jzgzf",
    "sourceUrl": "https://bazaardb.gg/card/3l7g4kiy6iv8007avjo2jzgzf/Double-Barrel",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Medium",
    "tags": [
      "Weapon",
      "Damage",
      "Ammo"
    ],
    "cooldownSeconds": 4,
    "pendingCooldownSeconds": 4,
    "output": {
      "damage": 20,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": 2,
      "multicast": 2
    },
    "printedOutput": [
      "Deal 20 Damage"
    ],
    "rules": [
      "On use, deal 20 Damage."
    ]
  },
  {
    "id": "BAZAAR-SLUMBERING-PRIMORDIAL",
    "family": "arcana",
    "mappingIndex": 16,
    "arcanaId": "CHAOS-CRUSHER",
    "name": "Slumbering Primordial",
    "sourceCardId": "tcljffx9206yfpg7vlt51ckcyc",
    "sourceUrl": "https://bazaardb.gg/card/tcljffx9206yfpg7vlt51ckcyc/Slumbering-Primordial",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Gold",
    "size": "Large",
    "tags": [
      "Friend",
      "Aquatic",
      "Weapon",
      "Relic",
      "PoisonReference",
      "FreezeReference",
      "BurnReference",
      "Damage",
      "DamageReference"
    ],
    "cooldownSeconds": 25,
    "pendingCooldownSeconds": 25,
    "output": {
      "damage": 15,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 4
    },
    "printedOutput": [
      "Deal 15 Damage",
      "When you Poison, Freeze, or Burn, Charge this 2 seconds and this gains +15 Damage"
    ],
    "rules": [
      "On use, deal 15 Damage.",
      "When Poison, Freeze, or Burn occurs, Charge this for 2 seconds and gain +15 Damage for the fight."
    ]
  },
  {
    "id": "BAZAAR-BLADED-HOVERBOARD",
    "family": "arcana",
    "mappingIndex": 17,
    "arcanaId": "SEARING-RUSH",
    "name": "Bladed Hoverboard",
    "sourceCardId": "n4z59z0q0y048z9svtd4y6zm2k",
    "sourceUrl": "https://bazaardb.gg/card/n4z59z0q0y048z9svtd4y6zm2k/Bladed-Hoverboard",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Silver",
    "size": "Medium",
    "tags": [
      "Weapon",
      "Tech",
      "Aquatic",
      "Vehicle",
      "Damage",
      "Flying"
    ],
    "cooldownSeconds": null,
    "pendingCooldownSeconds": 5,
    "output": {
      "damage": 20,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "When you use an adjacent item, deal 20 Damage and it starts Flying"
    ],
    "rules": [
      "When an adjacent item is used, deal 20 Damage and the used adjacent item starts Flying."
    ]
  },
  {
    "id": "BAZAAR-JETBIKE",
    "family": "arcana",
    "mappingIndex": 18,
    "arcanaId": "FLARE-RUSH",
    "name": "Jetbike",
    "sourceCardId": "3jyd1l07fb8qwvjxbn3yp89spm",
    "sourceUrl": "https://bazaardb.gg/card/3jyd1l07fb8qwvjxbn3yp89spm/Jetbike",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Silver",
    "size": "Large",
    "tags": [
      "Weapon",
      "Vehicle",
      "Damage",
      "Flying",
      "FlyingReference"
    ],
    "cooldownSeconds": 7,
    "pendingCooldownSeconds": 7,
    "output": {
      "damage": 200,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 200 Damage",
      "When you use an adjacent item, it and this start Flying",
      "When you use another Flying item, Charge this 1 second"
    ],
    "rules": [
      "On use, deal 200 Damage.",
      "When an adjacent item is used, that item and this start Flying.",
      "When another Flying item is used, Charge this for 1 second."
    ]
  },
  {
    "id": "BAZAAR-BURNACUDA",
    "family": "arcana",
    "mappingIndex": 19,
    "arcanaId": "IGNITION-RUSH",
    "name": "Burnacuda",
    "sourceCardId": "qfg1929872wkv794199zd6mz44",
    "sourceUrl": "https://bazaardb.gg/card/qfg1929872wkv794199zd6mz44/Burnacuda",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Small",
    "tags": [
      "Aquatic",
      "Friend",
      "Burn",
      "Ammo",
      "Haste"
    ],
    "cooldownSeconds": 3,
    "pendingCooldownSeconds": 3,
    "output": {
      "damage": null,
      "burn": 3,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": 1,
      "multicast": 1
    },
    "printedOutput": [
      "Burn 3",
      "Haste an adjacent item for 1 second"
    ],
    "rules": [
      "On use, Burn the opponent for 3.",
      "On use, Haste an adjacent item for 1 second."
    ]
  },
  {
    "id": "BAZAAR-SHOE-BLADE",
    "family": "arcana",
    "mappingIndex": 20,
    "arcanaId": "AIR-BURST",
    "name": "Shoe Blade",
    "sourceCardId": "nm6h6kl7pswvfqvx8qfnhvny35",
    "sourceUrl": "https://nrt.bazaardb.gg/card/nm6h6kl7pswvfqvx8qfnhvny35",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Small",
    "tags": [
      "Weapon",
      "Apparel",
      "Damage",
      "Crit"
    ],
    "cooldownSeconds": 6,
    "pendingCooldownSeconds": 6,
    "output": {
      "damage": 25,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 25 Damage",
      "This has +100% Crit Chance on its first use each fight"
    ],
    "rules": [
      "On use, deal 25 Damage.",
      "On its first use each fight, this has +100% Crit Chance."
    ]
  },
  {
    "id": "BAZAAR-NARWHAL",
    "family": "arcana",
    "mappingIndex": 21,
    "arcanaId": "GUST-BURST",
    "name": "Narwhal",
    "sourceCardId": "45jspjg8x08xzhj4hzbtm4mjx",
    "sourceUrl": "https://bazaardb.gg/card/45jspjg8x08xzhj4hzbtm4mjx/Narwhal",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Small",
    "tags": [
      "Aquatic",
      "Weapon",
      "Friend",
      "Damage"
    ],
    "cooldownSeconds": 3,
    "pendingCooldownSeconds": 3,
    "output": {
      "damage": 5,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 5 Damage"
    ],
    "rules": [
      "On use, deal 5 Damage."
    ]
  },
  {
    "id": "BAZAAR-VAMPIRE-SQUID",
    "family": "arcana",
    "mappingIndex": 22,
    "arcanaId": "RAZOR-BURST",
    "name": "Vampire Squid",
    "sourceCardId": null,
    "sourceUrl": "https://bazaardb.gg/card/17ztwbvh6kqm12ts51mgdst195l/Aimbot",
    "sourceKind": "bazaar_db_merchant_item_pool",
    "sourcePatch": "17.3",
    "startingTier": "Silver",
    "size": "Small",
    "tags": [
      "Aquatic",
      "Weapon",
      "Friend",
      "Damage",
      "CritReference",
      "Lifesteal"
    ],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "damage": 15,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 15 Damage",
      "This has +Damage equal to its Crit Chance",
      "Lifesteal"
    ],
    "rules": [
      "On use, deal 15 Damage.",
      "This gains Damage equal to its Crit Chance.",
      "Lifesteal 100%."
    ]
  },
  {
    "id": "BAZAAR-SHOVEL",
    "family": "arcana",
    "mappingIndex": 23,
    "arcanaId": "SPIKE-TRACK",
    "name": "Shovel",
    "sourceCardId": "mmwc4f02vwml4py9sbplfqll4z",
    "sourceUrl": "https://bazaardb.gg/card/mmwc4f02vwml4py9sbplfqll4z/Shovel",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Medium",
    "tags": [
      "Weapon",
      "Tool",
      "Damage"
    ],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "damage": 25,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 25 Damage",
      "At the start of each day, get a Small item from any hero"
    ],
    "rules": [
      "On use, deal 25 Damage.",
      "At the start of each day, get a Small item from any hero."
    ]
  },
  {
    "id": "BAZAAR-ELEMENTAL-DEPTH-CHARGE",
    "family": "arcana",
    "mappingIndex": 24,
    "arcanaId": "TOXIC-TRAP",
    "name": "Elemental Depth Charge",
    "sourceCardId": "aif62idnd6fdnmwkz6ipsbh6f",
    "sourceUrl": "https://bazaardb.gg/card/aif62idnd6fdnmwkz6ipsbh6f/Elemental-Depth-Charge",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Silver",
    "size": "Medium",
    "tags": [
      "Aquatic",
      "Tech",
      "Trap",
      "Burn",
      "Poison",
      "Freeze",
      "Ammo"
    ],
    "cooldownSeconds": 11,
    "pendingCooldownSeconds": 11,
    "output": {
      "damage": null,
      "burn": 4,
      "poison": 4,
      "healthDamagePercent": null,
      "ammo": 1,
      "multicast": {
        "base": 1,
        "per_other_aquatic": 1
      }
    },
    "printedOutput": [
      "Poison 4, Burn 4, and Freeze an item for 1 second",
      "This has +1 Multicast for each other Aquatic item you have"
    ],
    "rules": [
      "On use, Poison 4, Burn 4, and Freeze 1 opposing item for 1 second.",
      "Gains +1 Multicast for each other Aquatic item you have."
    ]
  },
  {
    "id": "BAZAAR-GRAPPLING-HOOK",
    "family": "arcana",
    "mappingIndex": 25,
    "arcanaId": "SNARE-TRACK",
    "name": "Grappling Hook",
    "sourceCardId": "41v9q80kmiyv3z82catg6zlox",
    "sourceUrl": "https://bazaardb.gg/card/41v9q80kmiyv3z82catg6zlox/Grappling-Hook",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Small",
    "tags": [
      "Weapon",
      "Tool",
      "Damage",
      "Slow"
    ],
    "cooldownSeconds": 6,
    "pendingCooldownSeconds": 6,
    "output": {
      "damage": 20,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 20 Damage",
      "Slow 2 items for 1 second"
    ],
    "rules": [
      "On use, deal 20 Damage.",
      "On use, Slow 2 opposing items for 1 second."
    ]
  },
  {
    "id": "BAZAAR-CANNON",
    "family": "arcana",
    "mappingIndex": 26,
    "arcanaId": "THUNDER-LINE",
    "name": "Cannon",
    "sourceCardId": "bsoe0vzw41jhxnkor4gzy2jvd",
    "sourceUrl": "https://bazaardb.gg/card/bsoe0vzw41jhxnkor4gzy2jvd/Cannon",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Medium",
    "tags": [
      "Weapon",
      "Damage",
      "Ammo",
      "Burn"
    ],
    "cooldownSeconds": 4,
    "pendingCooldownSeconds": 4,
    "output": {
      "damage": 40,
      "burn": 4,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": 2,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 40 Damage",
      "Burn equal to 10% of this item's Damage"
    ],
    "rules": [
      "On use, deal 40 Damage.",
      "On use, Burn the opponent for 10% of this item's Damage (4 at starting tier)."
    ]
  },
  {
    "id": "BAZAAR-CANNONADE",
    "family": "arcana",
    "mappingIndex": 27,
    "arcanaId": "CIRCUIT-LINE",
    "name": "Cannonade",
    "sourceCardId": "10gwz40pnjk7clz1d63x917cfxn",
    "sourceUrl": "https://bazaardb.gg/card/10gwz40pnjk7clz1d63x917cfxn/Cannonade",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Gold",
    "size": "Large",
    "tags": [
      "Weapon",
      "Damage",
      "BurnReference"
    ],
    "cooldownSeconds": 12,
    "pendingCooldownSeconds": 12,
    "output": {
      "damage": 200,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 3
    },
    "printedOutput": [
      "Deal 200 Damage",
      "When you use another Weapon or Burn item, Charge this 2 seconds"
    ],
    "rules": [
      "On use, deal 200 Damage.",
      "When you use another Weapon or Burn item, Charge this for 2 seconds."
    ]
  },
  {
    "id": "BAZAAR-JITTE",
    "family": "arcana",
    "mappingIndex": 28,
    "arcanaId": "SHOCK-LINE",
    "name": "Jitte",
    "sourceCardId": "155f5m272x60fhz5q3fd8924s1y",
    "sourceUrl": "https://bazaardb.gg/card/155f5m272x60fhz5q3fd8924s1y/Jitte",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Silver",
    "size": "Small",
    "tags": [
      "Weapon",
      "Damage",
      "Slow"
    ],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "damage": 20,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 20 Damage",
      "Slow an item for 1 second",
      "When you Slow, this gains +10 Damage"
    ],
    "rules": [
      "On use, deal 20 Damage.",
      "On use, Slow 1 opposing item for 1 second.",
      "When you Slow, this gains +10 Damage for the fight."
    ]
  },
  {
    "id": "BAZAAR-TORTUGA",
    "family": "arcana",
    "mappingIndex": 29,
    "arcanaId": "WAVE-FRONT",
    "name": "Tortuga",
    "sourceCardId": "1905vptydc5nxjpdb6jv7xvtyjs",
    "sourceUrl": "https://bazaardb.gg/card/1905vptydc5nxjpdb6jv7xvtyjs/Tortuga",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.2",
    "startingTier": "Gold",
    "size": "Large",
    "tags": [
      "Aquatic",
      "Friend",
      "Vehicle",
      "Weapon",
      "Damage",
      "Haste"
    ],
    "cooldownSeconds": 12,
    "pendingCooldownSeconds": 12,
    "output": {
      "damage": 450,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 450 Damage",
      "Haste your other items for 1 second",
      "When you use another Friend, Charge this 2 seconds"
    ],
    "rules": [
      "On use, deal 450 Damage.",
      "On use, Haste other items for 1 second.",
      "When another Friend is used, Charge this for 2 seconds."
    ]
  },
  {
    "id": "BAZAAR-BILGE-WORM",
    "family": "arcana",
    "mappingIndex": 30,
    "arcanaId": "FROST-FEINT",
    "name": "Bilge Worm",
    "sourceCardId": null,
    "sourceUrl": "https://bazaardb.gg/card/14hqpzjc2gzvxy5t262l5vlx3hk/Aila",
    "sourceKind": "bazaar_db_merchant_item_pool",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Small",
    "tags": [
      "Weapon",
      "Aquatic",
      "Damage",
      "Lifesteal"
    ],
    "cooldownSeconds": null,
    "pendingCooldownSeconds": 5,
    "output": {
      "damage": 10,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "When your enemy uses their leftmost item, deal 10 Damage",
      "Lifesteal"
    ],
    "rules": [
      "When the enemy uses their leftmost item, deal 10 Damage.",
      "Lifesteal 100%."
    ]
  },
  {
    "id": "BAZAAR-THROWING-KNIVES",
    "family": "arcana",
    "mappingIndex": 31,
    "arcanaId": "FROST-WING",
    "name": "Throwing Knives",
    "sourceCardId": "dc1sye961jgoffun2ze0xwzmf",
    "sourceUrl": "https://bazaardb.gg/card/dc1sye961jgoffun2ze0xwzmf/Throwing-Knives",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Gold",
    "size": "Small",
    "tags": [
      "Weapon",
      "Damage",
      "CritReference",
      "Ammo"
    ],
    "cooldownSeconds": 4,
    "pendingCooldownSeconds": 4,
    "output": {
      "damage": 33,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": 2,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 33 Damage",
      "When you Crit with another item, use this"
    ],
    "rules": [
      "On use, deal 33 Damage.",
      "When another item Crits, use this."
    ]
  },
  {
    "id": "BAZAAR-ONI-MASK",
    "family": "arcana",
    "mappingIndex": 32,
    "arcanaId": "CHAOTIC-RIFT",
    "name": "Oni Mask",
    "sourceCardId": "mdcph08lv65pq4cvpwwtnmpw3d",
    "sourceUrl": "https://bazaardb.gg/card/mdcph08lv65pq4cvpwwtnmpw3d/Oni-Mask",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.1",
    "startingTier": "Silver",
    "size": "Medium",
    "tags": [
      "Apparel",
      "Tech",
      "Burn",
      "BurnReference",
      "CritReference"
    ],
    "cooldownSeconds": 6,
    "pendingCooldownSeconds": 6,
    "output": {
      "damage": null,
      "burn": 6,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Burn 6",
      "When you Crit, your items gain +4 Burn"
    ],
    "rules": [
      "On use, Burn the opponent for 6.",
      "When any board item Crits, board Burn items gain +4 Burn for the fight."
    ]
  },
  {
    "id": "BAZAAR-LIGHTER",
    "family": "arcana",
    "mappingIndex": 33,
    "arcanaId": "FLAME-BREATH",
    "name": "Lighter",
    "sourceCardId": "9kp0n6thgzgv90226qfbj92c2m",
    "sourceUrl": "https://bazaardb.gg/card/9kp0n6thgzgv90226qfbj92c2m/Lighter",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Small",
    "tags": [
      "Tool",
      "Burn"
    ],
    "cooldownSeconds": 3,
    "pendingCooldownSeconds": 3,
    "output": {
      "damage": null,
      "burn": 3,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Burn 3"
    ],
    "rules": [
      "On use, Burn the opponent for 3."
    ]
  },
  {
    "id": "BAZAAR-BONFIRE",
    "family": "arcana",
    "mappingIndex": 34,
    "arcanaId": "SEARING-CROWN",
    "name": "Bonfire",
    "sourceCardId": "zg4v5c5z42c2gptp7tvsfzq0sg",
    "sourceUrl": "https://bazaardb.gg/card/zg4v5c5z42c2gptp7tvsfzq0sg/Bonfire",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Silver",
    "size": "Medium",
    "tags": [
      "Burn",
      "Haste"
    ],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "damage": null,
      "burn": 5,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Burn 5",
      "When you Burn, Haste an adjacent item for 1 second"
    ],
    "rules": [
      "On use, Burn the opponent for 5.",
      "When you Burn, Haste an adjacent item for 1 second."
    ]
  },
  {
    "id": "BAZAAR-KUSARIGAMA",
    "family": "arcana",
    "mappingIndex": 35,
    "arcanaId": "BLAZING-LARIAT",
    "name": "Kusarigama",
    "sourceCardId": "c0fucfgrlkbq2ym4bwv72bh9g",
    "sourceUrl": "https://bazaardb.gg/card/c0fucfgrlkbq2ym4bwv72bh9g/Kusarigama",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Silver",
    "size": "Small",
    "tags": [
      "Weapon",
      "Tech",
      "Damage",
      "CritReference",
      "SlowReference"
    ],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "damage": 4,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 4 Damage",
      "When you Slow or Crit, this and adjacent Weapons gain +4 Damage"
    ],
    "rules": [
      "On use, deal 4 Damage.",
      "When you Slow or Crit, this and adjacent Weapons gain +4 Damage for the fight."
    ]
  },
  {
    "id": "BAZAAR-GRENADE",
    "family": "arcana",
    "mappingIndex": 36,
    "arcanaId": "EXPLOSIVE-CHARGE",
    "name": "Grenade",
    "sourceCardId": "7gzm05wdg3808j52q1c7cfq77p",
    "sourceUrl": "https://bazaardb.gg/card/7gzm05wdg3808j52q1c7cfq77p/Grenade",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Small",
    "tags": [
      "Weapon",
      "Damage",
      "Ammo",
      "Crit"
    ],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "damage": 50,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": 1,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 50 Damage",
      "25% Crit Chance"
    ],
    "rules": [
      "On use, deal 50 Damage.",
      "Base Crit Chance is 25%."
    ]
  },
  {
    "id": "BAZAAR-REPEATER",
    "family": "arcana",
    "mappingIndex": 37,
    "arcanaId": "HOMING-FLARES",
    "name": "Repeater",
    "sourceCardId": "5py9snduszllzogy6pken5sbk",
    "sourceUrl": "https://bazaardb.gg/card/5py9snduszllzogy6pken5sbk/Repeater",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Silver",
    "size": "Medium",
    "tags": [
      "Weapon",
      "Damage",
      "Ammo"
    ],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "damage": 30,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": 2,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 30 Damage",
      "When you use another Ammo item, use this"
    ],
    "rules": [
      "On use, deal 30 Damage.",
      "When another Ammo item is used, use this."
    ]
  },
  {
    "id": "BAZAAR-BALLISTA",
    "family": "arcana",
    "mappingIndex": 38,
    "arcanaId": "DRAGON-ARC",
    "name": "Ballista",
    "sourceCardId": "1gcjtjpfqt7gdt4p3yvpxsqf5v",
    "sourceUrl": "https://bazaardb.gg/card/1gcjtjpfqt7gdt4p3yvpxsqf5v/Ballista",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Gold",
    "size": "Large",
    "tags": [
      "Weapon",
      "Damage",
      "Ammo"
    ],
    "cooldownSeconds": 9,
    "pendingCooldownSeconds": 9,
    "output": {
      "damage": 200,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": 2,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 200 Damage",
      "When you use another Ammo item, this gains +1 Multicast"
    ],
    "rules": [
      "On use, deal 200 Damage.",
      "When another Ammo item is used, gain +1 Multicast for the fight."
    ]
  },
  {
    "id": "BAZAAR-INCENDIARY-ROUNDS",
    "family": "arcana",
    "mappingIndex": 39,
    "arcanaId": "FLAME-FUSION",
    "name": "Incendiary Rounds",
    "sourceCardId": "1841wy5x377mwfk1pomzc8wgv",
    "sourceUrl": "https://bazaardb.gg/card/1841wy5x377mwfk1pomzc8wgv/Incendiary-Rounds",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Silver",
    "size": "Small",
    "tags": [
      "Burn"
    ],
    "cooldownSeconds": null,
    "pendingCooldownSeconds": 5,
    "output": {
      "damage": null,
      "burn": 2,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "When you use an adjacent item, Burn 2"
    ],
    "rules": [
      "When an adjacent item is used, Burn the opponent for 2."
    ]
  },
  {
    "id": "BAZAAR-POWDER-KEG",
    "family": "arcana",
    "mappingIndex": 40,
    "arcanaId": "IGNITION-DRIVE",
    "name": "Powder Keg",
    "sourceCardId": "g9qk9n6x4f6l9mthnhp486gt6y",
    "sourceUrl": "https://bazaardb.gg/card/g9qk9n6x4f6l9mthnhp486gt6y/Powder-Keg",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Gold",
    "size": "Medium",
    "tags": [
      "Weapon",
      "Damage",
      "HealthReference",
      "BurnReference"
    ],
    "cooldownSeconds": 24,
    "pendingCooldownSeconds": 24,
    "output": {
      "damage": null,
      "burn": null,
      "poison": null,
      "healthDamagePercent": 40,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal Damage equal to 40% of an enemy's Max Health and destroy this",
      "When you Burn, Charge this 2 seconds"
    ],
    "rules": [
      "On use, deal Damage equal to 40% of an enemy's Max Health and destroy this.",
      "When you Burn, Charge this for 2 seconds."
    ]
  },
  {
    "id": "BAZAAR-VOLCANIC-VENTS",
    "family": "arcana",
    "mappingIndex": 41,
    "arcanaId": "ENGULFING-FISSURE",
    "name": "Volcanic Vents",
    "sourceCardId": "124y339kxsdtjqg4w1yn27qvtq0",
    "sourceUrl": "https://bazaardb.gg/card/124y339kxsdtjqg4w1yn27qvtq0/Volcanic-Vents",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Medium",
    "tags": [
      "Aquatic",
      "Burn"
    ],
    "cooldownSeconds": 7,
    "pendingCooldownSeconds": 7,
    "output": {
      "damage": null,
      "burn": 3,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 3
    },
    "printedOutput": [
      "Burn 3"
    ],
    "rules": [
      "On use, Burn the opponent for 3."
    ]
  },
  {
    "id": "BAZAAR-CALICO",
    "family": "arcana",
    "mappingIndex": 42,
    "arcanaId": "RAPID-FIRE-AGENT",
    "name": "Calico",
    "sourceCardId": "72v87csj8dxz24cgd8ts6tq5tj",
    "sourceUrl": "https://bazaardb.gg/card/72v87csj8dxz24cgd8ts6tq5tj/Calico",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Small",
    "tags": [
      "Friend",
      "Weapon",
      "Damage",
      "CritReference"
    ],
    "cooldownSeconds": 6,
    "pendingCooldownSeconds": 6,
    "output": {
      "damage": 20,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 20 Damage",
      "When you use another Weapon, this gains +5% Crit Chance"
    ],
    "rules": [
      "On use, deal 20 Damage.",
      "When another Weapon is used, gain +5% Crit Chance for the fight."
    ]
  },
  {
    "id": "BAZAAR-LIGHTHOUSE",
    "family": "arcana",
    "mappingIndex": 43,
    "arcanaId": "WARD-OF-FLAMES",
    "name": "Lighthouse",
    "sourceCardId": "8gqm8bgh9cvb6dlphbgdxy9pqb",
    "sourceUrl": "https://bazaardb.gg/card/8gqm8bgh9cvb6dlphbgdxy9pqb/Lighthouse",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Gold",
    "size": "Large",
    "tags": [
      "Property",
      "Aquatic",
      "Burn",
      "Slow",
      "SlowReference"
    ],
    "cooldownSeconds": 4,
    "pendingCooldownSeconds": 4,
    "output": {
      "damage": null,
      "burn": 8,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Slow 1 item for 2 seconds",
      "When you Slow, Burn 8"
    ],
    "rules": [
      "On use, Slow 1 opposing item for 2 seconds.",
      "When you Slow, Burn the opponent for 8."
    ]
  },
  {
    "id": "BAZAAR-BLUNDERBUSS",
    "family": "arcana",
    "mappingIndex": 44,
    "arcanaId": "DRAGON-BLAST",
    "name": "Blunderbuss",
    "sourceCardId": "cph553mliyril8a3g2xg4y3de",
    "sourceUrl": "https://bazaardb.gg/card/cph553mliyril8a3g2xg4y3de/Blunderbuss",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Gold",
    "size": "Medium",
    "tags": [
      "Weapon",
      "Damage",
      "Ammo",
      "BurnReference"
    ],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "damage": 15,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": 2,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 15 Damage",
      "When you Burn, use this"
    ],
    "rules": [
      "On use, deal 15 Damage.",
      "When you Burn, use this."
    ]
  },
  {
    "id": "BAZAAR-PIRANHA",
    "family": "arcana",
    "mappingIndex": 45,
    "arcanaId": "WHIRLING-TORNADO",
    "name": "Piranha",
    "sourceCardId": "npfmz76myy1gh4hxm4w1h8g3wl",
    "sourceUrl": "https://bazaardb.gg/card/npfmz76myy1gh4hxm4w1h8g3wl/Piranha",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Small",
    "tags": [
      "Aquatic",
      "Weapon",
      "Friend",
      "Damage"
    ],
    "cooldownSeconds": 8,
    "pendingCooldownSeconds": 8,
    "output": {
      "damage": 15,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 15 Damage",
      "When you use another Friend or Food, Charge this 1 second"
    ],
    "rules": [
      "On use, deal 15 Damage.",
      "When another Friend or Food is used, Charge this for 1 second."
    ]
  },
  {
    "id": "BAZAAR-MARLON",
    "family": "arcana",
    "mappingIndex": 46,
    "arcanaId": "MENTIS-IMPERIUM",
    "name": "Marlon",
    "sourceCardId": "9yz7l8hy06xyvz7t9v54dcz7q2",
    "sourceUrl": "https://global.bazaardb.gg/card/9yz7l8hy06xyvz7t9v54dcz7q2/Marlon",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Medium",
    "tags": [
      "Aquatic",
      "Friend",
      "Weapon",
      "Crit",
      "Flying",
      "FlyingReference",
      "Damage"
    ],
    "cooldownSeconds": 3,
    "pendingCooldownSeconds": 3,
    "output": {
      "damage": 15,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "An item starts Flying",
      "Deal 15 Damage",
      "When you use a Flying item, this gains +20% Crit Chance"
    ],
    "rules": [
      "On use, an item starts Flying and deal 15 Damage.",
      "When a Flying item is used, gain +20% Crit Chance for the fight."
    ]
  },
  {
    "id": "BAZAAR-ANCHOR",
    "family": "arcana",
    "mappingIndex": 47,
    "arcanaId": "HEROIC-LEAP",
    "name": "Anchor",
    "sourceCardId": "54kfsq8n7m4qvqxlp1y9bd5939",
    "sourceUrl": "https://bazaardb.gg/card/54kfsq8n7m4qvqxlp1y9bd5939/Anchor",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Gold",
    "size": "Medium",
    "tags": [
      "Aquatic",
      "Weapon",
      "Tool",
      "Damage",
      "HealthReference",
      "Haste"
    ],
    "cooldownSeconds": 12,
    "pendingCooldownSeconds": 12,
    "output": {
      "damage": null,
      "burn": null,
      "poison": null,
      "healthDamagePercent": 20,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal Damage equal to 20% of an enemy's Max Health",
      "When you use an adjacent item, this is Hasted for 2 seconds"
    ],
    "rules": [
      "On use, deal Damage equal to 20% of an enemy's Max Health.",
      "When an adjacent item is used, Haste this for 2 seconds."
    ]
  },
  {
    "id": "BAZAAR-CUTLASS",
    "family": "arcana",
    "mappingIndex": 48,
    "arcanaId": "SHEARING-CHAIN",
    "name": "Cutlass",
    "sourceCardId": "49tjxq7jsf0fl0zzxd22qw0yjk",
    "sourceUrl": "https://bazaardb.gg/card/49tjxq7jsf0fl0zzxd22qw0yjk/Cutlass",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Medium",
    "tags": [
      "Weapon",
      "Damage",
      "CritReference"
    ],
    "cooldownSeconds": 4,
    "pendingCooldownSeconds": 4,
    "output": {
      "damage": 10,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 2
    },
    "printedOutput": [
      "Deal 10 Damage",
      "This has double Crit Damage"
    ],
    "rules": [
      "On use, deal 10 Damage.",
      "This has double Crit Damage."
    ]
  },
  {
    "id": "BAZAAR-FLAGSHIP",
    "family": "arcana",
    "mappingIndex": 49,
    "arcanaId": "STORM-DRAFT",
    "name": "Flagship",
    "sourceCardId": "p29lb7zh58cjqxx312j9jhc34k",
    "sourceUrl": "https://bazaardb.gg/card/p29lb7zh58cjqxx312j9jhc34k/Flagship",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Silver",
    "size": "Large",
    "tags": [
      "Aquatic",
      "Vehicle",
      "Weapon",
      "Damage",
      "AmmoReference"
    ],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "damage": 35,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": {
        "base": 1,
        "per_matching_item": 1,
        "matching_types": [
          "Tool",
          "Property",
          "Friend",
          "Ammo",
          "Relic"
        ]
      }
    },
    "printedOutput": [
      "Deal 35 Damage",
      "If you have another Tool, Property, Friend, Ammo or Relic item this has +1 Multicast for each"
    ],
    "rules": [
      "On use, deal 35 Damage.",
      "Gain +1 Multicast for each other Tool, Property, Friend, Ammo, or Relic item you have."
    ]
  },
  {
    "id": "BAZAAR-JAVELIN",
    "family": "arcana",
    "mappingIndex": 50,
    "arcanaId": "CYCLONE-BOOMERANG",
    "name": "Javelin",
    "sourceCardId": "6mykdnnhbmzvz10x99yk7vmnvx",
    "sourceUrl": "https://bazaardb.gg/card/6mykdnnhbmzvz10x99yk7vmnvx/Javelin",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.2",
    "startingTier": "Silver",
    "size": "Medium",
    "tags": [
      "Weapon",
      "Damage",
      "Ammo",
      "Haste"
    ],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "damage": 50,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": 2,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 50 Damage",
      "Haste your other items 1 second"
    ],
    "rules": [
      "On use, deal 50 Damage.",
      "On use, Haste your other items for 1 second."
    ]
  },
  {
    "id": "BAZAAR-FLYING-FISH",
    "family": "arcana",
    "mappingIndex": 51,
    "arcanaId": "BLURRING-FALCONRY",
    "name": "Flying Fish",
    "sourceCardId": "d0wycctkdb6z5cnz1gw3xylt9t",
    "sourceUrl": "https://bazaardb.gg/card/d0wycctkdb6z5cnz1gw3xylt9t/Flying-Fish",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Small",
    "tags": [
      "Aquatic",
      "Friend",
      "Weapon",
      "Haste",
      "Flying",
      "FlyingReference",
      "Damage"
    ],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "damage": 10,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 10 Damage",
      "This and an adjacent item start Flying",
      "When you use a Flying item, Haste this 1 second"
    ],
    "rules": [
      "On use, deal 10 Damage.",
      "This and an adjacent item start Flying.",
      "When you use a Flying item, Haste this for 1 second."
    ]
  },
  {
    "id": "BAZAAR-SHARKRAY",
    "family": "arcana",
    "mappingIndex": 52,
    "arcanaId": "WHIRLING-WIND-AGENT",
    "name": "Sharkray",
    "sourceCardId": "696wc6bvs45myf7jw929173hhv",
    "sourceUrl": "https://bazaardb.gg/card/696wc6bvs45myf7jw929173hhv/Sharkray",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Silver",
    "size": "Medium",
    "tags": [
      "Aquatic",
      "Weapon",
      "Friend",
      "Ray",
      "Damage",
      "DamageReference",
      "HasteReference",
      "PoisonReference"
    ],
    "cooldownSeconds": 6,
    "pendingCooldownSeconds": 6,
    "output": {
      "damage": 20,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 20 Damage",
      "When you Haste a Friend, your Friends gain +5 Damage and +1 Poison"
    ],
    "rules": [
      "On use, deal 20 Damage.",
      "When you Haste a Friend, board Weapons gain +5 Damage and board Friend items tagged Poison gain +1 Poison for the fight."
    ]
  },
  {
    "id": "BAZAAR-LANGXIAN",
    "family": "arcana",
    "mappingIndex": 53,
    "arcanaId": "EARTHEN-AEGIS",
    "name": "Langxian",
    "sourceCardId": "f0t6yg4xnhssvjktvnqjb1p458",
    "sourceUrl": "https://bazaardb.gg/card/f0t6yg4xnhssvjktvnqjb1p458/Langxian",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Medium",
    "tags": [
      "Weapon",
      "Relic",
      "Damage",
      "DamageReference"
    ],
    "cooldownSeconds": 10,
    "pendingCooldownSeconds": 10,
    "output": {
      "damage": 40,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 40 Damage",
      "This has +40 Damage for each fight you won with this"
    ],
    "rules": [
      "On use, deal 40 Damage.",
      "For each fight won with this, permanently gain +40 Damage."
    ]
  },
  {
    "id": "BAZAAR-TREBUCHET",
    "family": "arcana",
    "mappingIndex": 54,
    "arcanaId": "TERRA-RING",
    "name": "Trebuchet",
    "sourceCardId": "l4yk4yz5c98njhl98s510qmq94",
    "sourceUrl": "https://bazaardb.gg/card/l4yk4yz5c98njhl98s510qmq94/Trebuchet",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.2",
    "startingTier": "Silver",
    "size": "Large",
    "tags": [
      "Weapon",
      "Burn",
      "Damage",
      "HasteReference"
    ],
    "cooldownSeconds": 10,
    "pendingCooldownSeconds": 10,
    "output": {
      "damage": 75,
      "burn": 8,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 75 Damage",
      "Burn 8",
      "When you use another Weapon or Haste, Charge this 2 seconds"
    ],
    "rules": [
      "On use, deal 75 Damage and Burn the opponent for 8.",
      "When you use another Weapon or apply Haste, Charge this for 2 seconds."
    ]
  },
  {
    "id": "BAZAAR-CATFISH",
    "family": "arcana",
    "mappingIndex": 55,
    "arcanaId": "GRASPING-EARTH",
    "name": "Catfish",
    "sourceCardId": "y347s1jtn8n7vl0m40229st1vy",
    "sourceUrl": "https://bazaardb.gg/card/y347s1jtn8n7vl0m40229st1vy/Catfish",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Small",
    "tags": [
      "Aquatic",
      "Friend",
      "Poison",
      "HasteReference"
    ],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "damage": null,
      "burn": null,
      "poison": 3,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Poison 3",
      "When you Haste this, it gains +3 Poison"
    ],
    "rules": [
      "On use, Poison the opponent for 3.",
      "When this is Hasted, gain +3 Poison for the fight."
    ]
  },
  {
    "id": "BAZAAR-TORPEDO",
    "family": "arcana",
    "mappingIndex": 56,
    "arcanaId": "TECTONIC-DRILL",
    "name": "Torpedo",
    "sourceCardId": "8ytxdag9nopwo8n1wqcuovf0l",
    "sourceUrl": "https://bazaardb.gg/card/8ytxdag9nopwo8n1wqcuovf0l/Torpedo",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.1",
    "startingTier": "Silver",
    "size": "Medium",
    "tags": [
      "Aquatic",
      "Weapon",
      "Tech",
      "Damage",
      "DamageReference",
      "Ammo"
    ],
    "cooldownSeconds": 8,
    "pendingCooldownSeconds": 8,
    "output": {
      "damage": 100,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": 1,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 100 Damage",
      "When you use another Aquatic or Ammo item, this gains +40",
      "If the item is Large, double the Damage gain"
    ],
    "rules": [
      "On use, deal 100 Damage.",
      "When another Aquatic or Ammo item is used, gain +40 Damage.",
      "If the triggering item is Large, double the Damage gain."
    ]
  },
  {
    "id": "BAZAAR-HANDAXE",
    "family": "arcana",
    "mappingIndex": 57,
    "arcanaId": "ROCK-SOLID-TOMAHAWK",
    "name": "Handaxe",
    "sourceCardId": "xm32d2v1gd5xdqy0vmkdm7hl15",
    "sourceUrl": "https://bazaardb.gg/card/xm32d2v1gd5xdqy0vmkdm7hl15/Handaxe",
    "sourceKind": "bazaar_db",
    "sourcePatch": "16.2",
    "startingTier": "Bronze",
    "size": "Small",
    "tags": [
      "Weapon",
      "Damage"
    ],
    "cooldownSeconds": 6,
    "pendingCooldownSeconds": 6,
    "output": {
      "damage": 20,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 20 Damage",
      "Your items have +5 Damage"
    ],
    "rules": [
      "On use, deal 20 Damage.",
      "Your board Weapons gain +5 Damage."
    ]
  },
  {
    "id": "BAZAAR-THE-BOULDER",
    "family": "arcana",
    "mappingIndex": 58,
    "arcanaId": "KNOCKOUT-BOULDER",
    "name": "The Boulder",
    "sourceCardId": "ygnxt7ngs7ssqtx0j7nvmtsygt",
    "sourceUrl": "https://bazaardb.gg/card/ygnxt7ngs7ssqtx0j7nvmtsygt/The-Boulder",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.2",
    "startingTier": "Gold",
    "size": "Large",
    "tags": [
      "Weapon",
      "Relic",
      "Trap",
      "Damage",
      "HealthReference",
      "Ammo"
    ],
    "cooldownSeconds": 22,
    "pendingCooldownSeconds": 22,
    "output": {
      "damage": null,
      "burn": null,
      "poison": null,
      "healthDamagePercent": 100,
      "ammo": 1,
      "multicast": 1
    },
    "printedOutput": [
      "Deal Damage equal to an enemy's Max Health"
    ],
    "rules": [
      "On use, deal Damage equal to an enemy's Max Health."
    ]
  },
  {
    "id": "BAZAAR-BOLAS",
    "family": "arcana",
    "mappingIndex": 59,
    "arcanaId": "TOXIC-BOLAS",
    "name": "Bolas",
    "sourceCardId": "yytskm9bdxg5hk0pjw0v4c1bbg",
    "sourceUrl": "https://bazaardb.gg/card/yytskm9bdxg5hk0pjw0v4c1bbg/Bolas",
    "sourceKind": "bazaar_db",
    "sourcePatch": "16.2",
    "startingTier": "Bronze",
    "size": "Small",
    "tags": [
      "Weapon",
      "Damage",
      "Ammo",
      "Slow"
    ],
    "cooldownSeconds": 4,
    "pendingCooldownSeconds": 4,
    "output": {
      "damage": 20,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": 2,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 20 Damage",
      "Slow an item for 2 seconds"
    ],
    "rules": [
      "On use, deal 20 Damage.",
      "On use, Slow 1 opposing item for 2 seconds."
    ]
  },
  {
    "id": "BAZAAR-SHARKCLAWS",
    "family": "arcana",
    "mappingIndex": 60,
    "arcanaId": "ROCK-N-ROLL",
    "name": "Sharkclaws",
    "sourceCardId": "e2wzdaj1q0m9kvow7bnib1182",
    "sourceUrl": "https://bazaardb.gg/card/e2wzdaj1q0m9kvow7bnib1182/Sharkclaws",
    "sourceKind": "bazaar_db",
    "sourcePatch": "16.2",
    "startingTier": "Bronze",
    "size": "Medium",
    "tags": [
      "Aquatic",
      "Weapon",
      "Damage"
    ],
    "cooldownSeconds": 6,
    "pendingCooldownSeconds": 6,
    "output": {
      "damage": 10,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 10 Damage",
      "Your items gain +10 Damage"
    ],
    "rules": [
      "On use, deal 10 Damage.",
      "Your board Weapons gain +10 Damage for the fight."
    ]
  },
  {
    "id": "BAZAAR-OLD-SALTCLAW",
    "family": "arcana",
    "mappingIndex": 61,
    "arcanaId": "EARTH-STOMP-AGENT",
    "name": "Old Saltclaw",
    "sourceCardId": "c8fczk5fw247hncjxwh2x6dskw",
    "sourceUrl": "https://bazaardb.gg/card/c8fczk5fw247hncjxwh2x6dskw/Old-Saltclaw",
    "sourceKind": "bazaar_db",
    "sourcePatch": "16.0",
    "startingTier": "Silver",
    "size": "Small",
    "tags": [
      "Aquatic",
      "Friend",
      "Weapon",
      "Damage",
      "HasteReference",
      "SlowReference"
    ],
    "cooldownSeconds": 6,
    "pendingCooldownSeconds": 6,
    "output": {
      "damage": 30,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 30 Damage",
      "When you Haste or Slow, this gains +5 Damage"
    ],
    "rules": [
      "On use, deal 30 Damage.",
      "When you Haste or Slow, gain +5 Damage for the fight."
    ]
  },
  {
    "id": "BAZAAR-ELECTRIC-EELS",
    "family": "arcana",
    "mappingIndex": 62,
    "arcanaId": "SHOCK-NOVA",
    "name": "Electric Eels",
    "sourceCardId": "brf5gcqb5m1ob3iwg4qmxyu6e",
    "sourceUrl": "https://bazaardb.gg/card/brf5gcqb5m1ob3iwg4qmxyu6e/Electric-Eels",
    "sourceKind": "bazaar_db",
    "sourcePatch": "16.1",
    "startingTier": "Gold",
    "size": "Large",
    "tags": [
      "Aquatic",
      "Weapon",
      "Friend",
      "Damage",
      "Slow"
    ],
    "cooldownSeconds": 7,
    "pendingCooldownSeconds": 7,
    "output": {
      "damage": 100,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 100 Damage",
      "Slow an item for 1 second",
      "When an enemy uses an item, Charge this 2 seconds"
    ],
    "rules": [
      "On use, deal 100 Damage.",
      "On use, Slow 1 opposing item for 1 second.",
      "When an enemy uses an item, Charge this for 2 seconds."
    ]
  },
  {
    "id": "BAZAAR-SHURIKEN",
    "family": "arcana",
    "mappingIndex": 63,
    "arcanaId": "STAR-BOLT",
    "name": "Shuriken",
    "sourceCardId": "97fkzmjqmgwqh675yw0k5c97tt",
    "sourceUrl": "https://bazaardb.gg/card/97fkzmjqmgwqh675yw0k5c97tt/Shuriken",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Small",
    "tags": [
      "Weapon",
      "Damage",
      "Ammo"
    ],
    "cooldownSeconds": 8,
    "pendingCooldownSeconds": 8,
    "output": {
      "damage": 5,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": 3,
      "multicast": {
        "formula": "current_ammo",
        "initial": 3
      }
    },
    "printedOutput": [
      "Deal 5 Damage",
      "This has Multicast equal to its current Ammo",
      "When you use this, spend all its Ammo"
    ],
    "rules": [
      "On use, deal 5 Damage.",
      "Multicast equals current Ammo.",
      "When used, spend all Ammo."
    ]
  },
  {
    "id": "BAZAAR-ZOARCID",
    "family": "arcana",
    "mappingIndex": 64,
    "arcanaId": "BALL-LIGHTNING",
    "name": "Zoarcid",
    "sourceCardId": "7s8w2k5b2yjlt8lswlxhsgj7w5",
    "sourceUrl": "https://bazaardb.gg/card/7s8w2k5b2yjlt8lswlxhsgj7w5/Zoarcid",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Bronze",
    "size": "Small",
    "tags": [
      "Aquatic",
      "Weapon",
      "Friend",
      "Damage",
      "Haste",
      "BurnReference"
    ],
    "cooldownSeconds": 8,
    "pendingCooldownSeconds": 8,
    "output": {
      "damage": 20,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 20 Damage",
      "Haste adjacent items for 2 seconds",
      "When you Burn, Charge this 1 second"
    ],
    "rules": [
      "On use, deal 20 Damage.",
      "On use, Haste adjacent items for 2 seconds.",
      "When you Burn, Charge this for 1 second."
    ]
  },
  {
    "id": "BAZAAR-PUFFERFISH",
    "family": "arcana",
    "mappingIndex": 65,
    "arcanaId": "AQUA-VORTEX",
    "name": "Pufferfish",
    "sourceCardId": "qtl4ks17152btzk52ch0gkq5qm",
    "sourceUrl": "https://bazaardb.gg/card/qtl4ks17152btzk52ch0gkq5qm/Pufferfish",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Silver",
    "size": "Medium",
    "tags": [
      "Aquatic",
      "Friend",
      "Poison",
      "HasteReference"
    ],
    "cooldownSeconds": 8,
    "pendingCooldownSeconds": 8,
    "output": {
      "damage": null,
      "burn": null,
      "poison": 10,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Poison 10",
      "When you Haste, Charge this 2 seconds"
    ],
    "rules": [
      "On use, Poison the opponent for 10.",
      "When you Haste this, Charge this for 2 seconds."
    ]
  },
  {
    "id": "BAZAAR-JELLYFISH",
    "family": "arcana",
    "mappingIndex": 66,
    "arcanaId": "WATER-PRISON",
    "name": "Jellyfish",
    "sourceCardId": "ybxlx3c6l4xnqp53cvw5zvjqwg",
    "sourceUrl": "https://bazaardb.gg/card/ybxlx3c6l4xnqp53cvw5zvjqwg/Jellyfish",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.2",
    "startingTier": "Bronze",
    "size": "Small",
    "tags": [
      "Aquatic",
      "Friend",
      "Poison",
      "Haste"
    ],
    "cooldownSeconds": 7,
    "pendingCooldownSeconds": 7,
    "output": {
      "damage": null,
      "burn": null,
      "poison": 3,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Poison 3",
      "When you use an adjacent Aquatic item, Haste this 1 second"
    ],
    "rules": [
      "On use, Poison the opponent for 3.",
      "When an adjacent Aquatic item is used, Haste this for 1 second."
    ]
  },
  {
    "id": "BAZAAR-SUBMARINE",
    "family": "arcana",
    "mappingIndex": 67,
    "arcanaId": "AQUA-BREAKER",
    "name": "Submarine",
    "sourceCardId": "h88whzq6f9fv30202mxwqpskt5",
    "sourceUrl": "https://bazaardb.gg/card/h88whzq6f9fv30202mxwqpskt5/Submarine",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.0",
    "startingTier": "Silver",
    "size": "Large",
    "tags": [
      "Aquatic",
      "Weapon",
      "Vehicle",
      "Tech",
      "Damage",
      "Shield"
    ],
    "cooldownSeconds": 4,
    "pendingCooldownSeconds": 4,
    "output": {
      "damage": 60,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 60 Damage",
      "Shield equal to this item's Damage",
      "If this is your only Weapon, it is affected by Freeze and Slow for half as long"
    ],
    "rules": [
      "On use, deal 60 Damage.",
      "On use, Shield equal to this item's Damage.",
      "If this is your only Weapon, it is affected by Freeze and Slow for half as long."
    ]
  },
  {
    "id": "BAZAAR-GRAPESHOT",
    "family": "arcana",
    "mappingIndex": 68,
    "arcanaId": "BUBBLE-BARRAGE",
    "name": "Grapeshot",
    "sourceCardId": "dnjgr5vxeaxl82s6g0jb7ew9u",
    "sourceUrl": "https://bazaardb.gg/card/dnjgr5vxeaxl82s6g0jb7ew9u/Grapeshot",
    "sourceKind": "bazaar_db",
    "sourcePatch": "16.2",
    "startingTier": "Bronze",
    "size": "Small",
    "tags": [
      "Weapon",
      "Damage",
      "Ammo"
    ],
    "cooldownSeconds": 4,
    "pendingCooldownSeconds": 4,
    "output": {
      "damage": 30,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": 1,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 30 Damage",
      "When you use another Ammo item, Reload 1 Ammo"
    ],
    "rules": [
      "On use, deal 30 Damage.",
      "When another Ammo item is used, Reload 1 Ammo."
    ]
  },
  {
    "id": "BAZAAR-SNIPER-RIFLE",
    "family": "arcana",
    "mappingIndex": 69,
    "arcanaId": "AQUA-BEAM",
    "name": "Sniper Rifle",
    "sourceCardId": "19lm48lq39dgq0q75kjd5hs8hdc",
    "sourceUrl": "https://bazaardb.gg/card/19lm48lq39dgq0q75kjd5hs8hdc/Sniper-Rifle",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.3",
    "startingTier": "Gold",
    "size": "Medium",
    "tags": [
      "Weapon",
      "Damage"
    ],
    "cooldownSeconds": 8,
    "pendingCooldownSeconds": 8,
    "output": {
      "damage": 100,
      "burn": null,
      "poison": null,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": 1
    },
    "printedOutput": [
      "Deal 100 Damage",
      "This has 5x Damage if it is your only Weapon"
    ],
    "rules": [
      "On use, deal 100 Damage.",
      "If this is your only Weapon, it deals 5x Damage."
    ]
  },
  {
    "id": "BAZAAR-WEATHER-GLASS",
    "family": "arcana",
    "mappingIndex": 70,
    "arcanaId": "ARCANE-INTERVENTION",
    "name": "Weather Glass",
    "sourceCardId": "12vvmj50x00gfybff30xjy9w9lw",
    "sourceUrl": "https://bazaardb.gg/card/12vvmj50x00gfybff30xjy9w9lw/Weather-Glass",
    "sourceKind": "bazaar_db",
    "sourcePatch": "17.1",
    "startingTier": "Silver",
    "size": "Medium",
    "tags": [
      "Tool",
      "Burn",
      "Poison",
      "SlowReference",
      "FreezeReference"
    ],
    "cooldownSeconds": 7,
    "pendingCooldownSeconds": 7,
    "output": {
      "damage": null,
      "burn": 4,
      "poison": 4,
      "healthDamagePercent": null,
      "ammo": null,
      "multicast": {
        "base": 1,
        "per_matching_item": 1,
        "matching_tags": [
          "Burn",
          "Poison",
          "Slow",
          "Freeze"
        ]
      }
    },
    "printedOutput": [
      "Burn 4",
      "Poison 4",
      "If you have another item with Burn, Poison, Slow, or Freeze, this has +1 Multicast for each"
    ],
    "rules": [
      "On use, Burn the opponent for 4 and Poison the opponent for 4.",
      "Gain +1 Multicast for each other item tagged Burn, Poison, Slow, or Freeze."
    ]
  }
];

const TACTIC_ITEMS = [
  {
    "id": "BAZAAR-TACTIC-AMBERGRIS",
    "family": "tactic",
    "tacticId": "AMBERGRIS",
    "name": "Ambergris",
    "sourceUrl": "https://bazaardb.gg/card/3yq4u47y8o05rvrayhqozi3wb/Ambergris",
    "sourcePatch": "16.2 (Jul 17, 2026)",
    "sourceNotes": "No later item-history change was shown in the current 17.3 listings.",
    "startingTier": "Bronze",
    "size": "Small",
    "typeTags": [
      "Aquatic",
      "Relic"
    ],
    "mechanicTags": [
      "EconomyReference",
      "Value",
      "Heal"
    ],
    "tags": [
      "Aquatic",
      "Relic",
      "EconomyReference",
      "Value",
      "Heal"
    ],
    "cooldownSeconds": 4,
    "pendingCooldownSeconds": 4,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Heal equal to 1× this item's Value."
      },
      {
        "kind": "passive",
        "trigger": "when_you_buy_another_aquatic_item",
        "effect": "Gain +1 Value permanently."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-ASTROLABE",
    "family": "tactic",
    "tacticId": "ASTROLABE",
    "name": "Astrolabe",
    "sourceUrl": "https://bazaardb.gg/card/nqnymypyxy5llhs5tn5zwpb25v/Astrolabe",
    "sourcePatch": "17.1 (Aug 6, 2026)",
    "sourceNotes": "The current item history has no later Astrolabe change after the displayed 5-second cooldown.",
    "startingTier": "Silver",
    "size": "Medium",
    "typeTags": [
      "Tool"
    ],
    "mechanicTags": [
      "Haste"
    ],
    "tags": [
      "Tool",
      "Haste"
    ],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Haste 2 items for 1 second."
      },
      {
        "kind": "passive",
        "trigger": "when_you_use_another_non_weapon_item",
        "effect": "Charge this 1 second."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-BARREL",
    "family": "tactic",
    "tacticId": "BARREL",
    "name": "Barrel",
    "sourceUrl": "https://bazaardb.gg/card/8f4t435wh40lfy5gtc3ny2dmbp/Barrel",
    "sourcePatch": "17.3 (Aug 20, 2026)",
    "sourceNotes": "BazaarDB's 17.3 value supersedes the stale secondary index value of 6 seconds / Shield 20.",
    "startingTier": "Bronze",
    "size": "Medium",
    "typeTags": [],
    "mechanicTags": [
      "Shield"
    ],
    "tags": [
      "Shield"
    ],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Shield 30."
      },
      {
        "kind": "passive",
        "trigger": "when_any_adjacent_item_is_used",
        "effect": "Gain +15 Shield for the fight."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-BEACH-BALL",
    "family": "tactic",
    "tacticId": "BEACH-BALL",
    "name": "Beach Ball",
    "sourceUrl": "https://bazaardb.gg/card/7in711iu65y81f5xu5rteyaxe/Beach-Ball",
    "sourcePatch": "17.1 (Hotfix Aug 7, 2026)",
    "sourceNotes": "The 17.3 patch tracker shows no later Beach Ball value change; current cooldown is 4 seconds.",
    "startingTier": "Bronze",
    "size": "Medium",
    "typeTags": [
      "Aquatic",
      "Toy"
    ],
    "mechanicTags": [
      "Haste"
    ],
    "tags": [
      "Aquatic",
      "Toy",
      "Haste"
    ],
    "cooldownSeconds": 4,
    "pendingCooldownSeconds": 4,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Haste 2 Aquatic or Toy items for 2 seconds."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-CANNONBALL",
    "family": "tactic",
    "tacticId": "CANNONBALL",
    "name": "Cannonball",
    "sourceUrl": "https://bazaardb.gg/card/fc1y26n2vlf7p25ykxyzq2l341/Cannonball",
    "sourcePatch": "17.3 (Aug 20, 2026)",
    "sourceNotes": "Patch 17.3 changed this from the older adjacent-item wording; it now applies to your items.",
    "startingTier": "Silver",
    "size": "Small",
    "typeTags": [],
    "mechanicTags": [
      "AmmoReference"
    ],
    "tags": [
      "AmmoReference"
    ],
    "cooldownSeconds": null,
    "pendingCooldownSeconds": 5,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "aura",
        "trigger": "while_on_board",
        "effect": "Your items have +1 Max Ammo."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-CAPTAINS-QUARTERS",
    "family": "tactic",
    "tacticId": "CAPTAINS-QUARTERS",
    "name": "Captain's Quarters",
    "sourceUrl": "https://bazaardb.gg/card/8425ht00fb4p1r919mmwsa0tn/Captain%27s-Quarters",
    "sourcePatch": "17.2 (Aug 13, 2026)",
    "sourceNotes": "17.2 changed the support rule from Weapons-only wording to the current your-items reload / damage-reference implementation.",
    "startingTier": "Silver",
    "size": "Large",
    "typeTags": [
      "Aquatic",
      "Property"
    ],
    "mechanicTags": [
      "Haste",
      "DamageReference",
      "AmmoReference"
    ],
    "tags": [
      "Aquatic",
      "Property",
      "Haste",
      "DamageReference",
      "AmmoReference"
    ],
    "cooldownSeconds": 4,
    "pendingCooldownSeconds": 4,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Haste your Tools and Vehicles for 1 second."
      },
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Reload your items 1 Ammo."
      },
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Your Weapons gain +20 Damage for the fight."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-CAPTAINS-WHEEL",
    "family": "tactic",
    "tacticId": "CAPTAINS-WHEEL",
    "name": "Captain's Wheel",
    "sourceUrl": "https://global.bazaardb.gg/card/jcj5923pvmhdh7yqbsl4hn84gb/Captain%27s-Wheel",
    "sourcePatch": "17.1 (Hotfix Aug 7, 2026)",
    "sourceNotes": "The current 17.3 item pool retains the 5-second cooldown and 2.5-second conditional reduction.",
    "startingTier": "Silver",
    "size": "Medium",
    "typeTags": [
      "Aquatic",
      "Tool"
    ],
    "mechanicTags": [
      "Haste"
    ],
    "tags": [
      "Aquatic",
      "Tool",
      "Haste"
    ],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Haste up to 2 adjacent items for 1 second."
      },
      {
        "kind": "aura",
        "trigger": "while_you_have_a_vehicle_or_large_item",
        "effect": "Reduce this item's Cooldown by 2.5 seconds."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-CARD-TABLE",
    "family": "tactic",
    "tacticId": "CARD-TABLE",
    "name": "Card Table",
    "sourceUrl": "https://bazaardb.gg/card/tbqmqy73gxxhx4nw9y64kstg3g/Card-Table",
    "sourcePatch": "17.3 (Aug 20, 2026)",
    "sourceNotes": "Starts at Gold; 17.3 displays 5 seconds, reducing to 4 at Diamond.",
    "startingTier": "Gold",
    "size": "Medium",
    "typeTags": [],
    "mechanicTags": [],
    "tags": [],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "A Friend gains +1 Multicast for the fight."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-CHUM",
    "family": "tactic",
    "tacticId": "CHUM",
    "name": "Chum",
    "sourceUrl": "https://bazaardb.gg/card/117tcpcdgkzk4fqfqh36z43dppv/Chum",
    "sourcePatch": "17.1 (Hotfix Aug 7, 2026)",
    "sourceNotes": "No later Chum balance value change is shown after the displayed 3% / 6% / 9% / 12% progression.",
    "startingTier": "Bronze",
    "size": "Small",
    "typeTags": [
      "Aquatic",
      "Food"
    ],
    "mechanicTags": [
      "Crit"
    ],
    "tags": [
      "Aquatic",
      "Food",
      "Crit"
    ],
    "cooldownSeconds": 4,
    "pendingCooldownSeconds": 4,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Your Aquatic and Food items gain +3% Crit Chance for the fight."
      },
      {
        "kind": "passive",
        "trigger": "when_you_buy_this",
        "effect": "Get a Piranha."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-CLAMERA",
    "family": "tactic",
    "tacticId": "CLAMERA",
    "name": "Clamera",
    "sourceUrl": "https://bazaardb.gg/card/c2p4mt8y2jgk9vqw5jll53l9wm/Clamera",
    "sourcePatch": "16.2 (Jul 17, 2026)",
    "sourceNotes": "The displayed history has no later Clamera change; starting Silver values are 7 seconds, 1 target, 2-second Slow.",
    "startingTier": "Silver",
    "size": "Small",
    "typeTags": [
      "Aquatic"
    ],
    "mechanicTags": [
      "Slow"
    ],
    "tags": [
      "Aquatic",
      "Slow"
    ],
    "cooldownSeconds": 7,
    "pendingCooldownSeconds": 7,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Slow 1 enemy item for 2 seconds."
      },
      {
        "kind": "passive",
        "trigger": "first_2_enemy_item_uses_each_fight",
        "effect": "Use this."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-CORAL",
    "family": "tactic",
    "tacticId": "CORAL",
    "name": "Coral",
    "sourceUrl": "https://bazaardb.gg/card/zqxjt2s8896s8nnqls2h06th8c/Coral",
    "sourcePatch": "17.2 (Aug 13, 2026)",
    "sourceNotes": "Current 17.3 listings retain the 5-second cooldown and 20 Heal base form.",
    "startingTier": "Bronze",
    "size": "Small",
    "typeTags": [
      "Aquatic",
      "Relic"
    ],
    "mechanicTags": [
      "Heal"
    ],
    "tags": [
      "Aquatic",
      "Relic",
      "Heal"
    ],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Heal 20."
      },
      {
        "kind": "passive",
        "trigger": "when_you_buy_an_aquatic_item",
        "effect": "Gain +5 Heal permanently."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-CORAL-ARMOR",
    "family": "tactic",
    "tacticId": "CORAL-ARMOR",
    "name": "Coral Armor",
    "sourceUrl": "https://bazaardb.gg/card/3th8hsilrfklhavugeg050h5k/Coral-Armor",
    "sourcePatch": "17.2 (Aug 13, 2026)",
    "sourceNotes": "Starting Bronze values are 6 seconds, Shield 50, and +10 Shield per other Aquatic purchase.",
    "startingTier": "Bronze",
    "size": "Medium",
    "typeTags": [
      "Aquatic",
      "Apparel",
      "Relic"
    ],
    "mechanicTags": [
      "Shield"
    ],
    "tags": [
      "Aquatic",
      "Apparel",
      "Relic",
      "Shield"
    ],
    "cooldownSeconds": 6,
    "pendingCooldownSeconds": 6,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Shield 50."
      },
      {
        "kind": "passive",
        "trigger": "when_you_buy_another_aquatic_item",
        "effect": "Gain +10 Shield permanently."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-COVE",
    "family": "tactic",
    "tacticId": "COVE",
    "name": "Cove",
    "sourceUrl": "https://bazaardb.gg/card/n8840cj0bdwghtbl7h2zmgyzwf/Cove",
    "sourcePatch": "17.1 (Hotfix Aug 7, 2026)",
    "sourceNotes": "17.3 pool listings retain the 3-second starting cooldown.",
    "startingTier": "Bronze",
    "size": "Large",
    "typeTags": [
      "Aquatic",
      "Property"
    ],
    "mechanicTags": [
      "Shield",
      "Value",
      "EconomyReference"
    ],
    "tags": [
      "Aquatic",
      "Property",
      "Shield",
      "Value",
      "EconomyReference"
    ],
    "cooldownSeconds": 3,
    "pendingCooldownSeconds": 3,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Shield equal to 1× this item's Value."
      },
      {
        "kind": "passive",
        "trigger": "when_you_sell_an_item",
        "effect": "Gain +1 Value permanently."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-CROWS-NEST",
    "family": "tactic",
    "tacticId": "CROWS-NEST",
    "name": "Crow's Nest",
    "sourceUrl": "https://bazaardb.gg/card/4e4eo5afof8afl38nlhjtjw5z/Crow%27s-Nest",
    "sourcePatch": "17.0 (Aug 5, 2026)",
    "sourceNotes": "No later Crow's Nest history change is shown in the current listings.",
    "startingTier": "Silver",
    "size": "Large",
    "typeTags": [
      "Property",
      "Aquatic"
    ],
    "mechanicTags": [
      "Crit"
    ],
    "tags": [
      "Property",
      "Aquatic",
      "Crit"
    ],
    "cooldownSeconds": null,
    "pendingCooldownSeconds": 5,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "aura",
        "trigger": "while_on_board",
        "effect": "Your Weapons have +40% Crit Chance."
      },
      {
        "kind": "conditional_passive",
        "trigger": "while_you_have_only_one_weapon",
        "effect": "That Weapon has Lifesteal and is affected by Slow for half as long."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-DAM",
    "family": "tactic",
    "tacticId": "DAM",
    "name": "Dam",
    "sourceUrl": "https://bazaardb.gg/card/hfhplqbp7ykb1lvlw6254ll50b/Dam",
    "sourcePatch": "16.2 (Jul 17, 2026)",
    "sourceNotes": "Gold is the starting tier; the displayed 1→2 Charge progression therefore starts at 1 second.",
    "startingTier": "Gold",
    "size": "Large",
    "typeTags": [
      "Aquatic",
      "Property"
    ],
    "mechanicTags": [],
    "tags": [
      "Aquatic",
      "Property"
    ],
    "cooldownSeconds": 25,
    "pendingCooldownSeconds": 25,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Destroy this and all Smaller items for the fight."
      },
      {
        "kind": "passive",
        "trigger": "when_you_use_another_aquatic_item",
        "effect": "Charge this 1 second."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-DIVE-WEIGHTS",
    "family": "tactic",
    "tacticId": "DIVE-WEIGHTS",
    "name": "Dive Weights",
    "sourceUrl": "https://bazaardb.gg/card/12cdlp288b935dj9njzg224nqd3/Dive-Weights",
    "sourcePatch": "17.2 (Aug 13, 2026)",
    "sourceNotes": "The current starting Silver form has Ammo 4, Multicast equal to Ammo, and 1-second Haste.",
    "startingTier": "Silver",
    "size": "Small",
    "typeTags": [
      "Aquatic",
      "Tool",
      "Apparel"
    ],
    "mechanicTags": [
      "Haste",
      "Ammo"
    ],
    "tags": [
      "Aquatic",
      "Tool",
      "Apparel",
      "Haste",
      "Ammo"
    ],
    "cooldownSeconds": 8,
    "pendingCooldownSeconds": 8,
    "output": {
      "ammo": 4,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Haste 1 item for 1 second."
      },
      {
        "kind": "passive",
        "trigger": "for_each_adjacent_aquatic_item",
        "effect": "Reduce this item's Cooldown by 1 second."
      },
      {
        "kind": "aura",
        "trigger": "while_on_board",
        "effect": "Gain +Multicast equal to this item's Ammo (+4 at the starting tier)."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-DIVING-HELMET",
    "family": "tactic",
    "tacticId": "DIVING-HELMET",
    "name": "Diving Helmet",
    "sourceUrl": "https://bazaardb.gg/card/19fb4133c27l2zd47zgjlnnvpph/Diving-Helmet",
    "sourcePatch": "17.3 (Aug 20, 2026)",
    "sourceNotes": "Gold is the starting tier, so the Shield value is 50 rather than the Diamond 100 value.",
    "startingTier": "Gold",
    "size": "Medium",
    "typeTags": [
      "Aquatic",
      "Tool",
      "Apparel"
    ],
    "mechanicTags": [
      "Shield"
    ],
    "tags": [
      "Aquatic",
      "Tool",
      "Apparel",
      "Shield"
    ],
    "cooldownSeconds": null,
    "pendingCooldownSeconds": 5,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "triggered_action",
        "trigger": "when_any_aquatic_item_is_used",
        "effect": "Shield 50."
      },
      {
        "kind": "aura",
        "trigger": "while_on_board",
        "effect": "Adjacent items are Aquatic in combat."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-DOCK-LINES",
    "family": "tactic",
    "tacticId": "DOCK-LINES",
    "name": "Dock Lines",
    "sourceUrl": "https://bazaardb.gg/card/9elav9z45mx80y0w8qv6kbmdk/Dock-Lines",
    "sourcePatch": "17.0 (Aug 5, 2026)",
    "sourceNotes": "Current listings retain the 4-second cooldown and 2-target starting Silver form.",
    "startingTier": "Silver",
    "size": "Medium",
    "typeTags": [
      "Tool",
      "Aquatic"
    ],
    "mechanicTags": [
      "Slow"
    ],
    "tags": [
      "Tool",
      "Aquatic",
      "Slow"
    ],
    "cooldownSeconds": 4,
    "pendingCooldownSeconds": 4,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Slow 2 items for 3 seconds."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-FIGUREHEAD",
    "family": "tactic",
    "tacticId": "FIGUREHEAD",
    "name": "Figurehead",
    "sourceUrl": "https://bazaardb.gg/card/8tzt93kxo03bl50z5cubthjv8/Figurehead",
    "sourcePatch": "17.0 (Aug 5, 2026)",
    "sourceNotes": "The current tooltip says items to the right; the Damage stat is identified by the DamageReference tag.",
    "startingTier": "Silver",
    "size": "Medium",
    "typeTags": [
      "Aquatic",
      "Relic"
    ],
    "mechanicTags": [
      "DamageReference",
      "Cooldown"
    ],
    "tags": [
      "Aquatic",
      "Relic",
      "DamageReference",
      "Cooldown"
    ],
    "cooldownSeconds": null,
    "pendingCooldownSeconds": 5,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "aura",
        "trigger": "while_on_board",
        "effect": "The Cooldowns of Aquatic items to the left are reduced by 10%."
      },
      {
        "kind": "aura",
        "trigger": "while_on_board",
        "effect": "Items to the right gain +25 Damage."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-FISHING-NET",
    "family": "tactic",
    "tacticId": "FISHING-NET",
    "name": "Fishing Net",
    "sourceUrl": "https://bazaardb.gg/card/hn4n4qhc9t3hklm0zysh76jn90/Fishing-Net",
    "sourcePatch": "17.3 (Aug 20, 2026)",
    "sourceNotes": "Starting Bronze form uses one Slow target and the current economy-generation rule.",
    "startingTier": "Bronze",
    "size": "Medium",
    "typeTags": [
      "Aquatic",
      "Tool"
    ],
    "mechanicTags": [
      "Slow",
      "EconomyReference"
    ],
    "tags": [
      "Aquatic",
      "Tool",
      "Slow",
      "EconomyReference"
    ],
    "cooldownSeconds": 6,
    "pendingCooldownSeconds": 6,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Slow 1 item for 2 seconds."
      },
      {
        "kind": "passive",
        "trigger": "at_start_of_each_day",
        "effect": "Get a Small Aquatic or Loot item from any Hero."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-FISHING-ROD",
    "family": "tactic",
    "tacticId": "FISHING-ROD",
    "name": "Fishing Rod",
    "sourceUrl": "https://bazaardb.gg/card/b2s1b6c5djpjeojurowx2in5i/Fishing-Rod",
    "sourcePatch": "17.2 (Aug 13, 2026)",
    "sourceNotes": "No later item-history change is shown after the 17.0 wording correction.",
    "startingTier": "Bronze",
    "size": "Medium",
    "typeTags": [
      "Aquatic",
      "Tool"
    ],
    "mechanicTags": [
      "Haste"
    ],
    "tags": [
      "Aquatic",
      "Tool",
      "Haste"
    ],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Haste the Aquatic item to the right for 2 seconds."
      },
      {
        "kind": "passive",
        "trigger": "at_start_of_each_day",
        "effect": "Get a Small Aquatic item."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-HOLSTERS",
    "family": "tactic",
    "tacticId": "HOLSTERS",
    "name": "Holsters",
    "sourceUrl": "https://bazaardb.gg/card/6ntpnj0fv39jpt3zlw8z0x6cwm/Holsters",
    "sourcePatch": "17.3 (Aug 20, 2026)",
    "sourceNotes": "Current 17.3 page includes the Tool type, which older secondary lists omitted.",
    "startingTier": "Diamond",
    "size": "Small",
    "typeTags": [
      "Apparel",
      "Tool"
    ],
    "mechanicTags": [
      "Haste"
    ],
    "tags": [
      "Apparel",
      "Tool",
      "Haste"
    ],
    "cooldownSeconds": null,
    "pendingCooldownSeconds": 5,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "triggered_action",
        "trigger": "at_start_of_each_fight",
        "effect": "Haste your Small items for 2 seconds."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-ICEBERG",
    "family": "tactic",
    "tacticId": "ICEBERG",
    "name": "Iceberg",
    "sourceUrl": "https://bazaardb.gg/card/l1yg7cpnjqz7cbnn99tq9mwjwf/Iceberg",
    "sourcePatch": "17.3 (Aug 20, 2026)",
    "sourceNotes": "Diamond is the starting tier and the current form has no cooldown.",
    "startingTier": "Diamond",
    "size": "Large",
    "typeTags": [
      "Aquatic",
      "Property"
    ],
    "mechanicTags": [
      "Freeze"
    ],
    "tags": [
      "Aquatic",
      "Property",
      "Freeze"
    ],
    "cooldownSeconds": null,
    "pendingCooldownSeconds": 5,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "triggered_action",
        "trigger": "when_an_enemy_uses_an_item",
        "effect": "Freeze it for 1 second."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-ILLUSORAY",
    "family": "tactic",
    "tacticId": "ILLUSORAY",
    "name": "IllusoRay",
    "sourceUrl": "https://bazaardb.gg/card/168xkq965ytnl3500lcd9p4bsps/IllusoRay",
    "sourcePatch": "17.3 (Aug 20, 2026)",
    "sourceNotes": "Starting Bronze form uses 1-second Slow; adjacent Friends/Rays supply dynamic Multicast.",
    "startingTier": "Bronze",
    "size": "Small",
    "typeTags": [
      "Aquatic",
      "Friend",
      "Ray"
    ],
    "mechanicTags": [
      "Slow"
    ],
    "tags": [
      "Aquatic",
      "Friend",
      "Ray",
      "Slow"
    ],
    "cooldownSeconds": 6,
    "pendingCooldownSeconds": 6,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Slow 1 item for 1 second."
      },
      {
        "kind": "aura",
        "trigger": "for_each_adjacent_friend_or_ray",
        "effect": "Gain +1 Multicast."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-INTEGRATED-HUD",
    "family": "tactic",
    "tacticId": "INTEGRATED-HUD",
    "name": "Integrated HUD",
    "sourceUrl": "https://bazaardb.gg/card/c6cy0mpnfjzhbgzkw1v08f5jk8/Integrated-HUD",
    "sourcePatch": "16.2 (Jul 17, 2026)",
    "sourceNotes": "No later Integrated HUD item-history change is shown in the current 17.3 database listings.",
    "startingTier": "Silver",
    "size": "Small",
    "typeTags": [
      "Apparel",
      "Tech"
    ],
    "mechanicTags": [
      "Crit",
      "Slow"
    ],
    "tags": [
      "Apparel",
      "Tech",
      "Crit",
      "Slow"
    ],
    "cooldownSeconds": null,
    "pendingCooldownSeconds": 5,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "aura",
        "trigger": "while_on_board",
        "effect": "The item to the right gains +20% Crit Chance if it can Crit."
      },
      {
        "kind": "triggered_action",
        "trigger": "when_the_item_to_the_right_crits",
        "effect": "Slow 1 enemy item for 1 second."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-KORXENA-CREST",
    "family": "tactic",
    "tacticId": "KORXENA-CREST",
    "name": "Korxena Crest",
    "sourceUrl": "https://bazaardb.gg/card/42a3a1x1vlgfowqs4ch0goy8z/Korxena-Crest",
    "sourcePatch": "16.1 (Hotfix Jul 8, 2026)",
    "sourceNotes": "The current 17.3 item pool retains the 15% / 25% / 35% progression; no later item change is shown.",
    "startingTier": "Silver",
    "size": "Small",
    "typeTags": [
      "Apparel",
      "Relic"
    ],
    "mechanicTags": [
      "Crit"
    ],
    "tags": [
      "Apparel",
      "Relic",
      "Crit"
    ],
    "cooldownSeconds": null,
    "pendingCooldownSeconds": 5,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "aura",
        "trigger": "while_on_board",
        "effect": "Your items gain +15% Crit Chance if they can Crit."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-LIFE-PRESERVER",
    "family": "tactic",
    "tacticId": "LIFE-PRESERVER",
    "name": "Life Preserver",
    "sourceUrl": "https://bazaardb.gg/card/42lj1pbn9nby2smxylaqm6iyk/Life-Preserver",
    "sourcePatch": "16.2 (Jul 17, 2026)",
    "sourceNotes": "Starting Bronze form is 7 seconds, Shield 10, and first-defeat Heal 200.",
    "startingTier": "Bronze",
    "size": "Medium",
    "typeTags": [
      "Aquatic"
    ],
    "mechanicTags": [
      "Shield",
      "Heal"
    ],
    "tags": [
      "Aquatic",
      "Shield",
      "Heal"
    ],
    "cooldownSeconds": 7,
    "pendingCooldownSeconds": 7,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Shield 10."
      },
      {
        "kind": "triggered_action",
        "trigger": "the_first_time_you_would_be_defeated_each_fight",
        "effect": "Heal 200."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-LOCKBOX",
    "family": "tactic",
    "tacticId": "LOCKBOX",
    "name": "Lockbox",
    "sourceUrl": "https://bazaardb.gg/card/x98jn3cwn1bs3d26fc1zld4g06/Lockbox",
    "sourcePatch": "17.3 (Aug 20, 2026)",
    "sourceNotes": "The current page confirms Silver start; the Value-based DamageReference remains base-form support, not direct damage from Lockbox itself.",
    "startingTier": "Silver",
    "size": "Medium",
    "typeTags": [
      "Relic"
    ],
    "mechanicTags": [
      "EconomyReference",
      "Value",
      "DamageReference"
    ],
    "tags": [
      "Relic",
      "EconomyReference",
      "Value",
      "DamageReference"
    ],
    "cooldownSeconds": null,
    "pendingCooldownSeconds": 5,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "passive",
        "trigger": "when_you_win_a_fight",
        "effect": "Gain +3 Value permanently."
      },
      {
        "kind": "aura",
        "trigger": "while_on_board",
        "effect": "Your items gain Damage equal to this item's Value."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-NESTING-DOLL",
    "family": "tactic",
    "tacticId": "NESTING-DOLL",
    "name": "Nesting Doll",
    "sourceUrl": "https://bazaardb.gg/card/113kp5b01qpk3h12bmjyfcdnn1f/Nesting-Doll",
    "sourcePatch": "17.3 (Aug 20, 2026)",
    "sourceNotes": "Starting Silver form is Ammo 8 and the 10×Ammo branch of the Shield rule.",
    "startingTier": "Silver",
    "size": "Small",
    "typeTags": [
      "Toy"
    ],
    "mechanicTags": [
      "Shield",
      "Ammo"
    ],
    "tags": [
      "Toy",
      "Shield",
      "Ammo"
    ],
    "cooldownSeconds": 2,
    "pendingCooldownSeconds": 2,
    "output": {
      "ammo": 8,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Shield equal to 10× this item's Ammo."
      },
      {
        "kind": "passive",
        "trigger": "at_start_of_each_day",
        "effect": "Gain +1 Max Ammo permanently."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-PEARL",
    "family": "tactic",
    "tacticId": "PEARL",
    "name": "Pearl",
    "sourceUrl": "https://bazaardb.gg/card/2zs0qmhclpv2j1789yd7ph6p6j/Pearl",
    "sourcePatch": "17.3 (Aug 20, 2026)",
    "sourceNotes": "The 17.3 page confirms the 5-second cooldown and Bronze Shield 10.",
    "startingTier": "Bronze",
    "size": "Small",
    "typeTags": [
      "Aquatic"
    ],
    "mechanicTags": [
      "Shield"
    ],
    "tags": [
      "Aquatic",
      "Shield"
    ],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Shield 10."
      },
      {
        "kind": "passive",
        "trigger": "when_you_use_another_aquatic_item",
        "effect": "Charge this 1 second."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-PORT",
    "family": "tactic",
    "tacticId": "PORT",
    "name": "Port",
    "sourceUrl": "https://bazaardb.gg/card/3pghk5dcjx67p4027tcyq0c8pv/Port",
    "sourcePatch": "17.3 (Aug 20, 2026)",
    "sourceNotes": "Starting Silver uses 2 Ammo reload and 1-second Charge; higher tiers are 3/4 and 2/3 seconds.",
    "startingTier": "Silver",
    "size": "Large",
    "typeTags": [
      "Property",
      "Aquatic"
    ],
    "mechanicTags": [
      "AmmoReference",
      "Charge"
    ],
    "tags": [
      "Property",
      "Aquatic",
      "AmmoReference",
      "Charge"
    ],
    "cooldownSeconds": 6,
    "pendingCooldownSeconds": 6,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Reload all your items 2 Ammo and Charge them 1 second."
      },
      {
        "kind": "passive",
        "trigger": "at_start_of_each_day",
        "effect": "Get a Small Ammo item from any hero."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-ROWBOAT",
    "family": "tactic",
    "tacticId": "ROWBOAT",
    "name": "Rowboat",
    "sourceUrl": "https://bazaardb.gg/card/3yx3sdulcm9rtcrdzrbhnrs47/Rowboat",
    "sourcePatch": "17.1 (Hotfix Aug 7, 2026)",
    "sourceNotes": "Gold is the starting tier; current 17.3 listings retain 5 seconds with the 7-unique-types reduction.",
    "startingTier": "Gold",
    "size": "Medium",
    "typeTags": [
      "Aquatic",
      "Vehicle"
    ],
    "mechanicTags": [
      "Charge",
      "CooldownReference"
    ],
    "tags": [
      "Aquatic",
      "Vehicle",
      "Charge",
      "CooldownReference"
    ],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Charge adjacent items 2 seconds."
      },
      {
        "kind": "passive",
        "trigger": "while_you_have_at_least_7_unique_types",
        "effect": "Reduce this item's Cooldown by 5 seconds."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-SEADOGS-SALOON",
    "family": "tactic",
    "tacticId": "SEADOGS-SALOON",
    "name": "Seadog's Saloon",
    "sourceUrl": "https://bazaardb.gg/card/7dyt0xdq4ztvjb68mioiu1urf/Seadog%27s-Saloon",
    "sourcePatch": "17.1 (Aug 6, 2026)",
    "sourceNotes": "Starting Silver cooldown is 6 seconds; the current progression is 6/5/4.",
    "startingTier": "Silver",
    "size": "Large",
    "typeTags": [
      "Aquatic",
      "Property"
    ],
    "mechanicTags": [
      "Haste",
      "Slow"
    ],
    "tags": [
      "Aquatic",
      "Property",
      "Haste",
      "Slow"
    ],
    "cooldownSeconds": 6,
    "pendingCooldownSeconds": 6,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Haste an item for 2 seconds."
      },
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Slow an item for 2 seconds."
      },
      {
        "kind": "aura",
        "trigger": "for_each_friend_you_have",
        "effect": "Gain +1 Multicast."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-SEASHADOW",
    "family": "tactic",
    "tacticId": "SEASHADOW",
    "name": "Seashadow",
    "sourceUrl": "https://bazaardb.gg/card/10f8dm23mqdzy4j9pnxz8b1w45/Seashadow",
    "sourcePatch": "17.1 (Aug 6, 2026)",
    "sourceNotes": "Starting Silver uses the 4-second self-increase; Gold/Diamond use 3/2 seconds.",
    "startingTier": "Silver",
    "size": "Medium",
    "typeTags": [
      "Friend",
      "Vehicle"
    ],
    "mechanicTags": [
      "Cooldown"
    ],
    "tags": [
      "Friend",
      "Vehicle",
      "Cooldown"
    ],
    "cooldownSeconds": 2,
    "pendingCooldownSeconds": 2,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Reduce the Cooldown of your other items by 8% for the fight."
      },
      {
        "kind": "self_penalty",
        "trigger": "on_use",
        "effect": "Increase this item's Cooldown by 4 seconds for the fight."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-SHIPWRECK",
    "family": "tactic",
    "tacticId": "SHIPWRECK",
    "name": "Shipwreck",
    "sourceUrl": "https://bazaardb.gg/card/16st79j809vv1j19s7zy1wqbbwq/Shipwreck",
    "sourcePatch": "17.3 (Aug 20, 2026)",
    "sourceNotes": "MulticastReference is a semantic label for the printed +1 Multicast support rule; the page's compact tag line has no separate mechanic tag.",
    "startingTier": "Diamond",
    "size": "Large",
    "typeTags": [
      "Aquatic",
      "Vehicle",
      "Property",
      "Relic"
    ],
    "mechanicTags": [
      "MulticastReference"
    ],
    "tags": [
      "Aquatic",
      "Vehicle",
      "Property",
      "Relic",
      "MulticastReference"
    ],
    "cooldownSeconds": null,
    "pendingCooldownSeconds": 5,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "aura",
        "trigger": "while_on_board",
        "effect": "Your Aquatic items have +1 Multicast."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-SHOT-GLASSES",
    "family": "tactic",
    "tacticId": "SHOT-GLASSES",
    "name": "Shot Glasses",
    "sourceUrl": "https://bazaardb.gg/card/7ewmaurzg1674a13fvurh2ljk/Shot-Glasses",
    "sourcePatch": "16.1 (Hotfix Jul 8, 2026)",
    "sourceNotes": "The current 17.3 listings retain Ammo 1/2/3 across Silver/Gold/Diamond; the starting Silver form has Ammo 1.",
    "startingTier": "Silver",
    "size": "Small",
    "typeTags": [],
    "mechanicTags": [
      "Ammo",
      "Haste",
      "Slow"
    ],
    "tags": [
      "Ammo",
      "Haste",
      "Slow"
    ],
    "cooldownSeconds": 3,
    "pendingCooldownSeconds": 3,
    "output": {
      "ammo": 1,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Haste 4 of your items for 1 second."
      },
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Slow 4 of your items for 1 second."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-STAR-CHART",
    "family": "tactic",
    "tacticId": "STAR-CHART",
    "name": "Star Chart",
    "sourceUrl": "https://bazaardb.gg/card/g72qhm78wwb9ml7lfgj1lhtj0s/Star-Chart",
    "sourcePatch": "17.3 (Aug 20, 2026)",
    "sourceNotes": "Starting Bronze values are 10% Crit and 5% Cooldown reduction.",
    "startingTier": "Bronze",
    "size": "Medium",
    "typeTags": [
      "Tool",
      "Relic"
    ],
    "mechanicTags": [
      "Cooldown",
      "Crit"
    ],
    "tags": [
      "Tool",
      "Relic",
      "Cooldown",
      "Crit"
    ],
    "cooldownSeconds": null,
    "pendingCooldownSeconds": 5,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "aura",
        "trigger": "while_on_board",
        "effect": "Adjacent items have +10% Crit Chance."
      },
      {
        "kind": "aura",
        "trigger": "while_on_board",
        "effect": "Adjacent items' Cooldowns are reduced by 5%."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-STEALTH-GLIDER",
    "family": "tactic",
    "tacticId": "STEALTH-GLIDER",
    "name": "Stealth Glider",
    "sourceUrl": "https://bazaardb.gg/card/64tx7zxyq1djm3zkty1z34gpqb/Knightshade",
    "sourcePatch": "17.3 (Aug 20, 2026)",
    "sourceNotes": "No stable standalone item page was exposed; the current patch-17.3 Knightshade merchant item-pool row gives Silver, Large, Vehicle/Tech, 4/3/2 seconds, Flying, 25% Damage reduction, and -1 second Flying cooldown. The URL identifies the merchant source, not an item card ID.",
    "startingTier": "Silver",
    "size": "Large",
    "typeTags": [
      "Vehicle",
      "Tech"
    ],
    "mechanicTags": [
      "Flying",
      "CooldownReference",
      "DamageReduction"
    ],
    "tags": [
      "Vehicle",
      "Tech",
      "Flying",
      "CooldownReference",
      "DamageReduction"
    ],
    "cooldownSeconds": 4,
    "pendingCooldownSeconds": 4,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "An item starts Flying."
      },
      {
        "kind": "passive",
        "trigger": "while_on_board",
        "effect": "You take 25% less Damage."
      },
      {
        "kind": "aura",
        "trigger": "while_on_board",
        "effect": "Your Flying items have their Cooldowns reduced by 1 second."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-SUBMERSIBLE",
    "family": "tactic",
    "tacticId": "SUBMERSIBLE",
    "name": "Submersible",
    "sourceUrl": "https://bazaardb.gg/card/c47mkck7q7n1l37vcm4xskk7m9/Submersible",
    "sourcePatch": "17.3 (Aug 20, 2026)",
    "sourceNotes": "Current page lists all four type tags; starting Silver values are +10 Damage and +10 Shield.",
    "startingTier": "Silver",
    "size": "Medium",
    "typeTags": [
      "Aquatic",
      "Tool",
      "Vehicle",
      "Tech"
    ],
    "mechanicTags": [
      "DamageReference",
      "ShieldReference"
    ],
    "tags": [
      "Aquatic",
      "Tool",
      "Vehicle",
      "Tech",
      "DamageReference",
      "ShieldReference"
    ],
    "cooldownSeconds": 5,
    "pendingCooldownSeconds": 5,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "The leftmost and rightmost Aquatic Weapons gain +10 Damage for the fight."
      },
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "The leftmost and rightmost Aquatic Shield items gain +10 Shield for the fight."
      },
      {
        "kind": "passive",
        "trigger": "while_you_have_another_vehicle_or_large_item",
        "effect": "Reduce this item's Cooldown by 2 seconds."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-TROPICAL-ISLAND",
    "family": "tactic",
    "tacticId": "TROPICAL-ISLAND",
    "name": "Tropical Island",
    "sourceUrl": "https://bazaardb.gg/card/d5df9s35x0whc7czq66xqxn3yv/Tropical-Island",
    "sourcePatch": "17.2 (Aug 13, 2026)",
    "sourceNotes": "Silver is the starting tier, so the Regen trigger is 5; the base form has no cooldown.",
    "startingTier": "Silver",
    "size": "Large",
    "typeTags": [
      "Property",
      "Aquatic"
    ],
    "mechanicTags": [
      "Regen",
      "SlowReference"
    ],
    "tags": [
      "Property",
      "Aquatic",
      "Regen",
      "SlowReference"
    ],
    "cooldownSeconds": null,
    "pendingCooldownSeconds": 5,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "triggered_action",
        "trigger": "when_any_item_or_skill_on_board_or_in_stash_applies_slow",
        "effect": "Gain 5 Regen for the fight."
      },
      {
        "kind": "passive",
        "trigger": "at_end_of_each_fight",
        "effect": "Get a Coconut and a Citrus."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-HONING-STEEL",
    "family": "tactic",
    "tacticId": "HONING-STEEL",
    "name": "Honing Steel",
    "sourceUrl": "https://bazaardb.gg/card/ajvdim21upzc9vy723alj67id/Honing-Steel",
    "sourcePatch": "16.2 (Jul 17, 2026)",
    "sourceNotes": "Kept in the non-direct group: it only buffs Weapons and does not directly damage the opponent in base form.",
    "startingTier": "Bronze",
    "size": "Small",
    "typeTags": [
      "Tool"
    ],
    "mechanicTags": [
      "DamageReference"
    ],
    "tags": [
      "Tool",
      "DamageReference"
    ],
    "cooldownSeconds": 3,
    "pendingCooldownSeconds": 3,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "The leftmost and rightmost Weapons gain +5 Damage for the fight."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-ORANGE-JULIAN",
    "family": "tactic",
    "tacticId": "ORANGE-JULIAN",
    "name": "Orange Julian",
    "sourceUrl": "https://bazaardb.gg/card/1875s7wl0y2slvkqn6js9spv7f4/Orange-Julian",
    "sourcePatch": "17.2 (Aug 13, 2026)",
    "sourceNotes": "Starts at Silver; current 17.2 cooldown is 8/7/6 seconds. Kept non-direct because it only grants DamageReference support.",
    "startingTier": "Silver",
    "size": "Medium",
    "typeTags": [
      "Friend"
    ],
    "mechanicTags": [
      "DamageReference",
      "EconomyReference"
    ],
    "tags": [
      "Friend",
      "DamageReference",
      "EconomyReference"
    ],
    "cooldownSeconds": 8,
    "pendingCooldownSeconds": 8,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "action",
        "trigger": "on_use",
        "effect": "Your items gain Damage equal to half the gold you have gained this run."
      }
    ]
  },
  {
    "id": "BAZAAR-TACTIC-SUPPRESSOR",
    "family": "tactic",
    "tacticId": "SUPPRESSOR",
    "name": "Suppressor",
    "sourceUrl": "https://bazaardb.gg/card/g0cqnc4fzgb8y9c01d030skqq/Suppressor",
    "sourcePatch": "17.2 (Aug 13, 2026)",
    "sourceNotes": "Kept non-direct; current base Silver support values are +25 Damage and 5% Cooldown reduction.",
    "startingTier": "Silver",
    "size": "Small",
    "typeTags": [
      "Tech"
    ],
    "mechanicTags": [
      "DamageReference",
      "Cooldown"
    ],
    "tags": [
      "Tech",
      "DamageReference",
      "Cooldown"
    ],
    "cooldownSeconds": null,
    "pendingCooldownSeconds": 5,
    "output": {
      "ammo": null,
      "multicast": null
    },
    "rules": [
      {
        "kind": "aura",
        "trigger": "while_on_board",
        "effect": "The item to the left gains +25 Damage if it is a Weapon."
      },
      {
        "kind": "conditional_aura",
        "trigger": "while_you_have_exactly_one_weapon",
        "effect": "That Weapon's Cooldown is reduced by 5%."
      }
    ]
  }
];

export const WARDEN_TRIAL_BAZAAR_ARCANA_ITEMS = deepFreeze(ARCANA_ITEMS);
export const WARDEN_TRIAL_BAZAAR_TACTICS = deepFreeze(TACTIC_ITEMS);
export const WARDEN_TRIAL_BAZAAR_ITEMS = Object.freeze([
  ...WARDEN_TRIAL_BAZAAR_ARCANA_ITEMS,
  ...WARDEN_TRIAL_BAZAAR_TACTICS,
]);

const byId = new Map(WARDEN_TRIAL_BAZAAR_ITEMS.map(item => [item.id, item]));
const byArcanaId = new Map(WARDEN_TRIAL_BAZAAR_ARCANA_ITEMS.map(item => [item.arcanaId, item]));
const byTacticId = new Map(WARDEN_TRIAL_BAZAAR_TACTICS.map(item => [item.tacticId, item]));

const normalizeId = value => String(value || '').trim().toUpperCase();

export function wardenTrialBazaarItemById(value) {
  return byId.get(normalizeId(value)) || null;
}

export function wardenTrialBazaarItemForArcana(value) {
  return byArcanaId.get(normalizeId(value)) || null;
}

export function wardenTrialBazaarTacticById(value) {
  return byTacticId.get(normalizeId(value)) || null;
}

export function wardenTrialBazaarPendingCooldownSeconds(value) {
  const item = typeof value === 'string'
    ? wardenTrialBazaarItemById(value)
      || wardenTrialBazaarItemForArcana(value)
      || wardenTrialBazaarTacticById(value)
    : value;
  if (!item) return WARDEN_TRIAL_BAZAAR_FALLBACK_PENDING_SECONDS;
  const source = Number(item.cooldownSeconds);
  return item.cooldownSeconds !== null && Number.isFinite(source) && source >= 0
    ? source
    : WARDEN_TRIAL_BAZAAR_FALLBACK_PENDING_SECONDS;
}
