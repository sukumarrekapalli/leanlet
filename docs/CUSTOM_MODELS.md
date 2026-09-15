# Custom model packs

Leanlet does not require models to come from its built-in catalog. Applications
can ship an ONNX graph, WASM module, WebLLM bundle, tokenizer, local index, or
another browser-compatible runtime as a versioned model pack.

`defineModelPack()` records release metadata. `defineModelLeanlet()` connects
that pack to the managed kernel. The adapter still owns inference-specific code;
Leanlet owns lazy loading, scheduling, cancellation, declared-memory admission,
policy, provenance, eviction, inspection, and disposal.

```ts
import {
  accepted,
  createLeanletKernel,
  defineModelLeanlet,
  defineModelPack,
} from 'leanlet-ai/kernel';

const writerPack = defineModelPack({
  id: 'acme/writer-360m',
  revision: 'sha256:MODEL_REVISION',
  format: 'onnx',
  license: 'Apache-2.0',
  source: 'https://example.com/models/writer-360m',
  languages: ['en'],
  parameterCount: 360_000_000,
  quantization: 'q4f16',
  contextTokens: 8_192,
  providers: ['webgpu'],
  assets: [
    {
      path: 'models/writer-360m/model_q4f16.onnx',
      bytes: 272_353_302,
      sha256: 'MODEL_FILE_SHA256',
      license: 'Apache-2.0',
      sourceRevision: 'UPSTREAM_REVISION',
    },
  ],
  estimatedResidentBytes: 720 * 1024 * 1024,
});

const rewrite = defineModelLeanlet({
  id: 'writer.rewrite',
  version: '1.0.0',
  task: 'bounded-rewrite',
  model: writerPack,
  load: async (model, context) => {
    context.emit({ phase: 'model-load', model: model.id });
    return createYourWorkerOrSession(model, context.signal, context.provider);
  },
  run: async (input, session, context) =>
    accepted(await session.rewrite(input, context.signal)),
  dispose: (session) => session.destroy(),
});

const kernel = createLeanletKernel({
  budget: { maxResidentBytes: 896 * 1024 * 1024 },
  policy: {
    network: 'static-assets',
    allowedProviders: ['webgpu'],
  },
});

kernel.register(rewrite);
```

## Contract

`LeanletModelPack` requires:

| Field | Meaning |
| --- | --- |
| `id` | Stable model-family or artifact identity. |
| `revision` | Immutable upstream commit, digest, or application release. |
| `format` | Runtime representation such as `onnx` or `webllm`. |
| `license` | SPDX expression or exact license name reviewed by the application. |
| `providers` | Execution providers the adapter can actually use. |
| `assets` | Exact asset paths and byte sizes, with hashes where available. |
| `estimatedResidentBytes` | Conservative loaded-state declaration used for admission and eviction. |

Optional metadata includes source, languages, parameter count, quantization,
and context length. Metadata is frozen when defined so the release contract
cannot be silently mutated after registration.

## What Leanlet does not do

- It does not download, parse, or execute model files.
- It does not verify a model's quality or license.
- A network policy declaration is admission metadata, not a JavaScript sandbox.
- Declared resident bytes are not measured heap or accelerator memory.
- Hashes participate in release planning; adapters must still verify downloads
  if runtime integrity checking is required.

Model adapters should expose progress through `context.emit()`, observe
`context.signal`, use explicit quality thresholds, return abstention when the
task is unsupported, and dispose every worker/session they create.
