import type { AuditEvent, AuditEventId } from './types.ts';

export const MAX_AUDIT_EVENTS = 100;
export const MAX_AUDIT_SUMMARY_CHARACTERS = 160;

export type AuditActor = AuditEvent['actor'];

export type AuditEventType =
  | 'SCENARIO_RESET'
  | 'DRAFT_CREATED'
  | 'DRAFT_REVISED'
  | 'ASSIGNMENT_LOCKED'
  | 'ASSIGNMENT_UNLOCKED'
  | 'DRAFT_DISCARDED'
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_APPROVED'
  | 'APPROVAL_REJECTED'
  | 'APPROVAL_CANCELLED'
  | 'APPROVAL_EXPIRED'
  | 'APPROVAL_INVALIDATED_RELOAD'
  | 'PLAN_COMMITTED'
  | 'CONTACTS_ACCESSED';

export interface AuditDependencies {
  readonly now: () => string;
  readonly nextAuditEventId: () => AuditEventId;
}

export interface AuditEventInput {
  readonly type: AuditEventType;
  readonly actor: AuditActor;
  readonly workflowState: AuditEvent['workflowState'];
  readonly draftVersion: number | null;
  readonly safeSummary: string;
}

export interface ResetAuditInput {
  readonly actor: 'human';
  readonly safeSummary: string;
}

function sanitizeSummary(value: string): string {
  const normalized = value
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const safe = normalized.length > 0 ? normalized : 'No additional details.';
  return safe.slice(0, MAX_AUDIT_SUMMARY_CHARACTERS);
}

function nextSequence(history: readonly AuditEvent[]): number {
  return (history.at(-1)?.sequence ?? 0) + 1;
}

function createAuditEvent(
  sequence: number,
  input: AuditEventInput,
  dependencies: AuditDependencies,
): AuditEvent {
  return Object.freeze({
    id: dependencies.nextAuditEventId(),
    sequence,
    type: input.type,
    actor: input.actor,
    workflowState: input.workflowState,
    timestamp: dependencies.now(),
    draftVersion: input.draftVersion,
    safeSummary: sanitizeSummary(input.safeSummary),
  });
}

export function appendAuditEvent(
  history: readonly AuditEvent[],
  input: AuditEventInput,
  dependencies: AuditDependencies,
): readonly AuditEvent[] {
  const event = createAuditEvent(nextSequence(history), input, dependencies);
  return Object.freeze([...history, event].slice(-MAX_AUDIT_EVENTS));
}

export function resetAuditHistory(
  input: ResetAuditInput,
  dependencies: AuditDependencies,
): readonly AuditEvent[] {
  return Object.freeze([
    createAuditEvent(
      1,
      {
        type: 'SCENARIO_RESET',
        actor: input.actor,
        workflowState: 'READY',
        draftVersion: null,
        safeSummary: input.safeSummary,
      },
      dependencies,
    ),
  ]);
}
