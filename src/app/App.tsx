import { useState } from 'react';
import type { AppState } from '../domain/types.ts';
import { detectWebMcpCapability, type WebMcpCapabilityStatus } from '../webmcp/capability.ts';
import type { ToolName } from '../webmcp/contracts.ts';
import { desiredToolNames } from '../webmcp/lifecycle.ts';
import { ActivityDrawer } from '../ui/ActivityDrawer.tsx';
import { AppHeader } from '../ui/AppHeader.tsx';
import { ApprovalDialog } from '../ui/ApprovalDialog.tsx';
import { CapabilityNotice } from '../ui/CapabilityNotice.tsx';
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx';
import { JudgeBrief } from '../ui/JudgeBrief.tsx';
import { MetricStrip } from '../ui/MetricStrip.tsx';
import { PlanWorkspace } from '../ui/PlanWorkspace.tsx';
import { RequestPanel } from '../ui/RequestPanel.tsx';
import { VolunteerPanel } from '../ui/VolunteerPanel.tsx';
import {
  executeWorkflowCommand,
  type WorkflowCommandHandler,
  type WorkflowUiCommand,
} from '../ui/workflow-commands.ts';
import { DEFAULT_READY_STATE } from './default-state.ts';
import {
  selectAssignmentDraft,
  selectAuditHistory,
  selectAvailableVolunteers,
  selectCommittedPlan,
  selectCoordinationOverview,
  selectOpenRequests,
} from './selectors.ts';
import './styles.css';
import './editor.css';
import './workflow.css';

export interface AppProps {
  readonly state?: AppState;
  readonly capabilityStatus?: WebMcpCapabilityStatus;
  readonly registeredToolNames?: readonly ToolName[];
  readonly onOpenActivity?: () => void;
  readonly onOpenDiagnostics?: () => void;
  readonly onReset?: () => void;
  readonly onWorkflowCommand?: WorkflowCommandHandler;
  readonly now?: () => number;
}

type ConfirmationAction = 'reset' | 'discard' | 'cancelApproval';

interface ConfirmationCopy {
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
}

function browserCapabilityStatus(): WebMcpCapabilityStatus {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return 'API_UNAVAILABLE';
  }
  return detectWebMcpCapability(document, window.location).status;
}

function noOperation(): void {
  // Optional integration callback intentionally omitted.
}

function ignoreWorkflowCommand(): void {
  // Store-connected rendering supplies the real shared command dispatcher.
}

function toolListsMatch(
  left: readonly ToolName[],
  right: readonly ToolName[],
): boolean {
  return left.length === right.length && left.every((name, index) => name === right[index]);
}

function confirmationCopy(
  action: ConfirmationAction,
  draftVersion: number | null,
): ConfirmationCopy {
  switch (action) {
    case 'reset':
      return Object.freeze({
        title: 'Reset the canonical scenario?',
        description:
          'This clears the current draft, approval, committed plan, and prior activity, then restores the frozen fictional READY scenario.',
        confirmLabel: 'Reset scenario',
        cancelLabel: 'Cancel',
      });
    case 'discard':
      return Object.freeze({
        title: `Discard draft v${draftVersion ?? 'current'}?`,
        description:
          'This removes the uncommitted draft and any approval while preserving the canonical fictional requests and volunteers.',
        confirmLabel: 'Discard draft',
        cancelLabel: 'Keep draft',
      });
    case 'cancelApproval':
      return Object.freeze({
        title: `Cancel approval for version ${draftVersion ?? 'current'}?`,
        description:
          'The agent will immediately lose access to commit this version. The draft remains available for human review and editing.',
        confirmLabel: 'Cancel approval',
        cancelLabel: 'Keep approval',
      });
  }
}

