import fs from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const execFileAsync = promisify(execFile);

const inventoryText = fs.readFileSync('archive/wizard-of-legend/source-notes/gate1-video-inventory.md', 'utf8');
const entries = [...inventoryText.matchAll(/^\|\s*(\d+)\s*\|([^|]+)\|([^|]+)\|([^|]+)\|/gm)]
  .map(match => ({
    order: Number(match[1]),
    name: match[2].trim(),
    element: match[3].trim(),
    category: match[4].trim(),
  }));

// The showcase ledger preserves the on-screen names. A small number of those
// names differ from the page titles used by the official Wizard of Legend Wiki.
const wikiAliases = new Map([
  ['Stalwart Defenses', 'Stalwart Defenders'],
  ['Deferred Dynamics', 'Deferred Dynamo'],
]);

const normalizeName = value => String(value ?? '')
  .toLowerCase()
  .replace(/[’']/g, '')
  .replace(/[^a-z0-9]+/g, '');

const wikiPageName = name => wikiAliases.get(name) ?? name;
const wikiUrl = name => `https://wizardoflegend.fandom.com/wiki/${encodeURIComponent(wikiPageName(name).replace(/ /g, '_'))}`;
const jinaUrl = name => `https://r.jina.ai/http://wizardoflegend.fandom.com/wiki/${encodeURIComponent(wikiPageName(name).replace(/ /g, '_'))}`;
const tidy = value => String(value ?? '').replace(/\r/g, '').trim();
const wikiCacheDir = process.env.WOL_WIKI_CACHE ?? '/tmp/wizard-of-legend-wiki-cache';
fs.mkdirSync(wikiCacheDir, {recursive: true});

function cachePath(name) {
  return wikiCacheDir + '/' + normalizeName(name) + '.md';
}

function stripWikiMarkup(value) {
  return tidy(value)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => label ?? target)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function markdownSection(text, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^## ${escaped}(?:\\[[^\\n]*\\])?\\s*$`, 'mi').exec(text);
  if (!match) return '';
  const rest = text.slice(match.index + match[0].length);
  const next = /^##\s+/m.exec(rest);
  return rest
    .slice(0, next?.index ?? rest.length)
    .split(/\n\|\s+\[v\]\(/)[0]
    .split(/\n!\[Image/)[0]
    .trim();
}

function sectionParagraphs(text) {
  return text.split(/\n\s*\n/)
    .map(block => stripWikiMarkup(block.replace(/^\s*[-*]\s+/gm, '')))
    .filter(block => block && !/^\[\d+ /.test(block) && !/^Element:\s*.+\s+Type:/i.test(block));
}

function infoboxRows(text) {
  const heading = /^## [^\n]+\s*$/m.exec(text);
  if (!heading) return new Map();
  const body = text.slice(heading.index);
  const rows = [];
  for (const line of body.split('\n')) {
    const match = line.match(/^\|\s*([^|]+?)\s*\|\s*(.*?)\s*\|\s*$/);
    if (!match) {
      if (rows.length && /^\*\*[^*]+\*\*/.test(line)) break;
      continue;
    }
    const key = stripWikiMarkup(match[1]);
    if (!key || key === 'Arcana' || key === ' ') continue;
    rows.push([key, stripWikiMarkup(match[2])]);
  }
  return new Map(rows);
}

function allInfoboxRows(text) {
  const heading = /^## [^\n]+\s*$/m.exec(text);
  if (!heading) return new Map();
  const body = text.slice(heading.index);
  const rows = new Map();
  for (const line of body.split('\n')) {
    const match = line.match(/^\|\s*([^|]+?)\s*\|\s*(.*?)\s*\|\s*$/);
    if (!match) {
      if (rows.size && /^\*\*[^*]+\*\*/.test(line)) break;
      continue;
    }
    const key = stripWikiMarkup(match[1]);
    if (!key || key === 'Arcana' || key === ' ') continue;
    const value = stripWikiMarkup(match[2]);
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(value);
  }
  return rows;
}

function firstSentence(text) {
  return text.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() ?? text;
}

function wikiBehavior(description) {
  return sectionParagraphs(description).join(' ');
}

function wikiEnhancedBehavior(description, enhancedDescriptions) {
  const explicit = enhancedDescriptions.filter(Boolean).join(' ');
  const body = sectionParagraphs(description)
    .filter(paragraph => /\b(?:if|when|once) enhanced\b|\benhanced version\b|\benhanced form\b/i.test(paragraph));
  return [...new Set([explicit, ...body])].filter(Boolean).join(' ');
}

function statsText(rows, keys) {
  return keys.flatMap(key => (rows.get(key) ?? []).map(value => `${key}: ${value}`)).join('; ');
}

function statsTextWithMode(rows, keys, mode) {
  return keys.flatMap(key => {
    const values = rows.get(key) ?? [];
    const selected = mode === 'base' ? values.slice(0, 1) : mode === 'enhanced' ? values.slice(1) : values;
    return selected.map(value => key + ': ' + value);
  }).join('; ');
}

async function fetchWiki(name, attempt = 1) {
  const cached = fs.existsSync(cachePath(name)) ? fs.readFileSync(cachePath(name), 'utf8') : '';
  if (cached) return parseWikiPage(name, cached);
  let body = '';
  let status = 0;
  try {
    const result = await execFileAsync('curl', ['-L', '--max-time', '60', '-A', 'Mozilla/5.0', '-sS', '-w', '\n__HTTP_STATUS__%{http_code}', jinaUrl(name)], {maxBuffer: 8 * 1024 * 1024});
    const marker = result.stdout.lastIndexOf('\n__HTTP_STATUS__');
    body = marker >= 0 ? result.stdout.slice(0, marker) : result.stdout;
    status = Number(marker >= 0 ? result.stdout.slice(marker).match(/(\d{3})$/)?.[1] : 0);
  } catch (error) {
    body = error.stdout ?? '';
    status = Number(error.stdout?.match(/__HTTP_STATUS__(\d{3})/)?.[1] ?? 0);
  }
  if (status !== 200 || !/^Title:\s*.+$/m.test(body) || !/^##\s+.+$/m.test(body)) {
    if (attempt < 3) {
      await new Promise(resolve => setTimeout(resolve, attempt * 1500));
      return fetchWiki(name, attempt + 1);
    }
    throw new Error(`Wiki fetch failed for ${name}: HTTP ${status}`);
  }

  fs.writeFileSync(cachePath(name), body);
  return parseWikiPage(name, body);
}

function parseWikiPage(name, body) {
  const title = tidy(body.match(/^Title:\s*(.+)$/m)?.[1]) || wikiPageName(name);
  const rows = allInfoboxRows(body);
  const description = markdownSection(body, 'Description');
  const strategies = markdownSection(body, 'Strategies');
  const additionalNotes = markdownSection(body, 'Additional notes');
  const descriptionValues = rows.get('Description') ?? [];
  const enhancedDescriptions = descriptionValues.slice(1);
  const sourceUrl = wikiUrl(name);
  const behavior = wikiBehavior(description);
  const enhanced = wikiEnhancedBehavior(description, enhancedDescriptions);
  const metadata = statsTextWithMode(rows, ['Element', 'Type', 'Subtypes', 'Damage', 'Hit Count', 'Knockback', 'Cooldown', 'Cost', 'Pool', 'Id'], 'base');

  if (!behavior) throw new Error(`Wiki page for ${name} has no Description section`);
  return {
    source: 'fandom-wiki',
    sourceName: title,
    sourceUrl,
    wikiElement: rows.get('Element')?.[0] ?? '',
    wikiType: rows.get('Type')?.[0] ?? '',
    wikiSubtypes: rows.get('Subtypes')?.[0] ?? '',
    wikiStats: metadata,
    wikiEnhancedStats: statsTextWithMode(rows, ['Damage', 'Hit Count', 'Knockback'], 'enhanced'),
    wikiDescription: behavior,
    wikiEnhanced: enhanced,
    wikiStrategies: wikiBehavior(strategies),
    wikiAdditionalNotes: wikiBehavior(additionalNotes),
  };
}

function previousReferenceFallback(name) {
  const previousPath = 'archive/wizard-of-legend/source-notes/gate2-online-reference.md';
  if (!fs.existsSync(previousPath)) return null;
  const previous = fs.readFileSync(previousPath, 'utf8');
  const escaped = name.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
  const match = new RegExp('^## \\d+\\. ' + escaped + '\\s*$', 'mi').exec(previous);
  if (!match) return null;
  const next = /^## \d+\. /m.exec(previous.slice(match.index + match[0].length));
  const section = previous.slice(match.index, match.index + match[0].length + (next?.index ?? previous.length)).trim();
  const fields = Object.fromEntries([...section.matchAll(/^- \*\*([^*]+):\*\* (.+)$/gm)].map(item => [item[1].trim(), item[2].trim()]));
  const sourceUrl = fields.Source?.match(/\((https?:\/\/[^)]+)\)/)?.[1] ?? '';
  if (!sourceUrl) return null;
  return {
    source: 'community-catalog-fallback',
    sourceName: fields['Catalog name'] ?? name,
    sourceUrl,
    wikiElement: fields['Catalog element'] ?? fields['Gate 1 element'] ?? '',
    wikiType: fields['Catalog type'] ?? fields['Gate 1 category'] ?? '',
    wikiSubtypes: '',
    wikiStats: fields['Documented stats'] ?? '',
    wikiEnhancedStats: '',
    wikiDescription: fields['Documented behavior'] ?? '',
    wikiEnhanced: fields.Enhanced ?? '',
    wikiStrategies: '',
    wikiAdditionalNotes: 'The individual Wiki page was unavailable during this refresh; this entry retains the prior catalog reference as an explicitly labeled fallback.',
  };
}

// Keep the source explicitly labeled if a page is temporarily unavailable. These
// are still wiki facts captured from the corresponding page, not catalog text.
const wikiFallbacks = new Map([
  ['gustburst', {
    source: 'fandom-wiki-fallback',
    sourceName: 'Gust Burst',
    sourceUrl: wikiUrl('Gust Burst'),
    wikiElement: 'Air',
    wikiType: 'Dash',
    wikiSubtypes: 'Movement',
    wikiStats: 'Damage: 5, 10; Hit Count: 2; Knockback: -20, 50; Cooldown: 3.5s per charge; Pool: 4',
    wikiDescription: 'Dash forward with such force that enemies in the area are pulled into your wake. The dash creates an initial burst and a following draught that pulls enemies toward the caster.',
    wikiEnhanced: 'Creates a secondary burst on landing.',
    wikiStrategies: '',
    wikiAdditionalNotes: '',
  }],
  ['snaretrack', {
    source: 'fandom-wiki-fallback',
    sourceName: 'Snare Track',
    sourceUrl: wikiUrl('Snare Track'),
    wikiElement: 'Earth',
    wikiType: 'Dash',
    wikiSubtypes: 'Movement',
    wikiStats: 'Damage: 20; Hit Count: 1; Cooldown: 6s; Pool: 4',
    wikiDescription: 'Tear forward as a trio of vines entangle enemies in your wake.',
    wikiEnhanced: 'All vines continue to travel and entangle enemies ahead.',
    wikiStrategies: '',
    wikiAdditionalNotes: '',
  }],
]);

const catalogFallbacks = new Map([
  ['galeforcealignment', {
    source: 'community-catalog-fallback',
    sourceName: 'Gale-Force Alignment',
    sourceUrl: 'https://wol.spread.name/',
    wikiElement: 'Air',
    wikiType: 'Standard',
    wikiStats: 'Catalog ID: UseVortexWave',
    wikiDescription: 'Unleash a flowing burst of wind that forcefully lines up foes it strikes!',
    wikiEnhanced: 'Alignment travels further and lasts longer!',
    wikiStrategies: '',
    wikiAdditionalNotes: 'The individual Wiki route returned a title shell without article content during this refresh; this entry retains the community catalog as an explicitly labeled fallback.',
  }],
  ['magneticfollowup', {
    source: 'community-catalog-fallback',
    sourceName: 'Magnetic Follow-Up',
    sourceUrl: 'https://wol.spread.name/',
    wikiElement: 'Earth',
    wikiType: 'Standard',
    wikiStats: 'Catalog ID: UseEarthEnhance',
    wikiDescription: 'Generates a magnetic aura that causes basic arcana to hurl stone projectiles!',
    wikiEnhanced: 'Instantly explodes a ring of stones that briefly stuns enemies they strike!',
    wikiStrategies: '',
    wikiAdditionalNotes: 'The individual Wiki route returned a title shell without article content during this refresh; this entry retains the community catalog as an explicitly labeled fallback.',
  }],
  ['rocksolidtomahawk', {
    source: 'community-catalog-fallback',
    sourceName: 'Rock-Solid Tomahawk',
    sourceUrl: 'https://wol.spread.name/',
    wikiElement: 'Earth',
    wikiType: 'Signature',
    wikiStats: 'Catalog ID: UseWhirlingAxe',
    wikiDescription: 'Form and hurl a stone tomahawk at your foes! Can be used repeatedly for a short duration.',
    wikiEnhanced: 'Throw two tomahawks at a time but each deals reduced damage!',
    wikiStrategies: '',
    wikiAdditionalNotes: 'The individual Wiki route returned a title shell without article content during this refresh; this entry retains the community catalog as an explicitly labeled fallback.',
  }],
  ['rocknroll', {
    source: 'community-catalog-fallback',
    sourceName: "Rock N' Roll",
    sourceUrl: 'https://wol.spread.name/',
    wikiElement: 'Earth',
    wikiType: 'Signature',
    wikiStats: 'Catalog ID: UseEarthWheel',
    wikiDescription: 'Form rocky buzzsaws that tear forward!',
    wikiEnhanced: 'Forms an additional buzzsaw!',
    wikiStrategies: '',
    wikiAdditionalNotes: 'The individual Wiki route returned a title shell without article content during this refresh; this entry retains the community catalog as an explicitly labeled fallback.',
  }],
  ['cascadingblitz', {
    source: 'community-catalog-fallback',
    sourceName: 'Cascading Blitz',
    sourceUrl: 'https://wol.spread.name/',
    wikiElement: 'Water',
    wikiType: 'Standard',
    wikiStats: 'Catalog ID: UseAquaBlitz',
    wikiDescription: 'Blasts out a chain of water blobs before using them to pummel foes with a series of blows!',
    wikiEnhanced: 'Envelops you with a ball of water to shield you that explodes at the end of your blitz!',
    wikiStrategies: '',
    wikiAdditionalNotes: 'The individual Wiki route returned a title shell without article content during this refresh; this entry retains the community catalog as an explicitly labeled fallback.',
  }],
]);

async function fetchAllWiki() {
  const results = new Map();
  const queue = [...entries];
  let completed = 0;
  async function worker() {
    while (queue.length) {
      const entry = queue.shift();
      try {
        results.set(entry.name, await fetchWiki(entry.name));
      } catch (error) {
        const fallback = wikiFallbacks.get(normalizeName(entry.name)) ?? catalogFallbacks.get(normalizeName(entry.name)) ?? previousReferenceFallback(entry.name);
        if (!fallback) throw error;
        results.set(entry.name, fallback);
        console.error('Wiki fallback for ' + entry.name + ': ' + error.message);
      }
      completed += 1;
      if (completed % 20 === 0 || completed === entries.length) console.error(`Fetched ${completed}/${entries.length} wiki pages.`);
    }
  }
  // Keep the proxy requests serialized in CI/managed shells; concurrent child
  // processes can be mistaken for an unapproved network fan-out.
  await Promise.all(Array.from({length: Number(process.env.WOL_WIKI_CONCURRENCY ?? 1)}, worker));
  return results;
}

const wikiByName = await fetchAllWiki();
const missing = entries.filter(entry => !wikiByName.has(entry.name)).map(entry => entry.name);
if (missing.length) throw new Error(`Wiki is missing ${missing.length} Gate 1 entries: ${missing.join(', ')}`);

const lines = [
  '# Gate 2 online Arcana reference',
  '',
  'This file attaches a detailed documented-online reference to the Gate 1 showcase inventory.',
  'It is deliberately separate from the source-first video analysis: the fields below come',
  'primarily from the individual Wizard of Legend Wiki page for each Arcana and are not claims',
  'about what the showcase clip visibly proves.',
  '',
  '- **Scope:** all 149 Arcana in the Gate 1 video ledger',
  '- **Evidence label:** `documented-online` / `[DOCUMENTED]`',
  '- **Retrieved:** 2026-08-10',
  '- **Primary reference:** <https://wizardoflegend.fandom.com/wiki/Arcana>',
  '- **Fetch route:** individual Fandom Arcana pages, read through a text-only page proxy',
  '',
];

for (const entry of entries) {
  const result = wikiByName.get(entry.name);
  const sourceLabel = result.source === 'fandom-wiki-fallback'
    ? `Wizard of Legend Wiki — ${result.sourceName} (captured fallback)`
    : result.source === 'community-catalog-fallback'
      ? 'Wizard of Legend community catalog (explicit fallback)'
      : `Wizard of Legend Wiki — ${result.sourceName}`;
  lines.push(`## ${entry.order}. ${entry.name}`, '',
    `- **Gate 1 element:** ${entry.element}`,
    `- **Gate 1 category:** ${entry.category}`,
    '- **Evidence:** documented-online',
    '- **Evidence label:** [DOCUMENTED]',
    `- **Source:** [${sourceLabel}](${result.sourceUrl})`);
  if (result.sourceName !== entry.name) lines.push(`- **Wiki page title:** ${result.sourceName}`);
  if (result.wikiElement) lines.push(`- **Wiki element:** ${result.wikiElement}`);
  if (result.wikiType) lines.push(`- **Wiki type:** ${result.wikiType}`);
  if (result.wikiSubtypes) lines.push(`- **Wiki subtypes:** ${result.wikiSubtypes}`);
  if (result.wikiStats) lines.push(`- **Wiki stats:** ${result.wikiStats}`);
  if (result.wikiEnhancedStats && result.wikiEnhancedStats !== result.wikiStats) lines.push(`- **Wiki enhanced stats:** ${result.wikiEnhancedStats}`);
  if (result.wikiDescription) lines.push(`- **Wiki behavior:** [DOCUMENTED] ${result.wikiDescription}`);
  if (result.wikiEnhanced) lines.push(`- **Wiki enhanced behavior:** [DOCUMENTED] ${result.wikiEnhanced}`);
  if (result.wikiStrategies) lines.push(`- **Wiki strategy notes:** [DOCUMENTED] ${result.wikiStrategies}`);
  if (result.wikiAdditionalNotes) lines.push(`- **Wiki additional notes:** [DOCUMENTED] ${result.wikiAdditionalNotes}`);
  lines.push('');
}

fs.writeFileSync('archive/wizard-of-legend/source-notes/gate2-online-reference.md', lines.join('\n'));
console.log(JSON.stringify({
  inventory: entries.length,
  wikiPages: wikiByName.size,
  documented: entries.length,
  sourceBreakdown: Object.fromEntries([...new Set([...wikiByName.values()].map(result => result.source))].map(source => [source, [...wikiByName.values()].filter(result => result.source === source).length])),
}, null, 2));
