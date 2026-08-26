# DOMHamster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, verify, deploy, document, and submit the approved DOMHamster WebMCP application without reopening the frozen product scope.

**Architecture:** DOMHamster is a static React/TypeScript/Vite single-page application. A pure domain engine, serialized external store, and versioned persistence layer are shared by the visible UI and twelve state-aware WebMCP handlers; handlers never inspect or click presentation DOM. Human-only UI controls own locks, approval decisions, discard, cancellation, and reset, while the browser agent can read, draft, revise, prepare review, commit an already approved version, and access explicitly requested fictional contacts after commit.

**Tech Stack:** Node.js 24 LTS, npm, React 19, TypeScript 6.0.3, Vite 8, Ajv, Vitest, React Testing Library, Playwright, ESLint flat config, Prettier, plain CSS, GitHub Actions, and Netlify.

**Spec:** `MASTERPLAN.md` (execution checkpoint 0.17.1; product contracts remain those approved in 0.12.0)

## Execution status — checkpoint 0.17.1

The checklists below remain the approved procedure. Completion is controlled by the public commit and workflow evidence in this table, not by projected or unchecked steps.

| Priority | Work package | Status | Public evidence |
|---:|---|---|---|
| P0 | WP00 — repository/toolchain/minimum shell | **Complete** | RED `32987466258`; feature GREEN `32992239277`; merge `9d5bfd24c93d59816909b515001e6a6eca63e1d5`; main GREEN `32992594799` |
| P0 | WP01 — domain types/frozen fixture | **Complete** | RED `33000968431`; feature GREEN `33002223190` and `33002223215`; merge `bdde92f98f4e951ead4e973d4cbe1d045ff9c9fb`; main GREEN `33002443496`; hash `b861f7e997f2f14e087d209130de7e4aa465d8047110b11872edb7750a2122b1` |
| P0 | WP02 — deterministic validation | **Complete** | RED `33003950723`; feature GREEN `33005698434` and `33005698437`; merge `b28e1a9e901904016e817602799a383be804d9ff`; main GREEN `33006222521` |
| P0 | WP03 — state/commands/approval/commit/audit | **Complete** | RED `33014526107`; GREEN `33015481233`/`33015481223`; second RED `33015830859`; final GREEN `33016006929`/`33016006987`; merge `991d7089903786f76c99c578397d936ca7d4fed7`; main GREEN `33016239969` |
| P0 | WP04 — store/selectors/persistence | **In progress** | Local RED `3523672`, GREEN `902c3d8`, 58-test regression, and exact-base RED/GREEN patch verification are complete; public branch and Node 24 CI remain required |
| P0/P1 | WP05–WP13 | Not started | Later gates remain authoritative |


## Global Constraints

- Repository: public `MohammedGhazal09/domhamster`; default branch `main`; MIT license visible at repository root.
- Runtime: Node.js 24.x in `.nvmrc`, `package.json#engines`, local verification, and GitHub Actions.
- Package policy: resolve current stable compatible packages once, install with `--save-exact`, commit `package-lock.json`, and do not update dependencies after `rc.1` except to fix a release blocker.
- Scope: implement P0 requirements first; P1 work remains below the Phase 11 automatic cut line.
- Data: exactly eight fictional requests and five fictional volunteers; no real personal information, credentials, telemetry, analytics, or external runtime API.
- Source boundaries: UI components do not access `document.modelContext` or `localStorage`; WebMCP code does not inspect, query, or click presentation DOM.
- State authority: all mutations pass through serialized application commands; no direct object mutation from UI, tools, persistence, or tests.
- Human authority: lock, unlock, approve, reject, cancel approval, discard draft, and reset remain UI-only and have no WebMCP tool equivalents.
- Consequential commit: exact-draft-version approval, 120-second expiry, pre-commit revalidation, one-shot commit, and replay prevention are non-negotiable.
- Privacy: pre-commit selectors and tools exclude restricted contact fields; post-commit contact access is explicit, request-scoped, fictional, untrusted, and audited.
- Tool surface: twelve exact imperative tools and the six frozen state-specific tool sets from `MASTERPLAN.md`; metadata/schema changes require rerunning contract tests and all agent evaluations.
- UI: use exact Phase 7 critical copy; semantic native controls; no drag-and-drop dependency; keyboard-complete critical path.
- Development method: red → green → refactor for domain, commands, selectors, handlers, registry, persistence, and critical UI behavior.
- Evidence: no completion claim without a fresh focused command plus all affected regression commands.
- Commits: one coherent work-package commit with the message specified in Task 1–14; never commit failing tests, generated secrets, `node_modules`, browser binaries, or unverified release evidence.
- Deployment: public no-login Netlify site with source-controlled headers; no production environment secrets.
- Freeze: after the submitted `v1.0.0` release, do not alter the judged repository, deployment, video, or Devpost entry during judging.

---

## Execution prerequisites and repository setup

Before Task 1 begins, create the public repository with these settings:

| Setting | Required value |
|---|---|
| Owner/name | `MohammedGhazal09/domhamster` |
| Visibility | Public |
| Description | `Human-approved volunteer coordination through state-aware WebMCP tools.` |
| Initial files | None; the prepared local repository provides the first commit |
| Default branch after first push | `main` |
| Topics after first push | `webmcp`, `ai-agents`, `human-in-the-loop`, `react`, `typescript`, `hackathon` |

Clone or attach the local repository, verify `.worktrees/` is ignored, and implement from an isolated worktree branch. The planned first branch is `implementation/wp00-toolchain`; later work packages may continue on the same reviewed branch or use one branch per package, but no production code is written directly on `main`.

## Planned file map

