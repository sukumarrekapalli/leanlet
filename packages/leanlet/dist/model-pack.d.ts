import type { KernelLeanletDefinition, LeanletAsset, LeanletExecutionProvider, LeanletResult, LeanletRunContext } from './core.js';
export type LeanletModelPack = {
    /** Stable model identity, independent from the Leanlet capability using it. */
    id: string;
    /** Immutable upstream or application-owned revision. */
    revision: string;
    /** Runtime representation such as `onnx`, `webllm`, or an application format. */
    format: string;
    license: string;
    source?: string;
    languages?: readonly string[];
    parameterCount?: number;
    quantization?: string;
    contextTokens?: number;
    providers: readonly LeanletExecutionProvider[];
    assets: readonly LeanletAsset[];
    estimatedResidentBytes: number;
};
export type ModelLeanletDefinition<Input, Output, State> = {
    id: string;
    version: string;
    task: string;
    description?: string;
    model: LeanletModelPack;
    network?: 'deny' | 'static-assets' | 'application-managed';
    load: (model: LeanletModelPack, context: LeanletRunContext) => State | Promise<State>;
    run: (input: Input, state: State, context: LeanletRunContext, model: LeanletModelPack) => LeanletResult<Output> | Promise<LeanletResult<Output>>;
    dispose?: (state: State) => void | Promise<void>;
};
export type DefinedModelLeanlet<Input, Output, State> = KernelLeanletDefinition<Input, Output, State> & {
    readonly model: LeanletModelPack;
};
/**
 * Defines immutable, inspectable metadata for application-supplied model files.
 * Leanlet does not download or execute the model: the adapter owns those details.
 */
export declare function defineModelPack(value: LeanletModelPack): LeanletModelPack;
/**
 * Adapts a custom model pack to the managed kernel lifecycle. Loading stays lazy,
 * declared assets participate in planning, and the kernel owns budget admission,
 * scheduling, cancellation, provenance, eviction, and disposal.
 */
export declare function defineModelLeanlet<Input, Output, State>(definition: ModelLeanletDefinition<Input, Output, State>): DefinedModelLeanlet<Input, Output, State>;
//# sourceMappingURL=model-pack.d.ts.map