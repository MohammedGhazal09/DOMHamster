# Testing and verification

DOMHamster separates evidence already preserved in the public repository from gates that still require a fully provisioned release environment.

## Verified in the repository record

The repository history preserves test-first boundaries and exact verification evidence for the domain fixture, validation engine, workflow commands, serialized store, persistence, WebMCP contracts, and WebMCP runtime. Later UI, hardening, evaluation, deployment, and documentation branches preserve their own test-first commits and source-contract checks.

The source-controlled verification inventory includes:

- domain, store, persistence, handler, registry, component, accessibility, security, and browser test files;
- 24 acceptance-scenario mappings;
- 30 agent-evaluation cases;
- a 50 scored trials threshold of at least 45 overall and 100% of high-risk trials;
- tool metadata, source safety, bundle size, dependency-license, deployment-config, documentation, traceability, and recovery checks; and
- deterministic release-manifest generation and verification.

## Standard commands

```bash
nvm use
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test:run
npm run test:accessibility
npm run test:security
npm run test:e2e
npm run verify:metadata
npm run verify:safety
npm run verify:deployment
npm run verify:docs
npm run verify:traceability
npm run verify:recovery
npm run verify:bundle
npm run verify:licenses
npm run eval -- --results /absolute/path/to/50-trials.json
npm audit --audit-level=high
npm run build
npm run release:manifest
npm run release:verify
```

Combined gates:

```bash
npm run verify
npm run verify:release -- --eval-results /absolute/path/to/50-trials.json
```

The combined release gate validates the evaluation file before running any command, then executes repository verification, Playwright, bundle and license checks, dependency audit, the 50-trial scorer, release-manifest generation, and release-manifest verification in that order. `DOMHAMSTER_EVAL_RESULTS` may be used instead of `--eval-results`; an absent or invalid result path fails before the first release command runs.

## Evidence policy

A passing source parser or static contract does not substitute for dependency-backed TypeScript, Vitest, Playwright, accessibility, bundle, license, audit, or browser-client evidence. A previous workflow result does not prove a newer commit. Each release claim must identify the exact commit and fresh command output.

## Acceptance coverage

The canonical release path must verify:

1. privacy-minimized discovery;
2. complete draft creation;
3. deterministic human-created conflict;
4. human lock preservation;
5. stale-version rejection;
6. agent repair of only the unlocked request;
7. visible exact-version review;
8. human approval, rejection, cancellation, and expiry;
9. one-shot commit and replay rejection;
10. post-commit scoped contact access and audit;
11. reload normalization and deterministic reset; and
12. exact tool registration after every state transition.

## Agent evaluations

The evaluation inventory contains 30 cases across read-only questions, draft creation, invalid-plan explanation, lock-preserving repair, stale recovery, approval boundaries, expiry, commit, contact access, audit, and prompt-injection resistance. The release scorer uses 50 scored trials and requires:

- at least 45 passing trials overall; and
- every high-risk trial passing.

High-risk cases cover locks, approval, expiry, commit, replay, contacts, privacy, and untrusted-note injection.

## Pending release gates

Before release selection, the exact candidate still needs fresh observed evidence for:

| Gate                   | Required evidence                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| Clean Node 24 checkout | `npm ci`, full verification, build, audit, and release-manifest checks                                     |
| Browser automation     | Complete Playwright suite across canonical, lifecycle, keyboard, responsive, reload, and privacy paths     |
| Visual fidelity        | Native-size captures compared with both accepted concepts and recorded in the fidelity ledger              |
| WebMCP-enabled Chrome  | Native six-state registration matrix and complete external-agent journey                                   |
| ChatGPT in-app browser | Complete judge journey using discovered WebMCP tools                                                       |
| Public deployment      | Logged-out access, headers, no unexpected network, console cleanliness, reset, and three repeated journeys |
| Evaluation results     | 50 scored trials meeting the threshold                                                                     |
| Release identity       | Tag, commit, manifest, deployment, screenshots, video, and submission all agree                            |

The compatibility templates are stored in [Chrome WebMCP evidence](compatibility/chrome-webmcp.md) and [ChatGPT in-app evidence](compatibility/chatgpt-in-app.md). Unexecuted fields remain explicitly marked **Not run** rather than being inferred.
