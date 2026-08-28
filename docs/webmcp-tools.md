# WebMCP tools and lifecycle

DOMHamster publishes twelve imperative, task-specific WebMCP tools. Contracts are static; handlers authorize the current application state and draft version before reading or mutating the shared store.

## Tool inventory

| Tool                        | Mode                              | Purpose                                                                       |
| --------------------------- | --------------------------------- | ----------------------------------------------------------------------------- |
| `get_coordination_overview` | Read-only                         | Return workflow state, scenario date, counts, and active policy               |
| `list_open_requests`        | Read-only, untrusted content      | List privacy-minimized operational request fields                             |
| `list_available_volunteers` | Read-only                         | List volunteer capabilities, availability, limits, and current workload       |
| `create_assignment_draft`   | State-changing                    | Account for every request by assigning it or explicitly leaving it unassigned |
| `get_assignment_draft`      | Read-only                         | Return current version, assignments, human locks, issues, and approval status |
| `validate_assignment_draft` | Read-only                         | Re-run deterministic validation for the expected current version              |
| `revise_assignment_draft`   | State-changing                    | Change only unlocked requests in the expected current version                 |
| `prepare_plan_approval`     | State-changing                    | Open visible human review for a valid exact version; never approve or commit  |
| `commit_assignment_plan`    | Consequential                     | Commit the exact human-approved version once before authorization expires     |
| `get_committed_plan`        | Read-only                         | Return the immutable plan without contacts                                    |
| `access_dispatch_contacts`  | State-changing, untrusted content | Return selected fictional contacts after commit and audit the access          |
| `get_audit_history`         | Read-only, untrusted content      | Return bounded immutable event history                                        |

Every input schema is a closed object with `additionalProperties: false`. IDs, enums, strings, arrays, version numbers, and cross-field request accounting are validated before a handler runs.

## State lifecycle

| State             | Tool count | Registered tools                                                                                                                                                                                             |
| ----------------- | ---------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| READY             |          5 | `get_coordination_overview`, `list_open_requests`, `list_available_volunteers`, `create_assignment_draft`, `get_audit_history`                                                                               |
| DRAFT_INVALID     |          7 | `get_coordination_overview`, `list_open_requests`, `list_available_volunteers`, `get_assignment_draft`, `validate_assignment_draft`, `revise_assignment_draft`, `get_audit_history`                          |
| DRAFT_VALID       |          8 | `get_coordination_overview`, `list_open_requests`, `list_available_volunteers`, `get_assignment_draft`, `validate_assignment_draft`, `revise_assignment_draft`, `prepare_plan_approval`, `get_audit_history` |
| AWAITING_APPROVAL |          3 | `get_assignment_draft`, `validate_assignment_draft`, `get_audit_history`                                                                                                                                     |
| APPROVED          |          4 | `get_assignment_draft`, `validate_assignment_draft`, `commit_assignment_plan`, `get_audit_history`                                                                                                           |
| COMMITTED         |          3 | `get_committed_plan`, `access_dispatch_contacts`, `get_audit_history`                                                                                                                                        |

The registry subscribes to the application store, computes the desired set, aborts removed registrations, and serializes reconciliation so stale generations cannot restore obsolete tools.

## Human-only actions

The following operations deliberately have no WebMCP tool:

- lock assignment;
- unlock assignment;
- approve;
- reject;
- cancel approval;
- discard draft; and
- reset demonstration.

The agent can prepare a review, but only the visible human interface can decide it. `commit_assignment_plan` does not appear until the exact draft version is approved.

## Canonical sequence

1. In `READY`, read overview, requests, and volunteers.
2. Create complete draft `v1`.
3. Human moves `R-105` to `V-03` at `13:00`, producing `v2`.
4. Human locks `R-105`, producing `v3` and revealing the overlap with `R-106`.
5. Agent validates and revises only `R-106` to `V-05` at `13:00`, producing valid `v4`.
6. Agent prepares approval and stops.
7. Human approves `v4`.
8. Agent commits `v4` once.
9. After commit, request only the selected fictional contacts required for dispatch.

## Error and privacy model

Handlers return stable errors for invalid input, invalid state, stale versions, unknown identifiers, human-lock violations, expired approval, replay, and unavailable contact access. Unexpected failures are sanitized. No tool returns a raw stack trace, browser storage, complete application state, or pre-commit contact data.
