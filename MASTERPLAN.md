# DOMHamster Master Plan

> **Document ID:** DH-MP-001  
> **Version:** 0.17.0  
> **Checkpoint:** Phase 14 implementation in progress; WP00–WP03 complete; WP04 next  
> **Last updated:** 2026-08-26 (Asia/Riyadh)  
> **Status:** Authoritative living project-control checkpoint

---

## 1. Governance

DOMHamster is executed from the product specification approved by the entrant on 2026-08-26:

> **I approve DOMHamster Master Plan version 0.12.0 and authorize repository creation and implementation.**

The approved product scope remains frozen. Later versions record implementation evidence and corrections; they do not silently expand the product.

| Rule | Locked decision |
|---|---|
| Primary objective | Maximize the probability of placing in the hackathon top 10. |
| Delivery model | Sequential waterfall phases with explicit gates. |
| Routine decisions | The orchestrator selects the recommended option without asking routine questions. |
| Implementation method | Test-first RED → GREEN → refactor, with evidence before completion claims. |
| Source authority | Devpost Official Rules, official challenge resources, WebMCP specification, Chrome documentation. |
| Human authority | Locks, unlocks, approval decisions, cancellation, discard, and reset remain human-only. |
| Judging freeze | The submitted repository commit, deployment, video, and Devpost entry remain unchanged during judging. |
| Data boundary | Fictional, non-emergency data only; no real personal information. |

## 2. Product identity and winning thesis

| Item | Decision |
|---|---|
| Name | **DOMHamster** |
| Subtitle | **The human-approved agent dispatcher** |
| Repository | `MohammedGhazal09/DOMHamster` |
| Entrant | Solo builder based in Saudi Arabia |
| Primary user | Coordinator at a small nonprofit, school, neighborhood program, or community initiative |
| Product | WebMCP-native coordination board for matching non-emergency assistance requests with volunteers |
| Agent role | Read structured operational state, create and revise drafts, prepare review, and commit an already approved version |
| Human role | Inspect, edit, lock, approve, reject, cancel, discard, and reset through visible UI controls |
| Application role | Enforce constraints, permissions, versions, privacy, lifecycle, persistence, and audit |
| Primary differentiator | Human-created conflict, human-only lock, agent repair around the lock, exact-version approval, one-shot commit, and progressive disclosure |

**One-sentence definition:** DOMHamster is a WebMCP-native coordination board where an AI agent drafts and repairs volunteer assignments while a human coordinator visibly controls every consequential decision.

### 2.1 Judging strategy

| Criterion | DOMHamster response |
|---|---|
| WebMCP leverage | Twelve task-specific tools, strict schemas, state-aware registration, visible shared state, and multi-step evaluations |
| Execution | One deterministic reset-to-commit journey, no login, no backend, pure domain logic, audit, diagnostics, and browser verification |
| Potential impact | Practical coordination assistance for small organizations without enterprise dispatch software |
| Creativity and ambition | Human-only locking and approval, lock-preserving replanning, expiring exact-version authorization, and audited data disclosure |

WebMCP remains the highest technical priority because it is a scored criterion and the first tie-break criterion.

## 3. Competition controls

| Priority | Requirement | Project control |
|---:|---|---|
| P0 | Meaningful WebMCP use | Imperative `document.modelContext.registerTool(...)` tools are central to the entire journey |
| P0 | Public working application | Public no-login static deployment with deterministic reset |
| P0 | Public source and open-source license | Public GitHub repository with root MIT license |
| P0 | Public video under three minutes with audio | Target 2:35–2:45 using the exact release deployment |
| P0 | Judge testing instructions | README and Devpost instructions reproduce the canonical journey |
| P0 | Project functions as depicted | Screenshots, video, deployment, tag, manifest, and submission use one release identity |
| P1 | Original challenge-period work | Public dated commit history and RED/GREEN evidence |
| P1 | English submission materials | English narrative, instructions, audio or subtitles |

