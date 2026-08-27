import {
  selectAssignmentDraft,
  selectAuditHistory,
  selectAvailableVolunteers,
  selectCommittedPlan,
  selectCoordinationOverview,
  selectDispatchContacts,
  selectOpenRequests,
} from '../app/selectors.ts';
import type { AppStore, StoreDispatchResult } from '../app/store.ts';
import {
  requestId,
  volunteerId,
  type AppState,
  type Assignment,
  type Priority,
  type RequestId,
  type TimeOfDay,
  type VolunteerId,
  type Zone,
} from '../domain/types.ts';
import { TOOL_NAMES, type ToolName } from './contracts.ts';
import { desiredToolNames } from './lifecycle.ts';
import { validateToolInput } from './schemas.ts';

export interface ToolHandlerOptions {
  readonly signal?: AbortSignal;
}

export interface ToolExecutionError {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly reference?: string;
  readonly details?: unknown;
}

export interface ToolExecutionSuccess<Data = unknown> {
  readonly ok: true;
  readonly data: Data;
  readonly nextActions: readonly ToolName[];
}

export interface ToolExecutionFailure {
  readonly ok: false;
  readonly error: ToolExecutionError;
  readonly nextActions: readonly ToolName[];
}

export type ToolExecutionResult<Data = unknown> =
  | ToolExecutionSuccess<Data>
  | ToolExecutionFailure;

export type ToolHandler = (
  input: unknown,
  options?: ToolHandlerOptions,
) => Promise<ToolExecutionResult>;

export type ToolHandlerMap = Readonly<Record<ToolName, ToolHandler>>;

export interface ToolHandlerDependencies {
  readonly nextErrorReference: () => string;
}

interface AssignedDraftInput {
  readonly requestId: string;
  readonly volunteerId: string;
  readonly startTime: string;
}

interface RevisionInput {
  readonly action: 'SET_ASSIGNMENT' | 'SET_UNASSIGNED';
  readonly requestId: string;
  readonly volunteerId?: string;
  readonly startTime?: string;
}

const PRIORITY_FILTERS = Object.freeze({
  URGENT: 'high',
  HIGH: 'medium',
  NORMAL: 'low',
} satisfies Record<string, Priority>);

const ZONE_FILTERS = Object.freeze({
  NORTH: 'north',
  CENTRAL: 'center',
  EAST: 'east',
  SOUTH: 'south',
} satisfies Record<string, Zone>);

