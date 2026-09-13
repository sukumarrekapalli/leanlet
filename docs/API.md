# Leanlet 0.3 API reference

This reference covers the public exports of `leanlet-ai@0.3.0-beta.1`. The
[web API reference](https://sukumarrekapalli.github.io/leanlet/docs/api/)
contains the same contract in navigable form.

## Which API to use

- Use `defineLeanlet` for one lazy capability with load, run, and dispose.
- Use `VisionLeanlet` for the bundled browser vision adapter.
- Add `LeanletKernel` when capabilities need shared scheduling, policy,
  lifecycle, declared-memory budgets, structured results, or observability.
- Add `defineFlow` when several registered capabilities produce one result.

The managed APIs are additive; a single Leanlet does not require a kernel.

## Minimal lifecycle

```ts
type LeanletDefinition<Input, Output, Context = undefined> = {
  id: string;
  load?: () => Context | Promise<Context>;
  infer: (input: Input, context: Context) => Output | Promise<Output>;
  dispose?: (context: Context) => void | Promise<void>;
};

defineLeanlet<Input, Output, Context>(definition): ScopedLeanlet<Input, Output>
```

`ScopedLeanlet` exposes readonly `id`, `warmup()`, `run(input)`, and
`destroy()`. Loading is lazy and shared by concurrent first runs. `destroy()` is
idempotent; subsequent warmup/run operations reject.

## Managed kernel

Create with `createLeanletKernel(options)` or `new LeanletKernel(options)`.

### Options and defaults

| Field | Default | Contract |
| --- | --- | --- |
| `budget.maxConcurrentRuns` | `2` | Positive integer. Bounds active load/run work. |
| `budget.maxResidentBytes` | `256 * 1024 * 1024` | Non-negative declared loaded-state budget. |
| `budget.defaultDeadlineMs` | `5000` | Positive queue + load + run deadline. |
| `policy.network` | `static-assets` | Maximum declared network class admitted. |
| `policy.allowedProviders` | all provider IDs | Eligible execution providers. |
| `selectProvider` | first declared allowed provider | Custom provider selection callback. |

Provider IDs are `javascript`, `wasm-single`, `wasm-threaded`, `webgpu`, and
`webnn`. Network classes, from least to most permissive, are `deny`,
`static-assets`, and `application-managed`.

Policy fields are admission metadata, not a JavaScript sandbox. Enforce hard
restrictions with CSP, origin boundaries, permissions, and code review.

### Methods

- `register(definition): this` registers one unique ID. Duplicate registration
  throws `DUPLICATE_ID`.
- `has(id): boolean` checks registration.
- `run<Input, Output>(id, input, options?): Promise<LeanletResult<Output>>`
  validates synchronously, queues, loads lazily, and resolves a structured
  result.
- `prewarm(id, options?): Promise<void>` loads state without inference. It can
  throw for registration, policy, provider, destruction, load, or full
  concurrency.
- `dispose(id): Promise<void>` releases loaded state while preserving
  registration. It rejects if the capability is active.
- `unregister(id): Promise<void>` disposes and removes an idle capability. It
  rejects when matching work is queued or active.
- `subscribe(listener): () => void` adds an event listener and returns an
  unsubscribe function. Listener errors are isolated.
- `inspect(): LeanletKernelSnapshot` returns current in-memory state.
- `destroy(): Promise<void>` idempotently settles queued work, requests
  cooperative cancellation, waits for active work, disposes loaded state, and
  clears registrations/listeners.

### Run options

| Field | Contract |
| --- | --- |
| `signal?: AbortSignal` | Cancels this caller. A coalesced caller does not cancel work required by others. |
| `deadlineMs?: number` | Relative queue + load + run deadline; defaults to the kernel setting. |
| `priority?: number` | Finite number, default 0. Higher values queue first; ties use earliest deadline and then FIFO. |
| `coalesceKey?: string` | Shares matching queued/active work for the same Leanlet ID and exact key. |

The application must build a coalescing key from every input/option that can
change behavior. The kernel does not compare inputs and does not cache the
result after settlement.

## Managed Leanlet definition

```ts
type KernelLeanletDefinition<Input, Output, State = undefined> = {
  manifest: LeanletManifest;
  load?: (context: LeanletRunContext) => State | Promise<State>;
  run: (
    input: Input,
    state: State,
    context: LeanletRunContext,
  ) => LeanletResult<Output> | Promise<LeanletResult<Output>>;
  dispose?: (state: State) => void | Promise<void>;
};
```

`load` is shared by simultaneous first runs and reused until disposal or
eviction. A cooperative implementation observes `context.signal` before and
after expensive steps. `dispose` releases all workers, sessions, indexes,
buffers, and listeners owned by the state.

Registration rejects empty identity fields, empty or unknown provider lists,
unknown network classes, invalid resident estimates, and invalid asset paths or
sizes. Run/prewarm options reject non-finite priority, non-positive/non-finite
deadline, and an empty coalescing key.

### Manifest

| Field | Contract |
| --- | --- |
| `id` | Stable registry key. |
| `version` | Capability contract/implementation version placed in provenance. |
| `task` | Bounded purpose for inspection; not an executed prompt. |
| `description?` | Human-facing description. |
| `providers` | Supported provider IDs, in default preference order. |
| `network?` | Declared network requirement; omission means `deny`. |
| `estimatedResidentBytes?` | Conservative loaded-state estimate; omission counts as zero. |
| `assets?` | Static release asset records. |

Each `LeanletAsset` has `path`, `bytes`, and optional `sha256`, `license`, and
`sourceRevision`.

### Run context

`LeanletRunContext` provides a generated `requestId`, cooperative `signal`,
absolute high-resolution `deadline`, selected `provider`, and
`emit(detail)` for diagnostic events.

## Results

`LeanletResult<Output>` is a discriminated union:

- `accepted`: `output`, optional `score`, optional `calibratedConfidence`, and
  kernel-added timing/provenance.
- `abstained`: reason, optional candidates, and kernel-added
  timing/provenance. Reasons are `cancelled`, `deadline-exceeded`,
  `budget-exceeded`, `low-score`, `unsupported-input`, and `policy-denied`.
- `failed`: `LeanletError`, `recoverable`, and kernel-added timing/provenance.

Use `accepted(output, options?)` and `abstained(reason, candidates?)` inside
definitions. A score is capability-defined evidence, not automatically a
probability. Only use `calibratedConfidence` when a documented calibration
procedure supports it.

Timing contains `queuedMs`, `loadMs`, `runMs`, and `totalMs`. Provenance
contains `leanletId`, `leanletVersion`, and `provider`.

## Flows

```ts
defineFlow<Input, Output>({
  id: string,
  version: string,
  uses: readonly string[],
  run(input, context): LeanletResult<Output> | Promise<LeanletResult<Output>>,
}): LeanletFlow<Input, Output>
```

`id` and `version` must be non-empty. `uses` is deduplicated, frozen, and
enforced: `context.run` throws for an undeclared dependency. Outer cancellation,
deadline, and priority apply to dependency calls unless overridden by the
dependency call. Per-call `coalesceKey` is not inherited.

`flow.run(kernel, input, options?)` returns `flowId`, `flowVersion`, `result`,
and `trace`. Trace entries contain Leanlet ID, status, and timing in completion
order. A trace is neither a static DAG nor a durable workflow log.
Outer deadline and priority become dependency defaults; dependency calls may
override them. An undeclared dependency or exception in flow code rejects the
flow promise.

Queued deadlines are enforced by the scheduler. After work starts, deadlines
and cancellation are cooperative: the context signal aborts, but a native or
JavaScript operation that ignores it can finish and return a result.

## Events and snapshots

Lifecycle events are `registered`, `unregistered`, `loaded`, and `disposed`.
Request events are `queued`, `coalesced`, `started`, `completed`, `abstained`,
and `failed`. `context.emit()` creates `diagnostic` events.

Snapshots include destroyed state, active/queued counts, declared resident
bytes, counters for completed/coalesced/evicted work, and each registered
Leanlet's ID, version, task, load state, active count, and byte estimate.
Declared bytes are not a browser heap or accelerator-memory measurement.

## Asset planning

`planLeanletAssets(manifests, { maxBytes?, requireHashes? })` deduplicates
paths, detects conflicting size/hash declarations, and returns sorted assets,
total/verified bytes, unverified paths, duplicate references, and budget status.
`maxBytes` sets `withinBudget`; it does not throw. Missing required hashes and
conflicting definitions throw `LOAD_FAILED`.

## Classification evaluation

`evaluateClassification(cases, run, labelOf)` executes cases sequentially and
reports totals, accepted/abstained/failed, coverage, overall accuracy,
accepted-only accuracy, macro F1, p50/p95 latency, and per-label support,
predicted, correct, precision, recall, and F1. Empty denominators are zero.

## VisionLeanlet

Constructor options:

- `model?: LeanletModelId` (default `mobileclip-s0`)
- `categories?: readonly string[]` (default retail taxonomy)
- `assetBase?: string` (default document base directory)
- `threads?: number` (clamped to 1–4, default 1)
- `workerUrl?: URL` (explicit built module-worker URL)
- `debug?: boolean` (default false)

Methods/getters are `model`, `classify(blob, { categories?, signal? })`,
`warmup()`, `setModel(id)`, `subscribe(listener)`, and `destroy()`.

`CategoryResult` contains `category`, relative `score`, deprecated
`confidence` alias, ranked `predictions`, `elapsedMs`, and `modelId`.
`LeanletEvent` members are `status`, `result`, `cancelled`, and `error`.
Cancellation stops delivery and asks the worker to discard the request; a
backend WASM/GPU call may finish before observing it.

`LEANLET_MODELS`, `getLeanletModel`, `DEFAULT_PRODUCT_CATEGORIES`, and
`DEFAULT_CATEGORY_PROMPTS` expose the built-in profile metadata and defaults.
MobileCLIP profiles compare against application-provided text. MobileNetV4
profiles use a fixed ImageNet vocabulary plus a product mapping.

## Errors

`LeanletError` exposes `code` and optional `cause`. Codes are `DUPLICATE_ID`,
`NOT_REGISTERED`, `DESTROYED`, `BUDGET_EXCEEDED`, `LOAD_FAILED`, `RUN_FAILED`,
`DISPOSE_FAILED`, and `UNSUPPORTED_PROVIDER`.

## Public export index

Values: `VisionLeanlet`, `LeanletError`, `LeanletKernel`, `accepted`,
`abstained`, `createLeanletKernel`, `defineLeanlet`, `defineFlow`,
`planLeanletAssets`, `evaluateClassification`, `LEANLET_MODELS`,
`getLeanletModel`, `DEFAULT_PRODUCT_CATEGORIES`, and
`DEFAULT_CATEGORY_PROMPTS`.

Types: `KernelLeanletDefinition`, `KernelRunOptions`, `LeanletAsset`,
`LeanletErrorCode`, `LeanletExecutionProvider`, `LeanletKernelBudget`,
`LeanletKernelEvent`, `LeanletKernelOptions`, `LeanletKernelPolicy`,
`LeanletKernelSnapshot`, `LeanletManifest`, `LeanletProvenance`,
`LeanletResult`, `LeanletRunContext`, `LeanletTiming`, `LeanletAssetPlan`,
`ClassificationEvaluationCase`, `ClassificationEvaluationMetrics`,
`LeanletFlow`, `LeanletFlowContext`, `LeanletFlowDefinition`,
`LeanletFlowResult`, `LeanletFlowTrace`, `CategoryResult`, `ClassifyOptions`,
`LeanletEvent`, `LeanletModelId`, `LeanletStatus`, `Prediction`,
`VisionLeanletOptions`, `LeanletDefinition`, `ScopedLeanlet`, and
`LeanletModelDefinition`.
