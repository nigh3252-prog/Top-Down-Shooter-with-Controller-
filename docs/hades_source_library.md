# Hades 1 source library

Purpose: clean source-move inventory for later chaos-draft/deckbuilding work. This is not implementation code yet. It is a design-reference list of source mechanics, grouped so they can later become cards, items, potions, upgrades, passives, stance modules, or resource modules.

Scope: Hades 1 only, not Hades II.

Tag legend used below:

- `core-kit`: changes Square/Triangle/base action identity.
- `active-card`: can become an LB/RB castable card.
- `modifier`: changes an existing attack/special/cast/dash/call.
- `passive`: build rule or stat/rule layer.
- `resource`: meter, ammo, gauge, currency, or charge-like system.
- `item`: Slay-the-Spire-style relic/item candidate.
- `potion`: one-use or consumable-style candidate.
- `status`: affliction/condition to model.
- `summon`: companion, pet, or summoned effect.
- `upgrade`: upgrade/reward candidate.

## Core Hades action model

| Source thing | Hades behavior | Prototype interpretation | Tags |
|---|---|---|---|
| Attack | Weapon-defined primary attack. The shape, combo, cadence, range, and damage are determined by the equipped Infernal Arm and its Aspect. | Square/base attack or stance attack. | core-kit, modifier |
| Special | Weapon-defined secondary move. Often slower, wider, ranged, or utility-oriented. | Triangle/heavy/special or stance special. | core-kit, modifier |
| Dash | Fast evade/movement burst. Can be modified by dash boons and dash-strike interactions. | Dodge button and dash-trigger hooks. | active-card, modifier, mobility |
| Dash-Strike | Attack shortly after dashing; many weapons have special dash-strike behavior. | combo/mobility follow-up. | core-kit, modifier |
| Cast | Bloodstone/ammo-based ranged/magic attack. Cast boons replace the cast behavior. | LB/RB card, separate Cast resource, or stance module. | active-card, resource |
| Call | God Gauge ultimate-like action. Uses partial or full God Gauge. | high-cost ultimate card or meter payoff. | active-card, resource |
| Companion | Limited-use summon/nuke from a bonded character. | item/potion/summon card. | active-card, summon, potion |

## Hades resource and meter systems

| Source thing | Hades behavior | Prototype interpretation | Tags |
|---|---|---|---|
| Health | Life total; death triggers Death Defiance/Stubborn Defiance if available. | HP bar. | resource |
| Bloodstones / Cast Ammo | Cast charges that lodge in foes or regenerate depending on Mirror talent. | Cast-ammo resource module. | resource |
| God Gauge | Call meter that builds during combat; some boons alter charge rate or starting value. | Ultimate/call meter. | resource |
| Dash charges | Greater Reflex adds extra dashes; Hermes can add more. | Dodge-stock resource. | resource, mobility |
| Death Defiance | Extra life charges, restored in limited ways. | revive resource. | resource, passive |
| Darkness / Gemstones / Obols / Keys / Nectar / Pom / Heart | Run economy and meta rewards. | item/reward currencies or draft tags. | resource, item |
| Titan Blood | Unlocks/upgrades weapon Aspects. | aspect-upgrade currency, likely not in combat. | resource, upgrade |

## Hades statuses and effect families

| Status/effect | Hades behavior | Prototype interpretation | Tags |
|---|---|---|---|
| Weak | Reduces enemy damage output; Aphrodite source family. | damage-down debuff. | status, debuff |
| Charmed | Enemy fights for/does not target you briefly; Aphrodite Call/legendary family. | charm/confusion behavior. | status, control |
| Doom | Delayed burst damage after application; Ares source family. | delayed damage marker. | status, damage-over-time |
| Blade Rift | Moving or placed damaging vortex; Ares source family. | hazard zone / moving zone. | active-card, zone |
| Critical | Increased damage chance; Artemis source family. | crit flag/modifier. | status, modifier |
| Marked | Next crit chance is increased against marked targets; Artemis source family. | target priority/crit setup. | status, debuff |
| Deflect | Reflects enemy projectiles/attacks; Athena source family. | defensive reflection/parry. | status, defense |
| Exposed | Backstab vulnerability from Athena support boons. | positional damage debuff. | status, debuff |
| Chill | Slows enemies; Demeter source family. | slow stack. | status, control |
| Hangover | Stacking damage over time; Dionysus source family. | poison/DoT stack. | status, damage-over-time |
| Festive Fog | Dionysus cast cloud that deals/sets up effects. | area cloud/zone. | active-card, zone |
| Knockback / Knock-Away | Pushes enemies away; Poseidon source family. | push and wall-slam. | status, control |
| Rupture | Damage when enemies move after knockback setup; Poseidon support. | movement-punish debuff. | status, damage-over-time |
| Jolted | Lightning-status trigger when foe attacks; Zeus support. | counter-zap debuff. | status, trigger |
| Sturdy | Temporary resistance to interruption/knockback. | armor/super-armor state. | status, defense |
| Impervious | Cannot take damage. | invulnerability. | status, defense |

## Infernal Arms / weapon kits

These are the strongest candidates for `core-kit` or temporary stance cards.

