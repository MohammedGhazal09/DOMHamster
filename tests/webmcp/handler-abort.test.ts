import { describe, expect, it } from 'vitest';
import type { AppStore } from '../../src/app/store.ts';
import { createToolHandlers } from '../../src/webmcp/handlers.ts';
import {
  createTestStore,
  validDraftToolInput,
} from '../helpers/webmcp-fixtures.ts';

describe('WebMCP execution cancellation', () => {
  it('returns EXECUTION_ABORTED before consulting application state', async () => {
    const sentinel = 'DO_NOT_READ_ABORTED_STATE';
    const store: AppStore = {
      getState() {
        throw new Error(sentinel);
      },
      dispatch() {
        return Promise.reject(new Error(sentinel));
      },
      subscribe() {
        return () => undefined;
      },
    };
    const handlers = createToolHandlers(store, {
      nextErrorReference: () => 'ERROR-ABORT-1',
    });
    const controller = new AbortController();
    controller.abort();

    const result = await handlers.get_coordination_overview(
      {},
      { signal: controller.signal },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('TEST_EXPECTED_ABORT_FAILURE');
    expect(result.error).toMatchObject({
      code: 'EXECUTION_ABORTED',
      retryable: true,
    });
    expect(JSON.stringify(result)).not.toContain(sentinel);
  });

  it('does not mutate or persist when a write tool is already aborted', async () => {
    const { store, savedStates } = createTestStore();
    const handlers = createToolHandlers(store, {
      nextErrorReference: () => 'ERROR-ABORT-2',
    });
    const controller = new AbortController();
    controller.abort();
    const before = store.getState();

    const result = await handlers.create_assignment_draft(
      validDraftToolInput(),
      { signal: controller.signal },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('TEST_EXPECTED_ABORT_FAILURE');
    expect(result.error.code).toBe('EXECUTION_ABORTED');
    expect(store.getState()).toBe(before);
    expect(store.getState().workflowState).toBe('READY');
    expect(store.getState().auditHistory).toEqual([]);
    expect(savedStates).toEqual([]);
  });
});
