/**
 * Declarative theme records for the Combat Arena.
 *
 * This module deliberately has no DOM or rendering side effects. A caller can
 * resolve a theme synchronously during its pre-paint boot step, set the root
 * data attribute, and point a static stylesheet link at the record's cssHref.
 * World presentation remains an explicit injected hook selected by the
 * worldStyle.hook value; this registry does not import a renderer or install
 * late styles.
 */

export const ARENA_THEME_QUERY_PARAM = 'theme';
export const ARENA_THEME_STORAGE_KEY = 'arena.theme';
export const ARENA_THEME_DATA_ATTRIBUTE = 'arenaTheme';
export const DEFAULT_ARENA_THEME_ID = 'neutral';

const deepFreeze = (value, seen = new Set()) => {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
};

const tokenSet = values => deepFreeze({
  ...values,
  // Keep the small names convenient for the existing Arena CSS while also
  // exposing semantic aliases for new consumers.
  background: values.bg,
  surface: values.panel,
  surfaceRaised: values.panel2,
  border: values.line,
  borderSubtle: values.lineSoft,
  accent: values.gold,
  accentStrong: values.goldStrong,
  danger: values.red,
  dangerStrong: values.redStrong,
  positive: values.teal,
  positiveStrong: values.tealStrong,
});

const worldStyle = ({
  hook,
  kind,
  palette,
  fogNear = 34,
  fogFar = 78,
  materialPolicy = 'theme',
  plaque = false,
}) => deepFreeze({
  hook,
  kind,
  fogNear,
  fogFar,
  materialPolicy,
  plaque,
  palette,
});

const THEME_DEFINITIONS = [
  {
    id: 'neutral',
    label: 'Neutral',
    description: 'Compact charcoal/slate HUD with clear white text, a restrained cyan focus accent, and base maze materials.',
    cssHref: 'src/arena-theme-neutral.css',
    worldStyleHook: 'neutral',
    tokens: tokenSet({
      bg: '#14191d',
      panel: 'rgba(23,29,35,.94)',
      panel2: 'rgba(23,29,35,.86)',
      panelSolid: '#171d23',
      line: '#52606b',
      lineSoft: '#3a454e',
      lineBright: '#73818c',
      text: '#eef4f6',
      muted: '#b3c0c8',
      subtle: '#82909a',
      gold: '#8fc7d2',
      goldStrong: '#6eabb8',
      red: '#db8b8b',
      redStrong: '#b76569',
      redSoft: 'rgba(219,139,139,.16)',
      teal: '#92cdd3',
      tealStrong: '#5fa6b2',
      heavy: '#bca9dc',
      shadow: '#0b0f12',
      track: '#2c353c',
      control: 'rgba(39,48,57,.78)',
      controlActive: '#52606b',
      card: 'rgba(29,37,44,.94)',
      cardActive: '#43515b',
      joystick: 'rgba(190,207,216,.38)',
      error: '#e4a1a1',
      errorPanel: 'rgba(34,18,20,.92)',
      disabled: '.42',
      font: 'ui-monospace,Menlo,Consolas,monospace',
      worldBg: '#0d191b',
      worldFog: '#0d191b',
      worldFloorA: 'base',
      worldFloorB: 'base',
      worldFloorDark: 'base',
      worldInk: 'base',
      worldAccent: '#8fc7d2',
    }),
    worldStyle: worldStyle({
      hook: 'neutral',
      kind: 'base',
      materialPolicy: 'base',
      plaque: false,
      palette: {
        background: 0x0d191b,
        fog: 0x0d191b,
        accent: 0x8fc7d2,
      },
    }),
  },
  {
    id: 'original',
    label: 'Original · Brown / Green',
    description: 'The existing Arena presentation: warm brown controls over green-black panels.',
    cssHref: 'src/arena-theme-original.css',
    worldStyleHook: 'original',
    tokens: tokenSet({
      bg: '#0d191b',
      panel: 'rgba(10,20,22,.94)',
      panel2: 'rgba(10,20,22,.85)',
      panelSolid: '#122426',
      line: '#2c4a47',
      lineSoft: '#24403e',
      lineBright: '#6e3a24',
      text: '#9fd2c9',
      muted: '#4a6f6a',
      subtle: '#7fb8b0',
      gold: '#e8a04c',
      goldStrong: '#c9863a',
      red: '#ff9070',
      redStrong: '#c96a35',
      redSoft: 'rgba(190,40,20,.55)',
      teal: '#7fd0a8',
      tealStrong: '#3f9f7a',
      heavy: '#cdb6ff',
      shadow: '#081112',
      track: '#243f3d',
      control: 'rgba(18,36,38,.72)',
      controlActive: '#2c4a47',
      card: 'rgba(14,28,30,.92)',
      cardActive: '#2c4a47',
      joystick: 'rgba(159,210,201,.5)',
      error: '#ff9070',
      errorPanel: 'rgba(20,8,6,.9)',
      disabled: '.42',
      font: 'ui-monospace,Menlo,Consolas,monospace',
      worldBg: '#0d191b',
      worldFog: '#0d191b',
      worldFloorA: '#486157',
      worldFloorB: '#3b514a',
      worldFloorDark: '#1a2325',
      worldInk: '#081112',
      worldAccent: '#e8a04c',
    }),
    worldStyle: worldStyle({
      hook: 'original',
      kind: 'original-brown-green',
      materialPolicy: 'original',
      plaque: false,
      palette: {
        background: 0x0d191b,
        fog: 0x0d191b,
        floorA: 0x486157,
        floorB: 0x3b514a,
        floorDark: 0x1a2325,
        ink: 0x081112,
        accent: 0xe8a04c,
      },
    }),
  },
  {
    id: 'akai',
    label: 'Akai · Cyan / Red',
    description: 'Akai courtyard presentation with cyan controls, red accents, and dark teal world tones.',
    cssHref: 'src/arena-theme-akai.css',
    worldStyleHook: 'akai',
    tokens: tokenSet({
      bg: '#06171d',
      panel: 'rgba(3,14,19,.97)',
      panel2: 'rgba(3,12,16,.93)',
      panelSolid: '#031013',
      line: 'rgba(226,244,239,.46)',
      lineSoft: 'rgba(226,244,239,.18)',
      lineBright: '#dc2d22',
      text: '#f4f1e7',
      muted: '#9ab9ba',
      subtle: '#77c9cf',
      gold: '#fff0b5',
      goldStrong: '#f3d887',
      red: '#dc2d22',
      redStrong: '#f13b2d',
      redSoft: 'rgba(220,45,34,.16)',
      teal: '#5fcbd2',
      tealStrong: '#79d9dc',
      heavy: '#5fcbd2',
      shadow: '#02090d',
      track: '#173b43',
      control: 'rgba(2,12,16,.78)',
      controlActive: 'rgba(95,203,210,.2)',
      card: 'linear-gradient(180deg,rgba(4,16,21,.94),rgba(2,9,13,.9))',
      cardActive: 'rgba(27,79,87,.9)',
      joystick: 'rgba(95,203,210,.42)',
      error: '#ff8f82',
      errorPanel: 'rgba(22,6,5,.9)',
      disabled: '.42',
      font: 'Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif',
      worldBg: '#06171d',
      worldFog: '#0a2730',
      worldFloorA: '#245b64',
      worldFloorB: '#1c4a54',
      worldFloorDark: '#12343c',
      worldInk: '#071014',
      worldAccent: '#c7251d',
      worldLantern: '#ffefb0',
      worldLanternWarm: '#ffb85b',
    }),
    worldStyle: worldStyle({
      hook: 'akai',
      kind: 'akai-courtyard',
      fogNear: 30,
      fogFar: 88,
      materialPolicy: 'akai',
      plaque: true,
      palette: {
        background: 0x06171d,
        fog: 0x0a2730,
        floorA: 0x245b64,
        floorB: 0x1c4a54,
        floorDark: 0x12343c,
        ink: 0x071014,
        inkSoft: 0x101b20,
        red: 0xc7251d,
        redDark: 0x621710,
        redHot: 0xf13b2d,
        lantern: 0xffefb0,
        lanternWarm: 0xffb85b,
        cyan: 0x5fcbd2,
      },
    }),
  },
];

