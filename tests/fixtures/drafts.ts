import { requestId, volunteerId, type Assignment } from '../../src/domain/types';

const BASE_ASSIGNMENTS = [
  {
    requestId: requestId('R-101'),
    volunteerId: volunteerId('V-01'),
    startTime: '09:00',
    durationMinutes: 45,
    status: 'planned',
    lockedByHuman: false,
  },
  {
    requestId: requestId('R-102'),
    volunteerId: volunteerId('V-02'),
    startTime: '09:00',
    durationMinutes: 60,
    status: 'planned',
    lockedByHuman: false,
  },
  {
    requestId: requestId('R-103'),
    volunteerId: volunteerId('V-03'),
    startTime: '10:30',
    durationMinutes: 60,
    status: 'planned',
    lockedByHuman: false,
  },
  {
    requestId: requestId('R-104'),
    volunteerId: volunteerId('V-04'),
    startTime: '11:30',
    durationMinutes: 45,
    status: 'planned',
    lockedByHuman: false,
  },
  {
    requestId: requestId('R-105'),
    volunteerId: volunteerId('V-01'),
    startTime: '12:30',
    durationMinutes: 45,
    status: 'planned',
    lockedByHuman: false,
  },
  {
    requestId: requestId('R-106'),
    volunteerId: volunteerId('V-04'),
    startTime: '13:00',
    durationMinutes: 30,
    status: 'planned',
    lockedByHuman: false,
  },
  {
    requestId: requestId('R-107'),
    volunteerId: volunteerId('V-05'),
    startTime: '14:00',
    durationMinutes: 60,
    status: 'planned',
    lockedByHuman: false,
  },
  {
    requestId: requestId('R-108'),
    volunteerId: volunteerId('V-03'),
    startTime: '15:00',
    durationMinutes: 45,
    status: 'planned',
    lockedByHuman: false,
  },
] satisfies readonly Assignment[];

export type AssignmentPatch = Partial<Omit<Assignment, 'requestId'>>;

export function validAssignments(): Assignment[] {
  return BASE_ASSIGNMENTS.map((assignment) => ({ ...assignment }));
}

export function assignmentFor(
  assignments: readonly Assignment[],
  id: Assignment['requestId'],
): Assignment {
  const assignment = assignments.find(({ requestId: candidate }) => candidate === id);
  if (!assignment) {
    throw new Error('TEST_FIXTURE_ASSIGNMENT_MISSING');
  }
  return { ...assignment };
}

export function replaceAssignment(
  assignments: readonly Assignment[],
  id: Assignment['requestId'],
  patch: AssignmentPatch,
): Assignment[] {
  return assignments.map((assignment) =>
    assignment.requestId === id ? { ...assignment, ...patch } : { ...assignment },
  );
}

export function omitAssignment(
  assignments: readonly Assignment[],
  id: Assignment['requestId'],
): Assignment[] {
  return assignments
    .filter(({ requestId: candidate }) => candidate !== id)
    .map((entry) => ({
      ...entry,
    }));
}
