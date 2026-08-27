import { useState } from 'react';
import type {
  AssignmentDraftView,
  CommittedPlanView,
  PublicRequestView,
  PublicVolunteerView,
} from '../app/selectors.ts';
import type { AppState } from '../domain/types.ts';
import type { ToolName } from '../webmcp/contracts.ts';
import { ApprovedBanner } from './ApprovedBanner.tsx';
import { AssignmentTable } from './AssignmentTable.tsx';
import { CommittedSummary } from './CommittedSummary.tsx';
import { CANONICAL_DEMO_PROMPT } from './JudgeBrief.tsx';
import { HamsterMark } from './HamsterMark.tsx';
import { ReadonlyAssignmentTable } from './ReadonlyAssignmentTable.tsx';
import { ValidationPanel } from './ValidationPanel.tsx';
import type { WorkflowCommandHandler } from './workflow-commands.ts';

export interface PlanWorkspaceProps {
  readonly state: AppState;
  readonly draft: AssignmentDraftView | null;
  readonly committedPlan?: CommittedPlanView | null;
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
  // Static rendering keeps human actions inert until a shared store is supplied.
}

function isEditableDraft(draft: AssignmentDraftView): boolean {
  return draft.workflowState === 'DRAFT_INVALID' || draft.workflowState === 'DRAFT_VALID';
}

export function PlanWorkspace({
  state,
  draft,
  committedPlan = null,
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
    draft?.assignments.filter(
      (assignment) => assignment.status !== 'unassigned' && assignment.volunteerId !== null,
    ).length ?? 0;
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
        <h2 id="plan-heading" tabIndex={-1}>
          Assignment plan
        </h2>
        <p>Shared agent + coordinator workspace</p>
      </header>

      <div className="plan-workspace__body">
        {state.workflowState === 'COMMITTED' && committedPlan !== null ? (
          <CommittedSummary plan={committedPlan} requests={requests} />
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
              <span className="mono">{draft.workflowState}</span>
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
              onCommand={onCommand}
              onAnnouncement={setAnnouncement}
            />
            <ValidationPanel errors={draft.errors} warnings={draft.warnings} />
            <div className="draft-human-actions">
              <button
                id="discard-draft-action"
                type="button"
                className="button button--danger"
                onClick={onRequestDiscard}
              >
                Discard draft
              </button>
            </div>
          </section>
        ) : state.workflowState === 'APPROVED' ? (
          <section className="readonly-draft" aria-labelledby="approved-draft-heading">
            <ApprovedBanner
              approval={state.approval}
              draftVersion={draft.version}
              onCommand={onCommand}
              onRequestCancelApproval={onRequestCancelApproval}
              onRequestDiscard={onRequestDiscard}
              onAnnouncement={setAnnouncement}
              now={now}
            />
            <div className="readonly-draft__heading">
              <div>
                <h3 id="approved-draft-heading">Approved assignment plan</h3>
                <p>
                  This exact version is read-only while the agent commit authorization is active.
                </p>
              </div>
              <span className="mono">v{draft.version}</span>
            </div>
            <ReadonlyAssignmentTable
              assignments={draft.assignments}
              requests={requests}
              accessibleName="Approved assignment plan"
            />
          </section>
        ) : (
          <section className="readonly-draft" aria-labelledby="awaiting-draft-heading">
            <div className="readonly-draft__heading">
              <div>
                <span className="eyebrow">Human decision required</span>
                <h3 id="awaiting-draft-heading">Draft v{draft.version} is under review</h3>
                <p>
                  The background workspace is read-only until the coordinator approves, rejects,
                  or cancels this review.
                </p>
              </div>
              <span className="mono">AWAITING_APPROVAL</span>
            </div>
            <ReadonlyAssignmentTable
              assignments={draft.assignments}
              requests={requests}
              accessibleName="Assignment plan awaiting approval"
            />
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

        <div className="human-authority" role="note" aria-label="Human authority boundary">
          <strong>Human authority is enforced</strong>
          <span>
            Lock, approval, rejection, discard and reset are never exposed as agent tools.
          </span>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
