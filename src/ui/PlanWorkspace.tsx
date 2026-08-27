import { useState } from 'react';
import type {
  AssignmentDraftView,
  PublicRequestView,
  PublicVolunteerView,
} from '../app/selectors.ts';
import type { AppState } from '../domain/types.ts';
import type { ToolName } from '../webmcp/contracts.ts';
import {
  AssignmentTable,
  type HumanDraftCommandHandler,
} from './AssignmentTable.tsx';
import { CANONICAL_DEMO_PROMPT } from './JudgeBrief.tsx';
import { HamsterMark } from './HamsterMark.tsx';
import { ValidationPanel } from './ValidationPanel.tsx';

export interface PlanWorkspaceProps {
  readonly state: AppState;
  readonly draft: AssignmentDraftView | null;
  readonly requests: readonly PublicRequestView[];
  readonly volunteers: readonly PublicVolunteerView[];
  readonly toolNames: readonly ToolName[];
  readonly onCommand?: HumanDraftCommandHandler;
}

const MUTATING_TOOLS = new Set<ToolName>([
  'create_assignment_draft',
  'revise_assignment_draft',
  'prepare_plan_approval',
  'commit_assignment_plan',
  'access_dispatch_contacts',
]);

function ignoreHumanDraftCommand(): void {
  // Store-connected rendering supplies the real shared command dispatcher.
}

function isEditableDraft(draft: AssignmentDraftView): boolean {
  return draft.workflowState === 'DRAFT_INVALID' || draft.workflowState === 'DRAFT_VALID';
}

export function PlanWorkspace({
  state,
  draft,
  requests,
  volunteers,
  toolNames,
  onCommand = ignoreHumanDraftCommand,
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
        {draft === null ? (
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
          </section>
        ) : (
          <section className="draft-placeholder" aria-labelledby="draft-placeholder-heading">
            <h3 id="draft-placeholder-heading">Draft v{draft.version}</h3>
            <p>
              {assignedCount} assigned · {unassignedCount} unassigned · {draft.errors.length} hard
              errors · {draft.warnings.length} warnings
            </p>
            <p>This exact version is read-only while the human approval workflow is active.</p>
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
