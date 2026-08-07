import '../.parry-stagger/apply.mjs';
import { execFileSync } from 'node:child_process';

execFileSync('git',['add',
  'src/arena-enemies-base.js',
  'src/stance-defense-profiles.js',
  'src/stance-gate5-defense.js',
  'src/stance-gate5-visuals.js',
  'tests/long-blade-parry-stagger.test.mjs',
  'package.json',
  'docs/design/STANCE_2_GATE_5_PILOT.md',
],{stdio:'inherit'});
execFileSync('git',['rm','-rf','.parry-stagger'],{stdio:'inherit'});
console.log('Parry stagger/flair changes staged for the registered test runner');
