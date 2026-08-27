import { describe, expect, it } from 'vitest';
import {
  reduceCommand,
  type CommandDependencies,
  type CommandResult,
} from '../../src/domain/commands';
import { CANONICAL_SCENARIO } from '../../src/domain/seed';
import {
  requestId,
  type AppState,
  type AuditEventId,
  type PlanId,
  type ReadyState,
  type RequestId,
} from '../../src/domain/types';
import {
  selectAssignmentDraft,
  selectAuditHistory,
  selectAvailableVolunteers,
  selectCommittedPlan,
  selectCoordinationOverview,
  selectDispatchContacts,
  selectOpenRequests,
} from '../../src/app/selectors';
import { replaceAssignment, validAssignments } from '../fixtures/drafts';

function readyState(): ReadyState {
  return Object.freeze({
    workflowState: 'READY',
    scenario: CANONICAL_SCENARIO,
    draft: null,
    approval: null,
    committedPlan: null,
    auditHistory: Object.freeze([]),
  });
}

function dependencies(): CommandDependencies & { setNow(value: string): void } {
  let planSequence = 0;
  let auditSequence = 0;
  let currentTime = '2026-08-26T12:00:00.000Z';
  return {
    scenario: CANONICAL_SCENARIO,
    now: () => currentTime,
    nextPlanId: () => `PLAN-${++planSequence}` as PlanId,
    nextAuditEventId: () => `AUDIT-${++auditSequence}` as AuditEventId,
    setNow(value) {
      currentTime = value;
    },
  };
}

function success(result: CommandResult): AppState {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.code);
  return result.state;
}

function draftState(deps: CommandDependencies, assignments = validAssignments()): AppState {
  return success(
    reduceCommand(readyState(), { type: 'CREATE_DRAFT', actor: 'agent', assignments }, deps),
  );
}

function committedState(
  deps: CommandDependencies & { setNow(value: string): void },
  assignments = validAssignments(),
): AppState {
  const draft = draftState(deps, assignments);
  const awaiting = success(
    reduceCommand(
      draft,
      {
        type: 'PREPARE_APPROVAL',
        actor: 'agent',
        expectedDraftVersion: draft.draft!.version,
      },
      deps,
    ),
  );
  deps.setNow('2026-08-26T12:00:30.000Z');
  const approved = success(
    reduceCommand(
      awaiting,
      {
        type: 'APPROVE',
        actor: 'human',
        expectedDraftVersion: awaiting.draft!.version,
      },
      deps,
    ),
  );
  return success(
    reduceCommand(
      approved,
      {
        type: 'COMMIT_PLAN',
        actor: 'agent',
        expectedDraftVersion: approved.draft!.version,
      },
      deps,
    ),
  );
}

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

function publicSelectorResults(state: AppState): unknown[] {
  return [
    selectCoordinationOverview(state),
    selectOpenRequests(state),
    selectAvailableVolunteers(state),
    selectAssignmentDraft(state),
    selectCommittedPlan(state),
    selectAuditHistory(state),
  ];
}

