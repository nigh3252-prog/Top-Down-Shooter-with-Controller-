import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
].join('\n\n');
const spellLanguage=read('wizard_of_legend_spell_language.md');

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
];

const implementedNames=new Set([
  'Flame Strike','Flame Cross','Bouncing Blaze','Wind Slash','Air Spinner',
  'Perforating Jet','Earth Knuckles','Bladed Vine','Stone Shot','Spark Contact',
  'Bolt Rail','Volt Disc','Homing Flares','Dragon Arc','Whirling Tornado','Water Prison',
]);
const rebuiltNames=new Set(['Flame Cross','Bouncing Blaze','Homing Flares','Dragon Arc','Whirling Tornado','Water Prison']);
const supplements=new Map([
  ['Flame Strike',read('wizard_of_legend_flame_strike_spec.md')],
  ['Flame Cross',read('wizard_of_legend_flame_cross_spec.md')],
  ['Bouncing Blaze',read('wizard_of_legend_bouncing_blaze_spec.md')],
]);
const revisionHistory=new Map([
  ['Flame Cross','The first version spawned two stationary crossing bars immediately. Source-first review showed a three-beat 1 → 1 → 2 string of moving, piercing diagonal waves, with the final pair able to overlap-hit a centered target; the implementation was rebuilt around that cadence and geometry.'],
  ['Bouncing Blaze','The first version was one fireball ricocheting from room walls. Source-first review showed a three-shot Basic combo whose projectiles make two authored forward ground hops, stop on base enemy contact, and gain piercing only when enhanced; the implementation was rebuilt as that projectile family.'],
  ['Homing Flares','The first version created five pre-timed seeking shots. Source-first review established seven independently owned stored flares, a four-second caster-following halo, 7 damage with documented knockback, and hostile-projectile interception; the prototype was replaced with that base behavior.'],
  ['Dragon Arc','The first version was one projectile following a sinusoidal world path. Source-first review established passive eight-charge stock, 0.6-second recovery, one piercing 8-damage dragon per spent charge, and live aim sampled throughout release; the prototype was replaced with that stock-fed stream. A second frame-by-frame visual pass then replaced the interim bead-chain carrier with broad open-jawed dragon silhouettes, layered yellow-to-orange flame bodies, independent flicker, muzzle flares, embers, and white-hot piercing impacts.'],
  ['Whirling Tornado','The first version was a traveling three-second pull zone with frame-timed damage. Source-first review established one stationary 0.8-second protective vortex, exactly four 8-damage ticks, projectile erasure, and one 10-damage outward finisher; the prototype was replaced around that authored schedule.'],
  ['Water Prison','The first version was one short 2.15-second stun bubble with rapid ticks and an invented final hit. Frame review and documentation established two-charge ammo, 15 impact plus exactly five 5-damage ticks, a five-to-six-second position lock, and independently timed stacking; the prototype was replaced with those ownership rules.'],
]);

const improvedSections=extractNumberedH1(improvedText);
const entries=sourceMeta.map((meta,index)=>{
  const [name,element,category,start,end,posterTime]=meta;
  const source=improvedSections.get(index+1);
  if(!source||source.name!==name)throw new Error(`Source section ${index+1} mismatch: expected ${name}, received ${source?.name}`);
  const markdown=source.markdown;
  const implemented=implementedNames.has(name);
  const lineage=rebuiltNames.has(name)?'rebuilt':implemented?'source-first':'analyzed';
  return{
    id:slugify(name),order:index+1,name,element,category,start,end,posterTime,lineage,
    status:implemented?'source-first-implemented':'not-implemented',
    defaults:{analysis:true,implementation:implemented,comparison:false},
    summary:summaryFor(name,markdown),
    recipe:extractH2(markdown,'Exact source recipe'),
    acceptance:extractH2(markdown,'Source-faithful acceptance test'),
    issues:issueBlocks(markdown),
    units:unitsFor(markdown),
    citations:linksFor(markdown),
    analysisMarkdown:markdown,
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

const payload={
  schemaVersion:1,
  generatedFrom:'Archived Wizard of Legend source-first research notes',
  video:{src:'media/wizard-of-legend/wizard-of-legend-arcana-showcase-480p.mp4',duration:1329.296,sourceUrl:showcaseUrl},
  entries,
  frameworkMarkdown:spellLanguage,
};

const template=fs.readFileSync(path.join(scriptDir,'wol-checklist-template.html'),'utf8');
const safeJson=JSON.stringify(payload).replace(/</g,'\\u003c');
const html=template
  .replace('__WOL_DATA__',safeJson)
  .replace('__GENERATED_AT__',new Date().toISOString());
fs.writeFileSync(path.join(root,'wizard-of-legend-arcana-checklist.html'),html);
console.log(`Generated Wizard of Legend checklist with ${entries.length} entries.`);
