import { describe, expect, it } from 'vitest';
import {
  reduceCommand,
  type CommandDependencies,
  type CommandResult,
} from '../../src/domain/commands.ts';
import { CANONICAL_SCENARIO } from '../../src/domain/seed.ts';
import {
  requestId,
  volunteerId,
  type AppState,
  type AuditEventId,
  type PlanId,
  type ReadyState,
} from '../../src/domain/types.ts';
import { validAssignments } from '../fixtures/drafts.ts';

function dependencies(): CommandDependencies {
  let planSequence = 0;
  let auditSequence = 0;

  return {
    scenario: CANONICAL_SCENARIO,
    now: () => '2026-08-26T12:00:00.000Z',
    nextPlanId: () => `PLAN-${++planSequence}` as PlanId,
    nextAuditEventId: () => `AUDIT-${++auditSequence}` as AuditEventId,
  };
}

function readyState(): ReadyState {
  return {
    workflowState: 'READY',
    scenario: CANONICAL_SCENARIO,
    draft: null,
    approval: null,
    committedPlan: null,
    auditHistory: [],
  };
}

function successfulState(result: CommandResult): AppState {
  if (!result.ok) throw new Error(`TEST_EXPECTED_SUCCESS:${result.error.code}`);
  return result.state;
}

function assignment(state: AppState, id: string) {
  const value = state.draft?.assignments.find(({ requestId: candidate }) => candidate === id);
  if (value === undefined) throw new Error(`TEST_ASSIGNMENT_MISSING:${id}`);
  return value;
}

describe('canonical conflict and lock-preserving repair journey', () => {
  it('advances through exact draft versions 1–4 with one visible human conflict', () => {
    const deps = dependencies();
    const draftV1 = successfulState(
      reduceCommand(
        readyState(),
        { type: 'CREATE_DRAFT', actor: 'agent', assignments: validAssignments() },
        deps,
      ),
    );

    expect(draftV1.workflowState).toBe('DRAFT_VALID');
    expect(draftV1.draft?.version).toBe(1);

    const draftV2 = successfulState(
      reduceCommand(
        draftV1,
        {
          type: 'EDIT_ASSIGNMENT',
          actor: 'human',
          expectedDraftVersion: 1,
          requestId: requestId('R-105'),
          patch: {
            volunteerId: volunteerId('V-03'),
            startTime: '13:00',
            status: 'planned',
          },
        },
        deps,
      ),
    );

    expect(draftV2.workflowState).toBe('DRAFT_INVALID');
    expect(draftV2.draft?.version).toBe(2);
    expect(draftV2.draft?.validation.errors).toContainEqual(
      expect.objectContaining({
        code: 'VOLUNTEER_TIME_OVERLAP',
        requestIds: [requestId('R-105'), requestId('R-106')],
        volunteerId: volunteerId('V-03'),
      }),
    );

    const draftV3 = successfulState(
      reduceCommand(
        draftV2,
        {
          type: 'LOCK_ASSIGNMENT',
          actor: 'human',
          expectedDraftVersion: 2,
          requestId: requestId('R-105'),
        },
        deps,
      ),
    );

    expect(draftV3.workflowState).toBe('DRAFT_INVALID');
    expect(draftV3.draft?.version).toBe(3);
    expect(assignment(draftV3, 'R-105')).toMatchObject({
      volunteerId: volunteerId('V-03'),
      startTime: '13:00',
      lockedByHuman: true,
    });

    const repairedAssignments =
      draftV3.draft?.assignments.map((entry) =>
        entry.requestId === requestId('R-106')
          ? {
              ...entry,
              volunteerId: volunteerId('V-05'),
              startTime: '13:00' as const,
            }
          : { ...entry },
      ) ?? [];
    const draftV4 = successfulState(
      reduceCommand(
        draftV3,
        {
          type: 'REVISE_DRAFT',
          actor: 'agent',
          expectedDraftVersion: 3,
          assignments: repairedAssignments,
        },
        deps,
      ),
    );

    expect(draftV4.workflowState).toBe('DRAFT_VALID');
    expect(draftV4.draft?.version).toBe(4);
    expect(draftV4.draft?.validation.errors).toEqual([]);
    expect(assignment(draftV4, 'R-105')).toMatchObject({
      volunteerId: volunteerId('V-03'),
      startTime: '13:00',
      lockedByHuman: true,
    });
    expect(assignment(draftV4, 'R-106')).toMatchObject({
      volunteerId: volunteerId('V-05'),
      startTime: '13:00',
      lockedByHuman: false,
    });
  });
});
