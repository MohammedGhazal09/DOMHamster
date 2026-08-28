import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
const casesDocument = JSON.parse(readFileSync('evals/cases.json', 'utf8'));
assert.equal(casesDocument.version, 1, 'DOMHAMSTER_EVAL_CASE_VERSION');
assert.equal(casesDocument.cases.length, 30, 'DOMHAMSTER_EVAL_CASE_COUNT');
const cases = new Map(casesDocument.cases.map((entry) => [entry.id, entry]));
assert.equal(cases.size, 30, 'DOMHAMSTER_EVAL_CASE_IDS');
for (const entry of cases.values()) {
  assert.match(entry.id, /^EV-[0-9]{2}$/u);
  assert.ok(
    [
      'READY',
      'DRAFT_INVALID',
      'DRAFT_VALID',
      'AWAITING_APPROVAL',
      'APPROVED',
      'COMMITTED',
    ].includes(entry.state),
  );
  assert.ok(['standard', 'high'].includes(entry.risk));
  assert.ok(
    typeof entry.prompt === 'string' && entry.prompt.length > 4 && entry.prompt.length <= 500,
  );
  assert.ok(Array.isArray(entry.expectedTools));
  assert.ok(Array.isArray(entry.forbiddenTools));
  assert.equal(new Set(entry.expectedTools).size, entry.expectedTools.length);
  assert.equal(new Set(entry.forbiddenTools).size, entry.forbiddenTools.length);
}
if (process.argv.includes('--validate-cases')) {
  console.log(`DOMHAMSTER_EVAL_CASES_PASS cases=${cases.size}`);
  process.exit(0);
}
const resultsPath = argument('--results') ?? process.env.DOMHAMSTER_EVAL_RESULTS;
if (resultsPath === undefined)
  throw new Error('DOMHAMSTER_EVAL_RESULTS_REQUIRED: use --results <50-trials.json>');
const resultsDocument = JSON.parse(readFileSync(resultsPath, 'utf8'));
const trials = Array.isArray(resultsDocument) ? resultsDocument : resultsDocument.trials;
assert.ok(Array.isArray(trials), 'DOMHAMSTER_EVAL_TRIAL_ARRAY_REQUIRED');
assert.equal(
  trials.length,
  casesDocument.thresholds.requiredTrials,
  'DOMHAMSTER_EVAL_REQUIRES_50_TRIALS',
);
const coverage = new Set();
let passed = 0;
let highRiskTrials = 0;
let highRiskPassed = 0;
for (const [index, trial] of trials.entries()) {
  assert.ok(trial !== null && typeof trial === 'object', `TRIAL_OBJECT:${index}`);
  const definition = cases.get(trial.caseId);
  assert.ok(definition !== undefined, `TRIAL_UNKNOWN_CASE:${index}:${trial.caseId}`);
  assert.equal(typeof trial.passed, 'boolean', `TRIAL_BOOLEAN:${index}`);
  if (trial.notes !== undefined)
    assert.ok(typeof trial.notes === 'string' && trial.notes.length <= 400, `TRIAL_NOTES:${index}`);
  coverage.add(trial.caseId);
  if (trial.passed) passed += 1;
  if (definition.risk === 'high') {
    highRiskTrials += 1;
    if (trial.passed) highRiskPassed += 1;
  }
}
assert.equal(coverage.size, cases.size, 'DOMHAMSTER_EVAL_REQUIRES_ALL_CASES');
assert.ok(
  passed >= casesDocument.thresholds.minimumPassedTrials,
  `DOMHAMSTER_EVAL_OVERALL:${passed}`,
);
assert.ok(highRiskTrials > 0, 'DOMHAMSTER_EVAL_HIGH_RISK_MISSING');
assert.equal(
  highRiskPassed,
  highRiskTrials,
  `DOMHAMSTER_EVAL_HIGH_RISK:${highRiskPassed}/${highRiskTrials}`,
);
console.log(
  JSON.stringify(
    {
      cases: cases.size,
      trials: trials.length,
      passed,
      failed: trials.length - passed,
      highRiskTrials,
      highRiskPassed,
      overallPassRate: passed / trials.length,
    },
    null,
    2,
  ),
);
