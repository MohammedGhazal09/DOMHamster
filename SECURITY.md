# Security policy

## Supported scope

DOMHamster is a static, client-side hackathon demonstration using fictional non-emergency coordination data. The supported security scope is the latest documented release candidate and, after selection, the exact `v1.0.0` judged release.

No development branch should be treated as production-ready until the [release-candidate checklist](docs/releases/rc-checklist.md) is complete.

## Report a vulnerability

Report a suspected vulnerability privately to the repository owner, Mohammed Ghazal, through GitHub’s private vulnerability-reporting or security-advisory surface when available. Do not publish contact values, exploit details, or unrelated user information in a public issue.

Include:

- the affected commit or release;
- browser and client version;
- clear reproduction steps;
- expected versus observed behavior; and
- whether the issue affects lock authority, approval, commit, contact access, persistence, or tool registration.

## Security boundaries

| Boundary | Enforced behavior |
|---|---|
| Data | All recipients, locations, channels, requests, and volunteers are fictional |
| Agent authority | No WebMCP tool can lock, unlock, approve, reject, cancel, discard, or reset |
| Draft mutation | Stale versions and attempts to change human locks are rejected |
| Commit | Requires the exact human-approved version, expires after 120 seconds, revalidates, and succeeds once |
| Contact access | Exists only after commit, requires explicit assigned request IDs, and records an audit event |
| Tool input | Strict schemas reject undeclared or malformed fields |
| Tool output | Errors are sanitized and pre-commit results exclude restricted contact fields |
| Runtime | No analytics, telemetry, backend, API key, account system, or external runtime service |

## Known limitations

A static browser application cannot safely hold real organizational secrets or enforce server-side authorization against a person who controls the device. DOMHamster therefore must not process real personal information, emergency requests, regulated data, or safety-critical dispatch. A production adaptation requires authenticated server-side storage, role-based authorization, consent, retention controls, and independent security review.

## Release policy

A security claim becomes release evidence only after it is reproduced against the exact source commit and deployed build. The repository tag, release manifest, public deployment, screenshots, video, and submission must identify one immutable release.
