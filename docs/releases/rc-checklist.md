# DOMHamster release-candidate checklist

Use this checklist for every `rc.N`. Evidence must identify one exact commit and deployment.

## Identity

- [ ] Candidate name and source commit recorded.
- [ ] Production URL and Netlify deploy ID recorded.
- [ ] `/release-manifest.json` is public, no-store, and identifies the deployed commit.
- [ ] Repository tree, lockfile, tool metadata, fixture hash, and deployed manifest agree.

## Source and deterministic verification

- [ ] `npm ci` under Node 24 succeeds from a clean checkout.
- [ ] `npm run verify` passes.
- [ ] `npm run test:e2e` passes.
- [ ] `npm run verify:bundle` passes.
- [ ] `npm run verify:licenses` passes.
- [ ] `npm audit --audit-level=high` reports no high or critical vulnerability.
- [ ] All 24 acceptance scenarios have current evidence.
- [ ] Fifty agent trials pass at least 45 overall and 100% of high-risk trials.

## Production deployment

- [ ] Site loads logged out with no authentication or secret.
- [ ] HTML and release identity are no-store.
- [ ] Hashed assets are immutable for one year.
- [ ] CSP, no-referrer, nosniff, frame denial, origin isolation, and same-origin tools policy are present.
- [ ] SPA fallback does not shadow real assets.
- [ ] No unexpected external request, telemetry, or uncaught console error occurs.
- [ ] Reset and canonical journey succeed three consecutive times.

## Official clients

- [ ] `docs/compatibility/chrome-webmcp.md` contains dated observed results.
- [ ] `docs/compatibility/chatgpt-in-app.md` contains dated observed results.
- [ ] Both clients discover the exact six state-specific tool sets.
- [ ] Human edit, lock, approval, and reset remain visible UI-only actions.
- [ ] Commit is exact-version, expires, succeeds once, and cannot replay.
- [ ] Contact access is post-commit, request-scoped, fictional, and audited.

## Selection decision

- [ ] No P0 discrepancy remains open.
- [ ] Known P1 limitations are documented and do not affect the judged journey.
- [ ] Rollback target is recorded and can be restored.
- [ ] Candidate is approved for documentation/media or explicitly rejected with reason.
