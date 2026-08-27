import { useState } from 'react';
import type { AssignmentDraftView } from '../app/selectors.ts';
import type { AppState } from '../domain/types.ts';
import type { ToolName } from '../webmcp/contracts.ts';
import { CANONICAL_DEMO_PROMPT } from './JudgeBrief.tsx';
import { HamsterMark } from './HamsterMark.tsx';

export interface PlanWorkspaceProps {
  readonly state: AppState;
  readonly draft: AssignmentDraftView | null;
  readonly toolNames: readonly ToolName[];
}

const MUTATING_TOOLS = new Set<ToolName>([
  'create_assignment_draft',
  'revise_assignment_draft',
  'prepare_plan_approval',
  'commit_assignment_plan',
  'access_dispatch_contacts',
]);

export function PlanWorkspace({ state, draft, toolNames }: PlanWorkspaceProps) {
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
        ) : (
          <section className="draft-placeholder" aria-labelledby="draft-placeholder-heading">
            <h3 id="draft-placeholder-heading">Draft v{draft.version}</h3>
            <p>
              {assignedCount} assigned · {unassignedCount} unassigned · {draft.errors.length} hard
              errors · {draft.warnings.length} warnings
            </p>
            <p>Detailed assignment controls are introduced in WP08.</p>
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
