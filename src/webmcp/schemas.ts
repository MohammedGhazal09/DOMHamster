import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import { TOOL_CONTRACTS, type ToolName, type WebMcpInputSchema } from './contracts.ts';

export const MAX_SCHEMA_ISSUES = 8;
const MAX_INSTANCE_PATH_CHARACTERS = 160;
const MAX_KEYWORD_CHARACTERS = 64;

export interface SafeSchemaIssue {
  readonly instancePath: string;
  readonly keyword: string;
}

export interface InputValidationError {
  readonly code: 'INVALID_INPUT';
  readonly message: 'Tool input does not match the required schema.';
  readonly retryable: true;
  readonly details: {
    readonly issues: readonly SafeSchemaIssue[];
  };
}

export interface InputValidationSuccess {
  readonly ok: true;
  readonly value: unknown;
}

export interface InputValidationFailure {
  readonly ok: false;
  readonly error: InputValidationError;
}

export type InputValidationResult = InputValidationSuccess | InputValidationFailure;

const ajv = new Ajv({
  allErrors: true,
  strict: true,
  validateFormats: false,
});

export const COMPILED_TOOL_VALIDATORS = Object.freeze(
  Object.fromEntries(
    TOOL_CONTRACTS.map((contract) => [
      contract.name,
      ajv.compile(contract.inputSchema as WebMcpInputSchema),
    ]),
  ),
) as Readonly<Record<ToolName, ValidateFunction<unknown>>>;

function safeIssue(instancePath: string, keyword: string): SafeSchemaIssue {
  return Object.freeze({
    instancePath: instancePath.slice(0, MAX_INSTANCE_PATH_CHARACTERS),
    keyword: keyword.slice(0, MAX_KEYWORD_CHARACTERS),
  });
}

function issuesFromAjv(errors: readonly ErrorObject[] | null | undefined): SafeSchemaIssue[] {
  return (errors ?? [])
    .slice(0, MAX_SCHEMA_ISSUES)
    .map((error) => safeIssue(error.instancePath, error.keyword));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requestIdsFromObjects(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) =>
    isRecord(entry) && typeof entry.requestId === 'string' ? [entry.requestId] : [],
  );
}

function duplicateRequestIssues(
  requestIds: readonly string[],
  pathPrefix: string,
): SafeSchemaIssue[] {
  const firstIndexById = new Map<string, number>();
  const issues: SafeSchemaIssue[] = [];

  requestIds.forEach((requestId, index) => {
    if (firstIndexById.has(requestId)) {
      issues.push(safeIssue(`${pathPrefix}/${index}/requestId`, 'uniqueRequestId'));
    } else {
      firstIndexById.set(requestId, index);
    }
  });

  return issues;
}

function createDraftConditionalIssues(input: Record<string, unknown>): SafeSchemaIssue[] {
  const assignmentIds = requestIdsFromObjects(input.assignments);
  const issues = duplicateRequestIssues(assignmentIds, '/assignments');
  const assignedIds = new Set(assignmentIds);

  if (Array.isArray(input.unassignedRequestIds)) {
    input.unassignedRequestIds.forEach((requestId, index) => {
      if (typeof requestId === 'string' && assignedIds.has(requestId)) {
        issues.push(safeIssue(`/unassignedRequestIds/${index}`, 'requestAccounting'));
      }
    });
  }

  return issues;
}

function reviseDraftConditionalIssues(input: Record<string, unknown>): SafeSchemaIssue[] {
  if (!Array.isArray(input.changes)) {
    return [];
  }

  const issues = duplicateRequestIssues(requestIdsFromObjects(input.changes), '/changes');

  input.changes.forEach((entry, index) => {
    if (!isRecord(entry)) {
      return;
    }

    if (entry.action === 'SET_ASSIGNMENT') {
      if (typeof entry.volunteerId !== 'string' || typeof entry.startTime !== 'string') {
        issues.push(safeIssue(`/changes/${index}`, 'requiredForAction'));
      }
    }

    if (entry.action === 'SET_UNASSIGNED') {
      if ('volunteerId' in entry || 'startTime' in entry) {
        issues.push(safeIssue(`/changes/${index}`, 'forbiddenForAction'));
      }
    }
  });

  return issues;
}

function conditionalIssues(name: ToolName, input: unknown): SafeSchemaIssue[] {
  if (!isRecord(input)) {
    return [];
  }

  if (name === 'create_assignment_draft') {
    return createDraftConditionalIssues(input);
  }
  if (name === 'revise_assignment_draft') {
    return reviseDraftConditionalIssues(input);
  }
  return [];
}

function invalidInput(issues: readonly SafeSchemaIssue[]): InputValidationFailure {
  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code: 'INVALID_INPUT',
      message: 'Tool input does not match the required schema.',
      retryable: true,
      details: Object.freeze({
        issues: Object.freeze(issues.slice(0, MAX_SCHEMA_ISSUES)),
      }),
    }),
  });
}

export function validateToolInput(name: ToolName, input: unknown): InputValidationResult {
  const validator = COMPILED_TOOL_VALIDATORS[name];
  if (!validator(input)) {
    return invalidInput(issuesFromAjv(validator.errors));
  }

  const extraIssues = conditionalIssues(name, input);
  if (extraIssues.length > 0) {
    return invalidInput(extraIssues);
  }

  return Object.freeze({ ok: true, value: input });
}
