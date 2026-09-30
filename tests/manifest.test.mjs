import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LeanletManifestValidationError,
  createLeanletKernel,
  parseLeanletManifest,
  validateLeanletManifest,
} from '../packages/leanlet/dist/kernel.js';

const validManifest = () => ({
  id: 'text.embedding',
  version: '1.0.0',
  task: 'embedding',
  providers: ['wasm-single'],
  network: 'static-assets',
  estimatedResidentBytes: 4_000_000,
  assets: [
    {
      path: 'models/embedding.onnx',
      bytes: 3_000_000,
      sha256: 'release-pinned-hash',
    },
  ],
});

void test('manifest validator accepts the public contract without loading code', () => {
  const manifest = validManifest();
  const result = validateLeanletManifest(manifest);
  assert.equal(result.valid, true);
  assert.equal(result.manifest, manifest);
  assert.deepEqual(result.issues, []);
  assert.equal(parseLeanletManifest(manifest), manifest);
});

void test('manifest validator returns structured paths for every defect', () => {
  const result = validateLeanletManifest({
    id: ' ',
    version: 1,
    task: 'embedding',
    providers: ['webgpu', 'webgpu', 'unknown'],
    network: 'internet',
    estimatedResidentBytes: Number.NaN,
    assets: [
      { path: '', bytes: -1 },
      { path: 'model.onnx', bytes: 1 },
      { path: 'model.onnx', bytes: 1 },
    ],
  });
  assert.equal(result.valid, false);
  assert.deepEqual(
    result.issues.map((issue) => issue.path),
    [
      '/id',
      '/version',
      '/providers/1',
      '/providers/2',
      '/network',
      '/estimatedResidentBytes',
      '/assets/0/path',
      '/assets/0/bytes',
      '/assets/2/path',
    ],
  );
});

void test('parser and kernel registration share the same validation contract', () => {
  const invalid = { ...validManifest(), providers: [] };
  assert.throws(
    () => parseLeanletManifest(invalid),
    (error) =>
      error instanceof LeanletManifestValidationError &&
      error.issues[0].path === '/providers',
  );
  const kernel = createLeanletKernel();
  assert.throws(
    () =>
      kernel.register({
        manifest: invalid,
        run: () => ({ status: 'accepted', output: 1 }),
      }),
    LeanletManifestValidationError,
  );
});
