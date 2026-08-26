import type { CommandResult } from '../domain/commands.ts';
import type { AppState, AuditEventId, PlanId } from '../domain/types.ts';

export interface ClockPort {
  now(): string;
}

export interface IdPort {
  nextPlanId(): PlanId;
  nextAuditEventId(): AuditEventId;
}

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StatePersistencePort {
  save(state: AppState): void | Promise<void>;
}

export type StorePersistencePort = StatePersistencePort;

export interface ModelContextRegistrationOptions {
  readonly signal?: AbortSignal;
}

export interface ModelContextPort {
  registerTool(
    tool: unknown,
    options?: ModelContextRegistrationOptions,
  ): void | Promise<void>;
}

export interface BuildInfoPort {
  readonly version: string;
  readonly commitSha: string;
  readonly builtAt: string;
  readonly fixtureHash: string;
}

export type StoreDispatchResult =
  | CommandResult
  | {
      readonly ok: false;
      readonly state: AppState;
      readonly error: {
        readonly code: 'PERSISTENCE_WRITE_FAILED';
        readonly message: 'PERSISTENCE_WRITE_FAILED';
      };
    };
