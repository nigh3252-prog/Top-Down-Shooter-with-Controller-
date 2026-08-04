#!/usr/bin/env python3
from pathlib import Path

path=Path('tests/stance-gate5-input-seam.test.mjs')
source=path.read_text()
old="""assert.match(arena,/function defenseDown\\(source='input'\\)\\{/);
assert.match(arena,/window\\.__stance2Gate5Runtime\\?\\.defenseDown\\?\\.\\(source\\)/);
assert.match(arena,/if\\(result\\?\\.handled\\) return result;[\\s\\S]*?triggerDodge\\(\\);/);
assert.match(inputSection,/if\\(e\\.key==='k'\\) defenseDown\\('keyboard'\\);/);
assert.match(inputSection,/if\\(e\\.key==='k'\\) defenseUp\\('keyboard'\\);/);
assert.match(inputSection,/if\\(dge && !padPrev\\.dge\\) defenseDown\\('gamepad'\\);/);
assert.match(inputSection,/if\\(!dge && padPrev\\.dge\\) defenseUp\\('gamepad'\\);/);"""
new="""assert.match(arena,/function defenseDown\\(source='input'\\)\\{/);
assert.match(arena,/const runtime=window\\.__stance2Gate5Runtime;/);
assert.match(arena,/runtime\\?\\.defenseDown\\?\\.\\(source\\)/);
assert.match(arena,/if\\(result\\?\\.handled\\)return result;/);
assert.match(arena,/hammerfall-fallback/);
assert.match(inputSection,/if\\(e\\.key==='k'\\) defenseDown\\('keyboard'\\);/);
assert.match(inputSection,/if\\(e\\.key==='k'\\) defenseUp\\('keyboard'\\);/);
assert.match(inputSection,/const cross = bd\\(0\\);/);
assert.match(inputSection,/const leftTrigger = bd\\(6\\);/);
assert.match(inputSection,/crossPressed\\|\\|leftTriggerPressed/);
assert.match(inputSection,/gamepad-cross/);
assert.doesNotMatch(inputSection,/padPrev\\.dge/);"""
if new not in source:
    if source.count(old)!=1:
        raise SystemExit('stance-gate5-input-seam.test.mjs: unexpected assertions')
    path.write_text(source.replace(old,new))
print('Gate 5 input seam test updated')
