export type LeanletDefinition<Input, Output, Context = undefined> = {
  id: string;
  load?: () => Context | Promise<Context>;
  infer: (input: Input, context: Context) => Output | Promise<Output>;
  dispose?: (context: Context) => void | Promise<void>;
};

export type ScopedLeanlet<Input, Output> = {
  readonly id: string;
  warmup(): Promise<void>;
  run(input: Input): Promise<Output>;
  destroy(): Promise<void>;
};

/**
 * Defines a small, lifecycle-aware intelligence boundary. The model can be a
 * neural network, a statistical estimator, or an online learner; application
 * code receives the same load → run → dispose contract.
 */
export function defineLeanlet<Input, Output, Context = undefined>(
  definition: LeanletDefinition<Input, Output, Context>,
): ScopedLeanlet<Input, Output> {
  let contextPromise: Promise<Context> | undefined;
  let destroyed = false;

  const context = () => {
    if (destroyed) return Promise.reject(new Error(`Leanlet "${definition.id}" has been destroyed.`));
    contextPromise ??= Promise.resolve(definition.load?.() as Context);
    return contextPromise;
  };

  return {
    id: definition.id,
    async warmup() { await context(); },
    async run(input) { return definition.infer(input, await context()); },
    async destroy() {
      if (destroyed) return;
      destroyed = true;
      if (contextPromise && definition.dispose) await definition.dispose(await contextPromise);
      contextPromise = undefined;
    },
  };
}