| Path | Responsibility |
|---|---|
| `src/main.tsx` | Compose ports/store/registry and mount React; no domain rules |
| `src/app/App.tsx` | Compose visible product regions and dialogs |
| `src/app/store.ts` | Serialized `AppStore` implementation |
| `src/app/selectors.ts` | Privacy-bounded view/tool selectors |
| `src/app/ports.ts` | Clock, ID, storage, model-context, and build-info interfaces |
| `src/domain/types.ts` | IDs, entities, workflow states, commands, results, issues, audit types |
| `src/domain/seed.ts` | Immutable fictional fixture and canonical hashing |
| `src/domain/validation.ts` | Pure hard-error/warning validation rules |
| `src/domain/state-machine.ts` | State classification, transition guards, reload normalization, expiry |
| `src/domain/commands.ts` | Pure command reducer and mutation authorization |
| `src/domain/audit.ts` | Bounded append-only audit event factories |
| `src/persistence/local-storage.ts` | Versioned persistence envelope and safe recovery |
| `src/webmcp/contracts.ts` | Twelve static definitions without execute callbacks |
| `src/webmcp/schemas.ts` | Ajv validators and conditional input checks |
| `src/webmcp/handlers.ts` | Tool handlers using only store/ports/domain interfaces |
| `src/webmcp/lifecycle.ts` | Exact state-to-tool-name matrix |
| `src/webmcp/registry.ts` | Serialized generation reconciliation using AbortControllers |
| `src/webmcp/capability.ts` | Secure-context and `document.modelContext` capability adapter |
| `src/diagnostics/diagnostics.ts` | Sanitized build/capability/registry/persistence evidence |
| `src/ui/` | Judge-first semantic React components |
| `src/ui/styles/` | Tokens and responsive layout CSS |
| `tests/` | Unit, integration, component, accessibility, security, and E2E evidence |
| `evals/` | Thirty agent cases, fifty scored trial records, and summaries |
| `scripts/` | Metadata, source-safety, license, bundle, and release verification |
| `.github/workflows/ci.yml` | Node 24 public CI |
| `netlify.toml` | Build, redirect, cache, CSP, and WebMCP headers |
| `release-manifest.json` | Final non-sensitive release identity |

---

### Task 1: WP00 — Repository, toolchain, minimal application, and CI shell — COMPLETE

**Files:**
- Create: `.nvmrc`
- Create: `.npmrc`
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `eslint.config.js`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Create: `index.html`
- Create: `src/vite-env.d.ts`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/App.test.tsx`
- Create: `tests/setup.ts`
- Create: `playwright.config.ts`
- Create: `tests/e2e/smoke.spec.ts`
- Create: `.github/workflows/bootstrap-wp00.yml`
- Create: `.github/workflows/ci.yml`
- Create: `scripts/bootstrap-wp00-dependencies.sh`
- Create: `scripts/verify-exact-dependencies.mjs`
- Create: `tests/toolchain/wp00-contract.test.mjs`
- Create: `docs/execution/WP00_STATUS.md`
- Modify: `.gitignore`
- Modify: `README.md`

**Interfaces:**
- Consumes: approved `MASTERPLAN.md`, Node 24, npm registry access, public GitHub repository.
- Produces: `App(): JSX.Element`; scripts `bootstrap:deps`, `dev`, `build`, `preview`, `typecheck`, `lint`, `format`, `format:check`, `test`, `test:run`, `test:e2e`, `verify`; a reproducible lockfile; pre-lockfile bootstrap evidence; public CI.

- [ ] **Step 1: Confirm runtime and repository state**

Run:

```bash
node --version
npm --version
git status --short --branch
git remote -v
```

Expected: Node reports `v24.x`; the implementation worktree is on `implementation/wp00-toolchain`; `origin` is the public `MohammedGhazal09/domhamster` repository; the worktree is clean.

- [ ] **Step 2: Pin the runtime and exact package set**

Create `.nvmrc` containing `24` and `.npmrc` containing:

```ini
engine-strict=true
save-exact=true
fund=false
audit=true
```

Initialize package metadata and install exact dependencies:

```bash
npm init -y
npm pkg set name=domhamster private=true type=module version=0.0.0
npm pkg set engines.node='>=24 <25'
npm install --save-exact react@19.2.8 react-dom@19.2.8 ajv@8.20.0
npm install --save-dev --save-exact @eslint/js@10.9.1 @playwright/test@1.62.1 @testing-library/dom@10.4.1 @testing-library/jest-dom@7.0.0 @testing-library/react@16.3.2 @testing-library/user-event@14.6.6 @types/node@24.10.1 @types/react@19.2.18 @types/react-dom@19.2.4 @vitejs/plugin-react@6.1.0 @vitest/coverage-v8@4.1.11 eslint@10.9.1 eslint-plugin-react-hooks@7.1.1 eslint-plugin-react-refresh@0.5.4 globals@17.11.0 jsdom@30.0.1 prettier@3.9.6 typescript@6.0.3 typescript-eslint@8.67.0 vite@8.2.2 vitest@4.1.11
```

Review `package.json` and confirm every dependency value is an exact version without `^`, `~`, `latest`, or a range. Commit the generated `package-lock.json`; never hand-edit it.

Compatibility lock: use TypeScript 6.0.3 rather than TypeScript 7 because the selected `typescript-eslint` line officially supports TypeScript versions `<6.1.0`; upgrading TypeScript requires a separately verified linter-compatible package set.

- [ ] **Step 3: Add the first failing component test**

Create `src/app/App.test.tsx` before `src/app/App.tsx`:

```tsx
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('identifies DOMHamster as the human-approved agent dispatcher', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'DOMHamster' })).toBeVisible();
    expect(screen.getByText('The human-approved agent dispatcher')).toBeVisible();
  });
});
```

- [ ] **Step 4: Configure Vitest minimally and verify RED**

Create `tests/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Create `vitest.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./tests/setup.ts'],
    restoreMocks: true,
    clearMocks: true,
    coverage: { reporter: ['text', 'json-summary', 'html'] },
  },
});
```

Run:

```bash
npx vitest run src/app/App.test.tsx
```

Expected: FAIL because `src/app/App.tsx` does not exist.

- [ ] **Step 5: Implement the minimum React surface**

Create `src/app/App.tsx`:

```tsx
export function App() {
  return (
    <main>
      <h1>DOMHamster</h1>
      <p>The human-approved agent dispatcher</p>
    </main>
  );
}
```

Create `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('DOMHAMSTER_ROOT_MISSING');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Create `index.html` with one `#root`, UTF-8, responsive viewport, title `DOMHamster`, and `/src/main.tsx` module entry.

- [ ] **Step 6: Verify GREEN**

Run:

```bash
npx vitest run src/app/App.test.tsx
```

Expected: PASS, one test.

- [ ] **Step 7: Add strict TypeScript, Vite, lint, and formatting configuration**

Use project references: `tsconfig.json` references `tsconfig.app.json` and `tsconfig.node.json`; application config enables `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noFallthroughCasesInSwitch`, `noImplicitOverride`, `verbatimModuleSyntax`, `jsx: react-jsx`, and `noEmit`. Configure Vite with `react()` and build output `dist`. Configure ESLint flat config using `eslint`, `typescript-eslint`, React Hooks, and React Refresh recommended rules. Configure Prettier with semicolons, single quotes, trailing commas, 100-character width, and LF endings.

- [ ] **Step 8: Add package scripts**

Set exact scripts:

