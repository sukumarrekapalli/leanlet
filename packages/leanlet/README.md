# leanlet-ai

Browser-native infrastructure for shipping small, task-specific intelligence
inside web applications. Leanlet gives each capability a typed input/output
contract, a bounded model lifecycle, and a deliberate fallback boundary.

## Install

```bash
npm install leanlet-ai
npx leanlet models add mobileclip-s0 --dir public/leanlet-assets
```

## Product image classification

```ts
import { VisionLeanlet } from 'leanlet-ai';

const classifier = new VisionLeanlet({
  model: 'mobileclip-s0',
  categories: ['Electronics', 'Clothing', 'Home & Furniture', 'Other'],
  assetBase: '/leanlet-assets/',
});

const result = await classifier.classify(file);
console.log(result.category, result.confidence);

classifier.destroy();
```

Model files are application assets rather than npm-package payload. Copy the
supported model and ONNX Runtime files with the included CLI. This keeps
installs small and lets applications own versioning, provenance, cache headers,
and distribution.

## Define another leanlet

```ts
import { defineLeanlet } from 'leanlet-ai';

const anomaly = defineLeanlet<number[], { anomalous: boolean }>({
  id: 'sensor-anomaly-v1',
  infer(values) {
    const latest = values.at(-1) ?? 0;
    return { anomalous: latest > 80 };
  },
});

await anomaly.run([42, 44, 41, 87]);
```

The generic contract can wrap an ONNX/WebGPU worker, an embedded linear model,
an online ranker, or a deterministic statistical estimator.

Full guides, model trade-offs, browser support, and the production checklist
are maintained on the Leanlet documentation site.

## License

Apache-2.0. Model weights keep their upstream licenses and are not part of this
npm package.
