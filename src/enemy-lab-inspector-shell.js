export const ENEMY_LAB_INSPECTOR_HEADER_HEIGHT=30;
export const ENEMY_LAB_INSPECTOR_CLOSE_TARGET=44;

// These are the only normal shell-level scrollers. Compound editor panes are
// deliberately recorded below instead of being hidden by a broad CSS rule.
export const ENEMY_LAB_INSPECTOR_SCROLL_OWNERS=Object.freeze(['#labCategories','#labValues']);

// Gate 1 keeps these specialized editors intact because collapsing them into
// the section scroller would change card/deck and Arcana editing behavior.
// They are the explicit Gate 3 compound-editor migration inventory.
export const ENEMY_LAB_RETAINED_COMPOUND_SCROLLERS=Object.freeze([
  Object.freeze({
    selector:'.deckEditorCardsPane',
    reason:'The card browser keeps an independent, long catalog beside its editor controls.',
    migration:'Gate 3 — compound deck-editor migration',
  }),
  Object.freeze({
    selector:'.deckEditorControlsPane',
    reason:'Deck editing controls preserve their own reading position while the card catalog changes.',
    migration:'Gate 3 — compound deck-editor migration',
  }),
  Object.freeze({
    selector:'.arcanaTweaksMain, .arcanaTweaksSide',
    reason:'Arcana’s paired tuning panes intentionally compare independent long control sets.',
    migration:'Gate 3 — compound Arcana-editor migration',
  }),
  Object.freeze({
    selector:'#hitFeelPanel',
    reason:'Hit Feel is an existing standalone diagnostic tool whose internal scroll behavior is coupled to its visual tuning controls.',
    migration:'Gate 3 — compound Hit Feel tool migration',
  }),
]);

const asSectionId=value=>String(value||'').trim().toLowerCase();
const asScrollTop=value=>Math.max(0,Number(value)||0);

export function createEnemyLabSectionScrollMemory({sectionIds=[]}={}){
  const allowed=new Set((sectionIds||[]).map(asSectionId).filter(Boolean));
  const positions=new Map();
  let activeSection='';
  const known=id=>!allowed.size||allowed.has(asSectionId(id));

  return Object.freeze({
    activate(sectionId){
      const id=asSectionId(sectionId);
      if(!id||!known(id))return false;
      activeSection=id;
      return true;
    },
    get activeSection(){return activeSection;},
    remember(sectionId,scrollTop){
      const id=asSectionId(sectionId);
      if(!id||!known(id))return false;
      positions.set(id,asScrollTop(scrollTop));
      return true;
    },
    restore(sectionId){
      const id=asSectionId(sectionId);
      return id&&known(id)?positions.get(id)||0:0;
    },
    clear(sectionId){
      const id=asSectionId(sectionId);
      return id?positions.delete(id):false;
    },
    snapshot(){return Object.freeze(Object.fromEntries(positions));},
  });
}
