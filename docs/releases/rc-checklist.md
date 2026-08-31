# DOMHamster release-candidate checklist

This checklist records rc.6. Evidence identifies application SHA `2d1de951f4f0122bb252187c74ddd557011069aa` and Netlify deploy `6a94244d34f1b00008cec51a`.

## Identity

- [x] Candidate name and source commit recorded.
- [x] Production URL and Netlify deploy ID recorded.
- [x] `/release-manifest.json` is public, no-store, and identifies the deployed commit.
- [x] Repository tree, lockfile, tool metadata, fixture hash, and deployed manifest agree.

## Source and deterministic verification

- [x] `npm ci` under Node 24 succeeds from a clean checkout.
- [x] `npm run verify` passes.
- [x] `npm run test:e2e` passes.
- [x] `npm run verify:bundle` passes.
- [x] `npm run verify:licenses` passes.
- [x] `npm audit --audit-level=high` reports no high or critical vulnerability.
- [ ] All 24 acceptance scenarios have current evidence.
- [ ] Fifty agent trials pass at least 45 overall and 100% of high-risk trials.

## Production deployment

- [x] Site loads logged out with no authentication or secret.
- [x] HTML and release identity are no-store.
- [x] Hashed assets are immutable for one year.
- [x] CSP, no-referrer, nosniff, frame denial, origin isolation, and same-origin tools policy are present.
- [x] SPA fallback does not shadow real assets.
- [x] No unexpected external request, telemetry, or uncaught console error occurs.
- [x] Reset and canonical journey succeed three consecutive times.

## Official clients

- [x] `docs/compatibility/chrome-webmcp.md` contains dated observed results.
- [x] `docs/compatibility/chatgpt-in-app.md` contains dated observed results.
- [ ] Both clients discover the exact six state-specific tool sets.
- [x] Human edit, lock, approval, and reset remain visible UI-only actions.
- [x] Commit is exact-version, expires, succeeds once, and cannot replay.
- [x] Contact access is post-commit, request-scoped, fictional, and audited.

## Selection decision

- [ ] No P0 discrepancy remains open.
- [x] Known P1 limitations are documented and do not affect the judged journey.
- [x] Rollback target is recorded and can be restored.
- [x] Candidate is approved for documentation/media and deadline-directed submission; this does not pass the unchecked strict release gates.

## Deadline-control decision

The entrant stopped T-005 through T-050 on 2026-09-01. The final authentic evaluation record is `4/50` executed: `2` passed, `2` failed, `46` skipped, and zero high-risk trials completed. ChatGPT in-app remained unavailable, and AC-021 therefore remains pending. Devpost publication is deadline-directed, not a claim that every internal release gate passed.
