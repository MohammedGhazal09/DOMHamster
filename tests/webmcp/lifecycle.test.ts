import { describe, expect, it } from 'vitest';
import type { WorkflowState } from '../../src/domain/types';
import { TOOL_NAMES_BY_STATE, desiredToolNames } from '../../src/webmcp/lifecycle';

const EXPECTED_BY_STATE = {
  READY: [
    'get_coordination_overview',
    'list_open_requests',
    'list_available_volunteers',
    'create_assignment_draft',
    'get_audit_history',
  ],
  DRAFT_INVALID: [
    'get_coordination_overview',
    'list_open_requests',
    'list_available_volunteers',
    'get_assignment_draft',
    'validate_assignment_draft',
    'revise_assignment_draft',
    'get_audit_history',
  ],
  DRAFT_VALID: [
    'get_coordination_overview',
    'list_open_requests',
    'list_available_volunteers',
    'get_assignment_draft',
    'validate_assignment_draft',
    'revise_assignment_draft',
    'prepare_plan_approval',
    'get_audit_history',
  ],
  AWAITING_APPROVAL: ['get_assignment_draft', 'validate_assignment_draft', 'get_audit_history'],
  APPROVED: [
    'get_assignment_draft',
    'validate_assignment_draft',
    'commit_assignment_plan',
    'get_audit_history',
  ],
  COMMITTED: ['get_committed_plan', 'access_dispatch_contacts', 'get_audit_history'],
} as const satisfies Record<WorkflowState, readonly string[]>;

describe('WebMCP lifecycle matrix', () => {
  it.each(Object.entries(EXPECTED_BY_STATE) as [WorkflowState, readonly string[]][])(
    'returns the exact ordered tools for %s',
    (state, expected) => {
      expect(desiredToolNames(state)).toEqual(expected);
      expect(TOOL_NAMES_BY_STATE[state]).toEqual(expected);
      expect(Object.isFrozen(TOOL_NAMES_BY_STATE[state])).toBe(true);
    },
  );

  it('freezes the state map and returns stable array identities', () => {
    expect(Object.isFrozen(TOOL_NAMES_BY_STATE)).toBe(true);

    for (const state of Object.keys(EXPECTED_BY_STATE) as WorkflowState[]) {
      expect(desiredToolNames(state)).toBe(desiredToolNames(state));
    }
  });

  it('exposes consequential and contact tools only in their authorized states', () => {
    for (const state of Object.keys(EXPECTED_BY_STATE) as WorkflowState[]) {
      expect(desiredToolNames(state).includes('commit_assignment_plan')).toBe(state === 'APPROVED');
      expect(desiredToolNames(state).includes('access_dispatch_contacts')).toBe(
        state === 'COMMITTED',
      );
    }
  });

  it('keeps human-only actions absent from every state', () => {
    const allNames = new Set<string>(Object.values(TOOL_NAMES_BY_STATE).flat());

    for (const forbiddenName of [
      'lock_assignment',
      'unlock_assignment',
      'approve_plan',
      'reject_plan',
      'cancel_approval',
      'discard_draft',
      'reset_demo',
    ]) {
      expect(allNames.has(forbiddenName)).toBe(false);
    }
  });
});