**Controlling deadline:** September 3, 2026 at 1:00 p.m. PDT, equivalent to 11:00 p.m. in Riyadh.  
**Internal deadline:** September 3, 2026 at 6:00 p.m. Riyadh.

## 4. Frozen scope

### Included

- Eight fictional assistance requests and five fictional volunteers.
- Constraint-aware assignment drafts.
- Deterministic validation of time, availability, overlap, workload, skill, language, and request accounting.
- Visible human edits and authoritative locks.
- Agent repair around locks.
- Human review and exact-version approval.
- Approval expiry after 120 seconds.
- One-shot commit with replay rejection.
- Privacy-minimized pre-commit data.
- Explicit, request-scoped, fictional contact access after commit.
- Bounded append-only audit history.
- Deterministic reset and local persistence.
- State-aware WebMCP tool registration.
- Desktop-first responsive UI and keyboard-complete critical path.

### Excluded

- Emergency dispatch or emergency-service claims.
- Real personal information.
- Authentication, accounts, payments, live maps, GPS, messaging, or real nonprofit integrations.
- Backend services, runtime API keys, analytics, or telemetry.
- Native mobile applications.
- Full localization during the hackathon.
- Unplanned external APIs or infrastructure dependencies.

## 5. Human–agent responsibility model

| Responsibility | Human | Agent | DOMHamster |
|---|---:|---:|---:|
| Set goal and priorities | Primary | Interprets | Displays |
| Read requests and volunteers | Can inspect | Uses WebMCP | Supplies minimized structured data |
| Construct initial plan | Optional | Primary | Validates |
| Detect conflicts | Reviews | Explains | Deterministically evaluates |
| Edit and lock assignment | Primary | Cannot perform | Stores authoritative lock |
| Revise around lock | Reviews | Primary | Rejects lock mutation |
| Approve or reject | Primary | Cannot decide | Binds decision to exact version |
| Commit approved plan | Confirms through approval | Invokes commit tool | Revalidates and mutates once |
| Access contacts | Authorizes by post-commit workflow | Requests explicit IDs | Returns selected fictional values and audits access |
| Reset demo | Primary | Cannot perform | Restores exact canonical fixture |

## 6. Canonical demonstration journey

1. Open the public READY workspace with eight requests and five volunteers.
2. Ask the agent to prepare today’s plan, prioritize food deliveries, limit workload, and satisfy Arabic support for R-104.
3. The agent reads privacy-minimized request and volunteer data through WebMCP.
4. The agent creates a complete valid draft.
5. The human moves R-105 to V-03 at 13:00 and locks it.
6. The edit creates a deterministic overlap with R-106.
7. Validation displays the conflict.
8. The agent revises only R-106 to V-05 at 13:00 and preserves R-105.
9. The agent prepares the exact draft version for human review.
10. The human approves that version.
11. `commit_assignment_plan` becomes available for 120 seconds.
12. The agent invokes commit; DOMHamster revalidates and commits once.
13. The board enters COMMITTED, the audit trail records the transition, and explicit fictional contact access becomes available.

## 7. Domain and workflow model

### 7.1 Canonical fixture

| Entity | Frozen count or rule |
|---|---|
| Requests | 8: R-101 through R-108 |
| Volunteers | 5: V-01 through V-05 |
| Time zone | `Asia/Riyadh` |
| Scenario assignment maximum | 3 per volunteer |
| R-104 | Requires Arabic support |
| V-03 | East zone; driving, lifting; Arabic and English |
| Private contacts | Separate fictional contact map, never included in pre-commit selectors |
| Request notes | Explicitly untrusted content, never instructions to the agent |

### 7.2 Workflow states

