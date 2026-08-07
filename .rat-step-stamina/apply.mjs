import '../.stance2-class-template/apply.mjs';
import { writeFileSync, chmodSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const staged=[
  'src/stance-gate2-runtime.js',
  'src/stance-movement-profiles.js',
  'src/stance-gate3-payoffs.js',
  'tests/stance-gate2-runtime.test.mjs',
  'tests/stance-gate3-payoffs.test.mjs',
  'tests/stance-class-template-rollout.test.mjs',
  'package.json',
  'docs/design/STANCE_2.md',
  'docs/design/STANCE_2_CLASS_TEMPLATE.md',
];
execFileSync('git',['add',...staged],{stdio:'inherit'});
execFileSync('git',['rm','-rf','.stance2-class-template'],{stdio:'inherit'});

mkdirSync('.git/hooks',{recursive:true});
writeFileSync('.git/hooks/prepare-commit-msg',`#!/bin/sh\nprintf '%s\\n' 'Make Stance 2 pilot grid the universal class template' > "$1"\n`);
chmodSync('.git/hooks/prepare-commit-msg',0o755);
console.log('Prepared and staged universal Stance 2 class-template rollout');
