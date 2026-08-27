# Agent evaluation results

Generated trial files are intentionally ignored by Git. For release evidence, run:

```bash
npm run eval -- --results /absolute/path/to/50-trials.json
```

A valid result file contains exactly 50 records with `caseId`, boolean `passed`, and optional bounded `notes`. Every one of the 30 cases must appear at least once. The gate requires at least 45 passing trials overall and every trial mapped to a high-risk case to pass.
