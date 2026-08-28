import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../src/domain/canonical-json';
import { CANONICAL_SCENARIO } from '../../src/domain/seed';
import {
  requestId,
  volunteerId,
  type Assignment,
  type TimeOfDay,
  type ValidationIssue,
} from '../../src/domain/types';
import {
  validateDraft,
  type HumanLockSnapshot,
  type ValidationContext,
} from '../../src/domain/validation';
import {
  assignmentFor,
  omitAssignment,
  replaceAssignment,
  validAssignments,
} from '../fixtures/drafts';

function buildContext(
  assignments: readonly Assignment[] = validAssignments(),
  overrides: Partial<ValidationContext> = {},
): ValidationContext {
  return {
    scenario: CANONICAL_SCENARIO,
    assignments,
    humanLocks: [],
    ...overrides,
  };
}

function errorCodes(result: ReturnType<typeof validateDraft>): string[] {
  return result.errors.map(({ code }) => code);
}

function warningCodes(result: ReturnType<typeof validateDraft>): string[] {
  return result.warnings.map(({ code }) => code);
}

function findIssue(issues: readonly ValidationIssue[], code: string): ValidationIssue {
  const issue = issues.find(({ code: candidate }) => candidate === code);
  if (!issue) {
    throw new Error(`TEST_EXPECTED_VALIDATION_ISSUE:${code}`);
  }
  return issue;
}

function humanLock(assignment: Assignment): HumanLockSnapshot {
  return {
    requestId: assignment.requestId,
    volunteerId: assignment.volunteerId,
    startTime: assignment.startTime,
    durationMinutes: assignment.durationMinutes,
    status: assignment.status,
  };
}

