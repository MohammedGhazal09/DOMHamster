import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  releaseGateCommands,
  resolveEvaluationResultsPath,
  runReleaseGate,
} from '../../scripts/run-release-gate.mjs';

function resultsFixture() {
  const root = mkdtempSync(join(tmpdir(), 'domhamster-release-gate-'));
  const path = join(root, '50-trials.json');
  writeFileSync(path, '{"trials":[]}\n');
  return { root, path };
}

test('builds the exact ordered release command sequence', () => {
  assert.deepEqual(releaseGateCommands('/tmp/50-trials.json'), [
    ['run', 'verify'],
    ['run', 'test:e2e'],
    ['run', 'verify:bundle'],
    ['run', 'verify:licenses'],
    ['audit', '--audit-level=high'],
    ['run', 'eval', '--', '--results', '/tmp/50-trials.json'],
    ['run', 'release:manifest'],
    ['run', 'release:verify'],
  ]);
});

test('requires an existing evaluation result file before any release command runs', () => {
  assert.throws(
    () => resolveEvaluationResultsPath([], {}, process.cwd()),
    /DOMHAMSTER_EVAL_RESULTS_REQUIRED/u,
  );
  assert.throws(
    () =>
      resolveEvaluationResultsPath(
        ['--eval-results', 'missing-results.json'],
        {},
        process.cwd(),
      ),
    /DOMHAMSTER_EVAL_RESULTS_NOT_FOUND/u,
  );
});

test('prefers the explicit CLI result path over the environment', () => {
  const first = resultsFixture();
  const second = resultsFixture();
  try {
    assert.equal(
      resolveEvaluationResultsPath(
        ['--eval-results', first.path],
        { DOMHAMSTER_EVAL_RESULTS: second.path },
        process.cwd(),
      ),
      first.path,
    );
  } finally {
    rmSync(first.root, { recursive: true, force: true });
    rmSync(second.root, { recursive: true, force: true });
  }
});

test('executes every release step sequentially with the validated result path', () => {
  const fixture = resultsFixture();
  const calls = [];
  try {
    const completed = runReleaseGate({
      argv: ['--eval-results', fixture.path],
      cwd: process.cwd(),
      env: {},
      execute(args) {
        calls.push([...args]);
      },
    });

    assert.equal(completed, 8);
    assert.deepEqual(calls, releaseGateCommands(fixture.path));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('stops immediately when one release command fails', () => {
  const fixture = resultsFixture();
  const calls = [];
  try {
    assert.throws(
      () =>
        runReleaseGate({
          argv: ['--eval-results', fixture.path],
          cwd: process.cwd(),
          env: {},
          execute(args) {
            calls.push([...args]);
            if (calls.length === 3) throw new Error('DOMHAMSTER_TEST_RELEASE_STEP_FAILED');
          },
        }),
      /DOMHAMSTER_TEST_RELEASE_STEP_FAILED/u,
    );
    assert.equal(calls.length, 3);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});
