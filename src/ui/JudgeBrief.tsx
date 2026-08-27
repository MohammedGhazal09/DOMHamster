import { useState } from 'react';

export const CANONICAL_DEMO_PROMPT =
  'Build today’s plan. Prioritize urgent food deliveries, keep every volunteer at three tasks or fewer, and make sure R-104 has an Arabic-speaking volunteer.';

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  throw new Error('DOMHAMSTER_CLIPBOARD_UNAVAILABLE');
}

export function JudgeBrief() {
  const [announcement, setAnnouncement] = useState('');

  async function copyPrompt(): Promise<void> {
    try {
      await copyText(CANONICAL_DEMO_PROMPT);
      setAnnouncement('Demo prompt copied.');
    } catch {
      setAnnouncement('Copy failed. Select and copy the prompt manually.');
    }
  }

  return (
    <section className="judge-brief surface" aria-labelledby="judge-brief-heading">
      <h2 id="judge-brief-heading">
        Coordinate the day. Let the agent draft. Keep the human in charge.
      </h2>
      <p className="judge-brief__explanation">
        DOMHamster turns a live coordination board into structured WebMCP tools so an agent can
        build and repair a plan while a coordinator controls locks and approval.
      </p>

      <div className="demo-prompt">
        <div>
          <span>Demo prompt</span>
          <code>{CANONICAL_DEMO_PROMPT}</code>
        </div>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => void copyPrompt()}
        >
          Copy prompt
        </button>
      </div>

      <p className="safety-disclaimer">
        Fictional demo data only. DOMHamster is for non-emergency coordination and is not an
        emergency-dispatch system.
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
