# Chrome WebMCP compatibility record

**Status:** Not yet executed against a public release candidate. This record must contain observed facts before release selection.

## Environment

| Field | Recorded value |
|---|---|
| Production URL | Record the exact public Netlify URL |
| Source commit | Record the deployed 40-character commit SHA |
| Release candidate | Record `rc.N` |
| Chrome version/build | Record the full version string |
| WebMCP enablement | Record origin-trial status or `chrome://flags/#enable-webmcp-testing` configuration |
| DevTools WebMCP panel | Confirm available or record blocker |
| Agent/client | Record the exact compatible client used |
| UTC timestamp | Record ISO 8601 |
| Asia/Riyadh timestamp | Record ISO 8601 with offset |
| Tester | Mohammed Ghazal |

## Native registration matrix

| State | Expected count | Expected names | Observed result |
|---|---:|---|---|
| READY | 5 | overview, requests, volunteers, create draft, audit | Not run |
| DRAFT_INVALID | 7 | read/validate/revise set without approval | Not run |
| DRAFT_VALID | 8 | invalid-state set plus prepare approval | Not run |
| AWAITING_APPROVAL | 3 | draft, validation, audit | Not run |
| APPROVED | 4 | draft, validation, commit, audit | Not run |
| COMMITTED | 3 | committed plan, contacts, audit | Not run |

## Required checks

- Inspect the Application → WebMCP pane for registration errors and invocation history.
- Invoke each tool manually once with minimum valid input and once with representative invalid input.
- Run the complete canonical human-agent journey through a compatible external agent.
- Verify removed tools disappear after every state transition and stale captured handlers fail safely.
- Confirm the deployment returns the required security, caching, and `Permissions-Policy: tools=(self)` headers.
- Confirm no unexpected cross-origin runtime request, console exception, or pre-commit restricted field.
- Reset and repeat the canonical journey three times.

## Result ledger

| Check | Result | Evidence or discrepancy |
|---|---|---|
| Native `document.modelContext` | Not run | Record capability result |
| Six registration sets | Not run | Record counts and names |
| Manual tool invocations | Not run | Record safe result/error codes |
| External-agent journey | Not run | Record tool sequence and final state |
| Stale handler cleanup | Not run | Record removal/replay result |
| Response headers | Not run | Record header values |
| Console/network | Not run | Record any discrepancy |
| Three-run determinism | Not run | Record all outcomes |

Any discrepancy in tool counts, state cleanup, lock preservation, approval, commit replay, privacy, or reset is release-blocking.
