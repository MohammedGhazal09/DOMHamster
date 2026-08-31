# Testing and verification

DOMHamster separates source-controlled test contracts from private release evidence tied to one exact deployed application commit.

## Current rc.6 verification snapshot

Application commit `2d1de951f4f0122bb252187c74ddd557011069aa` and tree `4a094cee974d7e9fef2bbd0e73fb388c974e9fc4` passed a clean Node `24.19.0` / npm `11.17.0` run completed at `2026-08-30T12:37:40.108Z`:

- Vitest: `250/250`;
- Playwright: `16/16`;
- accessibility: `11/11`;
- security: `8/8`;
- bundle and license gates: passed, `283` packages inspected;
- npm audit: `0` vulnerabilities; and
- fixture, release-manifest, release-identity, `git diff --check`, and clean-status gates: passed.

Private source logs remain outside Git under `W:\domhamster-release-evidence\source\rc6\exact-2d1de951f4f0122bb252187c74ddd557011069aa-20260830T123050Z`.

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

| Gate                   | Current rc.6 evidence                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Clean Node 24 checkout | Passed against the exact application commit                                                                                               |
| Browser automation     | Passed: Playwright `16/16`                                                                                                                |
| Visual fidelity        | Passed for the required four states and four release viewports                                                                            |
| WebMCP-enabled Chrome  | Native lifecycle passed `326/326`, human authority `28/28`, and canonical journeys `3/3`; complete external-agent journey remains not run |
| ChatGPT in-app browser | **Not run / unavailable**: no `iab` backend on the checked account/build                                                                  |
| Public deployment      | Passed identity, headers, same-origin network, console, privacy, reset, and three native journeys                                         |
| Acceptance             | `23/24`; AC-021 awaits authentic EV-06 and EV-27 evidence                                                                                 |
| Evaluation results     | Incomplete by deadline decision: `4/50` executed, `2` passed, `2` failed, `46` skipped, and zero high-risk trials completed               |
| Release identity       | Incomplete until video, tag, release, submission receipt, and freeze manifest exist                                                       |

Observed client facts are recorded in [Chrome WebMCP evidence](compatibility/chrome-webmcp.md) and [ChatGPT in-app evidence](compatibility/chatgpt-in-app.md). Unexecuted fields remain explicitly marked **Not run** rather than being inferred.
