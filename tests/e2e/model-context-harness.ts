import type { Page } from '@playwright/test';

export const VALID_DRAFT_INPUT = Object.freeze({
  assignments: Object.freeze([
    { requestId: 'R-101', volunteerId: 'V-01', startTime: '09:00' },
    { requestId: 'R-102', volunteerId: 'V-02', startTime: '09:00' },
    { requestId: 'R-103', volunteerId: 'V-03', startTime: '10:30' },
    { requestId: 'R-104', volunteerId: 'V-04', startTime: '11:30' },
    { requestId: 'R-105', volunteerId: 'V-03', startTime: '11:00' },
    { requestId: 'R-106', volunteerId: 'V-03', startTime: '13:00' },
    { requestId: 'R-107', volunteerId: 'V-05', startTime: '14:00' },
    { requestId: 'R-108', volunteerId: 'V-04', startTime: '15:00' },
  ]),
  unassignedRequestIds: Object.freeze([] as string[]),
  goal: 'Use the deterministic canonical fixture.',
});

export const EXPECTED_TOOL_NAMES = Object.freeze({
  READY: Object.freeze([
    'get_coordination_overview',
    'list_open_requests',
    'list_available_volunteers',
    'create_assignment_draft',
    'get_audit_history',
  ]),
  DRAFT_INVALID: Object.freeze([
    'get_coordination_overview',
    'list_open_requests',
    'list_available_volunteers',
    'get_assignment_draft',
    'validate_assignment_draft',
    'revise_assignment_draft',
    'get_audit_history',
  ]),
  DRAFT_VALID: Object.freeze([
    'get_coordination_overview',
    'list_open_requests',
    'list_available_volunteers',
    'get_assignment_draft',
    'validate_assignment_draft',
    'revise_assignment_draft',
    'prepare_plan_approval',
    'get_audit_history',
  ]),
  AWAITING_APPROVAL: Object.freeze([
    'get_assignment_draft',
    'validate_assignment_draft',
    'get_audit_history',
  ]),
  APPROVED: Object.freeze([
    'get_assignment_draft',
    'validate_assignment_draft',
    'commit_assignment_plan',
    'get_audit_history',
  ]),
  COMMITTED: Object.freeze([
    'get_committed_plan',
    'access_dispatch_contacts',
    'get_audit_history',
  ]),
});

export async function installToolHarness(page: Page): Promise<void> {
  await page.addInitScript(() => {
    type RegisteredTool = {
      readonly name: string;
      execute(
        input: object,
        options: { readonly signal: AbortSignal },
      ): Promise<unknown>;
    };
    const tools = new Map<string, RegisteredTool>();
    const capturedTools = new Map<string, RegisteredTool>();

    Object.defineProperty(window, '__domhamsterTools', {
      configurable: true,
      value: tools,
    });
    Object.defineProperty(window, '__domhamsterCapturedTools', {
      configurable: true,
      value: capturedTools,
    });
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        registerTool(tool: RegisteredTool, options?: { readonly signal?: AbortSignal }) {
          tools.set(tool.name, tool);
          options?.signal?.addEventListener(
            'abort',
            () => {
              if (tools.get(tool.name) === tool) tools.delete(tool.name);
            },
            { once: true },
          );
          return Promise.resolve();
        },
      },
    });
  });
}

export async function toolNames(page: Page): Promise<readonly string[]> {
  return page.evaluate(() =>
    Array.from(
      (window as unknown as { __domhamsterTools: Map<string, unknown> }).__domhamsterTools.keys(),
    ),
  );
}

export async function runTool(
  page: Page,
  name: string,
  input: object,
): Promise<unknown> {
  return page.evaluate(
    async ({ toolName, toolInput }) => {
      const tool = (
        window as unknown as {
          __domhamsterTools: Map<
            string,
            {
              execute(
                input: object,
                options: { readonly signal: AbortSignal },
              ): Promise<unknown>;
            }
          >;
        }
      ).__domhamsterTools.get(toolName);
      if (tool === undefined) throw new Error(`E2E_TOOL_MISSING:${toolName}`);
      return tool.execute(toolInput, { signal: new AbortController().signal });
    },
    { toolName: name, toolInput: input },
  );
}

export async function captureTool(
  page: Page,
  name: string,
  captureKey: string,
): Promise<void> {
  await page.evaluate(
    ({ toolName, key }) => {
      const harness = window as unknown as {
        __domhamsterTools: Map<string, unknown>;
        __domhamsterCapturedTools: Map<string, unknown>;
      };
      const tool = harness.__domhamsterTools.get(toolName);
      if (tool === undefined) throw new Error(`E2E_TOOL_MISSING:${toolName}`);
      harness.__domhamsterCapturedTools.set(key, tool);
    },
    { toolName: name, key: captureKey },
  );
}

export async function runCapturedTool(
  page: Page,
  captureKey: string,
  input: object,
): Promise<unknown> {
  return page.evaluate(
    async ({ key, toolInput }) => {
      const tool = (
        window as unknown as {
          __domhamsterCapturedTools: Map<
            string,
            {
              execute(
                input: object,
                options: { readonly signal: AbortSignal },
              ): Promise<unknown>;
            }
          >;
        }
      ).__domhamsterCapturedTools.get(key);
      if (tool === undefined) throw new Error(`E2E_CAPTURED_TOOL_MISSING:${key}`);
      return tool.execute(toolInput, { signal: new AbortController().signal });
    },
    { key: captureKey, toolInput: input },
  );
}
