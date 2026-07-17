import { ATTACK_DEFINITIONS } from './attacks.js';
import { NON_STANCE_CARDS } from './ability-cards.js';
import { guardPoseFor } from './guard-poses.js';
import { STANCE_CARDS } from './stance-cards.js';
import { StoneSettings } from './settings.js';
import { STONE_WEAPON_ORDER, STONE_WEAPONS } from './weapons.js';

export const STARTER_STANCE_IDS = Object.freeze(['S24', 'S09']);

function shuffleCopy(values, rng = Math.random) {
  const out = values.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function drawCards(pool, count, rng = Math.random) {
  if (!Array.isArray(pool) || !pool.length || count <= 0) return [];
  const unique = shuffleCopy(pool, rng).slice(0, Math.min(count, pool.length));
  while (unique.length < count) unique.push(pool[Math.floor(rng() * pool.length)]);
  return unique;
}

export function buildRunOffers({
  weaponOrder = STONE_WEAPON_ORDER,
  nonStancePool = NON_STANCE_CARDS,
  count = 3,
  rng = Math.random,
} = {}) {
  const weapons = drawCards(weaponOrder, count, rng);
  return weapons.map(weaponId => ({
    weaponId,
    cards: drawCards(nonStancePool, 2, rng),
  }));
}

export function buildRewardPool(stancePool = STANCE_CARDS, nonStancePool = NON_STANCE_CARDS) {
  // Intentionally ignores preferredWeapons: the current single character can
  // receive every stance and every non-stance card.
  return [...stancePool, ...nonStancePool];
}

export function drawRewardChoices({
  stancePool = STANCE_CARDS,
  nonStancePool = NON_STANCE_CARDS,
  count = 3,
  rng = Math.random,
} = {}) {
  return drawCards(buildRewardPool(stancePool, nonStancePool), count, rng);
}

function arrowForAttack(key) {
  const attack = ATTACK_DEFINITIONS[key] || {};
  if (attack.group === 'stab') return /rising/i.test(attack.label || '') ? '↗' : '→';
  if (attack.group === 'horizontal') return '↔';
  if (attack.group === 'vertical') return /rising|skyhook|launch|uppercut/i.test(attack.label || '') ? '↑' : '↓';
  return '·';
}

function cleanName(card) { return String(card?.name || 'Unknown Card').replace(/^S\d+\s*/, ''); }
function isNonStance(card) { return !!card?.type && card.type !== 'stance'; }
function cardSubtitle(card) {
  if (isNonStance(card)) return card.description || 'Non-stance ability card';
  return card.chain?.map(arrowForAttack).join(' ') || 'Stance card';
}

function addStyles() {
  if (document.getElementById('runDraftStyles')) return;
  const style = document.createElement('style');
  style.id = 'runDraftStyles';
  style.textContent = `
    #startGate{overflow:auto;padding:max(12px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));box-sizing:border-box}
    #startCard.runDraftCard{width:min(980px,100%);max-width:none;text-align:left;padding:18px;box-sizing:border-box}
    #startCard .sgTitle{text-align:center;margin-bottom:6px}
    #startCard .sgHint{text-align:center;margin-bottom:14px}
    #runOfferGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
    .runOffer,.rewardChoice{font-family:inherit;color:#9fd2c9;background:rgba(18,36,38,.9);border:1px solid #2c4a47;border-radius:8px;padding:12px;text-align:left;touch-action:manipulation}
    .runOffer:active,.rewardChoice:active{transform:translateY(2px);background:#2c4a47}
    .runOfferWeapon{color:#e8a04c;font-size:14px;letter-spacing:.12em;text-align:center;margin-bottom:9px}
    .runOfferProfile{color:#6f9d96;font-size:9px;line-height:1.35;text-align:center;min-height:25px;margin-bottom:9px}
    .runFixedStances{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:9px}
    .runFixedStance{border:1px solid rgba(44,74,71,.72);border-radius:5px;padding:6px 4px;text-align:center;font-size:9px}
    .runFixedStance b{display:block;color:#d8c49b;font-size:10px;margin-bottom:3px}
    .runStarterCards{display:flex;flex-direction:column;gap:5px}
    .runStarterCard{border:1px solid rgba(169,91,53,.75);border-radius:5px;padding:7px;background:rgba(110,58,36,.12)}
    .runStarterCard b{display:block;color:#ffb066;font-size:10px;letter-spacing:.06em}
    .runStarterCard span{display:block;font-size:8.5px;line-height:1.3;margin-top:3px;color:#8ebbb3}
    #runSetupActions{display:flex;gap:8px;margin-top:12px}
    #runSetupActions button{flex:1}
    #cardRewardGate{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;background:rgba(4,9,10,.93)}
    #cardRewardGate.hidden{display:none}
    #cardRewardCard{width:min(760px,100%);background:rgba(14,28,30,.98);border:1px solid #6e3a24;border-radius:10px;padding:18px;box-sizing:border-box;box-shadow:0 8px 0 rgba(0,0,0,.3)}
    #cardRewardTitle{text-align:center;color:#e8a04c;font-size:15px;letter-spacing:.18em;margin-bottom:5px}
    #cardRewardHint{text-align:center;color:#8ebbb3;font-size:10px;margin-bottom:14px}
    #cardRewardChoices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
    .rewardChoice{min-height:130px;display:flex;flex-direction:column;justify-content:center;text-align:center}
    .rewardChoice .rewardType{font-size:8px;letter-spacing:.16em;color:#6f9d96;margin-bottom:7px}
    .rewardChoice b{color:#e8a04c;font-size:12px;line-height:1.3}
    .rewardChoice span{display:block;color:#9fd2c9;font-size:10px;line-height:1.45;margin-top:8px}
    #cardRewardSkip{width:100%;font-family:inherit;font-size:10px;letter-spacing:.15em;color:#8ebbb3;background:transparent;border:1px solid #2c4a47;border-radius:6px;padding:11px;margin-top:10px}
    @media(max-width:680px){
      #startCard.runDraftCard{padding:12px}
      #runOfferGrid{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:5px}
      .runOffer{min-width:min(78vw,260px);scroll-snap-align:center}
      #cardRewardChoices{grid-template-columns:1fr}
      .rewardChoice{min-height:82px}
      #cardRewardGate{align-items:flex-start;overflow:auto;padding-top:max(14px,env(safe-area-inset-top))}
    }
  `;
  document.head.appendChild(style);
}

function forceArenaReset(api) {
  const panel = document.getElementById('panel');
  const resetButton = document.getElementById('resetBtn');
  if (!panel || !resetButton) return;
  panel.classList.remove('hidden');
  resetButton.click();
}

function setOpeningStance(api, stance) {
  if (!stance) return;
  api.arena.stance = stance;
  api.arena.stanceIndex = 0;
  api.PC.setReadyPose?.(guardPoseFor(stance));
}

export function installRunDraft(deck) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__STONE_RUN_DRAFT_INSTALLED__) return;
  const startGate = document.getElementById('startGate');
  const startCard = document.getElementById('startCard');
  if (!startGate || !startCard) return;
  window.__STONE_RUN_DRAFT_INSTALLED__ = true;
  addStyles();

  const starters = STARTER_STANCE_IDS.map(id => STANCE_CARDS.find(card => card.id === id)).filter(Boolean);
  if (starters.length !== STARTER_STANCE_IDS.length) {
    console.error('Run setup missing starter stances', STARTER_STANCE_IDS);
    return;
  }

  const state = { api:null, setupOpen:true, rewardOpen:false, seenCleared:0 };
  const title = document.createElement('div'); title.className='sgTitle'; title.textContent='CHOOSE A LOADOUT';
  const hint = document.createElement('div'); hint.className='sgHint'; hint.textContent='Pick one complete offer. Every run starts with Rat Step and Deep Launch.';
  const offerGrid = document.createElement('div'); offerGrid.id='runOfferGrid';
  const actions = document.createElement('div'); actions.id='runSetupActions';
  const fullscreenButton = document.getElementById('sgFsBtn');
  if (fullscreenButton) actions.appendChild(fullscreenButton);
  startCard.classList.add('runDraftCard');
  startCard.replaceChildren(title, hint, offerGrid, actions);

  const rewardGate = document.createElement('div'); rewardGate.id='cardRewardGate'; rewardGate.className='hidden';
  rewardGate.innerHTML = `<div id="cardRewardCard"><div id="cardRewardTitle">ROOM CLEAR</div><div id="cardRewardHint">Choose one card for the run, or skip.</div><div id="cardRewardChoices"></div><button id="cardRewardSkip">SKIP</button></div>`;
  document.body.appendChild(rewardGate);
  const rewardChoices = rewardGate.querySelector('#cardRewardChoices');
  const rewardSkip = rewardGate.querySelector('#cardRewardSkip');

  function closeReward() {
    state.rewardOpen = false;
    rewardGate.classList.add('hidden');
    if (state.api && !state.setupOpen && document.getElementById('panel')?.classList.contains('hidden')) state.api.arena.paused = false;
  }

  function openReward() {
    if (!state.api || state.rewardOpen || state.setupOpen) return;
    state.rewardOpen = true;
    state.api.arena.paused = true;
    const choices = drawRewardChoices();
    rewardChoices.replaceChildren(...choices.map(card => {
      const button = document.createElement('button');
      button.className='rewardChoice';
      button.innerHTML = `<div class="rewardType">${isNonStance(card) ? 'ABILITY' : 'STANCE'}</div><b>${cleanName(card)}</b><span>${cardSubtitle(card)}</span>`;
      button.addEventListener('click', () => { deck.addCard(card); closeReward(); });
      return button;
    }));
    rewardGate.classList.remove('hidden');
  }
  rewardSkip.addEventListener('click', closeReward);

  function renderOffers() {
    const offers = buildRunOffers();
    offerGrid.replaceChildren(...offers.map(offer => {
      const weapon = STONE_WEAPONS[offer.weaponId] || { label:offer.weaponId, profile:'' };
      const button = document.createElement('button');
      button.className='runOffer';
      const fixed = starters.map(card => `<div class="runFixedStance"><b>${cleanName(card)}</b>${cardSubtitle(card)}</div>`).join('');
      const cards = offer.cards.map(card => `<div class="runStarterCard"><b>${cleanName(card)}</b><span>${cardSubtitle(card)}</span></div>`).join('');
      button.innerHTML = `<div class="runOfferWeapon">${weapon.label}</div><div class="runOfferProfile">${weapon.profile || ''}</div><div class="runFixedStances">${fixed}</div><div class="runStarterCards">${cards}</div>`;
      button.addEventListener('click', () => chooseOffer(offer));
      return button;
    }));
  }

  function openSetup() {
    if (!state.api) return;
    state.setupOpen = true;
    state.api.arena.paused = true;
    renderOffers();
    startGate.classList.remove('hidden');
  }

  function chooseOffer(offer) {
    const api = state.api;
    if (!api) return;
    deck.unlockRun();
    api.PC.selectCombatWeapon(offer.weaponId);
    StoneSettings.set('arena.weapon', offer.weaponId);
    deck.beginRun([...starters, ...offer.cards], { openingStanceId:STARTER_STANCE_IDS[0] });
    api.arena.started = true;
    state.setupOpen = false;
    startGate.classList.add('hidden');
    forceArenaReset(api);
    setOpeningStance(api, starters[0]);
    state.seenCleared = api.encounterState?.progress?.cleared || 0;
    api.arena.paused = false;
  }

  const topBar = document.getElementById('topBar');
  if (topBar && !document.getElementById('runSetupBtn')) {
    const runButton = document.createElement('button');
    runButton.className='tbtn'; runButton.id='runSetupBtn'; runButton.textContent='RUN';
    runButton.title='Choose a new run loadout';
    runButton.addEventListener('click', openSetup);
    topBar.insertBefore(runButton, topBar.firstChild);
  }

  function monitorProgress() {
    if (state.api) {
      const cleared = state.api.encounterState?.progress?.cleared || 0;
      if (state.api.arena.started && cleared > state.seenCleared) {
        state.seenCleared = cleared;
        openReward();
      } else if (cleared < state.seenCleared) {
        state.seenCleared = cleared;
      }
    }
    requestAnimationFrame(monitorProgress);
  }

  function waitForArena() {
    const api = window.__arena;
    if (!api?.PC || api.deck !== deck || !api.arena || !api.encounterState) {
      setTimeout(waitForArena, 40);
      return;
    }
    state.api = api;
    state.seenCleared = api.encounterState.progress?.cleared || 0;
    renderOffers();
    startGate.classList.remove('hidden');
    monitorProgress();
  }
  waitForArena();
}
