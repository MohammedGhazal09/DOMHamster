import { describe, expect, it } from 'vitest';
import { CANONICAL_SCENARIO } from '../../src/domain/seed';

const RESTRICTED_PUBLIC_KEYS = new Set([
  'recipientAlias',
  'fictionalLocation',
  'fictionalContactChannel',
]);

function collectKeys(value: unknown, keys: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectKeys(entry, keys);
    }
    return keys;
  }

  if (value !== null && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      keys.push(key);
      collectKeys(entry, keys);
    }
  }

  return keys;
}

describe('fictional fixture privacy boundaries', () => {
  it('keeps every private contact separate from public request records', () => {
    const requestIds = CANONICAL_SCENARIO.requests.map(({ id }) => id);
    const contactIds = Object.keys(CANONICAL_SCENARIO.privateContacts);
    const publicKeys = collectKeys(CANONICAL_SCENARIO.requests);
    const publicJson = JSON.stringify(CANONICAL_SCENARIO.requests);

    expect(contactIds).toEqual(requestIds);
    for (const restrictedKey of RESTRICTED_PUBLIC_KEYS) {
      expect(publicKeys).not.toContain(restrictedKey);
    }

    for (const contact of Object.values(CANONICAL_SCENARIO.privateContacts)) {
      for (const value of Object.values(contact)) {
        expect(publicJson).not.toContain(value);
      }
    }
  });

  it('uses explicit fictional placeholders without realistic email or mobile values', () => {
    const contacts = Object.values(CANONICAL_SCENARIO.privateContacts);

    for (const contact of contacts) {
      expect(contact.recipientAlias).toMatch(/^Recipient \d{3}$/);
      expect(contact.fictionalLocation).toMatch(/^Fictional Address \d{3}, /);
      expect(contact.fictionalContactChannel).toMatch(/^Fictional phone \+966 00 000 \d{4}$/);

      for (const value of Object.values(contact)) {
        expect(value).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        expect(value).not.toMatch(/(?:\+966|0)5\d{8}/);
      }
    }
  });

  it('marks every request note as untrusted input', () => {
    for (const request of CANONICAL_SCENARIO.requests) {
      expect(request.untrustedNote).toMatch(/^\[UNTRUSTED\] /);
    }
  });
});
