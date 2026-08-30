import {
  selectAssignmentDraft,
  selectAuditHistory,
  selectAvailableVolunteers,
  selectCommittedPlan,
  selectCoordinationOverview,
  selectDispatchContacts,
  selectOpenRequests,
  type AssignmentDraftView,
  type AuditEventView,
  type CommittedPlanView,
  type CoordinationOverviewView,
  type DispatchContactView,
  type PublicRequestView,
  type PublicValidationIssueView,
  type PublicVolunteerView,
} from '../app/selectors.ts';
import type { AppStore, StoreDispatchResult } from '../app/store.ts';
import {
  requestId,
  volunteerId,
  type AppState,
  type ApprovedState,
  type Assignment,
  type AwaitingApprovalState,
  type DraftState,
  type Priority,
  type RequestId,
  type TimeOfDay,
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

export type ToolExecutionResult<Data = unknown> = ToolExecutionSuccess<Data> | ToolExecutionFailure;

export interface DraftValidationView {
  readonly draftVersion: number;
  readonly valid: boolean;
  readonly errors: readonly PublicValidationIssueView[];
  readonly warnings: readonly PublicValidationIssueView[];
}

export interface ToolOutputMap {
  readonly get_coordination_overview: CoordinationOverviewView;
  readonly list_open_requests: readonly PublicRequestView[];
  readonly list_available_volunteers: readonly PublicVolunteerView[];
  readonly create_assignment_draft: AssignmentDraftView;
  readonly get_assignment_draft: AssignmentDraftView;
  readonly validate_assignment_draft: DraftValidationView;
  readonly revise_assignment_draft: AssignmentDraftView;
  readonly prepare_plan_approval: AssignmentDraftView;
  readonly commit_assignment_plan: CommittedPlanView;
  readonly get_committed_plan: CommittedPlanView;
  readonly access_dispatch_contacts: readonly DispatchContactView[];
  readonly get_audit_history: readonly AuditEventView[];
}

export type ToolHandler<Name extends ToolName = ToolName> = (
  input: unknown,
  options?: ToolHandlerOptions,
) => Promise<ToolExecutionResult<ToolOutputMap[Name]>>;

export type ToolHandlerMap = Readonly<{
  readonly [Name in ToolName]: ToolHandler<Name>;
}>;

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

type DraftBearingState = DraftState | AwaitingApprovalState | ApprovedState;

const PRIORITY_FILTERS: Readonly<Record<string, Priority>> = Object.freeze({
  URGENT: 'high',
  HIGH: 'medium',
  NORMAL: 'low',
});

const ZONE_FILTERS: Readonly<Record<string, Zone>> = Object.freeze({
  NORTH: 'north',
  CENTRAL: 'center',
  EAST: 'east',
  SOUTH: 'south',
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function objectInput(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('DOMHAMSTER_SCHEMA_OBJECT_INVARIANT');
  return value;
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string') throw new Error('DOMHAMSTER_SCHEMA_STRING_INVARIANT');
  return value;
}

function requiredNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== 'number') throw new Error('DOMHAMSTER_SCHEMA_NUMBER_INVARIANT');
  return value;
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error('DOMHAMSTER_SCHEMA_STRING_INVARIANT');
  return value;
}

function assignedDraftInputs(value: unknown): readonly AssignedDraftInput[] {
  if (!Array.isArray(value)) throw new Error('DOMHAMSTER_SCHEMA_ARRAY_INVARIANT');
  return value.map((entry) => {
    const record = objectInput(entry);
    return Object.freeze({
      requestId: requiredString(record, 'requestId'),
      volunteerId: requiredString(record, 'volunteerId'),
      startTime: requiredString(record, 'startTime'),
    });
  });
}

function revisionInputs(value: unknown): readonly RevisionInput[] {
  if (!Array.isArray(value)) throw new Error('DOMHAMSTER_SCHEMA_ARRAY_INVARIANT');
  return value.map((entry) => {
    const record = objectInput(entry);
    const action = requiredString(record, 'action');
    if (action !== 'SET_ASSIGNMENT' && action !== 'SET_UNASSIGNED') {
      throw new Error('DOMHAMSTER_SCHEMA_ACTION_INVARIANT');
    }
    const volunteerValue = optionalString(record, 'volunteerId');
    const startTimeValue = optionalString(record, 'startTime');
    return Object.freeze({
      action,
      requestId: requiredString(record, 'requestId'),
      ...(volunteerValue === undefined ? {} : { volunteerId: volunteerValue }),
      ...(startTimeValue === undefined ? {} : { startTime: startTimeValue }),
    });
  });
}

function requestIdInputs(value: unknown): readonly RequestId[] {
  if (!Array.isArray(value)) throw new Error('DOMHAMSTER_SCHEMA_ARRAY_INVARIANT');
  return value.map((entry) => {
    if (typeof entry !== 'string') throw new Error('DOMHAMSTER_SCHEMA_STRING_INVARIANT');
    return requestId(entry);
  });
}

function isDraftBearingState(state: AppState): state is DraftBearingState {
  return state.draft !== null;
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

function executionAborted(options?: ToolHandlerOptions): boolean {
  return options?.signal?.aborted === true;
}

function executionAbortedFailure(currentName: ToolName): ToolExecutionFailure {
  return failure('EXECUTION_ABORTED', null, currentName, {
    message: 'The tool execution was cancelled before it began.',
    retryable: true,
  });
}

function storeFailure(
  result: Extract<StoreDispatchResult, { readonly ok: false }>,
  currentName: ToolName,
): ToolExecutionFailure {
  return failure(result.error.code, result.state, currentName, {
    message: result.error.message,
    retryable:
      result.error.code === 'INVALID_INPUT' ||
      result.error.code === 'STALE_DRAFT_VERSION' ||
      result.error.code === 'PERSISTENCE_WRITE_FAILED',
    details: 'details' in result.error ? result.error.details : undefined,
  });
}

function staleDraftFailure(
  state: DraftBearingState,
  currentName: 'validate_assignment_draft' | 'revise_assignment_draft',
): ToolExecutionFailure {
  return failure('STALE_DRAFT_VERSION', state, currentName, {
    message: `The draft changed. Read the current draft and retry with version ${state.draft.version}.`,
    retryable: true,
    details: Object.freeze({ currentDraftVersion: state.draft.version }),
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
  return (
    state.scenario.requests.find(({ id: candidate }) => candidate === id)?.durationMinutes ?? 1
  );
}

function createAssignments(state: AppState, input: Record<string, unknown>): readonly Assignment[] {
  const assigned = assignedDraftInputs(input.assignments);
  const unassigned = requestIdInputs(input.unassignedRequestIds);

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
    ...unassigned.map((id) =>
      Object.freeze({
        requestId: id,
        volunteerId: null,
        startTime: null,
        durationMinutes: requestDuration(state, id),
        status: 'unassigned' as const,
        lockedByHuman: false,
      }),
    ),
  ]);
}

function reviseAssignments(
  state: DraftBearingState,
  input: Record<string, unknown>,
): readonly Assignment[] | ToolExecutionFailure {
  const changes = revisionInputs(input.changes);
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

function withGuard<Name extends ToolName>(
  name: Name,
  store: AppStore,
  dependencies: ToolHandlerDependencies,
  operation: (
    input: Record<string, unknown>,
    state: AppState,
  ) => ToolExecutionResult<ToolOutputMap[Name]> | Promise<ToolExecutionResult<ToolOutputMap[Name]>>,
): ToolHandler<Name> {
  return async (input, options) => {
    if (executionAborted(options)) return executionAbortedFailure(name);

    const validation = validateToolInput(name, input);
    if (!validation.ok) {
      return failure('INVALID_INPUT', safeState(store), name, {
        message: validation.error.message,
        retryable: validation.error.retryable,
        details: validation.error.details,
      });
    }

    if (executionAborted(options)) return executionAbortedFailure(name);

    try {
      const state = store.getState();
      if (!desiredToolNames(state.workflowState).includes(name)) {
        return failure('INVALID_STATE', state, name);
      }
      if (executionAborted(options)) {
        return failure('EXECUTION_ABORTED', state, name, {
          message: 'The tool execution was cancelled before it began.',
          retryable: true,
        });
      }
      return await operation(objectInput(validation.value), state);
    } catch {
      return internalFailure(store, name, dependencies);
    }
  };
}

function draftOrFailure(
  state: AppState,
  name:
    | 'create_assignment_draft'
    | 'get_assignment_draft'
    | 'revise_assignment_draft'
    | 'prepare_plan_approval',
): AssignmentDraftView | ToolExecutionFailure {
  const draft = selectAssignmentDraft(state);
  return draft ?? failure('INTERNAL_ERROR', state, name);
}

export function createToolHandlers(
  store: AppStore,
  dependencies: ToolHandlerDependencies,
): ToolHandlerMap {
  const handlers: { readonly [Name in ToolName]: ToolHandler<Name> } = {
    get_coordination_overview: withGuard(
      'get_coordination_overview',
      store,
      dependencies,
      (_input, state) =>
        success(selectCoordinationOverview(state), state, 'get_coordination_overview'),
    ),

    list_open_requests: withGuard('list_open_requests', store, dependencies, (input, state) => {
      const priority = optionalString(input, 'priority');
      const zone = optionalString(input, 'zone');
      const requests = selectOpenRequests(state).filter(
        (request) =>
          (priority === undefined ||
            priority === 'ANY' ||
            request.priority === PRIORITY_FILTERS[priority]) &&
          (zone === undefined || zone === 'ANY' || request.zone === ZONE_FILTERS[zone]),
      );
      return success(Object.freeze(requests), state, 'list_open_requests');
    }),

    list_available_volunteers: withGuard(
      'list_available_volunteers',
      store,
      dependencies,
      (input, state) => {
        const zone = optionalString(input, 'zone');
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
        const draft = draftOrFailure(result.state, 'create_assignment_draft');
        return 'ok' in draft ? draft : success(draft, result.state, 'create_assignment_draft');
      },
    ),

    get_assignment_draft: withGuard('get_assignment_draft', store, dependencies, (input, state) => {
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
    }),

    validate_assignment_draft: withGuard(
      'validate_assignment_draft',
      store,
      dependencies,
      (input, state) => {
        if (state.draft === null) {
          return failure('INVALID_STATE', state, 'validate_assignment_draft');
        }
        const expectedVersion = requiredNumber(input, 'expectedDraftVersion');
        if (state.draft.version !== expectedVersion) {
          return staleDraftFailure(state, 'validate_assignment_draft');
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
        if (!isDraftBearingState(state)) {
          return failure('INVALID_STATE', state, 'revise_assignment_draft');
        }
        const expectedVersion = requiredNumber(input, 'expectedDraftVersion');
        if (state.draft.version !== expectedVersion) {
          return staleDraftFailure(state, 'revise_assignment_draft');
        }
        const assignments = reviseAssignments(state, input);
        if ('ok' in assignments) return assignments;

        const result = await store.dispatch({
          type: 'REVISE_DRAFT',
          actor: 'agent',
          expectedDraftVersion: expectedVersion,
          assignments,
        });
        if (!result.ok) return storeFailure(result, 'revise_assignment_draft');
        const draft = draftOrFailure(result.state, 'revise_assignment_draft');
        return 'ok' in draft ? draft : success(draft, result.state, 'revise_assignment_draft');
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
          expectedDraftVersion: requiredNumber(input, 'expectedDraftVersion'),
        });
        if (!result.ok) return storeFailure(result, 'prepare_plan_approval');
        const draft = draftOrFailure(result.state, 'prepare_plan_approval');
        return 'ok' in draft ? draft : success(draft, result.state, 'prepare_plan_approval');
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
          expectedDraftVersion: requiredNumber(input, 'expectedDraftVersion'),
        });
        if (!result.ok) return storeFailure(result, 'commit_assignment_plan');
        const plan = selectCommittedPlan(result.state);
        if (plan === null) return failure('INTERNAL_ERROR', result.state, 'commit_assignment_plan');
        return success(plan, result.state, 'commit_assignment_plan');
      },
    ),

    get_committed_plan: withGuard('get_committed_plan', store, dependencies, (_input, state) => {
      const plan = selectCommittedPlan(state);
      return plan === null
        ? failure('INVALID_STATE', state, 'get_committed_plan')
        : success(plan, state, 'get_committed_plan');
    }),

    access_dispatch_contacts: withGuard(
      'access_dispatch_contacts',
      store,
      dependencies,
      async (input, state) => {
        const ids = requestIdInputs(input.requestIds);
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

    get_audit_history: withGuard('get_audit_history', store, dependencies, (input, state) => {
      const limitValue = input.limit;
      const limit = typeof limitValue === 'number' ? limitValue : 20;
      return success(
        Object.freeze(selectAuditHistory(state).slice(-limit)),
        state,
        'get_audit_history',
      );
    }),
  };

  const ordered = Object.fromEntries(TOOL_NAMES.map((name) => [name, handlers[name]]));
  return Object.freeze(ordered) as unknown as ToolHandlerMap;
}
