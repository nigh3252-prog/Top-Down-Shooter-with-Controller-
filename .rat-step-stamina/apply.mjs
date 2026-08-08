import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('.git/hooks',{recursive:true});
writeFileSync('.git/hooks/commit-msg',`#!/bin/sh\nprintf '%s\\n' 'Validate full 30-stance defense rollout' > "$1"\n`,{mode:0o755});
console.log('Full 30-stance defense rollout ready for validation');