| State | Meaning |
|---|---|
| `READY` | Canonical fixture loaded; no draft |
| `DRAFT_INVALID` | Draft exists with one or more hard validation errors |
| `DRAFT_VALID` | Draft exists with no hard validation errors |
| `AWAITING_APPROVAL` | Current valid version is displayed for human decision |
| `APPROVED` | Exact current version has a live human approval |
| `COMMITTED` | Plan was committed once; draft and approval are cleared |

### 7.3 Non-negotiable invariants

- Every accepted draft mutation increments the version exactly once.
- Stale version commands leave state and audit byte-identical.
- Agent revisions cannot modify or forge authoritative human locks.
- Draft rows cannot use `committed` status before the commit command.
- Approval is tied to one draft version and expires after 120 seconds.
- Mutation, reload invalidation, rejection, cancellation, reset, or expiry removes commit authority.
- Commit immediately revalidates, accepts only the live approved version, and rejects replay.
- Audit events are immutable, sanitized, sequenced, and bounded to 100.
- Reset restores the exact canonical fixture identity.

## 8. Validation contract

### Hard errors

- Duplicate request assignment.
- Unknown request or volunteer identifier.
- Invalid start time, duration, or status shape.
- Request time-window violation.
- Volunteer availability violation.
- Volunteer time overlap.
- Workload above the scenario maximum.
- Missing required skill.
- Missing required language.
- Human-lock mutation or removal.

### Warnings

- Request unassigned.
- Noncritical cross-zone inefficiency.
- Workload imbalance.

Validation is pure, deterministic, immutable, evaluates all applicable rules, and returns stable sorted issue output.

## 9. WebMCP capability model

### 9.1 Final tool inventory

| Tool | Purpose |
|---|---|
| `get_coordination_overview` | Return minimized scenario summary and workflow state |
| `list_open_requests` | Return public operational request fields |
| `list_available_volunteers` | Return public volunteer availability and capabilities |
| `create_assignment_draft` | Create a complete assignment draft |
| `get_assignment_draft` | Return the current draft and version |
| `validate_assignment_draft` | Return deterministic errors and warnings |
| `revise_assignment_draft` | Revise assignments while preserving authoritative locks |
| `prepare_plan_approval` | Move the current valid version into visible human review |
| `commit_assignment_plan` | Commit the exact live approved version once |
| `get_committed_plan` | Return the committed operational plan |
| `access_dispatch_contacts` | Return selected fictional contacts after commit and audit access |
| `get_audit_history` | Return sanitized bounded audit history |

### 9.2 State-dependent tool counts

| State | Count |
|---|---:|
| `READY` | 5 |
| `DRAFT_INVALID` | 7 |
| `DRAFT_VALID` | 8 |
| `AWAITING_APPROVAL` | 3 |
| `APPROVED` | 4 |
| `COMMITTED` | 3 |

Locks, unlocks, approval decisions, cancellation, discard, and reset deliberately have no WebMCP tool equivalents.

## 10. Architecture

| Area | Decision |
|---|---|
| Application | Static React 19 and TypeScript SPA built with Vite |
| Runtime | Node.js 24.19.0 and npm 11.17.0 |
| Domain | Pure TypeScript types, fixture, validation, state machine, commands, and audit |
| State | Serialized external store shared by UI and WebMCP handlers |
| Persistence | Versioned `localStorage` envelope with safe reset and recovery |
| Schemas | JSON Schema validated with Ajv |
| WebMCP | Static contracts, handlers, lifecycle matrix, serialized registry, capability adapter |
| Testing | Vitest, React Testing Library, Playwright, accessibility checks, agent evaluation fixtures |
| Deployment | Netlify static hosting from public `main` |
| Backend | None |
| Runtime secrets | None |

### Boundaries

- UI components do not access `document.modelContext` or `localStorage` directly.
- WebMCP handlers do not inspect, query, or click presentation DOM.
- UI and WebMCP invoke the same serialized application commands.
- Domain modules remain framework-independent and deterministic.
- Contact data stays outside public selectors until committed and explicitly requested.

## 11. Security and privacy controls

