import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WIZARD_NEXT_TWENTY_CARDS } from '../src/wizard-next-twenty-cards.js';

const scriptDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(scriptDir,'..');
const notesDir=path.join(root,'archive','wizard-of-legend','source-notes');
const read=name=>fs.readFileSync(path.join(notesDir,name),'utf8').replace(/\r\n/g,'\n');
const slugify=value=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

const improvedText=[
  read('wizard_of_legend_arcana_source_reference.md'),
  read('01-ignition-air.md'),
  read('02-gust-razor.md'),
  read('03-spike-toxic.md'),
  read('04-snare-thunder.md'),
  read('05-circuit-shock.md'),
  read('06-water-chaos-dashes.md'),
  read('07-fire-standards-1.md'),
  read('08-fire-standards-2.md'),
  read('09-fire-standards-3.md'),
  read('10-fire-standards-4.md'),
  read('11-air-standards-1.md'),
  read('12-air-standards-2.md'),
  read('13-water-prison.md'),
  read('14-archetype-sampler.md'),
].join('\n\n');
const spellLanguage=read('wizard_of_legend_spell_language.md');
const inventoryLedgerText=read('gate1-video-inventory.md');
const onlineReferenceText=read('gate2-online-reference.md');

function parseLedgerNumber(value,label){
  const parsed=Number(value);
  if(!Number.isFinite(parsed))throw new Error(`Inventory ledger has a non-numeric ${label}: ${value}`);
  return parsed;
}

function parseInventoryLedger(text){
  const rows=[...text.matchAll(/^\|\s*(\d+)\s*\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|\s*$/gm)];
  if(rows.length===0)throw new Error('Inventory ledger contains no Arcana rows');
  const entries=rows.map(row=>{
    const [,order,name,element,category,baseStart,baseEnd,chargedStart,chargedEnd]=row.map(value=>value.trim());
    const segments=[{kind:'base',start:parseLedgerNumber(baseStart,'base start'),end:parseLedgerNumber(baseEnd,'base end')}];
    if(chargedStart!=='—'||chargedEnd!=='—'){
      segments.push({kind:'charged',start:parseLedgerNumber(chargedStart,'charged start'),end:parseLedgerNumber(chargedEnd,'charged end')});
    }
    return{
      order:Number(order),name,element,category,segments,
      showcaseWindow:{
        start:Math.min(...segments.map(segment=>segment.start)),
        end:Math.max(...segments.map(segment=>segment.end)),
      },
    };
  });
  entries.forEach((entry,index)=>{
    if(entry.order!==index+1)throw new Error(`Inventory ledger order must be contiguous showcase order; row ${index+1} declares ${entry.order}`);
    for(const segment of entry.segments){
      if(!(segment.end>segment.start))throw new Error(`${entry.name} inventory window must advance in time`);
    }
    const previous=entries[index-1];
    if(previous&&entry.showcaseWindow.start<previous.showcaseWindow.start){
      throw new Error(`Inventory ledger must stay in showcase order; ${entry.name} precedes ${previous.name}`);
    }
  });
  const readMeta=(label,pattern)=>{
    const match=new RegExp(`^- \\*\\*${label}:\\*\\* (.+)$`,'m').exec(text);
    if(!match)throw new Error(`Inventory ledger is missing its ${label} header`);
    const value=match[1].trim();
    if(pattern&&!pattern.test(value))throw new Error(`Inventory ledger ${label} is malformed: ${value}`);
    return value;
  };
  const meta={
    distinctArcana:Number(readMeta('Distinct Arcana',/^\d+$/)),
    timestampedDemonstrations:Number(readMeta('Timestamped demonstrations',/^\d+$/)),
    chargedDemonstrations:Number(readMeta('Arcana with a separate charged demonstration',/^\d+$/)),
    auditedAt:readMeta('Audited',/^\d{4}-\d{2}-\d{2}$/),
    authority:readMeta('Authority'),
  };
  const charged=entries.filter(entry=>entry.segments.length>1).length;
  if(meta.distinctArcana!==entries.length)throw new Error(`Inventory ledger claims ${meta.distinctArcana} Arcana but lists ${entries.length}`);
  if(meta.chargedDemonstrations!==charged)throw new Error(`Inventory ledger claims ${meta.chargedDemonstrations} charged demonstrations but lists ${charged}`);
  if(meta.timestampedDemonstrations!==entries.length+charged)throw new Error(`Inventory ledger demonstration total must equal ${entries.length+charged}`);
  return{entries,meta};
}

