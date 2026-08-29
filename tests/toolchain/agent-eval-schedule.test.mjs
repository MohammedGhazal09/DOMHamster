import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const scorer = join(root, 'scripts', 'run-agent-evals.mjs');
const requiredSchedule = [
  ...Array.from({ length: 30 }, (_, index) => `EV-${String(index + 1).padStart(2, '0')}`),
  'EV-05',
  'EV-06',
  'EV-08',
  'EV-09',
  'EV-10',
  'EV-11',
  'EV-14',
  'EV-15',
  'EV-17',
  'EV-18',
  'EV-19',
  'EV-20',
  'EV-22',
  'EV-23',
  'EV-24',
  'EV-27',
  'EV-29',
  'EV-30',
  'EV-08',
  'EV-18',
];

function score(schedule) {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'domhamster-agent-evals-'));
  const resultsPath = join(fixtureRoot, 'results.json');
  writeFileSync(
    resultsPath,
    `${JSON.stringify({ trials: schedule.map((caseId) => ({ caseId, passed: true })) })}\n`,
  );
  try {
    return spawnSync(process.execPath, [scorer, '--results', resultsPath], {
      cwd: root,
      encoding: 'utf8',
    });
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

test('accepts the frozen 50-trial schedule', () => {
  const result = score(requiredSchedule);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"trials": 50/u);
});

test('rejects trials in the wrong order', () => {
  const wrongOrder = [...requiredSchedule];
  [wrongOrder[0], wrongOrder[1]] = [wrongOrder[1], wrongOrder[0]];

  const result = score(wrongOrder);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /DOMHAMSTER_EVAL_SCHEDULE/u);
});

test('rejects the wrong high-risk repeat distribution', () => {
  const wrongRepeats = [...requiredSchedule];
  wrongRepeats[30] = 'EV-06';

  const result = score(wrongRepeats);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /DOMHAMSTER_EVAL_SCHEDULE/u);
});