| Threat | Control |
|---|---|
| Prompt injection in request notes | Notes are marked untrusted; descriptions instruct agents not to treat data as commands |
| Excessive data disclosure | Allowlisted selectors; no pre-commit contact values |
| Unauthorized consequential mutation | Human-only approval plus exact version, expiry, and revalidation |
| Lock bypass | Separate authoritative lock snapshots and lock-preservation validation |
| Replay | Committed state rejects repeated commit |
| Stale actions | Expected-version checks on mutations |
| Race conditions | Serialized store and registry queues |
| Corrupted persistence | Versioned envelope, structural checks, safe canonical reset |
| Sensitive diagnostics | Sanitized error codes and non-sensitive build identity only |
| Real-world harm | Fictional, non-emergency scenario and explicit limitations |

## 12. Verification strategy

| Layer | Required evidence |
|---|---|
| Domain | Unit tests for fixture, hashing, validation, transitions, commands, approvals, locks, commit, and audit |
| Store/persistence | Serialization, selector privacy, migration, corruption recovery, reload normalization, deterministic reset |
| WebMCP | Exact contracts, strict schemas, handlers, lifecycle counts, unregister/reconcile races, capability detection |
| UI | Component behavior, keyboard path, focus management, status announcements, responsive layouts |
| E2E | Canonical READY → COMMITTED journey, reload cases, privacy checks, repeated reset |
| Agent evaluations | 30 cases and 50 scored trials; at least 45/50 overall and 100% of high-risk safety trials |
| Release | Clean clone, CI, audit, production build, headers, network/console checks, both official browser clients |

No work package is complete until focused verification and all affected regressions pass from fresh output.

## 13. Waterfall and work-package ledger

| Version | Phase or work package | Result |
|---|---|---|
| 0.1.0 | Objective, strategy, and concept | Passed |
| 0.2.0 | Requirements baseline: 103 atomic requirements, 97 P0 and 6 P1 | Passed |
| 0.3.0 | Personas, use cases, and 24 acceptance scenarios | Passed |
| 0.4.0 | Domain model and state machine | Passed |
| 0.5.0 | Twelve WebMCP contracts and lifecycle | Passed |
| 0.6.0 | Architecture and technology stack | Passed |
| 0.7.0 | UI information architecture and interaction design | Passed |
| 0.8.0 | Security, privacy, and failure model | Passed |
| 0.9.0 | Tests, evaluations, and browser plan | Passed |
| 0.10.0 | Deployment, diagnostics, release, and freeze | Passed |
| 0.11.0 | Fourteen implementation work packages | Passed |
| 0.12.0 | Repository, documentation, media, and submission plan | Passed |
| 0.13.0 | Entrant approval and implementation authorization | Passed |
| 0.14.0 | WP00 repository, Node 24 toolchain, React shell, CI | Complete |
| 0.15.0 | WP01 canonical fictional domain fixture | Complete |
| 0.16.0 | WP02 deterministic assignment validation | Complete |
| 0.17.0 | WP03 workflow state machine, commands, approval, commit, and audit | Complete |
| Next | WP04 store, ports, selectors, and resilient persistence | Authorized, not started |

## 14. Verified implementation checkpoints

### WP00 — toolchain and baseline

- Formal missing-App RED run: `32987466258`.
- Feature GREEN run: `32992239277`.
- Integrated `main` GREEN run: `32992594799`.
- Node `24.19.0`; npm `11.17.0`.
- Exact lockfile, formatting, lint, strict type checking, Vitest, production build, Playwright Chromium, and dependency audit passed.

### WP01 — canonical fixture

- Formal missing-seed RED run: `33000968431`.
- Final branch CI run: `33002223190`.
- Repository GREEN run: `33002223215`.
- Fixture identity: `b861f7e997f2f14e087d209130de7e4aa465d8047110b11872edb7750a2122b1`.
- Eight requests, five volunteers, separate fictional contacts, untrusted notes, and deterministic canonical JSON are implemented.

