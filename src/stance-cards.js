import { listCards } from './card-registry.js';

// Compatibility view retained for existing arena, Lab, and saved-run callers.
// Definitions live in stance-card-definitions.js and enter through the registry.
export const STANCE_CARDS = listCards({family:'stance'});
