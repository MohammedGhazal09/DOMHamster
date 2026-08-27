import type { PublicRequestView } from '../app/selectors.ts';
import type { Language, Priority, RequestType, Skill, Zone } from '../domain/types.ts';

export interface RequestPanelProps {
  readonly requests: readonly PublicRequestView[];
}

const TYPE_LABELS: Readonly<Record<RequestType, string>> = Object.freeze({
  delivery: 'Food delivery',
  transport: 'Transport',
  setup: 'Community setup',
  translation: 'Translation',
  check_in: 'Check-in',
});

const PRIORITY_LABELS: Readonly<Record<Priority, string>> = Object.freeze({
  high: 'URGENT',
  medium: 'HIGH',
  low: 'NORMAL',
});

const ZONE_LABELS: Readonly<Record<Zone, string>> = Object.freeze({
  north: 'North',
  center: 'Central',
  east: 'East',
  south: 'South',
  west: 'West',
});

const SKILL_LABELS: Readonly<Record<Skill, string>> = Object.freeze({
  lifting: 'Lifting',
  driving: 'Driving',
  food_handling: 'Food handling',
  setup: 'Setup',
});

const LANGUAGE_LABELS: Readonly<Record<Language, string>> = Object.freeze({
  AR: 'Arabic',
  EN: 'English',
  UR: 'Urdu',
});

function constraintLabel(request: PublicRequestView): string {
  const language = request.requiredLanguages[0];
  if (language !== undefined) return LANGUAGE_LABELS[language];
  const skill = request.requiredSkills[0];
  if (skill !== undefined) return SKILL_LABELS[skill];
  return 'General support';
}

export function RequestPanel({ requests }: RequestPanelProps) {
  return (
    <section className="workspace-panel request-panel surface" aria-labelledby="requests-heading">
      <header className="workspace-panel__header">
        <h2 id="requests-heading">Requests</h2>
        <p>{requests.length} open · privacy-minimized</p>
      </header>
      <ol className="card-list" aria-label="Open assistance requests">
        {requests.map((request) => (
          <li className="request-card" key={request.id}>
            <div className="card-topline">
              <span className="mono identifier">{request.id}</span>
              <span className={`priority-badge priority-badge--${request.priority}`}>
                {PRIORITY_LABELS[request.priority]}
              </span>
            </div>
            <h3>{TYPE_LABELS[request.type]}</h3>
            <p>
              {ZONE_LABELS[request.zone]} · {request.timeWindow.start}–{request.timeWindow.end}
            </p>
            <span className="constraint-badge">{constraintLabel(request)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
