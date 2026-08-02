import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ARENA_THEME_DATA_ATTRIBUTE,
  ARENA_THEME_IDS,
  ARENA_THEME_QUERY_PARAM,
  ARENA_THEME_REGISTRY,
  ARENA_THEME_REGISTRY_API,
  ARENA_THEME_STORAGE_KEY,
  DEFAULT_ARENA_THEME_ID,
  applyArenaThemeWorldStyle,
  getArenaTheme,
  getArenaThemeCssHref,
  getArenaThemeWorldHook,
  getArenaThemeWorldStyle,
  listArenaThemes,
  normalizeArenaThemeId,
  requireArenaTheme,
  resolveArenaTheme,
  resolveArenaThemeId,
  resolveArenaThemeSelection,
} from '../src/arena-theme-registry.js';

assert.equal(ARENA_THEME_QUERY_PARAM, 'theme');
assert.equal(ARENA_THEME_STORAGE_KEY, 'arena.theme');
assert.equal(ARENA_THEME_DATA_ATTRIBUTE, 'arenaTheme');
assert.equal(DEFAULT_ARENA_THEME_ID, 'neutral');
assert.deepEqual(ARENA_THEME_IDS, ['neutral', 'original', 'akai']);
assert.equal(ARENA_THEME_REGISTRY_API.resolve, resolveArenaTheme);
assert.equal(ARENA_THEME_REGISTRY_API.applyWorldStyle, applyArenaThemeWorldStyle);
assert.ok(Object.isFrozen(ARENA_THEME_REGISTRY));

const expectedTokenKeys = [
  'bg', 'panel', 'panel2', 'line', 'lineSoft', 'text', 'muted', 'gold',
  'red', 'teal', 'heavy', 'worldBg', 'worldFog', 'worldFloorA', 'worldFloorB',
];

for (const theme of ARENA_THEME_REGISTRY) {
  assert.ok(Object.isFrozen(theme), `${theme.id} should be frozen`);
  assert.ok(Object.isFrozen(theme.tokens), `${theme.id} tokens should be frozen`);
  assert.ok(Object.isFrozen(theme.worldStyle), `${theme.id} world style should be frozen`);
  assert.ok(Object.isFrozen(theme.worldStyle.palette), `${theme.id} world palette should be frozen`);
  assert.equal(getArenaTheme(theme.id), theme);
  assert.equal(requireArenaTheme(theme.id), theme);
  assert.equal(getArenaThemeCssHref(theme), theme.cssHref);
  assert.equal(getArenaThemeWorldStyle(theme), theme.worldStyle);
  assert.equal(getArenaThemeWorldHook(theme), theme.worldStyle.hook);
  assert.equal(theme.worldStyleHook, theme.worldStyle.hook);
  for (const key of expectedTokenKeys) {
    assert.equal(typeof theme.tokens[key], 'string', `${theme.id}.${key} should be a CSS token`);
  }

  const css = readFileSync(new URL(`../${theme.cssHref}`, import.meta.url), 'utf8');
  assert.match(css, new RegExp(`data-arena-theme=["']${theme.id}["']`));
  assert.doesNotMatch(css, /<style|style\.textContent|createElement|appendChild|@import/);
  for (const key of ['bg', 'panel', 'line', 'text', 'gold', 'red', 'teal', 'world-bg', 'world-fog']) {
    assert.match(css, new RegExp(`--arena-${key.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)}\\s*:`));
  }
}

assert.equal(getArenaTheme('neutral').worldStyle.materialPolicy, 'base');
assert.equal(getArenaTheme('neutral').worldStyle.plaque, false);
assert.equal(getArenaTheme('original').worldStyle.kind, 'original-brown-green');
assert.equal(getArenaTheme('akai').worldStyle.plaque, true);

const storageData = new Map([[ARENA_THEME_STORAGE_KEY, 'original']]);
const storage = {
  getItem: key => storageData.get(key) ?? null,
  setItem: (key, value) => storageData.set(key, String(value)),
};

assert.equal(resolveArenaTheme({ search: '?theme=akai', storage }).id, 'akai');
assert.equal(resolveArenaThemeId({ search: '?theme=akai', storage }), 'akai');
assert.equal(resolveArenaTheme({ search: '?theme=unknown', storage }).id, 'original');
assert.equal(resolveArenaTheme({ search: '?seed=arena-001', storage: { getItem: () => null } }).id, 'neutral');
assert.equal(resolveArenaTheme({ search: '?theme=invalid', savedTheme: 'akai', storage: { getItem: () => 'original' } }).id, 'akai');
assert.equal(resolveArenaTheme('?theme=AKA I').id, 'neutral');
assert.equal(resolveArenaTheme({ search: new URLSearchParams('theme=cyan-red') }).id, 'akai');
assert.equal(resolveArenaThemeSelection({ search: '?theme=akai', storage }).source, 'query');
assert.equal(resolveArenaThemeSelection({ search: '?theme=invalid', storage }).source, 'storage');
assert.equal(resolveArenaThemeSelection({ search: '', storage: { getItem: () => null } }).source, 'default');

assert.equal(normalizeArenaThemeId('default'), 'neutral');
assert.equal(normalizeArenaThemeId('original-brown-green'), 'original');
assert.equal(normalizeArenaThemeId('akai-cyan-red'), 'akai');
assert.equal(normalizeArenaThemeId('missing'), null);
assert.equal(normalizeArenaThemeId('missing', 'original'), 'original');
assert.equal(getArenaTheme('missing'), null);
assert.throws(() => requireArenaTheme('missing'), /Unknown Arena theme/);
assert.deepEqual(listArenaThemes({ ids: ['akai', 'missing', 'original-brown-green'] }).map(theme => theme.id), ['original', 'akai']);

const world = { marker: 'existing' };
let hookInput = null;
const hooked = applyArenaThemeWorldStyle('akai', {
  THREE: { marker: 'three' },
  maze: { marker: 'maze' },
  world,
  hooks: {
    akai: input => {
      hookInput = input;
      return { marker: 'styled' };
    },
  },
});
assert.deepEqual(hooked, { marker: 'styled' });
assert.equal(hookInput.theme.id, 'akai');
assert.equal(hookInput.worldStyle, getArenaThemeWorldStyle('akai'));
assert.equal(hookInput.world, world);
assert.equal(applyArenaThemeWorldStyle('original', { world, hooks: {} }), world);
assert.equal(applyArenaThemeWorldStyle('neutral', input => input.world), undefined);

assert.equal(getArenaThemeCssHref('missing'), null);
console.log('Arena theme registry, synchronous resolution, static tokens, and explicit world hooks: ok');
