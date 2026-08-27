import type { CoordinationOverviewView } from '../app/selectors.ts';

export interface MetricStripProps {
  readonly overview: CoordinationOverviewView;
}

function Metric({ label, value }: { readonly label: string; readonly value: number }) {
  const testId = `metric-${label.toLowerCase().replaceAll(' ', '-')}`;
  return (
    <div className="metric" data-testid={testId}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function MetricStrip({ overview }: MetricStripProps) {
  return (
    <section className="metric-strip surface" aria-labelledby="metric-strip-heading">
      <h2 id="metric-strip-heading">Live coordination summary</h2>
      <div className="metric-strip__grid">
        <Metric label="Open requests" value={overview.requestCount} />
        <Metric label="Available volunteers" value={overview.volunteerCount} />
        <Metric label="Assigned" value={overview.assignedCount} />
        <Metric label="Unassigned" value={overview.unassignedCount} />
        <Metric label="Hard errors" value={overview.errorCount} />
        <Metric label="Warnings" value={overview.warningCount} />
      </div>
    </section>
  );
}
