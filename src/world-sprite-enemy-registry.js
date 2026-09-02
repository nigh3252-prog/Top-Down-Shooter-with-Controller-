import { createAccordionEnemySpriteDefinition } from './accordion-enemy-sprite.js';

// One registry feeds every Three.js surface. New 2D enemy families add their
// painter here once instead of teaching each renderer a new branch.
export const WORLD_SPRITE_ENEMY_DEFINITION_IDS=Object.freeze(['accordion2d']);

export function createWorldSpriteEnemyDefinitions({ImageCtor=globalThis.Image}={}){
  return Object.freeze([
    createAccordionEnemySpriteDefinition({ImageCtor}),
  ]);
}
