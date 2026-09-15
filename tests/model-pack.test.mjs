import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accepted,
  createLeanletKernel,
  defineModelLeanlet,
  defineModelPack,
} from '../packages/leanlet/dist/kernel.js';

void test('custom model packs map into the managed kernel lifecycle', async () => {
  const pack = defineModelPack({
    id: 'example/writer-360m',
    revision: 'sha256:abc',
    format: 'onnx',
    license: 'Apache-2.0',
    languages: ['en'],
    parameterCount: 360_000_000,
    quantization: 'q4f16',
    contextTokens: 8_192,
    providers: ['webgpu', 'wasm-single'],
    assets: [
      { path: 'models/writer/model_q4f16.onnx', bytes: 272_000_000 },
    ],
    estimatedResidentBytes: 640_000_000,
  });
  const definition = defineModelLeanlet({
    id: 'writer.rewrite',
    version: '1.0.0',
    task: 'bounded-rewrite',
    model: pack,
    load: (model, context) => ({ model: model.id, provider: context.provider }),
    run: (input, state, _context, model) =>
      accepted({ input, state, revision: model.revision }),
  });
  const kernel = createLeanletKernel({
    budget: { maxResidentBytes: 700_000_000 },
    policy: { allowedProviders: ['wasm-single'] },
  });
  kernel.register(definition);
  const result = await kernel.run('writer.rewrite', 'draft');
  assert.equal(result.status, 'accepted');
  assert.equal(result.output.state.provider, 'wasm-single');
  assert.equal(result.output.revision, 'sha256:abc');
  assert.equal(result.provenance.provider, 'wasm-single');
  assert.equal(definition.manifest.assets[0].bytes, 272_000_000);
  assert.ok(Object.isFrozen(definition.model));
  await kernel.destroy();
});

void test('model packs reject incomplete or invalid resource declarations', () => {
  assert.throws(
    () =>
      defineModelPack({
        id: '',
        revision: 'main',
        format: 'onnx',
        license: 'Apache-2.0',
        providers: ['webgpu'],
        assets: [],
        estimatedResidentBytes: 1,
      }),
    /id must not be empty/,
  );
  assert.throws(
    () =>
      defineModelPack({
        id: 'model',
        revision: 'main',
        format: 'onnx',
        license: 'Apache-2.0',
        providers: ['webgpu'],
        assets: [],
        estimatedResidentBytes: -1,
      }),
    /estimatedResidentBytes/,
  );
});