```json
{
  "bootstrap:deps": "bash scripts/bootstrap-wp00-dependencies.sh",
  "dev": "vite",
  "build": "npm run typecheck && vite build",
  "preview": "vite preview",
  "typecheck": "tsc -b --pretty false",
  "lint": "eslint . --max-warnings 0",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "test": "vitest",
  "test:run": "vitest run",
  "test:e2e": "playwright test",
  "verify": "npm run format:check && npm run lint && npm run typecheck && npm run test:run && npm run build"
}
```

- [ ] **Step 9: Add a failing browser smoke test and verify RED**

Create `playwright.config.ts` with Chromium only, `baseURL: http://127.0.0.1:4173`, trace on first retry, screenshot only on failure, and a `webServer` running `npm run preview -- --host 127.0.0.1 --port 4173` after a build.

Create `tests/e2e/smoke.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('loads the DOMHamster application shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'DOMHamster' })).toBeVisible();
  await expect(page).toHaveTitle('DOMHamster');
});
```

Run before building:

```bash
npx playwright test tests/e2e/smoke.spec.ts
```

Expected: FAIL because the production build or installed Chromium is unavailable.

- [ ] **Step 10: Build, install Chromium, and verify GREEN**

Run:

```bash
npm run build
npx playwright install --with-deps chromium
npx playwright test tests/e2e/smoke.spec.ts
```

Expected: production build succeeds and the smoke test passes.

- [ ] **Step 11: Add public CI**

Create `.github/workflows/ci.yml` triggered by pull requests and pushes to `main`. Use `actions/checkout@v6`, `actions/setup-node@v6` with Node 24 and npm cache after the lockfile exists, `npm ci`, `npx playwright install --with-deps chromium`, then `npm run verify` and `npm run test:e2e`. Upload Playwright artifacts with `actions/upload-artifact@v7` only on failure and retain them for seven days.

- [ ] **Step 12: Run the WP00 verification set**

Run fresh:

```bash
node --test tests/toolchain/wp00-contract.test.mjs
node scripts/verify-exact-dependencies.mjs
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test:run
npm run build
npm run test:e2e
npm audit --audit-level=high
```

Expected: every command exits 0; audit reports zero high or critical vulnerabilities.

- [ ] **Step 13: Review scope and commit**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Confirm no business rules, fixture data, WebMCP contracts, visual design, secrets, or generated browser binaries entered WP00. If an external prerequisite blocks dependency-backed RED/GREEN verification, commit only the reviewed bootstrap preparation with `chore: prepare WP00 bootstrap and RED test`; do not mark WP00 complete. After every WP00 verification command passes, use the final work-package commit below.

Commit:

```bash
git add .
git commit -m "chore: initialize DOMHamster toolchain and CI"
```

---

### Task 2: WP01 — Domain types and frozen fictional fixture — COMPLETE

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/seed.ts`
- Create: `src/domain/canonical-json.ts`
- Create: `tests/domain/seed.test.ts`
- Create: `tests/domain/fictionality.test.ts`
- Create: `scripts/print-fixture-hash.mjs`

**Interfaces:**
- Consumes: WP00 TypeScript/test shell; approved Phase 4 entity and fixture tables.
- Produces: branded `RequestId`, `VolunteerId`, `PlanId`, `AuditEventId`; `Scenario`, `Request`, `Volunteer`, `PrivateContact`, `Draft`, `ApprovalRecord`, `CommittedPlan`, `AuditEvent`, `AppState`; immutable `CANONICAL_SCENARIO`; `canonicalJson(value)`; `sha256Hex(value)`.

- [ ] **Step 1: Write failing fixture-count and identity tests**

```ts
import { describe, expect, it } from 'vitest';
import { CANONICAL_SCENARIO } from '../../src/domain/seed';

describe('canonical scenario', () => {
  it('contains exactly eight requests and five volunteers with unique stable IDs', () => {
    expect(CANONICAL_SCENARIO.requests).toHaveLength(8);
    expect(CANONICAL_SCENARIO.volunteers).toHaveLength(5);
    expect(new Set(CANONICAL_SCENARIO.requests.map(({ id }) => id)).size).toBe(8);
    expect(new Set(CANONICAL_SCENARIO.volunteers.map(({ id }) => id)).size).toBe(5);
    expect(CANONICAL_SCENARIO.requests.map(({ id }) => id)).toEqual([
      'R-101', 'R-102', 'R-103', 'R-104', 'R-105', 'R-106', 'R-107', 'R-108',
    ]);
    expect(CANONICAL_SCENARIO.volunteers.map(({ id }) => id)).toEqual([
      'V-01', 'V-02', 'V-03', 'V-04', 'V-05',
    ]);
  });
});
```

Run and confirm failure because the fixture modules do not exist.

- [ ] **Step 2: Define exact discriminated domain types**

Implement branded string IDs, all Phase 4 enums, immutable entity interfaces, issue/result envelopes, and the six workflow-state variants. Make illegal state combinations unrepresentable: `READY` has no draft/approval/committed plan; `APPROVED` has a valid draft plus current approval; `COMMITTED` has a committed plan and no active approval.

- [ ] **Step 3: Implement the frozen fixture**

Transcribe every approved request, volunteer, policy, and fictional private-contact field from `MASTERPLAN.md` into `CANONICAL_SCENARIO`. Deep-freeze exported fixture objects in development and expose only readonly types.

- [ ] **Step 4: Verify counts and stable IDs GREEN**

```bash
npx vitest run tests/domain/seed.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add fictionality and restricted-field tests**

Assert every private contact uses reserved fictional aliases/locations/channels, no string resembles an email address or Saudi telephone number, no request public record contains `recipientAlias`, `fictionalLocation`, or `fictionalContactChannel`, and all notes are marked untrusted.

- [ ] **Step 6: Implement canonical serialization and hashing**

`canonicalJson` recursively sorts object keys, preserves array order, rejects unsupported values, and produces UTF-8 JSON without whitespace. `sha256Hex` uses Node/Web Crypto through a narrow helper. Generate the hash with `node scripts/print-fixture-hash.mjs`, paste the resulting 64-character value into `EXPECTED_CANONICAL_HASH` in the test, then deliberately change one fixture value and confirm the test fails before restoring it.

- [ ] **Step 7: Run regression and commit**

```bash
npm run test:run -- tests/domain
npm run typecheck
npm run lint
git diff --check
git add src/domain tests/domain scripts/print-fixture-hash.mjs
git commit -m "feat: add canonical coordination domain fixture"
```

---

### Task 3: WP02 — Deterministic assignment validation engine — COMPLETE

**Files:**
- Create: `src/domain/validation.ts`
- Create: `tests/domain/validation.test.ts`
- Create: `tests/fixtures/drafts.ts`

**Interfaces:**
- Consumes: domain types and canonical scenario from WP01.
- Produces: `validateDraft(context: ValidationContext): ValidationResult`; stable issue codes and request/volunteer references; pure rule functions with no clock, storage, UI, or WebMCP dependency.

