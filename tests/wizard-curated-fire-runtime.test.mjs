import assert from 'node:assert/strict';
import { createWizardCuratedFireSourcePort } from '../src/wizard-curated-fire-source-port.js';

class Vector2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  set(x = 0, y = 0) { this.x = x; this.y = y; return this; }
  clone() { return new Vector2(this.x, this.y); }
  addScaledVector(value, scale) { this.x += value.x * scale; this.y += value.y * scale; return this; }
  lerpVectors(a, b, t) { this.x = a.x + (b.x - a.x) * t; this.y = a.y + (b.y - a.y) * t; return this; }
  lengthSq() { return this.x * this.x + this.y * this.y; }
  normalize() { const length = Math.hypot(this.x, this.y) || 1; this.x /= length; this.y /= length; return this; }
}

class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; return this; }
}

class Object3D {
  constructor() {
    this.children = [];
    this.parent = null;
    this.position = new Vector3();
    this.rotation = new Vector3();
    this.scale = { x: 1, y: 1, z: 1, setScalar(value) { this.x = value; this.y = value; this.z = value; } };
    this.userData = {};
    this.visible = true;
  }
  add(...children) { for (const child of children) { child.parent = this; this.children.push(child); } return this; }
  remove(child) { const index = this.children.indexOf(child); if (index >= 0) this.children.splice(index, 1); child.parent = null; }
  traverse(visitor) { visitor(this); for (const child of this.children) child.traverse?.(visitor); }
}

class Group extends Object3D {}
class Mesh extends Object3D { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; } }
class DataTexture { dispose() {} }
class PlaneGeometry {
  constructor() { this.index = {}; this.attributes = { position: {}, uv: {} }; }
  getAttribute(name) { return this.attributes[name]; }
  dispose() {}
}
class InstancedBufferGeometry {
  setAttribute(name, value) { this.attributes = this.attributes || {}; this.attributes[name] = value; }
  dispose() {}
}
class InstancedBufferAttribute {
  constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; }
  setUsage() { return this; }
}
class ShaderMaterial { dispose() {} }
class PerspectiveCamera {}

const THREE = {
  Vector2,
  Vector3,
  Group,
  Mesh,
  DataTexture,
  PlaneGeometry,
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  ShaderMaterial,
  PerspectiveCamera,
  DynamicDrawUsage: 'dynamic',
  AdditiveBlending: 'additive',
  NormalBlending: 'normal',
};

const scene = new Group();
const player = { x: 0, z: 0, forward: { x: 1, z: 0 } };
const target = { id: 'burn-lethal', x: 4, z: 0, hp: 54, maxHp: 54, radius: .8 };
const damageEvents = [];
const port = createWizardCuratedFireSourcePort({
  THREE,
  scene,
  player,
  targets: [target],
  callbacks: {
    onDamage(ref, amount, detail) {
      ref.hp -= amount;
      damageEvents.push({ amount, kind: detail.kind });
    },
  },
});

assert.equal(port.cast('BLAZING-LARIAT', { direction: { x: 1, z: 0 } }), true);
for (let index = 0; index < 60; index += 1) port.update(.02);

assert.ok(damageEvents.some(event => event.kind === 'lariat'), 'the lariat should attach burn to a target it hits');
assert.ok(damageEvents.some(event => event.kind === 'burn'), 'the burn should tick after the lariat hit');
assert.equal(target.hp, 0, 'the burn tick may kill the target');
port.dispose();

console.log('Curated fire burn death cleanup: ok');
