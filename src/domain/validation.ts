import type {
  Assignment,
  Request,
  RequestId,
  Scenario,
  ValidationIssue,
  ValidationResult,
  Volunteer,
  VolunteerId,
} from './types.ts';

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export interface HumanLockSnapshot {
  readonly requestId: RequestId;
  readonly volunteerId: VolunteerId | null;
  readonly startTime: Assignment['startTime'];
  readonly durationMinutes: number;
  readonly status: Assignment['status'];
}

export interface ValidationContext {
  readonly scenario: Scenario;
  readonly assignments: readonly Assignment[];
  readonly humanLocks: readonly HumanLockSnapshot[];
}

interface AssignmentInterval {
  readonly requestId: RequestId;
  readonly volunteerId: VolunteerId;
  readonly startMinutes: number;
  readonly endMinutes: number;
}

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function compareAssignments(left: Assignment, right: Assignment): number {
  return (
    compareText(left.requestId, right.requestId) ||
    compareText(left.volunteerId ?? '', right.volunteerId ?? '') ||
    compareText(left.startTime ?? '', right.startTime ?? '') ||
    left.durationMinutes - right.durationMinutes ||
    compareText(left.status, right.status)
  );
}

function sortRequestIds(requestIds: readonly RequestId[]): readonly RequestId[] {
  return Object.freeze([...requestIds].sort(compareText));
}

function makeIssue(
  code: string,
  severity: ValidationIssue['severity'],
  message: string,
  requestIds: readonly RequestId[],
  volunteerId?: VolunteerId,
): ValidationIssue {
  const base = {
    code,
    severity,
    message,
    requestIds: sortRequestIds(requestIds),
  };

  return Object.freeze(
    volunteerId === undefined
      ? base
      : {
          ...base,
          volunteerId,
        },
  );
}

function issueKey(issue: ValidationIssue): string {
  return `${issue.code}|${issue.requestIds.join(',')}|${issue.volunteerId ?? ''}`;
}

function addUniqueIssue(
  issues: ValidationIssue[],
  seen: Set<string>,
  issue: ValidationIssue,
): void {
  const key = issueKey(issue);
  if (!seen.has(key)) {
    seen.add(key);
    issues.push(issue);
  }
}

function compareIssues(left: ValidationIssue, right: ValidationIssue): number {
  return compareText(issueKey(left), issueKey(right));
}

function timeToMinutes(value: Assignment['startTime']): number | null {
  if (value === null || !TIME_PATTERN.test(value)) {
    return null;
  }

  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
}

function windowStart(value: Request['timeWindow']['start']): number {
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
}

function windowEnd(value: Request['timeWindow']['end']): number {
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
}

function includesEvery<Value>(available: readonly Value[], required: readonly Value[]): boolean {
  return required.every((value) => available.includes(value));
}

function sameLockAssignment(assignment: Assignment, lock: HumanLockSnapshot): boolean {
  return (
    assignment.requestId === lock.requestId &&
    assignment.volunteerId === lock.volunteerId &&
    assignment.startTime === lock.startTime &&
    assignment.durationMinutes === lock.durationMinutes &&
    assignment.status === lock.status
  );
}

function freezeIssues(issues: ValidationIssue[]): readonly ValidationIssue[] {
  return Object.freeze([...issues].sort(compareIssues));
}

function requestMap(scenario: Scenario): ReadonlyMap<RequestId, Request> {
  return new Map(scenario.requests.map((request) => [request.id, request] as const));
}

function volunteerMap(scenario: Scenario): ReadonlyMap<VolunteerId, Volunteer> {
  return new Map(scenario.volunteers.map((volunteer) => [volunteer.id, volunteer] as const));
}

