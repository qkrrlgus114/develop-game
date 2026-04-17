import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const files = [
  'index.html',
  'src/app/main.js',
  'src/app/stepInputState.js',
  'src/data/missions/index.js',
  'src/features/gameplay/engine.js',
  'src/lib/storage.js',
  'src/lib/analytics.js',
  'src/styles/app.css',
  'scripts/build.mjs',
  'scripts/dev.mjs',
  'scripts/typecheck.mjs',
  'tests/engine.test.mjs',
];

const problems = [];

for (const relativePath of files) {
  const contents = await readFile(resolve(process.cwd(), relativePath), 'utf8');
  const lines = contents.split('\n');
  lines.forEach((line, index) => {
    const normalizedLine = line.replace(/\r$/, '');

    if (/[ \t]+$/.test(normalizedLine)) {
      problems.push(`${relativePath}:${index + 1} trailing whitespace`);
    }
    if (/\t/.test(normalizedLine)) {
      problems.push(`${relativePath}:${index + 1} tab indentation is not allowed`);
    }
  });
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log(`Lint OK (${files.length} files checked)`);