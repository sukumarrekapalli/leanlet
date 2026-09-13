import type { KernelRunOptions, LeanletKernel, LeanletResult, LeanletTiming } from './core.js';
export type LeanletFlowTrace = {
    leanletId: string;
    status: LeanletResult<unknown>['status'];
    timing?: LeanletTiming;
};
export type LeanletFlowContext = {
    readonly signal?: AbortSignal;
    run<Input, Output>(leanletId: string, input: Input, options?: Omit<KernelRunOptions, 'signal'>): Promise<LeanletResult<Output>>;
};
export type LeanletFlowDefinition<Input, Output> = {
    id: string;
    version: string;
    uses: readonly string[];
    run: (input: Input, context: LeanletFlowContext) => LeanletResult<Output> | Promise<LeanletResult<Output>>;
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
    run(kernel: LeanletKernel, input: Input, options?: KernelRunOptions): Promise<LeanletFlowResult<Output>>;
};
export declare function defineFlow<Input, Output>(definition: LeanletFlowDefinition<Input, Output>): LeanletFlow<Input, Output>;
//# sourceMappingURL=flow.d.ts.map