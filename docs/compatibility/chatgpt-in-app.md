# ChatGPT in-app browser compatibility record

**Status:** Not yet executed against a public release candidate. This record must contain observed facts before release selection.

## Environment

| Field | Recorded value |
|---|---|
| Production URL | Record the exact public Netlify URL |
| Source commit | Record the deployed 40-character commit SHA |
| Release candidate | Record `rc.N` |
| ChatGPT app build | Record the visible desktop-app build |
| Selected model | Record the model used for the test |
| Account site-tools access | Confirm available or record blocker |
| UTC timestamp | Record ISO 8601 |
| Asia/Riyadh timestamp | Record ISO 8601 with offset |
| Tester | Mohammed Ghazal |

## Canonical acceptance sequence

1. Open the public URL in ChatGPT's built-in browser.
2. Confirm the site-tools indicator discovers exactly the READY tool set.
3. Run the canonical planning prompt from the application.
4. Confirm structured reads precede draft creation and no contact data is exposed.
5. Change R-105 to V-03 at 13:00 and lock it through the visible coordinator controls.
6. Ask the agent to repair the conflict without changing locked R-105.
7. Confirm only R-106 moves to V-05 at 13:00 and the draft becomes valid.
8. Ask the agent to prepare approval; verify the agent stops for the human decision.
9. Approve the exact visible version and confirm the commit tool appears for 120 seconds.
10. Ask the agent to commit once; verify the tool lifecycle changes to COMMITTED.
11. Request the fictional contact for R-101 only and confirm the audit event is recorded.
12. Reset and repeat once to verify determinism.

## Result ledger

| Check | Result | Evidence or discrepancy |
|---|---|---|
| READY discovery | Not run | Record observed tool names |
| Structured draft creation | Not run | Record tool sequence |
| Human edit and lock | Not run | Record visible version and state |
| Lock-preserving repair | Not run | Record R-105 and R-106 outcomes |
| Human approval boundary | Not run | Record review and exact version |
| One-shot commit | Not run | Record plan ID and lifecycle |
| Scoped contact access | Not run | Record requested IDs only; never paste contact values here |
| Audit | Not run | Record event type and sequence only |
| Console/network | Not run | Record any warning or unexpected request |
| Repeatability | Not run | Record second-run outcome |

A release candidate fails this gate if site tools are unavailable for the account/model, any required tool is missing, a human-only action is exposed as a tool, contact data appears before commit, or the canonical journey cannot be completed twice.
