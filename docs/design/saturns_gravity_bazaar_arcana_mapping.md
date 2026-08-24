# Saturn's Gravity ↔ The Bazaar Ability and Tactic Source Catalog

This document is the implementation source of truth for the Vanessa/The Bazaar comparison:

- 70 Saturn's Gravity Arcana matched one-to-one with 70 unique direct-damage Vanessa items
- 43 non-direct Vanessa items selected as additional Tactics
- 7 unmatched direct-damage items retained as excluded references
- Starting-tier cooldowns, output, limits, tags, behaviors, and source links pinned for implementation
- Offensive-stat baselines retained as reversible transform references

> **Scope note:** "Direct damage" means the base Vanessa item itself deals **Damage**, **Burn**, or **Poison**. Items that only increase another item's Damage/Burn/Poison are treated as non-direct. Damage that exists only through enchantments is also excluded.

## Source snapshot

- **Database snapshot:** [BazaarDB patch 17.3](https://bazaardb.gg/) (Aug 20, 2026).
- **Retrieved:** Aug 24, 2026.
- **Values used:** the unenchanted item's starting tier. When a card page's own patch is older than 17.3, that page patch is recorded as the item's most recent card-specific snapshot; the database snapshot remains 17.3.
- **Tier boundary:** this is a complete starting-tier/base-behavior catalog for the selected 113 items, not a per-upgrade-tier, enchantment, or historical-tooltip matrix.
- **Damage accounting:** printed Damage, Burn, Poison, percentage-health damage, Ammo, Multicast, and Crit stay separate. Damage is never pre-multiplied by Ammo, Multicast, or Crit.
- **Translation boundary:** this file records Bazaar source mechanics. It does not silently invent a Saturn equivalent for board position, shops, day progression, value, or other systems that do not exist yet.
- **Active count:** 70 mapped Arcana + 43 non-direct Tactics = 113 active entries.
- **Reference-only count:** 7 unmatched direct items remain excluded, so the full documented comparison universe is 120 items.

## Agreed pending-cooldown model

This is the implementation starting point for the stack above PR #137:

1. Warden Trial keeps PR #137's **single authoritative current card** with one Up face and one Down face. This work does not introduce a three-card hand.
2. Each time a card becomes current, it receives a fresh mutable pending instance with its own `remainingCooldown`.
3. That instance starts from its printed Bazaar cooldown. If the source prints no cooldown, it uses the explicit **5-second Saturn pending fallback**, chosen from the documented starting-tier median below.
4. Only the current card's timer advances. Upcoming cards remain ordered previews and do not run hidden timers; a preview gets a fresh timer when it becomes current.
5. At zero, the current instance becomes **Ready** and stays Ready until played.
6. The player may resolve the Ready card Up or Down. Either direction consumes that same instance, then its replacement becomes current with a fresh timer. Playing creates no universal post-play lock.

Bazaar-style timer effects act on the mutable pending instance, not the catalog value:

- **[Haste](https://thebazaar.wiki.gg/wiki/Haste):** temporarily doubles that card's cooldown-drain rate. Additional Haste extends/queues duration; it does not permanently rewrite the source cooldown.
- **[Charge](https://thebazaar.wiki.gg/wiki/Charge):** immediately subtracts the stated seconds from remaining cooldown, clamped at zero.
- **[Slow](https://thebazaar.wiki.gg/wiki/Slow):** temporarily doubles the effective cooldown, modeled as half-speed cooldown drain.
- **[Freeze](https://thebazaar.wiki.gg/wiki/Freeze):** pauses cooldown drain for the stated duration.
- Effects on a Ready card do not make it “more ready.” Rejected gestures do not consume the card or mutate its timer.

Sixteen active source items are passive or purely reactive and therefore print no Bazaar cooldown: 3 direct and 13 non-direct. Their raw source cooldown remains **—**, never zero; their initial Saturn translation is the explicit **5-second pending fallback**. A later tuning pass may replace that fallback per item while keeping the raw source field unchanged.

PR #137 supplies a single directional post-play cooldown. The runtime follow-up replaces it with one mutable pending instance attached to the single current card; the immutable catalog values remain the source of truth.

---

## 1. Arcana ↔ Vanessa Damage-Item Mapping

All numbers below are the unenchanted **starting-tier** values. A source cooldown of **—** means the Bazaar item is passive or reactive; the active Saturn card still receives the labeled 5-second pending fallback.

| # | Saturn Arcana | Bazaar item / source | Starting profile | Timing / limits | Starting-tier output and base behavior | Match |
|---:|---|---|---|---|---|---|
| 1 | Flame Strike | [Cauterizing Blade](https://bazaardb.gg/card/h99hpfsphyklf4wyjv9nkwhb8x/Cauterizing-Blade)<br>card snapshot · patch 17.2 | Silver · Medium<br>Weapon, Tech, Damage, Burn | 5 sec | On use, deal 20 Damage.<br>On use, Burn the opponent for 6.<br>Quest: apply Slow 10 times OR Haste 10 times; the completed quest grants +10 Damage and +3 Burn for the fight. | Close fiery strike |
| 2 | Flame Cross | [Butterfly Swords](https://bazaardb.gg/card/tvbb60wvfm5dwdql4jd552724f/Butterfly-Swords)<br>card snapshot · patch 17.3 | Silver · Small<br>Weapon, Damage | 6 sec<br>Multicast 2 | On use, deal 10 Damage. | Paired / multicast slashes |
| 3 | Bouncing Blaze | [Pop Snappers](https://bazaardb.gg/card/33zl8gh869n0xcyk79dw6vdflj/Pop-Snappers)<br>card snapshot · patch 17.3 | Bronze · Small<br>Toy, Burn, Ammo | 3 sec<br>Ammo 4 | On use, Burn the opponent for 4. | Repeated small explosives |
| 4 | Wind Slash | [Katana](https://bazaardb.gg/card/f9xmx2hzf0xkldvltxlyv8gfh6/Katana)<br>card snapshot · patch 17.3 | Bronze · Medium<br>Weapon, Damage | 2 sec | On use, deal 15 Damage. | Clean sweeping melee |
| 5 | Air Spinner | [Pistol Sword](https://bazaardb.gg/card/5zy2xjisr37k3ml2uj3ar8qjf/Pistol-Sword)<br>card snapshot · patch 17.3 | Gold · Medium<br>Weapon, Damage, Ammo | 5 sec<br>Ammo 3 | On use, deal 15 Damage.<br>When you use an Ammo item, deal 15 Damage. | Hybrid close attack |
| 6 | Perforating Jet | [Dart Launcher](https://bazaardb.gg/card/1334tn1pt2zwtyqym58bsf42h5d/Dart-Launcher)<br>card snapshot · patch 17.3 | Silver · Small<br>Tech, Slow, Poison, PoisonReference | 4 sec<br>Ammo 3 | On use, Slow 1 opposing item for 1 second.<br>On use, Poison the opponent for 3. | Many narrow projectiles |
| 7 | Earth Knuckles | [Mantis Shrimp](https://bazaardb.gg/card/13ds9gmttl0h0vqdzmyt0t30x4n/Mantis-Shrimp)<br>card snapshot · patch 17.3 | Bronze · Small<br>Aquatic, Weapon, Friend, Damage, Burn, SlowReference, Ammo | 9 sec<br>Ammo 2 | On use, deal 20 Damage and Burn 2.<br>When you Slow, this gains +10 Damage and +2 Burn for the fight. | Heavy punching weapon |
| 8 | Bladed Vine | [Switchblade](https://bazaardb.gg/card/13mjkvbjx93w54gq9bm3753gbgk/Switchblade)<br>card snapshot · patch 17.3 | Bronze · Small<br>Weapon, Damage | 4 sec | On use, deal 4 Damage.<br>When an adjacent Weapon is used, that Weapon gains +4 Damage for the fight. | Rapid attached blade string |
| 9 | Stone Shot | [Pet Rock](https://bazaardb.gg/card/1nk97x8vj0p59000n2j72kgsth/Pet-Rock)<br>card snapshot · patch 17.3 | Bronze · Small<br>Weapon, Friend, Toy, Damage, Crit | 6 sec | On use, deal 10 Damage.<br>If this is your only Friend, your items have +10% Crit Chance. | Rock projectile |
| 10 | Spark Contact | [Cyber-Sai](https://bazaardb.gg/card/8x4my442h0tv2zhtlj3tvjbp7l/Cyber-Sai)<br>card snapshot · patch 17.3 | Silver · Medium<br>Weapon, Tech, Damage, CritReference | 3 sec | On use, deal 10 Damage.<br>When an item on your board Crits, your board Weapons gain +10 Damage for the fight. | Fast Tech melee |
| 11 | Bolt Rail | [Rifle](https://bazaardb.gg/card/4n7b5szh36wgklvjq8k07c2fvc/Rifle)<br>card snapshot · patch 17.3 | Bronze · Medium<br>Weapon, Damage, Ammo | 2 sec<br>Ammo 1 | On use, deal 10 Damage.<br>On use, this gains +10 Damage for the fight. | Straight repeated shots |
| 12 | Volt Disc | [Revolver](https://bazaardb.gg/card/s1ctwpplcwmdypdmqfsvclz0xp/Revolver)<br>card snapshot · patch 17.3 | Bronze · Small<br>Weapon, Damage, Ammo | 3 sec<br>Ammo 6 | On use, deal 8 Damage. | Repeated discrete shots |
| 13 | Ice Dagger | [Ice Pick](https://bazaardb.gg/card/wdjp7q7gyhv1lsmzskhygpbbmz/Ice-Pick)<br>card snapshot · patch 16.2 | Silver · Small<br>Weapon, Tool, Damage, Freeze | 4 sec | On use, deal 25 Damage.<br>On use, Freeze 1 opposing item for 1 second.<br>When you Freeze, this gains +15 Damage for the fight. | Direct thematic fit |
| 14 | Rip Tide | [Scimitar of the Deep](https://bazaardb.gg/card/5szlp8k6d461vn0sqr32e4jqt/Scimitar-of-the-Deep)<br>card snapshot · patch 17.3 | Silver · Medium<br>Weapon, Relic, Aquatic, Damage, DamageReference, Poison, PoisonReference, Crit, CritReference, HasteReference | 5 sec | On use, deal 30 Damage.<br>When any board item Crits, Poison the opponent for 25% of this item's Damage.<br>When this is Hasted, board Poison items gain +3 Poison for the fight. | Aquatic cutting waves |
| 15 | Aqua Arc | [Double Barrel](https://bazaardb.gg/card/3l7g4kiy6iv8007avjo2jzgzf/Double-Barrel)<br>card snapshot · patch 17.3 | Bronze · Medium<br>Weapon, Damage, Ammo | 4 sec<br>Ammo 2<br>Multicast 2 | On use, deal 20 Damage. | 1/1/2-style double finisher |
| 16 | Chaos Crusher | [Slumbering Primordial](https://bazaardb.gg/card/tcljffx9206yfpg7vlt51ckcyc/Slumbering-Primordial)<br>card snapshot · patch 17.3 | Gold · Large<br>Friend, Aquatic, Weapon, Relic, PoisonReference, FreezeReference, BurnReference, Damage, DamageReference | 25 sec<br>Multicast 4 | On use, deal 15 Damage.<br>When Poison, Freeze, or Burn occurs, Charge this for 2 seconds and gain +15 Damage for the fight. | Large exotic multi-part attack |
| 17 | Searing Rush | [Bladed Hoverboard](https://bazaardb.gg/card/n4z59z0q0y048z9svtd4y6zm2k/Bladed-Hoverboard)<br>card snapshot · patch 17.3 | Silver · Medium<br>Weapon, Tech, Aquatic, Vehicle, Damage, Flying | — source<br>5 sec Saturn pending fallback | When an adjacent item is used, deal 20 Damage and the used adjacent item starts Flying. | Movement-triggered damage |
| 18 | Flare Rush | [Jetbike](https://bazaardb.gg/card/3jyd1l07fb8qwvjxbn3yp89spm/Jetbike)<br>card snapshot · patch 17.3 | Silver · Large<br>Weapon, Vehicle, Damage, Flying, FlyingReference | 7 sec | On use, deal 200 Damage.<br>When an adjacent item is used, that item and this start Flying.<br>When another Flying item is used, Charge this for 1 second. | High-speed moving weapon |
| 19 | Ignition Rush | [Burnacuda](https://bazaardb.gg/card/qfg1929872wkv794199zd6mz44/Burnacuda)<br>card snapshot · patch 17.3 | Bronze · Small<br>Aquatic, Friend, Burn, Ammo, Haste | 3 sec<br>Ammo 1 | On use, Burn the opponent for 3.<br>On use, Haste an adjacent item for 1 second. | Mobile Burn package |
| 20 | Air Burst | [Shoe Blade](https://nrt.bazaardb.gg/card/nm6h6kl7pswvfqvx8qfnhvny35)<br>card snapshot · patch 17.3 | Bronze · Small<br>Weapon, Apparel, Damage, Crit | 6 sec | On use, deal 25 Damage.<br>On its first use each fight, this has +100% Crit Chance. | Movement/contact attack |
| 21 | Gust Burst | [Narwhal](https://bazaardb.gg/card/45jspjg8x08xzhj4hzbtm4mjx/Narwhal)<br>card snapshot · patch 17.3 | Bronze · Small<br>Aquatic, Weapon, Friend, Damage | 3 sec | On use, deal 5 Damage. | Fast forceful carrier |
| 22 | Razor Burst | [Vampire Squid](https://bazaardb.gg/card/17ztwbvh6kqm12ts51mgdst195l/Aimbot)<br>Aimbot merchant pool · database patch 17.3 | Silver · Small<br>Aquatic, Weapon, Friend, Damage, CritReference, Lifesteal | 5 sec | On use, deal 15 Damage.<br>This gains Damage equal to its Crit Chance.<br>Lifesteal 100%. | Persistent multi-contact attack |
| 23 | Spike Track | [Shovel](https://bazaardb.gg/card/mmwc4f02vwml4py9sbplfqll4z/Shovel)<br>card snapshot · patch 17.3 | Bronze · Medium<br>Weapon, Tool, Damage | 5 sec | On use, deal 25 Damage.<br>At the start of each day, get a Small item from any hero. | Ground/route attack |
| 24 | Toxic Trap | [Elemental Depth Charge](https://bazaardb.gg/card/aif62idnd6fdnmwkz6ipsbh6f/Elemental-Depth-Charge)<br>card snapshot · patch 17.3 | Silver · Medium<br>Aquatic, Tech, Trap, Burn, Poison, Freeze, Ammo | 11 sec<br>Ammo 1<br>Multicast 1 +1 per other Aquatic item | On use, Poison 4, Burn 4, and Freeze 1 opposing item for 1 second.<br>Gains +1 Multicast for each other Aquatic item you have. | Trap + status damage |
| 25 | Snare Track | [Grappling Hook](https://bazaardb.gg/card/41v9q80kmiyv3z82catg6zlox/Grappling-Hook)<br>card snapshot · patch 17.3 | Bronze · Small<br>Weapon, Tool, Damage, Slow | 6 sec | On use, deal 20 Damage.<br>On use, Slow 2 opposing items for 1 second. | Damage + restraint/control |
| 26 | Thunder Line | [Cannon](https://bazaardb.gg/card/bsoe0vzw41jhxnkor4gzy2jvd/Cannon)<br>card snapshot · patch 17.3 | Bronze · Medium<br>Weapon, Damage, Ammo, Burn | 4 sec<br>Ammo 2 | On use, deal 40 Damage.<br>On use, Burn the opponent for 10% of this item's Damage (4 at starting tier). | Delayed heavy blast |
| 27 | Circuit Line | [Cannonade](https://bazaardb.gg/card/10gwz40pnjk7clz1d63x917cfxn/Cannonade)<br>card snapshot · patch 17.3 | Gold · Large<br>Weapon, Damage, BurnReference | 12 sec<br>Multicast 3 | On use, deal 200 Damage.<br>When you use another Weapon or Burn item, Charge this for 2 seconds. | Chained / multiple damage output |
| 28 | Shock Line | [Jitte](https://bazaardb.gg/card/155f5m272x60fhz5q3fd8924s1y/Jitte)<br>card snapshot · patch 17.3 | Silver · Small<br>Weapon, Damage, Slow | 5 sec | On use, deal 20 Damage.<br>On use, Slow 1 opposing item for 1 second.<br>When you Slow, this gains +10 Damage for the fight. | Damage + control |
| 29 | Wave Front | [Tortuga](https://bazaardb.gg/card/1905vptydc5nxjpdb6jv7xvtyjs/Tortuga)<br>card snapshot · patch 17.2 | Gold · Large<br>Aquatic, Friend, Vehicle, Weapon, Damage, Haste | 12 sec | On use, deal 450 Damage.<br>On use, Haste other items for 1 second.<br>When another Friend is used, Charge this for 2 seconds. | Large Aquatic attack |
| 30 | Frost Feint | [Bilge Worm](https://bazaardb.gg/card/14hqpzjc2gzvxy5t262l5vlx3hk/Aila)<br>Aila merchant pool · database patch 17.3 | Bronze · Small<br>Weapon, Aquatic, Damage, Lifesteal | — source<br>5 sec Saturn pending fallback | When the enemy uses their leftmost item, deal 10 Damage.<br>Lifesteal 100%. | Reactive enemy-triggered damage |
| 31 | Frost Wing | [Throwing Knives](https://bazaardb.gg/card/dc1sye961jgoffun2ze0xwzmf/Throwing-Knives)<br>card snapshot · patch 17.3 | Gold · Small<br>Weapon, Damage, CritReference, Ammo | 4 sec<br>Ammo 2 | On use, deal 33 Damage.<br>When another item Crits, use this. | Multi-projectile blade volley |
| 32 | Chaotic Rift | [Oni Mask](https://bazaardb.gg/card/mdcph08lv65pq4cvpwwtnmpw3d/Oni-Mask)<br>card snapshot · patch 17.1 | Silver · Medium<br>Apparel, Tech, Burn, BurnReference, CritReference | 6 sec | On use, Burn the opponent for 6.<br>When any board item Crits, board Burn items gain +4 Burn for the fight. | Mobility / Flying-style trigger |
| 33 | Flame Breath | [Lighter](https://bazaardb.gg/card/9kp0n6thgzgv90226qfbj92c2m/Lighter)<br>card snapshot · patch 17.3 | Bronze · Small<br>Tool, Burn | 3 sec | On use, Burn the opponent for 3. | Pure Burn delivery |
| 34 | Searing Crown | [Bonfire](https://bazaardb.gg/card/zg4v5c5z42c2gptp7tvsfzq0sg/Bonfire)<br>card snapshot · patch 17.3 | Silver · Medium<br>Burn, Haste | 5 sec | On use, Burn the opponent for 5.<br>When you Burn, Haste an adjacent item for 1 second. | Persistent centered fire |
| 35 | Blazing Lariat | [Kusarigama](https://bazaardb.gg/card/c0fucfgrlkbq2ym4bwv72bh9g/Kusarigama)<br>card snapshot · patch 17.3 | Silver · Small<br>Weapon, Tech, Damage, CritReference, SlowReference | 5 sec | On use, deal 4 Damage.<br>When you Slow or Crit, this and adjacent Weapons gain +4 Damage for the fight. | Sweeping chain weapon |
| 36 | Explosive Charge | [Grenade](https://bazaardb.gg/card/7gzm05wdg3808j52q1c7cfq77p/Grenade)<br>card snapshot · patch 17.3 | Bronze · Small<br>Weapon, Damage, Ammo, Crit | 5 sec<br>Ammo 1 | On use, deal 50 Damage.<br>Base Crit Chance is 25%. | Delayed explosion |
| 37 | Homing Flares | [Repeater](https://bazaardb.gg/card/5py9snduszllzogy6pken5sbk/Repeater)<br>card snapshot · patch 17.3 | Silver · Medium<br>Weapon, Damage, Ammo | 5 sec<br>Ammo 2 | On use, deal 30 Damage.<br>When another Ammo item is used, use this. | Repeated independent shots |
| 38 | Dragon Arc | [Ballista](https://bazaardb.gg/card/1gcjtjpfqt7gdt4p3yvpxsqf5v/Ballista)<br>card snapshot · patch 17.3 | Gold · Large<br>Weapon, Damage, Ammo | 9 sec<br>Ammo 2 | On use, deal 200 Damage.<br>When another Ammo item is used, gain +1 Multicast for the fight. | Heavy / multicast projectile |
| 39 | Flame Fusion | [Incendiary Rounds](https://bazaardb.gg/card/1841wy5x377mwfk1pomzc8wgv/Incendiary-Rounds)<br>card snapshot · patch 17.3 | Silver · Small<br>Burn | — source<br>5 sec Saturn pending fallback | When an adjacent item is used, Burn the opponent for 2. | Projectile + Burn package |
| 40 | Ignition Drive | [Powder Keg](https://bazaardb.gg/card/g9qk9n6x4f6l9mthnhp486gt6y/Powder-Keg)<br>card snapshot · patch 17.3 | Gold · Medium<br>Weapon, Damage, HealthReference, BurnReference | 24 sec | On use, deal Damage equal to 40% of an enemy's Max Health and destroy this.<br>When you Burn, Charge this for 2 seconds. | Chained explosions |
| 41 | Engulfing Fissure | [Volcanic Vents](https://bazaardb.gg/card/124y339kxsdtjqg4w1yn27qvtq0/Volcanic-Vents)<br>card snapshot · patch 17.3 | Bronze · Medium<br>Aquatic, Burn | 7 sec<br>Multicast 3 | On use, Burn the opponent for 3. | Persistent ground fire |
| 42 | Rapid Fire Agent | [Calico](https://bazaardb.gg/card/72v87csj8dxz24cgd8ts6tq5tj/Calico)<br>card snapshot · patch 17.3 | Bronze · Small<br>Friend, Weapon, Damage, CritReference | 6 sec | On use, deal 20 Damage.<br>When another Weapon is used, gain +5% Crit Chance for the fight. | Offensive Friend |
| 43 | Ward of Flames | [Lighthouse](https://bazaardb.gg/card/8gqm8bgh9cvb6dlphbgdxy9pqb/Lighthouse)<br>card snapshot · patch 17.3 | Gold · Large<br>Property, Aquatic, Burn, Slow, SlowReference | 4 sec | On use, Slow 1 opposing item for 2 seconds.<br>When you Slow, Burn the opponent for 8. | Stationary damage source |
| 44 | Dragon Blast | [Blunderbuss](https://bazaardb.gg/card/cph553mliyril8a3g2xg4y3de/Blunderbuss)<br>card snapshot · patch 17.3 | Gold · Medium<br>Weapon, Damage, Ammo, BurnReference | 5 sec<br>Ammo 2 | On use, deal 15 Damage.<br>When you Burn, use this. | Close-range blast |
| 45 | Whirling Tornado | [Piranha](https://bazaardb.gg/card/npfmz76myy1gh4hxm4w1h8g3wl/Piranha)<br>card snapshot · patch 17.3 | Bronze · Small<br>Aquatic, Weapon, Friend, Damage | 8 sec | On use, deal 15 Damage.<br>When another Friend or Food is used, Charge this for 1 second. | Rapid repeating damage |
| 46 | Mentis Imperium | [Marlon](https://global.bazaardb.gg/card/9yz7l8hy06xyvz7t9v54dcz7q2/Marlon)<br>card snapshot · patch 17.3 | Bronze · Medium<br>Aquatic, Friend, Weapon, Crit, Flying, FlyingReference, Damage | 3 sec | On use, an item starts Flying and deal 15 Damage.<br>When a Flying item is used, gain +20% Crit Chance for the fight. | Friend-oriented attack |
| 47 | Heroic Leap | [Anchor](https://bazaardb.gg/card/54kfsq8n7m4qvqxlp1y9bd5939/Anchor)<br>card snapshot · patch 17.3 | Gold · Medium<br>Aquatic, Weapon, Tool, Damage, HealthReference, Haste | 12 sec | On use, deal Damage equal to 20% of an enemy's Max Health.<br>When an adjacent item is used, Haste this for 2 seconds. | Enormous heavy impact |
| 48 | Shearing Chain | [Cutlass](https://bazaardb.gg/card/49tjxq7jsf0fl0zzxd22qw0yjk/Cutlass)<br>card snapshot · patch 17.3 | Bronze · Medium<br>Weapon, Damage, CritReference | 4 sec<br>Multicast 2 | On use, deal 10 Damage.<br>This has double Crit Damage. | Advancing slash sequence |
| 49 | Storm Draft | [Flagship](https://bazaardb.gg/card/p29lb7zh58cjqxx312j9jhc34k/Flagship)<br>card snapshot · patch 17.3 | Silver · Large<br>Aquatic, Vehicle, Weapon, Damage, AmmoReference | 5 sec<br>Multicast 1 +1 per other Tool/Property/Friend/Ammo/Relic item | On use, deal 35 Damage.<br>Gain +1 Multicast for each other Tool, Property, Friend, Ammo, or Relic item you have. | Large advancing damage carrier |
| 50 | Cyclone Boomerang | [Javelin](https://bazaardb.gg/card/6mykdnnhbmzvz10x99yk7vmnvx/Javelin)<br>card snapshot · patch 17.2 | Silver · Medium<br>Weapon, Damage, Ammo, Haste | 5 sec<br>Ammo 2 | On use, deal 50 Damage.<br>On use, Haste your other items for 1 second. | Thrown traveling weapon |
| 51 | Blurring Falconry | [Flying Fish](https://bazaardb.gg/card/d0wycctkdb6z5cnz1gw3xylt9t/Flying-Fish)<br>card snapshot · patch 17.3 | Bronze · Small<br>Aquatic, Friend, Weapon, Haste, Flying, FlyingReference, Damage | 5 sec | On use, deal 10 Damage.<br>This and an adjacent item start Flying.<br>When you use a Flying item, Haste this for 1 second. | Flying Friend attacker |
| 52 | Whirling Wind Agent | [Sharkray](https://bazaardb.gg/card/696wc6bvs45myf7jw929173hhv/Sharkray)<br>card snapshot · patch 17.3 | Silver · Medium<br>Aquatic, Weapon, Friend, Ray, Damage, DamageReference, HasteReference, PoisonReference | 6 sec | On use, deal 20 Damage.<br>When you Haste a Friend, board Weapons gain +5 Damage and board Friend items tagged Poison gain +1 Poison for the fight. | Offensive Friend system |
| 53 | Earthen Aegis | [Langxian](https://bazaardb.gg/card/f0t6yg4xnhssvjktvnqjb1p458/Langxian)<br>card snapshot · patch 17.3 | Bronze · Medium<br>Weapon, Relic, Damage, DamageReference | 10 sec | On use, deal 40 Damage.<br>For each fight won with this, permanently gain +40 Damage. | Defensive/intercepting weapon |
| 54 | Terra Ring | [Trebuchet](https://bazaardb.gg/card/l4yk4yz5c98njhl98s510qmq94/Trebuchet)<br>card snapshot · patch 17.2 | Silver · Large<br>Weapon, Burn, Damage, HasteReference | 10 sec | On use, deal 75 Damage and Burn the opponent for 8.<br>When you use another Weapon or apply Haste, Charge this for 2 seconds. | Large-area earth/artillery attack |
| 55 | Grasping Earth | [Catfish](https://bazaardb.gg/card/y347s1jtn8n7vl0m40229st1vy/Catfish)<br>card snapshot · patch 17.3 | Bronze · Small<br>Aquatic, Friend, Poison, HasteReference | 5 sec | On use, Poison the opponent for 3.<br>When this is Hasted, gain +3 Poison for the fight. | Repeated/ticking damage |
| 56 | Tectonic Drill | [Torpedo](https://bazaardb.gg/card/8ytxdag9nopwo8n1wqcuovf0l/Torpedo)<br>card snapshot · patch 17.1 | Silver · Medium<br>Aquatic, Weapon, Tech, Damage, DamageReference, Ammo | 8 sec<br>Ammo 1 | On use, deal 100 Damage.<br>When another Aquatic or Ammo item is used, gain +40 Damage.<br>If the triggering item is Large, double the Damage gain. | Straight heavy carrier |
| 57 | Rock-Solid Tomahawk | [Handaxe](https://bazaardb.gg/card/xm32d2v1gd5xdqy0vmkdm7hl15/Handaxe)<br>card snapshot · patch 16.2 | Bronze · Small<br>Weapon, Damage | 6 sec | On use, deal 20 Damage.<br>Your board Weapons gain +5 Damage. | Very direct fit |
| 58 | Knockout Boulder | [The Boulder](https://bazaardb.gg/card/ygnxt7ngs7ssqtx0j7nvmtsygt/The-Boulder)<br>card snapshot · patch 17.2 | Gold · Large<br>Weapon, Relic, Trap, Damage, HealthReference, Ammo | 22 sec<br>Ammo 1 | On use, deal Damage equal to an enemy's Max Health. | Literal fit |
| 59 | Toxic Bolas | [Bolas](https://bazaardb.gg/card/yytskm9bdxg5hk0pjw0v4c1bbg/Bolas)<br>card snapshot · patch 16.2 | Bronze · Small<br>Weapon, Damage, Ammo, Slow | 4 sec<br>Ammo 2 | On use, deal 20 Damage.<br>On use, Slow 1 opposing item for 2 seconds. | Literal fit |
| 60 | Rock N’ Roll | [Sharkclaws](https://bazaardb.gg/card/e2wzdaj1q0m9kvow7bnib1182/Sharkclaws)<br>card snapshot · patch 16.2 | Bronze · Medium<br>Aquatic, Weapon, Damage | 6 sec | On use, deal 10 Damage.<br>Your board Weapons gain +10 Damage for the fight. | Repeated paired cutters |
| 61 | Earth Stomp Agent | [Old Saltclaw](https://bazaardb.gg/card/c8fczk5fw247hncjxwh2x6dskw/Old-Saltclaw)<br>card snapshot · patch 16.0 | Silver · Small<br>Aquatic, Friend, Weapon, Damage, HasteReference, SlowReference | 6 sec | On use, deal 30 Damage.<br>When you Haste or Slow, gain +5 Damage for the fight. | Offensive Friend |
| 62 | Shock Nova | [Electric Eels](https://bazaardb.gg/card/brf5gcqb5m1ob3iwg4qmxyu6e/Electric-Eels)<br>card snapshot · patch 16.1 | Gold · Large<br>Aquatic, Weapon, Friend, Damage, Slow | 7 sec | On use, deal 100 Damage.<br>On use, Slow 1 opposing item for 1 second.<br>When an enemy uses an item, Charge this for 2 seconds. | Electric reactive damage |
| 63 | Star Bolt | [Shuriken](https://bazaardb.gg/card/97fkzmjqmgwqh675yw0k5c97tt/Shuriken)<br>card snapshot · patch 17.3 | Bronze · Small<br>Weapon, Damage, Ammo | 8 sec<br>Ammo 3<br>Multicast = current Ammo (starts at 3) | On use, deal 5 Damage.<br>Multicast equals current Ammo.<br>When used, spend all Ammo. | Spinning star projectile |
| 64 | Ball Lightning | [Zoarcid](https://bazaardb.gg/card/7s8w2k5b2yjlt8lswlxhsgj7w5/Zoarcid)<br>card snapshot · patch 17.3 | Bronze · Small<br>Aquatic, Weapon, Friend, Damage, Haste, BurnReference | 8 sec | On use, deal 20 Damage.<br>On use, Haste adjacent items for 2 seconds.<br>When you Burn, Charge this for 1 second. | Charge-reactive damage |
| 65 | Aqua Vortex | [Pufferfish](https://bazaardb.gg/card/qtl4ks17152btzk52ch0gkq5qm/Pufferfish)<br>card snapshot · patch 17.3 | Silver · Medium<br>Aquatic, Friend, Poison, HasteReference | 8 sec | On use, Poison the opponent for 10.<br>When you Haste this, Charge this for 2 seconds. | Aquatic repeated/status damage |
| 66 | Water Prison | [Jellyfish](https://bazaardb.gg/card/ybxlx3c6l4xnqp53cvw5zvjqwg/Jellyfish)<br>card snapshot · patch 17.2 | Bronze · Small<br>Aquatic, Friend, Poison, Haste | 7 sec | On use, Poison the opponent for 3.<br>When an adjacent Aquatic item is used, Haste this for 1 second. | Aquatic control + ticking damage |
| 67 | Aqua Breaker | [Submarine](https://bazaardb.gg/card/h88whzq6f9fv30202mxwqpskt5/Submarine)<br>card snapshot · patch 17.0 | Silver · Large<br>Aquatic, Weapon, Vehicle, Tech, Damage, Shield | 4 sec | On use, deal 60 Damage.<br>On use, Shield equal to this item's Damage.<br>If this is your only Weapon, it is affected by Freeze and Slow for half as long. | Large forward Aquatic carrier |
| 68 | Bubble Barrage | [Grapeshot](https://bazaardb.gg/card/dnjgr5vxeaxl82s6g0jb7ew9u/Grapeshot)<br>card snapshot · patch 16.2 | Bronze · Small<br>Weapon, Damage, Ammo | 4 sec<br>Ammo 1 | On use, deal 30 Damage.<br>When another Ammo item is used, Reload 1 Ammo. | Dense multi-shot barrage |
| 69 | Aqua Beam | [Sniper Rifle](https://bazaardb.gg/card/19lm48lq39dgq0q75kjd5hs8hdc/Sniper-Rifle)<br>card snapshot · patch 17.3 | Gold · Medium<br>Weapon, Damage | 8 sec | On use, deal 100 Damage.<br>If this is your only Weapon, it deals 5x Damage. | Long-range concentrated attack |
| 70 | Arcane Intervention | [Weather Glass](https://bazaardb.gg/card/12vvmj50x00gfybff30xjy9w9lw/Weather-Glass)<br>card snapshot · patch 17.1 | Silver · Medium<br>Tool, Burn, Poison, SlowReference, FreezeReference | 7 sec<br>Multicast 1 +1 per other Burn/Poison/Slow/Freeze item | On use, Burn the opponent for 4 and Poison the opponent for 4.<br>Gain +1 Multicast for each other item tagged Burn, Poison, Slow, or Freeze. | Complex multi-system signature |

### Direct-item source-resolution notes

- **The Boulder:** its starting Gold cooldown is **22 seconds**; 18 seconds is the next-tier value.
- **Scimitar of the Deep:** its Crit trigger applies Poison equal to 25% of its Damage. At the starting 30 Damage, Bazaar rounding produces **8 Poison**.
- **Bilge Worm and Vampire Squid:** BazaarDB did not expose stable standalone item URLs during retrieval. Their current patch-17.3 rows are pinned to the Aila and Aimbot merchant item pools, respectively; those URL identifiers belong to the merchants, not to the items.
- **Reactive items:** Bladed Hoverboard, Bilge Worm, and Incendiary Rounds have no printed cooldown. Their trigger still resolves the listed output and their active Saturn card instances use the 5-second pending fallback.

---

## 2. Direct-Damage Vanessa Items Left Unmatched

These were part of the strict 77-item direct-damage pool but were not needed for the 70 one-to-one Arcana matches.

1. Arbalest
2. Bayonet
3. Blowgun
4. Concealed Dagger
5. Darkwater Anglerfish
6. Musket
7. Pesky Pete

---

## 3. The 43 Other Vanessa Items

These do **not** meet the strict direct-damage definition above. Their base form does not directly deal enemy-health Damage, Burn, or Poison; reference effects that buff other cards remain non-direct.

| # | Bazaar item / source | Starting profile | Timing / limits | Starting-tier base behavior | Classification |
|---:|---|---|---|---|---|
| 1 | [Ambergris](https://bazaardb.gg/card/3yq4u47y8o05rvrayhqozi3wb/Ambergris)<br>16.2 (Jul 17, 2026) | Bronze · Small<br>Aquatic, Relic, EconomyReference, Value, Heal | 4 sec | **On use:** Heal equal to 1× this item's Value.<br>**When you buy another aquatic item:** Gain +1 Value permanently. | Non-direct Tactic |
| 2 | [Astrolabe](https://bazaardb.gg/card/nqnymypyxy5llhs5tn5zwpb25v/Astrolabe)<br>17.1 (Aug 6, 2026) | Silver · Medium<br>Tool, Haste | 5 sec | **On use:** Haste 2 items for 1 second.<br>**When you use another non weapon item:** Charge this 1 second. | Non-direct Tactic |
| 3 | [Barrel](https://bazaardb.gg/card/8f4t435wh40lfy5gtc3ny2dmbp/Barrel)<br>17.3 (Aug 20, 2026) | Bronze · Medium<br>Shield | 5 sec | **On use:** Shield 30.<br>**When any adjacent item is used:** Gain +15 Shield for the fight. | Non-direct Tactic |
| 4 | [Beach Ball](https://bazaardb.gg/card/7in711iu65y81f5xu5rteyaxe/Beach-Ball)<br>17.1 (Hotfix Aug 7, 2026) | Bronze · Medium<br>Aquatic, Toy, Haste | 4 sec | **On use:** Haste 2 Aquatic or Toy items for 2 seconds. | Non-direct Tactic |
| 5 | [Cannonball](https://bazaardb.gg/card/fc1y26n2vlf7p25ykxyzq2l341/Cannonball)<br>17.3 (Aug 20, 2026) | Silver · Small<br>AmmoReference | — source<br>5 sec Saturn pending fallback | **While on board:** Your items have +1 Max Ammo. | Non-direct Tactic |
| 6 | [Captain's Quarters](https://bazaardb.gg/card/8425ht00fb4p1r919mmwsa0tn/Captain%27s-Quarters)<br>17.2 (Aug 13, 2026) | Silver · Large<br>Aquatic, Property, Haste, DamageReference, AmmoReference | 4 sec | **On use:** Haste your Tools and Vehicles for 1 second.<br>**On use:** Reload your items 1 Ammo.<br>**On use:** Your Weapons gain +20 Damage for the fight. | Support; Haste/reload/DamageReference |
| 7 | [Captain's Wheel](https://global.bazaardb.gg/card/jcj5923pvmhdh7yqbsl4hn84gb/Captain%27s-Wheel)<br>17.1 (Hotfix Aug 7, 2026) | Silver · Medium<br>Aquatic, Tool, Haste | 5 sec | **On use:** Haste up to 2 adjacent items for 1 second.<br>**While you have a vehicle or large item:** Reduce this item's Cooldown by 2.5 seconds. | Support; Haste |
| 8 | [Card Table](https://bazaardb.gg/card/tbqmqy73gxxhx4nw9y64kstg3g/Card-Table)<br>17.3 (Aug 20, 2026) | Gold · Medium<br>No printed tags | 5 sec | **On use:** A Friend gains +1 Multicast for the fight. | Non-direct Tactic |
| 9 | [Chum](https://bazaardb.gg/card/117tcpcdgkzk4fqfqh36z43dppv/Chum)<br>17.1 (Hotfix Aug 7, 2026) | Bronze · Small<br>Aquatic, Food, Crit | 4 sec | **On use:** Your Aquatic and Food items gain +3% Crit Chance for the fight.<br>**When you buy this:** Get a Piranha. | Non-direct Tactic |
| 10 | [Clamera](https://bazaardb.gg/card/c2p4mt8y2jgk9vqw5jll53l9wm/Clamera)<br>16.2 (Jul 17, 2026) | Silver · Small<br>Aquatic, Slow | 7 sec | **On use:** Slow 1 enemy item for 2 seconds.<br>**First 2 enemy item uses each fight:** Use this. | Non-direct Tactic |
| 11 | [Coral](https://bazaardb.gg/card/zqxjt2s8896s8nnqls2h06th8c/Coral)<br>17.2 (Aug 13, 2026) | Bronze · Small<br>Aquatic, Relic, Heal | 5 sec | **On use:** Heal 20.<br>**When you buy an aquatic item:** Gain +5 Heal permanently. | Heal/scaling; not direct damage in base form |
| 12 | [Coral Armor](https://bazaardb.gg/card/3th8hsilrfklhavugeg050h5k/Coral-Armor)<br>17.2 (Aug 13, 2026) | Bronze · Medium<br>Aquatic, Apparel, Relic, Shield | 6 sec | **On use:** Shield 50.<br>**When you buy another aquatic item:** Gain +10 Shield permanently. | Non-direct Tactic |
| 13 | [Cove](https://bazaardb.gg/card/n8840cj0bdwghtbl7h2zmgyzwf/Cove)<br>17.1 (Hotfix Aug 7, 2026) | Bronze · Large<br>Aquatic, Property, Shield, Value, EconomyReference | 3 sec | **On use:** Shield equal to 1× this item's Value.<br>**When you sell an item:** Gain +1 Value permanently. | Shield/value scaling |
| 14 | [Crow's Nest](https://bazaardb.gg/card/4e4eo5afof8afl38nlhjtjw5z/Crow%27s-Nest)<br>17.0 (Aug 5, 2026) | Silver · Large<br>Property, Aquatic, Crit | — source<br>5 sec Saturn pending fallback | **While on board:** Your Weapons have +40% Crit Chance.<br>**While you have only one weapon:** That Weapon has Lifesteal and is affected by Slow for half as long. | Crit/lifesteal support |
| 15 | [Dam](https://bazaardb.gg/card/hfhplqbp7ykb1lvlw6254ll50b/Dam)<br>16.2 (Jul 17, 2026) | Gold · Large<br>Aquatic, Property | 25 sec | **On use:** Destroy this and all Smaller items for the fight.<br>**When you use another aquatic item:** Charge this 1 second. | Destroys items; not enemy health damage |
| 16 | [Dive Weights](https://bazaardb.gg/card/12cdlp288b935dj9njzg224nqd3/Dive-Weights)<br>17.2 (Aug 13, 2026) | Silver · Small<br>Aquatic, Tool, Apparel, Haste, Ammo | 8 sec<br>Ammo 4 | **On use:** Haste 1 item for 1 second.<br>**For each adjacent aquatic item:** Reduce this item's Cooldown by 1 second.<br>**While on board:** Gain +Multicast equal to this item's Ammo (+4 at the starting tier). | Haste/multicast/ammo support |
| 17 | [Diving Helmet](https://bazaardb.gg/card/19fb4133c27l2zd47zgjlnnvpph/Diving-Helmet)<br>17.3 (Aug 20, 2026) | Gold · Medium<br>Aquatic, Tool, Apparel, Shield | — source<br>5 sec Saturn pending fallback | **When any aquatic item is used:** Shield 50.<br>**While on board:** Adjacent items are Aquatic in combat. | Shield support |
| 18 | [Dock Lines](https://bazaardb.gg/card/9elav9z45mx80y0w8qv6kbmdk/Dock-Lines)<br>17.0 (Aug 5, 2026) | Silver · Medium<br>Tool, Aquatic, Slow | 4 sec | **On use:** Slow 2 items for 3 seconds. | Slow |
| 19 | [Figurehead](https://bazaardb.gg/card/8tzt93kxo03bl50z5cubthjv8/Figurehead)<br>17.0 (Aug 5, 2026) | Silver · Medium<br>Aquatic, Relic, DamageReference, Cooldown | — source<br>5 sec Saturn pending fallback | **While on board:** The Cooldowns of Aquatic items to the left are reduced by 10%.<br>**While on board:** Items to the right gain +25 Damage. | DamageReference support |
| 20 | [Fishing Net](https://bazaardb.gg/card/hn4n4qhc9t3hklm0zysh76jn90/Fishing-Net)<br>17.3 (Aug 20, 2026) | Bronze · Medium<br>Aquatic, Tool, Slow, EconomyReference | 6 sec | **On use:** Slow 1 item for 2 seconds.<br>**At start of each day:** Get a Small Aquatic or Loot item from any Hero. | Slow + item generation |
| 21 | [Fishing Rod](https://bazaardb.gg/card/b2s1b6c5djpjeojurowx2in5i/Fishing-Rod)<br>17.2 (Aug 13, 2026) | Bronze · Medium<br>Aquatic, Tool, Haste | 5 sec | **On use:** Haste the Aquatic item to the right for 2 seconds.<br>**At start of each day:** Get a Small Aquatic item. | Haste + Aquatic generation |
| 22 | [Holsters](https://bazaardb.gg/card/6ntpnj0fv39jpt3zlw8z0x6cwm/Holsters)<br>17.3 (Aug 20, 2026) | Diamond · Small<br>Apparel, Tool, Haste | — source<br>5 sec Saturn pending fallback | **At start of each fight:** Haste your Small items for 2 seconds. | Haste support |
| 23 | [Iceberg](https://bazaardb.gg/card/l1yg7cpnjqz7cbnn99tq9mwjwf/Iceberg)<br>17.3 (Aug 20, 2026) | Diamond · Large<br>Aquatic, Property, Freeze | — source<br>5 sec Saturn pending fallback | **When an enemy uses an item:** Freeze it for 1 second. | Freeze |
| 24 | [IllusoRay](https://bazaardb.gg/card/168xkq965ytnl3500lcd9p4bsps/IllusoRay)<br>17.3 (Aug 20, 2026) | Bronze · Small<br>Aquatic, Friend, Ray, Slow | 6 sec | **On use:** Slow 1 item for 1 second.<br>**For each adjacent friend or ray:** Gain +1 Multicast. | Non-direct Tactic |
| 25 | [Integrated HUD](https://bazaardb.gg/card/c6cy0mpnfjzhbgzkw1v08f5jk8/Integrated-HUD)<br>16.2 (Jul 17, 2026) | Silver · Small<br>Apparel, Tech, Crit, Slow | — source<br>5 sec Saturn pending fallback | **While on board:** The item to the right gains +20% Crit Chance if it can Crit.<br>**When the item to the right crits:** Slow 1 enemy item for 1 second. | Crit/Slow support |
| 26 | [Korxena Crest](https://bazaardb.gg/card/42a3a1x1vlgfowqs4ch0goy8z/Korxena-Crest)<br>16.1 (Hotfix Jul 8, 2026) | Silver · Small<br>Apparel, Relic, Crit | — source<br>5 sec Saturn pending fallback | **While on board:** Your items gain +15% Crit Chance if they can Crit. | Crit support |
| 27 | [Life Preserver](https://bazaardb.gg/card/42lj1pbn9nby2smxylaqm6iyk/Life-Preserver)<br>16.2 (Jul 17, 2026) | Bronze · Medium<br>Aquatic, Shield, Heal | 7 sec | **On use:** Shield 10.<br>**The first time you would be defeated each fight:** Heal 200. | Non-direct Tactic |
| 28 | [Lockbox](https://bazaardb.gg/card/x98jn3cwn1bs3d26fc1zld4g06/Lockbox)<br>17.3 (Aug 20, 2026) | Silver · Medium<br>Relic, EconomyReference, Value, DamageReference | — source<br>5 sec Saturn pending fallback | **When you win a fight:** Gain +3 Value permanently.<br>**While on board:** Your items gain Damage equal to this item's Value. | Non-direct Tactic |
| 29 | [Nesting Doll](https://bazaardb.gg/card/113kp5b01qpk3h12bmjyfcdnn1f/Nesting-Doll)<br>17.3 (Aug 20, 2026) | Silver · Small<br>Toy, Shield, Ammo | 2 sec<br>Ammo 8 | **On use:** Shield equal to 10× this item's Ammo.<br>**At start of each day:** Gain +1 Max Ammo permanently. | Non-direct Tactic |
| 30 | [Pearl](https://bazaardb.gg/card/2zs0qmhclpv2j1789yd7ph6p6j/Pearl)<br>17.3 (Aug 20, 2026) | Bronze · Small<br>Aquatic, Shield | 5 sec | **On use:** Shield 10.<br>**When you use another aquatic item:** Charge this 1 second. | Non-direct Tactic |
| 31 | [Port](https://bazaardb.gg/card/3pghk5dcjx67p4027tcyq0c8pv/Port)<br>17.3 (Aug 20, 2026) | Silver · Large<br>Property, Aquatic, AmmoReference, Charge | 6 sec | **On use:** Reload all your items 2 Ammo and Charge them 1 second.<br>**At start of each day:** Get a Small Ammo item from any hero. | Ammo reload + Charge |
| 32 | [Rowboat](https://bazaardb.gg/card/3yx3sdulcm9rtcrdzrbhnrs47/Rowboat)<br>17.1 (Hotfix Aug 7, 2026) | Gold · Medium<br>Aquatic, Vehicle, Charge, CooldownReference | 5 sec | **On use:** Charge adjacent items 2 seconds.<br>**While you have at least 7 unique types:** Reduce this item's Cooldown by 5 seconds. | Charge adjacent items |
| 33 | [Seadog's Saloon](https://bazaardb.gg/card/7dyt0xdq4ztvjb68mioiu1urf/Seadog%27s-Saloon)<br>17.1 (Aug 6, 2026) | Silver · Large<br>Aquatic, Property, Haste, Slow | 6 sec | **On use:** Haste an item for 2 seconds.<br>**On use:** Slow an item for 2 seconds.<br>**For each friend you have:** Gain +1 Multicast. | Haste/Slow |
| 34 | [Seashadow](https://bazaardb.gg/card/10f8dm23mqdzy4j9pnxz8b1w45/Seashadow)<br>17.1 (Aug 6, 2026) | Silver · Medium<br>Friend, Vehicle, Cooldown | 2 sec | **On use:** Reduce the Cooldown of your other items by 8% for the fight.<br>**On use:** Increase this item's Cooldown by 4 seconds for the fight. | Cooldown reduction |
| 35 | [Shipwreck](https://bazaardb.gg/card/16st79j809vv1j19s7zy1wqbbwq/Shipwreck)<br>17.3 (Aug 20, 2026) | Diamond · Large<br>Aquatic, Vehicle, Property, Relic, MulticastReference | — source<br>5 sec Saturn pending fallback | **While on board:** Your Aquatic items have +1 Multicast. | Aquatic multicast support |
| 36 | [Shot Glasses](https://bazaardb.gg/card/7ewmaurzg1674a13fvurh2ljk/Shot-Glasses)<br>16.1 (Hotfix Jul 8, 2026) | Silver · Small<br>Ammo, Haste, Slow | 3 sec<br>Ammo 1 | **On use:** Haste 4 of your items for 1 second.<br>**On use:** Slow 4 of your items for 1 second. | Non-direct Tactic |
| 37 | [Star Chart](https://bazaardb.gg/card/g72qhm78wwb9ml7lfgj1lhtj0s/Star-Chart)<br>17.3 (Aug 20, 2026) | Bronze · Medium<br>Tool, Relic, Cooldown, Crit | — source<br>5 sec Saturn pending fallback | **While on board:** Adjacent items have +10% Crit Chance.<br>**While on board:** Adjacent items' Cooldowns are reduced by 5%. | Non-direct Tactic |
| 38 | [Stealth Glider](https://bazaardb.gg/card/64tx7zxyq1djm3zkty1z34gpqb/Knightshade)<br>Knightshade merchant pool · database patch 17.3 | Silver · Large<br>Vehicle, Tech, Flying, CooldownReference, DamageReduction | 4 sec | **On use:** An item starts Flying.<br>**While on board:** You take 25% less Damage.<br>**While on board:** Your Flying items have their Cooldowns reduced by 1 second. | Damage reduction/cooldown support |
| 39 | [Submersible](https://bazaardb.gg/card/c47mkck7q7n1l37vcm4xskk7m9/Submersible)<br>17.3 (Aug 20, 2026) | Silver · Medium<br>Aquatic, Tool, Vehicle, Tech, DamageReference, ShieldReference | 5 sec | **On use:** The leftmost and rightmost Aquatic Weapons gain +10 Damage for the fight.<br>**On use:** The leftmost and rightmost Aquatic Shield items gain +10 Shield for the fight.<br>**While you have another vehicle or large item:** Reduce this item's Cooldown by 2 seconds. | Aquatic weapon/shield support |
| 40 | [Tropical Island](https://bazaardb.gg/card/d5df9s35x0whc7czq66xqxn3yv/Tropical-Island)<br>17.2 (Aug 13, 2026) | Silver · Large<br>Property, Aquatic, Regen, SlowReference | — source<br>5 sec Saturn pending fallback | **When any item or skill on board or in stash applies slow:** Gain 5 Regen for the fight.<br>**At end of each fight:** Get a Coconut and a Citrus. | Regen + Food generation |
| 41 | [Honing Steel](https://bazaardb.gg/card/ajvdim21upzc9vy723alj67id/Honing-Steel)<br>16.2 (Jul 17, 2026) | Bronze · Small<br>Tool, DamageReference | 3 sec | **On use:** The leftmost and rightmost Weapons gain +5 Damage for the fight. | **Closest miss:** DamageReference; buffs Weapons |
| 42 | [Orange Julian](https://bazaardb.gg/card/1875s7wl0y2slvkqn6js9spv7f4/Orange-Julian)<br>17.2 (Aug 13, 2026) | Silver · Medium<br>Friend, DamageReference, EconomyReference | 8 sec | **On use:** Your items gain Damage equal to half the gold you have gained this run. | **Closest miss:** DamageReference; buffs items from gold gained |
| 43 | [Suppressor](https://bazaardb.gg/card/g0cqnc4fzgb8y9c01d030skqq/Suppressor)<br>17.2 (Aug 13, 2026) | Silver · Small<br>Tech, DamageReference, Cooldown | — source<br>5 sec Saturn pending fallback | **While on board:** The item to the left gains +25 Damage if it is a Weapon.<br>**While you have exactly one weapon:** That Weapon's Cooldown is reduced by 5%. | **Closest miss:** DamageReference; buffs adjacent Weapon/item |

### Source-resolution notes

- **Barrel:** patch 17.3 supersedes the stale 6-second / Shield 20 secondary value; use 5 seconds, Shield 30, and +15 Shield from adjacent-item uses.
- **Cannonball:** patch 17.3 is a board-wide +1 Max Ammo aura, not the older adjacent-item wording.
- **Captain's Quarters:** the compact page omits the final stat label; its DamageReference tag and history identify the starting +20 as Weapon Damage.
- **Figurehead:** the compact page omits the right-side stat label; its DamageReference tag identifies the starting +25 as Damage.
- **Shot Glasses:** the Silver/Gold/Diamond Ammo progression is 1/2/3; the starting Silver value is Ammo 1.
- **Stealth Glider:** no stable standalone item URL was exposed, so its current patch-17.3 Knightshade merchant-pool row is pinned instead; the URL identifier belongs to Knightshade, not Stealth Glider.
- **Honing Steel, Orange Julian, and Suppressor:** these are the closest direct-damage misses, but remain non-direct because their base effects only grant Damage to other items.

---

## 4. Bazaar Offensive Stat Baseline

The working sample for these numbers was the **70 Vanessa items matched to the 70 Arcana**.

For each Bazaar item, the value used was its **starting/base tier** rather than averaging all Bronze/Silver/Gold/Diamond versions together.

Printed/base values were used. Multicast, Ammo, Crit, and similar effects were **not** multiplied into Damage.

Cooldown statistics in the conditional table use only printed Bazaar cooldowns. The whole-population implementation value below substitutes the 5-second pending fallback for the three no-cooldown direct items.

### Conditional averages

These averages include only items that actually have the corresponding printed/base stat. Scimitar of the Deep's computed 8-Poison Crit trigger is derived and is therefore documented separately rather than counted as printed Poison.

| Stat | Items With Stat | Mean | Median | Range |
|---|---:|---:|---:|---:|
| Cooldown | 67 | **6.61 sec** | **5 sec** | 2–25 sec |
| Flat Damage | 53 | **44.5** | **20** | 4–450 |
| Burn | 14 | **4.43** | **4** | 2–8 |
| Printed Poison | 6 | **4.5** | **3.5** | 3–10 |

### Whole-population averages

These include zeroes for items that do not have the stat.

| Stat | Population Average |
|---|---:|
| Effective pending cooldown | **6.54 sec** |
| Fixed Damage* | **35.2** |
| Burn | **0.89** |
| Printed Poison | **0.39** |

\*For Fixed Damage, the three percentage-health attacks are omitted from the denominator; missing flat Damage among the other 67 items counts as zero.

---

## 5. Recommended "1× Normal" Bazaar Reference Unit

Because Damage has large artillery outliers, the median is a better transform anchor than the arithmetic mean.

### Proposed baseline

- **5 sec cooldown = 1 normal cooldown**
- **20 Damage = 1 normal Damage unit**
- **4 Burn = 1 normal Burn unit**
- **4 Poison = 1 normal Poison unit** (rounded from the 3.5 printed median)

In shorthand:

> **Cooldown 5 / Damage 20 / Burn 4 / Poison 4 = 1× normal**

This is likely a better foundation for translating Bazaar numbers into Saturn's Gravity than using the raw means.

---

## 6. Damage Distribution Notes

For fixed-damage items in the sample:

- 25th percentile: **15 Damage**
- Median: **20 Damage**
- 75th percentile: **35 Damage**
- 90th percentile: **100 Damage**

This reinforces that **20 Damage is a normal Vanessa hit**, while 100+ is deliberately oversized.

Notable high-end examples identified during the review:

- Tortuga: **450 Damage**
- Jetbike: **200 Damage**
- Ballista: **200 Damage**
- Cannonade: **200 Damage**
- Trebuchet: **75 Damage + 8 Burn** at its starting Silver tier

---

## 7. Percentage-Health Damage

These were kept separate from flat Damage so they would not distort the normal Damage average.

| Item | Starting-Tier Health Damage |
|---|---:|
| Anchor | **20% enemy Max Health** |
| Powder Keg | **40% enemy Max Health** |
| The Boulder | **100% enemy Max Health** |

Average: **53.3% Max Health**

Median: **40% Max Health**

This should probably remain its own transform category rather than converting directly into ordinary flat Damage.

---

## 8. Other Useful Examples

A few specific examples used while establishing the averages:

- **Katana:** 2 sec cooldown / 15 Damage
- **Cauterizing Blade:** 5 sec / 20 Damage / 6 Burn
- **Dart Launcher:** 4 sec / 3 Poison
- **Double Barrel:** 4 sec / 20 Damage / Multicast 2
- **Cannon:** 40 Damage + 4 Burn at Bronze
- **Scimitar of the Deep:** 30 Damage / 5 sec; a Crit trigger derives 8 Poison from 25% of its Damage after Bazaar rounding

---

## 9. Transform-Function Direction

The main takeaway for Saturn's Gravity is to map relative Bazaar power rather than directly copying raw numbers.

A simple first-pass normalized form is:

```text
bazaar_damage_units = bazaar_damage / 20
bazaar_burn_units   = bazaar_burn / 4
bazaar_poison_units = bazaar_poison / 4
effective_pending_cd = bazaar_cooldown ?? 5
bazaar_cd_units      = effective_pending_cd / 5
```

Then Saturn's Gravity can define its own target values for one normalized unit.

For example:

```text
saturn_damage = bazaar_damage_units * SATURN_BASE_DAMAGE
saturn_burn   = bazaar_burn_units   * SATURN_BASE_BURN
saturn_poison = bazaar_poison_units * SATURN_BASE_POISON
saturn_cd     = bazaar_cd_units     * SATURN_BASE_COOLDOWN
```

This preserves relative relationships while letting the action-game scale remain completely different from The Bazaar.

---

## 10. Playable behavior-demo pass

The first gameplay pass is an opt-in 13-card vertical slice at:

```text
combat-arena.html?variant=warden-trial&bazaarDemo=1
```

It deliberately validates the shared runtime rules before expanding them over all 113 active catalog entries. It retains the single authoritative current card: choose a source in the pause menu, swipe Down once to start or change stance, then swipe Up to resolve the selected Arcana or Tactic. Selecting another demo source replaces the one-card test deck; it does not create a hand.

| Source | Saturn action | Behavior proven in the demo |
|---|---|---|
| Cauterizing Blade | Flame Strike | Damage + Burn-over-time |
| Dart Launcher | Perforating Jet | Ammo, Poison-over-time, enemy Slow |
| Ice Pick | Ice Dagger | Damage, enemy Freeze, persistent self-Damage gain |
| Butterfly Swords | Flame Cross | Printed Multicast |
| Rifle | Bolt Rail | Ammo and persistent on-use self-Damage gain |
| Anchor | Heroic Leap | Exact percentage-of-Max-Health damage |
| Calico | Rapid Fire Agent | Friend target for Card Table Multicast |
| Astrolabe | Tactic Up / S26 Down | Haste the replacement current card for 1 second |
| Port | Tactic Up / S26 Down | Reload all registered Ammo by 2 and Charge the replacement current card 1 second |
| Barrel | Tactic Up / S26 Down | Add 30 combat Shield; Shield absorbs later player damage |
| Coral | Tactic Up / S26 Down | Heal 20, capped at the normal 100 HP maximum |
| Card Table | Tactic Up / S26 Down | Demo Friends gain +1 Multicast for the fight |
| Honing Steel | Tactic Up / S26 Down | Demo Weapons gain +5 printed Damage for the fight |

The reversible demo transform is pinned as:

```text
20 printed Bazaar Damage = 12 Saturn HP
4 printed Bazaar Burn   = 6 Saturn HP over 3 ticks
4 printed Bazaar Poison = 6 Saturn HP over 3 ticks
percentage-health Damage uses the target's real Max HP
```

During this opt-in demo only, the selected Arcana keeps its existing motion and visuals while its old native Arcana damage is suppressed. The translated Bazaar payload is authoritative, preventing the old and new damage models from stacking. The pending-card timer remains the only ability cooldown gate in this mode.

The pause menu also exposes Haste, Charge, Slow, and Freeze test buttons that act directly on the current pending instance. These controls are instrumentation for validating timer math; they are not additional cards.

Board-dependent translations are explicit provisional demo rules. With no multi-item board yet, Astrolabe and Port affect the replacement current card; Card Table applies to demo Friends; Honing Steel applies to demo Weapons. Shop, day, value, adjacency, and acquisition passives remain out of the slice rather than being silently invented.

## 11. Implementation handoff

The runtime stack keeps immutable Bazaar catalog data separate from the mutable current-card pending instance, uses the explicit 5-second pending fallback when the raw cooldown is `null`, and registers the 43 non-direct entries as a Warden-only Tactic data family. Tactic execution and unsupported board/economy translations must land explicitly in later behavior passes rather than pretending those systems already exist.

Outside the opt-in behavior demo, the pending-timer layer does not replace Saturn's existing Arcana damage/effect values. Any full-roster source-to-Saturn behavior or damage pass must retain the raw Bazaar fields beside translated runtime values so later tuning remains reversible.
