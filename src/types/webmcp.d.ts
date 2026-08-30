export {};

declare global {
  interface ToolAnnotations {
    readonly readOnlyHint?: boolean;
    readonly untrustedContentHint?: boolean;
  }

  interface ToolExecuteCallbackOptions {
    readonly signal?: AbortSignal;
  }

  interface ModelContextTool {
    readonly name: string;
    readonly title?: string;
    readonly description: string;
    readonly inputSchema?: object;
    readonly execute: (
      inputObject: object,
      options?: ToolExecuteCallbackOptions,
    ) => Promise<unknown>;
    readonly annotations?: ToolAnnotations;
  }

  interface ModelContextRegisterToolOptions {
    readonly exposedTo?: readonly string[];
    readonly signal?: AbortSignal;
  }

  interface ModelContextGetToolOptions {
    readonly fromOrigins?: readonly string[];
  }

  interface ModelContextExecuteToolOptions {
    readonly signal?: AbortSignal;
  }

  interface RegisteredTool {
    readonly name: string;
    readonly title?: string;
    readonly description: string;
    readonly inputSchema?: object;
    readonly window: Window;
    readonly origin: string;
    readonly annotations?: ToolAnnotations;
  }

  interface ModelContext extends EventTarget {
    ontoolchange: ((this: ModelContext, event: Event) => unknown) | null;
    registerTool(tool: ModelContextTool, options?: ModelContextRegisterToolOptions): Promise<void>;
    getTools(options?: ModelContextGetToolOptions): Promise<readonly RegisteredTool[]>;
    executeTool(
      tool: RegisteredTool,
      inputObject: object,
      options?: ModelContextExecuteToolOptions,
    ): Promise<string>;
  }

  interface Document {
    readonly modelContext: ModelContext;
  }
}
