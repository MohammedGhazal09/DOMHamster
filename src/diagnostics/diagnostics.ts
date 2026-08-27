import type { BuildInfoPort } from '../app/ports.ts';
import type { AppState } from '../domain/types.ts';
import type { WebMcpCapabilityStatus } from '../webmcp/capability.ts';
import type { ToolName } from '../webmcp/contracts.ts';

export type PersistenceStatus = 'READY' | 'DEGRADED' | 'UNAVAILABLE';

export interface DiagnosticsInput {
  readonly buildInfo: BuildInfoPort;
  readonly state: AppState;
  readonly capabilityStatus: WebMcpCapabilityStatus;
  readonly desiredToolNames: readonly ToolName[];
  readonly registeredToolNames: readonly ToolName[];
  readonly persistenceStatus: PersistenceStatus;
  readonly recentErrorCodes: readonly string[];
}

export interface DiagnosticsSnapshot {
  readonly build: {
    readonly version: string;
    readonly commitSha: string;
    readonly builtAt: string;
  };
  readonly fixtureHash: string;
  readonly workflowState: AppState['workflowState'];
  readonly draftVersion: number | null;
  readonly capabilityStatus: WebMcpCapabilityStatus;
  readonly desiredToolNames: readonly ToolName[];
  readonly registeredToolNames: readonly ToolName[];
  readonly persistenceStatus: PersistenceStatus;
  readonly recentErrorCodes: readonly string[];
}

const SAFE_ERROR_CODES = new Set([
  'INVALID_STATE',
  'INVALID_INPUT',
  'STALE_DRAFT_VERSION',
  'LOCKED_ASSIGNMENT_CHANGE',
  'UNKNOWN_REQUEST',
  'UNKNOWN_VOLUNTEER',
  'ASSIGNMENT_NOT_FOUND',
  'REQUEST_NOT_ASSIGNED',
  'APPROVAL_NOT_EXPIRED',
  'APPROVAL_EXPIRED',
  'DRAFT_INVALID',
  'COMMIT_ALREADY_COMPLETED',
  'PERSISTENCE_WRITE_FAILED',
  'INTERNAL_ERROR',
  'TOOL_REGISTRATION_FAILED',
  'REGISTRY_STATE_READ_FAILED',
  'INSECURE_CONTEXT',
  'API_UNAVAILABLE',
  'ACCESS_ERROR',
]);

function bounded(value: string, maximum: number): string {
  return value.slice(0, maximum);
}

function boundedTools(values: readonly ToolName[]): readonly ToolName[] {
  return Object.freeze([...values].slice(0, 12));
}

function safeErrors(values: readonly string[]): readonly string[] {
  return Object.freeze(values.filter((value) => SAFE_ERROR_CODES.has(value)).slice(-10));
}

export function createDiagnosticsSnapshot(input: DiagnosticsInput): DiagnosticsSnapshot {
  return Object.freeze({
    build: Object.freeze({
      version: bounded(input.buildInfo.version, 64),
      commitSha: bounded(input.buildInfo.commitSha, 64),
      builtAt: bounded(input.buildInfo.builtAt, 64),
    }),
    fixtureHash: bounded(input.buildInfo.fixtureHash, 128),
    workflowState: input.state.workflowState,
    draftVersion: input.state.draft?.version ?? input.state.committedPlan?.draftVersion ?? null,
    capabilityStatus: input.capabilityStatus,
    desiredToolNames: boundedTools(input.desiredToolNames),
    registeredToolNames: boundedTools(input.registeredToolNames),
    persistenceStatus: input.persistenceStatus,
    recentErrorCodes: safeErrors(input.recentErrorCodes),
  });
}
