import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const required = {
  dependencies: ['ajv', 'react', 'react-dom'],
  devDependencies: [
    '@eslint/js',
    '@playwright/test',
    '@testing-library/dom',
    '@testing-library/jest-dom',
    '@testing-library/react',
    '@testing-library/user-event',
    '@types/node',
    '@types/react',
    '@types/react-dom',
    '@vitejs/plugin-react',
    '@vitest/coverage-v8',
    'eslint',
    'eslint-plugin-react-hooks',
    'eslint-plugin-react-refresh',
    'globals',
    'jsdom',
    'prettier',
    'typescript',
    'typescript-eslint',
    'vite',
    'vitest',
  ],
};

const invalid = [];
for (const [group, names] of Object.entries(required)) {
  const values = packageJson[group] ?? {};
  for (const name of names) {
    const value = values[name];
    if (typeof value !== 'string') {
      invalid.push(`${group}.${name}=missing`);
      continue;
    }
    if (/^(\^|~|>|<|=|\*|latest$|workspace:|file:|git\+|https?:)/.test(value)) {
      invalid.push(`${group}.${name}=${value}`);
    }
  }
}

if (invalid.length > 0) {
  console.error(`DOMHAMSTER_DEPENDENCY_POLICY_FAILED: ${invalid.join(', ')}`);
  process.exit(1);
}

console.log('All required dependencies are present and exact.');
