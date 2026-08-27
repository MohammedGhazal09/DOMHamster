import type { BuildInfoPort } from '../app/ports.ts';
import type { AppState } from '../domain/types.ts';
import type { ToolName } from '../webmcp/contracts.ts';
import type { WebMcpCapabilityStatus } from '../webmcp/capability.ts';

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

const SAFE_ERROR_CODE = /^[A-Z][A-Z0-9_]{0,63}$/;

function bounded(value: string, maximum: number): string {
  return value.slice(0, maximum);
}

function boundedTools(values: readonly ToolName[]): readonly ToolName[] {
  return Object.freeze([...values].slice(0, 12));
}

function safeErrors(values: readonly string[]): readonly string[] {
  return Object.freeze(
    values.filter((value) => SAFE_ERROR_CODE.test(value)).slice(-10),
  );
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