- [ ] **Step 1: Write one failing test per hard rule**

Create table-driven tests for duplicate request accounting, unknown request, unknown volunteer, unavailable volunteer, time-window violation, overlapping assignments, workload above three, missing required skill, missing Arabic language for R-104, invalid duration/time shape, and mutation of a human-locked assignment.

Example:

```ts
it('reports VOLUNTEER_TIME_OVERLAP for V-03 at 13:00', () => {
  const result = validateDraft(buildValidationContext(draftWithHumanConflict()));

  expect(result.errors).toContainEqual(
    expect.objectContaining({
      code: 'VOLUNTEER_TIME_OVERLAP',
      requestIds: ['R-105', 'R-106'],
      volunteerId: 'V-03',
    }),
  );
});
```

Run and verify the suite fails because `validateDraft` is absent.

- [ ] **Step 2: Implement normalized rule evaluation**

Normalize assignments into deterministic request-ID order, evaluate every hard rule without early exit, sort issues by severity/code/request IDs, and return `{ valid, errors, warnings }`. Do not mutate inputs and do not derive human locks from assignment content.

- [ ] **Step 3: Add warning tests**

Cover unassigned requests, noncritical zone inefficiency, and balanced-workload advisory behavior. Prove warnings do not set `valid` to false.

- [ ] **Step 4: Add non-trigger and determinism tests**

For every rule, include a near-boundary case that must not trigger. Run the same validation input repeatedly and assert byte-identical canonical output.

- [ ] **Step 5: Run regression and commit**

```bash
npx vitest run tests/domain/validation.test.ts
npm run test:run -- tests/domain
npm run typecheck
npm run lint
git add src/domain/validation.ts tests/domain/validation.test.ts tests/fixtures/drafts.ts
git commit -m "feat: enforce assignment validation rules"
```

---

### Task 4: WP03 — Workflow state machine, commands, approval, commit, and audit — COMPLETE

**Files:**
- Create: `src/domain/state-machine.ts`
- Create: `src/domain/commands.ts`
- Create: `src/domain/audit.ts`
- Create: `tests/domain/state-machine.test.ts`
- Create: `tests/domain/commands.test.ts`
- Create: `tests/domain/approval.test.ts`
- Create: `tests/domain/audit.test.ts`

**Interfaces:**
- Consumes: WP01 types/fixture and WP02 validation.
- Produces: `classifyDraft`; `canTransition`; `normalizeRehydratedState`; `reduceCommand(state, command, deps): CommandResult`; bounded immutable audit event factories.

- [x] **Step 1: Write the failing allowed/forbidden transition matrix**

Represent every transition in Phase 4 as data. Test all permitted actor/event/state combinations and prove every unlisted combination returns `INVALID_STATE` without mutation or audit append.

- [x] **Step 2: Implement state classification and transition guards**

Implement `READY`, `DRAFT_INVALID`, `DRAFT_VALID`, `AWAITING_APPROVAL`, `APPROVED`, and `COMMITTED` classification from valid structural invariants. Transition guards accept an explicit actor (`human`, `agent`, `system`) and event.

- [x] **Step 3: Write failing command tests for draft creation and revision**

Cover complete request accounting, version starts at 1, each accepted mutation increments once, stale version rejection leaves state/audit byte-identical, unknown IDs fail safely, and agent revision cannot alter a human lock.

- [x] **Step 4: Implement command reduction for draft/edit/lock lifecycle**

Implement pure commands for create draft, revise draft, human edit, lock, unlock, discard, and reset. Each accepted command creates bounded audit events through `audit.ts`; there is no audit edit/delete command.

- [x] **Step 5: Write failing approval clock tests**

Use a fake clock to cover prepare review, human approve, human reject, human cancel, 120-second expiry, mutation invalidation, reload invalidation, wrong version, commit revalidation, successful one-shot commit, and repeated commit.

- [x] **Step 6: Implement approval and commit commands**

Bind approval to the current version and expiry timestamp. `COMMIT_APPROVED_PLAN` revalidates immediately, requires approval status/current version/not expired, creates one plan ID, clears approval, and rejects replay with `COMMIT_ALREADY_COMPLETED`.

- [x] **Step 7: Verify canonical journey**

Create one service-path test: READY → valid draft → human edit R-105/V-03/13:00 → lock → invalid overlap → agent revises only R-106/V-05/13:00 → valid → prepare → approve → commit. Assert R-105 remains locked, plan contains all eight request outcomes, and audit sequence matches the approved event names.

- [x] **Step 8: Run regression and commit**

```bash
npx vitest run tests/domain/state-machine.test.ts tests/domain/commands.test.ts tests/domain/approval.test.ts tests/domain/audit.test.ts
npm run test:run -- tests/domain
npm run typecheck
npm run lint
git add src/domain tests/domain
git commit -m "feat: implement coordination workflow commands"
```

---

### Task 5: WP04 — Serialized store, ports, selectors, and resilient persistence — IN PROGRESS

**Files:**
- Create: `src/app/ports.ts`
- Create: `src/app/store.ts`
- Create: `src/app/selectors.ts`
- Create: `src/persistence/local-storage.ts`
- Create: `tests/app/store.test.ts`
- Create: `tests/app/selectors.test.ts`
- Create: `tests/persistence/local-storage.test.ts`

**Interfaces:**
- Consumes: command reducer and AppState.
- Produces: `AppStore` with `getState`, async serialized `dispatch`, and `subscribe`; `StoragePort`, `ClockPort`, `IdPort`, `ModelContextPort`, `BuildInfoPort`; privacy-bounded selectors; versioned persistence repository.

- [x] **Step 1: Write failing store serialization tests**

Dispatch two commands concurrently and assert they are reduced in call order against the latest state, each subscriber sees one committed state, and a rejected command does not notify or persist.

- [x] **Step 2: Implement the store command queue**

Use an internal promise chain or explicit FIFO queue. The store owns state replacement and persistence ordering; callers never receive a mutable state reference.

- [x] **Step 3: Write failing selector privacy tests**

Before COMMITTED, recursively scan every public selector result for restricted keys and known contact fixture values. After COMMITTED, `selectDispatchContacts(state, requestIds)` returns only explicitly requested assigned IDs and no unrequested contacts.

- [x] **Step 4: Implement selectors as allowlists**

Construct outputs field-by-field. Do not clone entire domain entities and delete restricted keys. Freeze returned collections in development.

- [x] **Step 5: Write failing persistence tests**

Cover READY/draft/committed round trips, schema mismatch, fixture mismatch, malformed JSON, quota/write failure, and rehydration of AWAITING_APPROVAL/APPROVED into revalidated draft state with approval cleared and audit event appended.

