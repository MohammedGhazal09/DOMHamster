import type { ModelContextPort } from '../app/ports.ts';

export type WebMcpCapabilityStatus =
  'AVAILABLE' | 'INSECURE_CONTEXT' | 'API_UNAVAILABLE' | 'ACCESS_ERROR';

export type WebMcpCapability =
  | {
      readonly available: true;
      readonly status: 'AVAILABLE';
      readonly modelContext: ModelContextPort;
    }
  | {
      readonly available: false;
      readonly status: Exclude<WebMcpCapabilityStatus, 'AVAILABLE'>;
      readonly modelContext?: undefined;
    };

export interface LocationLike {
  readonly protocol: string;
  readonly hostname: string;
}

function secureLocation(location: LocationLike): boolean {
  if (location.protocol === 'https:') return true;
  if (location.protocol !== 'http:') return false;
  return (
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname === '::1'
  );
}

function unavailable(status: Exclude<WebMcpCapabilityStatus, 'AVAILABLE'>): WebMcpCapability {
  return Object.freeze({ available: false, status });
}

export function detectWebMcpCapability(
  documentLike: unknown,
  location: LocationLike,
): WebMcpCapability {
  if (!secureLocation(location)) {
    return unavailable('INSECURE_CONTEXT');
  }

  try {
    if (documentLike === null || typeof documentLike !== 'object') {
      return unavailable('API_UNAVAILABLE');
    }

    const modelContext = Reflect.get(documentLike, 'modelContext') as unknown;
    if (
      modelContext === null ||
      typeof modelContext !== 'object' ||
      typeof Reflect.get(modelContext, 'registerTool') !== 'function'
    ) {
      return unavailable('API_UNAVAILABLE');
    }

    return Object.freeze({
      available: true,
      status: 'AVAILABLE',
      modelContext: modelContext as ModelContextPort,
    });
  } catch {
    return unavailable('ACCESS_ERROR');
  }
}
