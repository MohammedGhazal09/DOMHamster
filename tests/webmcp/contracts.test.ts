import { describe, expect, it } from 'vitest';
import {
  TOOL_CONTRACTS,
  TOOL_CONTRACT_BY_NAME,
  TOOL_NAMES,
  type ToolName,
  type WebMcpInputSchema,
} from '../../src/webmcp/contracts';

const EXPECTED_NAMES = [
  'get_coordination_overview',
  'list_open_requests',
  'list_available_volunteers',
  'create_assignment_draft',
  'get_assignment_draft',
  'validate_assignment_draft',
  'revise_assignment_draft',
  'prepare_plan_approval',
  'commit_assignment_plan',
  'get_committed_plan',
  'access_dispatch_contacts',
  'get_audit_history',
] as const satisfies readonly ToolName[];

const EXPECTED_METADATA = {
  get_coordination_overview: {
    title: 'Get coordination overview',
    readOnlyHint: true,
    untrustedContentHint: false,
  },
  list_open_requests: {
    title: 'List open requests',
    readOnlyHint: true,
    untrustedContentHint: true,
  },
  list_available_volunteers: {
    title: 'List available volunteers',
    readOnlyHint: true,
    untrustedContentHint: false,
  },
  create_assignment_draft: {
    title: 'Create assignment draft',
    readOnlyHint: false,
    untrustedContentHint: false,
  },
  get_assignment_draft: {
    title: 'Get assignment draft',
    readOnlyHint: true,
    untrustedContentHint: false,
  },
  validate_assignment_draft: {
    title: 'Validate assignment draft',
    readOnlyHint: true,
    untrustedContentHint: false,
  },
  revise_assignment_draft: {
    title: 'Revise assignment draft',
    readOnlyHint: false,
    untrustedContentHint: false,
  },
  prepare_plan_approval: {
    title: 'Prepare plan approval',
    readOnlyHint: false,
    untrustedContentHint: false,
  },
  commit_assignment_plan: {
    title: 'Commit assignment plan',
    readOnlyHint: false,
    untrustedContentHint: false,
  },
  get_committed_plan: {
    title: 'Get committed plan',
    readOnlyHint: true,
    untrustedContentHint: false,
  },
  access_dispatch_contacts: {
    title: 'Get dispatch contacts',
    readOnlyHint: false,
    untrustedContentHint: true,
  },
  get_audit_history: {
    title: 'Get audit history',
    readOnlyHint: true,
    untrustedContentHint: true,
  },
} as const;

const HUMAN_ONLY_TOOL_NAMES = [
  'lock_assignment',
  'unlock_assignment',
  'approve_plan',
  'reject_plan',
  'cancel_approval',
  'discard_draft',
  'reset_demo',
] as const;

function walkSchema(schema: unknown, visit: (entry: WebMcpInputSchema) => void): void {
  if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) {
    return;
  }

  const entry = schema as WebMcpInputSchema;
  visit(entry);

  for (const value of Object.values(entry)) {
    if (Array.isArray(value)) {
      for (const nested of value) {
        walkSchema(nested, visit);
      }
    } else {
      walkSchema(value, visit);
    }
  }
}

describe('WebMCP tool contracts', () => {
  it('freezes the exact ordered twelve-tool inventory', () => {
    expect(TOOL_NAMES).toEqual(EXPECTED_NAMES);
    expect(TOOL_CONTRACTS.map(({ name }) => name)).toEqual(EXPECTED_NAMES);
    expect(new Set(TOOL_NAMES).size).toBe(12);
    expect(Object.isFrozen(TOOL_NAMES)).toBe(true);
    expect(Object.isFrozen(TOOL_CONTRACTS)).toBe(true);
  });

  it('uses the approved titles and annotations without execute callbacks', () => {
    for (const contract of TOOL_CONTRACTS) {
      expect(contract.title).toBe(EXPECTED_METADATA[contract.name].title);
      expect(contract.annotations).toEqual({
        readOnlyHint: EXPECTED_METADATA[contract.name].readOnlyHint,
        untrustedContentHint: EXPECTED_METADATA[contract.name].untrustedContentHint,
      });
      expect('execute' in contract).toBe(false);
      expect(TOOL_CONTRACT_BY_NAME[contract.name]).toBe(contract);
    }
  });

  it('keeps metadata within the frozen agent-context budgets', () => {
    for (const contract of TOOL_CONTRACTS) {
      expect(contract.name.length).toBeLessThanOrEqual(30);
      expect(contract.title.length).toBeLessThanOrEqual(80);
      expect(contract.description.length).toBeGreaterThan(0);
      expect(contract.description.length).toBeLessThanOrEqual(500);

      walkSchema(contract.inputSchema, (schema) => {
        if (typeof schema.description === 'string') {
          expect(schema.description.length).toBeLessThanOrEqual(150);
        }
      });
    }
  });

  it('closes every object schema against undeclared properties', () => {
    for (const contract of TOOL_CONTRACTS) {
      walkSchema(contract.inputSchema, (schema) => {
        if (schema.type === 'object') {
          expect(schema.additionalProperties).toBe(false);
        }
      });
    }
  });

  it('deeply freezes contracts and their schemas', () => {
    for (const contract of TOOL_CONTRACTS) {
      expect(Object.isFrozen(contract)).toBe(true);
      expect(Object.isFrozen(contract.annotations)).toBe(true);
      walkSchema(contract.inputSchema, (schema) => {
        expect(Object.isFrozen(schema)).toBe(true);
      });
    }
  });

  it('never exposes human-only authority as a tool', () => {
    for (const forbiddenName of HUMAN_ONLY_TOOL_NAMES) {
      expect(TOOL_NAMES).not.toContain(forbiddenName);
    }
  });
});
