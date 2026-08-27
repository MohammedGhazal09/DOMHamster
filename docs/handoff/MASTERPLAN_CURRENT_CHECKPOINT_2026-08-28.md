# DOMHamster Master Plan — current execution checkpoint

> **Document type:** execution checkpoint addendum to `MASTERPLAN.md`  
> **Canonical plan version:** 0.20.0  
> **Checkpoint label:** 0.20.1-HANDOFF  
> **Recorded:** 2026-08-28  
> **Canonical source plan:** [`MASTERPLAN.md`](../../MASTERPLAN.md)  
> **Authoritative candidate:** `implementation/wp13-documentation@6dc975e22f63034f5cd259e3d738fa96f6fc4100`  
> **Status:** Phase 14 implementation assembled through WP13; final verification, deployment, official-client acceptance, release, media, and submission remain open

---

## 1. Purpose of this checkpoint

The canonical master plan remains the full approved source of truth for requirements, architecture, state transitions, tool contracts, UI, security, testing, deployment, media, and submission. Its formal header still says WP07 is next because it has not yet been advanced after an exact release gate.

This checkpoint closes that status gap without falsely declaring a release. It records what has actually been implemented on the release-candidate branch, what evidence exists, what remains unverified, and the exact completion sequence.

This addendum does not change the product scope or authorize new features.

## 2. Executive status

| Item | Current position |
|---|---|
| Product | **DOMHamster — The human-approved agent dispatcher** |
| Optimization target | Maximize probability of a top-10 WebMCP Challenge finish |
| Entrant | Solo builder based in Saudi Arabia |
| Repository | Public `MohammedGhazal09/DOMHamster` |
| Canonical integrated branch | `main` |
| Release-candidate branch | `implementation/wp13-documentation` |
| Candidate commit | `6dc975e22f63034f5cd259e3d738fa96f6fc4100` |
| Candidate PR | Draft PR #32, open and mergeable |
| Candidate relation | 70 commits ahead of `main`, 0 behind |
| Candidate scope | 109 changed files |
| Formal plan checkpoint | 0.20.0 |
| Execution checkpoint | 0.20.1-HANDOFF |
| Live deployment | Not yet verified or recorded |
| Release tag | Not created |
| Demo video | Not created |
| Devpost submission | Not finalized |

## 3. Locked product strategy

### 3.1 Problem

Small community organizations coordinate non-emergency requests using fragmented spreadsheets, messages, and manual judgment. Matching requests with volunteers requires time-window, availability, workload, skill, language, zone, privacy, and human-preference reasoning.

### 3.2 Solution

DOMHamster exposes structured browser-native WebMCP tools to an agent while preserving a visible coordinator workspace and exclusive human authority over consequential decisions.

### 3.3 Winning thesis

| Judging criterion | Product response |
|---|---|
| WebMCP leverage | Twelve task-specific tools, strict schemas, state-aware registration, complete multi-step flow, and tool evaluations |
| Execution | Deterministic no-login app, visible shared state, typed domain engine, persistence, audit, diagnostics, recovery, and repeatable reset |
| Impact | Credible coordination workflow for small organizations without enterprise dispatch software |
| Creativity and ambition | Human-created conflict, human-only lock, agent repair around the lock, exact-version approval, one-shot commit, and progressive disclosure |

## 4. Scope

### 4.1 Included

- fictional non-emergency community-assistance requests;
- eight requests and five volunteers;
- request and volunteer discovery;
- complete assignment drafts;
- deterministic validation;
- visible human editing and locking;
- lock-preserving agent repair;
- exact-version approval review;
- 120-second commit authorization;
- one-shot commit;
- post-commit selected contact access;
- audit history;
- resilient browser persistence and deterministic reset;
- responsive and keyboard-accessible coordinator UI;
- state-aware WebMCP registration;
- public static deployment and judge documentation.

### 4.2 Excluded

- emergency dispatch;
- real personal data;
- backend authentication or authorization;
- payments;
- live GPS or mapping;
- real messaging;
- external runtime APIs;
- multi-tenant administration;
- native mobile applications;
- full localization;
- new features not required for the canonical judged journey.

## 5. Human-agent responsibility model

| Responsibility | Human | Agent | Application |
|---|---:|---:|---:|
| Set goal and priorities | Primary | Interprets | Displays |
| Read operational requests and volunteers | Can inspect | Primary through WebMCP | Supplies minimized data |
| Create initial plan | Optional | Primary | Validates |
| Explain conflicts | Reviews | Can summarize | Deterministically classifies |
| Edit assignment | Exclusive through UI | No | Applies versioned command |
| Lock/unlock | Exclusive | No | Enforces lock |
| Prepare review | No | Yes | Requires valid exact version |
| Approve/reject/cancel | Exclusive | No | Binds or clears authorization |
| Commit | Requests through tool | Primary after approval | Revalidates and mutates once |
| Access contacts | Authorizes by completed workflow | Requests explicit IDs | Returns minimum fictional data and audits |
| Reset | Exclusive | No | Restores canonical fixture |

