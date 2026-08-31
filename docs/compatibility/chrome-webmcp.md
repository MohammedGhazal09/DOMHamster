# Chrome WebMCP compatibility record

**Status:** Partially passed for `rc.6`. Native Chrome WebMCP lifecycle, tool-contract, privacy, reset, and three-run canonical evidence passed. Chrome 151 did not expose a visible WebMCP/model-context DevTools panel label, and a complete external-agent canonical journey has not yet been observed.

## Environment

| Field                   | Recorded value                                                                                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production URL          | `https://domhamster.netlify.app`                                                                                                                                |
| Source commit           | `2d1de951f4f0122bb252187c74ddd557011069aa`                                                                                                                      |
| Source tree             | `4a094cee974d7e9fef2bbd0e73fb388c974e9fc4`                                                                                                                      |
| Release candidate       | `rc.6`                                                                                                                                                          |
| Netlify deploy ID       | `6a94244d34f1b00008cec51a`                                                                                                                                      |
| Chrome version/build    | `151.0.7922.175`                                                                                                                                                |
| WebMCP enablement       | Chrome features `WebMCP`, `DevToolsWebMCPSupport`, and `WebMCPTesting`; native `document.modelContext` and CDP `WebMCP`, with no injected model-context harness |
| DevTools WebMCP panel   | Blocked: the real DevTools frontend was available, but no visible WebMCP/model-context panel label appeared in the top-panel overflow                           |
| Native QA client        | Playwright `1.62.1` controlling a clean visible Chrome profile                                                                                                  |
| Authentic READY smoke   | Codex Desktop `26.825.5331.0`, Codex CLI `0.151.0`, model `gpt-5.6-sol`, structured `@Chrome` attachment                                                        |
| Test window UTC         | `2026-08-30T12:56:51Z`–`2026-08-30T13:31:24Z`                                                                                                                   |
| Test window Asia/Riyadh | `2026-08-30T15:56:51+03:00`–`2026-08-30T16:31:24+03:00`                                                                                                         |
| Tester                  | Mohammed Ghazal                                                                                                                                                 |

## Native registration matrix

| State               | Expected count | Observed result                                               |
| ------------------- | -------------: | ------------------------------------------------------------- |
| `READY`             |              5 | Passed: exact READY set only                                  |
| `DRAFT_INVALID`     |              7 | Passed: exact invalid-draft set; approval preparation removed |
| `DRAFT_VALID`       |              8 | Passed: exact valid-draft set including approval preparation  |
| `AWAITING_APPROVAL` |              3 | Passed: draft, validation, and audit only                     |
| `APPROVED`          |              4 | Passed: exact-version commit available                        |
| `COMMITTED`         |              3 | Passed: committed plan, scoped contacts, and audit only       |

The matrix recorded 34 exact registration snapshots. Removed tools disappeared after transitions.

## Result ledger

| Check                               | Result      | Evidence or discrepancy                                                                                                   |
| ----------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| Native `document.modelContext`      | Passed      | Native production API and CDP transport; no injected harness                                                              |
| Six registration sets               | Passed      | Exact counts `5/7/8/3/4/3` in `native-webmcp-matrix.json`                                                                 |
| All 12 tools, valid input           | Passed      | `12/12` minimum-valid invocations                                                                                         |
| All 12 tools, invalid input         | Passed      | `12/12` safe structured errors without unintended mutation                                                                |
| Stale handler cleanup               | Passed      | Captured prepare handler and commit replay failed safely                                                                  |
| Approval expiry                     | Passed      | Real elapsed `120452 ms`; commit removed and state returned to `DRAFT_VALID`                                              |
| Privacy boundary                    | Passed      | Zero pre-commit leak across 172 checked surfaces; post-commit access was request-scoped and audited                       |
| Human authority                     | Passed      | `28/28`; edit, lock, unlock, approval, rejection, cancellation, discard, and reset remained UI-only                       |
| Response headers                    | Passed      | Required caching, security, and `Permissions-Policy: tools=(self)` behavior observed                                      |
| Console/network                     | Passed      | Zero console messages, zero page errors, 13 same-origin requests, zero failures, and zero telemetry                       |
| Three-run determinism               | Passed      | Native canonical journey `3/3`, including one-shot commit, scoped access, and deterministic reset                         |
| Authentic READY overview            | Passed      | Structured `@Chrome` Codex Desktop smoke discovered five READY tools and invoked `get_coordination_overview` exactly once |
| Complete external-agent journey     | **Not run** | Authentic trials currently cover reads and draft creation, not the complete human-agent lifecycle                         |
| Visible DevTools WebMCP panel label | **Blocked** | Chrome `151.0.7922.175` did not expose the label; native API/CDP functionality passed independently                       |

## Findings and evidence

- Native matrix: `W:\domhamster-release-evidence\chrome\rc6\native-webmcp-matrix.json` — `326/326`, three canonical journeys.
- Human-authority matrix: `W:\domhamster-release-evidence\chrome\rc6\native-human-authority.json` — `28/28`.
- Full report: `W:\domhamster-release-evidence\chrome\rc6\REPORT.md`.
- Authentic READY smoke: `W:\domhamster-release-evidence\chrome\rc6-authentic-chrome-ready-smoke.md`.

No critical, high, or medium Chrome finding is open. The unavailable visible DevTools panel label is a browser-owned low limitation. The missing complete external-agent journey remains a release gate and is not inferred from the native automation evidence.
