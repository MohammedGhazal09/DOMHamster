import type { WebMcpCapabilityStatus } from '../webmcp/capability.ts';

export interface CapabilityNoticeProps {
  readonly status: WebMcpCapabilityStatus;
}

export function CapabilityNotice({ status }: CapabilityNoticeProps) {
  if (status === 'AVAILABLE') return null;

  return (
    <aside className="capability-notice" role="note" aria-label="WebMCP browser guidance">
      <strong>Coordinator mode remains available.</strong>
      <span>
        WebMCP tools are unavailable in this browser. The coordinator interface still works; open
        the site in ChatGPT’s in-app browser or Chrome with WebMCP testing enabled.
      </span>
    </aside>
  );
}