export function validateDraft(context: ValidationContext): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const seenErrors = new Set<string>();
  const seenWarnings = new Set<string>();
  const requestsById = requestMap(context.scenario);
  const volunteersById = volunteerMap(context.scenario);
  const assignments = context.assignments
    .map((assignment) => ({ ...assignment }))
    .sort(compareAssignments);
  const assignmentsByRequest = new Map<RequestId, Assignment[]>();
  const scheduledByVolunteer = new Map<VolunteerId, Assignment[]>();
  const intervalsByVolunteer = new Map<VolunteerId, AssignmentInterval[]>();

  for (const assignment of assignments) {
    const existing = assignmentsByRequest.get(assignment.requestId);
    if (existing === undefined) {
      assignmentsByRequest.set(assignment.requestId, [assignment]);
    } else {
      existing.push(assignment);
    }
  }

  for (const [assignedRequestId, requestAssignments] of assignmentsByRequest) {
    if (requestAssignments.length > 1) {
      addUniqueIssue(
        errors,
        seenErrors,
        makeIssue(
          'DUPLICATE_REQUEST_ASSIGNMENT',
          'error',
          'Request appears more than once in the assignment draft.',
          [assignedRequestId],
        ),
      );
    }
  }

  for (const assignment of assignments) {
    const request = requestsById.get(assignment.requestId);
    const volunteer =
      assignment.volunteerId === null ? undefined : volunteersById.get(assignment.volunteerId);
    const scheduled = assignment.status !== 'unassigned';
    const startMinutes = timeToMinutes(assignment.startTime);
    const durationValid =
      Number.isInteger(assignment.durationMinutes) && assignment.durationMinutes > 0;
    const shapeValid = scheduled
      ? assignment.volunteerId !== null && startMinutes !== null
      : assignment.volunteerId === null && assignment.startTime === null;
    const durationMatchesRequest =
      request === undefined || assignment.durationMinutes === request.durationMinutes;

    if (request === undefined) {
      addUniqueIssue(
        errors,
        seenErrors,
        makeIssue(
          'UNKNOWN_REQUEST',
          'error',
          'Assignment references a request outside the canonical scenario.',
          [assignment.requestId],
        ),
      );
    }

    if (assignment.volunteerId !== null && volunteer === undefined) {
      addUniqueIssue(
        errors,
        seenErrors,
        makeIssue(
          'UNKNOWN_VOLUNTEER',
          'error',
          'Assignment references a volunteer outside the canonical scenario.',
          [assignment.requestId],
          assignment.volunteerId,
        ),
      );
    }

    if (!durationValid || !shapeValid || !durationMatchesRequest) {
      addUniqueIssue(
        errors,
        seenErrors,
        makeIssue(
          'INVALID_ASSIGNMENT_TIME',
          'error',
          'Assignment timing or duration is malformed for its status.',
          [assignment.requestId],
          assignment.volunteerId ?? undefined,
        ),
      );
    }

    if (!scheduled) {
      continue;
    }

    if (volunteer !== undefined && assignment.volunteerId !== null) {
      const volunteerAssignments = scheduledByVolunteer.get(volunteer.id);
      if (volunteerAssignments === undefined) {
        scheduledByVolunteer.set(volunteer.id, [assignment]);
      } else {
        volunteerAssignments.push(assignment);
      }
    }

    if (request !== undefined && volunteer !== undefined) {
      if (!includesEvery(volunteer.skills, request.requiredSkills)) {
        addUniqueIssue(
          errors,
          seenErrors,
          makeIssue(
            'MISSING_REQUIRED_SKILL',
            'error',
            'Volunteer does not satisfy every required skill.',
            [request.id],
            volunteer.id,
          ),
        );
      }

      if (!includesEvery(volunteer.languages, request.requiredLanguages)) {
        addUniqueIssue(
          errors,
          seenErrors,
          makeIssue(
            'MISSING_REQUIRED_LANGUAGE',
            'error',
            'Volunteer does not satisfy every required language.',
            [request.id],
            volunteer.id,
          ),
        );
      }

      if (request.priority !== 'high' && request.zone !== volunteer.zone) {
        addUniqueIssue(
          warnings,
          seenWarnings,
          makeIssue(
            'ZONE_INEFFICIENCY',
            'warning',
            'A noncritical request is assigned outside the volunteer home zone.',
            [request.id],
            volunteer.id,
          ),
        );
      }
    }

    if (startMinutes !== null && durationValid) {
      const endMinutes = startMinutes + assignment.durationMinutes;

      if (request !== undefined) {
        if (
          startMinutes < windowStart(request.timeWindow.start) ||
          endMinutes > windowEnd(request.timeWindow.end)
        ) {
          addUniqueIssue(
            errors,
            seenErrors,
            makeIssue(
              'REQUEST_TIME_WINDOW_VIOLATION',
              'error',
              'Assignment falls outside the request time window.',
              [request.id],
              assignment.volunteerId ?? undefined,
            ),
          );
        }
      }

      if (volunteer !== undefined) {
        if (
          startMinutes < windowStart(volunteer.availability.start) ||
          endMinutes > windowEnd(volunteer.availability.end)
        ) {
          addUniqueIssue(
            errors,
            seenErrors,
            makeIssue(
              'VOLUNTEER_UNAVAILABLE',
              'error',
              'Assignment falls outside volunteer availability.',
              [assignment.requestId],
              volunteer.id,
            ),
          );
        }

        const intervals = intervalsByVolunteer.get(volunteer.id);
        const interval = {
          requestId: assignment.requestId,
          volunteerId: volunteer.id,
          startMinutes,
          endMinutes,
        } satisfies AssignmentInterval;
        if (intervals === undefined) {
          intervalsByVolunteer.set(volunteer.id, [interval]);
        } else {
          intervals.push(interval);
        }
      }
    }
  }

  for (const volunteer of [...context.scenario.volunteers].sort((left, right) =>
    compareText(left.id, right.id),
  )) {
    const volunteerAssignments = scheduledByVolunteer.get(volunteer.id) ?? [];
    if (volunteerAssignments.length > context.scenario.maxAssignmentsPerVolunteer) {
      addUniqueIssue(
        errors,
        seenErrors,
        makeIssue(
          'VOLUNTEER_WORKLOAD_EXCEEDED',
          'error',
          'Volunteer exceeds the scenario assignment limit.',
          volunteerAssignments.map(({ requestId }) => requestId),
          volunteer.id,
        ),
      );
    }
  }

  for (const [assignedVolunteerId, intervals] of intervalsByVolunteer) {
    const orderedIntervals = [...intervals].sort(
      (left, right) =>
        left.startMinutes - right.startMinutes || compareText(left.requestId, right.requestId),
    );

    for (let leftIndex = 0; leftIndex < orderedIntervals.length; leftIndex += 1) {
      const left = orderedIntervals[leftIndex];
      if (left === undefined) {
        continue;
      }

      for (let rightIndex = leftIndex + 1; rightIndex < orderedIntervals.length; rightIndex += 1) {
        const right = orderedIntervals[rightIndex];
        if (right === undefined) {
          continue;
        }
        if (right.startMinutes >= left.endMinutes) {
          break;
        }

        addUniqueIssue(
          errors,
          seenErrors,
          makeIssue(
            'VOLUNTEER_TIME_OVERLAP',
            'error',
            'Volunteer assignments overlap in time.',
            [left.requestId, right.requestId],
            assignedVolunteerId,
          ),
        );
      }
    }
  }

  for (const request of [...context.scenario.requests].sort((left, right) =>
    compareText(left.id, right.id),
  )) {
    const requestAssignments = assignmentsByRequest.get(request.id) ?? [];
    const hasScheduledAssignment = requestAssignments.some(
      (assignment) => assignment.status !== 'unassigned',
    );
    if (!hasScheduledAssignment) {
      addUniqueIssue(
        warnings,
        seenWarnings,
        makeIssue(
          'REQUEST_UNASSIGNED',
          'warning',
          'Request has no planned or committed assignment.',
          [request.id],
        ),
      );
    }
  }

  for (const lock of [...context.humanLocks].sort((left, right) =>
    compareText(left.requestId, right.requestId),
  )) {
    const requestAssignments = assignmentsByRequest.get(lock.requestId) ?? [];
    const preserved =
      requestAssignments.length === 1 &&
      requestAssignments[0] !== undefined &&
      sameLockAssignment(requestAssignments[0], lock);

    if (!preserved) {
      addUniqueIssue(
        errors,
        seenErrors,
        makeIssue(
          'HUMAN_LOCK_VIOLATION',
          'error',
          'An authoritative human-locked assignment was modified or removed.',
          [lock.requestId],
          lock.volunteerId ?? undefined,
        ),
      );
    }
  }

  const workload = [...context.scenario.volunteers]
    .sort((left, right) => compareText(left.id, right.id))
    .map((volunteer) => ({
      volunteerId: volunteer.id,
      assignments: scheduledByVolunteer.get(volunteer.id) ?? [],
    }));

  if (workload.length > 0) {
    const counts = workload.map(({ assignments: entries }) => entries.length);
    const maximum = Math.max(...counts);
    const minimum = Math.min(...counts);

    if (maximum - minimum > 1) {
      const busiest = workload.find(({ assignments: entries }) => entries.length === maximum);
      if (busiest !== undefined) {
        addUniqueIssue(
          warnings,
          seenWarnings,
          makeIssue(
            'WORKLOAD_IMBALANCE',
            'warning',
            'Assigned workload differs by more than one request across volunteers.',
            busiest.assignments.map(({ requestId }) => requestId),
            busiest.volunteerId,
          ),
        );
      }
    }
  }

  const frozenErrors = freezeIssues(errors);
  const frozenWarnings = freezeIssues(warnings);

  return Object.freeze({
    valid: frozenErrors.length === 0,
    errors: frozenErrors,
    warnings: frozenWarnings,
  });
}
