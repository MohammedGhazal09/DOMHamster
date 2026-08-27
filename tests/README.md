# DOMHamster verification traceability

This index maps the 24 frozen acceptance scenarios to committed executable evidence. Release selection still requires the commands below to pass against one exact source commit and deployed build.

| ID | Scenario | Primary evidence |
|---|---|---|
| AC-001 | Canonical load | `tests/domain/seed.test.ts`, `tests/e2e/ready.spec.ts` |
| AC-002 | Safe persistence migration | `tests/persistence/local-storage.test.ts` |
| AC-003 | Minimized request discovery | `tests/app/selectors.test.ts`, `tests/webmcp/handlers.test.ts` |
| AC-004 | Complete draft creation | `tests/domain/commands.test.ts`, `tests/webmcp/handlers.test.ts`, `tests/e2e/canonical.spec.ts` |
| AC-005 | Incomplete draft rejection | `tests/domain/commands.test.ts`, `tests/webmcp/handlers.test.ts` |
| AC-006 | Hard-conflict classification | `tests/domain/validation.test.ts` |
| AC-007 | Warnings do not block | `tests/domain/validation.test.ts`, `tests/webmcp/lifecycle.test.ts` |
| AC-008 | Human-created visible conflict | `tests/ui/assignment-editor.test.tsx`, `tests/e2e/canonical.spec.ts` |
| AC-009 | Human lock | `tests/ui/assignment-editor.test.tsx`, `tests/e2e/keyboard.spec.ts` |
| AC-010 | Locked revision rejected | `tests/domain/commands.test.ts`, `tests/webmcp/handlers.test.ts`, `tests/security/human-authority.test.ts` |
| AC-011 | Stale revision rejected | `tests/domain/commands.test.ts`, `tests/webmcp/handlers.test.ts` |
| AC-012 | Successful replan | `tests/webmcp/handlers.test.ts`, `tests/e2e/canonical.spec.ts` |
| AC-013 | Invalid approval preparation | `tests/webmcp/handlers.test.ts`, `tests/security/human-authority.test.ts` |
| AC-014 | Visible approval review | `tests/ui/approval-dialog.test.tsx`, `tests/e2e/approval-commit-contact.spec.ts` |
| AC-015 | Human rejection | `tests/domain/approval.test.ts`, `tests/e2e/reload-expiry-reset.spec.ts` |
| AC-016 | Human approval binding | `tests/domain/approval.test.ts`, `tests/webmcp/lifecycle.test.ts` |
| AC-017 | Approval expiry | `tests/domain/approval.test.ts`, `tests/e2e/reload-expiry-reset.spec.ts` |
| AC-018 | Commit exactly once | `tests/domain/commands.test.ts`, `tests/webmcp/handlers.test.ts`, `tests/e2e/tool-lifecycle.spec.ts` |
| AC-019 | Pre-commit contacts unavailable | `tests/webmcp/lifecycle.test.ts`, `tests/security/privacy-boundary.test.ts` |
| AC-020 | Post-commit minimum contacts | `tests/app/selectors.test.ts`, `tests/webmcp/handlers.test.ts`, `tests/e2e/approval-commit-contact.spec.ts` |
| AC-021 | Untrusted note containment | `tests/security/prompt-injection.test.ts`, `evals/cases.json` |
| AC-022 | Unsupported WebMCP fallback | `tests/webmcp/capability.test.ts`, `tests/e2e/ready.spec.ts` |
| AC-023 | Audit chronology | `tests/domain/audit.test.ts`, `tests/app/store.test.ts` |
| AC-024 | Deterministic reset from committed | `tests/e2e/reload-expiry-reset.spec.ts`, `tests/e2e/tool-lifecycle.spec.ts` |

## Release gates

| Gate | Command | Passing condition |
|---|---|---|
| Unit/integration/component | `npm run test:run` | All suites pass |
| Accessibility contracts | `npm run test:accessibility` | No critical semantic contract failures |
| Security contracts | `npm run test:security` | Authority, privacy, and injection boundaries pass |
| Browser journeys | `npm run test:e2e` | Canonical, lifecycle, keyboard, responsive, reload, and privacy journeys pass |
| Evidence traceability | `npm run verify:traceability` | Every referenced test/eval path exists and no planned-only evidence remains |
| Tool metadata | `npm run verify:metadata` | 12 exact contracts and 5/7/8/3/4/3 lifecycle counts |
| Source safety | `npm run verify:safety` | No secrets, network clients, telemetry, unsafe logging, or DOM business logic |
| Bundle | `npm run verify:bundle` | Built JS/CSS gzip total is at most 300 KiB |
| Licenses | `npm run verify:licenses` | Dependency license expressions use the approved permissive set |
| Agent evaluations | `npm run eval -- --results <file>` | At least 45/50 overall and 100% high-risk trials |
| Release identity | `npm run release:manifest && npm run release:verify` | Commit, fixture, tools, lockfile, and artifact hashes agree |
