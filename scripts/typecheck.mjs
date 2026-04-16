import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const files = [
  'src/app/main.js',
  'src/data/missions/index.js',
  'src/features/gameplay/engine.js',
  'src/lib/storage.js',
  'src/lib/analytics.js',
  'tests/engine.test.mjs',
  'scripts/build.mjs',
  'scripts/dev.mjs',
  'scripts/lint.mjs',
];

const failures = [];

for (const relativePath of files) {
  const absolutePath = resolve(process.cwd(), relativePath);
  const result = spawnSync(process.execPath, ['--check', absolutePath], {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    failures.push(`\n[${relativePath}]\n${result.stderr || result.stdout}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Typecheck equivalent OK (${files.length} files syntax-checked)`);