- [x] **Step 6: Implement versioned localStorage repository**

Use one namespaced key and an envelope containing persistence version, fixture version/hash, saved timestamp, and state. Parsing is total: invalid envelopes return canonical READY plus a sanitized recovery status. A write failure rejects the command before visible state changes.

- [ ] **Step 7: Publish, run the complete Node 24 regression, and merge**

```bash
# On a write-capable checkout of public main 991d7089903786f76c99c578397d936ca7d4fed7:
git switch -c implementation/wp04-store-persistence
git am DOMHamster_WP04_RED.patch
# Open the PR and record DOMHAMSTER_WP04_EXPECTED_RED_CONFIRMED.
git am DOMHamster_WP04_GREEN.patch

npx vitest run tests/app tests/persistence
npm run test:run -- tests/domain tests/app tests/persistence
npm run typecheck
npm run lint
npm run build
npm run test:e2e
npm audit --audit-level=high
```

---


**Local checkpoint:** RED commit `3523672`; GREEN commit `902c3d8`; 24 focused WP04 tests and 58 total domain/application/persistence tests pass locally. `DOMHamster_GOVERNANCE_0.17.1.patch` restores the missing public master/implementation plans. `DOMHamster_WP04_RED.patch` and `DOMHamster_WP04_GREEN.patch` were generated against the exact public TypeScript baseline and passed sequential application and final file-identity checks. Public formatting, lint, build, Playwright, audit, PR merge, and integrated-main verification are still required.

### Task 6: WP05 — Exact WebMCP contracts, schemas, and lifecycle matrix

**Files:**
- Create: `src/webmcp/contracts.ts`
- Create: `src/webmcp/schemas.ts`
- Create: `src/webmcp/lifecycle.ts`
- Create: `src/types/webmcp.d.ts`
- Create: `tests/webmcp/contracts.test.ts`
- Create: `tests/webmcp/schemas.test.ts`
- Create: `tests/webmcp/lifecycle.test.ts`

**Interfaces:**
- Consumes: approved Phase 5/8 contracts and domain tool names/states.
- Produces: twelve immutable tool definitions; compiled Ajv validators; `desiredToolNames(state)` exact sets; browser type declarations narrow enough for the used API.

- [ ] **Step 1: Write failing contract snapshot tests**

Assert the exact ordered names:

```ts
[
  'get_coordination_overview',
  'list_open_requests',
  'list_available_volunteers',
  'create_assignment_draft',
  'get_assignment_draft',
  'validate_assignment_draft',
  'revise_assignment_draft',
  'prepare_plan_approval',
  'commit_assignment_plan',
  'get_committed_plan',
  'access_dispatch_contacts',
  'get_audit_history',
]
```

Assert uniqueness, title/description budgets, exact annotations, `additionalProperties: false`, and absence of human-only tool names.

- [ ] **Step 2: Implement static contracts**

Transcribe the approved names, titles, descriptions, schemas, and annotations verbatim. Keep execute callbacks out of this module.

- [ ] **Step 3: Write schema accept/reject tables**

For every tool, include minimum valid, maximum valid, missing required property, extra property, wrong type, unknown enum, invalid ID pattern, duplicate request ID, and conditional-field cases.

- [ ] **Step 4: Implement Ajv compilation**

Compile all schemas once with strict mode. Convert validation errors to bounded `INVALID_INPUT` details containing safe instance paths and keywords, never raw prompt/contact/state dumps.

- [ ] **Step 5: Write and implement exact lifecycle tests**

Assert counts and ordered sets: READY 5, DRAFT_INVALID 7, DRAFT_VALID 8, AWAITING_APPROVAL 3, APPROVED 4, COMMITTED 3. Assert `commit_assignment_plan` exists only in APPROVED and `access_dispatch_contacts` only in COMMITTED.

- [ ] **Step 6: Run regression and commit**

```bash
npx vitest run tests/webmcp/contracts.test.ts tests/webmcp/schemas.test.ts tests/webmcp/lifecycle.test.ts
npm run test:run -- tests/domain tests/app tests/persistence tests/webmcp
npm run typecheck
npm run lint
git add src/webmcp src/types tests/webmcp
git commit -m "feat: define WebMCP tool contracts and schemas"
```

---

### Task 7: WP06 — Tool handlers, capability adapter, registry reconciliation, and diagnostics

**Files:**
- Create: `src/webmcp/handlers.ts`
- Create: `src/webmcp/capability.ts`
- Create: `src/webmcp/registry.ts`
- Create: `src/diagnostics/diagnostics.ts`
- Create: `tests/webmcp/handlers.test.ts`
- Create: `tests/webmcp/registry.test.ts`
- Create: `tests/webmcp/capability.test.ts`
- Create: `tests/diagnostics/diagnostics.test.ts`

**Interfaces:**
- Consumes: store/selectors/commands, contracts/schemas/lifecycle, ModelContext port.
- Produces: `createToolHandlers(store, deps)`; `detectWebMcpCapability(document, location)`; `createWebMcpRegistry`; sanitized diagnostics snapshot.

- [ ] **Step 1: Write failing handler authorization tests**

For each of twelve tools, test success, invalid input, invalid state, stale version where applicable, unknown IDs, lock violation, unexpected exception sanitization, and unchanged state on failure. Test returned data against selector allowlists.

- [ ] **Step 2: Implement handlers through store commands/selectors only**

Handlers validate input first, authorize current state/version second, dispatch or select third, and return a stable envelope with `ok`, `data` or `error`, and bounded `nextActions`. Catch unexpected failures, allocate an opaque reference, and emit only `INTERNAL_ERROR` plus safe recovery text.

- [ ] **Step 3: Write capability tests**

Cover insecure context, missing `document.modelContext`, available API, and thrown property access. Capability detection never crashes the app and never fabricates readiness.

- [ ] **Step 4: Write registry generation/race tests**

Use a fake ModelContext recording registrations and signals. Transition rapidly through states and assert stale generations cannot re-register removed tools, each removed tool’s controller is aborted, duplicate registrations do not occur, and teardown aborts all controllers.

- [ ] **Step 5: Implement serialized reconciliation**

Subscribe to the store, compute desired names, abort no-longer-desired controllers, register newly desired contracts with dedicated `AbortController.signal`, store sanitized status, and schedule one reconciliation at a time with a generation counter.

- [ ] **Step 6: Implement sanitized diagnostics**

Expose build version/commit when injected, fixture hash, workflow state, draft version, capability status, desired/registered tool names, persistence status, and recent safe error codes. Exclude raw prompts, notes, contacts, full state, stack traces, and localStorage content.

