import type { StoreDispatchResult } from '../app/ports.ts';
import type {
  ApprovalDecisionCommand,
  ApprovalExpiresCommand,
  DiscardDraftCommand,
  EditAssignmentCommand,
  LockAssignmentCommand,
  ResetDemoCommand,
  UnlockAssignmentCommand,
} from '../domain/commands.ts';

export type WorkflowUiCommand =
  | EditAssignmentCommand
  | LockAssignmentCommand
  | UnlockAssignmentCommand
  | ApprovalDecisionCommand
  | ApprovalExpiresCommand
  | DiscardDraftCommand
  | ResetDemoCommand;

export type WorkflowCommandHandler = (
  command: WorkflowUiCommand,
) => StoreDispatchResult | void | Promise<StoreDispatchResult | void>;

export async function executeWorkflowCommand(
  onCommand: WorkflowCommandHandler,
  onAnnouncement: (message: string) => void,
  command: WorkflowUiCommand,
  acceptedMessage: string,
): Promise<boolean> {
  try {
    const result = await onCommand(command);
    if (result !== undefined && !result.ok) {
      onAnnouncement(`Action was not accepted: ${result.error.code}.`);
      return false;
    }
    onAnnouncement(acceptedMessage);
    return true;
  } catch {
    onAnnouncement('DOMHamster could not apply that action. State was not changed.');
    return false;
  }
}
