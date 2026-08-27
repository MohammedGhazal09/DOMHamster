import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function argumentValue(argv, name) {
  const directIndex = argv.indexOf(name);
  if (directIndex >= 0) {
    const value = argv[directIndex + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error('DOMHAMSTER_EVAL_RESULTS_VALUE_REQUIRED');
    }
    return value;
  }

  const prefix = `${name}=`;
  const inline = argv.find((value) => value.startsWith(prefix));
  return inline?.slice(prefix.length);
}

export function resolveEvaluationResultsPath(
  argv = process.argv.slice(2),
  env = process.env,
  cwd = process.cwd(),
) {
  const configured = argumentValue(argv, '--eval-results') ?? env.DOMHAMSTER_EVAL_RESULTS;
  if (configured === undefined || configured.trim() === '') {
    throw new Error(
      'DOMHAMSTER_EVAL_RESULTS_REQUIRED: use --eval-results <50-trials.json> or DOMHAMSTER_EVAL_RESULTS',
    );
  }

  const resultsPath = resolve(cwd, configured);
  if (!existsSync(resultsPath)) {
    throw new Error(`DOMHAMSTER_EVAL_RESULTS_NOT_FOUND:${resultsPath}`);
  }

  let isFile = false;
  try {
    isFile = statSync(resultsPath).isFile();
  } catch {
    isFile = false;
  }
  if (!isFile) throw new Error(`DOMHAMSTER_EVAL_RESULTS_NOT_FILE:${resultsPath}`);
  return resultsPath;
}

export function releaseGateCommands(evaluationResultsPath) {
  return [
    ['run', 'verify'],
    ['run', 'test:e2e'],
    ['run', 'verify:bundle'],
    ['run', 'verify:licenses'],
    ['audit', '--audit-level=high'],
    ['run', 'eval', '--', '--results', evaluationResultsPath],
    ['run', 'release:manifest'],
    ['run', 'release:verify'],
  ];
}

function npmExecutable(env) {
  if (env.DOMHAMSTER_NPM_EXECUTABLE !== undefined) {
    return env.DOMHAMSTER_NPM_EXECUTABLE;
  }
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function executeNpm(args, { cwd, env }) {
  execFileSync(npmExecutable(env), args, {
    cwd,
    env,
    stdio: 'inherit',
  });
}

export function runReleaseGate(options = {}) {
  const argv = options.argv ?? process.argv.slice(2);
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const execute = options.execute ?? ((args) => executeNpm(args, { cwd, env }));
  const evaluationResultsPath = resolveEvaluationResultsPath(argv, env, cwd);
  const commands = releaseGateCommands(evaluationResultsPath);

  for (const args of commands) execute(args);
  return commands.length;
}

const entryPath = process.argv[1] === undefined ? null : pathToFileURL(resolve(process.argv[1])).href;
if (entryPath === import.meta.url) {
  try {
    const completed = runReleaseGate();
    console.log(`DOMHAMSTER_RELEASE_GATE_PASS steps=${completed}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'DOMHAMSTER_RELEASE_GATE_FAILED';
    console.error(message);
    process.exitCode = 1;
  }
}
