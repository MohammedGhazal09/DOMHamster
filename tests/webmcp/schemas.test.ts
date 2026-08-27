import { describe, expect, it } from 'vitest';
import {
  MAX_SCHEMA_ISSUES,
  validateToolInput,
  type InputValidationFailure,
} from '../../src/webmcp/schemas';
import type { ToolName } from '../../src/webmcp/contracts';

interface ValidCase {
  readonly name: ToolName;
  readonly minimum: unknown;
  readonly maximum: unknown;
}

const VALID_CASES: readonly ValidCase[] = [
  { name: 'get_coordination_overview', minimum: {}, maximum: {} },
  {
    name: 'list_open_requests',
    minimum: {},
    maximum: { priority: 'URGENT', zone: 'NORTH' },
  },
  {
    name: 'list_available_volunteers',
    minimum: {},
    maximum: { zone: 'EAST' },
  },
  {
    name: 'create_assignment_draft',
    minimum: { assignments: [], unassignedRequestIds: [] },
    maximum: {
      goal: 'Prioritize food deliveries and Arabic-language support.',
      assignments: Array.from({ length: 8 }, (_, index) => ({
        requestId: `R-${String(index + 101).padStart(3, '0')}`,
        volunteerId: `V-${String((index % 5) + 1).padStart(2, '0')}`,
        startTime: `${String(9 + index).padStart(2, '0')}:00`,
      })),
      unassignedRequestIds: [],
      rationale: 'Each request is represented exactly once.',
    },
  },
  { name: 'get_assignment_draft', minimum: {}, maximum: { includeIssues: true } },
  {
    name: 'validate_assignment_draft',
    minimum: { expectedDraftVersion: 1 },
    maximum: { expectedDraftVersion: 999 },
  },
  {
    name: 'revise_assignment_draft',
    minimum: {
      expectedDraftVersion: 1,
      changes: [{ action: 'SET_UNASSIGNED', requestId: 'R-101' }],
    },
    maximum: {
      expectedDraftVersion: 999,
      changes: Array.from({ length: 8 }, (_, index) => ({
        action: 'SET_ASSIGNMENT',
        requestId: `R-${String(index + 101).padStart(3, '0')}`,
        volunteerId: `V-${String((index % 5) + 1).padStart(2, '0')}`,
        startTime: `${String(9 + index).padStart(2, '0')}:00`,
      })),
      rationale: 'Repair every unlocked request while preserving human locks.',
    },
  },
  {
    name: 'prepare_plan_approval',
    minimum: { expectedDraftVersion: 1, summary: 'Ready for human review.' },
    maximum: { expectedDraftVersion: 999, summary: 'x'.repeat(300) },
  },
  {
    name: 'commit_assignment_plan',
    minimum: { expectedDraftVersion: 1 },
    maximum: { expectedDraftVersion: 999 },
  },
  { name: 'get_committed_plan', minimum: {}, maximum: {} },
  {
    name: 'access_dispatch_contacts',
    minimum: { requestIds: ['R-101'] },
    maximum: { requestIds: Array.from({ length: 8 }, (_, index) => `R-${index + 101}`) },
  },
  { name: 'get_audit_history', minimum: {}, maximum: { limit: 20 } },
];

function expectInvalid(name: ToolName, input: unknown): InputValidationFailure {
  const result = validateToolInput(name, input);
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error('TEST_EXPECTED_INVALID_INPUT');
  }
  expect(result.error.code).toBe('INVALID_INPUT');
  expect(result.error.retryable).toBe(true);
  return result;
}

