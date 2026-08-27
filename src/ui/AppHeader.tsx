import type { WorkflowState } from '../domain/types.ts';
import type { WebMcpCapabilityStatus } from '../webmcp/capability.ts';
import { HamsterMark } from './HamsterMark.tsx';

export interface AppHeaderProps {
  readonly workflowState: WorkflowState;
  readonly capabilityStatus: WebMcpCapabilityStatus;
  readonly scenarioDate: string;
  readonly onOpenActivity: () => void;
  readonly onOpenDiagnostics: () => void;
  readonly onReset: () => void;
}

function formatScenarioDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return `${value} · Riyadh`;
  const date = new Date(Date.UTC(year, month - 1, day));
  const formatted = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
  return `${formatted} · Riyadh`;
}

export function AppHeader({
  workflowState,
  capabilityStatus,
  scenarioDate,
  onOpenActivity,
  onOpenDiagnostics,
  onReset,
}: AppHeaderProps) {
  const connected = capabilityStatus === 'AVAILABLE';

  return (
    <header className="app-header surface">
      <div className="brand-lockup">
        <HamsterMark className="brand-mark" />
        <div>
          <h1>DOMHamster</h1>
          <p>The human-approved agent dispatcher</p>
        </div>
      </div>

      <span className={`status-chip status-chip--${workflowState.toLowerCase()}`}>
        {workflowState}
      </span>

      <span className={`capability-chip ${connected ? 'is-connected' : 'is-unavailable'}`}>
        {connected ? 'WebMCP connected' : 'WebMCP unavailable'}
      </span>

      <div className="scenario-date">
        <span>Scenario date</span>
        <strong>{formatScenarioDate(scenarioDate)}</strong>
      </div>

      <nav className="global-actions" aria-label="Application actions">
        <button
          id="activity-action"
          type="button"
          className="button button--secondary"
          onClick={onOpenActivity}
        >
          Activity
        </button>
        <button
          id="diagnostics-action"
          type="button"
          className="button button--secondary"
          onClick={onOpenDiagnostics}
        >
          Diagnostics
        </button>
        <button
          id="reset-action"
          type="button"
          className="button button--danger"
          onClick={onReset}
        >
          Reset
        </button>
      </nav>
    </header>
  );
}
