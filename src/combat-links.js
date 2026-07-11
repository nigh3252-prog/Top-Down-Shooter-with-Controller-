// Pure combo-link decisions shared by the browser runtime and node tests.

export const HEAVY_LIGHT_STAGE = 'heavyLight';

export function lightFollowupForStage(stage) {
  if(stage === 'hit1' || stage === 'hit1Ready') return { slot:1, pendingStage:'hit2' };
  if(stage === 'heavy') return { slot:0, pendingStage:HEAVY_LIGHT_STAGE };
  return null;
}

export function shouldStartBufferedFollowup(attack, attackTime, pendingKey) {
  return !!(attack && pendingKey && attackTime >= attack.comboAt);
}

