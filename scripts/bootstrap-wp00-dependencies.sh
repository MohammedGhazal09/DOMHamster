#!/usr/bin/env bash
set -euo pipefail

node_major="$(node --version | sed -E 's/^v([0-9]+).*/\1/')"
if [[ "$node_major" != "24" ]]; then
  printf 'DOMHAMSTER_NODE_VERSION_MISMATCH: expected Node 24.x, found %s\n' "$(node --version)" >&2
  exit 24
fi

npm install --save-exact \
  react@19.2.8 \
  react-dom@19.2.8 \
  ajv@8.20.0

npm install --save-dev --save-exact \
  @eslint/js@10.0.1 \
  @playwright/test@1.62.1 \
  @testing-library/dom@10.4.1 \
  @testing-library/jest-dom@7.0.0 \
  @testing-library/react@16.3.2 \
  @testing-library/user-event@14.6.6 \
  @types/node@24.10.1 \
  @types/react@19.2.18 \
  @types/react-dom@19.2.4 \
  @vitejs/plugin-react@6.1.0 \
  @vitest/coverage-v8@4.1.11 \
  eslint@10.9.1 \
  eslint-plugin-react-hooks@7.1.1 \
  eslint-plugin-react-refresh@0.5.4 \
  globals@17.11.0 \
  jsdom@30.0.1 \
  prettier@3.9.6 \
  typescript@6.0.3 \
  typescript-eslint@8.67.0 \
  vite@8.2.2 \
  vitest@4.1.11

node scripts/verify-exact-dependencies.mjs
