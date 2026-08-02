import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const files=[
  'src/player-combat.js','src/basic-dash.js','src/boundary-room-props.js','src/combat-card-effects.js',
  'src/goblin-duel-guard.js','src/hades-native-roster-cadence.js','src/hex-maze-renderer-base.js',
  'src/lugaru-duelist.js','src/roadie-run.js','src/run-draft.js','src/stance-deck.js','src/working-roster-encounter-mode.js',
];

for(const relative of files){
  const path=resolve(root,relative);let source=readFileSync(path,'utf8');
  if(!source.includes("from './arena-runtime-context.js'"))source=`import { getArenaRuntime } from './arena-runtime-context.js';\n${source}`;
  source=source
    .replaceAll('globalThis.window?.__arena || globalThis.__arena','getArenaRuntime()')
    .replaceAll('globalThis.window?.__arena','getArenaRuntime()')
    .replaceAll('globalThis.__arena','getArenaRuntime()')
    .replaceAll('window.__arena','getArenaRuntime()');
  writeFileSync(path,source);
}
