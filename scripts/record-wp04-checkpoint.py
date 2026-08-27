from pathlib import Path
import re

MASTER = Path('MASTERPLAN.md')
PLAN = Path('docs/superpowers/plans/2026-08-26-domhamster-implementation.md')
README = Path('README.md')
STATUS = Path('docs/execution/WP04_STATUS.md')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected one occurrence, found {count}')
    return text.replace(old, new, 1)


master = MASTER.read_text(encoding='utf-8')
master = replace_once(master, '> **Version:** 0.17.1', '> **Version:** 0.18.0', 'master version')
master = replace_once(
    master,
    '> **Checkpoint:** Phase 14 in progress; WP00–WP03 complete on public `main`; WP04 locally verified with exact-base RED/GREEN publication patches prepared',
    '> **Checkpoint:** Phase 14 in progress; WP00–WP04 complete on public `main`; WP05 WebMCP contracts next',
    'master checkpoint',
)
master = replace_once(
    master,
    '> **Last updated:** 2026-08-26 (Asia/Riyadh)',
    '> **Last updated:** 2026-08-27 (Asia/Riyadh)',
    'master date',
)
master = replace_once(
    master,
    '| 0.17.1 | Phase 14 — WP04 local store/persistence checkpoint and exact-base publication package | In progress — publication gate pending |',
    '| 0.17.1 | Phase 14 — WP04 local store/persistence checkpoint and exact-base publication package | Recorded |\n| 0.18.0 | Phase 14 — WP04 serialized store, privacy selectors, and resilient persistence | Passed |',
    'master ledger',
)

status_line = (
    '| Implementation status | Phase 14 is in progress on public `MohammedGhazal09/DOMHamster`. '
    'WP00 through WP04 are merged into `main` with preserved RED-before-GREEN evidence and successful exact-main CI. '
    'WP05 WebMCP contracts and schemas are the next authorized work package. UI, deployment, media, release, and submission remain incomplete. |'
)
master, count = re.subn(r'^\| Implementation status \|.*$', status_line, master, count=1, flags=re.MULTILINE)
if count != 1:
    raise RuntimeError(f'master implementation status: expected one line, found {count}')

marker = '## Execution checkpoint — v0.18.0'
if marker in master:
    raise RuntimeError('master checkpoint v0.18.0 already exists')
master = master.rstrip() + f"""

---

{marker}

Recorded: `2026-08-27` (`Asia/Riyadh`)

WP04 passed its public test-first and integration gates.

| Evidence | Verified result |
|---|---|
| Public branch | `implementation/wp04-store-persistence` |
| Pull request | `#22` |
| RED test-only head | `7f01dc1d915eb5ae3ead84064051790df62e664b` |
| RED workflow | `33024818082` with `DOMHAMSTER_WP04_EXPECTED_RED_CONFIRMED` |
| Final feature head | `3f8d5806b5076528649cf8d6a3c1d0badd5f571b` |
| Feature GREEN | `33026297884` |
| Feature CI | `33026297882` |
| RED-history check | `33026297883` |
| Merge commit | `4a740996ab5cc5d2c5bcabb8ef80068579f629bb` |
| Exact integrated-main CI | `33026459964` |
| Result | **WP04 passed; WP05 is next** |

### Locked WP04 outcomes

- Commands are reduced serially against the latest committed state.
- A candidate state is persisted before it becomes visible to subscribers.
- Rejected commands and failed persistence writes preserve the prior visible state.
- Privacy-bounded selectors construct outputs through explicit allowlists.
- Fictional contacts remain unavailable before commit and require explicit unique assigned request IDs afterward.
- Persistence uses the versioned `domhamster:v1` envelope and validates schema, fixture identity, timestamps, audit history, workflow shape, and assignment invariants.
- Pending or approved authorization is invalidated on reload and never survives as commit authority.

### Next authorized work

WP05 freezes the twelve WebMCP tool contracts, strict JSON Schemas, annotations, sanitized errors, privacy-bounded outputs, and exact state-specific tool sets before any runtime registration code is written.
"""
MASTER.write_text(master + '\n', encoding='utf-8')

