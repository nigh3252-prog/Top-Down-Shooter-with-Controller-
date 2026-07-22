import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('ability carousel is always active and details are progressive',async()=>{
  const runtime=await readFile(new URL('../src/ability-tryout-runtime.js',import.meta.url),'utf8');
  const ui=await readFile(new URL('../src/ability-tryout-ui.js',import.meta.url),'utf8');
  assert.match(runtime,/detailsOpen:false/);
  assert.match(runtime,/document\.body\.classList\.add\('ability-tryout-on'\)/);
  assert.doesNotMatch(ui,/CONTROL MODE/);
  assert.match(ui,/id="atDetails"/);
  assert.match(ui,/abilityTryoutInfo\.hidden/);
  assert.match(ui,/enemyLabFullscreenBtn/);
  assert.match(ui,/requestFullscreen/);
});