| Weapon | Hades behavior | Prototype interpretation | Aspects |
|---|---|---|---|
| Stygian Blade / Stygius | Balanced melee longsword. Attack is Strike > Chop > Thrust combo; dash-strike is a thrust; Special is Nova Smash, an AoE burst with knockback that leaves the player briefly stationary. | Default Square/Triangle melee kit. | Zagreus, Nemesis, Poseidon, Arthur |
| Eternal Spear / Varatha | Long reach melee. Attack thrusts, can charge Spin Attack, Special throws spear and recalls it. | Reach/poke stance with throw/recall special and charge spin. | Zagreus, Achilles, Hades, Guan Yu |
| Shield of Chaos / Aegis | Melee shield bash, hold-to-block, Bull Rush charge, thrown shield Special. | Defensive stance with block/charge and bouncing/ranged special. | Zagreus, Chaos, Zeus, Beowulf |
| Heart-Seeking Bow / Coronacht | Charge-to-fire ranged bow with power-shot timing; Special fires a spread/volley of arrows. | Charge-shot stance with cone/volley special. | Zagreus, Chiron, Hera, Rama |
| Twin Fists of Malphon | Very fast close-range attack chain and uppercut-style Special. | Rapid melee brawler stance. | Zagreus, Talos, Demeter, Gilgamesh |
| Adamant Rail / Exagryph | Firearm with ammo/reload; Attack fires shots, Special launches a bomb/grenade. | Ammo/reload stance with ranged fire and lobbed special. | Zagreus, Eris, Hestia, Lucifer |

## Weapon Aspects

| Aspect | Source behavior summary | Prototype tags |
|---|---|---|
| Blade - Aspect of Zagreus | Faster attack and movement. | core-kit, passive, speed |
| Blade - Aspect of Nemesis | After Special, Attack can crit for a short window. | core-kit, modifier, crit |
| Blade - Aspect of Poseidon | Special dislodges Cast Ammo from foes; improves Cast damage. | core-kit, cast, resource |
| Blade - Aspect of Arthur | Hidden aspect; alternate heavy moveset, bonus max life, and Hallowed Ground defensive aura. | core-kit, aura, defense |
| Spear - Aspect of Zagreus | Improves Special range/speed/recall feel. | core-kit, projectile |
| Spear - Aspect of Achilles | After Special/recall, player rushes and receives bonus damage for next attacks/casts. | core-kit, mobility, buff |
| Spear - Aspect of Hades | Spin attack punishes/marks enemies, making them take bonus attack/special damage. | core-kit, mark, debuff |
| Spear - Aspect of Guan Yu | Hidden aspect; altered moveset, reduced max life, spin can steal life, Special is thrown projectile. | core-kit, lifesteal, drawback |
| Shield - Aspect of Zagreus | Boosts base attack and Special damage. | core-kit, modifier |
| Shield - Aspect of Chaos | After Bull Rush, next Special throws multiple shields. | core-kit, multi-projectile |
| Shield - Aspect of Zeus | Special becomes a deployable spinning shield disc. | core-kit, deployable |
| Shield - Aspect of Beowulf | Hidden aspect; shield can load Casts into Dragon Rush. | core-kit, cast, charge |
| Bow - Aspect of Zagreus | Improved critical chance. | core-kit, crit |
| Bow - Aspect of Chiron | Special arrows seek the last enemy hit by Attack. | core-kit, homing, mark |
| Bow - Aspect of Hera | Casts can be loaded into the bow attack. | core-kit, cast, charge |
| Bow - Aspect of Rama | Hidden aspect; Shared Suffering link, heavy attack feel, special volley. | core-kit, link, debuff |
| Fists - Aspect of Zagreus | Dodge chance bonus. | core-kit, defense, mobility |
| Fists - Aspect of Talos | Magnetic Cutter pulls foes in and makes them take bonus attack/cast damage. | core-kit, pull, debuff |
| Fists - Aspect of Demeter | After attacks, Special hits multiple extra times. | core-kit, combo, burst |
| Fists - Aspect of Gilgamesh | Hidden aspect; Maim effect and altered dash/attack pattern. | core-kit, debuff, mobility |
| Rail - Aspect of Zagreus | Larger ammo capacity. | core-kit, resource, ammo |
| Rail - Aspect of Eris | Standing in Special blast grants bonus damage. | core-kit, self-zone, buff |
| Rail - Aspect of Hestia | Manual reload empowers next shot. | core-kit, reload, burst |
| Rail - Aspect of Lucifer | Hidden aspect; attack becomes beam-like, Special creates hellfire orbs. | core-kit, beam, deployable |

## Daedalus Hammer upgrade pool

Daedalus Hammers are run-specific weapon upgrades; only a few can be held in a run. This list is primarily a tagging scaffold for later implementation. Descriptions are intentionally compact and behavior-focused.

### Stygian Blade hammers

