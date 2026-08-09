import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveArenaRuntimeConfig } from '../src/arena-runtime-config.js';

const config=resolveArenaRuntimeConfig({search:'?defenseDebug=1',pathname:'/enemy-lab.html'});
assert.equal(config.enemyLab,true);
assert.equal(config.query.defenseDebug,'1');
const defense=readFileSync(new URL('../src/stance-gate5-defense.js',import.meta.url),'utf8');
assert.match(defense,/get\('defenseDebug'\)==='1'/);
console.log('Enemy Lab defense-debug same-document routing test passed');
