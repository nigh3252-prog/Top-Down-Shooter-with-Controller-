import { WARDEN_TEMPERAMENTS } from './warden-trial-temperaments.js';
import { WARDEN_TRIAL_BAZAAR_DEMO_ROSTER } from './warden-trial-bazaar-demo.js';

const WARDEN_TEMPERAMENT_BUTTONS=WARDEN_TEMPERAMENTS.map(option=>`
      <button class="trialTemperamentChoice" type="button" data-trial-temperament="${option.level}" aria-pressed="false" aria-label="Defense level ${option.level}: ${option.label}. ${option.description}" title="${option.description}">${option.level} ${option.label}</button>`).join('');
const WARDEN_BAZAAR_DEMO_OPTIONS=WARDEN_TRIAL_BAZAAR_DEMO_ROSTER.map(entry=>`
      <option value="${entry.id}">${entry.index}. ${entry.name} · ${entry.family==='tactic'?'Tactic':entry.arcanaId.replaceAll('-',' ')}</option>`).join('');

export const ARENA_SHELL_HTML = `<div id="topBar">
  <button class="tbtn" id="menuBtn">MENU</button>
  <button class="tbtn icon" id="fsBtn" aria-label="Toggle fullscreen" title="Toggle fullscreen">⛶</button>
  <div id="trialBadge">WARDEN TRIAL · READY</div>
</div>
<div id="hud">
  <div id="hpWrap"><div id="hpFill"></div></div>
  <div id="stWrap"><div id="stPending"></div><div id="stFill"></div></div>
</div>
<div id="trialBazaarDemoHud" hidden aria-live="polite">
  <strong>BAZAAR DEMO · 13 CARDS</strong>
  <span id="trialBazaarDemoSource">SELECT A CARD IN MENU</span>
  <span id="trialBazaarDemoState">SHIELD 0 · NO BUFFS</span>
  <span id="trialBazaarDemoLast">READY</span>
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
    <div id="trialDiscardPile" class="trialPileCounter" aria-label="0 cards discarded">
      <span>DISCARD</span><strong id="trialDiscardCount">0</strong>
    </div>
    <div id="trialCurrentStance" aria-live="polite" aria-label="Current stance: no stance">
      <span class="trialSideLabel">CURRENT STANCE</span>
      <strong id="trialCurrentStanceName">NO STANCE</strong>
      <span id="trialCurrentStanceBadge" class="trialStanceBadge" hidden></span>
    </div>
    <button id="trialCard" class="trialCard" type="button" aria-label="Current trial card; swipe up or down">
      <span class="trialCardArt" aria-hidden="true">
        <span class="trialCardHalf trialCardUp">
          <span id="trialCardUpLabel" class="trialCardLabel">↑ ARCANA · PENDING</span>
          <strong class="trialCardName trialArcanaName">CURRENT ARCANA</strong>
        </span>
        <span class="trialCardHalf trialCardDown">
          <span class="trialCardLabelRow"><span id="trialCardDownLabel" class="trialCardLabel">↓ STANCE · PENDING</span><span class="trialStanceBadge trialCardStanceBadge" hidden></span></span>
          <strong class="trialCardName trialStanceName">CURRENT STANCE</strong>
        </span>
      </span>
      <span id="trialCardCooldown" class="trialCardCooldown" aria-hidden="true" hidden>
        <span id="trialCardCooldownLabel">CARD PENDING</span>
        <strong id="trialCardCooldownTime">0.0s</strong>
      </span>
    </button>
    <div id="trialUpcomingCards" aria-label="Next Warden Trial cards">
      <div class="trialUpcomingCard" data-trial-upcoming-slot="0" role="img" hidden>
        <span class="trialUpcomingHalf trialUpcomingUp"><strong class="trialUpcomingArcanaName">ARCANA</strong></span>
        <span class="trialUpcomingHalf trialUpcomingDown"><strong class="trialUpcomingStanceName">STANCE</strong><span class="trialStanceBadge trialUpcomingStanceBadge" hidden></span></span>
      </div>
      <div class="trialUpcomingCard" data-trial-upcoming-slot="1" role="img" hidden>
        <span class="trialUpcomingHalf trialUpcomingUp"><strong class="trialUpcomingArcanaName">ARCANA</strong></span>
        <span class="trialUpcomingHalf trialUpcomingDown"><strong class="trialUpcomingStanceName">STANCE</strong><span class="trialStanceBadge trialUpcomingStanceBadge" hidden></span></span>
      </div>
    </div>
    <div id="trialDrawPile" class="trialPileCounter" aria-label="0 cards left to draw">
      <span>DRAW</span><strong id="trialDrawCount">0</strong>
    </div>
  </div>
</div>
<div id="wardenRewardGate" class="hidden" role="dialog" aria-modal="true" aria-labelledby="wardenRewardTitle">
  <div id="wardenRewardPanel">
    <h2 id="wardenRewardTitle">WAVE CLEAR</h2>
    <p id="wardenRewardHint">Choose one authored stance / Arcana card for the next wave.</p>
    <div id="wardenRewardChoices" role="group" aria-label="Warden Trial reward cards">
      <button class="wardenRewardChoice" type="button" data-warden-reward-slot="0"></button>
      <button class="wardenRewardChoice" type="button" data-warden-reward-slot="1"></button>
      <button class="wardenRewardChoice" type="button" data-warden-reward-slot="2"></button>
    </div>
    <button id="wardenRewardSkip" type="button" aria-label="Skip this card reward and start the next wave without adding a card">SKIP REWARD</button>
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
  <section class="pauseSection trialWeaponSection" aria-labelledby="trialWeaponTitle">
    <h2 id="trialWeaponTitle">TRIAL WEAPON</h2>
    <div class="trialWeaponGrid" role="group" aria-label="Trial weapon">
      <button class="trialWeaponChoice" type="button" data-trial-weapon="longsword" aria-pressed="false">LONGSWORD</button>
      <button class="trialWeaponChoice" type="button" data-trial-weapon="dagger" aria-pressed="false">DAGGER</button>
      <button class="trialWeaponChoice" type="button" data-trial-weapon="rapier" aria-pressed="false">RAPIER</button>
      <button class="trialWeaponChoice" type="button" data-trial-weapon="katana" aria-pressed="false">KATANA</button>
      <button class="trialWeaponChoice" type="button" data-trial-weapon="mace" aria-pressed="false">MACE</button>
      <button class="trialWeaponChoice" type="button" data-trial-weapon="spear" aria-pressed="false">SPEAR</button>
      <button class="trialWeaponChoice" type="button" data-trial-weapon="battleaxe" aria-pressed="false">BATTLEAXE</button>
      <button class="trialWeaponChoice" type="button" data-trial-weapon="warhammer" aria-pressed="false">WARHAMMER</button>
      <button class="trialWeaponChoice" type="button" data-trial-weapon="claymore" aria-pressed="false">CLAYMORE</button>
      <button class="trialWeaponChoice" type="button" data-trial-weapon="greatsword" aria-pressed="false">GREATSWORD</button>
    </div>
  </section>
  <section class="pauseSection trialAbilityCooldownSection" aria-labelledby="trialAbilityCooldownTitle">
    <h2 id="trialAbilityCooldownTitle">ABILITY COOLDOWNS</h2>
    <button id="trialAbilityCooldownToggle" class="trialAbilityCooldownToggle" type="button" aria-pressed="true">
      <span>UPWARD ARCANA</span><strong id="trialAbilityCooldownState">ON</strong>
    </button>
    <p id="trialAbilityCooldownNote" class="trialAbilityCooldownNote" aria-live="polite">Upward ability cards wait 3 seconds.</p>
  </section>
  <section class="pauseSection trialBazaarDemoSection" aria-labelledby="trialBazaarDemoTitle">
    <h2 id="trialBazaarDemoTitle">BAZAAR BEHAVIOR DEMO</h2>
    <label class="trialBazaarDemoLabel" for="trialBazaarDemoSelect">CURRENT TEST CARD</label>
    <select id="trialBazaarDemoSelect" aria-label="Choose a Bazaar demo card">${WARDEN_BAZAAR_DEMO_OPTIONS}
    </select>
    <button id="trialBazaarDemoLoad" class="trialBazaarDemoWide" type="button">LOAD SELECTED CARD</button>
    <div class="trialBazaarTimerGrid" role="group" aria-label="Apply a timer effect to the current pending card">
      <button type="button" data-trial-bazaar-timer-effect="haste" data-seconds="2">HASTE 2s</button>
      <button type="button" data-trial-bazaar-timer-effect="charge" data-seconds="2">CHARGE 2s</button>
      <button type="button" data-trial-bazaar-timer-effect="slow" data-seconds="2">SLOW 2s</button>
      <button type="button" data-trial-bazaar-timer-effect="freeze" data-seconds="2">FREEZE 2s</button>
    </div>
    <button id="trialBazaarDemoReset" class="trialBazaarDemoWide secondary" type="button">RESET DEMO BUFFS + AMMO</button>
    <p id="trialBazaarDemoNote" class="trialBazaarDemoNote">Swipe Down once to start. Swipe Up to fire the selected Arcana or Tactic. Loading a card keeps accumulated demo buffs so interactions can be tested.</p>
  </section>
  <section class="pauseSection trialTemperamentSection" aria-labelledby="trialTemperamentTitle">
    <h2 id="trialTemperamentTitle">DEFENSE LEVEL</h2>
    <div id="trialTemperamentGrid" class="trialTemperamentGrid" role="group" aria-label="Warden defense level">${WARDEN_TEMPERAMENT_BUTTONS}
    </div>
    <p id="trialTemperamentNote" class="trialTemperamentNote" aria-live="polite"></p>
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