describe('hard assignment validation rules', () => {
  it('reports duplicate request accounting', () => {
    const assignments = validAssignments();
    assignments.push(assignmentFor(assignments, requestId('R-101')));

    const result = validateDraft(buildContext(assignments));
    const issue = findIssue(result.errors, 'DUPLICATE_REQUEST_ASSIGNMENT');

    expect(issue.requestIds).toEqual([requestId('R-101')]);
    expect(result.valid).toBe(false);
  });

  it('reports an unknown request without stopping later rules', () => {
    const assignments = validAssignments();
    assignments.push({
      ...assignmentFor(assignments, requestId('R-108')),
      requestId: requestId('R-999'),
      volunteerId: volunteerId('V-99'),
    });

    const result = validateDraft(buildContext(assignments));

    expect(errorCodes(result)).toEqual(
      expect.arrayContaining(['UNKNOWN_REQUEST', 'UNKNOWN_VOLUNTEER']),
    );
  });

  it('reports an unknown volunteer', () => {
    const assignments = replaceAssignment(validAssignments(), requestId('R-108'), {
      volunteerId: volunteerId('V-99'),
    });

    const issue = findIssue(validateDraft(buildContext(assignments)).errors, 'UNKNOWN_VOLUNTEER');

    expect(issue.requestIds).toEqual([requestId('R-108')]);
    expect(issue.volunteerId).toBe(volunteerId('V-99'));
  });

  it('reports a volunteer assignment outside availability', () => {
    const assignments = replaceAssignment(validAssignments(), requestId('R-108'), {
      volunteerId: volunteerId('V-01'),
      startTime: '15:00',
    });

    const issue = findIssue(
      validateDraft(buildContext(assignments)).errors,
      'VOLUNTEER_UNAVAILABLE',
    );

    expect(issue.requestIds).toEqual([requestId('R-108')]);
    expect(issue.volunteerId).toBe(volunteerId('V-01'));
  });

  it('reports a request time-window violation', () => {
    const assignments = replaceAssignment(validAssignments(), requestId('R-101'), {
      startTime: '10:00',
    });

    expect(errorCodes(validateDraft(buildContext(assignments)))).toContain(
      'REQUEST_TIME_WINDOW_VIOLATION',
    );
  });

  it('accepts an assignment ending exactly at the request and volunteer boundaries', () => {
    const assignments = replaceAssignment(validAssignments(), requestId('R-101'), {
      startTime: '09:45',
    });

    const result = validateDraft(buildContext(assignments));

    expect(errorCodes(result)).not.toContain('REQUEST_TIME_WINDOW_VIOLATION');
    expect(errorCodes(result)).not.toContain('VOLUNTEER_UNAVAILABLE');
  });

  it('reports overlapping assignments with stable references', () => {
    let assignments = replaceAssignment(validAssignments(), requestId('R-105'), {
      volunteerId: volunteerId('V-03'),
      startTime: '13:00',
    });
    assignments = replaceAssignment(assignments, requestId('R-106'), {
      volunteerId: volunteerId('V-03'),
      startTime: '13:00',
    });

    const issue = findIssue(
      validateDraft(buildContext(assignments)).errors,
      'VOLUNTEER_TIME_OVERLAP',
    );

    expect(issue.requestIds).toEqual([requestId('R-105'), requestId('R-106')]);
    expect(issue.volunteerId).toBe(volunteerId('V-03'));
  });

  it('accepts back-to-back assignments for the same volunteer', () => {
    const assignments = replaceAssignment(validAssignments(), requestId('R-104'), {
      volunteerId: volunteerId('V-03'),
      startTime: '11:30',
    });

    const result = validateDraft(buildContext(assignments));

    expect(errorCodes(result)).not.toContain('VOLUNTEER_TIME_OVERLAP');
  });

  it('reports workload above the scenario maximum of three', () => {
    let assignments = replaceAssignment(validAssignments(), requestId('R-104'), {
      volunteerId: volunteerId('V-03'),
      startTime: '11:30',
    });
    assignments = replaceAssignment(assignments, requestId('R-108'), {
      volunteerId: volunteerId('V-03'),
      startTime: '15:00',
    });

    const issue = findIssue(
      validateDraft(buildContext(assignments)).errors,
      'VOLUNTEER_WORKLOAD_EXCEEDED',
    );

    expect(issue.requestIds).toEqual([
      requestId('R-103'),
      requestId('R-104'),
      requestId('R-106'),
      requestId('R-108'),
    ]);
    expect(issue.volunteerId).toBe(volunteerId('V-03'));
  });

  it('accepts exactly three assignments for one volunteer', () => {
    const assignments = replaceAssignment(validAssignments(), requestId('R-108'), {
      volunteerId: volunteerId('V-03'),
      startTime: '15:00',
    });

    expect(errorCodes(validateDraft(buildContext(assignments)))).not.toContain(
      'VOLUNTEER_WORKLOAD_EXCEEDED',
    );
  });

  it('reports a missing required skill', () => {
    const assignments = replaceAssignment(validAssignments(), requestId('R-101'), {
      volunteerId: volunteerId('V-02'),
    });

    const issue = findIssue(
      validateDraft(buildContext(assignments)).errors,
      'MISSING_REQUIRED_SKILL',
    );

    expect(issue.requestIds).toEqual([requestId('R-101')]);
    expect(issue.volunteerId).toBe(volunteerId('V-02'));
  });

  it('reports missing Arabic language support for R-104', () => {
    const assignments = replaceAssignment(validAssignments(), requestId('R-104'), {
      volunteerId: volunteerId('V-02'),
    });

    const issue = findIssue(
      validateDraft(buildContext(assignments)).errors,
      'MISSING_REQUIRED_LANGUAGE',
    );

    expect(issue.requestIds).toEqual([requestId('R-104')]);
    expect(issue.volunteerId).toBe(volunteerId('V-02'));
  });

  it.each([
    {
      name: 'malformed start time',
      patch: { startTime: '9:00' as TimeOfDay },
    },
    {
      name: 'zero duration',
      patch: { durationMinutes: 0 },
    },
    {
      name: 'unassigned row with scheduling fields',
      patch: { status: 'unassigned' as const },
    },
  ])('reports invalid assignment time for $name', ({ patch }) => {
    const assignments = replaceAssignment(validAssignments(), requestId('R-101'), patch);

    expect(errorCodes(validateDraft(buildContext(assignments)))).toContain(
      'INVALID_ASSIGNMENT_TIME',
    );
  });

  it('reports mutation of an authoritative human lock', () => {
    const baseline = assignmentFor(validAssignments(), requestId('R-105'));
    const assignments = replaceAssignment(validAssignments(), requestId('R-105'), {
      volunteerId: volunteerId('V-03'),
      startTime: '13:00',
      lockedByHuman: false,
    });

    const issue = findIssue(
      validateDraft(
        buildContext(assignments, {
          humanLocks: [humanLock({ ...baseline, lockedByHuman: true })],
        }),
      ).errors,
      'HUMAN_LOCK_VIOLATION',
    );

    expect(issue.requestIds).toEqual([requestId('R-105')]);
  });

  it('accepts an unchanged authoritative human lock', () => {
    const assignments = validAssignments();
    const locked = assignmentFor(assignments, requestId('R-105'));

    const result = validateDraft(
      buildContext(assignments, {
        humanLocks: [humanLock({ ...locked, lockedByHuman: true })],
      }),
    );

    expect(errorCodes(result)).not.toContain('HUMAN_LOCK_VIOLATION');
  });

  it('does not treat the assignment lock flag as authority by itself', () => {
    const assignments = replaceAssignment(validAssignments(), requestId('R-105'), {
      lockedByHuman: true,
    });

    expect(errorCodes(validateDraft(buildContext(assignments)))).not.toContain(
      'HUMAN_LOCK_VIOLATION',
    );
  });
});

