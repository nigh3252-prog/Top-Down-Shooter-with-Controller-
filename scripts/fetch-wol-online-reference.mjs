import fs from 'node:fs';

const inventoryText = fs.readFileSync('archive/wizard-of-legend/source-notes/gate1-video-inventory.md', 'utf8');
const entries = [...inventoryText.matchAll(/^\|\s*(\d+)\s*\|([^|]+)\|([^|]+)\|([^|]+)\|/gm)]
  .map(match => ({
    order: Number(match[1]),
    name: match[2].trim(),
    element: match[3].trim(),
    category: match[4].trim(),
  }));

// The Gate 1 ledger preserves the names used by the showcase. The public catalog
// uses the community names for these two entries.
const onlineAliases = new Map([
  ['Stalwart Defenses', 'Stalwart Defenders'],
  ['Deferred Dynamics', 'Deferred Dynamo'],
]);

const normalizeName = value => String(value ?? '')
  .toLowerCase()
  .replace(/[’']/g, '')
  .replace(/[^a-z0-9]+/g, '');

const catalogName = name => onlineAliases.get(name) ?? name;
const tidy = value => String(value ?? '').replace(/\r/g, '').trim();

// These two legacy showcase names are not present in the current v1.23.4a
// catalog snapshot, so retain their documented wiki records as a narrow fallback.
const wikiFallbacks = new Map([
  ['gustburst', {
    sourceName: 'Gust Burst',
    sourceUrl: 'https://wizardoflegend.fandom.com/wiki/Gust_Burst',
    catalogType: 'Dash',
    catalogElement: 'Air',
    description: 'Dash forward with such force that enemies in the area are pulled into your wake!',
    enhanced: 'Creates a secondary burst on landing!',
    stats: 'Damage 5, 10; hit count 2; knockback -20, 50; cooldown 3.5s per charge; gem cost 17; pool 4',
  }],
  ['snaretrack', {
    sourceName: 'Snare Track',
    sourceUrl: 'https://wizardoflegend.fandom.com/wiki/Snare_Track',
    catalogType: 'Dash',
    catalogElement: 'Earth',
    description: 'Tear forward as a trio of vines entangle enemies in your wake!',
    enhanced: 'All vines continue to travel and entangle enemies ahead!',
    stats: 'Damage 20; hit count 1; cooldown 6s; gem cost 17; pool 4',
  }],
]);

async function fetchCatalog() {
  const configResponse = await fetch('https://api.spreadsimple.com/spread-view/public/omit-routes/wol.spread.name', {
    signal: AbortSignal.timeout(30_000),
  });
  if (!configResponse.ok) throw new Error(`Catalog config returned HTTP ${configResponse.status}`);
  const config = await configResponse.json();

  const options = {
    rowsLimit: 1000,
    dealType: config.dealType,
    dynamicData: {
      sheetHash: config.sheetHash || '0',
      SCPTableLatestUpdateTimestamp: config.SCPTableLatestUpdateTimestamp || 0,
    },
    search: {},
    sorting: {},
    pagination: {enabled: true, itemsPerPage: '1000'},
    filters: {},
    mapView: {},
    calendarView: {},
  };
  const encode = value => encodeURIComponent(Buffer.from(JSON.stringify(value)).toString('base64'));
  const url = `https://spread.name/sheet/${config.sid}?query=${encode({})}&options=${encode(options)}`;
  const response = await fetch(url, {signal: AbortSignal.timeout(90_000)});
  if (!response.ok) throw new Error(`Catalog data returned HTTP ${response.status}`);
  const payload = await response.json();
  const rows = payload.table?.rows ?? [];
  return {
    updatedAt: tidy(config.updatedAt).slice(0, 10) || 'unknown',
    rows: rows.map(row => ({
      route: row.route ?? '',
      ...Object.fromEntries(Object.values(row.cells ?? {}).map(cell => [cell.origColName, cell.formattedValue ?? cell.value ?? ''])),
    })),
  };
}

const catalogResponse = await fetchCatalog();
const catalogRows = catalogResponse.rows;
const arcanaRows = catalogRows.filter(row => row.Category === 'Arcana');
const catalogByName = new Map(arcanaRows.map(row => [normalizeName(row.Title), row]));

const missing = [];
const results = entries.map(entry => {
  const sourceName = catalogName(entry.name);
  const row = catalogByName.get(normalizeName(sourceName));
  if (!row) {
    const fallback = wikiFallbacks.get(normalizeName(entry.name));
    if (!fallback) {
      missing.push(entry.name);
      return {...entry, source: 'missing'};
    }
    return {...entry, ...fallback, source: 'fandom-wiki'};
  }

  const summary = tidy(row.Summary);
  const enhancedMatch = summary.match(/\n\*\*Enhanced:\*\*\s*/i);
  const description = enhancedMatch ? summary.slice(0, enhancedMatch.index).trim() : summary;
  const enhanced = enhancedMatch ? summary.slice(enhancedMatch.index + enhancedMatch[0].length).trim() : '';
  return {
    ...entry,
    source: 'spread-catalog',
    sourceName,
    sourceUrl: 'https://wol.spread.name/',
    catalogType: tidy(row['Arcana Type']),
    catalogElement: tidy(row.Element),
    catalogId: tidy(row.ID).replace(/^ID:\s*/i, ''),
    description,
    enhanced,
    keywords: tidy(row['Special Keywords']),
    route: tidy(row.route),
  };
});

if (missing.length) {
  throw new Error(`Catalog is missing ${missing.length} Gate 1 entries: ${missing.join(', ')}`);
}

const catalogUpdated = catalogResponse.updatedAt;
const lines = [
  '# Gate 2 online Arcana reference',
  '',
  'This file adds a documented-online reference layer to the Gate 1 showcase inventory.',
  'It is deliberately separate from the source-first video analysis: the fields below',
  'come from a public Wizard of Legend community catalog and are not claims about what',
  'the showcase clip visibly proves.',
  '',
  '- **Scope:** all 149 Arcana in the Gate 1 video ledger',
  '- **Evidence label:** `documented-online`',
  '- **Retrieved:** 2026-08-09',
  `- **Catalog snapshot updated:** ${catalogUpdated}`,
  '- **Primary reference:** <https://wol.spread.name/>',
  '- **Secondary reference:** <https://wizardoflegend.fandom.com/wiki/Arcana>',
  '',
];

for (const result of results) {
  const sourceLabel = result.source === 'fandom-wiki'
    ? `Wizard of Legend Wiki — ${result.name}`
    : 'Wizard of Legend community catalog';
  lines.push(`## ${result.order}. ${result.name}`, '',
    `- **Gate 1 element:** ${result.element}`,
    `- **Gate 1 category:** ${result.category}`,
    '- **Evidence:** documented-online',
    `- **Source:** [${sourceLabel}](${result.sourceUrl})`);
  if (result.sourceName !== result.name) lines.push(`- **Catalog name:** ${result.sourceName}`);
  if (result.catalogElement) lines.push(`- **Catalog element:** ${result.catalogElement}`);
  if (result.catalogType) lines.push(`- **Catalog type:** ${result.catalogType}`);
  if (result.catalogId) lines.push(`- **Catalog ID:** \`${result.catalogId}\``);
  if (result.description) lines.push(`- **Documented behavior:** ${result.description}`);
  if (result.enhanced) lines.push(`- **Enhanced:** ${result.enhanced}`);
  if (result.stats) lines.push(`- **Documented stats:** ${result.stats}`);
  if (result.keywords) lines.push(`- **Catalog keywords:** ${result.keywords}`);
  lines.push('');
}

fs.writeFileSync('archive/wizard-of-legend/source-notes/gate2-online-reference.md', lines.join('\n'));
console.log(JSON.stringify({
  inventory: entries.length,
  catalogRows: catalogRows.length,
  catalogArcana: arcanaRows.length,
  documented: results.length,
  missing,
}, null, 2));