describe('allowlisted public selectors', () => {
  it('never exposes restricted keys or known contact values before commit', () => {
    const deps = dependencies();
    const ready = readyState();
    const draft = draftState(deps);
    const invalidDraft = success(
      reduceCommand(
        draft,
        {
          type: 'EDIT_ASSIGNMENT',
          actor: 'human',
          expectedDraftVersion: draft.draft!.version,
          requestId: requestId('R-105'),
          patch: { startTime: '10:00' },
        },
        deps,
      ),
    );
    const awaiting = success(
      reduceCommand(
        draft,
        {
          type: 'PREPARE_APPROVAL',
          actor: 'agent',
          expectedDraftVersion: draft.draft!.version,
        },
        deps,
      ),
    );
    const approved = success(
      reduceCommand(
        awaiting,
        {
          type: 'APPROVE',
          actor: 'human',
          expectedDraftVersion: awaiting.draft!.version,
        },
        deps,
      ),
    );

    for (const state of [ready, draft, invalidDraft, awaiting, approved]) {
      expect(publicSelectorResults(state).flatMap((value) => privacyLeaks(value))).toEqual([]);
    }
  });

  it('returns stable operational request, volunteer, draft, and overview fields', () => {
    const state = draftState(dependencies());
    const overview = selectCoordinationOverview(state);
    const requests = selectOpenRequests(state);
    const volunteers = selectAvailableVolunteers(state);
    const draft = selectAssignmentDraft(state);

    expect(overview).toMatchObject({
      workflowState: 'DRAFT_VALID',
      requestCount: 8,
      volunteerCount: 5,
      draftVersion: 1,
      validationErrorCount: 0,
    });
    expect(requests).toHaveLength(8);
    expect(requests[0]).toMatchObject({
      id: 'R-101',
      type: 'delivery',
      zone: 'north',
      untrustedNote: '[UNTRUSTED] Fragile groceries; no personal contact details included.',
    });
    expect(volunteers).toHaveLength(5);
    expect(volunteers[0]).toMatchObject({ id: 'V-01', assignedCount: 2 });
    expect(draft).toMatchObject({ version: 1, valid: true });
    expect(Object.isFrozen(requests)).toBe(true);
    expect(Object.isFrozen(requests[0])).toBe(true);
  });
});

describe('restricted post-commit dispatch contact selector', () => {
  it('returns only explicitly requested assigned contacts after commit', () => {
    const state = committedState(dependencies());
    const result = selectDispatchContacts(state, [requestId('R-101')]);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.code);
    expect(result.contacts).toEqual([
      {
        requestId: 'R-101',
        recipientAlias: 'Recipient 101',
        fictionalLocation: 'Fictional Address 101, North Zone',
        fictionalContactChannel: 'Fictional phone +966 00 000 0101',
        boundedInstructions: '[UNTRUSTED] Fragile groceries; no personal contact details included.',
      },
    ]);
    const serialized = JSON.stringify(result);
    expect(serialized.includes('Recipient 102')).toBe(false);
    expect(Object.isFrozen(result.contacts)).toBe(true);
  });

  it('rejects contact access outside COMMITTED', () => {
    const result = selectDispatchContacts(draftState(dependencies()), [requestId('R-101')]);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('TEST_EXPECTED_FAILURE');
    expect(result.error.code).toBe('INVALID_STATE');
  });

  it('rejects empty, duplicate, unknown, and unassigned request IDs', () => {
    const committed = committedState(dependencies());
    const duplicate = selectDispatchContacts(committed, [requestId('R-101'), requestId('R-101')]);
    const empty = selectDispatchContacts(committed, []);
    const unknown = selectDispatchContacts(committed, [requestId('R-999')]);

    for (const result of [duplicate, empty]) {
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('TEST_EXPECTED_FAILURE');
      expect(result.error.code).toBe('INVALID_INPUT');
    }
    expect(unknown.ok).toBe(false);
    if (unknown.ok) throw new Error('TEST_EXPECTED_FAILURE');
    expect(unknown.error.code).toBe('UNKNOWN_REQUEST');

    const unassignedAssignments = replaceAssignment(validAssignments(), requestId('R-108'), {
      volunteerId: null,
      startTime: null,
      status: 'unassigned',
    });
    const committedWithUnassigned = committedState(dependencies(), unassignedAssignments);
    const unassigned = selectDispatchContacts(committedWithUnassigned, [requestId('R-108')]);

    expect(unassigned.ok).toBe(false);
    if (unassigned.ok) throw new Error('TEST_EXPECTED_FAILURE');
    expect(unassigned.error.code).toBe('REQUEST_NOT_ASSIGNED');
  });

  it('preserves explicit request ordering without widening the scope', () => {
    const state = committedState(dependencies());
    const requested: RequestId[] = [requestId('R-103'), requestId('R-101')];
    const result = selectDispatchContacts(state, requested);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.code);
    expect(result.contacts.map(({ requestId: id }) => id)).toEqual(requested);
  });
});