describe('validation warnings', () => {
  it('warns once when a request has no assignment row', () => {
    const assignments = omitAssignment(validAssignments(), requestId('R-108'));
    const result = validateDraft(buildContext(assignments));
    const issue = findIssue(result.warnings, 'REQUEST_UNASSIGNED');

    expect(issue.requestIds).toEqual([requestId('R-108')]);
    expect(result.valid).toBe(true);
  });

  it('warns once when a request is explicitly unassigned', () => {
    const assignments = replaceAssignment(validAssignments(), requestId('R-108'), {
      volunteerId: null,
      startTime: null,
      status: 'unassigned',
    });

    const unassignedIssues = validateDraft(buildContext(assignments)).warnings.filter(
      ({ code }) => code === 'REQUEST_UNASSIGNED',
    );

    expect(unassignedIssues).toHaveLength(1);
    expect(unassignedIssues[0]?.requestIds).toEqual([requestId('R-108')]);
  });

  it('warns about noncritical cross-zone assignment', () => {
    const assignments = replaceAssignment(validAssignments(), requestId('R-106'), {
      volunteerId: volunteerId('V-04'),
      startTime: '13:00',
    });

    const issue = findIssue(validateDraft(buildContext(assignments)).warnings, 'ZONE_INEFFICIENCY');

    expect(issue.requestIds).toEqual([requestId('R-106')]);
    expect(issue.volunteerId).toBe(volunteerId('V-04'));
  });

  it('does not emit the noncritical zone warning for a high-priority request', () => {
    const assignments = replaceAssignment(validAssignments(), requestId('R-104'), {
      volunteerId: volunteerId('V-03'),
    });

    const result = validateDraft(buildContext(assignments));
    const r104ZoneWarnings = result.warnings.filter(
      ({ code, requestIds }) =>
        code === 'ZONE_INEFFICIENCY' && requestIds.includes(requestId('R-104')),
    );

    expect(r104ZoneWarnings).toHaveLength(0);
  });

  it('warns when the assigned workload spread exceeds one without invalidating the draft', () => {
    const assignments = replaceAssignment(validAssignments(), requestId('R-108'), {
      volunteerId: volunteerId('V-03'),
      startTime: '15:00',
    });

    const result = validateDraft(buildContext(assignments));

    expect(warningCodes(result)).toContain('WORKLOAD_IMBALANCE');
    expect(result.valid).toBe(true);
  });

  it('does not warn when assigned workload differs by at most one', () => {
    const result = validateDraft(buildContext());

    expect(warningCodes(result)).not.toContain('WORKLOAD_IMBALANCE');
    expect(result.valid).toBe(true);
  });
});

describe('validation determinism and purity', () => {
  it('evaluates all applicable rules instead of returning after the first error', () => {
    const assignments = validAssignments();
    assignments.push({
      ...assignmentFor(assignments, requestId('R-101')),
      volunteerId: volunteerId('V-99'),
      startTime: '25:00',
    });

    const result = validateDraft(buildContext(assignments));

    expect(errorCodes(result)).toEqual(
      expect.arrayContaining([
        'DUPLICATE_REQUEST_ASSIGNMENT',
        'INVALID_ASSIGNMENT_TIME',
        'UNKNOWN_VOLUNTEER',
      ]),
    );
  });

  it('returns issues in deterministic sorted order', () => {
    let assignments = replaceAssignment(validAssignments(), requestId('R-101'), {
      volunteerId: volunteerId('V-02'),
    });
    assignments = replaceAssignment(assignments, requestId('R-108'), {
      volunteerId: volunteerId('V-99'),
    });

    const result = validateDraft(buildContext(assignments));
    const keys = result.errors.map(
      ({ code, requestIds, volunteerId: assignedVolunteer }) =>
        `${code}|${requestIds.join(',')}|${assignedVolunteer ?? ''}`,
    );

    expect(keys).toEqual([...keys].sort());
  });

  it('produces byte-identical canonical output for repeated validation', () => {
    let assignments = replaceAssignment(validAssignments(), requestId('R-105'), {
      volunteerId: volunteerId('V-03'),
      startTime: '13:00',
    });
    assignments = replaceAssignment(assignments, requestId('R-106'), {
      volunteerId: volunteerId('V-03'),
      startTime: '13:00',
    });
    const validationContext = buildContext(assignments);

    const first = canonicalJson(validateDraft(validationContext));

    for (let iteration = 0; iteration < 5; iteration += 1) {
      expect(canonicalJson(validateDraft(validationContext))).toBe(first);
    }
  });

  it('does not mutate the scenario, assignments, or human lock snapshots', () => {
    const assignments = validAssignments();
    const lock = humanLock(assignmentFor(assignments, requestId('R-105')));
    const validationContext = buildContext(assignments, { humanLocks: [lock] });
    const before = canonicalJson(validationContext);

    validateDraft(validationContext);

    expect(canonicalJson(validationContext)).toBe(before);
  });

  it('accepts an equivalent cloned scenario', () => {
    const clonedScenario = structuredClone(CANONICAL_SCENARIO);
    const result = validateDraft(buildContext(undefined, { scenario: clonedScenario }));

    expect(result.errors).toHaveLength(0);
  });
});