- [ ] **Step 7: Run regression and commit**

```bash
npx vitest run tests/webmcp tests/diagnostics
npm run test:run
npm run typecheck
npm run lint
git add src/webmcp src/diagnostics tests/webmcp tests/diagnostics
git commit -m "feat: register state-aware WebMCP tools"
```

---

### Task 8: WP07 — Judge-first application shell and visual concept lock

**Files:**
- Create: `docs/design/domhamster-primary-screen.png`
- Create: `docs/design/domhamster-approval-state.png`
- Create: `docs/design/design-system.md`
- Modify: `src/app/App.tsx`
- Create: `src/ui/AppHeader.tsx`
- Create: `src/ui/JudgeBrief.tsx`
- Create: `src/ui/MetricStrip.tsx`
- Create: `src/ui/PlanWorkspace.tsx`
- Create: `src/ui/ErrorBoundaryFallback.tsx`
- Create: `src/ui/styles/tokens.css`
- Create: `src/ui/styles/layout.css`
- Create: `tests/ui/app-shell.test.tsx`
- Create: `tests/e2e/ready.spec.ts`

**Interfaces:**
- Consumes: AppStore/read selectors/diagnostics; approved Phase 7 information architecture.
- Produces: visible READY and unsupported-browser shells; frozen visual reference and tokens for WP08-WP10.

- [ ] **Step 1: Generate and approve the complete visual concepts before UI production code**

Generate a full 1440×960 desktop primary workspace and separate approval-state concept matching the approved three-column, judge-first information architecture. The concept must use code-native text/controls, a restrained hamster mark, true accessible operational hierarchy, no decorative hero, no card-grid filler, and readable workflow/tool status. Record exact palette, type scale, spacing, radii, borders, focus treatment, component families, and responsive rules in `docs/design/design-system.md`.

- [ ] **Step 2: Write failing shell component tests**

Test DOMHamster heading/subtitle, fictional non-emergency disclaimer, canonical prompt, READY label, 8/5 metrics, WebMCP supported/unsupported status, Reset control, Activity/Diagnostics controls, and no contact values in rendered HTML.

- [ ] **Step 3: Implement tokens and semantic shell**

Build AppHeader, JudgeBrief, MetricStrip, PlanWorkspace composition, and error boundary from selectors. Keep `App.tsx` as composition glue. Match the approved concept exactly; do not add unapproved labels or filler metrics.

- [ ] **Step 4: Write and pass READY E2E**

Start from cleared storage and verify 8/5 counts, READY state, exact canonical prompt, reset confirmation, zero console errors, same-origin-only network, and no restricted values in `document.body.innerText` or HTML.

- [ ] **Step 5: Compare browser render with concepts**

Capture 1440×960 and 1280×720 screenshots. Inspect concept and render side by side for copy, hierarchy, layout, typography, palette, spacing, controls, and responsive fit. Record and fix every material mismatch before commit.

- [ ] **Step 6: Run regression and commit**

```bash
npx vitest run tests/ui/app-shell.test.tsx
npx playwright test tests/e2e/ready.spec.ts
npm run verify
git add docs/design src/app src/ui tests/ui tests/e2e/ready.spec.ts
git commit -m "feat: build judge-first coordination workspace"
```

---

### Task 9: WP08 — Request/volunteer panels, draft editor, human locks, and validation UI

**Files:**
- Create: `src/ui/RequestPanel.tsx`
- Create: `src/ui/VolunteerPanel.tsx`
- Create: `src/ui/AssignmentTable.tsx`
- Create: `src/ui/ValidationPanel.tsx`
- Modify: `src/ui/PlanWorkspace.tsx`
- Create: `tests/ui/request-panel.test.tsx`
- Create: `tests/ui/volunteer-panel.test.tsx`
- Create: `tests/ui/assignment-table.test.tsx`
- Create: `tests/ui/validation-panel.test.tsx`
- Create: `tests/e2e/conflict-lock-repair.spec.ts`

**Interfaces:**
- Consumes: public selectors and human command dispatch functions.
- Produces: visible request/volunteer data; native select/time editing; lock/unlock; deterministic issue focus mapping; shared draft state.

- [ ] **Step 1: Write failing panel and privacy tests**

Assert request and volunteer public fields, stable ordering, workload counts, language/skill labels, filter semantics if retained, and recursive absence of restricted contact fields.

- [ ] **Step 2: Implement panels through selectors**

Render semantic headings/lists/tables with accessible names. No component imports the canonical seed directly.

- [ ] **Step 3: Write failing assignment editing/lock tests**

Render a valid draft, change R-105 to V-03 and 13:00, lock it, and assert version increments, lock indicator appears, overlap issue links R-105/R-106, unlock requires the human control, and agent-labelled dispatch cannot call lock/unlock.

- [ ] **Step 4: Implement native editor and validation navigation**

Use `<select>` and time controls, disable invalid unavailable options where deterministic, preserve focus after dispatch, announce state/version changes, and map each issue to affected row IDs.

- [ ] **Step 5: Write canonical conflict/repair E2E**

Inject the deterministic model-context harness, create a valid draft through the tool, perform the human edit/lock in the UI, call validation, revise only R-106 through the tool, and assert R-105 is unchanged/locked while R-106 becomes V-05 at 13:00 and the draft becomes valid.

- [ ] **Step 6: Run regression and commit**

```bash
npx vitest run tests/ui
npx playwright test tests/e2e/conflict-lock-repair.spec.ts
npm run verify
git add src/ui tests/ui tests/e2e/conflict-lock-repair.spec.ts
git commit -m "feat: add human assignment editing and locks"
```

---

### Task 10: WP09 — Approval review, one-shot commit, contacts, activity, and reset

**Files:**
- Create: `src/ui/ApprovalDialog.tsx`
- Create: `src/ui/ApprovedBanner.tsx`
- Create: `src/ui/CommittedSummary.tsx`
- Create: `src/ui/ActivityDrawer.tsx`
- Create: `src/ui/DiagnosticsDrawer.tsx`
- Create: `src/ui/ConfirmDialog.tsx`
- Modify: `src/ui/PlanWorkspace.tsx`
- Create: `tests/ui/approval-dialog.test.tsx`
- Create: `tests/ui/approved-banner.test.tsx`
- Create: `tests/ui/committed-summary.test.tsx`
- Create: `tests/ui/drawers.test.tsx`
- Create: `tests/e2e/approval-commit-contact.spec.ts`
- Create: `tests/e2e/reload-expiry-reset.spec.ts`