| Hammer | What it changes | Tags |
|---|---|---|
| Breaching Slash | Attack deals much more damage to Armor. | hammer, modifier, armor |
| Cruel Thrust | Thrust gets major bonus damage and crit chance. | hammer, modifier, crit |
| Cursed Slash | Attack heals on hit but max life is heavily reduced. | hammer, lifesteal, drawback |
| Dash Nova | Special lunges forward and grants Sturdy briefly. | hammer, mobility, special |
| Double Edge | Dash-Strike hits twice and deals more damage. | hammer, dash-strike, multi-hit |
| Double Nova | Special hits twice but loses knockback. | hammer, special, multi-hit |
| Flurry Slash | Hold Attack to strike rapidly. | hammer, attack, channel |
| Hoarding Slash | Attack damage scales from current Obols. | hammer, economy, scaling |
| Piercing Wave | Attack emits a piercing wave projectile. | hammer, projectile, pierce |
| Shadow Slash | Attack deals more backstab damage. | hammer, positional |
| Super Nova | Special grows wider and stronger. | hammer, area |
| World Splitter | Attack becomes a slower heavy chop. | hammer, attack-replace |
| Greater Consecration | Arthur aura becomes larger and slows foes more. | hammer, aura, aspect-exclusive |

### Eternal Spear hammers

| Hammer | What it changes | Tags |
|---|---|---|
| Breaching Skewer | Special deals more Armor damage. | hammer, armor, special |
| Chain Skewer | Special bounces/chains between enemies. | hammer, chain, projectile |
| Charged Skewer | Special can be charged for stronger throw. | hammer, charge, projectile |
| Exploding Launcher | Special becomes an explosive projectile and loses recall behavior. | hammer, projectile, explosion |
| Extending Jab | Attack has longer reach. | hammer, range |
| Flaring Spin | Spin Attack deals more damage in a larger area. | hammer, spin, area |
| Flurry Jab | Hold Attack to jab rapidly. | hammer, attack, channel |
| Massive Spin | Spin Attack area and damage increase. | hammer, spin, area |
| Quick Spin | Spin Attack charges faster and recovers quicker. | hammer, charge-speed |
| Serrated Point | Dash-Strike hits multiple times but dash range is reduced. | hammer, dash-strike, drawback |
| Triple Jab | Attack strikes three times in spread/sequence. | hammer, multi-hit |
| Vicious Skewer | Special is stronger on return/backstab-style timing. | hammer, recall, positional |
| Winged Serpent | Guan Yu spin projectile travels farther. | hammer, aspect-exclusive, projectile |

### Shield of Chaos hammers

| Hammer | What it changes | Tags |
|---|---|---|
| Breaching Rush | Bull Rush deals more Armor damage. | hammer, armor, bull-rush |
| Charged Shot | Bull Rush becomes a ranged shot. | hammer, attack-replace, projectile |
| Dashing Flight | Special is stronger shortly after dash. | hammer, dash, special |
| Dread Flight | Special can hit more foes before returning. | hammer, chain, special |
| Explosive Return | Catching the Special creates an explosion. | hammer, recall, explosion |
| Ferocious Guard | Blocking boosts damage briefly. | hammer, block, buff |
| Minotaur Rush | Bull Rush becomes stronger/safer. | hammer, bull-rush |
| Pulverizing Blow | Attack hits twice but loses knockback. | hammer, attack, multi-hit |
| Sudden Rush | Bull Rush charges much faster. | hammer, charge-speed |
| Unyielding Defense | Beowulf Dragon Rush grants a defensive benefit. | hammer, aspect-exclusive, defense |

### Heart-Seeking Bow hammers

| Hammer | What it changes | Tags |
|---|---|---|
| Chain Shot | Attack chains/bounces between enemies. | hammer, chain, attack |
| Charged Volley | Special can be charged for stronger volley. | hammer, charge, special |
| Concentrated Volley | Repeated Special hits on same foe deal more damage. | hammer, stacking, special |
| Explosive Shot | Attack explodes in area but changes charge/shot behavior. | hammer, explosion, attack-replace |
| Flurry Shot | Hold Attack to fire rapidly without normal charge timing. | hammer, attack, channel |
| Perfect Shot | Power Shot timing is stronger. | hammer, timing, attack |
| Piercing Volley | Special arrows pierce foes. | hammer, pierce, special |
| Point-Blank Shot | Attack is stronger at close range. | hammer, positional |
| Relentless Volley | Special fires more arrows. | hammer, multi-projectile |
| Repulse Shot | Attack creates pushback around the player. | hammer, knockback |
| Sniper Shot | Attack is stronger at long range. | hammer, range |
| Triple Shot | Attack fires three shots in a spread. | hammer, multi-projectile |
| Twin Shot | Attack fires two shots but range is reduced. | hammer, multi-projectile, drawback |

### Twin Fists hammers

| Hammer | What it changes | Tags |
|---|---|---|
| Breaching Cross | Dash-Strike deals more Armor damage. | hammer, armor, dash-strike |
| Colossus Knuckle | Attack/Special grant Sturdy during animation. | hammer, defense |
| Concentrated Knuckle | Consecutive attacks on the same foe get stronger. | hammer, stacking |
| Draining Cutter | Special kills restore life. | hammer, lifesteal |
| Explosive Upper | Special creates an area blast. | hammer, special, explosion |
| Flying Cutter | Hold Special to charge/leap/strike. | hammer, charge, mobility |
| Heavy Knuckle | Attack becomes slower and stronger. | hammer, attack-replace |
| Kinetic Launcher | Special becomes a ranged projectile. | hammer, projectile, special |
| Long Knuckle | Attack has longer range. | hammer, range |
| Quake Cutter | Special creates a ground shockwave after landing. | hammer, shockwave |
| Rolling Knuckle | Dash-Strike can chain into extra movement/hit. | hammer, dash-strike, mobility |
| Rending Claws | Gilgamesh Maim target takes more damage. | hammer, aspect-exclusive, debuff |
| Rush Kick | Special becomes a forward rush/kick style move. | hammer, mobility, special |