plan = PLAN.read_text(encoding='utf-8')
plan = replace_once(
    plan,
    '**Spec:** `MASTERPLAN.md` (execution checkpoint 0.17.1; product contracts remain those approved in 0.12.0)',
    '**Spec:** `MASTERPLAN.md` (execution checkpoint 0.18.0; product contracts remain those approved in 0.12.0)',
    'implementation spec checkpoint',
)
plan = replace_once(
    plan,
    '## Execution status — checkpoint 0.17.1',
    '## Execution status — checkpoint 0.18.0',
    'implementation status heading',
)
plan = replace_once(
    plan,
    '| P0 | WP04 — store/selectors/persistence | **In progress** | Local RED `3523672`, GREEN `902c3d8`, 58-test regression, and exact-base RED/GREEN patch verification are complete; public branch and Node 24 CI remain required |',
    '| P0 | WP04 — store/selectors/persistence | **Complete** | RED `33024818082`; final feature GREEN `33026297884` and CI `33026297882`; merge `4a740996ab5cc5d2c5bcabb8ef80068579f629bb`; exact-main CI `33026459964` |',
    'implementation WP04 row',
)
plan = replace_once(
    plan,
    '| P0/P1 | WP05–WP13 | Not started | Later gates remain authoritative |',
    '| P0 | WP05 — WebMCP contracts and schemas | **Next** | Begin only from verified `main` after checkpoint 0.18.0 |\n| P0/P1 | WP06–WP13 | Not started | Later gates remain authoritative |',
    'implementation later work row',
)
PLAN.write_text(plan, encoding='utf-8')

readme = README.read_text(encoding='utf-8')
current_block = """## Current status

WP00 and WP01 are complete on `main`.

- WP00 established the pinned Node 24, React, Vite, Vitest, Playwright, ESLint, Prettier, and CI toolchain.
- WP01 added the deeply frozen fictional scenario with eight requests, five volunteers, separate private-contact placeholders, untrusted-note markers, and deterministic canonical hashing.
- WP02 is next: a pure deterministic assignment-validation engine, implemented test-first.

No deployment, release, or submission completion claim is made until all corresponding verification gates pass.
"""
new_block = """## Current status

WP00 through WP04 are complete on public `main` with preserved RED-before-GREEN evidence and successful exact-main CI.

- WP00 established the pinned Node 24, React, Vite, Vitest, Playwright, ESLint, Prettier, and CI toolchain.
- WP01 added the frozen fictional scenario and deterministic canonical hashing.
- WP02 added pure deterministic assignment validation.
- WP03 added the six-state workflow, human locks, exact-version approval, one-shot commit, and bounded audit history.
- WP04 added the serialized store, privacy-bounded selectors, and resilient versioned persistence.
- WP05 is next: freeze the twelve WebMCP tool contracts and strict JSON Schemas before runtime registration.

No deployment, release, or submission completion claim is made until all corresponding verification gates pass.
"""
readme = replace_once(readme, current_block, new_block, 'README status block')
readme = replace_once(
    readme,
    '- [WP00 execution status](docs/execution/WP00_STATUS.md)',
    '- [WP00 execution status](docs/execution/WP00_STATUS.md)\n- [WP04 execution status](docs/execution/WP04_STATUS.md)\n- [Master plan](MASTERPLAN.md)\n- [Implementation plan](docs/superpowers/plans/2026-08-26-domhamster-implementation.md)',
    'README project controls',
)
README.write_text(readme, encoding='utf-8')

STATUS.parent.mkdir(parents=True, exist_ok=True)
STATUS.write_text(
    """# WP04 Execution Status

**Work package:** WP04 — serialized store, privacy selectors, and resilient persistence  
**Result:** Complete  
**Recorded:** 2026-08-27 (`Asia/Riyadh`)

## Public evidence

| Gate | Evidence |
|---|---|
| RED test-only head | `7f01dc1d915eb5ae3ead84064051790df62e664b` |
| Expected RED workflow | `33024818082` |
| RED marker | `DOMHAMSTER_WP04_EXPECTED_RED_CONFIRMED` |
| Final feature head | `3f8d5806b5076528649cf8d6a3c1d0badd5f571b` |
| Feature GREEN | `33026297884` |
| Feature CI | `33026297882` |
| RED-history check | `33026297883` |
| Pull request | `#22` |
| Merge commit | `4a740996ab5cc5d2c5bcabb8ef80068579f629bb` |
| Exact integrated-main CI | `33026459964` |

## Completed contracts

- FIFO serialized command dispatch against the latest committed state.
- Persist-before-publish transaction ordering.
- Safe recovery after command and persistence failures.
- Privacy-bounded request, volunteer, draft, committed-plan, audit, and contact selectors.
- Explicit post-commit fictional contact access for unique assigned request IDs only.
- Versioned `domhamster:v1` persistence envelope with safe schema, fixture, timestamp, audit, and invariant recovery.
- Reload invalidation of pending and approved authorization.

WP05 is the next authorized work package.
""",
    encoding='utf-8',
)