**Interfaces:**
- Consumes: approval/commit commands, audit/diagnostic selectors, post-commit contact tool handler.
- Produces: human-only review decisions, visible countdown, committed plan, audited contact notice, activity/diagnostic evidence, safe recovery dialogs.

- [ ] **Step 1: Write failing approval-dialog accessibility and authority tests**

Assert dialog naming, focus entry, focus trap, Escape cancellation, focus return, assignment/lock/warning review, exact version text, human-only Approve/Reject/Cancel controls, and absence of a human Commit button.

- [ ] **Step 2: Implement approval dialog and approved banner**

Render AWAITING_APPROVAL and APPROVED states from selectors. Countdown uses clock ticks for display only; expiry authority remains the command/state layer. Cancel/discard confirmations state the exact effect.

- [ ] **Step 3: Write failing commit/contact/audit tests**

Commit tool appears only after human approval; wrong/expired version fails; first commit succeeds; second commit fails unchanged; committed summary shows plan ID; no contacts are rendered automatically; requesting R-101 returns only R-101 and appends CONTACTS_ACCESSED.

- [ ] **Step 4: Implement committed summary, activity, diagnostics, confirmations**

Contact tool results stay in the invoking client response and only a non-sensitive access notice appears in the visible audit. Drawers use dialog/disclosure semantics and exclude restricted values.

- [ ] **Step 5: Write full lifecycle and reload/expiry E2E**

Cover valid draft → prepare → approve → commit → contact → audit; reject; cancel; 120-second expiry with fake clock; reload invalidation from AWAITING_APPROVAL and APPROVED; discard from every draft state; reset from every state; exact canonical fixture hash after reset.

- [ ] **Step 6: Run regression and commit**

```bash
npx vitest run tests/ui
npx playwright test tests/e2e/approval-commit-contact.spec.ts tests/e2e/reload-expiry-reset.spec.ts
npm run verify
git add src/ui tests/ui tests/e2e
git commit -m "feat: add approval commit and audit workflow"
```

---

### Task 11: WP10 — Responsive, accessible, and visual fidelity hardening

**Files:**
- Modify: `src/ui/styles/tokens.css`
- Modify: `src/ui/styles/layout.css`
- Modify: all critical `src/ui/*.tsx`
- Create: `tests/accessibility/automated-a11y.test.tsx`
- Create: `tests/e2e/keyboard.spec.ts`
- Create: `tests/e2e/responsive.spec.ts`
- Create: `docs/design/fidelity-ledger.md`

**Interfaces:**
- Consumes: complete UI workflow and approved concepts.
- Produces: keyboard-complete critical path, responsive 1024/1280/1440 layouts, reduced-motion behavior, documented fidelity comparison.

- [ ] **Step 1: Add failing accessibility tests**

Run an automated axe integration over READY, DRAFT_INVALID, DRAFT_VALID, AWAITING_APPROVAL, APPROVED, and COMMITTED. Fail on critical or serious violations. Add explicit tests for unique landmarks, labels, status announcements, dialog semantics, and no color-only issue meaning.

- [ ] **Step 2: Add failing keyboard E2E**

Using only keyboard input, reset, edit R-105, lock, open issue target, prepare review through harness, approve, cancel where applicable, and return focus. Assert visible focus at every critical control.

- [ ] **Step 3: Add responsive screenshot assertions**

Capture 1024×720, 1280×720, and 1440×900 for READY, conflict, approval, and committed states. Assert no page-level horizontal overflow and no clipped primary action/status.

- [ ] **Step 4: Fix semantics/layout/motion and complete fidelity ledger**

Compare final browser captures against both approved concepts. Record at least copy, layout, typography, palette, component geometry, icon treatment, spacing, responsive behavior, and motion. Fix every material mismatch or record a concrete browser/API blocker approved by the entrant.

- [ ] **Step 5: Run regression and commit**

```bash
npx vitest run tests/accessibility
npx playwright test tests/e2e/keyboard.spec.ts tests/e2e/responsive.spec.ts
npm run verify
npm run test:e2e
git add src/ui tests/accessibility tests/e2e docs/design/fidelity-ledger.md
git commit -m "fix: harden responsive and accessible interactions"
```

---

### Task 12: WP11 — Complete E2E, security, evaluation, and release-verification scripts