### Adamant Rail hammers

| Hammer | What it changes | Tags |
|---|---|---|
| Cluster Bomb | Special fires multiple bombs with reduced damage. | hammer, multi-projectile, special |
| Concentrated Fire | Consecutive Attack hits on same foe increase damage. | hammer, stacking, attack |
| Delta Chamber | Attack fires in bursts and removes manual reload pressure. | hammer, ammo, attack-replace |
| Eternal Chamber | Attack no longer needs reload but has lower damage/fire behavior. | hammer, ammo, attack-replace |
| Explosive Fire | Attack hits in an area but fires slower. | hammer, explosion, drawback |
| Flurry Fire | Attack fires faster and more continuously. | hammer, fire-rate |
| Hazard Bomb | Special is stronger and larger but can hurt the player. | hammer, self-risk, explosion |
| Piercing Fire | Attack pierces foes and armor. | hammer, pierce |
| Ricochet Fire | Attack bounces to another foe. | hammer, chain |
| Rocket Bomb | Special becomes a fast rocket. | hammer, projectile, special |
| Seeking Fire | Attack seeks/aims toward foes. | hammer, homing |
| Spread Fire | Attack becomes a short-range spread shot. | hammer, attack-replace, spread |
| Targeting System | Special marks/weakens foes hit by blast. | hammer, mark, debuff |
| Triple Bomb | Special can fire multiple bombs in succession. | hammer, multi-use, special |

## Standard Olympian boons

### Aphrodite

| Boon | What it does | Tags |
|---|---|---|
| Heartbreak Strike | Attack deals more damage and inflicts Weak. | modifier, attack, weak |
| Heartbreak Flourish | Special deals more damage and inflicts Weak. | modifier, special, weak |
| Crush Shot | Cast becomes short-range wide blast that inflicts Weak. | active-card, cast, weak |
| Passion Flare | Beowulf-style flare: Cast damages around you and inflicts Weak. | active-card, cast, weak |
| Passion Dash | Dash damages at destination and inflicts Weak. | modifier, dash, weak |
| Aphrodite's Aid | Call fires a seeking Charm projectile. | active-card, call, charm |
| Dying Lament | Slain foes damage nearby foes and inflict Weak. | passive, on-kill, weak |
| Wave of Despair | Taking damage damages nearby foes and inflicts Weak. | passive, on-damage, weak |
| Different League | Resist some nearby-foe damage. | passive, defense |
| Life Affirmation | Max-health rewards are worth more. | passive, reward |
| Empty Inside | Weak lasts longer. | passive, weak |
| Sweet Surrender | Weak foes take more damage. | passive, weak, damage |
| Broken Resolve | Weak reduces enemy damage more. | passive, weak, defense |
| Blown Kiss | Crush Shot shoots farther and is stronger against undamaged foes. | modifier, cast |
| Unhealthy Fixation | Weak can also Charm foes. | passive, legendary, charm |

### Ares

| Boon | What it does | Tags |
|---|---|---|
| Curse of Agony | Attack inflicts Doom. | modifier, attack, doom |
| Curse of Pain | Special inflicts Doom. | modifier, special, doom |
| Slicing Shot | Cast sends a Blade Rift forward. | active-card, cast, blade-rift |
| Slicing Flare | Flare version: Cast sends a large Blade Rift forward briefly. | active-card, cast, blade-rift |
| Blade Dash | Dash creates a Blade Rift at start point. | modifier, dash, blade-rift |
| Ares' Aid | Call turns player into an Impervious Blade Rift briefly. | active-card, call, blade-rift |
| Curse of Vengeance | Taking damage inflicts Doom around you. | passive, on-damage, doom |
| Urge to Kill | Attack/Special/Cast deal more damage. | passive, damage |
| Battle Rage | After kill, next Attack/Special is stronger. | passive, on-kill |
| Blood Frenzy | After Death Defiance, deal more damage that encounter. | passive, death-defiance |
| Black Metal | Blade Rifts are larger. | modifier, blade-rift, area |
| Engulfing Vortex | Blade Rifts last longer and pull foes. | modifier, blade-rift, pull |
| Dire Misfortune | Reapplying Doom increases its damage. | modifier, doom, stacking |
| Impending Doom | Doom deals more damage after longer delay. | modifier, doom, delay |
| Vicious Cycle | Blade Rifts deal more damage per consecutive hit. | legendary, blade-rift, stacking |

### Artemis

| Boon | What it does | Tags |
|---|---|---|
| Deadly Strike | Attack is stronger and can crit. | modifier, attack, crit |
| Deadly Flourish | Special is stronger and can crit. | modifier, special, crit |
| True Shot | Cast seeks foes and can crit. | active-card, cast, crit, homing |
| Hunter's Flare | Flare version: Cast damages around you and can crit. | active-card, cast, crit |
| Hunter Dash | Dash-Strike deals more damage. | modifier, dash-strike |
| Artemis' Aid | Call fires a seeking arrow with high crit chance. | active-card, call, crit, homing |
| Pressure Points | Any damage can crit. | passive, crit |
| Exit Wounds | Foes take damage when Cast Ammo dislodges. | passive, cast-ammo |
| Hide Breaker | Crits deal more Armor damage. | passive, crit, armor |
| Clean Kill | Crits deal more damage. | passive, crit |
| Hunter Instinct | God Gauge charges faster when you crit. | passive, call, crit |
| Hunter's Mark | Critting marks a nearby foe. | passive, crit, mark |
| Support Fire | After Cast/Attack/Special hit, fire seeking arrow. | passive, extra-projectile |
| Fully Loaded | Gain extra Cast Ammo. | legendary, resource, cast-ammo |