### WP02 — deterministic validation

- RED commit: `6eb8764a9b1864b6f6673ca861524066adeaf5dd`.
- RED workflow: `33003950723`, unresolved `src/domain/validation` as intended.
- Final feature head: `f5e407acdcb477d8b8a41b381c6a65806a2949e4`.
- Branch gates: `33005698434` and `33005698437` passed.
- Merge commit: `b28e1a9e901904016e817602799a383be804d9ff`.
- Exact integrated `main` CI: `33006222521` passed.

### WP03 — workflow, approval, commit, and audit

#### RED cycle 1

- Test-only head: `8cb9433c4221df2d8529ff93c67406439919b1b6`.
- Workflow: `33014526107`.
- Expected missing modules: `src/domain/commands`, `src/domain/audit`, `src/domain/state-machine`.
- Confirmation marker: `DOMHAMSTER_WP03_EXPECTED_RED_CONFIRMED`.

#### GREEN cycle 1

- Complete branch gate: `33015481233` passed.
- Repository CI: `33015481223` passed.

#### RED cycle 2

- Regression head: `aa915bd5ee7581b4cb644491ad793482349d72b7`.
- Workflow: `33015830859`.
- Exactly two new draft-status tests failed while 11 existing command tests passed.
- Confirmation marker: `DOMHAMSTER_WP03_DRAFT_STATUS_RED_CONFIRMED`.

#### Final GREEN and integration

- Final feature head: `d1205646e303afa021e7f41889ffb1f65f15862a`.
- Complete branch gate: `33016006929` passed.
- Repository CI: `33016006987` passed.
- Result: 8 Vitest files and 75 tests passed; production build, Playwright Chromium, and audit passed with 0 vulnerabilities.
- Merge commit: `991d7089903786f76c99c578397d936ca7d4fed7`.
- Exact integrated `main` CI: `33016239969` passed every step.

## 15. Current findings and risks

| Priority | Finding or risk | Control |
|---:|---|---|
| P0 | WP04 is the next dependency for all UI and WebMCP integration | Implement store, ports, selectors, and persistence before contracts or UI |
| P0 | Privacy depends on selectors rather than UI discipline | Write selector privacy tests first and expose no raw scenario object |
| P0 | Concurrent agent and UI commands could race | Serialized FIFO dispatch and persistence ordering |
| P0 | Reload can invalidate approval or corrupt state | Versioned persistence envelope and normalization tests |
| P0 | Temporary WP03 transfer automation must not remain | Remove staging payloads and WP03-only workflows in this governance checkpoint |
| P1 | Existing WP00/WP02 evidence workflows are historical clutter | Keep until a later dedicated workflow-cleanup review; do not mix unrelated cleanup into WP03 finalization |
| P1 | Solo schedule is sensitive to scope expansion | Maintain excluded-scope boundary and P0-first ordering |

## 16. WP04 execution plan

**Goal:** introduce the single serialized application state authority and privacy-bounded read models.

### Files

- `src/app/ports.ts`
- `src/app/store.ts`
- `src/app/selectors.ts`
- `src/persistence/local-storage.ts`
- `tests/app/store.test.ts`
- `tests/app/selectors.test.ts`
- `tests/persistence/local-storage.test.ts`

### Required RED → GREEN sequence

1. Write failing concurrent-dispatch tests proving commands must reduce in call order against the latest state.
2. Implement a FIFO promise chain or explicit queue; rejected commands must not notify or persist.
3. Write failing selector tests proving pre-commit outputs exclude `privateContacts`, exact fictional locations, and contact channels.
4. Implement distinct UI, WebMCP, and post-commit selectors using explicit allowlists.
5. Write failing persistence tests for round trip, schema version, corrupted JSON, incompatible version, impossible state, approval reload invalidation, and canonical reset.
6. Implement the versioned local-storage repository and normalization boundary.
7. Run focused tests, full domain/app/persistence regressions, lint, type checking, build, Playwright smoke, and dependency audit.
8. Merge only after exact branch and integrated-main gates pass.

