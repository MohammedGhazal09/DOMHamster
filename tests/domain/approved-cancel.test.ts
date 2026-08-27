import { describe, expect, it } from 'vitest';
import { reduceCommand, type CommandDependencies, type CommandResult } from '../../src/domain/commands.ts';
import { CANONICAL_SCENARIO } from '../../src/domain/seed.ts';
import {
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
    now: () => '2026-08-26T12:01:00.000Z',
    nextPlanId: () => `PLAN-${++planSequence}` as PlanId,
    nextAuditEventId: () => `AUDIT-${++auditSequence}` as AuditEventId,
  };
}

function success(result: CommandResult): AppState {
  if (!result.ok) throw new Error(`TEST_EXPECTED_SUCCESS:${result.error.code}`);
  return result.state;
}

function ready(): ReadyState {
  return {
    workflowState: 'READY',
    scenario: CANONICAL_SCENARIO,
    draft: null,
    approval: null,
    committedPlan: null,
    auditHistory: [],
  };
}

describe('approved-plan cancellation', () => {
  it('lets the human invalidate an approved version before the agent commits', () => {
    const deps = dependencies();
    const draft = success(
      reduceCommand(
        ready(),
        { type: 'CREATE_DRAFT', actor: 'agent', assignments: validAssignments() },
        deps,
      ),
    );
    const awaiting = success(
      reduceCommand(
        draft,
        { type: 'PREPARE_APPROVAL', actor: 'agent', expectedDraftVersion: 1 },
        deps,
      ),
    );
    const approved = success(
      reduceCommand(
        awaiting,
        { type: 'APPROVE', actor: 'human', expectedDraftVersion: 1 },
        deps,
      ),
    );
    const cancelled = success(
      reduceCommand(
        approved,
        { type: 'CANCEL_APPROVAL', actor: 'human', expectedDraftVersion: 1 },
        deps,
      ),
    );

    expect(cancelled.workflowState).toBe('DRAFT_VALID');
    expect(cancelled.approval).toBeNull();
    expect(cancelled.draft?.version).toBe(1);
    expect(cancelled.auditHistory.at(-1)).toMatchObject({
      actor: 'human',
      type: 'APPROVAL_CANCELLED',
      draftVersion: 1,
    });
  });
});
