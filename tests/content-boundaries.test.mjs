import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const arena = read('combat-arena.html');
const arenaRuntime = read('src/arena-runtime.js');
const lab = read('enemy-lab.html');
const playerCombat = read('src/player-combat.js');
const pilebunker = read('src/player-combat-pilebunker.js');
const stanceDeck = read('src/stance-deck.js');
const enemyCatalog = read('src/arena-enemy-catalog.js');

assert.match(arenaRuntime, /from '\.\/game-content\.js'/, 'the shared Arena runtime enters card content through gameContent');
assert.match(lab, /from '\.\/src\/game-content\.js'/, 'Enemy Lab enters enemy content through gameContent');
assert.doesNotMatch(arena, /from '\.\/src\/stance-cards\.js'/, 'Combat Arena does not bypass the card registry');
assert.doesNotMatch(lab, /from '\.\/src\/(?:fusion|flare|hades)-enemies\.js'/, 'Enemy Lab does not rebuild family catalogs');
assert.doesNotMatch(stanceDeck, /STANCE_CARDS\.push/, 'deck setup never mutates a compatibility catalog');

const combatGraph = `${playerCombat}\n${pilebunker}\n${read('src/player-combat-core.js')}`;
assert.doesNotMatch(
  combatGraph,
  /cdn\.jsdelivr\.net\/gh\/[^'"\s]+\/src\/player-combat\.js/,
  'the player-combat graph has no remote self-dependency',
);
assert.doesNotMatch(playerCombat, /window\.__ABILITY_CARD_CAN_PLAY__\s*=/, 'production combat has no global ability gate');
assert.doesNotMatch(pilebunker, /window\.__POWBUNKER_CAN_PLAY__\s*=/, 'production Pilebunker has no global ability gate');
assert.doesNotMatch(
  `${playerCombat}\n${pilebunker}`,
  /addEventListener\(['"](?:powbunker:play|bloodslash:play|wizard-arcana:play)/,
  'production combat does not subscribe to card-play broadcasts',
);
assert.doesNotMatch(arena, /dispatchEvent\(new CustomEvent\(card\.playEvent/, 'Arena capture uses the injected dispatcher');
assert.match(stanceDeck, /createCardEffectCompatibilityAdapter/, 'legacy standalone routing is isolated and named');
assert.match(arenaRuntime, /compatibilityAdapter:\s*null/, 'Combat Arena disables the standalone compatibility adapter');

assert.doesNotMatch(enemyCatalog, /import\(['"]\.\/enemy-lab-/, 'the enemy catalog has no Lab installer side effects');
assert.match(lab, /installEnemyLabDevelopmentTools\(\{runtime,sectionRegistry\}\)/, 'Enemy Lab installs its tools explicitly against the same-document runtime and section registry');

console.log('content import and runtime boundaries: ok');
