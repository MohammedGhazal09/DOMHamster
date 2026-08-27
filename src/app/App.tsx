import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BuildInfoPort } from './ports.ts';
import {
  selectAssignmentDraft,
  selectAuditHistory,
  selectAvailableVolunteers,
  selectCommittedPlan,
  selectCoordinationOverview,
  selectOpenRequests,
} from './selectors.ts';
import type { AppState } from '../domain/types.ts';
import { CANONICAL_FIXTURE_HASH } from '../domain/fixture-identity.ts';
import {
  createDiagnosticsSnapshot,
  type PersistenceStatus,
} from '../diagnostics/diagnostics.ts';
import { detectWebMcpCapability, type WebMcpCapabilityStatus } from '../webmcp/capability.ts';
import type { ToolName } from '../webmcp/contracts.ts';
import { desiredToolNames } from '../webmcp/lifecycle.ts';
import { ActivityDrawer } from '../ui/ActivityDrawer.tsx';
import { AppHeader } from '../ui/AppHeader.tsx';
import type {
  HumanDraftCommand,
  HumanDraftCommandHandler,
} from '../ui/AssignmentTable.tsx';
import { ApprovalDialog } from '../ui/ApprovalDialog.tsx';
import { CapabilityNotice } from '../ui/CapabilityNotice.tsx';
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx';
import { DiagnosticsDrawer } from '../ui/DiagnosticsDrawer.tsx';
import { JudgeBrief } from '../ui/JudgeBrief.tsx';
import { MetricStrip } from '../ui/MetricStrip.tsx';
import { PlanWorkspace } from '../ui/PlanWorkspace.tsx';
import { RequestPanel } from '../ui/RequestPanel.tsx';
import { VolunteerPanel } from '../ui/VolunteerPanel.tsx';
import {
  executeWorkflowCommand,
  type WorkflowCommand,
  type WorkflowCommandHandler,
} from '../ui/workflow-commands.ts';
import { DEFAULT_READY_STATE } from './default-state.ts';
import './styles.css';
import './editor.css';
import './workflow.css';

export interface AppProps {
  readonly state?: AppState;
  readonly capabilityStatus?: WebMcpCapabilityStatus;
  readonly registeredToolNames?: readonly ToolName[];
  readonly registryErrorCodes?: readonly string[];
  readonly onOpenActivity?: () => void;
  readonly onOpenDiagnostics?: () => void;
  readonly onReset?: () => void;
  readonly onHumanDraftCommand?: HumanDraftCommandHandler;
  readonly onWorkflowCommand?: WorkflowCommandHandler;
  readonly buildInfo?: BuildInfoPort;
  readonly persistenceStatus?: PersistenceStatus;
  readonly now?: () => number;
}

type ConfirmationKind = 'reset' | 'discard' | 'cancel-approval';

const EMPTY_TOOL_NAMES = Object.freeze([] as ToolName[]);
const EMPTY_REGISTRY_ERRORS = Object.freeze([] as string[]);

const DEFAULT_BUILD_INFO: BuildInfoPort = Object.freeze({
  version: '0.0.0',
  commitSha: 'local',
  builtAt: 'runtime',
  fixtureHash: CANONICAL_FIXTURE_HASH,
});

function browserCapabilityStatus(): WebMcpCapabilityStatus {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return 'API_UNAVAILABLE';
  }
  return detectWebMcpCapability(document, window.location).status;
}

function noOperation(): void {
  // Optional integration callbacks remain inert when omitted.
}

function ignoreWorkflowCommand(): void {
  // Store-connected rendering supplies the real shared command dispatcher.
}

function isHumanDraftCommand(command: WorkflowCommand): command is HumanDraftCommand {
  return (
    command.type === 'EDIT_ASSIGNMENT' ||
    command.type === 'LOCK_ASSIGNMENT' ||
    command.type === 'UNLOCK_ASSIGNMENT'
  );
}

function confirmationReturnFocusId(kind: ConfirmationKind): string {
  if (kind === 'reset') return 'reset-action';
  if (kind === 'discard') return 'discard-draft-action';
  return 'cancel-approval-action';
}

