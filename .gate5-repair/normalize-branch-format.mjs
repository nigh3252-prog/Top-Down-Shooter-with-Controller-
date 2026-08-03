import { readFileSync, writeFileSync } from 'node:fs';

function normalize(path,before,after,label){
  const source=readFileSync(path,'utf8');
  if(!source.includes(before)&&!source.includes(after))throw new Error(`${path}: unexpected ${label} formatting`);
  if(source.includes(before))writeFileSync(path,source.replace(before,after));
}

normalize(
  'src/arena-enemies-core.js',
  "import { ARENA_FACTIONS, createArenaFactionService } from './arena-faction-service.js';\n\nexport { ARENA_ENEMY_ARCHETYPES };",
  "import { ARENA_FACTIONS, createArenaFactionService } from './arena-faction-service.js';\nexport { ARENA_ENEMY_ARCHETYPES };",
  'interceptor import',
);
normalize(
  'combat-arena.html',
  "  CombatAudio.playTest('swingLight');\n}\n\n/* ---------- hits: swept weapon zones vs enemies ---------- */",
  "  CombatAudio.playTest('swingLight');\n}\n/* ---------- hits: swept weapon zones vs enemies ---------- */",
  'defense seam',
);
