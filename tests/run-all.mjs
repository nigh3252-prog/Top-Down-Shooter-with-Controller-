import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const tests = readdirSync(testDirectory)
  .filter(name => name.endsWith('.test.mjs'))
  .sort();

const failures = [];

for (const test of tests) {
  const result = spawnSync(process.execPath, [resolve(testDirectory, test)], {
    cwd: resolve(testDirectory, '..'),
    env: process.env,
    stdio: 'inherit',
  });

  if (result.status !== 0) failures.push(test);
}

if (failures.length) {
  console.error(`\nFailed test files (${failures.length}):`);
  for (const test of failures) console.error(`- ${test}`);
  process.exitCode = 1;
} else {
  console.log(`\nAll ${tests.length} test files passed.`);
}
