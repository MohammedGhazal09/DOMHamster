# DOMHamster fidelity ledger

**Work package:** WP10 — responsive, accessible, and visual-fidelity hardening  
**Reference concepts:** `domhamster-primary-screen.png` and `domhamster-approval-state.png`  
**Reference viewport:** 1440 × 960  
**Implementation branch:** `implementation/wp10-hardening`

## Decision summary

DOMHamster retains the approved warm-neutral operations-desk visual language. WP10 does not redesign the product. It hardens the existing WP07–WP09 interface so that the same hierarchy and human-authority story remain usable with keyboard input, constrained viewports, reduced motion, forced colors, and modal workflows.

## Fidelity findings

| Priority | Area | Approved reference | WP10 implementation | Result |
|---:|---|---|---|---|
| P0 | Product hierarchy | Product, workflow state, WebMCP state, brief, metrics, then workspace | Named atomic status region keeps workflow and capability together without changing first-viewport order | Matched |
| P0 | Human authority | Lock and approval actions remain visibly human-only | Lock buttons keep `aria-pressed`; approval and confirmation dialogs expose only human decisions; no human commit control | Matched |
| P0 | Plan dominance | Assignment plan is the largest central workspace | Existing three-column desktop and plan-first narrow order are preserved | Matched |
| P0 | Responsive fit | 1024, 1280, and 1440 layouts must avoid page overflow | Local table scrolling, bounded panels, wrapping status/actions, and narrow full-screen approval sheet added | Implemented; browser captures pending provisioned run |
| P0 | Keyboard focus | Visible, logical focus with modal trapping and return | Existing focus trap retained; target scroll margins, local scroll focus, and 44-pixel controls added | Implemented |
| P0 | Status communication | State and severity use text, not color alone | Workflow/capability status is named and atomic; validation retains explicit `error`, `warning`, `BLOCKED`, and `PASS` text | Matched |
| P0 | Approval timing | Exact version and 120-second window are visible without noisy announcements | Countdown uses `role="timer"` with `aria-live="off"`; expiry remains enforced by the command layer | Improved |
| P0 | Modal progress | Consequential decisions cannot appear idle while executing | Approval and confirmation dialogs expose `aria-busy` and disable controls during dispatch | Improved |
| P1 | Touch target size | Primary controls target 44 pixels | Buttons, selects, time inputs, lock controls, and validation links use a 44-pixel minimum | Matched |
| P1 | Motion | Only restrained opacity/transform motion | Existing motion remains under `prefers-reduced-motion: no-preference`; reduced-motion removes transforms and smooth scrolling | Matched |
| P1 | Forced colors | Information survives system high-contrast modes | Structural borders and status-pill outlines added under `forced-colors` | Improved |
| P1 | Mascot treatment | Orientation only; no decorative competition with safety content | Existing single header mark and decorative empty-state mark retained | Matched |

## Intentional browser-native differences

| Difference | Reason |
|---|---|
| Native `<select>` and time inputs remain platform-rendered | Keyboard behavior, accessible naming, and reliability take precedence over pixel-identical custom controls |
| Wide assignment tables scroll inside their named region | Preserves complete operational data without creating page-level horizontal overflow |
| Approval becomes a full-height sheet below 640 pixels | Prevents clipped decisions and keeps every action reachable on narrow displays |
| System fonts and self-authored SVG remain unchanged | Avoids remote assets, font licensing, and runtime network dependencies |

## Verification status

The test contracts cover all six workflow states, modal semantics, keyboard focus, 44-pixel critical targets, and page-level overflow at 1024×720, 1280×720, and 1440×900. This environment does not contain the repository dependency tree or browser binaries, so dependency-backed Vitest and Playwright execution is not claimed here. WP11 must run these committed contracts in a fully provisioned Node 24 environment and attach the final screenshots before release selection.
