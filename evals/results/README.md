# Agent evaluation results

Generated trial files are intentionally ignored by Git. For the focused scorer, run:

```bash
npm run eval -- --results /absolute/path/to/50-trials.json
```

For the complete release gate, run:

```bash
npm run verify:release -- --eval-results /absolute/path/to/50-trials.json
```

`DOMHAMSTER_EVAL_RESULTS` may be used instead of the command-line option. The complete gate validates that the path exists before it runs repository, browser, bundle, license, audit, evaluation, and release-manifest commands.

A valid result file contains exactly 50 records with `caseId`, boolean `passed`, and optional bounded `notes`. Every one of the 30 cases must appear at least once. The gate requires at least 45 passing trials overall and every trial mapped to a high-risk case to pass.
