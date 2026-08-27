import {
  selectAssignmentDraft,
  selectAvailableVolunteers,
  selectCoordinationOverview,
  selectOpenRequests,
} from './selectors.ts';
import type { AppState } from '../domain/types.ts';
import { detectWebMcpCapability, type WebMcpCapabilityStatus } from '../webmcp/capability.ts';
import type { ToolName } from '../webmcp/contracts.ts';
import { desiredToolNames } from '../webmcp/lifecycle.ts';
import { AppHeader } from '../ui/AppHeader.tsx';
import { CapabilityNotice } from '../ui/CapabilityNotice.tsx';
import { JudgeBrief } from '../ui/JudgeBrief.tsx';
import { MetricStrip } from '../ui/MetricStrip.tsx';
import { PlanWorkspace } from '../ui/PlanWorkspace.tsx';
import { RequestPanel } from '../ui/RequestPanel.tsx';
import { VolunteerPanel } from '../ui/VolunteerPanel.tsx';
import { DEFAULT_READY_STATE } from './default-state.ts';
import './styles.css';

export interface AppProps {
  readonly state?: AppState;
  readonly capabilityStatus?: WebMcpCapabilityStatus;
  readonly registeredToolNames?: readonly ToolName[];
  readonly onOpenActivity?: () => void;
  readonly onOpenDiagnostics?: () => void;
  readonly onReset?: () => void;
}

function browserCapabilityStatus(): WebMcpCapabilityStatus {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return 'API_UNAVAILABLE';
  }
  return detectWebMcpCapability(document, window.location).status;
}

function noOperation(): void {
  // WP09 connects these visible human-only controls to the shared store.
}

export function App({
  state = DEFAULT_READY_STATE,
  capabilityStatus,
  registeredToolNames,
  onOpenActivity = noOperation,
  onOpenDiagnostics = noOperation,
  onReset = noOperation,
}: AppProps) {
  const resolvedCapability = capabilityStatus ?? browserCapabilityStatus();
  const visibleToolNames =
    registeredToolNames ??
    (resolvedCapability === 'AVAILABLE' ? desiredToolNames(state.workflowState) : Object.freeze([]));
  const overview = selectCoordinationOverview(state);
  const requests = selectOpenRequests(state);
  const volunteers = selectAvailableVolunteers(state);
  const draft = selectAssignmentDraft(state);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#coordination-workspace">
        Skip to coordination workspace
      </a>

      <AppHeader
        workflowState={state.workflowState}
        capabilityStatus={resolvedCapability}
        scenarioDate={state.scenario.date}
        onOpenActivity={onOpenActivity}
        onOpenDiagnostics={onOpenDiagnostics}
        onReset={onReset}
      />

      <CapabilityNotice status={resolvedCapability} />

      <section className="judge-summary" aria-label="Product and coordination summary">
        <JudgeBrief />
        <MetricStrip overview={overview} />
      </section>

      <main id="coordination-workspace" className="coordination-workspace" tabIndex={-1}>
        <RequestPanel requests={requests} />
        <PlanWorkspace state={state} draft={draft} toolNames={visibleToolNames} />
        <VolunteerPanel volunteers={volunteers} />
      </main>

      <footer className="app-footer">
        <span className="mono">{state.workflowState}</span>
        <span>Canonical fictional scenario</span>
        <span>No private contact fields rendered</span>
      </footer>
    </div>
  );
}

export default App;
