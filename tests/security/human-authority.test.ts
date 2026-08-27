import { describe, expect, it } from 'vitest';
import { canTransition, type WorkflowEvent } from '../../src/domain/state-machine.ts';
import type { WorkflowState } from '../../src/domain/types.ts';
import { TOOL_NAMES } from '../../src/webmcp/contracts.ts';
import { desiredToolNames } from '../../src/webmcp/lifecycle.ts';

const WORKFLOW_STATES = Object.freeze([
  'READY',
  'DRAFT_INVALID',
  'DRAFT_VALID',
  'AWAITING_APPROVAL',
  'APPROVED',
  'COMMITTED',
] as const satisfies readonly WorkflowState[]);

const HUMAN_ONLY_TOOL_NAMES = Object.freeze([
  'lock_assignment',
  'unlock_assignment',
  'approve_plan',
  'reject_plan',
  'cancel_approval',
  'discard_draft',
  'reset_demo',
]);

describe('human authority security boundary', () => {
  it('never exposes human-only decisions as WebMCP tools in any state', () => {
    for (const name of HUMAN_ONLY_TOOL_NAMES) {
      expect(TOOL_NAMES).not.toContain(name);
    }

    for (const state of WORKFLOW_STATES) {
      const exposed = desiredToolNames(state);
      for (const name of HUMAN_ONLY_TOOL_NAMES) {
        expect(exposed).not.toContain(name);
      }
    }
  });

  it('allows assignment editing and locking only for the human actor', () => {
    const humanEvents = Object.freeze([
      'EDIT_ASSIGNMENT',
      'LOCK_ASSIGNMENT',
      'UNLOCK_ASSIGNMENT',
    ] as const satisfies readonly WorkflowEvent[]);

    for (const state of ['DRAFT_INVALID', 'DRAFT_VALID'] as const) {
      for (const event of humanEvents) {
        expect(canTransition(state, event, 'human')).toBe(true);
        expect(canTransition(state, event, 'agent')).toBe(false);
        expect(canTransition(state, event, 'system')).toBe(false);
      }
    }
  });

  it('allows approval, rejection, cancellation, discard, and reset only to the human', () => {
    for (const event of ['APPROVE', 'REJECT'] as const) {
      expect(canTransition('AWAITING_APPROVAL', event, 'human')).toBe(true);
      expect(canTransition('AWAITING_APPROVAL', event, 'agent')).toBe(false);
      expect(canTransition('AWAITING_APPROVAL', event, 'system')).toBe(false);
    }

    expect(canTransition('AWAITING_APPROVAL', 'CANCEL_APPROVAL', 'human')).toBe(true);
    expect(canTransition('APPROVED', 'CANCEL_APPROVAL', 'human')).toBe(true);
    expect(canTransition('AWAITING_APPROVAL', 'CANCEL_APPROVAL', 'agent')).toBe(false);
    expect(canTransition('APPROVED', 'CANCEL_APPROVAL', 'agent')).toBe(false);

    for (const state of [
      'DRAFT_INVALID',
      'DRAFT_VALID',
      'AWAITING_APPROVAL',
      'APPROVED',
    ] as const) {
      expect(canTransition(state, 'DISCARD_DRAFT', 'human')).toBe(true);
      expect(canTransition(state, 'DISCARD_DRAFT', 'agent')).toBe(false);
    }

    for (const state of WORKFLOW_STATES) {
      expect(canTransition(state, 'RESET_DEMO', 'human')).toBe(true);
      expect(canTransition(state, 'RESET_DEMO', 'agent')).toBe(false);
      expect(canTransition(state, 'RESET_DEMO', 'system')).toBe(false);
    }
  });

  it('keeps commit agent-only and available only after exact human approval', () => {
    for (const state of WORKFLOW_STATES) {
      expect(canTransition(state, 'COMMIT_PLAN', 'human')).toBe(false);
      expect(canTransition(state, 'COMMIT_PLAN', 'system')).toBe(false);
      expect(canTransition(state, 'COMMIT_PLAN', 'agent')).toBe(state === 'APPROVED');
    }

    expect(desiredToolNames('AWAITING_APPROVAL')).not.toContain('commit_assignment_plan');
    expect(desiredToolNames('APPROVED')).toContain('commit_assignment_plan');
    expect(desiredToolNames('COMMITTED')).not.toContain('commit_assignment_plan');
  });
});
