# DOMHamster

**The human-approved agent dispatcher.**

DOMHamster is a WebMCP-native community-assistance coordination board. A browser agent can read privacy-minimized fictional requests and volunteers, create and repair an assignment draft, and commit only the exact draft version that a human coordinator reviewed and approved.

## Current status

WP00 through WP03 are complete and verified on `main`.

| Package | Delivered |
|---|---|
| WP00 | Pinned Node 24/React/Vite/Vitest/Playwright/ESLint/Prettier toolchain and public CI |
| WP01 | Immutable fictional scenario with eight requests, five volunteers, separate contacts, untrusted notes, and canonical hashing |
| WP02 | Pure deterministic assignment validation with hard errors, warnings, immutable sorted output, and lock checks |
| WP03 | Six-state workflow, serialized domain commands, human locks, exact-version approval, 120-second expiry, one-shot commit, and bounded audit history |
| **Next: WP04** | Serialized application store, ports, privacy-bounded selectors, and resilient versioned persistence |

The exact integrated WP03 commit passed the full repository CI gate. No deployment, release, browser-client, media, or submission completion claim is made until those later gates pass.

## Project controls

- [Master plan checkpoint 0.17.0](MASTERPLAN.md)
- [Detailed implementation plan](docs/superpowers/plans/2026-08-26-domhamster-implementation.md)
- [MIT license](LICENSE)
- [WP00 execution status](docs/execution/WP00_STATUS.md)
- [WP03 execution status](docs/execution/WP03_STATUS.md)

## Verified WP03 evidence

- Missing-module RED: workflow `33014526107`
- First complete GREEN: workflows `33015481233` and `33015481223`
- Draft-status invariant RED: workflow `33015830859`
- Final feature GREEN: workflows `33016006929` and `33016006987`
- Merge commit: `991d7089903786f76c99c578397d936ca7d4fed7`
- Exact integrated-main CI: workflow `33016239969`
- Final branch suite: 8 Vitest files, 75 tests, production build, Playwright Chromium, and dependency audit with 0 vulnerabilities

## Frozen product boundary

The approved scope includes twelve state-aware WebMCP tools, six workflow states, human-only locking and approval, exact-version one-shot commit, privacy-minimized pre-commit data, and audited request-scoped fictional contact access after commit. The project contains no backend, authentication, real personal information, runtime API keys, analytics, or emergency-service claims.