## 6. Domain and workflow model

### 6.1 Workflow states

1. `READY`
2. `DRAFT_INVALID`
3. `DRAFT_VALID`
4. `AWAITING_APPROVAL`
5. `APPROVED`
6. `COMMITTED`

### 6.2 Core invariants

- Every request appears exactly once in a complete draft.
- Assigned entries have a known volunteer and valid start time.
- Assignments must respect request windows and volunteer availability.
- Volunteer overlap is a hard error.
- Workload, skill, and language constraints are deterministic.
- Human locks are authoritative.
- Agent revision cannot change a locked assignment.
- Mutations require the current draft version.
- Approval binds to one exact version.
- Approval expires after 120 seconds and never survives reload.
- Commit immediately revalidates.
- Commit succeeds once and replay fails.
- Contact access exists only after commit and for explicit assigned request IDs.
- Restricted contact values remain unavailable before commit.
- Audit output is sanitized and bounded.
- Reset returns the exact canonical fixture.

### 6.3 Canonical journey

| Step | Expected state/result |
|---:|---|
| 1 | Reset and open in `READY` |
| 2 | Agent discovers five tools |
| 3 | Agent creates valid draft v1 |
| 4 | Human changes `R-105` from `V-01` to `V-03` at `13:00`, creating v2 |
| 5 | Human locks `R-105`, creating v3 and `DRAFT_INVALID` overlap with `R-106` |
| 6 | Agent validates the exact v3 conflict |
| 7 | Agent moves only `R-106` to `V-05` at `13:00` |
| 8 | Draft v4 becomes `DRAFT_VALID`; locked `R-105` is unchanged |
| 9 | Agent prepares v4 for review |
| 10 | Human approves v4 |
| 11 | Commit tool appears for 120 seconds |
| 12 | Agent commits v4 once; state becomes `COMMITTED` |
| 13 | Agent requests selected fictional contacts and audit history |

## 7. WebMCP design

### 7.1 Final tools

| Tool | Class | Purpose |
|---|---|---|
| `get_coordination_overview` | Read | Summary and current workflow state |
| `list_open_requests` | Read, untrusted-content aware | Privacy-minimized request discovery |
| `list_available_volunteers` | Read | Volunteer capability discovery |
| `create_assignment_draft` | Write | Create complete assignment proposal |
| `get_assignment_draft` | Read | Read current draft and issues |
| `validate_assignment_draft` | Read | Validate exact version |
| `revise_assignment_draft` | Write | Revise unlocked assignments |
| `prepare_plan_approval` | Write | Enter visible exact-version review |
| `commit_assignment_plan` | Write | Commit one approved exact version |
| `get_committed_plan` | Read | Read final plan |
| `access_dispatch_contacts` | Audited restricted read/write-class operation | Return selected fictional contacts after commit |
| `get_audit_history` | Read | Return bounded sanitized history |

### 7.2 State registration matrix

| State | Count | Important availability rule |
|---|---:|---|
| `READY` | 5 | Draft creation available |
| `DRAFT_INVALID` | 7 | Revision available; approval unavailable |
| `DRAFT_VALID` | 8 | Approval preparation available |
| `AWAITING_APPROVAL` | 3 | Agent waits for human decision |
| `APPROVED` | 4 | Commit available for exact version |
| `COMMITTED` | 3 | Contacts and committed-plan reads available |

### 7.3 Runtime rules

- Use `document.modelContext.registerTool(...)`.
- Register only state-valid tools.
- Unregister stale tools through abort-based cleanup.
- Report observed registrations, not desired registrations.
- Reject malformed input before state access.
- Reject pre-aborted execution before validation, state access, or dispatch.
- Return bounded structured results and sanitized errors.
- Never use WebMCP handlers to inspect or click UI DOM.

## 8. Architecture checkpoint

| Concern | Decision |
|---|---|
| Application | Static React/TypeScript SPA |
| Build | Vite |
| Runtime | Node 24 / npm 11.17 for verification and build |
| Domain | Pure deterministic TypeScript |
| Store | Serialized FIFO command dispatch |
| Persistence | Versioned localStorage envelope with validation and recovery |
| Schema validation | Ajv with closed JSON Schemas |
| Component testing | Vitest and React Testing Library |
| Browser testing | Playwright Chromium |
| Deployment | Netlify static hosting |
| Backend | None |
| Runtime secrets | None |
| Third-party runtime network | None |

### 8.1 Trust boundaries

