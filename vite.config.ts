import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const { version: packageVersion } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { readonly version: string };

export default defineConfig({
  plugins: [react()],
  define: {
    __DOMHAMSTER_RELEASE_VERSION__: JSON.stringify(
      process.env.DOMHAMSTER_RELEASE_VERSION ?? packageVersion,
    ),
    __DOMHAMSTER_COMMIT_REF__: JSON.stringify(process.env.COMMIT_REF ?? 'local'),
    __DOMHAMSTER_BUILT_AT__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
