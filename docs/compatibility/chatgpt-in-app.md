# ChatGPT in-app browser compatibility record

**Status:** **Not run / unavailable** for `rc.6`. This is not a pass.

## Environment

| Field                     | Recorded value                                                                    |
| ------------------------- | --------------------------------------------------------------------------------- |
| Production URL            | `https://domhamster.netlify.app`                                                  |
| Source commit             | `2d1de951f4f0122bb252187c74ddd557011069aa`                                        |
| Source tree               | `4a094cee974d7e9fef2bbd0e73fb388c974e9fc4`                                        |
| Release candidate         | `rc.6`                                                                            |
| ChatGPT app build         | Not observable because no ChatGPT in-app browser backend was available            |
| Selected model            | Not independently observed                                                        |
| Checked client            | Codex Desktop `26.825.5331.0`, Codex CLI `0.151.0`                                |
| Account site-tools access | Unavailable: `agent.browsers.get("iab")` returned `Browser is not available: iab` |
| UTC timestamp             | `2026-08-30T17:13:15.5973309Z`                                                    |
| Asia/Riyadh timestamp     | `2026-08-30T20:13:15.5973309+03:00`                                               |
| Tester                    | Mohammed Ghazal                                                                   |

## Observed blocker

The bundled browser plugin was installed and enabled, but the available browser inventory contained only the external Chrome-extension backend. There was no in-app browser backend, in-app tab, page-tool discovery surface, or callable in-app site tool. The exact selector returned:

```text
Browser is not available: iab
```

External Chrome evidence is not substituted for this gate. Exactly zero ChatGPT in-app canonical journeys were counted.

## Result ledger

| Check                     | Result                | Evidence or discrepancy                                             |
| ------------------------- | --------------------- | ------------------------------------------------------------------- |
| READY discovery           | **Not run / blocked** | In-app browser backend unavailable                                  |
| Structured draft creation | **Not run / blocked** | In-app browser backend unavailable                                  |
| Human edit and lock       | **Not run / blocked** | Journey could not start                                             |
| Lock-preserving repair    | **Not run / blocked** | Journey could not start                                             |
| Human approval boundary   | **Not run / blocked** | Journey could not start                                             |
| One-shot commit           | **Not run / blocked** | Journey could not start                                             |
| Scoped contact access     | **Not run / blocked** | Journey could not start; no contact value was requested or recorded |
| Audit                     | **Not run / blocked** | Journey could not start                                             |
| Console/network           | **Not run / blocked** | No in-app page session existed                                      |
| Repeatability             | **Not run / blocked** | `0/2` required journeys                                             |

Evidence: `W:\domhamster-release-evidence\chatgpt\rc6-in-app-post-repair-unavailable.md`.

This gate remains incomplete until an eligible ChatGPT account/build exposes the in-app browser and both canonical journeys are observed. The blocker does not justify a DOMHamster runtime change.
