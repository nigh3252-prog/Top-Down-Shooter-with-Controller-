import assert from 'node:assert/strict';
import * as THREE from 'three';
import { installPlayerCombat } from '../../../src/player-combat-core.js';
import { cloneWeaponDefinitions, STONE_WEAPON_ORDER } from '../../../src/weapons.js';

const gradient = { addColorStop() {} };
const context = new Proxy({
  createLinearGradient() { return gradient; },
}, {
  get(target, key) { return key in target ? target[key] : (() => {}); },
  set(target, key, value) { target[key] = value; return true; },
});
globalThis.document ??= {
  createElement() {
    return { width: 1, height: 1, getContext: () => context };
  },
};

const scene = new THREE.Scene();
const actorVisual = new THREE.Group();
const activeModel = new THREE.Group();
actorVisual.add(activeModel);
scene.add(actorVisual);

const material = color => new THREE.MeshStandardMaterial({ color });
const materials = {
  matCoat: material(0x26383a),
  matIron: material(0x373c3c),
  matBronze: material(0xb57a35),
  matLeather: material(0x33251b),
  matSilver: material(0xcad7d4),
  matGlow: material(0xffb061),
};
const WEAPONS = cloneWeaponDefinitions();
const yawQ = new THREE.Quaternion();
const combat = installPlayerCombat({
  THREE,
  scene,
  get WEAPONS() { return WEAPONS; },
  get WEAPON_ORDER() { return STONE_WEAPON_ORDER; },
  materials,
  facet: geometry => geometry,
  get activeModel() { return activeModel; },
  get actorVisual() { return actorVisual; },
  get W() { return null; },
  get yawQ() { return yawQ; },
  getGroundHeight: () => 0,
  hooks: {
    resolveAttackFacing: () => ({ angle: 0 }),
    commitFacing() {},
    detectHits() {},
    onWeaponSelected() {},
    onWeaponUISync() {},
  },
});

combat.combatState.hideArms = true;
combat.combatState.floorBlend = 0;
combat.combatState.puppetScale = 1;
combat.attachCombatToActiveModel();

for (const weaponId of STONE_WEAPON_ORDER) {
  combat.selectCombatWeapon(weaponId);
  combat.startCombatAttack('horizontal', 'horizontal');
  for (let frame = 0; frame < 8; frame += 1) {
    combat.updateCombat(1 / 60, frame / 60, 0, 1 / 60);
  }
  assert.ok(combat.weaponRoot?.children?.length, `${weaponId} uses the shared weapon driver`);
  combat.combatState.attack = null;
  combat.combatState.t = 0;
}

combat.disposeCombat();
Object.values(materials).forEach(entry => entry.dispose());
console.log(`Ecctrl shared combat driver: ${STONE_WEAPON_ORDER.length} weapons passed`);
