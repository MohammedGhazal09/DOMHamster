# Changelog

All notable DOMHamster changes are recorded here. The project has not selected `v1.0.0`; entries remain under **Unreleased** until the complete release and official-client gates pass.

## Unreleased

### Planning and governance

- Approved the waterfall master plan, human-agent responsibility model, deterministic demonstration journey, security boundaries, and release gates.

### Application core

- Added the canonical eight-request, five-volunteer fictional fixture and deterministic fixture identity.
- Added deterministic validation for accounting, windows, availability, overlap, workload, skill, language, and human locks.
- Added six-state workflow commands, exact-version approval, 120-second expiry, one-shot commit, and bounded audit history.
- Added a serialized store, privacy-bounded selectors, resilient versioned persistence, and deterministic reset.

### WebMCP

- Added twelve strict tool contracts with closed JSON Schemas and six exact state-specific registration sets.
- Added store-backed tool handlers, capability detection, serialized registration reconciliation, stale-generation cleanup, and sanitized diagnostics.

### Interface

- Added the judge-facing workspace, request and volunteer panels, editable assignment table, human-only locks, validation navigation, approval review, committed summary, activity and diagnostics drawers, and responsive/accessibility hardening.

### Verification and release preparation

- Added acceptance traceability, security checks, tool-metadata checks, bundle and license gates, thirty agent-evaluation cases, and release-manifest verification.
- Added source-controlled Netlify configuration, deployment identity fields, official-client evidence templates, and the release-candidate checklist.
- Added judge-first repository documentation and documentation drift checks.
- Completed the dependency-backed Node 24.19.0 release-candidate gate: zero-warning formatting and lint, strict typechecking, 244 unit tests, 13 Chromium tests, production build and manifest generation, bundle-budget verification, 283-package license verification, and an audit with zero vulnerabilities.

## Release selection rule

A version entry will be added only after the exact tagged commit passes dependency-backed verification, browser tests, official WebMCP-enabled Chrome testing, ChatGPT in-app browser testing, public deployment checks, and release-identity verification.
