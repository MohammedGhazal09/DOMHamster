import { describe, expect, it } from 'vitest';
import { reduceCommand } from '../../src/domain/commands.ts';
import {
  commandDependencies,
  expectCommandSuccess,
  workflowStates,
} from '../helpers/webmcp-fixtures.ts';

describe('active approval cancellation', () => {
  it('returns an approved version to DRAFT_VALID without discarding the draft', () => {
    const approved = workflowStates().APPROVED;
    if (approved.workflowState !== 'APPROVED') {
      throw new Error('TEST_EXPECTED_APPROVED_STATE');
    }

    const result = expectCommandSuccess(
      reduceCommand(
        approved,
        {
          type: 'CANCEL_APPROVAL',
          actor: 'human',
          expectedDraftVersion: approved.draft.version,
        },
        commandDependencies(),
      ),
    );

    expect(result.workflowState).toBe('DRAFT_VALID');
    expect(result.draft?.id).toBe(approved.draft.id);
    expect(result.draft?.version).toBe(approved.draft.version);
    expect(result.approval).toBeNull();
    expect(result.auditHistory.at(-1)?.type).toBe('APPROVAL_CANCELLED');
  });
});