**Files:**
- Create: `tests/e2e/canonical.spec.ts`
- Create: `tests/e2e/tool-lifecycle.spec.ts`
- Create: `tests/security/privacy.test.ts`
- Create: `tests/security/prompt-injection.test.ts`
- Create: `tests/security/source-safety.test.ts`
- Create: `evals/cases.json`
- Create: `evals/results/.gitkeep`
- Create: `scripts/check-tool-metadata.mjs`
- Create: `scripts/check-source-safety.mjs`
- Create: `scripts/check-bundle.mjs`
- Create: `scripts/check-licenses.mjs`
- Create: `scripts/create-release-manifest.mjs`
- Create: `scripts/verify-release.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: complete product and test harness.
- Produces: automated P0 acceptance evidence, thirty versioned agent cases, fifty-trial result schema, release manifest/checks, CI artifacts.

- [ ] **Step 1: Map all 24 acceptance scenarios to tests**

Create a traceability table in `tests/README.md` naming the automated test or manual official-client evidence for AC-001 through AC-024. Add missing tests until every P0 scenario has a deterministic executable path.

- [ ] **Step 2: Add complete canonical and lifecycle E2E**

The canonical test invokes actual registered handler callbacks through the deterministic model-context harness, never calls store internals, and verifies state-specific exact tool sets after every transition.

- [ ] **Step 3: Add privacy and injection tests**

Recursively scan all pre-commit tool responses, selectors, DOM text/HTML, diagnostics, console logs, and persistence public summaries for restricted keys/values. Put system-like instructions in an untrusted request note and prove they cannot create a mutation, approval, or commit.

- [ ] **Step 4: Define thirty eval cases and fifty trial records**

Encode each case with starting state, prompt, expected/forbidden calls, argument assertions, final-state assertion, and risk class. High-risk cases cover locks, approval, expiry, commit, replay, contacts, and injection. The scorer requires at least 45/50 overall and 100% high-risk.

- [ ] **Step 5: Implement release scripts**

Metadata check validates exact names/descriptions/annotations/schema budgets/lifecycle. Source safety rejects known secret patterns, real-looking contact data, remote telemetry SDKs, and unexpected external URLs. Bundle check records gzip size. License check allows the approved permissive set and fails unknown/restrictive licenses. Manifest generation writes app version, commit, fixture hash, tool definitions/counts, lockfile hash, and test summary without credentials.

- [ ] **Step 6: Expand CI and run full verification**

Add coverage, security scripts, E2E, and artifact upload. Run:

```bash
node --test tests/toolchain/wp00-contract.test.mjs
node scripts/verify-exact-dependencies.mjs
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test:run -- --coverage
npm run test:e2e
npm run check:metadata
npm run check:source-safety
npm run check:bundle
npm run check:licenses
npm audit --audit-level=high
npm run build
npm run release:manifest
npm run release:verify
```

- [ ] **Step 7: Commit**

```bash
git add tests evals scripts package.json package-lock.json .github/workflows/ci.yml
git commit -m "test: verify end-to-end security and release paths"
```

---

### Task 13: WP12 — Netlify deployment and official-client compatibility

**Files:**
- Create: `netlify.toml`
- Create: `public/_redirects` only if `netlify.toml` cannot express the approved fallback without duplication
- Create: `docs/compatibility/chatgpt-in-app.md`
- Create: `docs/compatibility/chrome-webmcp.md`
- Create: `docs/releases/rc-checklist.md`
- Modify: `scripts/create-release-manifest.mjs`

**Interfaces:**
- Consumes: passing WP11 commit and public GitHub repository.
- Produces: public no-login Netlify release candidate; verified headers, network, console, reset, tool lifecycle, and dated official-client evidence.

- [ ] **Step 1: Write deployment config assertions before config**

Add a script/test that fails unless the intended Netlify config has build command `npm run build`, publish directory `dist`, SPA fallback, immutable hashed-asset caching, no-store HTML/release identity, `Origin-Agent-Cluster: ?1`, same-origin WebMCP tools permissions policy, restrictive CSP, `Referrer-Policy: no-referrer`, and `X-Content-Type-Options: nosniff`.

- [ ] **Step 2: Implement and verify `netlify.toml` locally**

Run the config assertion and production build. No Netlify environment secret is defined or referenced.

- [ ] **Step 3: Deploy from the exact public commit**

Connect Netlify to `MohammedGhazal09/domhamster`, deploy the implementation branch as preview, then merge verified work and deploy `main` as `rc.1`. Record commit SHA and deploy ID.

- [ ] **Step 4: Verify clean-session production behavior**

Use logged-out/incognito browser, `curl -I` for HTML and a hashed asset, Playwright production-baseURL run, console/network checks, and three repeated reset/canonical journeys.

- [ ] **Step 5: Verify WebMCP-enabled Chrome**

Record browser build/flag configuration, native `document.modelContext` capability, exact tool sets in all six states, canonical agent journey, contact/audit finish, and timestamp in Asia/Riyadh plus UTC.

- [ ] **Step 6: Verify ChatGPT’s in-app browser**

Run the same canonical judge instructions. Record discovery, invocation, visible human edit/lock, agent repair, approval, commit, contact access, audit, browser/client build, timestamp, and any release-blocking discrepancy.

- [ ] **Step 7: Re-run the complete RC gate and commit only source/docs evidence produced before freeze**

```bash
npm run verify
npm run test:e2e
npm run release:verify
git add netlify.toml public docs/compatibility docs/releases scripts/create-release-manifest.mjs
git commit -m "chore: deploy and verify WebMCP release candidate"
```

---

### Task 14: WP13 — Judge-first documentation and public release baseline

**Files:**
- Modify: `README.md`
- Create: `SECURITY.md`
- Modify: `CHANGELOG.md`
- Create: `NOTICE.md` when generated license evidence requires attribution
- Create: `docs/architecture.md`
- Create: `docs/webmcp-tools.md`
- Create: `docs/testing.md`
- Create: `docs/submission.md`
- Create: `docs/ai-use.md`
- Create: `release-manifest.json`
- Create: `tests/docs/documentation.test.ts`

**Interfaces:**
- Consumes: verified RC identity, exact tool contracts, commands, test/eval results, deploy URL, compatibility records.
- Produces: clean-clone/judge-ready public repository and selected release baseline.

- [ ] **Step 1: Write failing documentation assertions**

Test that README contains the pitch, production URL, supported clients, Reset/canonical prompt/human lock/approval/commit instructions, six-state tool table, Node 24 setup, complete verification commands, privacy limitations, AI-use link, and MIT license link. Assert every linked local file exists and every named script exists in `package.json`.

- [ ] **Step 2: Write the judge-first README and focused docs**

Use the frozen Phase 12 section order. `docs/webmcp-tools.md` is generated or checked from contracts to prevent drift. `docs/testing.md` reports actual commands/results only. `docs/ai-use.md` names the actual AI tools and distinguishes assistance from entrant review/ownership.

- [ ] **Step 3: Complete clean-clone proof**

In a new directory:

```bash
git clone https://github.com/MohammedGhazal09/domhamster.git domhamster-clean
cd domhamster-clean
nvm use
npm ci
npm run verify
npm run test:e2e
npm run release:verify
```

Expected: all pass without undocumented files, credentials, or manual configuration.

- [ ] **Step 4: Select, tag, and verify `v1.0.0`**

Only after both official-client records and all gates pass, generate final `release-manifest.json`, commit it, create annotated tag `v1.0.0`, deploy the exact tag commit, and rerun production verification. Confirm repository tag, commit, deploy, manifest, screenshots, video, and Devpost fields use one identity.

- [ ] **Step 5: Commit documentation baseline**

```bash
git add README.md SECURITY.md CHANGELOG.md NOTICE.md docs release-manifest.json tests/docs
git commit -m "docs: add judge and contributor documentation"
```

Do not tag until this commit and its CI run are green.

---

## Post-implementation submission sequence

After Task 14 and the final release gate:

1. Capture four 1440×960 release-matched screenshots: READY, human-created conflict, approval review, and COMMITTED/audit.
2. Record one 2:35–2:45 public demonstration with clear English audio using the exact `v1.0.0` deployment.
3. Publish the video publicly and verify it logged out and under three minutes.
4. Complete all Devpost identity, story, technology, links, testing, AI-use, learning, and checklist fields from the frozen Phase 12 content updated only with actual release facts.
5. Run a logged-out dry run of every URL and the judge instructions.
6. Finalize before 2026-09-03 18:00 Asia/Riyadh.
7. Capture the receipt/freeze identifiers and make no judged-surface edits during judging.

## Plan self-review record

| Review | Result |
|---|---|
| Spec coverage | Tasks 1–14 map to WP00–WP13; post-implementation steps cover media, Devpost, and freeze |
| Placeholder scan | No unfinished placeholder tokens are permitted in executable tasks |
| Type/interface consistency | Store, reducer, validator, selectors, handlers, lifecycle, and UI consumers use the names frozen in the master plan |
| Scope check | One application and release path; backend, authentication, messaging, maps, localization, payments, and real data remain excluded |
| Evidence policy | Every package ends with focused and regression commands before its commit |
