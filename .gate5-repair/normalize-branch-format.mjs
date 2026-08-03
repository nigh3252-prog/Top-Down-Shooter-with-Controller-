import { readFileSync, writeFileSync } from 'node:fs';

const path='src/arena-enemies-core.js';
const source=readFileSync(path,'utf8');
const before="import { ARENA_FACTIONS, createArenaFactionService } from './arena-faction-service.js';\n\nexport { ARENA_ENEMY_ARCHETYPES };";
const after="import { ARENA_FACTIONS, createArenaFactionService } from './arena-faction-service.js';\nexport { ARENA_ENEMY_ARCHETYPES };";
if(!source.includes(before)&&!source.includes(after))throw new Error(`${path}: unexpected import formatting`);
if(source.includes(before))writeFileSync(path,source.replace(before,after));