export function App({
  state = DEFAULT_READY_STATE,
  capabilityStatus,
  registeredToolNames,
  registryErrorCodes = EMPTY_REGISTRY_ERRORS,
  onOpenActivity = noOperation,
  onOpenDiagnostics = noOperation,
  onReset = noOperation,
  onHumanDraftCommand,
  onWorkflowCommand,
  buildInfo = DEFAULT_BUILD_INFO,
  persistenceStatus = 'READY',
  now = Date.now,
}: AppProps) {
  const resolvedCapability = capabilityStatus ?? browserCapabilityStatus();
  const desiredNames = desiredToolNames(state.workflowState);
  const visibleToolNames =
    resolvedCapability === 'AVAILABLE'
      ? (registeredToolNames ?? desiredNames)
      : EMPTY_TOOL_NAMES;
  const overview = selectCoordinationOverview(state);
  const requests = selectOpenRequests(state);
  const volunteers = selectAvailableVolunteers(state);
  const draft = selectAssignmentDraft(state);
  const committedPlan = selectCommittedPlan(state);
  const auditHistory = selectAuditHistory(state);
  const [activityOpen, setActivityOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationKind | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [recentErrorCodes, setRecentErrorCodes] = useState<readonly string[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  const baseCommandHandler = useMemo<WorkflowCommandHandler>(() => {
    if (onWorkflowCommand !== undefined) return onWorkflowCommand;
    if (onHumanDraftCommand === undefined) return ignoreWorkflowCommand;
    return (command) =>
      isHumanDraftCommand(command) ? onHumanDraftCommand(command) : undefined;
  }, [onHumanDraftCommand, onWorkflowCommand]);

  const trackedCommandHandler = useCallback<WorkflowCommandHandler>(
    async (command) => {
      try {
        const result = await baseCommandHandler(command);
        if (result !== undefined && !result.ok) {
          setRecentErrorCodes((previous) => [...previous, result.error.code].slice(-10));
        }
        return result;
      } catch (error) {
        setRecentErrorCodes((previous) => [...previous, 'INTERNAL_ERROR'].slice(-10));
        throw error;
      }
    },
    [baseCommandHandler],
  );

  const combinedErrorCodes = useMemo(
    () => Object.freeze([...registryErrorCodes, ...recentErrorCodes].slice(-10)),
    [recentErrorCodes, registryErrorCodes],
  );

  const diagnostics = useMemo(
    () =>
      createDiagnosticsSnapshot({
        buildInfo,
        state,
        capabilityStatus: resolvedCapability,
        desiredToolNames: desiredNames,
        registeredToolNames: visibleToolNames,
        persistenceStatus,
        recentErrorCodes: combinedErrorCodes,
      }),
    [
      buildInfo,
      combinedErrorCodes,
      desiredNames,
      persistenceStatus,
      resolvedCapability,
      state,
      visibleToolNames,
    ],
  );

  const hasBlockingLayer =
    state.workflowState === 'AWAITING_APPROVAL' ||
    activityOpen ||
    diagnosticsOpen ||
    confirmation !== null;

  useEffect(() => {
    if (
      (confirmation === 'cancel-approval' && state.workflowState !== 'APPROVED') ||
      (confirmation === 'discard' &&
        (state.workflowState === 'READY' || state.workflowState === 'COMMITTED'))
    ) {
      setConfirmation(null);
    }
  }, [confirmation, state.workflowState]);

  useEffect(() => {
    const target = contentRef.current as (HTMLElement & { inert: boolean }) | null;
    if (target === null || typeof document === 'undefined') return undefined;
    const previousBodyOverflow = document.body.style.overflow;
    target.inert = hasBlockingLayer;
    if (hasBlockingLayer) document.body.style.overflow = 'hidden';
    return () => {
      target.inert = false;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [hasBlockingLayer]);

  async function confirmWorkflowAction(kind: ConfirmationKind): Promise<void> {
    let command: WorkflowCommand;
    let acceptedMessage: string;

    if (kind === 'reset') {
      command = { type: 'RESET_DEMO', actor: 'human' };
      acceptedMessage = 'The canonical fictional scenario was reset.';
    } else if (kind === 'discard') {
      command = { type: 'DISCARD_DRAFT', actor: 'human' };
      acceptedMessage = 'The uncommitted draft was discarded.';
    } else {
      if (state.workflowState !== 'APPROVED') {
        setConfirmation(null);
        return;
      }
      command = {
        type: 'CANCEL_APPROVAL',
        actor: 'human',
        expectedDraftVersion: state.draft.version,
      };
      acceptedMessage = `Approval cancelled for draft version ${state.draft.version}.`;
    }

    const accepted = await executeWorkflowCommand(
      trackedCommandHandler,
      command,
      setAnnouncement,
      acceptedMessage,
    );
    if (!accepted) return;
    setConfirmation(null);
    if (kind === 'reset') onReset();
  }

  function confirmationContent(kind: ConfirmationKind): {
    readonly title: string;
    readonly body: string;
    readonly confirmLabel: string;
    readonly cancelLabel: string;
  } {
    if (kind === 'reset') {
      return {
        title: 'Reset the fictional scenario?',
        body: 'This removes the current draft, approval, committed plan, and prior run history, then restores 8 requests and 5 volunteers.',
        confirmLabel: 'Reset scenario',
        cancelLabel: 'Cancel',
      };
    }
    if (kind === 'discard') {
      return {
        title: 'Discard this uncommitted draft?',
        body: `This removes draft v${state.draft?.version ?? '—'} and any pending or approved authorization, then returns the plan workspace to READY.`,
        confirmLabel: 'Discard draft',
        cancelLabel: 'Keep draft',
      };
    }
    return {
      title: `Cancel approval for version ${state.draft?.version ?? '—'}?`,
      body: 'This invalidates the approved version and removes the agent commit tool until a new review is approved.',
      confirmLabel: 'Cancel approval',
      cancelLabel: 'Keep approval',
    };
  }

  return (
    <div className="app-shell">
      <div ref={contentRef} className="app-content">
        <a className="skip-link" href="#coordination-workspace">
          Skip to coordination workspace
        </a>

        <AppHeader
          workflowState={state.workflowState}
          capabilityStatus={resolvedCapability}
          scenarioDate={state.scenario.date}
          onOpenActivity={() => {
            onOpenActivity();
            setActivityOpen(true);
          }}
          onOpenDiagnostics={() => {
            onOpenDiagnostics();
            setDiagnosticsOpen(true);
          }}
          onReset={() => setConfirmation('reset')}
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
            requests={requests}
            volunteers={volunteers}
            toolNames={visibleToolNames}
            onCommand={trackedCommandHandler}
            onRequestDiscard={() => setConfirmation('discard')}
            onRequestCancelApproval={() => setConfirmation('cancel-approval')}
            now={now}
          />
          <VolunteerPanel volunteers={volunteers} />
        </main>

        <footer className="app-footer">
          <span className="mono">{state.workflowState}</span>
          <span>Canonical fictional scenario</span>
          <span>No private contact fields rendered</span>
        </footer>
      </div>

      {state.workflowState === 'AWAITING_APPROVAL' && draft !== null ? (
        <ApprovalDialog
          draft={draft}
          approval={state.approval}
          requests={requests}
          onCommand={trackedCommandHandler}
          onAnnouncement={setAnnouncement}
          returnFocusId="plan-heading"
        />
      ) : null}

      <ActivityDrawer
        open={activityOpen}
        events={auditHistory}
        onClose={() => setActivityOpen(false)}
        returnFocusId="activity-action"
      />
      <DiagnosticsDrawer
        open={diagnosticsOpen}
        snapshot={diagnostics}
        onClose={() => setDiagnosticsOpen(false)}
        returnFocusId="diagnostics-action"
      />

      {confirmation === null ? null : (
        <ConfirmDialog
          {...confirmationContent(confirmation)}
          onConfirm={() => confirmWorkflowAction(confirmation)}
          onCancel={() => setConfirmation(null)}
          returnFocusId={confirmationReturnFocusId(confirmation)}
        />
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

export default App;
