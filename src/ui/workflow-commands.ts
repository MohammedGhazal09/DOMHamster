import type {
  ApprovalDecisionCommand,
  ApprovalExpiresCommand,
  DiscardDraftCommand,
  EditAssignmentCommand,
  LockAssignmentCommand,
  ResetDemoCommand,
  UnlockAssignmentCommand,
} from '../domain/commands.ts';

export type WorkflowCommand =
  | EditAssignmentCommand
  | LockAssignmentCommand
  | UnlockAssignmentCommand
  | ApprovalDecisionCommand
  | ApprovalExpiresCommand
  | DiscardDraftCommand
  | ResetDemoCommand;

interface WorkflowCommandAcceptedResult {
  readonly ok: true;
}

interface WorkflowCommandRejectedResult {
  readonly ok: false;
  readonly error: {
    readonly code: string;
  };
}

type WorkflowCommandResult = WorkflowCommandAcceptedResult | WorkflowCommandRejectedResult;

export type WorkflowCommandHandler = (command: WorkflowCommand) => unknown;

function isUnknownRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

export function isWorkflowCommandResult(value: unknown): value is WorkflowCommandResult {
  if (!isUnknownRecord(value)) return false;
  const ok = value.ok;
  if (ok === true) return true;
  if (ok !== false) return false;
  const error = value.error;
  return isUnknownRecord(error) && typeof error.code === 'string';
}

export async function executeWorkflowCommand(
  onCommand: WorkflowCommandHandler,
  command: WorkflowCommand,
  onAnnouncement: (message: string) => void,
  acceptedMessage: string,
): Promise<boolean> {
  try {
    const result: unknown = await Promise.resolve(onCommand(command));
    if (result !== undefined) {
      if (!isWorkflowCommandResult(result)) {
        throw new TypeError('Unexpected workflow command result.');
      }
      if (!result.ok) {
        onAnnouncement(`Action was not accepted: ${result.error.code}.`);
        return false;
      }
    }
    onAnnouncement(acceptedMessage);
    return true;
  } catch {
    onAnnouncement('DOMHamster could not complete that action. State was not changed.');
    return false;
  }
}
