# DOMHamster

**The human-approved agent dispatcher.**

DOMHamster is a WebMCP-native community-assistance coordination board. A browser agent can read privacy-minimized fictional requests and volunteers, create and repair an assignment draft, and commit only the exact draft version that a human coordinator has reviewed and approved.

## Current status

WP00 through WP05 are complete on public `main` with preserved RED-before-GREEN evidence and successful exact-main CI.

- WP00 established the pinned Node 24, React, Vite, Vitest, Playwright, ESLint, Prettier, and CI toolchain.
- WP01 added the frozen fictional scenario and deterministic canonical hashing.
- WP02 added pure deterministic assignment validation.
- WP03 added the six-state workflow, human locks, exact-version approval, one-shot commit, and bounded audit history.
- WP04 added the serialized store, privacy-bounded selectors, and resilient versioned persistence.
- WP05 froze the twelve WebMCP tool contracts, strict input schemas, sanitized Ajv validation, and exact six-state lifecycle matrix.
- WP06 is next: connect the contracts to store-backed handlers, safe capability detection, serialized tool registration, and diagnostics.

No deployment, release, or submission completion claim is made until all corresponding verification gates pass.

## Project controls

- [MIT license](LICENSE)
- [WP00 execution status](docs/execution/WP00_STATUS.md)
- [WP04 execution status](docs/execution/WP04_STATUS.md)
- [WP05 execution status](docs/execution/WP05_STATUS.md)
- [Master plan](MASTERPLAN.md)
- [Implementation plan](docs/superpowers/plans/2026-08-26-domhamster-implementation.md)

The approved scope includes twelve state-aware WebMCP tools, six workflow states, human-only locking and approval, exact-version one-shot commit, privacy-minimized pre-commit data, and audited fictional contact access after commit.
