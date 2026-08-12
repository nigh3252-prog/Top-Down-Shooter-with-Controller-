import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

const SRC='tools/wol-arcana-phone-demo.src.html';
const BUILT='tools/wol-arcana-phone-demo.html';
const MARKER='/*__THREE_BUNDLE__*/';

const src=read(SRC);
const built=read(BUILT);

// --- the built page must be genuinely standalone -------------------------
assert.ok(src.includes(MARKER),'source template must keep the three.js injection marker');
assert.ok(!built.includes(MARKER),'built page must have the bundle injected');
assert.match(built,/THREE=\{\}|var THREE=/,'built page must inline the three.js bundle');
assert.doesNotMatch(built,/<script[^>]+src=/i,'built page must not load any external script');
assert.doesNotMatch(built,/(?:src|href)=["']https?:/i,'built page must not fetch remote assets');
assert.doesNotMatch(built,/@import\s+url\(/i,'built page must not pull remote stylesheets or fonts');
assert.equal(
  built,
  src.replace(MARKER,()=>built.slice(built.indexOf('<script>')+8,built.indexOf('</script>'))),
  'built page must be the source template with only the bundle substituted — rerun scripts/build-wol-arcana-phone-demo.mjs',
);

// --- phone-first contract ------------------------------------------------
assert.match(src,/name="viewport"[^>]*width=device-width/,'demo must declare a device-width viewport');
assert.match(src,/viewport-fit=cover/,'demo must opt into the display cutout area');
assert.match(src,/touch-action:\s*none/,'demo must suppress browser touch gestures over the canvas');
assert.match(src,/env\(safe-area-inset-bottom/,'controls must respect the bottom safe area');
assert.match(src,/pointerdown/,'movement and casting must be driven by pointer events');

// --- authored constants must match the source notes ----------------------
// archive/wizard-of-legend/source-notes/07-fire-standards-1.md  (37. Blazing Lariat)
const lariat=src.match(/const LARIAT = \{[\s\S]*?\n\};/)[0];
assert.match(lariat,/cooldown:\s*5\.5\b/,'Blazing Lariat cooldown is documented as 5.5 seconds');
assert.match(lariat,/damage:\s*26\b/,'each Blazing Lariat sweep hit is documented at 26 damage');
assert.match(lariat,/knockback:\s*20\b/,'Blazing Lariat knockback is a documented value');
assert.match(lariat,/whips:\s*3\b/,'charged Signature is documented as three whips');
assert.match(lariat,/reachEnhanced:\s*6\.6/,'enhancement must lengthen the base whip');
assert.ok(/revolutions:\s*([2-9])/.test(lariat),'charged whips must complete multiple revolutions');
assert.match(lariat,/hitCooldown:\s*0\.\d+/,'charged overlap must be bounded by a per-target hit cooldown');

// archive/wizard-of-legend/source-notes/08-fire-standards-2.md  (39. Explosive Charge)
const charge=src.match(/const CHARGE = \{[\s\S]*?\n\};/)[0];
assert.match(charge,/maxCharges:\s*3\b/,'Explosive Charge stores three charges');
assert.match(charge,/recharge:\s*3\.5\b/,'each Explosive Charge recovers in 3.5 seconds');
assert.match(charge,/contactDamage:\s*5\b/,'contact damage is documented at 5');
assert.match(charge,/fuse:\s*1(\.0)?\b/,'the marker fuse is documented at one second');
assert.match(charge,/blastDamage:\s*25\b/,'detonation damage is documented at 25');

// --- mechanics the notes single out as failure modes ---------------------
assert.match(src,/dir:\s*d\.dir\.clone\(\)/,'each marker must save the dash direction it was applied with');
assert.match(src,/e\.markers\.splice\(i, 1\)/,'detonation must remove only the marker instance that fired');
assert.match(src,/d\.markers\.length = 0;/,'target death must drop that target\'s pending markers');
assert.match(src,/hits: new Map\(\)/,'each whip must own its per-target hit ledger');
assert.match(src,/whipSamples/,'contact must be resolved against the sampled lash, not a radial disc');
assert.doesNotMatch(src,/\bfollow: true[\s\S]{0,400}group: 'charged'/,'charged whips stay anchored to their activation centre');

// --- the notes shipped inside the page must stay attached ----------------
for(const needle of ['BLAZING LARIAT','EXPLOSIVE CHARGE','244','255','259','265']){
  assert.ok(src.includes(needle),`in-page source notes must mention ${needle}`);
}

const checkIds=[...src.matchAll(/checks\.mark\('([A-Z]\d+)'\)/g)].map(m=>m[1]);
const checkText=src.match(/const CHECK_TEXT = \{[\s\S]*?\n\};/)[0];
for(const id of new Set(checkIds)){
  assert.ok(checkText.includes(`${id}:`),`live acceptance check ${id} must have display text`);
}
assert.ok(new Set(checkIds).size>=24,'both acceptance-test sets must be wired to live checks');

console.log('wol-arcana-phone-demo: ok');