### WP04 gate

| Condition | Required result |
|---|---|
| Serialized dispatch | Deterministic FIFO order under concurrent calls |
| Notifications | One notification per accepted state replacement; none for rejected commands |
| Persistence | Write occurs only after accepted commands and in the same order |
| Privacy | No restricted contact fields in pre-commit selectors or rendered state |
| Recovery | Corrupt, old, or impossible persisted data resets safely and records sanitized diagnostics |
| Approval reload | Pending or approved authorization is invalidated on reload |
| Reset | Exact canonical fixture hash restored |
| Verification | All focused and repository regressions pass |

## 17. Remaining implementation packages

| Package | Deliverable | Status |
|---|---|---|
| WP04 | Store, ports, selectors, persistence | Next |
| WP05 | Twelve WebMCP contracts and schemas | Pending |
| WP06 | Handlers, capability detection, lifecycle, registry | Pending |
| WP07 | Judge-first shell and READY workspace | Pending |
| WP08 | Requests, volunteers, assignments, locks, validation UI | Pending |
| WP09 | Review, approval, commit, contacts, audit, reset UI | Pending |
| WP10 | Responsive, accessibility, and visual polish | Pending |
| WP11 | Full test, security, and agent-evaluation matrix | Pending |
| WP12 | Deployment, diagnostics, and official-client verification | Pending |
| WP13 | Judge documentation and release baseline | Pending |

## 18. Judged-release definition of done

| Area | Completion condition |
|---|---|
| Product | Canonical reset-to-commit-and-contact-access journey succeeds |
| Domain | All constraints, states, versions, locks, approval, commit, audit, reload, and reset invariants pass |
| WebMCP | All 12 exact tools appear only in valid states and use strict schemas |
| Human authority | Human-only controls remain absent from the tool surface |
| Privacy | No real PII and no restricted pre-commit fields |
| Reliability | No runtime API, secret, telemetry, or uncaught error |
| Verification | All P0 suites pass; at least 45/50 eval trials and 100% high-risk trials pass |
| Accessibility | Keyboard-complete critical path and no critical or serious automated findings |
| Repository | Public, MIT licensed, documented, clean-clone buildable, secret-clean, CI passing |
| Deployment | Public, logged-out accessible, correctly headed, and tied to one release commit |
| Compatibility | Canonical journey passes in WebMCP-enabled Chrome and ChatGPT’s in-app browser |
| Media | Four release-matched screenshots and public audio video under three minutes |
| Submission | Every Devpost field is complete and finalized before the internal deadline |
| Identity | Tag, commit, deployment, manifest, screenshots, video, and submission agree |
| Freeze | Judged artifacts remain unchanged during judging |

## 19. Source register

- [Devpost Official Rules](https://webmcp.devpost.com/rules)
- [OpenAI WebMCP Challenge](https://openai.com/webmcp-challenge/)
- [WebMCP specification](https://webmachinelearning.github.io/webmcp/)
- [Chrome WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp)
- [Chrome WebMCP security](https://developer.chrome.com/docs/ai/webmcp/secure-tools)
- [Chrome WebMCP evaluations](https://developer.chrome.com/docs/ai/webmcp/evals)
- [Node.js releases](https://nodejs.org/en/about/previous-releases)
- [Playwright documentation](https://playwright.dev/docs/intro)
- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [Netlify custom headers](https://docs.netlify.com/manage/routing/headers/)

## 20. Immediate next action

Complete this governance checkpoint by restoring the public implementation plan, updating the README and WP03 status, removing only temporary WP03 transfer infrastructure, and verifying the exact cleanup commit on CI. Then create `implementation/wp04-store-persistence` from that verified `main` commit and begin with the failing store serialization tests.
