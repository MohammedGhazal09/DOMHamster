import { useState } from 'react';
import type {
  AssignmentDraftView,
  CommittedPlanView,
  PublicRequestView,
  PublicVolunteerView,
} from '../app/selectors.ts';
import type { AppState, ApprovalRecord } from '../domain/types.ts';
import type { ToolName } from '../webmcp/contracts.ts';
import { ApprovedBanner } from './ApprovedBanner.tsx';
import { AssignmentTable } from './AssignmentTable.tsx';
import { CommittedSummary } from './CommittedSummary.tsx';
import { CANONICAL_DEMO_PROMPT } from './JudgeBrief.tsx';
import { HamsterMark } from './HamsterMark.tsx';
import { ValidationPanel } from './ValidationPanel.tsx';
import type { WorkflowCommandHandler } from './workflow-commands.ts';

export interface PlanWorkspaceProps {
  readonly state: AppState;
  readonly draft: AssignmentDraftView | null;
  readonly committedPlan?: CommittedPlanView | null;
  readonly approval?: ApprovalRecord | null;
  readonly requests: readonly PublicRequestView[];
  readonly volunteers: readonly PublicVolunteerView[];
  readonly toolNames: readonly ToolName[];
  readonly onCommand?: WorkflowCommandHandler;
  readonly onRequestDiscard?: () => void;
  readonly onRequestCancelApproval?: () => void;
  readonly now?: () => number;
}

const MUTATING_TOOLS = new Set<ToolName>([
  'create_assignment_draft',
  'revise_assignment_draft',
  'prepare_plan_approval',
  'commit_assignment_plan',
  'access_dispatch_contacts',
]);

function ignoreWorkflowCommand(): void {
  // Store-connected rendering supplies the real shared command dispatcher.
}

function noOperation(): void {
  // Confirmation orchestration is provided by the application shell.
}

function isEditableDraft(draft: AssignmentDraftView): boolean {
  return draft.workflowState === 'DRAFT_INVALID' || draft.workflowState === 'DRAFT_VALID';
}

export function PlanWorkspace({
  state,
  draft,
  committedPlan = null,
  approval = null,
  requests,
  volunteers,
  toolNames,
  onCommand = ignoreWorkflowCommand,
  onRequestDiscard = noOperation,
  onRequestCancelApproval = noOperation,
  now = Date.now,
}: PlanWorkspaceProps) {
  const [announcement, setAnnouncement] = useState('');
  const assignedCount =
    draft?.assignments.filter((assignment) => assignment.status !== 'unassigned').length ?? 0;
  const unassignedCount = (draft?.assignments.length ?? 0) - assignedCount;

  async function copyPrompt(): Promise<void> {
    try {
      await navigator.clipboard.writeText(CANONICAL_DEMO_PROMPT);
      setAnnouncement('Demo prompt copied.');
    } catch {
      setAnnouncement('Copy failed. Select and copy the prompt manually.');
    }
  }

  return (
    <section className="workspace-panel plan-workspace surface" aria-labelledby="plan-heading">
      <header className="workspace-panel__header">
        <h2 id="plan-heading">Assignment plan</h2>
        <p>Shared agent + coordinator workspace</p>
      </header>

      <div className="plan-workspace__body">
        {state.workflowState === 'COMMITTED' && committedPlan !== null ? (
          <CommittedSummary plan={committedPlan} />
        ) : draft === null ? (
          <section className="empty-plan" aria-labelledby="empty-plan-heading">
            <HamsterMark decorative className="empty-plan__mark" />
            <div>
              <h3 id="empty-plan-heading">No assignment draft yet</h3>
              <p>
                Ask your browser agent to use DOMHamster’s WebMCP tools, or copy the demo prompt
                above.
              </p>
              <div className="empty-plan__actions">
                <span className="tool-count mono">{toolNames.length} tools available</span>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => void copyPrompt()}
                >
                  Copy demo prompt
                </button>
              </div>
            </div>
          </section>
        ) : isEditableDraft(draft) ? (
          <section className="draft-editor" aria-labelledby="draft-editor-heading">
            <div className="draft-editor__heading">
              <div>
                <h3 id="draft-editor-heading">Draft v{draft.version}</h3>
                <p>
                  {assignedCount} assigned · {unassignedCount} unassigned · {draft.errors.length}{' '}
                  hard {draft.errors.length === 1 ? 'error' : 'errors'} · {draft.warnings.length}{' '}
                  {draft.warnings.length === 1 ? 'warning' : 'warnings'}
                </p>
              </div>
              <div className="draft-editor__state-actions">
                <span className="mono">{draft.workflowState}</span>
                <button
                  type="button"
                  className="button button--danger"
                  onClick={onRequestDiscard}
                >
                  Discard draft
                </button>
              </div>
            </div>

            <p
              className={`draft-status-banner ${draft.valid ? 'is-valid' : 'is-invalid'}`}
              role={draft.valid ? 'status' : 'alert'}
            >
              {draft.valid
                ? 'This draft passes all hard constraints and is ready for human review.'
                : 'This draft has blocking conflicts. Resolve every error before approval can begin.'}
            </p>

            <AssignmentTable
              draft={draft}
              requests={requests}
              volunteers={volunteers}
              onCommand={(command) => onCommand(command)}
              onAnnouncement={setAnnouncement}
            />
            <ValidationPanel errors={draft.errors} warnings={draft.warnings} />
          </section>
        ) : state.workflowState === 'APPROVED' && approval?.status === 'approved' ? (
          <section className="approved-workspace" aria-labelledby="approved-workspace-heading">
            <h3 id="approved-workspace-heading" className="sr-only">
              Approved draft version {draft.version}
            </h3>
            <ApprovedBanner
              version={draft.version}
              expiresAt={approval.expiresAt}
              now={now}
              onCommand={onCommand}
              onAnnouncement={setAnnouncement}
              onRequestCancelApproval={onRequestCancelApproval}
              onRequestDiscard={onRequestDiscard}
            />
            <div className="draft-placeholder">
              <p>
                {assignedCount} assigned · {unassignedCount} unassigned · {draft.warnings.length}{' '}
                acknowledged {draft.warnings.length === 1 ? 'warning' : 'warnings'}
              </p>
              <p>
                The exact approved version is read-only. No human Commit control exists; the agent
                must call the one-shot commit tool before approval expires.
              </p>
            </div>
          </section>
        ) : (
          <section className="draft-placeholder" aria-labelledby="draft-placeholder-heading">
            <h3 id="draft-placeholder-heading">Draft v{draft.version}</h3>
            <p>
              {assignedCount} assigned · {unassignedCount} unassigned · {draft.errors.length} hard
              errors · {draft.warnings.length} warnings
            </p>
            <p>This exact version is read-only while the human approval review is active.</p>
            <button
              type="button"
              className="button button--danger"
              onClick={onRequestDiscard}
            >
              Discard draft
            </button>
          </section>
        )}

        <section className="tool-evidence" aria-labelledby="tool-evidence-heading">
          <div className="tool-evidence__heading">
            <h3 id="tool-evidence-heading">Agent tool lifecycle</h3>
            <span className="mono">{state.workflowState}</span>
          </div>
          <ul>
            {toolNames.map((name) => (
              <li key={name}>
                <code>{name}</code>
                <span>{MUTATING_TOOLS.has(name) ? 'write' : 'read'}</span>
              </li>
            ))}
          </ul>
        </section>

        <aside className="human-authority">
          <strong>Human authority is enforced</strong>
          <span>
            Lock, approval, rejection, discard and reset are never exposed as agent tools.
          </span>
        </aside>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
