import type { WorkflowState } from '../domain/types.ts';
import type { ToolName } from './contracts.ts';

function freezeNames<const Names extends readonly ToolName[]>(names: Names): Names {
  return Object.freeze(names);
}

export const TOOL_NAMES_BY_STATE = Object.freeze({
  READY: freezeNames([
    'get_coordination_overview',
    'list_open_requests',
    'list_available_volunteers',
    'create_assignment_draft',
    'get_audit_history',
  ]),
  DRAFT_INVALID: freezeNames([
    'get_coordination_overview',
    'list_open_requests',
    'list_available_volunteers',
    'get_assignment_draft',
    'validate_assignment_draft',
    'revise_assignment_draft',
    'get_audit_history',
  ]),
  DRAFT_VALID: freezeNames([
    'get_coordination_overview',
    'list_open_requests',
    'list_available_volunteers',
    'get_assignment_draft',
    'validate_assignment_draft',
    'revise_assignment_draft',
    'prepare_plan_approval',
    'get_audit_history',
  ]),
  AWAITING_APPROVAL: freezeNames([
    'get_assignment_draft',
    'validate_assignment_draft',
    'get_audit_history',
  ]),
  APPROVED: freezeNames([
    'get_assignment_draft',
    'validate_assignment_draft',
    'commit_assignment_plan',
    'get_audit_history',
  ]),
  COMMITTED: freezeNames([
    'get_committed_plan',
    'access_dispatch_contacts',
    'get_audit_history',
  ]),
} satisfies Record<WorkflowState, readonly ToolName[]>);

export function desiredToolNames(state: WorkflowState): readonly ToolName[] {
  return TOOL_NAMES_BY_STATE[state];
}
