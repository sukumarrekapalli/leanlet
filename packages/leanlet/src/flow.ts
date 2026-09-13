import type {
  KernelRunOptions,
  LeanletKernel,
  LeanletResult,
  LeanletTiming,
} from './core.js';

export type LeanletFlowTrace = {
  leanletId: string;
  status: LeanletResult<unknown>['status'];
  timing?: LeanletTiming;
};

export type LeanletFlowContext = {
  readonly signal?: AbortSignal;
  run<Input, Output>(
    leanletId: string,
    input: Input,
    options?: Omit<KernelRunOptions, 'signal'>,
  ): Promise<LeanletResult<Output>>;
};

export type LeanletFlowDefinition<Input, Output> = {
  id: string;
  version: string;
  uses: readonly string[];
  run: (
    input: Input,
    context: LeanletFlowContext,
  ) => LeanletResult<Output> | Promise<LeanletResult<Output>>;
};

export type LeanletFlowResult<Output> = {
  flowId: string;
  flowVersion: string;
  result: LeanletResult<Output>;
  trace: LeanletFlowTrace[];
};

export type LeanletFlow<Input, Output> = {
  readonly id: string;
  readonly version: string;
  readonly uses: readonly string[];
  run(
    kernel: LeanletKernel,
    input: Input,
    options?: KernelRunOptions,
  ): Promise<LeanletFlowResult<Output>>;
};

export function defineFlow<Input, Output>(
  definition: LeanletFlowDefinition<Input, Output>,
): LeanletFlow<Input, Output> {
  if (!definition.id.trim()) throw new TypeError('Flow id cannot be empty.');
  if (!definition.version.trim())
    throw new TypeError('Flow version cannot be empty.');
  const uses = Object.freeze([...new Set(definition.uses)]);
  return {
    id: definition.id,
    version: definition.version,
    uses,
    async run(kernel, input, options = {}) {
      const trace: LeanletFlowTrace[] = [];
      const context: LeanletFlowContext = {
        signal: options.signal,
        run: async <NodeInput, NodeOutput>(
          leanletId: string,
          leanletInput: NodeInput,
          runOptions: Omit<KernelRunOptions, 'signal'> = {},
        ) => {
          if (!uses.includes(leanletId))
            throw new Error(
              `Flow "${definition.id}" attempted to run undeclared Leanlet "${leanletId}".`,
            );
          const result = await kernel.run<NodeInput, NodeOutput>(
            leanletId,
            leanletInput,
            {
              deadlineMs: runOptions.deadlineMs ?? options.deadlineMs,
              priority: runOptions.priority ?? options.priority,
              ...runOptions,
              signal: options.signal,
            },
          );
          trace.push({
            leanletId,
            status: result.status,
            timing: result.timing,
          });
          return result;
        },
      };
      const result = await definition.run(input, context);
      return {
        flowId: definition.id,
        flowVersion: definition.version,
        result,
        trace,
      };
    },
  };
}
