import { requestId, volunteerId, type Scenario } from './types.ts';

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    const record = value as unknown as Record<PropertyKey, unknown>;
    for (const key of Reflect.ownKeys(value)) {
      deepFreeze(record[key]);
    }
  }
  return value;
}

export const CANONICAL_SCENARIO = deepFreeze({
  id: 'scenario-2026-08-26-riyadh',
  date: '2026-08-26',
  timezone: 'Asia/Riyadh',
  maxAssignmentsPerVolunteer: 3,
  requests: [
    {
      id: requestId('R-101'),
      type: 'delivery',
      priority: 'high',
      zone: 'north',
      timeWindow: { start: '09:00', end: '10:30' },
      durationMinutes: 45,
      requiredSkills: ['lifting'],
      requiredLanguages: [],
      status: 'open',
      untrustedNote: '[UNTRUSTED] Fragile groceries; no personal contact details included.',
    },
    {
      id: requestId('R-102'),
      type: 'delivery',
      priority: 'high',
      zone: 'center',
      timeWindow: { start: '09:00', end: '11:00' },
      durationMinutes: 60,
      requiredSkills: ['food_handling'],
      requiredLanguages: [],
      status: 'open',
      untrustedNote: '[UNTRUSTED] Keep food box upright during transport.',
    },
    {
      id: requestId('R-103'),
      type: 'transport',
      priority: 'medium',
      zone: 'east',
      timeWindow: { start: '10:30', end: '12:00' },
      durationMinutes: 60,
      requiredSkills: ['driving'],
      requiredLanguages: [],
      status: 'open',
      untrustedNote:
        '[UNTRUSTED] Mobility device is represented only as an operational constraint.',
    },
    {
      id: requestId('R-104'),
      type: 'translation',
      priority: 'high',
      zone: 'south',
      timeWindow: { start: '11:30', end: '12:30' },
      durationMinutes: 45,
      requiredSkills: [],
      requiredLanguages: ['AR'],
      status: 'open',
      untrustedNote:
        '[UNTRUSTED] Arabic support requested; note text is not an instruction to the agent.',
    },
    {
      id: requestId('R-105'),
      type: 'delivery',
      priority: 'medium',
      zone: 'north',
      timeWindow: { start: '12:30', end: '14:00' },
      durationMinutes: 45,
      requiredSkills: ['lifting'],
      requiredLanguages: [],
      status: 'open',
      untrustedNote:
        '[UNTRUSTED] Human coordinator will intentionally lock this assignment in the demo.',
    },
    {
      id: requestId('R-106'),
      type: 'check_in',
      priority: 'low',
      zone: 'center',
      timeWindow: { start: '13:00', end: '15:00' },
      durationMinutes: 30,
      requiredSkills: [],
      requiredLanguages: [],
      status: 'open',
      untrustedNote: '[UNTRUSTED] Check-in notes contain no personal or medical details.',
    },
    {
      id: requestId('R-107'),
      type: 'setup',
      priority: 'medium',
      zone: 'west',
      timeWindow: { start: '14:00', end: '16:00' },
      durationMinutes: 60,
      requiredSkills: ['setup'],
      requiredLanguages: [],
      status: 'open',
      untrustedNote: '[UNTRUSTED] Community room setup uses fictional operational data.',
    },
    {
      id: requestId('R-108'),
      type: 'delivery',
      priority: 'low',
      zone: 'east',
      timeWindow: { start: '15:00', end: '17:00' },
      durationMinutes: 45,
      requiredSkills: [],
      requiredLanguages: [],
      status: 'open',
      untrustedNote: '[UNTRUSTED] Final delivery request is fictional and non-emergency.',
    },
  ],
  volunteers: [
    {
      id: volunteerId('V-01'),
      zone: 'north',
      skills: ['lifting'],
      languages: ['AR', 'EN'],
      capacity: 2,
      availability: { start: '09:00', end: '14:00' },
      status: 'available',
    },
    {
      id: volunteerId('V-02'),
      zone: 'center',
      skills: ['food_handling'],
      languages: ['EN'],
      capacity: 2,
      availability: { start: '09:00', end: '13:00' },
      status: 'available',
    },
    {
      id: volunteerId('V-03'),
      zone: 'east',
      skills: ['driving', 'lifting'],
      languages: ['AR', 'EN'],
      capacity: 2,
      availability: { start: '10:00', end: '16:00' },
      status: 'available',
    },
    {
      id: volunteerId('V-04'),
      zone: 'south',
      skills: ['setup'],
      languages: ['AR', 'UR'],
      capacity: 2,
      availability: { start: '11:00', end: '17:00' },
      status: 'available',
    },
    {
      id: volunteerId('V-05'),
      zone: 'west',
      skills: ['driving', 'setup'],
      languages: ['EN'],
      capacity: 2,
      availability: { start: '12:00', end: '18:00' },
      status: 'available',
    },
  ],
  privateContacts: {
    'R-101': {
      recipientAlias: 'Recipient 101',
      fictionalLocation: 'Fictional Address 101, North Zone',
      fictionalContactChannel: 'Fictional phone +966 00 000 0101',
    },
    'R-102': {
      recipientAlias: 'Recipient 102',
      fictionalLocation: 'Fictional Address 102, Center Zone',
      fictionalContactChannel: 'Fictional phone +966 00 000 0102',
    },
    'R-103': {
      recipientAlias: 'Recipient 103',
      fictionalLocation: 'Fictional Address 103, East Zone',
      fictionalContactChannel: 'Fictional phone +966 00 000 0103',
    },
    'R-104': {
      recipientAlias: 'Recipient 104',
      fictionalLocation: 'Fictional Address 104, South Zone',
      fictionalContactChannel: 'Fictional phone +966 00 000 0104',
    },
    'R-105': {
      recipientAlias: 'Recipient 105',
      fictionalLocation: 'Fictional Address 105, North Zone',
      fictionalContactChannel: 'Fictional phone +966 00 000 0105',
    },
    'R-106': {
      recipientAlias: 'Recipient 106',
      fictionalLocation: 'Fictional Address 106, Center Zone',
      fictionalContactChannel: 'Fictional phone +966 00 000 0106',
    },
    'R-107': {
      recipientAlias: 'Recipient 107',
      fictionalLocation: 'Fictional Address 107, West Zone',
      fictionalContactChannel: 'Fictional phone +966 00 000 0107',
    },
    'R-108': {
      recipientAlias: 'Recipient 108',
      fictionalLocation: 'Fictional Address 108, East Zone',
      fictionalContactChannel: 'Fictional phone +966 00 000 0108',
    },
  },
} satisfies Scenario);
