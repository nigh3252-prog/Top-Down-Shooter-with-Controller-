import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = relativePath => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

const arena = read('src/arena-runtime.js');
const backbone = read('src/playstation-backbone-input.js');
const mazeRuntime = read('src/maze-runtime-settings.js');
const shooter = read('archive/legacy-games/top-down-shooter.html');

// One semantic PlayStation mapping owns the live Combat Arena route.
assert.match(backbone, /cross:\s*0\b/, 'Cross must remain standard Gamepad button 0');
assert.match(backbone, /square:\s*2\b/, 'Square must remain standard Gamepad button 2');
assert.match(
  backbone,
  /const defensePressed=input\?\.pressed\?\.cross===true\|\|input\?\.pressed\?\.l2===true/,
  'only Cross or L2 should open defense',
);
assert.match(
  backbone,
  /const lightCandidate=input\?\.pressed\?\.square===true\|\|input\?\.pressed\?\.r2===true/,
  'only Square or R2 should be light-attack candidates',
);
assert.match(
  backbone,
  /lightPressed:lightCandidate&&!defensePressed/,
  'a Cross/defense edge must suppress any same-frame light alias',
);

const pollStart = arena.indexOf('function pollPad()');
const pollEnd = arena.indexOf('function gatherInput()', pollStart);
assert.ok(pollStart >= 0 && pollEnd > pollStart, 'Combat Arena gamepad poll should be present');
const poll = arena.slice(pollStart, pollEnd);

assert.match(poll, /resolvePlayStationBackboneActions\(pad\)/);
assert.match(poll, /if\(padActions\.defensePressed\)defenseDown\(padActions\.defenseSource\)/);
assert.match(poll, /if\(padActions\.lightPressed\)lightDown\(\)/);
assert.ok(
  poll.indexOf('if(padActions.defensePressed)') < poll.indexOf('if(padActions.lightPressed)'),
  'Combat Arena must process defense before light attack',
);
assert.doesNotMatch(poll, /lightDown\([^)]*\).*\b(?:cross|button\s*0|bd\(0\))/s);
assert.doesNotMatch(poll, /\b(?:cross|button\s*0|bd\(0\)).*lightDown\(/s);

const dodgeStart=arena.indexOf('function triggerDodge()');
const dodgeEnd=arena.indexOf('function defenseDown',dodgeStart);
assert.ok(dodgeStart>=0&&dodgeEnd>dodgeStart,'Combat Arena dodge route should be present');
const dodge=arena.slice(dodgeStart,dodgeEnd);
assert.match(dodge,/stanceGate5Runtime\?\.spendDodge\?\.\(\)/,'Rat Step dodge must route through the installed stance-defense runtime');
assert.match(dodge,/dodgeSpend\?\.allowed===false/,'empty stamina must reject the dodge');
assert.ok(
  dodge.indexOf('if(arena.deadT')<dodge.indexOf('spendDodge'),
  'dodge eligibility must be checked before stamina is spent',
);
assert.ok(
  dodge.indexOf('spendDodge')<dodge.indexOf('d.t = 0'),
  'stamina must be approved before dodge movement and invulnerability begin',
);

// Roadie Run previously replaced navigator.getGamepads and masked button 0.
// It remains available as an isolated prototype, but must never be booted by
// the Combat Arena runtime where Cross belongs to the defense seam.
assert.doesNotMatch(
  mazeRuntime,
  /import\(['"]\.\/roadie-run\.js['"]\)/,
  'Combat Arena must not load a second Cross-button owner',
);
assert.doesNotMatch(arena, /installRoadieRun|roadie-run\.js/);

// The other current playable entry point follows the same PlayStation labels.
assert.match(shooter, /\['light',2\]/, 'top-down shooter light attack must use Square');
assert.match(shooter, /\['dodge',0\]/, 'top-down shooter Cross must remain dodge');
assert.doesNotMatch(shooter, /\['light',0\]/, 'Cross must never be mapped to light attack');

console.log('Cross/light routing audit passed: Cross is defense/dodge only; Square is light only.');
