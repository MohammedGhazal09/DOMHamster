# DOMHamster Design System

**Status:** Approved visual baseline for WP07–WP10  
**Decision date:** 2026-08-27 (Asia/Riyadh)  
**Approval authority:** Delegated product and implementation decision  
**Reference viewport:** 1440 × 960

## Design intent

DOMHamster uses a restrained operations-desk visual language. The interface must explain the product and WebMCP collaboration within the first viewport, keep the assignment plan visually dominant, make human authority obvious, and reserve the hamster mark for orientation rather than decoration.

The two frozen references are:

- `docs/design/domhamster-primary-screen.png`
- `docs/design/domhamster-approval-state.png`

Production UI must preserve their hierarchy, copy, component geometry, and visual tone. Browser-native controls and semantic HTML take precedence over pixel-perfect imitation when the two conflict.

## Tokens

| Token                     | Value     | Usage                                   |
| ------------------------- | --------- | --------------------------------------- |
| `--color-canvas`          | `#F7F5F0` | Page background                         |
| `--color-surface`         | `#FFFFFF` | Panels, dialogs, controls               |
| `--color-surface-soft`    | `#F0EEE8` | Prompt, tool list, neutral summaries    |
| `--color-text`            | `#17212B` | Primary text                            |
| `--color-text-muted`      | `#53606D` | Supporting text                         |
| `--color-brand`           | `#6B3F24` | Logo and primary non-destructive action |
| `--color-agent`           | `#A95E00` | Agent and review cues                   |
| `--color-success`         | `#146C43` | Valid and connected states              |
| `--color-success-surface` | `#EAF7EF` | Valid and connected surfaces            |
| `--color-warning`         | `#8A4B08` | Non-blocking warnings                   |
| `--color-warning-surface` | `#FFF4E5` | Warning surfaces                        |
| `--color-danger`          | `#A1241B` | Blocking errors and destructive actions |
| `--color-danger-surface`  | `#FDEDEC` | Error surfaces                          |
| `--color-focus`           | `#174EA6` | Keyboard focus ring                     |
| `--color-border`          | `#D9D5CC` | Standard boundaries                     |
| `--color-border-strong`   | `#B9B3A8` | Dialog and selected boundaries          |

## Typography

Use only the local system stack:

```css
font-family:
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  'Segoe UI',
  sans-serif;
```

IDs, versions, tool names, timestamps, and issue codes use:

```css
font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
```

| Role                 | Size / line height | Weight |
| -------------------- | ------------------ | ------ |
| Product name         | `1.5rem / 1`       | 750    |
| Product headline     | `1.3125rem / 1.25` | 750    |
| Panel heading        | `1rem / 1.3`       | 700    |
| Dialog heading       | `1.5625rem / 1.25` | 750    |
| Body                 | `0.875rem / 1.5`   | 400    |
| Supporting           | `0.75rem / 1.45`   | 400    |
| Label                | `0.6875rem / 1.3`  | 650    |
| Monospace identifier | `0.75rem / 1.35`   | 500    |

## Spacing, geometry, and boundaries

- Base spacing unit: `4px`.
- Standard gaps: `8px`, `12px`, `16px`, `24px`, `32px`.
- Panel radius: `12px`; cards: `10px`; controls: `8px`; dialogs: `14px`.
- Standard panel border: `1px solid #D9D5CC`.
- Raised header/dialog shadow: subtle opaque shadow only; no glass or transparency effects.
- Primary control minimum height: `44px`; compact secondary controls may use `40px` while maintaining target spacing.
- Keyboard focus: `3px solid #174EA6` with `2px` offset; never remove focus without replacement.

## Layout

| Viewport      | Frozen rule                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------- |
| `>=1280px`    | Three columns: `minmax(270px, .9fr) minmax(500px, 1.65fr) minmax(250px, .8fr)` with `16px` gaps    |
| `1024–1279px` | Requests at `280px`, plan takes remaining width, volunteers move to a labeled drawer; metrics wrap |
| `768–1023px`  | Single task order: state/metrics, plan, validation, requests, volunteers                           |
| `<768px`      | Functional stacked fallback; full-screen approval sheet; table may scroll horizontally             |

At 1280 × 720 the header, compact judge brief, metrics, three workspace columns, and the top of the validation area remain visible at browser zoom 100%.

## Component families

| Family           | Contract                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| Header           | Hamster mark, product name/subtitle, workflow-state chip, WebMCP status, scenario date, Activity, Diagnostics, Reset |
| Judge brief      | Exact headline, explanation, fictional/non-emergency disclaimer, canonical prompt, Copy button                       |
| Metrics          | Open requests, available volunteers, assigned, unassigned, hard errors, warnings; no filler metrics                  |
| Workspace panels | Requests, assignment plan, volunteers; bounded panel headings and readable independent regions                       |
| Empty state      | “No assignment draft yet,” agent instruction, tool count, Copy prompt, restrained repeated mascot                    |
| Tool evidence    | Exact current tool names and read/write labels in monospace                                                          |
| Safety evidence  | Plain-language human-authority statement; no mascot inside safety copy                                               |
| Approval dialog  | Exact version, consequence text, assignment review, locks, warnings, least-destructive action first                  |

## Copy lock

- Headline: **Coordinate the day. Let the agent draft. Keep the human in charge.**
- Explanation: “DOMHamster turns a live coordination board into structured WebMCP tools so an agent can build and repair a plan while a coordinator controls locks and approval.”
- Disclaimer: “Fictional demo data only. DOMHamster is for non-emergency coordination and is not an emergency-dispatch system.”
- Canonical prompt: “Build today’s plan. Prioritize urgent food deliveries, keep every volunteer at three tasks or fewer, and make sure R-104 has an Arabic-speaking volunteer.”
- READY state: “No assignment draft yet. Ask your browser agent to use DOMHamster’s WebMCP tools, or copy the demo prompt above.”
- Unsupported state: “WebMCP tools are unavailable in this browser. The coordinator interface still works; open the site in ChatGPT’s in-app browser or Chrome with WebMCP testing enabled.”

## Accessibility and motion

- One `h1`; logical `h2` panel headings; semantic `header`, `main`, `aside`, and `nav` landmarks.
- Status and severity always use text in addition to color or shape.
- No drag, hover-only action, right-click action, or hidden gesture.
- Reduced motion removes nonessential transitions.
- Default transition duration is `150ms`, limited to opacity and transform.
- Mascot logo has an accessible name; repeated mascot art is hidden from assistive technology.
- Dialog background is inert, focus is trapped, Escape cancels where safe, and focus returns to the logical trigger.

## Fidelity gate

A WP07 implementation passes only when 1440 × 960 and 1280 × 720 browser captures preserve:

1. exact critical copy;
2. first-viewport product, state, WebMCP, and next-action comprehension;
3. plan-column dominance;
4. restrained warm-neutral palette;
5. system/monospace typography roles;
6. panel and control geometry;
7. human-authority evidence;
8. no restricted contact fields; and
9. no material clipping or page-level horizontal overflow.
