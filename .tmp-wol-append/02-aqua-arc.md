# 15. Aqua Arc

## Concrete source form

### Evidence

**[VIDEO — approximately 75–80 seconds]**

Aqua Arc is a three-beat ranged basic string made from short, piercing streams of water.

Each ordinary stream:

- Begins just in front of the caster.
- Travels forward as a compact, curved body of water.
- Uses a bright white foaming front and a pale-blue trailing body.
- Occupies a narrow lane.
- Continues through struck targets.
- Dissipates after a relatively short travel distance.

The base sequence emits one stream on the first beat, one on the second, and two streams simultaneously on the third.

In the enhanced demonstration, every stream ends in a sharp, star-shaped icy burst at maximum range. The burst visibly extends the threatened endpoint beyond the ordinary water stream.

**[DOCUMENTED]**

Aqua Arc is a Water Basic Arcana with projectile subtype. Each stream deals 8 damage and pierces enemies.

Its three-cast combo is:

```text
Beat 1: one stream
Beat 2: one stream
Beat 3: two simultaneous streams
```

The complete base combo therefore contains four stream carriers. Their documented knockback progression is 5, 5, 8, and 8.

When enhanced, each stream creates a small icy endpoint burst at maximum range. Each burst deals 5 damage, increases effective range, and raises the full combo from four to eight hit events. The attack button can be held to perform the full combo. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Aqua_Arc))

The final two streams may occasionally display as one combined 16-damage number even though they remain separate source attacks. The icy burst does not convert Aqua Arc into an Ice-classified arcana. ([wizardoflegend.fandom.com](https://wizardoflegend.fandom.com/wiki/Aqua_Arc))

## Exact source recipe

```text
AQUA ARC

Input structure:
Three-beat basic combo
Hold performs full combo

Carrier:
Short independent water stream

Visual form:
Compact curved water body
Foaming white leading edge
Pale-blue trailing spray

Path:
Straight forward lane
Short range

Contact:
8 damage per stream
Pierces enemies
Continues after contact

Choreography:
Beat 1: one stream
Beat 2: one stream
Beat 3: two simultaneous streams

Base carrier count:
Four streams per complete combo

Finisher:
Adds a second simultaneous stream
Does not replace the original final stream

Enhanced mutation:
Every stream creates one endpoint ice burst
Burst occurs at maximum stream range
Burst deals 5 damage in a small area
Burst extends effective range

Enhanced carrier/event structure:
Four piercing stream hits
+ four endpoint burst hits
```

## Source-faithful acceptance test

1. The base combo contains three input beats.
2. Beat 1 emits exactly one water stream.
3. Beat 2 emits exactly one water stream.
4. Beat 3 emits exactly two simultaneous streams.
5. Each stream deals 8 damage.
6. Each stream pierces enemies.
7. The streams have short range and do not behave as long-lived water balls.
8. The two final streams remain independently damaging even when one 16-damage number is displayed.
9. Enhancement adds one endpoint burst to every stream, not only to the finisher.
10. Endpoint bursts occur at maximum range rather than on the first enemy contacted.
11. Each endpoint burst deals 5 damage in a small area.
12. The enhanced icy visual does not add freeze or change the arcana's elemental classification.

## Units extracted from Aqua Arc

### **Short Piercing Stream Carrier**

A compact moving carrier that visually reads as flowing material rather than an orb, beam, or long ribbon.

### **Paired-Carrier Finisher**

The final beat preserves its ordinary carrier and adds a second simultaneous copy.

```text
A
→ A
→ A + A
```

Unlike Flame Cross, the payoff does not depend on mirrored crossing paths.

### **Per-Carrier Endpoint Overlay**

Enhancement attaches a terminal effect to every carrier created by the combo.

```text
for each stream:
    travel
    expire at max range
    create endpoint burst
```

### **Range Extension by Secondary Footprint**

The projectile's own range need not increase. A new endpoint footprint can extend the total threatened distance.

### **Visual Sub-Element Without Classification Rewrite**

An icy visual and payload can be added to a Water spell without converting the source arcana into the Ice subcategory.

---
