import { describe, expect, it } from 'vitest';
import type { BuildInfoPort } from '../../src/app/ports.ts';
import {
  createDiagnosticsSnapshot,
  type DiagnosticsInput,
} from '../../src/diagnostics/diagnostics.ts';
import { desiredToolNames } from '../../src/webmcp/lifecycle.ts';
import { workflowStates } from '../helpers/webmcp-fixtures.ts';

const buildInfo: BuildInfoPort = {
  version: '0.0.0-test',
  commitSha: '0123456789abcdef0123456789abcdef01234567',
  fixtureHash: 'b861f7e997f2f14e087d209130de7e4aa465d8047110b11872edb7750a2122b1',
};

function input(overrides: Partial<DiagnosticsInput> = {}): DiagnosticsInput {
  const state = workflowStates().DRAFT_VALID;
  return {
    buildInfo,
    state,
    capabilityStatus: 'AVAILABLE',
    desiredToolNames: desiredToolNames(state.workflowState),
    registeredToolNames: desiredToolNames(state.workflowState),
    persistenceStatus: 'READY',
    recentErrorCodes: ['INVALID_INPUT', 'STALE_DRAFT_VERSION'],
    ...overrides,
  };
}

describe('sanitized diagnostics', () => {
  it('exposes only the approved operational snapshot', () => {
    const snapshot = createDiagnosticsSnapshot(input());

    expect(snapshot).toEqual({
      build: {
        version: buildInfo.version,
        commitSha: buildInfo.commitSha,
      },
      fixtureHash: buildInfo.fixtureHash,
      workflowState: 'DRAFT_VALID',
      draftVersion: 1,
      capabilityStatus: 'AVAILABLE',
      desiredToolNames: desiredToolNames('DRAFT_VALID'),
      registeredToolNames: desiredToolNames('DRAFT_VALID'),
      persistenceStatus: 'READY',
      recentErrorCodes: ['INVALID_INPUT', 'STALE_DRAFT_VERSION'],
    });
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.build)).toBe(true);
    expect(Object.isFrozen(snapshot.desiredToolNames)).toBe(true);
  });

  it('never serializes raw notes, contacts, prompts, full state, or stack traces', () => {
    const sentinel = 'DO_NOT_EXPOSE_DIAGNOSTIC_SECRET';
    const snapshot = createDiagnosticsSnapshot(
      input({
        recentErrorCodes: ['INTERNAL_ERROR', sentinel, 'Error: secret\n    at forbidden stack'],
      }),
    );
    const serialized = JSON.stringify(snapshot);

    expect(serialized).not.toContain(sentinel);
    expect(serialized).not.toContain('Fictional phone');
    expect(serialized).not.toContain('Fictional Address');
    expect(serialized).not.toContain('[UNTRUSTED]');
    expect(serialized).not.toContain('stack');
    expect(serialized).not.toContain('scenario');
    expect(snapshot.recentErrorCodes).toEqual(['INTERNAL_ERROR']);
  });

  it('bounds build fields, error history, and tool lists', () => {
    const snapshot = createDiagnosticsSnapshot(
      input({
        buildInfo: {
          version: 'v'.repeat(200),
          commitSha: 'c'.repeat(200),
          fixtureHash: 'f'.repeat(200),
        },
        desiredToolNames: Array.from({ length: 40 }, () => 'get_coordination_overview' as const),
        registeredToolNames: Array.from({ length: 40 }, () => 'get_audit_history' as const),
        recentErrorCodes: Array.from({ length: 40 }, (_, index) => `SAFE_${index}`),
      }),
    );

    expect(snapshot.build.version.length).toBeLessThanOrEqual(64);
    expect(snapshot.build.commitSha.length).toBeLessThanOrEqual(64);
    expect(snapshot.fixtureHash.length).toBeLessThanOrEqual(128);
    expect(snapshot.desiredToolNames.length).toBeLessThanOrEqual(12);
    expect(snapshot.registeredToolNames.length).toBeLessThanOrEqual(12);
    expect(snapshot.recentErrorCodes.length).toBeLessThanOrEqual(10);
  });

  it('reports null draft version outside draft-bearing states', () => {
    const state = workflowStates().READY;
    const snapshot = createDiagnosticsSnapshot(
      input({
        state,
        desiredToolNames: desiredToolNames('READY'),
        registeredToolNames: desiredToolNames('READY'),
      }),
    );

    expect(snapshot.workflowState).toBe('READY');
    expect(snapshot.draftVersion).toBeNull();
  });
});
