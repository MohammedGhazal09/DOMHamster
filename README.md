# DOMHamster

**The human-approved agent dispatcher**

DOMHamster is a WebMCP-native coordination board where a browser agent drafts and repairs volunteer assignments while a human coordinator keeps exclusive control of locks, approval, discard, cancellation, and reset.

| Resource | Status |
|---|---|
| Live deployment | **Live deployment: pending** — the production URL will be added only after an exact-commit Netlify release passes the release gate |
| Public repository | [MohammedGhazal09/DOMHamster](https://github.com/MohammedGhazal09/DOMHamster) |
| Demo video | Pending until the verified release is recorded |
| License | [MIT License](LICENSE) |

> **Fictional demo data only.** DOMHamster is for non-emergency coordination and is not an emergency-dispatch system.

## Judge quick start

Use the **ChatGPT in-app browser** or **WebMCP-enabled Chrome** after the public release URL is recorded.

1. Open DOMHamster and select **Reset**. Confirm the header shows `READY`, 8 requests, and 5 volunteers.
2. Ask: **“Build today’s plan. Prioritize urgent food deliveries, keep every volunteer at three tasks or fewer, and make sure R-104 has an Arabic-speaking volunteer.”**
3. After the valid draft appears, change `R-105` to `V-03` at `13:00`, then select **Lock assignment**.
4. Ask the agent to repair the conflict without changing locked `R-105`.
5. Confirm the agent moves only `R-106` to `V-05` at `13:00` and the draft returns to `DRAFT_VALID`.
6. Ask the agent to prepare the plan for approval. Review the exact version and select **Approve**.
7. Ask the agent to call `commit_assignment_plan` for that approved version.
8. Optionally request the fictional dispatch contact for `R-101` and recent audit history.

Expected end state: `COMMITTED`; `R-105` remains human-locked; contact access is explicit, post-commit, request-scoped, and audited.

## What DOMHamster demonstrates

| Capability | Evidence |
|---|---|
| Structured agent access | Twelve task-specific WebMCP tools replace fragile DOM inference |
| Shared live state | UI and agent handlers use the same serialized application store |
| Deterministic guardrails | Pure validation enforces time, availability, skill, language, workload, and lock constraints |
| Human authority | The agent cannot lock, unlock, approve, reject, cancel, discard, or reset |
| Exact-version commit | Approval binds to one draft version, expires after 120 seconds, and permits one commit |
| Progressive disclosure | Operational data is available before commit; fictional contacts require explicit post-commit access |
| Repeatable judging | Eight requests, five volunteers, no login, no backend, no runtime secret, and deterministic reset |

## WebMCP lifecycle

| Workflow state | Tool count | Important capability change |
|---|---:|---|
| `READY` | 5 | Read the board and create a draft |
| `DRAFT_INVALID` | 7 | Read, validate, and revise; approval is unavailable |
| `DRAFT_VALID` | 8 | `prepare_plan_approval` becomes available |
| `AWAITING_APPROVAL` | 3 | Agent waits for a visible human decision |
| `APPROVED` | 4 | `commit_assignment_plan` is available for the exact approved version |
| `COMMITTED` | 3 | Read the plan, access selected contacts, and inspect audit history |

See [WebMCP tools and lifecycle](docs/webmcp-tools.md) for the complete inventory and state sets.

## Architecture

DOMHamster is a static React and TypeScript application. A pure domain engine, serialized store, versioned browser persistence, state-aware WebMCP registry, and semantic coordinator UI share one source of truth. Tool handlers never inspect or click presentation DOM.

See [Architecture and trust boundaries](docs/architecture.md).

## Local development

Prerequisites:

- **Node.js 24**
- npm 11.17 or the version pinned by `packageManager`

```bash
nvm use
npm ci
npm run dev
```

## Verification

```bash
npm run verify
npm run test:e2e
npm run verify:release
```

The release command includes source, type, unit, component, accessibility, security, deployment-config, browser, bundle, license, and evaluation gates. Results must be recorded as observed facts; the repository does not treat an unexecuted gate as passed.

See [Testing and evidence](docs/testing.md).

## Safety and privacy boundary

- The scenario and contacts are visibly fictional.
- Request notes and contact instructions are treated as untrusted content.
- No contact field is exposed through pre-commit selectors or tools.
- A static client cannot protect real secrets from a person controlling the browser; real organizational use requires an authenticated backend and authorization model.
- DOMHamster is not suitable for emergency or safety-critical dispatch.

See [Security policy](SECURITY.md).

## Project documentation

- [Architecture](docs/architecture.md)
- [WebMCP tool contracts](docs/webmcp-tools.md)
- [Testing and verification](docs/testing.md)
- [Submission checklist](docs/submission.md)
- [AI-use disclosure](docs/ai-use.md)
- [Project master plan](MASTERPLAN.md)

## License

DOMHamster source is released under the [MIT License](LICENSE). Third-party packages retain their own licenses; see [NOTICE](NOTICE.md).
