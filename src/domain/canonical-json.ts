type CanonicalJsonValue =
  | null
  | boolean
  | number
  | string
  | CanonicalJsonValue[]
  | { [key: string]: CanonicalJsonValue };

function unsupported(reason: string): never {
  throw new TypeError(`DOMHAMSTER_UNSUPPORTED_CANONICAL_VALUE:${reason}`);
}

function normalize(value: unknown): CanonicalJsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : unsupported('non-finite-number');
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalize(entry));
  }

  if (typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return unsupported('non-plain-object');
    }

    const record = value as Record<string, unknown>;
    const normalized: Record<string, CanonicalJsonValue> = {};
    for (const key of Object.keys(record).sort()) {
      const entry = record[key];
      if (entry === undefined) {
        return unsupported('undefined');
      }
      normalized[key] = normalize(entry);
    }
    return normalized;
  }

  return unsupported(typeof value);
}

export function canonicalJson(value: unknown): string {
  const serialized = JSON.stringify(normalize(value));
  return serialized ?? unsupported('undefined');
}

function subtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  return subtle ?? unsupported('crypto-unavailable');
}

export async function sha256Hex(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(
    typeof value === 'string' ? value : canonicalJson(value),
  );
  const digest = await subtleCrypto().digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}
