import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

execFileSync('node',['.stance2-adjacent-procedural/apply.mjs'],{stdio:'inherit'});
if(existsSync('.stance2-adjacent-procedural/apply.mjs'))execFileSync('git',['rm','-f','.stance2-adjacent-procedural/apply.mjs'],{stdio:'inherit'});
execFileSync('git',['add','src/stance-attack-adapters.js','src/stance-gate2-runtime.js','tests/stance-gate2-runtime.test.mjs','tests/stance-class-template-rollout.test.mjs','docs/design/STANCE_2_CLASS_TEMPLATE.md'],{stdio:'inherit'});
console.log('Prepared and staged adjacent-weight procedural stance retargeting');