### Athena

| Boon | What it does | Tags |
|---|---|---|
| Divine Strike | Attack is stronger and Deflects. | modifier, attack, deflect |
| Divine Flourish | Special is stronger and Deflects. | modifier, special, deflect |
| Phalanx Shot | Cast damages small area and Deflects. | active-card, cast, deflect |
| Phalanx Flare | Flare version: Cast damages around you and Deflects. | active-card, cast, deflect |
| Divine Dash | Dash damages and Deflects. | modifier, dash, deflect |
| Athena's Aid | Call makes you briefly invulnerable and Deflecting. | active-card, call, defense |
| Holy Shield | Taking damage damages nearby foes and Deflects briefly. | passive, on-damage, deflect |
| Bronze Skin | Resist enemy attack damage. | passive, defense |
| Sure Footing | Resist trap damage. | passive, defense |
| Proud Bearing | Start encounters with partial God Gauge. | passive, call, resource |
| Blinding Flash | Deflect abilities also Expose foes. | passive, deflect, exposed |
| Brilliant Riposte | Deflected attacks deal more damage. | passive, deflect |
| Deathless Stand | Death Defiance makes you Impervious longer and restores a charge. | passive, death-defiance |
| Last Stand | Death Defiance restores more health and restores a charge. | passive, death-defiance |
| Divine Protection | Barrier negates one incoming hit. | legendary, defense, barrier |

### Demeter

| Boon | What it does | Tags |
|---|---|---|
| Frost Strike | Attack is stronger and inflicts Chill. | modifier, attack, chill |
| Frost Flourish | Special is stronger and inflicts Chill. | modifier, special, chill |
| Crystal Beam | Cast drops crystal turret/beam for a few seconds. | active-card, cast, beam, summon |
| Icy Flare | Flare version: Cast damages around you and inflicts Chill. | active-card, cast, chill |
| Mistral Dash | Dash shoots a chill-inflicting gust forward. | modifier, dash, chill |
| Demeter's Aid | Call creates winter vortex that damages and Chills. | active-card, call, zone |
| Frozen Touch | Taking damage damages and fully Chills attacker. | passive, on-damage, chill |
| Rare Crop | Existing boons become Common then gain rarity over encounters. | passive, upgrade, rarity |
| Ravenous Will | While out of Cast Ammo, take less damage and deal more. | passive, cast-ammo |
| Nourished Soul | Healing effects are stronger and restore some health now. | passive, healing |
| Snow Burst | Casting damages and Chills nearby foes. | passive, cast, chill |
| Arctic Blast | Applying 10 Chill stacks causes a blast. | passive, chill, burst |
| Killing Freeze | If all foes are Chilled, they slow/decay. | passive, chill, damage-over-time |
| Glacial Glare | Crystal Beam lasts longer and inflicts Chill. | modifier, cast, beam |
| Winter Harvest | Low-health chilled foes shatter and Chill nearby foes. | legendary, chill, execute |

### Dionysus

| Boon | What it does | Tags |
|---|---|---|
| Drunken Strike | Attack inflicts Hangover. | modifier, attack, hangover |
| Drunken Flourish | Special inflicts Hangover. | modifier, special, hangover |
| Trippy Shot | Cast lobs projectile that becomes Festive Fog. | active-card, cast, fog |
| Trippy Flare | Flare version: Cast damages around you and leaves Festive Fog. | active-card, cast, fog |
| Drunken Dash | Dash inflicts Hangover nearby. | modifier, dash, hangover |
| Dionysus' Aid | Call inflicts Hangover all around you. | active-card, call, hangover |
| After Party | If low health after encounter, restore to threshold. | passive, healing |
| Positive Outlook | Take less damage while low health. | passive, defense |
| Premium Vintage | Nectar gives max health; receive Nectar. | passive, reward |
| Strong Drink | Fountain fully heals and increases damage. | passive, reward, damage |
| Bad Influence | Deal more damage when multiple foes have Hangover. | passive, hangover, damage |
| Numbing Sensation | Hangover slows foes. | passive, hangover, slow |
| Peer Pressure | Hangover spreads to nearby foes. | passive, hangover, spread |
| High Tolerance | Take less damage in Festive Fog. | passive, fog, defense |
| Black Out | Hangover foes take bonus damage in Festive Fog. | legendary, hangover, fog |

### Hermes