export const ARENA_THEME_IDS = Object.freeze(THEME_DEFINITIONS.map(theme => theme.id));
export const ARENA_THEME_REGISTRY = deepFreeze(THEME_DEFINITIONS);
export const ARENA_THEMES = ARENA_THEME_REGISTRY;
export const ARENA_THEME_REGISTRY_ENTRIES = ARENA_THEME_REGISTRY;
export const ARENA_THEME_OPTIONS = Object.freeze(ARENA_THEME_REGISTRY.map(theme => Object.freeze({
  id: theme.id,
  label: theme.label,
})));

const THEME_BY_ID = Object.freeze(Object.fromEntries(
  ARENA_THEME_REGISTRY.map(theme => [theme.id, theme]),
));

const THEME_ALIASES = Object.freeze({
  base: 'neutral',
  default: 'neutral',
  none: 'neutral',
  'brown-green': 'original',
  'original-brown-green': 'original',
  'cyan-red': 'akai',
  'akai-cyan-red': 'akai',
});

function normalizeThemeId(value) {
  const raw = String(value?.id ?? value ?? '').trim().toLowerCase();
  if (!raw) return null;
  return THEME_ALIASES[raw] || (THEME_BY_ID[raw] ? raw : null);
}

function themeFor(value) {
  const id = normalizeThemeId(value);
  return id ? THEME_BY_ID[id] || null : null;
}

function readLocationSearch() {
  try { return globalThis.location?.search || ''; }
  catch { return ''; }
}

function readLocalStorage() {
  try { return globalThis.localStorage || null; }
  catch { return null; }
}

