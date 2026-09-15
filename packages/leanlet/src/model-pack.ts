import type {
  KernelLeanletDefinition,
  LeanletAsset,
  LeanletExecutionProvider,
  LeanletResult,
  LeanletRunContext,
} from './core.js';

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
  load: (
    model: LeanletModelPack,
    context: LeanletRunContext,
  ) => State | Promise<State>;
  run: (
    input: Input,
    state: State,
    context: LeanletRunContext,
    model: LeanletModelPack,
  ) => LeanletResult<Output> | Promise<LeanletResult<Output>>;
  dispose?: (state: State) => void | Promise<void>;
};

export type DefinedModelLeanlet<Input, Output, State> =
  KernelLeanletDefinition<Input, Output, State> & {
    readonly model: LeanletModelPack;
  };

function nonEmpty(value: string, field: string) {
  if (!value.trim()) throw new TypeError(`Model pack ${field} must not be empty.`);
}

/**
 * Defines immutable, inspectable metadata for application-supplied model files.
 * Leanlet does not download or execute the model: the adapter owns those details.
 */
export function defineModelPack(value: LeanletModelPack): LeanletModelPack {
  nonEmpty(value.id, 'id');
  nonEmpty(value.revision, 'revision');
  nonEmpty(value.format, 'format');
  nonEmpty(value.license, 'license');
  if (!value.providers.length)
    throw new TypeError('Model pack providers must not be empty.');
  if (!Number.isFinite(value.estimatedResidentBytes) || value.estimatedResidentBytes < 0)
    throw new TypeError(
      'Model pack estimatedResidentBytes must be finite and non-negative.',
    );
  if (
    value.parameterCount !== undefined &&
    (!Number.isFinite(value.parameterCount) || value.parameterCount < 0)
  )
    throw new TypeError('Model pack parameterCount must be finite and non-negative.');
  if (
    value.contextTokens !== undefined &&
    (!Number.isInteger(value.contextTokens) || value.contextTokens < 1)
  )
    throw new TypeError('Model pack contextTokens must be a positive integer.');

  return Object.freeze({
    ...value,
    providers: Object.freeze([...value.providers]),
    assets: Object.freeze(value.assets.map((asset) => Object.freeze({ ...asset }))),
    languages: value.languages
      ? Object.freeze([...value.languages])
      : undefined,
  });
}

/**
 * Adapts a custom model pack to the managed kernel lifecycle. Loading stays lazy,
 * declared assets participate in planning, and the kernel owns budget admission,
 * scheduling, cancellation, provenance, eviction, and disposal.
 */
export function defineModelLeanlet<Input, Output, State>(
  definition: ModelLeanletDefinition<Input, Output, State>,
): DefinedModelLeanlet<Input, Output, State> {
  const model = defineModelPack(definition.model);
  nonEmpty(definition.id, 'Leanlet id');
  nonEmpty(definition.version, 'Leanlet version');
  nonEmpty(definition.task, 'Leanlet task');

  return Object.freeze({
    model,
    manifest: Object.freeze({
      id: definition.id,
      version: definition.version,
      task: definition.task,
      description: definition.description,
      assets: model.assets,
      estimatedResidentBytes: model.estimatedResidentBytes,
      providers: model.providers,
      network: definition.network ?? 'static-assets',
    }),
    load: (context: LeanletRunContext) => definition.load(model, context),
    run: (input: Input, state: State, context: LeanletRunContext) =>
      definition.run(input, state, context, model),
    dispose: definition.dispose,
  });
}
