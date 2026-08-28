# Architecture and trust boundaries

## System summary

DOMHamster is a static React and TypeScript single-page application with no login, backend, database, API key, analytics, telemetry, or third-party runtime API.

The primary command path is:

> **UI → serialized store → pure command reducer → deterministic validator → versioned persistence → updated UI and WebMCP lifecycle**

The browser-agent path is:

> **WebMCP contract → strict input validator → state-aware handler → serialized store → the same command reducer and selectors used by the UI**

WebMCP handlers never inspect or click presentation DOM. UI components never read `document.modelContext` or `localStorage` directly.

## Layers

| Layer                  | Responsibility                                                                                  | Must not do                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `src/domain`           | Types, fixture, validation, state classification, commands, approval, commit, and audit         | Read browser APIs or presentation DOM                        |
| `src/app/store.ts`     | Serialize commands, persist before publish, notify subscribers                                  | Reimplement domain rules                                     |
| `src/app/selectors.ts` | Construct privacy-bounded public views                                                          | Return private contacts before commit                        |
| `src/persistence`      | Read and write the versioned `localStorage` envelope and recover safely                         | Preserve pending approval across reload                      |
| `src/webmcp`           | Define tools, validate input, authorize state/version, execute handlers, reconcile registration | Scrape, query, or click UI DOM                               |
| `src/diagnostics`      | Return bounded capability, build, lifecycle, and safe-error evidence                            | Return prompts, full state, notes, contacts, or stack traces |
| `src/ui`               | Render the coordinator workspace and human-only controls                                        | Mutate domain objects directly or grant agent authority      |
| `src/main.tsx`         | Compose browser ports, persistence, store, handlers, registry, and React                        | Contain business rules                                       |

## State model

| State               | Meaning                                                     | Consequential boundary                                  |
| ------------------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| `READY`             | No draft exists                                             | Agent may create a complete draft                       |
| `DRAFT_INVALID`     | Draft contains one or more hard errors                      | Approval and commit are unavailable                     |
| `DRAFT_VALID`       | Draft has no hard errors                                    | Agent may prepare visible human review                  |
| `AWAITING_APPROVAL` | Exact version is displayed for a human decision             | Agent cannot approve or commit                          |
| `APPROVED`          | Human approved the exact version within a 120-second window | Agent may call one-shot commit                          |
| `COMMITTED`         | Immutable operational plan exists                           | Selected fictional contacts may be accessed and audited |

Any draft edit or lock change increments the version and invalidates prior authorization. Reload clears pending or approved authorization while preserving a recoverable draft.

## Data flow and privacy

Operational request records include identifiers, priority, zone, time window, duration, required skills and languages, and a bounded untrusted note. Fictional recipient alias, fictional location, and fictional contact channel are stored separately.

Before commit:

- selectors and tools return operational fields only;
- diagnostics exclude request notes and contacts;
- rendered UI contains no restricted contact value.

After commit:

- `access_dispatch_contacts` requires explicit, unique, assigned request IDs;
- only the requested fictional contact records are returned to the invoking client;
- the visible application records a non-sensitive `CONTACTS_ACCESSED` audit event rather than rendering contact values automatically.

## Trust boundaries

| Input or actor                         | Treatment                                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Browser agent arguments                | Untrusted; schema, state, version, identifier, lock, and domain validation apply                           |
| Request notes and contact instructions | Untrusted content; never interpreted as system instructions                                                |
| Human coordinator                      | Owns visible locks, approval decisions, cancellation, discard, and reset                                   |
| Browser persistence                    | Untrusted on read; schema, fixture identity, timestamps, audit types, and state invariants are revalidated |
| Build and deployment metadata          | Non-sensitive evidence only; no credential or environment secret is exposed                                |

## Failure behavior

- A rejected command does not persist or notify subscribers.
- A persistence failure preserves the previous visible state.
- A stale or locked agent mutation returns a stable error and leaves state unchanged.
- An unexpected handler failure returns `INTERNAL_ERROR` with an opaque reference, not a stack trace.
- Corrupted or incompatible storage resets to the canonical fixture with a bounded recovery notice.

## Deployment

Netlify builds `dist` from source with Node 24, applies a same-origin CSP and WebMCP permissions policy, serves immutable hashed assets, and marks HTML and release identity as no-store. No backend or runtime secret is required.