export function App({
  state = DEFAULT_READY_STATE,
  capabilityStatus,
  registeredToolNames,
  onOpenActivity,
  onOpenDiagnostics = noOperation,
  onReset,
  onWorkflowCommand = ignoreWorkflowCommand,
  now = Date.now,
}: AppProps) {
  const [activityOpen, setActivityOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationAction | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const resolvedCapability = capabilityStatus ?? browserCapabilityStatus();
  const desiredNames =
    resolvedCapability === 'AVAILABLE'
      ? desiredToolNames(state.workflowState)
      : Object.freeze([] as ToolName[]);
  const visibleToolNames =
    registeredToolNames !== undefined && toolListsMatch(registeredToolNames, desiredNames)
      ? registeredToolNames
      : desiredNames;
  const overview = selectCoordinationOverview(state);
  const requests = selectOpenRequests(state);
  const volunteers = selectAvailableVolunteers(state);
  const draft = selectAssignmentDraft(state);
  const committedPlan = selectCommittedPlan(state);
  const auditEvents = selectAuditHistory(state);
  const activeConfirmation =
    confirmation === null ? null : confirmationCopy(confirmation, overview.draftVersion);

  function openActivity(): void {
    if (onOpenActivity !== undefined) onOpenActivity();
    else setActivityOpen(true);
  }

  function requestReset(): void {
    if (onReset !== undefined) onReset();
    else setConfirmation('reset');
  }

  async function confirmAction(): Promise<void> {
    if (confirmation === null) return;

    let command: WorkflowUiCommand;
    let message: string;
    if (confirmation === 'reset') {
      command = { type: 'RESET_DEMO', actor: 'human' };
      message = 'Canonical fictional scenario restored.';
    } else if (confirmation === 'discard') {
      command = { type: 'DISCARD_DRAFT', actor: 'human' };
      message = 'Uncommitted draft discarded.';
    } else {
      if (draft === null) {
        setAnnouncement('Approval could not be cancelled because no draft is available.');
        return;
      }
      command = {
        type: 'CANCEL_APPROVAL',
        actor: 'human',
        expectedDraftVersion: draft.version,
      };
      message = `Approval cancelled for draft version ${draft.version}.`;
    }

    const accepted = await executeWorkflowCommand(
      onWorkflowCommand,
      setAnnouncement,
      command,
      message,
    );
    if (accepted) setConfirmation(null);
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#coordination-workspace">
        Skip to coordination workspace
      </a>

      <AppHeader
        workflowState={state.workflowState}
        capabilityStatus={resolvedCapability}
        scenarioDate={state.scenario.date}
        onOpenActivity={openActivity}
        onOpenDiagnostics={onOpenDiagnostics}
        onReset={requestReset}
      />

      <CapabilityNotice status={resolvedCapability} />

      <section className="judge-summary" aria-label="Product and coordination summary">
        <JudgeBrief />
        <MetricStrip overview={overview} />
      </section>

      <main id="coordination-workspace" className="coordination-workspace" tabIndex={-1}>
        <RequestPanel requests={requests} />
        <PlanWorkspace
          state={state}
          draft={draft}
          committedPlan={committedPlan}
          approval={state.approval}
          requests={requests}
          volunteers={volunteers}
          toolNames={visibleToolNames}
          onCommand={onWorkflowCommand}
          onRequestDiscard={() => setConfirmation('discard')}
          onRequestCancelApproval={() => setConfirmation('cancelApproval')}
          now={now}
        />
        <VolunteerPanel volunteers={volunteers} />
      </main>

      <footer className="app-footer">
        <span className="mono">{state.workflowState}</span>
        <span>Canonical fictional scenario</span>
        <span>No private contact fields rendered</span>
      </footer>

      {state.workflowState === 'AWAITING_APPROVAL' && draft !== null ? (
        <ApprovalDialog
          draft={draft}
          onCommand={onWorkflowCommand}
          onAnnouncement={setAnnouncement}
        />
      ) : null}

      <ActivityDrawer
        open={activityOpen}
        events={auditEvents}
        onClose={() => setActivityOpen(false)}
      />

      {activeConfirmation === null ? null : (
        <ConfirmDialog
          open
          title={activeConfirmation.title}
          description={activeConfirmation.description}
          confirmLabel={activeConfirmation.confirmLabel}
          cancelLabel={activeConfirmation.cancelLabel}
          onConfirm={() => void confirmAction()}
          onCancel={() => setConfirmation(null)}
        />
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

export default App;
