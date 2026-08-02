import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arenaPath = resolve(root, 'combat-arena.html');
const source = readFileSync(arenaPath, 'utf8');

const styleMatch = source.match(/<style>\s*([\s\S]*?)\s*<\/style>/);
const bodyMatch = source.match(/<body>\s*([\s\S]*?)\s*<script type="module">/);
const moduleMatch = source.match(/<script type="module">\s*([\s\S]*?)\s*<\/script>\s*<\/body>/);
if (!styleMatch || !bodyMatch || !moduleMatch) throw new Error('Combat Arena extraction markers changed.');

const moduleSource = moduleMatch[1].trim();
const moduleLines = moduleSource.split(/\r?\n/);
let importEnd = 0;
while (importEnd < moduleLines.length && (moduleLines[importEnd].startsWith('import ') || moduleLines[importEnd].trim() === '')) importEnd++;
const imports = moduleLines.slice(0, importEnd).join('\n').replaceAll("from './src/", "from './");
const implementation = moduleLines.slice(importEnd).join('\n');

const runtimeSource = `${imports}\nimport { createArenaControlRegistry } from './arena-control-registry.js';\nimport { clearArenaRuntime, provideArenaRuntime } from './arena-runtime-context.js';\n\nexport function createArenaRuntime({ config = {}, controlRegistry = createArenaControlRegistry() } = {}) {\n  const runtimeConfig = Object.freeze({ mode:'arena', ...config });\n  document.documentElement.dataset.arenaMode = runtimeConfig.mode;\n${implementation}\n}\n`;

const shellSource = `export const ARENA_SHELL_HTML = ${JSON.stringify(bodyMatch[1].trim())};\n\nexport function installArenaShell({ document = globalThis.document, mode = 'arena' } = {}) {\n  if (!document?.body) throw new Error('Arena shell requires a document body.');\n  if (document.getElementById('startGate')) return document.body;\n  document.documentElement.dataset.arenaMode = mode;\n  document.body.insertAdjacentHTML('afterbegin', ARENA_SHELL_HTML);\n  return document.body;\n}\n`;

const styleStart = styleMatch.index;
const styleEnd = styleStart + styleMatch[0].length;
const headBeforeStyle = source.slice(0, styleStart);
const headAfterStyle = source.slice(styleEnd, source.indexOf('</head>'));
const combatPage = `${headBeforeStyle}<link rel="stylesheet" href="./src/arena-shell.css">\n${headAfterStyle}</head>\n<body>\n<script type="module">\nimport { installArenaShell } from './src/arena-shell.js';\nimport { runtimeConfigFromLocation } from './src/arena-runtime-config.js';\nimport { createArenaRuntime } from './src/arena-runtime.js';\n\nconst config = runtimeConfigFromLocation(location, { mode:'arena' });\ninstallArenaShell({ mode:config.mode });\ncreateArenaRuntime({ config });\n</script>\n</body>\n</html>\n`;

writeFileSync(resolve(root, 'src/arena-shell.css'), `${styleMatch[1].trim()}\n`);
writeFileSync(resolve(root, 'src/arena-shell.js'), shellSource);
writeFileSync(resolve(root, 'src/arena-runtime.js'), runtimeSource);
writeFileSync(arenaPath, combatPage);