function queryValue(search) {
  if (search && typeof search.get === 'function') return search.get(ARENA_THEME_QUERY_PARAM);
  if (search?.searchParams && typeof search.searchParams.get === 'function') {
    return search.searchParams.get(ARENA_THEME_QUERY_PARAM);
  }
  if (typeof URLSearchParams === 'undefined') return null;
  try {
    return new URLSearchParams(String(search ?? '')).get(ARENA_THEME_QUERY_PARAM);
  } catch {
    return null;
  }
}

function storageValue(storage) {
  try {
    if (typeof storage?.getItem === 'function') return storage.getItem(ARENA_THEME_STORAGE_KEY);
    if (typeof storage?.get === 'function') return storage.get(ARENA_THEME_STORAGE_KEY);
    return storage?.[ARENA_THEME_STORAGE_KEY] ?? null;
  } catch {
    return null;
  }
}

function optionsFor(input) {
  if (typeof input === 'string' || typeof input?.get === 'function' || input?.searchParams) {
    return { search: input };
  }
  return input || {};
}

/**
 * Resolve a theme record using query string, saved preference, then default.
 * Invalid values are skipped so an invalid query does not erase a valid saved
 * preference. All inputs are injectable to keep this function synchronous and
 * usable from tests or an early boot coordinator.
 */
export function resolveArenaThemeSelection(input = {}) {
  const options = optionsFor(input);
  const queryTheme = themeFor(queryValue(options.search ?? readLocationSearch()));
  if (queryTheme) return Object.freeze({ theme: queryTheme, source: 'query' });

  const savedValue = options.savedTheme === undefined
    ? storageValue(options.storage ?? readLocalStorage())
    : options.savedTheme;
  const savedTheme = themeFor(savedValue);
  if (savedTheme) return Object.freeze({ theme: savedTheme, source: 'storage' });

  const defaultTheme = themeFor(options.defaultTheme) || THEME_BY_ID[DEFAULT_ARENA_THEME_ID];
  return Object.freeze({ theme: defaultTheme, source: 'default' });
}

export function resolveArenaTheme(input = {}) {
  return resolveArenaThemeSelection(input).theme;
}

export function resolveArenaThemeId(input = {}) {
  return resolveArenaTheme(input).id;
}

export function normalizeArenaThemeId(value, fallback = null) {
  return normalizeThemeId(value) || normalizeThemeId(fallback);
}

export function getArenaTheme(value) {
  return themeFor(value);
}

export function requireArenaTheme(value) {
  const theme = themeFor(value);
  if (!theme) throw new Error(`[arena-theme-registry] Unknown Arena theme: ${String(value ?? '')}`);
  return theme;
}

export function listArenaThemes({ ids = null } = {}) {
  if (!ids) return ARENA_THEME_REGISTRY;
  const values = Array.isArray(ids) ? ids : [ids];
  const wanted = new Set(values.map(normalizeThemeId).filter(Boolean));
  return Object.freeze(ARENA_THEME_REGISTRY.filter(theme => wanted.has(theme.id)));
}

export function getArenaThemeCssHref(value) {
  return getArenaTheme(value)?.cssHref || null;
}

export function getArenaThemeTokens(value) {
  return getArenaTheme(value)?.tokens || null;
}

export function getArenaThemeWorldStyle(value) {
  return getArenaTheme(value)?.worldStyle || null;
}

export function getArenaThemeWorldHook(value) {
  return getArenaTheme(value)?.worldStyle.hook || null;
}

export const getArenaThemeDefinition = getArenaTheme;
export const requireArenaThemeDefinition = requireArenaTheme;
export const listArenaThemeDefinitions = listArenaThemes;

/**
 * Run the explicitly injected world hook for a theme.
 *
 * `hooks` may be a function or a map keyed by the record's worldStyle.hook
 * value. The registry supplies the immutable theme and world style alongside
 * the caller's runtime context. If no hook is registered, the existing world
 * is returned unchanged; selecting a theme never silently mutates a world.
 */
export function applyArenaThemeWorldStyle(value, options = {}) {
  const theme = requireArenaTheme(value);
  const context = typeof options === 'function' ? { hooks: options } : (options || {});
  const hooks = context.hooks;
  const hook = typeof hooks === 'function'
    ? hooks
    : hooks?.[theme.worldStyle.hook] || hooks?.[theme.id];
  if (typeof hook !== 'function') return context.world ?? null;
  return hook({ ...context, theme, worldStyle: theme.worldStyle });
}

export const ARENA_THEME_REGISTRY_API = Object.freeze({
  get: getArenaTheme,
  require: requireArenaTheme,
  list: listArenaThemes,
  resolve: resolveArenaTheme,
  resolveSelection: resolveArenaThemeSelection,
  cssHref: getArenaThemeCssHref,
  tokens: getArenaThemeTokens,
  worldStyle: getArenaThemeWorldStyle,
  applyWorldStyle: applyArenaThemeWorldStyle,
});

export const arenaThemeRegistry = ARENA_THEME_REGISTRY_API;
