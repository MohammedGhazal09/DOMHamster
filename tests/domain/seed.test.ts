import { describe, expect, it } from 'vitest';
import { canonicalJson, sha256Hex } from '../../src/domain/canonical-json';
import { CANONICAL_SCENARIO } from '../../src/domain/seed';
import { requestId, volunteerId } from '../../src/domain/types';

const EXPECTED_CANONICAL_HASH =
  'b861f7e997f2f14e087d209130de7e4aa465d8047110b11872edb7750a2122b1';

describe('canonical scenario', () => {
  it('contains exactly eight requests and five volunteers with unique stable IDs', () => {
    expect(CANONICAL_SCENARIO.requests).toHaveLength(8);
    expect(CANONICAL_SCENARIO.volunteers).toHaveLength(5);
    expect(new Set(CANONICAL_SCENARIO.requests.map(({ id }) => id)).size).toBe(8);
    expect(new Set(CANONICAL_SCENARIO.volunteers.map(({ id }) => id)).size).toBe(5);
    expect(CANONICAL_SCENARIO.requests.map(({ id }) => id)).toEqual([
      'R-101',
      'R-102',
      'R-103',
      'R-104',
      'R-105',
      'R-106',
      'R-107',
      'R-108',
    ]);
    expect(CANONICAL_SCENARIO.volunteers.map(({ id }) => id)).toEqual([
      'V-01',
      'V-02',
      'V-03',
      'V-04',
      'V-05',
    ]);
  });

  it('preserves the frozen coordination policy and required Arabic capability', () => {
    expect(CANONICAL_SCENARIO.timezone).toBe('Asia/Riyadh');
    expect(CANONICAL_SCENARIO.maxAssignmentsPerVolunteer).toBe(3);

    const arabicRequest = CANONICAL_SCENARIO.requests.find(({ id }) => id === 'R-104');
    const eastVolunteer = CANONICAL_SCENARIO.volunteers.find(({ id }) => id === 'V-03');

    expect(arabicRequest).toMatchObject({
      type: 'translation',
      requiredLanguages: ['AR'],
    });
    expect(eastVolunteer).toMatchObject({
      zone: 'east',
      skills: ['driving', 'lifting'],
      languages: ['AR', 'EN'],
    });
  });

  it('is deeply frozen', () => {
    expect(Object.isFrozen(CANONICAL_SCENARIO)).toBe(true);
    expect(Object.isFrozen(CANONICAL_SCENARIO.requests)).toBe(true);
    expect(Object.isFrozen(CANONICAL_SCENARIO.requests[0])).toBe(true);
    expect(Object.isFrozen(CANONICAL_SCENARIO.privateContacts['R-101'])).toBe(true);
  });

  it('has a stable canonical SHA-256 identity', async () => {
    expect(await sha256Hex(CANONICAL_SCENARIO)).toBe(EXPECTED_CANONICAL_HASH);
  });
});

describe('domain identifier factories', () => {
  it('accepts only the frozen request and volunteer ID shapes', () => {
    expect(requestId('R-101')).toBe('R-101');
    expect(volunteerId('V-01')).toBe('V-01');
    expect(() => requestId('request-101')).toThrowError('DOMHAMSTER_INVALID_REQUEST_ID');
    expect(() => volunteerId('V-001')).toThrowError('DOMHAMSTER_INVALID_VOLUNTEER_ID');
  });
});

describe('canonical JSON', () => {
  it('sorts object keys recursively while preserving array order', () => {
    expect(
      canonicalJson({
        z: 1,
        a: { y: 2, x: 3 },
        list: [{ b: 2, a: 1 }, 'second'],
      }),
    ).toBe('{"a":{"x":3,"y":2},"list":[{"a":1,"b":2},"second"],"z":1}');
  });

  it('rejects unsupported values instead of silently changing the fixture', () => {
    expect(() => canonicalJson({ value: undefined })).toThrowError(
      'DOMHAMSTER_UNSUPPORTED_CANONICAL_VALUE:undefined',
    );
    expect(() => canonicalJson(new Date('2026-08-26T00:00:00Z'))).toThrowError(
      'DOMHAMSTER_UNSUPPORTED_CANONICAL_VALUE:non-plain-object',
    );
    expect(() => canonicalJson(1n)).toThrowError(
      'DOMHAMSTER_UNSUPPORTED_CANONICAL_VALUE:bigint',
    );
  });

  it('hashes a raw string with the standard SHA-256 result', async () => {
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
