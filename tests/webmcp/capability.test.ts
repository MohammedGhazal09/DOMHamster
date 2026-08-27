import { describe, expect, it } from 'vitest';
import type { ModelContextPort } from '../../src/app/ports.ts';
import {
  detectWebMcpCapability,
  type WebMcpCapability,
} from '../../src/webmcp/capability.ts';

const availableContext: ModelContextPort = {
  registerTool() {
    return undefined;
  },
};

function expectUnavailable(
  capability: WebMcpCapability,
  status: Exclude<WebMcpCapability['status'], 'AVAILABLE'>,
): void {
  expect(capability.available).toBe(false);
  expect(capability.status).toBe(status);
  expect(capability.modelContext).toBeUndefined();
  expect(Object.isFrozen(capability)).toBe(true);
}

describe('WebMCP capability detection', () => {
  it('rejects an insecure non-local context without touching document.modelContext', () => {
    let accessed = false;
    const documentLike = Object.defineProperty({}, 'modelContext', {
      get() {
        accessed = true;
        throw new Error('must not be read');
      },
    });

    expectUnavailable(
      detectWebMcpCapability(documentLike, {
        protocol: 'http:',
        hostname: 'example.com',
      }),
      'INSECURE_CONTEXT',
    );
    expect(accessed).toBe(false);
  });

  it.each(['localhost', '127.0.0.1', '::1'])(
    'treats http://%s as a development secure context',
    (hostname) => {
      const capability = detectWebMcpCapability(
        { modelContext: availableContext },
        { protocol: 'http:', hostname },
      );

      expect(capability).toEqual({
        available: true,
        status: 'AVAILABLE',
        modelContext: availableContext,
      });
    },
  );

  it('reports a missing API without fabricating readiness', () => {
    expectUnavailable(
      detectWebMcpCapability({}, { protocol: 'https:', hostname: 'domhamster.example' }),
      'API_UNAVAILABLE',
    );
  });

  it('rejects a non-callable registration surface', () => {
    expectUnavailable(
      detectWebMcpCapability(
        { modelContext: { registerTool: true } },
        { protocol: 'https:', hostname: 'domhamster.example' },
      ),
      'API_UNAVAILABLE',
    );
  });

  it('returns the available ModelContext port in an HTTPS context', () => {
    const capability = detectWebMcpCapability(
      { modelContext: availableContext },
      { protocol: 'https:', hostname: 'domhamster.example' },
    );

    expect(capability.available).toBe(true);
    expect(capability.status).toBe('AVAILABLE');
    expect(capability.modelContext).toBe(availableContext);
    expect(Object.isFrozen(capability)).toBe(true);
  });

  it('catches thrown property access without crashing or exposing the exception', () => {
    const sentinel = 'DO_NOT_EXPOSE_CAPABILITY_SECRET';
    const documentLike = Object.defineProperty({}, 'modelContext', {
      get() {
        throw new Error(sentinel);
      },
    });

    const capability = detectWebMcpCapability(documentLike, {
      protocol: 'https:',
      hostname: 'domhamster.example',
    });

    expectUnavailable(capability, 'ACCESS_ERROR');
    expect(JSON.stringify(capability)).not.toContain(sentinel);
  });
});
