import { describe, expect, it } from 'vitest';
import type { AppStore } from '../../src/app/store.ts';
import { CANONICAL_SCENARIO } from '../../src/domain/seed.ts';
import type { AppState } from '../../src/domain/types.ts';
import { TOOL_CONTRACT_BY_NAME } from '../../src/webmcp/contracts.ts';
import { createToolHandlers } from '../../src/webmcp/handlers.ts';
import { desiredToolNames } from '../../src/webmcp/lifecycle.ts';
import {
  createTestStore,
  minimumToolInput,
  prepareApproveAndCommit,
  workflowStates,
} from '../helpers/webmcp-fixtures.ts';

const RESTRICTED_KEYS = new Set([
  'privateContacts',
  'recipientAlias',
  'fictionalLocation',
  'fictionalContactChannel',
  'contactDetails',
  'exactLocation',
]);
const RESTRICTED_VALUES = new Set(
  Object.values(CANONICAL_SCENARIO.privateContacts).flatMap((contact) => [
    contact.recipientAlias,
    contact.fictionalLocation,
    contact.fictionalContactChannel,
  ]),
);

function privacyLeaks(value: unknown, path = '$'): string[] {
  const leaks: string[] = [];
  if (typeof value === 'string' && RESTRICTED_VALUES.has(value)) {
    leaks.push(`${path}:restricted-value`);
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => leaks.push(...privacyLeaks(entry, `${path}[${index}]`)));
    return leaks;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      if (RESTRICTED_KEYS.has(key)) leaks.push(`${path}.${key}:restricted-key`);
      leaks.push(...privacyLeaks(entry, `${path}.${key}`));
    }
  }
  return leaks;
}

function fixedStore(state: AppState): AppStore {
  return {
    getState: () => state,
    dispatch() {
      return Promise.reject(new Error('SECURITY_READ_TOOL_MUST_NOT_DISPATCH'));
    },
    subscribe() {
      return () => undefined;
    },
  };
}

describe('privacy boundary security contract', () => {
  it('keeps restricted keys and known fictional contact values out of every pre-commit read tool', async () => {
    const states = workflowStates();

    for (const stateName of [
      'READY',
      'DRAFT_INVALID',
      'DRAFT_VALID',
      'AWAITING_APPROVAL',
      'APPROVED',
    ] as const) {
      const state = states[stateName];
      const handlers = createToolHandlers(fixedStore(state), {
        nextErrorReference: () => 'ERROR-PRIVACY-1',
      });
      const readTools = desiredToolNames(state.workflowState).filter(
        (name) => TOOL_CONTRACT_BY_NAME[name].annotations.readOnlyHint,
      );

      for (const name of readTools) {
        const input =
          name === 'validate_assignment_draft'
            ? { expectedDraftVersion: state.draft?.version ?? 1 }
            : minimumToolInput(name);
        const result = await handlers[name](input);
        expect(privacyLeaks(result), `${stateName}:${name}`).toEqual([]);
      }
    }
  });

  it('returns only explicitly requested assigned contacts after commit', async () => {
    const { store, dependencies } = createTestStore();
    await prepareApproveAndCommit(store, dependencies);
    const handlers = createToolHandlers(store, {
      nextErrorReference: () => 'ERROR-PRIVACY-2',
    });

    const result = await handlers.access_dispatch_contacts({ requestIds: ['R-101'] });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.code);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({ requestId: 'R-101' });

    const serialized = JSON.stringify(result);
    expect(serialized).toContain('Recipient 101');
    expect(serialized).not.toContain('Recipient 102');
    expect(serialized).not.toContain('Fictional Address 102');
    expect(serialized).not.toContain('Fictional phone +966 00 000 0102');
    expect(store.getState().auditHistory.at(-1)?.type).toBe('CONTACTS_ACCESSED');
  });
});