function objectInput(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function boundedActions(state: AppState, currentName?: ToolName): readonly ToolName[] {
  return Object.freeze(
    desiredToolNames(state.workflowState)
      .filter((name) => name !== currentName)
      .slice(0, 4),
  );
}

function safeState(store: AppStore): AppState | null {
  try {
    return store.getState();
  } catch {
    return null;
  }
}

function success<Data>(
  data: Data,
  state: AppState,
  currentName: ToolName,
): ToolExecutionSuccess<Data> {
  return Object.freeze({
    ok: true,
    data,
    nextActions: boundedActions(state, currentName),
  });
}

function failure(
  code: string,
  state: AppState | null,
  currentName: ToolName,
  options: {
    readonly message?: string;
    readonly retryable?: boolean;
    readonly reference?: string;
    readonly details?: unknown;
  } = {},
): ToolExecutionFailure {
  const error = Object.freeze({
    code,
    message: options.message ?? code,
    retryable: options.retryable ?? false,
    ...(options.reference === undefined ? {} : { reference: options.reference }),
    ...(options.details === undefined ? {} : { details: options.details }),
  });

  return Object.freeze({
    ok: false,
    error,
    nextActions: state === null ? Object.freeze([]) : boundedActions(state, currentName),
  });
}

function storeFailure(
  result: Extract<StoreDispatchResult, { readonly ok: false }>,
  currentName: ToolName,
): ToolExecutionFailure {
  return failure(result.error.code, result.state, currentName, {
    retryable:
      result.error.code === 'STALE_DRAFT_VERSION' ||
      result.error.code === 'PERSISTENCE_WRITE_FAILED',
  });
}

function internalFailure(
  store: AppStore,
  currentName: ToolName,
  dependencies: ToolHandlerDependencies,
): ToolExecutionFailure {
  let reference = 'ERROR-UNAVAILABLE';
  try {
    reference = dependencies.nextErrorReference().slice(0, 80) || reference;
  } catch {
    // Opaque fallback only.
  }

  return failure('INTERNAL_ERROR', safeState(store), currentName, {
    message: 'The tool could not complete safely.',
    retryable: true,
    reference,
  });
}

function requestDuration(state: AppState, id: RequestId): number {
  return state.scenario.requests.find(({ id: candidate }) => candidate === id)?.durationMinutes ?? 1;
}

function createAssignments(state: AppState, input: Record<string, unknown>): readonly Assignment[] {
  const assigned = input.assignments as readonly AssignedDraftInput[];
  const unassigned = input.unassignedRequestIds as readonly string[];

  return Object.freeze([
    ...assigned.map(({ requestId: requestValue, volunteerId: volunteerValue, startTime }) => {
      const id = requestId(requestValue);
      return Object.freeze({
        requestId: id,
        volunteerId: volunteerId(volunteerValue),
        startTime: startTime as TimeOfDay,
        durationMinutes: requestDuration(state, id),
        status: 'planned' as const,
        lockedByHuman: false,
      });
    }),
    ...unassigned.map((requestValue) => {
      const id = requestId(requestValue);
      return Object.freeze({
        requestId: id,
        volunteerId: null,
        startTime: null,
        durationMinutes: requestDuration(state, id),
        status: 'unassigned' as const,
        lockedByHuman: false,
      });
    }),
  ]);
}

function reviseAssignments(
  state: Extract<AppState, { readonly draft: NonNullable<AppState['draft']> }>,
  input: Record<string, unknown>,
): readonly Assignment[] | ToolExecutionFailure {
  const changes = input.changes as readonly RevisionInput[];
  const changesByRequest = new Map<RequestId, RevisionInput>();
  const knownRequests = new Set(state.scenario.requests.map(({ id }) => id));

  for (const change of changes) {
    const id = requestId(change.requestId);
    if (!knownRequests.has(id)) {
      return failure('UNKNOWN_REQUEST', state, 'revise_assignment_draft');
    }
    changesByRequest.set(id, change);
  }

  return Object.freeze(
    state.draft.assignments.map((assignment) => {
      const change = changesByRequest.get(assignment.requestId);
      if (change === undefined) return Object.freeze({ ...assignment });

      if (change.action === 'SET_UNASSIGNED') {
        return Object.freeze({
          ...assignment,
          volunteerId: null,
          startTime: null,
          status: 'unassigned' as const,
        });
      }

      return Object.freeze({
        ...assignment,
        volunteerId: volunteerId(change.volunteerId ?? ''),
        startTime: (change.startTime ?? '') as TimeOfDay,
        status: 'planned' as const,
      });
    }),
  );
}

function withGuard(
  name: ToolName,
  store: AppStore,
  dependencies: ToolHandlerDependencies,
  operation: (input: Record<string, unknown>, state: AppState) => Promise<ToolExecutionResult>,
): ToolHandler {
  return async (input) => {
    const validation = validateToolInput(name, input);
    if (!validation.ok) {
      return failure('INVALID_INPUT', safeState(store), name, {
        message: validation.error.message,
        retryable: validation.error.retryable,
        details: validation.error.details,
      });
    }

    try {
      const state = store.getState();
      if (!desiredToolNames(state.workflowState).includes(name)) {
        return failure('INVALID_STATE', state, name);
      }
      return await operation(objectInput(validation.value), state);
    } catch {
      return internalFailure(store, name, dependencies);
    }
  };
}

export function createToolHandlers(
  store: AppStore,
  dependencies: ToolHandlerDependencies,
): ToolHandlerMap {
  const handlers = {
    get_coordination_overview: withGuard(
      'get_coordination_overview',
      store,
      dependencies,
      async (_input, state) =>
        success(selectCoordinationOverview(state), state, 'get_coordination_overview'),
    ),

    list_open_requests: withGuard(
      'list_open_requests',
      store,
      dependencies,
      async (input, state) => {
        const priority = input.priority as string | undefined;
        const zone = input.zone as string | undefined;
        const requests = selectOpenRequests(state).filter(
          (request) =>
            (priority === undefined ||
              priority === 'ANY' ||
              request.priority === PRIORITY_FILTERS[priority]) &&
            (zone === undefined || zone === 'ANY' || request.zone === ZONE_FILTERS[zone]),
        );
        return success(Object.freeze(requests), state, 'list_open_requests');
      },
    ),

    list_available_volunteers: withGuard(
      'list_available_volunteers',
      store,
      dependencies,
      async (input, state) => {
        const zone = input.zone as string | undefined;
        const volunteers = selectAvailableVolunteers(state).filter(
          (volunteer) =>
            zone === undefined || zone === 'ANY' || volunteer.zone === ZONE_FILTERS[zone],
        );
        return success(Object.freeze(volunteers), state, 'list_available_volunteers');
      },
    ),

    create_assignment_draft: withGuard(
      'create_assignment_draft',
      store,
      dependencies,
      async (input, state) => {
        const result = await store.dispatch({
          type: 'CREATE_DRAFT',
          actor: 'agent',
          assignments: createAssignments(state, input),
        });
        if (!result.ok) return storeFailure(result, 'create_assignment_draft');
        return success(
          selectAssignmentDraft(result.state),
          result.state,
          'create_assignment_draft',
        );
      },
    ),

    get_assignment_draft: withGuard(
      'get_assignment_draft',
      store,
      dependencies,
      async (input, state) => {
        const draft = selectAssignmentDraft(state);
        if (draft === null) return failure('INVALID_STATE', state, 'get_assignment_draft');
        if (input.includeIssues === false) {
          return success(
            Object.freeze({
              ...draft,
              errors: Object.freeze([]),
              warnings: Object.freeze([]),
            }),
            state,
            'get_assignment_draft',
          );
        }
        return success(draft, state, 'get_assignment_draft');
      },
    ),

    validate_assignment_draft: withGuard(
      'validate_assignment_draft',
      store,
      dependencies,
      async (input, state) => {
        if (state.draft === null) {
          return failure('INVALID_STATE', state, 'validate_assignment_draft');
        }
        const expectedVersion = input.expectedDraftVersion as number;
        if (state.draft.version !== expectedVersion) {
          return failure('STALE_DRAFT_VERSION', state, 'validate_assignment_draft', {
            retryable: true,
          });
        }
        return success(
          Object.freeze({
            draftVersion: state.draft.version,
            valid: state.draft.validation.valid,
            errors: state.draft.validation.errors,
            warnings: state.draft.validation.warnings,
          }),
          state,
          'validate_assignment_draft',
        );
      },
    ),

    revise_assignment_draft: withGuard(
      'revise_assignment_draft',
      store,
      dependencies,
      async (input, state) => {
        if (state.draft === null) {
          return failure('INVALID_STATE', state, 'revise_assignment_draft');
        }
        const assignments = reviseAssignments(
          state as Extract<AppState, { readonly draft: NonNullable<AppState['draft']> }>,
          input,
        );
        if ('ok' in assignments) return assignments;

        const result = await store.dispatch({
          type: 'REVISE_DRAFT',
          actor: 'agent',
          expectedDraftVersion: input.expectedDraftVersion as number,
          assignments,
        });
        if (!result.ok) return storeFailure(result, 'revise_assignment_draft');
        return success(
          selectAssignmentDraft(result.state),
          result.state,
          'revise_assignment_draft',
        );
      },
    ),

    prepare_plan_approval: withGuard(
      'prepare_plan_approval',
      store,
      dependencies,
      async (input) => {
        const result = await store.dispatch({
          type: 'PREPARE_APPROVAL',
          actor: 'agent',
          expectedDraftVersion: input.expectedDraftVersion as number,
        });
        if (!result.ok) return storeFailure(result, 'prepare_plan_approval');
        return success(
          selectAssignmentDraft(result.state),
          result.state,
          'prepare_plan_approval',
        );
      },
    ),

    commit_assignment_plan: withGuard(
      'commit_assignment_plan',
      store,
      dependencies,
      async (input) => {
        const result = await store.dispatch({
          type: 'COMMIT_PLAN',
          actor: 'agent',
          expectedDraftVersion: input.expectedDraftVersion as number,
        });
        if (!result.ok) return storeFailure(result, 'commit_assignment_plan');
        const plan = selectCommittedPlan(result.state);
        if (plan === null) return failure('INTERNAL_ERROR', result.state, 'commit_assignment_plan');
        return success(plan, result.state, 'commit_assignment_plan');
      },
    ),

    get_committed_plan: withGuard(
      'get_committed_plan',
      store,
      dependencies,
      async (_input, state) => {
        const plan = selectCommittedPlan(state);
        return plan === null
          ? failure('INVALID_STATE', state, 'get_committed_plan')
          : success(plan, state, 'get_committed_plan');
      },
    ),

    access_dispatch_contacts: withGuard(
      'access_dispatch_contacts',
      store,
      dependencies,
      async (input, state) => {
        const ids = (input.requestIds as readonly string[]).map(requestId);
        const selected = selectDispatchContacts(state, ids);
        if (!selected.ok) {
          return failure(selected.error.code, state, 'access_dispatch_contacts');
        }

        const result = await store.dispatch({
          type: 'ACCESS_CONTACTS',
          actor: 'agent',
          requestIds: ids,
        });
        if (!result.ok) return storeFailure(result, 'access_dispatch_contacts');
        return success(selected.contacts, result.state, 'access_dispatch_contacts');
      },
    ),

    get_audit_history: withGuard(
      'get_audit_history',
      store,
      dependencies,
      async (input, state) => {
        const limit = (input.limit as number | undefined) ?? 20;
        return success(
          Object.freeze(selectAuditHistory(state).slice(-limit)),
          state,
          'get_audit_history',
        );
      },
    ),
  } satisfies Record<ToolName, ToolHandler>;

  const ordered = Object.fromEntries(TOOL_NAMES.map((name) => [name, handlers[name]]));
  return Object.freeze(ordered) as unknown as ToolHandlerMap;
}
