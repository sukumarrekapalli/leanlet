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
export declare function defineLeanlet<Input, Output, Context = undefined>(definition: LeanletDefinition<Input, Output, Context>): ScopedLeanlet<Input, Output>;
//# sourceMappingURL=scoped-leanlet.d.ts.map