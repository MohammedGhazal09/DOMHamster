import type { PublicVolunteerView } from '../app/selectors.ts';
import type { Language, Skill, Zone } from '../domain/types.ts';

export interface VolunteerPanelProps {
  readonly volunteers: readonly PublicVolunteerView[];
}

const ZONE_LABELS: Readonly<Record<Zone, string>> = Object.freeze({
  north: 'North zone',
  center: 'Central zone',
  east: 'East zone',
  south: 'South zone',
  west: 'West zone',
});

const SKILL_LABELS: Readonly<Record<Skill, string>> = Object.freeze({
  lifting: 'Lifting',
  driving: 'Driving',
  food_handling: 'Food handling',
  setup: 'Setup',
});

const LANGUAGE_LABELS: Readonly<Record<Language, string>> = Object.freeze({
  AR: 'AR',
  EN: 'EN',
  UR: 'UR',
});

function capabilityLabel(volunteer: PublicVolunteerView): string {
  const skills = volunteer.skills.map((skill) => SKILL_LABELS[skill]).join(' · ');
  const languages = volunteer.languages.map((language) => LANGUAGE_LABELS[language]).join(' / ');
  return [skills, languages].filter(Boolean).join(' · ');
}

export function VolunteerPanel({ volunteers }: VolunteerPanelProps) {
  return (
    <aside className="workspace-panel volunteer-panel surface" aria-labelledby="volunteers-heading">
      <header className="workspace-panel__header">
        <h2 id="volunteers-heading">Volunteers</h2>
        <p>{volunteers.length} available · max 3 tasks</p>
      </header>
      <ol className="card-list" aria-label="Available volunteers">
        {volunteers.map((volunteer) => (
          <li className="volunteer-card" key={volunteer.id}>
            <div className="volunteer-card__details">
              <span className="mono identifier">{volunteer.id}</span>
              <p>{ZONE_LABELS[volunteer.zone]}</p>
              <span className="constraint-badge">{capabilityLabel(volunteer)}</span>
            </div>
            <div className="volunteer-load" aria-label={`${volunteer.currentLoad} of ${volunteer.capacity} tasks`}>
              <span>Load</span>
              <strong className="mono">
                {volunteer.currentLoad} / {volunteer.capacity}
              </strong>
              <span className="load-track" aria-hidden="true">
                <span
                  className="load-fill"
                  style={{ width: `${Math.min(100, (volunteer.currentLoad / volunteer.capacity) * 100)}%` }}
                />
              </span>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}