| Boon | What it does | Tags |
|---|---|---|
| Swift Strike | Attack is faster. | passive, speed, attack |
| Swift Flourish | Special is faster. | passive, speed, special |
| Flurry Cast | Cast is faster and automatic. | passive, cast, speed |
| Quick Favor | Call charges automatically. | passive, call, resource |
| Hyper Sprint | After dash, become Sturdy and much faster briefly. | passive, dash, speed |
| Greater Haste | Move faster. | passive, speed |
| Quick Recovery | After taking damage, dash quickly to recover some lost health. | passive, recovery |
| Greater Evasion | Gain dodge chance. | passive, defense |
| Greatest Reflex | Gain extra dash stock. | passive, resource, dash |
| Second Wind | After Call, gain dodge and movement speed. | passive, call, speed |
| Quick Reload | Cast Ammo drops from foes faster. | passive, cast-ammo |
| Side Hustle | Gain Obols each chamber. | passive, economy |
| Rush Delivery | Bonus damage from bonus move speed. | passive, speed, damage |
| Auto Reload | Stygian Soul Cast Ammo regenerates faster. | passive, cast-ammo |
| Greater Recall | Cast Ammo automatically returns. | passive, cast-ammo |
| Bad News | Cast deals more damage to foes without ammo lodged in them. | legendary, cast |

### Poseidon

| Boon | What it does | Tags |
|---|---|---|
| Tempest Strike | Attack deals more and knocks foes away. | modifier, attack, knockback |
| Tempest Flourish | Special deals more and knocks foes away. | modifier, special, knockback |
| Flood Shot | Cast damages area and knocks foes away. | active-card, cast, knockback |
| Flood Flare | Flare version: Cast damages around you and knocks foes away. | active-card, cast, knockback |
| Tidal Dash | Dash damages area and knocks foes away. | modifier, dash, knockback |
| Poseidon's Aid | Call makes player surge into foes while Impervious. | active-card, call, mobility |
| Typhoon's Fury | Barrier slams deal more damage. | passive, wall-slam |
| Hydraulic Might | Attack/Special stronger at start of encounter. | passive, encounter-start |
| Ocean's Bounty | Gem/Darkness/Obol rewards worth more. | passive, reward |
| Sunken Treasure | Immediate assorted rewards and health. | item, reward |
| Razor Shoals | Knock-away effects Rupture foes. | passive, rupture |
| Boiling Point | God Gauge charges faster when taking damage. | passive, call, resource |
| Breaking Wave | Wall/corner slams create watery blast. | passive, wall-slam, area |
| Wave Pounding | Knock-away boons deal bonus boss damage. | passive, boss-damage |
| Rip Current | Call pulls foes and lasts longer. | modifier, call, pull |
| Huge Catch | Higher fishing point chance. | legendary, reward |
| Second Wave | Knock-away effects shove foes a second time. | legendary, knockback |

### Zeus

| Boon | What it does | Tags |
|---|---|---|
| Lightning Strike | Attack emits chain lightning on hit. | modifier, attack, lightning |
| Thunder Flourish | Special strikes nearby foes with lightning. | modifier, special, lightning |
| Electric Shot | Cast is bouncing chain lightning. | active-card, cast, lightning |
| Thunder Flare | Flare version: Cast calls lightning nearby. | active-card, cast, lightning |
| Thunder Dash | Dash strikes nearby foes with lightning. | modifier, dash, lightning |
| Zeus' Aid | Call repeatedly strikes nearby foes with lightning. | active-card, call, lightning |
| Heaven's Vengeance | After taking damage, attacker is struck by lightning. | passive, on-damage, lightning |
| Lightning Reflexes | Dash just before hit triggers lightning. | passive, dodge, trigger |
| Storm Lightning | Chain-lightning bounces more times. | passive, chain |
| High Voltage | Lightning bolts have larger area. | passive, area |
| Double Strike | Lightning bolts can strike twice. | passive, multi-hit |
| Static Discharge | Lightning effects make foes Jolted. | passive, jolted |
| Clouded Judgement | God Gauge charges faster when dealing/taking damage. | passive, call, resource |
| Billowing Strength | After Call, deal more damage briefly. | passive, call, damage |
| Splitting Bolt | Lightning effects create additional burst. | legendary, lightning |

## Duo boons

Duo boons combine two god families and require prior source boons. These are excellent candidates for Slay-the-Spire-style rare upgrade rewards.

