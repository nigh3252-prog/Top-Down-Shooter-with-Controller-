export const ARENA_SHELL_HTML = `<div id="topBar">
  <button class="tbtn" id="menuBtn">MENU</button>
  <button class="tbtn icon" id="fsBtn" aria-label="Toggle fullscreen" title="Toggle fullscreen">⛶</button>
  <div id="trialBadge">WARDEN TRIAL · READY</div>
</div>
<div id="hud">
  <div id="hpWrap"><div id="hpFill"></div></div>
  <div id="stWrap"><div id="stPending"></div><div id="stFill"></div></div>
</div>
<div id="msg"></div>
<div id="vig"></div>
<div id="roomTransition"><div class="rtTitle" id="rtTitle">ROOM TRANSITION</div></div>
<div id="joyBase"></div><div id="joyKnob"></div>
<div class="btnrow">
  <button class="pbtn" id="atkBtn" aria-label="Light attack">
    <span class="btnGlyph">□</span><span class="btnArrow" id="atkArrow">· ·</span>
  </button>
  <button class="pbtn" id="heavyBtn" aria-label="Heavy attack">
    <span class="btnGlyph">△</span><span class="btnArrow" id="heavyArrow">·</span>
  </button>
</div>
<div id="cardRow">
  <div id="deckSide">
    <div id="drawQueue" aria-label="Upcoming stance cards">
      <span class="queuedCard"></span><span class="queuedCard"></span><span class="queuedCard"></span><span class="queuedCard"></span>
    </div>
    <button id="shuffleBtn" aria-label="Shuffle stance cards">↻</button>
  </div>
  <div id="handCards">
    <button class="scard" id="card0">
      <span class="ckey">LB</span><span class="cicon" aria-hidden="true"></span>
      <span class="crows"><span class="crow"><b>□</b><span class="cardLight">· ·</span></span><span class="crow"><b>△</b><span class="cardHeavy">·</span></span></span>
    </button>
    <button class="scard" id="card1">
      <span class="ckey">RB</span><span class="cicon" aria-hidden="true"></span>
      <span class="crows"><span class="crow"><b>□</b><span class="cardLight">· ·</span></span><span class="crow"><b>△</b><span class="cardHeavy">·</span></span></span>
    </button>
  </div>
</div>
<div id="trialCardTray" aria-label="Warden Trial card interface">
  <div id="trialCardStatus" aria-live="polite">SWIPE DOWN TO START</div>
  <div id="trialCardRail">
    <button id="trialCard" class="trialCard" type="button" aria-label="Current trial card; swipe up or down">
      <span class="trialCardArt" aria-hidden="true">CURRENT CARD</span>
    </button>
  </div>
</div>
<div id="panel" class="hidden" aria-label="Pause menu">
  <div class="pauseTitle">PAUSED</div>
  <section class="pauseSection" aria-labelledby="themeTitle">
    <h2 id="themeTitle">VISUAL STYLE</h2>
    <div id="themeChoices" class="themeGrid" role="group" aria-label="Visual style">
      <button class="themeChoice" type="button" data-arena-theme-option="neutral" aria-pressed="false">NEUTRAL</button>
      <button class="themeChoice" type="button" data-arena-theme-option="original" aria-pressed="false">ORIGINAL</button>
      <button class="themeChoice" type="button" data-arena-theme-option="akai" aria-pressed="false">AKAI</button>
    </div>
  </section>
  <section class="pauseSection trialEnemySection" aria-labelledby="trialEnemyTitle">
    <h2 id="trialEnemyTitle">TRIAL ENEMIES</h2>
    <div class="trialEnemyGrid" role="group" aria-label="Trial enemy set">
      <button class="trialEnemyChoice" type="button" data-trial-enemy-set="cylinders" aria-pressed="false">CYLINDERS</button>
      <button class="trialEnemyChoice" type="button" data-trial-enemy-set="goblins-lugaru" aria-pressed="false">GOBLINS + LUGARU</button>
      <button class="trialEnemyChoice" type="button" data-trial-enemy-set="accordion-2d" aria-pressed="false">2D ACCORDION + 3D</button>
    </div>
  </section>
  <section class="pauseSection controlsHelp" aria-labelledby="controlsTitle">
    <h2 id="controlsTitle">CONTROLS</h2>
    <p>MOVE <span>WASD / STICK</span></p>
    <p>LIGHT <span>J / □ / RT</span></p>
    <p>HEAVY <span>L / △</span></p>
    <p>DEFENSE <span>K / × / LT</span></p>
    <p>CARDS <span>Q/E / LB/RB</span></p>
    <p>SHUFFLE <span>R / ○</span></p>
    <p>WEAPON <span>X / D-PAD ↑↓</span></p>
    <p>MENU <span>P/M / START/SELECT</span></p>
  </section>
  <button class="wide" id="resumeBtn" type="button">RESUME</button>
</div>
<!-- Internal run-draft reset hook. It is never rendered as player-facing UI. -->
<button id="resetBtn" type="button" hidden aria-hidden="true" tabindex="-1">RESET FIGHT</button>
<div id="hint">stick/WASD move · LIGHT [J/Square/RT] · HEAVY hold [L/Triangle] · DEFENSE [K/Cross/LT] · LB/RB or Q/E play card · Circle/R shuffle · X weapon · M menu</div>
<div id="err"></div>
<div id="startGate">
  <div id="startCard">
    <div class="sgTitle">HEX MAZE COMBAT</div>
    <div class="sgHint">Clear the sealed room, reopen its doors, and explore the braided dungeon.</div>
    <button id="sgFsBtn">⛶ FULLSCREEN</button>
    <button id="startBtn">TAP TO START</button>
  </div>
</div>`;

export function installArenaShell({ document = globalThis.document, mode = 'arena' } = {}) {
  if (!document?.body) throw new Error('Arena shell requires a document body.');
  if (document.getElementById('startGate')) return document.body;
  document.documentElement.dataset.arenaMode = mode;
  document.body.insertAdjacentHTML('afterbegin', ARENA_SHELL_HTML);
  return document.body;
}
