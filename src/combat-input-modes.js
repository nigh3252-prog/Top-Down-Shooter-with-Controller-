// Combat input timing presets and pure queue helpers shared by the arena and tests.

export const DEFAULT_COMBAT_INPUT_MODE = 'flow';

export const COMBAT_INPUT_MODES = Object.freeze([
  Object.freeze({
    id:'flow',
    label:'Hades Flow',
    note:'220ms one-deep buffer · light attacks loop · heavy replaces the queued light',
    bufferSeconds:.22,
    persistentBuffer:false,
    requireHitToLink:false,
    loopLights:true,
    missLock:false,
    postSecondLock:false,
    allowHeavyBuffer:true,
  }),
  Object.freeze({
    id:'brawler',
    label:'Absolum Brawler',
    note:'Persistent one-deep intent · mash-friendly light loop · heavy replaces the queued light',
    bufferSeconds:Infinity,
    persistentBuffer:true,
    requireHitToLink:false,
    loopLights:true,
    missLock:false,
    postSecondLock:false,
    allowHeavyBuffer:true,
  }),
  Object.freeze({
    id:'precision',
    label:'Melee Precision',
    note:'60ms buffer · deliberate links · no extra punishment when a link is missed',
    bufferSeconds:.06,
    persistentBuffer:false,
    requireHitToLink:false,
    loopLights:true,
    missLock:false,
    postSecondLock:false,
    allowHeavyBuffer:true,
  }),
  Object.freeze({
    id:'legacy',
    label:'Legacy Hit Confirm',
    note:'Original hit-gated links · missed-link lock · post-second-light finisher pause',
    bufferSeconds:0,
    persistentBuffer:false,
    requireHitToLink:true,
    loopLights:false,
    missLock:true,
    postSecondLock:true,
    allowHeavyBuffer:false,
  }),
]);

const MODES_BY_ID = new Map(COMBAT_INPUT_MODES.map(mode => [mode.id, mode]));

export function getCombatInputMode(id = DEFAULT_COMBAT_INPUT_MODE) {
  return MODES_BY_ID.get(id) || MODES_BY_ID.get(DEFAULT_COMBAT_INPUT_MODE);
}

export function bufferExpiresAt(modeOrId, now) {
  const mode = typeof modeOrId === 'string' ? getCombatInputMode(modeOrId) : modeOrId;
  if(mode.persistentBuffer || !Number.isFinite(mode.bufferSeconds)) return Infinity;
  return now + Math.max(0, mode.bufferSeconds);
}

export function lightFollowupForActiveMove({ activeSlot=-1, stage='idle', mode=DEFAULT_COMBAT_INPUT_MODE } = {}) {
  const config = typeof mode === 'string' ? getCombatInputMode(mode) : mode;
  if(stage === 'heavyLight' || stage === 'heavyLightQueued') return null;
  if(stage === 'heavy' || activeSlot === 2) return { slot:0, pendingStage:'heavyLight' };
  if(activeSlot === 0 || stage === 'hit1' || stage === 'hit1Ready') return { slot:1, pendingStage:'hit2' };
  if(config.loopLights && (activeSlot === 1 || stage === 'hit2')) return { slot:0, pendingStage:'hit1' };
  return null;
}

export function shouldExpireBufferedInput({
  mode=DEFAULT_COMBAT_INPUT_MODE,
  now=0,
  expiresAt=Infinity,
  attackTime=0,
  comboAt=Infinity,
} = {}) {
  const config = typeof mode === 'string' ? getCombatInputMode(mode) : mode;
  if(config.persistentBuffer || !Number.isFinite(expiresAt)) return false;
  return now > expiresAt && attackTime < comboAt;
}
