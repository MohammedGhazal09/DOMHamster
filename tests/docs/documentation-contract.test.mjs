import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const root = process.env.DOMHAMSTER_ROOT ?? process.cwd();
const requiredFiles = Object.freeze([
  'README.md',
  'SECURITY.md',
  'CHANGELOG.md',
  'NOTICE.md',
  'LICENSE',
  'package.json',
  'docs/architecture.md',
  'docs/webmcp-tools.md',
  'docs/testing.md',
  'docs/submission.md',
  'docs/ai-use.md',
]);

for (const path of requiredFiles) {
  assert.equal(existsSync(join(root, path)), true, `WP13_REQUIRED_FILE_MISSING:${path}`);
}

const read = (path) => readFileSync(join(root, path), 'utf8');
const readme = read('README.md');
const architecture = read('docs/architecture.md');
const tools = read('docs/webmcp-tools.md');
const testing = read('docs/testing.md');
const submission = read('docs/submission.md');
const aiUse = read('docs/ai-use.md');
const packageJson = JSON.parse(read('package.json'));

const requiredReadmeFragments = Object.freeze([
  'DOMHamster',
  'The human-approved agent dispatcher',
  'Live deployment: pending',
  'ChatGPT in-app browser',
  'WebMCP-enabled Chrome',
  'Reset',
  'Build today’s plan.',
  'R-105',
  'V-03',
  '13:00',
  'Lock assignment',
  'R-106',
  'V-05',
  'Approve',
  'commit_assignment_plan',
  'Node.js 24',
  'npm ci',
  'npm run verify',
  'Fictional demo data only',
  'docs/ai-use.md',
  'LICENSE',
]);
for (const fragment of requiredReadmeFragments) {
  assert.ok(readme.includes(fragment), `WP13_README_FRAGMENT_MISSING:${fragment}`);
}

const toolNames = Object.freeze([
  'get_coordination_overview',
  'list_open_requests',
  'list_available_volunteers',
  'create_assignment_draft',
  'get_assignment_draft',
  'validate_assignment_draft',
  'revise_assignment_draft',
  'prepare_plan_approval',
  'commit_assignment_plan',
  'get_committed_plan',
  'access_dispatch_contacts',
  'get_audit_history',
]);
for (const name of toolNames) {
  assert.ok(tools.includes(`\`${name}\``), `WP13_TOOL_DOC_MISSING:${name}`);
}

const lifecycleCounts = Object.freeze({
  READY: 5,
  DRAFT_INVALID: 7,
  DRAFT_VALID: 8,
  AWAITING_APPROVAL: 3,
  APPROVED: 4,
  COMMITTED: 3,
});
for (const [state, count] of Object.entries(lifecycleCounts)) {
  const pattern = new RegExp(`\\|\\s*${state}\\s*\\|\\s*${count}\\s*\\|`, 'u');
  assert.match(tools, pattern, `WP13_LIFECYCLE_DOC_MISSING:${state}:${count}`);
}

for (const fragment of [
  'UI → serialized store → pure command reducer',
  'WebMCP handlers never inspect or click presentation DOM',
  'localStorage',
  'No backend',
]) {
  assert.ok(architecture.includes(fragment), `WP13_ARCHITECTURE_FRAGMENT_MISSING:${fragment}`);
}

for (const fragment of [
  'Verified in the repository record',
  'Pending release gates',
  'npm run verify:release',
  '50 scored trials',
  'ChatGPT in-app browser',
]) {
  assert.ok(testing.includes(fragment), `WP13_TESTING_FRAGMENT_MISSING:${fragment}`);
}

for (const fragment of [
  'Live URL: pending',
  'Public repository',
  'Video URL: pending',
  'Do not finalize',
  'September 3, 2026',
]) {
  assert.ok(submission.includes(fragment), `WP13_SUBMISSION_FRAGMENT_MISSING:${fragment}`);
}

for (const fragment of [
  'OpenAI ChatGPT',
  'OpenAI image generation',
  'Mohammed Ghazal',
  'not a team member',
  'reviewed and verified',
]) {
  assert.ok(aiUse.includes(fragment), `WP13_AI_USE_FRAGMENT_MISSING:${fragment}`);
}

for (const script of [
  'verify',
  'verify:release',
  'verify:docs',
  'verify:deployment',
  'test:e2e',
  'release:manifest',
  'release:verify',
]) {
  assert.equal(
    typeof packageJson.scripts?.[script],
    'string',
    `WP13_PACKAGE_SCRIPT_MISSING:${script}`,
  );
}
assert.equal(
  packageJson.scripts['verify:docs'],
  'node tests/docs/documentation-contract.test.mjs',
  'WP13_DOC_SCRIPT_DRIFT',
);
assert.match(
  packageJson.scripts.verify,
  /npm run verify:docs/u,
  'WP13_VERIFY_DOES_NOT_INCLUDE_DOCS',
);

const markdownFiles = requiredFiles.filter((path) => path.endsWith('.md'));
for (const path of markdownFiles) {
  const content = read(path);
  assert.doesNotMatch(content, /\b(?:TODO|TBD|FIXME)\b/u, `WP13_PLACEHOLDER:${path}`);
  assert.doesNotMatch(content, /https?:\/\/[^\s)]*example\.com/iu, `WP13_FAKE_URL:${path}`);

  const links = content.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu);
  for (const match of links) {
    const rawTarget = match[1]?.trim();
    if (
      rawTarget === undefined ||
      rawTarget.startsWith('#') ||
      /^(?:https?:|mailto:)/u.test(rawTarget)
    ) {
      continue;
    }
    const targetWithoutFragment = rawTarget.split('#', 1)[0];
    assert.ok(targetWithoutFragment, `WP13_EMPTY_LOCAL_LINK:${path}`);
    const resolved = normalize(join(root, dirname(path), targetWithoutFragment));
    assert.equal(existsSync(resolved), true, `WP13_BROKEN_LOCAL_LINK:${path}:${rawTarget}`);
  }
}

console.log(`DOMHAMSTER_WP13_DOCUMENTATION_CONTRACT_PASS files=${requiredFiles.length}`);