| Duo | Gods | Behavior summary | Tags |
|---|---|---|---|
| Curse of Longing | Aphrodite + Ares | Doom repeatedly strikes Weak foes. | duo, doom, weak |
| Heart Rend | Aphrodite + Artemis | Critical hits are stronger against Weak foes. | duo, crit, weak |
| Parting Shot | Aphrodite + Athena | Cast gains backstab/positional bonus. | duo, cast, positional |
| Cold Embrace | Aphrodite + Demeter | Crystal Beam fires toward you and is stronger against Weak foes. | duo, cast, beam |
| Low Tolerance | Aphrodite + Dionysus | Hangover stacks more on Weak foes. | duo, hangover, weak |
| Sweet Nectar | Aphrodite + Poseidon | Future Pom upgrades are stronger. | duo, upgrade |
| Smoldering Air | Aphrodite + Zeus | God Gauge auto-charges but caps at partial call. | duo, call, resource |
| Hunting Blades | Ares + Artemis | Blade Rift Cast seeks foes. | duo, blade-rift, homing |
| Merciful End | Ares + Athena | Deflect attacks immediately trigger Doom. | duo, doom, deflect |
| Freezing Vortex | Ares + Demeter | Blade Rifts inflict Chill and last longer. | duo, blade-rift, chill |
| Curse of Nausea | Ares + Dionysus | Hangover ticks faster. | duo, hangover, speed |
| Curse of Drowning | Ares + Poseidon | Cast becomes close-range pulse around you. | duo, cast, area |
| Vengeful Mood | Ares + Zeus | Revenge effects trigger automatically. | duo, revenge |
| Deadly Reversal | Artemis + Athena | Deflecting gives brief crit chance. | duo, crit, deflect |
| Crystal Clarity | Artemis + Demeter | Crystal Beam tracks foes better. | duo, cast, beam |
| Splitting Headache | Artemis + Dionysus | Hangover stack count increases crit chance. | duo, crit, hangover |
| Mirage Shot | Artemis + Poseidon | Cast fires a second weaker projectile. | duo, cast, extra-projectile |
| Lightning Rod | Artemis + Zeus | Cast ammo on ground calls lightning. | duo, cast-ammo, lightning |
| Stubborn Roots | Athena + Demeter | When out of Death Defiance, regenerate health. | duo, healing, death-defiance |
| Calculated Risk | Athena + Dionysus | Enemy projectiles move slower. | duo, defense, slow |
| Unshakable Mettle | Athena + Poseidon | Resist boss damage and cannot be knocked around as easily. | duo, defense, boss |
| Lightning Phalanx | Athena + Zeus | Phalanx Shot bounces between foes. | duo, cast, chain |
| Ice Wine | Demeter + Dionysus | Trippy Shot hits faster and inflicts Chill. | duo, fog, chill |
| Blizzard Shot | Demeter + Poseidon | Flood Shot creates a moving winter vortex. | duo, cast, vortex |
| Cold Fusion | Demeter + Zeus | Jolted does not expire when foes attack. | duo, jolted |
| Exclusive Access | Dionysus + Poseidon | Future boons have high minimum rarity. | duo, rarity |
| Scintillating Feast | Dionysus + Zeus | Festive Fog periodically strikes with lightning. | duo, fog, lightning |
| Sea Storm | Poseidon + Zeus | Knockback effects also lightning-strike foes. | duo, knockback, lightning |

## Chaos boons

Chaos is best modeled as a two-part card: a temporary curse/drawback followed by a blessing. Chaos boons can stack and are not standard god-slot boons.

### Chaos curse families

| Curse family | Behavior summary | Tags |
|---|---|---|
| Abyssal | Traps deal more damage to you for several encounters. | chaos, drawback, trap |
| Addled | Taking certain actions such as Cast hurts you. | chaos, drawback, self-damage |
| Caustic | Slain foes drop damaging bombs. | chaos, drawback, hazard |
| Enshrouded | Chamber reward previews are hidden. | chaos, drawback, information |
| Excruciating | Taking damage is harsher. | chaos, drawback, defense |
| Flayed | Special costs health or is penalized. | chaos, drawback, special |
| Halting | Dash is disabled/limited. | chaos, drawback, dash |
| Maimed | Attack costs health or is penalized. | chaos, drawback, attack |
| Pauper's | Obol economy is disabled/penalized temporarily. | chaos, drawback, economy |
| Roiling | More foes spawn or encounters become harder. | chaos, drawback, wave |
| Slippery | Cast Ammo is harder to retrieve or drops slower. | chaos, drawback, cast-ammo |
| Slothful | Movement speed reduced. | chaos, drawback, speed |

### Chaos blessing families

| Blessing family | Behavior summary | Tags |
|---|---|---|
| Affluence | Gain more Obols. | chaos, reward, economy |
| Ambush | Backstab/first-strike damage bonus. | chaos, damage, positional |
| Assault | Damage to undamaged foes increased. | chaos, damage, opener |
| Defiance | Gain extra Death Defiance charge. | chaos, resource, revive |
| Eclipse | Darkness/Gemstone rewards increased. | chaos, reward |
| Favor | Future boons more likely higher rarity. | chaos, rarity |
| Flourish | Special damage increased. | chaos, special, damage |
| Grasp | Gain extra Cast Ammo. | chaos, resource, cast-ammo |
| Lunge | Dash-Strike damage increased. | chaos, dash-strike |
| Shot | Cast damage increased. | chaos, cast, damage |
| Soul | Gain max health. | chaos, health |
| Strike | Attack damage increased. | chaos, attack, damage |

## Companions

| Companion | Source behavior | Prototype interpretation | Tags |
|---|---|---|---|
| Battie | Megaera summon; large damage line/area. | Limited-use nuke. | summon, active-card, potion |
| Mort | Thanatos summon; delayed high-damage circle. | Delayed nuke marker. | summon, active-card, potion |
| Rib | Skelly summon; creates decoy target. | Decoy/tank. | summon, active-card |
| Shady | Sisyphus/Bouldy summon; drops health, darkness, obols and deals damage. | Utility reward drop + damage. | summon, item, reward |
| Fidi | Dusa summon; fires petrifying projectiles. | Pet turret/control. | summon, control |
| Antos | Achilles/Patroclus summon; multi-hit strike on foes. | Burst multi-target summon. | summon, damage |

## Mirror of Night talents