| Boundary | Control |
|---|---|
| Agent input | Strict schema, known IDs, current state, current version |
| Untrusted request notes | Marked as data; not interpolated into tool metadata or authority logic |
| Human authority | No tools for lock, approval, rejection, cancellation, discard, or reset |
| Contact information | Separate private map, unavailable pre-commit, explicit post-commit selection |
| Persistence | Candidate state saved before visible replacement; corrupted data resets safely |
| Errors | Opaque references; no raw exception, stack, input, or restricted value exposure |
| Render failure | Sanitized error boundary with reset and reload recovery |

## 9. UI checkpoint

The candidate includes:

- DOMHamster brand and hamster mark;
- workflow and WebMCP status;
- scenario date and global actions;
- judge brief and canonical prompt;
- summary metrics;
- request and volunteer panels;
- native assignment table;
- human-only lock controls;
- validation issues with two-way focus navigation;
- visible draft version and state;
- approval dialog and approved countdown;
- committed plan summary;
- activity and diagnostics drawers;
- reset, discard, cancellation, and rejection confirmations;
- keyboard, responsive, reduced-motion, and forced-colors support;
- sanitized render-recovery fallback.

No UI component may import or render private contact storage directly.

## 10. Implementation status by work package

| WP | Name | Status |
|---:|---|---|
| 00 | Toolchain and minimum shell | Complete on `main` |
| 01 | Domain types and fictional fixture | Complete on `main` |
| 02 | Deterministic validation | Complete on `main` |
| 03 | Commands, state machine, approval, commit, audit | Complete on `main` |
| 04 | Store, selectors, persistence, reset | Complete on `main` |
| 05 | Tool contracts, schemas, lifecycle | Complete on `main` |
| 06 | Handlers, registry, capability, diagnostics | Complete on `main` |
| 07 | Judge-facing shell | Source complete on candidate |
| 08 | Editing, locks, conflict and repair | Source complete on candidate |
| 09 | Approval, commit, contacts, audit and reset | Source complete on candidate |
| 10 | Responsive, accessibility and visual hardening | Source complete on candidate |
| 11 | Complete verification and agent evaluations | Test/eval source complete; execution incomplete |
| 12 | Deployment and release identity | Config/source complete; public deployment incomplete |
| 13 | Documentation, media and submission | Documentation source complete; media/submission incomplete |

## 11. Verification checkpoint

### 11.1 Source-level evidence currently recorded

| Evidence | State |
|---|---|
| Registry-to-UI observed registration contract | Passed |
| Pre-execution abort contract | Passed |
| Acceptance traceability | Passed; 23 referenced evidence paths |
| Browser fixture drift guard | Passed |
| Human authority suite source | Present |
| Privacy boundary suite source | Present |
| Prompt-injection suite source | Present |
| Canonical browser specification | Present |
| Exact lifecycle/replay/reset specification | Present |
| Render-recovery source contract | Passed |
| Release-runner source contract | Passed |
| Release-runner plain-Node tests | 5 passed, 0 failed |
| Runner self-test wiring | Present in normal verification |

### 11.2 Evidence not yet earned for the exact candidate

- clean Node 24 `npm ci`;
- complete Prettier result;
- complete ESLint result;
- strict project TypeScript result;
- complete Vitest result;
- accessibility suite result;
- security suite result;
- complete Playwright result;
- bundle-size result;
- dependency-license result;
- high-severity dependency audit result;
- authentic 50-trial evaluation result;
- final manifest generation and verification;
- production headers/network/console result;
- native WebMCP Chrome result;
- ChatGPT in-app browser result.

No release claim may imply these gates passed until exact observed output is preserved.

## 12. Complete release gate

Run from a clean exact-candidate checkout:

```bash
nvm use
npm ci
npx playwright install chromium
npm run verify:release -- --eval-results /absolute/path/to/authentic-50-trials.json
```

The release runner validates the evaluation file before any subprocess and then performs:

1. repository verification;
2. Playwright;
3. bundle-size gate;
4. license gate;
5. dependency audit;
6. 50-trial scorer;
7. release-manifest generation; and
8. release-manifest verification.

Passing threshold:

| Measure | Requirement |
|---|---:|
| Agent trials | Exactly 50 |
| Overall passes | At least 45 |
| High-risk trial passes | 100% |
| High/critical dependency vulnerabilities | 0 |
| Critical/serious accessibility failures | 0 |
| Unexpected runtime services | 0 |

## 13. Deployment and release plan

### 13.1 Release candidate

- Merge PR #32 only after exact-head repository and evaluation gates pass.
- Rerun the complete gate on the exact integrated `main` commit.
- Deploy that exact commit to Netlify.
- Verify headers, SPA routing, cache behavior, logged-out access, console cleanliness, no unexpected network calls, reloads, reset, and repeated journeys.
- Record build identity and compare it with the release manifest.