describe('compiled WebMCP input schemas', () => {
  it.each(VALID_CASES)(
    'accepts minimum and maximum valid inputs for $name',
    ({ name, minimum, maximum }) => {
      expect(validateToolInput(name, minimum)).toEqual({ ok: true, value: minimum });
      expect(validateToolInput(name, maximum)).toEqual({ ok: true, value: maximum });
    },
  );

  it.each(VALID_CASES)('rejects undeclared properties for $name', ({ name, minimum }) => {
    expectInvalid(name, { ...(minimum as Record<string, unknown>), unexpected: true });
  });

  it('rejects non-object inputs', () => {
    for (const value of [null, [], 'input', 42, true]) {
      expectInvalid('get_coordination_overview', value);
    }
  });

  it('rejects missing required properties and invalid primitive types', () => {
    expectInvalid('create_assignment_draft', { assignments: [] });
    expectInvalid('validate_assignment_draft', {});
    expectInvalid('validate_assignment_draft', { expectedDraftVersion: 1.5 });
    expectInvalid('prepare_plan_approval', { expectedDraftVersion: 1 });
    expectInvalid('access_dispatch_contacts', {});
    expectInvalid('get_audit_history', { limit: '20' });
  });

  it('rejects unknown enums and malformed identifiers or times', () => {
    expectInvalid('list_open_requests', { priority: 'CRITICAL' });
    expectInvalid('list_available_volunteers', { zone: 'WEST' });
    expectInvalid('create_assignment_draft', {
      assignments: [{ requestId: 'request-101', volunteerId: 'V-01', startTime: '9:00' }],
      unassignedRequestIds: [],
    });
    expectInvalid('access_dispatch_contacts', { requestIds: ['R-01'] });
  });

  it('rejects duplicate or overlapping request accounting in a created draft', () => {
    expectInvalid('create_assignment_draft', {
      assignments: [
        { requestId: 'R-101', volunteerId: 'V-01', startTime: '09:00' },
        { requestId: 'R-101', volunteerId: 'V-02', startTime: '10:00' },
      ],
      unassignedRequestIds: [],
    });

    expectInvalid('create_assignment_draft', {
      assignments: [{ requestId: 'R-101', volunteerId: 'V-01', startTime: '09:00' }],
      unassignedRequestIds: ['R-101'],
    });
  });

  it('enforces revision action conditionals and unique request changes', () => {
    expectInvalid('revise_assignment_draft', {
      expectedDraftVersion: 1,
      changes: [{ action: 'SET_ASSIGNMENT', requestId: 'R-101' }],
    });
    expectInvalid('revise_assignment_draft', {
      expectedDraftVersion: 1,
      changes: [
        {
          action: 'SET_UNASSIGNED',
          requestId: 'R-101',
          volunteerId: 'V-01',
          startTime: '09:00',
        },
      ],
    });
    expectInvalid('revise_assignment_draft', {
      expectedDraftVersion: 1,
      changes: [
        { action: 'SET_UNASSIGNED', requestId: 'R-101' },
        { action: 'SET_UNASSIGNED', requestId: 'R-101' },
      ],
    });
  });

  it('enforces array, number, and text limits', () => {
    expectInvalid('create_assignment_draft', {
      assignments: [],
      unassignedRequestIds: [],
      goal: 'x'.repeat(241),
    });
    expectInvalid('revise_assignment_draft', { expectedDraftVersion: 0, changes: [] });
    expectInvalid('revise_assignment_draft', { expectedDraftVersion: 1, changes: [] });
    expectInvalid('prepare_plan_approval', {
      expectedDraftVersion: 1,
      summary: 'x'.repeat(301),
    });
    expectInvalid('access_dispatch_contacts', { requestIds: ['R-101', 'R-101'] });
    expectInvalid('get_audit_history', { limit: 21 });
  });

  it('returns bounded safe validation details without echoing raw input', () => {
    const sentinel = 'DO_NOT_ECHO_SECRET_SENTINEL';
    const failure = expectInvalid('create_assignment_draft', {
      assignments: Array.from({ length: 12 }, () => sentinel),
      unassignedRequestIds: [sentinel, sentinel],
      goal: sentinel.repeat(40),
      extraA: sentinel,
      extraB: sentinel,
    });

    expect(failure.error.message).toBe('Tool input does not match the required schema.');
    expect(failure.error.details.issues.length).toBeLessThanOrEqual(MAX_SCHEMA_ISSUES);
    expect(JSON.stringify(failure)).not.toContain(sentinel);
    for (const issue of failure.error.details.issues) {
      expect(Object.keys(issue).sort()).toEqual(['instancePath', 'keyword']);
      expect(issue.instancePath.length).toBeLessThanOrEqual(160);
      expect(issue.keyword.length).toBeLessThanOrEqual(64);
    }
  });

  it('does not mutate accepted or rejected inputs', () => {
    const accepted = Object.freeze({ includeIssues: true });
    const rejected = Object.freeze({ limit: 0 });

    validateToolInput('get_assignment_draft', accepted);
    validateToolInput('get_audit_history', rejected);

    expect(accepted).toEqual({ includeIssues: true });
    expect(rejected).toEqual({ limit: 0 });
  });
});
