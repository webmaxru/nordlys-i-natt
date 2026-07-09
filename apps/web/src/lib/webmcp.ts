/**
 * Minimal, typed wrapper around the browser WebMCP imperative API. Tools are
 * exposed through `document.modelContext` (the current surface) with a
 * `navigator.modelContext` fallback for older Chrome 146–149 preview builds.
 *
 * This module only owns the registration lifecycle; the aurora tool definitions
 * live in `auroraTools.ts`. WebMCP is unavailable in every shipping browser
 * today, so registration is best-effort: when no model context exists the app
 * runs normally and simply exposes no agent tools.
 */

export type JsonSchema = Record<string, unknown>;

export interface ModelContextClient {
  requestUserInteraction<T>(callback: () => Promise<T>): Promise<T>;
}

export interface ModelContextToolAnnotations {
  /** Set true only for tools that do not modify application state. */
  readOnlyHint?: boolean;
  /** Set true when the tool output may contain data from untrusted sources. */
  untrustedContentHint?: boolean;
}

export interface ModelContextTool {
  /** Stable identifier, 1–128 chars of ASCII alphanumerics, `_`, `-`, `.`. */
  name: string;
  /** Optional human-readable label shown in user-agent UI. */
  title?: string;
  /** What the tool does and when to use it. */
  description: string;
  /** JSON Schema for the tool input; omit when the tool takes no input. */
  inputSchema?: JsonSchema;
  /**
   * JSON Schema describing the tool's return value. Not every Chrome preview
   * surfaces it yet, but declaring the result schema documents the contract and
   * future-proofs the tool for builds that validate structured output.
   */
  outputSchema?: JsonSchema;
  annotations?: ModelContextToolAnnotations;
  execute(
    input: Record<string, unknown>,
    client: ModelContextClient,
  ): Promise<unknown> | unknown;
}

export interface RegisterToolOptions {
  signal?: AbortSignal;
  exposedTo?: string[];
}

export interface ModelContext {
  registerTool(
    tool: ModelContextTool,
    options?: RegisterToolOptions,
  ): Promise<void> | void;
  unregisterTool?(name: string): void;
  getTools?(): ModelContextTool[];
}

declare global {
  interface Document {
    readonly modelContext?: ModelContext;
  }
  interface Navigator {
    readonly modelContext?: ModelContext;
  }
}

export interface WebMcpRegistration {
  /** Resolves once every tool has finished (attempting) registration. */
  ready: Promise<void>;
  /** Unregisters every tool and aborts the registration signal. */
  dispose(): void;
}

/** Resolve the current-document model context, preferring the modern surface. */
export function getModelContext(): ModelContext | null {
  if (typeof document !== 'undefined' && document.modelContext) {
    return document.modelContext;
  }

  if (typeof navigator !== 'undefined' && navigator.modelContext) {
    return navigator.modelContext;
  }

  return null;
}

const NOOP_REGISTRATION: WebMcpRegistration = {
  ready: Promise.resolve(),
  dispose() {},
};

export function registerWebMcpTools(
  tools: ModelContextTool[],
): WebMcpRegistration {
  const modelContext = getModelContext();

  if (!modelContext) {
    // WebMCP is unavailable in this browser (the common case today). The app
    // works normally; the agent tools are simply not exposed.
    return NOOP_REGISTRATION;
  }

  const controller = new AbortController();
  const registeredNames: string[] = [];

  // Register concurrently: on Chrome 151+ `registerTool()` returns a Promise
  // that resolves once the tool is visible to `getTools()` across the frame
  // tree, so `Promise.all` bounds the total wait by the slowest registration.
  // Each tool keeps its own try/catch so one failure never abandons the others,
  // and `await` stays backward compatible with older builds that registered
  // synchronously (the try/catch handles both a synchronous throw and a
  // Promise rejection).
  const ready = Promise.all(
    tools.map(async (tool) => {
      try {
        await modelContext.registerTool(tool, { signal: controller.signal });
        registeredNames.push(tool.name);
      } catch (error) {
        console.error(`Failed to register WebMCP tool "${tool.name}":`, error);
      }
    }),
  ).then(() => undefined);

  return {
    ready,
    dispose() {
      // `unregisterTool()` was removed in Chrome 148 in favour of the
      // AbortSignal; call both during the transition window so old and new
      // builds both clean up.
      for (const name of registeredNames.splice(0).reverse()) {
        try {
          modelContext.unregisterTool?.(name);
        } catch {
          // Ignore stale cleanup during route/state transitions.
        }
      }
      controller.abort();
    },
  };
}