### 13.2 Official clients

| Client | Required result |
|---|---|
| WebMCP-enabled Chrome | Native six-state registration and complete external-agent journey |
| ChatGPT in-app browser | Complete judge journey from reset through commit and audited contacts |

### 13.3 Final identity

The following must identify the same exact commit:

- GitHub `v1.0.0` tag;
- repository source;
- release manifest;
- production deployment;
- screenshots;
- demo video;
- Devpost live URL and repository URL.

## 14. Submission plan

### 14.1 Required media

| Asset | Required state |
|---|---|
| Thumbnail | DOMHamster identity, readable at Devpost size |
| Screenshot 1 | READY workspace |
| Screenshot 2 | Human-created overlap and lock |
| Screenshot 3 | Exact-version approval review |
| Screenshot 4 | COMMITTED plan and audit evidence |
| Video | Public YouTube, audio, under 3 minutes, target 2:35–2:45 |

### 14.2 Required Devpost content

- project name and elevator pitch;
- project story: inspiration, implementation, learning, challenges;
- built-with tags;
- live URL;
- public repository URL;
- public video URL;
- exact judge testing instructions;
- tested agent/client list;
- AI-use disclosure;
- learning and career-value selections;
- truthful new/existing-project status;
- final non-draft submission.

## 15. Schedule from this checkpoint

| Priority | Phase | Output |
|---:|---|---|
| 1 | Candidate verification | Exact green commit |
| 2 | Agent evaluation | Valid 50-trial evidence |
| 3 | Integration | Verified `main` commit |
| 4 | Deployment | Public exact-commit Netlify URL |
| 5 | Official-client acceptance | Chrome and ChatGPT evidence |
| 6 | Release identity | Manifest and `v1.0.0` |
| 7 | Media | Four screenshots and final video |
| 8 | Devpost | Finalized submission and receipt |
| 9 | Judging freeze | Unchanged public surfaces |

No feature work is scheduled between this checkpoint and submission unless required to correct a release-blocking defect.

## 16. Priority risk register

| Priority | Risk | Response |
|---:|---|---|
| P0 | Too little time remains for broad refactoring | Freeze scope and execute gates immediately |
| P0 | Candidate contains hidden type/test failures | Clean Node 24 checkout and first full run |
| P0 | Evaluation file is missing or not authentic | Record real trials and preserve raw evidence |
| P0 | Deterministic harness passes but native clients fail | Test both official clients before merge/tag |
| P0 | Deployment does not match verified source | Enforce manifest and build identity |
| P0 | Video depicts a different build | Capture only after final deployment |
| P0 | Submission remains draft | Add explicit finalization and receipt check |
| P0 | Post-deadline modification | Freeze all judged surfaces |
| P1 | Canonical master-plan header remains stale | Update only after observed release gates, preserving this checkpoint |

## 17. Completion definition

DOMHamster reaches 100% only when all of the following are true:

| Area | Required result |
|---|---|
| Requirements | All P0 requirements pass with traceable evidence |
| Product | Reset-to-commit-and-contact journey succeeds repeatedly |
| WebMCP | Twelve contracts and exact state sets work natively |
| Human authority | Human-only actions remain unavailable to tools |
| Safety | Version binding, expiry, revalidation, replay prevention and locks pass |
| Privacy | No pre-commit restricted-field exposure |
| Verification | Complete release gate passes on exact commit |
| Evaluations | 45/50 overall and 100% high-risk |
| Accessibility | Keyboard-complete and no critical/serious violations |
| Repository | Public, licensed, documented and clean-clone buildable |
| Deployment | Public, correct headers, exact identity and logged-out access |
| Official clients | Chrome and ChatGPT complete the canonical journey |
| Media | Four release-matched screenshots and public sub-three-minute video |
| Submission | Devpost finalized and receipt preserved |
| Freeze | Submitted surfaces remain unchanged during judging |

## 18. Governance update rule

After the exact candidate passes verification, evaluation, deployment, and official-client gates:

1. update the canonical `MASTERPLAN.md` header and ledger;
2. record exact commit, test totals, evaluation totals, deployment URL, browser versions, manifest hash, tag, and known limitations;
3. mark WP07–WP13 complete only where evidence exists;
4. create the next formal master-plan version;
5. preserve this handoff checkpoint as historical evidence; and
6. do not rewrite earlier checkpoint history.

---

## Checkpoint decision

The approved design remains valid. Source implementation through WP13 is present on the candidate, with additional verification and recovery hardening. The project is ready for a provisioned exact-head verification cycle. It is not ready to merge, tag, deploy as final, record media, or submit until the remaining gates pass.
