import { describe, expect, it } from 'vitest';
import {
  MAX_AUDIT_EVENTS,
  MAX_AUDIT_SUMMARY_CHARACTERS,
  appendAuditEvent,
  resetAuditHistory,
} from '../../src/domain/audit';
import { type AuditEventId } from '../../src/domain/types';

function dependencies() {
  let sequence = 0;
  return {
    now: () => '2026-08-26T12:00:00.000Z',
    nextAuditEventId: () => `A-${++sequence}` as AuditEventId,
  };
}

describe('bounded immutable audit history', () => {
  it('appends a sequenced immutable event and sanitizes its bounded summary', () => {
    const deps = dependencies();
    const history = appendAuditEvent(
      [],
      {
        type: 'DRAFT_CREATED',
        actor: 'agent',
        draftVersion: 1,
        safeSummary: `  created\n\t${'x'.repeat(500)}  `,
      },
      deps,
    );

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      id: 'A-1',
      sequence: 1,
      type: 'DRAFT_CREATED',
      actor: 'agent',
      draftVersion: 1,
      timestamp: '2026-08-26T12:00:00.000Z',
    });
    expect(history[0]?.safeSummary).not.toMatch(/[\n\t]/);
    expect(history[0]?.safeSummary.length).toBeLessThanOrEqual(MAX_AUDIT_SUMMARY_CHARACTERS);
    expect(Object.isFrozen(history)).toBe(true);
    expect(Object.isFrozen(history[0])).toBe(true);
  });

  it('does not mutate the prior history while appending', () => {
    const deps = dependencies();
    const first = appendAuditEvent(
      [],
      {
        type: 'DRAFT_CREATED',
        actor: 'agent',
        draftVersion: 1,
        safeSummary: 'Draft created.',
      },
      deps,
    );
    const second = appendAuditEvent(
      first,
      {
        type: 'DRAFT_REVISED',
        actor: 'agent',
        draftVersion: 2,
        safeSummary: 'Draft revised.',
      },
      deps,
    );

    expect(first).toHaveLength(1);
    expect(second.map(({ sequence }) => sequence)).toEqual([1, 2]);
    expect(second[0]).toBe(first[0]);
  });

  it('retains only the newest bounded window while preserving global sequence numbers', () => {
    const deps = dependencies();
    let history = [] as ReturnType<typeof appendAuditEvent>;

    for (let index = 0; index < MAX_AUDIT_EVENTS + 5; index += 1) {
      history = appendAuditEvent(
        history,
        {
          type: 'DRAFT_REVISED',
          actor: 'agent',
          draftVersion: index + 1,
          safeSummary: `Revision ${index + 1}.`,
        },
        deps,
      );
    }

    expect(history).toHaveLength(MAX_AUDIT_EVENTS);
    expect(history[0]?.sequence).toBe(6);
    expect(history.at(-1)?.sequence).toBe(MAX_AUDIT_EVENTS + 5);
  });

  it('resets prior history to one canonical human reset event', () => {
    const deps = dependencies();
    const history = resetAuditHistory(
      {
        actor: 'human',
        safeSummary: 'Canonical fictional scenario restored.',
      },
      deps,
    );

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      sequence: 1,
      type: 'SCENARIO_RESET',
      actor: 'human',
      draftVersion: null,
    });
  });
});
