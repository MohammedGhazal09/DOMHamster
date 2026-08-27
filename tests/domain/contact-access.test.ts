import { describe, expect, it } from 'vitest';
import { reduceCommand, type Command } from '../../src/domain/commands.ts';
import { requestId } from '../../src/domain/types.ts';
import { commandDependencies, workflowStates } from '../helpers/webmcp-fixtures.ts';

function accessCommand(
  actor: 'agent' | 'human' | 'system',
  requestIds: readonly string[],
): Command {
  return {
    type: 'ACCESS_CONTACTS',
    actor,
    requestIds: requestIds.map((value) => requestId(value)),
  } as unknown as Command;
}

describe('post-commit contact-access audit command', () => {
  it('appends a safe audit event while preserving the committed plan', () => {
    const dependencies = commandDependencies();
    const state = workflowStates().COMMITTED;
    const result = reduceCommand(state, accessCommand('agent', ['R-101', 'R-104']), dependencies);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.code);
    expect(result.state.workflowState).toBe('COMMITTED');
    expect(result.state.committedPlan).toBe(state.committedPlan);
    expect(result.state.auditHistory).toHaveLength(state.auditHistory.length + 1);
    expect(result.state.auditHistory.at(-1)).toMatchObject({
      type: 'CONTACTS_ACCESSED',
      actor: 'agent',
      draftVersion: 1,
    });
    expect(result.state.auditHistory.at(-1)?.safeSummary).not.toContain('R-101');
    expect(JSON.stringify(result.state.auditHistory.at(-1))).not.toContain('Fictional phone');
  });

  it('rejects non-agent access and pre-commit access without mutation', () => {
    const dependencies = commandDependencies();

    for (const [state, command] of [
      [workflowStates().COMMITTED, accessCommand('human', ['R-101'])],
      [workflowStates().DRAFT_VALID, accessCommand('agent', ['R-101'])],
    ] as const) {
      const result = reduceCommand(state, command, dependencies);
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('TEST_EXPECTED_ACCESS_FAILURE');
      expect(result.error.code).toBe('INVALID_STATE');
      expect(result.state).toBe(state);
    }
  });

  it('rejects duplicate, unknown, and unassigned request identifiers', () => {
    const dependencies = commandDependencies();
    const state = workflowStates().COMMITTED;

    for (const [ids, code] of [
      [['R-101', 'R-101'], 'INVALID_INPUT'],
      [['R-999'], 'UNKNOWN_REQUEST'],
    ] as const) {
      const result = reduceCommand(state, accessCommand('agent', ids), dependencies);
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('TEST_EXPECTED_ACCESS_FAILURE');
      expect(result.error.code).toBe(code);
      expect(result.state).toBe(state);
    }
  });
});