| Talent pair | Behavior summary | Tags |
|---|---|---|
| Shadow Presence / Fiery Presence | Damage bonus from behind vs. damage bonus against undamaged foes. | passive, positional, opener |
| Chthonic Vitality / Dark Regeneration | Heal after chambers vs. Darkness-based healing. | passive, healing |
| Death Defiance / Stubborn Defiance | Extra lives per run vs. one revive per chamber. | passive, revive, resource |
| Greater Reflex / Ruthless Reflex | Extra dash vs. damage/dodge bonus after near-miss dash. | passive, dash |
| Boiling Blood / Abyssal Blood | Cast ammo lodged in foe increases damage or reduces enemy output. | passive, cast-ammo |
| Infernal Soul / Stygian Soul | More Cast Ammo vs. regenerating Cast Ammo. | passive, cast-ammo, resource |
| Deep Pockets / Golden Touch | Start with Obols vs. earn interest on Obols. | passive, economy |
| Thick Skin / High Confidence | More max health vs. bonus damage while healthy. | passive, health, damage |
| Privileged Status / Family Favorite | Bonus damage from multiple statuses vs. multiple Olympian families. | passive, status, damage |
| Olympian Favor / Dark Foresight | Boon rarity odds vs. gold-laurel reward odds. | passive, reward |
| Gods' Pride / Gods' Legacy | Better rarity odds vs. Duo/Legendary odds. | passive, rarity |
| Fated Authority / Fated Persuasion | Reroll room rewards vs. reroll boon choices. | passive, draft, reroll |

## Keepsakes / item candidates

| Keepsake | Source behavior summary | Tags |
|---|---|---|
| Old Spiked Collar | More max health. | item, health |
| Myrmidon Bracer | Less front damage, more back damage taken. | item, defense, drawback |
| Black Shawl | Backstab/undamaged-foe damage. | item, positional, opener |
| Pierced Butterfly | Gain damage by clearing encounters without damage. | item, skill-scaling |
| Bone Hourglass | Longer Well item duration. | item, consumable |
| Chthonic Coin Purse | Immediate Obols. | item, economy |
| Skull Earring | More damage at low health. | item, low-health |
| Distant Memory | More damage to distant foes. | item, range |
| Harpy Feather Duster | Broken urns can drop healing. | item, healing |
| Lucky Tooth | Extra revive. | item, revive |
| Thunder Signet | Next Olympian boon from Zeus; Zeus rarity chance. | item, draft, zeus |
| Conch Shell | Next Olympian boon from Poseidon. | item, draft, poseidon |
| Owl Pendant | Next Olympian boon from Athena. | item, draft, athena |
| Eternal Rose | Next Olympian boon from Aphrodite. | item, draft, aphrodite |
| Blood-Filled Vial | Next Olympian boon from Ares. | item, draft, ares |
| Adamant Arrowhead | Next Olympian boon from Artemis. | item, draft, artemis |
| Overflowing Cup | Next Olympian boon from Dionysus. | item, draft, dionysus |
| Frostbitten Horn | Next Olympian boon from Demeter. | item, draft, demeter |
| Lambent Plume | Clear encounters fast to gain dodge/move speed. | item, speed, skill-scaling |
| Cosmic Egg | Enter Chaos Gates without health cost; Chaos rarity chance. | item, chaos, draft |
| Shattered Shackle | Boost un-booned Attack/Special/Cast. | item, build-constraint |
| Evergreen Acorn | Block first hits from boss encounters. | item, boss, defense |
| Broken Spearpoint | After taking damage, become briefly invulnerable. | item, defense |
| Pom Blossom | Random boon levels up after several chambers. | item, upgrade |
| Sigil of the Dead | Replaces Call with Hades' Aid / invisibility-style call. | item, call, stealth |

## Pact / difficulty modifier candidates

| Pact condition | Source behavior summary | Tags |
|---|---|---|
| Hard Labor | Enemies deal more damage. | difficulty, enemy-damage |
| Lasting Consequences | Healing reduced. | difficulty, healing |
| Convenience Fee | Shop prices increased. | difficulty, economy |
| Jury Summons | More enemies. | difficulty, wave |
| Extreme Measures | Bosses become harder/modified. | difficulty, boss |
| Calisthenics Program | Enemies have more health. | difficulty, enemy-health |
| Benefits Package | Armored foes gain perks. | difficulty, elite-modifier |
| Middle Management | Miniboss encounters become harder. | difficulty, miniboss |
| Underworld Customs | Must purge a boon after each region. | difficulty, deck-thinning |
| Forced Overtime | Enemies move/attack faster. | difficulty, speed |
| Heightened Security | Traps deal much more damage. | difficulty, traps |
| Routine Inspection | Mirror talents are disabled by tiers. | difficulty, passive-disable |
| Damage Control | Enemies ignore first hits via shield layers. | difficulty, hit-shield |
| Approval Process | Fewer boon/reward choices. | difficulty, draft |
| Tight Deadline | Time limit. | difficulty, timer |

## Notes for later Slay-the-Spire-style structure

- Cards: Active casts/calls, Diablo-like actives, Hades casts, companion calls, temporary weapon stance cards.
- Items/relics: Keepsakes, Mirror talents, passives, boons that are always-on rules.
- Potions: Companions, Sunken Treasure-style bursts, single-room god effects, temporary Calls.
- Upgrades: Daedalus Hammers, Aspect modifiers, Duo/Legendary boons, Pom-like level ups.
- Curses: Chaos curse/blessing pairs and Pact conditions.
