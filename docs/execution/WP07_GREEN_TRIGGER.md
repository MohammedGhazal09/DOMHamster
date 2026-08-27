# WP07 GREEN verification trigger

The required missing-shell RED result was confirmed in workflow run `33032965244` at test-first commit `9d8279a2d04195139835076c1de9a5976774b876`.

The approved visual concepts and design system were committed before production UI code. The judge-facing components, responsive styling, and READY-state Playwright contract were then added; the one-time integration workflow formatted the complete change and removed itself in commit `a61bdbe2bfd586da3ded25249421e5de1be2f1df`.

The first trusted GREEN run reached the formatting gate and identified only `docs/design/design-system.md`. The one-time formatter corrected that file and removed itself in commit `35e5cbce9053b3046ef136e19f58de1b2f5d8ece`.

The next trusted runs exposed contract-name mismatches between the new UI and the existing selector types, followed by one test tuple inference issue. The prompt, metrics, volunteer load, and draft summary now use the exact public selector contracts, and bot commit `bc2a5348e52b3f6777c28c3612b823319dffc9c2` applied the isolated tuple-typing correction before removing its one-time workflow.

This owner-authored commit requests the complete WP07 GREEN gate under Node 24.19.0: formatting, strict lint, type checking, all Vitest tests, production build, the full Chromium Playwright suite, dependency audit, and recorded RED-history verification.