function parseOnlineReference(text){
  const headings=[...text.matchAll(/^## (\d+)\. ([^\n]+)$/gm)];
  if(headings.length!==149)throw new Error(`Online Arcana reference must contain 149 entries; found ${headings.length}`);
  const references=new Map();
  for(let index=0;index<headings.length;index+=1){
    const match=headings[index];
    if(Number(match[1])!==index+1)throw new Error(`Online Arcana reference order must be contiguous; row ${index+1} declares ${match[1]}`);
    const end=headings[index+1]?.index??text.length;
    const markdown=text.slice(match.index,end).trim();
    const name=match[2].trim();
    const fields={};
    for(const field of markdown.matchAll(/^- \*\*([^*]+):\*\* (.+)$/gm))fields[field[1].trim()]=field[2].trim();
    const sourceUrl=fields.Source?.match(/\((https?:\/\/[^)]+)\)/)?.[1]??'';
    if(fields.Evidence!=='documented-online')throw new Error(`${name} online reference must use documented-online evidence`);
    if(!sourceUrl)throw new Error(`${name} online reference is missing a source URL`);
    const documentedBehavior=fields['Wiki behavior']??fields['Documented behavior']??'';
    const enhanced=fields['Wiki enhanced behavior']??fields.Enhanced??'';
    references.set(slugify(name),{
      markdown,
      fields,
      sourceUrl,
      evidence:fields.Evidence,
      documentedBehavior,
      enhanced,
      wikiElement:fields['Wiki element']??'',
      wikiType:fields['Wiki type']??'',
      wikiSubtypes:fields['Wiki subtypes']??'',
      wikiStats:fields['Wiki stats']??'',
      wikiEnhancedStats:fields['Wiki enhanced stats']??'',
      wikiStrategies:fields['Wiki strategy notes']??'',
      wikiAdditionalNotes:fields['Wiki additional notes']??'',
    });
  }
  if(references.size!==149)throw new Error(`Online Arcana reference names must be unique; found ${references.size}`);
  return references;
}

function formatClock(seconds){
  const minutes=Math.floor(seconds/60);
  return `${minutes}:${String(Math.floor(seconds-minutes*60)).padStart(2,'0')}`;
}

function extractNumberedH1(text){
  const headings=[...text.matchAll(/^# ([^\n]+)$/gm)];
  const sections=new Map();
  for(let index=0;index<headings.length;index+=1){
    const match=headings[index];
    const parsed=match[1].match(/^(\d+)\.\s+(.+)$/);
    if(!parsed)continue;
    const end=headings[index+1]?.index??text.length;
    sections.set(Number(parsed[1]),{
      name:parsed[2].trim(),
      markdown:text.slice(match.index,end).trim(),
    });
  }
  return sections;
}

function extractH2(text,heading){
  const escaped=heading.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const match=new RegExp(`^## ${escaped}\\s*$`,'mi').exec(text);
  if(!match)return'';
  const rest=text.slice(match.index+match[0].length);
  const next=/^##?\s+/m.exec(rest);
  return text.slice(match.index,match.index+match[0].length+(next?.index??rest.length)).trim();
}

function extractSubheading(text,heading){
  const escaped=heading.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const match=new RegExp(`^(#{2,6}) ${escaped}\\s*$`,'mi').exec(text);
  if(!match)return'';
  const rest=text.slice(match.index+match[0].length);
  const next=/^#{1,6}\s+/m.exec(rest);
  return text.slice(match.index,match.index+match[0].length+(next?.index??rest.length)).trim();
}

function extractNumberedH2(text,number,name){
  const heading=`${number} ${name}`;
  const match=[...text.matchAll(/^## ([^\n]+)$/gm)].find(item=>item[1].startsWith(heading));
  if(!match)return'';
  const rest=text.slice(match.index+match[0].length);
  const next=/^##\s+/m.exec(rest);
  return text.slice(match.index,match.index+match[0].length+(next?.index??rest.length)).trim();
}

function plainText(markdown){
  return markdown
    .replace(/```[\s\S]*?```/g,' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g,' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')
    .replace(/^#{1,6}\s+.*$/gm,' ')
    .replace(/[*_`>|]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function summaryFor(name,markdown){
  const blocks=markdown.split(/\n\s*\n/).map(block=>plainText(block)).filter(Boolean);
  return blocks.find(block=>new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')} (?:is|begins|creates|turns|sends|launches|uses)`,'i').test(block))
    ??blocks.find(block=>block.length>100&&!/^VIDEO|^DOCUMENTED/i.test(block))
    ??blocks[0]
    ??'';
}

function unitsFor(markdown){
  return [...markdown.matchAll(/^### \*\*(.+?)\*\*\s*$/gm)].map(match=>match[1].trim());
}

function linksFor(markdown){
  return [...new Set([...markdown.matchAll(/https?:\/\/[^)\s]+/g)].map(match=>match[0].replace(/[.,;]+$/,'')))];
}

function issueBlocks(markdown){
  const headings=[...markdown.matchAll(/^## ([^\n]+)$/gm)];
  const selected=[];
  for(let index=0;index<headings.length;index+=1){
    const title=headings[index][1];
    if(!/(important|conflict|discrepancy|unresolved|version-sensitive|distinction|why the zero|superseded)/i.test(title))continue;
    const end=headings[index+1]?.index??markdown.length;
    selected.push(markdown.slice(headings[index].index,end).trim());
  }
  return selected.join('\n\n');
}

const sourceMeta=[
  ['Flame Strike','Fire','Basic',0,5.1],
  ['Flame Cross','Fire','Basic',5.15,11.5],
  ['Bouncing Blaze','Fire','Basic',12,18.1],
  ['Wind Slash','Air','Basic',18.7,23.5],
  ['Air Spinner','Air','Basic',23.7,28.5],
  ['Perforating Jet','Air','Basic',28.7,31.1],
  ['Earth Knuckles','Earth','Basic',31.4,38.5],
  ['Bladed Vine','Earth','Basic',38.6,43],
  ['Stone Shot','Earth','Basic',43,46],
  ['Spark Contact','Lightning','Basic',46,51],
  ['Bolt Rail','Lightning','Basic',52,57],
  ['Volt Disc','Lightning','Basic',58,63],
  ['Ice Dagger','Ice','Basic',64,69],
  ['Rip Tide','Water','Basic',69,75],
  ['Aqua Arc','Water','Basic',75,80],
  ['Chaos Crusher','Chaos','Basic',80,91],
  ['Searing Rush','Fire','Dash',91,99.5],
  ['Flare Rush','Fire','Dash',99.5,104],
  ['Ignition Rush','Fire','Dash',104,110],
  ['Air Burst','Air','Dash',110,114.7],
  ['Gust Burst','Air','Dash',114.7,124.7],
  ['Razor Burst','Air','Dash',124.8,132.3],
  ['Spike Track','Earth','Dash',132.3,139.3],
  ['Toxic Trap','Earth','Dash',139.4,147.3],
  ['Snare Track','Earth','Dash',147.4,151.3],
  ['Thunder Line','Lightning','Dash',151.4,157.8],
  ['Circuit Line','Lightning','Dash',157.9,165.8],
  ['Shock Line','Lightning','Dash',165.9,168.3],
  ['Wave Front','Water','Dash',168.4,180],
  ['Frost Feint','Ice','Dash',180,183],
  ['Frost Wing','Ice','Dash',183,194],
  ['Chaotic Rift','Chaos','Dash',194,205],
  ['Fuelled Berserk','Fire','Standard',205,217,211],
  ['Flame Breath','Fire','Signature',217,227,224],
  ['Searing Crown','Fire','Standard',227,233,230],
  ['Heroic Blaze','Fire','Signature',233,244,238],
  ['Blazing Lariat','Fire','Signature',244,255,250],
  ['Blazing Vault','Fire','Standard',255,259,257],
  ['Explosive Charge','Fire','Standard',259,265,262],
  ['Blazing Blitz','Fire','Signature',265,274,270],
  ['Blazing Onslaught','Fire','Standard',274,279,277],
  ['Homing Flares','Fire','Signature',279,299,286],
  ['Tracer Barrage','Fire','Signature',299,310,307],
  ['Dragon Arc','Fire','Signature',310,315,313],
  ['Exploding Fireball','Fire','Signature',315,325,322],
  ['Flame Cleaver','Fire','Signature',325,337,331],
  ['Flame Fusion','Fire','Standard',337,342,340],
  ['Raging Inferno','Fire','Standard',342,353,347],
  ['Ignition Drive','Fire','Standard',353,357,355],
  ['Fire Wall','Fire','Standard',357,363,360],
  ['Crashing Meteor','Fire','Signature',363,369,366],
  ['Engulfing Fissure','Fire','Standard',369,378,375],
  ['Rapid Fire Agent','Fire','Standard',378,391,384],
  ['Ward of Flames','Fire','Standard',391,402,397],
  ['Evading Zephyr','Air','Standard',402,407,405],
  ['Spiraling Typhoon','Air','Signature',407,418,414],
  ['Dragon Blast','Air','Standard',418,420,419],
  ['Whirling Tornado','Air','Signature',420,430,427],
  ['Scales of Babylon','Air','Standard',430,434,432],
  ['Mentis Imperium','Air','Standard',434,438,436],
  ['Airborne Slam','Air','Standard',438,442,440],
  ['Heroic Leap','Air','Standard',442,446,444],
  ['Tearing Whirlwind','Air','Signature',446,461,456],
  ['Shearing Chain','Air','Signature',461,472,468],
  ['Rushing Typhoon','Air','Standard',472,476,474],
  ['Gale-force Alignment','Air','Standard',476,480,478],
  ['Water Prison','Water','Standard',1048.5,1060,1054.5],
  ['Cyclone Boomerang','Air','Signature',492,504,497],
  ['Earthen Aegis','Earth','Standard',597,608,601],
  ['Ball Lightning','Lightning','Signature',893,909,900],
  ['Aqua Beam','Water','Signature',1118,1129,1123],
  ['Arcane Intervention','Chaos','Signature',1203,1219,1211],
];

const implementedNames=new Set([
  'Flame Strike','Flame Cross','Bouncing Blaze','Wind Slash','Air Spinner',
  'Perforating Jet','Earth Knuckles','Bladed Vine','Stone Shot','Spark Contact',
  'Bolt Rail','Volt Disc','Homing Flares','Dragon Arc','Whirling Tornado','Water Prison',
  'Flame Fusion','Rapid Fire Agent','Ward of Flames','Mentis Imperium','Heroic Leap',
  'Cyclone Boomerang','Earthen Aegis','Ball Lightning','Aqua Beam','Arcane Intervention',
  ...WIZARD_NEXT_TWENTY_CARDS.map(card=>card.name),
]);
const referenceLockWindows=new Map([
  ['Whirling Tornado',{start:420.80,end:421.70}],
  ['Water Prison',{start:1051.83,end:1060.00}],
  ['Homing Flares',{start:280.40,end:282.50}],
  ['Bolt Rail',{start:53.30,end:53.95}],
  ['Volt Disc',{start:58.20,end:59.10}],
  ['Flame Fusion',{start:338.55,end:339.45}],
  ['Rapid Fire Agent',{start:378.35,end:389.10}],
  ['Ward of Flames',{start:392.45,end:400.45}],
  ['Mentis Imperium',{start:434.15,end:436.90}],
  ['Heroic Leap',{start:442.85,end:444.25}],
  ['Cyclone Boomerang',{start:496.40,end:497.90}],
  ['Earthen Aegis',{start:600.95,end:605.55}],
  ['Ball Lightning',{start:896.40,end:901.00}],
  ['Aqua Beam',{start:1120.70,end:1122.75}],
  ['Arcane Intervention',{start:1206.60,end:1211.35}],
]);
for(const card of WIZARD_NEXT_TWENTY_CARDS)referenceLockWindows.set(card.name,{...card.sourceClip});
const referenceLockAddenda=new Map([
  ['Whirling Tornado',`## Reference-lock frame audit

**[EVIDENCE — supplied 60 FPS showcase, 07:00.80–07:01.70]** The base cast stays centered on the caster. Its visible white, ice-blue, and turquoise brushstrokes fill the same broad circular footprint as the damaging zone, remain dense through the four authored ticks, then collapse into one readable outward blast.

**[EVIDENCE — documented contract]** The base form lasts 0.8 seconds, damages at 0.12 / 0.30 / 0.48 / 0.66 seconds for 8 each, destroys eligible hostile projectiles, and ends with one 10-damage outward finisher.

**[INFERENCE — Top Down Game construction]** Individual brushstroke count, procedural curl, glow falloff, and transient opacity are authored approximations. Preserve the measured footprint, stationary ownership, tick schedule, projectile interception, and collapse silhouette when tuning them.`],
  ['Water Prison',`## Reference-lock frame audit

**[EVIDENCE — supplied 60 FPS showcase, 17:31.83–17:40.00]** Water Prison begins as a very small pale carrier and transforms on first contact into a substantially larger, target-attached translucent globe with a bright moving core, rim, and orbiting droplets. A later cast can coexist with an earlier prison.

**[EVIDENCE — documented contract]** Base ammo is two. First contact deals 15 damage, five one-second ticks deal 5 each, the lock lasts 5.4 seconds in this implementation, instances stack independently, and target death releases and cleans its owned prison.

**[INFERENCE — Top Down Game construction]** Shell layer count, core orbit, droplet paths, and exact alpha are procedural approximations. The tiny-carrier / large-attached-prison scale change and independent ownership are mandatory comparison anchors.`],
  ['Homing Flares',`## Reference-lock frame audit

**[EVIDENCE — supplied 60 FPS showcase, 04:40.40–04:42.50]** Seven large orange-gold flame lobes form a wide clockwise owner-following halo. Stored flares have hot cores and tapered tails, then peel away on expressive curves and resolve with chunky contact flashes rather than reading as small beads.

**[EVIDENCE — documented contract]** Each of seven flares independently acquires the nearest eligible target, deals 7 damage and 15 knockback, can trade itself for an eligible hostile projectile, and an unused stored flare expires at exactly 4.0 seconds. Launched carriers keep their own flight lifetime.

**[INFERENCE — Top Down Game construction]** The precise launch spline, smoke cadence, and ember density are authored approximations. Count, clockwise ownership, four-second unused expiry, independent acquisition, split targeting, and interception are contract-locked.`],
  ['Bolt Rail',`## Reference-lock frame audit

**[EVIDENCE — supplied 60 FPS showcase, 00:53.30–00:53.95]** A complete base string presents five rapid beats as one thick, irregular yellow-white lightning stream from the caster toward the actual contact point, with smaller side branches and endpoint blooms. The successful fifth-contact burst is clearly stronger and appears around 00:53.75–00:53.80.

**[EVIDENCE — documented contract]** Each successful stream deals 5 damage, streams bypass ordinary world collision, and only a fifth beat that contacts an enemy creates the additional 10-damage burst.

**[INFERENCE — Top Down Game construction]** Branch placement, jitter phase, glow thickness, and bloom particle count are deterministic authored approximations. The renderer must stop at the actual contact/range endpoint and must not restore the rejected parallel full-range lines.`],
  ['Volt Disc',`## Reference-lock frame audit

**[EVIDENCE — supplied 60 FPS showcase, 00:58.20–00:59.10]** The base combo emits one compact bright hollow electric ring per press. Each carrier has a hot rim, rotating fragments, a short travel trail, and a compact gold-white resolution rather than a solid ball or a continuous auto-fired string.

**[EVIDENCE — documented contract]** The carrier deals 9 damage; maximum-range resolution carries a separate 9-damage burst; direct contact also emits a zero-damage event that must not create ordinary health, stun, knockback, or damage-flash side effects.

**[INFERENCE — temporary Top Down Game input rule]** The three-press same-slot lock and 0.9-second rolling timeout are an explicit temporary integration choice. The supplied base window does not establish a damaging wall burst, so wall contact remains a harmless cleanup/fizzle unless later frame evidence disproves it.`],
]);
const samplerReferenceNotes=new Map([
  ['Flame Fusion','The base clip separates a slow fireball from a later live-aim arrow; only their real collision creates the five-arrow fan. Parent speed, collision timing, and fan silhouette are source anchors.'],
  ['Rapid Fire Agent','The base clip shows one very small flame-bodied agent lasting about ten seconds and firing large smoke-trailed shots about 0.4 seconds apart. Follow, leash teleport, enemy targeting of the agent, and 50 HP are documented or integration behavior rather than actions demonstrated in this stationary-caster clip.'],
  ['Ward of Flames','The base clip shows a thick irregular flame ring placed ahead of the caster: 25 displayed placement damage, then 6 displayed at one-second pulse intervals because its raw 5 Fire pulse receives the ward\'s own 20% amplification. Destructibility and enhanced behavior are documented but not demonstrated here.'],
  ['Mentis Imperium','The base clip establishes an enormous white-gray charm cloud with red-pink heart motes and enemies changing allegiance. The 35 projectile damage, range, immunity, and cross-family faction plumbing are documented or integration behavior, not visually proved in this window.'],
  ['Heroic Leap','The base clip separates a short rush, roughly 0.8 seconds airborne over a dense pale-cyan vortex about five to six actor footprints wide, optional carried target, and landing. A carried target visibly resolves the separate 25 plus 50 payload; collision-safe movement and large-target immunity are explicit integration rules.'],
  ['Cyclone Boomerang','The base clip shows one broad rotating current completing a fast outbound-return trip in about 0.8 seconds, with separate 15-damage contacts and a visible brushstroke wake. Its collision-clipped turn point and live-owner return are deterministic Top Down integrations.'],
  ['Earthen Aegis','The base clip shows eight upright, independently yawing stone plates in fixed owner-relative slots after a brief settle; the entire formation does not keep orbiting. Projectile interception is documented but not demonstrated in this window.'],
  ['Ball Lightning','The base clip shows one roughly 1.6-second full hold, a compact white-gold carrier, and a target-attached pulse strobe. Quick-release tiers and interruption are documented behavior rather than demonstrations in this window.'],
  ['Aqua Beam','The base clip shows one high-pressure beam with a white core, blue body, ragged spray, droplets, and about a 20-degree demonstrated sweep. Stock, projectile destruction, and wall clipping remain documented mechanics rather than actions proved by this window.'],
  ['Arcane Intervention','The base clip shows a rod and faint capture sigil followed about 1.8-2.0 seconds later by paired void disks, a defining opaque black arrival disk, and a purple storm. The footage does not reveal whether reactivation or expiry triggered it; safe landing offsets are deterministic integration inference.'],
]);
for(const [name,note] of samplerReferenceNotes){
  const window=referenceLockWindows.get(name);
  referenceLockAddenda.set(name,`## Reference-lock frame audit

**[EVIDENCE - supplied 60 FPS showcase, ${window.start.toFixed(2)}-${window.end.toFixed(2)}s]** ${note}

**[EVIDENCE - documented base contract]** Damage, cadence, resource, control, and duration values in the exact recipe are the base-form contract. Enhanced and charged mutations remain documented but disabled.

**[INFERENCE - Top Down Game construction]** Procedural geometry, glow, particles, safe wall handling, deterministic stable IDs, and capture telemetry are authored integrations. They may improve readability without changing the source-owned emission count, path, timing, hit ownership, or cleanup.`);
}
for(const card of WIZARD_NEXT_TWENTY_CARDS){
  const documented=card.details.rows.map(([label,value])=>`${label}: ${value}`).join(' ');
  const dashNote=card.dashMotion
    ? card.dashMotion.kind==='continuous'
      ? 'The accepted Top Down Game basic-dash movement profile is intentionally reused; source comparison is anchored to the payload position, scale, timing, and behavior along the actual collision-clipped route.'
      : 'Direction selection and four-diameter targeting reuse the accepted dash language, while visible travel is deliberately replaced by the source-required fixed-delay teleport.'
    : 'Combo input is adapted to one Enemy Lab card activation while preserving the source beat ownership, aim policy, carrier form, damage, and cleanup.';
  referenceLockAddenda.set(card.name,`## Reference-lock frame audit

**[EVIDENCE — supplied 60 FPS showcase, ${card.sourceClip.start.toFixed(2)}–${card.sourceClip.end.toFixed(2)}s]** The base-form clip was reviewed frame-by-frame and retained as the visual contract for silhouette, emission order, elemental layering, contact readability, and cleanup. Enhanced, charged, and signature mutations remain disabled.

**[EVIDENCE — documented base contract]** ${card.details.summary} ${documented}

**[INFERENCE — Top Down Game construction]** ${dashNote} Procedural geometry, particles, glow falloff, and harmless wall fizzles are authored approximations; they must not change the documented payload or invent damage through scenery.`);
}
const rebuiltNames=new Set(['Flame Cross','Bouncing Blaze','Homing Flares','Dragon Arc','Whirling Tornado','Water Prison']);
const supplements=new Map([
  ['Flame Strike',read('wizard_of_legend_flame_strike_spec.md')],
  ['Flame Cross',read('wizard_of_legend_flame_cross_spec.md')],
  ['Bouncing Blaze',read('wizard_of_legend_bouncing_blaze_spec.md')],
]);
const revisionHistory=new Map([
  ['Flame Cross','The first version spawned two stationary crossing bars immediately. Source-first review showed a three-beat 1 → 1 → 2 string of moving, piercing diagonal waves, with the final pair able to overlap-hit a centered target; the implementation was rebuilt around that cadence and geometry.'],
  ['Bouncing Blaze','The first version was one fireball ricocheting from room walls. Source-first review showed a three-shot Basic combo whose projectiles make two authored forward ground hops, stop on base enemy contact, and gain piercing only when enhanced; the implementation was rebuilt as that projectile family.'],
  ['Homing Flares','The first version created five pre-timed seeking shots. Source-first review established seven independently owned stored flares, a four-second caster-following halo, 7 damage with documented knockback, and hostile-projectile interception. The later reference-lock pass corrected unused flare expiry to exactly four seconds and rebuilt the carrier as seven large orange-gold flame lobes with tapered trails and distinct launch, impact, and interception states. Final visual source comparison remains pending user review.'],
  ['Dragon Arc','The first version was one projectile following a broad sinusoidal world path: its motion idea was useful, but its ownership and stock rules were wrong. Source-first gameplay review established passive eight-charge stock, 0.6-second recovery, one piercing 8-damage dragon per spent charge, and live aim sampled throughout release. Three later visual passes corrected those rules but incorrectly replaced the large intertwined S motion with a narrow straight stream and were rejected. The replacement was rebuilt from a metric-validated deterministic double-helix motion proxy, then finished with an articulated segmented dragon silhouette and layered fire FX; final visual source comparison remains pending user review.'],
  ['Whirling Tornado','The first version was a traveling three-second pull zone with frame-timed damage. Source-first review established one stationary 0.8-second protective vortex, exactly four 8-damage ticks, projectile erasure, and one 10-damage outward finisher. The reference-lock pass aligned the visible footprint with the full damaging radius and replaced the undersized geometric rings with a broad layered white-blue brushstroke vortex and readable final blast. Final visual source comparison remains pending user review.'],
  ['Water Prison','The first version was one short 2.15-second stun bubble with rapid ticks and an invented final hit. Frame review and documentation established two-charge ammo, 15 impact plus exactly five 5-damage ticks, a five-to-six-second position lock, and independently timed stacking. The reference-lock pass separated the tiny traveling carrier from the large attached layered globe and added explicit attachment, tick, stacking, release, and cleanup telemetry. Final visual source comparison remains pending user review.'],
  ['Bolt Rail','The source-first gameplay pass established five instantaneous 5-damage streams, world-collision bypass, and a contact-gated 10-damage fifth-beat finisher. The reference-lock pass replaced the thin parallel-line placeholder with one irregular caster-to-contact yellow-white bolt, branching filaments, endpoint blooms, and a distinctly stronger successful finisher. Final visual source comparison remains pending user review.'],
  ['Volt Disc','The source-first gameplay pass established three short-range hollow carriers, 9 carrier damage, a 9-damage maximum-range burst, and a separate zero-damage direct-contact event. The reference-lock pass restored one disc per press through a temporary three-step card-slot lock, removed the unsupported damaging wall burst, isolated zero-damage contact semantics from ordinary damage reactions, and rebuilt the carrier and terminal FX. Final visual source comparison remains pending user review.'],
]);
for(const name of samplerReferenceNotes.keys())revisionHistory.set(name,'The base-form source analysis was converted into a deterministic Enemy Lab implementation through contract, source-render, and final-style gates. Source comparison remains pending user review; enhanced and charged variants remain documented but disabled.');
for(const card of WIZARD_NEXT_TWENTY_CARDS)revisionHistory.set(card.name,`The source-first analysis was converted into a deterministic base-form Enemy Lab implementation through contract, source-render, and final-style gates. ${card.dashMotion?'The payload is layered onto the already approved Top Down Game dash locomotion, with Chaotic Rift retaining its required teleport exception.':'The full authored Basic sequence is scheduled by one card activation.'} Source comparison remains pending user review; enhanced variants remain documented but disabled.`);

const inventory=parseInventoryLedger(inventoryLedgerText);
const inventoryBySlug=new Map(inventory.entries.map(entry=>[slugify(entry.name),entry]));
const onlineReferences=parseOnlineReference(onlineReferenceText);

const improvedSections=extractNumberedH1(improvedText);
const entries=sourceMeta.map((meta,index)=>{
  const [name,element,category,start,end,posterTime]=meta;
  const source=improvedSections.get(index+1);
  if(!source||source.name!==name)throw new Error(`Source section ${index+1} mismatch: expected ${name}, received ${source?.name}`);
  const markdown=source.markdown;
  const implemented=implementedNames.has(name);
  const lineage=rebuiltNames.has(name)?'rebuilt':implemented?'source-first':'analyzed';
  const referenceWindow=referenceLockWindows.get(name);
  const referenceLockAddendum=referenceLockAddenda.get(name);
  return{
    id:slugify(name),order:index+1,name,element,category,start,end,posterTime,lineage,
    ...(referenceWindow?{referenceWindow}:{}),
    status:implemented?'source-first-implemented':'not-implemented',
    defaults:{analysis:true,implementation:implemented,comparison:false},
    summary:summaryFor(name,markdown),
    recipe:extractH2(markdown,'Exact source recipe'),
    acceptance:extractH2(markdown,'Source-faithful acceptance test'),
    issues:issueBlocks(markdown),
    units:unitsFor(markdown),
    citations:linksFor(markdown),
    analysisMarkdown:[markdown,referenceLockAddendum].filter(Boolean).join('\n\n'),
    supplementMarkdown:supplements.get(name)??'',
    revisionHistory:revisionHistory.get(name)??'',
    poster:`media/wizard-of-legend/posters/${slugify(name)}.webp`,
  };
});

const legacyMeta=[
  ['Homing Flares','Fire','Standard',278,299,'3.4'],
  ['Dragon Arc','Fire','Standard',308,315,'3.5'],
  ['Whirling Tornado','Air','Standard',418.5,429,'3.6'],
  ['Water Prison','Water','Standard',1048.5,1060,'3.10'],
];
const legacyImplementationNotes=new Map([
  ['Homing Flares','The game currently creates five visible flares, staggers their release, and steers each toward the nearest living enemy for one hit. It omits the source count of seven, the four-second stored halo behavior, projectile interception, enhanced count/lifetime, and charged continuous feed.'],
  ['Dragon Arc','The game currently launches one forward projectile on a fixed sinusoidal side-to-side path and lets it hit several different enemies once. The source instead passively stocks up to eight charges and spends the available stock as a steerable sequence of piercing dragons.'],
  ['Whirling Tornado','The game currently creates a traveling circular pull zone that applies small repeated hits for about three seconds. The source base move is a stationary vortex around the caster that destroys projectiles, delivers an authored tick count, and ends with one strong space-making blast.'],
  ['Water Prison','The game currently launches one bubble, attaches it to the first enemy, repeatedly stuns and damages that target for about 2.15 seconds, then deals a final hit. It does not yet model the source two-charge ammo system, roughly five-to-six-second prison, documented impact-plus-five-tick schedule, stack behavior, or full position lock.'],
]);
const replacementChecklist='1. Rewatch the bounded source clip frame by frame.\n2. Replace the initial-pass claims with a full source-first analysis and explicit evidence labels.\n3. Implement the replacement in a separate ability task; do not polish the current prototype.\n4. Run the acceptance tests and compare the replacement side by side with the source clip.\n5. Check the three completion stages only after each is actually complete.';

for(const name of ['Homing Flares','Dragon Arc','Whirling Tornado','Water Prison']){
  const entry=entries.find(item=>item.name===name);
  if(!entry)throw new Error(`Missing reanalyzed replacement entry for ${name}`);
  entry.lineage='rebuilt';
}

for(const [name,element,category,start,end,section] of legacyMeta){
  if(entries.some(entry=>entry.name===name))continue;
  const markdown=extractNumberedH2(spellLanguage,section,name);
  if(!markdown)throw new Error(`Missing legacy source section for ${name}`);
  entries.push({
    id:slugify(name),order:entries.length+1,name,element,category,start,end,
    lineage:'legacy',status:'legacy-replace',
    defaults:{analysis:false,implementation:false,comparison:false},
    summary:summaryFor(name,markdown),
    recipe:extractSubheading(markdown,'Construction recipe'),
    acceptance:extractSubheading(markdown,'Future acceptance tests'),
    issues:'## Replacement rule\n\nDo not polish the current prototype. Re-analyze the supplied showcase with the source-first method, then replace the legacy implementation and compare the replacement against this clip.',
    units:[],citations:linksFor(markdown),analysisMarkdown:markdown,supplementMarkdown:'',
    revisionHistory:'',
    currentImplementation:legacyImplementationNotes.get(name),
    replacementChecklist,
    poster:`media/wizard-of-legend/posters/${slugify(name)}.webp`,
  });
}

const showcaseUrl='https://youtu.be/cDyS1-SM2zc';
for(const entry of entries){
  if(entry.citations.length===0)entry.citations.push(showcaseUrl);
}

// The Gate 1 ledger owns showcase order and the whole-second clip boundaries for
// every Arcana in the video, including the ones that already carry a full
// source-first analysis. Frame-audited reference locks stay separate.
for(const entry of entries){
  const record=inventoryBySlug.get(entry.id);
  if(!record)throw new Error(`${entry.name} is analyzed but missing from the Gate 1 video inventory ledger`);
  if(record.element!==entry.element||record.category!==entry.category){
    throw new Error(`${entry.name} classification disagrees with the inventory ledger: ${record.element}/${record.category}`);
  }
  entry.order=record.order;
  entry.name=record.name;
  entry.showcaseWindow=record.showcaseWindow;
  entry.showcaseSegments=record.segments;
}

const analyzedSlugs=new Set(entries.map(entry=>entry.id));
for(const record of inventory.entries){
  const id=slugify(record.name);
  if(analyzedSlugs.has(id))continue;
  const [base]=record.segments;
  const charged=record.segments.find(segment=>segment.kind==='charged');
  const window=`${formatClock(record.showcaseWindow.start)}–${formatClock(record.showcaseWindow.end)}`;
  const chargedNote=charged?` A separate charged demonstration begins at ${formatClock(charged.start)}.`:'';
  entries.push({
    id,order:record.order,name:record.name,element:record.element,category:record.category,
    start:record.showcaseWindow.start,end:record.showcaseWindow.end,
    showcaseWindow:record.showcaseWindow,showcaseSegments:record.segments,
    lineage:'inventory',status:'inventory-only',
    defaults:{analysis:false,implementation:false,comparison:false},
    summary:`Gate 1 video inventory record. ${record.name} appears in the source showcase from ${formatClock(record.showcaseWindow.start)} to ${formatClock(record.showcaseWindow.end)}.${chargedNote} Behavioral classification and detailed analysis are intentionally pending later gates.`,
    recipe:'',acceptance:'',issues:'',units:[],
    citations:[`https://www.youtube.com/watch?v=cDyS1-SM2zc&t=${Math.floor(record.showcaseWindow.start)}s`],
    analysisMarkdown:[
      '# Gate 1 video inventory',
      '',
      `- **On-screen title:** ${record.name}`,
      `- **Showcase window:** ${window}`,
      ...(charged?[`- **Charged demonstration:** begins at ${formatClock(charged.start)}`]:[]),
      '- **Gate status:** Inventoried from the video; behavioral alignment and detailed analysis have not started.',
    ].join('\n'),
    supplementMarkdown:'',revisionHistory:'',
    posterTime:base.start+1.5,
    poster:`media/wizard-of-legend/posters/${id}.webp`,
  });
}

for(const entry of entries){
  const online=onlineReferences.get(entry.id);
  if(!online)throw new Error(`${entry.name} is missing its documented-online reference`);
  entry.onlineReferenceMarkdown=online.markdown;
  entry.onlineReference={
    evidence:online.evidence,
    sourceUrl:online.sourceUrl,
    documentedBehavior:online.documentedBehavior,
    enhanced:online.enhanced,
    wikiElement:online.wikiElement,
    wikiType:online.wikiType,
    wikiSubtypes:online.wikiSubtypes,
    wikiStats:online.wikiStats,
    wikiEnhancedStats:online.wikiEnhancedStats,
    wikiStrategies:online.wikiStrategies,
    wikiAdditionalNotes:online.wikiAdditionalNotes,
    fields:online.fields,
  };
  if(!entry.citations.includes(online.sourceUrl))entry.citations.push(online.sourceUrl);
}
entries.sort((first,second)=>first.order-second.order);

const payload={
  schemaVersion:1,
  generatedFrom:'Archived Wizard of Legend source-first research notes',
  video:{
    src:'media/wizard-of-legend/wizard-of-legend-arcana-showcase-480p.mp4',
    duration:1329.296,
    sourceUrl:showcaseUrl,
    inventory:inventory.meta,
  },
  entries,
  frameworkMarkdown:spellLanguage,
};

const generatedPath=path.join(root,'tools','wizard-of-legend-arcana-checklist.html');
const fallbackTemplate=fs.readFileSync(path.join(scriptDir,'wol-checklist-template.html'),'utf8');
// PR 122's generated page carries the newer fullscreen rail viewer. Preserve
// that tracked shell when rebuilding; the older standalone template remains a
// fallback for a clean artifact build.
const existingTemplate=fs.existsSync(generatedPath)?fs.readFileSync(generatedPath,'utf8'):'';
const template=existingTemplate.includes('id="rail-app"')?existingTemplate:fallbackTemplate;
const safeJson=JSON.stringify(payload).replace(/</g,'\\u003c');
const html=template.includes('__WOL_DATA__')
  ? template.replace('__WOL_DATA__',safeJson).replace('__GENERATED_AT__',new Date().toISOString())
  : template.replace(/(<script id="wol-data" type="application\/json">)[\s\S]*?(<\/script>)/,`$1${safeJson}$2`);
fs.writeFileSync(generatedPath,html);
const inventoryOnly=entries.filter(entry=>entry.status==='inventory-only').length;
console.log(`Generated Wizard of Legend checklist with ${entries.length} entries (${entries.length-inventoryOnly} analyzed, ${inventoryOnly} inventory-only).`);
